const { ethers } = require("hardhat");
const accounts = require('./../../deployments/account.json');
const hardhatConfig = require('../../hardhat.config');
const { createClient } = require('../qa/token_grpc');
const {
    callPrivateMint,
    callPrivateTransferFrom,
    callPrivateApprove,
    getAddressBalance2,
    createAuthMetadata
} = require("../help/testHelp");

const rpcUrl = "qa-node3-rpc.hamsa-ucl.com:50051";
const client = createClient(rpcUrl);

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

// 钱包
const minterWallet = new ethers.Wallet(accounts.MinterKey, l1Provider);
const user1Wallet = new ethers.Wallet(accounts.To1PrivateKey, l1Provider);
const user2Wallet = new ethers.Wallet(accounts.To2PrivateKey, l1Provider);

// token合约地址
const tokenAddress1 = "0x0CFeFcC2aC5642f5D6102BA5DBFd127aDe5c6a65"; // User1 的 token 所在合约
const tokenAddress2 = "0x838Ff21edCD5EbFC6dC2DAaa99BF1CD35ae0274b"; // User2 的 token 所在合约

async function mintForStart(tokenAddress, wallet, account) {
    console.log(`=== Starting Mint Process for ${account} ===`);
    const metadata = await createAuthMetadata(wallet.privateKey);
    const generateRequest = {
        sc_address: tokenAddress,
        token_type: '0',
        to_address: account,
        amount: 100
    };
    let response = await client.generateMintProof(generateRequest, metadata);
    console.log("Generate Mint Proof response:", response);
    let receipt = await callPrivateMint(tokenAddress, response, wallet);
    console.log("Mint receipt:", receipt);
    await sleep(2000);
    let balance = await getAddressBalance2(client, tokenAddress, account, metadata);
    console.log("Account balance after mint:", balance);
    console.log("✅ Mint completed successfully");
}

async function approveTokens(tokenAddress, wallet, account, spenderAccount, toAccount) {
    console.log(`=== Starting Approve Process for ${account} (spender: ${spenderAccount}, to: ${toAccount}) ===`);
    const metadata = await createAuthMetadata(wallet.privateKey);
    const approveRequest = {
        sc_address: tokenAddress,
        token_type: '0',
        from_address: account,
        spender_address: spenderAccount, // spender
        to_address: toAccount, // to
        amount: 1
    };
    let response = await client.generateApproveProof(approveRequest, metadata);
    console.log("Generate Approve Proof response:", response);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);
    const tokenId = '0x' + response.transfer_token_id;
    console.log("Approve token ID:", tokenId);
    console.log("✅ Approve completed successfully");
    return tokenId;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 部署 ZKCSC 合约
 */
async function deployZKCSC() {
    console.log("=== Deploying ZKCSC Contract ===");
    const ZKCSC = await ethers.getContractFactory("ZKCSC");
    const zkcsc = await ZKCSC.deploy(); // 如果有构造函数参数，请添加
    await zkcsc.waitForDeployment();
    console.log("ZKCSC deployed at:", zkcsc.target);
    return zkcsc;
}

/**
 * 计算 chunkHash
 */
function calculateChunkHash(bundleHash, from, to, tokenAddress, tokenId) {
    return ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ["bytes32", "address", "address", "address", "uint256"],
            [bundleHash, from, to, tokenAddress, tokenId]
        )
    );
}

/**
 * 对 chunkHash 进行签名
 */
async function signChunkHash(wallet, chunkHash) {
    const chunkHashBytes = ethers.getBytes(chunkHash);
    return await wallet.signMessage(chunkHashBytes);
}

/**
 * 测试两方 DvP 交易
 */
