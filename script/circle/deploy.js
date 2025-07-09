const hre = require("hardhat");
const {ethers} = hre;
const fs = require("fs");
const path = require("path");
const {address} = require("hardhat/internal/core/config/config-validation");
const hardhatConfig = require('../../hardhat.config');
const accounts = require("../../deployments/account.json");
const {
    deployCurveBabyJubJub,
    deployCurveBabyJubJubHelper,
    deployMintAllowedTokenVerifier,
    deployTokenVerificationLib,
    deploySplitTokenVerifier,
    deploySplitAllowanceTokenVerifier
} = require("./deploy_verifier");
const {createAuthMetadata} = require("../../test/help/testHelp.js")
const {createClient} = require('../../test/qa/token_grpc');

// let hamsal2event = "0x1a9122150280DBDB9f2b6b5438811d2943e3A6aA"; //dev
let hamsal2event = "0x80238AD5B21A9f253094073256d602f53131F82b";// qa
let institutionRegistration = "0xAb321584C1B87C93F6fB6673c4245B7cF4C024e4";// qa
const ADDRESSES = {
    TOKEN_EVENT_LIB: "",
    HAMSAL2EVENT: hamsal2event,
    INSTITUTION_REGISTRATION: institutionRegistration
};

const institutions = [
    {
        address: "0x2c44c4B96AE5f9c9dbf32cF3AA743Cd0277F3127",
        ethPrivateKey: "f951e1bd9ef0359e6886ae77e5fd30d566ef098d099c78fd3fb68588657618cc",
        name: "Node1",
        rpcUrl: "qa-node1-rpc.hamsa-ucl.com:50051",
        nodeUrl: "https://qa-node1-proxy.hamsa-ucl.com:8443",
        httpUrl: "http://qa-node1-http.hamsa-ucl.com:8080",
        publicKey: {
            x: "8870958234945531012140077554967107612834978073622531518187994135599594024004",
            y: "1602896076095556872064323498591590133311615038843128356451925530793022734414",
        },
        privateKey: "416573880578171335403689549793041749905608668623681787361470319903201766514",
        users: [
            {address: "0x5a3288A7400B2cd5e0568728E8216D9392094892", role:"normal"}
        ]
    },
    {
        address: "0x03d68e57f1f9939d3FDcf97B5e7a1d0Be995Ec67",
        ethPrivateKey: "d9597e2d88463e47d1b6c2431879f06d440a6ff980a51a1f8c830623b112f329",
        name: "Node2",
        rpcUrl: "qa-node2-rpc.hamsa-ucl.com:50051",
        nodeUrl: "https://qa-node2-proxy.hamsa-ucl.com:8443",
        httpUrl: "http://qa-node2-http.hamsa-ucl.com:8080",
        publicKey: {
            x: "5820367833026910549315409246395472618478921328059164198985819674997868240519",
            y: "16447690327536854731829234134374272913253014843200385847735869511531503932278",
        },
        privateKey: "2168409685083436357554395152062201983676872832460334205932174282094784521144",
        users: [
            {address: "0xF8041E1185C7106121952bA9914ff904A4A01c80", role:"normal"}
        ]
    },
    {
        address: "0xf17f52151EbEF6C7334FAD080c5704D77216b732",
        ethPrivateKey: "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f",
        name: "Node3",
        rpcUrl: "qa-node3-rpc.hamsa-ucl.com:50051",
        nodeUrl: "https://qa-node3-proxy.hamsa-ucl.com:8443",
        httpUrl: "http://qa-node3-http.hamsa-ucl.com:8080",
        publicKey: {
            x: "14867489045451479287215256054831019265497990299815167173241037631264676460349",
            y: "9519187890267549073736999464396081731503319602421352094119155053337094535674",
        },
        privateKey: "2607683766450702001126943055270332377994929386369594371567962723856157825017",
        users: [
            {address: "0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB", role:"normal"},
            {address: "0xf17f52151EbEF6C7334FAD080c5704D77216b732", role:"admin"},
            {address: "0xf0b6C36D47f82Fc13eFEE4CC8223Dc19E6c0D766", role:"normal"},
            {address: "0x8c8af239FfB9A6e93AC4b434C71a135572A1021C", role:"normal"},
            {address: "0x4312488937D47A007De24d48aB82940C809EEb2b", role:"normal"},
            {address: "0x57829d5E80730D06B1364A2b05342F44bFB70E8f", role:"normal"},
            {address: "0xF50F25915126d936C64A194b2C1DAa1EA45392c4", role:"minter"},
            {address: "0x4568E35F2c4590Bde059be615015AaB6cc873004", role:"minter"},
            {address: "0x46946c52eb91cd2c8ed347b0a7758d9b22cee383", role:"normal"}  //this is account in wlin meta-mask
        ]
    },
    {
        address: "0x93d2Ce0461C2612F847e074434d9951c32e44327",
        ethPrivateKey: "81690fb141b4ae5682ad1fd73b29ae1bcc67891e93de73c6f636402deac21171",
        name: "Node4",
        rpcUrl: "qa-node4-rpc.hamsa-ucl.com:50051",
        nodeUrl: "https://qa-node4-proxy.hamsa-ucl.com:8443",
        httpUrl: "http://qa-node4-http.hamsa-ucl.com:8080",
        publicKey: {
            x: "20939066757645918795634673682728216909767846507882077869735730662556512988867",
            y: "10484302653646958667875402192638179073860126846729616349907290732560904524336",
        },
        privateKey: "1269647837676258859940892295235950289673852489198963778624801308185618508021",
        users: [
            {address: "0xbA268f776F70caDB087e73020dfE41c7298363Ed", role: "normal"}
        ]
    }
]

