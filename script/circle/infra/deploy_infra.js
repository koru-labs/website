const hre = require("hardhat");
const {ethers} = hre;

const {
    deployCurveBabyJubJub,
    deployCurveBabyJubJubHelper,
    deployMintAllowedTokenVerifier,
    deployTokenVerificationLib,
    deploySplitTokenVerifier,
    deploySplitAllowanceTokenVerifier
} = require("./deploy_verifier");


const Fixed_Addresses = require("../configuration").ADDRESSES;


async function deployLibs(deployed) {
    console.log("=== TokenSc Libs deployment starts ===");

    await deployCurveBabyJubJub(deployed);
    await deployCurveBabyJubJubHelper(deployed);
    await deployMintAllowedTokenVerifier(deployed);
    await deploySplitTokenVerifier(deployed);
    await deploySplitAllowanceTokenVerifier(deployed); // Deploy SplitAllowanceTokenVerifier
    await deployTokenVerificationLib(deployed);


    const SignatureChecker = await ethers.getContractFactory("SignatureChecker")
    const signatureChecker = await SignatureChecker.deploy();
    await signatureChecker.waitForDeployment()
    deployed.libraries.SignatureChecker = signatureChecker.target;

    const TokenEventLibFactory = await ethers.getContractFactory("TokenEventLib");
    const tokenEventLib = await TokenEventLibFactory.deploy();
    await tokenEventLib.waitForDeployment();
    console.log("TokenEventLib is deployed at :", tokenEventLib.target);
    deployed.libraries.TokenEventLib = tokenEventLib.target;

    const TokenUtilsLibFactory = await ethers.getContractFactory("TokenUtilsLib", {
        libraries: {
            "CurveBabyJubJubHelper": deployed.libraries.CurveBabyJubJubHelper
        }
    });
    const tokenUtilsLib = await TokenUtilsLibFactory.deploy();
    await tokenUtilsLib.waitForDeployment();
    console.log("TokenUtilsLib is deployed at :", tokenUtilsLib.target);
    deployed.libraries.TokenUtilsLib = tokenUtilsLib.target;

    console.log("=== TokenSc Libs deployment finished ===");
}

async function deployL2Event(deployed) {
    console.log("HamsaL2Event deployment starts");

    if (Fixed_Addresses.HAMSAL2EVENT == "") {

        const HamsaL2EventFactory = await ethers.getContractFactory("HamsaL2Event");
        const hamsaL2Event = await HamsaL2EventFactory.deploy();
        await hamsaL2Event.waitForDeployment();
        console.log("HamsaL2Event is deploy at :", hamsaL2Event.target);
        deployed.contracts.HamsaL2Event = hamsaL2Event.target;
    } else {

        deployed.contracts.HamsaL2Event = Fixed_Addresses.HAMSAL2EVENT
    }
    console.log("HamsaL2Event deployment finished");
}



module.exports= {
     deployLibs,
     deployL2Event
}