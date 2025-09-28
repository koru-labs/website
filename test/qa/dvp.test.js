const { expect } = require("chai");
const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')

//dev
// const rpcUrl_node3 = "dev-node3-rpc.hamsa-ucl.com:50051"
// const rpcUrl_node4 = "dev-node4-rpc.hamsa-ucl.com:50051"
// const L1Url = hardhatConfig.networks.dev_ucl_L2.url;
// const adminPrivateKey = hardhatConfig.networks.dev_ucl_L2.accounts[1];

//qa
const rpcUrl_node3 = "qa-node3-rpc.hamsa-ucl.com:50051"
const rpcUrl_node4 = "qa-node4-rpc.hamsa-ucl.com:50051"
const L1Url = hardhatConfig.networks.ucl_L2_cluster.url;
const adminPrivateKey = hardhatConfig.networks.ucl_L2_cluster.accounts[1];
const node4AdminPrivateKey = "81690fb141b4ae5682ad1fd73b29ae1bcc67891e93de73c6f636402deac21171";

const client = createClient(rpcUrl_node3)
// const client1 = createClient(rpcUrl_1)

const {
    createAuthMetadata,
    getAddressBalance2,
    callPrivateRevoke,
    getApproveTokenList, callPrivateMint, getAddressBalance
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


const l1Provider = new ethers.JsonRpcProvider(L1Url, l1CustomNetwork, options);

const adminWallet = new ethers.Wallet(accounts.OwnerKey, l1Provider);
const minterWallet = new ethers.Wallet(accounts.MinterKey, l1Provider);
const spender1Wallet = new ethers.Wallet(accounts.Spender1Key, l1Provider);
const to1Wallet = new ethers.Wallet(accounts.To1PrivateKey, l1Provider);

const toAddress1 = accounts.To1;
const toAddress2 = accounts.To2;


let preBalance,postBalance;
let preAllowance,postAllowance;

async function getTokenBalanceByAuth(grpcClient, account,scAddress, metadata){

    let balance = await getAddressBalance2(grpcClient, scAddress, account, metadata)
    return Number(balance.balance)
}

async function getTokenBalanceByAdmin(address,scAddress){
    const adminMeta = await createAuthMetadata(adminPrivateKey)
    const result = await getAddressBalance(client,scAddress,address, adminMeta);
    return result
}

function convertBigInt2Hex(number) {
    return ethers.toBigInt(number).toString(10)
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function mint(address,amount,scAddress) {
    const minterMeta = await createAuthMetadata(accounts.MinterKey);
    const generateRequest = {
        sc_address: scAddress,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: address,
        amount: amount
    };
    const response = await client.generateMintProof(generateRequest,minterMeta);
    console.log("generateMintProof:", response)
    const receipt = await callPrivateMint(scAddress, response, minterWallet)
    console.log("callPrivateMint:", receipt)
    let tx = await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
    console.log("callPrivateMint:", tx)
    return  receipt
}
async function GenerateTransferSplitProof(toAddress,amount,scAddress,metadata) {
    const splitRequest = {
        sc_address: scAddress,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: toAddress,
        amount: amount,
        comment:"transfer"
    };
    let response = await client.generateSplitToken(splitRequest,metadata);
    console.log("Generate transfer Proof response:", response);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,metadata)
    return response
}
async function GenerateBurnSplitProof(amount) {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        amount: amount,
        comment:"burn"
    };
    let response = await client.generateSplitToken(splitRequest,metadata);
    console.log("Generate burn Proof response:", response);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,metadata)
    return response

}
async function approveTokens(tokenAddress, fromWallet, fromAddress, spenderAddress, toAddress,amount) {
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
    const tokenId = ethers.toBigInt(response.transfer_token_id)
    // console.log("Approve token ID:", tokenId);
    console.log("✅ Approve completed successfully");
    return tokenId;
}
async function revoke(scAddress, wallet,spenderAddress, tokenId){
    console.log("revoke token id :", '0x'+tokenId)
    let receipt = await callPrivateRevoke(scAddress, wallet,spenderAddress, '0x'+tokenId)
    console.log("receipt", receipt)
    return receipt
}

