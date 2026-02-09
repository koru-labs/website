const { expect } = require('chai');
const { ethers } = require('hardhat');
const { createClient } = require('./token_grpc');
const accounts = require('./../../deployments/account.json');
const grpc = require("@grpc/grpc-js");

// Native Token configuration for dev_L2
const NATIVE_TOKEN_ADDRESS = "0x0b75c49c1CB0A11f8ffa018770c104d7FfD4c4d6";
const RPC_URL = "dev2-node3-rpc.hamsa-ucl.com:50051";

// ABI for Native Token
const NATIVE_ABI =[{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"burn","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256[]","name":"tokenIds","type":"uint256[]"}],"name":"checkTokenIds","outputs":[{"internalType":"uint256[]","name":"","type":"uint256[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"getToken","outputs":[{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"enum TokenModel.TokenStatus","name":"status","type":"uint8"},{"components":[{"internalType":"uint256","name":"cl_x","type":"uint256"},{"internalType":"uint256","name":"cl_y","type":"uint256"},{"internalType":"uint256","name":"cr_x","type":"uint256"},{"internalType":"uint256","name":"cr_y","type":"uint256"}],"internalType":"struct TokenModel.ElGamal","name":"amount","type":"tuple"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"rollbackTokenId","type":"uint256"}],"internalType":"struct TokenModel.TokenEntity","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address[]","name":"recipients","type":"address[]"},{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"enum TokenModel.TokenStatus","name":"status","type":"uint8"},{"components":[{"internalType":"uint256","name":"cl_x","type":"uint256"},{"internalType":"uint256","name":"cl_y","type":"uint256"},{"internalType":"uint256","name":"cr_x","type":"uint256"},{"internalType":"uint256","name":"cr_y","type":"uint256"}],"internalType":"struct TokenModel.ElGamal","name":"amount","type":"tuple"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"rollbackTokenId","type":"uint256"}],"internalType":"struct TokenModel.TokenEntity[]","name":"tokens","type":"tuple[]"},{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"components":[{"internalType":"uint256","name":"cl_x","type":"uint256"},{"internalType":"uint256","name":"cl_y","type":"uint256"},{"internalType":"uint256","name":"cr_x","type":"uint256"},{"internalType":"uint256","name":"cr_y","type":"uint256"}],"internalType":"struct TokenModel.ElGamal","name":"value","type":"tuple"}],"internalType":"struct TokenModel.ElGamalToken","name":"newAllowed","type":"tuple"},{"internalType":"uint256[8]","name":"proof","type":"uint256[8]"},{"internalType":"uint256[]","name":"publicInputs","type":"uint256[]"},{"internalType":"uint256","name":"paddingNum","type":"uint256"}],"name":"mint","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"minter","type":"address"},{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"components":[{"internalType":"uint256","name":"cl_x","type":"uint256"},{"internalType":"uint256","name":"cl_y","type":"uint256"},{"internalType":"uint256","name":"cr_x","type":"uint256"},{"internalType":"uint256","name":"cr_y","type":"uint256"}],"internalType":"struct TokenModel.ElGamal","name":"value","type":"tuple"}],"internalType":"struct TokenModel.ElGamalToken","name":"allowed","type":"tuple"}],"name":"setMintAllowed","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address[]","name":"recipients","type":"address[]"},{"internalType":"uint256[]","name":"consumedIds","type":"uint256[]"},{"components":[{"internalType":"uint256","name":"id","type":"uint256"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"enum TokenModel.TokenStatus","name":"status","type":"uint8"},{"components":[{"internalType":"uint256","name":"cl_x","type":"uint256"},{"internalType":"uint256","name":"cl_y","type":"uint256"},{"internalType":"uint256","name":"cr_x","type":"uint256"},{"internalType":"uint256","name":"cr_y","type":"uint256"}],"internalType":"struct TokenModel.ElGamal","name":"amount","type":"tuple"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"rollbackTokenId","type":"uint256"}],"internalType":"struct TokenModel.TokenEntity[]","name":"newTokens","type":"tuple[]"},{"internalType":"uint256[8]","name":"proof","type":"uint256[8]"},{"internalType":"uint256[]","name":"publicInputs","type":"uint256[]"},{"internalType":"uint256","name":"paddingNum","type":"uint256"}],"name":"split","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"string","name":"memo","type":"string"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}];


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

