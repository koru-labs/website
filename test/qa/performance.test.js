const { expect } = require("chai");
const { ethers, network } = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const { getEnvironmentConfig } = require('../../script/deploy_help.js');
const config = getEnvironmentConfig();
const accounts = require('./../../deployments/account.json');
const { createClient } = require('../qa/token_grpc')
const pLimit = require("p-limit");

// find node3 institution
const node3Institution = config.institutions.find(institution => institution.name === "Node3");
if (!node3Institution) {
    throw new Error("Node3 institution not found in config");
}
const rpcUrl = node3Institution.rpcUrl;
console.log("rpcUrl:", rpcUrl)
const client = createClient(rpcUrl)

const {
    createAuthMetadata, registerUser, allowBanksInTokenSmartContract, setMinterAllowed, getAddressBalance,
    callPrivateMint, getAccount, getMinterAllowed, callPrivateTransfers
} = require("../help/testHelp")
const { address, hexString } = require("hardhat/internal/core/config/config-validation");
const { bigint } = require("hardhat/internal/core/params/argumentTypes");
const axios = require("axios");
const { getImage9EnvironmentData } = require("../../script/deploy_help");
const deployedData = getImage9EnvironmentData();
const scAddress = deployedData.contracts.PrivateERCToken;

const l1CustomNetwork = {
    name: "BESU",
    chainId: 1337,
};
const options = {
    batchMaxCount: 10,
    staticNetwork: true
};


const providerUrl = network.config.url;
console.log("providerUrl:", providerUrl);
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
const adminPrivateKey = accounts.OwnerKey;
const node4AdminPrivateKey = "81690fb141b4ae5682ad1fd73b29ae1bcc67891e93de73c6f636402deac21171";

const amount = 10;
let preBalance, postBalance;
let preAllowance, postAllowance;

// const minterMeta = await createAuthMetadata(accounts.MinterKey);
// const onwerMeta = await createAuthMetadata(accounts.Owner)



