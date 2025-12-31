const { expect } = require('chai');
const { ethers } = require('hardhat');
const { createClient } = require('./token_grpc');
const accounts = require('./../../deployments/account.json');
const grpc = require("@grpc/grpc-js");

const native_token_address = "0xA449FA6835cb17B39d6f26378a95472bE22811D4";
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
    console.log(`\n=== Setting up mint allowance ===`);

    const ownerMetadata = await createAuthMetadata(accounts.OwnerKey);

    for (const [minterName, minterConfig] of Object.entries(minters)) {
        console.log(`[${minterName}] Encoding amount and setting permission...`);
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
        console.log(`✅ [${minterName}] Permission setup completed`);
    }
}


async function mintTokensForMinters(client, minters, number, amount) {
    console.log(`\n=== Minting tokens for minters ===`);
    const mintedTokens = {};

    // Iterate through all minter configurations
    for (const [minterName, minterConfig] of Object.entries(minters)) {
        console.log(`\n[${minterName}] ===== Starting minting process =====`);
        console.log(`[${minterName}] Target: ${number} tokens, each amount: ${amount}`);

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

        console.log(`[${minterName}] 📤 Calling generateBatchMintProof...`);
        let response;
        try {
            response = await client.generateBatchMintProof(generateRequest, minterMetadata);
            console.log(`[${minterName}] ✅ Proof generation successful`);
            console.log(`[${minterName}] Returned account count: ${response.to_accounts?.length || 0}`);
            console.log(`[${minterName}] MintAllowed ID: ${response.mint_allowed?.token_id}`);
        } catch (error) {
            console.error(`\n[${minterName}] ❌ Proof generation failed!`);
            console.error(`[${minterName}] Error code: ${error.code}`);
            console.error(`[${minterName}] Error message: ${error.message}`);
            throw error;
        }

        // Process response data
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

        console.log(`\n[${minterName}] ===== Preparing to execute mint transaction =====`);
        console.log(`[${minterName}] Recipients count: ${recipients.length}`);
        console.log(`[${minterName}] NewTokens count: ${newTokens.length}`);
        console.log(`[${minterName}] First Token ID: ${newTokens[0]?.id}`);
        console.log(`[${minterName}] MintAllowed ID: ${newAllowed.id}`);

        // Prepare contract instance
        const native = new ethers.Contract(native_token_address, abi, minterWallet);

        try {
            console.log(`[${minterName}] 🚀 Sending mint transaction...`);
            // Remove manual gas parameter, let ethers handle it automatically
            const tx = await native.mint(recipients, newTokens, newAllowed, proof, publicInputs,bathcedSize - to_accounts.length);

            console.log(`[${minterName}] 📡 Transaction sent, Hash: ${tx.hash}`);
            console.log(`[${minterName}] ⏳ Waiting for confirmation (up to 10 minutes)...`);

            const waitStartTime = Date.now();
            const receipt = await tx.wait();
            const waitTime = Date.now() - waitStartTime;

            console.log(`\n[${minterName}] ✅ Transaction confirmed successfully!`);
            console.log(`[${minterName}] Block number: ${receipt.blockNumber}`);
            console.log(`[${minterName}] Gas used: ${receipt.gasUsed}`);

            // Save token IDs
            mintedTokens[minterName] = newTokens.map(token => token.id);
            console.log(`\n✅ [${minterName}] Successfully minted ${number} tokens, each amount ${amount}`);

        } catch (error) {
            console.error(`\n[${minterName}] ❌ Mint transaction failed!`);
            console.error(`[${minterName}] Error type: ${error.code || 'N/A'}`);
            console.error(`[${minterName}] Error message: ${error.message}`);

            if (error.transactionHash) {
                console.error(`[${minterName}] Failed transaction Hash: ${error.transactionHash}`);
            }

            throw error;
        }
    }

    return mintedTokens;
}
async function mintTokensForMintersWithAmountList(client, minters, number, amountList) {
    console.log(`\n=== Minting tokens for minters ===`);
    const mintedTokens = {};

    // Validate that amountList is an array and not empty
    if (!Array.isArray(amountList) || amountList.length === 0) {
        throw new Error("amountList must be a non-empty array");
    }

    // Iterate through all minter configurations
    for (const [minterName, minterConfig] of Object.entries(minters)) {
        console.log(`\n[${minterName}] ===== Starting minting process =====`);
        console.log(`[${minterName}] Target: ${number} tokens, random amount list: [${amountList.join(', ')}]`);

        const minterWallet = new ethers.Wallet(minterConfig.privateKey, ethers.provider);
        const minterMetadata = await createAuthMetadata(minterConfig.privateKey);

        // Dynamically create to_accounts array, randomly selecting values from amountList
        const to_accounts = Array(number).fill().map(() => ({
            address: minterConfig.address,
            amount: amountList[Math.floor(Math.random() * amountList.length)]
        }));

        // Print actual used amount distribution (for debugging)
        const usedAmounts = to_accounts.map(acc => acc.amount);
        console.log(`[${minterName}] Actual used amounts: [${usedAmounts.join(', ')}]`);

        const generateRequest = {
            sc_address: native_token_address,
            token_type: '0',
            from_address: minterConfig.address,
            to_accounts: to_accounts,
        };

        console.log(`[${minterName}] 📤 Calling generateBatchMintProof...`);
        let response;
        try {
            response = await client.generateBatchMintProof(generateRequest, minterMetadata);
            console.log(`[${minterName}] ✅ Proof generation successful`);
            console.log(`[${minterName}] Returned account count: ${response.to_accounts?.length || 0}`);
            console.log(`[${minterName}] MintAllowed ID: ${response.mint_allowed?.token_id}`);
        } catch (error) {
            console.error(`\n[${minterName}] ❌ Proof generation failed!`);
            console.error(`[${minterName}] Error code: ${error.code}`);
            console.error(`[${minterName}] Error message: ${error.message}`);
            throw error;
        }

        // Process response data
        const recipients = response.to_accounts.map(account => account.address);
        const bathcedSize = response.batched_size;
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

        console.log(`\n[${minterName}] ===== Preparing to execute mint transaction =====`);
        console.log(`[${minterName}] Recipients count: ${recipients.length}`);
        console.log(`[${minterName}] NewTokens count: ${newTokens.length}`);
        console.log(`[${minterName}] First Token ID: ${newTokens[0]?.id}`);
        console.log(`[${minterName}] MintAllowed ID: ${newAllowed.id}`);

        // Prepare contract instance
        const native = new ethers.Contract(native_token_address, abi, minterWallet);

        try {
            console.log(`[${minterName}] 🚀 Sending mint transaction...`);
            // Remove manual gas parameter, let ethers handle it automatically
            const tx = await native.mint(recipients, newTokens, newAllowed, proof, publicInputs, bathcedSize - to_accounts.length);

            console.log(`[${minterName}] 📡 Transaction sent, Hash: ${tx.hash}`);
            console.log(`[${minterName}] ⏳ Waiting for confirmation (up to 10 minutes)...`);

            const waitStartTime = Date.now();
            const receipt = await tx.wait();
            const waitTime = Date.now() - waitStartTime;

            console.log(`\n[${minterName}] ✅ Transaction confirmed successfully!`);
            console.log(`[${minterName}] Block number: ${receipt.blockNumber}`);
            console.log(`[${minterName}] Gas used: ${receipt.gasUsed}`);

            // Save token IDs
            mintedTokens[minterName] = newTokens.map(token => token.id);
            console.log(`\n✅ [${minterName}] Successfully minted ${number} tokens, each token amount randomly selected from list`);

        } catch (error) {
            console.error(`\n[${minterName}] ❌ Mint transaction failed!`);
            console.error(`[${minterName}] Error type: ${error.code || 'N/A'}`);
            console.error(`[${minterName}] Error message: ${error.message}`);

            if (error.transactionHash) {
                console.error(`[${minterName}] Failed transaction Hash: ${error.transactionHash}`);
            }

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

describe.only('Native Dual Minter Split Performance Tests', function () {
    let client, owner,minter;
    let nativeOwner,nativeMinter;
    let mintedTokens = {};
    const total_number = 1
    const amount = 1000

    before(async function () {
        this.timeout(300000); // 5 minutes timeout

        console.log('🚀 === Test environment initialization ===');

        // Initialize client
        client = createClient(rpcUrl);

        // Get contract owner
        [owner,minter] = await ethers.getSigners();

        // Initialize contracts
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

        console.log(`Contract address: ${native_token_address}`);
        console.log(`Owner address: ${owner.address}`);
        // console.log(`Minter1 address: ${MINTERS.minter1.address}`);
        // console.log(`Minter2 address: ${MINTERS.minter2.address}`);
        console.log(`Receiver1 address: ${RECEIVER_CONFIG.receiver1}`);
        console.log(`Receiver2 address: ${RECEIVER_CONFIG.receiver2}`);
        console.log('✅ Environment initialization completed\n');
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
            const batchSize = 128;     // Maximum batch size

            console.log(`\n🎯 Starting to mint ${total_number} tokens for each of the two minters (batch processing)`);

            // Batch loop minting
            for (let i = 0; i < total_number; i += batchSize) {
                const currentBatchSize = Math.min(batchSize, total_number - i);
                const batchNumber = Math.floor(i / batchSize) + 1;
                const isLastBatch = i + batchSize >= total_number;

                console.log(`\n📦 Batch ${batchNumber}${isLastBatch ? ' (last batch)' : ''}: Minting ${currentBatchSize} tokens`);

                await mintTokensForMinters(
                    client,
                    MINTERS,
                    currentBatchSize,
                    amount
                );

                // Short delay between batches to avoid overwhelming the system
                if (!isLastBatch) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }

            console.log('\n✅ Both minters minting completed');
        });

    });

    describe('Case 3: Split tokens with performance test', function () {
        this.timeout(9000000);

        it('should split tokens with concurrent execution', async function () {
            console.log('\n🎯 === Starting batch token split performance test ===');

            // Prepare split requests for each minter
            const splitRequests = await prepareSplitRequests(total_number);

            // Generate split proofs
            const requestIds = await generateSplitProofs(splitRequests);

            // Execute split transactions
            const results = await executeConcurrentSplits(requestIds);

            const minter1List = await extractRecipientTokenIds('minter1', requestIds.minter1, MINTERS.minter1.privateKey)
            console.log(minter1List)

        });
    });

    describe.skip('Case 4: Excute Transfers TPS', function () {
        this.timeout(6000000);
        it('should execute transfers with TPS', async function () {
            // 从两个minter获取分割后的代币
            const tokenList = [];
            for(const minterName in MINTERS){
                const minterConfig = MINTERS[minterName];
                const metadata = await createAuthMetadata(minterConfig.privateKey);
                let tokens = await client.getSplitTokenList(minterConfig.address, native_token_address, metadata);
                console.log("Get split token list response:", tokens);
                console.log(`Get split token list response for ${minterName}:`, tokens.split_tokens.length);

                // 添加获取到的tokenIds到总列表，并标记来源minter
                for(const token of tokens.split_tokens) {
                    tokenList.push({
                        tokenId: token.token_id,
                        minterName: minterName
                    });
                }
            }

            if (tokenList.length === 0) {
                console.log('⚠️  没有找到可转账的代币，跳过转账测试');
                return;
            }

            console.log(`\n准备对 ${tokenList.length} 个代币执行转账操作`);

            const results = await executeBatchTransfersSigned(tokenList);
        });
    });

    after(async function () {
        console.log('\n📊 === Test completion summary ===');
        console.log('1. ✅ Mint allowance setup completed');
        console.log('2. ✅ Token minting completed');
        console.log('3. ✅ Batch split performance test completed');
        console.log('All test cases executed successfully!');
    });
});

// ===== New test suite: Single token basic split test =====
describe.skip('Native Token Basic Split And Mint Tests', function () {
    let client, owner;
    let nativeOwner;
    let minter = MINTERS.minter1;

    before(async function () {
        this.timeout(120000);
        console.log('🚀 === Basic split test environment initialization ===');

        client = createClient(rpcUrl);
        [owner] = await ethers.getSigners();

        nativeOwner = new ethers.Contract(
            native_token_address,
            abi,
            owner
        );
        console.log(`Contract address: ${native_token_address}`);
        console.log(`Owner address: ${owner.address}`);
        console.log(`Minter1 address: ${MINTERS.minter1.address}`);
        console.log(`Receiver1 address: ${RECEIVER_CONFIG.receiver1}`);
        console.log(`Receiver2 address: ${RECEIVER_CONFIG.receiver2}`);
        console.log('✅ Environment initialization completed\n');
    });

    describe('Case 1: mint multiple tokens with different amounts', function () {
        it('should successfully mint multiple tokens', async function () {
            this.timeout(300000);

            console.log('\nStep 1: Minting multiple tokens (amounts: [1,200,300])...');
            const mintedTokens = await mintTokensForMintersWithAmountList(
                client,
                { minter1: MINTERS.minter1 },
                10,  // Mint 10 tokens
                 [1,100,500,1000]// Token amounts
            );
            const tokenId = mintedTokens.minter1[0];
            console.log(`  ✅ Token minting successful: ID=${tokenId}`);
        });
    });

    describe('Case 2: Mint single token and split', function () {
        it('should successfully mint 1 token and split to multiple addresses', async function () {
            this.timeout(300000);

            console.log('\n🎯 === Case 1: Single token split test ===');

            // Step 1: Mint 1 token (amount: 100)
            console.log('\nStep 1: Minting single token (amount: 100)...');
            const mintedTokens = await mintTokensForMinters(
                client,
                { minter1: MINTERS.minter1 },
                1,  // Mint 1 token
                100 // Token amount
            );
            const tokenId = mintedTokens.minter1[0];
            console.log(`  ✅ Token minting successful: ID=${tokenId}`);

            // Step 2: Split token into 2 parts (30 to receiver1, 70 to receiver2)
            console.log('\nStep 2: Splitting token (30 + 70)...');
            await executeSingleSplit(
                client,
                MINTERS.minter1,
                tokenId,
                [30, 70]
            );

            console.log('\n✅ Case 1 completed: Single token split successful');
        });
    });

    describe('Case 3: Mint token and split full amount', function () {
        it('should successfully mint token and split full amount', async function () {
            this.timeout(300000);

            console.log('\n🎯 === Case 2: Full amount split test ===');

            // Step 1: Mint 1 token (amount: 200)
            console.log('\nStep 1: Minting single token (amount: 200)...');
            const mintedTokens = await mintTokensForMinters(
                client,
                { minter1: MINTERS.minter1 },
                1,  // Mint 1 token
                200 // Token amount
            );
            const tokenId = mintedTokens.minter1[0];
            console.log(`  ✅ Token minting successful: ID=${tokenId}`);

            // Step 2: Split token full amount (50+50+100=200)
            console.log('\nStep 2: Splitting token full amount (50 + 50 + 100 = 200)...');
            await executeSingleSplit(
                client,
                MINTERS.minter1,
                tokenId,
                [50, 50, 100] // Split total equals token amount
            );

            console.log('\n✅ Case 2 completed: Full amount split successful');
        });
    });
});

/**
 * Execute single token split operation
 * @param {Object} client - gRPC client
 * @param {Object} minterConfig - Configuration object containing minter address and private key
 * @param {string} tokenId - Token ID to split
 * @param {number[]} amounts - Array of split amounts, each element corresponds to a receiver address
 */
async function executeSingleSplit(client, minterConfig, tokenId, amounts) {
    const minterWallet = new ethers.Wallet(minterConfig.privateKey, ethers.provider);

    // Use NonceManager to avoid nonce competition (key improvement)
    const managedSigner = new ethers.NonceManager(minterWallet);
    const minterNative = new ethers.Contract(native_token_address, abi, managedSigner);

    const metadata = await createAuthMetadata(minterConfig.privateKey);

    console.log(`\n  📋 [Single token split] Preparing split request (Token ID: ${tokenId})...`);

    // Prepare receiver addresses and amounts array
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

    console.log('  📤 Generating split proof...');
    const proofResponse = await client.generateBatchSplitToken(splitRequest, metadata);

    // Get proof details
    const response = await client.getBatchSplitTokenDetail(
        { request_id: proofResponse.request_id },
        metadata
    );

    const recipients = response.to_addresses;
    const consumedIds = [tokenId];
    const batchedSize = response.batched_size; // New: get batch size

    // Prepare new token data (consistent with batch version logic)
    const newTokens = response.newTokens.map((token, index) => {
        // Key fix: dynamically assign receiver addresses (same as batch version)
        const toAddress = index % 2 === 0
            ? minterConfig.address  // Even index: send back to self
            : recipients[Math.floor(index / 2)];  // Odd index: send to corresponding receiver

        // Key fix: dynamically set rollbackTokenId (same as batch version)
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
            rollbackTokenId: rollbackTokenId  // Fix: dynamic value
        };
    });

    const proof = response.proof.map(p => ethers.toBigInt(p));
    const publicInputs = response.public_input.map(i => ethers.toBigInt(i));

    // Key fix: calculate PaddingNum (same as batch version)
    const paddingNum = batchedSize - to_accounts.length;

    console.log(`  🚀 Sending split transaction (New tokens: ${newTokens.length}, Padding: ${paddingNum})...`);

    try {
        // Use managedSigner to automatically handle nonce
        const tx = await minterNative.split(
            minterConfig.address,  // from
            recipients,            // recipients
            consumedIds,           // consumedIds
            newTokens,             // newTokens
            proof,                 // proof
            publicInputs,          // publicInputs
            paddingNum,            // Fix: dynamically calculated PaddingNum
            // Remove { nonce } parameter, handled by NonceManager
        );

        console.log(`  ⏳ Waiting for transaction confirmation... Hash: ${tx.hash}`);
        const receipt = await tx.wait();

        console.log(`  ✅ Split successful: blockNumber=${receipt.blockNumber}, GasUsed=${receipt.gasUsed}`);

        // New: return structured result (consistent with batch version)
        return {
            success: true,
            tokenId,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed,
            txHash: tx.hash
        };
    } catch (error) {
        console.error(`  ❌ Split failed: ${error.message}`);

        // New: return error information (consistent with batch version)
        return {
            success: false,
            tokenId,
            error: error.message
        };
    }
}
async function prepareSplitRequests(round_number) {
    console.log('\n📋 Preparing split request data...');

    const requests = { minter1: [], minter2: [] };

    // Prepare 100 token split requests for minter1, total 10000 split requests
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

    // Prepare 100 token split requests for minter2
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

    console.log(`✅ Preparation completed: Minter1 ${requests.minter1.length} requests, Minter2 ${requests.minter2.length} requests`);
    return requests;
}
async function generateSplitProofs(requests) {
    console.log('\n🔍 Starting to generate split proofs...');

    const startTime = Date.now();
    const minter1Metadata = await createAuthMetadata(MINTERS.minter1.privateKey);
    const minter2Metadata = await createAuthMetadata(MINTERS.minter2.privateKey);


    // Generate all proofs one by one instead of parallel processing
    const minter1Requests = [];
    for (const req of requests.minter1) {
        console.log(req)
        console.log(`  🔍 Generating split proof (Minter1, ${minter1Requests.length + 1}/${requests.minter1.length})...`)
        const response = await client.generateBatchSplitToken(req, minter1Metadata);
        minter1Requests.push(response.request_id);
    }

    const minter2Requests = [];
    for (const req of requests.minter2) {
        console.log(`  🔍 Generating split proof (Minter2, ${minter2Requests.length + 1}/${requests.minter2.length})...`)
        const response = await client.generateBatchSplitToken(req, minter2Metadata);
        minter2Requests.push(response.request_id);
    }
    const endTime = Date.now();

    console.log(`✅ Proof generation completed`);
    console.log(`  - Minter1: ${minter1Requests.length} proofs`);
    console.log(`  - Minter2: ${minter2Requests.length} proofs`);
    console.log(`  - Total time: ${endTime - startTime}ms`);

    return { minter1: minter1Requests, minter2: minter2Requests };
}
async function generateSplitProofsSingle(requests) {
    console.log('\n🔍 Starting to generate split proofs...');

    const startTime = Date.now();
    const minter1Metadata = await createAuthMetadata(MINTERS.minter1.privateKey);
    const minter1Requests = [];
    for (const req of requests.minter1) {
        console.log(`  🔍 Generating split proof (Minter1, ${minter1Requests.length + 1}/${requests.minter1.length})...`)
        const response = await client.generateBatchSplitToken(req, minter1Metadata);
        minter1Requests.push(response.request_id);
    }

    const endTime = Date.now();

    console.log(`✅ Proof generation completed`);
    console.log(`  - Minter1: ${minter1Requests.length} proofs`);
    console.log(`  - Total time: ${endTime - startTime}ms`);

    return { minter1: minter1Requests };
}
async function executeConcurrentSplits(requests) {
    console.log('\n⚡ Starting concurrent split transaction execution...');

    const startTime = Date.now();
    const results = { minter1: null, minter2: null };

    const [minter1Results, minter2Results] = await Promise.all([
        executeBatchSplitsSigned('minter1', requests.minter1, MINTERS.minter1.privateKey),
        executeBatchSplitsSigned('minter2', requests.minter2, MINTERS.minter2.privateKey)
    ]);


    results.minter1 = minter1Results;
    results.minter2 = minter2Results;

    const endTime = Date.now();

    console.log(`\n✅ All split transactions executed`);
    console.log(`Total time: ${endTime - startTime}ms`);

    return results;
}
async function executeBatchSplitsSigned(minterName, requestIds, privateKey) {
    // transction type = 0
    const minterWallet = new ethers.Wallet(privateKey, ethers.provider);
    const derivedAddress = minterWallet.address;
    const configAddress = MINTERS[minterName].address;

    if (derivedAddress.toLowerCase() !== configAddress.toLowerCase()) {
        throw new Error(`[${minterName}] 私钥与配置地址不匹配！`);
    }

    const minterNative = new ethers.Contract(native_token_address, abi, minterWallet);
    const minterMetadata = await createAuthMetadata(privateKey);
    console.log(`\n[${minterName}] 开始处理 ${requestIds.length} 笔交易`);

    // 2. 获取交易数据
    const dataFetchStart = Date.now();
    const startNonce = await minterWallet.getNonce('pending');

    const allTxData = await Promise.all(
        requestIds.map(async (requestId, index) => {
            const response = await client.getBatchSplitTokenDetail(
                { request_id: requestId },
                minterMetadata
            );

            const recipients = response.to_addresses;
            const consumptionData = response.consumedIds.map(ids => ids.token_id);

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

            return {
                recipients,
                consumptionData,
                newTokens,
                proof: response.proof.map(p => ethers.toBigInt(p)),
                publicInputs: response.public_input.map(i => ethers.toBigInt(i)),
                batchedSize: response.batched_size,
                nonce: startNonce + index
            };
        })
    );

    const dataFetchTime = Date.now() - dataFetchStart;
    console.log(`[${minterName}] 数据获取完成, 耗时: ${dataFetchTime}ms`);

    // 3. 预签名 - 使用传统交易参数 (type=0)
    const signingStart = Date.now();
    const signedTxs = await Promise.all(
        allTxData.map(async (txData, index) => {
            try {
                const unsignedTx = await minterNative.split.populateTransaction(
                    derivedAddress,
                    txData.recipients,
                    txData.consumptionData,
                    txData.newTokens,
                    txData.proof,
                    txData.publicInputs,
                    txData.batchedSize - txData.recipients.length,
                    {
                        nonce: txData.nonce,
                        gasLimit: 450436*10,
                        gasPrice: 0
                    }
                );

                unsignedTx.from = derivedAddress;
                unsignedTx.type = 0;
                const signedTx = await minterWallet.signTransaction(unsignedTx);
                const recoveredAddress = ethers.Transaction.from(signedTx).from;

                if (recoveredAddress !== derivedAddress) {
                    throw new Error(`地址恢复失败: 预期 ${derivedAddress}, 实际 ${recoveredAddress}`);
                }

                return { signedTx, nonce: txData.nonce, index, success: true };
            } catch (error) {
                console.error(`[${minterName}] 交易 ${index} 预签名失败: ${error.message}`);
                return { error: error.message, nonce: txData.nonce, index, success: false };
            }
        })
    );

    const successfulSigs = signedTxs.filter(r => r.success);
    const failedSigs = signedTxs.filter(r => !r.success);
    const signingTime = Date.now() - signingStart;

    if (failedSigs.length > 0) {
        return {
            totalTransactions: allTxData.length,
            successfulTransactions: 0,
            failedTransactions: failedSigs.length,
            dataFetchTime, signingTime, totalTime: Date.now() - dataFetchStart,
            error: '预签名失败'
        };
    }

    // 4. 批量发送
    const broadcastStart = Date.now();
    const providerUrl = 'http://dev2-ucl-l2.hamsa-ucl.com:8545';
    const BATCH_SIZE = 128;
    const allResults = [];

    for (let i = 0; i < successfulSigs.length; i += BATCH_SIZE) {
        const batch = successfulSigs.slice(i, i + BATCH_SIZE);
        const batchMetadata = batch.map(item => ({ taskId: item.index, nonce: item.nonce }));

        const batchPayload = batch.map((signedData, index) => ({
            jsonrpc: "2.0",
            id: batchMetadata[index].taskId,
            method: "eth_sendRawTransaction",
            params: [signedData.signedTx]
        }));
        const requestBody = JSON.stringify(batchPayload);
        const requestSizeBytes = Buffer.byteLength(requestBody, 'utf8');
        const requestSizeMB = requestSizeBytes / (1024 * 1024);
        console.log(`[${minterName}] HTTP 请求大小: ${requestSizeBytes} 字节 (${requestSizeMB.toFixed(4)} MB), 交易数量: ${batch.length}`);
        try {
            const response = await fetch(providerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(batchPayload)
            });

            const responseData = await response.json();
            await sleep(2000);

            if (Array.isArray(responseData)) {
                for (const result of responseData) {
                    const metadata = batchMetadata.find(m => m.taskId === result.id);

                    allResults.push({
                        success: !result.error,
                        nonce: metadata.nonce,
                        index: metadata.taskId,
                        txHash: result.result,
                        error: result.error?.message
                    });
                }
            }
        } catch (error) {
            console.error(`[${minterName}] 批次请求失败:`, error.message);
            batchMetadata.forEach(metadata => allResults.push({
                success: false, nonce: metadata.nonce, index: metadata.taskId, error: error.message
            }));
        }
    }

    const successfulSends = allResults.filter(r => r.success);
    const broadcastTime = Date.now() - broadcastStart;

    console.log(`\n[${minterName}] 成功: ${successfulSends.length}, 失败: ${failedSigs.length + allResults.filter(r => !r.success).length}`);

    return {
        totalTransactions: allTxData.length,
        successfulTransactions: successfulSends.length,
        failedTransactions: allTxData.length - successfulSends.length,
        dataFetchTime, signingTime, broadcastTime,
        totalTime: Date.now() - dataFetchStart,
        averageTimePerTx: (Date.now() - dataFetchStart) / allTxData.length
    };
}

