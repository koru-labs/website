const assert = require('node:assert');

const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc');
const grpc = require("@grpc/grpc-js");
const {testConvert2pUSDCWithProvidedData} = require("../sun/private_usdc_test");

/**
 * Configuration Constants
 */
const CONSTANTS = {
  // RPC URL configuration
  rpcUrl: "127.0.0.1:50051",
  // rpcUrl: "qa-node3-rpc.hamsa-ucl.com:50051",
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

// Initialize client and provider
const client = createClient(CONSTANTS.rpcUrl);
const l1Provider = new ethers.JsonRpcProvider(
  hardhatConfig.networks.ucl_L2.url, 
  CONSTANTS.network, 
  CONSTANTS.providerOptions
);

// Initialize wallets
const minterWallet = new ethers.Wallet(accounts.MinterKey, l1Provider);
const to1Wallet = new ethers.Wallet(accounts.To1PrivateKey, l1Provider);
const spenderWallet = new ethers.Wallet(accounts.Spender1Key, l1Provider);

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
      sc_address: config.contracts.PrivateERCToken,
      token_type: '0',
      from_address:accounts.Minter,
      to_address: accounts.Minter,
      amount: 100
    };
    
    console.log("Starting to generate mint proof...");
    let response = await client.generateMintProof(generateRequest, metadata);
    console.log("Mint proof generation response:", response);

    console.log("Executing on-chain minting operation...");
    let receipt = await callPrivateMint(config.contracts.PrivateERCToken, response, minterWallet);
    console.log("Minting transaction receipt:", receipt);

    await sleep(CONSTANTS.waitTimes.medium);
    console.log("Checking balance after minting...");
    await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.Minter, metadata);
    
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
      sc_address: config.contracts.PrivateERCToken,
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
    
    await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.Minter, metadata);
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
      sc_address: config.contracts.PrivateERCToken,
      token_type: '0',
      from_address: accounts.Minter,
      amount: CONSTANTS.defaultAmount
    };

    let response = await client.generateDirectBurn(splitRequest, metadata);
    console.log("Direct burn response:", response);
    
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);
    console.timeEnd('testDirectBurn');
    
    const endTime = Date.now();
    console.log("Direct burn completed, time:", new Date(endTime).toISOString());
    console.log(`Total time: ${(endTime - startTime) / 1000} seconds`);
    
    await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.Minter, metadata);
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
      sc_address: config.contracts.PrivateERCToken,
      token_type: '0',
      from_address: accounts.Minter,
      to_address: accounts.To1,
      amount: CONSTANTS.defaultAmount
    };

    console.log("Starting direct transfer...");
    let response = await client.generateDirectTransfer(splitRequest, metadata);
    console.log("Direct transfer response:", response);
    
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);
    console.timeEnd('testDirectTransfer');
    
    console.log("Checking balances after transfer...");
    await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.Minter, metadata);
    await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.To1, metadata2);
    
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
      sc_address: config.contracts.PrivateERCToken,
      token_type: '0',
      from_address: accounts.Minter,
      spender_address: accounts.Spender1,
      to_address: accounts.To1,
      amount: CONSTANTS.defaultAmount
    };

    console.log("Generating approval proof...");
    let response = await client.generateApproveProof(splitRequest, metadata);
    console.log("Approval proof response:", response);
    
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);
    
    console.log("Executing authorized transfer...");
    let receipt = await callPrivateTransferFrom(
      spenderWallet,
      config.contracts.PrivateERCToken,
      accounts.Minter,
      accounts.To1,
      '0x' + response.transfer_token_id
    );
    console.log("Authorized transfer receipt:", receipt);
    
    await sleep(CONSTANTS.waitTimes.long);
    
    console.log("Checking balances after authorized transfer...");
    await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.Minter, metadata);
    await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.Spender1, metadata2);
    await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.To1, metadata3);
    
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
      sc_address: config.contracts.PrivateERCToken,
      token_type: '0',
      from_address: accounts.Minter,
      amount: CONSTANTS.defaultAmount
    };

    console.log("Splitting token...");
    let response = await client.generateSplitToken(splitRequest, metadata);
    console.log("Token split response:", response);
    
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);

    console.log("Burning split token...");
    let receipt = await callPrivateBurn(
      config.contracts.PrivateERCToken,
      minterWallet,
      '0x' + response.transfer_token_id
    );
    
    await sleep(CONSTANTS.waitTimes.medium);
    await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.Minter, metadata);
    
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
      sc_address: config.contracts.PrivateERCToken,
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

    let tokens = await client.getSplitTokenList(accounts.Minter, config.contracts.PrivateERCToken,metadata);
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
      sc_address: config.contracts.PrivateERCToken,
      token_type: '0',
      from_address: accounts.Minter,
      to_address: accounts.To1,
      amount: CONSTANTS.defaultAmount
    };

    console.log("Splitting token...");
    let response = await client.generateSplitToken(splitRequest, metadata);
    console.log("Token split response:", response);
    
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);

    console.log("Transferring split token...");
    let receipt = await callPrivateTransfer(
      minterWallet,
      config.contracts.PrivateERCToken,
      accounts.To1,
      '0x' + response.transfer_token_id
    );
    
    await sleep(CONSTANTS.waitTimes.short);
    
    console.log("Checking balances after transfer...");
    await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.Minter, metadata);
    await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.To1, metadata2);
    
    return receipt;
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
    await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.Minter, metadata);
    await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.To1, metadata3);

    const splitRequest = {
      sc_address: config.contracts.PrivateERCToken,
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
      config.contracts.PrivateERCToken,
      minterWallet,
      accounts.Spender1,
      '0x' + response.transfer_token_id
    );
    console.log("Revocation receipt:", receipt);

    await sleep(CONSTANTS.waitTimes.medium);
    
    console.log("Checking balances after revocation...");
    await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.Minter, metadata);
    await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.To1, metadata3);
    
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
    
    const splitRequest = {
      sc_address: config.contracts.PrivateERCToken,
      token_type: '0',
      from_address: accounts.Minter,
      to_address: accounts.To1,
      amount: CONSTANTS.defaultAmount
    };

    console.log("Splitting token...");
    let response = await client.generateSplitToken(splitRequest, metadata);
    console.log("Token split response:", response);
    
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);

    console.log("Cancelling split token...");
    let receipt = await callPrivateCancel(
      config.contracts.PrivateERCToken,
      minterWallet,
      '0x' + response.transfer_token_id
    );
    
    await sleep(CONSTANTS.waitTimes.medium);
    await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.Minter, metadata);
    
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
const deployed = require("../../deployments/image9.json");
async function testInstituteInformation() {
  const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
    libraries: {
      "TokenEventLib": deployed.libraries.TokenEventLib,
    }
  });
  const instRegistry = await InstRegistry.attach(config.contracts.InstUserProxy);

  // let tx = await instRegistry.registerUser(accounts.Spender1);
  // await tx.wait();
  let inst = await instRegistry.getUserManager(accounts.Owner);
  console.log("user registration ", inst);
  let inst1 = await instRegistry.getUserInstGrumpkinPubKey(accounts.Owner);
  console.log("user registration ", inst1);
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
      amount: CONSTANTS.defaultAmount
    };
    
    console.log("Generating proof for conversion to private USDC...");
    let proofResult = await client.convertToPUSDC(convertToPUSDCResponse, metadata);
    console.log("Conversion proof response:", proofResult);
    
    const contract = await ethers.getContractAt("PrivateUSDC", config.contracts.PrivateERCToken, minterWallet);
    const elAmount = {
      cl_x: ethers.toBigInt(proofResult.elgamal.cl_x),
      cl_y: ethers.toBigInt(proofResult.elgamal.cl_y),
      cr_x: ethers.toBigInt(proofResult.elgamal.cr_x),
      cr_y: ethers.toBigInt(proofResult.elgamal.cr_y)
    };
    const proof = proofResult.proof.map(p => ethers.toBigInt(p));
    const input = proofResult.input.map(i => ethers.toBigInt(i));

    console.log("Executing conversion to private USDC...");
    const tx = await contract.convert2pUSDC(CONSTANTS.defaultAmount, elAmount, input, proof);
    let receipt = await tx.wait();
    console.log("Conversion transaction receipt:", receipt);
    
    return receipt;
  } catch (error) {
    console.error(`Conversion to private USDC test failed: ${error.message}`);
    throw error;
  }
}

