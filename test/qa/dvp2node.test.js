const { expect } = require("chai");
const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')


const rpcUrl_3 = "qa-node3-rpc.hamsa-ucl.com:50051"
const rpcUrl_4 = "qa-node4-rpc.hamsa-ucl.com:50051"
const client3 = createClient(rpcUrl_3)
const client4 = createClient(rpcUrl_4)

const {
    createAuthMetadata,
    getAddressBalance2,
    callPrivateRevoke,
    getApproveTokenList, callPrivateMint
} = require("../help/testHelp")
const {address, hexString} = require("hardhat/internal/core/config/config-validation");
const {bigint} = require("hardhat/internal/core/params/argumentTypes");

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

const node3AdminPrivateKey = accounts.MinterKey;
const node4AdminPrivateKey = accounts.Node4MinterKey;

async function getTokenBalanceNode3(account,scAddress){
    const metadata = await  createAuthMetadata(node3AdminPrivateKey)
    let balance = await getAddressBalance2(client3, scAddress, account, metadata)
    return Number(balance.balance)
}
async function getTokenBalanceNode4(account,scAddress){
    const metadata = await  createAuthMetadata(node4AdminPrivateKey)
    let balance = await getAddressBalance2(client4, scAddress, account, metadata)
    return Number(balance.balance)
}

function convertBigInt2Hex(number) {
    return ethers.toBigInt(number).toString(10)
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function mint_node3(address, amount,scAddress) {
    const minterMeta = await createAuthMetadata(accounts.MinterKey);
    const minterWallet = new ethers.Wallet(accounts.MinterKey, l1Provider);
    const generateRequest = {
        from_address: accounts.Minter,
        sc_address: scAddress,
        token_type: '0',
        to_address: address,
        amount: amount
    };
    const response = await client3.generateMintProof(generateRequest,minterMeta);
    // console.log("generateMintProof:", response)
    const receipt = await callPrivateMint(scAddress, response, minterWallet)
    // console.log("callPrivateMint:", receipt)
    let tx = await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id,minterMeta)
    // console.log("callPrivateMint:", tx)
    return  receipt
}
async function mint_node4(address, amount,scAddress) {
    const minterMeta = await createAuthMetadata(accounts.Node4MinterKey);
    const minterWallet = new ethers.Wallet(accounts.Node4MinterKey, l1Provider);
    console.log("minter address:", minterWallet.address)
    const generateRequest = {
        from_address: accounts.Node4Minter,
        sc_address: scAddress,
        token_type: '0',
        to_address: address,
        amount: amount
    };
    console.log("generateMintProof:", generateRequest)
    const response = await client4.generateMintProof(generateRequest,minterMeta);
    console.log("generateMintProof:", response)
    const receipt = await callPrivateMint(scAddress, response, minterWallet)
    console.log("callPrivateMint:", receipt)
    let tx = await client4.waitForActionCompletion(client4.getTokenActionStatus, response.request_id,minterMeta)
    console.log("callPrivateMint:", tx)
    return  receipt
}


async function approveTokens(client,tokenAddress, fromWallet, fromAddress, spenderAddress, toAddress,amount) {
    console.log(`=== Starting Approve Process for ${fromAddress} (spender: ${spenderAddress}, to: ${toAddress}) ===`);
    const metadata = await createAuthMetadata(fromWallet.privateKey);
    const approveRequest = {
        sc_address: tokenAddress,
        token_type: '0',
        from_address: fromAddress,
        spender_address: spenderAddress, // spender
        to_address: toAddress, // to
        amount: amount,
        comment: 'approveForDVP'
    };
    // console.log("Approve request:", approveRequest);
    let response = await client.generateApproveProof(approveRequest, metadata);
    console.log("Generate Approve Proof response:", response);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);
    const tokenId = '0x' + response.transfer_token_id;
    // console.log("Approve token ID:", tokenId);
    console.log("✅ Approve completed successfully");
    return tokenId;
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
async function testTwoPartyDVP(ZKCSC, user1Wallet, user2Wallet, user1TokenId, user2TokenId,scAddress1,scAddress2) {
    console.log("=== Testing Two-Party DVP ===");

    // chunkHash1 = "0x" + crypto.randomBytes(32).toString("hex");
    // chunkHash2 = "0x" + crypto.randomBytes(32).toString("hex");
    // bundleHash = "0x" + p.poseidon2([chunkHash1, chunkHash2]).toString(16).padStart(64, "0");

    // 1. 链下约定 bundleHash
    // const bundleHash = ethers.keccak256(ethers.toUtf8Bytes("DVP-BUNDLE-TWO-PARTY"));
    // 1. 使用两个地址 + "DVP" + 毫秒时间戳生成 bundleHash
    const timestamp = Date.now().toString();
    const bundleString = `${user1Wallet.address}${user2Wallet.address}${timestamp}DVP`;
    const bundleHash = ethers.keccak256(ethers.toUtf8Bytes(bundleString));

    console.log("BundleHash:", bundleHash);

    // 2. User1 生成 chunkHash 并签名
    const user1ChunkHash = calculateChunkHash(
        bundleHash,
        user1Wallet.address,
        user2Wallet.address,
        scAddress1,
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
        scAddress2,
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
            [scAddress1, scAddress2],
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
        const token2Contract = await ethers.getContractAt("IPrivateTokenCore", scAddress2);
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
        const token1Contract = await ethers.getContractAt("IPrivateTokenCore", scAddress1);
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
async function testCancelDVP(ZKCSC, user1Wallet, user2Wallet, user1TokenId, user2TokenId,scAddress1,scAddress2) {
    console.log("=== Testing Cancel DVP ===");

    // 1. 链下约定 bundleHash
    const timestamp = Date.now().toString();
    const bundleString = `${user1Wallet.address}${user2Wallet.address}${timestamp} CANCEL DVP`;
    const bundleHash = ethers.keccak256(ethers.toUtf8Bytes(bundleString));

    // 2. User1 生成 chunkHash 并签名
    const user1ChunkHash = calculateChunkHash(
        bundleHash,
        user1Wallet.address,
        user2Wallet.address,
        scAddress1,
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
        scAddress2,
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
            [scAddress1, scAddress2],
            [user1TokenId, user2TokenId],
            [user1Signature, user2Signature]
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

describe("DVP with different token contract in node3", function () {
    this.timeout(1200000)
    const scAddress1 = '0xc9fc9EF568C9622854f8fa68fbCa089c4f54c3bF';
    const scAddress2 = '0x0DC116cA144f428a03fD6d6D8e645cDDF41e3e3d';
    const zkcscAddress = '0xC5aC7a7054f61c0eA2dBc142b0918Eec4b7437ba';
    const MAX_UINT256 = ethers.MaxUint256;
    const MIN_UINT256 = ethers.MinInt256;

    const node3_user = accounts.Minter;
    const node4_user = accounts.Node4Minter;
    const node3_user_wallet = new ethers.Wallet(accounts.MinterKey, l1Provider);
    const node4_user_wallet = new ethers.Wallet(accounts.Node4MinterKey, l1Provider);

    const amount = 600;

    let preBalance1,postBalance1;
    let preBalance2,postBalance2;
    let zkcsc;
    let minterMeta,spenderMeta,to1Meta

    before(async () => {
        minterMeta = await createAuthMetadata(accounts.MinterKey)
        spenderMeta = await createAuthMetadata(accounts.Spender1Key)
        to1Meta = await createAuthMetadata(accounts.To1PrivateKey);
    });

    beforeEach(async () => {
        preBalance1 = {
            token1: await getTokenBalanceNode3(node3_user,scAddress1),
            token2: await getTokenBalanceNode3(node3_user,scAddress2)
        }
        preBalance2 = {
            token1: await getTokenBalanceNode4(node4_user,scAddress1),
            token2: await getTokenBalanceNode4(node4_user,scAddress2)
        }
    });

    it.skip('Deploy token contract ',async () => {
        //1 , deploy token1 , set node3 minter allowance
        //2, deploy token2 , set node4 minter allowance
    });

    it.skip("Mint to user", async () => {

        console.log("######start to mint in node3 ######")
        await mint_node3(node3_user,amount,scAddress1);
        console.log("######start to mint in node4 ######")
        await mint_node4(node4_user,amount,scAddress2);
        postBalance1 = {
            token1: await getTokenBalanceNode3(node3_user,scAddress1),
            token2: await getTokenBalanceNode3(node3_user,scAddress2)
        }
        postBalance2 = {
            token1: await getTokenBalanceNode4(node4_user,scAddress1),
            token2: await getTokenBalanceNode4(node4_user,scAddress2)
        }
        console.log("PreBalance : ",{preBalance1,preBalance2})
        console.log("PostBalance : ",{postBalance1,postBalance2})

    });
    it('Deploy ZKCSC ',async () => {
        // zkcsc = await deployZKCSC();
        // console.log("ZKCSC Deployed at:", zkcsc.target)
        zkcsc = await ethers.getContractAt("ZKCSC", zkcscAddress);
    });
    it("DVP transfer", async () => {
        const amount1 = 10
        const amount2 = 20
        console.log("PreBalance : ",{preBalance1,preBalance2})

        //approve for token
        let tokenId1 = await approveTokens(client3,scAddress1, node3_user_wallet, node3_user_wallet.address, zkcsc.target, node4_user_wallet.address,amount1);
        let tokenId2 = await approveTokens(client4,scAddress2, node4_user_wallet, node4_user_wallet.address, zkcsc.target, node3_user_wallet.address,amount2);
        // excute dvp
        await testTwoPartyDVP(zkcsc,node3_user_wallet,node4_user_wallet,tokenId1,tokenId2,scAddress1,scAddress2)
        postBalance1 = {
            token1: await getTokenBalanceNode3(node3_user,scAddress1),
            token2: await getTokenBalanceNode3(node3_user,scAddress2)
        }
        postBalance2 = {
            token1: await getTokenBalanceNode4(node4_user,scAddress1),
            token2: await getTokenBalanceNode4(node4_user,scAddress2)
        }
        console.log("PreBalance: ",{preBalance1,preBalance2})
        console.log("PostBalance : ",{postBalance1,postBalance2})
        expect(postBalance1.token1).equal(preBalance1.token1 - amount1);
        expect(postBalance1.token2).equal(preBalance1.token2 + amount2);
        expect(postBalance2.token1).equal(preBalance2.token1 + amount1);
        expect(postBalance2.token2).equal(preBalance2.token2 - amount2);
    });

});

