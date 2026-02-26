const { expect } = require('chai');
const { ethers } = require('hardhat');
const { createClient } = require('./token_grpc');
const accounts = require('./../../deployments/account.json');
const grpc = require('@grpc/grpc-js');
const {promises: fs} = require("fs");

const {
  NATIVE_TOKEN_ADDRESS,
  NATIVE_ABI,
  createAuthMetadata,
  sleep,
  setupMintAllowance,
  prepareSplitRequests,
  generateSplitProofs,
  executeBatchedConcurrentSplits,
  executeBatchTransfers,
} = require('./../help/NativeTestHelper');


const NODE_CONFIGS = [
  {
    name: 'Node 1',
    grpcUrl: 'dev2-node1-rpc.hamsa-ucl.com:50051',
    httpUrl: 'http://l2-node1-native.hamsa-ucl.com:8545',
    admin: '0x93d2Ce0461C2612F847e074434d9951c32e44327',
    key: '81690fb141b4ae5682ad1fd73b29ae1bcc67891e93de73c6f636402deac21171',
  },
  {
    name: 'Node 2',
    grpcUrl: 'dev2-node2-rpc.hamsa-ucl.com:50051',
    httpUrl: 'http://l2-node2-native.hamsa-ucl.com:8545',
    admin: '0x73494abc9681D133d7Fb4241f1760B314205994c',
    key: '59b08ece967520c64b642fcdc5d2a9aa82b55474f1c1f03419d504d96c8221e5',
  },
  {
    name: 'Node 3',
    grpcUrl: 'dev2-node3-rpc.hamsa-ucl.com:50051',
    httpUrl: 'http://l2-node3-native.hamsa-ucl.com:8545',
    admin: accounts.Owner,
    key: accounts.OwnerKey,
  },
];

const l1CustomNetwork = { name: 'BESU', chainId: 1337 };
const providerOptions = { batchMaxCount: 10, staticNetwork: true };

// Fixed two minter addresses and private keys
const MINTERS = {
  minter1: {
    address: accounts.Minter,
    privateKey: accounts.MinterKey,
  },
  minter2: {
    address: accounts.Minter2,
    privateKey: accounts.Minter2Key,
  },
};

// Fixed two receiver addresses
const RECEIVER_CONFIG = {
  receiver1: '0x4312488937D47A007De24d48aB82940C809EEb2b',
  receiver2: '0xc9ca4bc173e151dfd4579f3802429684acdba4e7',
};

async function mintTokensForMinters(client, minters, number, amount) {
  const mintedTokens = {};

  // Iterate through all minter configurations
  for (const [minterName, minterConfig] of Object.entries(minters)) {
    const minterWallet = new ethers.Wallet(minterConfig.privateKey, ethers.provider);
    const minterMetadata = await createAuthMetadata(minterConfig.privateKey);

    // Dynamically create to_accounts array
    const to_accounts = Array(number)
        .fill()
        .map(() => ({
          address: minterConfig.address,
          amount: amount,
        }));

    const generateRequest = {
      sc_address: NATIVE_TOKEN_ADDRESS,
      token_type: '0',
      from_address: minterConfig.address,
      to_accounts: to_accounts,
    };

    let response;
    try {
      response = await client.generateBatchMintProof(generateRequest, minterMetadata);
    } catch (error) {
      console.error(`[${minterName}] Proof generation failed: ${error.message}`);
      throw error;
    }

    // Process response data
    const recipients = response.to_accounts.map((account) => account.address);
    const bathcedSize = response.batched_size;
    const newTokens = response.to_accounts.map((account, index) => ({
      id: account.token.token_id,
      owner: account.address,
      status: 2,
      amount: {
        cl_x: account.token.cl_x,
        cl_y: account.token.cl_y,
        cr_x: account.token.cr_x,
        cr_y: account.token.cr_y,
      },
      to: account.address,
      rollbackTokenId: 0,
    }));

    const newAllowed = {
      id: response.mint_allowed.token_id,
      value: {
        cl_x: response.mint_allowed.cl_x,
        cl_y: response.mint_allowed.cl_y,
        cr_x: response.mint_allowed.cr_x,
        cr_y: response.mint_allowed.cr_y,
      },
    };

    const proof = response.proof.map((p) => ethers.toBigInt(p));
    const publicInputs = response.input.map((i) => ethers.toBigInt(i));

    console.log(`\n[${minterName}] ===== Preparing to execute mint transaction =====`);
    console.log(`[${minterName}] Recipients count: ${recipients.length}`);
    console.log(`[${minterName}] NewTokens count: ${newTokens.length}`);
    console.log(`[${minterName}] First Token ID: ${newTokens[0]?.id}`);
    console.log(`[${minterName}] MintAllowed ID: ${newAllowed.id}`);

    // Prepare contract instance
    const native = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, minterWallet);

    try {
      const tx = await native.mint(recipients, newTokens, newAllowed, proof, publicInputs, bathcedSize - to_accounts.length, { gasLimit: 10000000 });
      const receipt = await tx.wait();

      // Save token IDs
      mintedTokens[minterName] = newTokens.map((token) => token.id);
    } catch (error) {
      console.error(`[${minterName}] Mint transaction failed: ${error.message}`);
      throw error;
    }
  }

  return mintedTokens;
}

