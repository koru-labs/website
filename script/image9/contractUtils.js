const { ethers } = require("hardhat");
const { CONTRACT_CONFIG, TOKEN_SC_BASE_ABI } = require("./config");

// 获取签名者
async function getMySignerInstance() {
  const [signer] = await ethers.getSigners();
  return signer;
}

// 导出签名者
const mySignerPromise = getMySignerInstance();
async function getMySigner() {
  return await mySignerPromise;
}

// Get TokenScBase contract instance
async function getTokenScBaseContract(signer) {
  try {
    if (!signer) {
      const signers = await ethers.getSigners();
      signer = signers[0];
    }
    return new ethers.Contract(CONTRACT_CONFIG.tokenScBase, TOKEN_SC_BASE_ABI, signer);
  } catch (error) {
    console.error("Failed to get contract instance:", error.message);
    throw error;
  }
}

module.exports = { getTokenScBaseContract, getMySigner };