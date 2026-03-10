/**
 * Audit: Increase default libp2p message size - 修复验证测试
 *
 * 参照 document/analysis/analysis_increase_default_libp2p_message_size.md 编写。
 * 目标：通过发送大 calldata 合约调用来构造大区块，验证多节点在大消息传播场景下仍能继续出块并保持高度一致。
 *
 * 环境变量（可选）：
 *   AUDIT_RPC_URL       - 单节点 RPC，例如 http://l2-node1-native.hamsa-ucl.com:8545
 *   AUDIT_RPC_URLS      - 多节点 RPC，逗号分隔，用于高度一致性校验
 *   AUDIT_LIBP2P_STAGE_TXS - 累积阶段交易数，默认 16,32,48
 *   AUDIT_LIBP2P_PAYLOAD_BYTES - 单笔 payload 大小，默认 140000
 *   AUDIT_LIBP2P_BATCH_SIZE - 每批发送数，默认 16
 *   AUDIT_LIBP2P_BATCH_DELAY_MS - 批间延迟，默认 200
 *   AUDIT_LIBP2P_STAGE_PAUSE_MS - 阶段发送后暂停，默认 5000
 *   AUDIT_LIBP2P_OBSERVE_MS - 阶段观测时长，默认 15000
 *   AUDIT_LIBP2P_GAS_LIMIT - 单笔 gasLimit，默认 500000
 *   AUDIT_LIBP2P_TARGET_BLOCK_BYTES - 目标单区块 payload 字节数，默认 2097152 (2MB)
 *   AUDIT_LIBP2P_REQUIRE_TARGET_BLOCK - 设为 1 时，要求至少一个区块达到目标字节数
 */

const { expect } = require('chai');
const hre = require('hardhat');
const { ethers } = hre;
const accounts = require('../../../deployments/account.json');

const l1CustomNetwork = { name: 'BESU', chainId: 1337 };
const providerOptions = { batchMaxCount: 10, staticNetwork: true };

const AUDIT_MAX_BLOCK_INTERVAL_MS = Number(process.env.AUDIT_MAX_BLOCK_INTERVAL_MS) || 60000;
const AUDIT_LIBP2P_STAGE_TXS = (process.env.AUDIT_LIBP2P_STAGE_TXS || '16,32,48')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value > 0);
const AUDIT_LIBP2P_PAYLOAD_BYTES = Number(process.env.AUDIT_LIBP2P_PAYLOAD_BYTES) || 140000;
const AUDIT_LIBP2P_BATCH_SIZE = Number(process.env.AUDIT_LIBP2P_BATCH_SIZE) || 16;
const AUDIT_LIBP2P_BATCH_DELAY_MS = Number(process.env.AUDIT_LIBP2P_BATCH_DELAY_MS) || 200;
const AUDIT_LIBP2P_STAGE_PAUSE_MS = Number(process.env.AUDIT_LIBP2P_STAGE_PAUSE_MS) || 5000;
const AUDIT_LIBP2P_OBSERVE_MS = Number(process.env.AUDIT_LIBP2P_OBSERVE_MS) || 15000;
const AUDIT_LIBP2P_GAS_LIMIT = BigInt(process.env.AUDIT_LIBP2P_GAS_LIMIT || 500000);
const AUDIT_LIBP2P_TARGET_BLOCK_BYTES = Number(process.env.AUDIT_LIBP2P_TARGET_BLOCK_BYTES) || 2097152;
const AUDIT_LIBP2P_REQUIRE_TARGET_BLOCK = process.env.AUDIT_LIBP2P_REQUIRE_TARGET_BLOCK === '1';

function getRpcUrls() {
  const single = process.env.AUDIT_RPC_URL;
  const multi = process.env.AUDIT_RPC_URLS;
  if (single) return [single.trim()];
  if (multi) {
    return multi
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return [];
}

function createProvider(url) {
  return new ethers.JsonRpcProvider(url, l1CustomNetwork, providerOptions);
}

function normalizeAddress(value) {
  return String(value || '').toLowerCase();
}

function makeZeroPayload(size) {
  return '0x' + '00'.repeat(size);
}

function formatBytesAsMiB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2);
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

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

    if ((i + batchSize) % 50 === 0 || i + batchSize >= signedTxs.length) {
      process.stdout.write(' ' + sent + '/');
    }

    if (AUDIT_LIBP2P_BATCH_DELAY_MS > 0 && i + batchSize < signedTxs.length) {
      await sleep(AUDIT_LIBP2P_BATCH_DELAY_MS);
    }
  }

  return {
    sent,
    failed: signedTxs.length - sent,
    errorSummary: summarizeRpcErrors(errors),
  };
}