// Add function to check existing deployments
async function loadExistingDeployments() {
    const deploymentsDir = path.join(__dirname, "../../deployments");
    const filepath = path.join(deploymentsDir, "image9.json");

    if (fs.existsSync(filepath)) {
        const data = fs.readFileSync(filepath, 'utf8');
        const existingDeployments = JSON.parse(data);

        // Get current network info
        const currentNetwork = hre.network.name;
        const currentChainId = (await ethers.provider.getNetwork()).chainId.toString();

        // Check if network matches
        if (existingDeployments.metadata?.network === currentNetwork &&
            existingDeployments.metadata?.chainId === currentChainId) {
            console.log(`Found existing deployments for network: ${currentNetwork} (chainId: ${currentChainId})`);
            return existingDeployments;
        } else {
            console.log(`Network mismatch detected. Previous deployment was on ${existingDeployments.metadata?.network} (chainId: ${existingDeployments.metadata?.chainId}), current network is ${currentNetwork} (chainId: ${currentChainId})`);
            console.log("Removing previous deployment information...");
            fs.unlinkSync(filepath);
            return null;
        }
    }
    return null;
}

async function main() {
    let [signer] = await ethers.getSigners();
    console.log("the signer is:", await signer.getAddress())
    console.log("Deploy UCL SandBox smart contracts...")
    let deployed = {
        libraries: {},
        contracts: {},
        accounts: {},
    };

    // Load existing deployments
    const existingDeployments = await loadExistingDeployments();

    console.log("\n=== Deploy TokenSc Libs ===");

    // Deploy Verifier
    await deployCurveBabyJubJub(deployed);
    await deployCurveBabyJubJubHelper(deployed);
    await deployMintAllowedTokenVerifier(deployed);
    await deploySplitTokenVerifier(deployed);
    await deploySplitAllowanceTokenVerifier(deployed); // Deploy SplitAllowanceTokenVerifier
    await deployTokenVerificationLib(deployed);
    console.log(deployed)

    if (ADDRESSES.TOKEN_EVENT_LIB == "") {
        console.log("Deploy TokenEventLib...");
        try {
            const TokenEventLibFactory = await ethers.getContractFactory("TokenEventLib");
            const tokenEventLib = await TokenEventLibFactory.deploy();
            await tokenEventLib.waitForDeployment();
            console.log("TokenEventLib is deployed at :", tokenEventLib.target);
            deployed.libraries.TokenEventLib = tokenEventLib.target;

        } catch (error) {
            console.error("TokenEventLib deployment failed:", error.message);
        }
    } else {
        console.log("Use already deployed TokenEventLib:", ADDRESSES.TOKEN_EVENT_LIB);
        deployed.libraries.TokenEventLib = ADDRESSES.TOKEN_EVENT_LIB;
    }


    console.log("\n=== Deploy business smart contracts ===");


    if (ADDRESSES.HAMSAL2EVENT == "") {
        console.log("Deploy HamsaL2Event...");

        const HamsaL2EventFactory = await ethers.getContractFactory("HamsaL2Event");
        const hamsaL2Event = await HamsaL2EventFactory.deploy();
        await hamsaL2Event.waitForDeployment();
        console.log("HamsaL2Event is deploy at :", hamsaL2Event.target);
        deployed.contracts.HamsaL2Event = hamsaL2Event.target;
    } else {
        deployed.contracts.HamsaL2Event = ADDRESSES.HAMSAL2EVENT
    }

    console.log("Checking InstitutionUserRegistry.sol smart contract...");
    if (ADDRESSES.INSTITUTION_REGISTRATION == "") {
        console.log("Deploying new InstitutionUserRegistry.sol contract...");
        const InstitutionUserRegistryFactory = await ethers.getContractFactory("InstitutionUserRegistry", {
            libraries: {
                "TokenEventLib": deployed.libraries.TokenEventLib,
            }
        });
        const institutionUserRegistry = await InstitutionUserRegistryFactory.deploy(deployed.contracts.HamsaL2Event);
        await institutionUserRegistry.waitForDeployment();

        console.log("InstitutionUserRegistry.sol deployed to:", institutionUserRegistry.target);
        deployed.contracts.InstitutionUserRegistry = institutionUserRegistry.target;
    } else {
        console.log("Reusing existing InstitutionUserRegistry.sol at:", ADDRESSES.INSTITUTION_REGISTRATION);
        deployed.contracts.InstitutionUserRegistry = ADDRESSES.INSTITUTION_REGISTRATION;
    }

    const SignatureChecker = await ethers.getContractFactory("SignatureChecker")
    const signatureChecker = await SignatureChecker.deploy();
    await signatureChecker.waitForDeployment()
    deployed.libraries.SignatureChecker = signatureChecker.target;

    console.log("Deploy PrivateERCToken smart contract...");
    const PrivateUSDCFactory = await ethers.getContractFactory("PrivateUSDC", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
            "SignatureChecker": signatureChecker.target,
            "CurveBabyJubJubHelper": deployed.libraries.CurveBabyJubJubHelper,
            "TokenVerificationLib": deployed.libraries.TokenVerificationLib
        }
    });
    const event_address = deployed.contracts.HamsaL2Event;
    if (!deployed.libraries.TokenEventLib ||
        !deployed.libraries.TokenVerificationLib) {
        throw new Error("Deployment of HamsaUSDC failed");
    }

    const privateUSDC = await PrivateUSDCFactory.deploy();
    await privateUSDC.waitForDeployment();
    console.log("PrivateERCToken is deployed at :", privateUSDC.target);
    deployed.contracts.PrivateERCToken = privateUSDC.target;


    console.log("Initializing PrivateERCToken...");
    const initTx = await privateUSDC.initialize(
        "Private ERC Token",
        "PET",
        "USD",
        6,
        accounts.MasterMinter,
        accounts.Pauser,
        accounts.BlackLister,
        accounts.Owner,
        event_address,
        institutionRegistration
    );
    await initTx.wait();
    console.log("PrivateERCToken initialized successfully");

    const minterAllowedAmount = {
        "cl_x": 17965178807605681775593476527901391566646357775548805416191630067931921590266n,
        "cl_y": 17997503520096523373978760079614633178183544935372525079367653487073845131371n,
        "cr_x": 2799658707790704252170544877645553735081603739176317448125814928308770685127n,
        "cr_y": 10724405929777949929088094477911843117820716522007699467531083531418761611245n,
    }
    await privateUSDC.configurePrivacyMinter(accounts.Minter, minterAllowedAmount);
    await privateUSDC.configurePrivacyMinter(accounts.Minter2, minterAllowedAmount);
    await privateUSDC.configurePrivacyMinter(accounts.Minter3, minterAllowedAmount);

    await allowBanksInTokenSmartContract(deployed);
    await saveDeploymentInfo(deployed, hre, ethers, fs, path);
    console.log("\nDeployment is done ！");
    return deployed;
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
    const privateUSDC = await ethers.getContractAt("PrivateUSDC",deployed.contracts.PrivateERCToken, ownerWallet);

    for (let i = 0; i < institutions.length; i++) {
        let bankAddress = institutions[i].address;
        let tx = await privateUSDC.updateAllowedBank(bankAddress, true)
        await tx.wait();
    }
}

