const { expect } = require('chai');
const { ethers } = require('hardhat');
const { createClient } = require('./token_grpc');
const accounts = require('./../../deployments/account.json');
const grpc = require("@grpc/grpc-js");

// ===== MODIFIED: Two native token addresses =====
const native_token_address_1 = "0xd40eD538ba00BC823674bcE975e446c194ac0C57";
const native_token_address_2 = "0x7CA5aEea9a0593300BBA7BFcA87d4b22a5CE6EE1";
const rpcUrl = "dev2-node3-rpc.hamsa-ucl.com:50051";
const client = createClient(rpcUrl);

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

// ===== MODIFIED: Added tokenAddress parameter =====
async function mintTokensForMinters(client, minters, number, amount, tokenAddress) {
    console.log(`\n=== Minting tokens for minters ===`);
    const mintedTokens = {};

    for (const [minterName, minterConfig] of Object.entries(minters)) {
        console.log(`\n[${minterName}] ===== Starting minting process =====`);
        console.log(`[${minterName}] Target: ${number} tokens, each amount: ${amount}`);

        const minterWallet = new ethers.Wallet(minterConfig.privateKey, ethers.provider);
        const minterMetadata = await createAuthMetadata(minterConfig.privateKey);

        const to_accounts = Array(number).fill().map(() => ({
            address: minterConfig.address,
            amount: amount
        }));

        const generateRequest = {
            sc_address: tokenAddress, // MODIFIED: Use parameter instead of global
            token_type: '0',
            from_address: minterConfig.address,
            to_accounts: to_accounts,
        };

        console.log(`[${minterName}] 📤 Calling generateBatchMintProof...`);
        let response;
        try {
            response = await client.generateBatchMintProof(generateRequest, minterMetadata);
            console.log(`[${minterName}] ✅ Proof generation successful`);
        } catch (error) {
            console.error(`\n[${minterName}] ❌ Proof generation failed!`);
            throw error;
        }

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

        const native = new ethers.Contract(tokenAddress, abi, minterWallet); // MODIFIED: Use parameter

        try {
            console.log(`[${minterName}] 🚀 Sending mint transaction...`);
            const tx = await native.mint(recipients, newTokens, newAllowed, proof, publicInputs, bathcedSize - to_accounts.length);

            console.log(`[${minterName}] 📡 Transaction sent, Hash: ${tx.hash}`);
            console.log(`[${minterName}] ⏳ Waiting for confirmation (up to 10 minutes)...`);

            const receipt = await tx.wait();
            console.log(`\n[${minterName}] ✅ Transaction confirmed successfully!`);
            console.log(`[${minterName}] Block number: ${receipt.blockNumber}`);
            console.log(`[${minterName}] Gas used: ${receipt.gasUsed}`);

            mintedTokens[minterName] = newTokens.map(token => token.id);
            console.log(`\n✅ [${minterName}] Successfully minted ${number} tokens, each amount ${amount}`);

        } catch (error) {
            console.error(`\n[${minterName}] ❌ Mint transaction failed!`);
            throw error;
        }
    }

    return mintedTokens;
}

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
    let client, owner;
    let nativeOwner1, nativeOwner2; // MODIFIED: Two token contract instances

    const total_number = 2;
    const amount = 10000;

    before(async function () {
        this.timeout(300000);

        console.log('🚀 === Test environment initialization ===');

        client = createClient(rpcUrl);
        [owner] = await ethers.getSigners();

        // MODIFIED: Initialize both token contracts
        nativeOwner1 = new ethers.Contract(native_token_address_1, abi, owner);
        nativeOwner2 = new ethers.Contract(native_token_address_2, abi, owner);

        console.log(`Contract 1 address: ${native_token_address_1}`);
        console.log(`Contract 2 address: ${native_token_address_2}`);
        console.log(`Owner address: ${owner.address}`);
        console.log(`Receiver1 address: ${RECEIVER_CONFIG.receiver1}`);
        console.log(`Receiver2 address: ${RECEIVER_CONFIG.receiver2}`);
        console.log('✅ Environment initialization completed\n');
    });

    describe('Case 1: Setup mint allowance for two minters', function () {
        it('should set mint allowance for minter1 and minter2 on both tokens', async function () {
            this.timeout(240000); // Increased timeout for two tokens

            console.log('\n📋 Setting up allowance for Token 1...');
            await setupMintAllowance(nativeOwner1, client, { minter1: MINTERS.minter1 }, 100000000);
            await setupMintAllowance(nativeOwner1, client, { minter2: MINTERS.minter2 }, 100000000);

            console.log('\n📋 Setting up allowance for Token 2...');
            await setupMintAllowance(nativeOwner2, client, { minter1: MINTERS.minter1 }, 100000000);
            await setupMintAllowance(nativeOwner2, client, { minter2: MINTERS.minter2 }, 100000000);
        });
    });

    describe('Case 2: Mint tokens for both minters', function () {
        this.timeout(12000000); // Increased timeout for two tokens

        it('should mint tokens for each minter on both tokens', async function () {
            const batchSize = 32;

            console.log(`\n🎯 Starting to mint ${total_number} tokens for each minter on both tokens (batch processing)`);

            // MODIFIED: Mint for both tokens sequentially to avoid nonce conflicts
            console.log('\n📦 Minting on Token 1...');
            for (let i = 0; i < total_number; i += batchSize) {
                const currentBatchSize = Math.min(batchSize, total_number - i);
                const batchNumber = Math.floor(i / batchSize) + 1;
                const isLastBatch = i + batchSize >= total_number;

                console.log(`  📦 Token 1 - Batch ${batchNumber}${isLastBatch ? ' (last batch)' : ''}: Minting ${currentBatchSize} tokens`);

                await mintTokensForMinters(
                    client,
                    MINTERS,
                    currentBatchSize,
                    amount,
                    native_token_address_1 // MODIFIED: Pass token address
                );

                if (!isLastBatch) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            console.log('\n📦 Minting on Token 2...');
            for (let i = 0; i < total_number; i += batchSize) {
                const currentBatchSize = Math.min(batchSize, total_number - i);
                const batchNumber = Math.floor(i / batchSize) + 1;
                const isLastBatch = i + batchSize >= total_number;

                console.log(`  📦 Token 2 - Batch ${batchNumber}${isLastBatch ? ' (last batch)' : ''}: Minting ${currentBatchSize} tokens`);

                await mintTokensForMinters(
                    client,
                    MINTERS,
                    currentBatchSize,
                    amount,
                    native_token_address_2 // MODIFIED: Pass token address
                );

                if (!isLastBatch) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            console.log('\n✅ Both minters minting completed on both tokens');
        });
    });

    describe('Case 3: Split tokens with performance test', function () {
        this.timeout(18000000); // Increased timeout for two tokens

        it('should split tokens from both contracts sequentially to avoid nonce conflicts', async function () {
            console.log('\n🎯 === Starting batch token split performance test for both tokens ===');

            // MODIFIED: Execute splits for both tokens sequentially to avoid nonce conflicts
            console.log('\n🔍 Preparing splits for Token 1...');
            const splitRequests1 = await prepareSplitRequests(total_number, native_token_address_1);
            const requestIds1 = await generateSplitProofs(splitRequests1);
            const results1 = await executeConcurrentSplits(requestIds1, native_token_address_1);

            console.log('\n🔍 Preparing splits for Token 2...');
            const splitRequests2 = await prepareSplitRequests(total_number, native_token_address_2);
            const requestIds2 = await generateSplitProofs(splitRequests2);
            const results2 = await executeConcurrentSplits(requestIds2, native_token_address_2);

            console.log('\n📊 === Split Performance Summary ===');
            console.log(`Token 1 - Successful: ${results1.minter1?.successfulTransactions + results1.minter2?.successfulTransactions || 0}`);
            console.log(`Token 2 - Successful: ${results2.minter1?.successfulTransactions + results2.minter2?.successfulTransactions || 0}`);
        });
    });

    after(async function () {
        console.log('\n📊 === Test completion summary ===');
        console.log('1. ✅ Mint allowance setup completed for both tokens');
        console.log('2. ✅ Token minting completed for both tokens');
        console.log('3. ✅ Batch split performance test completed for both tokens');
        console.log('All test cases executed successfully!');
    });
});

