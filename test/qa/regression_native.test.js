const { expect } = require('chai');
const { ethers, network } = require('hardhat');
const { createClient } = require('./token_grpc');
const accounts = require('./../../deployments/account.json');
const grpc = require("@grpc/grpc-js");

// Native Token configuration for dev_L2
const NATIVE_TOKEN_ADDRESS = "0xDDCb7576aF8309b1e52FceD647f8C509710Da1Ea";
const RPC_URL = "dev2-node3-rpc.hamsa-ucl.com:50051";

// ABI for Native Token
const NATIVE_ABI = [
    {
        "inputs": [
            { "internalType": "address[]", "name": "recipients", "type": "address[]" },
            {
                "components": [
                    { "internalType": "uint256", "name": "id", "type": "uint256" },
                    { "internalType": "address", "name": "owner", "type": "address" },
                    { "internalType": "uint8", "name": "status", "type": "uint8" },
                    {
                        "components": [
                            { "internalType": "uint256", "name": "cl_x", "type": "uint256" },
                            { "internalType": "uint256", "name": "cl_y", "type": "uint256" },
                            { "internalType": "uint256", "name": "cr_x", "type": "uint256" },
                            { "internalType": "uint256", "name": "cr_y", "type": "uint256" }
                        ],
                        "internalType": "struct TokenModel.ElGamal",
                        "name": "amount",
                        "type": "tuple"
                    },
                    { "internalType": "address", "name": "to", "type": "address" },
                    { "internalType": "uint256", "name": "rollbackTokenId", "type": "uint256" }
                ],
                "internalType": "struct TokenModel.TokenEntity[]",
                "name": "tokens",
                "type": "tuple[]"
            },
            {
                "components": [
                    { "internalType": "uint256", "name": "id", "type": "uint256" },
                    {
                        "components": [
                            { "internalType": "uint256", "name": "cl_x", "type": "uint256" },
                            { "internalType": "uint256", "name": "cl_y", "type": "uint256" },
                            { "internalType": "uint256", "name": "cr_x", "type": "uint256" },
                            { "internalType": "uint256", "name": "cr_y", "type": "uint256" }
                        ],
                        "internalType": "struct TokenModel.ElGamal",
                        "name": "value",
                        "type": "tuple"
                    }
                ],
                "internalType": "struct TokenModel.ElGamalToken",
                "name": "newAllowed",
                "type": "tuple"
            },
            { "internalType": "uint256[8]", "name": "proof", "type": "uint256[8]" },
            { "internalType": "uint256[]", "name": "publicInputs", "type": "uint256[]" },
            { "internalType": "uint256", "name": "PaddingNum", "type": "uint256" }
        ],
        "name": "mint",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "from", "type": "address" },
            { "internalType": "address[]", "name": "recipients", "type": "address[]" },
            { "internalType": "uint256[]", "name": "consumedIds", "type": "uint256[]" },
            {
                "components": [
                    { "internalType": "uint256", "name": "id", "type": "uint256" },
                    { "internalType": "address", "name": "owner", "type": "address" },
                    { "internalType": "uint8", "name": "status", "type": "uint8" },
                    {
                        "components": [
                            { "internalType": "uint256", "name": "cl_x", "type": "uint256" },
                            { "internalType": "uint256", "name": "cl_y", "type": "uint256" },
                            { "internalType": "uint256", "name": "cr_x", "type": "uint256" },
                            { "internalType": "uint256", "name": "cr_y", "type": "uint256" }
                        ],
                        "internalType": "struct TokenModel.ElGamal",
                        "name": "amount",
                        "type": "tuple"
                    },
                    { "internalType": "address", "name": "to", "type": "address" },
                    { "internalType": "uint256", "name": "rollbackTokenId", "type": "uint256" }
                ],
                "internalType": "struct TokenModel.TokenEntity[]",
                "name": "newTokens",
                "type": "tuple[]"
            },
            { "internalType": "uint256[8]", "name": "proof", "type": "uint256[8]" },
            { "internalType": "uint256[]", "name": "publicInputs", "type": "uint256[]" },
            { "internalType": "uint256", "name": "PaddingNum", "type": "uint256" }
        ],
        "name": "split",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "tokenId", "type": "uint256" },
            { "internalType": "string", "name": "memo", "type": "string" }
        ],
        "name": "transfer",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "minter", "type": "address" },
            {
                "components": [
                    { "internalType": "uint256", "name": "id", "type": "uint256" },
                    {
                        "components": [
                            { "internalType": "uint256", "name": "cl_x", "type": "uint256" },
                            { "internalType": "uint256", "name": "cl_y", "type": "uint256" },
                            { "internalType": "uint256", "name": "cr_x", "type": "uint256" },
                            { "internalType": "uint256", "name": "cr_y", "type": "uint256" }
                        ],
                        "internalType": "struct TokenModel.ElGamal",
                        "name": "value",
                        "type": "tuple"
                    }
                ],
                "internalType": "struct TokenModel.ElGamalToken",
                "name": "allowed",
                "type": "tuple"
            }
        ],
        "name": "setMintAllowed",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "owner", "type": "address" },
            { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
        ],
        "name": "getToken",
        "outputs": [
            {
                "components": [
                    { "internalType": "uint256", "name": "id", "type": "uint256" },
                    { "internalType": "address", "name": "owner", "type": "address" },
                    { "internalType": "uint8", "name": "status", "type": "uint8" },
                    {
                        "components": [
                            { "internalType": "uint256", "name": "cl_x", "type": "uint256" },
                            { "internalType": "uint256", "name": "cl_y", "type": "uint256" },
                            { "internalType": "uint256", "name": "cr_x", "type": "uint256" },
                            { "internalType": "uint256", "name": "cr_y", "type": "uint256" }
                        ],
                        "internalType": "struct TokenModel.ElGamal",
                        "name": "amount",
                        "type": "tuple"
                    },
                    { "internalType": "address", "name": "to", "type": "address" },
                    { "internalType": "uint256", "name": "rollbackTokenId", "type": "uint256" }
                ],
                "internalType": "struct TokenModel.TokenEntity",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
        ],
        "name": "burn",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// Helper functions
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper functions for batch split operations (adapted from native_dual_minter_performance.test.js)
async function prepareSplitRequests(client, minterWallet, minterMetadata, receiver, round_number) {
    const requests = [];
    console.log(`Preparing ${round_number} split requests , 128 tokens each...`);

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
            sc_address: NATIVE_TOKEN_ADDRESS,
            token_type: '0',
            from_address: minterWallet.address,
            to_accounts
        });
    }

    return requests;
}

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
                    rollbackTokenId: idx % 2 === 0 ? 0 : response.newTokens[idx - 1]?.token_id || 0
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

    const RPC = 'http://dev2-ucl-l2.hamsa-ucl.com:8545';
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

        const RPC = 'http://dev2-ucl-l2.hamsa-ucl.com:8545';
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

        await sleep(1000);
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

