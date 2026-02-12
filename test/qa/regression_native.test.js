const { expect } = require('chai');
const { ethers, network } = require('hardhat');
const { createClient } = require('./token_grpc');
const accounts = require('./../../deployments/account.json');

// Import from NativeTestHelper
const {
  NATIVE_TOKEN_ADDRESS,
  RPC_URL,
  NATIVE_ABI,
  createAuthMetadata,
  sleep,
  setupMintAllowance,
  prepareSplitRequests,
  generateSplitProofs,
  executeBatchedConcurrentSplits,
  executeBatchTransfers,
} = require('./../help/NativeTestHelper');

describe('Regression Native Token Tests', function () {
  this.timeout(600000); // 10 minutes

  let client;
  let minter1Wallet;
  let minter1Metadata;
  let nativeContract;
  let receiver1 = accounts.To1;
  let lastMinterTokenId;

  before(async function () {
    client = createClient(RPC_URL);
    minter1Wallet = new ethers.Wallet(accounts.MinterKey, ethers.provider);
    minter1Metadata = await createAuthMetadata(accounts.MinterKey);
    nativeContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, minter1Wallet);
  });

  describe('Setup', function () {
    it('should set mint allowance for minter', async function () {
      // Setup mint allowance using helper function
      const ownerWallet = new ethers.Wallet(accounts.OwnerKey, ethers.provider);
      const ownerNative = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, ownerWallet);

      const allowanceAmount = 1000000000;

      console.log('Setting mint allowance...');
      const setAllowedTx = await setupMintAllowance(ownerNative, client, minter1Wallet.address, accounts.OwnerKey, allowanceAmount);
      console.log('Mint allowance set successfully, tx:', setAllowedTx.hash);
      await sleep(5000);
    });
  });

  describe('Mint Function', function () {
    it('should mint multiple tokens in batch', async function () {
      // Mint multiple tokens at once - following performance script pattern
      const numberOfTokens = 32;
      const tokenAmount = 2000;
      await sleep(5000);
      // Create to_accounts array with specified number of tokens
      const to_accounts = Array(numberOfTokens)
        .fill()
        .map(() => ({
          address: minter1Wallet.address,
          amount: tokenAmount,
        }));

      const generateRequest = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minter1Wallet.address,
        to_accounts: to_accounts,
      };

      console.log(`Generating batch mint proof for ${numberOfTokens} tokens...`);
      const response = await client.generateBatchMintProof(generateRequest, minter1Metadata);

      const recipients = response.to_accounts.map((account) => account.address);
      const batchedSize = response.batched_size;

      // Process all new tokens
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
      const padding = Math.max(Number(batchedSize) - to_accounts.length, 0);

      console.log('Executing batch mint transaction...');
      const mintTx = await nativeContract.mint(recipients, newTokens, newAllowed, proof, publicInputs, padding, { gasLimit: 100000 });
      const receipt = await mintTx.wait();
      expect(receipt.status).to.equal(1);
      console.log('Batch mint successful, tx:', mintTx.hash);

      // Log all minted token IDs for debugging
      const mintedTokenIds = newTokens.map((token) => token.id);
      console.log(`Successfully minted ${mintedTokenIds.length} tokens. IDs:`, mintedTokenIds.join(', '));

      // Save the first token ID for transfer test
      if (newTokens.length > 0) {
        lastMinterTokenId = newTokens[0].id;
        console.log('Saved first token ID for transfer test:', lastMinterTokenId.toString());
      }

      // Check minted token status
      const testTokenId = ethers.toBigInt(newTokens[0].id);
      let tokenStatus = await nativeContract.getToken(minter1Wallet.address, testTokenId);
      console.log('  Status after mint:');
      console.log('    - Token ID:', tokenStatus.id.toString());
      console.log('    - Owner:', tokenStatus.owner);
      console.log('    - Status code:', tokenStatus.status);
      expect(tokenStatus.owner).to.equal(minter1Wallet.address);
      expect(tokenStatus.status).to.equal(2);
      await sleep(2000);
    });
  });
  describe('Split Function', function () {
    let tokenIdToSplit;

    // 辅助函数：生成指定数量的to_accounts数据
    const generateToAccounts = (count) => {
      const toAccounts = [];
      for (let i = 0; i < count; i++) {
        toAccounts.push({
          address: receiver1,
          amount: 10,
          comment: `split-${i + 1}`,
        });
      }
      return toAccounts;
    };

    // 辅助函数：执行split操作
    const executeSplit = async (toAccountsCount) => {
      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minter1Wallet.address,
        to_accounts: generateToAccounts(toAccountsCount),
      };

      console.log(`Generating batch split proof for ${toAccountsCount} recipients...`);
      const splitProofResponse = await client.generateBatchSplitToken(splitRequests, minter1Metadata);
      await sleep(2000); // Wait for async processing if any

      console.log('Getting split detail...');
      const detailResponse = await client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, minter1Metadata);

      const recipients = detailResponse.to_addresses;
      const consumedIds = detailResponse.consumedIds.map((ids) => ids.token_id);

      const newTokens = detailResponse.newTokens.map((account, idx) => ({
        id: account.token_id,
        owner: minter1Wallet.address,
        status: 2,
        amount: {
          cl_x: ethers.toBigInt(account.cl_x),
          cl_y: ethers.toBigInt(account.cl_y),
          cr_x: ethers.toBigInt(account.cr_x),
          cr_y: ethers.toBigInt(account.cr_y),
        },
        // Follow the logic from performance test for 'to' and 'rollbackTokenId'
        to: idx % 2 === 0 ? minter1Wallet.address : recipients[Math.floor(idx / 2)],
        // 修正rollbackTokenId的逻辑，使其与performance test一致
        rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1].token_id,
      }));
      const proof = detailResponse.proof.map((p) => ethers.toBigInt(p));
      const publicInputs = detailResponse.public_input.map((i) => ethers.toBigInt(i));
      const paddingNum = detailResponse.batched_size - recipients.length;

      console.log('Executing split transaction...');
      const splitTx = await nativeContract.split(minter1Wallet.address, recipients, consumedIds, newTokens, proof, publicInputs, paddingNum, {
        gasLimit: 100000,
      });
      const receipt = await splitTx.wait();
      expect(receipt.status).to.equal(1);
      console.log('Split successful, tx:', splitTx.hash);

      // 验证所有新生成的token都能通过getToken查询到
      console.log(`\nVerifying ${newTokens.length} split tokens with getToken...`);
      for (const token of newTokens) {
        console.log(`Raw token.id: ${token.id} (type: ${typeof token.id})`);
        const tokenId = ethers.toBigInt(token.id);
        console.log(`  Verifying token ID: ${tokenId.toString()}`);

        // 尝试获取token信息
        let tokenStatus;
        try {
          tokenStatus = await nativeContract.getToken(minter1Wallet.address, tokenId);
          console.log(`  ✅ Token ${tokenId.toString()} found, status: ${tokenStatus.status}`);
        } catch (error) {
          console.error(`  ❌ Failed to get token ${tokenId.toString()}:`, error.message);
          throw new Error(`Token verification failed for ${tokenId.toString()}`);
        }

        // 验证token属性
        expect(tokenStatus.id).to.equal(tokenId, `Token ID mismatch for ${tokenId.toString()}`);
        expect(tokenStatus.owner).to.equal(minter1Wallet.address, `Token owner mismatch for ${tokenId.toString()}`);
        expect(tokenStatus.status).to.equal(2, `Token status mismatch for ${tokenId.toString()}`);
      }
      console.log('✅ All split tokens verified successfully!');

      if (newTokens.length > 1) {
        lastMinterTokenId = newTokens[1].id;
        console.log('Captured recipient token ID (index 1) for transfer test:', lastMinterTokenId.toString());
      }
      await sleep(2000);
    };

    // 辅助函数：执行split操作但不验证token是否存在
    const executeSplitWithoutVerification = async (toAccountsCount) => {
      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minter1Wallet.address,
        to_accounts: generateToAccounts(toAccountsCount),
      };

      console.log(`Generating batch split proof for ${toAccountsCount} recipients (without verification)...`);
      const splitProofResponse = await client.generateBatchSplitToken(splitRequests, minter1Metadata);
      await sleep(2000); // Wait for async processing if any

      console.log('Getting split detail...');
      const detailResponse = await client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, minter1Metadata);

      const recipients = detailResponse.to_addresses;
      const consumedIds = detailResponse.consumedIds.map((ids) => ids.token_id);

      const newTokens = detailResponse.newTokens.map((account, idx) => ({
        id: account.token_id,
        owner: minter1Wallet.address,
        status: 2,
        amount: {
          cl_x: ethers.toBigInt(account.cl_x),
          cl_y: ethers.toBigInt(account.cl_y),
          cr_x: ethers.toBigInt(account.cr_x),
          cr_y: ethers.toBigInt(account.cr_y),
        },
        to: idx % 2 === 0 ? minter1Wallet.address : recipients[Math.floor(idx / 2)],
        rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1].token_id,
      }));
      const proof = detailResponse.proof.map((p) => ethers.toBigInt(p));
      const publicInputs = detailResponse.public_input.map((i) => ethers.toBigInt(i));
      const paddingNum = detailResponse.batched_size - recipients.length;

      console.log('Executing split transaction...');
      const splitTx = await nativeContract.split(minter1Wallet.address, recipients, consumedIds, newTokens, proof, publicInputs, paddingNum, {
        gasLimit: 100000,
      });
      const receipt = await splitTx.wait();
      expect(receipt.status).to.equal(1);
      console.log('Split successful (without verification), tx:', splitTx.hash);

      if (newTokens.length > 1) {
        lastMinterTokenId = newTokens[1].id;
        console.log('Captured recipient token ID (index 1) for transfer test:', lastMinterTokenId.toString());
      }
      await sleep(2000);

      return newTokens;
    };

    it('should split tokens to multiple recipients', async function () {
      await executeSplit(2);
    });

    it('should split tokens with 1 recipient in toAccounts', async function () {
      await executeSplit(1);
    });

    it('should split tokens with 127 recipients in toAccounts', async function () {
      await executeSplit(127);
    });

    it.skip('should split tokens with 128 recipients in toAccounts', async function () {
      this.timeout(12000000);
      for (let i = 0; i < 1; i++) {
        await executeSplit(128);
      }

      // await executeSplit(128);
    });
  });
  describe.skip('Split Edge Cases', function () {
    // 辅助函数：mint特定金额的token
    const mintSpecificToken = async (amount) => {
      // Mint a single token with specified amount
      const to_accounts = [
        {
          address: minter1Wallet.address,
          amount: amount,
        },
      ];

      const generateRequest = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minter1Wallet.address,
        to_accounts: to_accounts,
      };

      console.log(`Generating mint proof for token with amount ${amount}...`);
      const response = await client.generateBatchMintProof(generateRequest, minter1Metadata);

      const recipients = response.to_accounts.map((account) => account.address);
      const batchedSize = response.batched_size;

      // Process the minted token
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
      const padding = Math.max(Number(batchedSize) - to_accounts.length, 0);

      console.log(`Executing mint transaction for amount ${amount}...`);
      const mintTx = await nativeContract.mint(recipients, newTokens, newAllowed, proof, publicInputs, padding, { gasLimit: 100000 });
      const receipt = await mintTx.wait();
      expect(receipt.status).to.equal(1);
      console.log('Mint successful, tx:', mintTx.hash);

      return newTokens[0].id;
    };

    // 辅助函数：执行特定金额分配的split操作
    const executeSplitWithSpecificAmounts = async (tokenId, toAccounts) => {
      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minter1Wallet.address,
        to_accounts: toAccounts,
      };

      console.log(`Generating batch split proof with specific amounts...`);
      const splitProofResponse = await client.generateBatchSplitToken(splitRequests, minter1Metadata);
      await sleep(2000); // Wait for async processing if any

      console.log('Getting split detail...');
      const detailResponse = await client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, minter1Metadata);

      const recipients = detailResponse.to_addresses;
      const consumedIds = detailResponse.consumedIds.map((ids) => ids.token_id);
      const newTokens = detailResponse.newTokens.map((account, idx) => ({
        id: account.token_id,
        owner: minter1Wallet.address,
        status: 2,
        amount: {
          cl_x: ethers.toBigInt(account.cl_x),
          cl_y: ethers.toBigInt(account.cl_y),
          cr_x: ethers.toBigInt(account.cr_x),
          cr_y: ethers.toBigInt(account.cr_y),
        },
        // Follow the logic from performance test for 'to' and 'rollbackTokenId'
        to: idx % 2 === 0 ? minter1Wallet.address : recipients[Math.floor(idx / 2)],
        rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1].token_id,
      }));

      const proof = detailResponse.proof.map((p) => ethers.toBigInt(p));
      const publicInputs = detailResponse.public_input.map((i) => ethers.toBigInt(i));
      const paddingNum = detailResponse.batched_size - recipients.length;

      console.log('Executing split transaction...');
      const splitTx = await nativeContract.split(minter1Wallet.address, recipients, consumedIds, newTokens, proof, publicInputs, paddingNum, {
        gasLimit: 100000,
      });
      const receipt = await splitTx.wait();
      expect(receipt.status).to.equal(1);
      console.log('Split successful, tx:', splitTx.hash);

      // 验证所有新生成的token都能通过getToken查询到
      console.log(`\nVerifying ${newTokens.length} split tokens with getToken...`);
      for (const token of newTokens) {
        const tokenId = ethers.toBigInt(token.id);
        console.log(`  Verifying token ID: ${tokenId.toString()}`);

        // 尝试获取token信息
        let tokenStatus;
        try {
          tokenStatus = await nativeContract.getToken(minter1Wallet.address, tokenId);
          console.log(`  ✅ Token ${tokenId.toString()} found, status: ${tokenStatus.status}`);
        } catch (error) {
          console.error(`  ❌ Failed to get token ${tokenId.toString()}:`, error.message);
          throw new Error(`Token verification failed for ${tokenId.toString()}`);
        }

        // 验证token属性
        expect(tokenStatus.id).to.equal(tokenId, `Token ID mismatch for ${tokenId.toString()}`);
        expect(tokenStatus.owner).to.equal(minter1Wallet.address, `Token owner mismatch for ${tokenId.toString()}`);
        expect(tokenStatus.status).to.equal(2, `Token status mismatch for ${tokenId.toString()}`);
      }
      console.log('✅ All split tokens verified successfully!');
      await sleep(2000);
    };

    it('should split 100 into 1 and 99', async function () {
      // 1. Mint a token with amount 100
      const mintedTokenId = await mintSpecificToken(100);

      // 2. Split into 1 and 99
      const toAccounts = [
        { address: receiver1, amount: 1, comment: 'split-1' },
        { address: receiver1, amount: 99, comment: 'split-99' },
      ];

      await executeSplitWithSpecificAmounts(mintedTokenId, toAccounts);
    });

    it('should split 100 into 100', async function () {
      // 1. Mint a token with amount 100
      const mintedTokenId = await mintSpecificToken(100);

      // 2. Split into 100 (total equals original amount)
      const toAccounts = [{ address: receiver1, amount: 100, comment: 'split-100' }];

      await executeSplitWithSpecificAmounts(mintedTokenId, toAccounts);
    });
  });
  describe('Transfer Function', function () {
    it('should transfer a token to another user', async function () {
      let tokenId;
      if (lastMinterTokenId) {
        tokenId = lastMinterTokenId;
      } else {
        // Find a token to transfer as fallback
        const tokenListResponse = await client.getSplitTokenList(minter1Wallet.address, NATIVE_TOKEN_ADDRESS, minter1Metadata);
        if (!tokenListResponse.split_tokens || tokenListResponse.split_tokens.length === 0) {
          this.skip();
        }
        tokenId = ethers.toBigInt(tokenListResponse.split_tokens[0].token_id);
      }

      console.log('Executing transfer transaction for token ID:', tokenId.toString());
      // Use populateTransaction to build the transaction like in the performance test
      let tx = await nativeContract.transfer(tokenId, 'regression transfer', { gasLimit: 100000 });
      let receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
      console.log('Transfer successful, tx:', tx.hash);
      await sleep(2000);
    });
  });
  describe('Burn Function', function () {
    it('should split tokens to burn', async function () {
      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minter1Wallet.address,
        to_accounts: [{ address: accounts.Minter, amount: 10, comment: 'burn-10' }],
      };

      console.log('Generating batch split proof...');
      const splitProofResponse = await client.generateBatchSplitToken(splitRequests, minter1Metadata);
      await sleep(2000); // Wait for async processing if any

      console.log('Getting split detail...');
      const detailResponse = await client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, minter1Metadata);

      let recipients = detailResponse.to_addresses;
      const consumedIds = detailResponse.consumedIds.map((ids) => ids.token_id);
      const newTokens = detailResponse.newTokens.map((account, idx) => ({
        id: account.token_id,
        owner: minter1Wallet.address,
        status: 2,
        amount: {
          cl_x: ethers.toBigInt(account.cl_x),
          cl_y: ethers.toBigInt(account.cl_y),
          cr_x: ethers.toBigInt(account.cr_x),
          cr_y: ethers.toBigInt(account.cr_y),
        },
        // Follow the logic from performance test for 'to' and 'rollbackTokenId'
        to: idx % 2 === 0 ? minter1Wallet.address : recipients[Math.floor(idx / 2)],
        rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1].token_id,
      }));

      const proof = detailResponse.proof.map((p) => ethers.toBigInt(p));
      const publicInputs = detailResponse.public_input.map((i) => ethers.toBigInt(i));
      const paddingNum = detailResponse.batched_size - recipients.length;

      console.log('Executing split transaction...');
      const splitTx = await nativeContract.split(minter1Wallet.address, recipients, consumedIds, newTokens, proof, publicInputs, paddingNum, {
        gasLimit: 100000,
      });
      const receipt = await splitTx.wait();
      expect(receipt.status).to.equal(1);
      console.log('Split successful, tx:', splitTx.hash);
      if (newTokens.length > 1) {
        lastMinterTokenId = newTokens[1].id;
        console.log('Captured recipient token ID (index 1) for transfer test:', lastMinterTokenId.toString());
      }
      await sleep(2000);
    });
    it('should burn a token ', async function () {
      let tokenId;
      if (lastMinterTokenId) {
        tokenId = lastMinterTokenId;
      } else {
        // Find a token to transfer as fallback
        const tokenListResponse = await client.getSplitTokenList(minter1Wallet.address, NATIVE_TOKEN_ADDRESS, minter1Metadata);
        if (!tokenListResponse.split_tokens || tokenListResponse.split_tokens.length === 0) {
          this.skip();
        }
        tokenId = ethers.toBigInt(tokenListResponse.split_tokens[0].token_id);
      }

      console.log('Executing burn transaction for token ID:', tokenId.toString());
      // Use populateTransaction to build the transaction like in the performance test
      let tx = await nativeContract.burn(tokenId, { gasLimit: 100000 });
      let receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
      console.log('Burn successful, tx:', tx.hash);
      await sleep(2000);
    });
  });
  describe('Complete Workflow Scenarios', function () {
    it.only('should complete workflow: mint 1 token -> split 1 token -> transfer 1 token', async function () {
      console.log('\n🔄 TEST: Complete workflow with 1 token (Mint → Split → Transfer)');
      console.log('   Purpose: Verify end-to-end workflow with single token operations');
      console.log('   Expected: Successfully mint, split, and transfer 1 token through complete lifecycle\n');

      // Step 1: Mint 1 token
      console.log('Step 1: Minting 1 token...');
      const numberOfTokens = 1;
      const tokenAmount = 1000;

      const to_accounts = Array(numberOfTokens)
        .fill()
        .map(() => ({
          address: minter1Wallet.address,
          amount: tokenAmount,
        }));

      const generateRequest = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minter1Wallet.address,
        to_accounts: to_accounts,
      };

      const response = await client.generateBatchMintProof(generateRequest, minter1Metadata);
      const recipients = response.to_accounts.map((account) => account.address);
      const batchedSize = response.batched_size;

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
      const padding = Math.max(Number(batchedSize) - to_accounts.length, 0);

      const mintTx = await nativeContract.mint(recipients, newTokens, newAllowed, proof, publicInputs, padding, { gasLimit: 100000 });
      const mintReceipt = await mintTx.wait();
      expect(mintReceipt.status).to.equal(1);
      console.log(`✅ Minted 1 token successfully, tx: ${mintTx.hash}`);
      await sleep(2000);

      // Step 2: Split 1 token
      console.log('\nStep 2: Splitting 1 token...');
      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minter1Wallet.address,
        to_accounts: [{ address: receiver1, amount: 500, comment: 'workflow-split-1' }],
      };

      const splitProofResponse = await client.generateBatchSplitToken(splitRequests, minter1Metadata);
      await sleep(2000);

      const detailResponse = await client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, minter1Metadata);
      const splitRecipients = detailResponse.to_addresses;
      const consumedIds = detailResponse.consumedIds.map((ids) => ids.token_id);

      // Debug: Log token structure
      console.log(`   Split created ${detailResponse.newTokens?.length || 0} tokens`);
      detailResponse.newTokens?.forEach((token, idx) => {
        console.log(`     [${idx}] Token ID: ${token.token_id}`);
      });

      const splitNewTokens = detailResponse.newTokens.map((account, idx) => ({
        id: account.token_id,
        owner: minter1Wallet.address,
        status: 2,
        amount: {
          cl_x: ethers.toBigInt(account.cl_x),
          cl_y: ethers.toBigInt(account.cl_y),
          cr_x: ethers.toBigInt(account.cr_x),
          cr_y: ethers.toBigInt(account.cr_y),
        },
        to: idx % 2 === 0 ? minter1Wallet.address : splitRecipients[Math.floor(idx / 2)],
        rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1]?.token_id,
      }));

      const splitProof = detailResponse.proof.map((p) => ethers.toBigInt(p));
      const splitPublicInputs = detailResponse.public_input.map((i) => ethers.toBigInt(i));
      const paddingNum = detailResponse.batched_size - splitRecipients.length;

      const splitTx = await nativeContract.split(
        minter1Wallet.address,
        splitRecipients,
        consumedIds,
        splitNewTokens,
        splitProof,
        splitPublicInputs,
        paddingNum,
        { gasLimit: 100000 }
      );
      const splitReceipt = await splitTx.wait();
      expect(splitReceipt.status).to.equal(1);
      console.log(`✅ Split 1 token successfully, tx: ${splitTx.hash}`);
      await sleep(2000);

      // Step 3: Transfer 1 token
      console.log('\nStep 3: Transferring 1 token...');
      // Find first odd-indexed token for transfer (same as simple_native_test)
      const transferTokenIdx = splitNewTokens.findIndex((_, idx) => idx % 2 !== 0);
      if (transferTokenIdx === -1) {
        throw new Error('No valid transfer token found (odd index token with rollbackTokenId)');
      }
      const tokenIdToTransfer = ethers.toBigInt(splitNewTokens[transferTokenIdx].id);
      console.log(`   Selected token index: ${transferTokenIdx}, Token ID: ${tokenIdToTransfer.toString()}`);

      const transferTx = await nativeContract.transfer(tokenIdToTransfer, 'workflow-transfer-1', { gasLimit: 100000 });
      const transferReceipt = await transferTx.wait();
      expect(transferReceipt.status).to.equal(1);
      console.log(`✅ Transferred 1 token successfully, tx: ${transferTx.hash}`);
      await sleep(2000);

      console.log('\n✅ Complete workflow with 1 token finished successfully!');
    });

    it.skip('should complete workflow: 64 concurrent splits (128 tokens each) -> concurrent transfers(8192 tokens total)', async function () {
      this.timeout(3600000); // 1 hour timeout for large batch operations

      console.log('\n🔄 TEST: Complete workflow with 64 concurrent splits (128 tokens each) and concurrent transfers 8192 tokens');
      console.log('   Purpose: Verify end-to-end workflow with large-scale concurrent operations');
      console.log('   Expected: Successfully mint tokens, execute 32 concurrent split operations (128 tokens each) and concurrent transfers\n');

      // Step 1: Mint tokens for split operations
      console.log('═══ Step 1: Minting 64 tokens for split operations ═══');
      const numberOfSplits = 64;
      const tokensPerSplit = 128;
      const tokenAmount = 10000;

      const tokensToMint = numberOfSplits;
      console.log(`   Minting ${tokensToMint} tokens with amount ${tokenAmount} each...`);

      const to_accounts = Array(tokensToMint)
        .fill()
        .map(() => ({
          address: minter1Wallet.address,
          amount: tokenAmount,
        }));

      const generateRequest = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minter1Wallet.address,
        to_accounts: to_accounts,
      };

      const response = await client.generateBatchMintProof(generateRequest, minter1Metadata);
      const recipients = response.to_accounts.map((account) => account.address);
      const batchedSize = response.batched_size;

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
      const padding = Math.max(Number(batchedSize) - to_accounts.length, 0);

      const mintTx = await nativeContract.mint(recipients, newTokens, newAllowed, proof, publicInputs, padding, { gasLimit: 100000 });
      const mintReceipt = await mintTx.wait();
      expect(mintReceipt.status).to.equal(1);
      console.log(`✅ Minted ${tokensToMint} tokens successfully, tx: ${mintTx.hash}`);
      await sleep(3000);

      // Step 2: Prepare split requests using helper function
      console.log('\n═══ Step 2: Preparing 64 split requests (128 tokens each) ═══');
      const splitRequests = await prepareSplitRequests(client, minter1Wallet, minter1Metadata, receiver1, numberOfSplits, NATIVE_TOKEN_ADDRESS);
      console.log(`✅ Prepared ${splitRequests.length} split requests`);

      // Step 3: Generate split proofs using helper function
      console.log('\n═══ Step 3: Generating 64 split proofs (128 tokens each) ═══');
      const requestIds = await generateSplitProofs(client, splitRequests, minter1Metadata);
      console.log(`✅ Generated ${requestIds.length} split proofs`);

      // Step 4: Execute concurrent splits using helper function
      console.log('\n═══ Step 4: Executing concurrent split transactions (128 tokens each) ═══');
      const splitResults = await executeBatchedConcurrentSplits(client, requestIds, minter1Wallet, minter1Metadata, nativeContract);
      console.log(`✅ Split operations completed:`);
      console.log(`   - Total transactions: ${splitResults.totalTransactions}`);
      console.log(`   - Successful: ${splitResults.successfulTransactions}`);
      console.log(`   - Failed: ${splitResults.failedTransactions}`);
      console.log(`   - Duration: ${splitResults.duration}s`);
      await sleep(3000);

      // Step 5: Execute concurrent transfers using helper function
      console.log('\n═══ Step 5: Executing concurrent transfers (8192 tokens total) ═══');
      const transferResults = await executeBatchTransfers(client, splitResults.recipientTokens, minter1Wallet, nativeContract);
      console.log(`✅ Transfer operations completed:`);
      console.log(`   - Total: ${transferResults.total}`);
      console.log(`   - Successful: ${transferResults.success}`);
      console.log(`   - Failed: ${transferResults.failed}`);

      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║  ✅ COMPLETE WORKFLOW FINISHED SUCCESSFULLY               ║');
      console.log('╚════════════════════════════════════════════════════════════╝');
      console.log(`\n📊 Summary:`);
      console.log(`   - Tokens minted: ${tokensToMint} (amount: ${tokenAmount} each)`);
      console.log(`   - Split operations: ${numberOfSplits}`);
      console.log(`   - Tokens per split: ${tokensPerSplit}`);
      // console.log(`   - Total recipient tokens: ${splitResults.recipientTokens.length}`);
      console.log(`   - Total tokens transferred: ${transferResults.success}`);
    });
  });
  describe.skip('Conflict Operation Tests', function () {
    it('should fail when transferring the same tokenId multiple times', async function () {
      console.log('\n=== Test: Multiple transfers with same tokenId ===');

      // Create a new token via split for this test
      console.log('Creating new token via split for transfer test...');
      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minter1Wallet.address,
        to_accounts: [{ address: receiver1, amount: 10, comment: 'transfer' }],
      };

      const splitProofResponse = await client.generateBatchSplitToken(splitRequests, minter1Metadata);
      await sleep(2000);

      const detailResponse = await client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, minter1Metadata);
      const recipients = detailResponse.to_addresses;
      const consumedIds = detailResponse.consumedIds.map((ids) => ids.token_id);
      const newTokens = detailResponse.newTokens.map((account, idx) => ({
        id: account.token_id,
        owner: minter1Wallet.address,
        status: 2,
        amount: {
          cl_x: ethers.toBigInt(account.cl_x),
          cl_y: ethers.toBigInt(account.cl_y),
          cr_x: ethers.toBigInt(account.cr_x),
          cr_y: ethers.toBigInt(account.cr_y),
        },
        to: idx % 2 === 0 ? minter1Wallet.address : recipients[Math.floor(idx / 2)],
        rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1].token_id,
      }));

      const proof = detailResponse.proof.map((p) => ethers.toBigInt(p));
      const publicInputs = detailResponse.public_input.map((i) => ethers.toBigInt(i));
      const paddingNum = detailResponse.batched_size - recipients.length;

      const splitTx = await nativeContract.split(minter1Wallet.address, recipients, consumedIds, newTokens, proof, publicInputs, paddingNum, {
        gasLimit: 100000,
      });
      await splitTx.wait();

      const tokenId = ethers.toBigInt(newTokens[1].id);
      console.log('Token created via split, ID:', tokenId.toString());
      await sleep(2000);

      // First transfer should succeed
      console.log('Attempting first transfer...');
      const tx1 = await nativeContract.transfer(tokenId, 'first-transfer', { gasLimit: 100000 });
      const receipt1 = await tx1.wait();
      expect(receipt1.status).to.equal(1);
      console.log('✅ First transfer successful, tx:', tx1.hash);
      await sleep(2000);

      // Second transfer with same tokenId should fail
      console.log('Attempting second transfer with same tokenId...');
      try {
        const tx2 = await nativeContract.transfer(tokenId, 'second-transfer', { gasLimit: 100000 });
        await tx2.wait();
        console.log('❌ Second transfer unexpectedly succeeded');
        expect.fail('Second transfer should have failed but succeeded');
      } catch (error) {
        console.log('✅ Second transfer failed as expected');
        console.log('   Error:', error.message);
        expect(error.message).to.exist;
      }
    });
    it('should fail when burning the same tokenId multiple times', async function () {
      console.log('\n=== Test: Multiple burns with same tokenId ===');

      // First, create a new token for this test
      console.log('Creating new token for burn test...');
      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minter1Wallet.address,
        to_accounts: [{ address: minter1Wallet.address, amount: 10, comment: 'burn-test' }],
      };

      const splitProofResponse = await client.generateBatchSplitToken(splitRequests, minter1Metadata);
      await sleep(2000);

      const detailResponse = await client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, minter1Metadata);
      const recipients = detailResponse.to_addresses;
      const consumedIds = detailResponse.consumedIds.map((ids) => ids.token_id);
      const newTokens = detailResponse.newTokens.map((account, idx) => ({
        id: account.token_id,
        owner: minter1Wallet.address,
        status: 2,
        amount: {
          cl_x: ethers.toBigInt(account.cl_x),
          cl_y: ethers.toBigInt(account.cl_y),
          cr_x: ethers.toBigInt(account.cr_x),
          cr_y: ethers.toBigInt(account.cr_y),
        },
        to: idx % 2 === 0 ? minter1Wallet.address : recipients[Math.floor(idx / 2)],
        rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1].token_id,
      }));

      const proof = detailResponse.proof.map((p) => ethers.toBigInt(p));
      const publicInputs = detailResponse.public_input.map((i) => ethers.toBigInt(i));
      const paddingNum = detailResponse.batched_size - recipients.length;

      const splitTx = await nativeContract.split(minter1Wallet.address, recipients, consumedIds, newTokens, proof, publicInputs, paddingNum, {
        gasLimit: 100000,
      });
      await splitTx.wait();

      const burnTokenId = ethers.toBigInt(newTokens[1].id);
      console.log('Token created for burn test, ID:', burnTokenId.toString());
      await sleep(2000);

      // First burn should succeed
      console.log('Attempting first burn...');
      const burnTx1 = await nativeContract.burn(burnTokenId, { gasLimit: 100000 });
      const burnReceipt1 = await burnTx1.wait();
      expect(burnReceipt1.status).to.equal(1);
      console.log('✅ First burn successful, tx:', burnTx1.hash);
      await sleep(2000);

      // Second burn with same tokenId should fail
      console.log('Attempting second burn with same tokenId...');
      try {
        const burnTx2 = await nativeContract.burn(burnTokenId, { gasLimit: 100000 });
        await burnTx2.wait();
        console.log('❌ Second burn unexpectedly succeeded');
        expect.fail('Second burn should have failed but succeeded');
      } catch (error) {
        console.log('✅ Second burn failed as expected');
        console.log('   Error:', error.message);
        expect(error.message).to.exist;
      }
    });
    it('should fail when burning a tokenId that was already transferred', async function () {
      console.log('\n=== Test: Burn after transfer with same tokenId ===');

      // First, create a new token for this test
      console.log('Creating new token for transfer-then-burn test...');
      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minter1Wallet.address,
        to_accounts: [{ address: receiver1, amount: 10, comment: 'transfer-burn-test' }],
      };

      const splitProofResponse = await client.generateBatchSplitToken(splitRequests, minter1Metadata);
      await sleep(2000);

      const detailResponse = await client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, minter1Metadata);
      const recipients = detailResponse.to_addresses;
      const consumedIds = detailResponse.consumedIds.map((ids) => ids.token_id);
      const newTokens = detailResponse.newTokens.map((account, idx) => ({
        id: account.token_id,
        owner: minter1Wallet.address,
        status: 2,
        amount: {
          cl_x: ethers.toBigInt(account.cl_x),
          cl_y: ethers.toBigInt(account.cl_y),
          cr_x: ethers.toBigInt(account.cr_x),
          cr_y: ethers.toBigInt(account.cr_y),
        },
        to: idx % 2 === 0 ? minter1Wallet.address : recipients[Math.floor(idx / 2)],
        rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1].token_id,
      }));

      const proof = detailResponse.proof.map((p) => ethers.toBigInt(p));
      const publicInputs = detailResponse.public_input.map((i) => ethers.toBigInt(i));
      const paddingNum = detailResponse.batched_size - recipients.length;

      const splitTx = await nativeContract.split(minter1Wallet.address, recipients, consumedIds, newTokens, proof, publicInputs, paddingNum, {
        gasLimit: 100000,
      });
      await splitTx.wait();

      const testTokenId = ethers.toBigInt(newTokens[1].id);
      console.log('Token created for transfer-burn test, ID:', testTokenId.toString());
      await sleep(2000);

      // First transfer the token
      console.log('Attempting transfer...');
      const transferTx = await nativeContract.transfer(testTokenId, 'transfer-before-burn', { gasLimit: 100000 });
      const transferReceipt = await transferTx.wait();
      expect(transferReceipt.status).to.equal(1);
      console.log('✅ Transfer successful, tx:', transferTx.hash);
      await sleep(2000);

      // Then try to burn the same tokenId - should fail
      console.log('Attempting burn after transfer with same tokenId...');
      try {
        const burnTx = await nativeContract.burn(testTokenId, { gasLimit: 100000 });
        await burnTx.wait();
        console.log('❌ Burn after transfer unexpectedly succeeded');
        expect.fail('Burn after transfer should have failed but succeeded');
      } catch (error) {
        console.log('✅ Burn after transfer failed as expected');
        console.log('   Error:', error.message);
        expect(error.message).to.exist;
      }
    });
  });
  describe.skip('Query Functions Tests (getToken and checkTokenIds)', function () {
    let testTokenIds = [];

    before(async function () {
      // Create 128 tokens via split for testing query functions (64 recipients = 128 tokens)
      console.log('Setting up 128 test tokens for query function tests...');
      const to_accounts = [];
      // Create 64 recipients, which will produce 128 tokens (64 change + 64 recipient)
      for (let i = 0; i < 64; i++) {
        to_accounts.push({ address: accounts.To1, amount: 10, comment: `query-test-${i}` }, { address: accounts.To2, amount: 20, comment: `query-test-${i}` });
      }

      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minter1Wallet.address,
        to_accounts: to_accounts,
      };

      console.log('Generating split proof for 128 tokens...');
      const splitProofResponse = await client.generateBatchSplitToken(splitRequests, minter1Metadata);
      await sleep(2000);

      console.log('Getting split detail...');
      const detailResponse = await client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, minter1Metadata);
      const recipients = detailResponse.to_addresses;
      const consumedIds = detailResponse.consumedIds.map((ids) => ids.token_id);
      const newTokens = detailResponse.newTokens.map((account, idx) => ({
        id: account.token_id,
        owner: minter1Wallet.address,
        status: 2,
        amount: {
          cl_x: ethers.toBigInt(account.cl_x),
          cl_y: ethers.toBigInt(account.cl_y),
          cr_x: ethers.toBigInt(account.cr_x),
          cr_y: ethers.toBigInt(account.cr_y),
        },
        to: idx % 2 === 0 ? minter1Wallet.address : recipients[Math.floor(idx / 2)],
        rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1].token_id,
      }));

      const proof = detailResponse.proof.map((p) => ethers.toBigInt(p));
      const publicInputs = detailResponse.public_input.map((i) => ethers.toBigInt(i));
      const paddingNum = detailResponse.batched_size - recipients.length;

      console.log('Executing split transaction...');
      const splitTx = await nativeContract.split(minter1Wallet.address, recipients, consumedIds, newTokens, proof, publicInputs, paddingNum, {
        gasLimit: 100000,
      });
      await splitTx.wait();

      // Collect all token IDs (both change tokens and recipient tokens)
      testTokenIds = newTokens.map((token) => ethers.toBigInt(token.id));
      console.log(`✅ Created ${testTokenIds.length} test tokens`);
      console.log(
        `First 5 token IDs: ${testTokenIds
          .slice(0, 5)
          .map((id) => id.toString())
          .join(', ')}...`
      );
      await sleep(2000);
    });

    it('should query single token using getToken', async function () {
      console.log('\n=== Test: Query single token with getToken ===');

      const tokenId = testTokenIds[0];
      console.log(`Querying token with ID: ${tokenId.toString()}`);

      const tokenInfo = await nativeContract.getToken(minter1Wallet.address, tokenId);

      console.log('Token information retrieved:');
      console.log('  - Token ID:', tokenInfo.id.toString());
      console.log('  - Owner:', tokenInfo.owner);
      console.log('  - Status:', tokenInfo.status);
      console.log('  - To:', tokenInfo.to);
      console.log('  - Rollback Token ID:', tokenInfo.rollbackTokenId.toString());
      console.log('  - Amount (cl_x):', tokenInfo.amount.cl_x.toString());
      console.log('  - Amount (cl_y):', tokenInfo.amount.cl_y.toString());
      console.log('  - Amount (cr_x):', tokenInfo.amount.cr_x.toString());
      console.log('  - Amount (cr_y):', tokenInfo.amount.cr_y.toString());

      // Verify token information
      expect(tokenInfo.id).to.equal(tokenId);
      expect(tokenInfo.owner).to.equal(minter1Wallet.address);
      expect(tokenInfo.status).to.equal(2); // Status 2 = Active/Valid

      console.log('✅ getToken query successful');
    });

    it('should return empty array for all valid tokens using checkTokenIds (happy case)', async function () {
      console.log('\n=== Test: Query 128 valid tokens with checkTokenIds (happy case) ===');

      console.log(`Querying ${testTokenIds.length} valid token IDs...`);
      console.log(
        `First 5 token IDs: ${testTokenIds
          .slice(0, 5)
          .map((id) => id.toString())
          .join(', ')}...`
      );

      const invalidTokenIds = await nativeContract.checkTokenIds(minter1Wallet.address, testTokenIds);

      console.log(`\ncheckTokenIds returned ${invalidTokenIds.length} invalid token IDs`);
      if (invalidTokenIds.length > 0) {
        console.log('Invalid token IDs:', invalidTokenIds.map((id) => id.toString()).join(', '));
      }

      // Verify all tokens are valid (checkTokenIds should return empty array)
      expect(invalidTokenIds.length).to.equal(0);

      console.log('✅ checkTokenIds returned empty array - all 128 tokens are valid');
    });

    it('should return all non-existent tokenIds using checkTokenIds', async function () {
      console.log('\n=== Test: Query non-existent tokens with checkTokenIds ===');

      // Create fake token IDs that don't exist
      const fakeTokenIds = [
        ethers.toBigInt('999999999999999999999999999999'),
        ethers.toBigInt('888888888888888888888888888888'),
        ethers.toBigInt('777777777777777777777777777777'),
      ];

      console.log('Querying non-existent token IDs:', fakeTokenIds.map((id) => id.toString()).join(', '));

      const invalidTokenIds = await nativeContract.checkTokenIds(minter1Wallet.address, fakeTokenIds);

      console.log(`\ncheckTokenIds returned ${invalidTokenIds.length} invalid token IDs:`);
      invalidTokenIds.forEach((id, index) => {
        console.log(`  [${index}] ${id.toString()}`);
      });

      // Verify all fake tokens are returned as invalid
      expect(invalidTokenIds.length).to.equal(fakeTokenIds.length);

      // Verify each returned ID matches the input fake IDs
      for (let i = 0; i < fakeTokenIds.length; i++) {
        expect(invalidTokenIds[i]).to.equal(fakeTokenIds[i]);
      }

      console.log('✅ checkTokenIds correctly returned all non-existent tokens');
    });

    it('should return only invalid tokenIds from mixed input using checkTokenIds', async function () {
      console.log('\n=== Test: Query mix of valid and invalid tokens with checkTokenIds ===');

      // Mix real tokens with fake ones
      const mixedTokenIds = [
        testTokenIds[0], // valid
        ethers.toBigInt('999999999999999999999999999999'), // invalid
        testTokenIds[1], // valid
        ethers.toBigInt('888888888888888888888888888888'), // invalid
        testTokenIds[2], // valid
        ethers.toBigInt('777777777777777777777777777777'), // invalid
      ];

      const expectedInvalidIds = [
        ethers.toBigInt('999999999999999999999999999999'),
        ethers.toBigInt('888888888888888888888888888888'),
        ethers.toBigInt('777777777777777777777777777777'),
      ];

      console.log(`Querying ${mixedTokenIds.length} mixed token IDs...`);
      mixedTokenIds.forEach((id, index) => {
        const isValid = testTokenIds.some((validId) => validId.toString() === id.toString());
        console.log(`  [${index}] ${id.toString()} - ${isValid ? 'VALID' : 'INVALID'}`);
      });

      const invalidTokenIds = await nativeContract.checkTokenIds(minter1Wallet.address, mixedTokenIds);

      console.log(`\ncheckTokenIds returned ${invalidTokenIds.length} invalid token IDs:`);
      invalidTokenIds.forEach((id, index) => {
        console.log(`  [${index}] ${id.toString()}`);
      });

      // Verify only invalid tokens are returned
      expect(invalidTokenIds.length).to.equal(expectedInvalidIds.length);

      // Verify all returned IDs are the fake/invalid ones
      for (let i = 0; i < expectedInvalidIds.length; i++) {
        expect(invalidTokenIds[i]).to.equal(expectedInvalidIds[i]);
      }

      console.log('✅ checkTokenIds correctly returned only invalid tokens from mixed input');
    });

    it('should query token after transfer using getToken', async function () {
      console.log('\n=== Test: Query token after transfer with getToken ===');

      // Use a recipient token (odd index) for transfer, not a change token
      // In split operation: even indices are change tokens, odd indices are recipient tokens
      const tokenId = testTokenIds[1]; // Use second token (index 1, which is a recipient token)
      console.log(`Token ID before transfer: ${tokenId.toString()}`);

      // Query token before transfer
      const tokenBeforeTransfer = await nativeContract.getToken(minter1Wallet.address, tokenId);
      console.log('Token status before transfer:', tokenBeforeTransfer.status);
      console.log("Token 'to' field:", tokenBeforeTransfer.to);
      expect(tokenBeforeTransfer.status).to.equal(2);

      // Transfer the token
      console.log('Transferring token...');
      const transferTx = await nativeContract.transfer(tokenId, 'query-after-transfer-test', { gasLimit: 100000 });
      await transferTx.wait();
      console.log('✅ Transfer successful, tx:', transferTx.hash);
      await sleep(2000);

      // Query token after transfer - should now belong to receiver
      console.log(`Querying token after transfer with receiver address: ${receiver1}`);
      const tokenAfterTransfer = await nativeContract.getToken(receiver1, tokenId);

      console.log('Token information after transfer:');
      console.log('  - Token ID:', tokenAfterTransfer.id.toString());
      console.log('  - Owner:', tokenAfterTransfer.owner);
      console.log('  - Status:', tokenAfterTransfer.status);

      // Verify token now belongs to receiver
      expect(tokenAfterTransfer.id).to.equal(tokenId);
      expect(tokenAfterTransfer.owner).to.equal(receiver1);
      expect(tokenAfterTransfer.status).to.equal(2);

      console.log('✅ getToken successfully queried token after transfer');
    });
  });
});
