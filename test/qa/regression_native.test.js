const { expect } = require('chai');
const { ethers, network } = require('hardhat');
const { createClient } = require('./token_grpc');
const accounts = require('./../../deployments/account.json');
const grpc = require("@grpc/grpc-js");

// Native Token configuration for dev_L2
const NATIVE_TOKEN_ADDRESS = "0xA449FA6835cb17B39d6f26378a95472bE22811D4";
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

    describe("Mint Function", function () {
        it("should setup mint allowance and mint tokens", async function () {
            // Setup mint allowance
            const ownerMetadata = await createAuthMetadata(accounts.OwnerKey);
            const ownerWallet = new ethers.Wallet(accounts.OwnerKey, ethers.provider);
            const ownerNative = new ethers.Contract(NATIVE_TOKEN_ADDRESS, NATIVE_ABI, ownerWallet);

            const amount = 10000000;
            const encodeResponse = await client.encodeElgamalAmount(amount, ownerMetadata);
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

            // Mint
            const to_accounts = [{
                address: minter1Wallet.address,
                amount: 100
            }];

            const generateRequest = {
                sc_address: NATIVE_TOKEN_ADDRESS,
                token_type: '0',
                from_address: minter1Wallet.address,
                to_accounts: to_accounts,
            };

            console.log("Generating batch mint proof...");
            const response = await client.generateBatchMintProof(generateRequest, minter1Metadata);

            const recipients = response.to_accounts.map(account => account.address);
            const batchedSize = response.batched_size;
            const newTokens = response.to_accounts.map(account => ({
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

            console.log("Executing mint transaction...");
            const mintTx = await nativeContract.mint(recipients, newTokens, newAllowed, proof, publicInputs, padding);
            const receipt = await mintTx.wait();
            expect(receipt.status).to.equal(1);
            console.log("Mint successful, tx:", mintTx.hash);
        });
    });

    describe("Split Function", function () {
        let tokenIdToSplit;

        it("should split tokens to multiple recipients", async function () {
            // We need a token to split. Usually we'd get this from the previous mint or by querying the list.
            // For regression, let's just use the gRPC to find one or mint a fresh one if needed.
            // In this test, we assume the previous mint gave us tokens.
            const tokenListResponse = await client.getSplitTokenList(minter1Wallet.address, NATIVE_TOKEN_ADDRESS, minter1Metadata);
            if (!tokenListResponse.split_tokens || tokenListResponse.split_tokens.length === 0) {
                this.skip(); // Or mint one here
            }

            const splitRequests = {
                sc_address: NATIVE_TOKEN_ADDRESS,
                token_type: '0',
                from_address: minter1Wallet.address,
                to_accounts: [
                    { address: receiver1, amount: 10, comment: "split-1" },
                    { address: receiver1, amount: 20, comment: "split-2" }
                ]
            };

            console.log("Generating batch split proof...");
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

            console.log("Split successful, tx:", splitTx.hash);

            // Capture one of the recipient tokens (odd index) for the next test
            // Based on native_dual_minter_performance logic: recipients are odd indices
            if (newTokens.length > 1) {
                lastMinterTokenId = newTokens[1].id;
                console.log("Captured recipient token ID (index 1) for transfer test:", lastMinterTokenId.toString());
            }
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
            const transferTx = await nativeContract.transfer(tokenId, "regression transfer");
            const receipt = await transferTx.wait();
            expect(receipt.status).to.equal(1);
            console.log("Transfer successful, tx:", transferTx.hash);
        });
    });
});
