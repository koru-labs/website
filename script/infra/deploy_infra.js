const hre = require("hardhat");
const {ethers} = hre;

const {
    deployCurveBabyJubJub,
    deployCurveBabyJubJubHelper,
    deployMintAllowedTokenVerifier,
    deployTokenVerificationLib,
    deploySplitTokenVerifier,
    deploySplitAllowanceTokenVerifier,
    deployConvert2pUSDCVerifier,
    deployConvert2USDCVerifier
} = require("./deploy_verifier");
const hardhatConfig = require("../../hardhat.config");

const {getEnvironmentConfig} = require("../deploy_help");
const Fixed_Addresses = getEnvironmentConfig();

async function deployLibs(deployed) {
    console.log("=== TokenSc Libs deployment starts ===");

    await deployCurveBabyJubJub(deployed);
    await deployCurveBabyJubJubHelper(deployed);
    await deployMintAllowedTokenVerifier(deployed);
    await deploySplitTokenVerifier(deployed);
    await deploySplitAllowanceTokenVerifier(deployed); // Deploy SplitAllowanceTokenVerifier
    await deployConvert2pUSDCVerifier(deployed);
    await deployConvert2USDCVerifier(deployed);
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
    const TokenUtilsLibFactory = await ethers.getContractFactory("contracts/ucl/circle/lib/TokenUtilsLib.sol:TokenUtilsLib", {
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

    const implementationAddress = await (async () => {
        if (typeof Fixed_Addresses.HAMSAL2EVENT_IMPLEMENTATION === 'undefined' || Fixed_Addresses.HAMSAL2EVENT_IMPLEMENTATION === "") {
            console.log("Deploying new HamsaL2Event implementation...");
            const HamsaL2EventFactory = await ethers.getContractFactory("HamsaL2Event");
            const hamsaL2Event = await HamsaL2EventFactory.deploy();
            await hamsaL2Event.waitForDeployment();
            console.log("HamsaL2Event implementation deployed at:", hamsaL2Event.target);
            return hamsaL2Event.target;
        }
        console.log("Reusing HamsaL2Event implementation:", Fixed_Addresses.HAMSAL2EVENT_IMPLEMENTATION);
        return Fixed_Addresses.HAMSAL2EVENT_IMPLEMENTATION;
    })();

    deployed.contracts.HamsaL2EventImplementation = implementationAddress;

    if (typeof Fixed_Addresses.HAMSAL2EVENT_PROXY === 'undefined' || Fixed_Addresses.HAMSAL2EVENT_PROXY === "") {
        console.log("Deploying new HamsaL2Event proxy...");
        const HamsaL2EventProxyFactory = await ethers.getContractFactory("HamsaL2EventProxy");
        const proxy = await HamsaL2EventProxyFactory.deploy(implementationAddress);
        await proxy.waitForDeployment();
        console.log("HamsaL2Event proxy deployed at:", proxy.target);
        deployed.contracts.HamsaL2Event = proxy.target;
    } else {
        console.log("Reusing existing HamsaL2Event proxy at:", Fixed_Addresses.HAMSAL2EVENT_PROXY);
        const proxy = await ethers.getContractAt("HamsaL2EventProxy", Fixed_Addresses.HAMSAL2EVENT_PROXY);
        const txA = await proxy.setImplementationA(implementationAddress);
        await txA.wait();
        deployed.contracts.HamsaL2Event = Fixed_Addresses.HAMSAL2EVENT_PROXY;
        console.log("Updated HamsaL2Event proxy implementationA");
    }

    const proxyAddress = deployed.contracts.HamsaL2Event;
    const proxyInstance = await ethers.getContractAt("HamsaL2EventProxy", proxyAddress);

    const implementationBAddress = Fixed_Addresses.HAMSAL2EVENT_IMPLEMENTATION_B || "";
    const percentageToBRaw = Fixed_Addresses.HAMSAL2EVENT_PERCENTAGE_TO_B;
    const percentageToB = percentageToBRaw === undefined || percentageToBRaw === null
        ? 0
        : Number(percentageToBRaw);

    if (percentageToB < 0 || percentageToB > 100 || Number.isNaN(percentageToB)) {
        throw new Error("HAMSAL2EVENT_PERCENTAGE_TO_B must be between 0 and 100");
    }

    if (implementationBAddress !== "") {
        console.log(`Configuring implementationB ${implementationBAddress} with percentage ${percentageToB}%`);
        const txB = await proxyInstance.setImplementationB(implementationBAddress, percentageToB);
        await txB.wait();
        deployed.contracts.HamsaL2EventImplementationB = implementationBAddress;
        deployed.contracts.HamsaL2EventPercentageToB = percentageToB;
    } else if (percentageToB > 0) {
        throw new Error("HAMSAL2EVENT_IMPLEMENTATION_B must be provided when percentageToB > 0");
    } else {
        deployed.contracts.HamsaL2EventImplementationB = "";
        deployed.contracts.HamsaL2EventPercentageToB = 0;
    }

    console.log("HamsaL2Event deployment finished");
}


module.exports = {
    deployLibs,
    deployL2Event
}
