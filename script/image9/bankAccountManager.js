const { ethers } = require("hardhat");
const hre = require("hardhat");
const { CONTRACT_CONFIG } = require("./config");

// 获取合约 ABI
async function getTokenScBaseAbi() {
  try {
    // 从已部署合约获取 ABI
    const artifact = await hre.artifacts.readArtifact("TokenScBase");
    return artifact.abi;
  } catch (error) {
    console.error("Failed to get TokenScBase ABI:", error.message);
    throw error;
  }
}

// Add bank account
async function addBankAccount(account) {
  try {
    console.log(`Adding bank account: ${account}`);
    
    // 获取签名者
    const [signer] = await ethers.getSigners();
    
    // 从配置文件中读取合约地址
    const tokenScAddress = CONTRACT_CONFIG.tokenScBase;
    
    // 获取 ABI
    const abi = await getTokenScBaseAbi();
    
    // 创建合约实例
    const tokenScBase = new ethers.Contract(tokenScAddress, abi, signer);
    
    // 调用合约方法
    const tx = await tokenScBase.addBankAccount(account);
    await tx.wait();
    
    console.log(`Successfully added bank account: ${account}`);
    return tx;
  } catch (error) {
    console.error(`Failed to add bank account: ${error.message}`);
    throw error;
  }
}

// Remove bank account
async function removeBankAccount(account) {
  try {
    console.log(`Removing bank account: ${account}`);
    
    // 获取签名者
    const [signer] = await ethers.getSigners();
    
    // 从配置文件中读取合约地址
    const tokenScAddress = CONTRACT_CONFIG.tokenScBase;
    
    // 获取 ABI
    const abi = await getTokenScBaseAbi();
    
    // 创建合约实例
    const tokenScBase = new ethers.Contract(tokenScAddress, abi, signer);
    
    // 调用合约方法
    const tx = await tokenScBase.removeBankAccount(account);
    await tx.wait();
    
    console.log(`Successfully removed bank account: ${account}`);
    return tx;
  } catch (error) {
    console.error(`Failed to remove bank account: ${error.message}`);
    throw error;
  }
}

// Check if address is a bank account
async function isBankAccount(account) {
  try {
    // 获取签名者
    const [signer] = await ethers.getSigners();
    
    // 从配置文件中读取合约地址
    const tokenScAddress = CONTRACT_CONFIG.tokenScBase;
    
    // 获取 ABI
    const abi = await getTokenScBaseAbi();
    
    // 创建合约实例（只读）
    const tokenScBase = new ethers.Contract(tokenScAddress, abi, signer);
    
    // 调用合约方法
    const result = await tokenScBase.isBankAccount(account);
    
    return result;
  } catch (error) {
    console.error(`Failed to check if account is bank account: ${error.message}`);
    throw error;
  }
}

module.exports = { addBankAccount, removeBankAccount, isBankAccount };