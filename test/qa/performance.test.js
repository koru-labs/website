const { expect } = require("chai");
const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')
const pLimit = require("p-limit");


const rpcUrl = "dev-node3-rpc.hamsa-ucl.com:50051"
// const rpcUrl = 'a901f625f7fbc414d89f04b67325365c-1938211366.us-west-1.elb.amazonaws.com:50051'
// const rpcUrl_1 = "a10062b98cbe34ba2a0b278754c41a1e-660863113.us-west-1.elb.amazonaws.com:50051"
const client = createClient(rpcUrl)

const {
    createAuthMetadata, registerUser, allowBanksInTokenSmartContract, setMinterAllowed, getAddressBalance2,
    callPrivateMint, getAccount,getMinterAllowed,callPrivateTransfers
} = require("../help/testHelp")
const {address, hexString} = require("hardhat/internal/core/config/config-validation");
const {bigint} = require("hardhat/internal/core/params/argumentTypes");
const axios = require("axios");

const l1CustomNetwork = {
    name: "BESU",
    chainId: 1337,
};
const options = {
    batchMaxCount: 10,
    staticNetwork: true
};


// const L1Url = hardhatConfig.networks.dev_ucl_L2.url;
const providerUrl = hardhatConfig.networks.dev_ucl_L2.url;
const l1Provider = new ethers.JsonRpcProvider(providerUrl, l1CustomNetwork, options);

const adminWallet = new ethers.Wallet(accounts.OwnerKey, l1Provider);
const minterWallet = new ethers.Wallet(accounts.MinterKey, l1Provider);
const spender1Wallet = new ethers.Wallet(accounts.Spender1Key, l1Provider);
const to1Wallet = new ethers.Wallet(accounts.To1PrivateKey, l1Provider);

const toAddress1 = accounts.To1;
const toAddress2 = accounts.To2;


const userInNode1 = '0xbA268f776F70caDB087e73020dfE41c7298363Ed';
const userInNode2 = '0xF8041E1185C7106121952bA9914ff904A4A01c80';
const userInNode3 = '0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB';
const userInNode4 = '0x5a3288A7400B2cd5e0568728E8216D9392094892';
const adminPrivateKey = hardhatConfig.networks.dev_ucl_L2.accounts[1];
const node4AdminPrivateKey = "81690fb141b4ae5682ad1fd73b29ae1bcc67891e93de73c6f636402deac21171";

const amount = 10;
let preBalance,postBalance;
let preAllowance,postAllowance;

// const minterMeta = await createAuthMetadata(accounts.MinterKey);
// const onwerMeta = await createAuthMetadata(accounts.Owner)



function convertBigInt2Hex(number) {
    return ethers.toBigInt(number).toString(10)
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getTokenBalanceByAdmin(account){
    const metadata = await  createAuthMetadata(adminPrivateKey)
    let balance = await getAddressBalance2(client, config.contracts.PrivateERCToken, account, metadata)
    return Number(balance.balance)
}

// 将transferTasks分批执行
async function executeTransferBatch(transferTasks, batchSize = 10) {
    const results = [];
    for (let i = 0; i < transferTasks.length; i += batchSize) {
        const batch = transferTasks.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch);
        results.push(...batchResults);

        // 批次间添加较长延迟
        if (i + batchSize < transferTasks.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    return results;
}

async function getSplitTokenList(grpcClient,owner, scAddress,metadata){
    const grpcResult = await grpcClient.getSplitTokenList(owner, scAddress, metadata);
    return grpcResult;
}

async function DirectMint(receiver,amount) {
    const minterMeta = await createAuthMetadata(accounts.MinterKey)
    const generateRequest = {
        from_address: accounts.Minter,
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        to_address: receiver,
        amount: amount
    };
    const response = await client.generateDirectMint(generateRequest,minterMeta);
    console.log("Generate Mint Proof response:", response);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
    await sleep(4000)
}

async function mintBy(address,amount,minterWallet) {
    const key = minterWallet.privateKey
    const minterMeta = await createAuthMetadata(key);
    const wallet = new ethers.Wallet(key, l1Provider);
    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: minterWallet.address,
        to_address: address,
        amount: amount
    };
    console.log("generateMintRequest:", generateRequest)
    const response = await client.generateMintProof(generateRequest,minterMeta);
    console.log("generateMintProofResult:", response)
    const receipt = await callPrivateMint(config.contracts.PrivateERCToken, response, wallet)
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
    return  receipt
}

const MAX_CONCURRENCY = 3;
async function processBatch(batchSignedTxs, batchMetadata, batchIndex, totalBatches, providerUrl, allResults) {
    const startTime = Date.now();
    console.log(`正在发送批次 ${batchIndex+1}/${totalBatches}, 批次大小: ${batchSignedTxs.length}, 开始时间: ${new Date(startTime).toISOString()}`);

    const batchPayload = batchSignedTxs.map((signedTx, index) => ({
        jsonrpc: "2.0",
        id: batchMetadata[index].taskId,
        method: "eth_sendRawTransaction",
        params: [signedTx],
    }));

    try {
        const response = await fetch(providerUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(batchPayload),
        });

        const responseData = await response.json();
        const endTime = Date.now();
        const duration = endTime - startTime;

        if (Array.isArray(responseData)) {
            responseData.forEach((result) => {
                const metadata = batchMetadata.find((m) => m.taskId === result.id);
                if (metadata) {
                    if (result.error) {
                        allResults.push({
                            success: false,
                            nonce: metadata.nonce,
                            tokenId: metadata.tokenId,
                            error: result.error.message,
                            minterAddress: metadata.minterAddress,
                        });
                    } else {
                        allResults.push({
                            success: true,
                            nonce: metadata.nonce,
                            tokenId: metadata.tokenId,
                            txHash: result.result,
                            minterAddress: metadata.minterAddress,
                        });
                    }
                }
            });
        } else if (responseData.error) {
            batchMetadata.forEach((metadata) => {
                allResults.push({
                    success: false,
                    nonce: metadata.nonce,
                    tokenId: metadata.tokenId,
                    error: responseData.error.message,
                    minterAddress: metadata.minterAddress,
                });
            });
        }

        console.log(`批次 ${batchIndex+1}/${totalBatches} 发送完成, 结束时间: ${new Date(endTime).toISOString()}, 耗时: ${duration}ms`);
    } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.error(`批次 ${batchIndex+1}/${totalBatches} 请求失败, 结束时间: ${new Date(endTime).toISOString()}, 耗时: ${duration}ms, 错误:`, error.message);

        batchMetadata.forEach((metadata) => {
            allResults.push({
                success: false,
                nonce: metadata.nonce,
                tokenId: metadata.tokenId,
                error: error.message,
                minterAddress: metadata.minterAddress,
            });
        });
    }
}

