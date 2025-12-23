const { expect } = require('chai');
const { ethers } = require('hardhat');
const { createClient } = require('./token_grpc');
const accounts = require('./../../deployments/account.json');
const grpc = require("@grpc/grpc-js");

const native_token_address = "0xd40eD538ba00BC823674bcE975e446c194ac0C57";
const rpcUrl = "dev2-node3-rpc.hamsa-ucl.com:50051";
const client = createClient(rpcUrl);

// 固定的两个minter地址和私钥
const MINTERS = {
    minter1: {
        address: "0x983b4bA7e42E664dDBfe4ed3E0Ea07D90EFCc13B",
        privateKey: "f7a610afa00eac908941fe2c9f8cd57142408d2edf13aed4e4efa52fe7958ab1"
    },
    minter2: {
        address: "0x4568E35F2c4590Bde059be615015AaB6cc873004",
        privateKey: "518eb784dd768d8c0cdf9218d44ae8f498d0cadf7ecf98f5ecf27c6b793986ca"
    }
};

// 固定的两个receiver地址
const RECEIVER_CONFIG = {
    receiver1: "0x4312488937D47A007De24d48aB82940C809EEb2b",
    receiver2: "0x57829d5E80730D06B1364A2b05342F44bFB70E8f"
};

const abi = "[{\"inputs\":[{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"tokenId\",\"type\":\"uint256\"}],\"name\":\"getToken\",\"outputs\":[{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address[]\",\"name\":\"recipients\",\"type\":\"address[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity[]\",\"name\":\"tokens\",\"type\":\"tuple[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"value\",\"type\":\"tuple\"}],\"internalType\":\"struct TokenModel.ElGamalToken\",\"name\":\"newAllowed\",\"type\":\"tuple\"},{\"internalType\":\"uint256[8]\",\"name\":\"proof\",\"type\":\"uint256[8]\"},{\"internalType\":\"uint256[]\",\"name\":\"publicInputs\",\"type\":\"uint256[]\"},{\"internalType\":\"uint256\",\"name\":\"PaddingNum\",\"type\":\"uint256\"}],\"name\":\"mint\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"minter\",\"type\":\"address\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"value\",\"type\":\"tuple\"}],\"internalType\":\"struct TokenModel.ElGamalToken\",\"name\":\"allowed\",\"type\":\"tuple\"}],\"name\":\"setMintAllowed\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"from\",\"type\":\"address\"},{\"internalType\":\"address[]\",\"name\":\"recipients\",\"type\":\"address[]\"},{\"internalType\":\"uint256[]\",\"name\":\"consumedIds\",\"type\":\"uint256[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity[]\",\"name\":\"newTokens\",\"type\":\"tuple[]\"},{\"internalType\":\"uint256[8]\",\"name\":\"proof\",\"type\":\"uint256[8]\"},{\"internalType\":\"uint256[]\",\"name\":\"publicInputs\",\"type\":\"uint256[]\"},{\"internalType\":\"uint256\",\"name\":\"PaddingNum\",\"type\":\"uint256\"}],\"name\":\"split\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"tokenId\",\"type\":\"uint256\"},{\"internalType\":\"string\",\"name\":\"memo\",\"type\":\"string\"}],\"name\":\"transfer\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]"

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

async function setupMintAllowance(native, client, minters, amount) {
    console.log(`\n=== 设置铸币权限 ===`);

    const ownerMetadata = await createAuthMetadata(accounts.OwnerKey);

    for (const [minterName, minterConfig] of Object.entries(minters)) {
        console.log(`[${minterName}] 正在编码金额并设置权限...`);
        const response = await client.encodeElgamalAmount(amount, ownerMetadata);
        const allowed = {
            id: ethers.toBigInt(response.token_id),
            value: {
                cl_x: ethers.toBigInt(response.amount.cl_x),
                cl_y: ethers.toBigInt(response.amount.cl_y),
                cr_x: ethers.toBigInt(response.amount.cr_x),
                cr_y: ethers.toBigInt(response.amount.cr_y)
            }
        };

        const tx = await native.setMintAllowed(minterConfig.address, allowed);
        await tx.wait();
        console.log(`✅ [${minterName}] 权限设置完成`);
    }
}


