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
    callPrivateApprove,
    callPrivateTransferFrom,
    getAddressBalance2,
    createAuthMetadata,
    getApprovedAllowance,
    getApproveTokenList
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
const spenderWallet = new ethers.Wallet(accounts.To1PrivateKey, l1Provider);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function mintForStart(amount = 100) {
    console.log("=== Starting Mint Process ===");
    const metadata = await createAuthMetadata(accounts.MinterKey);
    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        to_address: accounts.Minter,
        amount: amount
    };

    let response = await client.generateMintProof(generateRequest, metadata);
    console.log("Generate Mint Proof response:", response);

    let receipt = await callPrivateMint(config.contracts.PrivateERCToken, response, minterWallet)
    console.log("Mint receipt:", receipt);

    await sleep(2000)

    let balance = await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.Minter, metadata)
    console.log("Minter balance after mint:", balance);

    assert(parseInt(balance.balance) >= amount, "Mint operation should increase balance");
    console.log("✅ Mint completed successfully");
    
    return response;
}

async function testApproveMultipleTokens() {
    console.log("=== Starting Multiple Token Approval Process ===");
    
    // 先铸造一些代币
    await mintForStart(50);
    
    const metadata = await createAuthMetadata(accounts.MinterKey);
    
    // 第一次授权
    console.log("--- First Approval ---");
    const splitRequest1 = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: accounts.Spender1,
        amount: 10
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
        amount: 15
    };

    let response2 = await client.generateSplitToken(splitRequest2, metadata);
    console.log("Second Generate Split Token Proof response:", response2);

    await client.waitForActionCompletion(client.getTokenActionStatus, response2.request_id, metadata);
    console.log("Second Split Token completed successfully");

    // 存储第二个授权token ID
    const secondApprovalTokenId = '0x' + response2.transfer_token_id;
    console.log("Second Approval Token ID:", secondApprovalTokenId);
    
    // 检查授权列表
    console.log("--- Checking Approval List ---");
    let approvedTokens = await getApproveTokenList(client, accounts.Minter, config.contracts.PrivateERCToken, accounts.Spender1, metadata);
    console.log("Approved tokens for Spender1:", approvedTokens);
    
    // 验证授权列表包含两个token
    assert(approvedTokens.token_ids.length >= 2, "Should have at least 2 approved tokens");
    
    console.log("✅ Multiple token approval completed successfully");
    
    return {
        firstApprovalTokenId,
        secondApprovalTokenId,
        approvedTokens
    };
}

async function testTransferFromMultipleApprovedTokens(approvalData) {
    console.log("=== Starting Transfer From Multiple Approved Tokens ===");
    
    const { firstApprovalTokenId, secondApprovalTokenId } = approvalData;
    
    // 使用 spender 钱包执行 transferFrom 操作
    console.log("--- Transferring First Approved Token ---");
    try {
        const receipt1 = await callPrivateTransferFrom(spenderWallet, config.contracts.PrivateERCToken, accounts.Minter, accounts.To1, firstApprovalTokenId);
        console.log("First transferFrom receipt:", receipt1);
        console.log("✅ First token transferred successfully");
    } catch (error) {
        console.error("❌ First transferFrom failed:", error.message);
        throw error;
    }
    
    // 等待一段时间
    await sleep(2000);
    
    console.log("--- Transferring Second Approved Token ---");
    try {
        const receipt2 = await callPrivateTransferFrom(spenderWallet, config.contracts.PrivateERCToken, accounts.Minter, accounts.To1, secondApprovalTokenId);
        console.log("Second transferFrom receipt:", receipt2);
        console.log("✅ Second token transferred successfully");
    } catch (error) {
        console.error("❌ Second transferFrom failed:", error.message);
        throw error;
    }
    
    console.log("✅ Multiple token transferFrom completed successfully");
}

async function runMultiApproveTest() {
    console.log("🚀 Starting Multi Approve Test Suite");
    console.log("=====================================");
    
    try {
        // 步骤1: 授权多个token给同一用户
        let approvalData = await testApproveMultipleTokens();
        
        // 步骤2: 使用被授权的token执行transferFrom操作
        await testTransferFromMultipleApprovedTokens(approvalData);
        
        console.log("=====================================");
        console.log("🎉 Multi Approve Test Suite Completed Successfully!");
        
    } catch (error) {
        console.error("❌ Test suite failed:", error.message);
        console.error("Stack trace:", error.stack);
        throw error;
    }
}

// 直接运行测试套件
if (require.main === module) {
    runMultiApproveTest().then(() => {
        console.log("All tests completed!");
        process.exit(0);
    }).catch((error) => {
        console.error("Test execution failed:", error);
        process.exit(1);
    });
}