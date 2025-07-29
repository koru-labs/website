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
    createAuthMetadata, registerUser, allowBanksInTokenSmartContract, setMinterAllowed, getAddressBalance2,
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


describe("Split Transfer Performance Test", function () {
    this.timeout(120000000); // 设置较长的超时时间

    const PERFORMANCE_TEST_COUNT = 1000; // 执行10次transfer操作进行性能测试
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
    it("Performance test: Split one by one, batch transfers with sequential nonce", async function () {
        const BATCH_SIZE = PERFORMANCE_TEST_COUNT;
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


    });



});

describe.only("Performance Test", function () {
    this.timeout(120000000);

    const TOTAL_SIZE = 100;

    const minter1 = ethers.Wallet.createRandom();
    const minter2 = ethers.Wallet.createRandom();
    const minter3 = ethers.Wallet.createRandom();
    const minter4 = ethers.Wallet.createRandom();
    const minter5 = ethers.Wallet.createRandom();
    const minter6 = ethers.Wallet.createRandom();
    const minter7 = ethers.Wallet.createRandom();
    const minter8 = ethers.Wallet.createRandom();
    const minter9 = ethers.Wallet.createRandom();
    const minter10 = ethers.Wallet.createRandom();

    const minters = [
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
        },
        {
            address: minter4.address,
            wallet: new ethers.Wallet(minter4.privateKey, l1Provider)
        },
        {
            address: minter5.address ,
            wallet: new ethers.Wallet(minter5.privateKey, l1Provider)
        },
        {
            address: minter6.address,
            wallet: new ethers.Wallet(minter6.privateKey, l1Provider)
        },
        {
            address: minter7.address,
            wallet: new ethers.Wallet(minter7.privateKey, l1Provider)
        },
        {
            address: minter8.address,
            wallet: new ethers.Wallet(minter8.privateKey, l1Provider)
        },
        {
            address: minter9.address,
            wallet: new ethers.Wallet(minter9.privateKey, l1Provider)
        },
        {
            address: minter10.address,
            wallet: new ethers.Wallet(minter10.privateKey, l1Provider)
        }
    ]

    it('Registe ', async () => {

        for (let i = 0; i < minters.length; i++){
            await registerUser(adminPrivateKey,client, minters[i].address, "minter");
        }
    });
    it('Set allowance', async () => {
        for (let i = 0; i< minters.length; i++){
            await allowBanksInTokenSmartContract(minters[i].address)
            await setMinterAllowed(minters[i].address)
        }
    });

    it('Mint', async () => {
        const amount = TOTAL_SIZE + 50;
        for (let i = 0; i < minters.length; i++){
            const preBalance = await getTokenBalanceByAdmin(minters[i].address);
            await DirectMint(minters[i].address, amount)
            const postBalance = await getTokenBalanceByAdmin(minters[i].address);
            expect(postBalance - preBalance).equal(amount)
        }
    });

    it('Split tokens ',async () => {
        const BATCH_SIZE = 100;
        const TRANSFER_AMOUNT = 1;

        // 为每个minter执行TOTAL_SIZE次split操作，按BATCH_SIZE分批处理
        for (let j = 0; j < minters.length; j++){
            const minterMeta = await createAuthMetadata(minters[j].wallet.privateKey);

            for (let i = 0; i < TOTAL_SIZE; i += BATCH_SIZE) {
                const currentBatchSize = Math.min(BATCH_SIZE, TOTAL_SIZE - i);
                const splitTasks = [];

                // 创建当前批次的split请求
                for (let k = 0; k < currentBatchSize; k++) {
                    const splitRequest = {
                        sc_address: config.contracts.PrivateERCToken,
                        token_type: '0',
                        from_address: minters[j].address,
                        to_address: accounts.To1,
                        amount: TRANSFER_AMOUNT
                    };

                    // 添加split任务到批次中
                    splitTasks.push(await client.generateSplitToken(splitRequest, minterMeta));
                }

                // 执行当前批次的所有split请求
                try {
                    const results = await Promise.all(splitTasks);
                    console.log(`Minter ${j+1} - Batch ${Math.floor(i/BATCH_SIZE)+1} completed with ${results.length} splits`);
                } catch (error) {
                    console.error(`Error in batch execution for minter ${j+1}, batch ${Math.floor(i/BATCH_SIZE)+1}:`, error);
                }

                // 在批次之间添加延迟，避免网络拥堵
                if (i + BATCH_SIZE < TOTAL_SIZE) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        }
        console.log(`All minters completed split operations. Each minter executed ${TOTAL_SIZE} splits in batches of ${BATCH_SIZE}`);
    });

    it.skip('Transfer', async () => {
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
    })

});


