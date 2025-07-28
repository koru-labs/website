const { expect } = require("chai");
const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')


const rpcUrl = "qa-node3-rpc.hamsa-ucl.com:50051"
const rpcUrl_1 = "qa-node4-rpc.hamsa-ucl.com:50051"
// const rpcUrl = 'a901f625f7fbc414d89f04b67325365c-1938211366.us-west-1.elb.amazonaws.com:50051'
// const rpcUrl_1 = "a10062b98cbe34ba2a0b278754c41a1e-660863113.us-west-1.elb.amazonaws.com:50051"
const client = createClient(rpcUrl)
const client1 = createClient(rpcUrl_1)

const {
    createAuthMetadata,
} = require("../help/testHelp")
const {address, hexString} = require("hardhat/internal/core/config/config-validation");
const {bigint} = require("hardhat/internal/core/params/argumentTypes");

const l1CustomNetwork = {
    name: "BESU",
    chainId: 1337,
};
const options = {
    batchMaxCount: 1,
    staticNetwork: true
};


const L1Url = hardhatConfig.networks.ucl_L2.url;
const l1Provider = new ethers.JsonRpcProvider(L1Url, l1CustomNetwork, options);

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
const adminPrivateKey = hardhatConfig.networks.ucl_L2.accounts[1];
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


