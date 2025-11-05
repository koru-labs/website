const assert = require('node:assert');

const {ethers, network} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const { getImage9EnvironmentData } = require("../../script/deploy_help");
const config = getImage9EnvironmentData();
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')

const rpcUrl = "qa-node3-rpc.hamsa-ucl.com:50051"
const client = createClient(rpcUrl)

const {
    callPrivateMint,
    callPrivateTransferFromBatch,
    createAuthMetadata,
} = require("../help/testHelp")

const l1CustomNetwork = {
    name: "BESU",
    chainId: 1337
};
const options = {
    batchMaxCount: 1,
    staticNetwork: true
};

let L1Url;
const networkName = network.name;
if (hardhatConfig.networks[networkName] && hardhatConfig.networks[networkName].url) {
    L1Url = hardhatConfig.networks[networkName].url
}

console.log('L1Url:', L1Url)

const l1Provider = new ethers.JsonRpcProvider(L1Url, l1CustomNetwork, options);

const minterWallet = new ethers.Wallet(accounts.MinterKey, l1Provider);
const spender1Wallet = new ethers.Wallet(accounts.Spender1Key, l1Provider);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 解析 TokenReceived 事件
 * TokenReceived 事件是通过 HamsaL2Event 的 EventReceived 事件发出的
 */
async function parseTokenReceivedEvent(receipt, l2EventAddress) {
    console.log("Total logs in receipt:", receipt.logs.length);
    console.log("Looking for events from L2Event:", l2EventAddress);

    // HamsaL2Event 的 EventReceived 事件（注意：没有 indexed 参数）
    const l2EventInterface = new ethers.Interface([
        "event EventReceived(string eventId, address eventSource, address eventAccount, string topic, bytes eventBody)"
    ]);

    // TokenReceivedEvent 结构
    const tokenReceivedStruct = "tuple(uint256 id, address tokenSCAddress, address owner, uint8 status, tuple(uint256 cl_x, uint256 cl_y, uint256 cr_x, uint256 cr_y) amount)";

    // 打印所有日志的地址和 topics
    console.log("\nAll logs:");
    receipt.logs.forEach((log, index) => {
        console.log(`  Log ${index}: address=${log.address}, topics=${log.topics.length}`);
    });
    console.log();

    for (const log of receipt.logs) {
        // 只处理来自 HamsaL2Event 合约的日志
        if (log.address.toLowerCase() !== l2EventAddress) {
            continue;
        }

        try {
            const parsed = l2EventInterface.parseLog({
                topics: log.topics,
                data: log.data
            });

            console.log(`Found EventReceived from HamsaL2Event: topic="${parsed.args.topic}"`);

            if (parsed && parsed.name === "EventReceived" && parsed.args.topic === "TokenReceived") {
                console.log("✓ Found EventReceived with topic 'TokenReceived'");
                console.log("  Event ID:", parsed.args.eventId);
                console.log("  Event Source:", parsed.args.eventSource);
                console.log("  Event Account:", parsed.args.eventAccount);

                // 解码 eventBody
                const abiCoder = ethers.AbiCoder.defaultAbiCoder();
                const decoded = abiCoder.decode([tokenReceivedStruct], parsed.args.eventBody);
                const tokenReceivedEvent = decoded[0];

                console.log("  Decoded TokenReceived:");
                console.log("    id:", tokenReceivedEvent.id.toString());
                console.log("    tokenSCAddress:", tokenReceivedEvent.tokenSCAddress);
                console.log("    owner:", tokenReceivedEvent.owner);
                console.log("    status:", tokenReceivedEvent.status);

                return {
                    id: tokenReceivedEvent.id,
                    tokenSCAddress: tokenReceivedEvent.tokenSCAddress,
                    owner: tokenReceivedEvent.owner,
                    status: tokenReceivedEvent.status,
                    amount: tokenReceivedEvent.amount
                };
            }
        } catch (e) {
            console.log(`  Failed to parse log from HamsaL2Event: ${e.message}`);
        }
    }

    console.log("❌ TokenReceived event not found in any EventReceived logs from HamsaL2Event");
    return null;
}

/**
 * 步骤1: Mint 初始代币
 */
async function mintTokens() {
    console.log("\n=== Step 1: Minting Initial Tokens ===");
    const metadata = await createAuthMetadata(accounts.MinterKey);
    
    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: accounts.Minter,
        amount: 100
    };

    let response = await client.generateMintProof(generateRequest, metadata);
    console.log("✓ Mint proof generated");

    let receipt = await callPrivateMint(config.contracts.PrivateERCToken, response, minterWallet);
    console.log("✓ Mint transaction completed");

    await sleep(2000);
    console.log("✅ Mint completed successfully\n");
}

/**
 * 步骤2: 创建 Approve Token
 */
