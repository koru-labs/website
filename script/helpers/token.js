const { ethers } = require('hardhat');
const { convertBigInt2Hex, convertParentTokenIds, sleep } = require('./utils');

/**
 * 私有代币操作模块
 * 包含私有代币的铸造、转账、销毁、审批等操作
 */

/**
 * 调用私有铸造
 * @param {string} scAddress - 合约地址
 * @param {object} proofResult - 证明结果
 * @param {object} minterWallet - 铸造者钱包
 */
async function callPrivateMint(scAddress, proofResult, minterWallet) {
  const contract = await ethers.getContractAt('PrivateERCToken', scAddress, minterWallet);
  const newToken = {
    id: ethers.toBigInt(proofResult.token.token_id),
    owner: proofResult.to_address,
    status: 2,
    amount: {
      cl_x: ethers.toBigInt(proofResult.token.cl_x),
      cl_y: ethers.toBigInt(proofResult.token.cl_y),
      cr_x: ethers.toBigInt(proofResult.token.cr_x),
      cr_y: ethers.toBigInt(proofResult.token.cr_y),
    },
    to: proofResult.to_address,
    rollbackTokenId: ethers.toBigInt(0),
    tokenType: 2,
  };

  const mintAllowed = {
    id: ethers.toBigInt(proofResult.mint_allowed.token_id),
    cl_x: ethers.toBigInt(proofResult.mint_allowed.cl_x),
    cl_y: ethers.toBigInt(proofResult.mint_allowed.cl_y),
    cr_x: ethers.toBigInt(proofResult.mint_allowed.cr_x),
    cr_y: ethers.toBigInt(proofResult.mint_allowed.cr_y),
  };
  const supplyAmount = {
    id: ethers.toBigInt(proofResult.supply_amount.token_id),
    cl_x: ethers.toBigInt(proofResult.supply_amount.cl_x),
    cl_y: ethers.toBigInt(proofResult.supply_amount.cl_y),
    cr_x: ethers.toBigInt(proofResult.supply_amount.cr_x),
    cr_y: ethers.toBigInt(proofResult.supply_amount.cr_y),
  };
  const proof = proofResult.proof.map((p) => ethers.toBigInt(p));
  const input = proofResult.input.map((i) => ethers.toBigInt(i));

  const tx = await contract.privateMint(proofResult.to_address, newToken, mintAllowed, supplyAmount, proof, input);
  let receipt = await tx.wait();
  await sleep(1000);
  return receipt;
}

/**
 * 调用私有转账
 * @param {object} wallet - 钱包
 * @param {string} scAddress - 合约地址
 * @param {bigint} tokenId - 代币 ID
 */
async function callPrivateTransfer(wallet, scAddress, tokenId) {
  const contract = await ethers.getContractAt('PrivateUSDC', scAddress, wallet);
  console.log('contract address is :', contract.target);
  const tx = await contract.privateTransfers([tokenId]);
  let receipt = await tx.wait();
  console.log('Result:', receipt);
  return receipt;
}

/**
 * 批量调用私有转账
 * @param {object} wallet - 钱包
 * @param {string} scAddress - 合约地址
 * @param {bigint[]} tokenIds - 代币 ID 列表
 */
async function callPrivateTransfers(wallet, scAddress, tokenIds) {
  const contract = await ethers.getContractAt('PrivateUSDC', scAddress, wallet);
  const tx = await contract.privateTransfers(tokenIds);
  let receipt = await tx.wait();
  console.log('Result:', receipt);
  return receipt;
}

/**
 * 调用私有销毁
 * @param {string} scAddress - 合约地址
 * @param {bigint} tokenId - 代币 ID
 * @param {object} minterWallet - 铸造者钱包
 */
async function callPrivateBurn2(scAddress, tokenId, minterWallet) {
  const contract = await ethers.getContractAt('PrivateERCToken', scAddress, minterWallet);
  const tx = await contract.privateBurn(tokenId);
  let receipt = await tx.wait();

  return receipt;
}

/**
 * 调用私有审批
 * @param {string} scAddress - 合约地址
 * @param {object} proofResult - 证明结果
 * @param {object} ownerWallet - 所有者钱包
 */