describe("Split Transfer Performance Test", function () {
    this.timeout(12000000); // 设置较长的超时时间

    const PERFORMANCE_TEST_COUNT = 100; // 执行10次transfer操作进行性能测试
    const TRANSFER_AMOUNT = 1;

    let performanceResults = [];
    let adminMeta,minterMeta,spenderMeta,to1Meta,node4AdminMeta

    before(async function () {
        console.log("To1 address:", accounts.To1);
        console.log("Minter address:", accounts.Minter);

        // 详细验证地址
        if (!ethers.isAddress(accounts.To1)) {
            throw new Error(`Invalid To1 address format: ${accounts.To1} (type: ${typeof accounts.To1})`);
        }
        if (!ethers.isAddress(accounts.Minter)) {
            throw new Error(`Invalid Minter address: ${accounts.Minter}`);
        }

        console.log("Addresses validated successfully");
        minterMeta = await createAuthMetadata(accounts.MinterKey)
        to1Meta = await createAuthMetadata(accounts.To1PrivateKey);
        // 确保账户有足够的余额进行多次转账
        const totalAmountNeeded = TRANSFER_AMOUNT * PERFORMANCE_TEST_COUNT + 50;
        await DirectMint(accounts.Minter, totalAmountNeeded);
        console.log(`Minted ${totalAmountNeeded} tokens to Minter for performance test`);
    });

    // 修改批量transfer函数，使用递增的nonce
    it.only("Performance test: Batch split transfers with sequential nonce", async function () {
        const BATCH_SIZE = PERFORMANCE_TEST_COUNT; // 增加到100个token进行测试
        console.log(`Starting batch performance test with ${BATCH_SIZE} split transfers with sequential nonce`);

        // 确保有足够的余额
        const totalAmountNeeded = TRANSFER_AMOUNT * BATCH_SIZE + 50;
        await DirectMint(accounts.Minter, totalAmountNeeded);
        console.log(`Ensured ${totalAmountNeeded} tokens for minter`);
        // 第一步：批量提交所有split请求
        console.log("Step 1: Submitting split requests one by one and ensuring success");
        const splitRequests = [];
        const startSubmitTime = Date.now();

        for (let i = 0; i < BATCH_SIZE; i++) {
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: accounts.To1,
                amount: TRANSFER_AMOUNT
            };

            let success = false;
            let attempts = 0;
            const maxAttempts = 3; // 最多尝试3次

            while (!success && attempts < maxAttempts) {
                try {
                    attempts++;
                    console.log(`Submitting request ${i + 1}/${BATCH_SIZE} (attempt ${attempts})`);
                    let response = await client.generateSplitToken(splitRequest, minterMeta);

                    // 等待该请求完成
                    console.log(`Waiting for proof ${i + 1} to complete...`);
                    const startTime = Date.now();
                    await client.waitForActionCompletion(
                        client.getTokenActionStatus,
                        response.request_id,
                        minterMeta
                    );
                    const endTime = Date.now();

                    splitRequests.push({
                        index: i,
                        response: response,
                        status: "completed",
                        waitTime: endTime - startTime
                    });

                    console.log(`Request ${i + 1}/${BATCH_SIZE} completed in ${endTime - startTime}ms`);
                    success = true;
                } catch (error) {
                    console.error(`Failed to submit/request ${i + 1} (attempt ${attempts}):`, error.message);
                    if (attempts >= maxAttempts) {
                        splitRequests.push({
                            index: i,
                            error: error.message,
                            status: "failed"
                        });
                        console.error(`Request ${i + 1} failed after ${maxAttempts} attempts`);
                    } else {
                        // 等待一段时间再重试
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }
        }

        const endSubmitTime = Date.now();
        const submitTime = endSubmitTime - startSubmitTime;
        console.log(`All requests submitted and processed in ${submitTime}ms`);

        // 第三步：批量执行transfer交易，使用递增的nonce
        console.log("Step 3: Executing all transfers with sequential nonce");
        const startTransferTime = Date.now();

        const successfulRequests = splitRequests.filter(req => req.status === "completed");
        const startNonce = await minterWallet.getNonce()
        // 创建transfer任务，每个transfer使用递增的nonce
        const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, minterWallet);

        const transferTasks = successfulRequests.map(async (request, index) => {
            const startTime = Date.now();
            try {
                // 使用起始nonce加上索引作为每个transfer的nonce
                const transferNonce = startNonce + index;
                const tokenId = '0x' + request.response.transfer_token_id;

                console.log(`Executing transfer ${index + 1}/${successfulRequests.length}`);
                console.log(`  Token ID: ${tokenId}`);
                // 直接调用合约方法
                let receipt = await contract.privateTransfer(tokenId, accounts.To1, {
                    nonce: transferNonce
                });
                // console.log("PrivateTransfer receipt: ", receipt)

                const endTime = Date.now();

                return {
                    index: request.index,
                    nonce: transferNonce,
                    tokenId: tokenId,
                    totalTime: endTime - startTime,
                    status: "success"
                };
            } catch (error) {
                console.log(error)
                const endTime = Date.now();
                return {
                    index: request.index,
                    nonce: startNonce + index,
                    totalTime: endTime - startTime,
                    status: "failed",
                    error: error.message
                };
            }
        });

        const transferResults = await Promise.all(transferTasks);
        console.log("transferResults length: ", transferResults.length)
        const endTransferTime = Date.now();
        const transferTime = endTransferTime - startTransferTime;
        console.log(`All transfers executed in ${transferTime}ms`);

        // 统计结果
        const totalEndTime = Date.now();
        const totalExecutionTime = totalEndTime - startSubmitTime;

        console.log("\n=== Performance Results ===");
        console.log(`Total execution time: ${totalExecutionTime}ms`);
        console.log(`  - Request submission: ${submitTime}ms`);
        console.log(`  - Transfer execution: ${transferTime}ms`);

        // 成功的交易统计
        const successfulTransfers = transferResults.filter(r => r.status === "success").length;
        const successRate = (successfulTransfers / BATCH_SIZE) * 100;
        console.log(`Success rate: ${successRate.toFixed(2)}% (${successfulTransfers}/${BATCH_SIZE})`);

        if (successfulTransfers > 0) {
            const totalTimes = transferResults
                .filter(r => r.status === "success")
                .map(r => r.totalTime);

            const avgTransferTime = totalTimes.reduce((a, b) => a + b, 0) / totalTimes.length;
            const minTransferTime = Math.min(...totalTimes);
            const maxTransferTime = Math.max(...totalTimes);

            console.log(`Average transfer time: ${avgTransferTime.toFixed(2)}ms`);
            console.log(`Min transfer time: ${minTransferTime}ms`);
            console.log(`Max transfer time: ${maxTransferTime}ms`);

        }

        // // 显示详细结果
        // console.log("\n=== Detailed Results ===");
        // transferResults.forEach(result => {
        //     if (result.status === "success") {
        //         console.log(`Transfer ${result.index + 1} : ${result.totalTime}ms`);
        //     } else {
        //         console.log(`Transfer ${result.index + 1} : Failed - ${result.error}`);
        //     }
        // });
        //
        // // 显示失败的请求
        // const failedRequests = successfulTransfers.filter(req => req.status !== "success");
        // if (failedRequests.length > 0) {
        //     console.log(`\nFailed requests: ${failedRequests.length}`);
        //     failedRequests.forEach(request => {
        //         console.log(`  Request ${request.index + 1}: ${request.error || 'Unknown error'}`);
        //     });
        // }
    });
    after(async function () {
        // 输出性能测试总结
        console.log("\n=== Performance Test Summary ===");

        if (performanceResults.length > 0) {
            const successfulResults = performanceResults.filter(r => r.status === "success");

            if (successfulResults.length > 0) {
                const totalTimes = successfulResults.map(r => r.totalTime);
                const avgTotalTime = totalTimes.reduce((a, b) => a + b, 0) / totalTimes.length;
                const minTotalTime = Math.min(...totalTimes);
                const maxTotalTime = Math.max(...totalTimes);
                console.log(`Successful transfers: ${successfulResults.length}/${performanceResults.length}`);
                console.log(`Average total time: ${avgTotalTime.toFixed(2)}ms`);
                console.log(`Min total time: ${minTotalTime}ms`);
                console.log(`Max total time: ${maxTotalTime}ms`);

                // 如果有详细的时间分解数据
                const proofTimes = successfulResults.map(r => r.proofGenerationTime || 0).filter(t => t > 0);
                const waitTimes = successfulResults.map(r => r.waitForActionTime || 0).filter(t => t > 0);
                const transferTimes = successfulResults.map(r => r.transferTime || 0).filter(t => t > 0);

                if (proofTimes.length > 0) {
                    const avgProofTime = proofTimes.reduce((a, b) => a + b, 0) / proofTimes.length;
                    console.log(`Average proof generation time: ${avgProofTime.toFixed(2)}ms`);
                }

                if (waitTimes.length > 0) {
                    const avgWaitTime = waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length;
                    console.log(`Average wait time: ${avgWaitTime.toFixed(2)}ms`);
                }

                if (transferTimes.length > 0) {
                    const avgTransferTime = transferTimes.reduce((a, b) => a + b, 0) / transferTimes.length;
                    console.log(`Average transfer time: ${avgTransferTime.toFixed(2)}ms`);
                }
            }
        }

        // 显示失败的测试
        // const failedResults = performanceResults.filter(r => r.status === "failed");
        // if (failedResults.length > 0) {
        //     console.log(`\nFailed transfers: ${failedResults.length}`);
        //     failedResults.forEach(result => {
        //         console.log(`  Transfer ${result.iteration}: ${result.error}`);
        //     });
        // }
    });
});


