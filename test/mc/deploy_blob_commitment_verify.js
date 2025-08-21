const { ethers } = require("hardhat");

async function main() {
  // 获取合约工厂
  const BlobCommitmentVerify = await ethers.getContractFactory("BlobCommitmentVerify");
  
  // 部署合约
  console.log("Deploying BlobCommitmentVerify...");
  const blobCommitmentVerify = await BlobCommitmentVerify.deploy();
  
  // 等待部署完成
  await blobCommitmentVerify.waitForDeployment();
  
  // 获取合约地址
  const contractAddress = await blobCommitmentVerify.getAddress();
  
  console.log("BlobCommitmentVerify deployed to:", contractAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });