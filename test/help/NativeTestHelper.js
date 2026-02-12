const { ethers } = require('hardhat');
const grpc = require("@grpc/grpc-js");

// ==================== 常量配置 ====================

const NATIVE_TOKEN_ADDRESS = "0x1613f8c4E39bD0db8F3A74cB1BF0cc94253b9672";
const RPC_URL = "dev2-node3-rpc.hamsa-ucl.com:50051";
// const RPC = 'http://dev2-ucl-l2.hamsa-ucl.com:8545';
const RPC = 'http://l2-node3-native.hamsa-ucl.com:8545';

// Native Token ABI
const NATIVE_ABI = [{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"burn","outputs":[{"internalType":"bool","name":"success","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256[]","name":"tokenIds","type":"uint256[]"}],"name":"checkTokenIds","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getToken","outputs":[{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"enum INativeToken.TokenStatus","name":"status","type":"uint8"},{"components":[{"internalType":"uint256","name":"cl_x","type":"uint256"},{"internalType":"uint256","name":"cl_y","type":"uint256"},{"internalType":"uint256","name":"cr_x","type":"uint256"},{"internalType":"uint256","name":"cr_y","type":"uint256"}],"internalType":"struct INativeToken.EncryptedAmount","name":"amount","type":"tuple"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"rollbackTokenId","type":"uint256"}],"internalType":"struct INativeToken.TokenEntity","name":"entity","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address[]","name":"recipients","type":"address[]"},{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"enum INativeToken.TokenStatus","name":"status","type":"uint8"},{"components":[{"internalType":"uint256","name":"cl_x","type":"uint256"},{"internalType":"uint256","name":"cl_y","type":"uint256"},{"internalType":"uint256","name":"cr_x","type":"uint256"},{"internalType":"uint256","name":"cr_y","type":"uint256"}],"internalType":"struct INativeToken.EncryptedAmount","name":"amount","type":"tuple"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"rollbackTokenId","type":"uint256"}],"internalType":"struct INativeToken.TokenEntity[]","name":"tokens","type":"tuple[]"},{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"components":[{"internalType":"uint256","name":"cl_x","type":"uint256"},{"internalType":"uint256","name":"cl_y","type":"uint256"},{"internalType":"uint256","name":"cr_x","type":"uint256"},{"internalType":"uint256","name":"cr_y","type":"uint256"}],"internalType":"struct INativeToken.EncryptedAmount","name":"value","type":"tuple"}],"internalType":"struct INativeToken.ElGamalToken","name":"newAllowed","type":"tuple"},{"internalType":"uint256[8]","name":"proof","type":"uint256[8]"},{"internalType":"uint256[]","name":"publicInputs","type":"uint256[]"},{"internalType":"uint256","name":"paddingNum","type":"uint256"}],"name":"mint","outputs":[{"internalType":"bool","name":"success","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"minter","type":"address"},{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"components":[{"internalType":"uint256","name":"cl_x","type":"uint256"},{"internalType":"uint256","name":"cl_y","type":"uint256"},{"internalType":"uint256","name":"cr_x","type":"uint256"},{"internalType":"uint256","name":"cr_y","type":"uint256"}],"internalType":"struct INativeToken.EncryptedAmount","name":"value","type":"tuple"}],"internalType":"struct INativeToken.ElGamalToken","name":"allowed","type":"tuple"}],"name":"setMintAllowed","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address[]","name":"recipients","type":"address[]"},{"internalType":"uint256[]","name":"consumedIds","type":"uint256[]"},{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"enum INativeToken.TokenStatus","name":"status","type":"uint8"},{"components":[{"internalType":"uint256","name":"cl_x","type":"uint256"},{"internalType":"uint256","name":"cl_y","type":"uint256"},{"internalType":"uint256","name":"cr_x","type":"uint256"},{"internalType":"uint256","name":"cr_y","type":"uint256"}],"internalType":"struct INativeToken.EncryptedAmount","name":"amount","type":"tuple"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"rollbackTokenId","type":"uint256"}],"internalType":"struct INativeToken.TokenEntity[]","name":"newTokens","type":"tuple[]"},{"internalType":"uint256[8]","name":"proof","type":"uint256[8]"},{"internalType":"uint256[]","name":"publicInputs","type":"uint256[]"},{"internalType":"uint256","name":"paddingNum","type":"uint256"}],"name":"split","outputs":[{"internalType":"bool","name":"success","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"string","name":"memo","type":"string"}],"name":"transfer","outputs":[{"internalType":"bool","name":"success","type":"bool"}],"stateMutability":"nonpayable","type":"function"}]

