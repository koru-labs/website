const { ethers } = require('hardhat');
const axios = require('axios');
const grpc = require('@grpc/grpc-js');
const { getEnvironmentConfig, getImage9EnvironmentData } = require('../deploy_help');
const config = getImage9EnvironmentData();
const deployed = config;
const accounts = require('../../deployments/account.json');
const configuration = getEnvironmentConfig();

const l1Provider = ethers.provider;

/**
 * 工具函数模块
 * 包含基础工具函数和 HTTP/RPC 调用
 */

const node3Institution = configuration.institutions.find((institution) => institution.name === 'Node3');
if (!node3Institution) {
  throw new Error('Node3 institution not found in config');
}

const node4Institution = configuration.institutions.find((institution) => institution.name === 'Node4');
if (!node4Institution) {
  throw new Error('Node4 institution not found in config');
}

const key = node3Institution.privateKey;

/**
 * 发送 HTTP RPC 请求
 * @param {string} httpUrl - HTTP URL
 * @param {string} endpoint - 端点
 * @param {object} body - 请求体
 * @param {object} headers - 请求头
 */
async function sendHttpRPC(httpUrl, endpoint, body, headers) {
  const url = `${httpUrl}${endpoint}`;
  try {
    console.log('[HTTP] ➜', url);
    const res = await axios.post(url, body, { headers, timeout: 15000 });
    return res.data;
  } catch (e) {
    console.error('[HTTP] ❌', e.response?.data || e.message);
    throw e;
  }
}

/**
 * 十六进制转十进制
 * @param {string} hexString - 十六进制字符串
 */
function hexToDecimal(hexString) {
  const hex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
  const bigIntValue = BigInt('0x' + hex);

  if (bigIntValue <= Number.MAX_SAFE_INTEGER) {
    return Number(bigIntValue);
  } else {
    return bigIntValue.toString();
  }
}

/**
 * BigInt 转十六进制字符串
 * @param {bigint|number} number - 数字
 */
function convertBigInt2Hex(number) {
  return ethers.toBigInt(number).toString(10);
}

/**
 * 转换父代币 ID 列表
 * @param {string[]} parentTokenIds - 父代币 ID 列表
 */
function convertParentTokenIds(parentTokenIds) {
  return parentTokenIds.map((id) => {
    const bigIntValue = ethers.toBigInt(`0x${id}`);
    return uint256ToBytes32(bigIntValue);
  });
}

/**
 * uint256 转 Bytes32
 * @param {bigint} uint256 - uint256 值
 */
function uint256ToBytes32(uint256) {
  if (typeof uint256 !== 'bigint') {
    throw new Error('Input must be a BigInt');
  }
  let hexString = uint256.toString(16);
  hexString = hexString.padStart(64, '0');
  const bytes32 = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes32[i] = parseInt(hexString.slice(i * 2, (i + 1) * 2), 16);
  }
  return bytes32;
}

/**
 * 睡眠函数
 * @param {number} ms - 毫秒
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 创建 gRPC 认证元数据
 * @param {string} privateKey - 私钥
 * @param {string} messagePrefix - 消息前缀
 */
async function createAuthMetadata(privateKey, messagePrefix = 'login') {
  const wallet = new ethers.Wallet(privateKey);
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${messagePrefix}_${timestamp}`;
  const signature = await wallet.signMessage(message);

  const metadata = new grpc.Metadata();
  metadata.set('signature', signature);
  metadata.set('message', message);
  return metadata;
}

module.exports = {
  sendHttpRPC,
  hexToDecimal,
  convertBigInt2Hex,
  convertParentTokenIds,
  uint256ToBytes32,
  sleep,
  createAuthMetadata,
  // 导出配置
  config,
  deployed,
  accounts,
  configuration,
  l1Provider,
  key,
  node3Institution,
  node4Institution,
};
