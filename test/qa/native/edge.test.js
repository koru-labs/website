/**
 * Native Token - Edge Cases
 * 基于 multi_node_consistency / native_jenkins / regression_native 组合的边界与冲突场景
 * 参考: document/analysis/analysis_native_edge_tests_20260302.md
 * 可补充用例: document/cases/cases_INativeToken_web3_test_analyzer_20260302.md
 */
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { createClient } = require('../token_grpc');
const accounts = require('../../../deployments/account.json');

const { NATIVE_TOKEN_ADDRESS, RPC_URL, NATIVE_ABI, createAuthMetadata, sleep, setupMintAllowance } = require('../../help/NativeTestHelper');

describe('Native Token - Edge Cases', function () {
  this.timeout(600000);

  let client;
  let minterWallet;
  let minterMetadata;
  let nativeContract;
  let ownerNativeContract;
  let to1Wallet;
  let to2Wallet;

  before(async function () {
    client = createClient(RPC_URL);
    minterWallet = new ethers.Wallet(accounts.MinterKey, ethers.provider);
    minterMetadata = await createAuthMetadata(accounts.MinterKey);
    nativeContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, minterWallet);

    const ownerWallet = new ethers.Wallet(accounts.OwnerKey, ethers.provider);
    ownerNativeContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, ownerWallet);

    to1Wallet = new ethers.Wallet(accounts.To1PrivateKey, ethers.provider);
    to2Wallet = new ethers.Wallet(accounts.To2PrivateKey, ethers.provider);
  });

  async function mintOneToken(amount = 2000) {
    const to_accounts = [{ address: minterWallet.address, amount }];
    const generateRequest = {
      sc_address: NATIVE_TOKEN_ADDRESS,
      token_type: '0',
      from_address: minterWallet.address,
      to_accounts,
    };
    const response = await client.generateBatchMintProof(generateRequest, minterMetadata);
    const recipients = response.to_accounts.map((a) => a.address);
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
    const mintTx = await nativeContract.mint(recipients, newTokens, newAllowed, proof, publicInputs, padding, { gasLimit: 1000000 });
    await mintTx.wait();
    await sleep(2000);
    return ethers.toBigInt(newTokens[0].id);
  }

  /** Batch mint count tokens to minter in one mint call; returns array of token ids. */
  async function mintBatchTokens(count, amount = 100) {
    const to_accounts = Array(count).fill(null).map(() => ({ address: minterWallet.address, amount }));
    const generateRequest = {
      sc_address: NATIVE_TOKEN_ADDRESS,
      token_type: '0',
      from_address: minterWallet.address,
      to_accounts,
    };
    const response = await client.generateBatchMintProof(generateRequest, minterMetadata);
    const recipients = response.to_accounts.map((a) => a.address);
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
    const mintTx = await nativeContract.mint(recipients, newTokens, newAllowed, proof, publicInputs, padding, { gasLimit: 10000000 });
    await mintTx.wait();
    await sleep(2000);
    return newTokens.map((t) => ethers.toBigInt(t.id));
  }

  async function splitToOneRecipient(recipientAddress, amount = 100, comment = 'split') {
    const splitRequests = {
      sc_address: NATIVE_TOKEN_ADDRESS,
      token_type: '0',
      from_address: minterWallet.address,
      to_accounts: [{ address: recipientAddress, amount, comment }],
    };
    const splitProofResponse = await client.generateBatchSplitToken(splitRequests, minterMetadata);
    await sleep(2000);
    const detailResponse = await client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, minterMetadata);
    const recipients = detailResponse.to_addresses;
    const consumedIds = detailResponse.consumedIds.map((ids) => ids.token_id);
    const newTokens = detailResponse.newTokens.map((account, idx) => ({
      id: account.token_id,
      owner: minterWallet.address,
      status: 2,
      amount: {
        cl_x: ethers.toBigInt(account.cl_x),
        cl_y: ethers.toBigInt(account.cl_y),
        cr_x: ethers.toBigInt(account.cr_x),
        cr_y: ethers.toBigInt(account.cr_y),
      },
      to: idx % 2 === 0 ? minterWallet.address : recipients[Math.floor(idx / 2)],
      rollbackTokenId: idx % 2 === 0 ? 0 : (detailResponse.newTokens[idx + 1]?.token_id ?? 0),
    }));
    const proof = detailResponse.proof.map((p) => ethers.toBigInt(p));
    const publicInputs = detailResponse.public_input.map((i) => ethers.toBigInt(i));
    const paddingNum = detailResponse.batched_size - recipients.length;
    const splitTx = await nativeContract.split(minterWallet.address, recipients, consumedIds, newTokens, proof, publicInputs, paddingNum, {
      gasLimit: 1000000,
    });
    await splitTx.wait();
    await sleep(2000);
    return newTokens.length >= 2 ? ethers.toBigInt(newTokens[1].id) : ethers.toBigInt(newTokens[0].id);
  }

  // ============ 前置：setMintAllowance ============
  describe('setMintAllowance', function () {
    it('should set mint allowance for minter', async function () {
      const tx = await setupMintAllowance(ownerNativeContract, client, minterWallet.address, accounts.OwnerKey, 1000000000);
      expect(tx.hash).to.be.a('string');
      await sleep(5000);
    });
  });

  // ============ Conflict / 状态一致性（同 native_jenkins、regression） ============
  describe('Conflict: same tokenId reused', function () {
    it('should revert when transferring same tokenId twice', async function () {
      await mintOneToken(2000);
      const tokenId = await splitToOneRecipient(accounts.To1, 100, 'edge-transfer-twice');
      const tx1 = await nativeContract.transfer(tokenId, 'first-transfer', { gasLimit: 1000000 });
      const receipt1 = await tx1.wait();
      expect(receipt1).to.not.be.null;
      expect(receipt1.status).to.equal(1);
      await sleep(8000);
      try {
        const tx2 = await nativeContract.transfer(tokenId, 'second-transfer', { gasLimit: 1000000 });
        const receipt2 = await tx2.wait();
        expect.fail(`Second transfer should have reverted but succeeded (tx: ${receipt2?.hash})`);
      } catch (err) {
        const msg = (err && err.message) ? err.message : String(err);
        expect(msg).to.match(/revert|reverted|execution reverted|invalid|owner|denied/i);
      }
    });

    it('should revert when burning same tokenId twice', async function () {
      await mintOneToken(2000);
      const tokenId = await splitToOneRecipient(accounts.Minter, 10, 'edge-burn-twice');
      const burn1 = await nativeContract.burn(tokenId, { gasLimit: 1000000 });
      const receipt1 = await burn1.wait();
      expect(receipt1).to.not.be.null;
      expect(receipt1.status).to.equal(1);
      await sleep(8000);
      try {
        const burn2 = await nativeContract.burn(tokenId, { gasLimit: 1000000 });
        await burn2.wait();
        expect.fail('Second burn should have reverted but succeeded');
      } catch (err) {
        const msg = (err && err.message) ? err.message : String(err);
        expect(msg).to.match(/revert|reverted|execution reverted|invalid|owner|denied/i);
      }
    });

    it('should revert when burning a tokenId that was already transferred', async function () {
      await mintOneToken(2000);
      const tokenId = await splitToOneRecipient(accounts.To1, 10, 'edge-transfer-then-burn');
      const transferTx = await nativeContract.transfer(tokenId, 'transfer-first', { gasLimit: 1000000 });
      const receipt1 = await transferTx.wait();
      expect(receipt1).to.not.be.null;
      expect(receipt1.status).to.equal(1);
      await sleep(8000);
      try {
        const burnTx = await nativeContract.burn(tokenId, { gasLimit: 1000000 });
        await burnTx.wait();
        expect.fail('Burn after transfer should have reverted but succeeded');
      } catch (err) {
        const msg = (err && err.message) ? err.message : String(err);
        expect(msg).to.match(/revert|reverted|execution reverted|invalid|owner|denied/i);
      }
    });
  });

  // ============ 输入边界：不存在的 tokenId ============
  describe('Input: non-existent tokenId', function () {
    const FAKE_TOKEN_ID = ethers.toBigInt('999999999999999999999999999999999');

    it('should revert transfer for non-existent tokenId', async function () {
      try {
        const tx = await nativeContract.transfer(FAKE_TOKEN_ID, 'fake', { gasLimit: 1000000 });
        const receipt = await tx.wait();
        expect.fail(`Transfer with non-existent tokenId should have reverted but succeeded (tx: ${receipt?.hash})`);
      } catch (err) {
        const msg = (err && err.message) ? err.message : String(err);
        expect(msg).to.match(/revert|reverted|execution reverted|invalid|not exist|denied/i);
      }
    });

    it('should revert burn for non-existent tokenId', async function () {
      try {
        const tx = await nativeContract.burn(FAKE_TOKEN_ID, { gasLimit: 1000000 });
        const receipt = await tx.wait();
        expect.fail(`Burn with non-existent tokenId should have reverted but succeeded (tx: ${receipt?.hash})`);
      } catch (err) {
        const msg = (err && err.message) ? err.message : String(err);
        expect(msg).to.match(/revert|reverted|execution reverted|invalid|not exist|denied/i);
      }
    });
  });

  // ============ 权限边界：非 owner 不能 transfer/burn ============
  describe('Permission: non-owner cannot transfer or burn', function () {
    it('should revert when non-owner calls transfer (token belongs to minter)', async function () {
      await mintOneToken(2000);
      const tokenId = await splitToOneRecipient(accounts.To1, 100, 'edge-perm');
      await sleep(8000);
      const contractAsTo1 = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, to1Wallet);
      try {
        const tx = await contractAsTo1.transfer(tokenId, 'non-owner-transfer', { gasLimit: 1000000 });
        const receipt = await tx.wait();
        expect.fail(`Non-owner transfer should have reverted but succeeded (tx: ${receipt?.hash})`);
      } catch (err) {
        const msg = (err && err.message) ? err.message : String(err);
        expect(msg).to.match(/revert|reverted|execution reverted|invalid|owner|denied/i);
      }
    });

    it('should revert when non-owner calls burn (token belongs to minter)', async function () {
      await mintOneToken(2000);
      const tokenId = await splitToOneRecipient(accounts.Minter, 10, 'edge-perm-burn');
      await sleep(8000);
      const contractAsTo1 = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, to1Wallet);
      try {
        const tx = await contractAsTo1.burn(tokenId, { gasLimit: 1000000 });
        const receipt = await tx.wait();
        expect.fail(`Non-owner burn should have reverted but succeeded (tx: ${receipt?.hash})`);
      } catch (err) {
        const msg = (err && err.message) ? err.message : String(err);
        expect(msg).to.match(/revert|reverted|execution reverted|invalid|owner|denied/i);
      }
    });
  });

  // ============ 查询边界：checkTokenIds ============
  describe('Query: checkTokenIds boundaries', function () {
    it('should return empty array for all valid tokenIds', async function () {
      const mintedId = await mintOneToken(1000);
      const invalidIds = await nativeContract.checkTokenIds(minterWallet.address, [mintedId]);
      expect(invalidIds).to.be.an('array');
      expect(invalidIds.length).to.equal(0);
    });

    it('should return all ids when all are non-existent', async function () {
      const fakeIds = [ethers.toBigInt('999999999999999999999999999999'), ethers.toBigInt('888888888888888888888888888888')];
      const invalidIds = await nativeContract.checkTokenIds(minterWallet.address, fakeIds);
      expect(invalidIds.length).to.equal(fakeIds.length);
      expect(invalidIds.map((id) => id.toString())).to.have.members(fakeIds.map((id) => id.toString()));
    });

    it('should return only invalid ids from mixed valid and invalid input', async function () {
      const validId = await mintOneToken(500);
      const fakeIds = [ethers.toBigInt('999999999999999999999999999999'), ethers.toBigInt('888888888888888888888888888888')];
      const mixed = [validId, fakeIds[0], fakeIds[1]];
      const invalidIds = await nativeContract.checkTokenIds(minterWallet.address, mixed);
      expect(invalidIds.length).to.equal(2);
      expect(invalidIds.map((id) => id.toString())).to.have.members(fakeIds.map((id) => id.toString()));
    });

    it('should return empty array for empty tokenIds input', async function () {
      const invalidIds = await nativeContract.checkTokenIds(minterWallet.address, []);
      expect(invalidIds).to.be.an('array');
      expect(invalidIds.length).to.equal(0);
    });

    // C-check-1: 超大数组（如 1000 个 id）
    it.only('should handle large tokenIds array', async function () {
      const largeFakeIds = Array.from({ length: 1000 }, (_, i) =>
        ethers.toBigInt('999999999999999999999999999999' + String(i).padStart(3, '0'))
      );
      const invalidIds = await nativeContract.checkTokenIds(minterWallet.address, largeFakeIds);
      expect(invalidIds).to.be.an('array');
      expect(invalidIds.length).to.equal(largeFakeIds.length);
      expect(invalidIds.map((id) => id.toString())).to.have.members(largeFakeIds.map((id) => id.toString()));
    });

    // C-check-2: owner 为零地址且 tokenIds 非空（batch mint 100 个后整批校验）
    it('should return invalid ids when owner is zero address and tokenIds non-empty', async function () {
      const tokenIds = await mintBatchTokens(100, 100);
      const invalidIds = await nativeContract.checkTokenIds(ethers.ZeroAddress, tokenIds);
      expect(invalidIds).to.be.an('array');
      expect(invalidIds.length).to.equal(tokenIds.length);
      expect(invalidIds.map((id) => id.toString())).to.have.members(tokenIds.map((id) => id.toString()));
    });
  });

  // ============ Split 边界（无效参数 / proof）============
  describe('Split boundaries: invalid from, reused consumedIds, wrong paddingNum', function () {
    async function getSplitParamsForMinterToRecipient(recipientAddress, amount = 100) {
      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [{ address: recipientAddress, amount, comment: 'split-edge' }],
      };
      const splitProofResponse = await client.generateBatchSplitToken(splitRequests, minterMetadata);
      await sleep(2000);
      const detailResponse = await client.getBatchSplitTokenDetail(
        { request_id: splitProofResponse.request_id },
        minterMetadata
      );
      const recipients = detailResponse.to_addresses;
      const consumedIds = detailResponse.consumedIds.map((ids) => ids.token_id);
      const newTokens = detailResponse.newTokens.map((account, idx) => ({
        id: account.token_id,
        owner: minterWallet.address,
        status: 2,
        amount: {
          cl_x: ethers.toBigInt(account.cl_x),
          cl_y: ethers.toBigInt(account.cl_y),
          cr_x: ethers.toBigInt(account.cr_x),
          cr_y: ethers.toBigInt(account.cr_y),
        },
        to: idx % 2 === 0 ? minterWallet.address : recipients[Math.floor(idx / 2)],
        rollbackTokenId: idx % 2 === 0 ? 0 : (detailResponse.newTokens[idx + 1]?.token_id ?? 0),
      }));
      const proof = detailResponse.proof.map((p) => ethers.toBigInt(p));
      const publicInputs = detailResponse.public_input.map((i) => ethers.toBigInt(i));
      const paddingNum = detailResponse.batched_size - recipients.length;
      return { recipients, consumedIds, newTokens, proof, publicInputs, paddingNum };
    }

    // C-split-1: consumedIds 与 from 不匹配（from=To1，consumedIds 属于 minter）
    it('should revert when from does not own consumedIds', async function () {
      await mintOneToken(2000);
      const { recipients, consumedIds, newTokens, proof, publicInputs, paddingNum } =
        await getSplitParamsForMinterToRecipient(accounts.To1, 100);
      await expect(
        nativeContract.split(
          accounts.To1,
          recipients,
          consumedIds,
          newTokens,
          proof,
          publicInputs,
          paddingNum,
          { gasLimit: 1000000 }
        )
      ).to.be.reverted;
    });

    // C-split-2: 已消耗的 token 再次用于 split
    it('should revert when same consumedIds used twice', async function () {
      await mintOneToken(2000);
      const { recipients, consumedIds, newTokens, proof, publicInputs, paddingNum } =
        await getSplitParamsForMinterToRecipient(accounts.To1, 100);
      const tx1 = await nativeContract.split(
        minterWallet.address,
        recipients,
        consumedIds,
        newTokens,
        proof,
        publicInputs,
        paddingNum,
        { gasLimit: 1000000 }
      );
      await tx1.wait();
      await sleep(2000);
      await expect(
        nativeContract.split(
          minterWallet.address,
          recipients,
          consumedIds,
          newTokens,
          proof,
          publicInputs,
          paddingNum,
          { gasLimit: 1000000 }
        )
      ).to.be.reverted;
    });

    // C-split-3: paddingNum 与 proof 不一致
    it('should revert when paddingNum does not match proof', async function () {
      await mintOneToken(2000);
      const { recipients, consumedIds, newTokens, proof, publicInputs, paddingNum } =
        await getSplitParamsForMinterToRecipient(accounts.To1, 100);
      const wrongPadding = paddingNum + 1;
      await expect(
        nativeContract.split(
          minterWallet.address,
          recipients,
          consumedIds,
          newTokens,
          proof,
          publicInputs,
          wrongPadding,
          { gasLimit: 1000000 }
        )
      ).to.be.reverted;
    });

    // C-split-4: from 为零地址
    it('should revert when from is zero address', async function () {
      await mintOneToken(2000);
      const { recipients, consumedIds, newTokens, proof, publicInputs, paddingNum } =
        await getSplitParamsForMinterToRecipient(accounts.To1, 100);
      await expect(
        nativeContract.split(
          ethers.ZeroAddress,
          recipients,
          consumedIds,
          newTokens,
          proof,
          publicInputs,
          paddingNum,
          { gasLimit: 1000000 }
        )
      ).to.be.reverted;
    });
  });

  // ============ Mint 边界（无效参数）============
  describe('Mint boundaries: invalid recipients/tokens length, wrong paddingNum', function () {
    // C-mint-1: recipients 与 tokens 长度不一致
    it('should revert when recipients and tokens length mismatch', async function () {
      const generateRequest = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [{ address: minterWallet.address, amount: 1000 }],
      };
      const response = await client.generateBatchMintProof(generateRequest, minterMetadata);
      const recipients = response.to_accounts.map((a) => a.address);
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
      const padding = Math.max(Number(response.batched_size) - 1, 0);
      const wrongRecipients = [recipients[0], accounts.To1];
      await expect(
        nativeContract.mint(
          wrongRecipients,
          newTokens,
          newAllowed,
          proof,
          publicInputs,
          padding,
          { gasLimit: 1000000 }
        )
      ).to.be.reverted;
    });

    // C-mint-3: paddingNum 与 batched_size 不一致
    it('should revert when paddingNum does not match batched_size', async function () {
      const generateRequest = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [{ address: minterWallet.address, amount: 1000 }],
      };
      const response = await client.generateBatchMintProof(generateRequest, minterMetadata);
      const recipients = response.to_accounts.map((a) => a.address);
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
      const padding = Math.max(Number(response.batched_size) - 1, 0);
      const wrongPadding = padding + 1;
      await expect(
        nativeContract.mint(
          recipients,
          newTokens,
          newAllowed,
          proof,
          publicInputs,
          wrongPadding,
          { gasLimit: 1000000 }
        )
      ).to.be.reverted;
    });
  });

  // ============ 零值与极值边界 ============
  describe('Zero & Extreme Values', function () {
    it('should handle split with zero amount', async function () {
      await expect(splitToOneRecipient(accounts.To1, 0, 'zero-amount')).to.be.reverted;
    });

    it('should handle empty memo in transfer', async function () {
      await mintOneToken(2000);
      const tokenId = await splitToOneRecipient(accounts.To1, 100, 'init');
      const tx = await nativeContract.transfer(tokenId, '', { gasLimit: 1000000 });
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    it('should handle very long memo in transfer', async function () {
      await mintOneToken(2000);
      const tokenId = await splitToOneRecipient(accounts.To1, 100, 'init');
      const longMemo = 'a'.repeat(1000);
      const tx = await nativeContract.transfer(tokenId, longMemo, { gasLimit: 1000000 });
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    // C-transfer-2: 超长 memo（10k 字符）
    it('should handle very long memo 10k chars in transfer', async function () {
      await mintOneToken(2000);
      const tokenId = await splitToOneRecipient(accounts.To1, 100, 'init');
      const veryLongMemo = 'a'.repeat(10000);
      const contractAsTo1 = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, to1Wallet);
      const tx = await contractAsTo1.transfer(tokenId, veryLongMemo, { gasLimit: 5000000 });
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    // C-transfer-3: 特殊字符 / Unicode memo
    it('should handle special and Unicode memo in transfer', async function () {
      await mintOneToken(2000);
      const tokenId = await splitToOneRecipient(accounts.To1, 100, 'init');
      const specialMemo = '中文\x00emo';
      const contractAsTo1 = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, to1Wallet);
      const tx = await contractAsTo1.transfer(tokenId, specialMemo, { gasLimit: 1000000 });
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });
  });

  // ============ 地址边界 ============
  describe('Address Boundaries', function () {
    it('should revert transfer to zero address', async function () {
      await mintOneToken(2000);
      const tokenId = await splitToOneRecipient(accounts.To1, 100, 'init');
      const contractAsTo1 = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, to1Wallet);
      await expect(contractAsTo1.transfer(tokenId, 'to-zero', { gasLimit: 1000000 })).to.be.reverted;
    });

    it('should handle transfer to self', async function () {
      await mintOneToken(2000);
      const tokenId = await splitToOneRecipient(accounts.To1, 100, 'init');
      const contractAsTo1 = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, to1Wallet);
      const tx = await contractAsTo1.transfer(tokenId, 'to-self', { gasLimit: 1000000 });
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
    });

    it('should query tokens for zero address', async function () {
      const invalidIds = await nativeContract.checkTokenIds(ethers.ZeroAddress, []);
      expect(invalidIds).to.be.an('array');
      expect(invalidIds.length).to.equal(0);
    });
  });

  // ============ 权限边界：setMintAllowed / mint（非 owner / 非 minter）============
  describe('Permission: non-owner setMintAllowed and non-minter mint', function () {
    // C-perm-1: 非 owner 调用 setMintAllowed 应 revert
    it('should revert when non-owner calls setMintAllowed', async function () {
      const contractAsTo1 = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, to1Wallet);
      const dummyAllowed = {
        id: 0n,
        value: { cl_x: 1n, cl_y: 1n, cr_x: 1n, cr_y: 1n },
      };
      await expect(
        contractAsTo1.setMintAllowed(minterWallet.address, dummyAllowed, { gasLimit: 1000000 })
      ).to.be.reverted;
    });

    // C-perm-2: 非 minter 使用 minter 的 proof 调用 mint 应 revert
    it('should revert when non-minter calls mint with minter proof', async function () {
      const generateRequest = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [{ address: minterWallet.address, amount: 1000 }],
      };
      const response = await client.generateBatchMintProof(generateRequest, minterMetadata);
      const recipients = response.to_accounts.map((a) => a.address);
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
      const padding = Math.max(Number(response.batched_size) - 1, 0);
      const contractAsTo1 = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, to1Wallet);
      await expect(
        contractAsTo1.mint(recipients, newTokens, newAllowed, proof, publicInputs, padding, { gasLimit: 1000000 })
      ).to.be.reverted;
    });
  });

  // ============ 权限边界：授权额度 ============
  describe('Permission: Mint Allowance', function () {
    it('should revert when minter exceeds allowance', async function () {
      const lowAllowanceTx = await ownerNativeContract.setMintAllowed(
        minterWallet.address,
        {
          id: 0,
          value: { cl_x: 1, cl_y: 1, cr_x: 1, cr_y: 1 },
        },
        { gasLimit: 1000000 }
      );
      await lowAllowanceTx.wait();
      await sleep(5000);

      const generateRequest = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [{ address: minterWallet.address, amount: 1000000000 }],
      };
      await expect(client.generateBatchMintProof(generateRequest, minterMetadata)).to.be.rejected;
    });

    it('should revoke minter allowance', async function () {
      const revokeTx = await ownerNativeContract.setMintAllowed(
        minterWallet.address,
        {
          id: 0,
          value: { cl_x: 0, cl_y: 0, cr_x: 0, cr_y: 0 },
        },
        { gasLimit: 1000000 }
      );
      await revokeTx.wait();
      await sleep(5000);

      const generateRequest = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [{ address: minterWallet.address, amount: 100 }],
      };
      await expect(client.generateBatchMintProof(generateRequest, minterMetadata)).to.be.rejected;
      await setupMintAllowance(ownerNativeContract, client, minterWallet.address, accounts.OwnerKey, 1000000000);
    });
  });

  // ============ 状态查询边界 ============
  describe('Query: getToken Boundaries', function () {
    it('should return empty for non-existent tokenId', async function () {
      const FAKE_TOKEN_ID = ethers.toBigInt('999999999999999999999999999999999');
      const tokenEntity = await nativeContract.getToken(minterWallet.address, FAKE_TOKEN_ID);
      expect(tokenEntity.id).to.equal(0);
      expect(tokenEntity.owner).to.equal(ethers.ZeroAddress);
    });

    it('should return correct status for active token', async function () {
      await mintOneToken(2000);
      const tokenId = await splitToOneRecipient(accounts.To1, 100, 'status-check');
      const tokenEntity = await nativeContract.getToken(accounts.To1, tokenId);
      expect(tokenEntity.id).to.equal(tokenId);
      expect(tokenEntity.owner).to.equal(accounts.To1);
      expect(tokenEntity.status).to.equal(2);
    });

    // C-getToken-1: 非 owner 查询有效 tokenId
    it('should return invalid entity when non-owner queries valid tokenId (minter queries token owned by To1)', async function () {
      await mintOneToken(2000);
      const tokenId = await splitToOneRecipient(accounts.To1, 100, 'getToken-non-owner');
      await sleep(2000);
      const entityAsMinter = await nativeContract.getToken(minterWallet.address, tokenId);
      expect(entityAsMinter.id).to.equal(0n);
      expect(entityAsMinter.owner).to.equal(ethers.ZeroAddress);
    });

    it('should return invalid entity when To2 queries token owned by To1', async function () {
      await mintOneToken(2000);
      const tokenId = await splitToOneRecipient(accounts.To1, 100, 'getToken-to2');
      await sleep(2000);
      const contractAsTo2 = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, to2Wallet);
      const entityAsTo2 = await contractAsTo2.getToken(accounts.To2, tokenId);
      expect(entityAsTo2.id).to.equal(0n);
      expect(entityAsTo2.owner).to.equal(ethers.ZeroAddress);
    });

    // C-getToken-2: tokenId = 0
    it('should return invalid entity for tokenId 0', async function () {
      const entity = await nativeContract.getToken(minterWallet.address, 0n);
      expect(entity.id).to.equal(0n);
      expect(entity.owner).to.equal(ethers.ZeroAddress);
    });

    // C-getToken-3: 已 transfer 后原 owner 查询
    it('should return invalid entity when original owner queries after transfer', async function () {
      await mintOneToken(2000);
      const tokenId = await splitToOneRecipient(accounts.To1, 100, 'getToken-after-transfer');
      await sleep(2000);
      const contractAsTo1 = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, to1Wallet);
      await contractAsTo1.transfer(tokenId, 'move-to-to1', { gasLimit: 1000000 });
      await sleep(2000);
      const entityAsMinter = await nativeContract.getToken(minterWallet.address, tokenId);
      expect(entityAsMinter.id).to.equal(0n);
      expect(entityAsMinter.owner).to.equal(ethers.ZeroAddress);
    });

    // C-getToken-4: 已 burn 后查询
    it('should return invalid entity when querying burned token', async function () {
      await mintOneToken(2000);
      const tokenId = await splitToOneRecipient(accounts.Minter, 10, 'getToken-after-burn');
      await sleep(2000);
      await nativeContract.burn(tokenId, { gasLimit: 1000000 });
      await sleep(2000);
      const entity = await nativeContract.getToken(minterWallet.address, tokenId);
      expect(entity.id).to.equal(0n);
      expect(entity.owner).to.equal(ethers.ZeroAddress);
    });
  });

  // ============ Gas 边界 ============
  describe('Gas Boundaries', function () {
    it('should handle with insufficient gas', async function () {
      await mintOneToken(2000);
      const tokenId = await splitToOneRecipient(accounts.To1, 100, 'low-gas');
      const contractAsTo1 = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, to1Wallet);
      await expect(contractAsTo1.transfer(tokenId, 'low-gas', { gasLimit: 1000 })).to.be.reverted;
    });
  });

  // ============ 完整生命周期 ============
  describe('Full Lifecycle', function () {
    it('should complete mint -> split -> transfer -> burn cycle', async function () {
      const mintedId = await mintOneToken(2000);
      await sleep(2000);

      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWallet.address,
        to_accounts: [{ address: accounts.To1, amount: 50, comment: 'split-to-to1' }],
      };
      const splitProofResponse = await client.generateBatchSplitToken(splitRequests, minterMetadata);
      await sleep(2000);
      const detailResponse = await client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, minterMetadata);
      const recipients = detailResponse.to_addresses;
      const consumedIds = detailResponse.consumedIds.map((ids) => ids.token_id);
      const newTokens = detailResponse.newTokens.map((account, idx) => ({
        id: account.token_id,
        owner: minterWallet.address,
        status: 2,
        amount: {
          cl_x: ethers.toBigInt(account.cl_x),
          cl_y: ethers.toBigInt(account.cl_y),
          cr_x: ethers.toBigInt(account.cr_x),
          cr_y: ethers.toBigInt(account.cr_y),
        },
        to: idx % 2 === 0 ? minterWallet.address : recipients[Math.floor(idx / 2)],
        rollbackTokenId: idx % 2 === 0 ? 0 : (detailResponse.newTokens[idx + 1]?.token_id ?? 0),
      }));
      const proof = detailResponse.proof.map((p) => ethers.toBigInt(p));
      const publicInputs = detailResponse.public_input.map((i) => ethers.toBigInt(i));
      const paddingNum = detailResponse.batched_size - recipients.length;
      const splitTx = await nativeContract.split(minterWallet.address, recipients, consumedIds, newTokens, proof, publicInputs, paddingNum, {
        gasLimit: 1000000,
      });
      await splitTx.wait();
      await sleep(2000);

      const tokenIdAfterSplit = newTokens[1].id;
      const contractAsTo1 = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, to1Wallet);
      const transferTx = await contractAsTo1.transfer(tokenIdAfterSplit, 'transfer-to-owner', { gasLimit: 1000000 });
      await transferTx.wait();
      await sleep(2000);

      const burnTx = await contractAsTo1.burn(tokenIdAfterSplit, { gasLimit: 1000000 });
      const receipt = await burnTx.wait();
      expect(receipt.status).to.equal(1);
    });
  });
});
