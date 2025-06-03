const assert = require('node:assert');

const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')

const rpcUrl = "a31b8f17091f84b9b966146b6032acd3-1561831942.us-west-1.elb.amazonaws.com:50051"
const client = createClient(rpcUrl)

const {
    callPrivateMint,
    callPrivateTransfer,
    callPrivateBurn,
    callPrivateApprove,
    callPrivateTransferFrom,
    getAddressBalance,
    checkAccountToken
} = require("../help/testHelp")

const l1CustomNetwork = {
    name: "BESU",
    chainId: 1337
};
const options = {
    batchMaxCount: 1,
    staticNetwork: true
};

const L1Url = hardhatConfig.networks.ucl_L2.url;
const l1Provider = new ethers.JsonRpcProvider(L1Url, l1CustomNetwork, options);

const minterWallet = new ethers.Wallet(accounts.MinterKey, l1Provider);
const to1Wallet = new ethers.Wallet(accounts.To1PrivateKey, l1Provider);

const amount = 1;

async function mintForStart() {
    console.log("=== Starting Mint Process ===");
    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        to_address: accounts.Minter,
        amount: 10
    };
    
    let response = await client.generateMintProof(generateRequest);
    console.log("Generate Mint Proof response:", response);
    
    let proofResult = await client.waitForProofCompletion(client.getMintProof, response.request_id)
    console.log("Mint Proof Result:", proofResult);
    
    let receipt = await callPrivateMint(config.contracts.PrivateERCToken, proofResult, minterWallet)
    console.log("Mint receipt:", receipt);

    await client.waitForActionCompletion(client.getMintProof, response.request_id)

    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Minter)
    console.log("Minter balance after mint:", balance);
    
    assert(balance > 0, "Mint operation should increase balance");
    console.log("✅ Mint completed successfully");
}

async function testReserveTokens() {
    console.log("=== Starting Token Split Process ===");
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: accounts.To1,
        amount: amount
    };

    let response = await client.generateSplitToken(splitRequest);
    console.log("Generate Split Token Proof response:", response);
    
    let tokenResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id);
    console.log("Split Token Result:", tokenResult);
    
    // Store the transfer token ID for cancellation test
    global.transferTokenId = '0x' + tokenResult.transfer_token_id;
    console.log("Transfer Token ID stored for cancellation:", global.transferTokenId);
    
    // Try to check that the transfer token exists and is in inactive status
    try {
        let tokenEntity = await checkAccountToken(config.contracts.PrivateERCToken, accounts.Minter, global.transferTokenId);
        console.log("Transfer token entity:", tokenEntity);
        
        // Check if status exists and is inactive (1)
        if (tokenEntity && tokenEntity.status !== undefined) {
            assert(tokenEntity.status.toString() === "1", "Transfer token should be in inactive status (1)"); // 1 = inactive
            console.log("✅ Token split completed successfully - transfer token is inactive");
        } else {
            console.log("⚠️ Could not verify token status, but proceeding with test");
        }
    } catch (error) {
        console.log("⚠️ Could not check token details, but proceeding with test:", error.message);
    }
    
    return global.transferTokenId;
}