describe.only('Native Dual Minter Transfer Performance Tests', function () {
  let client;
  let nativeOwner, nativeMinter;
  const total_number = 2; //total_number *2 *128
  const amount = 10000;
  let minter1List, minter2List;
  const node3Config = NODE_CONFIGS[2];
  let minterWallet, ownerWallet;
  let provider

  before(async function () {
    this.timeout(300000);
    provider = new ethers.JsonRpcProvider(node3Config.httpUrl, l1CustomNetwork, providerOptions);
    client = createClient(node3Config.grpcUrl);
    minterWallet = new ethers.Wallet(accounts.MinterKey, provider);
    ownerWallet = new ethers.Wallet(accounts.OwnerKey, provider);
    nativeOwner = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, ownerWallet);
    nativeMinter = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, minterWallet);

  });

  describe.only('Case 1: Setup mint allowance for two minters', function () {
    it('should set mint allowance for minter1', async function () {
      this.timeout(120000);
      await setupMintAllowance(nativeOwner, client, MINTERS.minter1.address, accounts.OwnerKey, 100000000);
    });

    it('should set mint allowance for minter2', async function () {
      this.timeout(120000);
      await setupMintAllowance(nativeOwner, client, MINTERS.minter2.address, accounts.OwnerKey, 100000000);
    });
  });

  describe.only('Case 2: Mint tokens for both minters', function () {
    this.timeout(6000000); // 10 minutes

    it(`should mint ${total_number} tokens for each minter`, async function () {
      const batchSize = 128;

      for (let i = 0; i < total_number; i += batchSize) {
        const currentBatchSize = Math.min(batchSize, total_number - i);
        const isLastBatch = i + batchSize >= total_number;

        await mintTokensForMinters(client, MINTERS, currentBatchSize, amount);

        if (!isLastBatch) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    });
  });

  describe.only('Case 3: Split tokens', function () {
    this.timeout(9000000);

    it('should split tokens with sequential execution to ensure success', async function () {
      // Prepare split requests for both minters
      const minter1Wallet = new ethers.Wallet(MINTERS.minter1.privateKey, provider);
      const minter2Wallet = new ethers.Wallet(MINTERS.minter2.privateKey, provider);
      const minter1Metadata = await createAuthMetadata(MINTERS.minter1.privateKey);
      const minter2Metadata = await createAuthMetadata(MINTERS.minter2.privateKey);

      // Prepare split requests for minter1
      const splitRequests1 = [];
      for (let i = 0; i < total_number; i++) {
        const to_accounts = [];
        for (let j = 0; j < 64; j++) {
          to_accounts.push(
            { address: RECEIVER_CONFIG.receiver1, amount: 10, comment: `split-m1-${i}-${j}-r1` },
            { address: RECEIVER_CONFIG.receiver1, amount: 10, comment: `split-m1-${i}-${j}-r2` }
          );
        }
        splitRequests1.push({
          sc_address: NATIVE_TOKEN_ADDRESS,
          token_type: '0',
          from_address: minter1Wallet.address,
          to_accounts
        });
      }

      // Prepare split requests for minter2
      const splitRequests2 = [];
      for (let i = 0; i < total_number; i++) {
        const to_accounts = [];
        for (let j = 0; j < 64; j++) {
          to_accounts.push(
            { address: RECEIVER_CONFIG.receiver1, amount: 1, comment: `split-m2-${i}-${j}-r1` },
            { address: RECEIVER_CONFIG.receiver2, amount: 2, comment: `split-m2-${i}-${j}-r2` }
          );
        }
        splitRequests2.push({
          sc_address: NATIVE_TOKEN_ADDRESS,
          token_type: '0',
          from_address: minter2Wallet.address,
          to_accounts
        });
      }

      // Generate proofs for minter1
      console.log(`\n[Minter1] Generating ${splitRequests1.length} split proofs...`);
      const requestIds1 = [];
      for (let i = 0; i < splitRequests1.length; i++) {
        const response = await client.generateBatchSplitToken(splitRequests1[i], minter1Metadata);
        requestIds1.push(response.request_id);
        if ((i + 1) % 5 === 0 || i === splitRequests1.length - 1) {
          console.log(`  Progress: ${i + 1}/${splitRequests1.length}`);
        }
      }

      // Generate proofs for minter2
      console.log(`\n[Minter2] Generating ${splitRequests2.length} split proofs...`);
      const requestIds2 = [];
      for (let i = 0; i < splitRequests2.length; i++) {
        const response = await client.generateBatchSplitToken(splitRequests2[i], minter2Metadata);
        requestIds2.push(response.request_id);
        if ((i + 1) % 5 === 0 || i === splitRequests2.length - 1) {
          console.log(`  Progress: ${i + 1}/${splitRequests2.length}`);
        }
      }

      // Execute splits for minter1
      console.log(`\n[Minter1] Starting split operations for ${requestIds1.length} tokens`);
      for (let i = 0; i < requestIds1.length; i++) {
        const requestId = requestIds1[i];
        console.log(`[Minter1] Processing token ${i + 1}/${requestIds1.length} - RequestId: ${requestId}`);
        const result = await executeSingleSplitSequential(client, 'minter1', requestId, MINTERS.minter1.privateKey);
        if (!result.success) {
          throw new Error(`Minter1 split operation failed for request ${requestId}: ${result.error}`);
        }
        console.log(`[Minter1] ✓ Token ${i + 1}/${requestIds1.length} split completed`);
        await sleep(500);
      }
      console.log(`[Minter1] All ${requestIds1.length} tokens split completed\n`);

      // Execute splits for minter2
      console.log(`\n[Minter2] Starting split operations for ${requestIds2.length} tokens`);
      for (let i = 0; i < requestIds2.length; i++) {
        const requestId = requestIds2[i];
        console.log(`[Minter2] Processing token ${i + 1}/${requestIds2.length} - RequestId: ${requestId}`);
        const result = await executeSingleSplitSequential(client, 'minter2', requestId, MINTERS.minter2.privateKey);
        if (!result.success) {
          throw new Error(`Minter2 split operation failed for request ${requestId}: ${result.error}`);
        }
        console.log(`[Minter2] ✓ Token ${i + 1}/${requestIds2.length} split completed`);
        await sleep(500);
      }
      console.log(`[Minter2] All ${requestIds2.length} tokens split completed\n`);

      // Extract recipient tokens
      minter1List = await extractRecipientTokenIds(client, 'minter1', requestIds1, MINTERS.minter1.privateKey);
      minter2List = await extractRecipientTokenIds(client, 'minter2', requestIds2, MINTERS.minter2.privateKey);

      if (minter1List.length === 0 || minter2List.length === 0) {
        throw new Error(`Token extraction failed: Minter1 has ${minter1List.length} tokens, Minter2 has ${minter2List.length} tokens`);
      }
      await sleep(3000);
    });
  });

  describe.only('Case 4: Excute Transfers TPS', function () {
    this.timeout(6000000);
    it('should execute transfers with TPS', async function () {
      await executeBatchTransfersSigned(minter1List, minter2List);
    });
  });

  after(async function () {
    // Test completed
    console.log('Test completed.');
  });
});