// ==================== 基础辅助函数 ====================

/**
 * 创建 gRPC 认证元数据
 * @param {string} privateKey - 私钥
 * @param {string} messagePrefix - 消息前缀，默认为 "login"
 * @returns {grpc.Metadata} gRPC 元数据对象
 */
async function createAuthMetadata(privateKey, messagePrefix = "login") {
    const wallet = new ethers.Wallet(privateKey);
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${messagePrefix}_${timestamp}`;
    const signature = await wallet.signMessage(message);

    const metadata = new grpc.Metadata();
    metadata.set('address', wallet.address.toLowerCase());
    metadata.set('signature', signature);
    metadata.set('message', message);

    return metadata;
}

/**
 * 延迟函数
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise} Promise 对象
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== Mint 相关函数 ====================

/**
 * 设置 mint allowance
 * @param {ethers.Contract} nativeContract - Native token 合约实例
 * @param {Object} client - gRPC 客户端
 * @param {string} minterAddress - Minter 地址
 * @param {string} ownerPrivateKey - Owner 私钥
 * @param {number} amount - Allowance 数量
 */
async function setupMintAllowance(nativeContract, client, minterAddress, ownerPrivateKey, amount) {
    console.log(`    [setupMintAllowance] Creating auth metadata...`);
    const ownerMetadata = await createAuthMetadata(ownerPrivateKey);
    
    console.log(`    [setupMintAllowance] Calling gRPC encodeElgamalAmount with amount: ${amount}...`);
    const response = await client.encodeElgamalAmount(amount, ownerMetadata);
    console.log(`    [setupMintAllowance] ✅ Got response from gRPC`);
    
    const allowed = {
        id: ethers.toBigInt(response.token_id),
        value: {
            cl_x: ethers.toBigInt(response.amount.cl_x),
            cl_y: ethers.toBigInt(response.amount.cl_y),
            cr_x: ethers.toBigInt(response.amount.cr_x),
            cr_y: ethers.toBigInt(response.amount.cr_y)
        }
    };

    console.log(`    [setupMintAllowance] Calling contract.setMintAllowed...`);
    console.log(`    [setupMintAllowance] Minter : `, minterAddress)
    const tx = await nativeContract.setMintAllowed(minterAddress, allowed, { gasLimit: 100000 });
    console.log(`    [setupMintAllowance] Transaction sent: ${tx.hash}, waiting for confirmation...`);
    await tx.wait();
    console.log(`    [setupMintAllowance] ✅ Transaction confirmed`);
    
    return tx;
}

// ==================== Split 相关函数 ====================

/**
 * 准备 split 请求（单个 minter 版本）
 * @param {Object} client - gRPC 客户端
 * @param {ethers.Wallet} minterWallet - Minter 钱包
 * @param {grpc.Metadata} minterMetadata - Minter 认证元数据
 * @param {string} receiver - 接收者地址
 * @param {number} round_number - Split 轮数
 * @param {string} tokenAddress - Token 合约地址
 * @returns {Array} Split 请求数组
 */
async function prepareSplitRequests(client, minterWallet, minterMetadata, receiver, round_number, tokenAddress) {
    const requests = [];
    console.log(`Preparing ${round_number} split requests, 128 tokens each...`);

    for (let i = 0; i < round_number; i++) {
        const to_accounts = [];
        // Create 64 pairs of recipients (128 total outputs)
        for (let j = 0; j < 64; j++) {
            to_accounts.push(
                { address: receiver, amount: 10, comment: `split-${i}-${j}-r1` },
                { address: receiver, amount: 10, comment: `split-${i}-${j}-r2` }
            );
        }
        requests.push({
            sc_address: tokenAddress,
            token_type: '0',
            from_address: minterWallet.address,
            to_accounts
        });
    }

    return requests;
}

/**
 * 生成 split proofs
 * @param {Object} client - gRPC 客户端
 * @param {Array} requests - Split 请求数组
 * @param {grpc.Metadata} minterMetadata - Minter 认证元数据
 * @returns {Array} Request ID 数组
 */
async function generateSplitProofs(client, requests, minterMetadata) {
    const requestIds = [];
    console.log(`Generating ${requests.length} split proofs...`);

    for (let i = 0; i < requests.length; i++) {
        const req = requests[i];
        const response = await client.generateBatchSplitToken(req, minterMetadata);
        requestIds.push(response.request_id);

        // Display progress
        const progress = Math.round(((i + 1) / requests.length) * 100);
        if ((i + 1) % 5 === 0 || i === requests.length - 1) {
            console.log(`  Progress: ${i + 1}/${requests.length} (${progress}%)`);
        }
    }

    return requestIds;
}

/**
 * 执行批量并发 split 操作
 * @param {Object} client - gRPC 客户端
 * @param {Array} requestIds - Request ID 数组
 * @param {ethers.Wallet} minterWallet - Minter 钱包
 * @param {grpc.Metadata} minterMetadata - Minter 认证元数据
 * @param {ethers.Contract} nativeContract - Native token 合约实例
 * @returns {Object} 执行结果统计
 */
async function executeBatchedConcurrentSplits(client, requestIds, minterWallet, minterMetadata, nativeContract) {
    console.log(`\n⚡ Starting concurrent split transaction execution...`);
    console.log(`Executing ${requestIds.length} split requests`);

    const startTime = Date.now();
    const startNonce = await minterWallet.getNonce('pending');

    // Prepare all transaction data
    console.log(`Preparing ${requestIds.length} split transactions...`);
    const txData = await Promise.all(
        requestIds.map(async (requestId, index) => {
            const response = await client.getBatchSplitTokenDetail(
                { request_id: requestId },
                minterMetadata
            );

            return {
                recipients: response.to_addresses,
                consumptionData: response.consumedIds.map(ids => ids.token_id),
                newTokens: response.newTokens.map((account, idx) => ({
                    id: account.token_id,
                    owner: minterWallet.address,
                    status: 2,
                    amount: {
                        cl_x: ethers.toBigInt(account.cl_x),
                        cl_y: ethers.toBigInt(account.cl_y),
                        cr_x: ethers.toBigInt(account.cr_x),
                        cr_y: ethers.toBigInt(account.cr_y)
                    },
                    to: idx % 2 === 0 ? minterWallet.address : response.to_addresses[Math.floor(idx / 2)],
                    rollbackTokenId: idx % 2 === 0 ? 0 : response.newTokens[idx + 1].token_id
                })),
                proof: response.proof.map(p => ethers.toBigInt(p)),
                publicInputs: response.public_input.map(i => ethers.toBigInt(i)),
                batchedSize: response.batched_size,
                nonce: startNonce + index
            };
        })
    );

    console.log(`✅ Transaction data preparation completed`);

    // Sign all transactions
    console.log(`✍️  Signing ${txData.length} split transactions...`);
    const signedTxs = await Promise.all(txData.map(async (data) => {
        try {
            const tx = await nativeContract.split.populateTransaction(
                minterWallet.address,
                data.recipients,
                data.consumptionData,
                data.newTokens,
                data.proof,
                data.publicInputs,
                data.batchedSize - data.recipients.length,
                {
                    nonce: data.nonce,
                    gasLimit: 450436 * 10,
                    gasPrice: 0
                }
            );
            tx.from = minterWallet.address;
            tx.type = 0;
            const signedTx = await minterWallet.signTransaction(tx);
            return { signedTx, newTokens: data.newTokens, success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }));

    const signed = signedTxs.filter(r => r.success);
    const failedSigning = signedTxs.filter(r => !r.success);

    if (failedSigning.length > 0) {
        console.error(`❌ ${failedSigning.length} transactions failed to sign.`);
    }

    // Push all signed transactions in one batch
    const results = [];
    const pendingTxHashes = [];

    console.log(`📤 Pushing ${signed.length} signed transactions...`);

    const payload = signed.map((item, idx) => ({
        jsonrpc: "2.0", id: idx, method: "eth_sendRawTransaction", params: [item.signedTx]
    }));

    const response = await fetch(RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    const res = await response.json();
    const batchResponses = Array.isArray(res) ? res : [res];

    batchResponses.forEach((resp, idx) => {
        const isSuccess = !resp.error;
        if (isSuccess && resp.result) {
            pendingTxHashes.push(resp.result);
        }
        results.push({
            success: isSuccess,
            error: resp.error ? resp.error.message : null
        });
    });

    // Wait for all transactions to be mined
    if (pendingTxHashes.length > 0) {
        console.log(`⏳ Waiting for ${pendingTxHashes.length} transactions to be mined...`);
        
        const pollReceipt = async (hash, timeout = 60000) => {
            const start = Date.now();
            while (Date.now() - start < timeout) {
                const receipt = await ethers.provider.getTransactionReceipt(hash);
                if (receipt) return receipt;
                await sleep(1000);
            }
            throw new Error(`Timeout waiting for receipt of ${hash}`);
        };

        const CONFIRM_BATCH = 20;
        for (let i = 0; i < pendingTxHashes.length; i += CONFIRM_BATCH) {
            const batchHashes = pendingTxHashes.slice(i, i + CONFIRM_BATCH);
            await Promise.all(batchHashes.map(hash => 
                pollReceipt(hash).catch(e => console.warn(`Wait failed for ${hash}: ${e.message}`))
            ));
        }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    console.log(`\n✅ Split execution completed in ${duration}s`);
    console.log(`   Successful: ${successCount}/${results.length}`);
    console.log(`   Failed: ${failedCount}/${results.length}`);

    // Collect all recipient tokens (odd indices)
    const allRecipientTokens = [];
    signed.forEach(item => {
        if (item.newTokens) {
            item.newTokens.forEach((token, idx) => {
                if (idx % 2 === 1) {
                    allRecipientTokens.push(token.id);
                }
            });
        }
    });

    return {
        totalTransactions: results.length,
        successfulTransactions: successCount,
        failedTransactions: failedCount,
        recipientTokens: allRecipientTokens,
        duration: duration
    };
}

// ==================== Transfer 相关函数 ====================

/**
 * 执行批量 transfer 操作
 * @param {Object} client - gRPC 客户端
 * @param {Array} tokenList - Token ID 列表
 * @param {ethers.Wallet} minterWallet - Minter 钱包
 * @param {ethers.Contract} nativeContract - Native token 合约实例
 * @returns {Object} 执行结果统计
 */
async function executeBatchTransfers(client, tokenList, minterWallet, nativeContract) {
    console.log(`\n📤 Starting batch transfer execution...`);
    console.log(`Transferring ${tokenList.length} tokens...`);

    const baseNonce = await minterWallet.getNonce('pending');

    // Sign all transfer transactions
    console.log(`✍️  Signing ${tokenList.length} transfer transactions...`);
    const signedTxs = await Promise.all(tokenList.map(async (tokenId, i) => {
        try {
            const tx = await nativeContract.transfer.populateTransaction(
                tokenId, 
                `transfer-${i}`,
                {
                    nonce: baseNonce + i,
                    gasLimit: 3000000,
                    gasPrice: 0
                }
            );
            tx.from = minterWallet.address;
            tx.type = 0;
            return { signedTx: await minterWallet.signTransaction(tx), tokenId, success: true };
        } catch (e) {
            return { tokenId, success: false, error: e.message };
        }
    }));

    const signed = signedTxs.filter(r => r.success);
    const failed = signedTxs.filter(r => !r.success);

    if (failed.length) {
        console.error(`❌ ${failed.length} transactions failed during signing`);
    }

    // Batch send
    const BATCH_SIZE = 5000;
    const results = [];
    const txHashMap = new Map();

    for (let i = 0; i < signed.length; i += BATCH_SIZE) {
        const batch = signed.slice(i, i + BATCH_SIZE);
        const payload = batch.map((item, idx) => ({
            jsonrpc: "2.0", id: i + idx, method: "eth_sendRawTransaction", params: [item.signedTx]
        }));

        console.log(`📤 Pushing transfer batch ${Math.floor(i / BATCH_SIZE) + 1}, containing ${batch.length} transactions...`);

        const response = await fetch(RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const res = await response.json();
        const batchResponses = Array.isArray(res) ? res : [res];
        
        batchResponses.forEach((resp, idx) => {
            const txInfo = batch[idx];
            if (resp.result) {
                txHashMap.set(txInfo.tokenId, resp.result);
            }
            results.push({
                tokenId: txInfo.tokenId,
                txHash: resp.result,
                error: resp.error,
                success: !resp.error
            });
        });

        await sleep(500);
    }

    const successfulTxs = results.filter(r => r.success);
    const failedTxs = results.filter(r => !r.success);

    console.log(`\n✅ Transfer execution completed`);
    console.log(`   Successful: ${successfulTxs.length}/${results.length}`);
    console.log(`   Failed: ${failedTxs.length}/${results.length}`);

    return {
        total: signedTxs.length,
        success: successfulTxs.length,
        failed: failed.length + failedTxs.length,
        signingFailed: failed.length,
        executionFailed: failedTxs.length,
        txHashes: Array.from(txHashMap.values())
    };
}

// ==================== 导出 ====================

module.exports = {
    // 常量
    NATIVE_TOKEN_ADDRESS,
    RPC_URL,
    RPC,
    NATIVE_ABI,
    
    // 基础函数
    createAuthMetadata,
    sleep,
    
    // Mint 函数
    setupMintAllowance,
    
    // Split 函数
    prepareSplitRequests,
    generateSplitProofs,
    executeBatchedConcurrentSplits,
    
    // Transfer 函数
    executeBatchTransfers
};