async function testTwoPartyDVP(ZKCSC, user1Wallet, user2Wallet, user1TokenId, user2TokenId) {
    console.log("=== Testing Two-Party DVP ===");

    // 1. 链下约定 bundleHash
    const bundleHash = ethers.keccak256(ethers.toUtf8Bytes("DVP-BUNDLE-TWO-PARTY"));
    console.log("BundleHash:", bundleHash);

    // 2. User1 生成 chunkHash 并签名
    const user1ChunkHash = calculateChunkHash(
        bundleHash,
        user1Wallet.address,
        user2Wallet.address,
        tokenAddress1,
        user1TokenId
    );
    const user1Signature = await signChunkHash(user1Wallet, user1ChunkHash);
    console.log("User1 ChunkHash:", user1ChunkHash);
    console.log("User1 Signature:", user1Signature);

    // 3. User2 生成 chunkHash 并签名
    const user2ChunkHash = calculateChunkHash(
        bundleHash,
        user2Wallet.address,
        user1Wallet.address,
        tokenAddress2,
        user2TokenId
    );
    const user2Signature = await signChunkHash(user2Wallet, user2ChunkHash);
    console.log("User2 ChunkHash:", user2ChunkHash);
    console.log("User2 Signature:", user2Signature);

    // 4. Relayer 聚合并执行 DVP
    console.log("=== Relayer Executing DVP ===");
    try {
        const tx = await ZKCSC.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [user1Wallet.address, user2Wallet.address],
            [user2Wallet.address, user1Wallet.address],
            [tokenAddress1, tokenAddress2],
            [user1TokenId, user2TokenId],
            [user1Signature, user2Signature]
        );

        const receipt = await tx.wait();
        console.log("DVP Execution successful! Transaction hash:", tx.hash);

        // 检查事件
        const logs = receipt.logs || [];
        const dvpExecutedEvent = logs.find(e => e.fragment?.name === "DVPExecuted");
        if (dvpExecutedEvent) {
            console.log("✅ DVPExecuted event emitted:", dvpExecutedEvent.args);
        } else {
            console.log("❌ DVPExecuted event not found");
        }

    } catch (error) {
        console.error("❌ DVP Execution failed:", error.message);
        if (error.reason) console.error("Reason:", error.reason);
        if (error.data) console.error("Data:", error.data);
        throw error;
    }

    // 5. 验证资产所有权是否交换
    console.log("=== Verifying Token Ownership After DVP ===");

    try {
        // 检查 User1 是否拥有来自 tokenAddress2 的 user2TokenId
        const token2Contract = await ethers.getContractAt("IPrivateTokenCore", tokenAddress2);
        const user1Token = await token2Contract.getAccountTokenById(user1Wallet.address, user2TokenId);
        if (user1Token.owner === user1Wallet.address) {
            console.log(`✅ User1 now owns Token ${user2TokenId} from Token2`);
        } else {
            console.log(`❌ User1 does not own Token ${user2TokenId}. Owner: ${user1Token.owner}`);
        }
    } catch (error) {
        console.log("❌ Error checking User1's new token:", error.message);
    }

    try {
        // 检查 User2 是否拥有来自 tokenAddress1 的 user1TokenId
        const token1Contract = await ethers.getContractAt("IPrivateTokenCore", tokenAddress1);
        const user2Token = await token1Contract.getAccountTokenById(user2Wallet.address, user1TokenId);
        if (user2Token.owner === user2Wallet.address) {
            console.log(`✅ User2 now owns Token ${user1TokenId} from Token1`);
        } else {
            console.log(`❌ User2 does not own Token ${user1TokenId}. Owner: ${user2Token.owner}`);
        }
    } catch (error) {
        console.log("❌ Error checking User2's new token:", error.message);
    }
}

/**
 * 测试取消 DvP 交易
 */
async function testCancelDVP(ZKCSC, user1Wallet, user2Wallet, user1TokenId, user2TokenId) {
    console.log("=== Testing Cancel DVP ===");

    // 1. 链下约定 bundleHash
    const bundleHash = ethers.keccak256(ethers.toUtf8Bytes("DVP-BUNDLE-CANCEL"));
    console.log("BundleHash:", bundleHash);

    // 2. User1 生成 chunkHash 并签名
    const user1ChunkHash = calculateChunkHash(
        bundleHash,
        user1Wallet.address,
        user2Wallet.address,
        tokenAddress1,
        user1TokenId
    );
    const user1Signature = await signChunkHash(user1Wallet, user1ChunkHash);
    console.log("User1 ChunkHash:", user1ChunkHash);
    console.log("User1 Signature:", user1Signature);

    // 3. User2 生成 chunkHash 并签名
    const user2ChunkHash = calculateChunkHash(
        bundleHash,
        user2Wallet.address,
        user1Wallet.address,
        tokenAddress2,
        user2TokenId
    );
    const user2Signature = await signChunkHash(user2Wallet, user2ChunkHash);
    console.log("User2 ChunkHash:", user2ChunkHash);
    console.log("User2 Signature:", user2Signature);

    // 4. Relayer 聚合并取消 DVP
    console.log("=== Relayer Canceling DVP ===");
    try {
        const tx = await ZKCSC.cancelDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [user1Wallet.address, user2Wallet.address],
            [user2Wallet.address, user1Wallet.address],
            [tokenAddress1, tokenAddress2],
            [user1TokenId, user2TokenId],
            [user1Signature, user2Signature]
        );

        const receipt = await tx.wait();
        console.log("DVP Cancel successful! Transaction hash:", tx.hash);

        // 检查事件
        const logs = receipt.logs || [];
        const dvpCanceledEvent = logs.find(e => e.fragment?.name === "DVPCanceled");
        if (dvpCanceledEvent) {
            console.log("✅ DVPCanceled event emitted:", dvpCanceledEvent.args);
        } else {
            console.log("❌ DVPCanceled event not found");
        }

    } catch (error) {
        console.error("❌ DVP Cancel failed:", error.message);
        if (error.reason) console.error("Reason:", error.reason);
        if (error.data) console.error("Data:", error.data);
        throw error;
    }

    console.log("✅ Cancel DVP test completed");
}

