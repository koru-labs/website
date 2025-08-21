const { ethers, run, network } = require("hardhat");
const hardhatConfig = require('../../hardhat.config');
const accounts = require('./../../deployments/account.json');

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
const ownerWallet = new ethers.Wallet(hardhatConfig.networks.eth_dev.accounts[0], l1Provider);

async function deployHandle() {
    console.log("🚀 开始部署 Handle 合约");
    
    // 首先部署依赖库
    console.log("📦 部署依赖库...");
    
    const Classification = await ethers.getContractFactory("contracts/ucl/l1verify/Classification.sol:Classification",ownerWallet);
    const classification = await Classification.deploy();
    await classification.waitForDeployment();
    console.log("✅ Classification 库部署完成，地址:", await classification.getAddress());
    
    const TokenUtilsLib = await ethers.getContractFactory("contracts/ucl/l1verify/lib/TokenUtilsLib.sol:TokenUtilsLib",ownerWallet);
    const tokenUtilsLib = await TokenUtilsLib.deploy();
    await tokenUtilsLib.waitForDeployment();
    console.log("✅ TokenUtilsLib 库部署完成，地址:", await tokenUtilsLib.getAddress());
    
    const Verifier = await ethers.getContractFactory("contracts/ucl/l1verify/lib/verify/Verifier.sol:Verifier",ownerWallet);
    const verifier = await Verifier.deploy();
    await verifier.waitForDeployment();
    console.log("✅ Verifier 库部署完成，地址:", await verifier.getAddress());
    
    // 部署 Handle 合约并链接库
    console.log("🔗 部署 Handle 合约并链接库...");
    const Handle = await ethers.getContractFactory("Handle", {
        libraries: {
            "contracts/ucl/l1verify/Classification.sol:Classification": await classification.getAddress(),
            "contracts/ucl/l1verify/lib/TokenUtilsLib.sol:TokenUtilsLib": await tokenUtilsLib.getAddress(),
            "contracts/ucl/l1verify/lib/verify/Verifier.sol:Verifier": await verifier.getAddress()
        }
    },ownerWallet);
    
    const handle = await Handle.deploy();
    await handle.waitForDeployment();
    
    console.log("✅ Handle 合约部署完成");
    console.log("📋 合约地址:", await handle.getAddress());


    // 输出部署信息
    console.log("\n📋 部署信息摘要:");
    console.log("=====================================");
    console.log("网络:", network.name);
    console.log("部署者地址:", ownerWallet.address);
    console.log("Classification 库地址:", await classification.getAddress());
    console.log("TokenUtilsLib 库地址:", await tokenUtilsLib.getAddress());
    console.log("Verifier 库地址:", await verifier.getAddress());
    console.log("Handle 合约地址:", await handle.getAddress());
    console.log("=====================================");
    
    return handle;
}


async function deployBlobCommitmentVerify() {
    const BlobCommitmentVerify = await ethers.getContractFactory("BlobCommitmentVerify",ownerWallet);
    const blobCommitmentVerify = await BlobCommitmentVerify.deploy();
    await blobCommitmentVerify.waitForDeployment();
    console.log("L1BlobCommitmentVerify is deploy at :", blobCommitmentVerify.target);
}



deployHandle().then();
// deployBlobCommitmentVerify().then();
