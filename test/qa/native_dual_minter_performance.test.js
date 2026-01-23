const { expect } = require('chai');
const { ethers } = require('hardhat');
const { createClient } = require('./token_grpc');
const accounts = require('./../../deployments/account.json');
const grpc = require("@grpc/grpc-js");

const native_token_address = "0x4dA51d6A39687ffCf9f5fc163C102aE8b23a123d";
const rpcUrl = "dev2-node3-rpc.hamsa-ucl.com:50051";
const client = createClient(rpcUrl);
const RPC = 'http://dev2-ucl-l2.hamsa-ucl.com:8545';

// Fixed two minter addresses and private keys
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

// Fixed two receiver addresses
const RECEIVER_CONFIG = {
    receiver1: "0x4312488937D47A007De24d48aB82940C809EEb2b",
    receiver2: "0x57829d5E80730D06B1364A2b05342F44bFB70E8f"
};

const abi = "[{\"inputs\":[{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"tokenId\",\"type\":\"uint256\"}],\"name\":\"getToken\",\"outputs\":[{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address[]\",\"name\":\"recipients\",\"type\":\"address[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity[]\",\"name\":\"tokens\",\"type\":\"tuple[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"value\",\"type\":\"tuple\"}],\"internalType\":\"struct TokenModel.ElGamalToken\",\"name\":\"newAllowed\",\"type\":\"tuple\"},{\"internalType\":\"uint256[8]\",\"name\":\"proof\",\"type\":\"uint256[8]\"},{\"internalType\":\"uint256[]\",\"name\":\"publicInputs\",\"type\":\"uint256[]\"},{\"internalType\":\"uint256\",\"name\":\"PaddingNum\",\"type\":\"uint256\"}],\"name\":\"mint\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"minter\",\"type\":\"address\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"value\",\"type\":\"tuple\"}],\"internalType\":\"struct TokenModel.ElGamalToken\",\"name\":\"allowed\",\"type\":\"tuple\"}],\"name\":\"setMintAllowed\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"from\",\"type\":\"address\"},{\"internalType\":\"address[]\",\"name\":\"recipients\",\"type\":\"address[]\"},{\"internalType\":\"uint256[]\",\"name\":\"consumedIds\",\"type\":\"uint256[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity[]\",\"name\":\"newTokens\",\"type\":\"tuple[]\"},{\"internalType\":\"uint256[8]\",\"name\":\"proof\",\"type\":\"uint256[8]\"},{\"internalType\":\"uint256[]\",\"name\":\"publicInputs\",\"type\":\"uint256[]\"},{\"internalType\":\"uint256\",\"name\":\"PaddingNum\",\"type\":\"uint256\"}],\"name\":\"split\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"tokenId\",\"type\":\"uint256\"},{\"internalType\":\"string\",\"name\":\"memo\",\"type\":\"string\"}],\"name\":\"transfer\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"tokenId\",\"type\":\"uint256\"}],\"name\":\"burn\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]"


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
    const ownerMetadata = await createAuthMetadata(accounts.OwnerKey);

    for (const [minterName, minterConfig] of Object.entries(minters)) {
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
    }
}


async function mintTokensForMinters(client, minters, number, amount) {
    const mintedTokens = {};

    // Iterate through all minter configurations
    for (const [minterName, minterConfig] of Object.entries(minters)) {
        const minterWallet = new ethers.Wallet(minterConfig.privateKey, ethers.provider);
        const minterMetadata = await createAuthMetadata(minterConfig.privateKey);

        // Dynamically create to_accounts array
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

        let response;
        try {
            response = await client.generateBatchMintProof(generateRequest, minterMetadata);
        } catch (error) {
            console.error(`[${minterName}] Proof generation failed: ${error.message}`);
            throw error;
        }

        // Process response data
        const recipients = response.to_accounts.map(account => account.address);
        const bathcedSize = response.batched_size
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

        console.log(`\n[${minterName}] ===== Preparing to execute mint transaction =====`);
        console.log(`[${minterName}] Recipients count: ${recipients.length}`);
        console.log(`[${minterName}] NewTokens count: ${newTokens.length}`);
        console.log(`[${minterName}] First Token ID: ${newTokens[0]?.id}`);
        console.log(`[${minterName}] MintAllowed ID: ${newAllowed.id}`);

        // Prepare contract instance
        const native = new ethers.Contract(native_token_address, abi, minterWallet);

        try {
            const tx = await native.mint(recipients, newTokens, newAllowed, proof, publicInputs, bathcedSize - to_accounts.length);
            const receipt = await tx.wait();

            // Save token IDs
            mintedTokens[minterName] = newTokens.map(token => token.id);

        } catch (error) {
            console.error(`[${minterName}] Mint transaction failed: ${error.message}`);
            throw error;
        }
    }

    return mintedTokens;
}
async function mintTokensForMintersWithAmountList(client, minters, number, amountList) {
    const mintedTokens = {};

    // Validate that amountList is an array and not empty
    if (!Array.isArray(amountList) || amountList.length === 0) {
        throw new Error("amountList must be a non-empty array");
    }

    // Iterate through all minter configurations
    for (const [minterName, minterConfig] of Object.entries(minters)) {
        const minterWallet = new ethers.Wallet(minterConfig.privateKey, ethers.provider);
        const minterMetadata = await createAuthMetadata(minterConfig.privateKey);

        // Dynamically create to_accounts array, randomly selecting values from amountList
        const to_accounts = Array(number).fill().map(() => ({
            address: minterConfig.address,
            amount: amountList[Math.floor(Math.random() * amountList.length)]
        }));

        const generateRequest = {
            sc_address: native_token_address,
            token_type: '0',
            from_address: minterConfig.address,
            to_accounts: to_accounts,
        };

        let response;
        try {
            response = await client.generateBatchMintProof(generateRequest, minterMetadata);
        } catch (error) {
            console.error(`[${minterName}] Proof generation failed: ${error.message}`);
            throw error;
        }

        // Process response data
        const recipients = response.to_accounts.map(account => account.address);
        const bathcedSize = response.batched_size;

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

        // Prepare contract instance
        const native = new ethers.Contract(native_token_address, abi, minterWallet);

        try {
            const tx = await native.mint(recipients, newTokens, newAllowed, proof, publicInputs, bathcedSize - to_accounts.length);
            const receipt = await tx.wait();

            // Save token IDs
            mintedTokens[minterName] = newTokens.map(token => token.id);

        } catch (error) {
            console.error(`[${minterName}] Mint transaction failed: ${error.message}`);
            throw error;
        }
    }

    return mintedTokens;
}