/**
 * 从批量拆分交易中提取接收者（奇数索引）的 token ID 列表
 * @param {string} minterName - Minter 名称，用于配置 lookup
 * @param {string[]} requestIds - 交易请求 ID 数组
 * @param {string} privateKey - Minter 私钥（用于身份验证）
 * @returns {Promise<Object>} 包含提取结果的对象
 */
async function extractRecipientTokenIds(minterName,requestIds,minterPrivateKey) {
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


async function mintTokensForMinter(client,CONFIG, minterConfig, tokenCount, amount) {
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
async function prepareSplitRequestsForDualMinter(tokenIds, CONFIG) {
    console.log('\n📋 为双 Minter TPS 测试准备拆分请求数据...');

    const requests = { minter1: [], minter2: [] };

    // 为 minter1 准备拆分请求
    for (let i = 0; i < CONFIG.splitRoundsPerMinter && i < tokenIds.minter1.length; i++) {
        const tokenId = tokenIds.minter1[i];
        const to_accounts = [];

        for (let j = 0; j < CONFIG.splitReceiversPerRound; j++) {
            to_accounts.push({
                address: j % 2 === 0 ? RECEIVER_CONFIG.receiver1 : RECEIVER_CONFIG.receiver2,
                amount: Math.floor(CONFIG.tokenAmount / CONFIG.splitReceiversPerRound),
                comment: `m1-t${tokenId}-s${j}`
            });
        }

        requests.minter1.push({
            sc_address: native_token_address,
            token_type: '0',
            from_address: MINTERS.minter1.address,
            to_accounts
        });
    }

    // 为 minter2 准备拆分请求
    for (let i = 0; i < CONFIG.splitRoundsPerMinter && i < tokenIds.minter2.length; i++) {
        const tokenId = tokenIds.minter2[i];
        const to_accounts = [];

        for (let j = 0; j < config.splitReceiversPerRound; j++) {
            to_accounts.push({
                address: j % 2 === 0 ? RECEIVER_CONFIG.receiver1 : RECEIVER_CONFIG.receiver2,
                amount: Math.floor(CONFIG.tokenAmount / CONFIG.splitReceiversPerRound),
                comment: `m2-t${tokenId}-s${j}`
            });
        }

        requests.minter2.push({
            sc_address: native_token_address,
            token_type: '0',
            from_address: MINTERS.minter2.address,
            to_accounts
        });
    }

    console.log(`✅ 拆分请求准备完成: Minter1 ${requests.minter1.length} 个, Minter2 ${requests.minter2.length} 个`);
    return requests;
}
async function executeBatchTransfersSigned(tokenList) {
    console.log(`\n开始处理 ${tokenList.length} 笔转账交易`);

    // 按照minter分组tokenIds
    const tokensByMinter = {};
    for (const token of tokenList) {
        const minterName = token.minterName || 'minter1'; // 默认使用minter1，如果没有指定则需要根据实际情况调整
        if (!tokensByMinter[minterName]) {
            tokensByMinter[minterName] = [];
        }
        tokensByMinter[minterName].push(token.tokenId);
    }

    // 为每个minter预签名交易
    const allSignedTxs = [];
    const signingStart = Date.now();

    for (const minterName in tokensByMinter) {
        const minterConfig = MINTERS[minterName];
        if (!minterConfig) {
            console.log(`⚠️  未知的minter: ${minterName}，跳过`);
            continue;
        }

        const minterWallet = new ethers.Wallet(minterConfig.privateKey, ethers.provider);
        const derivedAddress = minterWallet.address;

        console.log(`\n[${minterName}] 开始为 ${tokensByMinter[minterName].length} 笔交易预签名`);

        // 获取起始 nonce
        const startNonce = await minterWallet.getNonce('pending');
        console.log(`[${minterName}] 起始 nonce: ${startNonce}`);

        // 预签名所有交易
        const minterSignedTxs = await Promise.all(
            tokensByMinter[minterName].map(async (tokenId, index) => {
                try {
                    const nativeContract = new ethers.Contract(native_token_address, abi, minterWallet);
                    const unsignedTx = await nativeContract.transfer.populateTransaction(
                        tokenId,
                        `transfer-${minterName}-${index}`,
                        {
                            nonce: startNonce + index,
                            gasLimit: 3000000,  // 适当设置 gas 限制
                            gasPrice: 0
                        }
                    );

                    unsignedTx.from = derivedAddress;
                    unsignedTx.type = 0;
                    const signedTx = await minterWallet.signTransaction(unsignedTx);
                    const recoveredAddress = ethers.Transaction.from(signedTx).from;

                    if (recoveredAddress !== derivedAddress) {
                        throw new Error(`地址恢复失败: 预期 ${derivedAddress}, 实际 ${recoveredAddress}`);
                    }

                    return {
                        signedTx,
                        tokenId,
                        nonce: startNonce + index,
                        minterName,
                        index,
                        success: true
                    };
                } catch (error) {
                    console.error(`[${minterName}] 交易 ${index} (tokenId: ${tokenId}) 预签名失败: ${error.message}`);
                    return {
                        error: error.message,
                        tokenId,
                        nonce: startNonce + index,
                        minterName,
                        index,
                        success: false
                    };
                }
            })
        );

        allSignedTxs.push(...minterSignedTxs);
    }

    const successfulSigs = allSignedTxs.filter(r => r.success);
    const failedSigs = allSignedTxs.filter(r => !r.success);
    const signingTime = Date.now() - signingStart;

    if (failedSigs.length > 0) {
        return {
            totalTransactions: tokenList.length,
            successfulTransactions: successfulSigs.length,
            failedTransactions: failedSigs.length,
            signingTime,
            totalTime: signingTime,
            error: '预签名失败'
        };
    }

    // 统一发送所有预签名交易到链上
    const broadcastStart = Date.now();
    const providerUrl = RPC; // 使用定义的 RPC 地址
    // const BATCH_SIZE = 12800; // 每批发送的交易数量
    const allResults = [];

    // for (let i = 0; i < successfulSigs.length; i += BATCH_SIZE) {
    //     const batch = successfulSigs.slice(i, i + BATCH_SIZE);
    //     const batchMetadata = batch.map(item => ({
    //         taskId: item.index,
    //         nonce: item.nonce,
    //         tokenId: item.tokenId,
    //         minterName: item.minterName
    //     }));
    //
    //     const batchPayload = batch.map((signedData, index) => ({
    //         jsonrpc: "2.0",
    //         id: batchMetadata[index].taskId,
    //         method: "eth_sendRawTransaction",
    //         params: [signedData.signedTx]
    //     }));
    //
    //     const requestBody = JSON.stringify(batchPayload);
    //     const requestSizeBytes = Buffer.byteLength(requestBody, 'utf8');
    //     const requestSizeMB = requestSizeBytes / (1024 * 1024);
    //     console.log(`HTTP 请求大小: ${requestSizeBytes} 字节 (${requestSizeMB.toFixed(4)} MB), 交易数量: ${batch.length}`);
    //
    //     try {
    //         const response = await fetch(providerUrl, {
    //             method: 'POST',
    //             headers: { 'Content-Type': 'application/json' },
    //             body: JSON.stringify(batchPayload)
    //         });
    //
    //         const responseData = await response.json();
    //         // await sleep(1000); // 发送批次之间短暂延迟
    //
    //         if (Array.isArray(responseData)) {
    //             for (const result of responseData) {
    //                 const metadata = batchMetadata.find(m => m.taskId === result.id);
    //
    //                 allResults.push({
    //                     success: !result.error,
    //                     tokenId: metadata.tokenId,
    //                     nonce: metadata.nonce,
    //                     minterName: metadata.minterName,
    //                     index: metadata.taskId,
    //                     txHash: result.result,
    //                     error: result.error?.message
    //                 });
    //             }
    //         }
    //     } catch (error) {
    //         console.error(`批次请求失败:`, error.message);
    //         batchMetadata.forEach(metadata => allResults.push({
    //             success: false,
    //             tokenId: metadata.tokenId,
    //             nonce: metadata.nonce,
    //             minterName: metadata.minterName,
    //             index: metadata.taskId,
    //             error: error.message
    //         }));
    //     }
    // }

    const batchMetadata = allSignedTxs.map(item => ({
        taskId: item.index,
        nonce: item.nonce,
        tokenId: item.tokenId,
        minterName: item.minterName
    }));

    const batchPayload = allSignedTxs.map((signedData, index) => ({
        jsonrpc: "2.0",
        id: batchMetadata[index].taskId,
        method: "eth_sendRawTransaction",
        params: [signedData.signedTx]
    }));

    const requestBody = JSON.stringify(batchPayload);
    const requestSizeBytes = Buffer.byteLength(requestBody, 'utf8');
    const requestSizeMB = requestSizeBytes / (1024 * 1024);
    console.log(`HTTP 请求大小: ${requestSizeBytes} 字节 (${requestSizeMB.toFixed(4)} MB), 交易数量: ${allSignedTxs.length}`);

    try {
        const response = await fetch(providerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(batchPayload)
        });

        const responseData = await response.json();

        if (Array.isArray(responseData)) {
            for (const result of responseData) {
                const metadata = batchMetadata.find(m => m.taskId === result.id);

                allResults.push({
                    success: !result.error,
                    tokenId: metadata.tokenId,
                    nonce: metadata.nonce,
                    minterName: metadata.minterName,
                    index: metadata.taskId,
                    txHash: result.result,
                    error: result.error?.message
                });
            }
        }
    } catch (error) {
        console.error(`批次请求失败:`, error.message);
        batchMetadata.forEach(metadata => allResults.push({
            success: false,
            tokenId: metadata.tokenId,
            nonce: metadata.nonce,
            minterName: metadata.minterName,
            index: metadata.taskId,
            error: error.message
        }));
    }

    const successfulSends = allResults.filter(r => r.success);
    const failedSends = allResults.filter(r => !r.success);
    const broadcastTime = Date.now() - broadcastStart;

    console.log(`\n转账结果: 成功 ${successfulSends.length}, 失败 ${failedSends.length}`);

    return {
        totalTransactions: tokenList.length,
        successfulTransactions: successfulSends.length,
        failedTransactions: failedSends.length + failedSigs.length,
        signingTime,
        broadcastTime,
        totalTime: Date.now() - signingStart,
        averageTimePerTx: (Date.now() - signingStart) / tokenList.length
    };
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}



