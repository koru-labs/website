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
const hardhatConfig = require("../../../hardhat.config");


const Fixed_Addresses = require("../configuration").ADDRESSES;
const l1CustomNetwork = {
    name: "ETH",
    chainId: 3151908
};

const options = {
    batchMaxCount: 1,
    staticNetwork: true
};

const L1Url = hardhatConfig.networks.eth_dev.url;
const l1Provider = new ethers.JsonRpcProvider(L1Url, l1CustomNetwork, options);
const L1Wallet = new ethers.Wallet(hardhatConfig.networks.eth_dev.accounts[0], l1Provider);

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

    if (Fixed_Addresses.HAMSAL2EVENT == "") {
        const HamsaL2EventFactory = await ethers.getContractFactory("HamsaL2Event");
        const hamsaL2Event = await HamsaL2EventFactory.deploy();
        await hamsaL2Event.waitForDeployment();
        console.log("HamsaL2Event is deploy at :", hamsaL2Event.target);
        deployed.contracts.HamsaL2Event = hamsaL2Event.target;
    } else {
        deployed.contracts.HamsaL2Event = Fixed_Addresses.HAMSAL2EVENT
        console.log("Use already deployed HamsaL2Event:", Fixed_Addresses.HAMSAL2EVENT);
    }
    console.log("HamsaL2Event deployment finished");
}


async function deployL1Handle(deployed) {
    console.log("L1Handle deployment starts");

    if (Fixed_Addresses.L1_HANDLE == "") {
        const Classification = await ethers.getContractFactory("contracts/ucl/l1verify/Classification.sol:Classification", L1Wallet);
        const classification = await Classification.deploy();
        await classification.waitForDeployment();
        console.log("L1 Classification is deploy at :", await classification.getAddress());

        const TokenUtilsLib = await ethers.getContractFactory("contracts/ucl/l1verify/lib/TokenUtilsLib.sol:TokenUtilsLib", L1Wallet);
        const tokenUtilsLib = await TokenUtilsLib.deploy();
        await tokenUtilsLib.waitForDeployment();
        console.log("L1 TokenUtilsLib is deploy at :", await tokenUtilsLib.getAddress());

        const Verifier = await ethers.getContractFactory("contracts/ucl/l1verify/lib/verify/Verifier.sol:Verifier", L1Wallet);
        const verifier = await Verifier.deploy();
        await verifier.waitForDeployment();
        console.log("Verifier is deploy at :", await verifier.getAddress());

        const L1Handle = await ethers.getContractFactory("Handle", {
            libraries: {
                "contracts/ucl/l1verify/Classification.sol:Classification": await classification.getAddress(),
                "contracts/ucl/l1verify/lib/TokenUtilsLib.sol:TokenUtilsLib": await tokenUtilsLib.getAddress(),
                "contracts/ucl/l1verify/lib/verify/Verifier.sol:Verifier": await verifier.getAddress()
            }, signer: L1Wallet,
        });
        const handle = await L1Handle.deploy();
        await handle.waitForDeployment();
        console.log("L1Handle is deploy at :", handle.target);
        deployed.contracts.L1Handle = handle.target;
    } else {
        deployed.contracts.L1Handle = Fixed_Addresses.L1_HANDLE
        console.log("Use already deployed L1Handle:", Fixed_Addresses.L1_HANDLE);
    }
    console.log("L1HANDLE deployment finished");
}


async function deployL1BlobCommitmentVerify(deployed) {
    console.log("L1BlobCommitmentVerify deployment starts");

    if (Fixed_Addresses.L1_BLOB_COMMITMENT_VERIFY == "") {
        const BlobCommitmentVerify = await ethers.getContractFactory("BlobCommitmentVerify", L1Wallet);
        const blobCommitmentVerify = await BlobCommitmentVerify.deploy();
        await blobCommitmentVerify.waitForDeployment();
        console.log("L1BlobCommitmentVerify is deploy at :", blobCommitmentVerify.target);
        deployed.contracts.L1BlobCommitmentVerify = blobCommitmentVerify.target;
    } else {
        deployed.contracts.L1BlobCommitmentVerify = Fixed_Addresses.L1BlobCommitmentVerify
        console.log("Use already deployed L1BlobCommitmentVerify:", Fixed_Addresses.L1BlobCommitmentVerify);
    }
    console.log("L1HANDLE deployment finished");
}


module.exports = {
    deployLibs,
    deployL2Event,
    deployL1Handle
    ,deployL1BlobCommitmentVerify
}