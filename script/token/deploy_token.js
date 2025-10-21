const hre = require("hardhat");
const {ethers} = hre;
const hardhatConfig = require('../../hardhat.config');
const accounts = require("../../deployments/account.json");
const { getEnvironmentConfig } = require('../deploy_help.js');
const config = getEnvironmentConfig();

const {createClient} = require("../../test/qa/token_grpc");
const grpc = require("@grpc/grpc-js");

// find node3 institution
const node3Institution = config.institutions.find(institution => institution.name === "Node3");
if (!node3Institution) {
    throw new Error("Node3 institution not found in config");
}
const demoBankInstitution = config.institutions.find(institution => institution.name === "demo_bank");
if (!demoBankInstitution) {
    throw new Error("demo_bank institution not found in config");
}
const rpcUrl =node3Institution.rpcUrl;


async function deployToken(deployed) {
    let hamsal2event = config.ADDRESSES.HAMSAL2EVENT_PROXY;
    let institutionRegistration = config.ADDRESSES.PROXY_ADDRESS;

    const wallet = new ethers.Wallet(node3Institution.ethPrivateKey, ethers.provider);
    console.log(`Deploying PrivateUSDC for Node3 institution ${node3Institution.name},institutionAddress:${node3Institution.address}...`);

    const PrivateUSDCFactory = await ethers.getContractFactory("PrivateUSDC", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
            "TokenUtilsLib": deployed.libraries.TokenUtilsLib,
            "TokenVerificationLib": deployed.libraries.TokenVerificationLib,
            "SignatureChecker": deployed.libraries.SignatureChecker
        },
        signer: wallet
    });

    const implementation = await PrivateUSDCFactory.deploy();
    await implementation.waitForDeployment();
    console.log("PrivateUSDC implementation deployed at:", implementation.target);

    const ProxyFactory = await ethers.getContractFactory("PrivateUSDCProxy", wallet);
    const proxy = await ProxyFactory.deploy(implementation.target);
    await proxy.waitForDeployment();
    console.log("PrivateUSDC proxy deployed at:", proxy.target);

    const privateUSDC = await ethers.getContractAt("PrivateUSDC", proxy.target, wallet);
    console.log("Initializing PrivateUSDC...");
    const initTx = await privateUSDC.initialize(
        "Private USDC",
        "USDC",
        "USD",
        4,
        accounts.Owner,
        accounts.Pauser,
        accounts.BlackLister,
        accounts.Owner,
        hamsal2event,
        institutionRegistration
    );
    await initTx.wait();
    console.log("PrivateUSDC initialized successfully");

    deployed.contracts.PrivateERCToken = proxy.target;
    deployed.contracts.PrivateERCTokenImplementation = implementation.target;
}
async function deployTokenDemoBank(deployed) {
    const rpcUrl = demoBankInstitution.rpcUrl;
    let hamsal2event = config.ADDRESSES.HAMSAL2EVENT_PROXY;
    let institutionRegistration = config.ADDRESSES.PROXY_ADDRESS;

    const wallet = new ethers.Wallet(demoBankInstitution.ethPrivateKey, ethers.provider);
    console.log(`Deploying PrivateUSDC for demo institution ${demoBankInstitution.name},institutionAddress:${demoBankInstitution.address}...`);

    const PrivateUSDCFactory = await ethers.getContractFactory("PrivateUSDC", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
            "TokenUtilsLib": deployed.libraries.TokenUtilsLib,
            "TokenVerificationLib": deployed.libraries.TokenVerificationLib,
            "SignatureChecker": deployed.libraries.SignatureChecker
        },
        signer: wallet
    });

    const implementation = await PrivateUSDCFactory.deploy();
    await implementation.waitForDeployment();
    console.log("PrivateUSDC implementation deployed at:", implementation.target);

    const ProxyFactory = await ethers.getContractFactory("PrivateUSDCProxy", wallet);
    const proxy = await ProxyFactory.deploy(implementation.target);
    await proxy.waitForDeployment();
    console.log("PrivateUSDC proxy deployed at:", proxy.target);

    const privateUSDC = await ethers.getContractAt("PrivateUSDC", proxy.target, wallet);
    console.log("Initializing PrivateUSDC...");
    const initTx = await privateUSDC.initialize(
        "Private USDC",
        "USDC",
        "USD",
        4,
        demoBankInstitution.address,
        demoBankInstitution.address,
        demoBankInstitution.address,
        demoBankInstitution.address,
        hamsal2event,
        institutionRegistration
    );
    await initTx.wait();
    console.log("PrivateUSDC initialized successfully");

    deployed.contracts.PrivateERCToken = proxy.target;
    deployed.contracts.PrivateERCTokenImplementation = implementation.target;
}



async function allowBanksInTokenSmartContract(deployed) {
    const ownerWallet = new ethers.Wallet(accounts.OwnerKey, ethers.provider);

    console.log(`Using wallet: ${ownerWallet.address}`);

    const privateUSDC = await ethers.getContractAt("PrivateUSDC", deployed.contracts.PrivateERCToken, ownerWallet);

    for (let i = 0; i < config.institutions.length; i++) {
        let bankAddress = config.institutions[i].address;
        let tx = await privateUSDC.updateAllowedBank(bankAddress, true);
        await tx.wait();
        console.log(`Bank ${bankAddress} allowed successfully`);
    }
}