/**
 * 测试 DvP 执行失败异常情况
 */
async function testDVPFailure(ZKCSC, user1Wallet, user2Wallet, user1TokenId, user2TokenId) {
    console.log("=== Testing DVP Failure Cases ===");

    // 测试用例1: 无效的签名
    console.log("--- Test Case 1: Invalid Signature ---");
    await testInvalidSignature(ZKCSC, user1Wallet, user2Wallet, user1TokenId, user2TokenId);

    // 测试用例2: 重复执行同一个bundle
    console.log("--- Test Case 2: Re-executing Same Bundle ---");
    await testReexecuteBundle(ZKCSC, user1Wallet, user2Wallet, user1TokenId, user2TokenId);

    // 测试用例3: 数组长度不匹配
    console.log("--- Test Case 3: Array Length Mismatch ---");
    await testArrayLengthMismatch(ZKCSC, user1Wallet, user2Wallet, user1TokenId, user2TokenId);

    console.log("✅ DVP Failure test cases completed");
}

/**
 * 测试无效签名
 */
async function testInvalidSignature(ZKCSC, user1Wallet, user2Wallet, user1TokenId, user2TokenId) {
    const bundleHash = ethers.keccak256(ethers.toUtf8Bytes("DVP-BUNDLE-INVALID-SIG"));
    console.log("BundleHash:", bundleHash);

    // User1 生成 chunkHash 并签名
    const user1ChunkHash = calculateChunkHash(
        bundleHash,
        user1Wallet.address,
        user2Wallet.address,
        tokenAddress1,
        user1TokenId
    );
    // 使用错误的签名（用user2的私钥签名user1的chunkHash）
    const invalidSignature = await signChunkHash(user2Wallet, user1ChunkHash);
    console.log("Invalid Signature (signed by wrong user):", invalidSignature);

    // User2 生成 chunkHash 并签名
    const user2ChunkHash = calculateChunkHash(
        bundleHash,
        user2Wallet.address,
        user1Wallet.address,
        tokenAddress2,
        user2TokenId
    );
    const user2Signature = await signChunkHash(user2Wallet, user2ChunkHash);

    try {
        await ZKCSC.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [user1Wallet.address, user2Wallet.address],
            [user2Wallet.address, user1Wallet.address],
            [tokenAddress1, tokenAddress2],
            [user1TokenId, user2TokenId],
            [invalidSignature, user2Signature]
        );
        console.log("❌ Expected failure but DVP execution succeeded");
    } catch (error) {
        if (error.message.includes("DVP: Signature not from 'from' address")) {
            console.log("✅ Correctly failed with invalid signature error");
        } else {
            console.log("❌ Failed with unexpected error:", error.message);
        }
    }
}

/**
 * 测试重复执行同一个bundle
 */
async function testReexecuteBundle(ZKCSC, user1Wallet, user2Wallet, user1TokenId, user2TokenId) {
    const bundleHash = ethers.keccak256(ethers.toUtf8Bytes("DVP-BUNDLE-REEXECUTE"));
    console.log("BundleHash:", bundleHash);

    // User1 生成 chunkHash 并签名
    const user1ChunkHash = calculateChunkHash(
        bundleHash,
        user1Wallet.address,
        user2Wallet.address,
        tokenAddress1,
        user1TokenId
    );
    const user1Signature = await signChunkHash(user1Wallet, user1ChunkHash);

    // User2 生成 chunkHash 并签名
    const user2ChunkHash = calculateChunkHash(
        bundleHash,
        user2Wallet.address,
        user1Wallet.address,
        tokenAddress2,
        user2TokenId
    );
    const user2Signature = await signChunkHash(user2Wallet, user2ChunkHash);

    // 首先执行一次DVP
    try {
        const tx = await ZKCSC.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [user1Wallet.address, user2Wallet.address],
            [user2Wallet.address, user1Wallet.address],
            [tokenAddress1, tokenAddress2],
            [user1TokenId, user2TokenId],
            [user1Signature, user2Signature]
        );
        await tx.wait();
        console.log("✅ First DVP execution succeeded");
    } catch (error) {
        console.log("❌ First DVP execution failed:", error.message);
        return;
    }

    // 尝试再次执行同一个bundle
    try {
        await ZKCSC.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [user1Wallet.address, user2Wallet.address],
            [user2Wallet.address, user1Wallet.address],
            [tokenAddress1, tokenAddress2],
            [user1TokenId, user2TokenId],
            [user1Signature, user2Signature]
        );
        console.log("❌ Expected failure but re-execution succeeded");
    } catch (error) {
        if (error.message.includes("DVP: Bundle already executed")) {
            console.log("✅ Correctly failed with bundle already executed error");
        } else {
            console.log("❌ Failed with unexpected error:", error.message);
        }
    }
}