describe("Batch Split Token Generation Test", function () {
    this.timeout(12000000); // 20分钟超时

    const BATCH_SIZE_PER_ACCOUNT = 100; // 每个账户执行10次，总共5*10=50次
    let minterMeta;
    let splitTokenResults = [];
    const TRANSFER_AMOUNT = 1;
    let receiverAccounts = [
        {
            address: accounts.Minter,
            key: accounts.MinterKey
        },
        {
            address: accounts.Minter2,
            key: accounts.Minter2Key
        },
        {
            address: accounts.Minter3,
            key: accounts.Minter3Key
        },
        {
            address: accounts.To1,
            key: accounts.To1PrivateKey
        },
        {
            address: accounts.Spender1,
            key: accounts.Spender1Key
        }
    ];
    before(async function () {
        console.log("准备测试环境...");
        minterMeta = await createAuthMetadata(accounts.MinterKey);

        // 确保发送方有足够的代币
        const totalAmountNeeded = TRANSFER_AMOUNT * BATCH_SIZE_PER_ACCOUNT + 50;
        await DirectMint(accounts.Minter, totalAmountNeeded);
        await DirectMint(accounts.Minter2, totalAmountNeeded);
        await DirectMint(accounts.Minter3, totalAmountNeeded);
        await DirectMint(accounts.Spender1, totalAmountNeeded);
        await DirectMint(accounts.To1, totalAmountNeeded);
        // 验证所有接收方地址
        // for (const addressMap of receiverAccounts) {
        //     await getAddressBalance2(addressMap.address);
        // }
        // console.log("所有地址验证成功");
    });

    it("批量生成分割代币请求", async function () {
        console.log("开始批量生成分割代币请求...");
        const startTime = Date.now();

        const accountPromises = receiverAccounts.map(async (receiverAddress, accountIndex) => {
            const accountResults = [];
            let meta = await createAuthMetadata(receiverAddress.key);
            let address = receiverAddress.address;
            for (let i = 0; i < BATCH_SIZE_PER_ACCOUNT; i++) {
                const splitRequest = {
                    sc_address: config.contracts.PrivateERCToken,
                    token_type: '0',
                    from_address: address,
                    to_address: accounts.To2,
                    amount: TRANSFER_AMOUNT
                };

                try {
                    console.log(`提交请求 ${i + 1}/${BATCH_SIZE_PER_ACCOUNT} 到 ${address}`);
                    const response = await client.generateSplitToken(splitRequest, meta);
                    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,meta)
                    console.log(`请求 ${i + 1} 提交成功，请求ID: ${response.request_id}`);
                    await sleep(500)
                } catch (error) {
                    console.error(`请求失败 (账户 ${accountIndex + 1}, 请求 ${i + 1}):`, error.toString());
                }
            }

            return accountResults;
        });

        // 并发执行所有账户的请求
        await Promise.all(accountPromises);

        const endTime = Date.now();
        const totalTime = endTime - startTime;
        console.log(`\n所有分割代币请求已提交，总耗时: ${totalTime}ms`);
    });


});