function extractMinterUsers() {
    const minterUsers = [];
    config.institutions.forEach(institution => {
        if (institution.users) {
            institution.users.forEach(user => {
                if (user.role && user.role.includes('minter')) {
                    minterUsers.push({
                        account: user.address,
                        name: `Minter_${user.address}`
                    });
                }
            });
        }
    });
    return minterUsers;
}


async function setMinterAllowed(deployed) {
    console.log("Configuring minter allowed amount...");

    // add minter users
    const minters = extractMinterUsers();

    const PrivateUSDCFactory = await ethers.getContractFactory("PrivateUSDC", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
            "TokenUtilsLib": deployed.libraries.TokenUtilsLib,
            "TokenVerificationLib": deployed.libraries.TokenVerificationLib,
            "SignatureChecker": deployed.libraries.SignatureChecker
        }
    });
    const privateUSDC = await PrivateUSDCFactory.attach(deployed.contracts.PrivateERCToken);

    const client = createClient(rpcUrl);
    console.log(`rpcUrl:${rpcUrl}`);
    const metadata = await createAuthMetadata(accounts.OwnerKey);
    for (const minter of minters) {
        let response = await client.encodeElgamalAmount(100000000, metadata);
        const tokenId = ethers.toBigInt(response.token_id);
        const clx = ethers.toBigInt(response.amount.cl_x);
        const cly = ethers.toBigInt(response.amount.cl_y);
        const crx = ethers.toBigInt(response.amount.cr_x);
        const cry = ethers.toBigInt(response.amount.cr_y);
        const minterAllowedAmount = {
            "id": tokenId,
            "cl_x": clx,
            "cl_y": cly,
            "cr_x": crx,
            "cr_y": cry,
        }
        await privateUSDC.configurePrivacyMinter(minter.account, minterAllowedAmount);
        await privateUSDC.configureMinter(minter.account, 100000000);
        console.log(`Minter allowed amount configured successfully for ${minter.name} (${minter.account})`);
    }
}
async function setMinterAllowedDemoBank(deployed) {
    console.log("Configuring minter allowed amount...");
    const rpcUrl = demoBankInstitution.rpcUrl;
    // add minter users
    const minters = extractMinterUsers();

    const PrivateUSDCFactory = await ethers.getContractFactory("PrivateUSDC", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
            "TokenUtilsLib": deployed.libraries.TokenUtilsLib,
            "TokenVerificationLib": deployed.libraries.TokenVerificationLib,
            "SignatureChecker": deployed.libraries.SignatureChecker
        }
    });
    const privateUSDC = await PrivateUSDCFactory.attach(deployed.contracts.PrivateERCToken);

    const client = createClient(rpcUrl);
    console.log(`rpcUrl:${rpcUrl}`);
    const metadata = await createAuthMetadata(demoBankInstitution.ethPrivateKey);
    for (const minter of minters) {
        console.log(`Using wallet: ${demoBankInstitution.address}`);
        console.log(metadata)
        let response = await client.encodeElgamalAmount(100000000, metadata);
        const tokenId = ethers.toBigInt(response.token_id);
        const clx = ethers.toBigInt(response.amount.cl_x);
        const cly = ethers.toBigInt(response.amount.cl_y);
        const crx = ethers.toBigInt(response.amount.cr_x);
        const cry = ethers.toBigInt(response.amount.cr_y);
        const minterAllowedAmount = {
            "id": tokenId,
            "cl_x": clx,
            "cl_y": cly,
            "cr_x": crx,
            "cr_y": cry,
        }
        await privateUSDC.configurePrivacyMinter(demoBankInstitution.address, minterAllowedAmount);
        await privateUSDC.configureMinter(demoBankInstitution.address, 100000000);
        console.log(`Minter allowed amount configured successfully for ${minter.name} (${minter.account})`);
    }
}

async function allowBanksInTokenSmartContractDemoBank(deployed) {
    const ownerWallet = new ethers.Wallet(demoBankInstitution.ethPrivateKey, ethers.provider);

    console.log(`Using wallet: ${ownerWallet.address}`);

    const privateUSDC = await ethers.getContractAt("PrivateUSDC", deployed.contracts.PrivateERCToken, ownerWallet);

    for (let i = 0; i < config.institutions.length; i++) {
        let bankAddress = config.institutions[i].address;
        let tx = await privateUSDC.updateAllowedBank(bankAddress, true);
        await tx.wait();
        console.log(`Bank ${bankAddress} allowed successfully`);
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function createAuthMetadata(privateKey, messagePrefix = "login") {
    const wallet = new ethers.Wallet(privateKey);
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${messagePrefix}_${timestamp}`;
    const signature = await wallet.signMessage(message);

    const metadata = new grpc.Metadata();
    metadata.set('address', wallet.address.toLowerCase());
    metadata.set('signature', signature);
    metadata.set('message', message);

    return metadata;
}
module.exports = {
    deployToken,
    allowBanksInTokenSmartContract,
    setMinterAllowed,
    sleep,
    deployTokenDemoBank,
    setMinterAllowedDemoBank,
    allowBanksInTokenSmartContractDemoBank
};
