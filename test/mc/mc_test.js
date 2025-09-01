const assert = require('node:assert');

const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')

const rpcUrl = "qa-node3-rpc.hamsa-ucl.com:50051"
const client = createClient(rpcUrl)

const {
    callPrivateMint,
    callPrivateTransfer,
    callPrivateBurn,
    callPrivateApprove,
    callPrivateTransferFrom,
    getAddressBalance,
    getAddressBalance2,
    createAuthMetadata, getApproveTokenList
} = require("../help/testHelp")

const l1CustomNetwork = {
    name: "BESU",
    chainId: 1337
};
const options = {
    batchMaxCount: 1,
    staticNetwork: true
};

const CONSTANTS = {
    // RPC URL configuration
    // rpcUrl: "127.0.0.1:50051",
    rpcUrl: "qa-node3-rpc.hamsa-ucl.com:50051",
    // rpcUrl: "a9c20a6c009e44a11b75092155632a0e-1098386893.us-west-1.elb.amazonaws.com:50051",

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


const L1Url = hardhatConfig.networks.ucl_L2.url;
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
        to_address: accounts.Minter,
        amount: 100
    };

    let response = await client.generateMintProof(generateRequest, metadata);
    console.log("Generate Mint Proof response:", response);

    let receipt = await callPrivateMint(config.contracts.PrivateERCToken, response, minterWallet)
    console.log("Mint receipt:", receipt);

    await sleep(2000)

    let balance = await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.Minter, metadata)
    console.log("Minter balance after mint:", balance);

    assert(parseInt(balance.balance) > 0, "Mint operation should increase balance");
    console.log("✅ Mint completed successfully");
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

    let balance = await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.Minter, metadata);
    console.log("Minter balance after cancellation:", balance);

    assert(parseInt(balance.balance) > 0, "Cancel operation should restore balance");
    console.log("✅ Cancel completed successfully");
}

async function checkBalance(account) {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    let balance = await getAddressBalance2(client, config.contracts.PrivateERCToken, account, metadata);
    console.log(`Balance of ${account}:`, balance);
    return balance;
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
        const metadata2 = await createAuthMetadata(accounts.To1PrivateKey);

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

        console.log("Transferring split token...");
        let receipt = await callPrivateTransfer(
            minterWallet,
            config.contracts.PrivateERCToken,
            accounts.To1,
            '0x' + response.transfer_token_id
        );

        await sleep(CONSTANTS.waitTimes.short);

        console.log("Checking balances after transfer...");
        await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.Minter, metadata);
        await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.To1, metadata2);

        return receipt;
    } catch (error) {
        console.error(`Reserve tokens and transfer test failed: ${error.message}`);
        throw error;
    }
}

async function runMainTestProcess() {
    console.log("🚀 Start");
    console.log("========================================");
    
    try {

        await mintForStart();

        await testTransfer();
        
        console.log("========================================");
        console.log("🎉 Test Suite Completed Successfully!");
        
    } catch (error) {
        console.error("❌ Test suite failed:", error.message);
        console.error("Stack trace:", error.stack);
        throw error;
    }
}



if (require.main === module) {
    runMainTestProcess().then(() => {
        console.log("All tests completed!");
        process.exit(0);
    }).catch((error) => {
        console.error("Test execution failed:", error);
        process.exit(1);
    });
}
