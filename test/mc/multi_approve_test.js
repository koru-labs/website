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
const spenderWallet = new ethers.Wallet(accounts.Spender1Key, l1Provider);

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
        amount: amount,
        comment: "Mint"
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

async function testApproveToken() {
    console.log("=== Starting Token Approval Process ===");

    const metadata = await createAuthMetadata(accounts.MinterKey);
    const splitRequest1 = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        spender_address: accounts.Spender1,
        to_address: accounts.To1,
        amount: 10,
        comment:"123"
    };
    let response1 = await client.generateApproveProof(splitRequest1, metadata);
    console.log("First Generate Split Token Proof response:", response1);

    await client.waitForActionCompletion(client.getTokenActionStatus, response1.request_id, metadata);
    console.log("First Split Token completed successfully");

    let tokenId = "0x"+response1.transfer_token_id;
    console.log("Token ID:", tokenId);

    return  tokenId;
}

async function testTransferFrom(tokenId) {
    console.log("Executing authorized transfer...");

    let receipt = await callPrivateTransferFrom(
        spenderWallet,
        config.contracts.PrivateERCToken,
        accounts.Minter,
        accounts.To1,
        tokenId
    );
    console.log("Authorized transfer receipt:", receipt);
}

async function runMultiApproveTest() {
    console.log("🚀 Starting Multi Approve Test Suite");
    console.log("=====================================");

    try {
        await mintForStart(50);

        let tokenId = await testApproveToken();

        await testTransferFrom(tokenId)

        let tokenId2 = await testApproveToken();

        await testTransferFrom(tokenId2)

        const metadata = await createAuthMetadata(accounts.To1PrivateKey);
        let balance = await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.To1, metadata)
        console.log("To1 balance after TransferFrom:", balance);

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