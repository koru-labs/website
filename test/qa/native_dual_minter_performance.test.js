const { expect } = require('chai');
const { ethers } = require('hardhat');
const { createClient } = require('./token_grpc');
const accounts = require('./../../deployments/account.json');
const grpc = require("@grpc/grpc-js");

const native_token_address = "0xDDCb7576aF8309b1e52FceD647f8C509710Da1Ea";
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



describe('Native Dual Minter Split Performance Tests', function () {
    let client, owner, minter;
    let nativeOwner, nativeMinter;
    let mintedTokens = {};
    const total_number = 2
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
            await sleep(6000)
            console.log('minter1List length', minter1List.length)
            console.log('minter2List length', minter2List.length)
        });
    });

    after(async function () {
        // Test completed
        console.log('Test completed.');
    });
});

// New test case: Save split token IDs to JSON file, then read and execute transfer
describe.only('Native Dual Minter Split & Transfer with JSON Storage', function () {
    let client, owner, minter;
    let nativeOwner, nativeMinter;
    let mintedTokens = {};
    const total_number = 256; // Number of tokens to test
    const amount = 1000;
    const jsonFilePath = './split_tokens.json';
    
    // Import fs module for file operations
    const fs = require('fs');
    const startTime =  new Date();

    before(async function () {
        this.timeout(300000);
        
        console.log('\n╔════════════════════════════════════════════════════════════════╗');
        console.log('║  TEST SUITE: Native Dual Minter Split & Transfer with JSON    ║');
        console.log('╚════════════════════════════════════════════════════════════════╝');
        console.log('\n📝 Test Configuration:');
        console.log(`   - Total tokens to mint per minter: ${total_number}`);
        console.log(`   - Token amount: ${amount}`);
        console.log(`   - JSON storage path: ${jsonFilePath}`);
        console.log(`   - Native token contract: ${native_token_address}`);
        console.log(`   - Minter1: ${MINTERS.minter1.address}`);
        console.log(`   - Minter2: ${MINTERS.minter2.address}`);
        console.log(`   - Receiver1: ${RECEIVER_CONFIG.receiver1}`);
        console.log(`   - Receiver2: ${RECEIVER_CONFIG.receiver2}\n`);

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
        
        console.log('✅ Test environment initialized successfully\n');
    });

    describe('Case 1: Setup mint allowance for two minters', function () {
        it('should set mint allowance for minter1', async function () {
            this.timeout(120000);
            console.log('\n┌────────────────────────────────────────────────────────────┐');
            console.log('│  CASE 1.1: SETTING UP MINT ALLOWANCE FOR MINTER1          │');
            console.log('└────────────────────────────────────────────────────────────┘');
            console.log('📋 Purpose: Grant minting permission to minter1');
            console.log(`   - Minter1 Address: ${MINTERS.minter1.address}`);
            console.log(`   - Allowance Amount: 100,000,000 tokens`);
            console.log('   - Action: Encoding ElGamal encrypted amount and setting mint allowance on-chain');
            console.log('⏳ Starting mint allowance setup for minter1...\n');
            
            await setupMintAllowance(nativeOwner, client, { minter1: MINTERS.minter1 }, 100000000);
            
            console.log('✅ Mint allowance successfully set for minter1');
            console.log('   - Minter1 can now mint tokens up to the allowed amount\n');
        });

        it('should set mint allowance for minter2', async function () {
            this.timeout(120000);
            console.log('\n┌────────────────────────────────────────────────────────────┐');
            console.log('│  CASE 1.2: SETTING UP MINT ALLOWANCE FOR MINTER2          │');
            console.log('└────────────────────────────────────────────────────────────┘');
            console.log('📋 Purpose: Grant minting permission to minter2');
            console.log(`   - Minter2 Address: ${MINTERS.minter2.address}`);
            console.log(`   - Allowance Amount: 100,000,000 tokens`);
            console.log('   - Action: Encoding ElGamal encrypted amount and setting mint allowance on-chain');
            console.log('⏳ Starting mint allowance setup for minter2...\n');
            
            await setupMintAllowance(nativeOwner, client, { minter2: MINTERS.minter2 }, 100000000);
            
            console.log('✅ Mint allowance successfully set for minter2');
            console.log('   - Minter2 can now mint tokens up to the allowed amount\n');
        });
    });

    describe('Case 2: Split tokens and save to JSON file', function () {
        this.timeout(9000000);

        it('should split tokens and save recipient token ids to JSON file', async function () {
            console.log('\n┌────────────────────────────────────────────────────────────┐');
            console.log('│  CASE 2: MINT, SPLIT TOKENS & SAVE TO JSON FILE           │');
            console.log('└────────────────────────────────────────────────────────────┘');
            
            // 1. Execute mint operation
            console.log('\n═══ Step 1: Minting Tokens ═══');
            console.log('📋 Purpose: Mint initial tokens for both minters');
            console.log(`   - Tokens to mint per minter: ${total_number}`);
            console.log(`   - Amount per token: ${amount}`);
            console.log('   - Action: Generating mint proofs and executing mint transactions');
            console.log('⏳ Starting minting process...\n');
            
            const batchSize = 128;
            for (let i = 0; i < total_number; i += batchSize) {
                const currentBatchSize = Math.min(batchSize, total_number - i);
                const isLastBatch = i + batchSize >= total_number;

                console.log(`   📦 Minting batch ${Math.floor(i/batchSize) + 1}: ${currentBatchSize} tokens`);

                await mintTokensForMinters(
                    client,
                    MINTERS,
                    currentBatchSize,
                    amount
                );

                if (!isLastBatch) {
                    console.log('   ⏸️  Waiting 3 seconds before next batch...');
                    await new Promise(resolve => setTimeout(resolve, 3000));
                }
            }
            console.log(`✅ Minting completed: ${total_number} tokens minted for each minter\n`);

            // 2. Prepare split requests
            console.log('═══ Step 2: Preparing Split Requests ═══');
            console.log('📋 Purpose: Prepare split transaction requests for both minters');
            console.log(`   - Number of split requests: ${total_number}`);
            console.log('   - Each split creates 128 output tokens (64 splits × 2 receivers)');
            console.log(`   - Receiver1: ${RECEIVER_CONFIG.receiver1}`);
            console.log(`   - Receiver2: ${RECEIVER_CONFIG.receiver2}`);
            console.log('⏳ Preparing split requests...\n');
            
            const splitRequests = await prepareSplitRequests(total_number, 'transfer');
            console.log(`✅ Split requests prepared: ${splitRequests.minter1.length} for minter1, ${splitRequests.minter2.length} for minter2\n`);
            
            // 3. Generate split proofs
            console.log('═══ Step 3: Generating Split Proofs ═══');
            console.log('📋 Purpose: Generate zero-knowledge proofs for split transactions');
            console.log('   - Action: Calling gRPC service to generate batch split proofs');
            console.log('   - This proves the split is valid without revealing amounts');
            console.log('⏳ Generating proofs (this may take a while)...\n');
            
            const requestIds = await generateSplitProofs(splitRequests);
            console.log(`✅ Proofs generated: ${requestIds.minter1.length} for minter1, ${requestIds.minter2.length} for minter2\n`);
            
            // 4. Execute split operations
            console.log('═══ Step 4: Executing Split Operations ═══');
            console.log('📋 Purpose: Execute split transactions on-chain');
            console.log('   - Action: Signing and broadcasting split transactions');
            console.log('   - Method: Concurrent execution for both minters');
            console.log('⏳ Executing split transactions...\n');
            
            const results = await executeBatchedConcurrentSplits(requestIds);
            console.log(`✅ Split operations completed:`);
            console.log(`   - Minter1: ${results.minter1.successfulTransactions}/${results.minter1.totalTransactions} successful`);
            console.log(`   - Minter2: ${results.minter2.successfulTransactions}/${results.minter2.totalTransactions} successful\n`);
            
            // 5. Extract recipient token IDs
            console.log('═══ Step 5: Extracting Recipient Token IDs ═══');
            console.log('📋 Purpose: Extract token IDs that were sent to receivers');
            console.log('   - Action: Querying split transaction details from gRPC service');
            console.log('   - Filtering: Only extracting tokens sent to receivers (odd indices)');
            console.log('⏳ Extracting token IDs...\n');
            
            const minter1List = await extractRecipientTokenIds('minter1', requestIds.minter1, MINTERS.minter1.privateKey);
            const minter2List = await extractRecipientTokenIds('minter2', requestIds.minter2, MINTERS.minter2.privateKey);
            
            console.log(`✅ Token IDs extracted:`);
            console.log(`   - Minter1: ${minter1List.length} token IDs`);
            console.log(`   - Minter2: ${minter2List.length} token IDs`);
            console.log(`   - Total: ${minter1List.length + minter2List.length} token IDs\n`);
            
            // 6. Save to JSON file
            console.log('═══ Step 6: Saving Token IDs to JSON File ═══');
            console.log('📋 Purpose: Persist token IDs for later transfer operations');
            console.log(`   - File path: ${jsonFilePath}`);
            console.log('   - Format: JSON with timestamp and token lists');
            console.log('⏳ Writing to file...\n');
            
            const tokenData = {
                timestamp: new Date().toISOString(),
                minter1: minter1List,
                minter2: minter2List,
                totalTokens: minter1List.length + minter2List.length
            };
            const fs = require('fs').promises;
            await fs.writeFile(jsonFilePath, JSON.stringify(tokenData, null, 2), 'utf8');
            console.log(`✅ Token IDs saved successfully to ${jsonFilePath}`);
            console.log(`   - Timestamp: ${tokenData.timestamp}`);
            console.log(`   - Total tokens saved: ${tokenData.totalTokens}\n`);
            
            // Wait to ensure split operations are complete
            console.log('⏸️  Waiting 3 seconds to ensure all operations are finalized...');
            await sleep(3000);
            console.log('✅ Case 2 completed successfully\n');

        });
    });

    // Helper function to get token by ID
    async function getTokenById(minterWallet, tokenIdList, native_token_address, abi){
        // Use the provided minterWallet as signer
        const native = new ethers.Contract(
            native_token_address,
            abi,
            minterWallet
        );
        console.log(`   🔑 Signer address: ${minterWallet.address}`);

        const results = {
            success: [],
            failed: []
        };

        console.log(`   📊 Processing ${tokenIdList.length} token IDs...`);

        // Use for...of loop instead of forEach for better async control and error handling
        for (const tokenId of tokenIdList) {
            try {
                let response = await native.getToken(minterWallet.address, tokenId);
                // console.log(`   ✅ Token ${tokenId} query successful, response ID: ${response.id}`);
                results.success.push({ tokenId, response: response.id });
            } catch (error) {
                console.error(`   ❌ Token ${tokenId} query failed, error: ${error.message}`);
                results.failed.push({ tokenId, error: error.message });
            }
        }

        // Output summary results
        console.log(`\n   === Query Results Summary ===`);
        console.log(`   Total queries: ${tokenIdList.length}`);
        console.log(`   Successful: ${results.success.length}`);
        console.log(`   Failed: ${results.failed.length}`);

        if (results.failed.length > 0) {
            console.log(`\n   Failed token ID list:`);
            results.failed.forEach(item => {
                console.log(`   - ${item.tokenId}: ${item.error}`);
            });
        }

        return results;
    }

    describe.skip('Step2: Read from JSON file to verify token ids',function(){
        this.timeout(6000000);
        it.skip('Read from JSON file to verify token ids',async function(){
            console.log('\n┌────────────────────────────────────────────────────────────┐');
            console.log('│  STEP 2.1: VERIFY ALL TOKEN IDS FROM JSON FILE            │');
            console.log('└────────────────────────────────────────────────────────────┘');
            
            // 1. Read token IDs from JSON file
            console.log('\n═══ Step 1: Reading Token IDs from JSON File ═══');
            console.log('📋 Purpose: Load previously saved token IDs for verification');
            console.log(`   - File path: ${jsonFilePath}`);
            
            if (!fs.existsSync(jsonFilePath)) {
                throw new Error(`JSON file ${jsonFilePath} not found. Please run Step 1 first.`);
            }
            
            const tokenData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
            const minter1List = tokenData.minter1;
            const minter2List = tokenData.minter2;
            
            console.log(`✅ Token IDs loaded from JSON:`);
            console.log(`   - Minter1: ${minter1List.length} token IDs`);
            console.log(`   - Minter2: ${minter2List.length} token IDs`);
            console.log(`   - File timestamp: ${tokenData.timestamp}\n`);
            
            // 2. Create minter wallet instances
            console.log('═══ Step 2: Creating Wallet Instances ═══');
            console.log('📋 Purpose: Initialize wallet instances for querying tokens');
            const provider = new ethers.JsonRpcProvider(RPC);
            const minter1Wallet = new ethers.Wallet(MINTERS.minter1.privateKey, provider);
            const minter2Wallet = new ethers.Wallet(MINTERS.minter2.privateKey, provider);
            console.log(`✅ Wallets created for minter1 and minter2\n`);
            
            // 3. Check if tokens can be queried
            console.log('═══ Step 3: Verifying Token Query Availability ═══');
            console.log('📋 Purpose: Query each token from blockchain to verify existence');
            console.log('   - Action: Calling getToken() for each token ID\n');
            
            // Check minter1's tokens
            console.log('--- Checking tokens for minter1 ---');
            const minter1Results = await getTokenById(minter1Wallet, minter1List, native_token_address, abi);
            
            // Check minter2's tokens
            console.log('\n--- Checking tokens for minter2 ---');
            const minter2Results = await getTokenById(minter2Wallet, minter2List, native_token_address, abi);
            
            // Aggregate all results
            const totalResults = {
                totalTokens: minter1List.length + minter2List.length,
                totalSuccess: minter1Results.success.length + minter2Results.success.length,
                totalFailed: minter1Results.failed.length + minter2Results.failed.length
            };
            
            console.log(`\n═══ Overall Query Results Summary ═══`);
            console.log(`Total queries: ${totalResults.totalTokens}`);
            console.log(`Total successful: ${totalResults.totalSuccess}`);
            console.log(`Total failed: ${totalResults.totalFailed}`);
            console.log(`Success rate: ${((totalResults.totalSuccess / totalResults.totalTokens) * 100).toFixed(2)}%`);
            
            // Verify at least one token query succeeded
            expect(totalResults.totalSuccess).to.be.greaterThan(0, 'At least one token query should succeed');
            
            console.log('\n✅ All token queries completed successfully\n');
        })
        
        // New test case: Only query the first token of each split
        it('Read from JSON file to verify only first token of each split',async function(){
            console.log('\n┌────────────────────────────────────────────────────────────┐');
            console.log('│  STEP 2.2: VERIFY FIRST TOKEN OF EACH SPLIT               │');
            console.log('└────────────────────────────────────────────────────────────┘');
            
            // 1. Read token IDs from JSON file
            console.log('\n═══ Step 1: Reading Token IDs from JSON File ═══');
            console.log('📋 Purpose: Load token IDs and filter first token of each split');
            console.log(`   - File path: ${jsonFilePath}`);
            
            if (!fs.existsSync(jsonFilePath)) {
                throw new Error(`JSON file ${jsonFilePath} not found. Please run Step 1 first.`);
            }
            
            const tokenData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
            let minter1List = tokenData.minter1;
            let minter2List = tokenData.minter2;
            
            console.log(`✅ Original token IDs loaded:`);
            console.log(`   - Minter1: ${minter1List.length} token IDs`);
            console.log(`   - Minter2: ${minter2List.length} token IDs\n`);
            
            // 2. Keep only the first token of each split (assuming 128 tokens per split group)
            console.log('═══ Step 2: Filtering First Tokens ═══');
            console.log('📋 Purpose: Extract only the first token from each split batch');
            const splitSize = 128;
            const minter1FirstTokens = minter1List.filter((_, index) => index % splitSize === 0);
            const minter2FirstTokens = minter2List.filter((_, index) => index % splitSize === 0);
            
            console.log(`✅ Filtered to first tokens only:`);
            console.log(`   - Minter1: ${minter1FirstTokens.length} first tokens (from ${Math.ceil(minter1List.length / splitSize)} splits)`);
            console.log(`   - Minter2: ${minter2FirstTokens.length} first tokens (from ${Math.ceil(minter2List.length / splitSize)} splits)\n`);
            
            // 3. Create minter wallet instances
            console.log('═══ Step 3: Creating Wallet Instances ═══');
            const provider = new ethers.JsonRpcProvider(RPC);
            const minter1Wallet = new ethers.Wallet(MINTERS.minter1.privateKey, provider);
            const minter2Wallet = new ethers.Wallet(MINTERS.minter2.privateKey, provider);
            console.log(`✅ Wallets created for minter1 and minter2\n`);
            
            // 4. Check if tokens can be queried
            console.log('═══ Step 4: Verifying First Tokens Only ═══');
            console.log('📋 Purpose: Query only first token of each split to verify');
            console.log('   - This is faster than querying all tokens\n');
            
            // Check minter1's first tokens
            console.log('--- Checking first tokens for minter1 ---');
            const minter1Results = await getTokenById(minter1Wallet, minter1FirstTokens, native_token_address, abi);
            
            // Check minter2's first tokens
            console.log('\n--- Checking first tokens for minter2 ---');
            const minter2Results = await getTokenById(minter2Wallet, minter2FirstTokens, native_token_address, abi);
            
            // Aggregate all results
            const totalResults = {
                totalTokens: minter1FirstTokens.length + minter2FirstTokens.length,
                totalSuccess: minter1Results.success.length + minter2Results.success.length,
                totalFailed: minter1Results.failed.length + minter2Results.failed.length
            };
            
            console.log(`\n═══ Overall Query Results Summary ═══`);
            console.log(`Total queries: ${totalResults.totalTokens}`);
            console.log(`Total successful: ${totalResults.totalSuccess}`);
            console.log(`Total failed: ${totalResults.totalFailed}`);
            console.log(`Success rate: ${((totalResults.totalSuccess / totalResults.totalTokens) * 100).toFixed(2)}%`);
            
            // Verify all queried tokens succeeded
            expect(totalResults.totalSuccess).to.equal(totalResults.totalTokens, 'All first token queries should succeed');
            
            console.log('\n✅ All first token queries completed successfully\n');
        })
    })

    describe('Case 3: Read from JSON file and execute transfers', function () {
        this.timeout(6000000);
        
        it('should read token ids from JSON file and execute transfers', async function () {
            console.log('\n┌────────────────────────────────────────────────────────────┐');
            console.log('│  CASE 3: READ FROM JSON & EXECUTE TRANSFER TRANSACTIONS   │');
            console.log('└────────────────────────────────────────────────────────────┘');
            
            // 1. Read token IDs from JSON file
            console.log('\n═══ Step 1: Reading Token IDs from JSON File ═══');
            console.log('📋 Purpose: Load previously saved token IDs for transfer');
            console.log(`   - File path: ${jsonFilePath}`);
            console.log('   - Action: Reading and parsing JSON file');
            
            if (!fs.existsSync(jsonFilePath)) {
                throw new Error(`JSON file ${jsonFilePath} not found. Please run Step 1 first.`);
            }
            
            const tokenData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
            const minter1List = tokenData.minter1;
            const minter2List = tokenData.minter2;
            
            console.log(`✅ Token IDs loaded successfully:`);
            console.log(`   - Minter1: ${minter1List.length} token IDs`);
            console.log(`   - Minter2: ${minter2List.length} token IDs`);
            console.log(`   - Total: ${minter1List.length + minter2List.length} tokens to transfer`);
            console.log(`   - File timestamp: ${tokenData.timestamp}\n`);
            
            // 2. Execute transfer operations and collect statistics
            console.log('═══ Step 2: Executing Transfer Transactions ═══');
            console.log('📋 Purpose: Transfer tokens from receivers back to minters');
            console.log('   - Method: Batch signing and concurrent execution');
            console.log('   - Action: Sign all transactions first, then broadcast in batches');
            console.log('   - Pattern: Interleaved execution (minter1, minter2, minter1, minter2, ...)');
            console.log('⏳ Starting transfer execution...\n');
            
            const transferResults = await executeBatchTransfersSigned(minter1List, minter2List);
            
            // 3. Display execution results statistics
            console.log('\n═══ Transfer Execution Results ═══');
            console.log('📊 Transaction Statistics:');
            console.log(`   - Total transactions: ${transferResults.total}`);
            console.log(`   - Successful transactions: ${transferResults.success}`);
            console.log(`   - Failed transactions: ${transferResults.failed}`);
            console.log(`     • Signing failures: ${transferResults.signingFailed}`);
            console.log(`     • Execution failures: ${transferResults.executionFailed}`);
            console.log(`   - Success rate: ${((transferResults.success / transferResults.total) * 100).toFixed(2)}%`);
            console.log(`   - Total txHashes received: ${transferResults.txHashes.length}`);
            
            if (transferResults.failed > 0) {
                console.warn(`\n⚠️  Warning: ${transferResults.failed} transactions failed or are pending`);
                console.warn(`   - Failed transaction details are available in transferResults.failedTransactions`);
                console.warn(`   - Check the logs above for specific error messages`);
            }
            
            // 4. Optional: Save failed transactions to file
            if (transferResults.failedTransactions && transferResults.failedTransactions.length > 0) {
                console.log('\n═══ Step 3: Saving Failed Transactions ═══');
                console.log('📋 Purpose: Persist failed transaction details for debugging');
                const failedTxsPath = './failed_transfers.json';
                fs.writeFileSync(failedTxsPath, JSON.stringify({
                    timestamp: new Date().toISOString(),
                    totalFailed: transferResults.failedTransactions.length,
                    failures: transferResults.failedTransactions
                }, null, 2));
                console.log(`✅ Failed transactions saved to ${failedTxsPath}`);
                console.log(`   - Total failed: ${transferResults.failedTransactions.length}`);
                console.log(`   - File contains: tokenId, minterName, and error message for each failure\n`);
            }
            
            // 5. Verify at least some transactions succeeded
            console.log('═══ Step 4: Validating Results ═══');
            console.log('📋 Purpose: Ensure at least some transfers were successful');
            expect(transferResults.success).to.be.greaterThan(0, 'At least some transfers should succeed');
            console.log(`✅ Validation passed: ${transferResults.success} transfers succeeded\n`);
            
            console.log('╔════════════════════════════════════════════════════════════╗');
            console.log('║  ✅ CASE 3 COMPLETED SUCCESSFULLY                         ║');
            console.log('╚════════════════════════════════════════════════════════════╝\n');
        });
    });

    after(async function () {
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║  🎉 TEST SUITE COMPLETED SUCCESSFULLY                     ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        console.log('\n📋 Summary:');
        console.log('   ✅ Case 1: Mint allowance setup completed');
        console.log('   ✅ Case 2: Tokens minted, split, and saved to JSON');
        console.log('   ✅ Case 3: Transfer transactions executed');
        console.log(`\n📁 Generated files:`);
        console.log(`   - ${jsonFilePath} (token IDs)`);
        if (fs.existsSync('./failed_transfers.json')) {
            console.log(`   - ./failed_transfers.json (failed transactions)`);
        }
        // 计算并显示总执行时间
        const endTime = new Date();
        const durationMs = endTime - startTime;
        const durationMinutes = (durationMs / (1000 * 60)).toFixed(2);
        console.log(`\n⏱️  Execution Time: ${durationMinutes} minutes (${durationMs} ms)`);
        console.log('\n👋 Test cleanup completed.\n');
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

    // Show progress bar
    for (let i = 0; i < requests.minter1.length; i++) {
        const req = requests.minter1[i];
        const response = await client.generateBatchSplitToken(req, minter1Metadata);
        minter1Requests.push(response.request_id);

        // Display progress
        const progress = Math.round(((i + 1) / requests.minter1.length) * 100);
        console.log(`[Minter1] Progress: ${i + 1}/${requests.minter1.length} (${progress}%)`);
    }

    console.log(`[Minter2] Generating ${requests.minter2.length} split proofs`)
    const minter2Requests = [];

    // Show progress bar
    for (let i = 0; i < requests.minter2.length; i++) {
        const req = requests.minter2[i];
        const response = await client.generateBatchSplitToken(req, minter2Metadata);
        minter2Requests.push(response.request_id);

        // Display progress
        const progress = Math.round(((i + 1) / requests.minter2.length) * 100);
        console.log(`[Minter2] Progress: ${i + 1}/${requests.minter2.length} (${progress}%)`);
    }

    return { minter1: minter1Requests, minter2: minter2Requests };
}

/**
 * Execute concurrent split transactions with batch sending and waiting for batch completion
 * @param {Object} requests - Request ID list containing two minters
 * @param {number} [batchSize=20] - Number of transactions to send per batch, default is 20
 * @returns {Object} Execution result statistics
 */
async function executeBatchedConcurrentSplits(requests, batchSize = 20) {
    console.log(`\n⚡ Starting truly concurrent split transaction execution for both minters...`);
    console.log(`[Minter1] Executing ${requests.minter1.length} split requests`);
    console.log(`[Minter2] Executing ${requests.minter2.length} split requests`);

    const startTime = Date.now();

    // Get wallet instances for both minters
    const minter1Wallet = new ethers.Wallet(MINTERS.minter1.privateKey, ethers.provider);
    const minter2Wallet = new ethers.Wallet(MINTERS.minter2.privateKey, ethers.provider);

    const minter1Native = new ethers.Contract(native_token_address, abi, minter1Wallet);
    const minter2Native = new ethers.Contract(native_token_address, abi, minter2Wallet);

    const minter1Metadata = await createAuthMetadata(MINTERS.minter1.privateKey);
    const minter2Metadata = await createAuthMetadata(MINTERS.minter2.privateKey);

    // Get starting nonce
    const minter1StartNonce = await minter1Wallet.getNonce('pending');
    const minter2StartNonce = await minter2Wallet.getNonce('pending');

    // Prepare all transaction data for both minters
    console.log(`[Minter1] Preparing ${requests.minter1.length} split transactions`)
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
    console.log(`[Minter2] Preparing ${requests.minter2.length} split transactions`)
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

    // Remove pre-signing logic, send transactions directly
    console.log(`✅ Transaction data preparation completed, ready to send ${minter1TxData.length + minter2TxData.length} transactions`);

    // Prepare transaction information to be signed
    const allTxInfos = [];
    
    // Alternate adding transactions from both minters for better interleaving
    const maxLength = Math.max(minter1TxData.length, minter2TxData.length);
    for (let i = 0; i < maxLength; i++) {
        if (i < minter1TxData.length) {
            allTxInfos.push({
                data: minter1TxData[i],
                wallet: minter1Wallet,
                contract: minter1Native,
                minterName: 'minter1'
            });
        }
        if (i < minter2TxData.length) {
            allTxInfos.push({
                data: minter2TxData[i],
                wallet: minter2Wallet,
                contract: minter2Native,
                minterName: 'minter2'
            });
        }
    }

    // 1. Batch sign all transactions
    console.log(`✍️  Signing ${allTxInfos.length} split transactions...`);
    const signedTxs = await Promise.all(allTxInfos.map(async (info) => {
        const { data, wallet, contract, minterName } = info;
        try {
            const tx = await contract.split.populateTransaction(
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
            tx.from = wallet.address;
            tx.type = 0;
            const signedTx = await wallet.signTransaction(tx);
            return { signedTx, minterName, success: true };
        } catch (e) {
            return { success: false, error: e.message, minterName };
        }
    }));

    const signed = signedTxs.filter(r => r.success);
    const failedSigning = signedTxs.filter(r => !r.success);

    if (failedSigning.length > 0) {
        console.error(`❌ ${failedSigning.length} transactions failed to sign.`);
    }

    // 2. Push all signed transactions in one batch (one-time submission)
    // const results = [];
    // const BATCH_SIZE = 128; // 足够大以实现“一次性”推送
    // const pushPromises = [];
    // const pendingTxHashes = []; // 用于存储所有待确认的 TxHash
    //
    // console.log(`📤 Pushing ${signed.length} signed transactions in one go...`);
    //
    // for (let i = 0; i < signed.length; i += BATCH_SIZE) {
    //     const batch = signed.slice(i, i + BATCH_SIZE);
    //     const payload = batch.map((item, idx) => ({
    //         jsonrpc: "2.0", id: i + idx, method: "eth_sendRawTransaction", params: [item.signedTx]
    //     }));
    //
    //     const p = fetch(RPC, {
    //         method: 'POST',
    //         headers: { 'Content-Type': 'application/json' },
    //         body: JSON.stringify(payload)
    //     })
    //         .then(res => res.json())
    //         .then(res => {
    //             const batchResponses = Array.isArray(res) ? res : [res];
    //             batchResponses.forEach((resp, idx) => {
    //                 const isSuccess = !resp.error;
    //                 if (isSuccess && resp.result) {
    //                     pendingTxHashes.push(resp.result); // Record txHash
    //                 }
    //                 results.push({
    //                     success: isSuccess,
    //                     minterName: batch[idx].minterName,
    //                     error: resp.error ? resp.error.message : null
    //                 });
    //             });
    //         })
    //         .catch(err => {
    //             console.error("Batch push error:", err);
    //         });
    //
    //     pushPromises.push(p);
    // }
    // await Promise.all(pushPromises);


    // 2. Push all signed transactions in one batch (one-time submission)
    const results = [];
    const pendingTxHashes = []; // 用于存储所有待确认的 TxHash

    console.log(`📤 Pushing ${signed.length} signed transactions in one go...`);

    // 创建一个包含所有交易的单一请求
    const payload = signed.map((item, idx) => ({
        jsonrpc: "2.0", id: idx, method: "eth_sendRawTransaction", params: [item.signedTx]
    }));

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
            pendingTxHashes.push(resp.result); // Record txHash
        }
        results.push({
            success: isSuccess,
            minterName: signed[idx].minterName,
            error: resp.error ? resp.error.message : null
        });
    });
    // 3. Wait for all transactions to be mined (manual polling)
    if (pendingTxHashes.length > 0) {
        console.log(`⏳ Waiting for ${pendingTxHashes.length} transactions to be mined via polling...`);
        const waitStart = Date.now();
        
        const pollReceipt = async (hash, timeout = 60000) => {
            const start = Date.now();
            while (Date.now() - start < timeout) {
                const receipt = await ethers.provider.getTransactionReceipt(hash);
                if (receipt) return receipt;
                await new Promise(r => setTimeout(r, 1000)); // Poll every second
            }
            throw new Error(`Timeout waiting for receipt of ${hash}`);
        };

        // Poll in batches to avoid excessive RPC pressure
        const CONFIRM_BATCH = 20; 
        for (let i = 0; i < pendingTxHashes.length; i += CONFIRM_BATCH) {
            const batchHashes = pendingTxHashes.slice(i, i + CONFIRM_BATCH);
            await Promise.all(batchHashes.map(hash => 
                pollReceipt(hash).catch(e => console.warn(`\nWait failed for ${hash}: ${e.message}`))
            ));
            process.stdout.write(`\r✅ Confirmed ${Math.min(i + CONFIRM_BATCH, pendingTxHashes.length)}/${pendingTxHashes.length} transactions...`);
        }
        console.log(`\n✅ All transactions confirmed in ${(Date.now() - waitStart)/1000}s`);
    }

    const minter1Successful = results.filter(r => r.success && r.minterName === 'minter1').length;
    const minter2Successful = results.filter(r => r.success && r.minterName === 'minter2').length;

    const summary = {
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
    console.log(`✅ All split transactions executed in ${endTime - startTime}ms`);
    console.log(`📊 Minter1: ${summary.minter1.successfulTransactions}/${summary.minter1.totalTransactions} successful`);
    console.log(`📊 Minter2: ${summary.minter2.successfulTransactions}/${summary.minter2.totalTransactions} successful`);

    return summary;
}
/**
 * Extract recipient (odd index) token ID list from batch split transactions
 * @param {string} minterName - Minter name for configuration lookup
 * @param {string[]} requestIds - Transaction request ID array
 * @param {string} privateKey - Minter private key (for authentication)
 * @returns {Promise<Object>} Object containing extraction results
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
                    .filter((_, idx) => idx % 2 !== 0)  // Odd indices
                    .map(account => account.token_id)
            )
        )
    );

    return allTokenIds.flat();
}
async function executeBatchTransfersSigned(tokenList1, tokenList2) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    const processMinter = async (name, list) => {
        if (!list?.length) return [];
        const cfg = MINTERS[name];
        if (!cfg) return [];

        const wallet = new ethers.Wallet(cfg.privateKey, ethers.provider);
        const baseNonce = await wallet.getNonce('pending');

        return await Promise.all(list.map(async (t, i) => {
            try {
                const tokenId = t.tokenId || t;
                const contract = new ethers.Contract(native_token_address, abi, wallet);
                const tx = await contract.transfer.populateTransaction(tokenId, `transfer-${name}-${i}`, {
                    nonce: baseNonce + i, gasLimit: 3000000, gasPrice: 0
                });
                tx.from = wallet.address;
                tx.type = 0;
                return { signedTx: await wallet.signTransaction(tx), tokenId, minterName: name, success: true };
            } catch (e) {
                return { tokenId, minterName: name, success: false, error: e.message };
            }
        }));
    };

    // Parallel signing
    const [txs1, txs2] = await Promise.all([
        processMinter('minter1', tokenList1),
        processMinter('minter2', tokenList2)
    ]);

    const allSignedTxs = [];
    const maxLen = Math.max(txs1.length, txs2.length);
    // Alternate merge
    for (let i = 0; i < maxLen; i++) {
        if (i < txs1.length) allSignedTxs.push(txs1[i]);
        if (i < txs2.length) allSignedTxs.push(txs2[i]);
    }

    const signed = allSignedTxs.filter(r => r.success);
    const failed = allSignedTxs.filter(r => !r.success);

    if (failed.length) {
        console.error(`❌ ${failed.length} transactions failed during signing:`);
        failed.forEach((f, idx) => {
            if (idx < 5) { // Only show details of first 5 failures
                console.error(`  - TokenId: ${f.tokenId}, Minter: ${f.minterName}, Error: ${f.error}`);
            }
        });
        if (failed.length > 5) {
            console.error(`  ... and ${failed.length - 5} more signing failures`);
        }
    }

    // Batch send
    const BATCH_SIZE = 5000;
    const results = [];
    const pushPromises = [];
    const txHashMap = new Map(); // Store tokenId -> txHash mapping

    for (let i = 0; i < signed.length; i += BATCH_SIZE) {
        const batch = signed.slice(i, i + BATCH_SIZE);
        const payload = batch.map((item, idx) => ({
            jsonrpc: "2.0", id: i + idx, method: "eth_sendRawTransaction", params: [item.signedTx]
        }));

        // Calculate request size
        const requestPayloadString = JSON.stringify(payload);
        const requestSizeInBytes = Buffer.byteLength(requestPayloadString, 'utf8');
        const requestSizeInMB = requestSizeInBytes / (1024 * 1024);

        console.log(`Starting to push batch ${Math.floor(i / BATCH_SIZE) + 1}, containing ${batch.length} transactions (alternate mode), time: ${new Date().toISOString()}`);
        console.log(`Request size: ${requestSizeInMB.toFixed(2)} MB`);

        const startTime = Date.now();

        const p = fetch(RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(response => response.json())
            .then(res => {
                const endTime = Date.now();
                console.log(`Completed pushing batch ${Math.floor(i / BATCH_SIZE) + 1}, time taken: ${(endTime - startTime)/1000} seconds`);
                const batchResponses = Array.isArray(res) ? res : [res];
                batchResponses.forEach((resp, idx) => {
                    const txInfo = batch[idx];
                    if (resp.result) {
                        // Successfully obtained txHash
                        txHashMap.set(txInfo.tokenId, resp.result);
                    }
                    results.push({
                        tokenId: txInfo.tokenId,
                        minterName: txInfo.minterName,
                        txHash: resp.result,
                        error: resp.error,
                        success: !resp.error
                    });
                });
            })
            .catch(error => {
                console.error(`Error pushing batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
            });
        
        pushPromises.push(p);
        await sleep(1000); // Reduce interval to increase pressure
    }

    await Promise.all(pushPromises); // Wait for all pushes to complete

    // Collect statistics
    const successfulTxs = results.filter(r => r.success);
    const failedTxs = results.filter(r => !r.success);

    // Display failed transaction details
    if (failedTxs.length > 0) {
        console.error(`\n❌ ${failedTxs.length} transactions failed during execution:`);
        failedTxs.forEach((f, idx) => {
            if (idx < 10) { // Show details of first 10 failures
                console.error(`  - TokenId: ${f.tokenId}, Minter: ${f.minterName}, Error: ${f.error?.message || f.error}`);
            }
        });
        if (failedTxs.length > 10) {
            console.error(`  ... and ${failedTxs.length - 10} more execution failures`);
        }
    }

    return {
        total: allSignedTxs.length,
        success: successfulTxs.length,
        failed: failed.length + failedTxs.length,
        signingFailed: failed.length,
        executionFailed: failedTxs.length,
        txHashes: Array.from(txHashMap.values()),
        failedTransactions: failedTxs.map(f => ({
            tokenId: f.tokenId,
            minterName: f.minterName,
            error: f.error?.message || f.error
        }))
    };
}
async function executeBatchBurnsSigned(tokenList1, tokenList2) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    const processMinter = async (name, list) => {
        if (!list?.length) return [];
        const cfg = MINTERS[name];
        if (!cfg) return [];

        const wallet = new ethers.Wallet(cfg.privateKey, ethers.provider);
        const baseNonce = await wallet.getNonce('pending');
        return await Promise.all(list.map(async (t, i) => {
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
    };

    // Parallel signing
    const [txs1, txs2] = await Promise.all([
        processMinter('minter1', tokenList1),
        processMinter('minter2', tokenList2)
    ]);

    const allSignedTxs = [];
    const maxLen = Math.max(txs1.length, txs2.length);
    // Alternate merge
    for (let i = 0; i < maxLen; i++) {
        if (i < txs1.length) allSignedTxs.push(txs1[i]);
        if (i < txs2.length) allSignedTxs.push(txs2[i]);
    }

    const signed = allSignedTxs.filter(r => r.success);
    const failed = allSignedTxs.filter(r => !r.success);

    if (failed.length) {
        return { total: allSignedTxs.length, success: signed.length, failed: failed.length, error: 'Pre-signing failed' };
    }

    // Batch send
    const BATCH_SIZE = 4000;
    const results = [];
    const pushPromises = [];

    for (let i = 0; i < signed.length; i += BATCH_SIZE) {
        const batch = signed.slice(i, i + BATCH_SIZE);
        const payload = batch.map((item, idx) => ({
            jsonrpc: "2.0", id: i + idx, method: "eth_sendRawTransaction", params: [item.signedTx]
        }));

        console.log(`Starting to push Burn batch ${Math.floor(i / BATCH_SIZE) + 1}, containing ${batch.length} transactions (alternate mode)`);

        const p = fetch(RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(r => r.json())
            .then(res => {
                results.push(...(Array.isArray(res) ? res : []));
            })
            .catch(err => console.error("Burn push failed:", err));
        
        pushPromises.push(p);
        await sleep(200);
    }

    await Promise.all(pushPromises);

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
        throw new Error(`[${minterName}] Private key does not match configured address!`);
    }

    const minterNative = new ethers.Contract(native_token_address, abi, minterWallet);
    const minterMetadata = await createAuthMetadata(privateKey);

    try {
        // Get split details
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



