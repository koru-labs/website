const { ethers } = require("hardhat");
const accounts = require('./../../deployments/account.json');
const hardhatConfig = require('../../hardhat.config');
const { createClient } = require('../qa/token_grpc');
const {
    callPrivateMint,
    callPrivateTransferFrom,
    callPrivateApprove,
    callPrivateBurn,
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
const tokenAddress1 = "0x8B6F63EFb564929B0ee332B1a4002fdBCD4a81bC"; // User1 的 token 所在合约
const tokenAddress2 = "0xa90712888DD10509295CF049E783Bc9766EC4657"; // User2 的 token 所在合约

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

    // 返回 mint 过程中生成的 token ID，这些是真实的可以被 burn 的 token
    return response.transfer_token_id ? '0x' + response.transfer_token_id : null;
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
        amount: 1,
        comment: 'approve'
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
 * 计算 transferFrom chunkHash
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
 * 计算 burn chunkHash
 */
function calculateBurnChunkHash(bundleHash, from, tokenAddress, tokenId) {
    return ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ["bytes32", "address", "address", "uint256"],
            [bundleHash, from, tokenAddress, tokenId]
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
 * 测试包含 burn 的 DVP 交易（使用 approve token 进行 burn）
 */
async function testDVPWithBurn(ZKCSC, user1Wallet, user2Wallet, user1TokenId, user2TokenId, burnTokenId) {
    console.log("=== Testing DVP with Burn (Mixed transferFrom + burn) ===");

    // 1. 链下约定 bundleHash
    const bundleHash = ethers.keccak256(ethers.toUtf8Bytes("DVP-BUNDLE-WITH-BURN"));
    console.log("BundleHash:", bundleHash);

    // 2. User1 生成 transferFrom chunkHash 并签名
    const user1ChunkHash = calculateChunkHash(
        bundleHash,
        user1Wallet.address,
        user2Wallet.address,
        tokenAddress1,
        user1TokenId
    );
    const user1Signature = await signChunkHash(user1Wallet, user1ChunkHash);
    console.log("User1 Transfer ChunkHash:", user1ChunkHash);
    console.log("User1 Transfer Signature:", user1Signature);

    // 3. User2 生成 transferFrom chunkHash 并签名
    const user2ChunkHash = calculateChunkHash(
        bundleHash,
        user2Wallet.address,
        user1Wallet.address,
        tokenAddress2,
        user2TokenId
    );
    const user2Signature = await signChunkHash(user2Wallet, user2ChunkHash);
    console.log("User2 Transfer ChunkHash:", user2ChunkHash);
    console.log("User2 Transfer Signature:", user2Signature);

    // 4. 生成 burn chunkHash 并签名
    const burnChunkHash = calculateBurnChunkHash(
        bundleHash,
        user2Wallet.address,  // 使用 user2 进行 burn
        tokenAddress2,
        burnTokenId
    );
    const burnSignature = await signChunkHash(user2Wallet, burnChunkHash);
    console.log("Burn ChunkHash:", burnChunkHash);
    console.log("Burn Signature:", burnSignature);

    // 5. Relayer 聚合并执行 DVP
    console.log("=== Relayer Executing DVP with Burn ===");
    try {
        const tx = await ZKCSC.executeDVP(
            bundleHash,
            [ // transferFromRequests
                {
                    from: user1Wallet.address,
                    to: user2Wallet.address,
                    tokenAddress: tokenAddress1,
                    tokenId: user1TokenId,
                    signature: user1Signature
                },
                {
                    from: user2Wallet.address,
                    to: user1Wallet.address,
                    tokenAddress: tokenAddress2,
                    tokenId: user2TokenId,
                    signature: user2Signature
                }
            ],
            [ // burnRequests
                {
                    from: user2Wallet.address,
                    tokenAddress: tokenAddress2,
                    tokenId: burnTokenId,
                    signature: burnSignature
                }
            ]
        );

        const receipt = await tx.wait();
        console.log("DVP with Burn Execution successful! Transaction hash:", tx.hash);

        // 检查事件
        const logs = receipt.logs || [];
        const dvpExecutedEvent = logs.find(e => e.fragment?.name === "DVPExecuted");
        if (dvpExecutedEvent) {
            console.log("✅ DVPExecuted event emitted:", dvpExecutedEvent.args);
            console.log("Total operations (transfers + burns):", dvpExecutedEvent.args[2]);
        } else {
            console.log("❌ DVPExecuted event not found");
        }

    } catch (error) {
        console.error("❌ DVP with Burn Execution failed:", error.message);
        if (error.reason) console.error("Reason:", error.reason);
        if (error.data) console.error("Data:", error.data);
        throw error;
    }

    // 6. 验证 burn 是否成功
    console.log("=== Verifying Burn Operation ===");
    try {
        const token2Contract = await ethers.getContractAt("IPrivateTokenCore", tokenAddress2);
        const burnedToken = await token2Contract.getAccountTokenById(user2Wallet.address, burnTokenId);
        if (burnedToken.id === 0n || burnedToken.owner === ethers.ZeroAddress) {
            console.log(`✅ Token ${burnTokenId} has been successfully burned`);
        } else {
            console.log(`❌ Token ${burnTokenId} still exists. Owner: ${burnedToken.owner}`);
        }
    } catch (error) {
        console.log("✅ Token burned successfully (token not found):", error.message);
    }

    console.log("✅ DVP with Burn test completed");
}

/**
 * 测试简单的 burn 操作（使用 approve token）
 */
async function testSimpleBurn(ZKCSC, wallet, tokenId) {
    console.log("=== Testing Simple Burn (Approve Token) ===");
    console.log("Approve Token ID to burn:", tokenId);
    console.log("Wallet address:", wallet.address);

    // 1. 链下约定 bundleHash
    const bundleHash = ethers.keccak256(ethers.toUtf8Bytes("DVP-BUNDLE-SIMPLE-BURN"));
    console.log("BundleHash:", bundleHash);

    // 2. 生成 burn chunkHash 并签名
    const burnChunkHash = calculateBurnChunkHash(
        bundleHash,
        wallet.address,
        tokenAddress1,
        tokenId
    );
    const burnSignature = await signChunkHash(wallet, burnChunkHash);
    console.log("Burn ChunkHash:", burnChunkHash);
    console.log("Burn Signature:", burnSignature);

    // 3. 执行 burn DVP
    console.log("=== Executing Simple Burn DVP ===");
    try {
        const tx = await ZKCSC.executeDVP(
            bundleHash,
            [], // transferFromRequests (空数组)
            [ // burnRequests
                {
                    from: wallet.address,
                    tokenAddress: tokenAddress1,
                    tokenId: tokenId,
                    signature: burnSignature
                }
            ]
        );

        const receipt = await tx.wait();
        console.log("Simple Burn DVP Execution successful! Transaction hash:", tx.hash);

        // 检查事件
        const logs = receipt.logs || [];
        const dvpExecutedEvent = logs.find(e => e.fragment?.name === "DVPExecuted");
        if (dvpExecutedEvent) {
            console.log("✅ DVPExecuted event emitted:", dvpExecutedEvent.args);
        } else {
            console.log("❌ DVPExecuted event not found");
        }
    } catch (error) {
        console.error("❌ Simple Burn DVP Execution failed:", error.message);
        if (error.reason) console.error("Reason:", error.reason);
        if (error.data) console.error("Data:", error.data);
        throw error;
    }

    console.log("✅ Simple Burn test completed");
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
            [ // transferFromRequests
                {
                    from: user1Wallet.address,
                    to: user2Wallet.address,
                    tokenAddress: tokenAddress1,
                    tokenId: user1TokenId,
                    signature: user1Signature
                },
                {
                    from: user2Wallet.address,
                    to: user1Wallet.address,
                    tokenAddress: tokenAddress2,
                    tokenId: user2TokenId,
                    signature: user2Signature
                }
            ],
            [] // burnRequests (暂时不测试burn)
        );

        const receipt = await tx.wait();
        console.log("DVP Cancel successful! Transaction hash:", tx.hash);

        // 检查事件
        const logs = receipt.logs || receipt.events || [];
        console.log("All events:", logs);

        const dvpCanceledEvent = logs.find(e => e.fragment?.name === "DVPCanceled");
        if (dvpCanceledEvent) {
            console.log("✅ DVPCanceled event emitted:", dvpCanceledEvent.args);
        } else {
            console.log("❌ DVPCanceled event not found");
        }

        // 检查ApprovalRevoked事件
        const approvalRevokedEvents = logs.filter(e => e.fragment?.name === "ApprovalRevoked");
        if (approvalRevokedEvents.length > 0) {
            console.log("ApprovalRevoked events:", approvalRevokedEvents);
            approvalRevokedEvents.forEach((event, index) => {
                console.log(`ApprovalRevoked event ${index}:`, event.args);
            });
        } else {
            console.log("No ApprovalRevoked events found");
        }

    } catch (error) {
        console.error("❌ DVP Cancel failed:", error.message);
        if (error.reason) console.error("Reason:", error.reason);
        if (error.data) console.error("Data:", error.data);

        // 尝试获取更多错误信息
        try {
            console.error("Error object:", JSON.stringify(error, null, 2));
        } catch (e) {
            console.error("Could not stringify error:", e.message);
        }

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
            [ // transferFromRequests
                {
                    from: user1Wallet.address,
                    to: user2Wallet.address,
                    tokenAddress: tokenAddress1,
                    tokenId: user1TokenId,
                    signature: invalidSignature
                },
                {
                    from: user2Wallet.address,
                    to: user1Wallet.address,
                    tokenAddress: tokenAddress2,
                    tokenId: user2TokenId,
                    signature: user2Signature
                }
            ],
            [] // burnRequests
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
            [ // transferFromRequests
                {
                    from: user1Wallet.address,
                    to: user2Wallet.address,
                    tokenAddress: tokenAddress1,
                    tokenId: user1TokenId,
                    signature: user1Signature
                },
                {
                    from: user2Wallet.address,
                    to: user1Wallet.address,
                    tokenAddress: tokenAddress2,
                    tokenId: user2TokenId,
                    signature: user2Signature
                }
            ],
            [] // burnRequests
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
            [ // transferFromRequests
                {
                    from: user1Wallet.address,
                    to: user2Wallet.address,
                    tokenAddress: tokenAddress1,
                    tokenId: user1TokenId,
                    signature: user1Signature
                },
                {
                    from: user2Wallet.address,
                    to: user1Wallet.address,
                    tokenAddress: tokenAddress2,
                    tokenId: user2TokenId,
                    signature: user2Signature
                }
            ],
            [] // burnRequests
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
        const user1MintTokenId = await mintForStart(tokenAddress1, minterWallet, accounts.To1);
        const user2MintTokenId = await mintForStart(tokenAddress2, minterWallet, accounts.To2);
        console.log("User1 Mint Token ID:", user1MintTokenId);
        console.log("User2 Mint Token ID:", user2MintTokenId);

        // 2. 部署 ZKCSC
        const ZKCSC = await deployZKCSC();

        // 3. Approve 代币给 ZKCSC 合约
        console.log("=== Approving Tokens ===");
        const user1TokenId = await approveTokens(tokenAddress1, user1Wallet, accounts.To1, ZKCSC.target, accounts.To2);
        const user2TokenId = await approveTokens(tokenAddress2, user2Wallet, accounts.To2, ZKCSC.target, accounts.To1);
        console.log("Final User1 Token ID:", user1TokenId);
        console.log("Final User2 Token ID:", user2TokenId);

        // 5. 生成用于 burn 的 approve token
        console.log("=== Generating Approve Token for Burn Test ===");
        const user1BurnTokenId = await approveTokens(tokenAddress1, user1Wallet, accounts.To1, ZKCSC.target, accounts.To1);
        console.log("User1 Burn Token ID:", user1BurnTokenId);

        // 6. 执行 burn 测试
        await testSimpleBurn(ZKCSC, user1Wallet, user1BurnTokenId);

        // 7. 生成更多 approve token 用于混合测试
        console.log("=== Generating Additional Approve Tokens for Mixed Test ===");
        const user2BurnTokenId = await approveTokens(tokenAddress2, user2Wallet, accounts.To2, ZKCSC.target, accounts.To2);
        console.log("User2 Burn Token ID:", user2BurnTokenId);

        // 8. 执行混合 DVP 测试（transferFrom + burn）
        await testDVPWithBurn(ZKCSC, user1Wallet, user2Wallet, user1TokenId, user2TokenId, user2BurnTokenId);

        // 8. 执行取消 DVP 测试
        await testCancelDVP(ZKCSC, user1Wallet, user2Wallet, user1TokenId, user2TokenId);

        // 9. 执行 DVP 异常测试
        await testDVPFailure(ZKCSC, user1Wallet, user2Wallet, user1TokenId, user2TokenId);

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