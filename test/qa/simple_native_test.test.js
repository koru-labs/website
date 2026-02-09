/**
 * Simple Native Token Operations Test - Mocha Format
 *
 * This test performs a simple sequence of operations:
 * 1. Set mint allowance
 * 2. Mint 1 token
 * 3. Split 1 token
 * 4. Transfer 1 token
 *
 * Target Node: http://l2-node1-native.hamsa-ucl.com:8545
 */

const { expect } = require('chai');
const { ethers } = require('hardhat');
const { createClient } = require('./token_grpc');
const accounts = require('./../../deployments/account.json');

// Import from NativeTestHelper
const { NATIVE_TOKEN_ADDRESS, NATIVE_ABI, createAuthMetadata, sleep, setupMintAllowance } = require('./../help/NativeTestHelper');

// Configuration
const NODE_URL = 'http://l2-node1-native.hamsa-ucl.com:8545';
const GRPC_URL = 'dev2-node3-rpc.hamsa-ucl.com:50051';

const l1CustomNetwork = {
  name: 'BESU',
  chainId: 1337,
};

const providerOptions = {
  batchMaxCount: 10,
  staticNetwork: true,
};

// Helper function to add timeout to any promise
function withTimeout(promise, ms, message) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(message || `Operation timed out after ${ms}ms`)), ms))]);
}

