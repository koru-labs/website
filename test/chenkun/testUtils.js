const assert = require('node:assert');

const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
// const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc');

const grpc = require("@grpc/grpc-js");
const {testConvert2pUSDCWithProvidedData} = require("../sun/private_usdc_test");
const { getEnvironmentConfig } = require('../../script/deploy_help.js')
const configuration = getEnvironmentConfig();;
const {getImage9EnvironmentData} = require("../../script/deploy_help");
// const rpcUrl = "localhost:50051";
// const rpcUrl = "qa-node3-rpc.hamsa-ucl.com:50051";
// find node3 institution
const node3Institution = configuration.institutions.find(institution => institution.name === "Node3");
if (!node3Institution) {
  throw new Error("Node3 institution not found in config");
}
const rpcUrl = node3Institution.rpcUrl;
// const rpcUrl = "localhost:50051";
const deployed = getImage9EnvironmentData();

// Initialize client and provider
const client = createClient(rpcUrl);
const l1Provider = ethers.provider;

/**
 * Configuration Constants
 */
const CONSTANTS = {
  // RPC URL configuration
  // rpcUrl: "127.0.0.1:50051",
  rpcUrl: rpcUrl,
  // rpcUrl: "a9c20a6c009e44a11b75092155632a0e-1098386893.us-west-1.elb.amazonaws.com:50051",

  // Network configuration
  network: {
    name: "BESU",
    chainId: 1337
  },

  // Provider options
  providerOptions: {
    batchMaxCount: 1,
    staticNetwork: true
  },

  // Test amount
  defaultAmount: 1,

  // Wait times (milliseconds)
  waitTimes: {
    short: 1000,
    medium: 2000,
    long: 5000
  }
};

// Initialize wallets
const adminWallet = new ethers.Wallet(accounts.OwnerKey, l1Provider);
const minterWallet = new ethers.Wallet(accounts.MinterKey, l1Provider);
const to1Wallet = new ethers.Wallet(accounts.To1PrivateKey, l1Provider);
const spenderWallet = new ethers.Wallet(accounts.Spender1Key, l1Provider);

// const junjieWallet = new ethers.Wallet(accounts.JunjieKey, l1Provider);

// Import test helper functions
const {
  callPrivateMint,
  callPrivateTransfer,
  callPrivateTransferFrom,
  getAddressBalance,
  callPrivateCancel,
  callPrivateRevoke,
  callPrivateBurn,
  getPublicTotalSupply,
  getAddressBalance2,
  getTotalSupplyNode3,
  getToken,
} = require("../help/testHelp");

/**
 * Utility function - Sleep for specified milliseconds
 * @param {number} ms - Sleep time in milliseconds
 * @returns {Promise} - Promise object
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create authentication metadata
 * @param {string} privateKey - Private key
 * @param {string} messagePrefix - Message prefix, default is "login"
 * @returns {Promise<grpc.Metadata>} - Metadata containing authentication information
 */
async function createAuthMetadata(privateKey, messagePrefix = "login") {
  const wallet = new ethers.Wallet(privateKey);
  const timestamp = Math.floor(Date.now() / 1000);
  const message = `${messagePrefix}_${timestamp}`;
  const signature = await wallet.signMessage(message);

  const metadata = new grpc.Metadata();
  metadata.set('address', wallet.address.toLowerCase());
  metadata.set('signature', signature);
  metadata.set('message', message);

  return metadata;
}

/**
 * Check account balance
 * @param {string} account - Account address
 * @returns {Promise<void>}
 */
async function checkBalance(account) {
  try {
    await getAddressBalance(client, config.contracts.PrivateERCToken, account);
  } catch (error) {
    console.error(`Check balance failed: ${error.message}`);
  }
}

/**
 * ===== Basic Operation Test Functions =====
 */

/**
 * Initial minting test
 * @returns {Promise<void>}
 */