async function saveDeploymentInfo(deployed, hre, ethers, fs, path) {
    console.log("\n=== Save deployment information ===");
    deployed.metadata = {
        timestamp: new Date().toISOString(),
        network: hre.network.name,
        chainId: (await ethers.provider.getNetwork()).chainId.toString()
    };

    const deploymentsDir = path.join(__dirname, "../../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, {recursive: true});
    }

    const filepath = path.join(deploymentsDir, "image9.json");
    fs.writeFileSync(filepath, JSON.stringify(deployed, null, 2));
    console.log(`deployment information is saved to : ${filepath}`);
}


async function registerInstitutionAndUser() {
    const deployed = require('./../../deployments/image9.json');

    const InstitutionUserRegistryFactory = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });
    const institutionUserRegistry = await InstitutionUserRegistryFactory.attach(deployed.contracts.InstitutionUserRegistry);
    for (let i = 0; i < institutions.length; i++) {
        console.log(`Register institution ${institutions[i].address} in InstitutionUserRegistry smart contract...`);
        try {
            let regTx = await institutionUserRegistry.registerInstitution(
                institutions[i].address,
                institutions[i].name,
                institutions[i].publicKey,
                institutions[i].nodeUrl,
                institutions[i].httpUrl
            );
            await regTx.wait();
            console.log(`Bank ${institutions[i].address} is registered successfully in InstitutionUserRegistry`);
        } catch (error) {
           if (! error.message.includes("institution already registered")){
               console.log(error)
           }
        }

        let client;
        try {
            client = createClient(institutions[i].rpcUrl);
        } catch (error) {
            console.error(`[ERROR] Failed to connect to node ${institutions[i].name}:`, {
                rpcUrl: institutions[i].rpcUrl,
                error: error.message,
                stack: error.stack
            });
            continue;
        }

        for (let j = 0; j < institutions[i].users.length; j++) {
            let {address, role} = institutions[i].users[j];
            // don't remove below line
            if (address == institutions[i].address) {
                continue;
            }
            await registerUser(client, institutions[i].ethPrivateKey, address, role);
            console.log(`Registered user ${address} under Bank ${institutions[i].address}`);
        }
    }
}


async function registerUser(client, privateKey, userAddress, role) {
    const metadata = await createAuthMetadata(privateKey);
    const request = {
        account_address: userAddress,
        account_role: role ,//minter,admin,normal
    };
    try {
        const response = await client.registerAccount(request, metadata);
        console.log("registerAccount response:", response);
    } catch (error) {
        console.error("registerAccount failed:", error);
    }
}

main().then();
//call this function after updating settings in k8s cluster and restart them
// registerInstitutionAndUser().then();

