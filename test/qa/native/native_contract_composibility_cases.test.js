const { expect } = require('chai');
const { ethers } = require('hardhat');
const { createClient } = require('../token_grpc');
const accounts = require('../../../deployments/account.json');

const { NATIVE_TOKEN_ADDRESS, NATIVE_ABI, createAuthMetadata, sleep } = require('../../help/NativeTestHelper');

const GRPC_URL = 'dev2-node3-rpc.hamsa-ucl.com:50051';
const RPC = 'http://l2-node3-native.hamsa-ucl.com:8545';

describe('Native Token QA Integration Test', function () {
  this.timeout(300000);

  let client, minterWallet, ownerWallet;
  let minterMetadata, ownerMetadata;
  let qaContract;
  let nativeContract;

  before(async function () {
    client = createClient(GRPC_URL);

    const provider = new ethers.JsonRpcProvider(RPC);
    minterWallet = new ethers.Wallet(accounts.MinterKey, provider);
    ownerWallet = new ethers.Wallet(accounts.OwnerKey, provider);

    console.log('Accounts:');
    console.log('  Minter:', minterWallet.address);
    console.log('  Owner:', ownerWallet.address);
    console.log('  NATIVE_TOKEN_ADDRESS:', NATIVE_TOKEN_ADDRESS);

    minterMetadata = await createAuthMetadata(accounts.MinterKey);
    ownerMetadata = await createAuthMetadata(accounts.OwnerKey);

    nativeContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, minterWallet);

    const NativeTokenQA = await ethers.getContractFactory('NativeTokenQA');
    qaContract = await NativeTokenQA.deploy(NATIVE_TOKEN_ADDRESS);
    await qaContract.waitForDeployment();
    qaContract = qaContract.connect(minterWallet);
    console.log('NativeTokenQA deployed at:', await qaContract.getAddress());
  });

  // Helper function to parse TestResult events from receipt
  function parseTestResultEvents(receipt) {
    const testResults = [];
    for (const log of receipt.logs) {
      try {
        const parsed = qaContract.interface.parseLog(log);
        if (parsed && parsed.name === 'TestResult') {
          testResults.push({
            testName: parsed.args.testName,
            success: parsed.args.success,
            message: parsed.args.message,
          });
        }
      } catch (e) {
        // Skip logs that can't be parsed
      }
    }
    return testResults;
  }

  describe('Case 1: privateSetMintAllowed', function () {
    it('should set mint allowance', async function () {
      console.log('\n=== Case 1: privateSetMintAllowed ===');

      const allowedAmount = 100000000;
      const allowedResponse = await client.encodeElgamalAmount(allowedAmount, ownerMetadata);
      const allowed = {
        id: ethers.toBigInt(allowedResponse.token_id),
        value: {
          cl_x: ethers.toBigInt(allowedResponse.amount.cl_x),
          cl_y: ethers.toBigInt(allowedResponse.amount.cl_y),
          cr_x: ethers.toBigInt(allowedResponse.amount.cr_x),
          cr_y: ethers.toBigInt(allowedResponse.amount.cr_y),
        },
      };
      // #region agent log
      fetch('http://127.0.0.1:7439/ingest/30ecee5e-ef82-4ff1-8fd0-57dcf45cd5a9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'368b2e'},body:JSON.stringify({sessionId:'368b2e',location:'native_contract_composibility_cases.test.js:Case1',message:'allowance set for this address',data:{allowanceFor:minterWallet.address,qaContractAddress:await qaContract.getAddress()},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      // Fix: native token checks msg.sender on mint(); caller is qaContract, so set allowance for qaContract
      const tx = await qaContract.privateSetMintAllowed(await qaContract.getAddress(), allowed, { gasLimit: 100000 });
      const receipt = await tx.wait();
      console.log('  privateSetMintAllowed tx:', tx.hash);

      // Check TestResult events
      const events = parseTestResultEvents(receipt);
      console.log('  TestResult events:', events);
      expect(events.length).to.be.greaterThan(0);
      expect(events[0].testName).to.equal('privateSetMintAllowed');
      expect(events[0].success).to.be.true;
    });
  });

  describe('Case 2.1: mint -> split -> checkTokenIds -> transfer', function () {
    it('should execute mint -> split -> checkTokenIds -> transfer', async function () {
      console.log('\n=== Case 2.1: mint -> split -> checkTokenIds -> transfer ===');
      console.log('  NATIVE_TOKEN_ADDRESS (same as Case 1):', NATIVE_TOKEN_ADDRESS);

      // Step 1: privateMints
      console.log('\nStep 1: privateMints');
      const mintRequest = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [{ address: minterWallet.address, amount: 1000 }],
      };
      const mintResponse = await client.generateBatchMintProof(mintRequest, minterMetadata);

      const recipients = mintResponse.to_accounts.map((account) => account.address);
      const newTokens = mintResponse.to_accounts.map((account) => ({
        id: ethers.toBigInt(account.token.token_id),
        owner: account.address,
        status: 2,
        amount: {
          cl_x: ethers.toBigInt(account.token.cl_x),
          cl_y: ethers.toBigInt(account.token.cl_y),
          cr_x: ethers.toBigInt(account.token.cr_x),
          cr_y: ethers.toBigInt(account.token.cr_y),
        },
        to: account.address,
        rollbackTokenId: 0n,
      }));
      const newAllowed = {
        id: ethers.toBigInt(mintResponse.mint_allowed.token_id),
        value: {
          cl_x: ethers.toBigInt(mintResponse.mint_allowed.cl_x),
          cl_y: ethers.toBigInt(mintResponse.mint_allowed.cl_y),
          cr_x: ethers.toBigInt(mintResponse.mint_allowed.cr_x),
          cr_y: ethers.toBigInt(mintResponse.mint_allowed.cr_y),
        },
      };
      // Proof/publicInputs/padding must match gRPC response and contract verifier; if mint fails, verify consistency here
      const rawProof = mintResponse.proof.map((p) => ethers.toBigInt(p));
      const proof = rawProof.length >= 8 ? rawProof.slice(0, 8) : [...rawProof, ...Array(8 - rawProof.length).fill(0n)];
      const publicInputs = mintResponse.input.map((i) => ethers.toBigInt(i));
      const padding = Math.max(Number(mintResponse.batched_size) - 1, 0);

      // #region agent log
      fetch('http://127.0.0.1:7439/ingest/30ecee5e-ef82-4ff1-8fd0-57dcf45cd5a9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'368b2e'},body:JSON.stringify({sessionId:'368b2e',location:'native_contract_composibility_cases.test.js:Case2.1',message:'caller of mint at native token',data:{qaContractAddress:await qaContract.getAddress(),minterWalletAddress:minterWallet.address,padding,batchedSize:mintResponse.batched_size},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const tx1 = await qaContract.privateMints(recipients, newTokens, newAllowed, proof, publicInputs, padding, { gasLimit: 1000000 });
      const receipt1 = await tx1.wait();
      console.log('  privateMints tx:', tx1.hash);
      console.log('  receipt1.status:', receipt1.status, '(1 = success, 0 = reverted)');
      console.log('  receipt1.gasUsed:', receipt1.gasUsed.toString());

      // Check TestResult events for mint
      const mintedTokenId = newTokens[0].id;
      console.log('  Minted tokenId:', mintedTokenId);
      const mintEvents = parseTestResultEvents(receipt1);
      console.log('  privateMints TestResult:', mintEvents);
      if (mintEvents.length > 0) {
        console.log('  privateMints TestResult (raw message):', mintEvents[0].message);
        // #region agent log
        fetch('http://127.0.0.1:7439/ingest/30ecee5e-ef82-4ff1-8fd0-57dcf45cd5a9',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'368b2e'},body:JSON.stringify({sessionId:'368b2e',location:'native_contract_composibility_cases.test.js:afterMint',message:'mint result',data:{receiptStatus:receipt1.status,innerSuccess:mintEvents[0].success},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
        // #endregion
      }
      expect(mintEvents.length).to.be.greaterThan(0);
      expect(mintEvents[0].testName).to.equal('privateMints');
      expect(mintEvents[0].success).to.be.true;

      // Step 2: privateSplit (single transfer recipient)
      console.log('\nStep 2: privateSplit');
      const splitRequest = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [{ address: accounts.To1, amount: 100, comment: 'split-transfer' }],
      };
      const splitProofResponse = await client.generateBatchSplitToken(splitRequest, minterMetadata);
      await sleep(2000);

      const detailResponse = await client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, minterMetadata);

      const splitRecipients = detailResponse.to_addresses;
      const consumedIds = detailResponse.consumedIds.map((ids) => ethers.toBigInt(ids.token_id));
      const splitNewTokens = detailResponse.newTokens.map((account, idx) => ({
        id: ethers.toBigInt(account.token_id),
        owner: minterWallet.address,
        status: 2,
        amount: {
          cl_x: ethers.toBigInt(account.cl_x),
          cl_y: ethers.toBigInt(account.cl_y),
          cr_x: ethers.toBigInt(account.cr_x),
          cr_y: ethers.toBigInt(account.cl_y),
        },
        to: idx % 2 === 0 ? minterWallet.address : splitRecipients[Math.floor(idx / 2)],
        rollbackTokenId: idx % 2 === 0 ? 0n : ethers.toBigInt(detailResponse.newTokens[idx + 1]?.token_id ?? 0),
      }));
      const rawSplitProof = detailResponse.proof.map((p) => ethers.toBigInt(p));
      const splitProof = rawSplitProof.length >= 8 ? rawSplitProof.slice(0, 8) : [...rawSplitProof, ...Array(8 - rawSplitProof.length).fill(0n)];
      const splitPublicInputs = detailResponse.public_input.map((i) => ethers.toBigInt(i));
      const splitPaddingNum = detailResponse.batched_size - splitRecipients.length;

      const tx2 = await qaContract.privateSplit(
        minterWallet.address,
        splitRecipients,
        consumedIds,
        splitNewTokens,
        splitProof,
        splitPublicInputs,
        splitPaddingNum,
        { gasLimit: 100000 }
      );
      const receipt2 = await tx2.wait();
      console.log('  privateSplit tx:', tx2.hash);

      // Check TestResult events for split
      const splitEvents = parseTestResultEvents(receipt2);
      console.log('  privateSplit TestResult:', splitEvents);
      expect(splitEvents.length).to.be.greaterThan(0);
      expect(splitEvents[0].testName).to.equal('privateSplit');
      expect(splitEvents[0].success).to.be.true;

      // Wait for split to be fully processed
      await sleep(3000);

      // Get the tokenId for transfer (odd index - the one intended for To1)
      const transferTokenId = splitNewTokens.find((_, idx) => idx % 2 === 1)?.id;
      console.log('  Transfer tokenId:', transferTokenId);

      // Step 3: checkTokenIds (check token is associated with To1 for transfer preparation)
      console.log('\nStep 3: checkTokenIds');
      let checkedResults;
      try {
        // After split, owner of the transfer token is still minter; only after transfer() does owner change
        // Try calling directly from native contract first
        console.log('  Checking token directly from native contract...');
        checkedResults = await nativeContract.checkTokenIds(accounts.To1, [transferTokenId]);
        console.log('  Native checkTokenIds result:', checkedResults);
      } catch (e) {
        console.log('  checkTokenIds failed:', e.message || e.code);
        checkedResults = [];
      }

      // Step 4: transfer — minter (owner) 直接调 native 合约（native token 校验 msg.sender === owner）
      console.log('\nStep 4: transfer');
      const tx3 = await nativeContract.transfer(transferTokenId, 'transfer-memo', { gasLimit: 100000 });
      const receipt3 = await tx3.wait();
      console.log('  transfer tx:', tx3.hash);
      expect(receipt3.status).to.equal(1, 'native transfer tx should succeed');

      console.log('\n=== Case 2.1 completed ===');
    });
  });

  describe.skip('Case 2.2: mint -> split -> checkTokenIds -> burn', function () {
    it('should execute mint -> split -> checkTokenIds -> burn', async function () {
      console.log('\n=== Case 2.2: mint -> split -> checkTokenIds -> burn ===');

      // Step 1: privateMints
      console.log('\nStep 1: privateMints');
      const mintRequest = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [{ address: minterWallet.address, amount: 1000 }],
      };
      const mintResponse = await client.generateBatchMintProof(mintRequest, minterMetadata);

      const recipients = mintResponse.to_accounts.map((account) => account.address);
      const newTokens = mintResponse.to_accounts.map((account) => ({
        id: ethers.toBigInt(account.token.token_id),
        owner: account.address,
        status: 2,
        amount: {
          cl_x: ethers.toBigInt(account.token.cl_x),
          cl_y: ethers.toBigInt(account.token.cl_y),
          cr_x: ethers.toBigInt(account.token.cr_x),
          cr_y: ethers.toBigInt(account.token.cr_y),
        },
        to: account.address,
        rollbackTokenId: 0n,
      }));
      const newAllowed = {
        id: ethers.toBigInt(mintResponse.mint_allowed.token_id),
        value: {
          cl_x: ethers.toBigInt(mintResponse.mint_allowed.cl_x),
          cl_y: ethers.toBigInt(mintResponse.mint_allowed.cl_y),
          cr_x: ethers.toBigInt(mintResponse.mint_allowed.cr_x),
          cr_y: ethers.toBigInt(mintResponse.mint_allowed.cr_y),
        },
      };
      const rawProof = mintResponse.proof.map((p) => ethers.toBigInt(p));
      const proof = rawProof.length >= 8 ? rawProof.slice(0, 8) : [...rawProof, ...Array(8 - rawProof.length).fill(0n)];
      const publicInputs = mintResponse.input.map((i) => ethers.toBigInt(i));
      const padding = Math.max(Number(mintResponse.batched_size) - 1, 0);

      const tx1 = await qaContract.privateMints(recipients, newTokens, newAllowed, proof, publicInputs, padding, { gasLimit: 1000000 });
      await tx1.wait();
      console.log('  privateMints tx:', tx1.hash);

      const mintedTokenId = newTokens[0].id;
      console.log('  Minted tokenId:', mintedTokenId);

      // Step 2: privateSplit (single burn recipient)
      console.log('\nStep 2: privateSplit');
      const splitRequest = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [{ address: minterWallet.address, amount: 100, comment: 'split-burn' }],
      };
      const splitProofResponse = await client.generateBatchSplitToken(splitRequest, minterMetadata);
      await sleep(2000);

      const detailResponse = await client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, minterMetadata);

      const splitRecipients = detailResponse.to_addresses;
      const consumedIds = detailResponse.consumedIds.map((ids) => ethers.toBigInt(ids.token_id));
      const splitNewTokens = detailResponse.newTokens.map((account, idx) => ({
        id: ethers.toBigInt(account.token_id),
        owner: minterWallet.address,
        status: 2,
        amount: {
          cl_x: ethers.toBigInt(account.cl_x),
          cl_y: ethers.toBigInt(account.cl_y),
          cr_x: ethers.toBigInt(account.cr_x),
          cr_y: ethers.toBigInt(account.cl_y),
        },
        to: idx % 2 === 0 ? minterWallet.address : splitRecipients[Math.floor(idx / 2)],
        rollbackTokenId: idx % 2 === 0 ? 0n : ethers.toBigInt(detailResponse.newTokens[idx + 1]?.token_id ?? 0),
      }));
      const rawSplitProof = detailResponse.proof.map((p) => ethers.toBigInt(p));
      const splitProof = rawSplitProof.length >= 8 ? rawSplitProof.slice(0, 8) : [...rawSplitProof, ...Array(8 - rawSplitProof.length).fill(0n)];
      const splitPublicInputs = detailResponse.public_input.map((i) => ethers.toBigInt(i));
      const splitPaddingNum = detailResponse.batched_size - splitRecipients.length;

      const tx2 = await qaContract.privateSplit(
        minterWallet.address,
        splitRecipients,
        consumedIds,
        splitNewTokens,
        splitProof,
        splitPublicInputs,
        splitPaddingNum,
        { gasLimit: 100000 }
      );
      await tx2.wait();
      console.log('  privateSplit tx:', tx2.hash);

      // Wait for split to be fully processed
      await sleep(3000);

      // Get the tokenId for burn (odd index)
      const burnTokenId = splitNewTokens.find((_, idx) => idx % 2 === 1)?.id;
      console.log('  Burn tokenId:', burnTokenId);

      // Step 3: checkTokenIds (only check the burn token)
      console.log('\nStep 3: checkTokenIds');
      let checkedResults;
      try {
        // Try calling directly from native contract
        console.log('  Checking token directly from native contract...');
        checkedResults = await nativeContract.checkTokenIds(minterWallet.address, [burnTokenId]);
        console.log('  Native checkTokenIds result:', checkedResults);
      } catch (e) {
        console.log('  checkTokenIds failed:', e.message || e.code);
        checkedResults = [];
      }

      // Step 4: burn — minter (owner) 直接调 native 合约（native token 校验 msg.sender === owner）
      console.log('\nStep 4: burn');
      const tx3 = await nativeContract.burn(burnTokenId, { gasLimit: 100000 });
      await tx3.wait();
      console.log('  burn tx:', tx3.hash);

      console.log('\n=== Case 2.2 completed ===');
    });
  });

  describe.skip('Case 3: mint -> split (2 recipients) -> transfer both tokens', function () {
    it('should mint, split to 2 addresses, then transfer both tokens', async function () {
      console.log('\n=== Case 3: mint -> split (2 recipients) -> transfer both tokens ===');

      // Step 1: privateMints
      console.log('\nStep 1: privateMints');
      const mintRequest = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [{ address: minterWallet.address, amount: 1000 }],
      };
      const mintResponse = await client.generateBatchMintProof(mintRequest, minterMetadata);

      const recipients = mintResponse.to_accounts.map((account) => account.address);
      const newTokens = mintResponse.to_accounts.map((account) => ({
        id: ethers.toBigInt(account.token.token_id),
        owner: account.address,
        status: 2,
        amount: {
          cl_x: ethers.toBigInt(account.token.cl_x),
          cl_y: ethers.toBigInt(account.token.cl_y),
          cr_x: ethers.toBigInt(account.token.cr_x),
          cr_y: ethers.toBigInt(account.token.cr_y),
        },
        to: account.address,
        rollbackTokenId: 0n,
      }));
      const newAllowed = {
        id: ethers.toBigInt(mintResponse.mint_allowed.token_id),
        value: {
          cl_x: ethers.toBigInt(mintResponse.mint_allowed.cl_x),
          cl_y: ethers.toBigInt(mintResponse.mint_allowed.cl_y),
          cr_x: ethers.toBigInt(mintResponse.mint_allowed.cr_x),
          cr_y: ethers.toBigInt(mintResponse.mint_allowed.cr_y),
        },
      };
      const rawProof = mintResponse.proof.map((p) => ethers.toBigInt(p));
      const proof = rawProof.length >= 8 ? rawProof.slice(0, 8) : [...rawProof, ...Array(8 - rawProof.length).fill(0n)];
      const publicInputs = mintResponse.input.map((i) => ethers.toBigInt(i));
      const padding = Math.max(Number(mintResponse.batched_size) - 1, 0);

      const tx1 = await qaContract.privateMints(recipients, newTokens, newAllowed, proof, publicInputs, padding, { gasLimit: 1000000 });
      await tx1.wait();
      console.log('  privateMints tx:', tx1.hash);

      const mintedTokenId = newTokens[0].id;
      console.log('  Minted tokenId:', mintedTokenId);

      // Step 2: privateSplit (2 recipients)
      console.log('\nStep 2: privateSplit (2 recipients)');
      const node2AdminAddress = '0x93d2Ce0461C2612F847e074434d9951c32e44327';
      const splitRequest = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [
          { address: accounts.To1, amount: 100, comment: 'split-to1' },
          { address: node2AdminAddress, amount: 100, comment: 'split-node2' },
        ],
      };
      const splitProofResponse = await client.generateBatchSplitToken(splitRequest, minterMetadata);
      await sleep(2000);

      const detailResponse = await client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, minterMetadata);

      const splitRecipients = detailResponse.to_addresses;
      const consumedIds = detailResponse.consumedIds.map((ids) => ethers.toBigInt(ids.token_id));
      const splitNewTokens = detailResponse.newTokens.map((account, idx) => ({
        id: ethers.toBigInt(account.token_id),
        owner: minterWallet.address,
        status: 2,
        amount: {
          cl_x: ethers.toBigInt(account.cl_x),
          cl_y: ethers.toBigInt(account.cl_y),
          cr_x: ethers.toBigInt(account.cr_x),
          cr_y: ethers.toBigInt(account.cl_y),
        },
        to: idx % 2 === 0 ? minterWallet.address : splitRecipients[Math.floor(idx / 2)],
        rollbackTokenId: idx % 2 === 0 ? 0n : ethers.toBigInt(detailResponse.newTokens[idx + 1]?.token_id ?? 0),
      }));
      const rawSplitProof = detailResponse.proof.map((p) => ethers.toBigInt(p));
      const splitProof = rawSplitProof.length >= 8 ? rawSplitProof.slice(0, 8) : [...rawSplitProof, ...Array(8 - rawSplitProof.length).fill(0n)];
      const splitPublicInputs = detailResponse.public_input.map((i) => ethers.toBigInt(i));
      const splitPaddingNum = detailResponse.batched_size - splitRecipients.length;

      const tx2 = await qaContract.privateSplit(
        minterWallet.address,
        splitRecipients,
        consumedIds,
        splitNewTokens,
        splitProof,
        splitPublicInputs,
        splitPaddingNum,
        { gasLimit: 100000 }
      );
      await tx2.wait();
      console.log('  privateSplit tx:', tx2.hash);

      // Wait for split to be fully processed
      await sleep(3000);

      // Get both tokenIds for transfer (odd indices - the ones going to recipients)
      const transferTokenIds = splitNewTokens.filter((_, idx) => idx % 2 === 1).map((t) => t.id);
      console.log('  Transfer tokenIds:', transferTokenIds);

      // Step 3: checkTokenIds (check both tokens)
      console.log('\nStep 3: checkTokenIds');
      let checkedResults;
      try {
        console.log('  Checking tokens directly from native contract...');
        checkedResults = await nativeContract.checkTokenIds(accounts.To1, [transferTokenIds[0]]);
        console.log('  Token for To1 checkTokenIds result:', checkedResults);
        const checkedResults2 = await nativeContract.checkTokenIds(node2AdminAddress, [transferTokenIds[1]]);
        console.log('  Token for node2 checkTokenIds result:', checkedResults2);
      } catch (e) {
        console.log('  checkTokenIds failed:', e.message || e.code);
        checkedResults = [];
      }

      // Step 4: transfer (both tokens) — minter (owner) 直接调 native 合约，逐个 transfer
      console.log('\nStep 4: transfer (both tokens)');
      const memos = transferTokenIds.map((_, i) => `transfer-${i + 1}`);
      const tx3a = await nativeContract.transfer(transferTokenIds[0], memos[0], { gasLimit: 100000 });
      await tx3a.wait();
      const tx3b = await nativeContract.transfer(transferTokenIds[1], memos[1], { gasLimit: 100000 });
      await tx3b.wait();
      console.log('  transfer tx:', tx3a.hash, tx3b.hash);

      console.log('\n=== Case 3 completed ===');
    });
  });
});