async function mintForStart() {
  try {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    const generateRequest = {
      sc_address: deployed.contracts.PrivateERCToken,
      token_type: '0',
      from_address:accounts.Minter,
      to_address: accounts.Minter,
      amount: 100
    };

    console.log("Starting to generate mint proof...");
    let response = await client.generateMintProof(generateRequest, metadata);
    console.log("Mint proof generation response:", response);

    console.log("Executing on-chain minting operation...");
    let receipt = await callPrivateMint(deployed.contracts.PrivateERCToken, response, minterWallet);
    console.log("Minting transaction receipt:", receipt);

    return receipt;
  } catch (error) {
    console.error(`Minting test failed: ${error.message}`);
    throw error;
  }
}

async function batchedMint() {
  try {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    const to_accounts = [
      {
        address: accounts.To1,
        amount: 1
      },
      {
        address: accounts.To1,
        amount: 2
      },
      {
        address: accounts.To1,
        amount: 3
      },
      {
        address: accounts.Minter,
        amount: 4
      },
      {
        address: accounts.Minter,
        amount: 5
      }
    ]
    const generateRequest = {
      sc_address: deployed.contracts.PrivateERCToken,
      token_type: '0',
      from_address:accounts.Minter,
      to_accounts: to_accounts,
    };

    console.log("Starting to generate mint proof...");
    let response = await client.generateBatchMintProof(generateRequest, metadata);
    response.to_accounts.forEach((account, index) => {
      console.log(`\n--- 账户 ${index + 1} ---`);
      console.log(`地址: ${account.address}`);
      console.log("Token详情:", JSON.stringify(account.token, null, 2));
      console.log("supply详情:", JSON.stringify(account.supply_amount, null, 2));
    });
    console.log("Mint proof generation response:", response);
    const Verifier = await ethers.getContractFactory("BatchedMintAllowedTokenVerifier");
    const child = await Verifier.deploy();
    await child.waitForDeployment();
    const proof = response.proof.map(p => ethers.toBigInt(p));
    const input = response.input.map(i => ethers.toBigInt(i));
    let tx = child.verifyProof(proof,input)
    console.log(tx)
    return receipt;
  } catch (error) {
    console.error(`Minting test failed: ${error.message}`);
    throw error;
  }
}

/**
 * ===== Direct Transaction Test Functions =====
 */

/**
 * Test direct minting
 * @returns {Promise<void>}
 */