// Timeout helper function
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

describe('Native Dual Minter Split Performance Tests', function () {
    let client, owner, minter;
    let nativeOwner, nativeMinter;
    let mintedTokens = {};
    const total_number = 128
    const amount = 1000
    let minter1List, minter2List

    before(async function () {
        this.timeout(300000);

        client = createClient(rpcUrl);
        [owner, minter] = await ethers.getSigners();

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
        this.timeout(6000000); // 10 minutes

        it(`should mint ${total_number} tokens for each minter`, async function () {
            const batchSize = 128;

            for (let i = 0; i < total_number; i += batchSize) {
                const currentBatchSize = Math.min(batchSize, total_number - i);
                const isLastBatch = i + batchSize >= total_number;

                await mintTokensForMinters(
                    client,
                    MINTERS,
                    currentBatchSize,
                    amount
                );

                if (!isLastBatch) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        });

    });

    describe('Case 3: Split tokens with performance test', function () {
        this.timeout(9000000);

        it('should split tokens with concurrent execution', async function () {
            const splitRequests = await prepareSplitRequests(total_number, 'transfer');
            const requestIds = await generateSplitProofs(splitRequests);
            const results = await executeBatchedConcurrentSplits(requestIds);

            minter1List = await extractRecipientTokenIds('minter1', requestIds.minter1, MINTERS.minter1.privateKey)
            minter2List = await extractRecipientTokenIds('minter2', requestIds.minter2, MINTERS.minter2.privateKey)
            await sleep(60000)
            console.log('minter1List length', minter1List.length)
            console.log('minter2List length', minter2List.length)
        });
    });

    after(async function () {
        // Test completed
        console.log('Test completed.');
    });
});

// 新的测试用例：将split后的token id保存到json文件，然后读取执行transfer
describe.only('Native Dual Minter Split & Transfer with JSON Storage', function () {
    let client, owner, minter;
    let nativeOwner, nativeMinter;
    let mintedTokens = {};
    const total_number = 64; // 测试用的token数量
    const amount = 1000;
    const jsonFilePath = './split_tokens.json';
    
    // 引入fs模块用于文件操作
    const fs = require('fs');

    before(async function () {
        this.timeout(300000);

        client = createClient(rpcUrl);
        [owner, minter] = await ethers.getSigners();

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

    describe('Step 1: Split tokens and save to JSON file', function () {
        this.timeout(9000000);

        it('should split tokens and save recipient token ids to JSON file', async function () {
            // 1. 执行mint操作
            console.log('=== Step 1: Minting tokens ===');
            const batchSize = 128;

            for (let i = 0; i < total_number; i += batchSize) {
                const currentBatchSize = Math.min(batchSize, total_number - i);
                const isLastBatch = i + batchSize >= total_number;

                await mintTokensForMinters(
                    client,
                    MINTERS,
                    currentBatchSize,
                    amount
                );

                if (!isLastBatch) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
            
            // 2. 准备split请求
            console.log('=== Step 2: Preparing split requests ===');
            const splitRequests = await prepareSplitRequests(total_number, 'transfer');
            
            // 3. 生成split proof
            console.log('=== Step 3: Generating split proofs ===');
            const requestIds = await generateSplitProofs(splitRequests);
            
            // 4. 执行split操作
            console.log('=== Step 4: Executing split operations ===');
            const results = await executeBatchedConcurrentSplits(requestIds);
            
            // 5. 提取接收者token id
            console.log('=== Step 5: Extracting recipient token ids ===');
            const minter1List = await extractRecipientTokenIds('minter1', requestIds.minter1, MINTERS.minter1.privateKey);
            const minter2List = await extractRecipientTokenIds('minter2', requestIds.minter2, MINTERS.minter2.privateKey);
            
            console.log(`Extracted ${minter1List.length} token ids for minter1`);
            console.log(`Extracted ${minter2List.length} token ids for minter2`);
            
            // 6. 保存到JSON文件
            console.log('=== Step 6: Saving token ids to JSON file ===');
            const tokenData = {
                timestamp: new Date().toISOString(),
                minter1: minter1List,
                minter2: minter2List,
                totalTokens: minter1List.length + minter2List.length
            };
            
            fs.writeFileSync(jsonFilePath, JSON.stringify(tokenData, null, 2));
            console.log(`✅ Token ids saved to ${jsonFilePath}`);
            
            // 等待一段时间确保split操作完成
            await sleep(30000);
        });
    });

    // 添加getTokenById方法
    async function getTokenById(minterWallet, tokenIdList, native_token_address, abi){
        // 使用传入的minterWallet作为signer
        const native = new ethers.Contract(
            native_token_address,
            abi,
            minterWallet
        );
        console.log("signerAddress", minterWallet.address);

        const results = {
            success: [],
            failed: []
        };

        console.log(`开始处理 ${tokenIdList.length} 个 tokenId...`);

        // 使用 for...of 循环代替 forEach，以便更好地控制异步操作和错误处理
        for (let i = 0; i < tokenIdList.length; i++) {
            const tokenId = tokenIdList[i];
            try {
                let response = await native.getToken(minterWallet.address, tokenId);
                console.log(`token ${tokenId} 查询成功，response: ${response.id}`);
                results.success.push({ tokenId, response: response.id });
            } catch (error) {
                console.error(`token ${tokenId} 查询失败，错误: ${error.message}`);
                results.failed.push({ tokenId, error: error.message });
            }

            // 显示进度
            const progress = Math.round(((i + 1) / tokenIdList.length) * 100);
            const progressBar = '█'.repeat(Math.floor(progress / 2)) + '░'.repeat(50 - Math.floor(progress / 2));
            console.log(`\r进度: [${progressBar}] ${i + 1}/${tokenIdList.length} (${progress}%)`);
        }

        // 输出汇总结果
        console.log(`\n=== 查询结果汇总 ===`);
        console.log(`总查询数: ${tokenIdList.length}`);
        console.log(`成功数: ${results.success.length}`);
        console.log(`失败数: ${results.failed.length}`);

        if (results.failed.length > 0) {
            console.log(`\n失败的 tokenId 列表:`);
            results.failed.forEach(item => {
                console.log(`- ${item.tokenId}: ${item.error}`);
            });
        }

        return results;
    }

    describe('Step2: Read from JSON file to verify token ids',function(){
        this.timeout(6000000);
        it('Read from JSON file to verify token ids',async function(){
            // 1. 从JSON文件读取token id
            console.log('=== Step 1: Reading token ids from JSON file ===');
            if (!fs.existsSync(jsonFilePath)) {
                throw new Error(`JSON file ${jsonFilePath} not found. Please run Step 1 first.`);
            }
            
            const tokenData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
            const minter1List = tokenData.minter1;
            const minter2List = tokenData.minter2;
            
            console.log(`Read ${minter1List.length} token ids for minter1 from JSON`);
            console.log(`Read ${minter2List.length} token ids for minter2 from JSON`);
            
            // 2. 创建minter钱包实例
            const provider = new ethers.JsonRpcProvider(RPC);
            const minter1Wallet = new ethers.Wallet(MINTERS.minter1.privateKey, provider);
            const minter2Wallet = new ethers.Wallet(MINTERS.minter2.privateKey, provider);
            
            // 3. 检查token是否可以查询到
            console.log('=== Step 2: Verifying token query availability ===');
            
            // 检查minter1的token
            console.log('\n--- Checking tokens for minter1 ---');
            const minter1Results = await getTokenById(minter1Wallet, minter1List, native_token_address, abi);
            
            // 检查minter2的token
            console.log('\n--- Checking tokens for minter2 ---');
            const minter2Results = await getTokenById(minter2Wallet, minter2List, native_token_address, abi);
            
            // 汇总所有结果
            const totalResults = {
                totalTokens: minter1List.length + minter2List.length,
                totalSuccess: minter1Results.success.length + minter2Results.success.length,
                totalFailed: minter1Results.failed.length + minter2Results.failed.length
            };
            
            console.log(`\n=== 总查询结果汇总 ===`);
            console.log(`总查询数: ${totalResults.totalTokens}`);
            console.log(`总成功数: ${totalResults.totalSuccess}`);
            console.log(`总失败数: ${totalResults.totalFailed}`);
            
            // 验证至少有一个token查询成功
            expect(totalResults.totalSuccess).to.be.greaterThan(0, '至少应有一个token查询成功');
            
            console.log('✅ All token queries completed successfully');
        })
    })

    describe('Step 3: Read from JSON file and execute transfers', function () {
        this.timeout(6000000);
        
        it('should read token ids from JSON file and execute transfers', async function () {
            // 1. 从JSON文件读取token id
            console.log('=== Step 1: Reading token ids from JSON file ===');
            if (!fs.existsSync(jsonFilePath)) {
                throw new Error(`JSON file ${jsonFilePath} not found. Please run Step 1 first.`);
            }
            
            const tokenData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
            const minter1List = tokenData.minter1;
            const minter2List = tokenData.minter2;
            
            console.log(`Read ${minter1List.length} token ids for minter1 from JSON`);
            console.log(`Read ${minter2List.length} token ids for minter2 from JSON`);
            
            // 2. 执行transfer操作
            console.log('=== Step 2: Executing transfers ===');
            await executeBatchTransfersSigned(minter1List, minter2List);
            
            console.log('✅ All transfers completed successfully');
        });
    });

    after(async function () {
        // 可以选择在这里删除JSON文件
        // fs.unlinkSync(jsonFilePath);
        console.log('Test completed.');
    });
});
describe('Native Dual Minter Transfer Performance Tests', function () {
    let client, owner, minter;
    let nativeOwner, nativeMinter;
    let mintedTokens = {};
    const total_number = 2 //total_number *2 *128
    const amount = 1000
    let minter1List, minter2List

    before(async function () {
        this.timeout(300000);

        client = createClient(rpcUrl);
        [owner, minter] = await ethers.getSigners();

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
        this.timeout(6000000); // 10 minutes

        it(`should mint ${total_number} tokens for each minter`, async function () {
            const batchSize = 128;

            for (let i = 0; i < total_number; i += batchSize) {
                const currentBatchSize = Math.min(batchSize, total_number - i);
                const isLastBatch = i + batchSize >= total_number;

                await mintTokensForMinters(
                    client,
                    MINTERS,
                    currentBatchSize,
                    amount
                );

                if (!isLastBatch) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        });

    });

    describe('Case 3: Split tokens', function () {
        this.timeout(9000000);

        it('should split tokens with sequential execution to ensure success', async function () {
            const splitRequests = await prepareSplitRequests(total_number, 'transfer');
            const requestIds = await generateSplitProofs(splitRequests);

            console.log(`\n[Minter1] Starting split operations for ${requestIds.minter1.length} tokens`);
            for (let i = 0; i < requestIds.minter1.length; i++) {
                const requestId = requestIds.minter1[i];
                console.log(`[Minter1] Processing token ${i + 1}/${requestIds.minter1.length} - RequestId: ${requestId}`);
                const result = await executeSingleSplitSequential('minter1', requestId, MINTERS.minter1.privateKey);
                if (!result.success) {
                    throw new Error(`Minter1 split operation failed for request ${requestId}: ${result.error}`);
                }
                console.log(`[Minter1] ✓ Token ${i + 1}/${requestIds.minter1.length} split completed`);
                await sleep(500);
            }
            console.log(`[Minter1] All ${requestIds.minter1.length} tokens split completed\n`);

            console.log(`\n[Minter2] Starting split operations for ${requestIds.minter2.length} tokens`);
            for (let i = 0; i < requestIds.minter2.length; i++) {
                const requestId = requestIds.minter2[i];
                console.log(`[Minter2] Processing token ${i + 1}/${requestIds.minter2.length} - RequestId: ${requestId}`);
                const result = await executeSingleSplitSequential('minter2', requestId, MINTERS.minter2.privateKey);
                if (!result.success) {
                    throw new Error(`Minter2 split operation failed for request ${requestId}: ${result.error}`);
                }
                console.log(`[Minter2] ✓ Token ${i + 1}/${requestIds.minter2.length} split completed`);
                await sleep(500);
            }
            console.log(`[Minter2] All ${requestIds.minter2.length} tokens split completed\n`);

            minter1List = await extractRecipientTokenIds('minter1', requestIds.minter1, MINTERS.minter1.privateKey);
            minter2List = await extractRecipientTokenIds('minter2', requestIds.minter2, MINTERS.minter2.privateKey);

            if (minter1List.length === 0 || minter2List.length === 0) {
                throw new Error(`Token extraction failed: Minter1 has ${minter1List.length} tokens, Minter2 has ${minter2List.length} tokens`);
            }
            await sleep(3000);
        });
    });

    describe('Case 4: Excute Transfers TPS', function () {
        this.timeout(6000000);
        it('should execute transfers with TPS', async function () {
            await executeBatchTransfersSigned(minter1List, minter2List);
        });
    });

    after(async function () {
        // Test completed
        console.log('Test completed.');
    });
});

describe('Native Dual Minter Transfer Performance Tests with batch split', function () {
    let client, owner, minter;
    let nativeOwner, nativeMinter;
    let mintedTokens = {};
    const total_number = 64 //total_number *2 *128
    const amount = 1000
    let minter1List, minter2List

    before(async function () {
        this.timeout(300000);

        client = createClient(rpcUrl);
        [owner, minter] = await ethers.getSigners();

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
        this.timeout(6000000); // 10 minutes

        it(`should mint ${total_number} tokens for each minter`, async function () {
            const batchSize = 128;

            for (let i = 0; i < total_number; i += batchSize) {
                const currentBatchSize = Math.min(batchSize, total_number - i);
                const isLastBatch = i + batchSize >= total_number;

                await mintTokensForMinters(
                    client,
                    MINTERS,
                    currentBatchSize,
                    amount
                );

                if (!isLastBatch) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        });

    });

    describe('Case 3: Split tokens with batch', function () {
        this.timeout(9000000);

        it('should split tokens with concurrent execution', async function () {
            const splitRequests = await prepareSplitRequests(total_number, 'transfer');
            const requestIds = await generateSplitProofs(splitRequests);
            const results = await executeBatchedConcurrentSplits(requestIds);

            minter1List = await extractRecipientTokenIds('minter1', requestIds.minter1, MINTERS.minter1.privateKey)
            minter2List = await extractRecipientTokenIds('minter2', requestIds.minter2, MINTERS.minter2.privateKey)
            await sleep(30000)
            console.log('minter1List length', minter1List.length)
            console.log('minter2List length', minter2List.length)
        });
    });

    describe('Case 4: Excute Transfers TPS', function () {
        this.timeout(6000000);
        it('should execute transfers with TPS', async function () {
            await executeBatchTransfersSigned(minter1List, minter2List);
        });
    });

    after(async function () {
        // Test completed
        console.log('Test completed.');
    });
});


describe('Native Dual Minter Burn Performance Tests', function () {
    let client, owner, minter;
    let nativeOwner, nativeMinter;
    let mintedTokens = {};
    const total_number = 256 //total_number *2 *128
    const amount = 1000
    let minter1List, minter2List

    before(async function () {
        this.timeout(300000);

        client = createClient(rpcUrl);
        [owner, minter] = await ethers.getSigners();

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
        this.timeout(6000000); // 10 minutes

        it(`should mint ${total_number} tokens for each minter`, async function () {
            const batchSize = 128;

            for (let i = 0; i < total_number; i += batchSize) {
                const currentBatchSize = Math.min(batchSize, total_number - i);
                const isLastBatch = i + batchSize >= total_number;

                await mintTokensForMinters(
                    client,
                    MINTERS,
                    currentBatchSize,
                    amount
                );

                if (!isLastBatch) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
        });

    });

    describe('Case 3: Split tokens', function () {
        this.timeout(9000000);

        it('should split tokens with sequential execution to ensure success', async function () {
            const splitRequests = await prepareSplitRequests(total_number, 'burn');
            const requestIds = await generateSplitProofs(splitRequests);

            console.log(`\n[Minter1] Starting split operations for ${requestIds.minter1.length} tokens`);
            for (let i = 0; i < requestIds.minter1.length; i++) {
                const requestId = requestIds.minter1[i];
                console.log(`[Minter1] Processing token ${i + 1}/${requestIds.minter1.length} - RequestId: ${requestId}`);
                const result = await executeSingleSplitSequential('minter1', requestId, MINTERS.minter1.privateKey);
                if (!result.success) {
                    throw new Error(`Minter1 split operation failed for request ${requestId}: ${result.error}`);
                }
                console.log(`[Minter1] ✓ Token ${i + 1}/${requestIds.minter1.length} split completed`);
                await sleep(2000);
            }
            console.log(`[Minter1] All ${requestIds.minter1.length} tokens split completed\n`);

            console.log(`\n[Minter2] Starting split operations for ${requestIds.minter2.length} tokens`);
            for (let i = 0; i < requestIds.minter2.length; i++) {
                const requestId = requestIds.minter2[i];
                console.log(`[Minter2] Processing token ${i + 1}/${requestIds.minter2.length} - RequestId: ${requestId}`);
                const result = await executeSingleSplitSequential('minter2', requestId, MINTERS.minter2.privateKey);
                if (!result.success) {
                    throw new Error(`Minter2 split operation failed for request ${requestId}: ${result.error}`);
                }
                console.log(`[Minter2] ✓ Token ${i + 1}/${requestIds.minter2.length} split completed`);
                await sleep(1000);
            }
            console.log(`[Minter2] All ${requestIds.minter2.length} tokens split completed\n`);

            minter1List = await extractRecipientTokenIds('minter1', requestIds.minter1, MINTERS.minter1.privateKey);
            minter2List = await extractRecipientTokenIds('minter2', requestIds.minter2, MINTERS.minter2.privateKey);

            if (minter1List.length === 0 || minter2List.length === 0) {
                throw new Error(`Token extraction failed: Minter1 has ${minter1List.length} tokens, Minter2 has ${minter2List.length} tokens`);
            }
            await sleep(60000);
        });
    });

    describe('Case 4: Excute Burn TPS', function () {
        this.timeout(6000000);
        it('should execute burns with TPS', async function () {
            await executeBatchBurnsSigned(minter1List, minter2List);
        });
    });

    after(async function () {
        // Test completed
        console.log('Test completed.');
    });
});

/**
 * Execute single token split operation
 * @param {Object} client - gRPC client
 * @param {Object} minterConfig - Configuration object containing minter address and private key
 * @param {string} tokenId - Token ID to split
 * @param {number[]} amounts - Array of split amounts, each element corresponds to a receiver address
 */
async function prepareSplitRequests(round_number, testType = 'transfer') {
    const requests = { minter1: [], minter2: [] };
    console.log(`[Minter1] Preparing ${round_number} split requests for ${testType}`)

    for (let i = 0; i < round_number; i++) {
        const to_accounts = [];
        for (let j = 0; j < 64; j++) {
            if (testType === 'burn') {
                to_accounts.push(
                    { address: MINTERS.minter1.address, amount: 1, comment: "burn" },
                    { address: MINTERS.minter1.address, amount: 2, comment: "burn" }
                );
            } else {
                to_accounts.push(
                    { address: RECEIVER_CONFIG.receiver1, amount: 1, comment: `m1-t${i}-s${j}-r1` },
                    { address: RECEIVER_CONFIG.receiver2, amount: 2, comment: `m1-t${i}-s${j}-r2` }
                );
            }
        }
        requests.minter1.push({
            sc_address: native_token_address,
            token_type: '0',
            from_address: MINTERS.minter1.address,
            to_accounts
        });
    }
    console.log(`[Minter2] Preparing ${round_number} split requests for ${testType}`)
    for (let i = 0; i < round_number; i++) {
        const to_accounts = [];
        for (let j = 0; j < 64; j++) {
            if (testType === 'burn') {
                to_accounts.push(
                    { address: MINTERS.minter2.address, amount: 1, comment: "burn" },
                    { address: MINTERS.minter2.address, amount: 2, comment: "burn" }
                );
            } else {
                to_accounts.push(
                    { address: RECEIVER_CONFIG.receiver1, amount: 1, comment: `m2-t${i}-s${j}-r1` },
                    { address: RECEIVER_CONFIG.receiver2, amount: 2, comment: `m2-t${i}-s${j}-r2` }
                );
            }
        }
        requests.minter2.push({
            sc_address: native_token_address,
            token_type: '0',
            from_address: MINTERS.minter2.address,
            to_accounts
        });
    }

    return requests;
}


async function generateSplitProofs(requests) {
    const minter1Metadata = await createAuthMetadata(MINTERS.minter1.privateKey);
    const minter2Metadata = await createAuthMetadata(MINTERS.minter2.privateKey);
    const minter1Requests = [];
    console.log(`[Minter1] Generating ${requests.minter1.length} split proofs`)

    // 添加进度条显示
    for (let i = 0; i < requests.minter1.length; i++) {
        const req = requests.minter1[i];
        const response = await client.generateBatchSplitToken(req, minter1Metadata);
        minter1Requests.push(response.request_id);

        // 显示进度
        const progress = Math.round(((i + 1) / requests.minter1.length) * 100);
        console.log(`[Minter1] Progress: ${i + 1}/${requests.minter1.length} (${progress}%)`);
    }

    console.log(`[Minter2] Generating ${requests.minter2.length} split proofs`)
    const minter2Requests = [];

    // 添加进度条显示
    for (let i = 0; i < requests.minter2.length; i++) {
        const req = requests.minter2[i];
        const response = await client.generateBatchSplitToken(req, minter2Metadata);
        minter2Requests.push(response.request_id);

        // 显示进度
        const progress = Math.round(((i + 1) / requests.minter2.length) * 100);
        console.log(`[Minter2] Progress: ${i + 1}/${requests.minter2.length} (${progress}%)`);
    }

    return { minter1: minter1Requests, minter2: minter2Requests };
}

/**
 * 执行并发拆分交易，支持批次发送和等待批次完成
 * @param {Object} requests - 包含两个minter的请求ID列表
 * @param {number} [batchSize=20] - 每批次发送的交易数量，默认为20
 * @returns {Object} 执行结果统计
 */
async function executeBatchedConcurrentSplits(requests, batchSize = 20) {
    console.log(`\n⚡ Starting truly concurrent split transaction execution for both minters...`);
    console.log(`[Minter1] Executing ${requests.minter1.length} split requests`);
    console.log(`[Minter2] Executing ${requests.minter2.length} split requests`);

    const startTime = Date.now();

    // 获取两个minter的钱包实例
    const minter1Wallet = new ethers.Wallet(MINTERS.minter1.privateKey, ethers.provider);
    const minter2Wallet = new ethers.Wallet(MINTERS.minter2.privateKey, ethers.provider);

    const minter1Native = new ethers.Contract(native_token_address, abi, minter1Wallet);
    const minter2Native = new ethers.Contract(native_token_address, abi, minter2Wallet);

    const minter1Metadata = await createAuthMetadata(MINTERS.minter1.privateKey);
    const minter2Metadata = await createAuthMetadata(MINTERS.minter2.privateKey);

    // 获取起始nonce
    const minter1StartNonce = await minter1Wallet.getNonce('pending');
    const minter2StartNonce = await minter2Wallet.getNonce('pending');

    // 准备两个minter的所有交易数据
    const minter1TxData = await Promise.all(
        requests.minter1.map(async (requestId, index) => {
            const response = await client.getBatchSplitTokenDetail(
                { request_id: requestId },
                minter1Metadata
            );

            return {
                recipients: response.to_addresses,
                consumptionData: response.consumedIds.map(ids => ids.token_id),
                newTokens: response.newTokens.map((account, idx) => ({
                    id: account.token_id,
                    owner: minter1Wallet.address,
                    status: 2,
                    amount: {
                        cl_x: ethers.toBigInt(account.cl_x),
                        cl_y: ethers.toBigInt(account.cl_y),
                        cr_x: ethers.toBigInt(account.cr_x),
                        cr_y: ethers.toBigInt(account.cr_y)
                    },
                    to: idx % 2 === 0 ? minter1Wallet.address : response.to_addresses[Math.floor(idx / 2)],
                    rollbackTokenId: idx % 2 === 0 ? 0 : response.newTokens[idx - 1]?.token_id || 0
                })),
                proof: response.proof.map(p => ethers.toBigInt(p)),
                publicInputs: response.public_input.map(i => ethers.toBigInt(i)),
                batchedSize: response.batched_size,
                nonce: minter1StartNonce + index
            };
        })
    );

    const minter2TxData = await Promise.all(
        requests.minter2.map(async (requestId, index) => {
            const response = await client.getBatchSplitTokenDetail(
                { request_id: requestId },
                minter2Metadata
            );

            return {
                recipients: response.to_addresses,
                consumptionData: response.consumedIds.map(ids => ids.token_id),
                newTokens: response.newTokens.map((account, idx) => ({
                    id: account.token_id,
                    owner: minter2Wallet.address,
                    status: 2,
                    amount: {
                        cl_x: ethers.toBigInt(account.cl_x),
                        cl_y: ethers.toBigInt(account.cl_y),
                        cr_x: ethers.toBigInt(account.cr_x),
                        cr_y: ethers.toBigInt(account.cr_y)
                    },
                    to: idx % 2 === 0 ? minter2Wallet.address : response.to_addresses[Math.floor(idx / 2)],
                    rollbackTokenId: idx % 2 === 0 ? 0 : response.newTokens[idx - 1]?.token_id || 0
                })),
                proof: response.proof.map(p => ethers.toBigInt(p)),
                publicInputs: response.public_input.map(i => ethers.toBigInt(i)),
                batchedSize: response.batched_size,
                nonce: minter2StartNonce + index
            };
        })
    );

    // 移除预签名逻辑，直接发送交易
    console.log(`✅ 完成交易数据准备，准备发送 ${minter1TxData.length + minter2TxData.length} 个交易`);

    // 准备直接发送交易，而不是使用HTTP POST
    const allTransactionPromises = [];
    
    // 交替添加两个minter的交易以实现更好的交织效果
    const maxLength = Math.max(minter1TxData.length, minter2TxData.length);
    for (let i = 0; i < maxLength; i++) {
        if (i < minter1TxData.length) {
            const txData = minter1TxData[i];
            allTransactionPromises.push({
                data: txData,
                wallet: minter1Wallet,
                contract: minter1Native,
                minterName: 'minter1',
                index: i
            });
        }
        if (i < minter2TxData.length) {
            const txData = minter2TxData[i];
            allTransactionPromises.push({
                data: txData,
                wallet: minter2Wallet,
                contract: minter2Native,
                minterName: 'minter2',
                index: i
            });
        }
    }

    const allResults = [];
    
    // 按批次发送交易
    for (let i = 0; i < allTransactionPromises.length; i += batchSize) {
        const batch = allTransactionPromises.slice(i, i + batchSize);
        
        console.log(`📤 Sending batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allTransactionPromises.length / batchSize)} with ${batch.length} transactions`);
        
        // 使用 Promise.all 发送当前批次的所有交易
        const batchResults = await Promise.all(
            batch.map(async (txInfo) => {
                const { data, wallet, contract, minterName, index } = txInfo;
                try {
                    // 直接使用合约实例发送交易
                    const tx = await contract.split(
                        wallet.address,
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
                    
                    console.log(`📄 [${minterName}] Transaction sent: ${tx.hash}`);
                    
                    // 等待交易确认
                    const receipt = await tx.wait();
                    console.log(`✅ [${minterName}] Transaction confirmed: ${tx.hash}`);
                    
                    return {
                        success: true,
                        minterName,
                        nonce: data.nonce,
                        index: i + index,
                        txHash: tx.hash,
                        receipt
                    };
                } catch (error) {
                    console.error(`❌ [${minterName}] Transaction failed: ${error.message}`);
                    return {
                        success: false,
                        minterName,
                        nonce: data.nonce,
                        index: i + index,
                        error: error.message
                    };
                }
            })
        );
        
        // 收集当前批次的结果
        allResults.push(...batchResults);
        
        // 如果不是最后一个批次，添加短暂延迟
        if (i + batchSize < allTransactionPromises.length) {
            console.log(`⏱️  Waiting before next batch...`);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    const successfulSends = allResults.filter(r => r.success);
    const minter1Successful = successfulSends.filter(r => r.minterName === 'minter1').length;
    const minter2Successful = successfulSends.filter(r => r.minterName === 'minter2').length;

    const results = {
        minter1: {
            totalTransactions: minter1TxData.length,
            successfulTransactions: minter1Successful,
            failedTransactions: minter1TxData.length - minter1Successful
        },
        minter2: {
            totalTransactions: minter2TxData.length,
            successfulTransactions: minter2Successful,
            failedTransactions: minter2TxData.length - minter2Successful
        }
    };

    const endTime = Date.now();
    console.log(`✅ All split transactions executed for both minters in ${endTime - startTime}ms`);
    console.log(`📊 Minter1: ${results.minter1.successfulTransactions}/${results.minter1.totalTransactions} successful`);
    console.log(`📊 Minter2: ${results.minter2.successfulTransactions}/${results.minter2.totalTransactions} successful`);

    return results;
}

/**
 * 从批量拆分交易中提取接收者（奇数索引）的 token ID 列表
 * @param {string} minterName - Minter 名称，用于配置 lookup
 * @param {string[]} requestIds - 交易请求 ID 数组
 * @param {string} privateKey - Minter 私钥（用于身份验证）
 * @returns {Promise<Object>} 包含提取结果的对象
 */
async function extractRecipientTokenIds(minterName, requestIds, minterPrivateKey) {
    const minterMetadata = await createAuthMetadata(minterPrivateKey);

    const allTokenIds = await Promise.all(
        requestIds.map(requestId =>
            client.getBatchSplitTokenDetail(
                { request_id: requestId },
                minterMetadata
            ).then(response =>
                response.newTokens
                    .filter((_, idx) => idx % 2 !== 0)  // 奇数索引
                    .map(account => account.token_id)
            )
        )
    );

    return allTokenIds.flat();
}
async function mintTokensForMinter(client, CONFIG, minterConfig, tokenCount, amount) {
    const mintedTokens = [];

    for (let i = 0; i < tokenCount; i += CONFIG.mintBatchSize) {
        const currentBatchSize = Math.min(CONFIG.mintBatchSize, tokenCount - i);
        const minted = await mintTokensForMinters(
            client,
            { [minterConfig.address]: minterConfig },
            currentBatchSize,
            amount
        );
        mintedTokens.push(...minted[minterConfig.address]);

        if (i + CONFIG.mintBatchSize < tokenCount) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    return mintedTokens;
}

async function executeBatchTransfersSigned(tokenList1, tokenList2) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const allSignedTxs = [];

    const processMinter = async (name, list) => {
        if (!list?.length) return;
        const cfg = MINTERS[name];
        if (!cfg) return;

        const wallet = new ethers.Wallet(cfg.privateKey, ethers.provider);
        const baseNonce = await wallet.getNonce('pending');

        const txs = await Promise.all(list.map(async (t, i) => {
            try {
                const tokenId = t.tokenId || t;
                const contract = new ethers.Contract(native_token_address, abi, wallet);
                const tx = await contract.transfer.populateTransaction(tokenId, `transfer-${name}-${i}`, {
                    nonce: baseNonce + i, gasLimit: 3000000, gasPrice: 0
                });
                tx.from = wallet.address;
                tx.type = 0;
                return { signedTx: await wallet.signTransaction(tx), tokenId, success: true };
            } catch (e) {
                return { tokenId, success: false, error: e.message };
            }
        }));
        allSignedTxs.push(...txs);
    };

    await processMinter('minter1', tokenList1);
    await processMinter('minter2', tokenList2);

    const signed = allSignedTxs.filter(r => r.success);
    const failed = allSignedTxs.filter(r => !r.success);

    if (failed.length) {
        return { total: allSignedTxs.length, success: signed.length, failed: failed.length, error: '预签名失败' };
    }

    // 批量发送
    const BATCH_SIZE = 5000;
    const results = [];

    for (let i = 0; i < signed.length; i += BATCH_SIZE) {
        const batch = signed.slice(i, i + BATCH_SIZE);
        const payload = batch.map((item, idx) => ({
            jsonrpc: "2.0", id: i + idx, method: "eth_sendRawTransaction", params: [item.signedTx]
        }));

        // 计算请求大小
        const requestPayloadString = JSON.stringify(payload);
        const requestSizeInBytes = Buffer.byteLength(requestPayloadString, 'utf8');
        const requestSizeInMB = requestSizeInBytes / (1024 * 1024); // 转换为MB

        console.log(`开始推送批次 ${Math.floor(i / BATCH_SIZE) + 1}，包含 ${batch.length} 笔交易，时间: ${new Date().toISOString()}`);
        console.log(`请求大小: ${requestSizeInMB.toFixed(2)} MB`);

        const startTime = Date.now();

        fetch(RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(response => response.json())
            .then(res => {
                const endTime = Date.now();
                console.log(`完成推送批次 ${Math.floor(i / BATCH_SIZE) + 1}，耗时: ${(endTime - startTime)/1000} 秒，时间: ${new Date().toISOString()}`);

                results.push(...(Array.isArray(res) ? res : []));
            })
            .catch(error => {
                console.error(`推送批次 ${Math.floor(i / BATCH_SIZE) + 1} 出错:`, error);
            });
        await sleep(1000);
    }

    return {
        total: allSignedTxs.length,
        success: results.filter(r => !r.error).length,
        failed: results.filter(r => r.error).length
    };
}

async function executeBatchBurnsSigned(tokenList1, tokenList2) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const allSignedTxs = [];
    console.log(tokenList1)
    console.log(tokenList2)
    const processMinter = async (name, list) => {
        if (!list?.length) return;
        const cfg = MINTERS[name];
        if (!cfg) return;

        const wallet = new ethers.Wallet(cfg.privateKey, ethers.provider);
        const baseNonce = await wallet.getNonce('pending');
        const txs = await Promise.all(list.map(async (t, i) => {
            let tokenId;
            try {
                tokenId = t.tokenId || t;
                const contract = new ethers.Contract(native_token_address, abi, wallet);
                const tx = await contract.burn.populateTransaction(tokenId, {
                    nonce: baseNonce + i, gasLimit: 3000000, gasPrice: 0
                });
                tx.from = wallet.address;
                tx.type = 0;
                return { signedTx: await wallet.signTransaction(tx), tokenId, success: true };
            } catch (e) {
                return { tokenId, success: false, error: e.message };
            }
        }));
        allSignedTxs.push(...txs);
    };

    await processMinter('minter1', tokenList1);
    await processMinter('minter2', tokenList2);

    const signed = allSignedTxs.filter(r => r.success);
    const failed = allSignedTxs.filter(r => !r.success);

    if (failed.length) {
        return { total: allSignedTxs.length, success: signed.length, failed: failed.length, error: '预签名失败' };
    }

    // 批量发送：每批2000个，间隔0.2秒
    const BATCH_SIZE = 4000;
    const results = [];

    for (let i = 0; i < signed.length; i += BATCH_SIZE) {
        const batch = signed.slice(i, i + BATCH_SIZE);
        const payload = batch.map((item, idx) => ({
            jsonrpc: "2.0", id: i + idx, method: "eth_sendRawTransaction", params: [item.signedTx]
        }));

        const res = await fetch(RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(r => r.json());

        results.push(...(Array.isArray(res) ? res : []));
        // await sleep(200);
    }

    return {
        total: allSignedTxs.length,
        success: results.filter(r => !r.error).length,
        failed: results.filter(r => r.error).length
    };
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function executeSingleSplitSequential(minterName, requestId, privateKey) {
    const minterWallet = new ethers.Wallet(privateKey, ethers.provider);
    const derivedAddress = minterWallet.address;
    const configAddress = MINTERS[minterName].address;

    if (derivedAddress.toLowerCase() !== configAddress.toLowerCase()) {
        throw new Error(`[${minterName}] 私钥与配置地址不匹配！`);
    }

    const minterNative = new ethers.Contract(native_token_address, abi, minterWallet);
    const minterMetadata = await createAuthMetadata(privateKey);

    try {
        // 获取split详情
        const response = await client.getBatchSplitTokenDetail(
            { request_id: requestId },
            minterMetadata
        );

        const recipients = response.to_addresses;
        const consumedIds = response.consumedIds.map(ids => ids.token_id);

        const newTokens = response.newTokens.map((account, idx) => ({
            id: account.token_id,
            owner: derivedAddress,
            status: 2,
            amount: {
                cl_x: ethers.toBigInt(account.cl_x),
                cl_y: ethers.toBigInt(account.cl_y),
                cr_x: ethers.toBigInt(account.cr_x),
                cr_y: ethers.toBigInt(account.cr_y)
            },
            to: idx % 2 === 0 ? derivedAddress : recipients[Math.floor(idx / 2)],
            rollbackTokenId: idx % 2 === 0 ? 0 : response.newTokens[idx - 1]?.token_id || 0
        }));

        const proof = response.proof.map(p => ethers.toBigInt(p));
        const publicInputs = response.public_input.map(i => ethers.toBigInt(i));
        const paddingNum = response.batched_size - recipients.length;

        const tx = await minterNative.split(
            derivedAddress,
            recipients,
            consumedIds,
            newTokens,
            proof,
            publicInputs,
            paddingNum
        );

        const receipt = await tx.wait();

        return {
            success: true,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber
        };
    } catch (error) {
        console.error(`Split operation failed: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}

async function getTokenById(){
    const [signer, minter] = await ethers.getSigners();
    const native = new ethers.Contract(
        native_token_address,
        abi,
        signer
    );
    console.log("signerAddress", minter.address);

    let tokens = [
        '5237910133300326902736977396867489027831727198450968770210550166104171816428',
        // '20733447670283116854222731307658614787174484515533733901945797665000281170445',
        // '21671927841327136299433019576064568660278992560971219347022721725025834658470',
        // '4904156794874586464313960803265303601803513072388566612635605847929169684818',
        // '15131217639310241158890917003046250575696970682251825214522635411799644211992',
        // '9733246618418561057679183834346330468973958076110242868293415697404861033890',

    ];

    const results = {
        success: [],
        failed: []
    };

    console.log(`开始处理 ${tokens.length} 个 tokenId...`);

    // 使用 for...of 循环代替 forEach，以便更好地控制异步操作和错误处理
    for (const tokenId of tokens) {
        try {
            // let response = await native.getToken(accounts.Minter, tokenId);
            let response = await native.getToken('0x4312488937D47A007De24d48aB82940C809EEb2b', tokenId);
            console.log(`token ${tokenId} 查询成功，response: ${response.id}`);
            console.log(response)
            results.success.push({ tokenId, response });
        } catch (error) {
            console.error(`token ${tokenId} 查询失败，错误: ${error.message}`);
            results.failed.push({ tokenId, error: error.message });
        }
    }

    // 输出汇总结果
    console.log(`\n=== 查询结果汇总 ===`);
    console.log(`总查询数: ${tokens.length}`);
    console.log(`成功数: ${results.success.length}`);
    console.log(`失败数: ${results.failed.length}`);

    if (results.failed.length > 0) {
        console.log(`\n失败的 tokenId 列表:`);
        results.failed.forEach(item => {
            console.log(`- ${item.tokenId}: ${item.error}`);
        });
    }

    return results;
}