/**
 * Test conversion to public USDC
 * @returns {Promise<void>}
 */
async function testConvert2USDC() {
  try {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    
    const splitRequest = {
      sc_address: config.contracts.PrivateERCToken,
      token_type: '0',
      from_address: accounts.Minter,
      to_address: accounts.Minter,
      amount: CONSTANTS.defaultAmount
    };
    
    console.log("Splitting token...");
    let response = await client.generateSplitToken(splitRequest, metadata);
    console.log("Token split response:", response);
    
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);
    let tokenId = response.transfer_token_id;
    
    const convertToPUSDCResponse = {
      token_id: tokenId
    };
    
    console.log("Generating proof for conversion to public USDC...");
    let proofResult = await client.convertToUSDC(convertToPUSDCResponse, metadata);
    console.log("Conversion proof response:", proofResult);

    const contract = await ethers.getContractAt("PrivateUSDC", config.contracts.PrivateERCToken, minterWallet);
    const proof = proofResult.proof.map(p => ethers.toBigInt(p));
    const input = proofResult.input.map(i => ethers.toBigInt(i));
    
    console.log("Executing conversion to public USDC...");
    const tx = await contract.convert2USDC('0x' + tokenId, proofResult.amount, input, proof);
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
      sc_address: config.contracts.PrivateERCToken,
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

/**
 * ===== Test Runner =====
 */

/**
 * Run all tests
 * Uncomment tests you want to run
 */
async function runTests() {
  try {
    // Basic tests
    // await mintForStart();
    
    // Token operation tests
    // await testReserveTokensAndBurn();
    // await testReserveTokensAndTransfer();
    // await testReserveTokensAndCancel();
    // await testApproveTokensAndRevoke();
    // await testTransferFromByAuth();
    
    // Direct transaction tests
    await testDirectMintByAuth();
    // await testDirectBurnByAuth();
    // await testDirectTransferByAuth();
    
    // Other tests
    // await testInstituteInformation();
    // await testConvert2pUSDC();
    // await testConvert2USDC();
    // await testGetMintAllowed();
    // await testReserveTokensAndGetToken();
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
