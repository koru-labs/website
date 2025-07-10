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

let hamsal2event = "0xdB297CC1D97B6E9F0e61aEf5FC2d98cA70Ac77fC";// qa
let institutionRegistration = "0xf1ad4b1e0d3f48dEB2B5243848A66553cB873eA6";// qa
const ADDRESSES = {
    TOKEN_EVENT_LIB: "",
    HAMSAL2EVENT: hamsal2event,
    INSTITUTION_REGISTRATION: ""
};

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

async function deployToken() {
    let [signer] = await ethers.getSigners();
    console.log("the signer is:", await signer.getAddress())
    console.log("Deploy UCL SandBox smart contracts...")
    let deployed = {
        libraries: {},
        contracts: {},
        accounts: {},
    };


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

    // await allowBanksInTokenSmartContract(deployed);
    await saveDeploymentInfo(deployed, hre, ethers, fs, path);
    console.log("\nDeployment is done ！");
    return deployed;
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


exports.deployToken = deployToken;


