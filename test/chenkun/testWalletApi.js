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
  // rpcUrl: "dev-node3-rpc.hamsa-ucl.com:50051",
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
    const metadata = await createAuthMetadata(accounts.MinterKey);
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

async function SaveTransaction() {
  try {
    const metadata = await createAuthMetadata(accounts.OwnerKey);
    const currentRandom = Math.floor(Math.random() * 100) + 1;
    const currentRandom2 = Math.floor(Math.random() * 10) + 1;  // 获取1-10随机数

    var request = {
      "asset_name": "0x1234",
      "from_address":"0x1234431223asdvasdva",
      "to_address":"0x1234431223asdvasdva",
      "amount": currentRandom2 * 100 + currentRandom,
      "type": "transfer",
      "hash": "1234431223asdvasdva" + currentRandom + currentRandom2,
      "timestamp": Date.now(),
      "metadata": "",
      "currency_precision": 4,
      "exchange_rate": "123.4431"
    }
    const response = await client.saveTransaction(request, metadata);
    console.log("response:", response);
  } catch (error) {
    console.error(`failed: ${error.message}`);
    throw error;
  }
}

async function SaveTransactionMultiple() {
  var times = 100;
  for (let i = 1; i <= times; i++) {
    await SaveTransaction();
    console.log(`Transaction ${i} saved successfully.`);
  }
}

async function GetTransaction() {
  try {
    const metadata = await createAuthMetadata(accounts.OwnerKey);
    var request = {
      "page_num": 2,
      "page_size": 3,
    }
    const response = await client.getTransaction(request, metadata);
    console.log("response:", response);
  } catch (error) {
    console.error(`failed: ${error.message}`);
    throw error;
  }
}

async function getBankManagerList() {
    const metadata = await createAuthMetadata(accounts.OwnerKey);
    var request = {
      sc_address : '0x3c3c2b7e0195a5a8002e0dc0040402589484f6f2',
      manager_address : ''
    }

    const response = await client.getBankManagerList(request, metadata);
    console.log("response:", response);
}

async function getBankProfile() {
  const metadata = await createAuthMetadata(accounts.OwnerKey);
  var request = {
    manager_address : '0xf17f52151ebef6c7334fad080c5704d77216b732'
  }

  const response = await client.getBankProfile(request, metadata);
  console.log("response:", response);
}
// getSmartContractList().then();
// activateSmartContract().then();
// getAssetAddressList().then();
// UploadSmartContractIcon().then();
// SaveTransaction().then();
// GetTransaction().then();
// SaveTransactionMultiple().then();
GetTransaction().then();
// getBankManagerList().then()
// getBankProfile().then();