/**
 * Native Token Happy Cases
 * 基于 web3-testing happy-case-generator 规范整理
 * - 单步：setMintAllowance / 内部 transfer / 跨节点 transfer / Burn / Query（各 step 独立，可单独运行）
 * - 链式调用：单次流程内 mint -> split -> transfer（及多 recipient）串联
 * - Batch：mint 多个、split 多个
 */
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { createClient } = require('../token_grpc');
const accounts = require('../../../deployments/account.json');

const {
  NATIVE_TOKEN_ADDRESS,
  RPC_URL,
  NATIVE_ABI,
  createAuthMetadata,
  sleep,
  setupMintAllowance,
} = require('../../help/NativeTestHelper');

const NODE2_ADMIN = '0x73494abc9681D133d7Fb4241f1760B314205994c';

// 与 multi_node_consistency Scenario 5 对齐：跨节点链式 Transfer
const NODE_CONFIGS = [
  { name: 'Node 1', grpcUrl: 'dev2-node1-rpc.hamsa-ucl.com:50051', httpUrl: 'http://l2-node1-native.hamsa-ucl.com:8545', admin: '0x93d2Ce0461C2612F847e074434d9951c32e44327', key: '81690fb141b4ae5682ad1fd73b29ae1bcc67891e93de73c6f636402deac21171' },
  { name: 'Node 2', grpcUrl: 'dev2-node2-rpc.hamsa-ucl.com:50051', httpUrl: 'http://l2-node2-native.hamsa-ucl.com:8545', admin: '0x73494abc9681D133d7Fb4241f1760B314205994c', key: '59b08ece967520c64b642fcdc5d2a9aa82b55474f1c1f03419d504d96c8221e5' },
  { name: 'Node 3', grpcUrl: 'dev2-node3-rpc.hamsa-ucl.com:50051', httpUrl: 'http://l2-node3-native.hamsa-ucl.com:8545', admin: accounts.Owner, key: accounts.OwnerKey },
];
const l1CustomNetwork = { name: 'BESU', chainId: 1337 };
const providerOptions = { batchMaxCount: 10, staticNetwork: true };
function withTimeout(promise, ms, message) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(message || `Timeout ${ms}ms`)), ms))]);
}

