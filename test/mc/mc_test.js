const assert = require('node:assert');

const {ethers, network} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')

const rpcUrl = "qa-node3-rpc.hamsa-ucl.com:50051"
const client = createClient(rpcUrl)

const {
    callPrivateMint,
    callPrivateTransfer,
    callPrivateTransfers,
    callPrivateBurn,
    callPrivateApprove,
    callPrivateTransferFrom,
    getAddressBalance,
    getAddressBalance2,
    createAuthMetadata,
    getApproveTokenList
} = require("../help/testHelp")
const deployed = require("../../deployments/image9.json");

const l1CustomNetwork = {
    name: "BESU",
    chainId: 1337
};
const options = {
    batchMaxCount: 1,
    staticNetwork: true
};

const CONSTANTS = {
    // Network configuration
    network: {
        name: "BESU",
        chainId: 1337
    },

    // Provider options
    providerOptions: {
        batchMaxCount: 1,
        staticNetwork: true
    },

    // Test amount
    defaultAmount: 1,

    // Wait times (milliseconds)
    waitTimes: {
        short: 1000,
        medium: 2000,
        long: 5000
    }
};

let L1Url;
const networkName = network.name;
if (hardhatConfig.networks[networkName] && hardhatConfig.networks[networkName].url) {
    L1Url = hardhatConfig.networks[networkName].url
}

console.log('L1Url:', L1Url)

const l1Provider = new ethers.JsonRpcProvider(L1Url, l1CustomNetwork, options);

const minterWallet = new ethers.Wallet(accounts.MinterKey, l1Provider);
const to1Wallet = new ethers.Wallet(accounts.To1PrivateKey, l1Provider);

const amount = 1;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function mintForStart() {
    console.log("=== Starting Mint Process ===");
    const metadata = await createAuthMetadata(accounts.MinterKey);
    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address:accounts.Minter,
        to_address: accounts.Minter,
        amount: 100
    };

    let response = await client.generateMintProof(generateRequest, metadata);
    console.log("Generate Mint Proof response:", response);

    let receipt = await callPrivateMint(config.contracts.PrivateERCToken, response, minterWallet)
    console.log("Mint receipt:", receipt);

    await sleep(2000)

    console.log("Checking privateTotalSupply after mint...");
    const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, minterWallet);
    const privateTotalSupply = await contract.privateTotalSupply();
    console.log("Private total supply after mint:", privateTotalSupply);

    await sleep(2000)
    console.log("✅ Mint completed successfully");
}

async function testBurnToken() {
    console.log("=== Starting Token Burn Process ===");
    try {
        const metadata = await createAuthMetadata(accounts.MinterKey);

        const splitRequest = {
            sc_address: config.contracts.PrivateERCToken,
            token_type: '0',
            from_address: accounts.Minter,
            to_address: accounts.Minter,
            amount: CONSTANTS.defaultAmount,
            comment: "for burn"
        };

        console.log("Splitting token...");
        let response = await client.generateSplitToken(splitRequest, metadata);
        console.log("Token split response:", response);

        await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);

        await sleep(CONSTANTS.waitTimes.long);

        console.log("Burning split token...");
        let receipt = await callPrivateBurn(
            config.contracts.PrivateERCToken,
            minterWallet,
            '0x' + response.transfer_token_id
        );

        await sleep(CONSTANTS.waitTimes.medium);

        console.log("Burning split token success!")

        return receipt;
    } catch (error) {
        console.error(`Reserve tokens and burn test failed: ${error.message}`);
        throw error;
    }
}

async function testApproveToken() {
    console.log("=== Starting Token Approval Process ===");

    const metadata = await createAuthMetadata(accounts.MinterKey);
    const approveRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        spender_address: accounts.Spender1,
        to_address: accounts.To1,
        amount: CONSTANTS.defaultAmount,
        comment : "123"
    };

    console.log("Generating approval proof...");
    let response = await client.generateApproveProof(approveRequest, metadata);
    console.log("Approval proof response:", response);

    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);
    await sleep(CONSTANTS.waitTimes.medium);
    console.log("✅ Token approval completed successfully");
    
    return '0x' + response.transfer_token_id;
}

async function testTransferFrom(approveTokenId) {
    console.log("=== Starting Transfer From Process ===");
    console.log("Transferring token ID:", approveTokenId);
    
    // Use Spender1 wallet to transfer the approved token to To1
    const spender1Wallet = new ethers.Wallet(accounts.Spender1Key, l1Provider);
    
    // Transfer the approved token from Minter to To1 using Spender1's authority
    let receipt = await callPrivateTransferFrom(
        spender1Wallet,
        config.contracts.PrivateERCToken,
        accounts.Minter,
        accounts.To1,
        approveTokenId
    );
    console.log("TransferFrom receipt:", receipt);

    await sleep(2000);
    console.log("✅ TransferFrom completed successfully");
}

async function testSplitTokens() {
    console.log("=== Starting Token Split Process ===");
    const metadata = await createAuthMetadata(accounts.MinterKey);
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: accounts.To1,
        amount: amount
    };

    let response = await client.generateSplitToken(splitRequest, metadata);
    console.log("Generate Split Token Proof response:", response);

    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);
    console.log("Split Token completed successfully");

    // Store the transfer token ID for cancellation test (use response.transfer_token_id)
    global.transferTokenId = '0x' + response.transfer_token_id;
    console.log("Transfer Token ID stored for cancellation:", global.transferTokenId);

    console.log("✅ Token split completed successfully");

    return global.transferTokenId;
}

