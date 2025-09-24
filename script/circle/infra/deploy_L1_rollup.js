const {ethers} = require("hardhat");
const {saveDeploymentInfo, loadExistingDeploymentsForL1} = require("../deploy_help");
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const {ADDRESSES: Fixed_Addresses} = require("../configuration");


async function deployL1Handle(deployed) {
    console.log("L1VerifyAddress deployment starts");
    const [L1Wallet] = await ethers.getSigners();
    if (Fixed_Addresses.L1_VERIFY_ADDRESS == "") {
        const Classification = await ethers.getContractFactory("contracts/ucl/l1verify/Classification.sol:Classification", L1Wallet);
        const classification = await Classification.deploy();
        await classification.waitForDeployment();
        // console.log("L1 Classification is deploy at :", await classification.getAddress());

        const TokenUtilsLib = await ethers.getContractFactory("contracts/ucl/l1verify/lib/TokenUtilsLib.sol:TokenUtilsLib", L1Wallet);
        const tokenUtilsLib = await TokenUtilsLib.deploy();
        await tokenUtilsLib.waitForDeployment();
        // console.log("L1 TokenUtilsLib is deploy at :", await tokenUtilsLib.getAddress());

        const Verifier = await ethers.getContractFactory("contracts/ucl/l1verify/lib/verify/Verifier.sol:Verifier", L1Wallet);
        const verifier = await Verifier.deploy();
        await verifier.waitForDeployment();
        // console.log("Verifier is deploy at :", await verifier.getAddress());

        const L1Handle = await ethers.getContractFactory("Handle", {
            libraries: {
                "contracts/ucl/l1verify/Classification.sol:Classification": await classification.getAddress(),
                "contracts/ucl/l1verify/lib/TokenUtilsLib.sol:TokenUtilsLib": await tokenUtilsLib.getAddress(),
                "contracts/ucl/l1verify/lib/verify/Verifier.sol:Verifier": await verifier.getAddress()
            }, signer: L1Wallet,
        });
        const handle = await L1Handle.deploy();
        await handle.waitForDeployment();
        console.log("L1VerifyAddress is deploy at :", handle.target);
        deployed.contracts.L1VerifyAddress = handle.target;
    } else {
        deployed.contracts.L1VerifyAddress = Fixed_Addresses.L1_VERIFY_ADDRESS
        console.log("Use already deployed L1VerifyAddress:", Fixed_Addresses.L1_VERIFY_ADDRESS);
    }
    console.log("L1VerifyAddress deployment finished");
}


async function deployL1BlobCommitmentVerify(deployed) {
    console.log("L1BlobCommitmentVerify deployment starts");
    const [L1Wallet] = await ethers.getSigners();
    if (Fixed_Addresses.L1_BLOB_COMMITMENT_VERIFY == "") {
        const BlobCommitmentVerify = await ethers.getContractFactory("BlobCommitmentVerify", L1Wallet);
        const blobCommitmentVerify = await BlobCommitmentVerify.deploy();
        await blobCommitmentVerify.waitForDeployment();
        console.log("L1BlobCommitmentVerify is deploy at :", blobCommitmentVerify.target);
        deployed.contracts.L1BlobCommitmentVerify = blobCommitmentVerify.target;
    } else {
        deployed.contracts.L1BlobCommitmentVerify = Fixed_Addresses.L1_BLOB_COMMITMENT_VERIFY
        console.log("Use already deployed L1BlobCommitmentVerify:", Fixed_Addresses.L1_BLOB_COMMITMENT_VERIFY);
    }
    console.log("L1HANDLE deployment finished");
}


async function deployL1Contract() {
    let deployed = await loadExistingDeploymentsForL1();
    if (!deployed) {
        deployed = {
            libraries: {},
            contracts: {},
            accounts: {},
        };
    }
    await deployL1Handle(deployed);
    //need hardhat config ,Enable the parameter: evmVersion: "cancun",
    // and change the contract BlobCommitmentVerify.sol.bak to BlobCommitmentVerify.sol
    await deployL1BlobCommitmentVerify(deployed);
    await saveDeploymentInfo(deployed, hre, ethers, fs, path);
}

deployL1Contract().then();