async function getBlockPayloadBytes(provider, blockNumber, targetAddress) {
  const block = await provider.send('eth_getBlockByNumber', [ethers.toQuantity(blockNumber), true]);
  const normalizedTarget = normalizeAddress(targetAddress);
  let txCount = 0;
  let payloadBytes = 0;

  for (const tx of block?.transactions || []) {
    if (normalizeAddress(tx.to) !== normalizedTarget) {
      continue;
    }

    const input = String(tx.input || '0x');
    payloadBytes += Math.max(0, (input.length - 2) / 2);
    txCount += 1;
  }

  return {
    blockNumber,
    txCount,
    payloadBytes,
  };
}

async function scanBlockRange(provider, fromBlock, toBlock, targetAddress) {
  const blocks = [];
  let maxPayloadBytes = 0;

  for (let blockNumber = fromBlock; blockNumber <= toBlock; blockNumber++) {
    const blockStats = await getBlockPayloadBytes(provider, blockNumber, targetAddress);
    if (blockStats.txCount > 0) {
      blocks.push(blockStats);
      maxPayloadBytes = Math.max(maxPayloadBytes, blockStats.payloadBytes);
    }
  }

  return {
    maxPayloadBytes,
    blocks,
  };
}

async function observeStage(provider, providers, startBlock, observeMs, targetAddress) {
  const observeEnd = Date.now() + observeMs;
  const blockTimestamps = [Date.now()];
  const blockNumbers = [await provider.getBlockNumber()];

  while (Date.now() < observeEnd) {
    await sleep(2000);
    const blockNumber = await provider.getBlockNumber();
    if (blockNumber !== blockNumbers[blockNumbers.length - 1]) {
      blockNumbers.push(blockNumber);
      blockTimestamps.push(Date.now());
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
    heights = await Promise.all(providers.map(async (item) => ({ name: item.name, height: await item.provider.getBlockNumber() })));
    heightDiff = Math.max(...heights.map((item) => item.height)) - Math.min(...heights.map((item) => item.height));
  }

  const payloadScan = await scanBlockRange(provider, startBlock, endBlock, targetAddress);

  return {
    startBlock,
    endBlock,
    progress: endBlock - startBlock,
    maxInterval,
    heights,
    heightDiff,
    maxPayloadBytes: payloadScan.maxPayloadBytes,
    payloadBlocks: payloadScan.blocks,
  };
}

describe('Audit: Increase default libp2p message size 修复验证', function () {
  let providers = [];
  let useHardhat = false;
  let helperAddress;

  before(async function () {
    const urls = getRpcUrls();
    if (urls.length > 0) {
      providers = urls.map((url, i) => ({ name: `Node${i + 1}`, url, provider: createProvider(url) }));
      console.log('\n[Audit libp2p] Using RPC:', urls.length, 'node(s)');
    } else {
      providers = [{ name: 'Hardhat', url: 'hardhat', provider: ethers.provider }];
      useHardhat = hre.network.name === 'hardhat';
      if (useHardhat) {
        console.log('\n[Audit libp2p] Using Hardhat in-process provider');
      } else {
        console.log('\n[Audit libp2p] Using Hardhat network config:', hre.network.name, hre.network.config.url || '(no rpc url)');
      }
    }
  });

  describe('1. 基线区块进展', function () {
    this.timeout(60000);

    it('观测期内应有新区块产生', async function () {
      const provider = providers[0].provider;
      const startBlock = await provider.getBlockNumber();
      await sleep(12000);
      const endBlock = await provider.getBlockNumber();
      const progress = endBlock - startBlock;
      console.log('[Audit libp2p] Baseline progression:', { startBlock, endBlock, progress });
      if (!useHardhat) {
        expect(progress, '远程链基线观测期内应有新区块').to.be.gte(1);
      }
    });
  });

  describe('2. 部署 helper 合约', function () {
    this.timeout(120000);

    it('应能部署 LargePayloadEmitter', async function () {
      const provider = providers[0].provider;
      const deployerKey = process.env.AUDIT_LOAD_SIGNER_KEY || accounts.OwnerKey;
      const wallet = new ethers.Wallet(deployerKey, provider);
      const balance = await provider.getBalance(wallet.address);
      if (balance === 0n) {
        console.log('[Audit libp2p] Deployer has no balance, skip helper deployment');
        this.skip();
        return;
      }

      const factory = await ethers.getContractFactory('LargePayloadEmitter', wallet);
      const helper = await factory.deploy();
      await helper.waitForDeployment();
      helperAddress = await helper.getAddress();

      expect(helperAddress).to.match(/^0x[a-fA-F0-9]{40}$/);
      console.log('[Audit libp2p] LargePayloadEmitter deployed at', helperAddress);
    });
  });

  describe('3. 大区块传播验证', function () {
    const stageTargets = AUDIT_LIBP2P_STAGE_TXS.length > 0 ? AUDIT_LIBP2P_STAGE_TXS : [16, 32, 48];
    const totalTxs = stageTargets[stageTargets.length - 1];
    const estimatedSignMs = Math.max(15000, totalTxs * 100);
    const estimatedSendMs = Math.max(90000, Math.ceil(totalTxs / AUDIT_LIBP2P_BATCH_SIZE) * (2000 + AUDIT_LIBP2P_BATCH_DELAY_MS));
    const estimatedObserveMs = stageTargets.length * (AUDIT_LIBP2P_STAGE_PAUSE_MS + AUDIT_LIBP2P_OBSERVE_MS);
    this.timeout(60000 + estimatedSignMs + estimatedSendMs + estimatedObserveMs);

    it('大 payload 区块应继续传播，且多节点高度保持一致', async function () {
      expect(helperAddress, 'helper 合约应已部署').to.be.a('string');

      const urls = getRpcUrls();
      const provider = urls.length > 0 ? createProvider(urls[0]) : providers[0].provider;
      const rpcUrl = urls.length > 0 ? urls[0] : hre.network.config.url;
      if (!rpcUrl) {
        throw new Error('No RPC URL available for batch eth_sendRawTransaction requests');
      }

      const signerKey = process.env.AUDIT_LOAD_SIGNER_KEY || accounts.OwnerKey;
      const wallet = new ethers.Wallet(signerKey, provider);
      const balance = await provider.getBalance(wallet.address);
      if (balance === 0n) {
        console.log('[Audit libp2p] Load signer has no balance, skip large payload test');
        this.skip();
        return;
      }

      const helper = await ethers.getContractAt('LargePayloadEmitter', helperAddress, wallet);
      const payload = makeZeroPayload(AUDIT_LIBP2P_PAYLOAD_BYTES);
      const initialNonce = await provider.getTransactionCount(wallet.address);
      const network = await provider.getNetwork();
      let feeData;
      try {
        feeData = await provider.getFeeData();
      } catch (_) {
        feeData = { gasPrice: 0n };
      }
      const gasPrice = BigInt(feeData.gasPrice ?? feeData.maxFeePerGas ?? 0);

      console.log('[Audit libp2p] Stage targets:', stageTargets.join(' -> '));
      console.log('[Audit libp2p] Payload bytes per tx:', AUDIT_LIBP2P_PAYLOAD_BYTES);
      console.log('[Audit libp2p] Target block payload bytes:', AUDIT_LIBP2P_TARGET_BLOCK_BYTES, `(${formatBytesAsMiB(AUDIT_LIBP2P_TARGET_BLOCK_BYTES)} MiB)`);
      console.log('[Audit libp2p] Pre-signing', totalTxs, 'large-payload txs (nonce', String(initialNonce), '+)...');

      const signedTxs = [];
      for (let i = 0; i < totalTxs; i++) {
        const tx = await helper.consume.populateTransaction(payload, {
          nonce: initialNonce + i,
          gasLimit: AUDIT_LIBP2P_GAS_LIMIT,
          gasPrice,
          type: 0,
          chainId: Number(network.chainId),
        });
        tx.from = wallet.address;
        signedTxs.push(await wallet.signTransaction(tx));
      }

      const stageResults = [];
      let previousTarget = 0;
      let observedTargetBlock = false;

      for (let stageIndex = 0; stageIndex < stageTargets.length; stageIndex++) {
        const stageTarget = stageTargets[stageIndex];
        const stageTxs = signedTxs.slice(previousTarget, stageTarget);
        if (stageTxs.length === 0) {
          continue;
        }

        const stageStartBlock = await provider.getBlockNumber();
        console.log(
          '[Audit libp2p] Stage',
          `${stageIndex + 1}/${stageTargets.length}`,
          'sending',
          stageTxs.length,
          'large-payload txs up to cumulative',
          stageTarget
        );

        const sendStart = Date.now();
        const sendResult = await sendRawTransactionsInBatches(rpcUrl, stageTxs, AUDIT_LIBP2P_BATCH_SIZE);
        const sendElapsed = ((Date.now() - sendStart) / 1000).toFixed(1);
        console.log(' [Audit libp2p] Stage', `${stageIndex + 1}`, 'sent', sendResult.sent, 'txs (failed', sendResult.failed, ') in', sendElapsed, 's');
        if (sendResult.errorSummary.length > 0) {
          console.log('[Audit libp2p] Stage top send errors:', sendResult.errorSummary);
        }

        previousTarget = stageTarget;

        if (AUDIT_LIBP2P_STAGE_PAUSE_MS > 0) {
          console.log('[Audit libp2p] Cooling down for', AUDIT_LIBP2P_STAGE_PAUSE_MS, 'ms before observation');
          await sleep(AUDIT_LIBP2P_STAGE_PAUSE_MS);
        }

        const observation = await observeStage(provider, providers, stageStartBlock, AUDIT_LIBP2P_OBSERVE_MS, helperAddress);
        observedTargetBlock = observedTargetBlock || observation.maxPayloadBytes >= AUDIT_LIBP2P_TARGET_BLOCK_BYTES;

        const stageResult = {
          stage: stageIndex + 1,
          cumulativeTarget: stageTarget,
          sent: sendResult.sent,
          failed: sendResult.failed,
          progress: observation.progress,
          maxInterval: observation.maxInterval,
          maxPayloadBytes: observation.maxPayloadBytes,
          reachedTargetBlockSize: observation.maxPayloadBytes >= AUDIT_LIBP2P_TARGET_BLOCK_BYTES,
          heightDiff: observation.heightDiff,
        };
        stageResults.push(stageResult);
        console.log('[Audit libp2p] Stage observation:', stageResult);
        if (observation.payloadBlocks.length > 0) {
          console.log('[Audit libp2p] Stage payload blocks:', observation.payloadBlocks);
        }
        if (observation.heights) {
          console.log('[Audit libp2p] Stage multi-node heights:', observation.heights);
        }

        expect(sendResult.failed, '阶段发送不应失败').to.equal(0);
        expect(observation.progress, '大 payload 阶段后应继续出块').to.be.gte(1);
        if (observation.maxInterval > 0) {
          expect(observation.maxInterval, '区块间隔不应超过阈值').to.be.lte(AUDIT_MAX_BLOCK_INTERVAL_MS);
        }
        if (typeof observation.heightDiff === 'number') {
          expect(observation.heightDiff, '多节点区块高度差应 ≤ 1').to.be.lte(1);
        }
      }

      console.log('[Audit libp2p] Final stage results:', stageResults);
      console.log(
        '[Audit libp2p] Target block bytes:',
        AUDIT_LIBP2P_TARGET_BLOCK_BYTES,
        `(${formatBytesAsMiB(AUDIT_LIBP2P_TARGET_BLOCK_BYTES)} MiB)`,
        'observed:',
        observedTargetBlock
      );
      console.log('[Audit libp2p] Note: correlate target stages with proposer logs and rlpBytes for final audit evidence');

      expect(stageResults.length, '至少应执行一个高 payload 阶段').to.be.gte(1);
      if (AUDIT_LIBP2P_REQUIRE_TARGET_BLOCK) {
        expect(observedTargetBlock, '至少一个阶段应达到目标单区块 payload 字节数').to.equal(true);
      }
    });
  });
});