function convertBigInt2Hex(number) {
    return ethers.toBigInt(number).toString(10)
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getTokenBalanceByAdmin(address) {
    const adminMeta = await createAuthMetadata(adminPrivateKey)
    const result = await getAddressBalance(client, scAddress, address, adminMeta);
    return result
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

async function getSplitTokenList(grpcClient, owner, scAddress, metadata) {
    const grpcResult = await grpcClient.getSplitTokenList(owner, scAddress, metadata);
    return grpcResult;
}


async function mintBy(address, amount, minterWallet) {
    const key = minterWallet.privateKey
    const minterMeta = await createAuthMetadata(key);
    const wallet = new ethers.Wallet(key, l1Provider);
    const generateRequest = {
        sc_address: scAddress,
        token_type: '0',
        from_address: minterWallet.address,
        to_address: address,
        amount: amount
    };
    const response = await client.generateMintProof(generateRequest, minterMeta);
    const receipt = await callPrivateMint(scAddress, response, wallet)
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, minterMeta)
    return receipt
}

const MAX_CONCURRENCY = 3;
async function processBatch(batchSignedTxs, batchMetadata, batchIndex, totalBatches, providerUrl, allResults) {
    const startTime = Date.now();
    console.log(`正在发送批次 ${batchIndex + 1}/${totalBatches}, 批次大小: ${batchSignedTxs.length}, 开始时间: ${new Date(startTime).toISOString()}`);

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

        console.log(`批次 ${batchIndex + 1}/${totalBatches} 发送完成, 结束时间: ${new Date(endTime).toISOString()}, 耗时: ${duration}ms`);
    } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.error(`批次 ${batchIndex + 1}/${totalBatches} 请求失败, 结束时间: ${new Date(endTime).toISOString()}, 耗时: ${duration}ms, 错误:`, error.message);

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

describe("Performance Test with created 10 minters", function () {
    this.timeout(120000000);

    const TOTAL_SIZE = 300;
    const BATCH_SIZE = 1000;
    // const minters = [
    //     // {
    //     //     address: accounts.Minter,
    //     //     wallet: new ethers.Wallet(accounts.MinterKey, l1Provider),
    //     // }
    //     {
    //         address: minterWallet.address,
    //         wallet: minterWallet,
    //     }]

    const minter1 = ethers.Wallet.createRandom();
    // const minter2 = ethers.Wallet.createRandom();
    // const minter3 = ethers.Wallet.createRandom();
    //
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
        // {
        //     address: minter2.address,
        //     wallet: new ethers.Wallet(minter2.privateKey, l1Provider)
        // },
        // {
        //     address: minter3.address,
        //     wallet: new ethers.Wallet(minter3.privateKey, l1Provider)
        // },
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
        for (let i = 0; i < minters.length; i++) {
            await registerUser(adminPrivateKey, client, minters[i].address, "normal");
            await sleep(30000);
            let response = await getAccount(adminPrivateKey, client, minters[i].address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("normal");
        }
    });

    it('Set allowance', async () => {
        for (let i = 0; i < minters.length; i++) {
            console.log(`第${i} 个 minter set allowance开始,${minters[i].address}`)
            await allowBanksInTokenSmartContract(minters[i].address)
            await setMinterAllowed(client, minters[i].address)
            await sleep(10000)

            // const minterMeta = await createAuthMetadata(minters[i].wallet.privateKey)
            // console.log(await getMinterAllowed(client, minterMeta))
        }
    });
    it('Mint', async () => {
        // const amount = TOTAL_SIZE/10 + 100;
        const amount = 200;
        for (let i = 0; i < minters.length; i++) {
            for (let j = 0; j < 10; j++) {
                console.log(`mintBy ${minters[i].address} ${j + 1} 轮开始`)
                await mintBy(minters[i].address, amount, minters[i].wallet)
                await sleep(2000)
                console.log(`第${j + 1}轮mint完成`)
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
                    sc_address: scAddress,
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
        console.log(`成功率: ${(totalSuccess / totalRequests * 100).toFixed(2)}%`);

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
    // it.skip('TPS PrivateTransfer Test ： Submit with Minter Parallelization and Batching', async () => {
    //     // ... code removed for clarity
    // });
    it('TPS PrivateTransfers Test ：Sign First and send batched callPrivateTransfers', async () => {
        const TOKENS_PER_CALL = 100; // 每个minter每次调用包含的最大token数
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
                    scAddress,
                    minterMeta
                );

                const tokens = splitTokenList.split_tokens || [];
                if (tokens.length > 0) {
                    const startNonce = await minterWallet.getNonce();
                    console.log(`Minter ${j + 1} (${minterAddress}) 当前 nonce: ${startNonce}`)
                    console.log(`Minter ${j + 1} (${minterAddress}) 有 ${tokens.length} 个 token`);
                    return {
                        minterIndex: j,
                        minterAddress,
                        minterWallet,
                        tokens,
                        currentNonce: startNonce,
                    };
                } else {
                    console.log(`Minter ${j + 1} (${minterAddress}) 没有 token`);
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
                scAddress,
                minterWallet
            );

            const minterTasks = [];
            let batchIndex = 0;
            for (let i = 0; i < tokens.length; i += TOKENS_PER_CALL) {
                const batchTokens = tokens.slice(i, i + TOKENS_PER_CALL)
                    .map(t => BigInt(t.token_id));

                if (batchTokens.length === 0) continue;

                const taskNonce = minterData.currentNonce++;
                // console.log("tokenIds:", batchTokens)
                console.log("minter privateTransfers nonce ", taskNonce)
                console.log(batchTokens)

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

            console.log(`Minter ${minterData.minterIndex + 1} 构建了 ${minterTasks.length} 个 batched 任务`);
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
                task.txData.gasLimit = task.txData.gasLimit || 50000000;
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
        const providerUrl = network.config.url;

        for (let i = 0; i < signedTransactions.length; i += BATCH_SIZE) {
            const batchSignedTxs = signedTransactions.slice(i, i + BATCH_SIZE);
            const batchMetadata = taskMetadata.slice(i, i + BATCH_SIZE);

            console.log(`正在发送批次 ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(signedTransactions.length / BATCH_SIZE)}, 批次大小: ${batchSignedTxs.length}`);

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
        console.log(`平均每批次处理时间: ${(submitTime / Math.ceil(signedTransactions.length / BATCH_SIZE)).toFixed(2)}ms`);

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


});



