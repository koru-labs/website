const { expect } = require('chai');
const { ethers } = require('hardhat');
const { createClient } = require('./token_grpc');
const accounts = require('./../../deployments/account.json');
const grpc = require("@grpc/grpc-js");

// Native Token configuration for dev_L2
const NATIVE_TOKEN_ADDRESS = "0x4dA51d6A39687ffCf9f5fc163C102aE8b23a123d";
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

    it("should split tokens to multiple recipients", async function () {
        const toAccountsCount = 2;
        const toAccounts = [];
        for (let i = 0; i < toAccountsCount; i++) {
            toAccounts.push({
                address: receiver1,
                amount: 10,
                comment: `split-${i+1}`
            });
        }

        const splitRequests = {
            sc_address: NATIVE_TOKEN_ADDRESS,
            token_type: '0',
            from_address: minter1Wallet.address,
            to_accounts: toAccounts
        };

        console.log(`Generating batch split proof for ${toAccountsCount} recipients...`);
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

        if (newTokens.length > 1) {
            lastMinterTokenId = newTokens[1].id;
            console.log("Captured recipient token ID for transfer test:", lastMinterTokenId.toString());
        }

        await sleep(2000);
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

    it("should transfer a token to another user", async function () {
        if (!lastMinterTokenId) {
            console.log("No token ID available, skipping test");
            this.skip();
        }

        const tokenId = ethers.toBigInt(lastMinterTokenId);
        console.log("Executing transfer transaction for token ID:", tokenId.toString());

        const tx = await nativeContract.transfer(tokenId, "jenkins transfer");
        const receipt = await tx.wait();
        expect(receipt.status).to.equal(1);
        console.log("Transfer successful, tx:", tx.hash);

        await sleep(2000);
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
});
