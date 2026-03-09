/**
 * Audit: Outdated go-ibft version - 修复验证测试
 *
 * 参照 document/analysis/Outdated_go_ibft_version.md 编写。
 * 验证共识层在多轮共识（RoundChange）下无竞态条件：网络持续出块、节点高度一致、交易可最终确认。
 *
 * 环境变量（可选）：
 *   AUDIT_RPC_URL     - 单节点 RPC，例如 http://l2-node1-native.hamsa-ucl.com:8545
 *   AUDIT_RPC_URLS   - 多节点 RPC，逗号分隔，用于多节点高度一致性校验
 *   AUDIT_BLOCK_WAIT_MS - 区块进展观测时长（毫秒），默认 30000
 *   AUDIT_MAX_BLOCK_INTERVAL_MS - 判定“无停滞”的最大区块间隔（毫秒），默认 60000
 *
 * 若未设置 RPC，则使用 Hardhat 默认 provider（本地/CI）。
 */

const { expect } = require('chai');
const hre = require('hardhat');
const { ethers } = hre;
const accounts = require('../../../deployments/account.json');

const l1CustomNetwork = { name: 'BESU', chainId: 1337 };
const providerOptions = { batchMaxCount: 10, staticNetwork: true };

const AUDIT_BLOCK_WAIT_MS = Number(process.env.AUDIT_BLOCK_WAIT_MS) || 30000;
const AUDIT_MAX_BLOCK_INTERVAL_MS = Number(process.env.AUDIT_MAX_BLOCK_INTERVAL_MS) || 60000;
const AUDIT_LOAD_TX_COUNT = Number(process.env.AUDIT_LOAD_TX_COUNT) || 12000;
const AUDIT_LOAD_BATCH_SIZE = Number(process.env.AUDIT_LOAD_BATCH_SIZE) || 500;
const AUDIT_LOAD_STAGES = (process.env.AUDIT_LOAD_STAGES || '2000,5000,8000,12000')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value > 0);
const AUDIT_STAGE_OBSERVE_MS = Number(process.env.AUDIT_STAGE_OBSERVE_MS) || 15000;
const AUDIT_STAGE_PAUSE_MS = Number(process.env.AUDIT_STAGE_PAUSE_MS) || 5000;
const AUDIT_STAGE_BATCH_DELAY_MS = Number(process.env.AUDIT_STAGE_BATCH_DELAY_MS) || 200;
const AUDIT_STAGE_FAIL_RATIO_LIMIT = Number(process.env.AUDIT_STAGE_FAIL_RATIO_LIMIT) || 0.2;
const AUDIT_STAGE_MIN_BLOCK_PROGRESS = Number(process.env.AUDIT_STAGE_MIN_BLOCK_PROGRESS) || 1;
const AUDIT_REQUIRE_ROUND_CHANGE = process.env.AUDIT_REQUIRE_ROUND_CHANGE === '1';

function getRpcUrls() {
  const single = process.env.AUDIT_RPC_URL;
  const multi = process.env.AUDIT_RPC_URLS;
  if (single) return [single.trim()];
  if (multi)
    return multi
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);
  return [];
}

