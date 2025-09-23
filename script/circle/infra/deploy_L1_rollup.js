const {ethers} = require("hardhat");


async function deployHandle() {
    const [ownerWallet] = await ethers.getSigners();

    
    const Classification = await ethers.getContractFactory("contracts/ucl/l1verify/Classification.sol:Classification",ownerWallet);
    const classification = await Classification.deploy();
    await classification.waitForDeployment();
    console.log("Classification is deploy at :", await classification.getAddress())
    
    const TokenUtilsLib = await ethers.getContractFactory("contracts/ucl/l1verify/lib/TokenUtilsLib.sol:TokenUtilsLib",ownerWallet);
    const tokenUtilsLib = await TokenUtilsLib.deploy();
    await tokenUtilsLib.waitForDeployment();
    console.log("TokenUtilsLib is deploy at :", await tokenUtilsLib.getAddress())

    const Verifier = await ethers.getContractFactory("contracts/ucl/l1verify/lib/verify/Verifier.sol:Verifier",ownerWallet);
    const verifier = await Verifier.deploy();
    await verifier.waitForDeployment();
    console.log("Verifier is deploy at :", await verifier.getAddress())

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
    
    console.log("handle contract deploy done");
    console.log("Handle is deploy at :", await handle.getAddress())


    console.log("=====================================");
    console.log("network:", network.name);
    console.log("Deployer address:", ownerWallet.address);
    console.log("Classification address:", await classification.getAddress());
    console.log("TokenUtilsLib address:", await tokenUtilsLib.getAddress());
    console.log("Verifier address:", await verifier.getAddress());
    console.log("Handle address:", await handle.getAddress());
    console.log("=====================================");
    
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



// deployHandle().then();
// deployBlobCommitmentVerify().then();

deployL1Contract().then();