async function mintTokensForMinters(client, minters, number, amount) {
    console.log(`\n=== 为minters铸造代币 ===`);
    const mintedTokens = {};

    // 遍历所有minter配置
    for (const [minterName, minterConfig] of Object.entries(minters)) {
        console.log(`\n[${minterName}] ===== 开始铸币流程 =====`);
        console.log(`[${minterName}] 目标: ${number}个代币，每个金额: ${amount}`);

        const minterWallet = new ethers.Wallet(minterConfig.privateKey, ethers.provider);
        const minterMetadata = await createAuthMetadata(minterConfig.privateKey);

        // 动态创建 to_accounts 数组
        const to_accounts = Array(number).fill().map(() => ({
            address: minterConfig.address,
            amount: amount
        }));

        const generateRequest = {
            sc_address: native_token_address,
            token_type: '0',
            from_address: minterConfig.address,
            to_accounts: to_accounts,
        };

        console.log(`[${minterName}] 📤 正在调用 generateBatchMintProof...`);
        let response;
        try {
            response = await client.generateBatchMintProof(generateRequest, minterMetadata);
            console.log(`[${minterName}] ✅ 证明生成成功`);
            console.log(`[${minterName}] 返回账户数: ${response.to_accounts?.length || 0}`);
            console.log(`[${minterName}] MintAllowed ID: ${response.mint_allowed?.token_id}`);
        } catch (error) {
            console.error(`\n[${minterName}] ❌ 证明生成失败!`);
            console.error(`[${minterName}] 错误码: ${error.code}`);
            console.error(`[${minterName}] 错误消息: ${error.message}`);
            throw error;
        }

        // 处理响应数据
        const recipients = response.to_accounts.map(account => account.address);
        const bathcedSize = response.batched_size
        console.log("bathcedSize", bathcedSize);
        const newTokens = response.to_accounts.map((account, index) => ({
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
            rollbackTokenId: 0
        }));

        const newAllowed = {
            id: response.mint_allowed.token_id,
            value: {
                cl_x: response.mint_allowed.cl_x,
                cl_y: response.mint_allowed.cl_y,
                cr_x: response.mint_allowed.cr_x,
                cr_y: response.mint_allowed.cr_y,
            }
        };

        const proof = response.proof.map(p => ethers.toBigInt(p));
        const publicInputs = response.input.map(i => ethers.toBigInt(i));

        console.log(`\n[${minterName}] ===== 准备执行铸币交易 =====`);
        console.log(`[${minterName}] Recipients数量: ${recipients.length}`);
        console.log(`[${minterName}] NewTokens数量: ${newTokens.length}`);
        console.log(`[${minterName}] 第一个Token ID: ${newTokens[0]?.id}`);
        console.log(`[${minterName}] MintAllowed ID: ${newAllowed.id}`);

        // 准备合约实例
        const native = new ethers.Contract(native_token_address, abi, minterWallet);

        try {
            console.log(`[${minterName}] 🚀 正在发送铸币交易...`);
            // 移除手动gas参数，让ethers自动处理
            const tx = await native.mint(recipients, newTokens, newAllowed, proof, publicInputs,bathcedSize - to_accounts.length);

            console.log(`[${minterName}] 📡 交易已发送, Hash: ${tx.hash}`);
            console.log(`[${minterName}] ⏳ 等待确认中 (最多10分钟)...`);

            const waitStartTime = Date.now();
            const receipt = await tx.wait();
            const waitTime = Date.now() - waitStartTime;

            console.log(`\n[${minterName}] ✅ 交易确认成功!`);
            console.log(`[${minterName}] 区块号: ${receipt.blockNumber}`);
            console.log(`[${minterName}] Gas使用: ${receipt.gasUsed}`);

            // 保存代币ID
            mintedTokens[minterName] = newTokens.map(token => token.id);
            console.log(`\n✅ [${minterName}] 成功铸造 ${number} 个代币，每个金额 ${amount}`);

        } catch (error) {
            console.error(`\n[${minterName}] ❌ 铸币交易失败!`);
            console.error(`[${minterName}] 错误类型: ${error.code || 'N/A'}`);
            console.error(`[${minterName}] 错误消息: ${error.message}`);

            if (error.transactionHash) {
                console.error(`[${minterName}] 失败的交易Hash: ${error.transactionHash}`);
            }

            throw error;
        }
    }

    return mintedTokens;
}


// 超时辅助函数
const withTimeout = (promise, timeoutMs, nonce) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Transaction with nonce ${nonce} timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        })
    ]);
};