describe("Native Jenkins Tests", function () {
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

    it("should mint multiple tokens in batch", async function () {
        const numberOfTokens = 10;
        const tokenAmount = 2000;
        
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
        
        const mintedTokenIds = newTokens.map(token => token.id);
        console.log(`Successfully minted ${mintedTokenIds.length} tokens. IDs:`, mintedTokenIds.join(', '));
        
        if (newTokens.length > 0) {
            lastMinterTokenId = newTokens[0].id;
            console.log("Saved first token ID for later tests:", lastMinterTokenId.toString());
        }

        await sleep(2000);
    });

    describe("Batch Split Tests", function () {
        it("should split tokens with 128 outputs (64 recipients)", async function () {
            this.timeout(12000000); // 200 minutes for large batch operation
            
            const toAccountsCount = 64;
            const toAccounts = [];
            // Create 64 recipients alternating between accounts.To1 and accounts.To2
            for (let i = 0; i < toAccountsCount; i++) {
                toAccounts.push({
                    address: i % 2 === 0 ? accounts.To1 : accounts.To2,
                    amount: 10,
                    comment: `split-128-${i+1}`
                });
            }

            const splitRequests = {
                sc_address: NATIVE_TOKEN_ADDRESS,
                token_type: '0',
                from_address: minter1Wallet.address,
                to_accounts: toAccounts
            };

            console.log(`Generating batch split proof for ${toAccountsCount} recipients (128 tokens)...`);
            const splitProofResponse = await client.generateBatchSplitToken(splitRequests, minter1Metadata);
            await sleep(2000);

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
                rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1].token_id
            }));

            const proof = detailResponse.proof.map(p => ethers.toBigInt(p));
            const publicInputs = detailResponse.public_input.map(i => ethers.toBigInt(i));
            const paddingNum = detailResponse.batched_size - recipients.length;

            console.log("Executing split transaction...");
            const splitTx = await nativeContract.split(minter1Wallet.address, recipients, consumedIds, newTokens, proof, publicInputs, paddingNum);
            const receipt = await splitTx.wait();
            expect(receipt.status).to.equal(1);
            console.log("Split successful, tx:", splitTx.hash);

            // Verify all 128 tokens using checkTokenIds
            console.log(`\nVerifying ${newTokens.length} split tokens with checkTokenIds...`);
            const tokenIds = newTokens.map(token => ethers.toBigInt(token.id));
            console.log(`First 5 token IDs: ${tokenIds.slice(0, 5).map(id => id.toString()).join(', ')}...`);
            
            const invalidTokenIds = await nativeContract.checkTokenIds(minter1Wallet.address, tokenIds);
            
            console.log(`checkTokenIds returned ${invalidTokenIds.length} invalid token IDs`);
            if (invalidTokenIds.length > 0) {
                console.log("Invalid token IDs:", invalidTokenIds.map(id => id.toString()).join(', '));
            }
            
            // Verify all tokens are valid (checkTokenIds should return empty array)
            expect(invalidTokenIds.length).to.equal(0);
            console.log("✅ All 128 split tokens verified successfully!");

            if (newTokens.length > 1) {
                lastMinterTokenId = newTokens[1].id;
                console.log("Captured recipient token ID for later tests:", lastMinterTokenId.toString());
            }

            await sleep(2000);
        });
    });

    it("should get token by ID", async function () {
        if (!lastMinterTokenId) {
            console.log("No token ID available, skipping test");
            this.skip();
        }

        const tokenId = ethers.toBigInt(lastMinterTokenId);
        console.log(`Getting token with ID: ${tokenId.toString()}`);

        const tokenStatus = await nativeContract.getToken(minter1Wallet.address, tokenId);
        console.log("Token details:");
        console.log("  - Token ID:", tokenStatus.id.toString());
        console.log("  - Owner:", tokenStatus.owner);
        console.log("  - Status code:", tokenStatus.status);

        expect(tokenStatus.id).to.equal(tokenId);
        expect(tokenStatus.owner).to.equal(minter1Wallet.address);
        expect(tokenStatus.status).to.equal(2);

        console.log("✅ Token retrieved successfully");
    });

    describe("Query Function Tests", function () {
        let testTokenIds = [];

        before(async function () {
            // Create 128 tokens via split for testing query functions (64 recipients = 128 tokens)
            console.log("Setting up 128 test tokens for query function tests...");
            const to_accounts = [];
            // Create 64 recipients alternating between accounts.To1 and accounts.To2
            for (let i = 0; i < 64; i++) {
                to_accounts.push({
                    address: i % 2 === 0 ? accounts.To1 : accounts.To2,
                    amount: 10,
                    comment: `query-test-${i}`
                });
            }

            const splitRequests = {
                sc_address: NATIVE_TOKEN_ADDRESS,
                token_type: '0',
                from_address: minter1Wallet.address,
                to_accounts: to_accounts
            };

            console.log("Generating split proof for 128 tokens...");
            const splitProofResponse = await client.generateBatchSplitToken(splitRequests, minter1Metadata);
            await sleep(2000);

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
                rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1]?.token_id
            }));

            const proof = detailResponse.proof.map(p => ethers.toBigInt(p));
            const publicInputs = detailResponse.public_input.map(i => ethers.toBigInt(i));
            const paddingNum = detailResponse.batched_size - recipients.length;

            console.log("Executing split transaction...");
            const splitTx = await nativeContract.split(minter1Wallet.address, recipients, consumedIds, newTokens, proof, publicInputs, paddingNum);
            await splitTx.wait();
            
            // Collect all token IDs (both change tokens and recipient tokens)
            testTokenIds = newTokens.map(token => ethers.toBigInt(token.id));
            console.log(`✅ Created ${testTokenIds.length} test tokens`);
            console.log(`First 5 token IDs: ${testTokenIds.slice(0, 5).map(id => id.toString()).join(', ')}...`);
            await sleep(2000);
        });

        it("should query single token using getToken", async function () {
            console.log("\n=== Test: Query single token with getToken ===");
            
            const tokenId = testTokenIds[0];
            console.log(`Querying token with ID: ${tokenId.toString()}`);

            const tokenInfo = await nativeContract.getToken(minter1Wallet.address, tokenId);
            
            console.log("Token information retrieved:");
            console.log("  - Token ID:", tokenInfo.id.toString());
            console.log("  - Owner:", tokenInfo.owner);
            console.log("  - Status:", tokenInfo.status);
            console.log("  - To:", tokenInfo.to);
            console.log("  - Rollback Token ID:", tokenInfo.rollbackTokenId.toString());
            console.log("  - Amount (cl_x):", tokenInfo.amount.cl_x.toString());
            console.log("  - Amount (cl_y):", tokenInfo.amount.cl_y.toString());
            console.log("  - Amount (cr_x):", tokenInfo.amount.cr_x.toString());
            console.log("  - Amount (cr_y):", tokenInfo.amount.cr_y.toString());

            // Verify token information
            expect(tokenInfo.id).to.equal(tokenId);
            expect(tokenInfo.owner).to.equal(minter1Wallet.address);
            expect(tokenInfo.status).to.equal(2); // Status 2 = Active/Valid

            console.log("✅ getToken query successful");
        });

        it("should return empty array for all valid tokens using checkTokenIds (happy case)", async function () {
            console.log("\n=== Test: Query 128 valid tokens with checkTokenIds (happy case) ===");
            
            console.log(`Querying ${testTokenIds.length} valid token IDs...`);
            console.log(`First 5 token IDs: ${testTokenIds.slice(0, 5).map(id => id.toString()).join(', ')}...`);

            const invalidTokenIds = await nativeContract.checkTokenIds(minter1Wallet.address, testTokenIds);
            
            console.log(`\ncheckTokenIds returned ${invalidTokenIds.length} invalid token IDs`);
            if (invalidTokenIds.length > 0) {
                console.log("Invalid token IDs:", invalidTokenIds.map(id => id.toString()).join(', '));
            }

            // Verify all tokens are valid (checkTokenIds should return empty array)
            expect(invalidTokenIds.length).to.equal(0);

            console.log("✅ checkTokenIds returned empty array - all 128 tokens are valid");
        });

        it("should return all non-existent tokenIds using checkTokenIds", async function () {
            console.log("\n=== Test: Query non-existent tokens with checkTokenIds ===");
            
            // Create fake token IDs that don't exist
            const fakeTokenIds = [
                ethers.toBigInt("999999999999999999999999999999"),
                ethers.toBigInt("888888888888888888888888888888"),
                ethers.toBigInt("777777777777777777777777777777")
            ];

            console.log("Querying non-existent token IDs:", fakeTokenIds.map(id => id.toString()).join(', '));

            const invalidTokenIds = await nativeContract.checkTokenIds(minter1Wallet.address, fakeTokenIds);
            
            console.log(`\ncheckTokenIds returned ${invalidTokenIds.length} invalid token IDs:`);
            invalidTokenIds.forEach((id, index) => {
                console.log(`  [${index}] ${id.toString()}`);
            });

            // Verify all fake tokens are returned as invalid
            expect(invalidTokenIds.length).to.equal(fakeTokenIds.length);
            
            // Verify each returned ID matches the input fake IDs
            for (let i = 0; i < fakeTokenIds.length; i++) {
                expect(invalidTokenIds[i]).to.equal(fakeTokenIds[i]);
            }

            console.log("✅ checkTokenIds correctly returned all non-existent tokens");
        });

        it("should return only invalid tokenIds from mixed input using checkTokenIds", async function () {
            console.log("\n=== Test: Query mix of valid and invalid tokens with checkTokenIds ===");
            
            // Mix real tokens with fake ones
            const mixedTokenIds = [
                testTokenIds[0], // valid
                ethers.toBigInt("999999999999999999999999999999"), // invalid
                testTokenIds[1], // valid
                ethers.toBigInt("888888888888888888888888888888"), // invalid
                testTokenIds[2], // valid
                ethers.toBigInt("777777777777777777777777777777") // invalid
            ];

            const expectedInvalidIds = [
                ethers.toBigInt("999999999999999999999999999999"),
                ethers.toBigInt("888888888888888888888888888888"),
                ethers.toBigInt("777777777777777777777777777777")
            ];

            console.log(`Querying ${mixedTokenIds.length} mixed token IDs...`);
            mixedTokenIds.forEach((id, index) => {
                const isValid = testTokenIds.some(validId => validId.toString() === id.toString());
                console.log(`  [${index}] ${id.toString()} - ${isValid ? 'VALID' : 'INVALID'}`);
            });

            const invalidTokenIds = await nativeContract.checkTokenIds(minter1Wallet.address, mixedTokenIds);
            
            console.log(`\ncheckTokenIds returned ${invalidTokenIds.length} invalid token IDs:`);
            invalidTokenIds.forEach((id, index) => {
                console.log(`  [${index}] ${id.toString()}`);
            });

            // Verify only invalid tokens are returned
            expect(invalidTokenIds.length).to.equal(expectedInvalidIds.length);

            // Verify all returned IDs are the fake/invalid ones
            for (let i = 0; i < expectedInvalidIds.length; i++) {
                expect(invalidTokenIds[i]).to.equal(expectedInvalidIds[i]);
            }

            console.log("✅ checkTokenIds correctly identified only invalid tokens");
        });
    });

    describe("Split Edge Cases", function () {
        // Helper function to mint a token with specific amount
        const mintSpecificToken = async (amount) => {
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

        // Helper function to execute split with specific amounts
        const executeSplitWithSpecificAmounts = async (tokenId, toAccounts) => {
            const splitRequests = {
                sc_address: NATIVE_TOKEN_ADDRESS,
                token_type: '0',
                from_address: minter1Wallet.address,
                to_accounts: toAccounts
            };

            console.log(`Generating batch split proof with specific amounts...`);
            const splitProofResponse = await client.generateBatchSplitToken(splitRequests, minter1Metadata);
            await sleep(2000);

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
                rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1]?.token_id
            }));

            const proof = detailResponse.proof.map(p => ethers.toBigInt(p));
            const publicInputs = detailResponse.public_input.map(i => ethers.toBigInt(i));
            const paddingNum = detailResponse.batched_size - recipients.length;

            console.log("Executing split transaction...");
            const splitTx = await nativeContract.split(minter1Wallet.address, recipients, consumedIds, newTokens, proof, publicInputs, paddingNum);
            const receipt = await splitTx.wait();
            expect(receipt.status).to.equal(1);
            console.log("Split successful, tx:", splitTx.hash);

            // Verify all new tokens using getToken
            console.log(`\nVerifying ${newTokens.length} split tokens with getToken...`);
            for (const token of newTokens) {
                const tokenId = ethers.toBigInt(token.id);
                console.log(`  Verifying token ID: ${tokenId.toString()}`);
                
                let tokenStatus;
                try {
                    tokenStatus = await nativeContract.getToken(minter1Wallet.address, tokenId);
                    console.log(`  ✅ Token ${tokenId.toString()} found, status: ${tokenStatus.status}`);
                } catch (error) {
                    console.error(`  ❌ Failed to get token ${tokenId.toString()}:`, error.message);
                    throw new Error(`Token verification failed for ${tokenId.toString()}`);
                }
                
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

    it("should burn a token", async function () {
        // First split to create a new token for burning
        const splitRequests = {
            sc_address: NATIVE_TOKEN_ADDRESS,
            token_type: '0',
            from_address: minter1Wallet.address,
            to_accounts: [
                { address: accounts.Minter, amount: 10, comment: "burn-token" }
            ]
        };

        console.log("Generating batch split proof for burn test...");
        const splitProofResponse = await client.generateBatchSplitToken(splitRequests, minter1Metadata);
        await sleep(2000);

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
            rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1]?.token_id
        }));

        const proof = detailResponse.proof.map(p => ethers.toBigInt(p));
        const publicInputs = detailResponse.public_input.map(i => ethers.toBigInt(i));
        const paddingNum = detailResponse.batched_size - recipients.length;

        console.log("Executing split transaction...");
        const splitTx = await nativeContract.split(minter1Wallet.address, recipients, consumedIds, newTokens, proof, publicInputs, paddingNum);
        const splitReceipt = await splitTx.wait();
        expect(splitReceipt.status).to.equal(1);
        console.log("Split successful, tx:", splitTx.hash);

        const tokenIdToBurn = newTokens.length > 1 ? newTokens[1].id : newTokens[0].id;
        await sleep(2000);

        console.log("Executing burn transaction for token ID:", tokenIdToBurn.toString());
        const burnTx = await nativeContract.burn(tokenIdToBurn);
        const burnReceipt = await burnTx.wait();
        expect(burnReceipt.status).to.equal(1);
        console.log("Burn successful, tx:", burnTx.hash);

        await sleep(2000);
    });

    describe("Conflict Operation Tests", function () {
        // Helper function to create a fresh token for testing
        const createTestToken = async (recipient) => {
            const splitRequests = {
                sc_address: NATIVE_TOKEN_ADDRESS,
                token_type: '0',
                from_address: minter1Wallet.address,
                to_accounts: [
                    { address: recipient, amount: 10, comment: "conflict-test" }
                ]
            };

            const splitProofResponse = await client.generateBatchSplitToken(splitRequests, minter1Metadata);
            await sleep(2000);

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
                rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1]?.token_id
            }));

            const proof = detailResponse.proof.map(p => ethers.toBigInt(p));
            const publicInputs = detailResponse.public_input.map(i => ethers.toBigInt(i));
            const paddingNum = detailResponse.batched_size - recipients.length;

            const splitTx = await nativeContract.split(minter1Wallet.address, recipients, consumedIds, newTokens, proof, publicInputs, paddingNum);
            await splitTx.wait();
            
            const tokenId = ethers.toBigInt(newTokens[1].id);
            await sleep(2000);
            return tokenId;
        };

        it("should fail when transferring same tokenId twice", async function () {
            console.log("\n=== Test: Multiple transfers with same tokenId ===");
            
            // Create a new token via split for this test
            console.log("Creating new token via split for transfer test...");
            const tokenId = await createTestToken(receiver1);
            console.log("Token created via split, ID:", tokenId.toString());

            // First transfer should succeed
            console.log("Attempting first transfer...");
            const tx1 = await nativeContract.transfer(tokenId, "first-transfer");
            const receipt1 = await tx1.wait();
            expect(receipt1.status).to.equal(1);
            console.log("✅ First transfer successful, tx:", tx1.hash);
            await sleep(2000);

            // Second transfer with same tokenId should fail
            console.log("Attempting second transfer with same tokenId...");
            try {
                const tx2 = await nativeContract.transfer(tokenId, "second-transfer");
                await tx2.wait();
                console.log("❌ Second transfer unexpectedly succeeded");
                expect.fail("Second transfer should have failed but succeeded");
            } catch (error) {
                console.log("✅ Second transfer failed as expected");
                console.log("   Error:", error.message);
                expect(error.message).to.exist;
            }
        });

        it("should fail when burning same tokenId twice", async function () {
            console.log("\n=== Test: Multiple burns with same tokenId ===");
            
            // Create a new token for this test
            console.log("Creating new token for burn test...");
            const burnTokenId = await createTestToken(minter1Wallet.address);
            console.log("Token created for burn test, ID:", burnTokenId.toString());

            // First burn should succeed
            console.log("Attempting first burn...");
            const burnTx1 = await nativeContract.burn(burnTokenId);
            const burnReceipt1 = await burnTx1.wait();
            expect(burnReceipt1.status).to.equal(1);
            console.log("✅ First burn successful, tx:", burnTx1.hash);
            await sleep(2000);

            // Second burn with same tokenId should fail
            console.log("Attempting second burn with same tokenId...");
            try {
                const burnTx2 = await nativeContract.burn(burnTokenId);
                await burnTx2.wait();
                console.log("❌ Second burn unexpectedly succeeded");
                expect.fail("Second burn should have failed but succeeded");
            } catch (error) {
                console.log("✅ Second burn failed as expected");
                console.log("   Error:", error.message);
                expect(error.message).to.exist;
            }
        });

        it("should fail when burning a tokenId that was already transferred", async function () {
            console.log("\n=== Test: Burn after transfer with same tokenId ===");
            
            // Create a new token for this test
            console.log("Creating new token for transfer-then-burn test...");
            const testTokenId = await createTestToken(receiver1);
            console.log("Token created for transfer-burn test, ID:", testTokenId.toString());

            // First transfer the token
            console.log("Attempting transfer...");
            const transferTx = await nativeContract.transfer(testTokenId, "transfer-before-burn");
            const transferReceipt = await transferTx.wait();
            expect(transferReceipt.status).to.equal(1);
            console.log("✅ Transfer successful, tx:", transferTx.hash);
            await sleep(2000);

            // Then try to burn the same tokenId - should fail
            console.log("Attempting burn after transfer with same tokenId...");
            try {
                const burnTx = await nativeContract.burn(testTokenId);
                await burnTx.wait();
                console.log("❌ Burn after transfer unexpectedly succeeded");
                expect.fail("Burn after transfer should have failed but succeeded");
            } catch (error) {
                console.log("✅ Burn after transfer failed as expected");
                console.log("   Error:", error.message);
                expect(error.message).to.exist;
            }
        });
    });
});
