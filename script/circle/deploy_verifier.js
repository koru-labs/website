
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

// deploy TokenVerificationLib2
async function deployTokenVerificationLib2(deployed) {
    console.log("Deploy TokenVerificationLib2...");
    const TokenVerificationLib2Factory = await ethers.getContractFactory("TokenVerificationLib2", {
        libraries: {
            MintAllowedTokenVerifier: deployed.libraries.MintAllowedTokenVerifier,
            SplitTokenVerifier: deployed.libraries.SplitTokenVerifier, // Add the new library link
            SplitAllowanceTokenVerifier: deployed.libraries.SplitAllowanceTokenVerifier // Add the new library link
        }
    });
    const TokenVerificationLib2 = await TokenVerificationLib2Factory.deploy();
    await TokenVerificationLib2.waitForDeployment();
    console.log("TokenVerificationLib2 is deployed at :", TokenVerificationLib2.target);
    deployed.libraries.TokenVerificationLib2 = TokenVerificationLib2.target;
    console.log("deployed.libraries.TokenVerificationLib2 :", deployed.libraries.TokenVerificationLib2);
}

exports.deployCurveBabyJubJub = deployCurveBabyJubJub;
exports.deployCurveBabyJubJubHelper = deployCurveBabyJubJubHelper;
exports.deployMintAllowedTokenVerifier = deployMintAllowedTokenVerifier;
exports.deployTokenVerificationLib2 = deployTokenVerificationLib2;
exports.deploySplitTokenVerifier = deploySplitTokenVerifier;
exports.deploySplitAllowanceTokenVerifier = deploySplitAllowanceTokenVerifier;