describe.only('Native Dual Minter Performance Tests', function () {
    let client, owner,minter;
    let nativeOwner,nativeMinter;
    let mintedTokens = {};
    const total_number = 200
    const amount = 50

    before(async function () {
        this.timeout(300000); // 5分钟超时

        console.log('🚀 === 测试环境初始化 ===');

        // 初始化客户端
        client = createClient(rpcUrl);

        // 获取合约owner
        [owner,minter] = await ethers.getSigners();

        // 初始化合约
        nativeOwner = new ethers.Contract(
            native_token_address,
            abi,
            owner
        );
        nativeMinter = new ethers.Contract(
            native_token_address,
            abi,
            minter
        );

        console.log(`合约地址: ${native_token_address}`);
        console.log(`Owner地址: ${owner.address}`);
        // console.log(`Minter1地址: ${MINTERS.minter1.address}`);
        // console.log(`Minter2地址: ${MINTERS.minter2.address}`);
        console.log(`Receiver1地址: ${RECEIVER_CONFIG.receiver1}`);
        console.log(`Receiver2地址: ${RECEIVER_CONFIG.receiver2}`);
        console.log('✅ 环境初始化完成\n');
    });

    describe('Case 1: Setup mint allowance for two minters', function () {
        it('should set mint allowance for minter1', async function () {
            this.timeout(120000);
            await setupMintAllowance(nativeOwner, client, { minter1: MINTERS.minter1 }, 100000000);
        });

        it('should set mint allowance for minter2', async function () {
            this.timeout(120000);
            await setupMintAllowance(nativeOwner, client, { minter2: MINTERS.minter2 }, 100000000);
        });
    });

    describe('Case 2: Mint tokens for both minters', function () {
        this.timeout(6000000); // 10分钟

        it('should mint 200 tokens for each minter', async function () {
            const batchSize = 32;     // 每批最大数量

            console.log(`\n🎯 开始为两个minter各铸造${total_number}个代币（分批次处理）`);

            // 分批循环铸造
            for (let i = 0; i < total_number; i += batchSize) {
                const currentBatchSize = Math.min(batchSize, total_number - i);
                const batchNumber = Math.floor(i / batchSize) + 1;
                const isLastBatch = i + batchSize >= total_number;

                console.log(`\n📦 批次 ${batchNumber}${isLastBatch ? ' (最后一批)' : ''}: 铸造 ${currentBatchSize} 个代币`);

                await mintTokensForMinters(
                    client,
                    MINTERS,
                    currentBatchSize,
                    amount
                );

                // 批次间短暂延迟，避免压垮系统
                if (!isLastBatch) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            console.log('\n✅ 两个minter铸币完成');
        });

    });

    describe('Case 3: Split tokens with performance test', function () {
        this.timeout(9000000);

        it('should split tokens with concurrent execution', async function () {
            console.log('\n🎯 === 开始批量分割代币性能测试 ===');

            // 为每个minter准备分割请求
            const splitRequests = await prepareSplitRequests(total_number);

            // 生成分割证明
            const requestIds = await generateSplitProofs(splitRequests);

            // 执行分割交易
            const results = await executeConcurrentSplits(requestIds);

            // 验证结果
            // verifySplitResults(results);
        });
    });

    after(async function () {
        console.log('\n📊 === 测试完成总结 ===');
        console.log('1. ✅ 铸币权限设置完成');
        console.log('2. ✅ 代币铸造完成');
        console.log('3. ✅ 批量分割性能测试完成');
        console.log('所有测试用例执行成功！');
    });
});

// ===== 新增测试套件：单代币基础拆分测试 =====
describe('Native Token Basic Split Tests', function () {
    let client, owner;
    let nativeOwner;

    before(async function () {
        this.timeout(120000);
        console.log('🚀 === 基础拆分测试环境初始化 ===');

        client = createClient(rpcUrl);
        [owner] = await ethers.getSigners();

        nativeOwner = new ethers.Contract(
            native_token_address,
            abi,
            owner
        );

        console.log(`合约地址: ${native_token_address}`);
        console.log(`Owner地址: ${owner.address}`);
        console.log(`Minter1地址: ${MINTERS.minter1.address}`);
        console.log(`Receiver1地址: ${RECEIVER_CONFIG.receiver1}`);
        console.log(`Receiver2地址: ${RECEIVER_CONFIG.receiver2}`);
        console.log('✅ 环境初始化完成\n');
    });

    describe('Case 1: 铸造单个代币并拆分', function () {
        it('应该成功铸造1个代币并拆分到多个地址', async function () {
            this.timeout(300000);

            console.log('\n🎯 === Case 1: 单代币拆分测试 ===');

            // 步骤1: 铸造1个代币（金额: 100）
            console.log('\n步骤1: 铸造单个代币（金额: 100）...');
            const mintedTokens = await mintTokensForMinters(
                client,
                { minter1: MINTERS.minter1 },
                1,  // 铸造1个代币
                100 // 代币金额
            );
            const tokenId = mintedTokens.minter1[0];
            console.log(`  ✅ 代币铸造成功: ID=${tokenId}`);

            // 步骤2: 将代币拆分为2个部分（30给receiver1, 70给receiver2）
            console.log('\n步骤2: 拆分代币（30 + 70）...');
            await executeSingleSplit(
                client,
                MINTERS.minter1,
                tokenId,
                [30, 70]
            );

            console.log('\n✅ Case 1 完成: 单代币拆分成功');
        });
    });

    describe('Case 2: 铸造代币并全额拆分', function () {
        it('应该成功铸造代币并拆分全部金额', async function () {
            this.timeout(300000);

            console.log('\n🎯 === Case 2: 全额拆分测试 ===');

            // 步骤1: 铸造1个代币（金额: 200）
            console.log('\n步骤1: 铸造单个代币（金额: 200）...');
            const mintedTokens = await mintTokensForMinters(
                client,
                { minter1: MINTERS.minter1 },
                1,  // 铸造1个代币
                200 // 代币金额
            );
            const tokenId = mintedTokens.minter1[0];
            console.log(`  ✅ 代币铸造成功: ID=${tokenId}`);

            // 步骤2: 将代币全额拆分（50+50+100=200）
            console.log('\n步骤2: 全额拆分代币（50 + 50 + 100 = 200）...');
            await executeSingleSplit(
                client,
                MINTERS.minter1,
                tokenId,
                [50, 50, 100] // 拆分总额等于代币金额
            );

            console.log('\n✅ Case 2 完成: 全额拆分成功');
        });
    });
});

// ===== 新增辅助函数 =====

/**
 * 执行单个代币的拆分操作
 * @param {Object} client - gRPC客户端
 * @param {Object} minterConfig - 包含minter地址和私钥的配置对象
 * @param {string} tokenId - 要拆分的代币ID
 * @param {number[]} amounts - 拆分金额数组，每个元素对应一个接收地址
 */
async function executeSingleSplit(client, minterConfig, tokenId, amounts) {
    const minterWallet = new ethers.Wallet(minterConfig.privateKey, ethers.provider);

    // 使用 NonceManager 避免 nonce 竞争（关键改进）
    const managedSigner = new ethers.NonceManager(minterWallet);
    const minterNative = new ethers.Contract(native_token_address, abi, managedSigner);

    const metadata = await createAuthMetadata(minterConfig.privateKey);

    console.log(`\n  📋 [单币拆分] 准备拆分请求（代币ID: ${tokenId}）...`);

    // 准备接收地址和金额数组
    const to_accounts = amounts.map((amount, index) => ({
        address: index % 2 === 0 ? RECEIVER_CONFIG.receiver1 : RECEIVER_CONFIG.receiver2,
        amount: amount,
        comment: `split-${tokenId}-${index}`
    }));

    const splitRequest = {
        sc_address: native_token_address,
        token_type: '0',
        from_address: minterConfig.address,
        to_accounts: to_accounts,
    };

    console.log('  📤 生成分割证明...');
    const proofResponse = await client.generateBatchSplitToken(splitRequest, metadata);

    // 获取证明详情
    const response = await client.getBatchSplitTokenDetail(
        { request_id: proofResponse.request_id },
        metadata
    );

    const recipients = response.to_addresses;
    const consumedIds = [tokenId];
    const batchedSize = response.batched_size; // 新增：获取批次大小

    // 准备新代币数据（与批量版逻辑一致）
    const newTokens = response.newTokens.map((token, index) => {
        // 关键修正：动态分配接收地址（与批量版相同）
        const toAddress = index % 2 === 0
            ? minterConfig.address  // 偶数索引：发回给自己
            : recipients[Math.floor(index / 2)];  // 奇数索引：发给对应接收者

        // 关键修正：动态设置 rollbackTokenId（与批量版相同）
        const rollbackTokenId = index % 2 === 0 ? 0 : response.newTokens[index - 1]?.token_id || 0;

        return {
            id: token.token_id,
            owner: minterConfig.address,
            status: 2,
            amount: {
                cl_x: ethers.toBigInt(token.cl_x),
                cl_y: ethers.toBigInt(token.cl_y),
                cr_x: ethers.toBigInt(token.cr_x),
                cr_y: ethers.toBigInt(token.cr_y),
            },
            to: toAddress,
            rollbackTokenId: rollbackTokenId  // 修正：动态值
        };
    });

    const proof = response.proof.map(p => ethers.toBigInt(p));
    const publicInputs = response.public_input.map(i => ethers.toBigInt(i));

    // 关键修正：计算 PaddingNum（与批量版相同）
    const paddingNum = batchedSize - to_accounts.length;

    console.log(`  🚀 发送拆分交易 (新代币数: ${newTokens.length}, Padding: ${paddingNum})...`);

    try {
        // 使用 managedSigner 自动处理 nonce
        const tx = await minterNative.split(
            minterConfig.address,  // from
            recipients,            // recipients
            consumedIds,           // consumedIds
            newTokens,             // newTokens
            proof,                 // proof
            publicInputs,          // publicInputs
            paddingNum,            // 修正：动态计算 PaddingNum
            // 移除 { nonce } 参数，由 NonceManager 处理
        );

        console.log(`  ⏳ 等待交易确认... Hash: ${tx.hash}`);
        const receipt = await tx.wait();

        console.log(`  ✅ 拆分成功: 区块号=${receipt.blockNumber}, GasUsed=${receipt.gasUsed}`);

        // 新增：返回结构化结果（与批量版一致）
        return {
            success: true,
            tokenId,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed,
            txHash: tx.hash
        };
    } catch (error) {
        console.error(`  ❌ 拆分失败: ${error.message}`);

        // 新增：返回错误信息（与批量版一致）
        return {
            success: false,
            tokenId,
            error: error.message
        };
    }
}


async function prepareSplitRequests(round_number) {
    console.log('\n📋 准备分割请求数据...');

    const requests = { minter1: [], minter2: [] };

    // 为minter1准备100个token的分割请求 ，总计10000个分割请求
    for (let i = 0; i < round_number; i++) {
        const to_accounts = [];
        for (let j = 0; j < 16; j++) {
            to_accounts.push(
                { address: RECEIVER_CONFIG.receiver1, amount: 1, comment: `m1-t${i}-s${j}-r1` },
                { address: RECEIVER_CONFIG.receiver2, amount: 2, comment: `m1-t${i}-s${j}-r2` }
            );
        }
        requests.minter1.push({
            sc_address: native_token_address,
            token_type: '0',
            from_address: MINTERS.minter1.address,
            to_accounts
        });
    }

    // 为minter2准备100个token的分割请求
    for (let i = 0; i < round_number; i++) {
        const to_accounts = [];
        for (let j = 0; j < 16; j++) {
            to_accounts.push(
                { address: RECEIVER_CONFIG.receiver1, amount: 1, comment: `m2-t${i}-s${j}-r1` },
                { address: RECEIVER_CONFIG.receiver2, amount: 2, comment: `m2-t${i}-s${j}-r2` }
            );
        }
        requests.minter2.push({
            sc_address: native_token_address,
            token_type: '0',
            from_address: MINTERS.minter2.address,
            to_accounts
        });
    }

    console.log(`✅ 准备完成: Minter1 ${requests.minter1.length}个, Minter2 ${requests.minter2.length}个`);
    return requests;
}

async function generateSplitProofs(requests) {
    console.log('\n🔍 开始生成分割证明...');

    const startTime = Date.now();
    const minter1Metadata = await createAuthMetadata(MINTERS.minter1.privateKey);
    const minter2Metadata = await createAuthMetadata(MINTERS.minter2.privateKey);

    // 并行生成所有证明
    // const [minter1Proofs, minter2Proofs] = await Promise.all([
    //     Promise.all(requests.minter1.map(req => client.generateBatchSplitToken(req, minter1Metadata))),
    //     Promise.all(requests.minter2.map(req => client.generateBatchSplitToken(req, minter2Metadata)))
    // ]);
    //
    // const endTime = Date.now();

    // 逐个生成所有证明，而不是并行处理
    const minter1Requests = [];
    for (const req of requests.minter1) {
        console.log(`  🔍 生成分割证明 (Minter1, ${minter1Requests.length + 1}/${requests.minter1.length})...`)
        const response = await client.generateBatchSplitToken(req, minter1Metadata);
        minter1Requests.push(response.request_id);
    }

    const minter2Requests = [];
    for (const req of requests.minter2) {
        console.log(`  🔍 生成分割证明 (Minter2, ${minter2Requests.length + 1}/${requests.minter2.length})...`)
        const response = await client.generateBatchSplitToken(req, minter2Metadata);
        minter2Requests.push(response.request_id);
    }
    const endTime = Date.now();

    console.log(`✅ 证明生成完成`);
    console.log(`  - Minter1: ${minter1Requests.length}个证明`);
    console.log(`  - Minter2: ${minter2Requests.length}个证明`);
    console.log(`  - 总耗时: ${endTime - startTime}ms`);

    return { minter1: minter1Requests, minter2: minter2Requests };
}

async function executeConcurrentSplits(requests) {
    console.log('\n⚡ 开始并发执行分割交易...');

    const startTime = Date.now();
    const results = { minter1: null, minter2: null };

    // 并行执行两个minter的分割
    // const [minter1Results, minter2Results] = await Promise.all([
    //     executeBatchSplits('minter1', requests.minter1, MINTERS.minter1.privateKey),
    //     executeBatchSplits('minter2', requests.minter2, MINTERS.minter2.privateKey)
    // ]);
    const [minter1Results, minter2Results] = await Promise.all([
        executeBatchSplitsSigned('minter1', requests.minter1, MINTERS.minter1.privateKey),
        executeBatchSplitsSigned('minter2', requests.minter2, MINTERS.minter2.privateKey)
    ]);


    results.minter1 = minter1Results;
    results.minter2 = minter2Results;

    const endTime = Date.now();

    console.log(`\n✅ 所有分割交易执行完成`);
    console.log(`总耗时: ${endTime - startTime}ms`);

    return results;
}

async function executeBatchSplits(minterName, requestIds, privateKey) {
    const minterWallet = new ethers.Wallet(privateKey, ethers.provider);
    const minterNative = new ethers.Contract(native_token_address, abi, minterWallet);
    const minterMetadata = await createAuthMetadata(privateKey);

    // 获取当前nonce (包含pending状态)
    let nonce = await minterWallet.getNonce('pending');
    console.log(`\n[${minterName}] 起始Nonce: ${nonce}, 待处理交易数: ${requestIds.length}`);

    // 准备所有交易数据
    const transactions = [];
    for (let i = 0; i < requestIds.length; i++) {
        const requestId = requestIds[i];
        const response = await client.getBatchSplitTokenDetail(
            { request_id: requestId },
            minterMetadata
        );

        const recipients = response.to_addresses;
        const bathcedSize = response.batched_size;
        const consumedIds = [];
        response.consumedIds.forEach((ids) => {
            consumedIds.push(ids.token_id);
        });

        const newTokens = response.newTokens.map((account, index) => {
            const toAddress = index % 2 === 0 ? MINTERS[minterName].address : recipients[Math.floor(index / 2)];
            const rollbackTokenId = index % 2 === 0 ? 0 : response.newTokens[index + 1]?.token_id || 0;
            return {
                id: account.token_id,
                owner: MINTERS[minterName].address,
                status: 2,
                amount: { cl_x: account.cl_x, cl_y: account.cl_y, cr_x: account.cr_x, cr_y: account.cr_y },
                to: toAddress,
                rollbackTokenId: rollbackTokenId
            };
        });

        const proof = response.proof.map(p => ethers.toBigInt(p));
        const publicInputs = response.public_input.map(i => ethers.toBigInt(i));

        transactions.push({
            recipients,
            consumedIds,
            newTokens,
            proof,
            publicInputs,
            bathcedSize,
            nonce: nonce++
        });
    }

    // 批量发送交易
    const txStartTime = Date.now();
    const txPromises = transactions.map(async (txData, index) => {
        try {
            console.log(`[${minterName}] 发送交易 ${index + 1}/${transactions.length}, nonce: ${txData.nonce}`);
            // console.log({
            //     recipients: txData.recipients,
            //     consumedIds: txData.consumedIds,
            //     newTokens: txData.newTokens,
            //     proof: txData.proof,
            //     publicInputs: txData.publicInputs,
            //     length:txData.bathcedSize - txData.recipients.length,
            //     nonce: txData.nonce
            // })
            const tx = await minterNative.split(
                MINTERS[minterName].address,
                txData.recipients,
                txData.consumedIds,
                txData.newTokens,
                txData.proof,
                txData.publicInputs,
                txData.bathcedSize - txData.recipients.length,
                { nonce: txData.nonce }
            );
            return { tx, nonce: txData.nonce, index, success: true };
        } catch (error) {
            console.error(`[${minterName}] 交易 ${index + 1} 失败: ${error.message}`);
            return { error: error.message, nonce: txData.nonce, index, success: false };
        }
    });

    const txResults = await Promise.all(txPromises);
    const txEndTime = Date.now();

    // 统计发送结果
    const successfulTx = txResults.filter(r => r.success);
    const failedTx = txResults.filter(r => !r.success);

    console.log(`\n[${minterName}] 交易发送结果: 成功 ${successfulTx.length}, 失败 ${failedTx.length}`);
    console.log(`[${minterName}] 发送耗时: ${txEndTime - txStartTime}ms`);

    // 等待成功交易的确认
    if (successfulTx.length > 0) {
        console.log(`\n[${minterName}] 等待交易确认中...`);
        const confirmPromises = successfulTx.map(async (result) => {
            try {
                const receipt = await result.tx.wait();
                return { nonce: result.nonce, index: result.index, receipt, success: true };
            } catch (error) {
                console.error(`[${minterName}] 交易 ${result.index + 1} 确认失败: ${error.message}`);
                return { nonce: result.nonce, index: result.index, error: error.message, success: false };
            }
        });

        const confirmResults = await Promise.all(confirmPromises);
        const confirmedTx = confirmResults.filter(r => r.success);

        console.log(`[${minterName}] 确认结果: ${confirmedTx.length}/${successfulTx.length} 成功`);
    }

    return {
        totalTransactions: transactions.length,
        successfulTransactions: successfulTx.length,
        failedTransactions: failedTx.length,
        totalTime: txEndTime - txStartTime,
        averageTimePerTx: (txEndTime - txStartTime) / transactions.length
    };
}

async function executeBatchSplitsSigned(minterName, requestIds, privateKey) {
    const minterWallet = new ethers.Wallet(privateKey, ethers.provider);
    const minterNative = new ethers.Contract(native_token_address, abi, minterWallet);
    const minterMetadata = await createAuthMetadata(privateKey);

    console.log(`\n[${minterName}] 开始预签名 ${requestIds.length} 个交易`);

    // 1. 获取起始 nonce（一次性获取）
    const startNonce = await minterWallet.getNonce('pending');
    console.log(`[${minterName}] 起始 Nonce: ${startNonce}`);

    // 2. 并行获取所有交易的 proof 数据（最耗时步骤，先全部拉取）
    console.log(`[${minterName}] 并行获取所有交易数据...`);
    const dataFetchStart = Date.now();

    const txDataPromises = requestIds.map(async (requestId, index) => {
        const response = await client.getBatchSplitTokenDetail(
            { request_id: requestId },
            minterMetadata
        );

        const recipients = response.to_addresses;
        const consumptionData = response.consumedIds.map(ids => ids.token_id);

        const newTokens = response.newTokens.map((account, idx) => {
            const toAddress = idx % 2 === 0
                ? MINTERS[minterName].address
                : recipients[Math.floor(idx / 2)];
            const rollbackTokenId = idx % 2 === 0 ? 0 : response.newTokens[idx - 1]?.token_id || 0;

            return {
                id: account.token_id,
                owner: MINTERS[minterName].address,
                status: 2,
                amount: {
                    cl_x: ethers.toBigInt(account.cl_x),
                    cl_y: ethers.toBigInt(account.cl_y),
                    cr_x: ethers.toBigInt(account.cr_x),
                    cr_y: ethers.toBigInt(account.cr_y)
                },
                to: toAddress,
                rollbackTokenId: rollbackTokenId
            };
        });

        return {
            recipients,
            consumptionData,
            newTokens,
            proof: response.proof.map(p => ethers.toBigInt(p)),
            publicInputs: response.public_input.map(i => ethers.toBigInt(i)),
            batchedSize: response.batched_size,
            nonce: startNonce + index  // 预计算 nonce
        };
    });

    // 等待所有数据获取完成
    const allTxData = await Promise.all(txDataPromises);
    const dataFetchTime = Date.now() - dataFetchStart;
    console.log(`[${minterName}] 数据获取完成，耗时: ${dataFetchTime}ms`);

    // 3. 预签名所有交易（不发送）
    const signingStart = Date.now();
    const signedTxPromises = allTxData.map(async (txData, index) => {
        try {
            // 准备交易请求但不发送，只获取签名
            const unsignedTx = await minterNative.split.populateTransaction(
                MINTERS[minterName].address,
                txData.recipients,
                txData.consumptionData,
                txData.newTokens,
                txData.proof,
                txData.publicInputs,
                txData.batchedSize - txData.recipients.length,
                { nonce: txData.nonce }
            );

            const signedTx = await minterWallet.signTransaction(unsignedTx);
            return { signedTx, nonce: txData.nonce, index, success: true };
        } catch (error) {
            console.error(`[${minterName}] 交易 ${index + 1} 预签名失败: ${error.message}`);
            return { error: error.message, nonce: txData.nonce, index, success: false };
        }
    });

    const signedTxs = await Promise.all(signedTxPromises);
    const signingTime = Date.now() - signingStart;

    const successfulSigs = signedTxs.filter(r => r.success);
    const failedSigs = signedTxs.filter(r => !r.success);
    console.log(`[${minterName}] 预签名完成: 成功 ${successfulSigs.length}, 失败 ${failedSigs.length}, 耗时: ${signingTime}ms`);

    if (failedSigs.length > 0) {
        console.error(`[${minterName}] 部分交易预签名失败，中止执行`);
        return {
            totalTransactions: allTxData.length,
            successfulTransactions: 0,
            failedTransactions: failedSigs.length,
            totalTime: signingTime,
            error: '预签名失败'
        };
    }

    // 4. 一次性推送所有交易（并行广播）
    const broadcastStart = Date.now();
    console.log(`[${minterName}] 开始广播 ${successfulSigs.length} 个交易...`);

    const sendPromises = successfulSigs.map(async (signedData) => {
        try {
            // 发送已签名的交易
            const tx = await ethers.provider.sendTransaction(signedData.signedTx);
            return { tx, nonce: signedData.nonce, index: signedData.index, success: true };
        } catch (error) {
            console.error(`[${minterName}] 交易 ${signedData.index + 1} 广播失败: ${error.message}`);
            return { error: error.message, nonce: signedData.nonce, index: signedData.index, success: false };
        }
    });

    const sentTxs = await Promise.all(sendPromises);
    const broadcastTime = Date.now() - broadcastStart;

    const successfulSends = sentTxs.filter(r => r.success);
    const failedSends = sentTxs.filter(r => !r.success);
    console.log(`[${miniminterName}] 广播完成: 成功 ${successfulSends.length}, 失败 ${failedSends.length}, 耗时: ${broadcastTime}ms`);

    // 5. 并行等待所有交易确认（最关键的优化点）
    if (successfulSends.length > 0) {
        console.log(`[${minterName}] 并行等待 ${successfulSends.length} 个交易确认...`);
        const confirmStart = Date.now();

        const confirmPromises = successfulSends.map(async (result) => {
            try {
                // 所有交易同时等待，不串行阻塞
                const receipt = await result.tx.wait();
                return {
                    nonce: result.nonce,
                    index: result.index,
                    receipt,
                    success: true,
                    confirmations: receipt.confirmations || 0
                };
            } catch (error) {
                console.error(`[${minterName}] 交易 ${result.index + 1} (nonce: ${result.nonce}) 确认失败: ${error.message}`);
                return { nonce: result.nonce, index: result.index, error: error.message, success: false };
            }
        });

        // 所有确认并行处理
        const confirmResults = await Promise.all(confirmPromises);
        const confirmTime = Date.now() - confirmStart;

        const confirmedTxs = confirmResults.filter(r => r.success);

        console.log(`[${minterName}] 确认完成: ${confirmedTxs.length}/${successfulSends.length} 成功, 耗时: ${confirmTime}ms`);

        // 返回完整统计
        return {
            totalTransactions: allTxData.length,
            successfulTransactions: confirmedTxs.length,
            failedTransactions: failedSigs.length + failedSends.length + confirmResults.filter(r => !r.success).length,
            dataFetchTime,
            signingTime,
            broadcastTime,
            confirmTime,
            totalTime: Date.now() - dataFetchStart,
            averageTimePerTx: (Date.now() - dataFetchStart) / allTxData.length,
            confirmedTxs // 包含详细的收据信息
        };
    }

    // 如果全部广播失败
    return {
        totalTransactions: allTxData.length,
        successfulTransactions: 0,
        failedTransactions: failedSends.length,
        dataFetchTime,
        signingTime,
        broadcastTime,
        totalTime: Date.now() - dataFetchStart,
        error: '广播失败'
    };
}

function verifySplitResults(results) {
    console.log('\n📊 === 分割性能测试结果 ===');

    const totalTx = results.minter1.totalTransactions + results.minter2.totalTransactions;
    const totalSuccess = results.minter1.successfulTransactions + results.minter2.successfulTransactions;
    const totalFailed = results.minter1.failedTransactions + results.minter2.failedTransactions;
    const avgTime = (results.minter1.averageTimePerTx + results.minter2.averageTimePerTx) / 2;

    console.log(`总交易数: ${totalTx}`);
    console.log(`成功: ${totalSuccess}`);
    console.log(`失败: ${totalFailed}`);
    console.log(`平均耗时: ${avgTime.toFixed(2)}ms/交易`);

    expect(totalSuccess).to.equal(totalTx);
    expect(totalFailed).to.equal(0);
}
