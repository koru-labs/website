/**
 * Simple Native Token Operations Test - Mocha Format
 */

const { expect } = require('chai');
const { ethers } = require('hardhat');
const { createClient } = require('./token_grpc');
const accounts = require('./../../deployments/account.json');
const { NATIVE_TOKEN_ADDRESS, NATIVE_ABI, createAuthMetadata, sleep, setupMintAllowance } = require('./../help/NativeTestHelper');

const NODE_URL = 'http://l2-node3-native.hamsa-ucl.com:8545';
const GRPC_URL = 'dev2-node3-rpc.hamsa-ucl.com:50051';

const l1CustomNetwork = { name: 'BESU', chainId: 1337 };
const providerOptions = { batchMaxCount: 10, staticNetwork: true };

function withTimeout(promise, ms, message) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(message || `Timeout after ${ms}ms`)), ms))]);
}

describe('Simple Native Token Operations Test', function () {
  this.timeout(300000);

  let provider, client, minterWallet, ownerWallet, receiver1;
  let minterMetadata, ownerMetadata, minterContract, ownerContract;
  let mintedTokenId, splitTokenId;

  before(async function () {
    console.log('\n=== Simple Native Token Operations Test ===\n');
    console.log(`Node: ${NODE_URL}, gRPC: ${GRPC_URL}`);

    provider = new ethers.JsonRpcProvider(NODE_URL, l1CustomNetwork, providerOptions);
    const blockNumber = await withTimeout(provider.getBlockNumber(), 10000, 'HTTP timeout');
    console.log(`Connected (block: ${blockNumber})`);

    client = createClient(GRPC_URL);
    minterWallet = new ethers.Wallet(accounts.MinterKey, provider);
    ownerWallet = new ethers.Wallet(accounts.OwnerKey, provider);
    receiver1 = accounts.To1;

    console.log(`Minter: ${minterWallet.address}, Owner: ${ownerWallet.address}, Receiver: ${receiver1}`);

    minterMetadata = await createAuthMetadata(accounts.MinterKey);
    ownerMetadata = await createAuthMetadata(accounts.OwnerKey);
    minterContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, minterWallet);
    ownerContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, ownerWallet);
  });

  describe('Step 1: Set Mint Allowance', function () {
    it('should set mint allowance successfully', async function () {
      console.log('\nStep 1: Set Mint Allowance');
      const allowanceAmount = 100000000;

      const setAllowedTx = await withTimeout(
        setupMintAllowance(ownerContract, client, minterWallet.address, accounts.OwnerKey, allowanceAmount),
        60000,
        'setupMintAllowance timeout'
      );

      console.log(`✅ Mint allowance set, tx: ${setAllowedTx.hash}`);
      expect(setAllowedTx.hash).to.be.a('string');
      await sleep(3000);
    });
  });

  describe('Step 2: Mint 1 Token', function () {
    it('should mint 1 token successfully', async function () {
      console.log('\nStep 2: Mint 1 Token');
      const tokenAmount = 1000;

      const generateRequest = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [{ address: minterWallet.address, amount: tokenAmount }],
      };

      const response = await withTimeout(client.generateBatchMintProof(generateRequest, minterMetadata), 60000, 'generateBatchMintProof timeout');

      const recipients = response.to_accounts.map((account) => account.address);
      const newTokens = response.to_accounts.map((account) => ({
        id: account.token.token_id,
        owner: account.address,
        status: 2,
        amount: { cl_x: account.token.cl_x, cl_y: account.token.cl_y, cr_x: account.token.cr_x, cr_y: account.token.cr_y },
        to: account.address,
        rollbackTokenId: 0,
      }));

      const newAllowed = {
        id: response.mint_allowed.token_id,
        value: { cl_x: response.mint_allowed.cl_x, cl_y: response.mint_allowed.cl_y, cr_x: response.mint_allowed.cr_x, cr_y: response.mint_allowed.cr_y },
      };

      const proof = response.proof.map((p) => ethers.toBigInt(p));
      const publicInputs = response.input.map((i) => ethers.toBigInt(i));
      const padding = Math.max(Number(response.batched_size) - 1, 0);

      const mintTx = await minterContract.mint(recipients, newTokens, newAllowed, proof, publicInputs, padding, { gasLimit: 100000 });
      console.log(`Mint tx: ${mintTx.hash}, waiting...`);

      const receipt = await mintTx.wait();
      mintedTokenId = ethers.toBigInt(newTokens[0].id);

      console.log(`✅ Minted token ID: ${mintedTokenId.toString()} (block: ${receipt.blockNumber}, gas: ${receipt.gasUsed})`);
      expect(receipt.status).to.equal(1);
      await sleep(3000);
    });
  });

  describe('Step 3: Split 1 Token', function () {
    it('should split 1 token successfully', async function () {
      console.log('\nStep 3: Split 1 Token');
      expect(mintedTokenId).to.exist;
      console.log(`Splitting token ${mintedTokenId.toString()}...`);

      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [{ address: receiver1, amount: 100, comment: 'split-1' }],
      };

      const splitProofResponse = await withTimeout(client.generateBatchSplitToken(splitRequests, minterMetadata), 60000, 'generateBatchSplitToken timeout');

      await sleep(2000);

      const detailResponse = await withTimeout(
        client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, minterMetadata),
        60000,
        'getBatchSplitTokenDetail timeout'
      );

      const splitRecipients = detailResponse.to_addresses;
      const consumedIds = detailResponse.consumedIds.map((ids) => ids.token_id);

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

      const splitTx = await minterContract.split(minterWallet.address, splitRecipients, consumedIds, splitNewTokens, splitProof, splitPublicInputs, paddingNum, { gasLimit: 100000 });
      console.log(`Split tx: ${splitTx.hash}, waiting...`);

      const receipt = await splitTx.wait();

      // Find first odd-indexed token for transfer
      const transferTokenIdx = splitNewTokens.findIndex((_, idx) => idx % 2 !== 0);
      splitTokenId = ethers.toBigInt(splitNewTokens[transferTokenIdx].id);

      console.log(`✅ Split done. Token IDs: ${splitNewTokens.map((t) => t.id).join(', ')}`);
      console.log(`   Selected for transfer: ${splitTokenId.toString()} (index ${transferTokenIdx})`);

      expect(receipt.status).to.equal(1);
      await sleep(3000);
    });
  });

  describe('Step 4: Transfer 1 Token', function () {
    it('should transfer 1 token successfully', async function () {
      console.log('\nStep 4: Transfer 1 Token');
      expect(splitTokenId).to.exist;
      console.log(`Transferring token ${splitTokenId.toString()}...`);

      const memo = 'simple-test-transfer';
      const transferTx = await minterContract.transfer(splitTokenId, memo, { gasLimit: 100000 });
      console.log(`Transfer tx: ${transferTx.hash}, waiting...`);

      const receipt = await transferTx.wait();

      console.log(`✅ Transfer done. Token: ${splitTokenId.toString()}, Memo: ${memo} (block: ${receipt.blockNumber}, gas: ${receipt.gasUsed})`);
      expect(receipt.status).to.equal(1);
    });
  });

  after(function () {
    console.log('\n=== Test Summary ===');
    console.log(`✅ Mint: ${mintedTokenId?.toString() || 'N/A'}`);
    console.log(`✅ Split & Transfer: ${splitTokenId?.toString() || 'N/A'}`);
    console.log('');
  });
});
