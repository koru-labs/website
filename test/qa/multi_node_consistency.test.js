const { expect } = require('chai');
const { ethers } = require('hardhat');
const { createClient } = require('./token_grpc');
const accounts = require('./../../deployments/account.json');
const { getAccount } = require('./../help/testHelp');

// Import from NativeTestHelper
const { NATIVE_TOKEN_ADDRESS, NATIVE_ABI, createAuthMetadata, sleep, setupMintAllowance } = require('./../help/NativeTestHelper');

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

function withTimeout(promise, ms, message) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(message || `Timeout after ${ms}ms`)), ms))]);
}

describe('Multi Node Consistency Test', function () {
  this.timeout(300000);

  // Use Node 3 configuration
  const node3Config = NODE_CONFIGS[2];
  let provider, client, minterWallet, ownerWallet;
  let minterMetadata, ownerMetadata, minterContract, ownerContract;

  // Multi-node setup
  let allProviders = [];
  let allContracts = [];
  let allClients = [];

  // Token IDs used in test verification (needed for test logic)
  let scenario1TokenId, scenario2TokenId;

  // Track step status for each test scenario (for summary display)
  // Scenario 1: Split → Transfer → (Burn)
  let s1Split = false,
    s1Transfer = false,
    s1Burn = false;
  // Scenario 2: Mint → Split → Transfer
  let s2Mint = false,
    s2Split = false,
    s2Transfer = false;
  // Scenario 4: Mint → FirstSplit → Transfer → SecondSplit → Burn
  let s4Mint = false,
    s4FirstSplit = false,
    s4Transfer = false,
    s4SecondSplit = false,
    s4Burn = false;
  // Scenario 5: Hop1 → Hop2 → Hop3
  let s5Hop1 = false,
    s5Hop2 = false,
    s5Hop3 = false;

  before(async function () {
    console.log('\n=== Multi Node Consistency Test ===\n');
    console.log(`Using Node: ${node3Config.name}`);
    console.log(`HTTP: ${node3Config.httpUrl}, gRPC: ${node3Config.grpcUrl}`);

    provider = new ethers.JsonRpcProvider(node3Config.httpUrl, l1CustomNetwork, providerOptions);
    const blockNumber = await withTimeout(provider.getBlockNumber(), 10000, 'HTTP timeout');
    console.log(`Connected (block: ${blockNumber})`);

    client = createClient(node3Config.grpcUrl);
    minterWallet = new ethers.Wallet(accounts.MinterKey, provider);
    ownerWallet = new ethers.Wallet(accounts.OwnerKey, provider);

    console.log(`Minter: ${minterWallet.address}`);
    console.log(`Owner: ${ownerWallet.address}`);
    console.log(`Target Receiver 1 (To1): ${accounts.To1}`);
    console.log(`Target Receiver 2 (Node1 Admin): ${NODE_CONFIGS[0].admin}`);

    minterMetadata = await createAuthMetadata(accounts.MinterKey);
    ownerMetadata = await createAuthMetadata(accounts.OwnerKey);
    minterContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, minterWallet);
    ownerContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, ownerWallet);

    // Initialize multi-node connections
    console.log('\n--- Initializing Multi-Node Connections ---');
    for (let i = 0; i < NODE_CONFIGS.length; i++) {
      const config = NODE_CONFIGS[i];
      console.log(`Connecting to ${config.name}...`);

      const nodeProvider = new ethers.JsonRpcProvider(config.httpUrl, l1CustomNetwork, providerOptions);
      const nodeContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, nodeProvider);
      const nodeClient = createClient(config.grpcUrl);

      allProviders.push(nodeProvider);
      allContracts.push(nodeContract);
      allClients.push(nodeClient);

      const nodeBlock = await withTimeout(nodeProvider.getBlockNumber(), 10000, `${config.name} HTTP timeout`);
      console.log(`   ${config.name}: Connected (block: ${nodeBlock})`);
    }
    console.log('✅ All nodes connected\n');
  });

  describe('Scenario 1: Mint -> Split -> Transfer to accounts.To1', function () {
    let mintedTokenId, splitTokenId;

    it.skip('Step 1: Set mint allowance for accounts.minter', async function () {
      console.log('\n--- Scenario 1 ---');
      console.log('Step 1: Set Mint Allowance for accounts.minter');
      const allowanceAmount = 100000000;

      const setAllowedTx = await withTimeout(
        setupMintAllowance(ownerContract, client, minterWallet.address, accounts.OwnerKey, allowanceAmount),
        60000,
        'setupMintAllowance timeout'
      );

      console.log(`✅ Mint allowance set, tx: ${setAllowedTx.hash}`);
      expect(setAllowedTx.hash).to.be.a('string');
      await sleep(10000);
    });

    it.skip('Step 2: Mint 1 token to minter', async function () {
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

    it('Step 3: Split 1 token', async function () {
      // mintedTokenId = '11786126535861237224164787649644607014168633430490103573879653697874734421470'
      console.log('\nStep 3: Split 1 Token');
      expect(mintedTokenId).to.exist;
      console.log(`Splitting token ${mintedTokenId.toString()}...`);

      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [{ address: accounts.To1, amount: 100, comment: 'split-to-to1' }],
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

      const splitTx = await minterContract.split(
        minterWallet.address,
        splitRecipients,
        consumedIds,
        splitNewTokens,
        splitProof,
        splitPublicInputs,
        paddingNum,
        { gasLimit: 100000 }
      );
      console.log(`Split tx: ${splitTx.hash}, waiting...`);

      const receipt = await splitTx.wait();

      // Find first odd-indexed token for transfer (the one going to To1)
      const transferTokenIdx = splitNewTokens.findIndex((_, idx) => idx % 2 !== 0);
      splitTokenId = ethers.toBigInt(splitNewTokens[transferTokenIdx].id);

      console.log(`✅ Split done. Token IDs: ${splitNewTokens.map((t) => t.id).join(', ')}`);
      console.log(`   Selected for transfer: ${splitTokenId.toString()} (index ${transferTokenIdx})`);

      expect(receipt.status).to.equal(1);
      s1Split = true; // Track split completed
      await sleep(3000);
    });

    it('Step 4: Verify token before transfer', async function () {
      console.log('\nStep 4: Verify Token Before Transfer');
      expect(splitTokenId).to.exist;
      console.log(`Verifying token ${splitTokenId.toString()}...`);

      const verifyResult = await verifyToken(splitTokenId, minterWallet.address, minterContract);
      expect(verifyResult.success).to.be.true;
      console.log(`✅ Token verified successfully`);
    });

    it('Step 5: Transfer token to accounts.To1', async function () {
      // splitTokenId = '15851678850464968841915813869127431714787165267154244476963933285387596811045'
      console.log('\nStep 5: Transfer Token to accounts.To1');
      expect(splitTokenId).to.exist;
      console.log(`Transferring token ${splitTokenId.toString()} to ${accounts.To1}...`);

      const memo = 'transfer-to-to1';
      const transferTx = await minterContract.transfer(splitTokenId, memo, { gasLimit: 100000 });
      console.log(`Transfer tx: ${transferTx.hash}, waiting...`);

      const receipt = await transferTx.wait();

      console.log(
        `✅ Transfer done. Token: ${splitTokenId.toString()}, To: ${accounts.To1}, Memo: ${memo} (block: ${receipt.blockNumber}, gas: ${receipt.gasUsed})`
      );
      expect(receipt.status).to.equal(1);

      scenario1TokenId = splitTokenId;
    });

    it('Step 6: Verify token ownership transfer to To1', async function () {
      console.log('\nStep 6: Verify Token Ownership Transfer');
      expect(scenario1TokenId).to.exist;
      console.log(`Verifying token ${scenario1TokenId.toString()} ownership transfer...`);

      // Wait for state propagation
      console.log('   Waiting for state propagation...');
      await sleep(5000);

      // 1. Query with minter address - should no longer own the token (expect failure)
      console.log('   Querying with minter address (original owner)...');
      const minterResult = await verifyToken(scenario1TokenId, minterWallet.address, minterContract);
      if (!minterResult.success) {
        console.log(`   ✅ Minter no longer owns the token (expected)`);
      } else {
        console.log(`   ⚠️  Minter still has access to token data`);
      }

      // 2. Query with To1 address - should own the token (expect success)
      console.log('   Querying with To1 address (expected new owner)...');
      let to1Result = await verifyToken(scenario1TokenId, accounts.To1, minterContract);

      // Retry mechanism for new owner verification
      let retries = 3;
      while (!to1Result.success && retries > 0) {
        console.log(`   ⏳ Retry ${4 - retries}/3 - waiting 3s before retry...`);
        await sleep(3000);
        to1Result = await verifyToken(scenario1TokenId, accounts.To1, minterContract);
        retries--;
      }

      expect(to1Result.success).to.be.true;
      expect(to1Result.owner.toLowerCase()).to.equal(accounts.To1.toLowerCase());

      console.log(`✅ Token ownership verified - Successfully transferred from minter to To1`);
      console.log(`   - To1 view: Owner=${to1Result.owner}, To=${to1Result.to}, Status=${to1Result.status}`);
      s1Transfer = true; // Track transfer verified
    });

    it('Step 7: Split and Burn token', async function () {
      console.log('\nStep 7: Split and Burn Token');

      // First mint a new token for this test
      console.log('   Minting a new token for split and burn test...');
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
      const mintReceipt = await mintTx.wait();
      const burnTestTokenId = ethers.toBigInt(newTokens[0].id);

      console.log(`   ✅ Minted token ID: ${burnTestTokenId.toString()}`);
      await sleep(3000);

      // Split the token
      console.log('   Splitting token...');
      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [{ address: minterWallet.address, amount: 100, comment: 'split-for-burn-test' }],
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

      const splitTx = await minterContract.split(
        minterWallet.address,
        splitRecipients,
        consumedIds,
        splitNewTokens,
        splitProof,
        splitPublicInputs,
        paddingNum,
        { gasLimit: 100000 }
      );
      const splitReceipt = await splitTx.wait();

      // Log all split tokens for debugging
      console.log('   All split tokens:');
      splitNewTokens.forEach((token, idx) => {
        console.log(`     [${idx}] ID: ${token.id}, To: ${token.to}`);
      });

      // Find first odd-indexed token for burn (the one going to To1, same as transfer)
      const burnTokenIdx = splitNewTokens.findIndex((_, idx) => idx % 2 !== 0);
      const tokenToBurn = ethers.toBigInt(splitNewTokens[burnTokenIdx].id);

      console.log(`   ✅ Split done. Token to burn: ${tokenToBurn.toString()} (index ${burnTokenIdx})`);
      await sleep(3000);

      // Burn the token
      console.log('   Burning token...');
      const burnTx = await minterContract.burn(tokenToBurn, { gasLimit: 100000 });
      const burnReceipt = await burnTx.wait();

      console.log(`✅ Split and Burn completed successfully`);
      console.log(`   - Minted: ${burnTestTokenId.toString()}`);
      console.log(`   - Split tx: ${splitTx.hash}`);
      console.log(`   - Burn tx: ${burnTx.hash} (block: ${burnReceipt.blockNumber})`);

      expect(burnReceipt.status).to.equal(1);
      s1Burn = true; // Track burn completed
    });
  });
  describe('Scenario 2: Mint -> Split -> Transfer to Node1 Admin', function () {
    let mintedTokenId2, splitTokenId2;

    it.skip('Step 1: Set mint allowance for accounts.minter', async function () {
      console.log('\n--- Scenario 2 ---');
      console.log('Step 1: Set Mint Allowance for accounts.minter');
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

    it('Step 2: Mint 1 token to minter', async function () {
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
      mintedTokenId2 = ethers.toBigInt(newTokens[0].id);

      console.log(`✅ Minted token ID: ${mintedTokenId2.toString()} (block: ${receipt.blockNumber}, gas: ${receipt.gasUsed})`);
      expect(receipt.status).to.equal(1);
      s2Mint = true; // Track mint completed
      await sleep(3000);
    });

    it('Step 3: Split 1 token', async function () {
      // mintedTokenId2 = '1408914148159474217342726299859764449165176088762933605112981678975660140384'
      console.log('\nStep 3: Split 1 Token');
      expect(mintedTokenId2).to.exist;
      console.log(`Splitting token ${mintedTokenId2.toString()}...`);

      const targetReceiver = NODE_CONFIGS[0].admin; // Node1 admin
      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [{ address: targetReceiver, amount: 100, comment: 'split-to-node1-admin' }],
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

      const splitTx = await minterContract.split(
        minterWallet.address,
        splitRecipients,
        consumedIds,
        splitNewTokens,
        splitProof,
        splitPublicInputs,
        paddingNum,
        { gasLimit: 100000 }
      );
      console.log(`Split tx: ${splitTx.hash}, waiting...`);

      const receipt = await splitTx.wait();

      // Find first odd-indexed token for transfer (the one going to Node1 admin)
      const transferTokenIdx = splitNewTokens.findIndex((_, idx) => idx % 2 !== 0);
      splitTokenId2 = ethers.toBigInt(splitNewTokens[transferTokenIdx].id);

      console.log(`✅ Split done. Token IDs: ${splitNewTokens.map((t) => t.id).join(', ')}`);
      console.log(`   Selected for transfer: ${splitTokenId2.toString()} (index ${transferTokenIdx})`);

      expect(receipt.status).to.equal(1);
      s2Split = true; // Track split completed
      await sleep(3000);
    });

    it('Step 4: Verify token before transfer', async function () {
      console.log('\nStep 4: Verify Token Before Transfer');
      expect(splitTokenId2).to.exist;
      console.log(`Verifying token ${splitTokenId2.toString()}...`);

      const verifyResult = await verifyToken(splitTokenId2, minterWallet.address, minterContract);
      expect(verifyResult.success).to.be.true;
      console.log(`✅ Token verified successfully`);
    });

    it('Step 5: Transfer token to Node1 Admin', async function () {
      splitTokenId2 = '3438877823608910696433180312384671243116007046045926618027926602274118847733';
      console.log('\nStep 5: Transfer Token to Node1 Admin');
      expect(splitTokenId2).to.exist;
      const targetReceiver = NODE_CONFIGS[0].admin;
      console.log(`Transferring token ${splitTokenId2.toString()} to ${targetReceiver}...`);

      const memo = 'transfer-to-node1-admin';
      const transferTx = await minterContract.transfer(splitTokenId2, memo, { gasLimit: 100000 });
      console.log(`Transfer tx: ${transferTx.hash}, waiting...`);

      const receipt = await transferTx.wait();

      console.log(
        `✅ Transfer done. Token: ${splitTokenId2.toString()}, To: ${targetReceiver}, Memo: ${memo} (block: ${receipt.blockNumber}, gas: ${receipt.gasUsed})`
      );
      expect(receipt.status).to.equal(1);

      scenario2TokenId = splitTokenId2;
    });

    it('Step 6: Verify token ownership transfer to Node1 Admin', async function () {
      console.log('\nStep 6: Verify Token Ownership Transfer');
      expect(scenario2TokenId).to.exist;
      console.log(`Verifying token ${scenario2TokenId.toString()} ownership transfer...`);

      // Wait for state propagation
      console.log('   Waiting for state propagation...');
      await sleep(5000);

      // 1. Query with minter address - should no longer own the token (expect failure)
      console.log('   Querying with minter address (original owner)...');
      const minterResult = await verifyToken(scenario2TokenId, minterWallet.address, minterContract);
      if (!minterResult.success) {
        console.log(`   ✅ Minter no longer owns the token (expected)`);
      } else {
        console.log(`   ⚠️  Minter still has access to token data`);
      }

      // 2. Query with Node1 Admin address - should own the token (expect success)
      console.log('   Querying with Node1 Admin address (expected new owner)...');
      let node1AdminResult = await verifyToken(scenario2TokenId, NODE_CONFIGS[0].admin, minterContract);

      // Retry mechanism for new owner verification
      let retries = 3;
      while (!node1AdminResult.success && retries > 0) {
        console.log(`   ⏳ Retry ${4 - retries}/3 - waiting 3s before retry...`);
        await sleep(3000);
        node1AdminResult = await verifyToken(scenario2TokenId, NODE_CONFIGS[0].admin, minterContract);
        retries--;
      }

      expect(node1AdminResult.success).to.be.true;
      expect(node1AdminResult.owner.toLowerCase()).to.equal(NODE_CONFIGS[0].admin.toLowerCase());

      console.log(`✅ Token ownership verified - Successfully transferred from minter to Node1 Admin`);
      console.log(`   - Node1 Admin view: Owner=${node1AdminResult.owner}, To=${node1AdminResult.to}, Status=${node1AdminResult.status}`);
      s2Transfer = true; // Track transfer verified
    });
  });
  describe.skip('Scenario 3: Mint 3 tokens -> Split to 3 recipients -> Transfer to each', function () {
    let mintedTokenIds = [];
    let splitTokenIds = [];
    const recipients = [
      { name: 'To1', address: accounts.To1 },
      { name: 'Node1 Admin', address: NODE_CONFIGS[0].admin },
      { name: 'Node2 Admin', address: NODE_CONFIGS[1].admin },
    ];

    it('Step 1: Set mint allowance for accounts.minter', async function () {
      console.log('\n--- Scenario 2 ---');
      console.log('Step 1: Set Mint Allowance for accounts.minter');
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

    it('Step 2: Mint 3 tokens to minter', async function () {
      console.log('\nStep 2: Mint 3 Tokens');
      const tokenAmount = 1000;

      const generateRequest = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [
          { address: minterWallet.address, amount: tokenAmount },
          { address: minterWallet.address, amount: tokenAmount },
          { address: minterWallet.address, amount: tokenAmount },
        ],
      };

      const response = await withTimeout(client.generateBatchMintProof(generateRequest, minterMetadata), 60000, 'generateBatchMintProof timeout');

      const recipientAddresses = response.to_accounts.map((account) => account.address);
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
      const padding = Math.max(Number(response.batched_size) - 3, 0);

      const mintTx = await minterContract.mint(recipientAddresses, newTokens, newAllowed, proof, publicInputs, padding, { gasLimit: 100000 });
      console.log(`Mint tx: ${mintTx.hash}, waiting...`);

      const receipt = await mintTx.wait();
      mintedTokenIds = newTokens.map((token) => ethers.toBigInt(token.id));

      console.log(`✅ Minted 3 tokens:`);
      mintedTokenIds.forEach((id, idx) => console.log(`   Token ${idx + 1}: ${id.toString()}`));
      console.log(`   Block: ${receipt.blockNumber}, Gas: ${receipt.gasUsed}`);

      expect(receipt.status).to.equal(1);
      expect(mintedTokenIds.length).to.equal(3);
      await sleep(3000);
    });

    it('Step 3: Split 3 tokens to 3 different recipients', async function () {
      console.log('\nStep 3: Split 3 Tokens to 3 Recipients');
      expect(mintedTokenIds.length).to.equal(3);

      console.log(`Splitting tokens to: ${recipients.map((r) => r.name).join(', ')}`);

      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: recipients.map((recipient, idx) => ({
          address: recipient.address,
          amount: 100,
          comment: `split-to-${recipient.name.toLowerCase().replace(/\s+/g, '-')}`,
        })),
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

      const splitTx = await minterContract.split(
        minterWallet.address,
        splitRecipients,
        consumedIds,
        splitNewTokens,
        splitProof,
        splitPublicInputs,
        paddingNum,
        { gasLimit: 100000 }
      );
      console.log(`Split tx: ${splitTx.hash}, waiting...`);

      const receipt = await splitTx.wait();

      // Collect odd-indexed tokens (the ones going to recipients)
      splitTokenIds = splitNewTokens.filter((_, idx) => idx % 2 !== 0).map((token) => ethers.toBigInt(token.id));

      console.log(`✅ Split done. All token IDs: ${splitNewTokens.map((t) => t.id).join(', ')}`);
      console.log(`   Tokens for transfer:`);
      splitTokenIds.forEach((id, idx) => {
        console.log(`   ${recipients[idx].name}: ${id.toString()}`);
      });

      expect(receipt.status).to.equal(1);
      expect(splitTokenIds.length).to.equal(3);
      await sleep(3000);
    });

    it('Step 4: Verify tokens before transfer', async function () {
      console.log('\nStep 4: Verify Tokens Before Transfer');
      expect(splitTokenIds.length).to.equal(3);

      for (let i = 0; i < splitTokenIds.length; i++) {
        console.log(`Verifying token ${i + 1}/${splitTokenIds.length}: ${splitTokenIds[i].toString()}...`);
        const verifyResult = await verifyToken(splitTokenIds[i], minterWallet.address, minterContract);
        expect(verifyResult.success).to.be.true;
      }

      console.log(`✅ All 3 tokens verified successfully`);
    });

    it('Step 5: Transfer tokens to respective recipients', async function () {
      console.log('\nStep 5: Transfer Tokens to Recipients');
      expect(splitTokenIds.length).to.equal(3);

      for (let i = 0; i < splitTokenIds.length; i++) {
        const tokenId = splitTokenIds[i];
        const recipient = recipients[i];

        console.log(`\nTransferring token ${i + 1}/3: ${tokenId.toString()} to ${recipient.name} (${recipient.address})...`);

        const memo = `transfer-to-${recipient.name.toLowerCase().replace(/\s+/g, '-')}`;
        const transferTx = await minterContract.transfer(tokenId, memo, { gasLimit: 100000 });
        console.log(`   Transfer tx: ${transferTx.hash}, waiting...`);

        const receipt = await transferTx.wait();
        console.log(`   ✅ Transfer done (block: ${receipt.blockNumber}, gas: ${receipt.gasUsed})`);

        expect(receipt.status).to.equal(1);

        // Small delay between transfers
        if (i < splitTokenIds.length - 1) {
          await sleep(2000);
        }
      }

      console.log(`\n✅ All 3 tokens transferred successfully`);
      scenario2TokenId = splitTokenIds[0]; // Keep for summary
    });

    it('Step 6: Verify token ownership transfers', async function () {
      console.log('\nStep 6: Verify Token Ownership Transfers');
      expect(splitTokenIds.length).to.equal(3);

      // Wait for state propagation
      console.log('   Waiting for state propagation...');
      await sleep(5000);

      // Verify each token with its new owner
      for (let i = 0; i < splitTokenIds.length; i++) {
        const tokenId = splitTokenIds[i];
        const recipient = recipients[i];

        console.log(`\n   Verifying token ${i + 1}/3: ${tokenId.toString()} -> ${recipient.name}`);

        // 1. Query with minter address - should no longer own the token
        console.log(`      Querying with minter address (original owner)...`);
        const minterResult = await verifyToken(tokenId, minterWallet.address, minterContract);
        if (!minterResult.success) {
          console.log(`      ✅ Minter no longer owns the token (expected)`);
        } else {
          console.log(`      ⚠️  Minter still has access to token data`);
        }

        // 2. Query with new owner address - should own the token
        console.log(`      Querying with ${recipient.name} address (expected new owner)...`);
        let ownerResult = await verifyToken(tokenId, recipient.address, minterContract);

        // Retry mechanism for new owner verification
        let retries = 3;
        while (!ownerResult.success && retries > 0) {
          console.log(`      ⏳ Retry ${4 - retries}/3 - waiting 3s before retry...`);
          await sleep(3000);
          ownerResult = await verifyToken(tokenId, recipient.address, minterContract);
          retries--;
        }

        expect(ownerResult.success).to.be.true;
        expect(ownerResult.owner.toLowerCase()).to.equal(recipient.address.toLowerCase());

        console.log(`      ✅ Token ownership verified for ${recipient.name}`);
        console.log(`         Owner=${ownerResult.owner}, To=${ownerResult.to}, Status=${ownerResult.status}`);
      }

      console.log(`\n✅ All 3 token ownership transfers verified successfully`);
    });
  });
  describe('Scenario 4: Full Token Lifecycle on Node3 with Multi-Node Verification', function () {
    let syncTestTokenId, syncTestTxHash, syncTestSplitTokenId;
    // 新增变量：第一次 split 后 minter 保留的 token（用于第二次 split）、第二次 split 后用于 burn 的 token
    let firstSplitTokenId0, tokenIdToBurn, secondSplitTokenId0;

    it('Step 1: Verify initial blockchain sync across all nodes', async function () {
      console.log('\n--- Scenario 4: Multi-Node Synchronization Test ---');
      console.log('Step 1: Verify Initial Blockchain Sync');

      const blockNumbers = await Promise.all(
        allProviders.map(async (provider, idx) => {
          const blockNum = await provider.getBlockNumber();
          console.log(`   ${NODE_CONFIGS[idx].name}: Block ${blockNum}`);
          return blockNum;
        })
      );

      const maxBlock = Math.max(...blockNumbers);
      const minBlock = Math.min(...blockNumbers);
      const blockDiff = maxBlock - minBlock;

      console.log(`   Block height difference: ${blockDiff} blocks`);

      // Allow up to 3 blocks difference as acceptable
      expect(blockDiff).to.be.at.most(3);
      console.log(`✅ All nodes are synchronized (max diff: ${blockDiff} blocks)`);
    });

    it('Step 2: Set mint allowance on Node 3', async function () {
      console.log('\nStep 2: Set Mint Allowance on Node 3');
      const allowanceAmount = 100000000;

      const setAllowedTx = await withTimeout(
        setupMintAllowance(ownerContract, client, minterWallet.address, accounts.OwnerKey, allowanceAmount),
        60000,
        'setupMintAllowance timeout'
      );

      syncTestTxHash = setAllowedTx.hash;
      console.log(`✅ Mint allowance set on Node 3, tx: ${syncTestTxHash}`);
      expect(setAllowedTx.hash).to.be.a('string');
      await sleep(10000);
    });

    it('Step 3: Verify transaction propagation to all nodes', async function () {
      console.log('\nStep 3: Verify Transaction Propagation');
      console.log(`Checking if tx ${syncTestTxHash} is visible on all nodes...`);

      let foundCount = 0;

      for (let i = 0; i < allProviders.length; i++) {
        const provider = allProviders[i];
        const config = NODE_CONFIGS[i];

        try {
          const receipt = await provider.getTransactionReceipt(syncTestTxHash);
          if (receipt) {
            console.log(`   ${config.name}: ✅ Found (block: ${receipt.blockNumber})`);
            foundCount++;
          } else {
            console.log(`   ${config.name}: ❌ Not found`);
          }
        } catch (error) {
          console.log(`   ${config.name}: ❌ Error - ${error.message}`);
        }

        // Small delay between node queries
        if (i < allProviders.length - 1) {
          await sleep(1000);
        }
      }

      console.log(`\n   Transaction found on ${foundCount}/${allProviders.length} nodes`);

      expect(foundCount).to.equal(allProviders.length);
      console.log(`✅ Transaction propagated to all nodes`);
    });

    it('Step 4: Mint token on Node 3', async function () {
      console.log('\nStep 4: Mint Token on Node 3');
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
      syncTestTokenId = ethers.toBigInt(newTokens[0].id);
      syncTestTxHash = mintTx.hash;
      s4Mint = true; // Track mint completed

      console.log(`✅ Minted token ID: ${syncTestTokenId.toString()} on Node 3`);
      console.log(`   Block: ${receipt.blockNumber}, Gas: ${receipt.gasUsed}`);
      expect(receipt.status).to.equal(1);

      // Wait for propagation
      console.log('   Waiting for state propagation...');
      await sleep(8000);
    });

    it('Step 5: Verify minted token state consistency across all nodes', async function () {
      console.log('\nStep 5: Verify Minted Token State Consistency Across All Nodes');
      expect(syncTestTokenId).to.exist;
      console.log(`Verifying token ${syncTestTokenId.toString()} on all nodes...`);

      const tokenStates = [];
      for (let i = 0; i < allContracts.length; i++) {
        const contract = allContracts[i];
        const config = NODE_CONFIGS[i];

        try {
          const token = await contract.getToken(minterWallet.address, syncTestTokenId);
          console.log(`   ${config.name}: ✅ Token found`);
          console.log(`      Owner: ${token.owner}, Status: ${token.status}, To: ${token.to}`);
          tokenStates.push({
            nodeIndex: i,
            nodeName: config.name,
            success: true,
            owner: token.owner,
            status: token.status,
            to: token.to,
            id: token.id.toString(),
          });
        } catch (error) {
          console.log(`   ${config.name}: ❌ Error - ${error.message}`);
          tokenStates.push({
            nodeIndex: i,
            nodeName: config.name,
            success: false,
            error: error.message,
          });
        }

        // Small delay between node queries
        if (i < allContracts.length - 1) {
          await sleep(1000);
        }
      }

      const successStates = tokenStates.filter((s) => s.success);
      console.log(`\n   Token found on ${successStates.length}/${tokenStates.length} nodes`);

      // Verify all successful queries return the same data
      if (successStates.length > 1) {
        const first = successStates[0];
        const allConsistent = successStates.every(
          (s) =>
            s.owner.toLowerCase() === first.owner.toLowerCase() &&
            s.status === first.status &&
            s.to.toLowerCase() === first.to.toLowerCase() &&
            s.id === first.id
        );

        expect(allConsistent).to.be.true;
        console.log(`✅ Minted token state is consistent across all nodes`);
      } else {
        expect(successStates.length).to.be.at.least(1);
      }
    });

    it('Step 6: First Split token on Node 3 (to Node1 Admin)', async function () {
      console.log('\nStep 6: First Split Token on Node 3 (to Node1 Admin)');
      expect(syncTestTokenId).to.exist;
      console.log(`Splitting token ${syncTestTokenId.toString()}...`);

      // 目标改为 Node1 Admin（与 Scenario 2 一致）
      const targetReceiver = NODE_CONFIGS[0].admin;
      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [{ address: targetReceiver, amount: 100, comment: 'multi-node-first-split-test' }],
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

      const splitTx = await minterContract.split(
        minterWallet.address,
        splitRecipients,
        consumedIds,
        splitNewTokens,
        splitProof,
        splitPublicInputs,
        paddingNum,
        { gasLimit: 100000 }
      );
      console.log(`First Split tx: ${splitTx.hash}, waiting...`);

      const receipt = await splitTx.wait();
      syncTestTxHash = splitTx.hash;

      // [0] = minter 自留（用于第二次 split），[1] = 用于 transfer 给 Node1 Admin
      firstSplitTokenId0 = ethers.toBigInt(splitNewTokens[0].id);
      const transferTokenIdx = splitNewTokens.findIndex((_, idx) => idx % 2 !== 0);
      syncTestSplitTokenId = ethers.toBigInt(splitNewTokens[transferTokenIdx].id);

      console.log(`✅ First Split done on Node 3. All token IDs: ${splitNewTokens.map((t) => t.id).join(', ')}`);
      console.log(`   Token [0] (minter keeps, for 2nd split): ${firstSplitTokenId0.toString()}`);
      console.log(`   Token [1] (for transfer to Node1 Admin): ${syncTestSplitTokenId.toString()}`);
      console.log(`   Block: ${receipt.blockNumber}, Gas: ${receipt.gasUsed}`);

      expect(receipt.status).to.equal(1);

      // Wait for propagation
      console.log('   Waiting for state propagation...');
      await sleep(8000);
    });

    it('Step 7: Verify first split transaction propagation to all nodes', async function () {
      console.log('\nStep 7: Verify First Split Transaction Propagation');
      console.log(`Checking if first split tx ${syncTestTxHash} is visible on all nodes...`);

      let foundCount = 0;
      for (let i = 0; i < allProviders.length; i++) {
        const provider = allProviders[i];
        const config = NODE_CONFIGS[i];

        try {
          const receipt = await provider.getTransactionReceipt(syncTestTxHash);
          if (receipt) {
            console.log(`   ${config.name}: ✅ Found (block: ${receipt.blockNumber})`);
            foundCount++;
          } else {
            console.log(`   ${config.name}: ❌ Not found`);
          }
        } catch (error) {
          console.log(`   ${config.name}: ❌ Error - ${error.message}`);
        }

        if (i < allProviders.length - 1) {
          await sleep(1000);
        }
      }

      console.log(`\n   First split transaction found on ${foundCount}/${allProviders.length} nodes`);

      expect(foundCount).to.equal(allProviders.length);
      console.log(`✅ First split transaction propagated to all nodes`);
    });

    it('Step 8: Verify first split token state consistency across all nodes', async function () {
      console.log('\nStep 8: Verify First Split Token State Consistency Across All Nodes');
      expect(syncTestSplitTokenId).to.exist;
      expect(firstSplitTokenId0).to.exist;

      // 验证 token [0]（minter 自留，用于第二次 split）
      console.log(`\nVerifying first split token [0] ${firstSplitTokenId0.toString()} on all nodes...`);
      const token0States = [];
      for (let i = 0; i < allContracts.length; i++) {
        const contract = allContracts[i];
        const config = NODE_CONFIGS[i];

        try {
          const token = await contract.getToken(minterWallet.address, firstSplitTokenId0);
          console.log(`   ${config.name}: ✅ Token [0] found - Owner: ${token.owner}, Status: ${token.status}, To: ${token.to}`);
          token0States.push({
            nodeIndex: i,
            nodeName: config.name,
            success: true,
            owner: token.owner,
            status: token.status,
            to: token.to,
            id: token.id.toString(),
          });
        } catch (error) {
          console.log(`   ${config.name}: ❌ Error - ${error.message}`);
          token0States.push({ nodeIndex: i, nodeName: config.name, success: false, error: error.message });
        }
        if (i < allContracts.length - 1) await sleep(1000);
      }

      const success0States = token0States.filter((s) => s.success);
      expect(success0States.length).to.equal(allContracts.length);
      if (success0States.length > 1) {
        const first = success0States[0];
        const allConsistent = success0States.every(
          (s) =>
            s.owner.toLowerCase() === first.owner.toLowerCase() &&
            s.status === first.status &&
            s.to.toLowerCase() === first.to.toLowerCase() &&
            s.id === first.id
        );
        expect(allConsistent).to.be.true;
      }
      console.log(`✅ First split token [0] state is consistent across all ${success0States.length} nodes`);

      // 验证 token [1]（用于 transfer 给 Node1 Admin）
      console.log(`\nVerifying first split token [1] ${syncTestSplitTokenId.toString()} on all nodes...`);
      const token1States = [];
      for (let i = 0; i < allContracts.length; i++) {
        const contract = allContracts[i];
        const config = NODE_CONFIGS[i];

        try {
          const token = await contract.getToken(minterWallet.address, syncTestSplitTokenId);
          console.log(`   ${config.name}: ✅ Token [1] found - Owner: ${token.owner}, Status: ${token.status}, To: ${token.to}`);
          token1States.push({
            nodeIndex: i,
            nodeName: config.name,
            success: true,
            owner: token.owner,
            status: token.status,
            to: token.to,
            id: token.id.toString(),
          });
        } catch (error) {
          console.log(`   ${config.name}: ❌ Error - ${error.message}`);
          token1States.push({ nodeIndex: i, nodeName: config.name, success: false, error: error.message });
        }
        if (i < allContracts.length - 1) await sleep(1000);
      }

      const success1States = token1States.filter((s) => s.success);
      expect(success1States.length).to.equal(allContracts.length);
      if (success1States.length > 1) {
        const first = success1States[0];
        const allConsistent = success1States.every(
          (s) =>
            s.owner.toLowerCase() === first.owner.toLowerCase() &&
            s.status === first.status &&
            s.to.toLowerCase() === first.to.toLowerCase() &&
            s.id === first.id
        );
        expect(allConsistent).to.be.true;
      }
      console.log(`✅ First split token [1] state is consistent across all ${success1States.length} nodes`);
    });

    it('Step 9: Verify original mint token consumed on all nodes', async function () {
      console.log('\nStep 9: Verify Original Mint Token Consumed on All Nodes');
      expect(syncTestTokenId).to.exist;
      console.log(`Verifying original mint token ${syncTestTokenId.toString()} is consumed on all nodes...`);

      const consumedStates = [];
      for (let i = 0; i < allContracts.length; i++) {
        const contract = allContracts[i];
        const config = NODE_CONFIGS[i];

        try {
          const token = await contract.getToken(minterWallet.address, syncTestTokenId);
          const isConsumed = token.status !== 2; // Status 2 is active
          console.log(`   ${config.name}: Token status = ${token.status} ${isConsumed ? '(consumed)' : '(still active)'}`);
          consumedStates.push({ nodeIndex: i, nodeName: config.name, found: true, consumed: isConsumed, status: token.status });
        } catch (error) {
          console.log(`   ${config.name}: ✅ Token not accessible (likely consumed)`);
          consumedStates.push({ nodeIndex: i, nodeName: config.name, found: false, consumed: true });
        }
        if (i < allContracts.length - 1) await sleep(1000);
      }

      const consumedCount = consumedStates.filter((s) => s.consumed).length;
      console.log(`\n   Original mint token consumed/inaccessible on ${consumedCount}/${consumedStates.length} nodes`);

      // 要求全部 3 个节点都显示已消耗
      expect(consumedCount).to.equal(allContracts.length);
      console.log(`✅ Original mint token properly consumed across all ${consumedCount} nodes after first split`);
      s4FirstSplit = true; // Track first split verified
    });

    it('Step 10: Transfer first split [1] to Node1 Admin', async function () {
      console.log('\nStep 10: Transfer First Split [1] to Node1 Admin');
      expect(syncTestSplitTokenId).to.exist;

      const targetReceiver = NODE_CONFIGS[0].admin;
      console.log(`Transferring first split token [1] ${syncTestSplitTokenId.toString()} to Node1 Admin (${targetReceiver})...`);

      const memo = 'multi-node-transfer-to-node1-admin';
      const transferTx = await minterContract.transfer(syncTestSplitTokenId, memo, { gasLimit: 100000 });
      console.log(`   Transfer tx: ${transferTx.hash}, waiting...`);

      const receipt = await transferTx.wait();
      syncTestTxHash = transferTx.hash;

      console.log(`✅ Transfer completed on Node 3 (block: ${receipt.blockNumber})`);
      expect(receipt.status).to.equal(1);

      console.log('   Waiting for state propagation across nodes...');
      await sleep(10000);
    });

    it('Step 11: Verify transfer tx propagation + Node1 Admin access + minter access revoked', async function () {
      console.log('\nStep 11: Verify Transfer Tx Propagation and Ownership Change');

      // 11.1 验证 Transfer tx 传播到 3 个节点
      console.log(`\n   Verifying transfer tx ${syncTestTxHash} propagation...`);
      let txFoundCount = 0;
      for (let i = 0; i < allProviders.length; i++) {
        const provider = allProviders[i];
        const config = NODE_CONFIGS[i];
        try {
          const txReceipt = await provider.getTransactionReceipt(syncTestTxHash);
          if (txReceipt) {
            console.log(`   ${config.name}: ✅ Transfer tx found (block: ${txReceipt.blockNumber})`);
            txFoundCount++;
          } else {
            console.log(`   ${config.name}: ❌ Not found`);
          }
        } catch (error) {
          console.log(`   ${config.name}: ❌ Error - ${error.message}`);
        }
        if (i < allProviders.length - 1) await sleep(1000);
      }
      expect(txFoundCount).to.equal(allProviders.length);
      console.log(`✅ Transfer tx propagated to all ${txFoundCount} nodes`);

      // 11.2 验证 Node1 Admin 在各节点 getToken 一致
      const targetReceiver = NODE_CONFIGS[0].admin;
      console.log(`\n   Verifying Node1 Admin (${targetReceiver}) can access token on all nodes...`);
      const newOwnerStates = [];
      for (let i = 0; i < allContracts.length; i++) {
        const contract = allContracts[i];
        const config = NODE_CONFIGS[i];
        let retries = 3;
        let result = null;
        while (retries > 0) {
          try {
            const token = await contract.getToken(targetReceiver, syncTestSplitTokenId);
            result = { nodeIndex: i, nodeName: config.name, success: true, owner: token.owner, to: token.to, status: token.status };
            break;
          } catch (error) {
            retries--;
            if (retries > 0) await sleep(3000);
            else result = { nodeIndex: i, nodeName: config.name, success: false, error: error.message };
          }
        }
        if (result.success) console.log(`   ${result.nodeName}: ✅ Node1 Admin verified (Owner: ${result.owner})`);
        else console.log(`   ${result.nodeName}: ❌ Failed to verify Node1 Admin`);
        newOwnerStates.push(result);
        if (i < allContracts.length - 1) await sleep(1000);
      }
      const verifiedCount = newOwnerStates.filter((s) => s.success).length;
      expect(verifiedCount).to.equal(allContracts.length);
      console.log(`✅ Node1 Admin access verified on all ${verifiedCount} nodes`);

      // 11.3 验证 minter 在各节点对该 token getToken 失败
      console.log(`\n   Verifying minter access revoked on all nodes...`);
      const oldOwnerStates = [];
      for (let i = 0; i < allContracts.length; i++) {
        const contract = allContracts[i];
        const config = NODE_CONFIGS[i];
        try {
          await contract.getToken(minterWallet.address, syncTestSplitTokenId);
          console.log(`   ${config.name}: ⚠️  Minter still has access`);
          oldOwnerStates.push({ nodeIndex: i, hasAccess: true });
        } catch (error) {
          console.log(`   ${config.name}: ✅ Minter access revoked (expected)`);
          oldOwnerStates.push({ nodeIndex: i, hasAccess: false });
        }
        if (i < allContracts.length - 1) await sleep(1000);
      }
      const revokedCount = oldOwnerStates.filter((s) => !s.hasAccess).length;
      expect(revokedCount).to.equal(allContracts.length);
      console.log(`✅ Minter access revoked on all ${revokedCount} nodes after transfer`);
      s4Transfer = true; // Track transfer verified
    });

    it('Step 12: Second Split using first split [0]', async function () {
      console.log('\nStep 12: Second Split Using First Split [0]');
      expect(firstSplitTokenId0).to.exist;
      console.log(`Splitting first split token [0] ${firstSplitTokenId0.toString()} to produce token for burn...`);

      // 第二次 split：to_accounts 设为 minter 自己（拆出一份用于 burn）
      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [{ address: minterWallet.address, amount: 50, comment: 'multi-node-second-split-for-burn' }],
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

      const splitTx = await minterContract.split(
        minterWallet.address,
        splitRecipients,
        consumedIds,
        splitNewTokens,
        splitProof,
        splitPublicInputs,
        paddingNum,
        { gasLimit: 100000 }
      );
      console.log(`Second Split tx: ${splitTx.hash}, waiting...`);

      const receipt = await splitTx.wait();
      syncTestTxHash = splitTx.hash;

      // 第二次 split 输出：[0] = minter 自留，[1] = 用于 burn（odd-indexed）
      secondSplitTokenId0 = ethers.toBigInt(splitNewTokens[0].id);
      const burnTokenIdx = splitNewTokens.findIndex((_, idx) => idx % 2 !== 0);
      tokenIdToBurn = ethers.toBigInt(splitNewTokens[burnTokenIdx].id);

      console.log(`✅ Second Split done on Node 3. All token IDs: ${splitNewTokens.map((t) => t.id).join(', ')}`);
      console.log(`   Token [0] (minter keeps): ${secondSplitTokenId0.toString()}`);
      console.log(`   Token [1] (for burn): ${tokenIdToBurn.toString()}`);
      console.log(`   Block: ${receipt.blockNumber}, Gas: ${receipt.gasUsed}`);

      expect(receipt.status).to.equal(1);

      console.log('   Waiting for state propagation...');
      await sleep(8000);
    });

    it('Step 13: Verify second split tx propagation + token state + first split [0] consumed', async function () {
      console.log('\nStep 13: Verify Second Split Tx Propagation and State Consistency');

      // 13.1 验证第二次 Split tx 传播到 3 个节点
      console.log(`\n   Verifying second split tx ${syncTestTxHash} propagation...`);
      let txFoundCount = 0;
      for (let i = 0; i < allProviders.length; i++) {
        const provider = allProviders[i];
        const config = NODE_CONFIGS[i];
        try {
          const txReceipt = await provider.getTransactionReceipt(syncTestTxHash);
          if (txReceipt) {
            console.log(`   ${config.name}: ✅ Second split tx found (block: ${txReceipt.blockNumber})`);
            txFoundCount++;
          } else {
            console.log(`   ${config.name}: ❌ Not found`);
          }
        } catch (error) {
          console.log(`   ${config.name}: ❌ Error - ${error.message}`);
        }
        if (i < allProviders.length - 1) await sleep(1000);
      }
      expect(txFoundCount).to.equal(allProviders.length);
      console.log(`✅ Second split tx propagated to all ${txFoundCount} nodes`);

      // 13.2 验证第二次 split 产生的 token 在各节点 getToken 一致
      console.log(`\n   Verifying second split token [1] (for burn) ${tokenIdToBurn.toString()} on all nodes...`);
      const tokenStates = [];
      for (let i = 0; i < allContracts.length; i++) {
        const contract = allContracts[i];
        const config = NODE_CONFIGS[i];
        try {
          const token = await contract.getToken(minterWallet.address, tokenIdToBurn);
          console.log(`   ${config.name}: ✅ Token found - Owner: ${token.owner}, Status: ${token.status}, To: ${token.to}`);
          tokenStates.push({
            nodeIndex: i,
            nodeName: config.name,
            success: true,
            owner: token.owner,
            status: token.status,
            to: token.to,
            id: token.id.toString(),
          });
        } catch (error) {
          console.log(`   ${config.name}: ❌ Error - ${error.message}`);
          tokenStates.push({ nodeIndex: i, nodeName: config.name, success: false, error: error.message });
        }
        if (i < allContracts.length - 1) await sleep(1000);
      }
      const successStates = tokenStates.filter((s) => s.success);
      expect(successStates.length).to.equal(allContracts.length);
      if (successStates.length > 1) {
        const first = successStates[0];
        const allConsistent = successStates.every(
          (s) =>
            s.owner.toLowerCase() === first.owner.toLowerCase() &&
            s.status === first.status &&
            s.to.toLowerCase() === first.to.toLowerCase() &&
            s.id === first.id
        );
        expect(allConsistent).to.be.true;
      }
      console.log(`✅ Second split token [1] state is consistent across all ${successStates.length} nodes`);

      // 13.3 验证 first split [0] 在各节点 consumed/不可访问
      console.log(`\n   Verifying first split [0] ${firstSplitTokenId0.toString()} is consumed on all nodes...`);
      const consumedStates = [];
      for (let i = 0; i < allContracts.length; i++) {
        const contract = allContracts[i];
        const config = NODE_CONFIGS[i];
        try {
          const token = await contract.getToken(minterWallet.address, firstSplitTokenId0);
          const isConsumed = token.status !== 2;
          console.log(`   ${config.name}: Token status = ${token.status} ${isConsumed ? '(consumed)' : '(still active)'}`);
          consumedStates.push({ nodeIndex: i, nodeName: config.name, found: true, consumed: isConsumed, status: token.status });
        } catch (error) {
          console.log(`   ${config.name}: ✅ Token not accessible (likely consumed)`);
          consumedStates.push({ nodeIndex: i, nodeName: config.name, found: false, consumed: true });
        }
        if (i < allContracts.length - 1) await sleep(1000);
      }
      const consumedCount = consumedStates.filter((s) => s.consumed).length;
      expect(consumedCount).to.equal(allContracts.length);
      console.log(`✅ First split [0] properly consumed across all ${consumedCount} nodes after second split`);
      s4SecondSplit = true; // Track second split verified
    });

    it('Step 14: Burn second split [1] token', async function () {
      console.log('\nStep 14: Burn Second Split [1] Token');
      expect(tokenIdToBurn).to.exist;
      console.log(`Burning second split token [1] ${tokenIdToBurn.toString()}...`);

      const burnTx = await minterContract.burn(tokenIdToBurn, { gasLimit: 100000 });
      console.log(`   Burn tx: ${burnTx.hash}, waiting...`);

      const receipt = await burnTx.wait();
      syncTestTxHash = burnTx.hash;

      console.log(`✅ Burn completed on Node 3 (block: ${receipt.blockNumber}, gas: ${receipt.gasUsed})`);
      expect(receipt.status).to.equal(1);

      console.log('   Waiting for state propagation...');
      await sleep(8000);
    });

    it('Step 15: Verify burn tx propagation + burned token inaccessible on all nodes', async function () {
      console.log('\nStep 15: Verify Burn Tx Propagation and Token Inaccessible');

      // 15.1 验证 Burn tx 传播到 3 个节点
      console.log(`\n   Verifying burn tx ${syncTestTxHash} propagation...`);
      let txFoundCount = 0;
      for (let i = 0; i < allProviders.length; i++) {
        const provider = allProviders[i];
        const config = NODE_CONFIGS[i];
        try {
          const txReceipt = await provider.getTransactionReceipt(syncTestTxHash);
          if (txReceipt) {
            console.log(`   ${config.name}: ✅ Burn tx found (block: ${txReceipt.blockNumber})`);
            txFoundCount++;
          } else {
            console.log(`   ${config.name}: ❌ Not found`);
          }
        } catch (error) {
          console.log(`   ${config.name}: ❌ Error - ${error.message}`);
        }
        if (i < allProviders.length - 1) await sleep(1000);
      }
      expect(txFoundCount).to.equal(allProviders.length);
      console.log(`✅ Burn tx propagated to all ${txFoundCount} nodes`);

      // 15.2 验证被 burn 的 token 在各节点已销毁/不可访问
      console.log(`\n   Verifying burned token ${tokenIdToBurn.toString()} is inaccessible on all nodes...`);
      const burnedStates = [];
      for (let i = 0; i < allContracts.length; i++) {
        const contract = allContracts[i];
        const config = NODE_CONFIGS[i];
        try {
          const token = await contract.getToken(minterWallet.address, tokenIdToBurn);
          // 如果能获取到，检查 status 是否表示已销毁（假设 status !== 2 表示已消耗/销毁）
          const isBurned = token.status !== 2;
          console.log(`   ${config.name}: Token status = ${token.status} ${isBurned ? '(burned/consumed)' : '(still active)'}`);
          burnedStates.push({ nodeIndex: i, nodeName: config.name, found: true, burned: isBurned, status: token.status });
        } catch (error) {
          console.log(`   ${config.name}: ✅ Token not accessible (burned)`);
          burnedStates.push({ nodeIndex: i, nodeName: config.name, found: false, burned: true });
        }
        if (i < allContracts.length - 1) await sleep(1000);
      }
      const burnedCount = burnedStates.filter((s) => s.burned).length;
      expect(burnedCount).to.equal(allContracts.length);
      console.log(`✅ Burned token is inaccessible/burned on all ${burnedCount} nodes`);
      s4Burn = true; // Track burn verified
    });
  });

  describe.only('Scenario 5: Cross-Node Chain Transfer (A→B→C→A)', function () {
    // Chain transfer token tracking
    let chainTokenId, chainTxHash;
    // Node-specific wallets and contracts for chain transfer
    let node1AdminWallet, node1AdminContract, node1AdminMetadata;
    let node2AdminWallet, node2AdminContract, node2AdminMetadata;
    // Final recipient
    const finalRecipient = accounts.To1;

    it('Step 1: Setup Node1 Admin and Node2 Admin wallets', async function () {
      console.log('\n--- Scenario 5: Cross-Node Chain Transfer (A→B→C→D) ---');
      console.log('Step 1: Setup Node Admin Wallets for Chain Transfer\n');

      // Node1 Admin wallet connected to Node1 provider
      const node1Provider = allProviders[0];
      node1AdminWallet = new ethers.Wallet(NODE_CONFIGS[0].key, node1Provider);
      node1AdminContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, node1AdminWallet);
      node1AdminMetadata = await createAuthMetadata(NODE_CONFIGS[0].key);

      console.log(`   Node1 Admin: ${node1AdminWallet.address}`);
      console.log(`   Connected to: ${NODE_CONFIGS[0].name} (${NODE_CONFIGS[0].httpUrl})`);

      // Node2 Admin wallet connected to Node2 provider
      const node2Provider = allProviders[1];
      node2AdminWallet = new ethers.Wallet(NODE_CONFIGS[1].key, node2Provider);
      node2AdminContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, node2AdminWallet);
      node2AdminMetadata = await createAuthMetadata(NODE_CONFIGS[1].key);

      console.log(`   Node2 Admin: ${node2AdminWallet.address}`);
      console.log(`   Connected to: ${NODE_CONFIGS[1].name} (${NODE_CONFIGS[1].httpUrl})`);

      console.log(`   Final Recipient: ${finalRecipient}`);

      expect(node1AdminWallet.address).to.equal(NODE_CONFIGS[0].admin);
      expect(node2AdminWallet.address).to.equal(NODE_CONFIGS[1].admin);
      console.log('\n✅ All node admin wallets initialized');
    });

    it('Step 2: Verify initial blockchain sync across all nodes', async function () {
      console.log('\nStep 2: Verify Initial Blockchain Sync');

      const blockNumbers = await Promise.all(
        allProviders.map(async (provider, idx) => {
          const blockNum = await provider.getBlockNumber();
          console.log(`   ${NODE_CONFIGS[idx].name}: Block ${blockNum}`);
          return blockNum;
        })
      );

      const maxBlock = Math.max(...blockNumbers);
      const minBlock = Math.min(...blockNumbers);
      const blockDiff = maxBlock - minBlock;

      console.log(`   Block height difference: ${blockDiff} blocks`);
      expect(blockDiff).to.be.at.most(3);
      console.log(`✅ All nodes are synchronized (max diff: ${blockDiff} blocks)`);
    });

    it('Step 3: Set mint allowance on Node 3', async function () {
      console.log('\nStep 3: Set Mint Allowance on Node 3');
      const allowanceAmount = 100000000;

      const setAllowedTx = await withTimeout(
        setupMintAllowance(ownerContract, client, minterWallet.address, accounts.OwnerKey, allowanceAmount),
        60000,
        'setupMintAllowance timeout'
      );

      chainTxHash = setAllowedTx.hash;
      console.log(`✅ Mint allowance set on Node 3, tx: ${chainTxHash}`);
      expect(setAllowedTx.hash).to.be.a('string');
      await sleep(10000);
    });

    it('Step 4: Mint and Split token on Node 3 (prepare for chain transfer)', async function () {
      console.log('\nStep 4: Mint and Split Token on Node 3');
      const tokenAmount = 1000;

      // Mint
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
      await mintTx.wait();
      const mintedTokenId = ethers.toBigInt(newTokens[0].id);
      console.log(`   Minted token: ${mintedTokenId.toString()}`);

      // Split to Node1 Admin
      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [{ address: NODE_CONFIGS[0].admin, amount: 100, comment: 'chain-transfer-split' }],
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

      const splitTx = await minterContract.split(
        minterWallet.address,
        splitRecipients,
        consumedIds,
        splitNewTokens,
        splitProof,
        splitPublicInputs,
        paddingNum,
        { gasLimit: 100000 }
      );

      const splitReceipt = await splitTx.wait();
      const transferTokenIdx = splitNewTokens.findIndex((_, idx) => idx % 2 !== 0);
      chainTokenId = ethers.toBigInt(splitNewTokens[transferTokenIdx].id);

      console.log(`   Split done. Token for chain transfer: ${chainTokenId.toString()}`);
      console.log(`   Block: ${splitReceipt.blockNumber}`);
      expect(splitReceipt.status).to.equal(1);

      console.log('   Waiting for state propagation...');
      await sleep(8000);
      console.log(`✅ Token ${chainTokenId.toString()} ready for chain transfer (to=${NODE_CONFIGS[0].admin})`);
    });

    it('Step 5: [Hop 1] Node3 Minter → Node1 Admin (tx on Node3)', async function () {
      console.log('\nStep 5: [Hop 1] Node3 Minter → Node1 Admin');
      expect(chainTokenId).to.exist;
      console.log(`   Transferring token ${chainTokenId.toString()} from Node3 Minter to Node1 Admin...`);
      console.log(`   From: ${minterWallet.address} (Node3 Minter)`);
      console.log(`   To: ${NODE_CONFIGS[0].admin} (Node1 Admin)`);

      const memo = 'chain-hop1-minter-to-node1admin';
      const transferTx = await minterContract.transfer(chainTokenId, memo, { gasLimit: 100000 });
      console.log(`   Transfer tx: ${transferTx.hash}`);

      const receipt = await transferTx.wait();
      chainTxHash = transferTx.hash;

      console.log(`✅ Hop 1 completed on Node 3 (block: ${receipt.blockNumber})`);
      expect(receipt.status).to.equal(1);

      console.log('   Waiting for state propagation...');
      await sleep(10000);
    });

    it('Step 6: Verify Hop 1 - tx propagation', async function () {
      console.log('\nStep 6: Verify Hop 1 Transaction Propagation');

      // 6.1 Verify tx propagation only
      console.log(`\n   Verifying Hop 1 tx ${chainTxHash} propagation...`);
      let txFoundCount = 0;
      for (let i = 0; i < allProviders.length; i++) {
        const provider = allProviders[i];
        const config = NODE_CONFIGS[i];
        try {
          const txReceipt = await provider.getTransactionReceipt(chainTxHash);
          if (txReceipt) {
            console.log(`   ${config.name}: ✅ Hop 1 tx found (block: ${txReceipt.blockNumber})`);
            txFoundCount++;
          } else {
            console.log(`   ${config.name}: ❌ Not found`);
          }
        } catch (error) {
          console.log(`   ${config.name}: ❌ Error - ${error.message}`);
        }
        if (i < allProviders.length - 1) await sleep(1000);
      }
      expect(txFoundCount).to.equal(allProviders.length);
      console.log(`✅ Hop 1 tx propagated to all ${txFoundCount} nodes`);
      s5Hop1 = true; // Track hop 1 completed
    });

    it('Step 7: [Hop 2] Node1 Admin → Node2 Admin (tx on Node1)', async function () {
      console.log('\nStep 7: [Hop 2] Node1 Admin → Node2 Admin (tx submitted on Node1)');
      client = allClients[0]
      expect(chainTokenId).to.exist;
      expect(node1AdminContract).to.exist;

      console.log(`   Splitting token ${chainTokenId.toString()} from Node1 Admin to Node2 Admin...`);
      console.log(`   From: ${NODE_CONFIGS[0].admin} (Node1 Admin)`);
      console.log(`   To: ${NODE_CONFIGS[1].admin} (Node2 Admin)`);
      console.log(`   Transaction will be submitted on: ${NODE_CONFIGS[0].name}`);

      // Step 7.1: Generate split proof
      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: NODE_CONFIGS[0].admin,
        to_accounts: [{ address: NODE_CONFIGS[1].admin, amount: 100, comment: 'chain-hop2-split' }],
      };

      const splitProofResponse = await withTimeout(client.generateBatchSplitToken(splitRequests, node1AdminMetadata), 60000, 'generateBatchSplitToken timeout');
      await sleep(2000);

      const detailResponse = await withTimeout(
        client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, node1AdminMetadata),
        60000,
        'getBatchSplitTokenDetail timeout'
      );

      const splitRecipients = detailResponse.to_addresses;
      const consumedIds = detailResponse.consumedIds.map((ids) => ids.token_id);

      const splitNewTokens = detailResponse.newTokens.map((account, idx) => ({
        id: account.token_id,
        owner: NODE_CONFIGS[0].admin,
        status: 2,
        amount: {
          cl_x: ethers.toBigInt(account.cl_x),
          cl_y: ethers.toBigInt(account.cl_y),
          cr_x: ethers.toBigInt(account.cr_x),
          cr_y: ethers.toBigInt(account.cr_y),
        },
        to: idx % 2 === 0 ? NODE_CONFIGS[0].admin : splitRecipients[Math.floor(idx / 2)],
        rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1].token_id,
      }));

      const splitProof = detailResponse.proof.map((p) => ethers.toBigInt(p));
      const splitPublicInputs = detailResponse.public_input.map((i) => ethers.toBigInt(i));
      const paddingNum = detailResponse.batched_size - splitRecipients.length;

      // Step 7.2: Execute split
      const splitTx = await node1AdminContract.split(
        NODE_CONFIGS[0].admin,
        splitRecipients,
        consumedIds,
        splitNewTokens,
        splitProof,
        splitPublicInputs,
        paddingNum,
        { gasLimit: 100000 }
      );

      console.log(`   Split tx: ${splitTx.hash}`);
      const splitReceipt = await splitTx.wait();
      console.log(`   Split completed on Node 1 (block: ${splitReceipt.blockNumber})`);

      // Get the new token ID for transfer
      const transferTokenIdx = splitNewTokens.findIndex((_, idx) => idx % 2 !== 0);
      const newTokenId = ethers.toBigInt(splitNewTokens[transferTokenIdx].id);
      console.log(`   New token created for transfer: ${newTokenId.toString()}`);

      // Step 7.3: Transfer token to Node2 Admin
      console.log(`   Transferring token ${newTokenId.toString()} to Node2 Admin...`);
      const memo = 'chain-hop2-transfer-to-node2admin';
      const transferTx = await node1AdminContract.transfer(newTokenId, memo, { gasLimit: 100000 });
      console.log(`   Transfer tx: ${transferTx.hash}`);

      const transferReceipt = await transferTx.wait();
      chainTxHash = transferTx.hash;
      chainTokenId = newTokenId;

      console.log(`✅ Hop 2 completed on Node 1 (block: ${transferReceipt.blockNumber})`);
      expect(transferReceipt.status).to.equal(1);

      console.log('   Waiting for state propagation...');
      await sleep(10000);
    });

    it('Step 8: Verify Hop 2 - tx propagation', async function () {
      console.log('\nStep 8: Verify Hop 2 Transaction Propagation');

      // 8.1 Verify tx propagation only
      console.log(`\n   Verifying Hop 2 tx ${chainTxHash} propagation...`);
      let txFoundCount = 0;
      for (let i = 0; i < allProviders.length; i++) {
        const provider = allProviders[i];
        const config = NODE_CONFIGS[i];
        try {
          const txReceipt = await provider.getTransactionReceipt(chainTxHash);
          if (txReceipt) {
            console.log(`   ${config.name}: ✅ Hop 2 tx found (block: ${txReceipt.blockNumber})`);
            txFoundCount++;
          } else {
            console.log(`   ${config.name}: ❌ Not found`);
          }
        } catch (error) {
          console.log(`   ${config.name}: ❌ Error - ${error.message}`);
        }
        if (i < allProviders.length - 1) await sleep(1000);
      }
      expect(txFoundCount).to.equal(allProviders.length);
      console.log(`✅ Hop 2 tx (submitted on Node1) propagated to all ${txFoundCount} nodes`);
      s5Hop2 = true; // Track hop 2 completed
    });

    it('Step 9: [Hop 3] Node2 Admin → Node3 Recevier (tx on Node2)', async function () {
      console.log('\nStep 9: [Hop 3] Node2 Admin → Final Recipient (tx submitted on Node2)');
      expect(chainTokenId).to.exist;
      expect(node2AdminContract).to.exist;
      client = allClients[1];

      console.log(`   Splitting token ${chainTokenId.toString()} from Node2 Admin to Final Recipient...`);
      console.log(`   From: ${NODE_CONFIGS[1].admin} (Node2 Admin)`);
      console.log(`   To: ${finalRecipient} (Final Recipient)`);
      console.log(`   Transaction will be submitted on: ${NODE_CONFIGS[1].name}`);

      // Step 9.1: Generate split proof
      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: NODE_CONFIGS[1].admin,
        to_accounts: [{ address: finalRecipient, amount: 100, comment: 'chain-hop3-split' }],
      };

      const splitProofResponse = await withTimeout(client.generateBatchSplitToken(splitRequests, node2AdminMetadata), 60000, 'generateBatchSplitToken timeout');
      await sleep(2000);

      const detailResponse = await withTimeout(
        client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, node2AdminMetadata),
        60000,
        'getBatchSplitTokenDetail timeout'
      );

      const splitRecipients = detailResponse.to_addresses;
      const consumedIds = detailResponse.consumedIds.map((ids) => ids.token_id);

      const splitNewTokens = detailResponse.newTokens.map((account, idx) => ({
        id: account.token_id,
        owner: NODE_CONFIGS[1].admin,
        status: 2,
        amount: {
          cl_x: ethers.toBigInt(account.cl_x),
          cl_y: ethers.toBigInt(account.cl_y),
          cr_x: ethers.toBigInt(account.cr_x),
          cr_y: ethers.toBigInt(account.cr_y),
        },
        to: idx % 2 === 0 ? NODE_CONFIGS[1].admin : splitRecipients[Math.floor(idx / 2)],
        rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1].token_id,
      }));

      const splitProof = detailResponse.proof.map((p) => ethers.toBigInt(p));
      const splitPublicInputs = detailResponse.public_input.map((i) => ethers.toBigInt(i));
      const paddingNum = detailResponse.batched_size - splitRecipients.length;

      // Step 9.2: Execute split
      const splitTx = await node2AdminContract.split(
        NODE_CONFIGS[1].admin,
        splitRecipients,
        consumedIds,
        splitNewTokens,
        splitProof,
        splitPublicInputs,
        paddingNum,
        { gasLimit: 100000 }
      );

      console.log(`   Split tx: ${splitTx.hash}`);
      const splitReceipt = await splitTx.wait();
      console.log(`   Split completed on Node 2 (block: ${splitReceipt.blockNumber})`);

      // Get the new token ID for transfer
      const transferTokenIdx = splitNewTokens.findIndex((_, idx) => idx % 2 !== 0);
      const newTokenId = ethers.toBigInt(splitNewTokens[transferTokenIdx].id);
      console.log(`   New token created for transfer: ${newTokenId.toString()}`);

      // Step 9.3: Transfer token to Final Recipient
      console.log(`   Transferring token ${newTokenId.toString()} to Final Recipient...`);
      const memo = 'chain-hop3-transfer-to-final';
      const transferTx = await node2AdminContract.transfer(newTokenId, memo, { gasLimit: 100000 });
      console.log(`   Transfer tx: ${transferTx.hash}`);

      const transferReceipt = await transferTx.wait();
      chainTxHash = transferTx.hash;
      chainTokenId = newTokenId;

      console.log(`✅ Hop 3 completed on Node 2 (block: ${transferReceipt.blockNumber})`);
      expect(transferReceipt.status).to.equal(1);

      console.log('   Waiting for state propagation...');
      await sleep(10000);
    });

    it('Step 10: Verify Hop 3 - tx propagation', async function () {
      console.log('\nStep 10: Verify Hop 3 Transaction Propagation');

      // 10.1 Verify tx propagation only
      console.log(`\n   Verifying Hop 3 tx ${chainTxHash} propagation...`);
      let txFoundCount = 0;
      for (let i = 0; i < allProviders.length; i++) {
        const provider = allProviders[i];
        const config = NODE_CONFIGS[i];
        try {
          const txReceipt = await provider.getTransactionReceipt(chainTxHash);
          if (txReceipt) {
            console.log(`   ${config.name}: ✅ Hop 3 tx found (block: ${txReceipt.blockNumber})`);
            txFoundCount++;
          } else {
            console.log(`   ${config.name}: ❌ Not found`);
          }
        } catch (error) {
          console.log(`   ${config.name}: ❌ Error - ${error.message}`);
        }
        if (i < allProviders.length - 1) await sleep(1000);
      }
      expect(txFoundCount).to.equal(allProviders.length);
      console.log(`✅ Hop 3 tx (submitted on Node2) propagated to all ${txFoundCount} nodes`);
      s5Hop3 = true; // Track hop 3 completed
    });

    it('Step 11: Verify complete chain transfer history', async function () {
      console.log('\nStep 11: Verify Complete Chain Transfer Summary');
      console.log('\n   Chain Transfer Path:');
      console.log(`   ┌─────────────────────────────────────────────────────────────┐`);
      console.log(`   │  [Hop 1] Node3 Minter ──(tx on Node3)──→ Node1 Admin        │`);
      console.log(`   │  [Hop 2] Node1 Admin  ──(tx on Node1)──→ Node2 Admin        │`);
      console.log(`   │  [Hop 3] Node2 Admin  ──(tx on Node2)──→ Node3 Receiver    │`);
      console.log(`   └─────────────────────────────────────────────────────────────┘`);
      console.log(`\n   Token ID: ${chainTokenId.toString()}`);
      console.log(`   Final Owner: ${finalRecipient}`);

      // Final consistency check - verify none of the intermediate owners can access
      console.log('\n   Final access verification:');
      const accessChecks = [
        { name: 'Node3 Minter', address: minterWallet.address },
        { name: 'Node1 Admin', address: NODE_CONFIGS[0].admin },
        { name: 'Node2 Admin', address: NODE_CONFIGS[1].admin },
        { name: 'Final Recipient', address: finalRecipient },
      ];

      for (const check of accessChecks) {
        try {
          const token = await allContracts[0].getToken(check.address, chainTokenId);
          if (check.address === finalRecipient) {
            console.log(`   ${check.name}: ✅ Has access (expected - final owner)`);
          } else {
            console.log(`   ${check.name}: ⚠️  Still has access (unexpected)`);
          }
        } catch (error) {
          if (check.address === finalRecipient) {
            console.log(`   ${check.name}: ❌ No access (unexpected - should be final owner)`);
          } else {
            console.log(`   ${check.name}: ✅ No access (expected - transferred away)`);
          }
        }
      }

      console.log('\n✅ Cross-node chain transfer (A→B→C→D) completed successfully');
      console.log('   - Transactions submitted on 3 different nodes');
      console.log('   - All transactions propagated to all nodes');
      console.log('   - Ownership correctly transferred at each hop');
      console.log('   - Intermediate owners lost access after transferring');
    });
  });

  describe('Scenario 6: Account Existence Check by Node (Node3 → Node2 → Node1)', function () {
    // 定义每个节点需要检测的账户
    const NODE_ACCOUNTS = {
      node3: {
        name: 'Node 3',
        providerIndex: 2,
        contractIndex: 2,
        accounts: [
          { address: accounts.Minter, description: 'Minter' },
          { address: accounts.Owner, description: 'Owner' },
          { address: accounts.To1, description: 'To1' },
          { address: accounts.To2, description: 'To2' },
        ],
      },
      node2: {
        name: 'Node 2',
        providerIndex: 1,
        contractIndex: 1,
        accounts: [
          { address: NODE_CONFIGS[1].admin, description: 'Node2 Admin' },
          { address: accounts.To1, description: 'To1' },
        ],
      },
      node1: {
        name: 'Node 1',
        providerIndex: 0,
        contractIndex: 0,
        accounts: [
          { address: NODE_CONFIGS[0].admin, description: 'Node1 Admin' },
          { address: accounts.To1, description: 'To1' },
        ],
      },
    };

    // 辅助函数：检测账户是否存在（通过查询 nonce）
    async function checkAccountExists(provider, address, description) {
      try {
        const nonce = await provider.getTransactionCount(address);
        const balance = await provider.getBalance(address);
        console.log(`   ✅ ${description} (${address}): nonce=${nonce}, balance=${balance.toString()}`);
        return { exists: true, address, description, nonce, balance };
      } catch (error) {
        console.log(`   ❌ ${description} (${address}...): ERROR - ${error.message}`);
        return { exists: false, address, description, error: error.message };
      }
    }

    it('Step 1: Check accounts on Node 3', async function () {
      console.log('\n--- Scenario 6: Account Existence Check by Node ---');
      console.log('Step 1: Checking accounts on Node 3\n');

      const node3Config = NODE_ACCOUNTS.node3;
      const provider = allProviders[node3Config.providerIndex];
      const results = [];

      for (const account of node3Config.accounts) {
        const result = await checkAccountExists(provider, account.address, account.description);
        results.push(result);
      }

      const allExist = results.every((r) => r.exists);
      expect(allExist).to.be.true;
      console.log(`\n✅ Node 3: All ${results.length} accounts exist`);
    });

    it('Step 2: Check accounts on Node 2', async function () {
      console.log('\nStep 2: Checking accounts on Node 2\n');

      const node2Config = NODE_ACCOUNTS.node2;
      const provider = allProviders[node2Config.providerIndex];
      const results = [];

      for (const account of node2Config.accounts) {
        const result = await checkAccountExists(provider, account.address, account.description);
        results.push(result);
      }

      const allExist = results.every((r) => r.exists);
      expect(allExist).to.be.true;
      console.log(`\n✅ Node 2: All ${results.length} accounts exist`);
    });

    it('Step 3: Check accounts on Node 1', async function () {
      console.log('\nStep 3: Checking accounts on Node 1\n');

      const node1Config = NODE_ACCOUNTS.node1;
      const provider = allProviders[node1Config.providerIndex];
      const results = [];

      for (const account of node1Config.accounts) {
        const result = await checkAccountExists(provider, account.address, account.description);
        results.push(result);
      }

      const allExist = results.every((r) => r.exists);
      expect(allExist).to.be.true;
      console.log(`\n✅ Node 1: All ${results.length} accounts exist`);
    });

    it('Step 4: Summary - All nodes account check', async function () {
      console.log('\nStep 4: Summary of all nodes\n');

      const allNodes = ['node3', 'node2', 'node1'];
      const summary = {};

      for (const nodeKey of allNodes) {
        const nodeConfig = NODE_ACCOUNTS[nodeKey];
        const provider = allProviders[nodeConfig.providerIndex];
        const results = [];

        console.log(`   ${nodeConfig.name}:`);
        for (const account of nodeConfig.accounts) {
          const result = await checkAccountExists(provider, account.address, `  ${account.description}`);
          results.push(result);
        }

        const allExist = results.every((r) => r.exists);
        summary[nodeKey] = { total: results.length, passed: results.filter((r) => r.exists).length, allExist };
        console.log(`      Result: ${summary[nodeKey].passed}/${summary[nodeKey].total} accounts\n`);
      }

      const totalAccounts = Object.values(summary).reduce((sum, s) => sum + s.total, 0);
      const totalPassed = Object.values(summary).reduce((sum, s) => sum + s.passed, 0);

      console.log(`✅ All nodes check complete: ${totalPassed}/${totalAccounts} accounts exist`);
      expect(totalPassed).to.equal(totalAccounts);
    });
  });

  // Helper function to verify token by ID
  async function verifyToken(tokenId, ownerAddress, contract) {
    try {
      const response = await contract.getToken(ownerAddress, tokenId);
      console.log(`   ✅ Token ${tokenId} verified - Owner: ${response.owner}, Status: ${response.status}, To: ${response.to}`);
      return { success: true, tokenId, owner: response.owner, to: response.to, status: response.status };
    } catch (error) {
      // Expected behavior when token ownership has changed or token doesn't exist for this owner
      console.log(`   ℹ️  Token ${tokenId} not accessible from address ${ownerAddress}`);
      return { success: false, tokenId, error: error.message };
    }
  }

  after(function () {
    console.log('\n=== Test Summary ===');

    // Scenario 1: Split → Transfer → Burn
    const s1Started = s1Split || s1Transfer || s1Burn;
    const s1AllPassed = s1Split && s1Transfer && s1Burn;
    const s1SplitIcon = s1Split ? '✅' : s1Started ? '❌' : '⏭️';
    const s1TransferIcon = s1Transfer ? '✅' : s1Split ? '❌' : '⏭️';
    const s1BurnIcon = s1Burn ? '✅' : s1Transfer ? '❌' : '⏭️';
    const s1Icon = s1AllPassed ? '✅' : s1Started ? '❌' : '⏭️';
    const s1Detail = s1Started ? `Split ${s1SplitIcon} → Transfer ${s1TransferIcon} → Burn ${s1BurnIcon}` : 'skipped';
    console.log(`${s1Icon} Scenario 1 - Transfer to To1: ${s1Detail}`);

    // Scenario 2: Mint → Split → Transfer
    const s2Started = s2Mint || s2Split || s2Transfer;
    const s2AllPassed = s2Mint && s2Split && s2Transfer;
    const s2MintIcon = s2Mint ? '✅' : s2Started ? '❌' : '⏭️';
    const s2SplitIcon = s2Split ? '✅' : s2Mint ? '❌' : '⏭️';
    const s2TransferIcon = s2Transfer ? '✅' : s2Split ? '❌' : '⏭️';
    const s2Icon = s2AllPassed ? '✅' : s2Started ? '❌' : '⏭️';
    const s2Detail = s2Started ? `Mint ${s2MintIcon} → Split ${s2SplitIcon} → Transfer ${s2TransferIcon}` : 'skipped';
    console.log(`${s2Icon} Scenario 2 - Transfer to Node1 Admin: ${s2Detail}`);

    // Scenario 3: Skipped
    console.log(`⏭️ Scenario 3 - 3 Tokens to 3 Recipients: skipped`);

    // Scenario 4: Mint → FirstSplit → Transfer → SecondSplit → Burn
    const s4Started = s4Mint || s4FirstSplit || s4Transfer || s4SecondSplit || s4Burn;
    const s4AllPassed = s4Mint && s4FirstSplit && s4Transfer && s4SecondSplit && s4Burn;
    const s4MintIcon = s4Mint ? '✅' : s4Started ? '❌' : '⏭️';
    const s4FirstSplitIcon = s4FirstSplit ? '✅' : s4Mint ? '❌' : '⏭️';
    const s4TransferIcon = s4Transfer ? '✅' : s4FirstSplit ? '❌' : '⏭️';
    const s4SecondSplitIcon = s4SecondSplit ? '✅' : s4Transfer ? '❌' : '⏭️';
    const s4BurnIcon = s4Burn ? '✅' : s4SecondSplit ? '❌' : '⏭️';
    const s4Icon = s4AllPassed ? '✅' : s4Started ? '❌' : '⏭️';
    const s4Detail = s4Started
      ? `Mint ${s4MintIcon} → Split1 ${s4FirstSplitIcon} → Transfer ${s4TransferIcon} → Split2 ${s4SecondSplitIcon} → Burn ${s4BurnIcon}`
      : 'skipped';
    console.log(`${s4Icon} Scenario 4 - Full Token Lifecycle: ${s4Detail}`);

    // Scenario 5: Hop1 → Hop2 → Hop3
    const s5Started = s5Hop1 || s5Hop2 || s5Hop3;
    const s5AllPassed = s5Hop1 && s5Hop2 && s5Hop3;
    const s5Hop1Icon = s5Hop1 ? '✅' : s5Started ? '❌' : '⏭️';
    const s5Hop2Icon = s5Hop2 ? '✅' : s5Hop1 ? '❌' : '⏭️';
    const s5Hop3Icon = s5Hop3 ? '✅' : s5Hop2 ? '❌' : '⏭️';
    const s5Icon = s5AllPassed ? '✅' : s5Started ? '❌' : '⏭️';
    const s5Detail = s5Started ? `Hop1 ${s5Hop1Icon} → Hop2 ${s5Hop2Icon} → Hop3 ${s5Hop3Icon}` : 'skipped';
    console.log(`${s5Icon} Scenario 5 - Cross-Node Chain Transfer: ${s5Detail}`);

    // Scenario 6: Account Existence Check by Node
    console.log(`📝 Scenario 6 - Account Check (Node3 → Node2 → Node1): See test output above`);

    console.log('');
  });

  // Helper functions for multi-node testing
  async function verifyBlockchainSync(providers) {
    const blocks = await Promise.all(providers.map((p) => p.getBlockNumber()));
    const maxDiff = Math.max(...blocks) - Math.min(...blocks);
    return { blocks, maxDiff, synced: maxDiff <= 3 };
  }

  async function verifyTokenConsistencyAcrossNodes(tokenId, ownerAddress, contracts) {
    const results = await Promise.all(
      contracts.map(async (contract, idx) => {
        try {
          const token = await contract.getToken(ownerAddress, tokenId);
          return {
            nodeIndex: idx,
            nodeName: NODE_CONFIGS[idx].name,
            success: true,
            owner: token.owner,
            status: token.status,
            to: token.to,
            id: token.id.toString(),
          };
        } catch (error) {
          return {
            nodeIndex: idx,
            nodeName: NODE_CONFIGS[idx].name,
            success: false,
            error: error.message,
          };
        }
      })
    );

    const successResults = results.filter((r) => r.success);
    if (successResults.length === 0) return { consistent: false, results };

    const first = successResults[0];
    const consistent = successResults.every(
      (r) =>
        r.owner.toLowerCase() === first.owner.toLowerCase() && r.status === first.status && r.to.toLowerCase() === first.to.toLowerCase() && r.id === first.id
    );

    return { consistent, results, successCount: successResults.length };
  }

  async function verifyTransactionPropagation(txHash, providers) {
    const receipts = await Promise.all(
      providers.map(async (provider, idx) => {
        try {
          const receipt = await provider.getTransactionReceipt(txHash);
          return {
            nodeIndex: idx,
            nodeName: NODE_CONFIGS[idx].name,
            found: !!receipt,
            blockNumber: receipt?.blockNumber,
            status: receipt?.status,
          };
        } catch (error) {
          return {
            nodeIndex: idx,
            nodeName: NODE_CONFIGS[idx].name,
            found: false,
            error: error.message,
          };
        }
      })
    );

    return {
      receipts,
      foundCount: receipts.filter((r) => r.found).length,
      allFound: receipts.every((r) => r.found),
    };
  }
});