async function revokeApprovedTokens(ownerWallet, spenderAddress, scAddress){
    const meta = await createAuthMetadata(ownerWallet.privateKey)
    const tokenList = await getApproveTokenList(client,ownerWallet.address,scAddress,spenderAddress,meta)
    const split_tokens = tokenList.split_tokens
    console.log("tokenList:", tokenList)
    for (let i = 0; i < split_tokens.length; i++) {
        const token = split_tokens[i];
        const tokenId = token.token_id
        console.log("revoke token:", token)
        const receipt = await revoke(scAddress, ownerWallet,spenderAddress, tokenId)
        console.log("receipt", receipt)
    }
    // const receipt = await revoke(scAddress, ownerWallet,spenderAddress, "251856fc0e6a1f6a2926edb8d4d74332699d0a05a55b4bc78cfe021f1003dacf")
    // console.log("receipt", receipt)
}
async function revokeRecentApprovedToken(ownerWallet, spenderAddress, scAddress){
    const meta = await createAuthMetadata(ownerWallet.privateKey)
    const tokenList = await getApproveTokenList(client,ownerWallet.address,scAddress,spenderAddress,meta)
    const split_tokens = tokenList.split_tokens
    console.log("tokenList:", tokenList)
    // revoke the latest approved token
    if (split_tokens.length > 0) {
        const recentToken = split_tokens[split_tokens.length - 1];
        const tokenId = recentToken.token_id
        console.log("revoke recent token:", recentToken)
        const receipt = await revoke(scAddress, ownerWallet, spenderAddress, tokenId)
        console.log("receipt", receipt)
        return receipt
    } else {
        console.log("No approved tokens to revoke")
        return null
    }
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
async function testTwoPartyTransferDVP(ZKCSC, user1Wallet, user2Wallet, user1TokenId, user2TokenId,scAddress1,scAddress2) {
    console.log("=== Testing Two-Party DVP ===");
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
            //transferFromRequests
            [{
                from: user1Wallet.address,
                to: user2Wallet.address,
                tokenAddress: scAddress1,
                tokenId: user1TokenId,
                signature:user1Signature
            },{
                from: user2Wallet.address,
                to: user1Wallet.address,
                tokenAddress: scAddress2,
                tokenId: user2TokenId,
                signature:user2Signature
            }],
            []
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
async function testTransferBurnDVP(ZKCSC, user1Wallet, user2Wallet, transferReqquest, burnRequest) {
    console.log("=== Testing Two-Party DVP with TransferFrom and Burn ===");
    // 1. 使用两个地址 + "DVP" + 毫秒时间戳生成 bundleHash
    const timestamp = Date.now().toString();
    const bundleString = `${user1Wallet.address}${user2Wallet.address}${timestamp}DVP`;
    const bundleHash = ethers.keccak256(ethers.toUtf8Bytes(bundleString));

    console.log("BundleHash:", bundleHash);

    // 2. transferFrom sign
    const user1ChunkHash = calculateChunkHash(
        bundleHash,
        user1Wallet.address,
        user2Wallet.address,
        transferReqquest.tokenAddress,
        transferReqquest.tokenId
    );
    const user1Signature = await signChunkHash(user1Wallet, user1ChunkHash);
    const transferFromRequests = [{
        from: user1Wallet.address,
        to: user2Wallet.address,
        tokenAddress: transferReqquest.tokenAddress,
        tokenId: transferReqquest.tokenId,
        signature:user1Signature
    }];
    console.log("User1 ChunkHash:", user1ChunkHash);
    console.log("User1 Signature:", user1Signature);

    // 3. burn  sign
    const user2ChunkHash = calculateBurnChunkHash(
        bundleHash,
        user2Wallet.address,
        burnRequest.tokenAddress,
        burnRequest.tokenId
    );
    const user2Signature = await signChunkHash(user2Wallet, user2ChunkHash);
    const burnRequests = [{
        from: user2Wallet.address,
        // to: user2Wallet.address,
        tokenAddress: burnRequest.tokenAddress,
        tokenId: burnRequest.tokenId,
        signature:user2Signature
    }];
    console.log("User2 ChunkHash:", user2ChunkHash);
    console.log("User2 Signature:", user2Signature);

    // 4. Relayer 聚合并执行 DVP
    console.log("=== Relayer Executing DVP ===");
    try {
        const tx = await ZKCSC.executeDVP(
            bundleHash,
            //transferFromRequests
            transferFromRequests,
            burnRequests
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
    const scAddress1 = '0x59A42535f42048040c3F5a1152C94aF40C7169Db';
    const scAddress2 = '0xA201bAb1b36F56D6dE5894EEB94C513Cc087bc33';
    const zkcscAddress = '0x3383756d73353c2aBeE06fb2B5Bc66a4c8b04910';
    const MAX_UINT256 = ethers.MaxUint256;
    const MIN_UINT256 = ethers.MinInt256;

    const amount = 600;

    let preBalance1,postBalance1;
    let preBalance2,postBalance2;
    let zkcsc;
    let minterMeta,spenderMeta,to1Meta

    const user1Wallet = minterWallet
    const user2Wallet = to1Wallet;

    before(async () => {
        minterMeta = await createAuthMetadata(accounts.MinterKey)
        spenderMeta = await createAuthMetadata(accounts.Spender1Key)
        to1Meta = await createAuthMetadata(accounts.To1PrivateKey);
    });

    beforeEach(async () => {
        preBalance1 = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress1),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress1)
        }
        preBalance2 = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress2),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress2)
        }
    });

    it.only("Mint to user", async () => {
        await mint(accounts.Minter,amount,scAddress1);
        await mint(accounts.To1,amount,scAddress2);
        postBalance1 = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress1),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress1)
        }
        postBalance2 = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress2),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress2)
        }
        expect(postBalance1.minter).equal(preBalance1.minter + amount);
        expect(postBalance1.user).equal(preBalance1.user);
        expect(postBalance2.minter).equal(preBalance2.minter);
        expect(postBalance2.user).equal(preBalance2.user + amount);

    });
    it.only('Deploy ZKCSC ',async () => {
        // zkcsc = await deployZKCSC();
        // console.log("ZKCSC Deployed at:", zkcsc.target)
        zkcsc = await ethers.getContractAt("ZKCSC", zkcscAddress);
    });
    it.only("DVP transfer", async () => {
        const amount1 = 10
        const amount2 = 20
        console.log("PreBalance : ",{preBalance1,preBalance2})

        //approve for token
        let user1TokenId = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let user2TokenId = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);
        // excute dvp
        await testTwoPartyTransferDVP(zkcsc,minterWallet,to1Wallet,user1TokenId,user2TokenId,scAddress1,scAddress2)
        postBalance1 = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress1),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress1)
        }
        postBalance2 = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress2),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress2)
        }
        console.log("PostBalance : ",{postBalance1,postBalance2})
        expect(postBalance1.minter).equal(preBalance1.minter - amount1);
        expect(postBalance1.user).equal(preBalance1.user + amount1);
        expect(postBalance2.minter).equal(preBalance2.minter + amount2);
        expect(postBalance2.user).equal(preBalance2.user - amount2);
    });
    it.only('DVP transfer and burn ',async () => {
        const amount1 = 10
        const amount2 = 20
        console.log("PreBalance : ",{preBalance1,preBalance2})

        //approve for token
        let transferTokenId = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);
        const transferRequest = {
            tokenAddress: scAddress2,
            tokenId: transferTokenId,
        };
        let burnTokenId = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.Minter,amount1);
        const burnRequest = {
            tokenAddress: scAddress1,
            tokenId: burnTokenId,
        };

        await testTransferBurnDVP(zkcsc,to1Wallet,minterWallet,transferRequest,burnRequest)
        postBalance1 = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress1),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress1)
        }
        postBalance2 = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress2),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress2)
        }
        console.log("PostBalance : ",{postBalance1,postBalance2})

    });

    it.skip('Revoke other approvedTokens ',async () => {
        const amount1 = 10
        const amount2 = 20
        console.log("PreBalance : ",{preBalance1,preBalance2})

        //approve for token
        await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcscAddress, accounts.To1,amount1);
        await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcscAddress, accounts.Minter,amount2);

        await revokeApprovedTokens(minterWallet,zkcscAddress, scAddress1);
        await revokeApprovedTokens(to1Wallet,zkcscAddress,scAddress2);

    });
    it('Revoke the recent approvedToken ',async () => {
        const amount1 = 10
        const amount2 = 20
        console.log("PreBalance : ",{preBalance1,preBalance2})

        //approve for token
        await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcscAddress, accounts.To1,amount1);
        await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcscAddress, accounts.Minter,amount2);

        await revokeRecentApprovedToken(minterWallet,zkcscAddress, scAddress1);
        await revokeRecentApprovedToken(to1Wallet,zkcscAddress,scAddress2);

    });
    it.skip("DVP approve transfer with all amount", async () => {
        const amount1 = await getTokenBalanceByAdmin(accounts.Minter,scAddress1)
        const amount2 = await getTokenBalanceByAdmin(accounts.To1,scAddress2)
        console.log("PreBalance : ",{preBalance1,preBalance2})

        //approve for token
        let user1TokenId = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let user2TokenId = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);
        // excute dvp
        await testTwoPartyTransferDVP(zkcsc,minterWallet,to1Wallet,user1TokenId,user2TokenId,scAddress1,scAddress2)
        postBalance1 = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress1),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress1)
        }
        postBalance2 = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress2),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress2)
        }
        console.log("PostBalance : ",{postBalance1,postBalance2})
        expect(postBalance1.minter).equal(preBalance1.minter - amount1);
        expect(postBalance1.user).equal(preBalance1.user + amount1);
        expect(postBalance2.minter).equal(preBalance2.minter + amount2);
        expect(postBalance2.user).equal(preBalance2.user - amount2);
    });
    it("DVP：try to approve invalid amount", async () => {
        const metadata = await createAuthMetadata(minterWallet.privateKey);
        // approve amount 0
        let approveRequest = {
            sc_address: scAddress1,
            token_type: '0',
            from_address: minterWallet.address,
            spender_address: zkcscAddress, // spender
            to_address: accounts.To1, // to
            amount: 0,
            comment: 'approveForDVP'
        };
        try {
            await client.generateApproveProof(approveRequest, metadata);
        }catch (error){
            console.log("error:",error)
            expect(error.details).to.equal("invalid amount");
        }

        // approve amount -1
        approveRequest = {
            sc_address: scAddress1,
            token_type: '0',
            from_address: minterWallet.address,
            spender_address: zkcscAddress, // spender
            to_address: accounts.To1, // to
            amount: -1,
            comment: 'approveForDVP'
        };
        try {
            await client.generateApproveProof(approveRequest, metadata);
        }catch (error){
            console.log("error:",error)
            expect(error.details).to.equal("invalid amount");
        }
        // MAX_UINT256 +1
        approveRequest = {
            sc_address: scAddress1,
            token_type: '0',
            from_address: minterWallet.address,
            spender_address: zkcscAddress, // spender
            to_address: accounts.To1, // to
            amount: MAX_UINT256 + 1n,
            comment: 'approveForDVP'
        };
        try {
            await client.generateApproveProof(approveRequest, metadata);
        }catch (error){
            console.log("error:",error)
            expect(error.details).to.equal("invalid amount");
        }

        postBalance1 = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress1),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress1)
        }
        postBalance2 = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress2),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress2)
        }
        console.log("PostBalance : ",{postBalance1,postBalance2})
        expect(postBalance1.minter).equal(preBalance1.minter );
        expect(postBalance1.user).equal(preBalance1.user);
        expect(postBalance2.minter).equal(preBalance2.minter );
        expect(postBalance2.user).equal(preBalance2.user);
    });
    it("Should Reverted: transfer with mismatched tokens", async () => {
        const amount1 = 10
        const amount2 = 20
        console.log("PreBalance : ",{preBalance1,preBalance2})

        //approve for token
        let user1TokenId = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let user2TokenId = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);
        // excute dvp with mismatched tokens

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

        await expect(zkcsc.executeDVP(
            bundleHash,
            //transferFromRequests
            [{
                from: user1Wallet.address,
                to: user2Wallet.address,
                tokenAddress: scAddress1,
                tokenId: user2TokenId,
                signature:user1Signature
            },{
                from: user2Wallet.address,
                to: user1Wallet.address,
                tokenAddress: scAddress2,
                tokenId: user1TokenId,
                signature:user2Signature
            }],
            []
        )).revertedWith("DVP: Signature not from 'from' address for transferFrom")
        postBalance1 = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress1),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress1)
        }
        postBalance2 = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress2),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress2)
        }
        console.log("PostBalance : ",{postBalance1,postBalance2})
        expect(postBalance1.minter).equal(preBalance1.minter );
        expect(postBalance1.user).equal(preBalance1.user);
        expect(postBalance2.minter).equal(preBalance2.minter );
        expect(postBalance2.user).equal(preBalance2.user);
    });
    it("Should Reverted: Repeat dvp request", async () => {
        const amount1 = 10
        const amount2 = 20
        console.log("PreBalance : ",{preBalance1,preBalance2})

        //approve for token
        let user1TokenId = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let user2TokenId = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);
        // excute dvp with mismatched tokens

        const timestamp = Date.now().toString();
        const bundleString = `${minterWallet.address}${to1Wallet.address}${timestamp}DVP`;
        const bundleHash = ethers.keccak256(ethers.toUtf8Bytes(bundleString));

        console.log("BundleHash:", bundleHash);

        // 2. User1 生成 chunkHash 并签名
        const user1ChunkHash = calculateChunkHash(
            bundleHash,
            minterWallet.address,
            to1Wallet.address,
            scAddress1,
            user1TokenId
        );
        const user1Signature = await signChunkHash(minterWallet, user1ChunkHash);
        console.log("User1 ChunkHash:", user1ChunkHash);
        console.log("User1 Signature:", user1Signature);

        // 3. User2 生成 chunkHash 并签名
        const user2ChunkHash = calculateChunkHash(
            bundleHash,
            to1Wallet.address,
            minterWallet.address,
            scAddress2,
            user2TokenId
        );
        const user2Signature = await signChunkHash(to1Wallet, user2ChunkHash);
        console.log("User2 ChunkHash:", user2ChunkHash);
        console.log("User2 Signature:", user2Signature);

        // 4. Relayer 聚合并执行 DVP
        console.log("=== Relayer Executing DVP ===");
        let tx = await zkcsc.executeDVP(
            bundleHash,
            //transferFromRequests
            [{
                from: user1Wallet.address,
                to: user2Wallet.address,
                tokenAddress: scAddress1,
                tokenId: user1TokenId,
                signature:user1Signature
            },{
                from: user2Wallet.address,
                to: user1Wallet.address,
                tokenAddress: scAddress2,
                tokenId: user2TokenId,
                signature:user2Signature
            }],
            []
        );
        let receipt = await tx.wait();
        console.log("Receipt:", receipt)
        console.log("DVP Execution successful! Transaction hash:", tx.hash);

        await expect(zkcsc.executeDVP(
            bundleHash,
            //transferFromRequests
            [{
                from: user1Wallet.address,
                to: user2Wallet.address,
                tokenAddress: scAddress1,
                tokenId: user1TokenId,
                signature:user1Signature
            },{
                from: user2Wallet.address,
                to: user1Wallet.address,
                tokenAddress: scAddress2,
                tokenId: user2TokenId,
                signature:user2Signature
            }],
            []
        )).revertedWith("DVP: Bundle already executed")

        postBalance1 = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress1),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress1)
        }
        postBalance2 = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress2),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress2)
        }
        console.log("PostBalance : ",{postBalance1,postBalance2})
        expect(postBalance1.minter).equal(preBalance1.minter - amount1);
        expect(postBalance1.user).equal(preBalance1.user + amount1);
        expect(postBalance2.minter).equal(preBalance2.minter + amount2);
        expect(postBalance2.user).equal(preBalance2.user - amount2);
    });
    it("Should Reverted: transfer with used tokens", async () => {
        const amount1 = 10
        const amount2 = 20
        console.log("PreBalance : ",{preBalance1,preBalance2})

        //approve for token
        let user1TokenId = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let user2TokenId = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);
        // await testTwoPartyDVP(zkcsc,minterWallet,to1Wallet,user1TokenId,user2TokenId,scAddress1,scAddress2)

        let timestamp = Date.now().toString();
        let bundleString = `${minterWallet.address}${to1Wallet.address}${timestamp}DVP`;
        let bundleHash = ethers.keccak256(ethers.toUtf8Bytes(bundleString));

        console.log("BundleHash:", bundleHash);

        // 2. User1 生成 chunkHash 并签名
        let user1ChunkHash = calculateChunkHash(
            bundleHash,
            minterWallet.address,
            to1Wallet.address,
            scAddress1,
            user1TokenId
        );
        let user1Signature = await signChunkHash(minterWallet, user1ChunkHash);
        console.log("User1 ChunkHash:", user1ChunkHash);
        console.log("User1 Signature:", user1Signature);

        // 3. User2 生成 chunkHash 并签名
        let user2ChunkHash = calculateChunkHash(
            bundleHash,
            to1Wallet.address,
            minterWallet.address,
            scAddress2,
            user2TokenId
        );
        let user2Signature = await signChunkHash(to1Wallet, user2ChunkHash);
        console.log("User2 ChunkHash:", user2ChunkHash);
        console.log("User2 Signature:", user2Signature);

        // 4. Relayer 聚合并执行 DVP
        console.log("=== Relayer Executing DVP ===");
        let tx = await zkcsc.executeDVP(
            bundleHash,
            //transferFromRequests
            [{
                from: user1Wallet.address,
                to: user2Wallet.address,
                tokenAddress: scAddress1,
                tokenId: user1TokenId,
                signature:user1Signature
            },{
                from: user2Wallet.address,
                to: user1Wallet.address,
                tokenAddress: scAddress2,
                tokenId: user2TokenId,
                signature:user2Signature
            }],
            []
        );

        let receipt = await tx.wait();
        console.log("Receipt:", receipt)
        console.log("DVP Execution successful! Transaction hash:", tx.hash);
        // repeat request
        timestamp = Date.now().toString();
        bundleString = `${minterWallet.address}${to1Wallet.address}${timestamp}DVP`;
        bundleHash = ethers.keccak256(ethers.toUtf8Bytes(bundleString));

        console.log("BundleHash:", bundleHash);

        // 2. User1 生成 chunkHash 并签名
        user1ChunkHash = calculateChunkHash(
            bundleHash,
            minterWallet.address,
            to1Wallet.address,
            scAddress1,
            user1TokenId
        );
        user1Signature = await signChunkHash(minterWallet, user1ChunkHash);
        console.log("User1 ChunkHash:", user1ChunkHash);
        console.log("User1 Signature:", user1Signature);

        // 3. User2 生成 chunkHash 并签名
        user2ChunkHash = calculateChunkHash(
            bundleHash,
            to1Wallet.address,
            minterWallet.address,
            scAddress2,
            user2TokenId
        );
        user2Signature = await signChunkHash(to1Wallet, user2ChunkHash);
        console.log("User2 ChunkHash:", user2ChunkHash);
        console.log("User2 Signature:", user2Signature);

        await expect(zkcsc.executeDVP(
            bundleHash,
            //transferFromRequests
            [{
                from: user1Wallet.address,
                to: user2Wallet.address,
                tokenAddress: scAddress1,
                tokenId: user1TokenId,
                signature:user1Signature
            },{
                from: user2Wallet.address,
                to: user1Wallet.address,
                tokenAddress: scAddress2,
                tokenId: user2TokenId,
                signature:user2Signature
            }],
            []
        )).revertedWith("PrivateERCToken: invalid allowance token")

        postBalance1 = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress1),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress1)
        }
        postBalance2 = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress2),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress2)
        }
        console.log("PostBalance : ",{postBalance1,postBalance2})
        expect(postBalance1.minter).equal(preBalance1.minter - amount1);
        expect(postBalance1.user).equal(preBalance1.user + amount1);
        expect(postBalance2.minter).equal(preBalance2.minter + amount2);
        expect(postBalance2.user).equal(preBalance2.user - amount2);
    });
    it("Should Reverted: transfer with revoked tokens", async () => {
        const amount1 = 10
        const amount2 = 20
        console.log("PreBalance : ",{preBalance1,preBalance2})

        //approve for token
        let user1TokenId = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let user2TokenId = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);
        // excute dvp with mismatched tokens

        // await testTwoPartyDVP(zkcsc,minterWallet,to1Wallet,user1TokenId,user2TokenId,scAddress1,scAddress2)

        const timestamp = Date.now().toString();
        const bundleString = `${minterWallet.address}${to1Wallet.address}${timestamp}DVP`;
        const bundleHash = ethers.keccak256(ethers.toUtf8Bytes(bundleString));

        console.log("BundleHash:", bundleHash);

        // 2. User1 生成 chunkHash 并签名
        const user1ChunkHash = calculateChunkHash(
            bundleHash,
            minterWallet.address,
            to1Wallet.address,
            scAddress1,
            user1TokenId
        );
        const user1Signature = await signChunkHash(minterWallet, user1ChunkHash);
        console.log("User1 ChunkHash:", user1ChunkHash);
        console.log("User1 Signature:", user1Signature);

        // 3. User2 生成 chunkHash 并签名
        const user2ChunkHash = calculateChunkHash(
            bundleHash,
            to1Wallet.address,
            minterWallet.address,
            scAddress2,
            user2TokenId
        );
        const user2Signature = await signChunkHash(to1Wallet, user2ChunkHash);
        console.log("User2 ChunkHash:", user2ChunkHash);
        console.log("User2 Signature:", user2Signature);

        // 4. Relayer 聚合并执行 DVP
        console.log("=== Relayer Executing DVP ===");
        await revokeRecentApprovedToken(minterWallet,zkcscAddress, scAddress1);

        await expect(zkcsc.executeDVP(
            bundleHash,
            //transferFromRequests
            [{
                from: user1Wallet.address,
                to: user2Wallet.address,
                tokenAddress: scAddress1,
                tokenId: user1TokenId,
                signature:user1Signature
            },{
                from: user2Wallet.address,
                to: user1Wallet.address,
                tokenAddress: scAddress2,
                tokenId: user2TokenId,
                signature:user2Signature
            }],
            []
        )).revertedWith("PrivateERCToken: invalid allowance token")

        postBalance1 = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress1),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress1)
        }
        postBalance2 = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress2),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress2)
        }
        console.log("PostBalance : ",{postBalance1,postBalance2})
        expect(postBalance1.minter).equal(preBalance1.minter );
        expect(postBalance1.user).equal(preBalance1.user);
        expect(postBalance2.minter).equal(preBalance2.minter );
        expect(postBalance2.user).equal(preBalance2.user);
    });
    it("Cancel DVP to release approved token", async () => {
        const amount1 = 10
        const amount2 = 20
        console.log("PreBalance : ",{preBalance1,preBalance2})

        //approve for token
        let user1TokenId = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let user2TokenId = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);

        await testCancelDVP(zkcsc,minterWallet,to1Wallet,user1TokenId,user2TokenId,scAddress1,scAddress2)
        await sleep(4000)
        const minterApprovedTokenList = await getApproveTokenList(client,minterWallet.address,scAddress1,zkcscAddress,minterMeta)
        let split_tokens = minterApprovedTokenList.split_tokens
        console.log("Minter Approved Token List:", split_tokens);

        // 提取所有token_id到一个数组中
        let tokenIds = split_tokens.map(token => '0x' + token.token_id);
        console.log("Token IDs:", tokenIds);

        // 验证user1TokenId不在已批准的token列表中
        expect(tokenIds).to.not.include(user1TokenId);
        console.log(`✅ Passed: ${user1TokenId} is not in minter approved token list`);

        const to1ApprovedTokenList = await getApproveTokenList(client,to1Wallet.address,scAddress2,zkcscAddress,to1Meta)
        split_tokens = to1ApprovedTokenList.split_tokens
        console.log("To1 Approved Token List:", split_tokens);

        // 提取所有token_id到一个数组中
        tokenIds = split_tokens.map(token => '0x' + token.token_id);
        console.log("Token IDs:", tokenIds);

        // 验证user1TokenId不在已批准的token列表中
        expect(tokenIds).to.not.include(user2TokenId);
        console.log(`✅ Passed: ${user1TokenId} is not in to1 approved token list`);
    });
    it("Cancel DVP to release approved token after revoke", async () => {
        const amount1 = 10
        const amount2 = 20
        console.log("PreBalance : ",{preBalance1,preBalance2})

        //approve for token
        let user1TokenId = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let user2TokenId = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);
        await revokeRecentApprovedToken(minterWallet,zkcscAddress, scAddress1);
        await testCancelDVP(zkcsc,minterWallet,to1Wallet,user1TokenId,user2TokenId,scAddress1,scAddress2)

        await sleep(4000)

        const minterApprovedTokenList = await getApproveTokenList(client,minterWallet.address,scAddress1,zkcscAddress,minterMeta)
        let split_tokens = minterApprovedTokenList.split_tokens
        console.log("Minter Approved Token List:", split_tokens);

        // 提取所有token_id到一个数组中
        let tokenIds = split_tokens.map(token => '0x' + token.token_id);
        console.log("Token IDs:", tokenIds);

        // 验证user1TokenId不在已批准的token列表中
        expect(tokenIds).to.not.include(user1TokenId);
        console.log(`✅ Passed: ${user1TokenId} is not in minter approved token list`);

        const to1ApprovedTokenList = await getApproveTokenList(client,to1Wallet.address,scAddress2,zkcscAddress,to1Meta)
        split_tokens = to1ApprovedTokenList.split_tokens
        console.log("To1 Approved Token List:", split_tokens);

        // 提取所有token_id到一个数组中
        tokenIds = split_tokens.map(token => '0x' + token.token_id);
        console.log("Token IDs:", tokenIds);

        // 验证user1TokenId不在已批准的token列表中
        expect(tokenIds).to.not.include(user2TokenId);
        console.log(`✅ Passed: ${user1TokenId} is not in to1 approved token list`);

    });
    it.skip("Should Reverted: executeDVP with missing parameters", async () => {
        const amount1 = 10
        const amount2 = 20
        console.log("PreBalance : ",{preBalance1,preBalance2})

        //approve for token
        let user1TokenId = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let user2TokenId = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);

        // 1. 使用两个地址 + "DVP" + 毫秒时间戳生成 bundleHash
        const timestamp = Date.now().toString();
        const bundleString = `${minterWallet.address}${to1Wallet.address}${timestamp}DVP`;
        const bundleHash = ethers.keccak256(ethers.toUtf8Bytes(bundleString));

        console.log("BundleHash:", bundleHash);

        // 2. User1 生成 chunkHash 并签名
        const user1ChunkHash = calculateChunkHash(
            bundleHash,
            minterWallet.address,
            to1Wallet.address,
            scAddress1,
            user1TokenId
        );
        const user1Signature = await signChunkHash(minterWallet, user1ChunkHash);
        console.log("User1 ChunkHash:", user1ChunkHash);
        console.log("User1 Signature:", user1Signature);

        // 3. User2 生成 chunkHash 并签名
        const user2ChunkHash = calculateChunkHash(
            bundleHash,
            to1Wallet.address,
            minterWallet.address,
            scAddress2,
            user2TokenId
        );
        const user2Signature = await signChunkHash(to1Wallet, user2ChunkHash);
        console.log("User2 ChunkHash:", user2ChunkHash);
        console.log("User2 Signature:", user2Signature);

        // 测试参数数量不匹配的情况
        console.log("=== Testing DVP with mismatched array lengths ===");

        // 1. chunkHashes 数量少于其他参数
        await expect(zkcsc.executeDVP(
            bundleHash,
            //transferFromRequests
            [{
                from: user1Wallet.address,
                to: user2Wallet.address,
                tokenAddress: scAddress1,
                tokenId: user1TokenId,
                signature:user1Signature
            },{
                from: user2Wallet.address,
                to: user1Wallet.address,
                tokenAddress: scAddress2,
                tokenId: user2TokenId,
                signature:user2Signature
            }],
            []
        )).revertedWith("DVP: Array length mismatch");

        // 2. fromAddresses 数量少于其他参数
        await expect(zkcsc.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [minterWallet.address], // 只有一个 fromAddress
            [to1Wallet.address, minterWallet.address],
            [scAddress1, scAddress2],
            [user1TokenId, user2TokenId],
            [user1Signature, user2Signature]
        )).revertedWith("DVP: Array length mismatch");

        // 3. toAddresses 数量少于其他参数
        await expect(zkcsc.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [minterWallet.address, to1Wallet.address],
            [to1Wallet.address], // 只有一个 toAddress
            [scAddress1, scAddress2],
            [user1TokenId, user2TokenId],
            [user1Signature, user2Signature]
        )).revertedWith("DVP: Array length mismatch");

        // 4. tokenAddresses 数量少于其他参数
        await expect(zkcsc.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [minterWallet.address, to1Wallet.address],
            [to1Wallet.address, minterWallet.address],
            [scAddress1], // 只有一个 tokenAddress
            [user1TokenId, user2TokenId],
            [user1Signature, user2Signature]
        )).revertedWith("DVP: Array length mismatch");

        // 5. tokenIds 数量少于其他参数
        await expect(zkcsc.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [minterWallet.address, to1Wallet.address],
            [to1Wallet.address, minterWallet.address],
            [scAddress1, scAddress2],
            [user1TokenId], // 只有一个 tokenId
            [user1Signature, user2Signature]
        )).revertedWith("DVP: Array length mismatch");

        // 6. signatures 数量少于其他参数
        await expect(zkcsc.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [minterWallet.address, to1Wallet.address],
            [to1Wallet.address, minterWallet.address],
            [scAddress1, scAddress2],
            [user1TokenId, user2TokenId],
            [user1Signature] // 只有一个 signature
        )).revertedWith("DVP: Array length mismatch");

        console.log("✅ All missing parameter tests passed");
    });
    it("Should Reverted: executeDVP with invalid chunkHash", async () => {
        const amount1 = 10
        const amount2 = 20
        console.log("PreBalance : ",{preBalance1,preBalance2})

        //approve for token
        let user1TokenId = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let user2TokenId = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);

        // 1. 使用两个地址 + "DVP" + 毫秒时间戳生成 bundleHash
        const timestamp = Date.now().toString();
        const bundleString = `${minterWallet.address}${to1Wallet.address}${timestamp}DVP`;
        const bundleHash = ethers.keccak256(ethers.toUtf8Bytes(bundleString));

        console.log("BundleHash:", bundleHash);

        // 2. User1 生成 chunkHash 并签名
        const user1ChunkHash = calculateChunkHash(
            bundleHash,
            minterWallet.address,
            to1Wallet.address,
            scAddress1,
            user1TokenId
        );
        const user1Signature = await signChunkHash(minterWallet, user1ChunkHash);
        console.log("User1 ChunkHash:", user1ChunkHash);
        console.log("User1 Signature:", user1Signature);

        // 3. User2 生成 chunkHash 并签名
        const user2ChunkHash = calculateChunkHash(
            bundleHash,
            to1Wallet.address,
            minterWallet.address,
            scAddress2,
            user2TokenId
        );
        const user2Signature = await signChunkHash(to1Wallet, user2ChunkHash);
        console.log("User2 ChunkHash:", user2ChunkHash);
        console.log("User2 Signature:", user2Signature);

        // 测试无效的 chunkHash
        console.log("=== Testing DVP with invalid chunkHash ===");

        // 1. 使用无效的 chunkHash (不匹配的参数)
        const invalidChunkHash = calculateChunkHash(
            bundleHash,
            minterWallet.address,
            to1Wallet.address,
            scAddress1,
            user2TokenId // 错误的 tokenId
        );

        await expect(zkcsc.executeDVP(
            bundleHash,
            [invalidChunkHash, user2ChunkHash], // 第一个 chunkHash 无效
            [minterWallet.address, to1Wallet.address],
            [to1Wallet.address, minterWallet.address],
            [scAddress1, scAddress2],
            [user1TokenId, user2TokenId],
            [user1Signature, user2Signature] // 签名与 chunkHash 不匹配
        )).revertedWith("DVP: Invalid chunkHash");

        // 2. 使用完全随机的 chunkHash
        const randomChunkHash = ethers.keccak256(ethers.toUtf8Bytes("randomChunkHash"));
        const randomSignature = await signChunkHash(minterWallet, randomChunkHash);

        await expect(zkcsc.executeDVP(
            bundleHash,
            [randomChunkHash, user2ChunkHash],
            [minterWallet.address, to1Wallet.address],
            [to1Wallet.address, minterWallet.address],
            [scAddress1, scAddress2],
            [user1TokenId, user2TokenId],
            [randomSignature, user2Signature]
        )).revertedWith("DVP: Invalid chunkHash");

        console.log("✅ All invalid chunkHash tests passed");
    });
    it("Should Reverted: executeDVP with mismatched addresses", async () => {
        const amount1 = 10
        const amount2 = 20
        console.log("PreBalance : ",{preBalance1,preBalance2})

        //approve for token
        let user1TokenId = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let user2TokenId = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);

        // 1. 使用两个地址 + "DVP" + 毫秒时间戳生成 bundleHash
        const timestamp = Date.now().toString();
        const bundleString = `${minterWallet.address}${to1Wallet.address}${timestamp}DVP`;
        const bundleHash = ethers.keccak256(ethers.toUtf8Bytes(bundleString));

        console.log("BundleHash:", bundleHash);

        // 2. User1 生成 chunkHash 并签名
        const user1ChunkHash = calculateChunkHash(
            bundleHash,
            minterWallet.address,
            to1Wallet.address,
            scAddress1,
            user1TokenId
        );
        const user1Signature = await signChunkHash(minterWallet, user1ChunkHash);
        console.log("User1 ChunkHash:", user1ChunkHash);
        console.log("User1 Signature:", user1Signature);

        // 3. User2 生成 chunkHash 并签名
        const user2ChunkHash = calculateChunkHash(
            bundleHash,
            to1Wallet.address,
            minterWallet.address,
            scAddress2,
            user2TokenId
        );
        const user2Signature = await signChunkHash(to1Wallet, user2ChunkHash);
        console.log("User2 ChunkHash:", user2ChunkHash);
        console.log("User2 Signature:", user2Signature);

        // 测试地址混淆的情况
        console.log("=== Testing DVP with mismatched addresses ===");

        // 1. 交换 fromAddresses 和 toAddresses
        await expect(zkcsc.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [to1Wallet.address, minterWallet.address], // 交换了地址
            [minterWallet.address, to1Wallet.address], // 交换了地址
            [scAddress1, scAddress2],
            [user1TokenId, user2TokenId],
            [user1Signature, user2Signature]
        )).revertedWith("DVP: Invalid chunkHash");

        // 2. 使用错误的 token 地址
        await expect(zkcsc.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [minterWallet.address, to1Wallet.address],
            [to1Wallet.address, minterWallet.address],
            [scAddress2, scAddress1], // 交换了 token 地址
            [user1TokenId, user2TokenId],
            [user1Signature, user2Signature]
        )).revertedWith("DVP: Invalid chunkHash");

        // 3. 使用错误的 tokenId
        await expect(zkcsc.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [minterWallet.address, to1Wallet.address],
            [to1Wallet.address, minterWallet.address],
            [scAddress1, scAddress2],
            [user2TokenId, user1TokenId], // 交换了 tokenId
            [user1Signature, user2Signature]
        )).revertedWith("DVP: Invalid chunkHash");

        console.log("✅ All mismatched addresses tests passed");
    });
    it("Should Reverted: executeDVP with invalid signatures", async () => {
        const amount1 = 10
        const amount2 = 20
        console.log("PreBalance : ",{preBalance1,preBalance2})

        //approve for token
        let user1TokenId = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let user2TokenId = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);

        // 1. 使用两个地址 + "DVP" + 毫秒时间戳生成 bundleHash
        const timestamp = Date.now().toString();
        const bundleString = `${minterWallet.address}${to1Wallet.address}${timestamp}DVP`;
        const bundleHash = ethers.keccak256(ethers.toUtf8Bytes(bundleString));

        console.log("BundleHash:", bundleHash);

        // 2. User1 生成 chunkHash 并签名
        const user1ChunkHash = calculateChunkHash(
            bundleHash,
            minterWallet.address,
            to1Wallet.address,
            scAddress1,
            user1TokenId
        );
        const user1Signature = await signChunkHash(minterWallet, user1ChunkHash);
        console.log("User1 ChunkHash:", user1ChunkHash);
        console.log("User1 Signature:", user1Signature);

        // 3. User2 生成 chunkHash 并签名
        const user2ChunkHash = calculateChunkHash(
            bundleHash,
            to1Wallet.address,
            minterWallet.address,
            scAddress2,
            user2TokenId
        );
        const user2Signature = await signChunkHash(to1Wallet, user2ChunkHash);
        console.log("User2 ChunkHash:", user2ChunkHash);
        console.log("User2 Signature:", user2Signature);

        // 测试无效签名的情况
        console.log("=== Testing DVP with invalid signatures ===");

        // 1. 使用错误的签名 (交换签名)
        await expect(zkcsc.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [minterWallet.address, to1Wallet.address],
            [to1Wallet.address, minterWallet.address],
            [scAddress1, scAddress2],
            [user1TokenId, user2TokenId],
            [user2Signature, user1Signature] // 交换了签名
        )).revertedWith("DVP: Signature not from 'from' address");
        console.log("✅ All invalid signatures tests passed");
    });

});