describe.only("Performance Test with created 10 minters", function () {
    this.timeout(120000000);

    const TOTAL_SIZE = 1000;
    const BATCH_SIZE = 1000;

    const minter1 = ethers.Wallet.createRandom();
    const minter2 = ethers.Wallet.createRandom();
    const minter3 = ethers.Wallet.createRandom();

    // const minter4 = ethers.Wallet.createRandom();
    // const minter5 = ethers.Wallet.createRandom();
    // const minter6 = ethers.Wallet.createRandom();
    // const minter7 = ethers.Wallet.createRandom();
    // const minter8 = ethers.Wallet.createRandom();
    // const minter9 = ethers.Wallet.createRandom();
    // const minter10 = ethers.Wallet.createRandom();

    const minters = [
        // {
        //     address: accounts.Minter,
        //     wallet: new ethers.Wallet(accounts.MinterKey, l1Provider),
        // }
        {
            address: minter1.address,
            wallet: new ethers.Wallet(minter1.privateKey, l1Provider),
        },
        {
            address: minter2.address,
            wallet: new ethers.Wallet(minter2.privateKey, l1Provider)
        },
        {
            address: minter3.address,
            wallet: new ethers.Wallet(minter3.privateKey, l1Provider)
        }
        // {
        //     address: minter4.address,
        //     wallet: new ethers.Wallet(minter4.privateKey, l1Provider)
        // },
        // {
        //     address: minter5.address ,
        //     wallet: new ethers.Wallet(minter5.privateKey, l1Provider)
        // },
        // {
        //     address: minter6.address,
        //     wallet: new ethers.Wallet(minter6.privateKey, l1Provider)
        // },
        // {
        //     address: minter7.address,
        //     wallet: new ethers.Wallet(minter7.privateKey, l1Provider)
        // },
        // {
        //     address: minter8.address,
        //     wallet: new ethers.Wallet(minter8.privateKey, l1Provider)
        // },
        // {
        //     address: minter9.address,
        //     wallet: new ethers.Wallet(minter9.privateKey, l1Provider)
        // },
        // {
        //     address: minter10.address,
        //     wallet: new ethers.Wallet(minter10.privateKey, l1Provider)
        // }
    ]

    it('Registe ', async () => {
        for (let i = 0; i < minters.length; i++){
            await registerUser(adminPrivateKey,client, minters[i].address, "minter");
            await sleep(10000);
            let response = await getAccount(adminPrivateKey,client, minters[i].address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("minter");
        }
    });

    it('Set allowance', async () => {
        for (let i = 0; i< minters.length; i++){
            console.log(`第${i} 个 minter set allowance开始,${minters[i].address}`)
            await allowBanksInTokenSmartContract(minters[i].address)
            await setMinterAllowed(minters[i].address)
            await sleep(10000)
            const minterMeta = await createAuthMetadata(minters[i].wallet.privateKey)
            console.log(await getMinterAllowed(client,minterMeta))
        }
    });
    it('Mint', async () => {

        // const amount = TOTAL_SIZE/10 + 100;
        const amount =  200;
        // const amount = 200;
        for (let i = 0; i < minters.length; i++){
            // const preBalance = await getTokenBalanceByAdmin(minters[i].address);
            // await mintBy(minters[i].address, amount,minters[i].wallet)
            // await sleep(2000)
            // const postBalance = await getTokenBalanceByAdmin(minters[i].address);
            // expect(postBalance - preBalance).equal(amount)
            for (let j = 0; j < 10; j++){
                console.log(`mintBy ${minters[i].address} ${j+1} 轮开始}`)
                await mintBy(minters[i].address, amount,minters[i].wallet)
                await sleep(2000)
                console.log(`第${i+1}轮mint完成`)
                console.log(await getTokenBalanceByAdmin(minters[i].address))
            }
        }
    });

    it("Split Operations", async function () {
        // await getTokenBalanceByAdmin(accounts.Minter)
        console.log("开始发生成分割代币请求...");
        const startTime = Date.now();

        const results = await Promise.all(minters.map(async (minter, minterIndex) => {
            let meta = await createAuthMetadata(minter.wallet.privateKey);
            const minterResults = [];

            console.log(`开始处理账户 ${minterIndex + 1}`);

            for (let i = 0; i < TOTAL_SIZE; i++) {
                const splitRequest = {
                    sc_address: config.contracts.PrivateERCToken,
                    token_type: '0',
                    from_address: minter.address,
                    to_address: accounts.To1,
                    amount: 1,
                    comment: "transfer"
                };
                try {
                    const requestStartTime = Date.now();
                    console.log(`账户 ${minterIndex + 1} 提交第 ${i + 1} 轮请求 (时间: ${new Date().toISOString()})`);

                    const response = await client.generateSplitToken(splitRequest, meta);

                    // 等待自己的操作完成
                    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, meta);

                    const requestEndTime = Date.now();
                    console.log(`账户 ${minterIndex + 1} 第 ${i + 1} 轮请求完成，请求ID: ${response.request_id} (耗时: ${requestEndTime - requestStartTime}ms)`);
                    await sleep(500)
                    minterResults.push({
                        success: true,
                        round: i,
                        response,
                        duration: requestEndTime - requestStartTime
                    });
                } catch (error) {
                    console.error(`账户 ${minterIndex + 1} 第 ${i + 1} 轮请求失败:`, error.toString());
                    minterResults.push({
                        success: false,
                        round: i,
                        error: error.toString()
                    });
                    await sleep(2000);
                }
                // 在每轮之间添加短暂延迟避免瞬时压力过大
                if (i < TOTAL_SIZE - 1) {
                    await sleep(1000);
                }
            }

            return {
                minterIndex,
                results: minterResults,
                totalSuccess: minterResults.filter(r => r.success).length
            };
        }));

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        // 统计结果
        const totalRequests = results.reduce((sum, r) => sum + r.results.length, 0);
        const totalSuccess = results.reduce((sum, r) => sum + r.totalSuccess, 0);

        console.log(`\n=== 执行结果统计 ===`);
        console.log(`总耗时: ${totalTime}ms`);
        console.log(`总请求数: ${totalRequests}`);
        console.log(`成功请求数: ${totalSuccess}`);
        console.log(`成功率: ${(totalSuccess/totalRequests*100).toFixed(2)}%`);

        // 按minter显示详细结果
        results.forEach(result => {
            const avgDuration = result.results
                .filter(r => r.success)
                .reduce((sum, r) => sum + r.duration, 0) / result.totalSuccess || 0;

            console.log(`\nMinter ${result.minterIndex + 1}:`);
            console.log(`  成功: ${result.totalSuccess}/${TOTAL_SIZE}`);
            console.log(`  平均耗时: ${avgDuration.toFixed(2)}ms`);
        });
        await sleep(6000)
    });
    it.skip('TPS PrivateTransfer Test ： Submit with Minter Parallelization and Batching', async () => {
        const BATCH_SIZE = 500; // 设置批量大小为100
        const startTestTime = Date.now();

        // 并行收集所有 minter 的 token 数据
        console.log("开始并行收集所有 minter 的 token 数据...");
        const allMinterData = await Promise.all(minters.map(async (minter, j) => {
            const minterAddress = minter.address;
            const minterWallet = minter.wallet;
            const minterMeta = await createAuthMetadata(minter.wallet.privateKey);

            try {
                const splitTokenList = await getSplitTokenList(
                    client,
                    minterAddress,
                    config.contracts.PrivateERCToken,
                    minterMeta
                );

                const tokens = splitTokenList.split_tokens || [];
                if (tokens.length > 0) {
                    const startNonce = await minterWallet.getNonce();
                    console.log(`Minter ${j+1} (${minterAddress}) 有 ${tokens.length} 个 token`);
                    return {
                        minterIndex: j,
                        minterAddress: minterAddress,
                        minterWallet: minterWallet,
                        tokens: tokens,
                        currentNonce: startNonce,
                    };
                } else {
                    console.log(`Minter ${j+1} (${minterAddress}) 没有 token`);
                }
            } catch (error) {
                console.error(`获取 minter ${minterAddress} token 列表失败:`, error.message);
            }
            return null;
        }));

        // 过滤掉空值
        const validMinterData = allMinterData.filter(data => data !== null);
        console.log(`共收集到 ${validMinterData.length} 个有效 minter 的数据`);

        // 为每个 minter 并行构建 transfer 任务
        console.log("开始为每个 minter 构建 transfer 任务...");
        const minterTaskGroups = await Promise.all(validMinterData.map(async (minterData) => {
            const { minterWallet, tokens } = minterData;
            const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, minterWallet);

            const minterTasks = [];
            const usedTokenIds = new Set(); // 每个 minter 单独的 tokenId 集合

            for (let i = 0; i < tokens.length; i++) {
                const tokenId = '0x' + tokens[i].token_id;

                // 如果 tokenId 已使用，跳过
                if (usedTokenIds.has(tokenId)) continue;
                usedTokenIds.add(tokenId);

                const taskNonce = minterData.currentNonce++;

                minterTasks.push({
                    execute: async () => {
                        try {
                            const tx = await contract.privateTransfer(tokenId, accounts.To2, {
                                nonce: taskNonce,
                            }).catch(error => {
                                throw error;
                            });

                            // 只返回交易哈希，不等待交易确认
                            return {
                                success: true,
                                nonce: taskNonce,
                                tokenId,
                                txHash: tx.hash,
                                minterAddress: minterData.minterAddress
                            };
                        } catch (error) {
                            return {
                                success: false,
                                nonce: taskNonce,
                                tokenId,
                                error: error.message,
                                minterAddress: minterData.minterAddress
                            };
                        }
                    },
                    minterIndex: minterData.minterIndex,
                    tokenId: tokenId
                });
            }

            console.log(`Minter ${minterData.minterIndex+1} 构建了 ${minterTasks.length} 个任务`);
            return minterTasks;
        }));

        // 合并所有 minter 的任务
        const transferTasks = minterTaskGroups.flat();
        console.log(`总共构建了 ${transferTasks.length} 个 transfer 任务`);

        // 使用批量处理执行所有任务
        console.log(`开始批量执行 transfer 任务，批量大小: ${BATCH_SIZE}`);

        const startSubmitTime = Date.now();

        // 批量执行任务
        const allResults = [];
        for (let i = 0; i < transferTasks.length; i += BATCH_SIZE) {
            const batch = transferTasks.slice(i, i + BATCH_SIZE);
            console.log(`正在执行批次 ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(transferTasks.length/BATCH_SIZE)}, 批次大小: ${batch.length}`);

            const batchResults = await Promise.all(batch.map(task => task.execute()));
            allResults.push(...batchResults);

            // 批次间添加短暂延迟，避免网络拥堵
            if (i + BATCH_SIZE < transferTasks.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        const endSubmitTime = Date.now();
        const submitTime = endSubmitTime - startSubmitTime;

        // 统计结果
        const successfulSubmits = allResults.filter(r => r && r.success);
        const submitTPS = (successfulSubmits.length / (submitTime / 1000)).toFixed(2);

        console.log(`\n=== 提交阶段 (Submit) ===`);
        console.log(`提交耗时: ${submitTime}ms`);
        console.log(`提交成功交易数: ${successfulSubmits.length}/${allResults.length}`);
        console.log(`Submit TPS: ${submitTPS}`);
        console.log(`平均每批次处理时间: ${(submitTime/Math.ceil(transferTasks.length/BATCH_SIZE)).toFixed(2)}ms`);

        // 详细统计信息
        const minterStats = {};
        allResults.forEach(result => {
            if (result) {
                const minterAddr = result.minterAddress;
                if (!minterStats[minterAddr]) {
                    minterStats[minterAddr] = { total: 0, success: 0 };
                }
                minterStats[minterAddr].total++;
                if (result.success) {
                    minterStats[minterAddr].success++;
                }
            }
        });

        console.log(`\n=== 按 Minter 统计 ===`);
        Object.keys(minterStats).forEach(minterAddr => {
            const stats = minterStats[minterAddr];
            console.log(`Minter ${minterAddr}: ${stats.success}/${stats.total} 成功`);
        });
    });
    it.skip('TPS PrivateTransfer Test ： Submit with Batch RPC Requests', async () => {
        const BATCH_SIZE = 1000;
        const startTestTime = Date.now();

        // 并行收集所有 minter 的 token 数据
        console.log("开始并行收集所有 minter 的 token 数据...");
        const allMinterData = await Promise.all(minters.map(async (minter, j) => {
            const minterAddress = minter.address;
            const minterWallet = minter.wallet;
            const minterMeta = await createAuthMetadata(minter.wallet.privateKey);

            try {
                const splitTokenList = await getSplitTokenList(
                    client,
                    minterAddress,
                    config.contracts.PrivateERCToken,
                    minterMeta
                );

                const tokens = splitTokenList.split_tokens || [];
                if (tokens.length > 0) {
                    const startNonce = await minterWallet.getNonce();
                    console.log(`Minter ${j+1} (${minterAddress}) 有 ${tokens.length} 个 token`);
                    return {
                        minterIndex: j,
                        minterAddress: minterAddress,
                        minterWallet: minterWallet,
                        tokens: tokens,
                        currentNonce: startNonce,
                    };
                } else {
                    console.log(`Minter ${j+1} (${minterAddress}) 没有 token`);
                }
            } catch (error) {
                console.error(`获取 minter ${minterAddress} token 列表失败:`, error.message);
            }
            return null;
        }));

        // 过滤掉空值
        const validMinterData = allMinterData.filter(data => data !== null);
        console.log(`共收集到 ${validMinterData.length} 个有效 minter 的数据`);

        // 为每个 minter 并行构建 transfer 任务
        console.log("开始为每个 minter 构建 transfer 任务...");
        const minterTaskGroups = await Promise.all(validMinterData.map(async (minterData) => {
            const { minterWallet, tokens } = minterData;
            const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, minterWallet);

            const minterTasks = [];
            const usedTokenIds = new Set(); // 每个 minter 单独的 tokenId 集合

            for (let i = 0; i < tokens.length; i++) {
                const tokenId = '0x' + tokens[i].token_id;

                // 如果 tokenId 已使用，跳过
                if (usedTokenIds.has(tokenId)) continue;
                usedTokenIds.add(tokenId);

                const taskNonce = minterData.currentNonce++;

                // 构建交易数据但不执行
                const txData = await contract.privateTransfer.populateTransaction(tokenId, accounts.To2, {
                    nonce: taskNonce,
                });

                minterTasks.push({
                    minterWallet: minterWallet,
                    txData: txData,
                    nonce: taskNonce,
                    tokenId: tokenId,
                    minterAddress: minterData.minterAddress,
                    minterIndex: minterData.minterIndex
                });
            }

            console.log(`Minter ${minterData.minterIndex+1} 构建了 ${minterTasks.length} 个任务`);
            return minterTasks;
        }));

        // 合并所有 minter 的任务
        const transferTasks = minterTaskGroups.flat();
        console.log(`总共构建了 ${transferTasks.length} 个 transfer 任务`);

        // 使用批量RPC请求执行所有任务
        console.log(`开始批量执行 transfer 任务，批量大小: ${BATCH_SIZE}`);

        const startSubmitTime = Date.now();

        // 批量执行任务
        const allResults = [];
        // const providerUrl = hardhatConfig.networks.ucl_L2.url;
        const chainId = (await l1Provider.getNetwork()).chainId;

        for (let i = 0; i < transferTasks.length; i += BATCH_SIZE) {
            const batch = transferTasks.slice(i, i + BATCH_SIZE);
            console.log(`正在执行批次 ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(transferTasks.length/BATCH_SIZE)}, 批次大小: ${batch.length}`);

            // 为批次中的每个任务创建签名交易
            const batchPayload = [];
            const taskMetadata = []; // 保存任务元数据用于结果处理

            for (let j = 0; j < batch.length; j++) {
                const task = batch[j];
                try {
                    // 补充交易参数
                    task.txData.gasLimit = task.txData.gasLimit || 1000000;
                    task.txData.gasPrice = task.txData.gasPrice || 0;
                    task.txData.chainId = task.txData.chainId || chainId;
                    task.txData.type = task.txData.type || 0;

                    // 签名交易
                    const signedTx = await task.minterWallet.signTransaction(task.txData);
                    console.log("SignedTX Length is ",signedTx.length)

                    batchPayload.push({
                        jsonrpc: "2.0",
                        id: j + 1,
                        method: "eth_sendRawTransaction",
                        params: [signedTx],
                    });

                    taskMetadata.push({
                        taskId: j + 1,
                        nonce: task.nonce,
                        tokenId: task.tokenId,
                        minterAddress: task.minterAddress,
                        minterIndex: task.minterIndex
                    });
                } catch (error) {
                    console.error(`任务签名失败:`, error.message);
                    allResults.push({
                        success: false,
                        nonce: task.nonce,
                        tokenId: task.tokenId,
                        error: error.message,
                        minterAddress: task.minterAddress
                    });
                }
            }

            if (batchPayload.length > 0) {
                try {
                    // 发送批量请求
                    // const response = await fetch(providerUrl, {
                    //     method: 'POST',
                    //     headers: {
                    //         'Content-Type': 'application/json',
                    //     },
                    //     body: JSON.stringify(batchPayload),
                    // });

                    const response = await axios.post(providerUrl, batchPayload, {
                        headers: { "Content-Type": "application/json" },
                    });

                    const responseData = await response.data;

                    // 处理响应结果
                    if (Array.isArray(responseData)) {
                        responseData.forEach((result, index) => {
                            const metadata = taskMetadata.find(m => m.taskId === result.id);
                            if (metadata) {
                                if (result.error) {
                                    allResults.push({
                                        success: false,
                                        nonce: metadata.nonce,
                                        tokenId: metadata.tokenId,
                                        error: result.error.message,
                                        minterAddress: metadata.minterAddress
                                    });
                                } else {
                                    allResults.push({
                                        success: true,
                                        nonce: metadata.nonce,
                                        tokenId: metadata.tokenId,
                                        txHash: result.result,
                                        minterAddress: metadata.minterAddress
                                    });
                                }
                            }
                        });
                    } else if (responseData.error) {
                        // 整体错误处理
                        batch.forEach((task, index) => {
                            allResults.push({
                                success: false,
                                nonce: task.nonce,
                                tokenId: task.tokenId,
                                error: responseData.error.message,
                                minterAddress: task.minterAddress
                            });
                        });
                    }
                } catch (error) {
                    console.error(`批次请求失败:`, error.message);
                    // 将批次中所有任务标记为失败
                    batch.forEach(task => {
                        allResults.push({
                            success: false,
                            nonce: task.nonce,
                            tokenId: task.tokenId,
                            error: error.message,
                            minterAddress: task.minterAddress
                        });
                    });
                }
            }

            // 批次间添加短暂延迟，避免网络拥堵
            if (i + BATCH_SIZE < transferTasks.length) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        const endSubmitTime = Date.now();
        const submitTime = endSubmitTime - startSubmitTime;

        // 统计结果
        const successfulSubmits = allResults.filter(r => r && r.success);
        const submitTPS = (successfulSubmits.length / (submitTime / 1000)).toFixed(2);

        console.log(`\n=== 提交阶段 (Submit) ===`);
        console.log(`提交耗时: ${submitTime}ms`);
        console.log(`提交成功交易数: ${successfulSubmits.length}/${allResults.length}`);
        console.log(`Submit TPS: ${submitTPS}`);
        console.log(`平均每批次处理时间: ${(submitTime/Math.ceil(transferTasks.length/BATCH_SIZE)).toFixed(2)}ms`);

        // 详细统计信息
        const minterStats = {};
        allResults.forEach(result => {
            if (result) {
                const minterAddr = result.minterAddress;
                if (!minterStats[minterAddr]) {
                    minterStats[minterAddr] = { total: 0, success: 0 };
                }
                minterStats[minterAddr].total++;
                if (result.success) {
                    minterStats[minterAddr].success++;
                }
            }
        });

        console.log(`\n=== 按 Minter 统计 ===`);
        Object.keys(minterStats).forEach(minterAddr => {
            const stats = minterStats[minterAddr];
            console.log(`Minter ${minterAddr}: ${stats.success}/${stats.total} 成功`);
        });
    });
    it.skip('TPS PrivateTransfer Test ： Sign First and send in one batch', async () => {
        // const BATCH_SIZE = 1000;
        const startTestTime = Date.now();

        // 并行收集所有 minter 的 token 数据
        console.log("开始并行收集所有 minter 的 token 数据...");
        const allMinterData = await Promise.all(minters.map(async (minter, j) => {
            const minterAddress = minter.address;
            const minterWallet = minter.wallet;
            const minterMeta = await createAuthMetadata(minter.wallet.privateKey);

            try {
                const splitTokenList = await getSplitTokenList(
                    client,
                    minterAddress,
                    config.contracts.PrivateERCToken,
                    minterMeta
                );

                const tokens = splitTokenList.split_tokens || [];
                if (tokens.length > 0) {
                    const startNonce = await minterWallet.getNonce();
                    console.log(`Minter ${j+1} (${minterAddress}) 有 ${tokens.length} 个 token`);
                    return {
                        minterIndex: j,
                        minterAddress: minterAddress,
                        minterWallet: minterWallet,
                        tokens: tokens,
                        currentNonce: startNonce,
                    };
                } else {
                    console.log(`Minter ${j+1} (${minterAddress}) 没有 token`);
                }
            } catch (error) {
                console.error(`获取 minter ${minterAddress} token 列表失败:`, error.message);
            }
            return null;
        }));

        // 过滤掉空值
        const validMinterData = allMinterData.filter(data => data !== null);
        console.log(`共收集到 ${validMinterData.length} 个有效 minter 的数据`);

        // 为每个 minter 并行构建 transfer 任务
        console.log("开始为每个 minter 构建 transfer 任务...");
        const minterTaskGroups = await Promise.all(validMinterData.map(async (minterData) => {
            const { minterWallet, tokens } = minterData;
            const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, minterWallet);

            const minterTasks = [];
            const usedTokenIds = new Set(); // 每个 minter 单独的 tokenId 集合

            for (let i = 0; i < tokens.length; i++) {
                const tokenId = '0x' + tokens[i].token_id;

                // 如果 tokenId 已使用，跳过
                if (usedTokenIds.has(tokenId)) continue;
                usedTokenIds.add(tokenId);

                const taskNonce = minterData.currentNonce++;

                // 构建交易数据但不执行
                const txData = await contract.privateTransfer.populateTransaction(tokenId, {
                    nonce: taskNonce,
                });
                minterTasks.push({
                    minterWallet: minterWallet,
                    txData: txData,
                    nonce: taskNonce,
                    tokenId: tokenId,
                    minterAddress: minterData.minterAddress,
                    minterIndex: minterData.minterIndex
                });
            }

            console.log(`Minter ${minterData.minterIndex+1} 构建了 ${minterTasks.length} 个任务`);
            return minterTasks;
        }));

        // 合并所有 minter 的任务
        const transferTasks = minterTaskGroups.flat();
        console.log(`总共构建了 ${transferTasks.length} 个 transfer 任务`);
        //所有token 放到一个batch
        const batchSize = transferTasks.length;
        // 第一步：预先签名所有交易
        console.log("开始预签名所有交易...");
        const signedTransactions = [];
        const taskMetadata = [];

        for (let i = 0; i < transferTasks.length; i++) {
            const task = transferTasks[i];
            try {
                // 补充交易参数
                const chainId = (await l1Provider.getNetwork()).chainId;
                task.txData.gasLimit = task.txData.gasLimit || 1000000;
                task.txData.gasPrice = task.txData.gasPrice || 0;
                task.txData.chainId = task.txData.chainId || chainId;
                task.txData.type = task.txData.type || 0;

                // 签名交易
                const signedTx = await task.minterWallet.signTransaction(task.txData);

                signedTransactions.push(signedTx);
                taskMetadata.push({
                    taskId: i + 1,
                    nonce: task.nonce,
                    tokenId: task.tokenId,
                    minterAddress: task.minterAddress,
                    minterIndex: task.minterIndex
                });
            } catch (error) {
                console.error(`任务签名失败 (tokenId: ${task.tokenId}):`, error.message);
            }
        }

        console.log(`完成预签名 ${signedTransactions.length}/${transferTasks.length} 个交易`);

        // 第二步：使用批量RPC请求发送所有已签名的交易
        console.log(`开始批量发送已签名交易，批量大小: ${BATCH_SIZE}`);

        const startSubmitTime = Date.now();
        const allResults = [];
        // const providerUrl = hardhatConfig.networks.ucl_L2.url;

        // 批量发送已签名的交易
        for (let i = 0; i < signedTransactions.length; i += BATCH_SIZE) {
            const batchSignedTxs = signedTransactions.slice(i, i + BATCH_SIZE);
            const batchMetadata = taskMetadata.slice(i, i + BATCH_SIZE);

            console.log(`正在发送批次 ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(signedTransactions.length/BATCH_SIZE)}, 批次大小: ${batchSignedTxs.length}`);

            // 构造批量请求
            const batchPayload = batchSignedTxs.map((signedTx, index) => ({
                jsonrpc: "2.0",
                id: batchMetadata[index].taskId,
                method: "eth_sendRawTransaction",
                params: [signedTx],
            }));

            try {
                // 发送批量请求
                const response = await fetch(providerUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(batchPayload),
                });

                const responseData = await response.json();

                // 处理响应结果
                if (Array.isArray(responseData)) {
                    responseData.forEach((result) => {
                        const metadata = batchMetadata.find(m => m.taskId === result.id);
                        if (metadata) {
                            if (result.error) {
                                allResults.push({
                                    success: false,
                                    nonce: metadata.nonce,
                                    tokenId: metadata.tokenId,
                                    error: result.error.message,
                                    minterAddress: metadata.minterAddress
                                });
                            } else {
                                allResults.push({
                                    success: true,
                                    nonce: metadata.nonce,
                                    tokenId: metadata.tokenId,
                                    txHash: result.result,
                                    minterAddress: metadata.minterAddress
                                });
                            }
                        }
                    });
                } else if (responseData.error) {
                    // 整体错误处理
                    batchMetadata.forEach(metadata => {
                        allResults.push({
                            success: false,
                            nonce: metadata.nonce,
                            tokenId: metadata.tokenId,
                            error: responseData.error.message,
                            minterAddress: metadata.minterAddress
                        });
                    });
                }
            } catch (error) {
                console.error(`批次请求失败:`, error.message);
                // 将批次中所有任务标记为失败
                batchMetadata.forEach(metadata => {
                    allResults.push({
                        success: false,
                        nonce: metadata.nonce,
                        tokenId: metadata.tokenId,
                        error: error.message,
                        minterAddress: metadata.minterAddress
                    });
                });
            }

            // 批次间添加短暂延迟，避免网络拥堵
            // if (i + BATCH_SIZE < signedTransactions.length) {
            //     await new Promise(resolve => setTimeout(resolve, 500));
            // }
        }

        const endSubmitTime = Date.now();
        const submitTime = endSubmitTime - startSubmitTime;

        // 统计结果
        const successfulSubmits = allResults.filter(r => r && r.success);
        const submitTPS = (successfulSubmits.length / (submitTime / 1000)).toFixed(2);

        console.log(`\n=== 提交阶段 (Submit) ===`);
        console.log(`提交耗时: ${submitTime}ms`);
        console.log(`提交成功交易数: ${successfulSubmits.length}/${allResults.length}`);
        console.log(`Submit TPS: ${submitTPS}`);
        console.log(`平均每批次处理时间: ${(submitTime/Math.ceil(signedTransactions.length/BATCH_SIZE)).toFixed(2)}ms`);

        // 详细统计信息
        const minterStats = {};
        allResults.forEach(result => {
            if (result) {
                const minterAddr = result.minterAddress;
                if (!minterStats[minterAddr]) {
                    minterStats[minterAddr] = { total: 0, success: 0 };
                }
                minterStats[minterAddr].total++;
                if (result.success) {
                    minterStats[minterAddr].success++;
                }
            }
        });

        console.log(`\n=== 按 Minter 统计 ===`);
        Object.keys(minterStats).forEach(minterAddr => {
            const stats = minterStats[minterAddr];
            console.log(`Minter ${minterAddr}: ${stats.success}/${stats.total} 成功`);
        });
    });
    it.skip('TPS PrivateTransfer Test ： Sign First Then Batch Send RPC Requests', async () => {
        // const BATCH_SIZE = 1000;
        const startTestTime = Date.now();

        // 并行收集所有 minter 的 token 数据
        console.log("开始并行收集所有 minter 的 token 数据...");
        const allMinterData = await Promise.all(minters.map(async (minter, j) => {
            const minterAddress = minter.address;
            const minterWallet = minter.wallet;
            const minterMeta = await createAuthMetadata(minter.wallet.privateKey);

            try {
                const splitTokenList = await getSplitTokenList(
                    client,
                    minterAddress,
                    config.contracts.PrivateERCToken,
                    minterMeta
                );

                const tokens = splitTokenList.split_tokens || [];
                if (tokens.length > 0) {
                    const startNonce = await minterWallet.getNonce();
                    console.log(`Minter ${j+1} (${minterAddress}) 有 ${tokens.length} 个 token`);
                    return {
                        minterIndex: j,
                        minterAddress: minterAddress,
                        minterWallet: minterWallet,
                        tokens: tokens,
                        currentNonce: startNonce,
                    };
                } else {
                    console.log(`Minter ${j+1} (${minterAddress}) 没有 token`);
                }
            } catch (error) {
                console.error(`获取 minter ${minterAddress} token 列表失败:`, error.message);
            }
            return null;
        }));

        // 过滤掉空值
        const validMinterData = allMinterData.filter(data => data !== null);
        console.log(`共收集到 ${validMinterData.length} 个有效 minter 的数据`);

        // 为每个 minter 并行构建 transfer 任务
        console.log("开始为每个 minter 构建 transfer 任务...");
        const minterTaskGroups = await Promise.all(validMinterData.map(async (minterData) => {
            const { minterWallet, tokens } = minterData;
            const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, minterWallet);

            const minterTasks = [];
            const usedTokenIds = new Set(); // 每个 minter 单独的 tokenId 集合

            for (let i = 0; i < tokens.length; i++) {
                const tokenId = '0x' + tokens[i].token_id;

                // 如果 tokenId 已使用，跳过
                if (usedTokenIds.has(tokenId)) continue;
                usedTokenIds.add(tokenId);

                const taskNonce = minterData.currentNonce++;

                // 构建交易数据但不执行
                const txData = await contract.privateTransfer.populateTransaction(tokenId, accounts.To2, {
                    nonce: taskNonce,
                });
                minterTasks.push({
                    minterWallet: minterWallet,
                    txData: txData,
                    nonce: taskNonce,
                    tokenId: tokenId,
                    minterAddress: minterData.minterAddress,
                    minterIndex: minterData.minterIndex
                });
            }

            console.log(`Minter ${minterData.minterIndex+1} 构建了 ${minterTasks.length} 个任务`);
            return minterTasks;
        }));

        // 合并所有 minter 的任务
        const transferTasks = minterTaskGroups.flat();
        console.log(`总共构建了 ${transferTasks.length} 个 transfer 任务`);

        // 第一步：预先签名所有交易
        console.log("开始预签名所有交易...");
        const signedTransactions = [];
        const taskMetadata = [];

        for (let i = 0; i < transferTasks.length; i++) {
            const task = transferTasks[i];
            try {
                // 补充交易参数
                const chainId = (await l1Provider.getNetwork()).chainId;
                task.txData.gasLimit = task.txData.gasLimit || 1000000;
                task.txData.gasPrice = task.txData.gasPrice || 0;
                task.txData.chainId = task.txData.chainId || chainId;
                task.txData.type = task.txData.type || 0;

                // 签名交易
                const signedTx = await task.minterWallet.signTransaction(task.txData);

                signedTransactions.push(signedTx);
                taskMetadata.push({
                    taskId: i + 1,
                    nonce: task.nonce,
                    tokenId: task.tokenId,
                    minterAddress: task.minterAddress,
                    minterIndex: task.minterIndex
                });
            } catch (error) {
                console.error(`任务签名失败 (tokenId: ${task.tokenId}):`, error.message);
            }
        }

        console.log(`完成预签名 ${signedTransactions.length}/${transferTasks.length} 个交易`);

        // 第二步：使用批量RPC请求发送所有已签名的交易
        console.log(`开始批量发送已签名交易，批量大小: ${BATCH_SIZE}`);

        const startSubmitTime = Date.now();
        const allResults = [];
        // const providerUrl = hardhatConfig.networks.ucl_L2.url;

        // 批量发送已签名的交易
        for (let i = 0; i < signedTransactions.length; i += BATCH_SIZE) {
            const batchSignedTxs = signedTransactions.slice(i, i + BATCH_SIZE);
            const batchMetadata = taskMetadata.slice(i, i + BATCH_SIZE);

            console.log(`正在发送批次 ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(signedTransactions.length/BATCH_SIZE)}, 批次大小: ${batchSignedTxs.length}`);

            // 构造批量请求
            const batchPayload = batchSignedTxs.map((signedTx, index) => ({
                jsonrpc: "2.0",
                id: batchMetadata[index].taskId,
                method: "eth_sendRawTransaction",
                params: [signedTx],
            }));

            try {
                // 发送批量请求
                const response = await fetch(providerUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(batchPayload),
                });

                const responseData = await response.json();

                // 处理响应结果
                if (Array.isArray(responseData)) {
                    responseData.forEach((result) => {
                        const metadata = batchMetadata.find(m => m.taskId === result.id);
                        if (metadata) {
                            if (result.error) {
                                allResults.push({
                                    success: false,
                                    nonce: metadata.nonce,
                                    tokenId: metadata.tokenId,
                                    error: result.error.message,
                                    minterAddress: metadata.minterAddress
                                });
                            } else {
                                allResults.push({
                                    success: true,
                                    nonce: metadata.nonce,
                                    tokenId: metadata.tokenId,
                                    txHash: result.result,
                                    minterAddress: metadata.minterAddress
                                });
                            }
                        }
                    });
                } else if (responseData.error) {
                    // 整体错误处理
                    batchMetadata.forEach(metadata => {
                        allResults.push({
                            success: false,
                            nonce: metadata.nonce,
                            tokenId: metadata.tokenId,
                            error: responseData.error.message,
                            minterAddress: metadata.minterAddress
                        });
                    });
                }
            } catch (error) {
                console.error(`批次请求失败:`, error.message);
                // 将批次中所有任务标记为失败
                batchMetadata.forEach(metadata => {
                    allResults.push({
                        success: false,
                        nonce: metadata.nonce,
                        tokenId: metadata.tokenId,
                        error: error.message,
                        minterAddress: metadata.minterAddress
                    });
                });
            }

            // 批次间添加短暂延迟，避免网络拥堵
            // if (i + BATCH_SIZE < signedTransactions.length) {
            //     await new Promise(resolve => setTimeout(resolve, 500));
            // }
        }

        const endSubmitTime = Date.now();
        const submitTime = endSubmitTime - startSubmitTime;

        // 统计结果
        const successfulSubmits = allResults.filter(r => r && r.success);
        const submitTPS = (successfulSubmits.length / (submitTime / 1000)).toFixed(2);

        console.log(`\n=== 提交阶段 (Submit) ===`);
        console.log(`提交耗时: ${submitTime}ms`);
        console.log(`提交成功交易数: ${successfulSubmits.length}/${allResults.length}`);
        console.log(`Submit TPS: ${submitTPS}`);
        console.log(`平均每批次处理时间: ${(submitTime/Math.ceil(signedTransactions.length/BATCH_SIZE)).toFixed(2)}ms`);

        // 详细统计信息
        const minterStats = {};
        allResults.forEach(result => {
            if (result) {
                const minterAddr = result.minterAddress;
                if (!minterStats[minterAddr]) {
                    minterStats[minterAddr] = { total: 0, success: 0 };
                }
                minterStats[minterAddr].total++;
                if (result.success) {
                    minterStats[minterAddr].success++;
                }
            }
        });

        console.log(`\n=== 按 Minter 统计 ===`);
        Object.keys(minterStats).forEach(minterAddr => {
            const stats = minterStats[minterAddr];
            console.log(`Minter ${minterAddr}: ${stats.success}/${stats.total} 成功`);
        });
    });
    it.skip('TPS PrivateTransfer Test ： Sign First Then Batch Send RPC Requests with 3 thread', async () => {
        // const BATCH_SIZE = 1000;
        const startTestTime = Date.now();

        // 并行收集所有 minter 的 token 数据
        console.log("开始并行收集所有 minter 的 token 数据...");
        const allMinterData = await Promise.all(minters.map(async (minter, j) => {
            const minterAddress = minter.address;
            const minterWallet = minter.wallet;
            const minterMeta = await createAuthMetadata(minter.wallet.privateKey);

            try {
                const splitTokenList = await getSplitTokenList(
                    client,
                    minterAddress,
                    config.contracts.PrivateERCToken,
                    minterMeta
                );

                const tokens = splitTokenList.split_tokens || [];
                if (tokens.length > 0) {
                    const startNonce = await minterWallet.getNonce();
                    console.log(`Minter ${j+1} (${minterAddress}) 有 ${tokens.length} 个 token`);
                    return {
                        minterIndex: j,
                        minterAddress: minterAddress,
                        minterWallet: minterWallet,
                        tokens: tokens,
                        currentNonce: startNonce,
                    };
                } else {
                    console.log(`Minter ${j+1} (${minterAddress}) 没有 token`);
                }
            } catch (error) {
                console.error(`获取 minter ${minterAddress} token 列表失败:`, error.message);
            }
            return null;
        }));

        // 过滤掉空值
        const validMinterData = allMinterData.filter(data => data !== null);
        console.log(`共收集到 ${validMinterData.length} 个有效 minter 的数据`);

        // 为每个 minter 并行构建 transfer 任务
        console.log("开始为每个 minter 构建 transfer 任务...");
        const minterTaskGroups = await Promise.all(validMinterData.map(async (minterData) => {
            const { minterWallet, tokens } = minterData;
            const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, minterWallet);

            const minterTasks = [];
            const usedTokenIds = new Set(); // 每个 minter 单独的 tokenId 集合

            for (let i = 0; i < tokens.length; i++) {
                const tokenId = '0x' + tokens[i].token_id;

                // 如果 tokenId 已使用，跳过
                if (usedTokenIds.has(tokenId)) continue;
                usedTokenIds.add(tokenId);

                const taskNonce = minterData.currentNonce++;

                // 构建交易数据但不执行
                const txData = await contract.privateTransfer.populateTransaction(tokenId, accounts.To2, {
                    nonce: taskNonce,
                });
                minterTasks.push({
                    minterWallet: minterWallet,
                    txData: txData,
                    nonce: taskNonce,
                    tokenId: tokenId,
                    minterAddress: minterData.minterAddress,
                    minterIndex: minterData.minterIndex
                });
            }

            console.log(`Minter ${minterData.minterIndex+1} 构建了 ${minterTasks.length} 个任务`);
            return minterTasks;
        }));

        // 合并所有 minter 的任务
        const transferTasks = minterTaskGroups.flat();
        console.log(`总共构建了 ${transferTasks.length} 个 transfer 任务`);

        // 第一步：预先签名所有交易
        console.log("开始预签名所有交易...");
        const signedTransactions = [];
        const taskMetadata = [];

        for (let i = 0; i < transferTasks.length; i++) {
            const task = transferTasks[i];
            try {
                // 补充交易参数
                const chainId = (await l1Provider.getNetwork()).chainId;
                task.txData.gasLimit = task.txData.gasLimit || 1000000;
                task.txData.gasPrice = task.txData.gasPrice || 0;
                task.txData.chainId = task.txData.chainId || chainId;
                task.txData.type = task.txData.type || 0;

                // 签名交易
                const signedTx = await task.minterWallet.signTransaction(task.txData);

                signedTransactions.push(signedTx);
                taskMetadata.push({
                    taskId: i + 1,
                    nonce: task.nonce,
                    tokenId: task.tokenId,
                    minterAddress: task.minterAddress,
                    minterIndex: task.minterIndex
                });
            } catch (error) {
                console.error(`任务签名失败 (tokenId: ${task.tokenId}):`, error.message);
            }
        }

        console.log(`完成预签名 ${signedTransactions.length}/${transferTasks.length} 个交易`);

        // 第二步：使用批量RPC请求发送所有已签名的交易
        console.log(`开始批量发送已签名交易，批量大小: ${BATCH_SIZE}, 并发线程数: ${MAX_CONCURRENCY}`);

        const startSubmitTime = Date.now();
        const allResults = [];
        // const providerUrl = hardhatConfig.networks.ucl_L2.url;

        // 构造批次
        const totalBatches = Math.ceil(signedTransactions.length / BATCH_SIZE);
        const batches = [];
        for (let i = 0; i < signedTransactions.length; i += BATCH_SIZE) {
            batches.push({
                batchSignedTxs: signedTransactions.slice(i, i + BATCH_SIZE),
                batchMetadata: taskMetadata.slice(i, i + BATCH_SIZE),
                batchIndex: i / BATCH_SIZE,
            });
        }

        // 用 p-limit 限制并发为 3
        const limit = pLimit(MAX_CONCURRENCY);
        await Promise.all(
            batches.map(({ batchSignedTxs, batchMetadata, batchIndex }) =>
                limit(() =>
                    processBatch(batchSignedTxs, batchMetadata, batchIndex, totalBatches, providerUrl, allResults)
                )
            )
        );

        const endSubmitTime = Date.now();
        const submitTime = endSubmitTime - startSubmitTime;

        // 统计结果
        const successfulSubmits = allResults.filter(r => r && r.success);
        const submitTPS = (successfulSubmits.length / (submitTime / 1000)).toFixed(2);

        console.log(`\n=== 提交阶段 (Submit) ===`);
        console.log(`提交耗时: ${submitTime}ms`);
        console.log(`提交成功交易数: ${successfulSubmits.length}/${allResults.length}`);
        console.log(`Submit TPS: ${submitTPS}`);
        console.log(`平均每批次处理时间: ${(submitTime/Math.ceil(signedTransactions.length/BATCH_SIZE)).toFixed(2)}ms`);

        // 详细统计信息
        const minterStats = {};
        allResults.forEach(result => {
            if (result) {
                const minterAddr = result.minterAddress;
                if (!minterStats[minterAddr]) {
                    minterStats[minterAddr] = { total: 0, success: 0 };
                }
                minterStats[minterAddr].total++;
                if (result.success) {
                    minterStats[minterAddr].success++;
                }
            }
        });

        console.log(`\n=== 按 Minter 统计 ===`);
        Object.keys(minterStats).forEach(minterAddr => {
            const stats = minterStats[minterAddr];
            console.log(`Minter ${minterAddr}: ${stats.success}/${stats.total} 成功`);
        });
    });
    //
    it('TPS PrivateTransfers Test ：Sign First and send batched callPrivateTransfers', async () => {
        const TOKENS_PER_CALL = 10; // 每个minter每次调用包含的最大token数
        const BATCH_SIZE = 500;     // 批量发送的RPC请求大小
        const startTestTime = Date.now();

        // 并行收集所有 minter 的 token 数据
        console.log("开始并行收集所有 minter 的 token 数据...");
        const allMinterData = await Promise.all(minters.map(async (minter, j) => {
            const minterAddress = minter.address;
            const minterWallet = minter.wallet;
            const minterMeta = await createAuthMetadata(minter.wallet.privateKey);

            try {
                const splitTokenList = await getSplitTokenList(
                    client,
                    minterAddress,
                    config.contracts.PrivateERCToken,
                    minterMeta
                );

                const tokens = splitTokenList.split_tokens || [];
                if (tokens.length > 0) {
                    const startNonce = await minterWallet.getNonce();
                    console.log(`Minter ${j+1} (${minterAddress}) 当前 nonce: ${startNonce}`)
                    console.log(`Minter ${j+1} (${minterAddress}) 有 ${tokens.length} 个 token`);
                    return {
                        minterIndex: j,
                        minterAddress,
                        minterWallet,
                        tokens,
                        currentNonce: startNonce,
                    };
                } else {
                    console.log(`Minter ${j+1} (${minterAddress}) 没有 token`);
                }
            } catch (error) {
                console.error(`获取 minter ${minterAddress} token 列表失败:`, error.message);
            }
            return null;
        }));

        // 过滤掉空值
        const validMinterData = allMinterData.filter(data => data !== null);
        console.log(`共收集到 ${validMinterData.length} 个有效 minter 的数据`);

        // 为每个 minter 并行构建 batched transfer 任务
        console.log("开始为每个 minter 构建 batched transfer 任务...");
        const minterTaskGroups = await Promise.all(validMinterData.map(async (minterData) => {
            const { minterWallet, tokens } = minterData;
            const contract = await ethers.getContractAt(
                // "PrivateERCToken",
                "PrivateUSDC",
                config.contracts.PrivateERCToken,
                minterWallet
            );

            const minterTasks = [];
            let batchIndex = 0;
            for (let i = 0; i < tokens.length; i += TOKENS_PER_CALL) {
                const batchTokens = tokens.slice(i, i + TOKENS_PER_CALL)
                    .map(t => "0x" + t.token_id);

                if (batchTokens.length === 0) continue;

                const taskNonce = minterData.currentNonce++;
                console.log("tokenIds:", batchTokens)

                const txData = await contract.privateTransfers.populateTransaction(
                    batchTokens,
                    { nonce: taskNonce }
                );

                minterTasks.push({
                    minterWallet,
                    txData,
                    nonce: taskNonce,
                    tokenIds: batchTokens,
                    minterAddress: minterData.minterAddress,
                    minterIndex: minterData.minterIndex,
                    batchIndex: batchIndex++
                });
            }

            console.log(`Minter ${minterData.minterIndex+1} 构建了 ${minterTasks.length} 个 batched 任务`);
            return minterTasks;
        }));

        // 合并所有 minter 的任务
        const transferTasks = minterTaskGroups.flat();
        console.log(`总共构建了 ${transferTasks.length} 个 batched transfer 任务`);

        // 第一步：预先签名所有交易
        console.log("开始预签名所有交易...");
        const signedTransactions = [];
        const taskMetadata = [];

        for (let i = 0; i < transferTasks.length; i++) {
            const task = transferTasks[i];
            try {
                const chainId = (await l1Provider.getNetwork()).chainId;
                task.txData.gasLimit = task.txData.gasLimit || 5000000;
                task.txData.gasPrice = task.txData.gasPrice || 0;
                task.txData.chainId = task.txData.chainId || chainId;
                task.txData.type = task.txData.type || 0;

                const signedTx = await task.minterWallet.signTransaction(task.txData);

                signedTransactions.push(signedTx);
                taskMetadata.push({
                    taskId: i + 1,
                    nonce: task.nonce,
                    tokenIds: task.tokenIds,
                    minterAddress: task.minterAddress,
                    minterIndex: task.minterIndex,
                    batchIndex: task.batchIndex
                });
            } catch (error) {
                console.error(`任务签名失败 (tokenIds: ${task.tokenIds}):`, error.message);
            }
        }

        console.log(`完成预签名 ${signedTransactions.length}/${transferTasks.length} 个交易`);

        // 第二步：使用批量RPC请求发送所有已签名的交易
        console.log(`开始批量发送已签名交易，批量大小: ${BATCH_SIZE}`);

        const startSubmitTime = Date.now();
        const allResults = [];
        const providerUrl = hardhatConfig.networks.dev_ucl_L2.url;

        for (let i = 0; i < signedTransactions.length; i += BATCH_SIZE) {
            const batchSignedTxs = signedTransactions.slice(i, i + BATCH_SIZE);
            const batchMetadata = taskMetadata.slice(i, i + BATCH_SIZE);

            console.log(`正在发送批次 ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(signedTransactions.length/BATCH_SIZE)}, 批次大小: ${batchSignedTxs.length}`);

            const batchPayload = batchSignedTxs.map((signedTx, index) => ({
                jsonrpc: "2.0",
                id: batchMetadata[index].taskId,
                method: "eth_sendRawTransaction",
                params: [signedTx],
            }));

            try {
                const response = await fetch(providerUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(batchPayload),
                });

                const responseData = await response.json();
                console.log("Batch response:", responseData)

                if (Array.isArray(responseData)) {
                    responseData.forEach((result) => {
                        const metadata = batchMetadata.find(m => m.taskId === result.id);
                        if (metadata) {
                            if (result.error) {
                                allResults.push({
                                    success: false,
                                    nonce: metadata.nonce,
                                    tokenIds: metadata.tokenIds,
                                    error: result.error.message,
                                    minterAddress: metadata.minterAddress
                                });
                            } else {
                                allResults.push({
                                    success: true,
                                    nonce: metadata.nonce,
                                    tokenIds: metadata.tokenIds,
                                    txHash: result.result,
                                    minterAddress: metadata.minterAddress
                                });
                            }
                        }
                    });
                } else if (responseData.error) {
                    batchMetadata.forEach(metadata => {
                        allResults.push({
                            success: false,
                            nonce: metadata.nonce,
                            tokenIds: metadata.tokenIds,
                            error: responseData.error.message,
                            minterAddress: metadata.minterAddress
                        });
                    });
                }
            } catch (error) {
                console.error(`批次请求失败:`, error.message);
                batchMetadata.forEach(metadata => {
                    allResults.push({
                        success: false,
                        nonce: metadata.nonce,
                        tokenIds: metadata.tokenIds,
                        error: error.message,
                        minterAddress: metadata.minterAddress
                    });
                });
            }
        }

        const endSubmitTime = Date.now();
        const submitTime = endSubmitTime - startSubmitTime;

        // 统计结果
        const successfulSubmits = allResults.filter(r => r && r.success);
        const submitTPS = (successfulSubmits.length / (submitTime / 1000)).toFixed(2);

        console.log(`\n=== 提交阶段 (Submit) ===`);
        console.log(`提交耗时: ${submitTime}ms`);
        console.log(`提交成功交易数(批次数): ${successfulSubmits.length}/${allResults.length}`);
        console.log(`涉及 token 数量: ${successfulSubmits.reduce((sum, r) => sum + r.tokenIds.length, 0)}`);
        console.log(`Submit TPS: ${submitTPS}`);
        console.log(`平均每批次处理时间: ${(submitTime/Math.ceil(signedTransactions.length/BATCH_SIZE)).toFixed(2)}ms`);

        // 按 Minter 统计
        const minterStats = {};
        allResults.forEach(result => {
            if (result) {
                const minterAddr = result.minterAddress;
                if (!minterStats[minterAddr]) {
                    minterStats[minterAddr] = { total: 0, success: 0, tokens: 0 };
                }
                minterStats[minterAddr].total++;
                minterStats[minterAddr].tokens += result.tokenIds.length;
                if (result.success) {
                    minterStats[minterAddr].success++;
                }
            }
        });

        console.log(`\n=== 按 Minter 统计 ===`);
        Object.keys(minterStats).forEach(minterAddr => {
            const stats = minterStats[minterAddr];
            console.log(`Minter ${minterAddr}: ${stats.success}/${stats.total} 成功, 涉及 ${stats.tokens} tokens`);
        });
    });
    it.skip('TPS PrivateTransfers Test ： Sign First Then Batch Send RPC Requests', async () => {
        // const BATCH_SIZE = 1000;
        const TOKENS_PER_CALL = 100; // 每次调用处理的token数量
        const startTestTime = Date.now();

        // 并行收集所有 minter 的 token 数据
        console.log("开始并行收集所有 minter 的 token 数据...");
        const allMinterData = await Promise.all(minters.map(async (minter, j) => {
            const minterAddress = minter.address;
            const minterWallet = minter.wallet;
            const minterMeta = await createAuthMetadata(minter.wallet.privateKey);

            try {
                const splitTokenList = await getSplitTokenList(
                    client,
                    minterAddress,
                    config.contracts.PrivateERCToken,
                    minterMeta
                );

                const tokens = splitTokenList.split_tokens || [];
                if (tokens.length > 0) {
                    const startNonce = await minterWallet.getNonce();
                    console.log(`Minter ${j+1} (${minterAddress}) 有 ${tokens.length} 个 token`);
                    return {
                        minterIndex: j,
                        minterAddress: minterAddress,
                        minterWallet: minterWallet,
                        tokens: tokens,
                        currentNonce: startNonce,
                    };
                } else {
                    console.log(`Minter ${j+1} (${minterAddress}) 没有 token`);
                }
            } catch (error) {
                console.error(`获取 minter ${minterAddress} token 列表失败:`, error.message);
            }
            return null;
        }));

        // 过滤掉空值
        const validMinterData = allMinterData.filter(data => data !== null);
        console.log(`共收集到 ${validMinterData.length} 个有效 minter 的数据`);

        // 为每个 minter 并行构建 transfer 任务
        console.log("开始为每个 minter 构建 transfer 任务...");
        const minterTaskGroups = await Promise.all(validMinterData.map(async (minterData) => {
            const { minterWallet, tokens } = minterData;
            const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, minterWallet);

            const minterTasks = [];
            let batchIndex = 0;

            // 按批次处理token，每个批次处理TOKENS_PER_CALL个token
            for (let i = 0; i < tokens.length; i += TOKENS_PER_CALL) {
                const batchTokens = tokens.slice(i, i + TOKENS_PER_CALL)
                    .map(t => "0x" + t.token_id);

                if (batchTokens.length === 0) continue;

                const taskNonce = minterData.currentNonce++;

                // 使用 privateTransfers 方法处理批量转账
                const txData = await contract.privateTransfers.populateTransaction(
                    batchTokens,
                    // accounts.To2,
                    { nonce: taskNonce }
                );

                minterTasks.push({
                    minterWallet: minterWallet,
                    txData: txData,
                    nonce: taskNonce,
                    tokenIds: batchTokens,
                    minterAddress: minterData.minterAddress,
                    minterIndex: minterData.minterIndex,
                    batchIndex: batchIndex++
                });
            }

            console.log(`Minter ${minterData.minterIndex+1} 构建了 ${minterTasks.length} 个任务`);
            return minterTasks;
        }));

        // 合并所有 minter 的任务
        const transferTasks = minterTaskGroups.flat();
        console.log(`总共构建了 ${transferTasks.length} 个 transfer 任务`);

        // 第一步：预先签名所有交易
        console.log("开始预签名所有交易...");
        const signedTransactions = [];
        const taskMetadata = [];

        for (let i = 0; i < transferTasks.length; i++) {
            const task = transferTasks[i];
            try {
                // 补充交易参数
                const chainId = (await l1Provider.getNetwork()).chainId;
                task.txData.gasLimit = task.txData.gasLimit || 5000000; // 增加gas限制以适应批量操作
                task.txData.gasPrice = task.txData.gasPrice || 0;
                task.txData.chainId = task.txData.chainId || chainId;
                task.txData.type = task.txData.type || 0;

                // 签名交易
                const signedTx = await task.minterWallet.signTransaction(task.txData);

                signedTransactions.push(signedTx);
                taskMetadata.push({
                    taskId: i + 1,
                    nonce: task.nonce,
                    tokenIds: task.tokenIds,
                    minterAddress: task.minterAddress,
                    minterIndex: task.minterIndex
                });
            } catch (error) {
                console.error(`任务签名失败 (tokenIds: ${task.tokenIds}):`, error.message);
            }
        }

        console.log(`完成预签名 ${signedTransactions.length}/${transferTasks.length} 个交易`);

        // 第二步：使用批量RPC请求发送所有已签名的交易
        console.log(`开始批量发送已签名交易，批量大小: ${BATCH_SIZE}`);

        const startSubmitTime = Date.now();
        const allResults = [];
        // const providerUrl = hardhatConfig.networks.ucl_L2.url;

        // 批量发送已签名的交易
        for (let i = 0; i < signedTransactions.length; i += BATCH_SIZE) {
            const batchSignedTxs = signedTransactions.slice(i, i + BATCH_SIZE);
            const batchMetadata = taskMetadata.slice(i, i + BATCH_SIZE);

            console.log(`正在发送批次 ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(signedTransactions.length/BATCH_SIZE)}, 批次大小: ${batchSignedTxs.length}`);

            // 构造批量请求
            const batchPayload = batchSignedTxs.map((signedTx, index) => ({
                jsonrpc: "2.0",
                id: batchMetadata[index].taskId,
                method: "eth_sendRawTransaction",
                params: [signedTx],
            }));

            try {
                // 发送批量请求
                const response = await fetch(providerUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(batchPayload),
                });

                const responseData = await response.json();

                // 处理响应结果
                if (Array.isArray(responseData)) {
                    responseData.forEach((result) => {
                        const metadata = batchMetadata.find(m => m.taskId === result.id);
                        if (metadata) {
                            if (result.error) {
                                allResults.push({
                                    success: false,
                                    nonce: metadata.nonce,
                                    tokenIds: metadata.tokenIds,
                                    error: result.error.message,
                                    minterAddress: metadata.minterAddress
                                });
                            } else {
                                allResults.push({
                                    success: true,
                                    nonce: metadata.nonce,
                                    tokenIds: metadata.tokenIds,
                                    txHash: result.result,
                                    minterAddress: metadata.minterAddress
                                });
                            }
                        }
                    });
                } else if (responseData.error) {
                    // 整体错误处理
                    batchMetadata.forEach(metadata => {
                        allResults.push({
                            success: false,
                            nonce: metadata.nonce,
                            tokenIds: metadata.tokenIds,
                            error: responseData.error.message,
                            minterAddress: metadata.minterAddress
                        });
                    });
                }
            } catch (error) {
                console.error(`批次请求失败:`, error.message);
                // 将批次中所有任务标记为失败
                batchMetadata.forEach(metadata => {
                    allResults.push({
                        success: false,
                        nonce: metadata.nonce,
                        tokenIds: metadata.tokenIds,
                        error: error.message,
                        minterAddress: metadata.minterAddress
                    });
                });
            }

            // 批次间添加短暂延迟，避免网络拥堵
            // if (i + BATCH_SIZE < signedTransactions.length) {
            //     await new Promise(resolve => setTimeout(resolve, 500));
            // }
        }

        const endSubmitTime = Date.now();
        const submitTime = endSubmitTime - startSubmitTime;

        // 统计结果
        const successfulSubmits = allResults.filter(r => r && r.success);
        const submitTPS = (successfulSubmits.length / (submitTime / 1000)).toFixed(2);

        console.log(`\n=== 提交阶段 (Submit) ===`);
        console.log(`提交耗时: ${submitTime}ms`);
        console.log(`提交成功交易数: ${successfulSubmits.length}/${allResults.length}`);
        console.log(`Submit TPS: ${submitTPS}`);
        console.log(`平均每批次处理时间: ${(submitTime/Math.ceil(signedTransactions.length/BATCH_SIZE)).toFixed(2)}ms`);

        // 详细统计信息
        const minterStats = {};
        allResults.forEach(result => {
            if (result) {
                const minterAddr = result.minterAddress;
                if (!minterStats[minterAddr]) {
                    minterStats[minterAddr] = { total: 0, success: 0, tokens: 0 };
                }
                minterStats[minterAddr].total++;
                minterStats[minterAddr].tokens += result.tokenIds ? result.tokenIds.length : 1;
                if (result.success) {
                    minterStats[minterAddr].success++;
                }
            }
        });

        console.log(`\n=== 按 Minter 统计 ===`);
        Object.keys(minterStats).forEach(minterAddr => {
            const stats = minterStats[minterAddr];
            console.log(`Minter ${minterAddr}: ${stats.success}/${stats.total} 成功, 涉及 ${stats.tokens} tokens`);
        });
    });


});

