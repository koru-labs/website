const { expect } = require('chai');
const { ethers } = require('hardhat');
const { createClient } = require('../token_grpc');
const accounts = require('../../../deployments/account.json');
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
} = require('../../help/NativeTestHelper');


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
// RPC endpoint for HTTP JSON-RPC calls (eth_sendRawTransaction)
const RPC = NODE_CONFIGS[2].httpUrl; // Using Node 3's HTTP URL

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

describe('Native Dual Minter Transfer Performance Tests In Node3', function () {
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

  describe('Case 1: Setup mint allowance for two minters', function () {
    it('should set mint allowance for minter1', async function () {
      this.timeout(120000);
      await setupMintAllowance(nativeOwner, client, MINTERS.minter1.address, accounts.OwnerKey, 100000000);
    });

    it('should set mint allowance for minter2', async function () {
      this.timeout(120000);
      await setupMintAllowance(nativeOwner, client, MINTERS.minter2.address, accounts.OwnerKey, 100000000);
    });
  });

  describe('Case 2: Mint tokens for both minters', function () {
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

  describe('Case 3: Split tokens', function () {
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

  describe('Case 4: Excute Transfers TPS', function () {
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

// ==================== 新增：Multi-Node TPS Test ====================
// NOTE: This test follows Scenario 5 pattern with batch operations for TPS testing
// To run full TPS test, change:
//   - tokenAmount: 1 → 2 (or more)
//   - splitsPerToken: 4 → 128 (or more)
describe.only('Multi-Node Transfer TPS Test (Node3 -> Node2 -> Node1)', function () {
  let client1, client2, client3;
  let provider1, provider2, provider3;
  let node1AdminWallet, node2AdminWallet, node1AdminContract, node2AdminContract;
  let minterWallet, ownerWallet, minterContract, ownerContract;
  let minterMetadata, node1AdminMetadata, node2AdminMetadata;
  
  // Step 2: Minted tokens for each address
  let minterTokens = [];           // 2 tokens for Step 3
  let node2AdminTokens = [];       // 2 tokens for Step 4
  let node1AdminTokens = [];       // 2 tokens for Step 5
  
  // Step 3-5: Pre-signed transactions
  let minterSignedTxs = [];        // 256 signed txs from Step 3 (Node3)
  let node2AdminSignedTxs = [];    // 256 signed txs from Step 4 (Node2)
  let node1AdminSignedTxs = [];    // 256 signed txs from Step 5 (Node1)

  const node1Config = NODE_CONFIGS[0];
  const node2Config = NODE_CONFIGS[1];
  const node3Config = NODE_CONFIGS[2];

  // Test configuration
  const TOKENS_PER_ADDRESS = 2;    // Tokens minted to each address in Step 2
  const SPLITS_PER_TOKEN = 128;    // Number of splits per token
  const TRANSFER_AMOUNT = 1;       // Amount per split

  before(async function () {
    this.timeout(300000);
    
    // Setup providers for all 3 nodes (following Scenario 5 pattern)
    provider1 = new ethers.JsonRpcProvider(node1Config.httpUrl, l1CustomNetwork, providerOptions);
    provider2 = new ethers.JsonRpcProvider(node2Config.httpUrl, l1CustomNetwork, providerOptions);
    provider3 = new ethers.JsonRpcProvider(node3Config.httpUrl, l1CustomNetwork, providerOptions);
    
    // Setup clients for all 3 nodes
    client1 = createClient(node1Config.grpcUrl);
    client2 = createClient(node2Config.grpcUrl);
    client3 = createClient(node3Config.grpcUrl);
    
    // Setup Node Admin wallets (following Scenario 5 pattern)
    node1AdminWallet = new ethers.Wallet(node1Config.key, provider1);
    node1AdminContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, node1AdminWallet);
    node1AdminMetadata = await createAuthMetadata(node1Config.key);
    
    node2AdminWallet = new ethers.Wallet(node2Config.key, provider2);
    node2AdminContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, node2AdminWallet);
    node2AdminMetadata = await createAuthMetadata(node2Config.key);
    
    // Setup Minter wallet on Node3 (following Scenario 5 pattern)
    minterWallet = new ethers.Wallet(accounts.MinterKey, provider3);
    minterContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, minterWallet);
    minterMetadata = await createAuthMetadata(accounts.MinterKey);
    
    // Setup Owner wallet on Node3
    ownerWallet = new ethers.Wallet(accounts.OwnerKey, provider3);
    ownerContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, ownerWallet);
    
    console.log('\n=== Multi-Node TPS Test Setup ===');
    console.log(`Node1 Admin: ${node1AdminWallet.address}`);
    console.log(`Node2 Admin: ${node2AdminWallet.address}`);
    console.log(`Minter: ${minterWallet.address}`);
    console.log(`Owner: ${ownerWallet.address}`);
    console.log(`Final Recipient (To1): ${accounts.To1}`);
  });

  describe('Step 1: Setup mint allowance on Node3', function () {
    it('should set mint allowance for minter on node3', async function () {
      this.timeout(120000);
      console.log('\nStep 1: Set Mint Allowance on Node 3');
      await setupMintAllowance(ownerContract, client3, minterWallet.address, accounts.OwnerKey, 100000000);
      console.log('✓ Minter allowance set');
      await sleep(10000);
    });
  });

  describe('Step 2: Mint and distribute tokens on Node3', function () {
    this.timeout(900000);
    
    let allMintedTokens = [];
    
    it('should mint 6 tokens for minter', async function () {
      console.log('\nStep 2.1: Mint 6 Tokens for Minter');
      const tokens = await mintMultipleTokens(
        client3, 
        minterWallet, 
        minterWallet.address, 
        TOKENS_PER_ADDRESS * 3,  // 6 tokens total
        10000
      );
      allMintedTokens = tokens;
      console.log(`✓ Minter minted ${tokens.length} tokens: ${tokens.join(', ')}`);
      await sleep(5000);
    });

    it('should split and transfer 2 tokens to node2 admin', async function () {
      console.log('\nStep 2.2: Split and Transfer 2 Tokens to Node2 Admin');
      
      // Take first 2 tokens for Node2 Admin
      const tokensToSplit = allMintedTokens.slice(0, 2);
      console.log(`  Tokens to split: ${tokensToSplit.join(', ')}`);
      
      // Split tokens (1 split per token, amount = 1, recipient = Node2 Admin)
      console.log(`  Splitting ${tokensToSplit.length} tokens...`);
      const splitTokens = await batchSplitTokens(
        client3,
        minterWallet,
        accounts.MinterKey,
        tokensToSplit,
        node2Config.admin,
        1,  // 1 split per token (creates 2 tokens total: 1 for minter, 1 for node2Admin)
        10000  // full amount
      );
      console.log(`✓ Split completed: ${splitTokens.length} tokens created`);
      
      // Transfer the split tokens to Node2 Admin
      console.log(`  Transferring ${splitTokens.length} tokens to Node2 Admin...`);
      for (let i = 0; i < splitTokens.length; i++) {
        const tokenId = splitTokens[i];
        const memo = `transfer-to-node2admin-${i}`;
        const transferTx = await minterContract.transfer(tokenId, memo, { gasLimit: 100000 });
        await transferTx.wait();
        console.log(`  ✓ [${i + 1}/${splitTokens.length}] Transferred token ${tokenId.slice(0, 16)}...`);
      }
      
      node2AdminTokens = splitTokens;
      console.log(`✓ Node2 Admin received ${node2AdminTokens.length} tokens`);
      await sleep(5000);
    });

    it('should split and transfer 2 tokens to node1 admin', async function () {
      console.log('\nStep 2.3: Split and Transfer 2 Tokens to Node1 Admin');
      
      // Take next 2 tokens for Node1 Admin
      const tokensToSplit = allMintedTokens.slice(2, 4);
      console.log(`  Tokens to split: ${tokensToSplit.join(', ')}`);
      
      // Split tokens (1 split per token, amount = 1, recipient = Node1 Admin)
      console.log(`  Splitting ${tokensToSplit.length} tokens...`);
      const splitTokens = await batchSplitTokens(
        client3,
        minterWallet,
        accounts.MinterKey,
        tokensToSplit,
        node1Config.admin,
        1,  // 1 split per token (creates 2 tokens total: 1 for minter, 1 for node1Admin)
        10000  // full amount
      );
      console.log(`✓ Split completed: ${splitTokens.length} tokens created`);
      
      // Transfer the split tokens to Node1 Admin
      console.log(`  Transferring ${splitTokens.length} tokens to Node1 Admin...`);
      for (let i = 0; i < splitTokens.length; i++) {
        const tokenId = splitTokens[i];
        const memo = `transfer-to-node1admin-${i}`;
        const transferTx = await minterContract.transfer(tokenId, memo, { gasLimit: 100000 });
        await transferTx.wait();
        console.log(`  ✓ [${i + 1}/${splitTokens.length}] Transferred token ${tokenId.slice(0, 16)}...`);
      }
      
      node1AdminTokens = splitTokens;
      console.log(`✓ Node1 Admin received ${node1AdminTokens.length} tokens`);
      
      // Minter keeps the remaining 2 tokens
      minterTokens = allMintedTokens.slice(4, 6);
      console.log(`✓ Minter keeps ${minterTokens.length} tokens: ${minterTokens.join(', ')}`);
      console.log(`\n✓ Total distributed: ${minterTokens.length + node2AdminTokens.length + node1AdminTokens.length} tokens`);
      await sleep(5000);
    });
  });

  describe('Step 3: Minter batch split to Node2 admin on Node3', function () {
    this.timeout(900000);
    
    it('should split minter tokens and pre-sign transfers', async function () {
      console.log('\nStep 3: Minter -> Node2 Admin (Split + Pre-sign on Node3)');
      console.log(`  Input: ${minterTokens.length} tokens from minter`);
      console.log(`  Split: ${SPLITS_PER_TOKEN} per token = ${minterTokens.length * SPLITS_PER_TOKEN} new tokens`);
      
      const tokens = await batchSplitTokens(
        client3,
        minterWallet,
        accounts.MinterKey,
        minterTokens,
        node2Config.admin,
        SPLITS_PER_TOKEN,
        TRANSFER_AMOUNT
      );
      
      console.log(`✓ Split completed: ${tokens.length} tokens created`);
      
      console.log(`\n  Pre-signing ${tokens.length} transfer transactions...`);
      minterSignedTxs = await preSignTransfers(
        minterWallet,
        tokens,
        'minter-to-node2'
      );
      
      console.log(`✓ Pre-signed ${minterSignedTxs.length} transactions for Node3`);
      await sleep(5000);
    });
  });

  describe('Step 4: Node2 admin batch split to Node1 admin on Node2', function () {
    this.timeout(900000);
    
    it('should split node2 admin tokens and pre-sign transfers', async function () {
      console.log('\nStep 4: Node2 Admin -> Node1 Admin (Split + Pre-sign on Node2)');
      console.log(`  Input: ${node2AdminTokens.length} tokens from node2 admin`);
      console.log(`  Split: ${SPLITS_PER_TOKEN} per token = ${node2AdminTokens.length * SPLITS_PER_TOKEN} new tokens`);
      
      const tokens = await batchSplitTokens(
        client2,
        node2AdminWallet,
        node2Config.key,
        node2AdminTokens,
        node1Config.admin,
        SPLITS_PER_TOKEN,
        TRANSFER_AMOUNT
      );
      
      console.log(`✓ Split completed: ${tokens.length} tokens created on Node2`);
      
      console.log(`\n  Pre-signing ${tokens.length} transfer transactions...`);
      node2AdminSignedTxs = await preSignTransfers(
        node2AdminWallet,
        tokens,
        'node2-to-node1'
      );
      
      console.log(`✓ Pre-signed ${node2AdminSignedTxs.length} transactions for Node2`);
      await sleep(5000);
    });
  });

  describe('Step 5: Node1 admin batch split to To1 on Node1', function () {
    this.timeout(900000);
    
    it('should split node1 admin tokens and pre-sign transfers', async function () {
      console.log('\nStep 5: Node1 Admin -> To1 (Split + Pre-sign on Node1)');
      console.log(`  Input: ${node1AdminTokens.length} tokens from node1 admin`);
      console.log(`  Split: ${SPLITS_PER_TOKEN} per token = ${node1AdminTokens.length * SPLITS_PER_TOKEN} new tokens`);
      
      const tokens = await batchSplitTokens(
        client1,
        node1AdminWallet,
        node1Config.key,
        node1AdminTokens,
        accounts.To1,
        SPLITS_PER_TOKEN,
        TRANSFER_AMOUNT
      );
      
      console.log(`✓ Split completed: ${tokens.length} tokens created on Node1`);
      
      console.log(`\n  Pre-signing ${tokens.length} transfer transactions...`);
      node1AdminSignedTxs = await preSignTransfers(
        node1AdminWallet,
        tokens,
        'node1-to-to1'
      );
      
      console.log(`✓ Pre-signed ${node1AdminSignedTxs.length} transactions for Node1`);
      await sleep(5000);
    });
  });

  describe('Step 6: Push all pre-signed transactions simultaneously', function () {
    this.timeout(1800000);
    
    it('should push all transactions to their respective nodes at the same time', async function () {
      console.log('\n=== Starting Simultaneous Push to All Nodes ===');
      console.log(`Node3 (Minter -> Node2Admin): ${minterSignedTxs.length} transactions`);
      console.log(`Node2 (Node2Admin -> Node1Admin): ${node2AdminSignedTxs.length} transactions`);
      console.log(`Node1 (Node1Admin -> To1): ${node1AdminSignedTxs.length} transactions`);
      console.log(`Total: ${minterSignedTxs.length + node2AdminSignedTxs.length + node1AdminSignedTxs.length} transactions\n`);
      
      const startTime = Date.now();
      
      const [result3, result2, result1] = await Promise.all([
        minterSignedTxs.length > 0 
          ? pushTransactionsToNode(minterSignedTxs, node3Config.httpUrl, 'Node3') 
          : Promise.resolve({ success: 0, total: 0 }),
        node2AdminSignedTxs.length > 0 
          ? pushTransactionsToNode(node2AdminSignedTxs, node2Config.httpUrl, 'Node2') 
          : Promise.resolve({ success: 0, total: 0 }),
        node1AdminSignedTxs.length > 0 
          ? pushTransactionsToNode(node1AdminSignedTxs, node1Config.httpUrl, 'Node1') 
          : Promise.resolve({ success: 0, total: 0 }),
      ]);
      
      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000;
      
      console.log('\n=== Push Results ===');
      console.log(`Node3 (Minter): ${result3.success}/${result3.total} successful`);
      console.log(`Node2 (Node2Admin): ${result2.success}/${result2.total} successful`);
      console.log(`Node1 (Node1Admin): ${result1.success}/${result1.total} successful`);
      console.log(`Total: ${result3.success + result2.success + result1.success}/${result3.total + result2.total + result1.total} successful`);
      console.log(`Time taken: ${totalTime.toFixed(2)} seconds`);
      
      const totalTxs = result3.total + result2.total + result1.total;
      const tps = totalTxs / totalTime;
      console.log(`TPS: ${tps.toFixed(2)} transactions/second`);
    });
  });

  describe('Step 7: Summary', function () {
    it('should display test summary', async function () {
      console.log('\n=== Test Summary ===');
      console.log(`Configuration:`);
      console.log(`  - Tokens per address: ${TOKENS_PER_ADDRESS}`);
      console.log(`  - Splits per token: ${SPLITS_PER_TOKEN}`);
      console.log(`  - Transfer amount per split: ${TRANSFER_AMOUNT}`);
      console.log(`\nExecution Pattern: PARALLEL`);
      console.log(`  Step 2: Minted 6 tokens (2 each to minter, node2Admin, node1Admin)`);
      console.log(`  Step 3: Minter split ${TOKENS_PER_ADDRESS} tokens → ${minterSignedTxs.length} signed txs (Node3)`);
      console.log(`  Step 4: Node2Admin split ${TOKENS_PER_ADDRESS} tokens → ${node2AdminSignedTxs.length} signed txs (Node2)`);
      console.log(`  Step 5: Node1Admin split ${TOKENS_PER_ADDRESS} tokens → ${node1AdminSignedTxs.length} signed txs (Node1)`);
      console.log(`  Step 6: Pushed ${minterSignedTxs.length + node2AdminSignedTxs.length + node1AdminSignedTxs.length} transactions simultaneously`);
      console.log(`\nTotal Transactions: ${minterSignedTxs.length + node2AdminSignedTxs.length + node1AdminSignedTxs.length}`);
    });
  });

  after(async function () {
    console.log('\n=== Multi-Node TPS Test Completed ===');
  });
});

// ==================== Helper Functions for Multi-Node Test ====================

/**
 * Mint multiple tokens
 */
async function mintMultipleTokens(client, wallet, address, count, amount) {
  const metadata = await createAuthMetadata(wallet.privateKey);
  
  const to_accounts = Array(count).fill().map(() => ({ address: address, amount: amount }));
  
  const generateRequest = {
    sc_address: NATIVE_TOKEN_ADDRESS,
    token_type: '0',
    from_address: address,
    to_accounts: to_accounts,
  };

  const response = await client.generateBatchMintProof(generateRequest, metadata);
  
  const recipients = response.to_accounts.map((account) => account.address);
  const newTokens = response.to_accounts.map((account) => ({
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

  const native = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, wallet);
  const tx = await native.mint(recipients, newTokens, newAllowed, proof, publicInputs, response.batched_size - count, { gasLimit: 10000000 });
  await tx.wait();

  return newTokens.map(token => token.id);
}

/**
 * Split a single token to multiple recipients (using NativeTestHelper functions)
 */
async function splitTokenToRecipient(client, wallet, privateKey, recipientAddress, splitCount, amountPerSplit) {
  const metadata = await createAuthMetadata(privateKey);
  const nativeContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, wallet);
  
  // Prepare split requests (1 request with splitCount recipients)
  const splitRequests = await prepareSplitRequests(client, wallet, metadata, recipientAddress, 1, NATIVE_TOKEN_ADDRESS);
  
  // Modify the split request to use custom splitCount and amount
  splitRequests[0].to_accounts = [];
  for (let j = 0; j < splitCount / 2; j++) {
    splitRequests[0].to_accounts.push(
      { address: recipientAddress, amount: amountPerSplit, comment: `split-${j}-r1` },
      { address: recipientAddress, amount: amountPerSplit, comment: `split-${j}-r2` }
    );
  }
  
  // Generate split proofs
  const requestIds = await generateSplitProofs(client, splitRequests, metadata);
  
  // Execute splits
  const splitResults = await executeBatchedConcurrentSplits(client, requestIds, wallet, metadata, nativeContract);
  
  return { 
    recipientTokens: splitResults.recipientTokens,
    txHash: splitResults.recipientTokens.length > 0 ? 'batch-completed' : null
  };
}

/**
 * Batch split multiple tokens (using NativeTestHelper functions)
 */
async function batchSplitTokens(client, wallet, privateKey, tokenIds, recipientAddress, splitsPerToken, amountPerSplit) {
  const metadata = await createAuthMetadata(privateKey);
  const nativeContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, wallet);
  
  // Prepare split requests (one request per token)
  const splitRequests = await prepareSplitRequests(client, wallet, metadata, recipientAddress, tokenIds.length, NATIVE_TOKEN_ADDRESS);
  
  // Modify each split request to use custom splitsPerToken and amount
  splitRequests.forEach((request, idx) => {
    request.to_accounts = [];
    for (let j = 0; j < splitsPerToken / 2; j++) {
      request.to_accounts.push(
        { address: recipientAddress, amount: amountPerSplit, comment: `batch-split-${tokenIds[idx]}-${j}-r1` },
        { address: recipientAddress, amount: amountPerSplit, comment: `batch-split-${tokenIds[idx]}-${j}-r2` }
      );
    }
  });
  
  // Generate split proofs
  const requestIds = await generateSplitProofs(client, splitRequests, metadata);
  
  // Execute splits
  const splitResults = await executeBatchedConcurrentSplits(client, requestIds, wallet, metadata, nativeContract);
  
  return splitResults.recipientTokens;
}

/**
 * Pre-sign transfer transactions
 */
async function preSignTransfers(wallet, tokenIds, prefix) {
  const baseNonce = await wallet.getNonce('pending');
  
  const signedTxs = await Promise.all(
    tokenIds.map(async (tokenId, i) => {
      try {
        const contract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, wallet);
        const tx = await contract.transfer.populateTransaction(tokenId, `${prefix}-${i}`, {
          nonce: baseNonce + i,
          gasLimit: 3000000,
          gasPrice: 0,
        });
        tx.from = wallet.address;
        tx.type = 0;
        const signedTx = await wallet.signTransaction(tx);
        return { signedTx, tokenId, success: true };
      } catch (e) {
        return { tokenId, success: false, error: e.message };
      }
    })
  );

  return signedTxs.filter(tx => tx.success);
}

/**
 * Push transactions to a specific node
 */
async function pushTransactionsToNode(signedTxs, nodeHttpUrl, nodeName = 'Node') {
  const BATCH_SIZE = 5000;
  const results = [];
  
  console.log(`\n[${nodeName}] Starting to push ${signedTxs.length} transactions to ${nodeHttpUrl}`);
  
  for (let i = 0; i < signedTxs.length; i += BATCH_SIZE) {
    const batch = signedTxs.slice(i, i + BATCH_SIZE);
    const payload = batch.map((item, idx) => ({
      jsonrpc: '2.0',
      id: i + idx,
      method: 'eth_sendRawTransaction',
      params: [item.signedTx],
    }));

    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    console.log(`[${nodeName}] Pushing batch ${batchNum}, ${batch.length} transactions...`);

    try {
      const response = await fetch(nodeHttpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const res = await response.json();
      const batchResponses = Array.isArray(res) ? res : [res];
      
      batchResponses.forEach((resp) => {
        results.push({
          success: !resp.error,
          error: resp.error,
        });
      });
      
      console.log(`[${nodeName}] Batch ${batchNum} pushed successfully`);
    } catch (error) {
      console.error(`[${nodeName}] Batch ${batchNum} failed: ${error.message}`);
      // Mark all transactions in this batch as failed
      batch.forEach(() => {
        results.push({
          success: false,
          error: error.message,
        });
      });
    }

    await sleep(1000);
  }

  const successCount = results.filter(r => r.success).length;
  
  return {
    total: results.length,
    success: successCount,
    failed: results.length - successCount,
  };
}


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
