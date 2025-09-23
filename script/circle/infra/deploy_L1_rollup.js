const {ethers} = require("hardhat");


async function deployHandle() {
    const [ownerWallet] = await ethers.getSigners();
    const Classification = await ethers.getContractFactory("contracts/ucl/l1verify/Classification.sol:Classification",ownerWallet);
    const classification = await Classification.deploy();
    await classification.waitForDeployment();

    const TokenUtilsLib = await ethers.getContractFactory("contracts/ucl/l1verify/lib/TokenUtilsLib.sol:TokenUtilsLib",ownerWallet);
    const tokenUtilsLib = await TokenUtilsLib.deploy();
    await tokenUtilsLib.waitForDeployment();

    const Verifier = await ethers.getContractFactory("contracts/ucl/l1verify/lib/verify/Verifier.sol:Verifier",ownerWallet);
    const verifier = await Verifier.deploy();
    await verifier.waitForDeployment();

    // deploy Handle
    const Handle = await ethers.getContractFactory("Handle", {
        libraries: {
            "contracts/ucl/l1verify/Classification.sol:Classification": await classification.getAddress(),
            "contracts/ucl/l1verify/lib/TokenUtilsLib.sol:TokenUtilsLib": await tokenUtilsLib.getAddress(),
            "contracts/ucl/l1verify/lib/verify/Verifier.sol:Verifier": await verifier.getAddress()
        }
    },ownerWallet);
    
    const handle = await Handle.deploy();
    await handle.waitForDeployment();

    console.log("L1RollupVerifyscAddress is deploy at:", await handle.getAddress());

    return handle;
}


async function deployBlobCommitmentVerify() {
    const [ownerWallet] = await ethers.getSigners();
    const BlobCommitmentVerify = await ethers.getContractFactory("BlobCommitmentVerify",ownerWallet);
    const blobCommitmentVerify = await BlobCommitmentVerify.deploy();
    await blobCommitmentVerify.waitForDeployment();
    console.log("L1BlobCommitmentVerify is deploy at :", blobCommitmentVerify.target);
}

async function deployL1Contract() {
    await deployHandle();
    //need hardhat config ,Enable the parameter: evmVersion: "cancun",
    // and change the contract BlobCommitmentVerify.sol.bak to BlobCommitmentVerify.sol
    await deployBlobCommitmentVerify();
}

deployL1Contract().then();