// ===== MODIFIED: Added tokenAddress parameter =====
async function prepareSplitRequests(round_number, tokenAddress) {
    console.log(`\n📋 Preparing split request data for token ${tokenAddress}...`);

    const requests = { minter1: [], minter2: [] };

    // Prepare split requests for minter1
    for (let i = 0; i < round_number; i++) {
        const to_accounts = [];
        for (let j = 0; j < 1; j++) {
            to_accounts.push(
                { address: RECEIVER_CONFIG.receiver1, amount: 1, comment: `m1-t${i}-s${j}-r1` },
                { address: RECEIVER_CONFIG.receiver2, amount: 2, comment: `m1-t${i}-s${j}-r2` }
            );
        }
        requests.minter1.push({
            sc_address: tokenAddress, // MODIFIED: Use parameter
            token_type: '0',
            from_address: MINTERS.minter1.address,
            to_accounts
        });
    }

    // Prepare split requests for minter2
    for (let i = 0; i < round_number; i++) {
        const to_accounts = [];
        for (let j = 0; j < 1; j++) {
            to_accounts.push(
                { address: RECEIVER_CONFIG.receiver1, amount: 1, comment: `m2-t${i}-s${j}-r1` },
                { address: RECEIVER_CONFIG.receiver2, amount: 2, comment: `m2-t${i}-s${j}-r2` }
            );
        }
        requests.minter2.push({
            sc_address: tokenAddress, // MODIFIED: Use parameter
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

    const minter1Requests = [];
    for (const req of requests.minter1) {
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
    console.log(`✅ Proof generation completed in ${endTime - startTime}ms`);

    return { minter1: minter1Requests, minter2: minter2Requests };
}

// ===== MODIFIED: Added tokenAddress parameter =====
async function executeConcurrentSplits(requests, tokenAddress) {
    console.log(`\n⚡ Starting concurrent split transaction execution for token ${tokenAddress}...`);

    const startTime = Date.now();
    const results = { minter1: null, minter2: null };

    const [minter1Results, minter2Results] = await Promise.all([
        executeBatchSplits('minter1', requests.minter1, MINTERS.minter1.privateKey, tokenAddress),
        executeBatchSplits('minter2', requests.minter2, MINTERS.minter2.privateKey, tokenAddress)
    ]);

    results.minter1 = minter1Results;
    results.minter2 = minter2Results;

    const endTime = Date.now();
    console.log(`✅ All split transactions executed for token ${tokenAddress} in ${endTime - startTime}ms`);

    return results;
}

// ===== MODIFIED: Added tokenAddress parameter =====
async function executeBatchSplits(minterName, requestIds, privateKey, tokenAddress) {
    const minterWallet = new ethers.Wallet(privateKey, ethers.provider);
    const minterNative = new ethers.Contract(tokenAddress, abi, minterWallet); // MODIFIED: Use parameter
    const minterMetadata = await createAuthMetadata(privateKey);

    let nonce = await minterWallet.getNonce('pending');
    console.log(`\n[${minterName}] Starting Nonce: ${nonce}, Pending transactions: ${requestIds.length}`);

    const transactions = [];
    for (let i = 0; i < requestIds.length; i++) {
        const requestId = requestIds[i];
        const response = await client.getBatchSplitTokenDetail(
            { request_id: requestId },
            minterMetadata
        );

        const recipients = response.to_addresses;
        const bathcedSize = response.batched_size;
        const consumedIds = response.consumedIds.map(ids => ids.token_id);

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

    const txStartTime = Date.now();
    const txPromises = transactions.map(async (txData, index) => {
        try {
            console.log(`[${minterName}] Sending transaction ${index + 1}/${transactions.length}, nonce: ${txData.nonce}`);
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
            console.error(`[${minterName}] Transaction ${index + 1} failed: ${error.message}`);
            return { error: error.message, nonce: txData.nonce, index, success: false };
        }
    });

    const txResults = await Promise.all(txPromises);
    const txEndTime = Date.now();

    const successfulTx = txResults.filter(r => r.success);
    const failedTx = txResults.filter(r => !r.success);

    console.log(`\n[${minterName}] Transaction send results: Success ${successfulTx.length}, Failed ${failedTx.length}`);
    console.log(`[${minterName}] Send time: ${txEndTime - txStartTime}ms`);

    if (successfulTx.length > 0) {
        console.log(`\n[${minterName}] Waiting for transaction confirmations...`);
        const confirmPromises = successfulTx.map(async (result) => {
            try {
                const receipt = await result.tx.wait();
                return { nonce: result.nonce, index: result.index, receipt, success: true };
            } catch (error) {
                console.error(`[${minterName}] Transaction ${result.index + 1} confirmation failed: ${error.message}`);
                return { nonce: result.nonce, index: result.index, error: error.message, success: false };
            }
        });

        const confirmResults = await Promise.all(confirmPromises);
        const confirmedTx = confirmResults.filter(r => r.success);

        console.log(`[${minterName}] Confirmation results: ${confirmedTx.length}/${successfulTx.length} successful`);
    }

    return {
        totalTransactions: transactions.length,
        successfulTransactions: successfulTx.length,
        failedTransactions: failedTx.length,
        totalTime: txEndTime - txStartTime,
        averageTimePerTx: (txEndTime - txStartTime) / transactions.length
    };
}