/**
 * 测试数组长度不匹配
 */
async function testArrayLengthMismatch(ZKCSC, user1Wallet, user2Wallet, user1TokenId, user2TokenId) {
    const bundleHash = ethers.keccak256(ethers.toUtf8Bytes("DVP-BUNDLE-MISMATCH"));
    console.log("BundleHash:", bundleHash);

    // User1 生成 chunkHash 并签名
    const user1ChunkHash = calculateChunkHash(
        bundleHash,
        user1Wallet.address,
        user2Wallet.address,
        tokenAddress1,
        user1TokenId
    );
    const user1Signature = await signChunkHash(user1Wallet, user1ChunkHash);

    // User2 生成 chunkHash 并签名
    const user2ChunkHash = calculateChunkHash(
        bundleHash,
        user2Wallet.address,
        user1Wallet.address,
        tokenAddress2,
        user2TokenId
    );
    const user2Signature = await signChunkHash(user2Wallet, user2ChunkHash);

    // 尝试执行时提供不匹配的数组长度
    try {
        await ZKCSC.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash], // 2 chunkHashes
            [user1Wallet.address, user2Wallet.address],
            [user2Wallet.address, user1Wallet.address],
            [tokenAddress1, tokenAddress2],
            [user1TokenId], // Only 1 tokenId - mismatch!
            [user1Signature, user2Signature]
        );
        console.log("❌ Expected failure but DVP execution with mismatched arrays succeeded");
    } catch (error) {
        if (error.message.includes("DVP: Array length mismatch")) {
            console.log("✅ Correctly failed with array length mismatch error");
        } else {
            console.log("❌ Failed with unexpected error:", error.message);
        }
    }
}

async function runDVPTest() {
    console.log("🚀 Starting DVP Test Suite");
    console.log("==================================");

    try {
        // 1. Mint 代币
        console.log("=== Minting Tokens ===");
        await mintForStart(tokenAddress1, minterWallet, accounts.To1);
        await mintForStart(tokenAddress2, minterWallet, accounts.To2);

        // 2. 部署 ZKCSC
        const ZKCSC = await deployZKCSC();

        // 3. Approve 代币给 ZKCSC 合约
        console.log("=== Approving Tokens ===");
        const user1TokenId = await approveTokens(tokenAddress1, user1Wallet, accounts.To1, ZKCSC.target, accounts.To2);
        const user2TokenId = await approveTokens(tokenAddress2, user2Wallet, accounts.To2, ZKCSC.target, accounts.To1);
        console.log("Final User1 Token ID:", user1TokenId);
        console.log("Final User2 Token ID:", user2TokenId);

        // 4. 执行 DVP 测试
        // await testTwoPartyDVP(ZKCSC, user1Wallet, user2Wallet, user1TokenId, user2TokenId);

        // 5. 执行取消 DVP 测试
        await testCancelDVP(ZKCSC, user1Wallet, user2Wallet, user1TokenId, user2TokenId);

        // 6. 执行 DVP 异常测试
        // await testDVPFailure(ZKCSC, user1Wallet, user2Wallet, user1TokenId, user2TokenId);

        console.log("==================================");
        console.log("🎉 DVP Test Suite Completed Successfully!");
    } catch (error) {
        console.error("❌ Test suite failed:", error.message);
        console.error("Stack trace:", error.stack);
        process.exit(1);
    }
}

// 直接运行测试
if (require.main === module) {
    runDVPTest().then(() => {
        console.log("All tests completed!");
        process.exit(0);
    }).catch((error) => {
        console.error("Test execution failed:", error);
        process.exit(1);
    });
}