async function callPrivateApprove(scAddress, proofResult, ownerWallet) {
  const contract = await ethers.getContractAt('PrivateERCToken', scAddress, ownerWallet);

  const consumedTokens = convertParentTokenIds(proofResult.parentTokenId);
  const transferAmount = {
    cl_x: ethers.toBigInt(proofResult.allowance.cl_x),
    cl_y: ethers.toBigInt(proofResult.allowance.cl_y),
    cr1_x: ethers.toBigInt(proofResult.allowance.cr1_x),
    cr1_y: ethers.toBigInt(proofResult.allowance.cr1_y),
    cr2_x: ethers.toBigInt(proofResult.allowance.cr2_x),
    cr2_y: ethers.toBigInt(proofResult.allowance.cr2_y),
  };
  const remainingAmount = {
    cl_x: ethers.toBigInt(proofResult.new_balance.cl_x),
    cl_y: ethers.toBigInt(proofResult.new_balance.cl_y),
    cr_x: ethers.toBigInt(proofResult.new_balance.cr_x),
    cr_y: ethers.toBigInt(proofResult.new_balance.cr_y),
  };

  const proofData = Buffer.from(proofResult.proof, 'hex');

  const tx = await contract.privateApprove(consumedTokens, proofResult.to_address, transferAmount, remainingAmount, proofData);
  let receipt = await tx.wait();
  return receipt;
}

/**
 * 调用私有从转账
 * @param {object} wallet - 钱包
 * @param {string} scAddress - 合约地址
 * @param {string} from - 发送方地址
 * @param {string} to - 接收方地址
 * @param {bigint} tokenId - 代币 ID
 */
async function callPrivateTransferFrom(wallet, scAddress, from, to, tokenId) {
  const contract = await ethers.getContractAt('PrivateERCToken', scAddress, wallet);
  const tx = await contract.privateTransferFroms([tokenId], from, to);
  let receipt = await tx.wait();
  return receipt;
}

/**
 * 批量调用私有从转账
 * @param {object} wallet - 钱包
 * @param {string} scAddress - 合约地址
 * @param {string} from - 发送方地址
 * @param {string} to - 接收方地址
 * @param {bigint[]} tokenIds - 代币 ID 列表
 */
async function callPrivateTransferFroms(wallet, scAddress, from, to, tokenIds) {
  const contract = await ethers.getContractAt('PrivateERCToken', scAddress, wallet);
  const tx = await contract.privateTransferFroms(tokenIds, from, to);
  let receipt = await tx.wait();
  return receipt;
}

/**
 * 批量从销毁
 * @param {object} wallet - 钱包
 * @param {string} scAddress - 合约地址
 * @param {string} from - 发送方地址
 * @param {bigint[]} tokenIds - 代币 ID 列表
 */
async function callPrivateBurnFroms(wallet, scAddress, from, tokenIds) {
  const contract = await ethers.getContractAt('PrivateERCToken', scAddress, wallet);
  const tx = await contract.privateBurnFroms(from, tokenIds);
  let receipt = await tx.wait();
  return receipt;
}

/**
 * 批量销毁
 * @param {string} scAddress - 合约地址
 * @param {object} wallet - 钱包
 * @param {bigint[]} tokenIds - 代币 ID 列表
 */
async function callPrivateBurns(scAddress, wallet, tokenIds) {
  const contract = await ethers.getContractAt('PrivateERCToken', scAddress, wallet);
  const tx = await contract.privateBurns(tokenIds);
  let receipt = await tx.wait();
  return receipt;
}

/**
 * 调用私有销毁
 * @param {string} scAddress - 合约地址
 * @param {object} wallet - 钱包
 * @param {bigint} tokenId - 代币 ID
 */
async function callPrivateBurn(scAddress, wallet, tokenId) {
  return callPrivateBurns(scAddress, wallet, [tokenId]);
}

/**
 * 调用私有取消
 * @param {string} scAddress - 合约地址
 * @param {object} wallet - 钱包
 * @param {bigint} tokenId - 代币 ID
 */
async function callPrivateCancel(scAddress, wallet, tokenId) {
  const contract = await ethers.getContractAt('PrivateERCToken', scAddress, wallet);
  let tx = await contract.privateCancelToken(tokenId);
  let receipt = await tx.wait();
  return receipt;
}

/**
 * 调用私有撤销审批
 * @param {string} scAddress - 合约地址
 * @param {object} wallet - 钱包
 * @param {string} spenderAddress - 消费方地址
 * @param {bigint} tokenId - 代币 ID
 */
async function callPrivateRevoke(scAddress, wallet, spenderAddress, tokenId) {
  const contract = await ethers.getContractAt('PrivateERCToken', scAddress, wallet);
  let tx = await contract.privateRevokeApproval(spenderAddress, tokenId);
  let receipt = await tx.wait();
  return receipt;
}

module.exports = {
  callPrivateMint,
  callPrivateTransfer,
  callPrivateTransfers,
  callPrivateBurn,
  callPrivateBurn2,
  callPrivateBurns,
  callPrivateBurnFroms,
  callPrivateApprove,
  callPrivateTransferFrom,
  callPrivateTransferFroms,
  callPrivateCancel,
  callPrivateRevoke,
};