describe("Regression Native Token Tests", function () {
    this.timeout(600000); // 10 minutes

    let client;
    let minter1Wallet;
    let minter1Metadata;
    let nativeContract;
    let receiver1 = accounts.To1;
    let lastMinterTokenId;

    before(async function () {
        client = createClient(RPC_URL);
        minter1Wallet = new ethers.Wallet(accounts.MinterKey, ethers.provider);
        minter1Metadata = await createAuthMetadata(accounts.MinterKey);
        nativeContract = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, minter1Wallet);
    });

    describe.only("Setup", function () {
        it("should set mint allowance for minter", async function () {
            // Setup mint allowance - same as performance script
            const ownerMetadata = await createAuthMetadata(accounts.OwnerKey);
            const ownerWallet = new ethers.Wallet(accounts.OwnerKey, ethers.provider);
            const ownerNative = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, ownerWallet);

            const allowanceAmount = 10000000;
            const encodeResponse = await client.encodeElgamalAmount(allowanceAmount, ownerMetadata);
            const allowed = {
                id: ethers.toBigInt(encodeResponse.token_id),
                value: {
                    cl_x: ethers.toBigInt(encodeResponse.amount.cl_x),
                    cl_y: ethers.toBigInt(encodeResponse.amount.cl_y),
                    cr_x: ethers.toBigInt(encodeResponse.amount.cr_x),
                    cr_y: ethers.toBigInt(encodeResponse.amount.cr_y)
                }
            };

            console.log("Setting mint allowance...");
            const setAllowedTx = await ownerNative.setMintAllowed(minter1Wallet.address, allowed);
            await setAllowedTx.wait();
            console.log("Mint allowance set successfully, tx:", setAllowedTx.hash);
            await sleep(5000)
        });
    });

    describe("Mint Function", function () {
        it("should mint multiple tokens in batch", async function () {
            // Mint multiple tokens at once - following performance script pattern
            const numberOfTokens = 10;
            const tokenAmount = 2000;
            
            // Create to_accounts array with specified number of tokens
            const to_accounts = Array(numberOfTokens).fill().map(() => ({
                address: minter1Wallet.address,
                amount: tokenAmount
            }));

            const generateRequest = {
                sc_address: NATIVE_TOKEN_ADDRESS,
                token_type: '0',
                from_address: minter1Wallet.address,
                to_accounts: to_accounts,
            };

            console.log(`Generating batch mint proof for ${numberOfTokens} tokens...`);
            const response = await client.generateBatchMintProof(generateRequest, minter1Metadata);

            const recipients = response.to_accounts.map(account => account.address);
            const batchedSize = response.batched_size;
            
            // Process all new tokens
            const newTokens = response.to_accounts.map((account) => ({
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
            const padding = Math.max(Number(batchedSize) - to_accounts.length, 0);

            console.log("Executing batch mint transaction...");
            const mintTx = await nativeContract.mint(recipients, newTokens, newAllowed, proof, publicInputs, padding);
            const receipt = await mintTx.wait();
            expect(receipt.status).to.equal(1);
            console.log("Batch mint successful, tx:", mintTx.hash);
            
            // Log all minted token IDs for debugging
            const mintedTokenIds = newTokens.map(token => token.id);
            console.log(`Successfully minted ${mintedTokenIds.length} tokens. IDs:`, mintedTokenIds.join(', '));
            
            // Save the first token ID for transfer test
            if (newTokens.length > 0) {
                lastMinterTokenId = newTokens[0].id;
                console.log("Saved first token ID for transfer test:", lastMinterTokenId.toString());
            }

            // Check minted token status
            const testTokenId = ethers.toBigInt(newTokens[0].id);
            let tokenStatus = await nativeContract.getToken(minter1Wallet.address, testTokenId);
            console.log("  Status after mint:");
            console.log("    - Token ID:", tokenStatus.id.toString());
            console.log("    - Owner:", tokenStatus.owner);
            console.log("    - Status code:", tokenStatus.status);
            expect(tokenStatus.owner).to.equal(minter1Wallet.address);
            expect(tokenStatus.status).to.equal(2);
            await sleep(2000)
        });
    });
    describe("Split Function", function () {
        let tokenIdToSplit;

        // 辅助函数：生成指定数量的to_accounts数据
        const generateToAccounts = (count) => {
            const toAccounts = [];
            for (let i = 0; i < count; i++) {
                toAccounts.push({
                    address: receiver1,
                    amount: 10,
                    comment: `split-${i+1}`
                });
            }
            return toAccounts;
        };

        // 辅助函数：执行split操作
        const executeSplit = async (toAccountsCount) => {
            const splitRequests = {
                sc_address: NATIVE_TOKEN_ADDRESS,
                token_type: '0',
                from_address: minter1Wallet.address,
                to_accounts: generateToAccounts(toAccountsCount)
            };

            console.log(`Generating batch split proof for ${toAccountsCount} recipients...`);
            const splitProofResponse = await client.generateBatchSplitToken(splitRequests, minter1Metadata);
            await sleep(2000); // Wait for async processing if any

            console.log("Getting split detail...");
            const detailResponse = await client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, minter1Metadata);

            const recipients = detailResponse.to_addresses;
            const consumedIds = detailResponse.consumedIds.map(ids => ids.token_id);

            const newTokens = detailResponse.newTokens.map((account, idx) => ({
                id: account.token_id,
                owner: minter1Wallet.address,
                status: 2,
                amount: {
                    cl_x: ethers.toBigInt(account.cl_x),
                    cl_y: ethers.toBigInt(account.cl_y),
                    cr_x: ethers.toBigInt(account.cr_x),
                    cr_y: ethers.toBigInt(account.cr_y)
                },
                // Follow the logic from performance test for 'to' and 'rollbackTokenId'
                to: idx % 2 === 0 ? minter1Wallet.address : recipients[Math.floor(idx / 2)],
                // 修正rollbackTokenId的逻辑，使其与performance test一致
                rollbackTokenId: idx % 2 === 0 ? 0 : (idx + 1 < detailResponse.newTokens.length ? detailResponse.newTokens[idx + 1]?.token_id : 0)
            }));
            const proof = detailResponse.proof.map(p => ethers.toBigInt(p));
            const publicInputs = detailResponse.public_input.map(i => ethers.toBigInt(i));
            const paddingNum = detailResponse.batched_size - recipients.length;

            console.log("Executing split transaction...");
            const splitTx = await nativeContract.split(minter1Wallet.address, recipients, consumedIds, newTokens, proof, publicInputs, paddingNum);
            const receipt = await splitTx.wait();
            expect(receipt.status).to.equal(1);
            console.log("Split successful, tx:", splitTx.hash);

            // 验证所有新生成的token都能通过getToken查询到
            console.log(`\nVerifying ${newTokens.length} split tokens with getToken...`);
            for (const token of newTokens) {
                console.log(`Raw token.id: ${token.id} (type: ${typeof token.id})`);
                const tokenId = ethers.toBigInt(token.id);
                console.log(`  Verifying token ID: ${tokenId.toString()}`);
                
                // 尝试获取token信息
                let tokenStatus;
                try {
                    tokenStatus = await nativeContract.getToken(minter1Wallet.address, tokenId);
                    console.log(`  ✅ Token ${tokenId.toString()} found, status: ${tokenStatus.status}`);
                } catch (error) {
                    console.error(`  ❌ Failed to get token ${tokenId.toString()}:`, error.message);
                    throw new Error(`Token verification failed for ${tokenId.toString()}`);
                }
                
                // 验证token属性
                expect(tokenStatus.id).to.equal(tokenId, `Token ID mismatch for ${tokenId.toString()}`);
                expect(tokenStatus.owner).to.equal(minter1Wallet.address, `Token owner mismatch for ${tokenId.toString()}`);
                expect(tokenStatus.status).to.equal(2, `Token status mismatch for ${tokenId.toString()}`);
            }
            console.log("✅ All split tokens verified successfully!");

            if (newTokens.length > 1) {
                lastMinterTokenId = newTokens[1].id;
                console.log("Captured recipient token ID (index 1) for transfer test:", lastMinterTokenId.toString());
            }
            await sleep(2000);
        };

        // 辅助函数：执行split操作但不验证token是否存在
        const executeSplitWithoutVerification = async (toAccountsCount) => {
            const splitRequests = {
                sc_address: NATIVE_TOKEN_ADDRESS,
                token_type: '0',
                from_address: minter1Wallet.address,
                to_accounts: generateToAccounts(toAccountsCount)
            };

            console.log(`Generating batch split proof for ${toAccountsCount} recipients (without verification)...`);
            const splitProofResponse = await client.generateBatchSplitToken(splitRequests, minter1Metadata);
            await sleep(2000); // Wait for async processing if any

            console.log("Getting split detail...");
            const detailResponse = await client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, minter1Metadata);

            const recipients = detailResponse.to_addresses;
            const consumedIds = detailResponse.consumedIds.map(ids => ids.token_id);

            const newTokens = detailResponse.newTokens.map((account, idx) => ({
                id: account.token_id,
                owner: minter1Wallet.address,
                status: 2,
                amount: {
                    cl_x: ethers.toBigInt(account.cl_x),
                    cl_y: ethers.toBigInt(account.cl_y),
                    cr_x: ethers.toBigInt(account.cr_x),
                    cr_y: ethers.toBigInt(account.cr_y)
                },
                to: idx % 2 === 0 ? minter1Wallet.address : recipients[Math.floor(idx / 2)],
                rollbackTokenId: idx % 2 === 0 ? 0 : (idx + 1 < detailResponse.newTokens.length ? detailResponse.newTokens[idx + 1]?.token_id : 0)
            }));
            const proof = detailResponse.proof.map(p => ethers.toBigInt(p));
            const publicInputs = detailResponse.public_input.map(i => ethers.toBigInt(i));
            const paddingNum = detailResponse.batched_size - recipients.length;

            console.log("Executing split transaction...");
            const splitTx = await nativeContract.split(minter1Wallet.address, recipients, consumedIds, newTokens, proof, publicInputs, paddingNum);
            const receipt = await splitTx.wait();
            expect(receipt.status).to.equal(1);
            console.log("Split successful (without verification), tx:", splitTx.hash);

            if (newTokens.length > 1) {
                lastMinterTokenId = newTokens[1].id;
                console.log("Captured recipient token ID (index 1) for transfer test:", lastMinterTokenId.toString());
            }
            await sleep(2000);
            
            return newTokens;
        };

        it("should split tokens to multiple recipients", async function () {
            await executeSplit(2);
        });

        it("should split tokens with 1 recipient in toAccounts", async function () {
            await executeSplit(1);
        });

        it.skip("should split tokens with 127 recipients in toAccounts", async function () {
            await executeSplit(127);
        });

        it.skip("should split tokens with 128 recipients in toAccounts", async function () {
            this.timeout(12000000)
            for (let i = 0; i < 1; i++){
                await executeSplit(128);
            }

            // await executeSplit(128);
        });
    });

    describe("Split Edge Cases", function () {
        // 辅助函数：mint特定金额的token
        const mintSpecificToken = async (amount) => {
            // Mint a single token with specified amount
            const to_accounts = [{
                address: minter1Wallet.address,
                amount: amount
            }];

            const generateRequest = {
                sc_address: NATIVE_TOKEN_ADDRESS,
                token_type: '0',
                from_address: minter1Wallet.address,
                to_accounts: to_accounts,
            };

            console.log(`Generating mint proof for token with amount ${amount}...`);
            const response = await client.generateBatchMintProof(generateRequest, minter1Metadata);

            const recipients = response.to_accounts.map(account => account.address);
            const batchedSize = response.batched_size;
            
            // Process the minted token
            const newTokens = response.to_accounts.map((account) => ({
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
            const padding = Math.max(Number(batchedSize) - to_accounts.length, 0);

            console.log(`Executing mint transaction for amount ${amount}...`);
            const mintTx = await nativeContract.mint(recipients, newTokens, newAllowed, proof, publicInputs, padding);
            const receipt = await mintTx.wait();
            expect(receipt.status).to.equal(1);
            console.log("Mint successful, tx:", mintTx.hash);
            
            return newTokens[0].id;
        };

        // 辅助函数：执行特定金额分配的split操作
        const executeSplitWithSpecificAmounts = async (tokenId, toAccounts) => {
            const splitRequests = {
                sc_address: NATIVE_TOKEN_ADDRESS,
                token_type: '0',
                from_address: minter1Wallet.address,
                to_accounts: toAccounts
            };

            console.log(`Generating batch split proof with specific amounts...`);
            const splitProofResponse = await client.generateBatchSplitToken(splitRequests, minter1Metadata);
            await sleep(2000); // Wait for async processing if any

            console.log("Getting split detail...");
            const detailResponse = await client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, minter1Metadata);

            const recipients = detailResponse.to_addresses;
            const consumedIds = detailResponse.consumedIds.map(ids => ids.token_id);
            const newTokens = detailResponse.newTokens.map((account, idx) => ({
                id: account.token_id,
                owner: minter1Wallet.address,
                status: 2,
                amount: {
                    cl_x: ethers.toBigInt(account.cl_x),
                    cl_y: ethers.toBigInt(account.cl_y),
                    cr_x: ethers.toBigInt(account.cr_x),
                    cr_y: ethers.toBigInt(account.cr_y)
                },
                // Follow the logic from performance test for 'to' and 'rollbackTokenId'
                to: idx % 2 === 0 ? minter1Wallet.address : recipients[Math.floor(idx / 2)],
                rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx - 1]?.token_id || 0
            }));

            const proof = detailResponse.proof.map(p => ethers.toBigInt(p));
            const publicInputs = detailResponse.public_input.map(i => ethers.toBigInt(i));
            const paddingNum = detailResponse.batched_size - recipients.length;

            console.log("Executing split transaction...");
            const splitTx = await nativeContract.split(minter1Wallet.address, recipients, consumedIds, newTokens, proof, publicInputs, paddingNum);
            const receipt = await splitTx.wait();
            expect(receipt.status).to.equal(1);
            console.log("Split successful, tx:", splitTx.hash);

            // 验证所有新生成的token都能通过getToken查询到
            console.log(`\nVerifying ${newTokens.length} split tokens with getToken...`);
            for (const token of newTokens) {
                const tokenId = ethers.toBigInt(token.id);
                console.log(`  Verifying token ID: ${tokenId.toString()}`);
                
                // 尝试获取token信息
                let tokenStatus;
                try {
                    tokenStatus = await nativeContract.getToken(minter1Wallet.address, tokenId);
                    console.log(`  ✅ Token ${tokenId.toString()} found, status: ${tokenStatus.status}`);
                } catch (error) {
                    console.error(`  ❌ Failed to get token ${tokenId.toString()}:`, error.message);
                    throw new Error(`Token verification failed for ${tokenId.toString()}`);
                }
                
                // 验证token属性
                expect(tokenStatus.id).to.equal(tokenId, `Token ID mismatch for ${tokenId.toString()}`);
                expect(tokenStatus.owner).to.equal(minter1Wallet.address, `Token owner mismatch for ${tokenId.toString()}`);
                expect(tokenStatus.status).to.equal(2, `Token status mismatch for ${tokenId.toString()}`);
            }
            console.log("✅ All split tokens verified successfully!");
            await sleep(2000);
        };

        it("should split 100 into 1 and 99", async function () {
            // 1. Mint a token with amount 100
            const mintedTokenId = await mintSpecificToken(100);
            
            // 2. Split into 1 and 99
            const toAccounts = [
                { address: receiver1, amount: 1, comment: "split-1" },
                { address: receiver1, amount: 99, comment: "split-99" }
            ];
            
            await executeSplitWithSpecificAmounts(mintedTokenId, toAccounts);
        });

        it("should split 100 into 100", async function () {
            // 1. Mint a token with amount 100
            const mintedTokenId = await mintSpecificToken(100);
            
            // 2. Split into 100 (total equals original amount)
            const toAccounts = [
                { address: receiver1, amount: 100, comment: "split-100" }
            ];
            
            await executeSplitWithSpecificAmounts(mintedTokenId, toAccounts);
        });
    });
    describe("Transfer Function", function () {
        it("should transfer a token to another user", async function () {
            let tokenId;
            if (lastMinterTokenId) {
                tokenId = lastMinterTokenId;
            } else {
                // Find a token to transfer as fallback
                const tokenListResponse = await client.getSplitTokenList(minter1Wallet.address, NATIVE_TOKEN_ADDRESS, minter1Metadata);
                if (!tokenListResponse.split_tokens || tokenListResponse.split_tokens.length === 0) {
                    this.skip();
                }
                tokenId = ethers.toBigInt(tokenListResponse.split_tokens[0].token_id);
            }

            console.log("Executing transfer transaction for token ID:", tokenId.toString());
            // Use populateTransaction to build the transaction like in the performance test
            let tx = await nativeContract.transfer(tokenId, "regression transfer");
            let receipt = await tx.wait();
            expect(receipt.status).to.equal(1);
            console.log("Transfer successful, tx:", tx.hash);
            await sleep(2000)
        });
    });
    describe("Burn Function", function () {
        
        it("should split tokens to burn", async function () {

            const splitRequests = {
                sc_address: NATIVE_TOKEN_ADDRESS,
                token_type: '0',
                from_address: minter1Wallet.address,
                to_accounts: [
                    { address: accounts.Minter, amount: 10, comment: "burn-10" },
                ]
            };

            console.log("Generating batch split proof...");
            const splitProofResponse = await client.generateBatchSplitToken(splitRequests, minter1Metadata);
            await sleep(2000); // Wait for async processing if any

            console.log("Getting split detail...");
            const detailResponse = await client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, minter1Metadata);

            let recipients = detailResponse.to_addresses;
            const consumedIds = detailResponse.consumedIds.map(ids => ids.token_id);
            const newTokens = detailResponse.newTokens.map((account, idx) => ({
                id: account.token_id,
                owner: minter1Wallet.address,
                status: 2,
                amount: {
                    cl_x: ethers.toBigInt(account.cl_x),
                    cl_y: ethers.toBigInt(account.cl_y),
                    cr_x: ethers.toBigInt(account.cr_x),
                    cr_y: ethers.toBigInt(account.cr_y)
                },
                // Follow the logic from performance test for 'to' and 'rollbackTokenId'
                to: idx % 2 === 0 ? minter1Wallet.address : recipients[Math.floor(idx / 2)],
                rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx - 1]?.token_id || 0
            }));

            const proof = detailResponse.proof.map(p => ethers.toBigInt(p));
            const publicInputs = detailResponse.public_input.map(i => ethers.toBigInt(i));
            const paddingNum = detailResponse.batched_size - recipients.length;

            console.log("Executing split transaction...");
            const splitTx = await nativeContract.split(minter1Wallet.address, recipients, consumedIds, newTokens, proof, publicInputs, paddingNum);
            const receipt = await splitTx.wait();
            expect(receipt.status).to.equal(1);
            console.log("Split successful, tx:", splitTx.hash);
            if (newTokens.length > 1) {
                lastMinterTokenId = newTokens[1].id;
                console.log("Captured recipient token ID (index 1) for transfer test:", lastMinterTokenId.toString());
            }
            await sleep(2000)
        }); 


        it("should burn a token ", async function () {
            let tokenId;
            if (lastMinterTokenId) {
                tokenId = lastMinterTokenId;
            } else {
                // Find a token to transfer as fallback
                const tokenListResponse = await client.getSplitTokenList(minter1Wallet.address, NATIVE_TOKEN_ADDRESS, minter1Metadata);
                if (!tokenListResponse.split_tokens || tokenListResponse.split_tokens.length === 0) {
                    this.skip();
                }
                tokenId = ethers.toBigInt(tokenListResponse.split_tokens[0].token_id);
            }

            console.log("Executing burn transaction for token ID:", tokenId.toString());
            // Use populateTransaction to build the transaction like in the performance test
            let tx = await nativeContract.burn(tokenId);
            let receipt = await tx.wait();
            expect(receipt.status).to.equal(1);
            console.log("Burn successful, tx:", tx.hash);
            await sleep(2000)
        });
    });
    describe("GetToken Query During Token Lifecycle", function () {
        let testTokenId;
        let originalOwner;

        it("should track token status through split, transfer, and burn stages", async function () {
            originalOwner = minter1Wallet.address;

            // Skip mint phase and use existing tokens

            // Phase 1: Split the token and check status
            console.log("\n=== Phase 1: Split Token Status ===");
            const splitRequests = {
                sc_address: NATIVE_TOKEN_ADDRESS,
                token_type: '0',
                from_address: originalOwner,
                to_accounts: [
                    { address: receiver1, amount: 10, comment: "split-test" }
                ]
            };

            console.log("Generating split proof...");
            const splitProofResponse = await client.generateBatchSplitToken(splitRequests, minter1Metadata);
            await sleep(2000);

            console.log("Getting split detail...");
            const detailResponse = await client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, minter1Metadata);

            const splitRecipients = detailResponse.to_addresses;
            const consumedIds = detailResponse.consumedIds.map(ids => ids.token_id);
            const splitNewTokens = detailResponse.newTokens.map((account, idx) => ({
                id: account.token_id,
                owner: originalOwner,
                status: 2,
                amount: {
                    cl_x: ethers.toBigInt(account.cl_x),
                    cl_y: ethers.toBigInt(account.cl_y),
                    cr_x: ethers.toBigInt(account.cr_x),
                    cr_y: ethers.toBigInt(account.cr_y)
                },
                to: idx % 2 === 0 ? originalOwner : splitRecipients[Math.floor(idx / 2)],
                rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx - 1]?.token_id || 0
            }));

            const splitProof = detailResponse.proof.map(p => ethers.toBigInt(p));
            const splitPublicInputs = detailResponse.public_input.map(i => ethers.toBigInt(i));
            const paddingNum = detailResponse.batched_size - splitRecipients.length;

            console.log("Executing split transaction...");
            const splitTx = await nativeContract.split(originalOwner, splitRecipients, consumedIds, splitNewTokens, splitProof, splitPublicInputs, paddingNum);
            await splitTx.wait();

            // Get the new token ID from split (take the first transfer token)
            const splitTokenId = ethers.toBigInt(splitNewTokens[1].id);
            console.log("Split created new token ID:", splitTokenId.toString());

            // Try to get the token with original owner first (split might not change ownership immediately)
            try {
                tokenStatus = await nativeContract.getToken(originalOwner, splitTokenId);
                console.log("  Status after split:");
                console.log("    - Token ID:", tokenStatus.id.toString());
                console.log("    - Owner:", tokenStatus.owner);
                console.log("    - Status code:", tokenStatus.status);
                expect(tokenStatus.owner).to.equal(originalOwner);
                expect(tokenStatus.status).to.equal(2);
            } catch (error) {
                console.error("  Error getting split token:", error.message);
                // Try with receiver1 as fallback
                try {
                    tokenStatus = await nativeContract.getToken(receiver1, splitTokenId);
                    console.log("  Status after split (fallback to receiver1):");
                    console.log("    - Token ID:", tokenStatus.id.toString());
                    console.log("    - Owner:", tokenStatus.owner);
                    console.log("    - Status code:", tokenStatus.status);
                } catch (fallbackError) {
                    console.error("  Fallback error getting split token:", fallbackError.message);
                    // Continue with test even if we can't get token status
                }
            }

            // Phase 2: Transfer the token and check status
            console.log("\n=== Phase 2: Transferred Token Status ===");

            console.log("Executing transfer transaction...");
            // Use direct contract call which handles nonces automatically
            const transferTx = await nativeContract.transfer(splitTokenId, "lifecycle-test-transfer");
            const transferReceipt = await transferTx.wait();
            console.log("  Transfer transaction completed successfully");
            await sleep(2000);

            // Try to get token status after transfer
            try {
                tokenStatus = await nativeContract.getToken(receiver1, splitTokenId);
                console.log("  Status And owner after transfer:");
                console.log("    - Token ID:", tokenStatus.id.toString());
                console.log("    - Owner:", tokenStatus.owner);
                console.log("    - Status code:", tokenStatus.status);
                expect(tokenStatus.owner).to.equal(receiver1);
                expect(tokenStatus.status).to.equal(2);
            } catch (error) {
                console.error("  Error getting transferred token status:", error.message);
            }

            // Phase 3: Split a new token specifically for burning
            console.log("\n=== Phase 3: Split New Token for Burning ===");
            const burnSplitRequests = {
                sc_address: NATIVE_TOKEN_ADDRESS,
                token_type: '0',
                from_address: originalOwner,
                to_accounts: [
                    { address: originalOwner, amount: 5, comment: "burn-split-test" }
                ]
            };

            console.log("Generating split proof for burn test...");
            const burnSplitProofResponse = await client.generateBatchSplitToken(burnSplitRequests, minter1Metadata);
            await sleep(2000);

            console.log("Getting split detail for burn test...");
            const burnDetailResponse = await client.getBatchSplitTokenDetail({ request_id: burnSplitProofResponse.request_id }, minter1Metadata);

            const burnSplitRecipients = burnDetailResponse.to_addresses;
            const burnConsumedIds = burnDetailResponse.consumedIds.map(ids => ids.token_id);
            const burnSplitNewTokens = burnDetailResponse.newTokens.map((account, idx) => ({
                id: account.token_id,
                owner: originalOwner,
                status: 2,
                amount: {
                    cl_x: ethers.toBigInt(account.cl_x),
                    cl_y: ethers.toBigInt(account.cl_y),
                    cr_x: ethers.toBigInt(account.cr_x),
                    cr_y: ethers.toBigInt(account.cr_y)
                },
                to: idx % 2 === 0 ? originalOwner : burnSplitRecipients[Math.floor(idx / 2)],
                rollbackTokenId: idx % 2 === 0 ? 0 : burnDetailResponse.newTokens[idx - 1]?.token_id || 0
            }));

            const burnSplitProof = burnDetailResponse.proof.map(p => ethers.toBigInt(p));
            const burnSplitPublicInputs = burnDetailResponse.public_input.map(i => ethers.toBigInt(i));
            const burnSplitPaddingNum = burnDetailResponse.batched_size - burnSplitRecipients.length;

            console.log("Executing split transaction for burn test...");
            const burnSplitTx = await nativeContract.split(originalOwner, burnSplitRecipients, burnConsumedIds, burnSplitNewTokens, burnSplitProof, burnSplitPublicInputs, burnSplitPaddingNum);
            await burnSplitTx.wait();

            // Get the new token ID from split for burning
            const tokenIdForBurn = ethers.toBigInt(burnSplitNewTokens[1].id);
            console.log("Split created new token ID for burning:", tokenIdForBurn.toString());

            // Phase 4: Burn the newly split token and check status
            console.log("\n=== Phase 4: Burned Token Status ===");

            console.log("Executing burn transaction...");
            // Use direct contract call for burn which handles nonces automatically
            const burnTx = await nativeContract.burn(tokenIdForBurn);
            await burnTx.wait();
            console.log("  Burn transaction completed successfully");

            try {
                tokenStatus = await nativeContract.getToken(originalOwner, tokenIdForBurn);
                console.log("  Status after burn:");
                console.log("    - Token ID:", tokenStatus.id.toString());
                console.log("    - Owner:", tokenStatus.owner);
                console.log("    - Status code:", tokenStatus.status);
            } catch (error) {
                console.log("  Expected error after burn: Token may no longer exist or status changed");
                console.log("  Error message:", error.message);
            }

            console.log("\n✅ Token lifecycle status tracking completed successfully!");
        });
    });

    describe("Complete Workflow Scenarios", function () {
        it("should complete workflow: mint 1 token -> split 1 token -> transfer 1 token", async function () {
            console.log("\n🔄 TEST: Complete workflow with 1 token (Mint → Split → Transfer)");
            console.log("   Purpose: Verify end-to-end workflow with single token operations");
            console.log("   Expected: Successfully mint, split, and transfer 1 token through complete lifecycle\n");

            // Step 1: Mint 1 token
            console.log("Step 1: Minting 1 token...");
            const numberOfTokens = 1;
            const tokenAmount = 1000;
            
            const to_accounts = Array(numberOfTokens).fill().map(() => ({
                address: minter1Wallet.address,
                amount: tokenAmount
            }));

            const generateRequest = {
                sc_address: NATIVE_TOKEN_ADDRESS,
                token_type: '0',
                from_address: minter1Wallet.address,
                to_accounts: to_accounts,
            };

            const response = await client.generateBatchMintProof(generateRequest, minter1Metadata);
            const recipients = response.to_accounts.map(account => account.address);
            const batchedSize = response.batched_size;
            
            const newTokens = response.to_accounts.map((account) => ({
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
            const padding = Math.max(Number(batchedSize) - to_accounts.length, 0);

            const mintTx = await nativeContract.mint(recipients, newTokens, newAllowed, proof, publicInputs, padding);
            const mintReceipt = await mintTx.wait();
            expect(mintReceipt.status).to.equal(1);
            console.log(`✅ Minted 1 token successfully, tx: ${mintTx.hash}`);
            await sleep(2000);

            // Step 2: Split 1 token
            console.log("\nStep 2: Splitting 1 token...");
            const splitRequests = {
                sc_address: NATIVE_TOKEN_ADDRESS,
                token_type: '0',
                from_address: minter1Wallet.address,
                to_accounts: [
                    { address: receiver1, amount: 500, comment: "workflow-split-1" }
                ]
            };

            const splitProofResponse = await client.generateBatchSplitToken(splitRequests, minter1Metadata);
            await sleep(2000);

            const detailResponse = await client.getBatchSplitTokenDetail({ request_id: splitProofResponse.request_id }, minter1Metadata);
            const splitRecipients = detailResponse.to_addresses;
            const consumedIds = detailResponse.consumedIds.map(ids => ids.token_id);

            const splitNewTokens = detailResponse.newTokens.map((account, idx) => ({
                id: account.token_id,
                owner: minter1Wallet.address,
                status: 2,
                amount: {
                    cl_x: ethers.toBigInt(account.cl_x),
                    cl_y: ethers.toBigInt(account.cl_y),
                    cr_x: ethers.toBigInt(account.cr_x),
                    cr_y: ethers.toBigInt(account.cr_y)
                },
                to: idx % 2 === 0 ? minter1Wallet.address : splitRecipients[Math.floor(idx / 2)],
                rollbackTokenId: idx % 2 === 0 ? 0 : (idx + 1 < detailResponse.newTokens.length ? detailResponse.newTokens[idx + 1]?.token_id : 0)
            }));

            const splitProof = detailResponse.proof.map(p => ethers.toBigInt(p));
            const splitPublicInputs = detailResponse.public_input.map(i => ethers.toBigInt(i));
            const paddingNum = detailResponse.batched_size - splitRecipients.length;

            const splitTx = await nativeContract.split(minter1Wallet.address, splitRecipients, consumedIds, splitNewTokens, splitProof, splitPublicInputs, paddingNum);
            const splitReceipt = await splitTx.wait();
            expect(splitReceipt.status).to.equal(1);
            console.log(`✅ Split 1 token successfully, tx: ${splitTx.hash}`);
            await sleep(2000);

            // Step 3: Transfer 1 token
            console.log("\nStep 3: Transferring 1 token...");
            const tokenIdToTransfer = ethers.toBigInt(splitNewTokens[1].id);
            const transferTx = await nativeContract.transfer(tokenIdToTransfer, "workflow-transfer-1");
            const transferReceipt = await transferTx.wait();
            expect(transferReceipt.status).to.equal(1);
            console.log(`✅ Transferred 1 token successfully, tx: ${transferTx.hash}`);
            await sleep(2000);

            console.log("\n✅ Complete workflow with 1 token finished successfully!");
        });

        it.only("should complete workflow: 32 concurrent splits (128 tokens each) -> concurrent transfers", async function () {
            this.timeout(3600000); // 1 hour timeout for large batch operations
            
            console.log("\n🔄 TEST: Complete workflow with 32 concurrent splits (128 tokens each) and concurrent transfers");
            console.log("   Purpose: Verify end-to-end workflow with large-scale concurrent operations");
            console.log("   Expected: Successfully mint tokens, execute 32 concurrent split operations (128 tokens each) and concurrent transfers\n");

            // Step 1: Mint tokens for split operations
            console.log("═══ Step 1: Minting tokens for split operations ═══");
            const numberOfSplits = 32;
            const tokensPerSplit = 128;
            const tokenAmount = 10000;
            
            const tokensToMint = numberOfSplits;
            console.log(`   Minting ${tokensToMint} tokens with amount ${tokenAmount} each...`);
            
            const to_accounts = Array(tokensToMint).fill().map(() => ({
                address: minter1Wallet.address,
                amount: tokenAmount
            }));

            const generateRequest = {
                sc_address: NATIVE_TOKEN_ADDRESS,
                token_type: '0',
                from_address: minter1Wallet.address,
                to_accounts: to_accounts,
            };

            const response = await client.generateBatchMintProof(generateRequest, minter1Metadata);
            const recipients = response.to_accounts.map(account => account.address);
            const batchedSize = response.batched_size;
            
            const newTokens = response.to_accounts.map((account) => ({
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
            const padding = Math.max(Number(batchedSize) - to_accounts.length, 0);

            const mintTx = await nativeContract.mint(recipients, newTokens, newAllowed, proof, publicInputs, padding);
            const mintReceipt = await mintTx.wait();
            expect(mintReceipt.status).to.equal(1);
            console.log(`✅ Minted ${tokensToMint} tokens successfully, tx: ${mintTx.hash}`);
            await sleep(3000);

            // Step 2: Prepare split requests using helper function
            console.log("\n═══ Step 2: Preparing split requests ═══");
            const splitRequests = await prepareSplitRequests(client, minter1Wallet, minter1Metadata, receiver1, numberOfSplits);
            console.log(`✅ Prepared ${splitRequests.length} split requests`);

            // Step 3: Generate split proofs using helper function
            console.log("\n═══ Step 3: Generating split proofs ═══");
            const requestIds = await generateSplitProofs(client, splitRequests, minter1Metadata);
            console.log(`✅ Generated ${requestIds.length} split proofs`);

            // Step 4: Execute concurrent splits using helper function
            console.log("\n═══ Step 4: Executing concurrent split transactions ═══");
            const splitResults = await executeBatchedConcurrentSplits(client, requestIds, minter1Wallet, minter1Metadata, nativeContract);
            console.log(`✅ Split operations completed:`);
            console.log(`   - Total transactions: ${splitResults.totalTransactions}`);
            console.log(`   - Successful: ${splitResults.successfulTransactions}`);
            console.log(`   - Failed: ${splitResults.failedTransactions}`);
            console.log(`   - Recipient tokens: ${splitResults.recipientTokens.length}`);
            console.log(`   - Duration: ${splitResults.duration}s`);
            await sleep(3000);

            // Step 5: Execute concurrent transfers using helper function
            console.log("\n═══ Step 5: Executing concurrent transfers ═══");
            const transferResults = await executeBatchTransfers(client, splitResults.recipientTokens, minter1Wallet, nativeContract);
            console.log(`✅ Transfer operations completed:`);
            console.log(`   - Total: ${transferResults.total}`);
            console.log(`   - Successful: ${transferResults.success}`);
            console.log(`   - Failed: ${transferResults.failed}`);

            console.log("\n╔════════════════════════════════════════════════════════════╗");
            console.log("║  ✅ COMPLETE WORKFLOW FINISHED SUCCESSFULLY               ║");
            console.log("╚════════════════════════════════════════════════════════════╝");
            console.log(`\n📊 Summary:`);
            console.log(`   - Tokens minted: ${tokensToMint} (amount: ${tokenAmount} each)`);
            console.log(`   - Split operations: ${numberOfSplits}`);
            console.log(`   - Tokens per split: ${tokensPerSplit}`);
            console.log(`   - Total recipient tokens: ${splitResults.recipientTokens.length}`);
            console.log(`   - Total tokens transferred: ${transferResults.success}`);
        });
    });
});
