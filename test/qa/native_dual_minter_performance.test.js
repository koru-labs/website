const { expect } = require('chai');
const { ethers } = require('hardhat');
const { createClient } = require('./token_grpc');
const accounts = require('./../../deployments/account.json');
const grpc = require("@grpc/grpc-js");

const native_token_address = "0x78e2F27aA81731861883e06204d65E9397F0DDDE";
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
            const tx = await native.mint(recipients, newTokens, newAllowed, proof, publicInputs,bathcedSize - to_accounts.length);
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

describe.only('Native Dual Minter Split Performance Tests', function () {
    let client, owner,minter;
    let nativeOwner,nativeMinter;
    let mintedTokens = {};
    const total_number = 256
    const amount = 1000
    let minter1List,minter2List

    before(async function () {
        this.timeout(300000);

        client = createClient(rpcUrl);
        [owner,minter] = await ethers.getSigners();

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
            const splitRequests = await prepareSplitRequests(total_number);
            const requestIds = await generateSplitProofs(splitRequests);
            const results = await executeConcurrentSplits(requestIds);

            minter1List = await extractRecipientTokenIds('minter1', requestIds.minter1, MINTERS.minter1.privateKey)
            minter2List = await extractRecipientTokenIds('minter2', requestIds.minter2, MINTERS.minter2.privateKey)
            await sleep(60000)
        });
    });

    after(async function () {
        // Test completed
        console.log('Test completed.');
    });
});
describe('Native Dual Minter Transfer Performance Tests', function () {
    let client, owner,minter;
    let nativeOwner,nativeMinter;
    let mintedTokens = {};
    const total_number = 2 //total_number *2 *128
    const amount = 1000
    let minter1List,minter2List

    before(async function () {
        this.timeout(300000);

        client = createClient(rpcUrl);
        [owner,minter] = await ethers.getSigners();

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
            const splitRequests = await prepareSplitRequests(total_number);
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
                await sleep(1000);
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

    describe('Case 4: Excute Transfers TPS', function () {
        this.timeout(6000000);
        it('should execute transfers with TPS', async function () {
            await executeBatchTransfersSigned(minter1List,minter2List);
        });
    });

    after(async function () {
        // Test completed
        console.log('Test completed.');
    });
});

describe('Native Dual Minter Mint TPS Benchmark', function () {
    this.timeout(6000000);

    const batchSize = 128;
    const amount = 2;
    const provider = new ethers.JsonRpcProvider(RPC);
    let client, owner,minter;
    let nativeOwner,nativeMinter;

    before(async function () {
        this.timeout(300000);

        client = createClient(rpcUrl);
        [owner,minter] = await ethers.getSigners();

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

    it('should set mint allowance for minter1', async function () {
        this.timeout(120000);
        await setupMintAllowance(nativeOwner, client, { minter1: MINTERS.minter1 }, 100000000);
    });

    it('should set mint allowance for minter2', async function () {
        this.timeout(120000);
        await setupMintAllowance(nativeOwner, client, { minter2: MINTERS.minter2 }, 100000000);
    });

    async function sendSignedRawTx(rawTx) {
        const res = await fetch(RPC, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "eth_sendRawTransaction",
                params: [rawTx],
                id: Date.now()
            })
        });

        const json = await res.json();
        if (json.error) throw new Error(json.error.message);
        return json.result;
    }

    it(`should benchmark mint TPS with batchSize=${batchSize}`, async function () {
        const start = Date.now();
        let totalTx = 0;

        // 准备所有minter的预签名交易
        const allSignedTxs = [];

        for (const [minterName, minterConfig] of Object.entries(MINTERS)) {
            console.log(`\n[${minterName}] ==== Preparing Mint TPS Test with Pre-signing ====`);
            const wallet = new ethers.Wallet(minterConfig.privateKey, provider);
            const minterMetadata = await createAuthMetadata(minterConfig.privateKey);

            // 获取初始nonce
            let currentNonce = await provider.getTransactionCount(wallet.address);

            // 每个minter签名256个mint交易
            const numTransactions = 2;
            const mintBatchSize = 128;

            for (let i = 0; i < numTransactions; i++) {
                const to_accounts = Array(mintBatchSize).fill().map(() => ({
                    address: minterConfig.address,
                    amount
                }));

                const generateRequest = {
                    sc_address: native_token_address,
                    token_type: '0',
                    from_address: minterConfig.address,
                    to_accounts
                };

                const response = await client.generateBatchMintProof(generateRequest, minterMetadata);

                const recipients = response.to_accounts.map(acc => acc.address);
                const batchedSize = response.batched_size;

                const newTokens = response.to_accounts.map(acc => ({
                    id: acc.token.token_id,
                    owner: acc.address,
                    status: 2,
                    amount: {
                        cl_x: acc.token.cl_x,
                        cl_y: acc.token.cl_y,
                        cr_x: acc.token.cr_x,
                        cr_y: acc.token.cr_y
                    },
                    to: acc.address,
                    rollbackTokenId: 0
                }));

                const newAllowed = {
                    id: response.mint_allowed.token_id,
                    value: {
                        cl_x: response.mint_allowed.cl_x,
                        cl_y: response.mint_allowed.cl_y,
                        cr_x: response.mint_allowed.cr_x,
                        cr_y: response.mint_allowed.cr_y
                    }
                };

                const proof = response.proof.map(p => ethers.toBigInt(p));
                const publicInputs = response.input.map(i => ethers.toBigInt(i));
                const padding = Math.max(Number(batchedSize) - to_accounts.length, 0);

                const contract = new ethers.Contract(native_token_address, abi, wallet);
                const unsignedTx = await contract.mint.populateTransaction(
                    recipients,
                    newTokens,
                    newAllowed,
                    proof,
                    publicInputs,
                    padding,
                    {
                        nonce: currentNonce,
                        gasLimit: 450436*10,
                        gasPrice: 0
                    }
                );
                unsignedTx.type = 0;
                const signedTx = await wallet.signTransaction(unsignedTx);

                allSignedTxs.push({
                    signedTx: signedTx,
                    minterName: minterName,
                    index: i
                });

                console.log(`[${minterName}] Transaction ${i+1}/${numTransactions} pre-signed with nonce ${currentNonce}`);

                // 递增nonce
                currentNonce++;
            }
        }

        // 使用HTTP一次性推送所有预签名交易
        console.log(`Sending ${allSignedTxs.length} signed transactions via HTTP...`);

        const BATCH_SIZE_PUSH = 5000; // 每批推送的交易数量
        const BATCH_DELAY = 10; // 批次间延迟（毫秒）

        for (let i = 0; i < allSignedTxs.length; i += BATCH_SIZE_PUSH) {
            const batch = allSignedTxs.slice(i, i + BATCH_SIZE_PUSH);

            const batchPayload = batch.map((signedData, index) => ({
                jsonrpc: "2.0",
                id: Date.now() + index,
                method: "eth_sendRawTransaction",
                params: [signedData.signedTx]
            }));

            try {
                const response = await fetch(RPC, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(batchPayload)
                });

                const responseData = await response.json();

                if (Array.isArray(responseData)) {
                    for (const result of responseData) {
                        if (!result.error) {
                            totalTx++;
                        } else {
                            console.error(`Transaction failed: ${result.error.message}`);
                        }
                    }
                } else {
                    console.error(`Unexpected response format: ${JSON.stringify(responseData)}`);
                }
            } catch (error) {
                console.error(`Batch request failed: ${error.message}`);
            }

            // 批次间延迟
            if (i + BATCH_SIZE_PUSH < allSignedTxs.length) {
                await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
            }
        }

        const duration = (Date.now() - start) / 1000;
        const tps = (totalTx / duration).toFixed(2);

        console.log(`\n========= MINT TPS RESULT =========`);
        console.log(`Total Mint TX: ${totalTx}`);
        console.log(`Total Time: ${duration}s`);
        console.log(`TPS: ${tps}`);
        console.log(`===================================\n`);
    });
});