async function createApproveToken() {
    console.log("=== Step 2: Creating Approve Token ===");
    const metadata = await createAuthMetadata(accounts.MinterKey);
    
    const approveRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        spender_address: accounts.Spender1,
        to_address: accounts.To1,
        amount: 10,
        comment: "test approve"
    };

    console.log("Generating approval proof...");
    let response = await client.generateApproveProof(approveRequest, metadata);
    console.log("✓ Approval proof generated");
    console.log("  Transfer Token ID:", response.transfer_token_id);

    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);
    await sleep(2000);
    
    const approveTokenId = ethers.toBigInt(response.transfer_token_id);
    console.log("✅ Approve token created successfully");
    console.log("  Token ID (BigInt):", approveTokenId.toString());
    console.log("  Token ID (Hex):", ethers.toBeHex(approveTokenId));
    console.log();
    
    return approveTokenId;
}

/**
 * 步骤3: 执行 TransferFrom 并检查事件
 */
async function testTransferFromEvent(approveTokenId) {
    console.log("=== Step 3: Testing TransferFrom Event ===");
    console.log("Input Token ID:", approveTokenId.toString());
    console.log("Input Token ID (Hex):", ethers.toBeHex(approveTokenId));
    console.log();

    // 从 PrivateERCToken 合约获取实际的 L2Event 地址
    console.log("Getting L2Event address from PrivateERCToken contract...");
    const privateToken = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken);
    const l2EventAddress = await privateToken.getL2Event();
    console.log("✓ L2Event address from contract:", l2EventAddress);
    console.log();

    // 执行 transferFrom
    console.log("Executing privateTransferFromBatch...");
    let receipt = await callPrivateTransferFromBatch(
        spender1Wallet,
        config.contracts.PrivateERCToken,
        accounts.Minter,
        accounts.To1,
        [approveTokenId]
    );

    console.log("✓ Transaction completed");
    console.log("  Transaction hash:", receipt.hash);
    console.log();

    // 解析 TokenReceived 事件
    console.log("Parsing TokenReceived event from transaction logs...");
    const tokenReceivedEvent = await parseTokenReceivedEvent(receipt, l2EventAddress.toLowerCase());

    if (!tokenReceivedEvent) {
        console.error("\n❌ ERROR: TokenReceived event not found!");
        return false;
    }

    console.log();
    console.log("=== Verification ===");
    console.log("Expected Token ID:", approveTokenId.toString());
    console.log("Actual Event ID:  ", tokenReceivedEvent.id.toString());
    console.log();

    if (tokenReceivedEvent.id === 0n) {
        console.error("❌ FAILED: Event tokenId is 0!");
        console.error("   This is the bug we're testing for.");
        console.error("   The tokenId in triggerTokenReceivedEvent became 0!");
        return false;
    }

    if (tokenReceivedEvent.id !== approveTokenId) {
        console.error("❌ FAILED: Event tokenId doesn't match!");
        console.error("   Expected:", approveTokenId.toString());
        console.error("   Got:     ", tokenReceivedEvent.id.toString());
        console.error("   Difference:", (approveTokenId - tokenReceivedEvent.id).toString());
        return false;
    }

    console.log("✅ SUCCESS: Event tokenId is correct!");
    console.log("   The tokenId matches the input approveTokenId");
    console.log();

    return true;
}

/**
 * 主测试流程
 */
async function runTest() {
    console.log("========================================");
    console.log("Testing privateTransferFromBatch Event");
    console.log("========================================");
    console.log("Contract:", config.contracts.PrivateERCToken);
    console.log("HamsaL2Event:", config.contracts.HamsaL2Event);
    console.log("Minter:", accounts.Minter);
    console.log("Spender:", accounts.Spender1);
    console.log("Recipient:", accounts.To1);
    console.log("========================================\n");

    try {
        // 步骤1: Mint
        await mintTokens();
        
        // 步骤2: Approve
        const approveTokenId = await createApproveToken();
        
        // 步骤3: TransferFrom 并验证事件
        const success = await testTransferFromEvent(approveTokenId);
        
        console.log("========================================");
        if (success) {
            console.log("🎉 Test PASSED!");
            console.log("   TokenReceived event has correct tokenId");
        } else {
            console.log("❌ Test FAILED!");
            console.log("   TokenReceived event has incorrect tokenId");
        }
        console.log("========================================");
        
        return success;
        
    } catch (error) {
        console.error("\n========================================");
        console.error("❌ Test execution failed!");
        console.error("Error:", error.message);
        console.error("Stack:", error.stack);
        console.error("========================================");
        throw error;
    }
}

// 运行测试
if (require.main === module) {
    runTest().then((success) => {
        process.exit(success ? 0 : 1);
    }).catch((error) => {
        console.error("Test execution failed:", error);
        process.exit(1);
    });
}

module.exports = { runTest };

