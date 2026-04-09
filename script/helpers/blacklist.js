const { ethers } = require('hardhat');
const { config, l1Provider } = require('./utils');

/**
 * 黑名单操作模块
 * 包含黑名单查询、添加、移除等功能
 */

const OWNER_PRIVATE_KEY = '555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787';

/**
 * 检查地址是否在黑名单中
 * @param {string} userAddress - 用户地址
 */
async function isBlackList(userAddress) {
  const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY, l1Provider);
  const contract = await ethers.getContractAt('PrivateUSDC', config.contracts.PrivateERCToken, ownerWallet);
  let tx = await contract.isBlacklisted(userAddress);
  return tx;
}

/**
 * 添加地址到黑名单
 * @param {string} userAddress - 用户地址
 */
async function addToBlackList(userAddress) {
  const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY, l1Provider);
  const contract = await ethers.getContractAt('PrivateUSDC', config.contracts.PrivateERCToken, ownerWallet);
  await contract.blacklist(userAddress);
}

/**
 * 从黑名单移除地址
 * @param {string} userAddress - 用户地址
 */
async function removeFromBlackList(userAddress) {
  const ownerWallet = new ethers.Wallet(OWNER_PRIVATE_KEY, l1Provider);
  const contract = await ethers.getContractAt('PrivateUSDC', config.contracts.PrivateERCToken, ownerWallet);
  await contract.unBlacklist(userAddress);
}

module.exports = {
  isBlackList,
  addToBlackList,
  removeFromBlackList,
};
