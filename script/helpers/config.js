const { ethers } = require('hardhat');
const { config, deployed, accounts, createAuthMetadata, sleep, key } = require('./utils');

/**
 * 配置相关模块
 * 包含铸造者配置、用户管理等功能
 */

/**
 * 注册配置铸造者
 * @param {string} address - 地址
 */
async function registerConfigureMinter(address) {
  const minterAllowedAmount = {
    cl_x: 17965178807605681775593476527901391566646357775548805416191630067931921590266n,
    cl_y: 17997503520096523373978760079614633178183544935372525079367653487073845131371n,
    cr_x: 2799658707790704252170544877645553735081603739176317448125814928308770685127n,
    cr_y: 10724405929777949929088094477911843117820716522007699467531083531418761611245n,
  };
  console.log('Configure minter allowed amount...');
  const minters = [{ account: address, name: 'Minter' }];
  const l1CustomNetwork = {
    name: 'BESU',
    chainId: 1337,
  };
  const options = {
    batchMaxCount: 1,
    staticNetwork: true,
  };
  const l1Provider = new ethers.JsonRpcProvider(L1Url, l1CustomNetwork, options);
  let ownerWallet = new ethers.Wallet(key, l1Provider);
  const privateUSDC = await ethers.getContractAt('PrivateUSDC', config.contracts.PrivateERCToken, ownerWallet);
  try {
    for (const minter of minters) {
      await privateUSDC.configurePrivacyMinter(minter.account, minterAllowedAmount);
      console.log(`Minter allowed amount configured successfully for ${minter.name} (${minter.account})`);
      const Institution = await ethers.getContractAt('InstitutionUserRegistry', config.contracts.InstUserProxy, ownerWallet);
      console.log('manager: ', await Institution.getUserManager(address));
    }
  } catch (error) {
    console.log(error);
  }
}

/**
 * 允许银行在代币智能合约中
 * @param {string} minterAddress - 银行地址
 */
async function allowBanksInTokenSmartContract(minterAddress) {
  console.log(`Bank ${minterAddress} is allowed by default (blacklist mode). No action needed.`);
}

/**
 * 获取用户管理器
 * @param {string} address - 地址
 */
async function getUserManager(address) {
  const InstRegistry = await ethers.getContractFactory('InstitutionUserRegistry', {
    libraries: {
      TokenEventLib: deployed.libraries.TokenEventLib,
    },
  });
  const instRegistry = await InstRegistry.attach(config.contracts.InstUserProxy);
  let inst = await instRegistry.getUserManager(address);
  console.log('user registration ', inst);
  let inst1 = await instRegistry.getUserInstGrumpkinPubKey(address);
  console.log('user registration ', inst1);
}

/**
 * 设置铸造者允许的金额
 * @param {object} client - gRPC 客户端
 * @param {string} minterAddress - 铸造者地址
 */
async function setMinterAllowed(client, minterAddress) {
  console.log('Configuring minter allowed amount...');
  const PrivateUSDCFactory = await ethers.getContractFactory('PrivateUSDC', {
    libraries: {
      TokenEventLib: deployed.libraries.TokenEventLib,
      TokenUtilsLib: deployed.libraries.TokenUtilsLib,
      TokenVerificationLib: deployed.libraries.TokenVerificationLib,
      SignatureChecker: deployed.libraries.SignatureChecker,
    },
  });
  const privateUSDC = await PrivateUSDCFactory.attach(deployed.contracts.PrivateERCToken);
  const metadata = await createAuthMetadata(accounts.OwnerKey);
  let response = await client.encodeElgamalAmount(100000000, metadata);
  const tokenId = ethers.toBigInt(response.token_id);
  const clx = ethers.toBigInt(response.amount.cl_x);
  const cly = ethers.toBigInt(response.amount.cl_y);
  const crx = ethers.toBigInt(response.amount.cr_x);
  const cry = ethers.toBigInt(response.amount.cr_y);
  const minterAllowedAmount = {
    id: tokenId,
    cl_x: clx,
    cl_y: cly,
    cr_x: crx,
    cr_y: cry,
  };
  await privateUSDC.configurePrivacyMinter(minterAddress, minterAllowedAmount);
  await privateUSDC.configureMinter(minterAddress, 100000000);
  console.log(`Minter allowed amount configured successfully for ${minterAddress} `);
}

module.exports = {
  registerConfigureMinter,
  allowBanksInTokenSmartContract,
  getUserManager,
  setMinterAllowed,
};