// describe.skip("Performance Test with exist 3 minters", function () {
//     this.timeout(120000000);
//
//     const TOTAL_SIZE = 300;
//
//     const minters = [
//         //minter
//         {
//             address: accounts.Minter,
//             wallet: new ethers.Wallet(accounts.MinterKey, l1Provider),
//         },
//         {
//             address: accounts.Minter2,
//             wallet: new ethers.Wallet(accounts.Minter2Key, l1Provider),
//         },
//         {
//             address: accounts.Minter3,
//             wallet: new ethers.Wallet(accounts.Minter3Key, l1Provider),
//         }
//     ]
//
//
//     it('Mint', async () => {
//         const amount = TOTAL_SIZE + 10;
//         for (let i = 0; i < minters.length; i++){
//             const preBalance = await getTokenBalanceByAdmin(minters[i].address);
//             // await DirectMint(minters[i].address, amount)
//             await mintBy(minters[i].address, amount,minters[i].wallet)
//
//             const postBalance = await getTokenBalanceByAdmin(minters[i].address);
//             expect(postBalance - preBalance).equal(amount)
//         }
//     });
//
//     it.skip("Split with await for action completion", async function () {
//         console.log("开始批量生成分割代币请求...");
//         const startTime = Date.now();
//
//         // 循环1000次
//         for (let i = 0; i < TOTAL_SIZE; i++) {
//             console.log(`开始第 ${i + 1}/${TOTAL_SIZE} 轮split操作`);
//             const roundStartTime = Date.now();
//
//             // 每轮让所有minters同时提交split请求
//             const roundPromises = minters.map(async (minter, accountIndex) => {
//                 let meta = await createAuthMetadata(minter.wallet.privateKey);
//                 const splitRequest = {
//                     sc_address: config.contracts.PrivateERCToken,
//                     token_type: '0',
//                     from_address: minter.address,
//                     to_address: accounts.To2,
//                     amount: 1,
//                     comment: "transfer"
//                 };
//
//                 try {
//                     console.log(`账户 ${accountIndex + 1} 提交第 ${i + 1} 轮请求`);
//                     const response = await client.generateSplitToken(splitRequest, meta);
//                     await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, meta)
//                     console.log(`账户 ${accountIndex + 1} 第 ${i + 1} 轮请求完成，请求ID: ${response.request_id}`);
//                     return { success: true, accountIndex, response };
//                 } catch (error) {
//                     console.error(`账户 ${accountIndex + 1} 第 ${i + 1} 轮请求失败:`, error.toString());
//                     return { success: false, accountIndex, error: error.toString() };
//                 }
//             });
//
//             // 等待本轮所有请求完成
//             const roundResults = await Promise.all(roundPromises);
//             const roundEndTime = Date.now();
//
//             console.log(`第 ${i + 1} 轮split操作完成，耗时: ${roundEndTime - roundStartTime}ms`);
//
//             // 可以添加短暂延迟避免网络拥堵
//             if (i < TOTAL_SIZE - 1) {
//                 await sleep(500);
//             }
//         }
//
//         const endTime = Date.now();
//         const totalTime = endTime - startTime;
//         console.log(`\n所有分割代币请求已提交，总耗时: ${totalTime}ms`);
//     });
//     it("Split Operations", async function () {
//         console.log("开始发生成分割代币请求...");
//         const startTime = Date.now();
//
//         const results = await Promise.all(minters.map(async (minter, minterIndex) => {
//             let meta = await createAuthMetadata(minter.wallet.privateKey);
//             const minterResults = [];
//
//             console.log(`开始处理账户 ${minterIndex + 1}`);
//
//             for (let i = 0; i < TOTAL_SIZE; i++) {
//                 const splitRequest = {
//                     sc_address: config.contracts.PrivateERCToken,
//                     token_type: '0',
//                     from_address: minter.address,
//                     to_address: accounts.To2,
//                     amount: 1,
//                     comment:"transfer"
//                 };
//                 try {
//                     const requestStartTime = Date.now();
//                     console.log(`账户 ${minterIndex + 1} 提交第 ${i + 1} 轮请求 (时间: ${new Date().toISOString()})`);
//
//                     const response = await client.generateSplitToken(splitRequest, meta);
//
//                     // 等待自己的操作完成
//                     await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, meta);
//
//                     const requestEndTime = Date.now();
//                     console.log(`账户 ${minterIndex + 1} 第 ${i + 1} 轮请求完成，请求ID: ${response.request_id} (耗时: ${requestEndTime - requestStartTime}ms)`);
//
//                     minterResults.push({
//                         success: true,
//                         round: i,
//                         response,
//                         duration: requestEndTime - requestStartTime
//                     });
//                 } catch (error) {
//                     console.error(`账户 ${minterIndex + 1} 第 ${i + 1} 轮请求失败:`, error.toString());
//                     minterResults.push({
//                         success: false,
//                         round: i,
//                         error: error.toString()
//                     });
//                     await sleep(2000);
//                 }
//                 // 在每轮之间添加短暂延迟避免瞬时压力过大
//                 if (i < TOTAL_SIZE - 1) {
//                     await sleep(1000);
//                 }
//             }
//
//             return {
//                 minterIndex,
//                 results: minterResults,
//                 totalSuccess: minterResults.filter(r => r.success).length
//             };
//         }));
//
//         const endTime = Date.now();
//         const totalTime = endTime - startTime;
//
//         // 统计结果
//         const totalRequests = results.reduce((sum, r) => sum + r.results.length, 0);
//         const totalSuccess = results.reduce((sum, r) => sum + r.totalSuccess, 0);
//
//         console.log(`\n=== 执行结果统计 ===`);
//         console.log(`总耗时: ${totalTime}ms`);
//         console.log(`总请求数: ${totalRequests}`);
//         console.log(`成功请求数: ${totalSuccess}`);
//         console.log(`成功率: ${(totalSuccess/totalRequests*100).toFixed(2)}%`);
//
//         // 按minter显示详细结果
//         results.forEach(result => {
//             const avgDuration = result.results
//                 .filter(r => r.success)
//                 .reduce((sum, r) => sum + r.duration, 0) / result.totalSuccess || 0;
//
//             console.log(`\nMinter ${result.minterIndex + 1}:`);
//             console.log(`  成功: ${result.totalSuccess}/${TOTAL_SIZE}`);
//             console.log(`  平均耗时: ${avgDuration.toFixed(2)}ms`);
//         });
//     });
//     it.skip('TPS PrivateTransfer Test,submit (with Nonce Management)', async () => {
//         const startTestTime = Date.now();
//
//         // 1. 收集所有minter的token，并初始化每个minter的nonce
//         const allMinterData = [];
//         for (let j = 0; j < minters.length; j++) {
//             const minterAddress = minters[j].address;
//             const minterWallet = minters[j].wallet;
//             const minterMeta = await createAuthMetadata(minters[j].wallet.privateKey);
//
//             try {
//                 const splitTokenList = await getSplitTokenList(
//                     client,
//                     minterAddress,
//                     config.contracts.PrivateERCToken,
//                     minterMeta
//                 );
//
//                 const tokens = splitTokenList.split_tokens || [];
//                 if (tokens.length > 0) {
//                     // 获取当前minter的初始nonce
//                     const startNonce = await minterWallet.getNonce();
//                     allMinterData.push({
//                         minterIndex: j,
//                         minterAddress: minterAddress,
//                         minterWallet: minterWallet,
//                         tokens: tokens,
//                         currentNonce: startNonce, // 初始化nonce
//                     });
//                 }
//             } catch (error) {
//                 console.error(`获取minter ${minterAddress} token列表失败:`, error.message);
//             }
//         }
//
//         // 2. 构建transfer任务，并为每个minter分配递增的nonce
//         const transferTasks = [];
//         for (const minterData of allMinterData) {
//             const { minterIndex, minterWallet, tokens } = minterData;
//             const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, minterWallet);
//
//             for (let i = 0; i < tokens.length; i++) {
//                 const token = tokens[i];
//                 const tokenId = '0x' + token.token_id;
//
//                 // 为当前任务分配nonce，并递增minter的nonce计数器
//                 const taskNonce = minterData.currentNonce++;
//
//                 transferTasks.push({
//                     execute: async () => {
//                         try {
//                             const tx = await contract.privateTransfer(tokenId, accounts.To2, {
//                                 nonce: taskNonce, // 使用预分配的nonce
//                             });
//                             return { success: true, nonce: taskNonce, tokenId, hash: tx.hash };
//                         } catch (error) {
//                             return { success: false, nonce: taskNonce, tokenId, error: error.message };
//                         }
//                     },
//                     minterIndex,
//                     tokenId,
//                 });
//             }
//         }
//
//         console.log(`开始执行 ${transferTasks.length} 个transfer任务`);
//
//         // 3. 并发执行所有transfer任务（可限制并发数）
//         const startSubmitTime = Date.now();
//         // 提交transaction 时间
//         const results = await Promise.all(transferTasks.map(task => task.execute()));
//         const endSubmitTime = Date.now();
//
//         const submitTime = endSubmitTime - startSubmitTime;
//
//         // 4. 统计结果
//         const successful = results.filter(r => r.success).length;
//         const tps = (successful / (submitTime / 1000)).toFixed(2);
//
//         console.log(`\n=== TPS测试结果 ===`);
//         console.log(`执行提交时间: ${submitTime}ms`);
//         console.log(`总交易数: ${results.length}`);
//         console.log(`成功交易数: ${successful}`);
//         console.log(`TPS: ${tps}`);
//
//         return { tps: parseFloat(tps), total: results.length, successful, submitTime };
//     });
//     it.skip('TPS PrivateTransfer Test (Submit + Confirm)', async () => {
//         const startTestTime = Date.now();
//
//         // 1. 收集所有 minter 的 token，并初始化 nonce
//         const allMinterData = [];
//         for (let j = 0; j < minters.length; j++) {
//             const minterAddress = minters[j].address;
//             const minterWallet = minters[j].wallet;
//             const minterMeta = await createAuthMetadata(minters[j].wallet.privateKey);
//
//             try {
//                 const splitTokenList = await getSplitTokenList(
//                     client,
//                     minterAddress,
//                     config.contracts.PrivateERCToken,
//                     minterMeta
//                 );
//
//                 const tokens = splitTokenList.split_tokens || [];
//                 if (tokens.length > 0) {
//                     const startNonce = await minterWallet.getNonce();
//                     allMinterData.push({
//                         minterIndex: j,
//                         minterAddress,
//                         minterWallet,
//                         tokens: tokens,
//                         currentNonce: startNonce,
//                     });
//                 }
//             } catch (error) {
//                 console.error(`获取 minter ${minterAddress} token 列表失败:`, error.message);
//             }
//         }
//
//         // 2. 构建 transfer 任务
//         const transferTasks = [];
//         for (const minterData of allMinterData) {
//             const { minterWallet, tokens } = minterData;
//             const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, minterWallet);
//
//             for (let i = 0; i < tokens.length; i++) {
//                 const tokenId = '0x' + tokens[i].token_id;
//                 const taskNonce = minterData.currentNonce++;
//
//                 transferTasks.push({
//                     execute: async () => {
//                         try {
//                             const tx = await contract.privateTransfer(tokenId, accounts.To2, {
//                                 nonce: taskNonce,
//                             });
//                             return { success: true, nonce: taskNonce, tokenId, tx };
//                         } catch (error) {
//                             return { success: false, nonce: taskNonce, tokenId, error: error.message };
//                         }
//                     }
//                 });
//             }
//         }
//
//         console.log(`开始执行 ${transferTasks.length} 个 transfer 任务`);
//
//         // 3. 提交交易阶段
//         const startSubmitTime = Date.now();
//         const submittedResults = await Promise.all(transferTasks.map(task => task.execute()));
//         const endSubmitTime = Date.now();
//         const submitTime = endSubmitTime - startSubmitTime;
//
//         const successfulSubmits = submittedResults.filter(r => r.success);
//         const submitTPS = (successfulSubmits.length / (submitTime / 1000)).toFixed(2);
//
//         console.log(`\n=== 提交阶段 (Submit) ===`);
//         console.log(`提交耗时: ${submitTime}ms`);
//         console.log(`提交成功交易数: ${successfulSubmits.length}/${submittedResults.length}`);
//         console.log(`Submit TPS: ${submitTPS}`);
//
//         // 4. 确认阶段（等待所有成功交易执行完成）
//         const startConfirmTime = Date.now();
//         const confirmResults = await Promise.all(successfulSubmits.map(r => r.tx.wait())); // 等待所有交易确认
//         const endConfirmTime = Date.now();
//         const confirmTime = endConfirmTime - startConfirmTime;
//
//         const confirmTPS = (confirmResults.length / (confirmTime / 1000)).toFixed(2);
//
//         console.log(`\n=== 确认阶段 (Confirm) ===`);
//         console.log(`确认耗时: ${confirmTime}ms`);
//         console.log(`确认交易数: ${confirmResults.length}`);
//         console.log(`Confirm TPS: ${confirmTPS}`);
//
//         return {
//             submitTPS: parseFloat(submitTPS),
//             confirmTPS: parseFloat(confirmTPS),
//             submitTime,
//             confirmTime,
//             total: submittedResults.length,
//             successfulSubmits: successfulSubmits.length
//         };
//     });
//
//     it.skip('TPS PrivateTransfer Test (Submit + Confirm with Batching + Unique TokenId)', async () => {
//         const startTestTime = Date.now();
//
//         // 用 Set 跟踪已使用的 tokenId
//         const usedTokenIds = new Set();
//
//         // 1. 收集所有 minter 的 token，并初始化 nonce
//         const allMinterData = [];
//         for (let j = 0; j < minters.length; j++) {
//             const minterAddress = minters[j].address;
//             const minterWallet = minters[j].wallet;
//             const minterMeta = await createAuthMetadata(minters[j].wallet.privateKey);
//
//             try {
//                 const splitTokenList = await getSplitTokenList(
//                     client,
//                     minterAddress,
//                     config.contracts.PrivateERCToken,
//                     minterMeta
//                 );
//
//                 const tokens = splitTokenList.split_tokens || [];
//                 if (tokens.length > 0) {
//                     const startNonce = await minterWallet.getNonce();
//                     allMinterData.push({
//                         minterIndex: j,
//                         minterAddress: minterAddress,
//                         minterWallet: minterWallet,
//                         tokens: tokens,
//                         currentNonce: startNonce,
//                     });
//                 }
//             } catch (error) {
//                 console.error(`获取 minter ${minterAddress} token 列表失败:`, error.message);
//             }
//         }
//
//         // 2. 构建 transfer 任务（去重 tokenId）
//         const transferTasks = [];
//         for (const minterData of allMinterData) {
//             const { minterWallet, tokens } = minterData;
//             const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, minterWallet);
//
//             for (let i = 0; i < tokens.length; i++) {
//                 const tokenId = '0x' + tokens[i].token_id;
//
//                 // 如果 tokenId 已使用，跳过
//                 if (usedTokenIds.has(tokenId)) continue;
//                 usedTokenIds.add(tokenId);
//
//                 const taskNonce = minterData.currentNonce++;
//
//                 transferTasks.push({
//                     execute: async () => {
//                         try {
//                             //wait
//                             const tx = await contract.privateTransfer(tokenId, accounts.To2, {
//                                 nonce: taskNonce,
//                             });
//
//                             return { success: true, nonce: taskNonce, tokenId, tx, minterAddress: minterData.minterAddress };
//                         } catch (error) {
//                             return { success: false, nonce: taskNonce, tokenId, error: error.message, minterAddress: minterData.minterAddress };
//                         }
//                     }
//                 });
//             }
//         }
//
//         console.log(`开始执行 ${transferTasks.length} 个 transfer 任务`);
//
//         // 3. 提交阶段
//         const startSubmitTime = Date.now();
//         const submittedResults = await Promise.all(transferTasks.map(task => task.execute()));
//         const endSubmitTime = Date.now();
//         const submitTime = endSubmitTime - startSubmitTime;
//
//         const successfulSubmits = submittedResults.filter(r => r.success);
//         const submitTPS = (successfulSubmits.length / (submitTime / 1000)).toFixed(2);
//
//         console.log(`\n=== 提交阶段 (Submit) ===`);
//         console.log(`提交耗时: ${submitTime}ms`);
//         console.log(`提交成功交易数: ${successfulSubmits.length}/${submittedResults.length}`);
//         console.log(`Submit TPS: ${submitTPS}`);
//
//         // console.log(`\n=== 等待transfer 确认===`);
//         // // 4. 确认阶段（批量限流等待 + 错误日志）
//         // const batchSize = 20; // 每批确认的交易数量
//         // const startConfirmTime = Date.now();
//         // let confirmedCount = 0;
//         //
//         // // 按照 nonce 排序，确保按顺序处理
//         // const sortedSuccessfulSubmits = successfulSubmits.sort((a, b) => a.nonce - b.nonce);
//         //
//         // for (let i = 0; i < sortedSuccessfulSubmits.length; i += batchSize) {
//         //     const batch = sortedSuccessfulSubmits.slice(i, i + batchSize);
//         //
//         //     await Promise.all(batch.map(async r => {
//         //         try {
//         //             await r.tx.wait();
//         //             confirmedCount++;
//         //             console.log(`确认成功: minter=${r.minterAddress}, nonce=${r.nonce}, tokenId=${r.tokenId}`);
//         //         } catch (err) {
//         //             console.error(`确认失败: minter=${r.minterAddress}, nonce=${r.nonce}, tokenId=${r.tokenId}, txHash=${r.tx.hash}`);
//         //             console.error(`失败原因:`, err.reason || err.message);
//         //         }
//         //     }));
//         // }
//         //
//         // const endConfirmTime = Date.now();
//         // const confirmTime = endConfirmTime - startConfirmTime;
//         // const confirmTPS = (confirmedCount / (confirmTime / 1000)).toFixed(2);
//         //
//         // console.log(`\n=== 确认阶段 (Confirm) ===`);
//         // console.log(`确认耗时: ${confirmTime}ms`);
//         // console.log(`确认交易数: ${confirmedCount}`);
//         // console.log(`Confirm TPS: ${confirmTPS}`);
//         //
//     });
//     it('TPS PrivateTransfer Test ： Submit without wait', async () => {
//         const startTestTime = Date.now();
//
//         // 用 Set 跟踪已使用的 tokenId
//         const usedTokenIds = new Set();
//
//         // 1. 收集所有 minter 的 token，并初始化 nonce
//         const allMinterData = [];
//         for (let j = 0; j < minters.length; j++) {
//             const minterAddress = minters[j].address;
//             const minterWallet = minters[j].wallet;
//             const minterMeta = await createAuthMetadata(minters[j].wallet.privateKey);
//
//             try {
//                 const splitTokenList = await getSplitTokenList(
//                     client,
//                     minterAddress,
//                     config.contracts.PrivateERCToken,
//                     minterMeta
//                 );
//
//                 const tokens = splitTokenList.split_tokens || [];
//                 if (tokens.length > 0) {
//                     const startNonce = await minterWallet.getNonce();
//                     allMinterData.push({
//                         minterIndex: j,
//                         minterAddress: minterAddress,
//                         minterWallet: minterWallet,
//                         tokens: tokens,
//                         currentNonce: startNonce,
//                     });
//                 }
//             } catch (error) {
//                 console.error(`获取 minter ${minterAddress} token 列表失败:`, error.message);
//             }
//         }
//
//         // 2. 构建 transfer 任务（去重 tokenId）
//         const transferTasks = [];
//         for (const minterData of allMinterData) {
//             const { minterWallet, tokens } = minterData;
//             const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, minterWallet);
//
//             for (let i = 0; i < tokens.length; i++) {
//                 const tokenId = '0x' + tokens[i].token_id;
//
//                 // 如果 tokenId 已使用，跳过
//                 if (usedTokenIds.has(tokenId)) continue;
//                 usedTokenIds.add(tokenId);
//
//                 const taskNonce = minterData.currentNonce++;
//
//                 transferTasks.push({
//                     execute: async () => {
//                         try {
//                             // 发送交易但不等待确认
//                             const tx = await contract.privateTransfer(tokenId, accounts.To2, {
//                                 nonce: taskNonce,
//                             }).catch(error => {
//                                 throw error;
//                             });
//
//                             // 只返回交易哈希，不等待交易确认
//                             return {
//                                 success: true,
//                                 nonce: taskNonce,
//                                 tokenId,
//                                 txHash: tx.hash,
//                                 minterAddress: minterData.minterAddress
//                             };
//                         } catch (error) {
//                             return {
//                                 success: false,
//                                 nonce: taskNonce,
//                                 tokenId,
//                                 error: error.message,
//                                 minterAddress: minterData.minterAddress
//                             };
//                         }
//                     }
//                 });
//             }
//         }
//
//         console.log(`开始执行 ${transferTasks.length} 个 transfer 任务`);
//
//         // 3. 提交阶段
//         const startSubmitTime = Date.now();
//         const submittedResults = await Promise.all(transferTasks.map(task => task.execute()));
//         const endSubmitTime = Date.now();
//         const submitTime = endSubmitTime - startSubmitTime;
//
//         const successfulSubmits = submittedResults.filter(r => r.success);
//         const submitTPS = (successfulSubmits.length / (submitTime / 1000)).toFixed(2);
//
//         console.log(`\n=== 提交阶段 (Submit) ===`);
//         console.log(`提交耗时: ${submitTime}ms`);
//         console.log(`提交成功交易数: ${successfulSubmits.length}/${submittedResults.length}`);
//         console.log(`Submit TPS: ${submitTPS}`);
//
//         // console.log(`\n=== 等待transfer 确认===`);
//         // // 4. 确认阶段（批量限流等待 + 错误日志）
//         // const batchSize = 20; // 每批确认的交易数量
//         // const startConfirmTime = Date.now();
//         // let confirmedCount = 0;
//         //
//         // // 按照 nonce 排序，确保按顺序处理
//         // const sortedSuccessfulSubmits = successfulSubmits.sort((a, b) => a.nonce - b.nonce);
//         //
//         // for (let i = 0; i < sortedSuccessfulSubmits.length; i += batchSize) {
//         //     const batch = sortedSuccessfulSubmits.slice(i, i + batchSize);
//         //
//         //     await Promise.all(batch.map(async r => {
//         //         try {
//         //             await r.tx.wait();
//         //             confirmedCount++;
//         //             console.log(`确认成功: minter=${r.minterAddress}, nonce=${r.nonce}, tokenId=${r.tokenId}`);
//         //         } catch (err) {
//         //             console.error(`确认失败: minter=${r.minterAddress}, nonce=${r.nonce}, tokenId=${r.tokenId}, txHash=${r.tx.hash}`);
//         //             console.error(`失败原因:`, err.reason || err.message);
//         //         }
//         //     }));
//         // }
//         //
//         // const endConfirmTime = Date.now();
//         // const confirmTime = endConfirmTime - startConfirmTime;
//         // const confirmTPS = (confirmedCount / (confirmTime / 1000)).toFixed(2);
//         //
//         // console.log(`\n=== 确认阶段 (Confirm) ===`);
//         // console.log(`确认耗时: ${confirmTime}ms`);
//         // console.log(`确认交易数: ${confirmedCount}`);
//         // console.log(`Confirm TPS: ${confirmTPS}`);
//         //
//     });
//
//
//     it.skip('TPS PrivateTransfer Test (with Nonce Management)', async () => {
//         const startTestTime = Date.now();
//
//         // 1. 收集所有minter的token，并初始化每个minter的nonce
//         const allMinterData = [];
//         for (let j = 0; j < minters.length; j++) {
//             const minterAddress = minters[j].address;
//             const minterWallet = minters[j].wallet;
//             const minterMeta = await createAuthMetadata(minters[j].wallet.privateKey);
//
//             try {
//                 const splitTokenList = await getSplitTokenList(
//                     client,
//                     minterAddress,
//                     config.contracts.PrivateERCToken,
//                     minterMeta
//                 );
//
//                 const tokens = splitTokenList.split_tokens || [];
//                 if (tokens.length > 0) {
//                     // 获取当前minter的初始nonce
//                     const startNonce = await minterWallet.getNonce();
//                     allMinterData.push({
//                         minterIndex: j,
//                         minterAddress: minterAddress,
//                         minterWallet: minterWallet,
//                         tokens: tokens,
//                         currentNonce: startNonce, // 初始化nonce
//                     });
//                 }
//             } catch (error) {
//                 console.error(`获取minter ${minterAddress} token列表失败:`, error.message);
//             }
//         }
//
//         // 2. 构建transfer任务，并为每个minter分配递增的nonce
//         const transferTasks = [];
//         for (const minterData of allMinterData) {
//             const { minterIndex, minterWallet, tokens } = minterData;
//             const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, minterWallet);
//
//             for (let i = 0; i < tokens.length; i++) {
//                 const token = tokens[i];
//                 const tokenId = '0x' + token.token_id;
//
//                 // 为当前任务分配nonce，并递增minter的nonce计数器
//                 const taskNonce = minterData.currentNonce++;
//
//                 transferTasks.push({
//                     execute: async () => {
//                         try {
//                             const tx = await contract.privateTransfer(tokenId, accounts.To2, {
//                                 nonce: taskNonce, // 使用预分配的nonce
//                             });
//                             return { success: true, nonce: taskNonce, tokenId };
//                         } catch (error) {
//                             return { success: false, nonce: taskNonce, tokenId, error: error.message };
//                         }
//                     },
//                     minterIndex,
//                     tokenId,
//                 });
//             }
//         }
//
//         console.log(`开始执行 ${transferTasks.length} 个transfer任务`);
//
//         // 3. 并发执行所有transfer任务（可限制并发数）
//         const startSubmitTime = Date.now();
//         // 提交transaction 时间
//         const results = await Promise.all(transferTasks.map(task => task.execute()));
//         const endSubmitTime = Date.now();
//
//         const submitTime = endSubmitTime - startSubmitTime;
//
//         // 4. 统计结果
//         const successful = results.filter(r => r.success).length;
//         const tps = (successful / (submitTime / 1000)).toFixed(2);
//
//         console.log(`\n=== TPS测试结果 ===`);
//         console.log(`执行提交时间: ${submitTime}ms`);
//         console.log(`总交易数: ${results.length}`);
//         console.log(`成功交易数: ${successful}`);
//         console.log(`TPS: ${tps}`);
//
//         return { tps: parseFloat(tps), total: results.length, successful, submitTime };
//     });
//     it.skip('TPS PrivateTransfer Test (with Nonce Management And BatchSize) ', async () => {
//         const startTestTime = Date.now();
//         const batchSize = 200;
//
//         // 1. 收集所有minter的token，并初始化每个minter的nonce
//         const allMinterData = [];
//         for (let j = 0; j < minters.length; j++) {
//             const minterAddress = minters[j].address;
//             const minterWallet = minters[j].wallet;
//             const minterMeta = await createAuthMetadata(minters[j].wallet.privateKey);
//
//             try {
//                 const splitTokenList = await getSplitTokenList(
//                     client,
//                     minterAddress,
//                     config.contracts.PrivateERCToken,
//                     minterMeta
//                 );
//
//                 const tokens = splitTokenList.split_tokens || [];
//                 if (tokens.length > 0) {
//                     // 获取当前minter的初始nonce
//                     const startNonce = await minterWallet.getNonce();
//                     allMinterData.push({
//                         minterIndex: j,
//                         minterAddress: minterAddress,
//                         minterWallet: minterWallet,
//                         tokens: tokens,
//                         currentNonce: startNonce, // 初始化nonce
//                     });
//                 }
//             } catch (error) {
//                 console.error(`获取minter ${minterAddress} token列表失败:`, error.message);
//             }
//         }
//
//         // 2. 构建transfer任务，并为每个minter分配递增的nonce
//         const transferTasks = [];
//         for (const minterData of allMinterData) {
//             const { minterIndex, minterWallet, tokens } = minterData;
//             const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, minterWallet);
//
//             for (let i = 0; i < tokens.length; i++) {
//                 const token = tokens[i];
//                 const tokenId = '0x' + token.token_id;
//
//                 // 为当前任务分配nonce，并递增minter的nonce计数器
//                 const taskNonce = minterData.currentNonce++;
//
//                 transferTasks.push({
//                     execute: async () => {
//                         try {
//                             const receipt = await contract.privateTransfer(tokenId, accounts.To2, {
//                                 nonce: taskNonce, // 使用预分配的nonce
//                             });
//                             return { success: true, nonce: taskNonce, tokenId };
//                         } catch (error) {
//                             return { success: false, nonce: taskNonce, tokenId, error: error.message };
//                         }
//                     },
//                     minterIndex,
//                     tokenId,
//                 });
//             }
//         }
//
//         console.log(`开始执行 ${transferTasks.length} 个transfer任务`);
//
//         // 3. 并发执行所有transfer任务（可限制并发数）
//         const startTime = Date.now();
//         // const results = await Promise.all(transferTasks.map(task => task.execute()));
//         // execute with batch size
//         const allResults = [];
//         for (let i = 0; i < transferTasks.length; i += BATCH_SIZE) {
//             const batch = transferTasks.slice(i, i + BATCH_SIZE);
//             const batchResults = await Promise.all(batch.map(task => task.execute()));
//             allResults.push(...batchResults);
//
//             // 批次间延迟
//             if (i + BATCH_SIZE < transferTasks.length) {
//                 await new Promise(resolve => setTimeout(resolve, 1000));
//             }
//         }
//
//
//         const endTime = Date.now();
//         const executionTime = endTime - startTime;
//
//         // 4. 统计结果
//         const successful = results.filter(r => r.success).length;
//         const tps = (successful / (executionTime / 1000)).toFixed(2);
//
//         console.log(`\n=== 超高TPS测试结果（改进版） ===`);
//         console.log(`执行提交时间: ${executionTime}ms`);
//         console.log(`总交易数: ${results.length}`);
//         console.log(`成功交易数: ${successful}`);
//         console.log(`TPS: ${tps}`);
//
//         return { tps: parseFloat(tps), total: results.length, successful, executionTime };
//     });
//
// });