/**
 * Execute single token split operation
 * @param {Object} client - gRPC client
 * @param {Object} minterConfig - Configuration object containing minter address and private key
 * @param {string} tokenId - Token ID to split
 * @param {number[]} amounts - Array of split amounts, each element corresponds to a receiver address
 */
async function prepareSplitRequests(round_number) {
    const requests = { minter1: [], minter2: [] };
    console.log(`[Minter1] Preparing ${round_number} split requests`)

    for (let i = 0; i < round_number; i++) {
        const to_accounts = [];
        for (let j = 0; j < 64; j++) {
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
    console.log(`[Minter2] Preparing ${round_number} split requests`)
    for (let i = 0; i < round_number; i++) {
        const to_accounts = [];
        for (let j = 0; j < 64; j++) {
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
async function executeConcurrentSplits(requests) {
    const results = { minter1: null, minter2: null };

    const [minter1Results, minter2Results] = await Promise.all([
        executeBatchSplitsSigned('minter1', requests.minter1, MINTERS.minter1.privateKey),
        executeBatchSplitsSigned('minter2', requests.minter2, MINTERS.minter2.privateKey)
    ]);

    results.minter1 = minter1Results;
    results.minter2 = minter2Results;

    return results;
}
async function executeBatchSplitsSigned(minterName, requestIds, privateKey) {
    const minterWallet = new ethers.Wallet(privateKey, ethers.provider);
    const derivedAddress = minterWallet.address;
    const configAddress = MINTERS[minterName].address;

    if (derivedAddress.toLowerCase() !== configAddress.toLowerCase()) {
        throw new Error(`[${minterName}] 私钥与配置地址不匹配！`);
    }

    const minterNative = new ethers.Contract(native_token_address, abi, minterWallet);
    const minterMetadata = await createAuthMetadata(privateKey);

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

    if (failedSigs.length > 0) {
        return {
            totalTransactions: allTxData.length,
            successfulTransactions: 0,
            failedTransactions: failedSigs.length,
            error: '预签名失败'
        };
    }

    const providerUrl = 'http://dev2-ucl-l2.hamsa-ucl.com:8545';
    const BATCH_SIZE = 32;
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

        try {
            const INNER_BATCH_SIZE = 5000;
            const BATCH_DELAY = 0;

            for (let i = 0; i < successfulSigs.length; i += INNER_BATCH_SIZE) {
                const batchStart = i;
                const batchEnd = Math.min(i + INNER_BATCH_SIZE, successfulSigs.length);
                const innerBatch = successfulSigs.slice(batchStart, batchEnd);
                const batchMetadataForBatch = batchMetadata.slice(batchStart, batchEnd);

                const batchPayloadForBatch = innerBatch.map((signedData, index) => ({
                    jsonrpc: "2.0",
                    id: batchMetadataForBatch[index].taskId,
                    method: "eth_sendRawTransaction",
                    params: [signedData.signedTx]
                }));

                const response = await fetch(providerUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(batchPayloadForBatch)
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

                if (batchEnd < successfulSigs.length) {
                    await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
                }
            }
        } catch (error) {
            console.error(`Batch request failed: ${error.message}`);
            batchMetadata.forEach(metadata => allResults.push({
                success: false,
                tokenId: metadata.tokenId,
                nonce: metadata.nonce,
                minterName: metadata.minterName,
                index: metadata.taskId,
                error: error.message
            }));
        }
    }

    const successfulSends = allResults.filter(r => r.success);

    return {
        totalTransactions: allTxData.length,
        successfulTransactions: successfulSends.length,
        failedTransactions: allTxData.length - successfulSends.length
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