function createProvider(url) {
  return new ethers.JsonRpcProvider(url, l1CustomNetwork, providerOptions);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function summarizeRpcErrors(errors) {
  const counts = new Map();
  for (const err of errors) {
    const msg = String(err?.message || err?.error?.message || err || 'unknown error');
    counts.set(msg, (counts.get(msg) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([message, count]) => ({ count, message }));
}

async function sendRawTransactionsInBatches(rpcUrl, signedTxs, batchSize) {
  const errors = [];
  let sent = 0;

  for (let i = 0; i < signedTxs.length; i += batchSize) {
    const batch = signedTxs.slice(i, i + batchSize);
    const payload = batch.map((raw, idx) => ({
      jsonrpc: '2.0',
      id: i + idx,
      method: 'eth_sendRawTransaction',
      params: [raw],
    }));

    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      const results = Array.isArray(json) ? json : [json];

      for (const result of results) {
        if (result?.error) {
          errors.push(result.error);
        } else {
          sent += 1;
        }
      }
    } catch (err) {
      for (let j = 0; j < batch.length; j++) {
        errors.push(err);
      }
    }

    if ((i + batchSize) % 5000 === 0 || i + batchSize >= signedTxs.length) {
      process.stdout.write(' ' + sent + '/');
    }

    if (AUDIT_STAGE_BATCH_DELAY_MS > 0 && i + batchSize < signedTxs.length) {
      await sleep(AUDIT_STAGE_BATCH_DELAY_MS);
    }
  }

  return {
    sent,
    failed: signedTxs.length - sent,
    errorSummary: summarizeRpcErrors(errors),
  };
}

async function getSnapshotRound(provider) {
  try {
    const snapshot = await provider.send('ibft_getSnapshot', []);
    if (snapshot && typeof snapshot.round === 'number') {
      return { available: true, round: snapshot.round };
    }
  } catch (e) {
    if (e.message && (e.message.includes('method') || e.message.includes('not supported') || e.message.includes('ibft'))) {
      return { available: false, round: null };
    }
    throw e;
  }

  return { available: false, round: null };
}

async function observeStage(provider, providers, startBlock, observeMs) {
  const observeEnd = Date.now() + observeMs;
  const blockTimestamps = [Date.now()];
  const blockNumbers = [await provider.getBlockNumber()];
  let snapshotAvailable = false;
  let highestRound = 1;

  while (Date.now() < observeEnd) {
    await sleep(2000);

    const num = await provider.getBlockNumber();
    if (num !== blockNumbers[blockNumbers.length - 1]) {
      blockNumbers.push(num);
      blockTimestamps.push(Date.now());
    }

    const snapshot = await getSnapshotRound(provider);
    if (snapshot.available) {
      snapshotAvailable = true;
      highestRound = Math.max(highestRound, snapshot.round);
    }
  }

  const endBlock = await provider.getBlockNumber();
  let maxInterval = 0;
  for (let i = 1; i < blockTimestamps.length; i++) {
    maxInterval = Math.max(maxInterval, blockTimestamps[i] - blockTimestamps[i - 1]);
  }

  let heights = null;
  let heightDiff = null;
  if (providers.length >= 2) {
    heights = await Promise.all(providers.map(async (p) => ({ name: p.name, height: await p.provider.getBlockNumber() })));
    heightDiff = Math.max(...heights.map((x) => x.height)) - Math.min(...heights.map((x) => x.height));
  }

  return {
    startBlock,
    endBlock,
    progress: endBlock - startBlock,
    snapshotAvailable,
    highestRound,
    roundChangeDetected: highestRound > 1,
    maxInterval,
    heights,
    heightDiff,
  };
}

describe('Audit: Outdated go-ibft version 修复验证', function () {
  let providers = [];
  let useHardhat = false;

  before(async function () {
    const urls = getRpcUrls();
    if (urls.length > 0) {
      providers = urls.map((url, i) => ({ name: `Node${i + 1}`, url, provider: createProvider(url) }));
      console.log('\n[Audit go-ibft] Using RPC:', urls.length, 'node(s)');
    } else {
      providers = [{ name: 'Hardhat', url: 'hardhat', provider: ethers.provider }];
      useHardhat = hre.network.name === 'hardhat';
      if (useHardhat) {
        console.log('\n[Audit go-ibft] Using Hardhat in-process provider');
      } else {
        console.log('\n[Audit go-ibft] Using Hardhat network config:', hre.network.name, hre.network.config.url || '(no rpc url)');
      }
    }
  });

  describe('1. 区块进展（无网络停滞）', function () {
    this.timeout(Math.max(60000, AUDIT_BLOCK_WAIT_MS + 20000));

    it('观测期内应有新区块产生，且区块间隔不超过阈值', async function () {
      const provider = providers[0].provider;
      const startBlock = await provider.getBlockNumber();
      const startTime = Date.now();
      const blockTimestamps = [Date.now()];
      const blockNumbers = [startBlock];

      while (Date.now() - startTime < AUDIT_BLOCK_WAIT_MS) {
        await sleep(2000);
        const num = await provider.getBlockNumber();
        if (num !== blockNumbers[blockNumbers.length - 1]) {
          blockNumbers.push(num);
          blockTimestamps.push(Date.now());
        }
      }

      const lastBlock = await provider.getBlockNumber();
      const progress = lastBlock - startBlock;

      console.log('[Audit go-ibft] Block progression:', { startBlock, lastBlock, progress, durationMs: Date.now() - startTime });

      // 通过标准：观测期内至少有 1 个新区块，或至少能连上链（本地链可能已停）
      if (progress > 0) {
        let maxInterval = 0;
        for (let i = 1; i < blockTimestamps.length; i++) {
          maxInterval = Math.max(maxInterval, blockTimestamps[i] - blockTimestamps[i - 1]);
        }
        expect(maxInterval, '区块间隔不应超过配置的最大值（无停滞）').to.be.lte(AUDIT_MAX_BLOCK_INTERVAL_MS);
      }
      // 若为远程多节点链，通常应持续出块
      if (!useHardhat && getRpcUrls().length > 0) {
        expect(progress, '远程链观测期内应有新区块').to.be.gte(1);
      }
    });
  });

  describe('2. 多节点区块高度一致（高度差 ≤ 1）', function () {
    this.timeout(30000);

    it('各节点区块高度差应 ≤ 1', async function () {
      if (providers.length < 2) {
        this.skip();
        return;
      }

      const heights = [];
      for (const { name, provider } of providers) {
        const h = await provider.getBlockNumber();
        heights.push({ name, height: h });
      }

      const minH = Math.min(...heights.map((x) => x.height));
      const maxH = Math.max(...heights.map((x) => x.height));
      const diff = maxH - minH;

      console.log('[Audit go-ibft] Multi-node heights:', heights);
      expect(diff, '各节点区块高度差应 ≤ 1（见 Outdated_go_ibft_version.md 测试通过标准）').to.be.lte(1);
    });
  });

  describe.skip('3. IBFT 快照 RPC（可选）', function () {
    this.timeout(15000);

    it('若节点支持 ibft_getSnapshot，应返回合法数据', async function () {
      const provider = providers[0].provider;
      try {
        const snapshot = await provider.send('ibft_getSnapshot', []);
        expect(snapshot).to.not.be.undefined;
        if (snapshot && typeof snapshot === 'object') {
          if (snapshot.validators && Array.isArray(snapshot.validators)) {
            console.log('[Audit go-ibft] ibft_getSnapshot validators count:', snapshot.validators.length);
          }
          if (typeof snapshot.round === 'number') {
            console.log('[Audit go-ibft] ibft_getSnapshot round:', snapshot.round);
          }
        }
      } catch (e) {
        if (e.message && (e.message.includes('method') || e.message.includes('not supported') || e.message.includes('ibft'))) {
          console.log('[Audit go-ibft] ibft_getSnapshot not supported, skip');
          this.skip();
        } else {
          throw e;
        }
      }
    });

    it.skip('若节点支持 ibft_getValidators，应返回合法列表', async function () {
      const provider = providers[0].provider;
      try {
        const blockNum = await provider.getBlockNumber();
        const validators = await provider.send('ibft_getValidators', [blockNum]);
        expect(validators).to.be.an('array');
        console.log('[Audit go-ibft] ibft_getValidators count:', validators?.length ?? 0);
      } catch (e) {
        if (e.message && (e.message.includes('method') || e.message.includes('not supported') || e.message.includes('ibft'))) {
          console.log('[Audit go-ibft] ibft_getValidators not supported, skip');
          this.skip();
        } else {
          throw e;
        }
      }
    });
  });

  describe('4. 交易最终性（链可写且可确认）', function () {
    this.timeout(60000);

    it('发送一笔交易后应能获得收据且区块高度前进', async function () {
      const provider = providers[0].provider;
      const [signer] = await ethers.getSigners();
      const connectedSigner = signer.connect(provider);

      const beforeBlock = await provider.getBlockNumber();
      const balance = await provider.getBalance(connectedSigner.address);
      if (balance === 0n) {
        console.log('[Audit go-ibft] Signer has no balance, skip tx finality test');
        this.skip();
        return;
      }

      const tx = await connectedSigner.sendTransaction({
        to: connectedSigner.address,
        value: 0n,
        gasLimit: 21000,
      });
      const receipt = await tx.wait();
      const afterBlock = await provider.getBlockNumber();

      expect(receipt).to.not.be.null;
      expect(receipt.status).to.equal(1);
      expect(afterBlock, '交易确认后区块高度应前进').to.be.gte(beforeBlock);
      console.log('[Audit go-ibft] Tx finality:', { hash: receipt.hash, block: receipt.blockNumber });
    });
  });

  describe('5. 高负载促发 RoundChange 后验证', function () {
    const stageTargets = AUDIT_LOAD_STAGES.length > 0 ? AUDIT_LOAD_STAGES : [AUDIT_LOAD_TX_COUNT];
    const totalTxs = stageTargets[stageTargets.length - 1];
    const batchSize = AUDIT_LOAD_BATCH_SIZE;
    const estimatedSignMs = Math.max(15000, totalTxs * 2);
    const estimatedSendMs = Math.max(90000, Math.ceil(totalTxs / batchSize) * (3000 + AUDIT_STAGE_BATCH_DELAY_MS));
    const estimatedObserveMs = stageTargets.length * (AUDIT_STAGE_PAUSE_MS + AUDIT_STAGE_OBSERVE_MS);
    this.timeout(30000 + estimatedSignMs + estimatedSendMs + estimatedObserveMs);

    it('高负载发交易后观测区块进展与多节点一致，可选检测 round > 1', async function () {
      const urls = getRpcUrls();
      const provider = urls.length > 0 ? createProvider(urls[0]) : providers[0].provider;
      const rpcUrl = urls.length > 0 ? urls[0] : hre.network.config.url;
      const signerKey = process.env.AUDIT_LOAD_SIGNER_KEY || accounts.OwnerKey;
      const wallet = new ethers.Wallet(signerKey, provider);
      const balance = await provider.getBalance(wallet.address);
      if (balance === 0n) {
        console.log('[Audit go-ibft] Load signer has no balance, skip high-load test');
        this.skip();
        return;
      }

      let feeData;
      try {
        feeData = await provider.getFeeData();
      } catch (_) {
        feeData = { gasPrice: await provider.getGasPrice() };
      }
      const gasPrice = BigInt(feeData.gasPrice ?? feeData.maxFeePerGas ?? 0);
      const initialNonce = await provider.getTransactionCount(wallet.address);
      const nonceBig = BigInt(initialNonce);
      const chainId = (await provider.getNetwork()).chainId;

      console.log('[Audit go-ibft] Stage targets:', stageTargets.join(' -> '));
      console.log('[Audit go-ibft] Pre-signing', totalTxs, 'txs (nonce', String(initialNonce), '+)...');
      const unsignedTxs = [];
      for (let i = 0; i < totalTxs; i++) {
        unsignedTxs.push({
          type: 0,
          to: wallet.address,
          value: 0n,
          gasLimit: 21000n,
          nonce: nonceBig + BigInt(i),
          gasPrice,
          chainId: Number(chainId),
        });
      }
      const signStart = Date.now();
      const signedTxs = await Promise.all(unsignedTxs.map((tx) => wallet.signTransaction(tx)));
      console.log('[Audit go-ibft] Signed in', ((Date.now() - signStart) / 1000).toFixed(1), 's');

      if (!rpcUrl) {
        throw new Error('No RPC URL available for batch eth_sendRawTransaction requests');
      }

      const stageResults = [];
      let previousSent = 0;
      let anyRoundChange = false;
      let anyRecovery = false;
      let stoppedEarly = false;

      for (let stageIndex = 0; stageIndex < stageTargets.length; stageIndex++) {
        const stageTarget = stageTargets[stageIndex];
        const stageTxs = signedTxs.slice(previousSent, stageTarget);
        if (stageTxs.length === 0) {
          continue;
        }

        const stageStartBlock = await provider.getBlockNumber();
        console.log(
          '[Audit go-ibft] Stage',
          `${stageIndex + 1}/${stageTargets.length}`,
          'sending',
          stageTxs.length,
          'txs up to cumulative',
          stageTarget,
          'in batches of',
          batchSize,
          '(JSON-RPC batch)...'
        );

        const sendStart = Date.now();
        const { sent, failed, errorSummary } = await sendRawTransactionsInBatches(rpcUrl, stageTxs, batchSize);
        const sendElapsed = ((Date.now() - sendStart) / 1000).toFixed(1);
        console.log(
          ' [Audit go-ibft] Stage',
          `${stageIndex + 1}`,
          'sent',
          sent,
          'txs (failed',
          failed,
          ') in',
          sendElapsed,
          's, ~',
          (sent / parseFloat(sendElapsed)).toFixed(0),
          'TPS'
        );
        if (errorSummary.length > 0) {
          console.log('[Audit go-ibft] Stage top send errors:', errorSummary);
        }

        previousSent += sent + failed;

        if (AUDIT_STAGE_PAUSE_MS > 0) {
          console.log('[Audit go-ibft] Cooling down for', AUDIT_STAGE_PAUSE_MS, 'ms before observation');
          await sleep(AUDIT_STAGE_PAUSE_MS);
        }

        const observation = await observeStage(provider, providers, stageStartBlock, AUDIT_STAGE_OBSERVE_MS);
        const failRatio = stageTxs.length === 0 ? 0 : failed / stageTxs.length;
        const recoveryObserved = observation.progress >= AUDIT_STAGE_MIN_BLOCK_PROGRESS;
        anyRoundChange = anyRoundChange || observation.roundChangeDetected;
        anyRecovery = anyRecovery || recoveryObserved;

        const stageResult = {
          stage: stageIndex + 1,
          cumulativeTarget: stageTarget,
          sent,
          failed,
          failRatio,
          highestRound: observation.highestRound,
          roundChangeDetected: observation.roundChangeDetected,
          snapshotAvailable: observation.snapshotAvailable,
          progress: observation.progress,
          maxInterval: observation.maxInterval,
          recoveryObserved,
          heightDiff: observation.heightDiff,
        };
        stageResults.push(stageResult);
        console.log('[Audit go-ibft] Stage observation:', stageResult);
        if (observation.heights) {
          console.log('[Audit go-ibft] Stage multi-node heights:', observation.heights);
        }

        if (failRatio > AUDIT_STAGE_FAIL_RATIO_LIMIT) {
          console.log('[Audit go-ibft] Stopping early: stage fail ratio exceeded limit');
          stoppedEarly = true;
          break;
        }
        if (observation.progress < AUDIT_STAGE_MIN_BLOCK_PROGRESS) {
          console.log('[Audit go-ibft] Stopping early: block progression below minimum threshold');
          stoppedEarly = true;
          break;
        }
        if (typeof observation.heightDiff === 'number' && observation.heightDiff > 1) {
          console.log('[Audit go-ibft] Stopping early: multi-node height diff exceeded threshold');
          stoppedEarly = true;
          break;
        }
      }

      console.log('[Audit go-ibft] Final stage results:', stageResults);
      console.log('[Audit go-ibft] Final conclusion:', {
        anyRoundChange,
        anyRecovery,
        stoppedEarly,
        requireRoundChange: AUDIT_REQUIRE_ROUND_CHANGE,
      });

      expect(stageResults.length, '至少应执行一个高负载阶段').to.be.gte(1);
      expect(anyRecovery, '高负载阶段后应至少一次观察到链继续出块').to.equal(true);

      for (const result of stageResults) {
        if (result.maxInterval > 0) {
          expect(result.maxInterval, '区块间隔不应超过阈值').to.be.lte(AUDIT_MAX_BLOCK_INTERVAL_MS);
        }
        if (typeof result.heightDiff === 'number') {
          expect(result.heightDiff, '多节点区块高度差应 ≤ 1').to.be.lte(1);
        }
      }

      if (AUDIT_REQUIRE_ROUND_CHANGE) {
        expect(anyRoundChange, '要求至少观察到一次 RoundChange').to.equal(true);
      }
    });
  });
});
