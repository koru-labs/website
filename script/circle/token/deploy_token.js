const hre = require("hardhat");
const {ethers} = hre;
const hardhatConfig = require('../../../hardhat.config');
const accounts = require("../../../deployments/account.json");
const config = require("../configuration");

async function deployToken(deployed) {
    let hamsal2event = deployed.contracts.HamsaL2Event;
    let institutionRegistration = deployed.contracts.InstUserProxy;

    // 使用重构后的合约名和路径
    const PrivateUSDCFactory = await ethers.getContractFactory("PrivateUSDC", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
            "TokenUtilsLib": deployed.libraries.TokenUtilsLib,
            "TokenVerificationLib": deployed.libraries.TokenVerificationLib,
            "SignatureChecker": deployed.libraries.SignatureChecker
        }
    });

    const privateUSDC = await PrivateUSDCFactory.deploy();
    await privateUSDC.waitForDeployment();
    console.log("PrivateUSDC is deployed at:", privateUSDC.target);
    deployed.contracts.PrivateERCToken = privateUSDC.target;

    console.log("Initializing PrivateUSDC...");
    const initTx = await privateUSDC.initialize(
        "Private USDC",
        "PUSDC",
        "USD",
        6,
        accounts.MasterMinter,
        accounts.Pauser,
        accounts.BlackLister,
        accounts.Owner,
        hamsal2event,
        institutionRegistration
    );
    await initTx.wait();
    console.log("PrivateUSDC initialized successfully");
}

async function allowBanksInTokenSmartContract(deployed) {
    const l1CustomNetwork = {
        name: "BESU",
        chainId: 1337
    };
    const options = {
        batchMaxCount: 1,
        staticNetwork: true
    };

    const L1Url = hardhatConfig.networks.ucl_L2.url;
    const l1Provider = new ethers.JsonRpcProvider(L1Url, l1CustomNetwork, options);
    const ownerWallet = new ethers.Wallet(accounts.OwnerKey, l1Provider);
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
    // 100000000
    const minterAllowedAmount = {
        "cl_x": 1964037076661478832091343095893178906711955991017793273625890630250133225131n,
        "cl_y": 15905501110278917982136565763010546337694082364420938370758314633459389867828n,
        "cr_x": 6032315780222124442197125438972811787823257335241885174315052214529236213245n,
        "cr_y": 4661193269845438292333666932675091279526371009153842373600639673542587256610n,
    }

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

    for (const minter of minters) {
        await privateUSDC.configurePrivacyMinter(minter.account, minterAllowedAmount);
        console.log(`Minter allowed amount configured successfully for ${minter.name} (${minter.account})`);
    }
    // await sleep(10000)
    // for (const minter of minters){
    //     const allowedAmount = await privateUSDC.getPrivateMinterAllowed(minter.account);
    //     console.log(`Minter allowed amount for ${minter.name} (${minter.account}):`, allowedAmount);
    // }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function setMinterAllowedNode4(deployed) {
    const minterAllowedAmount = {
        "cl_x": 1964037076661478832091343095893178906711955991017793273625890630250133225131n,
        "cl_y": 15905501110278917982136565763010546337694082364420938370758314633459389867828n,
        "cr_x": 6032315780222124442197125438972811787823257335241885174315052214529236213245n,
        "cr_y": 4661193269845438292333666932675091279526371009153842373600639673542587256610n,
    }
    console.log("Configuring minter allowed amount...");

    const minters = [
        {account: accounts.Node4Minter, name: "Minter"},
    ];

    const PrivateUSDCFactory = await ethers.getContractFactory("PrivateUSDC", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
            "TokenUtilsLib": deployed.libraries.TokenUtilsLib,
            "TokenVerificationLib": deployed.libraries.TokenVerificationLib,
            "SignatureChecker": deployed.libraries.SignatureChecker
        }
    });
    const privateUSDC = await PrivateUSDCFactory.attach(deployed.contracts.PrivateERCToken);

    for (const minter of minters) {
        await privateUSDC.configurePrivacyMinter(minter.account, minterAllowedAmount);
        console.log(`Minter allowed amount configured successfully for ${minter.name} (${minter.account})`);
    }
}

module.exports = {
    deployToken,
    allowBanksInTokenSmartContract,
    setMinterAllowed,
    setMinterAllowedNode4
};