describe('Simple Native Token Operations Test', function () {
  this.timeout(300000); // 5 minutes timeout for the entire test suite

  let provider;
  let client;
  let minterWallet;
  let ownerWallet;
  let receiver1;
  let minterMetadata;
  let ownerMetadata;
  let minterContract;
  let ownerContract;

  // Store values across tests
  let mintedTokenId;
  let splitTokenId;

  before(async function () {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     Simple Native Token Operations Test                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log(`Node URL: ${NODE_URL}`);
    console.log(`gRPC URL: ${GRPC_URL}\n`);

    // Test HTTP connection first
    console.log('Testing HTTP connection...');
    provider = new ethers.JsonRpcProvider(NODE_URL, l1CustomNetwork, providerOptions);
    try {
      const blockNumber = await withTimeout(provider.getBlockNumber(), 10000, 'HTTP connection timeout');
      console.log(`✅ HTTP connected (block: ${blockNumber})\n`);
    } catch (error) {
      console.error(`❌ HTTP connection failed: ${error.message}`);
      throw error;
    }

    // Initialize gRPC client
    console.log('Initializing gRPC client...');
    client = createClient(GRPC_URL);
    console.log('✅ gRPC client created\n');

    // Create wallets
    minterWallet = new ethers.Wallet(accounts.MinterKey, provider);
    ownerWallet = new ethers.Wallet(accounts.OwnerKey, provider);
    receiver1 = accounts.To1;

    console.log(`Minter Address: ${minterWallet.address}`);
    console.log(`Owner Address: ${ownerWallet.address}`);
    console.log(`Receiver Address: ${receiver1}\n`);

    // Create auth metadata
    minterMetadata = await createAuthMetadata(accounts.MinterKey);
    ownerMetadata = await createAuthMetadata(accounts.OwnerKey);

    // Create contract instances
    minterContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, minterWallet);
    ownerContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, ownerWallet);

    console.log('✅ Setup complete\n');
  });

  describe('Step 1: Set Mint Allowance', function () {
    it('should set mint allowance successfully', async function () {
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║     Step 1: Set Mint Allowance                             ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');

      const allowanceAmount = 10000;
      console.log(`Setting mint allowance for ${minterWallet.address}...`);
      console.log(`Allowance amount: ${allowanceAmount}`);
      console.log('Calling setupMintAllowance (this may take up to 60 seconds)...');

      const setAllowedTx = await withTimeout(
        setupMintAllowance(ownerContract, client, minterWallet.address, accounts.OwnerKey, allowanceAmount),
        60000,
        'setupMintAllowance timed out - gRPC service may be unavailable'
      );

      console.log(`✅ Mint allowance set, tx: ${setAllowedTx.hash}`);
      expect(setAllowedTx.hash).to.be.a('string');
      await sleep(3000);
    });
  });

  describe('Step 2: Mint 1 Token', function () {
    it('should mint 1 token successfully', async function () {
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║     Step 2: Mint 1 Token                                   ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');

      const tokenAmount = 1000;
      console.log(`Minting 1 token with amount: ${tokenAmount}`);

      const generateRequest = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [
          {
            address: minterWallet.address,
            amount: tokenAmount,
          },
        ],
      };

      console.log('\n  📤 Mint Request:');
      console.log(`     - SC Address: ${generateRequest.sc_address}`);
      console.log(`     - Token Type: ${generateRequest.token_type}`);
      console.log(`     - From: ${generateRequest.from_address}`);
      console.log(`     - To Accounts: ${JSON.stringify(generateRequest.to_accounts)}`);

      console.log('\n  ⏳ Generating mint proof (this may take up to 60 seconds)...');
      const response = await withTimeout(
        client.generateBatchMintProof(generateRequest, minterMetadata),
        60000,
        'generateBatchMintProof timed out - gRPC service may be unavailable'
      );

      console.log('\n  📥 Mint Proof Response:');
      console.log(`     - Batched Size: ${response.batched_size}`);
      console.log(`     - Number of Accounts: ${response.to_accounts?.length || 0}`);
      console.log(`     - Proof Length: ${response.proof?.length || 0}`);
      console.log(`     - Input Length: ${response.input?.length || 0}`);

      const recipients = response.to_accounts.map((account) => account.address);
      const batchedSize = response.batched_size;

      console.log('\n  📋 Token Details:');
      response.to_accounts.forEach((account, idx) => {
        console.log(`     Token ${idx + 1}:`);
        console.log(`       - Token ID: ${account.token?.token_id}`);
        console.log(`       - Address: ${account.address}`);
        console.log(`       - CL: (${account.token?.cl_x?.substring(0, 20)}..., ${account.token?.cl_y?.substring(0, 20)}...)`);
        console.log(`       - CR: (${account.token?.cr_x?.substring(0, 20)}..., ${account.token?.cr_y?.substring(0, 20)}...)`);
      });

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

      console.log('\n  📋 Mint Allowed:');
      console.log(`     - Token ID: ${response.mint_allowed?.token_id}`);
      console.log(`     - CL: (${response.mint_allowed?.cl_x?.substring(0, 20)}..., ${response.mint_allowed?.cl_y?.substring(0, 20)}...)`);
      console.log(`     - CR: (${response.mint_allowed?.cr_x?.substring(0, 20)}..., ${response.mint_allowed?.cr_y?.substring(0, 20)}...)`);

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
      const padding = Math.max(Number(batchedSize) - 1, 0);

      console.log('\n  📤 Transaction Parameters:');
      console.log(`     - Recipients: ${JSON.stringify(recipients)}`);
      console.log(`     - Number of Tokens: ${newTokens.length}`);
      console.log(`     - Padding: ${padding}`);
      console.log(`     - Proof[0]: ${proof[0]?.toString().substring(0, 30)}...`);

      console.log('\n  ⏳ Executing mint transaction...');
      const mintTx = await minterContract.mint(recipients, newTokens, newAllowed, proof, publicInputs, padding);
      console.log(`     Transaction Hash: ${mintTx.hash}`);
      console.log(`     ⏳ Waiting for transaction to be mined...`);

      const receipt = await mintTx.wait();
      console.log('\n  ✅ Mint Transaction Mined!');
      console.log(`     - Block Number: ${receipt.blockNumber}`);
      console.log(`     - Gas Used: ${receipt.gasUsed?.toString()}`);
      console.log(`     - Status: ${receipt.status}`);
      console.log(`     - Token ID Minted: ${newTokens[0].id}`);

      mintedTokenId = ethers.toBigInt(newTokens[0].id);
      expect(mintTx.hash).to.be.a('string');
      expect(mintedTokenId).to.be.gt(0);
      expect(receipt.status).to.equal(1);
      await sleep(3000);
    });
  });

  describe('Step 3: Split 1 Token', function () {
    it('should split 1 token successfully', async function () {
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║     Step 3: Split 1 Token                                  ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');

      expect(mintedTokenId).to.exist;
      console.log(`Splitting token ${mintedTokenId.toString()}...`);

      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [
          { address: receiver1, amount: 100, comment: 'split-1' },
          { address: receiver1, amount: 100, comment: 'split-2' },
        ],
      };

      console.log('\n  📤 Split Request:');
      console.log(`     - SC Address: ${splitRequests.sc_address}`);
      console.log(`     - Token Type: ${splitRequests.token_type}`);
      console.log(`     - From: ${splitRequests.from_address}`);
      console.log(`     - To Accounts: ${splitRequests.to_accounts.length} accounts`);
      splitRequests.to_accounts.forEach((acc, idx) => {
        console.log(`       [${idx}] ${acc.address}: ${acc.amount} (${acc.comment})`);
      });

      console.log('\n  ⏳ Generating split proof (this may take up to 60 seconds)...');
      const splitProofResponse = await withTimeout(
        client.generateBatchSplitToken(splitRequests, minterMetadata),
        60000,
        'generateBatchSplitToken timed out - gRPC service may be unavailable'
      );

      console.log('\n  📥 Split Proof Response:');
      console.log(`     - Request ID: ${splitProofResponse.request_id}`);
      console.log(`     - Status: ${splitProofResponse.status}`);

      await sleep(2000);

      console.log('\n  ⏳ Getting split token details (this may take up to 60 seconds)...');
      const detailResponse = await withTimeout(
        client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, minterMetadata),
        60000,
        'getBatchSplitTokenDetail timed out - gRPC service may be unavailable'
      );

      console.log('\n  📥 Split Detail Response:');
      console.log(`     - Request ID: ${detailResponse.request_id}`);
      console.log(`     - Batched Size: ${detailResponse.batched_size}`);
      console.log(`     - To Addresses: ${JSON.stringify(detailResponse.to_addresses)}`);
      console.log(`     - Number of Consumed IDs: ${detailResponse.consumedIds?.length || 0}`);
      console.log(`     - Number of New Tokens: ${detailResponse.newTokens?.length || 0}`);
      console.log(`     - Proof Length: ${detailResponse.proof?.length || 0}`);
      console.log(`     - Public Input Length: ${detailResponse.public_input?.length || 0}`);

      const splitRecipients = detailResponse.to_addresses;
      const consumedIds = detailResponse.consumedIds.map((ids) => ids.token_id);

      console.log('\n  📋 Consumed Token IDs:');
      detailResponse.consumedIds?.forEach((id, idx) => {
        console.log(`     [${idx}] Token ID: ${id.token_id}`);
      });

      console.log('\n  📋 New Tokens Created:');
      detailResponse.newTokens?.forEach((token, idx) => {
        console.log(`     Token ${idx + 1}:`);
        console.log(`       - Token ID: ${token.token_id}`);
        console.log(`       - CL: (${token.cl_x?.substring(0, 20)}..., ${token.cl_y?.substring(0, 20)}...)`);
        console.log(`       - CR: (${token.cr_x?.substring(0, 20)}..., ${token.cr_y?.substring(0, 20)}...)`);
      });

      const splitNewTokens = detailResponse.newTokens.map((account, idx) => ({
        id: account.token_id,
        owner: minterWallet.address,
        status: 2,
        amount: {
          cl_x: ethers.toBigInt(account.cl_x),
          cl_y: ethers.toBigInt(account.cl_y),
          cr_x: ethers.toBigInt(account.cr_x),
          cr_y: ethers.toBigInt(account.cr_y),
        },
        to: idx % 2 === 0 ? minterWallet.address : splitRecipients[Math.floor(idx / 2)],
        rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1].token_id,
      }));

      const splitProof = detailResponse.proof.map((p) => ethers.toBigInt(p));
      const splitPublicInputs = detailResponse.public_input.map((i) => ethers.toBigInt(i));
      const paddingNum = detailResponse.batched_size - splitRecipients.length;

      console.log('\n  📤 Transaction Parameters:');
      console.log(`     - From: ${minterWallet.address}`);
      console.log(`     - Recipients: ${JSON.stringify(splitRecipients)}`);
      console.log(`     - Consumed IDs: ${JSON.stringify(consumedIds)}`);
      console.log(`     - Number of New Tokens: ${splitNewTokens.length}`);
      console.log(`     - Padding: ${paddingNum}`);
      console.log(`     - Proof[0]: ${splitProof[0]?.toString().substring(0, 30)}...`);

      console.log('\n  ⏳ Executing split transaction...');
      const splitTx = await minterContract.split(minterWallet.address, splitRecipients, consumedIds, splitNewTokens, splitProof, splitPublicInputs, paddingNum);
      console.log(`     Transaction Hash: ${splitTx.hash}`);
      console.log(`     ⏳ Waiting for transaction to be mined...`);

      const receipt = await splitTx.wait();
      console.log('\n  ✅ Split Transaction Mined!');
      console.log(`     - Block Number: ${receipt.blockNumber}`);
      console.log(`     - Gas Used: ${receipt.gasUsed?.toString()}`);
      console.log(`     - Status: ${receipt.status}`);

      // Store the first new token ID for transfer
      splitTokenId = ethers.toBigInt(splitNewTokens[0].id);
      console.log(`     - New Token IDs: ${splitNewTokens.map((t) => t.id).join(', ')}`);
      console.log(`     - Selected Token for Transfer: ${splitTokenId.toString()}`);

      expect(splitTx.hash).to.be.a('string');
      expect(splitTokenId).to.be.gt(0);
      expect(receipt.status).to.equal(1);
      await sleep(3000);
    });
  });

  describe('Step 4: Transfer 1 Token', function () {
    it('should transfer 1 token successfully', async function () {
      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║     Step 4: Transfer 1 Token                               ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');

      expect(splitTokenId).to.exist;
      console.log(`Transferring token ${splitTokenId.toString()}...`);

      const memo = 'simple-test-transfer';
      console.log('\n  📤 Transfer Request:');
      console.log(`     - Token ID: ${splitTokenId.toString()}`);
      console.log(`     - From: ${minterWallet.address}`);
      console.log(`     - Memo: ${memo}`);

      console.log('\n  ⏳ Executing transfer transaction...');
      const transferTx = await minterContract.transfer(splitTokenId, memo);
      console.log(`     Transaction Hash: ${transferTx.hash}`);
      console.log(`     ⏳ Waiting for transaction to be mined...`);

      const receipt = await transferTx.wait();
      console.log('\n  ✅ Transfer Transaction Mined!');
      console.log(`     - Block Number: ${receipt.blockNumber}`);
      console.log(`     - Gas Used: ${receipt.gasUsed?.toString()}`);
      console.log(`     - Status: ${receipt.status}`);
      console.log(`     - Token ID Transferred: ${splitTokenId.toString()}`);
      console.log(`     - Memo: ${memo}`);

      // Log transaction events if any
      if (receipt.logs && receipt.logs.length > 0) {
        console.log(`     - Events Count: ${receipt.logs.length}`);
        receipt.logs.forEach((log, idx) => {
          console.log(`       Event ${idx + 1}:`);
          console.log(`         - Address: ${log.address}`);
          console.log(`         - Topics: ${log.topics.length} topics`);
          console.log(`         - Data: ${log.data?.substring(0, 50)}...`);
        });
      }

      expect(transferTx.hash).to.be.a('string');
      expect(receipt.status).to.equal(1);
    });
  });

  after(function () {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║     All Operations Completed!                              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📊 Test Summary:');
    console.log('  ✅ Step 1: Set Mint Allowance');
    console.log('  ✅ Step 2: Mint 1 Token');
    if (mintedTokenId) {
      console.log(`     Token ID: ${mintedTokenId.toString()}`);
    }
    console.log('  ✅ Step 3: Split 1 Token');
    if (splitTokenId) {
      console.log(`     New Token ID: ${splitTokenId.toString()}`);
    }
    console.log('  ✅ Step 4: Transfer 1 Token');
    if (splitTokenId) {
      console.log(`     Transferred Token ID: ${splitTokenId.toString()}`);
    }
    console.log('');
  });
});