async function testApproveMultipleTokens() {
    console.log("=== Starting Multiple Token Approval Process ===");
    const metadata = await createAuthMetadata(accounts.MinterKey);

    // 第一次授权
    console.log("--- First Approval ---");
    const splitRequest1 = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: accounts.Spender1,
        amount: 1,
        comment: "Approval"
    };

    let response1 = await client.generateSplitToken(splitRequest1, metadata);
    console.log("First Generate Split Token Proof response:", response1);

    await client.waitForActionCompletion(client.getTokenActionStatus, response1.request_id, metadata);
    console.log("First Split Token completed successfully");

    // 存储第一个授权token ID
    const firstApprovalTokenId = '0x' + response1.transfer_token_id;
    console.log("First Approval Token ID:", firstApprovalTokenId);

    // 第二次授权
    console.log("--- Second Approval ---");
    const splitRequest2 = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: accounts.Spender1,
        amount: 1,
        comment: "Approval"
    };

    let response2 = await client.generateSplitToken(splitRequest2, metadata);
    console.log("Second Generate Split Token Proof response:", response2);

    await client.waitForActionCompletion(client.getTokenActionStatus, response2.request_id, metadata);
    console.log("Second Split Token completed successfully");

    // 存储第二个授权token ID
    const secondApprovalTokenId = '0x' + response2.transfer_token_id;
    console.log("Second Approval Token ID:", secondApprovalTokenId);

    var approvedTokens
    // 检查授权列表,查询10次
    for (let i = 0; i < 10; i++) {
        await sleep(2000);
        console.log("--- Checking Approval List ---");

        // 直接调用合约方法而不是使用gRPC客户端
        const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, minterWallet);
        console.log("需要查询授权列表，原查询方法废弃")
        // const allowanceTokens = await contract.getAllowanceTokens(accounts.Spender1);
        // console.log("Approved tokens for Spender1 (from contract):", allowanceTokens);

        approvedTokens = await getApproveTokenList(client, accounts.Minter, config.contracts.PrivateERCToken, accounts.Spender1, metadata);
        console.log("Approved tokens for Spender1 (from gRPC):", approvedTokens);
    }


    console.log("✅ Multiple token approval completed successfully");

    return {
        firstApprovalTokenId,
        secondApprovalTokenId
    };
}

async function testCancel(transferTokenId) {
    console.log("=== Starting Token Cancellation Process ===");
    console.log("Transfer Token ID to cancel:", transferTokenId);

    const metadata = await createAuthMetadata(accounts.MinterKey);
    const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, minterWallet);
    const tx = await contract.privateCancelToken(transferTokenId);
    const receipt = await tx.wait();
    console.log("Cancel receipt:", receipt);

    await sleep(2000)

    console.log("✅ Cancel completed successfully");
}

async function checkToken(account, tokenId) {
    try {
        console.log("Token checking not available, skipping...");
        return null;
    } catch (error) {
        console.log("Error checking token:", error.message);
        return null;
    }
}

async function testTransfer() {
    try {
        const metadata = await createAuthMetadata(accounts.MinterKey);
        const splitRequest = {
            sc_address: config.contracts.PrivateERCToken,
            token_type: '0',
            from_address: accounts.Minter,
            to_address: accounts.To1,
            amount: CONSTANTS.defaultAmount,
            comment:"123"
        };

        console.log("Splitting token...");
        let response = await client.generateSplitToken(splitRequest, metadata);
        console.log("Token split response:", response);

        await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);

        await sleep(10000)

        console.log("Transferring split token with privateTransfer...");
        let receipt = await callPrivateTransfer(
            minterWallet,
            config.contracts.PrivateERCToken,
            '0x' + response.transfer_token_id
        );

        await sleep(CONSTANTS.waitTimes.short);
        console.log("Private transfer successful!");

        return receipt;
    } catch (error) {
        console.error(`Reserve tokens and transfer test failed: ${error.message}`);
        throw error;
    }
}

async function testTransfers() {
    try {
        console.log("Starting reserve tokens and transfer test...");
        const metadata = await createAuthMetadata(accounts.MinterKey);
        const splitRequest = {
            sc_address: config.contracts.PrivateERCToken,
            token_type: '0',
            from_address: accounts.Minter,
            to_address: accounts.To1,
            amount: CONSTANTS.defaultAmount,
            comment:"123"
        };

        console.log("Splitting token...");
        let response = await client.generateSplitToken(splitRequest, metadata);
        console.log("Token split response:", response);

        await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);

        await sleep(10000)

        console.log("Transferring split token with privateTransfers...");
        let receipt = await callPrivateTransfers(
            minterWallet,
            config.contracts.PrivateERCToken,
            ['0x' + response.transfer_token_id]
        );

        await sleep(CONSTANTS.waitTimes.short);
        console.log("PrivateTransfers test successful!");

        return receipt;
    } catch (error) {
        console.error(`Reserve tokens and transfers test failed: ${error.message}`);
        throw error;
    }
}

async function runMainTestProcess() {
    console.log("🚀 Start");
    console.log("========================================");

    try {
        await mintForStart();

        await sleep(5000);

        // Test burn functionality
        await testBurnToken();
        
        await sleep(5000);

        // Test approve functionality
        const approvedTokenId = await testApproveToken();
        
        await sleep(10000);

        // Test transferFrom functionality
        await testTransferFrom(approvedTokenId);
        
        await sleep(5000);

        // Test transfer functionality
        await testTransfer();
        
        await sleep(5000);
        
        // Test transfers functionality
        await testTransfers();

        console.log("========================================");
        console.log("🎉 Test Suite Completed Successfully!");
        
    } catch (error) {
        console.error("❌ Test suite failed:", error.message);
        console.error("Stack trace:", error.stack);
        throw error;
    }
}



if (require.main === module) {
    mintForStart().then(() => {
        console.log("All tests completed!");
        process.exit(0);
    }).catch((error) => {
        console.error("Test execution failed:", error);
        process.exit(1);
    });
}
