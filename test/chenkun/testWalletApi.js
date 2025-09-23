const assert = require('node:assert');

const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc');
const grpc = require("@grpc/grpc-js");

/**
 * Configuration Constants
 */
const CONSTANTS = {
  // RPC URL configuration
  rpcUrl: "127.0.0.1:50051",
  // rpcUrl: "dev-node3-rpc.hamsa-ucl.com:50051:50051",
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
var sc_address = '0x5dc1E82631a4BE896333F38a8214554326C11796'
async function getSmartContractList() {
  try {
    const metadata = await createAuthMetadata(accounts.OwnerKey);
   var request = {
   }
    const response = await client.getSmartContractList(request, metadata);
    console.log("response:", response);
  } catch (error) {
    console.error(`failed: ${error.message}`);
    throw error;
  }
}

async function activateSmartContract() {
  try {
    const metadata = await createAuthMetadata(accounts.OwnerKey);
    var request = {
      "sc_addresses": [sc_address],
      "status": 2
    }

    const response = await client.activateSmartContract(request, metadata);
    console.log("response:", response);
  } catch (error) {
    console.error(`failed: ${error.message}`);
    throw error;
  }
}

async function getAssetAddressList() {
  try {
    const metadata = await createAuthMetadata(accounts.OwnerKey);
    var request = {
      "asset_address": accounts.Minter,
    }

    const response = await client.getAssetAddressList(request, metadata);
    console.log("response:", response);
  } catch (error) {
    console.error(`failed: ${error.message}`);
    throw error;
  }
}

async function UploadSmartContractIcon() {
  try {
    const metadata = await createAuthMetadata(accounts.OwnerKey);
    var request = {
      "sc_address": sc_address,
      "icon":"1234431223asdvasdva"
    }

    const response = await client.uploadSmartContractIcon(request, metadata);
    console.log("response:", response);
  } catch (error) {
    console.error(`failed: ${error.message}`);
    throw error;
  }
}

// getSmartContractList().then();
// activateSmartContract().then();
getAssetAddressList().then();
// UploadSmartContractIcon().then();