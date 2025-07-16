
const hre = require("hardhat");
const {ethers} = hre;

// Deploy CurveBabyJubJub
async function deployCurveBabyJubJub(deployed) {
    const CurveBabyJubJub = await ethers.getContractFactory("CurveBabyJubJub");
    const curveBabyJubJub = await CurveBabyJubJub.deploy();
    await curveBabyJubJub.waitForDeployment();
    console.log("CurveBabyJubJub is deployed at :", curveBabyJubJub.target);
    deployed.libraries.CurveBabyJubJub = curveBabyJubJub.target;
    console.log("deployed.libraries.CurveBabyJubJub :", deployed.libraries.CurveBabyJubJub);
}

// Deploy CurveBabyJubJubHelper
async function deployCurveBabyJubJubHelper(deployed) {
    const CurveBabyJubJubHelper = await ethers.getContractFactory("CurveBabyJubJubHelper", {
        libraries: {
            CurveBabyJubJub: deployed.libraries.CurveBabyJubJub
        }
    })
    const curveBabyJubJubHelper = await CurveBabyJubJubHelper.deploy();
    await curveBabyJubJubHelper.waitForDeployment();
    console.log("CurveBabyJubJubHelper is deployed at :", curveBabyJubJubHelper.target);
    deployed.libraries.CurveBabyJubJubHelper = curveBabyJubJubHelper.target;
}

// Deploy MintAllowedTokenVerifier
async function deployMintAllowedTokenVerifier(deployed) {
    const MintAllowedTokenVerifier = await ethers.getContractFactory("MintAllowedTokenVerifier")
    const mintAllowedTokenVerifier = await MintAllowedTokenVerifier.deploy();
    await mintAllowedTokenVerifier.waitForDeployment();
    console.log("MintAllowedTokenVerifier is deployed at :", mintAllowedTokenVerifier.target);
    deployed.libraries.MintAllowedTokenVerifier = mintAllowedTokenVerifier.target;
}

// Deploy SplitTokenVerifier
async function deploySplitTokenVerifier(deployed) {
    const SplitTokenVerifier = await ethers.getContractFactory("SplitTokenVerifier");
    const splitTokenVerifier = await SplitTokenVerifier.deploy();
    await splitTokenVerifier.waitForDeployment();
    console.log("SplitTokenVerifier is deployed at :", splitTokenVerifier.target);
    deployed.libraries.SplitTokenVerifier = splitTokenVerifier.target;
}

// Deploy SplitAllowanceTokenVerifier
async function deploySplitAllowanceTokenVerifier(deployed) {
    const SplitAllowanceTokenVerifier = await ethers.getContractFactory("SplitAllowanceTokenVerifier");
    const splitAllowanceTokenVerifier = await SplitAllowanceTokenVerifier.deploy();
    await splitAllowanceTokenVerifier.waitForDeployment();
    console.log("SplitAllowanceTokenVerifier is deployed at :", splitAllowanceTokenVerifier.target);
    deployed.libraries.SplitAllowanceTokenVerifier = splitAllowanceTokenVerifier.target;
}

// Deploy Convert2pUSDCVerifier
async function deployConvert2pUSDCVerifier(deployed) {
    const Convert2pUSDCVerifier = await ethers.getContractFactory("Convert2pUSDCVerifier");
    const convert2pUSDCVerifier = await Convert2pUSDCVerifier.deploy();
    await convert2pUSDCVerifier.waitForDeployment();
    console.log("Convert2pUSDCVerifier is deployed at :", convert2pUSDCVerifier.target);
    deployed.libraries.Convert2pUSDCVerifier = convert2pUSDCVerifier.target;
}

// Deploy Convert2USDCVerifier
async function deployConvert2USDCVerifier(deployed) {
    const Convert2USDCVerifier = await ethers.getContractFactory("Convert2USDCVerifier");
    const convert2USDCVerifier = await Convert2USDCVerifier.deploy();
    await convert2USDCVerifier.waitForDeployment();
    console.log("Convert2USDCVerifier is deployed at :", convert2USDCVerifier.target);
    deployed.libraries.Convert2USDCVerifier = convert2USDCVerifier.target;
    console.log("deployed.libraries.Convert2USDCVerifier :", deployed.libraries.Convert2USDCVerifier);
}

// deploy TokenVerificationLib.sol
async function deployTokenVerificationLib(deployed) {
    console.log("Deploy TokenVerificationLib.sol...");
    const TokenVerificationLibFactory = await ethers.getContractFactory("TokenVerificationLib", {
        libraries: {
            MintAllowedTokenVerifier: deployed.libraries.MintAllowedTokenVerifier,
            SplitTokenVerifier: deployed.libraries.SplitTokenVerifier, // Add the new library link
            SplitAllowanceTokenVerifier: deployed.libraries.SplitAllowanceTokenVerifier, // Add the new library link
            Convert2pUSDCVerifier: deployed.libraries.Convert2pUSDCVerifier,
            Convert2USDCVerifier: deployed.libraries.Convert2USDCVerifier
        }
    });
    const TokenVerificationLib = await TokenVerificationLibFactory.deploy();
    await TokenVerificationLib.waitForDeployment();
    console.log("TokenVerificationLib.sol is deployed at :", TokenVerificationLib.target);
    deployed.libraries.TokenVerificationLib = TokenVerificationLib.target;
    console.log("deployed.libraries.TokenVerificationLib.sol :", deployed.libraries.TokenVerificationLib);
}

exports.deployCurveBabyJubJub = deployCurveBabyJubJub;
exports.deployCurveBabyJubJubHelper = deployCurveBabyJubJubHelper;
exports.deployMintAllowedTokenVerifier = deployMintAllowedTokenVerifier;
exports.deployTokenVerificationLib = deployTokenVerificationLib;
exports.deploySplitTokenVerifier = deploySplitTokenVerifier;
exports.deploySplitAllowanceTokenVerifier = deploySplitAllowanceTokenVerifier;
exports.deployConvert2pUSDCVerifier = deployConvert2pUSDCVerifier;
exports.deployConvert2USDCVerifier = deployConvert2USDCVerifier;