describe('Native Token - Happy Cases', function () {
  this.timeout(600000);

  let client;
  let minterWallet;
  let minterMetadata;
  let nativeContract;
  let ownerNativeContract;

  before(async function () {
    client = createClient(RPC_URL);
    minterWallet = new ethers.Wallet(accounts.MinterKey, ethers.provider);
    minterMetadata = await createAuthMetadata(accounts.MinterKey);
    nativeContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, minterWallet);

    const ownerWallet = new ethers.Wallet(accounts.OwnerKey, ethers.provider);
    ownerNativeContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, ownerWallet);
  });

  /**  mint 1 个 token，返回 mint 出的 token 已由 minter 持有（用于后续 split 消耗） */
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
    const mintTx = await nativeContract.mint(
      recipients,
      newTokens,
      newAllowed,
      proof,
      publicInputs,
      padding,
      { gasLimit: 1000000 }
    );
    await mintTx.wait();
    await sleep(2000);
    return ethers.toBigInt(newTokens[0].id);
  }

  /**
   * split 1 个 recipient，消耗当前 minter 的 token；返回给该 recipient 的那枚 token 的 tokenId（newTokens[1]）
   */
  async function splitToOneRecipient(recipientAddress, amount = 100, comment = 'split') {
    const splitRequests = {
      sc_address: NATIVE_TOKEN_ADDRESS,
      token_type: '0',
      from_address: minterWallet.address,
      to_accounts: [{ address: recipientAddress, amount, comment }],
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
      rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1]?.token_id ?? 0,
    }));
    const proof = detailResponse.proof.map((p) => ethers.toBigInt(p));
    const publicInputs = detailResponse.public_input.map((i) => ethers.toBigInt(i));
    const paddingNum = detailResponse.batched_size - recipients.length;
    const splitTx = await nativeContract.split(
      minterWallet.address,
      recipients,
      consumedIds,
      newTokens,
      proof,
      publicInputs,
      paddingNum,
      { gasLimit: 1000000 }
    );
    await splitTx.wait();
    await sleep(2000);
    const recipientTokenId = newTokens.length >= 2 ? ethers.toBigInt(newTokens[1].id) : ethers.toBigInt(newTokens[0].id);
    return recipientTokenId;
  }

  /** 批量 mint N 个 token 到 minter，返回所有 tokenId 数组 */
  async function mintMultipleTokens(count, amountPerToken = 2000) {
    const to_accounts = Array(count)
      .fill(null)
      .map(() => ({ address: minterWallet.address, amount: amountPerToken }));
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
    const mintTx = await nativeContract.mint(
      recipients,
      newTokens,
      newAllowed,
      proof,
      publicInputs,
      padding,
      { gasLimit: 1000000 }
    );
    await mintTx.wait();
    await sleep(2000);
    return newTokens.map((t) => ethers.toBigInt(t.id));
  }

  /**
   * split 多个 recipient；consumed 由 gRPC 返回（消耗 minter 当前持有的 token）
   * 返回 newTokens 数组（含 change + 各 recipient 的 token）
   */
  async function splitToRecipients(toAccounts) {
    const splitRequests = {
      sc_address: NATIVE_TOKEN_ADDRESS,
      token_type: '0',
      from_address: minterWallet.address,
      to_accounts: toAccounts,
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
      rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1]?.token_id ?? 0,
    }));
    const proof = detailResponse.proof.map((p) => ethers.toBigInt(p));
    const publicInputs = detailResponse.public_input.map((i) => ethers.toBigInt(i));
    const paddingNum = detailResponse.batched_size - recipients.length;
    const splitTx = await nativeContract.split(
      minterWallet.address,
      recipients,
      consumedIds,
      newTokens,
      proof,
      publicInputs,
      paddingNum,
      { gasLimit: 1000000 }
    );
    await splitTx.wait();
    await sleep(2000);
    return newTokens;
  }

  // ============ setMintAllowance ============
  describe('setMintAllowance', function () {
    it('should set mint allowance for minter', async function () {
      const allowanceAmount = 1000000000;
      console.log('Setting mint allowance for minter...');
      const tx = await setupMintAllowance(
        ownerNativeContract,
        client,
        minterWallet.address,
        accounts.OwnerKey,
        allowanceAmount
      );
      expect(tx.hash).to.be.a('string');
      console.log('Mint allowance set, tx:', tx.hash);
      await sleep(5000);
    });
  });

  // ============ Step: 内部 transfer (node3 内 minter -> To1) ============
  describe('Internal transfer (node3)', function () {
    it('should mint 1 token, split to To1, then transfer to To1', async function () {
      const mintedId = await mintOneToken(2000);
      console.log('Minted 1 token for internal transfer:', mintedId.toString());

      const recipientTokenId = await splitToOneRecipient(accounts.To1, 100, 'happy-internal');
      console.log('Split to To1, recipient token:', recipientTokenId.toString());

      const tx = await nativeContract.transfer(recipientTokenId, 'happy-internal-transfer', {
        gasLimit: 1000000,
      });
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
      console.log('Internal transfer successful, tx:', tx.hash);

      const entity = await nativeContract.getToken(accounts.To1, recipientTokenId);
      expect(entity.owner).to.equal(accounts.To1);
      expect(entity.status).to.equal(2);
      console.log('Verified: token owner is To1');
      await sleep(2000);
    });
  });

  // ============ Step: 跨节点 transfer (node3 -> node2 admin) ============
  describe('Cross-node transfer (node3 -> node2 admin)', function () {
    it('should mint 1 token, split to Node2 admin, then transfer to Node2 admin', async function () {
      const mintedId = await mintOneToken(2000);
      console.log('Minted 1 token for cross-node transfer:', mintedId.toString());

      const recipientTokenId = await splitToOneRecipient(NODE2_ADMIN, 100, 'happy-cross-node');
      console.log('Split to Node2 admin, recipient token:', recipientTokenId.toString());

      const tx = await nativeContract.transfer(recipientTokenId, 'happy-cross-node-transfer', {
        gasLimit: 1000000,
      });
      const receipt = await tx.wait();
      expect(receipt.status).to.equal(1);
      console.log('Cross-node transfer successful, tx:', tx.hash);

      const entity = await nativeContract.getToken(NODE2_ADMIN, recipientTokenId);
      expect(entity.owner).to.equal(NODE2_ADMIN);
      expect(entity.status).to.equal(2);
      console.log('Verified: token owner is Node2 admin');
      await sleep(2000);
    });
  });

  // ============ Step: Burn ============
  describe('Burn', function () {
    it('should mint 1 token, split to Minter, then burn the recipient token', async function () {
      const mintedId = await mintOneToken(2000);
      console.log('Minted 1 token for burn:', mintedId.toString());

      const recipientTokenId = await splitToOneRecipient(accounts.Minter, 10, 'happy-burn');
      console.log('Split to Minter, token to burn:', recipientTokenId.toString());

      const burnTx = await nativeContract.burn(recipientTokenId, { gasLimit: 1000000 });
      const burnReceipt = await burnTx.wait();
      expect(burnReceipt.status).to.equal(1);
      console.log('Burn successful, tx:', burnTx.hash);
      await sleep(2000);
    });
  });

  // ============ Query ============
  describe('Query', function () {
    it('should mint 1 token then getToken and checkTokenIds', async function () {
      const mintedId = await mintOneToken(1000);
      console.log('Minted 1 token for query:', mintedId.toString());

      const entity = await nativeContract.getToken(minterWallet.address, mintedId);
      expect(entity.id).to.equal(mintedId);
      expect(entity.owner).to.equal(minterWallet.address);
      expect(entity.status).to.equal(2);
      console.log('getToken OK:', { id: entity.id.toString(), owner: entity.owner, status: entity.status });

      const invalidIds = await nativeContract.checkTokenIds(minterWallet.address, [mintedId]);
      expect(invalidIds.length).to.equal(0);
      console.log('checkTokenIds (valid): OK');

      const fakeIds = [
        ethers.toBigInt('999999999999999999999999999999'),
        ethers.toBigInt('888888888888888888888888888888'),
      ];
      const invalidFromFake = await nativeContract.checkTokenIds(minterWallet.address, fakeIds);
      expect(invalidFromFake.length).to.equal(fakeIds.length);
      console.log('checkTokenIds (non-existent): OK');
    });
  });

  // ============ 链式调用：与 multi_node_consistency Scenario 5 对齐（A→B→C→D） ============
  describe.only('链式调用 (workflow) - Scenario 5: Cross-Node Chain Transfer', function () {
    const transferAmount = 200;
    const finalRecipient = accounts.To1;
    let chainTokenId, chainTxHash;
    let allProviders, allClients, allContracts;
    let minterWalletNode3, minterContractNode3, ownerContractNode3, minterMetadataNode3, ownerMetadataNode3;
    let node1AdminWallet, node1AdminContract, node1AdminMetadata;
    let node2AdminWallet, node2AdminContract, node2AdminMetadata;

    before(async function () {
      allProviders = NODE_CONFIGS.map((c) => new ethers.JsonRpcProvider(c.httpUrl, l1CustomNetwork, providerOptions));
      allClients = NODE_CONFIGS.map((c) => createClient(c.grpcUrl));
      allContracts = allProviders.map((p) => new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, p));
      const node3Provider = allProviders[2];
      minterWalletNode3 = new ethers.Wallet(accounts.MinterKey, node3Provider);
      const ownerWalletNode3 = new ethers.Wallet(accounts.OwnerKey, node3Provider);
      minterContractNode3 = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, minterWalletNode3);
      ownerContractNode3 = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, ownerWalletNode3);
      minterMetadataNode3 = await createAuthMetadata(accounts.MinterKey);
      ownerMetadataNode3 = await createAuthMetadata(accounts.OwnerKey);

      node1AdminWallet = new ethers.Wallet(NODE_CONFIGS[0].key, allProviders[0]);
      node1AdminContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, node1AdminWallet);
      node1AdminMetadata = await createAuthMetadata(NODE_CONFIGS[0].key);

      node2AdminWallet = new ethers.Wallet(NODE_CONFIGS[1].key, allProviders[1]);
      node2AdminContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, node2AdminWallet);
      node2AdminMetadata = await createAuthMetadata(NODE_CONFIGS[1].key);
    });

    it('Step 1: Set mint allowance on Node 3', async function () {
      const tx = await withTimeout(
        setupMintAllowance(ownerContractNode3, allClients[2], minterWalletNode3.address, accounts.OwnerKey, 100000000),
        60000,
        'setupMintAllowance timeout'
      );
      chainTxHash = tx.hash;
      expect(tx.hash).to.be.a('string');
      await sleep(10000);
    });

    it('Step 2: Verify initial blockchain sync across all nodes', async function () {
      const blockNumbers = await Promise.all(allProviders.map((p, i) => p.getBlockNumber().then((n) => ({ node: NODE_CONFIGS[i].name, block: n }))));
      const blocks = blockNumbers.map((b) => b.block);
      const maxBlock = Math.max(...blocks);
      const minBlock = Math.min(...blocks);
      const blockDiff = maxBlock - minBlock;
      expect(blockDiff).to.be.at.most(3);
    });

    it('Step 3: [Hop 1] Node3 Mint + Split to Node1 Admin, then Transfer (tx on Node3)', async function () {
      const clientNode3 = allClients[2];
      const generateRequest = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWalletNode3.address,
        to_accounts: [{ address: minterWalletNode3.address, amount: 1000 }],
      };
      const response = await withTimeout(clientNode3.generateBatchMintProof(generateRequest, minterMetadataNode3), 60000, 'generateBatchMintProof timeout');
      const recipients = response.to_accounts.map((a) => a.address);
      const newTokens = response.to_accounts.map((account) => ({
        id: account.token.token_id,
        owner: account.address,
        status: 2,
        amount: { cl_x: account.token.cl_x, cl_y: account.token.cl_y, cr_x: account.token.cr_x, cr_y: account.token.cr_y },
        to: account.address,
        rollbackTokenId: 0,
      }));
      const newAllowed = { id: response.mint_allowed.token_id, value: { cl_x: response.mint_allowed.cl_x, cl_y: response.mint_allowed.cl_y, cr_x: response.mint_allowed.cr_x, cr_y: response.mint_allowed.cr_y } };
      const proof = response.proof.map((p) => ethers.toBigInt(p));
      const publicInputs = response.input.map((i) => ethers.toBigInt(i));
      const padding = Math.max(Number(response.batched_size) - 1, 0);
      const mintTx = await minterContractNode3.mint(recipients, newTokens, newAllowed, proof, publicInputs, padding, { gasLimit: 100000 });
      await mintTx.wait();
      await sleep(2000);

      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: minterWalletNode3.address,
        to_accounts: [{ address: NODE_CONFIGS[0].admin, amount: transferAmount, comment: 'chain-hop1-split' }],
      };
      const splitProofResponse = await withTimeout(clientNode3.generateBatchSplitToken(splitRequests, minterMetadataNode3), 60000, 'generateBatchSplitToken timeout');
      await sleep(2000);
      const detailResponse = await withTimeout(clientNode3.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, minterMetadataNode3), 60000, 'getBatchSplitTokenDetail timeout');
      const splitRecipients = detailResponse.to_addresses;
      const consumedIds = detailResponse.consumedIds.map((ids) => ids.token_id);
      const splitNewTokens = detailResponse.newTokens.map((account, idx) => ({
        id: account.token_id,
        owner: minterWalletNode3.address,
        status: 2,
        amount: { cl_x: ethers.toBigInt(account.cl_x), cl_y: ethers.toBigInt(account.cl_y), cr_x: ethers.toBigInt(account.cr_x), cr_y: ethers.toBigInt(account.cr_y) },
        to: idx % 2 === 0 ? minterWalletNode3.address : splitRecipients[Math.floor(idx / 2)],
        rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1].token_id,
      }));
      const splitProof = detailResponse.proof.map((p) => ethers.toBigInt(p));
      const splitPublicInputs = detailResponse.public_input.map((i) => ethers.toBigInt(i));
      const paddingNum = detailResponse.batched_size - splitRecipients.length;
      const splitTx = await minterContractNode3.split(minterWalletNode3.address, splitRecipients, consumedIds, splitNewTokens, splitProof, splitPublicInputs, paddingNum, { gasLimit: 100000 });
      await splitTx.wait();
      const transferTokenIdx = splitNewTokens.findIndex((_, idx) => idx % 2 !== 0);
      chainTokenId = ethers.toBigInt(splitNewTokens[transferTokenIdx].id);
      await sleep(2000);

      const transferTx = await minterContractNode3.transfer(chainTokenId, 'chain-hop1-minter-to-node1admin', { gasLimit: 100000 });
      const receipt = await transferTx.wait();
      chainTxHash = transferTx.hash;
      expect(receipt.status).to.equal(1);
      await sleep(10000);
    });

    it('Step 4: Verify Hop 1 - tx propagation', async function () {
      console.log('\n   Verifying Hop 1 tx propagation...');
      let txFoundCount = 0;
      for (let i = 0; i < allProviders.length; i++) {
        const provider = allProviders[i];
        const config = NODE_CONFIGS[i];
        try {
          const txReceipt = await provider.getTransactionReceipt(chainTxHash);
          if (txReceipt) {
            txFoundCount++;
          }
        } catch (err) {}
        if (i < allProviders.length - 1) await sleep(1000);
      }
      expect(txFoundCount).to.equal(allProviders.length);
    });

    it('Step 5: [Hop 2] Node1 Admin split to Node2 Admin, then Transfer (tx on Node1)', async function () {
      const clientNode1 = allClients[0];
      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: NODE_CONFIGS[0].admin,
        to_accounts: [{ address: NODE_CONFIGS[1].admin, amount: transferAmount, comment: 'chain-hop2-split' }],
      };
      const splitProofResponse = await withTimeout(clientNode1.generateBatchSplitToken(splitRequests, node1AdminMetadata), 60000, 'generateBatchSplitToken timeout');
      await sleep(2000);
      const detailResponse = await withTimeout(clientNode1.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, node1AdminMetadata), 60000, 'getBatchSplitTokenDetail timeout');
      const splitRecipients = detailResponse.to_addresses;
      const consumedIds = detailResponse.consumedIds.map((ids) => ids.token_id);
      const splitNewTokens = detailResponse.newTokens.map((account, idx) => ({
        id: account.token_id,
        owner: NODE_CONFIGS[0].admin,
        status: 2,
        amount: { cl_x: ethers.toBigInt(account.cl_x), cl_y: ethers.toBigInt(account.cl_y), cr_x: ethers.toBigInt(account.cr_x), cr_y: ethers.toBigInt(account.cr_y) },
        to: idx % 2 === 0 ? NODE_CONFIGS[0].admin : splitRecipients[Math.floor(idx / 2)],
        rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1].token_id,
      }));
      const splitProof = detailResponse.proof.map((p) => ethers.toBigInt(p));
      const splitPublicInputs = detailResponse.public_input.map((i) => ethers.toBigInt(i));
      const paddingNum = detailResponse.batched_size - splitRecipients.length;
      const splitTx = await node1AdminContract.split(NODE_CONFIGS[0].admin, splitRecipients, consumedIds, splitNewTokens, splitProof, splitPublicInputs, paddingNum, { gasLimit: 100000 });
      await splitTx.wait();
      const transferTokenIdx = splitNewTokens.findIndex((_, idx) => idx % 2 !== 0);
      const newTokenId = ethers.toBigInt(splitNewTokens[transferTokenIdx].id);
      const transferTx = await node1AdminContract.transfer(newTokenId, 'chain-hop2-transfer-to-node2admin', { gasLimit: 100000 });
      await transferTx.wait();
      chainTxHash = transferTx.hash;
      chainTokenId = newTokenId;
      await sleep(10000);
    });

    it('Step 6: Verify Hop 2 - tx propagation', async function () {
      let txFoundCount = 0;
      for (let i = 0; i < allProviders.length; i++) {
        try {
          const txReceipt = await allProviders[i].getTransactionReceipt(chainTxHash);
          if (txReceipt) txFoundCount++;
        } catch (err) {}
        if (i < allProviders.length - 1) await sleep(1000);
      }
      expect(txFoundCount).to.equal(allProviders.length);
    });

    it('Step 7: [Hop 3] Node2 Admin split to Final Recipient (To1), then Transfer (tx on Node2)', async function () {
      const clientNode2 = allClients[1];
      const splitRequests = {
        sc_address: NATIVE_TOKEN_ADDRESS,
        token_type: '0',
        from_address: NODE_CONFIGS[1].admin,
        to_accounts: [{ address: finalRecipient, amount: transferAmount, comment: 'chain-hop3-split' }],
      };
      const splitProofResponse = await withTimeout(clientNode2.generateBatchSplitToken(splitRequests, node2AdminMetadata), 60000, 'generateBatchSplitToken timeout');
      await sleep(2000);
      const detailResponse = await withTimeout(clientNode2.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, node2AdminMetadata), 60000, 'getBatchSplitTokenDetail timeout');
      const splitRecipients = detailResponse.to_addresses;
      const consumedIds = detailResponse.consumedIds.map((ids) => ids.token_id);
      const splitNewTokens = detailResponse.newTokens.map((account, idx) => ({
        id: account.token_id,
        owner: NODE_CONFIGS[1].admin,
        status: 2,
        amount: { cl_x: ethers.toBigInt(account.cl_x), cl_y: ethers.toBigInt(account.cl_y), cr_x: ethers.toBigInt(account.cr_x), cr_y: ethers.toBigInt(account.cr_y) },
        to: idx % 2 === 0 ? NODE_CONFIGS[1].admin : splitRecipients[Math.floor(idx / 2)],
        rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1].token_id,
      }));
      const splitProof = detailResponse.proof.map((p) => ethers.toBigInt(p));
      const splitPublicInputs = detailResponse.public_input.map((i) => ethers.toBigInt(i));
      const paddingNum = detailResponse.batched_size - splitRecipients.length;
      const splitTx = await node2AdminContract.split(NODE_CONFIGS[1].admin, splitRecipients, consumedIds, splitNewTokens, splitProof, splitPublicInputs, paddingNum, { gasLimit: 100000 });
      await splitTx.wait();
      const transferTokenIdx = splitNewTokens.findIndex((_, idx) => idx % 2 !== 0);
      const newTokenId = ethers.toBigInt(splitNewTokens[transferTokenIdx].id);
      const transferTx = await node2AdminContract.transfer(newTokenId, 'chain-hop3-transfer-to-final', { gasLimit: 100000 });
      await transferTx.wait();
      chainTxHash = transferTx.hash;
      chainTokenId = newTokenId;
      await sleep(10000);
    });

    it('Step 8: Verify Hop 3 - tx propagation', async function () {
      let txFoundCount = 0;
      for (let i = 0; i < allProviders.length; i++) {
        try {
          const txReceipt = await allProviders[i].getTransactionReceipt(chainTxHash);
          if (txReceipt) txFoundCount++;
        } catch (err) {}
        if (i < allProviders.length - 1) await sleep(1000);
      }
      expect(txFoundCount).to.equal(allProviders.length);
    });

    it('Step 9: Verify final owner is To1', async function () {
      const entity = await allContracts[0].getToken(finalRecipient, chainTokenId);
      expect(entity.owner).to.equal(finalRecipient);
      expect(entity.status).to.equal(2);
    });

    it('Step 10: Verify complete chain transfer history (access check)', async function () {
      const accessChecks = [
        { name: 'Node3 Minter', address: minterWalletNode3.address, expectAccess: false },
        { name: 'Node1 Admin', address: NODE_CONFIGS[0].admin, expectAccess: false },
        { name: 'Node2 Admin', address: NODE_CONFIGS[1].admin, expectAccess: false },
        { name: 'Final Recipient', address: finalRecipient, expectAccess: true },
      ];
      for (const check of accessChecks) {
        try {
          const token = await allContracts[0].getToken(check.address, chainTokenId);
          if (check.expectAccess) {
            expect(token.owner).to.equal(finalRecipient);
          } else {
            expect.fail(`${check.name} should have no access (getToken should revert)`);
          }
        } catch (error) {
          if (check.expectAccess) {
            expect.fail(`Final Recipient should have access: ${error.message}`);
          }
        }
      }
    });
  });

  // ============ Batch：mint 多个、split 多个 ============
  describe('Batch: mint 多个 / split 多个', function () {
    it('should mint multiple tokens in one batch', async function () {
      const count = 4;
      const tokenIds = await mintMultipleTokens(count, 2000);
      expect(tokenIds.length).to.equal(count);
      for (const id of tokenIds) {
        const entity = await nativeContract.getToken(minterWallet.address, id);
        expect(entity.owner).to.equal(minterWallet.address);
        expect(entity.status).to.equal(2);
      }
      console.log('Batch mint:', tokenIds.length, 'tokens');
      await sleep(2000);
    });

    it('should mint multiple then split to multiple recipients', async function () {
      const mintedIds = await mintMultipleTokens(4, 2000);
      expect(mintedIds.length).to.equal(4);
      const toAccounts = [
        { address: accounts.To1, amount: 100, comment: 'batch-1' },
        { address: accounts.To2, amount: 100, comment: 'batch-2' },
      ];
      const newTokens = await splitToRecipients(toAccounts);
      expect(newTokens.length).to.be.gte(4);
      const invalidIds = await nativeContract.checkTokenIds(minterWallet.address, newTokens.map((t) => ethers.toBigInt(t.id)));
      expect(invalidIds.length).to.equal(0);
      console.log('Batch: mint 4 -> split to 2 recipients, newTokens:', newTokens.length);
      await sleep(2000);
    });
  });
});