async function testDirectMintByAuth() {
  try {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    console.time('testDirectMint');

    const generateRequest = {
      sc_address: deployed.contracts.PrivateERCToken,
      token_type: '0',
      from_address:accounts.Minter,
      to_address: accounts.Minter,
      amount: 100
    };

    console.log("Starting direct minting...");
    let response = await client.generateDirectMint(generateRequest, metadata);
    console.log("Direct minting response:", response);

    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);
    console.timeEnd('testDirectMint');
    // await getAddressBalance2(client, deployed.contracts.PrivateERCToken, accounts.Minter);
    return response;
  } catch (error) {
    console.error(`Direct minting test failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test direct burning
 * @returns {Promise<void>}
 */
async function testDirectBurnByAuth() {
  try {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    console.time('testDirectBurn');

    const startTime = Date.now();
    console.log("Starting direct burn, time:", new Date(startTime).toISOString());

    const splitRequest = {
      sc_address: deployed.contracts.PrivateERCToken,
      token_type: '0',
      from_address: accounts.Minter,
      amount: CONSTANTS.defaultAmount,
      comment:"123"
    };

    let response = await client.generateDirectBurn(splitRequest, metadata);
    console.log("Direct burn response:", response);

    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);
    console.timeEnd('testDirectBurn');

    const endTime = Date.now();
    console.log("Direct burn completed, time:", new Date(endTime).toISOString());
    console.log(`Total time: ${(endTime - startTime) / 1000} seconds`);

    // await getAddressBalance2(client, deployed.contracts.PrivateERCToken, accounts.Minter, metadata);
    return response;
  } catch (error) {
    console.error(`Direct burn test failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test direct transfer
 * @returns {Promise<void>}
 */
async function testDirectTransferByAuth() {
  try {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    const metadata2 = await createAuthMetadata(accounts.To1PrivateKey);

    console.time('testDirectTransfer');
    const splitRequest = {
      sc_address: deployed.contracts.PrivateERCToken,
      token_type: '0',
      from_address: accounts.Minter,
      to_address: accounts.Spender1,
      amount: CONSTANTS.defaultAmount,
      comment:"123"
    };

    console.log("Starting direct transfer...");
    let response = await client.generateDirectTransfer(splitRequest, metadata);
    console.log("Direct transfer response:", response);

    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);
    console.timeEnd('testDirectTransfer');

    console.log("Checking balances after transfer...");
    await getAddressBalance2(client, deployed.contracts.PrivateERCToken, accounts.Minter);
    await getAddressBalance2(client, deployed.contracts.PrivateERCToken, accounts.Spender1);

    return response;
  } catch (error) {
    console.error(`Direct transfer test failed: ${error.message}`);
    throw error;
  }
}

/**
 * ===== Token Operation Test Functions =====
 */

/**
 * Test transfer from authorization
 * @returns {Promise<void>}
 */
async function testTransferFromByAuth() {
  try {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    const metadata2 = await createAuthMetadata(accounts.Spender1Key);
    const metadata3 = await createAuthMetadata(accounts.To1PrivateKey);

    const splitRequest = {
      sc_address: deployed.contracts.PrivateERCToken,
      token_type: '0',
      from_address: accounts.Minter,
      spender_address: accounts.Spender1,
      to_address: accounts.To1,
      amount: CONSTANTS.defaultAmount,
      comment:"123"
    };

    console.log("Generating approval proof...");
    let response = await client.generateApproveProof(splitRequest, metadata);
    console.log("Approval proof response:", response);

    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);
    console.log("Executing authorized transfer...");
    let receipt = await callPrivateTransferFrom(
        spenderWallet,
        deployed.contracts.PrivateERCToken,
        accounts.Minter,
        accounts.To1,
        ethers.toBigInt(response.transfer_token_id),
    );
    console.log("Authorized transfer receipt:", receipt);

    await sleep(CONSTANTS.waitTimes.long);

    console.log("Checking balances after authorized transfer...");
    // await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.Minter, metadata);
    // await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.Spender1, metadata2);
    // await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.To1, metadata3);

    return receipt;
  } catch (error) {
    console.error(`Authorized transfer test failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test reserve tokens and burn
 * @returns {Promise<void>}
 */
async function testReserveTokensAndBurn() {
  try {
    const metadata = await createAuthMetadata(accounts.MinterKey);

    const splitRequest = {
      sc_address: deployed.contracts.PrivateERCToken,
      token_type: '0',
      from_address: accounts.Minter,
      amount: CONSTANTS.defaultAmount,
      comment:"123"
    };

    console.log("Splitting token...");
    let response = await client.generateSplitToken(splitRequest, metadata);
    console.log("Token split response:", response);

    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);
    var tokenId1 = ethers.toBigInt(response.transfer_token_id)
    console.log("Burning split token...");
    let receipt = await callPrivateBurn(
        deployed.contracts.PrivateERCToken,
        minterWallet,
        tokenId1
    );

    await sleep(CONSTANTS.waitTimes.medium);
    // await getAddressBalance2(client, deployed.contracts.PrivateERCToken, accounts.Minter, metadata);

    return receipt;
  } catch (error) {
    console.error(`Reserve tokens and burn test failed: ${error.message}`);
    throw error;
  }
}

async function testReserveTokensAndGetToken() {
  try {
    const metadata = await createAuthMetadata(accounts.MinterKey);

    const splitRequest = {
      sc_address: deployed.contracts.PrivateERCToken,
      token_type: '0',
      from_address: accounts.Minter,
      to_address: accounts.To1,
      amount: CONSTANTS.defaultAmount
    };

    console.log("Splitting token...");
    let response = await client.generateSplitToken(splitRequest, metadata);
    console.log("Token split response:", response);
    let response1 = await client.generateSplitToken(splitRequest, metadata);
    console.log("Token split response:", response1);
    let response2 = await client.generateSplitToken(splitRequest, metadata);
    console.log("Token split response:", response2);

    // await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);

    let tokens = await client.getSplitTokenList(accounts.Minter, deployed.contracts.PrivateERCToken,metadata);
    console.log("Get split token list response:", tokens);

    return tokens;
  } catch (error) {
    console.error(`Reserve tokens and burn test failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test reserve tokens and transfer
 * @returns {Promise<void>}
 */
async function testReserveTokensAndTransfer() {
  try {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    const metadata2 = await createAuthMetadata(accounts.To1PrivateKey);

    const splitRequest = {
      sc_address: deployed.contracts.PrivateERCToken,
      token_type: '0',
      from_address: accounts.Minter,
      to_address: accounts.Spender1,
      amount: CONSTANTS.defaultAmount,
      comment:"123"
    };

    console.log("Splitting token...");
    let response = await client.generateSplitToken(splitRequest, metadata);
    console.log("Token split response:", response);

    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);
    var tokenId1 = ethers.toBigInt(response.transfer_token_id)
    console.log("Transferring split token...");
    let receipt = await callPrivateTransfer(
        minterWallet,
        deployed.contracts.PrivateERCToken,
        tokenId1
    );

    await sleep(CONSTANTS.waitTimes.short);

    console.log("Checking balances after transfer...");
    // await getAddressBalance2(client, deployed.contracts.PrivateERCToken, accounts.Minter);
    // await getAddressBalance2(client, deployed.contracts.PrivateERCToken, accounts.To1);
    // return receipt;
  } catch (error) {
    console.error(`Reserve tokens and transfer test failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test approve tokens and revoke
 * @returns {Promise<void>}
 */
async function testApproveTokensAndRevoke() {
  try {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    const metadata3 = await createAuthMetadata(accounts.To1PrivateKey);

    console.log("Checking initial balances...");
    await getAddressBalance2(client, deployed.contracts.PrivateERCToken, accounts.Minter, metadata);
    await getAddressBalance2(client, deployed.contracts.PrivateERCToken, accounts.To1, metadata3);

    const splitRequest = {
      sc_address: deployed.contracts.PrivateERCToken,
      token_type: '0',
      from_address: accounts.Minter,
      spender_address: accounts.Spender1,
      to_address: accounts.To1,
      amount: CONSTANTS.defaultAmount
    };

    console.log("Generating approval proof...");
    let response = await client.generateApproveProof(splitRequest, metadata3);
    console.log("Approval proof response:", response);

    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);
    await sleep(CONSTANTS.waitTimes.medium);

    console.log("Revoking approval...");
    let receipt = await callPrivateRevoke(
        deployed.contracts.PrivateERCToken,
        minterWallet,
        accounts.Spender1,
        '0x' + response.transfer_token_id
    );
    console.log("Revocation receipt:", receipt);

    await sleep(CONSTANTS.waitTimes.medium);

    console.log("Checking balances after revocation...");
    await getAddressBalance2(client, deployed.contracts.PrivateERCToken, accounts.Minter, metadata);
    await getAddressBalance2(client, deployed.contracts.PrivateERCToken, accounts.To1, metadata3);

    return receipt;
  } catch (error) {
    console.error(`Approve tokens and revoke test failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test reserve tokens and cancel
 * @returns {Promise<void>}
 */
async function testReserveTokensAndCancel() {
  try {
    const metadata = await createAuthMetadata(accounts.MinterKey);

    // const splitRequest = {
    //   sc_address: deployed.contracts.PrivateERCToken,
    //   token_type: '0',
    //   from_address: accounts.Minter,
    //   to_address: accounts.To1,
    //   amount: CONSTANTS.defaultAmount
    // };
    //
    // console.log("Splitting token...");
    // let response = await client.generateSplitToken(splitRequest, metadata);
    // console.log("Token split response:", response);
    //
    // await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);
    //
    // console.log("Cancelling split token...");
    let receipt = await callPrivateCancel(
        deployed.contracts.PrivateERCToken,
        junjieWallet,
        '0x432cb1ebe020704dfb16438266a4be9ca4940737e77f17529e14b87db669c253'
    );

    await sleep(CONSTANTS.waitTimes.medium);
    // await getAddressBalance2(client, deployed.contracts.PrivateERCToken, accounts.Minter, metadata);

    return receipt;
  } catch (error) {
    console.error(`Reserve tokens and cancel test failed: ${error.message}`);
    throw error;
  }
}

/**
 * ===== Institution Information Test Functions =====
 */

/**
 * Test institution information
 * @returns {Promise<void>}
 */
async function testInstituteInformation() {
  const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
    libraries: {
      "TokenEventLib": deployed.libraries.TokenEventLib,
    }
  });
  const instRegistry = await InstRegistry.attach(deployed.contracts.InstUserProxy);
  // let tx = await instRegistry.registerUser(accounts.Minter);
  // await tx.wait();
  // let inst = await instRegistry.getUserManager(accounts.Minter);
  // console.log("user registration ", inst);
  // let inst1 = await instRegistry.getUserInstGrumpkinPubKey(accounts.Minter);
  // console.log("user registration ", inst1);
  // let inst2 = await instRegistry.getInstitution(accounts.Owner);
  // console.log("user registration ", inst2);
  let tx = await instRegistry.setInstitutionManagerBlacklist('0x93d2ce0461c2612f847e074434d9951c32e44327', true);
  await tx.wait();
  console.log("user registration ", tx);
}

/**
 * ===== Token Conversion Test Functions =====
 */

/**
 * Test conversion to private USDC
 * @returns {Promise<void>}
 */
async function testConvert2pUSDC() {
  try {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    const convertToPUSDCResponse = {
      amount: CONSTANTS.defaultAmount,
      sc_address: sc_address,
    };

    console.log("Generating proof for conversion to private USDC...");
    let proofResult = await client.convertToPUSDC(convertToPUSDCResponse, metadata);
    console.log("Conversion proof response:", proofResult);

    const contract = await ethers.getContractAt("PrivateUSDC", sc_address, minterWallet);
    const elAmount = {
      cl_x: ethers.toBigInt(proofResult.elgamal.cl_x),
      cl_y: ethers.toBigInt(proofResult.elgamal.cl_y),
      cr_x: ethers.toBigInt(proofResult.elgamal.cr_x),
      cr_y: ethers.toBigInt(proofResult.elgamal.cr_y)
    };
    const token = {
      id: ethers.toBigInt(proofResult.token_id),
      owner: accounts.Minter,
      status: 2,
      amount: elAmount,
      to: accounts.Minter,
      rollbackTokenId: 0n,
      tokenType: 4,
    }
    const proof = proofResult.proof.map(p => ethers.toBigInt(p));
    const input = proofResult.input.map(i => ethers.toBigInt(i));

    console.log("Executing conversion to private USDC...");
    const tx = await contract.convert2pUSDC(CONSTANTS.defaultAmount, token, input, proof);
    let receipt = await tx.wait();
    console.log("Conversion transaction receipt:", receipt);
    return receipt;
  } catch (error) {
    console.error(`Conversion to private USDC test failed: ${error.message}`);
    throw error;
  }
}
var sc_address = '0x88236d4C0Fb5875Df22CD39F4c20b0a0CAC352C4';

async function getTotalSupplyNode() {
  const contract = await ethers.getContractAt("PrivateERCToken", '0x272517f7A5AF91C19F42970c8D643780f7403c50', adminWallet);
  const metadata = await createAuthMetadata(accounts.OwnerKey);
  let amount = await contract.privateTotalSupply()
  let balance = {
    cl_x: ethers.toBigInt(amount[0]),
    cl_y: ethers.toBigInt(amount[1]),
    cr_x: ethers.toBigInt(amount[2]),
    cr_y: ethers.toBigInt(amount[3])
  }
  console.log(balance)
  let result = await client.decodeElgamalAmount(balance,metadata)
  console.log(result)
  return Number(result.balance)
}
/**
 * Test conversion to public USDC
 * @returns {Promise<void>}
 */
async function testConvert2USDC() {
  try {
    const metadata = await createAuthMetadata(accounts.MinterKey);

    const splitRequest = {
      sc_address: sc_address,
      token_type: '0',
      from_address: accounts.Minter,
      to_address: accounts.Minter,
      amount: CONSTANTS.defaultAmount,
      comment:"123"
    };

    console.log("Splitting token...");
    let response = await client.generateSplitToken(splitRequest, metadata);
    console.log("Token split response:", response);

    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);
    let tokenId = response.transfer_token_id;

    const convertToPUSDCResponse = {
      token_id: tokenId,
      sc_address:  sc_address,
    };

    console.log("Generating proof for conversion to public USDC...");
    let proofResult = await client.convertToUSDC(convertToPUSDCResponse, metadata);
    console.log("Conversion proof response:", proofResult);

    const contract = await ethers.getContractAt("PrivateUSDC",  sc_address, minterWallet);
    const proof = proofResult.proof.map(p => ethers.toBigInt(p));
    const input = proofResult.input.map(i => ethers.toBigInt(i));

    console.log("Executing conversion to public USDC...");
    const tx = await contract.convert2USDC(ethers.toBigInt(tokenId) , proofResult.amount, input, proof);
    let receipt = await tx.wait();
    console.log("Conversion transaction receipt:", receipt);

    return receipt;
  } catch (error) {
    console.error(`Conversion to public USDC test failed: ${error.message}`);
    throw error;
  }
}

async function testGetMintAllowed() {
  try {
    const metadata = await createAuthMetadata(accounts.MinterKey);

    const splitRequest = {
      sc_address: deployed.contracts.PrivateERCToken,
      address: accounts.Minter
    };

    console.log("get mint allowed token...");
    let response = await client.getMintAllowed(splitRequest, metadata);
    console.log("get mint allowed token response:", response);
    return response;
  } catch (error) {
    console.error(`get mint allowed token failed: ${error.message}`);
    throw error;
  }
}
async function testGetBalance() {
  try {
    const metadata = await createAuthMetadata(accounts.MinterKey);

    const splitRequest = {
      sc_address: deployed.contracts.PrivateERCToken,
      owner_address: accounts.Minter
    };

    console.log("get mint allowed token...");
    let response = await client.getAddressBalanceDetail(splitRequest, metadata);
    console.log("get mint allowed token response:", response);
    let response1 = await client.getAccountBalance(deployed.contracts.PrivateERCToken,accounts.Minter, metadata);
    console.log("get mint allowed token response:", response1);
    return response;
  } catch (error) {
    console.error(`get mint allowed token failed: ${error.message}`);
    throw error;
  }
}
async function testGetAccountList() {
  try {
    const metadata = await createAuthMetadata(accounts.OwnerKey);
    let req = {
      "manager_address": '0x93d2ce0461c2612f847e074434d9951c32e44327'
    }
    let resp = await client.getAccountList(req,metadata);
    console.log("registerBankCallerAccount receipt:", resp);

  } catch (error) {
    console.error(`get mint allowed token failed: ${error.message}`);
    throw error;
  }
}

async function testSignKey() {
  try {
    const metadata = await createAuthMetadata(accounts.OwnerKey);
    let req = {

    }
    let resp = await client.getSignatureAndMessage(req,metadata);
    console.log("registerBankCallerAccount receipt:", resp);

  } catch (error) {
    console.error(`get mint allowed token failed: ${error.message}`);
    throw error;
  }
}


async function testAddSmartContract() {
  try {
    console.log("rpcUrl",rpcUrl)
    const client = createClient(rpcUrl);
    const metadata = await createAuthMetadata(accounts.OwnerKey);
    let req = {
      sc_address: "0x7e06b8bb62b40460271104302c21817e4dea27cb",
      status: 2
    }
    let resp = await client.addSmartContract(req,metadata);
    console.log("registerBankCallerAccount receipt:", resp);

  } catch (error) {
    console.error(`get mint allowed token failed: ${error.message}`);
    throw error;
  }
}


async function  testChangeBankCallers() {
  try {
    const metadata = await createAuthMetadata(accounts.OwnerKey);
    let req = {
      "account_address":[accounts.Owner,accounts.Minter]
    }
    let resp = await client.registerBankCallerAccount(req,metadata);
    console.log("registerBankCallerAccount receipt:", resp);

  } catch (error) {
    console.error(`get mint allowed token failed: ${error.message}`);
    throw error;
  }
}

async function testGetBalance() {
  try {
    const metadata = await createAuthMetadata(accounts.OwnerKey);

    console.log("get mint allowed token...");
    let response = await client.getTokenActionStatus('2ede56337ffb130fc9536a612c68d09c6520854aa2cc628f07f150f8a70a5113', metadata);
    console.log("get mint allowed token response:", response);
  } catch (error) {
    console.error(`get mint allowed token failed: ${error.message}`);
    throw error;
  }
}

async function testSetMintAllowed() {
  try {
    const contract = await ethers.getContractAt("PrivateUSDC", deployed.contracts.PrivateERCToken, adminWallet);
    let tx = await contract.updateAllowedBank('0x93d2Ce0461C2612F847e074434d9951c32e44327',true );
    console.log("Conversion transaction receipt:", tx);
  } catch (error) {
    console.error(`Conversion to public USDC test failed: ${error.message}`);
    throw error;
  }
}
async function mintForTest() {
  for (let i = 0; i < 20; i++) {
    await mintForStart();
    await sleep(1000)
  }
}
async function configureStepLength() {
  try {
    const contract = await ethers.getContractAt("PrivateUSDC", deployed.contracts.PrivateERCToken, adminWallet);
    let tx = await contract.configureStepLength(3n );
    console.log("Conversion transaction receipt:", tx);
  } catch (error) {
    console.error(`Conversion to public USDC test failed: ${error.message}`);
    throw error;
  }
}

async function test1111() {
  try {
    const institutionUserRegistry = await ethers.getContractAt("InstitutionUserRegistry", '0xdB17395eC234AA0605207e61A55888c5482006D4');
    let requestRegisterInstitution = {
      managerAddress: '0xba268f776f70cadb087e73020dfe41c7298363ed',
      name: 'test22',
      streetAddress: "Market St123",
      suiteNo: "Suite 400",
      city: "San Francisco",
      state:"CA",
      zip: "94107",
      email: "123@qq.com",
      phoneNumber: "123123123123",
      publicKey: {
        x: 321312312312312n,
        y: 123123123123123n
      },
      rpcUrl: "dev-node3-rpc.hamsa-ucl.com:50051",
      nodeUrl: "https://dev-node3-proxy.hamsa-ucl.com:8443",
      httpUrl: "http://dev-node3-http.hamsa-ucl.com:8080",
    }
    let regTx = await institutionUserRegistry.registerInstitution(requestRegisterInstitution);
    await regTx.wait();
    console.log("registerInstitution receipt:", regTx);
  } catch (error) {
    console.error(`Conversion to public USDC test failed: ${error.message}`);
    throw error;
  }
}

async function testRegisterInstitution() {
  try {
    const metadata = await createAuthMetadata(accounts.OwnerKey);
    let requestRegisterInstitution = {
      manager_address: '0x2308b915ff150643d32A599e11e87E20fA3798c2',
      inst_name: 'test22',
      pk_x: '321312312312312',
      pk_y: '123123123123123',
      street_address: "Market St123",
      suite_no: "Suite 400",
      city: "San Francisco",
      state:"CA",
      zip: "94107",
      email: '123@qq.com',
      phone_number: '123123123123',
      rpc_url: "dev-node3-rpc.hamsa-ucl.com:50051",
      node_url: "https://dev-node3-proxy.hamsa-ucl.com:8443",
      http_url: "http://dev-node3-http.hamsa-ucl.com:8080",
    }
    let regTx = await client.registerInstitution(requestRegisterInstitution,metadata);
    console.log("registerInstitution receipt:", regTx);
  } catch (error) {
    console.error(`Conversion to public USDC test failed: ${error.message}`);
    throw error;
  }
}


async function testUpdateInstitution() {
  try {
    const metadata = await createAuthMetadata(accounts.OwnerKey);
    let requestRegisterInstitution = {
      manager_address: '0x2308b915ff150643d32A599e11e87E20fA3798c2',
      inst_name: 'test223311',
      street_address: "Market St1",
      suite_no: "Suite 4001",
      city: "San Francisco a",
      state:"CA 1",
      zip: "94107 1",
      email: '123@qq.com 1',
      phone_number: '123123123123 1',
      rpc_url: "dev-node3-rpc.hamsa-ucl.com:50051 1",
      node_url: "https://dev-node3-proxy.hamsa-ucl.com:8443 1",
      http_url: "http://dev-node3-http.hamsa-ucl.com:8080 1",
    }
    let regTx = await client.updateInstitution(requestRegisterInstitution,metadata);
    console.log("registerInstitution receipt:", regTx);
  } catch (error) {
    console.error(`Conversion to public USDC test failed: ${error.message}`);
    throw error;
  }
}
/**
 * Run all tests
 * Uncomment tests you want to run
 */
async function runTests() {
  try {
    // Basic tests
    // await mintForStart();
    // await mintForTest();
    // await configureStepLength();

    // Token operation tests
    // await testReserveTokensAndBurn();
    // await testReserveTokensAndTransfer();
    // await testReserveTokensAndCancel();
    // await testApproveTokensAndRevoke();
    // await testTransferFromByAuth();

    // Direct transaction tests
    // await testDirectMintByAuth();
    // await testDirectBurnByAuth();
    // await testDirectTransferByAuth();

    // Other tests
    // await testInstituteInformation();
    // await testConvert2pUSDC();
    // await testConvert2USDC();
    // await testGetMintAllowed();
    // await testReserveTokensAndGetToken();

    // await testGetBalance();
    // await testSetMintAllowed();
    // await testChangeBankCallers();
    // await testGetAccountList();
    // await testSignKey();
    // await testAddSmartContract();

    // await getTotalSupplyNode();

    // await test1111();
    // await testRegisterInstitution();
    // await testUpdateInstitution();

    await batchedMint();
    console.log("All tests completed!");
  } catch (error) {
    console.error(`Test run failed: ${error.message}`);
  }
}

// Execute tests
runTests();

// Export functions for use by other modules
module.exports = {
  mintForStart,
  testDirectMintByAuth,
  testDirectBurnByAuth,
  testDirectTransferByAuth,
  testTransferFromByAuth,
  testReserveTokensAndBurn,
  testReserveTokensAndTransfer,
  testReserveTokensAndCancel,
  testApproveTokensAndRevoke,
  testInstituteInformation,
  testConvert2pUSDC,
  testConvert2USDC,
  createAuthMetadata,
  checkBalance,
  testGetMintAllowed,
  testReserveTokensAndGetToken
};