/**
 * Extract recipient (odd index) token ID list from batch split transactions
 * @param {Object} client - gRPC client
 * @param {string} minterName - Minter name for configuration lookup
 * @param {string[]} requestIds - Transaction request ID array
 * @param {string} privateKey - Minter private key (for authentication)
 * @returns {Promise<Object>} Object containing extraction results
 */
async function extractRecipientTokenIds(client, minterName, requestIds, minterPrivateKey) {
  const minterMetadata = await createAuthMetadata(minterPrivateKey);

  const allTokenIds = await Promise.all(
      requestIds.map((requestId) =>
          client.getBatchSplitTokenDetail({ request_id: requestId }, minterMetadata).then((response) =>
              response.newTokens
                  .filter((_, idx) => idx % 2 !== 0) // Odd indices
                  .map((account) => account.token_id)
          )
      )
  );

  return allTokenIds.flat();
}
async function executeBatchTransfersSigned(tokenList1, tokenList2) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const processMinter = async (name, list) => {
    if (!list?.length) return [];
    const cfg = MINTERS[name];
    if (!cfg) return [];

    const wallet = new ethers.Wallet(cfg.privateKey, ethers.provider);
    const baseNonce = await wallet.getNonce('pending');

    return await Promise.all(
        list.map(async (t, i) => {
          try {
            const tokenId = t.tokenId || t;
            const contract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, wallet);
            const tx = await contract.transfer.populateTransaction(tokenId, `transfer-${name}-${i}`, {
              nonce: baseNonce + i,
              gasLimit: 3000000,
              gasPrice: 0,
            });
            tx.from = wallet.address;
            tx.type = 0;
            return { signedTx: await wallet.signTransaction(tx), tokenId, minterName: name, success: true };
          } catch (e) {
            return { tokenId, minterName: name, success: false, error: e.message };
          }
        })
    );
  };

  // Parallel signing
  const [txs1, txs2] = await Promise.all([processMinter('minter1', tokenList1), processMinter('minter2', tokenList2)]);

  const allSignedTxs = [];
  const maxLen = Math.max(txs1.length, txs2.length);
  // Alternate merge
  for (let i = 0; i < maxLen; i++) {
    if (i < txs1.length) allSignedTxs.push(txs1[i]);
    if (i < txs2.length) allSignedTxs.push(txs2[i]);
  }

  const signed = allSignedTxs.filter((r) => r.success);
  const failed = allSignedTxs.filter((r) => !r.success);

  if (failed.length) {
    console.error(`❌ ${failed.length} transactions failed during signing:`);
    failed.forEach((f, idx) => {
      if (idx < 5) {
        // show details of first 5 failures
        console.error(`  - TokenId: ${f.tokenId}, Minter: ${f.minterName}, Error: ${f.error}`);
      }
    });
    if (failed.length > 5) {
      console.error(`  ... and ${failed.length - 5} more signing failures`);
    }
  }

  // Batch send
  const BATCH_SIZE = 5000;
  const results = [];
  const pushPromises = [];
  const txHashMap = new Map(); // Store tokenId -> txHash mapping

  for (let i = 0; i < signed.length; i += BATCH_SIZE) {
    const batch = signed.slice(i, i + BATCH_SIZE);
    const payload = batch.map((item, idx) => ({
      jsonrpc: '2.0',
      id: i + idx,
      method: 'eth_sendRawTransaction',
      params: [item.signedTx],
    }));

    // Calculate request size
    const requestPayloadString = JSON.stringify(payload);
    const requestSizeInBytes = Buffer.byteLength(requestPayloadString, 'utf8');
    const requestSizeInMB = requestSizeInBytes / (1024 * 1024);

    console.log(
        `Starting to push batch ${Math.floor(i / BATCH_SIZE) + 1}, containing ${batch.length} transactions (alternate mode), time: ${new Date().toISOString()}`
    );
    console.log(`Request size: ${requestSizeInMB.toFixed(2)} MB`);

    const startTime = Date.now();

    const p = fetch(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
        .then((response) => response.json())
        .then((res) => {
          const endTime = Date.now();
          console.log(`Completed pushing batch ${Math.floor(i / BATCH_SIZE) + 1}, time taken: ${(endTime - startTime) / 1000} seconds`);
          const batchResponses = Array.isArray(res) ? res : [res];
          batchResponses.forEach((resp, idx) => {
            const txInfo = batch[idx];
            if (resp.result) {
              // Successfully obtained txHash
              txHashMap.set(txInfo.tokenId, resp.result);
            }
            results.push({
              tokenId: txInfo.tokenId,
              minterName: txInfo.minterName,
              txHash: resp.result,
              error: resp.error,
              success: !resp.error,
            });
          });
        })
        .catch((error) => {
          console.error(`Error pushing batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
        });

    pushPromises.push(p);
    await sleep(1000); // Reduce interval to increase pressure
  }

  await Promise.all(pushPromises); // Wait for all pushes to complete

  // Collect statistics
  const successfulTxs = results.filter((r) => r.success);
  const failedTxs = results.filter((r) => !r.success);

  // Display failed transaction details
  if (failedTxs.length > 0) {
    console.error(`\n❌ ${failedTxs.length} transactions failed during execution:`);
    failedTxs.forEach((f, idx) => {
      if (idx < 10) {
        // Show details of first 10 failures
        console.error(`  - TokenId: ${f.tokenId}, Minter: ${f.minterName}, Error: ${f.error?.message || f.error}`);
      }
    });
    if (failedTxs.length > 10) {
      console.error(`  ... and ${failedTxs.length - 10} more execution failures`);
    }
  }

  return {
    total: allSignedTxs.length,
    success: successfulTxs.length,
    failed: failed.length + failedTxs.length,
    signingFailed: failed.length,
    executionFailed: failedTxs.length,
    txHashes: Array.from(txHashMap.values()),
    failedTransactions: failedTxs.map((f) => ({
      tokenId: f.tokenId,
      minterName: f.minterName,
      error: f.error?.message || f.error,
    })),
  };
}
async function executeBatchBurnsSigned(tokenList1, tokenList2) {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const processMinter = async (name, list) => {
    if (!list?.length) return [];
    const cfg = MINTERS[name];
    if (!cfg) return [];

    const wallet = new ethers.Wallet(cfg.privateKey, ethers.provider);
    const baseNonce = await wallet.getNonce('pending');

    return await Promise.all(
        list.map(async (t, i) => {
          try {
            const tokenId = t.tokenId || t;
            const contract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, wallet);
            const tx = await contract.burn.populateTransaction(tokenId, {
              nonce: baseNonce + i,
              gasLimit: 3000000,
              gasPrice: 0,
            });
            tx.from = wallet.address;
            tx.type = 0;
            return { signedTx: await wallet.signTransaction(tx), tokenId, minterName: name, success: true };
          } catch (e) {
            return { tokenId, minterName: name, success: false, error: e.message };
          }
        })
    );
  };

  // Parallel signing
  const [txs1, txs2] = await Promise.all([processMinter('minter1', tokenList1), processMinter('minter2', tokenList2)]);

  const allSignedTxs = [];
  const maxLen = Math.max(txs1.length, txs2.length);
  // Alternate merge
  for (let i = 0; i < maxLen; i++) {
    if (i < txs1.length) allSignedTxs.push(txs1[i]);
    if (i < txs2.length) allSignedTxs.push(txs2[i]);
  }

  const signed = allSignedTxs.filter((r) => r.success);
  const failed = allSignedTxs.filter((r) => !r.success);

  if (failed.length) {
    console.error(`❌ ${failed.length} transactions failed during signing:`);
    failed.forEach((f, idx) => {
      if (idx < 5) {
        // show details of first 5 failures
        console.error(`  - TokenId: ${f.tokenId}, Minter: ${f.minterName}, Error: ${f.error}`);
      }
    });
    if (failed.length > 5) {
      console.error(`  ... and ${failed.length - 5} more signing failures`);
    }
  }

  // Batch send
  const BATCH_SIZE = 5000;
  const results = [];
  const pushPromises = [];
  const txHashMap = new Map(); // Store tokenId -> txHash mapping

  for (let i = 0; i < signed.length; i += BATCH_SIZE) {
    const batch = signed.slice(i, i + BATCH_SIZE);
    const payload = batch.map((item, idx) => ({
      jsonrpc: '2.0',
      id: i + idx,
      method: 'eth_sendRawTransaction',
      params: [item.signedTx],
    }));

    // Calculate request size
    const requestPayloadString = JSON.stringify(payload);
    const requestSizeInBytes = Buffer.byteLength(requestPayloadString, 'utf8');
    const requestSizeInMB = requestSizeInBytes / (1024 * 1024);

    console.log(
        `Starting to push Burn batch ${Math.floor(i / BATCH_SIZE) + 1}, containing ${batch.length} transactions (alternate mode), time: ${new Date().toISOString()}`
    );
    console.log(`Request size: ${requestSizeInMB.toFixed(2)} MB`);

    const startTime = Date.now();

    const p = fetch(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
        .then((response) => response.json())
        .then((res) => {
          const endTime = Date.now();
          console.log(`Completed pushing Burn batch ${Math.floor(i / BATCH_SIZE) + 1}, time taken: ${(endTime - startTime) / 1000} seconds`);
          const batchResponses = Array.isArray(res) ? res : [res];
          batchResponses.forEach((resp, idx) => {
            const txInfo = batch[idx];
            if (resp.result) {
              // Successfully obtained txHash
              txHashMap.set(txInfo.tokenId, resp.result);
            }
            results.push({
              tokenId: txInfo.tokenId,
              minterName: txInfo.minterName,
              txHash: resp.result,
              error: resp.error,
              success: !resp.error,
            });
          });
        })
        .catch((error) => {
          console.error(`Error pushing Burn batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
        });

    pushPromises.push(p);
    await sleep(1000); // Reduce interval to increase pressure
  }

  await Promise.all(pushPromises); // Wait for all pushes to complete

  // Collect statistics
  const successfulTxs = results.filter((r) => r.success);
  const failedTxs = results.filter((r) => !r.success);

  // Display failed transaction details
  if (failedTxs.length > 0) {
    console.error(`\n❌ ${failedTxs.length} transactions failed during execution:`);
    failedTxs.forEach((f, idx) => {
      if (idx < 10) {
        // Show details of first 10 failures
        console.error(`  - TokenId: ${f.tokenId}, Minter: ${f.minterName}, Error: ${f.error?.message || f.error}`);
      }
    });
    if (failedTxs.length > 10) {
      console.error(`  ... and ${failedTxs.length - 10} more execution failures`);
    }
  }

  return {
    total: allSignedTxs.length,
    success: successfulTxs.length,
    failed: failed.length + failedTxs.length,
    signingFailed: failed.length,
    executionFailed: failedTxs.length,
    txHashes: Array.from(txHashMap.values()),
    failedTransactions: failedTxs.map((f) => ({
      tokenId: f.tokenId,
      minterName: f.minterName,
      error: f.error?.message || f.error,
    })),
  };
}
async function executeSingleSplitSequential(client, minterName, requestId, privateKey) {
  const minterWallet = new ethers.Wallet(privateKey, ethers.provider);
  const derivedAddress = minterWallet.address;
  const configAddress = MINTERS[minterName].address;

  if (derivedAddress.toLowerCase() !== configAddress.toLowerCase()) {
    throw new Error(`[${minterName}] Private key does not match configured address!`);
  }

  const minterNative = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, minterWallet);
  const minterMetadata = await createAuthMetadata(privateKey);

  try {
    // Get split details
    const response = await client.getBatchSplitTokenDetail({ request_id: requestId }, minterMetadata);

    const recipients = response.to_addresses;
    const consumedIds = response.consumedIds.map((ids) => ids.token_id);

    const newTokens = response.newTokens.map((account, idx) => ({
      id: account.token_id,
      owner: derivedAddress,
      status: 2,
      amount: {
        cl_x: ethers.toBigInt(account.cl_x),
        cl_y: ethers.toBigInt(account.cl_y),
        cr_x: ethers.toBigInt(account.cr_x),
        cr_y: ethers.toBigInt(account.cr_y),
      },
      to: idx % 2 === 0 ? derivedAddress : recipients[Math.floor(idx / 2)],
      rollbackTokenId: idx % 2 === 0 ? 0 : response.newTokens[idx + 1]?.token_id,
    }));

    const proof = response.proof.map((p) => ethers.toBigInt(p));
    const publicInputs = response.public_input.map((i) => ethers.toBigInt(i));
    const paddingNum = response.batched_size - recipients.length;

    const tx = await minterNative.split(derivedAddress, recipients, consumedIds, newTokens, proof, publicInputs, paddingNum, { gasLimit: 10000000 });

    const receipt = await tx.wait();

    return {
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (error) {
    console.error(`Split operation failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}
