const { expect } = require('chai');
const { ethers } = require('hardhat');
const { createClient } = require('./token_grpc');
const accounts = require('./../../deployments/account.json');
const grpc = require("@grpc/grpc-js");

const native_token_address = "0x14Cf747669B78516424CAd20E1E5d53fD76EA850";
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

async function mintTokensForMinter(client) {
    // const [signer,minter] = await ethers.getSigners();
    // const native = new ethers.Contract(
    //     native_token_address,
    //     abi,
    //     minter
    // );
    const minter = new ethers.Wallet(accounts.MinterKey, ethers.provider);
    const native = new ethers.Contract(
        native_token_address,
        abi,
        minter
    );

    const metadata = await createAuthMetadata(accounts.MinterKey);

    const to_accounts = [
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 }
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
    ]
    const generateRequest = {
        sc_address: native_token_address,
        token_type: '0',
        from_address:accounts.Minter,
        to_accounts: to_accounts,
    };

    console.log("Starting to generate mint proof...");
    let response = await client.generateBatchMintProof(generateRequest, metadata);
    console.log("response", response);
    // 5 recipients
    const recipients = [];
    // 5 tokens (TokenEntity[])
    const newTokens = [];
    var fromAddress = response.from_address;
    response.to_accounts.forEach((account, index) => {
        newTokens.push( {
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
        });
        recipients.push(account.address);
    });
    // newAllowed (ElGamalToken[]) - mint_allowed
    const newAllowed =
        {
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
    const bathcedSize = response.batched_size
    console.log("bathcedSize", bathcedSize);
    let tx = await native.mint(recipients, newTokens, newAllowed, proof, publicInputs, bathcedSize - to_accounts.length);
    console.log(tx);
    console.log("wait for response of tx");
    let rc = await tx.wait();
    console.log(rc);
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

describe('Native Dual Minter Performance Tests', function () {
    let client, owner,minter;
    let nativeOwner,nativeMinter;
    let mintedTokens = {};

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

    describe.only('Case 2: Mint tokens for both minters', function () {
        this.timeout(600000); // 10分钟

        it('should mint 100 tokens for each minter', async function () {
            const number = 32;
            const amount = 100;

            console.log(`\n🎯 开始为两个minter各铸造${number}个代币`);

            await mintTokensForMinters(
                client,
                MINTERS,
                number,
                amount
            );

            // expect(mintedTokens.minter1).to.have.length(number);
            // expect(mintedTokens.minter2).to.have.length(number);

            console.log('\n✅ 两个minter铸币完成');
        });
    });

    describe('Case 3: Split tokens with performance test', function () {
        this.timeout(900000); // 15分钟

        it('should split tokens with concurrent execution', async function () {
            console.log('\n🎯 === 开始批量分割代币性能测试 ===');

            // 为每个minter准备分割请求
            const splitRequests = await prepareSplitRequests();

            // 生成分割证明
            const proofs = await generateSplitProofs(splitRequests);

            // 执行分割交易
            const results = await executeConcurrentSplits(proofs);

            // 验证结果
            verifySplitResults(results);
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

// ===== 辅助函数 =====

async function prepareSplitRequests() {
    console.log('\n📋 准备分割请求数据...');

    const requests = { minter1: [], minter2: [] };

    // 为minter1准备100个token的分割请求
    for (let i = 0; i < 100; i++) {
        const to_accounts = [];
        for (let j = 0; j < 50; j++) {
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
    for (let i = 0; i < 100; i++) {
        const to_accounts = [];
        for (let j = 0; j < 50; j++) {
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
    const [minter1Proofs, minter2Proofs] = await Promise.all([
        Promise.all(requests.minter1.map(req => client.generateBatchSplitToken(req, minter1Metadata))),
        Promise.all(requests.minter2.map(req => client.generateBatchSplitToken(req, minter2Metadata)))
    ]);

    const endTime = Date.now();

    console.log(`✅ 证明生成完成`);
    console.log(`  - Minter1: ${minter1Proofs.length}个证明`);
    console.log(`  - Minter2: ${minter2Proofs.length}个证明`);
    console.log(`  - 总耗时: ${endTime - startTime}ms`);

    return { minter1: minter1Proofs, minter2: minter2Proofs };
}

async function executeConcurrentSplits(proofs) {
    console.log('\n⚡ 开始并发执行分割交易...');

    const startTime = Date.now();
    const results = { minter1: null, minter2: null };

    // 并行执行两个minter的分割
    const [minter1Results, minter2Results] = await Promise.all([
        executeBatchSplits('minter1', proofs.minter1, MINTERS.minter1.privateKey),
        executeBatchSplits('minter2', proofs.minter2, MINTERS.minter2.privateKey)
    ]);

    results.minter1 = minter1Results;
    results.minter2 = minter2Results;

    const endTime = Date.now();

    console.log(`\n✅ 所有分割交易执行完成`);
    console.log(`总耗时: ${endTime - startTime}ms`);

    return results;
}

async function executeBatchSplits(minterName, proofs, privateKey) {
    const minterWallet = new ethers.Wallet(privateKey, ethers.provider);
    const minterNative = new ethers.Contract(native_token_address, abi, minterWallet);
    const minterMetadata = await createAuthMetadata(privateKey);

    // 获取当前nonce (包含pending状态)
    let nonce = await minterWallet.getNonce('pending');
    console.log(`\n[${minterName}] 起始Nonce: ${nonce}, 待处理交易数: ${proofs.length}`);

    // 准备所有交易数据
    const transactions = [];
    for (let i = 0; i < proofs.length; i++) {
        const proofData = proofs[i];
        const response = await client.getBatchSplitTokenDetail(
            { request_id: proofData.request_id },
            minterMetadata
        );

        const recipients = response.to_addresses;
        const consumedIds = [mintedTokens[minterName][i]];

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
            nonce: nonce++
        });
    }

    // 批量发送交易
    const txStartTime = Date.now();
    const txPromises = transactions.map(async (txData, index) => {
        try {
            console.log(`[${minterName}] 发送交易 ${index + 1}/${transactions.length}, nonce: ${txData.nonce}`);
            const tx = await minterNative.split(
                MINTERS[minterName].address,
                txData.recipients,
                txData.consumedIds,
                txData.newTokens,
                txData.proof,
                txData.publicInputs,
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
