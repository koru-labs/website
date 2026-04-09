const { ethers } = require('hardhat');
const { config, deployed, accounts, createAuthMetadata, convertBigInt2Hex } = require('./utils');

/**
 * 余额查询模块
 * 包含私有余额和公共余额查询功能
 */

/**
 * 通过 gRPC 获取地址余额
 * @param {object} grpcClient - gRPC 客户端
 * @param {string} scAddress - 合约地址
 * @param {string} address - 地址
 * @param {object} meta - 元数据
 */
async function getAddressBalance(grpcClient, scAddress, address, meta) {
  let result = await grpcClient.getAccountBalance(scAddress, address, meta);
  return Number(result.balance);
}

/**
 * 获取公共余额
 * @param {string} account - 账户地址
 */
async function getPublicBalance(account) {
  const contract = await ethers.getContractAt('PrivateUSDC', config.contracts.PrivateERCToken);
  let amount = await contract.balanceOf(account);
  return Number(amount);
}

/**
 * 通过 gRPC 获取地址余额（带解密）
 * @param {object} grpcClient - gRPC 客户端
 * @param {string} scAddress - 合约地址
 * @param {string} account - 账户地址
 */
async function getAddressBalance2(grpcClient, scAddress, account) {
  const metadata = await createAuthMetadata(accounts.OwnerKey);
  const contract = await ethers.getContractAt('PrivateERCToken', scAddress);
  let amount = await contract.privateBalanceOf(account);

  let balance = {
    cl_x: convertBigInt2Hex(amount[0]),
    cl_y: convertBigInt2Hex(amount[1]),
    cr_x: convertBigInt2Hex(amount[2]),
    cr_y: convertBigInt2Hex(amount[3]),
  };
  let result = await grpcClient.getAccountBalance(scAddress, account, metadata);
  let decodeAmount = { balance: '0' };
  if (balance.cl_x != '0') {
    decodeAmount = await grpcClient.decodeElgamalAmount(balance, metadata);
  }

  console.log('===================================================================');
  console.log('Checking Owner Balance');
  console.log('Owner Address:', account);
  console.log('-------------------------------------------------------------------');
  console.log('Decrypted On-chain Balance:', decodeAmount);
  console.log('Database Balance:', result);
  console.log('===================================================================\n');

  return result;
}

/**
 * 获取节点3的总供应量
 * @param {object} grpcClient - gRPC 客户端
 * @param {string} scAddress - 合约地址
 * @param {object} metadata - 元数据
 * @param {object} wallet - 钱包
 */
async function getTotalSupplyNode3(grpcClient, scAddress, metadata, wallet) {
  const contract = await ethers.getContractAt('PrivateERCToken', scAddress, wallet);
  let amount = await contract.privateTotalSupply();
  let balance = {
    cl_x: convertBigInt2Hex(amount[0]),
    cl_y: convertBigInt2Hex(amount[1]),
    cr_x: convertBigInt2Hex(amount[2]),
    cr_y: convertBigInt2Hex(amount[3]),
  };
  console.log(balance);
  let result = await grpcClient.decodeElgamalAmount(balance, metadata);
  console.log(result);
  return Number(result.balance);
}

/**
 * 获取公共总供应量
 * @param {string} scAddress - 合约地址
 */
async function getPublicTotalSupply(scAddress) {
  const contract = await ethers.getContractAt('PrivateERCToken', scAddress);
  let amount = await contract.publicTotalSupply();
  return amount[0];
}

/**
 * 获取分裂代币列表
 * @param {object} grpcClient - gRPC 客户端
 * @param {string} owner - 所有者地址
 * @param {string} scAddress - 合约地址
 * @param {object} metadata - 元数据
 */
async function getSplitTokenList(grpcClient, owner, scAddress, metadata) {
  const grpcResult = await grpcClient.getSplitTokenList(owner, scAddress, metadata);
  return grpcResult;
}

/**
 * 获取审批代币列表
 * @param {object} grpcClient - gRPC 客户端
 * @param {string} ownerAddress - 所有者地址
 * @param {string} scAddress - 合约地址
 * @param {string} spenderAddress - 消费方地址
 * @param {object} metadata - 元数据
 */
async function getApproveTokenList(grpcClient, ownerAddress, scAddress, spenderAddress, metadata) {
  console.log({ ownerAddress, scAddress, spenderAddress });
  const grpcResult = await grpcClient.getApproveTokenList(ownerAddress, scAddress, '', metadata);
  return grpcResult;
}

/**
 * 检查审批是否存在
 * @param {string} scAddress - 合约地址
 * @param {string} owner - 所有者地址
 * @param {string} spender - 消费方地址
 * @param {bigint} tokenId - 代币 ID
 */
async function isAllowanceExists(scAddress, owner, spender, tokenId) {
  const contract = await ethers.getContractAt('PrivateERCToken', scAddress);
  const result = await contract.isAllowanceExists(owner, spender, tokenId);
  return result;
}

/**
 * 获取铸造者允许的金额
 * @param {object} grpcClient - gRPC 客户端
 * @param {object} meta - 元数据
 */
async function getMinterAllowed(grpcClient, meta) {
  const Request = {
    sc_address: config.contracts.PrivateERCToken,
    address: accounts.Minter,
  };
  const grpcResult = await grpcClient.getMintAllowed(Request, meta);
  return Number(grpcResult.amount);
}

module.exports = {
  getAddressBalance,
  getPublicBalance,
  getAddressBalance2,
  getTotalSupplyNode3,
  getPublicTotalSupply,
  getSplitTokenList,
  getApproveTokenList,
  isAllowanceExists,
  getMinterAllowed,
};
