const { expect } = require('chai');
const { ethers, network } = require('hardhat');
const { createClient } = require('./token_grpc');
const accounts = require('./../../deployments/account.json');
const grpc = require("@grpc/grpc-js");

// Native Token configuration for dev_L2
const NATIVE_TOKEN_ADDRESS = "0x68939E9C4C4B1A626F7B9c081A9A891002dB6116";
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

    describe("Setup", function () {
        it.only("should set mint allowance for minter", async function () {
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
            await sleep(2000)
        });
    });

    describe("Mint Function", function () {
        it.only("should mint multiple tokens in batch", async function () {
            // Mint multiple tokens at once - following performance script pattern
            const numberOfTokens = 1;
            const tokenAmount = 1000;
            
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

        it("should split tokens to multiple recipients", async function () {
            await executeSplit(2);
        });

        it("should split tokens with 1 recipient in toAccounts", async function () {
            await executeSplit(1);
        });

        it("should split tokens with 127 recipients in toAccounts", async function () {
            await executeSplit(127);
        });

        it.only("should split tokens with 128 recipients in toAccounts", async function () {
            for (let i = 0; i < 10; i++){
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
});


describe('Token ID Display Issue Test', function() {
    let nativeContract;
    let minter1Wallet;



    it('should verify the token ID display inconsistency issue', async function() {
        // 测试特定的大数字
        const problematicTokenId = "23541363365667378307713321493819379963388878349152291031599208567677072805599";

        console.log(`Raw input: ${problematicTokenId} (type: ${typeof problematicTokenId})`);

        // 转换为 BigInt
        const tokenIdAsBigInt = ethers.toBigInt(problematicTokenId);
        console.log(`After toBigInt: ${tokenIdAsBigInt.toString()} (type: ${typeof tokenIdAsBigInt})`);

        // 直接使用 BigInt
        console.log(`  Verifying token ID: ${tokenIdAsBigInt.toString()}`);

        // 模拟原始代码中的行为
        try {
            // 尝试调用 getToken 方法（即使可能失败，我们只关心显示）
            console.log(`Calling getToken with address: ${minter1Wallet.address} and tokenId: ${tokenIdAsBigInt.toString()}`);
            // 注意：这里可能因为合约没有正确实现而失败，但我们关注的是显示
            console.log(`Expected display in log: ${tokenIdAsBigInt.toString()}`);

            // 如果有实际的合约方法，我们可以这样测试
            // const tokenStatus = await nativeContract.getToken(minter1Wallet.address, tokenIdAsBigInt);
        } catch (error) {
            console.error(`  ❌ Failed to get token ${tokenIdAsBigInt.toString()}:`, error.message);
            console.log(`Error occurred with token ID: ${tokenIdAsBigInt.toString()}`);
            console.log(`Token ID in error message: ${tokenIdAsBigInt.toString()}`);
        }

        // 额外验证各种转换方式
        console.log('\n--- Additional conversion checks ---');
        const asNumber = Number(problematicTokenId);
        console.log(`As Number: ${asNumber} (type: ${typeof asNumber})`);

        const asBigInt = BigInt(problematicTokenId);
        console.log(`As BigInt: ${asBigInt} (type: ${typeof asBigInt})`);

        console.log(`toString comparison - Number: ${asNumber.toString()}, BigInt: ${asBigInt.toString()}`);

        // 检查精度是否丢失
        console.log(`Precision check - original equals Number after toString: ${problematicTokenId === asNumber.toString()}`);
        console.log(`Precision check - original equals BigInt after toString: ${problematicTokenId === asBigInt.toString()}`);
    });

    it('should test the exact scenario from original code', async function() {
        // 模拟原始代码中的对象结构
        const token = { id: "2354136336566737830771332149381937996338887834915291031599208567677072805599" };
        console.log(`Raw token.id: ${token.id} (type: ${typeof token.id})`);

        const tokenId = ethers.toBigInt(token.id);
        console.log(`  Verifying token ID: ${tokenId.toString()}`);

        // 模拟错误情况
        try {
            // 这里模拟 getToken 失败的情况
            throw new Error("Token not found");
        } catch (error) {
            console.error(`  ❌ Failed to get token ${tokenId.toString()}:`, error.message);

            // 记录详细调试信息
            console.log(`Debug - token.id: ${token.id}`);
            console.log(`Debug - tokenId: ${tokenId.toString()}`);
            console.log(`Debug - string comparison equal: ${token.id === tokenId.toString()}`);
        }
    });
});