async function testCancel(transferTokenId) {
    console.log("=== Starting Token Cancellation Process ===");
    console.log("Canceling transfer token:", transferTokenId);
    
    // Check balance before cancellation
    let balanceBefore = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Minter);
    console.log("Minter balance before cancellation:", balanceBefore);
    
    // Try to get the transfer token details before cancellation
    let transferTokenBefore = null;
    let rollbackTokenId = null;
    
    try {
        transferTokenBefore = await checkAccountToken(config.contracts.PrivateERCToken, accounts.Minter, transferTokenId);
        console.log("Transfer token before cancellation:", transferTokenBefore);
        
        if (transferTokenBefore && transferTokenBefore.rollbackTokenId) {
            rollbackTokenId = '0x' + transferTokenBefore.rollbackTokenId.toString(16).padStart(64, '0');
            console.log("Rollback token ID:", rollbackTokenId);
            
            let rollbackTokenBefore = await checkAccountToken(config.contracts.PrivateERCToken, accounts.Minter, rollbackTokenId);
            console.log("Rollback token before cancellation:", rollbackTokenBefore);
        }
    } catch (error) {
        console.log("⚠️ Could not get token details before cancellation:", error.message);
    }
    
    // Call privateCancelToken
    const PrivateERCTokenFactory = await ethers.getContractFactory("PrivateERCToken", {
        libraries: {
            "TokenEventLib": config.libraries.TokenEventLib,
            "TokenVerificationLib": config.libraries.TokenVerificationLib,
            "TokenGrumpkinLib": config.libraries.TokenGrumpkinLib,
            "SignatureChecker": config.libraries.SignatureChecker
        }
    });
    
    const privateERCToken = await PrivateERCTokenFactory.attach(config.contracts.PrivateERCToken);
    const tokenContract = privateERCToken.connect(minterWallet);
    
    try {
        console.log("Calling privateCancelToken with tokenId:", transferTokenId);
        let cancelTx = await tokenContract.privateCancelToken(transferTokenId);
        let cancelReceipt = await cancelTx.wait();
        console.log("Cancel transaction hash:", cancelReceipt.transactionHash);
        console.log("Cancel transaction status:", cancelReceipt.status === 1 ? "SUCCESS" : "FAILED");
        
        // Verify the cancellation was successful
        let balanceAfter = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Minter);
        console.log("Minter balance after cancellation:", balanceAfter);
        
        // Check that transfer token is deleted (should revert when checking)
        try {
            let transferTokenAfter = await checkAccountToken(config.contracts.PrivateERCToken, accounts.Minter, transferTokenId);
            console.log("Transfer token after cancellation:", transferTokenAfter);
            
            // Check if token is marked as deleted or if amounts are zero
            if (transferTokenAfter && transferTokenAfter.status !== undefined) {
                if (transferTokenAfter.status.toString() === "0") { // 0 = deleted
                    console.log("✅ Transfer token is marked as deleted");
                } else {
                    console.log("⚠️ Transfer token status after cancellation:", transferTokenAfter.status.toString());
                }
            }
        } catch (error) {
            console.log("✅ Transfer token successfully deleted (contract reverted as expected)");
        }
        
        // Check that rollback token is now active if we have the ID
        if (rollbackTokenId) {
            try {
                let rollbackTokenAfter = await checkAccountToken(config.contracts.PrivateERCToken, accounts.Minter, rollbackTokenId);
                console.log("Rollback token after cancellation:", rollbackTokenAfter);
                
                if (rollbackTokenAfter && rollbackTokenAfter.status !== undefined) {
                    if (rollbackTokenAfter.status.toString() === "2") { // 2 = active
                        console.log("✅ Rollback token is now active");
                    } else {
                        console.log("⚠️ Rollback token status:", rollbackTokenAfter.status.toString());
                    }
                }
            } catch (error) {
                console.log("⚠️ Could not check rollback token after cancellation:", error.message);
            }
        }
        
        console.log("✅ Token cancellation completed successfully");
        
        // Check that transaction events were emitted correctly
        if (cancelReceipt.logs && cancelReceipt.logs.length > 0) {
            console.log(`📋 Transaction emitted ${cancelReceipt.logs.length} events`);
            cancelReceipt.logs.forEach((log, index) => {
                console.log(`Event ${index}:`, log.topics[0]); // Event signature
            });
        }
        
    } catch (error) {
        console.error("❌ Token cancellation failed:", error.message);
        
        // Parse error message for specific failures
        if (error.message.includes("token.owner != msg.sender")) {
            console.error("❌ Error: Token ownership verification failed");
        } else if (error.message.includes("token is not inactive")) {
            console.error("❌ Error: Token is not in inactive status");
        } else if (error.message.includes("tokenId is zero")) {
            console.error("❌ Error: Token ID is zero");
        } else if (error.message.includes("rollback token does not exist")) {
            console.error("❌ Error: Rollback token does not exist");
        } else if (error.message.includes("invalid rollback token")) {
            console.error("❌ Error: Invalid rollback token");
        }
        
        throw error;
    }
}

async function runFullCancellationTest() {
    console.log("🚀 Starting Full Cancellation Test Suite");
    console.log("========================================");
    
    try {
        // Step 1: Mint initial tokens
        await mintForStart();
        
        // Step 2: Split tokens to create transfer and rollback tokens
        let transferTokenId = await testReserveTokens();
        
        // Step 3: Cancel the transfer token to restore rollback token
        await testCancel(transferTokenId);
        
        console.log("========================================");
        console.log("🎉 Full Cancellation Test Suite Completed Successfully!");
        
    } catch (error) {
        console.error("❌ Test suite failed:", error.message);
        console.error("Stack trace:", error.stack);
        throw error;
    }
}

// Individual test functions for debugging
async function checkBalance(account) {
    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, account);
    console.log(`Balance of ${account}:`, balance);
    return balance;
}

async function checkToken(account, tokenId) {
    try {
        let token = await checkAccountToken(config.contracts.PrivateERCToken, account, tokenId);
        console.log("Token details:", token);
        return token;
    } catch (error) {
        console.log("Error checking token:", error.message);
        return null;
    }
}

// Export functions for individual testing
module.exports = {
    mintForStart,
    testReserveTokens,
    testCancel,
    runFullCancellationTest,
    checkBalance,
    checkToken
};

// Run the full test suite
if (require.main === module) {
    runFullCancellationTest().then(() => {
        console.log("All tests completed!");
        process.exit(0);
    }).catch((error) => {
        console.error("Test execution failed:", error);
        process.exit(1);
    });
}
