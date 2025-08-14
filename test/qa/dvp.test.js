const { expect } = require("chai");
const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')


const rpcUrl = "qa-node3-rpc.hamsa-ucl.com:50051"
const rpcUrl_1 = "qa-node4-rpc.hamsa-ucl.com:50051"
// const rpcUrl = 'a901f625f7fbc414d89f04b67325365c-1938211366.us-west-1.elb.amazonaws.com:50051'
// const rpcUrl_1 = "a10062b98cbe34ba2a0b278754c41a1e-660863113.us-west-1.elb.amazonaws.com:50051"
const client = createClient(rpcUrl)
const client1 = createClient(rpcUrl_1)

const {
    createAuthMetadata,
    getAddressBalance2,
    callPrivateRevoke,
    getApproveTokenList
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

const adminWallet = new ethers.Wallet(accounts.OwnerKey, l1Provider);
const minterWallet = new ethers.Wallet(accounts.MinterKey, l1Provider);
const spender1Wallet = new ethers.Wallet(accounts.Spender1Key, l1Provider);
const to1Wallet = new ethers.Wallet(accounts.To1PrivateKey, l1Provider);

const toAddress1 = accounts.To1;
const toAddress2 = accounts.To2;


const userInNode1 = '0xbA268f776F70caDB087e73020dfE41c7298363Ed';
const userInNode2 = '0xF8041E1185C7106121952bA9914ff904A4A01c80';
const userInNode3 = '0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB';
const userInNode4 = '0x5a3288A7400B2cd5e0568728E8216D9392094892';
const adminPrivateKey = hardhatConfig.networks.ucl_L2.accounts[1];
const node4AdminPrivateKey = "81690fb141b4ae5682ad1fd73b29ae1bcc67891e93de73c6f636402deac21171";

let preBalance,postBalance;
let preAllowance,postAllowance;

async function getTokenBalanceByAuth(grpcClient, account,scAddress, metadata){

    let balance = await getAddressBalance2(grpcClient, scAddress, account, metadata)
    return Number(balance.balance)
}

async function getTokenBalanceByAdmin(account,scAddress){
    const metadata = await  createAuthMetadata(adminPrivateKey)
    let balance = await getAddressBalance2(client, scAddress, account, metadata)
    return Number(balance.balance)
}

function convertBigInt2Hex(number) {
    return ethers.toBigInt(number).toString(10)
}

async function getTokenBalanceOnChain(address,scAddress, metadata){
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress)
    let amount = await contract.privateBalanceOf(address)
    console.log("amount: ", amount)
    let balance=  {
        cl_x: convertBigInt2Hex(amount[0]),
        cl_y: convertBigInt2Hex(amount[1]),
        cr_x: convertBigInt2Hex(amount[2]),
        cr_y: convertBigInt2Hex(amount[3])
    }
    console.log("balance: ", balance)
    let decodeAmount = await client.decodeElgamalAmount(balance, metadata)
    return Number(decodeAmount.balance)
}

async function getTokenBalanceInNode1(address,scAddress){
    const metadata = await createAuthMetadata(node4AdminPrivateKey)
    console.log(node4AdminPrivateKey)
    // let balance = await client1.getAccountBalance(config.contracts.PrivateERCToken, address,metadata)
    let balance = await getAddressBalance2(client1, scAddress, address, metadata)
    // console.log(`address ${address} account balance ${balance.balance} `)
    // console.log("account balance: ", await getAddressBalance(client, config.contracts.PrivateERCToken, address))
    return Number(balance.balance)
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function DirectMint(receiver,amount,scAddress) {
    const minterMeta = await createAuthMetadata(accounts.MinterKey)
    const generateRequest = {
        from_address: accounts.Minter,
        sc_address: scAddress,
        token_type: '0',
        to_address: receiver,
        amount: amount
    };
    const response = await client.generateDirectMint(generateRequest,minterMeta);
    console.log("Generate Mint Proof response:", response);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
    // await sleep(4000)
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
    const tokenId = '0x' + response.transfer_token_id;
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
    const scAddress1 = '0x75804f4Bcd050b38dC9138e8A95F2ABd7A303b40';
    const scAddress2 = '0x009361e8032C83b83A4A02D642B247988A45f784';
    const zkcscAddress = '0x60B9222666D9587936c51decC7e093F7aDe27046';
    const MAX_UINT256 = ethers.MaxUint256;
    const MIN_UINT256 = ethers.MinInt256;

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
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress1),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress1)
        }
        preBalance2 = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress2),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress2)
        }
    });

    it("Mint to user", async () => {
        await DirectMint(accounts.Minter,amount,scAddress1);
        await DirectMint(accounts.To1,amount,scAddress2);
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
        let tokenId1 = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let tokenId2 = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);
        // excute dvp
        await testTwoPartyDVP(zkcsc,minterWallet,to1Wallet,tokenId1,tokenId2,scAddress1,scAddress2)
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
        let tokenId1 = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let tokenId2 = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);
        // excute dvp
        await testTwoPartyDVP(zkcsc,minterWallet,to1Wallet,tokenId1,tokenId2,scAddress1,scAddress2)
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
        let tokenId1 = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let tokenId2 = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);
        // excute dvp with mismatched tokens

        // await testTwoPartyDVP(zkcsc,minterWallet,to1Wallet,tokenId1,tokenId2,scAddress1,scAddress2)

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
            tokenId1
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
            tokenId2
        );
        const user2Signature = await signChunkHash(to1Wallet, user2ChunkHash);
        console.log("User2 ChunkHash:", user2ChunkHash);
        console.log("User2 Signature:", user2Signature);

        // 4. Relayer 聚合并执行 DVP
        console.log("=== Relayer Executing DVP ===");
        await expect(zkcsc.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [minterWallet.address, to1Wallet.address],
            [to1Wallet.address, minterWallet.address],
            [scAddress1, scAddress2],
            [tokenId2, tokenId1],
            [user1Signature, user2Signature]
        )).revertedWith("DVP: Invalid chunkHash")

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
        let tokenId1 = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let tokenId2 = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);
        // excute dvp with mismatched tokens

        // await testTwoPartyDVP(zkcsc,minterWallet,to1Wallet,tokenId1,tokenId2,scAddress1,scAddress2)

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
            tokenId1
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
            tokenId2
        );
        const user2Signature = await signChunkHash(to1Wallet, user2ChunkHash);
        console.log("User2 ChunkHash:", user2ChunkHash);
        console.log("User2 Signature:", user2Signature);

        // 4. Relayer 聚合并执行 DVP
        console.log("=== Relayer Executing DVP ===");
        let tx = await zkcsc.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [minterWallet.address, to1Wallet.address],
            [to1Wallet.address, minterWallet.address],
            [scAddress1, scAddress2],
            [tokenId1, tokenId2],
            [user1Signature, user2Signature]
        );
        let receipt = await tx.wait();
        console.log("Receipt:", receipt)
        console.log("DVP Execution successful! Transaction hash:", tx.hash);

        await expect(zkcsc.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [minterWallet.address, to1Wallet.address],
            [to1Wallet.address, minterWallet.address],
            [scAddress1, scAddress2],
            [tokenId1, tokenId2],
            [user1Signature, user2Signature]
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
        let tokenId1 = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let tokenId2 = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);
        // excute dvp with mismatched tokens

        // await testTwoPartyDVP(zkcsc,minterWallet,to1Wallet,tokenId1,tokenId2,scAddress1,scAddress2)

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
            tokenId1
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
            tokenId2
        );
        let user2Signature = await signChunkHash(to1Wallet, user2ChunkHash);
        console.log("User2 ChunkHash:", user2ChunkHash);
        console.log("User2 Signature:", user2Signature);

        // 4. Relayer 聚合并执行 DVP
        console.log("=== Relayer Executing DVP ===");
        let tx = await zkcsc.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [minterWallet.address, to1Wallet.address],
            [to1Wallet.address, minterWallet.address],
            [scAddress1, scAddress2],
            [tokenId1, tokenId2],
            [user1Signature, user2Signature]
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
            tokenId1
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
            tokenId2
        );
        user2Signature = await signChunkHash(to1Wallet, user2ChunkHash);
        console.log("User2 ChunkHash:", user2ChunkHash);
        console.log("User2 Signature:", user2Signature);

        await expect(zkcsc.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [minterWallet.address, to1Wallet.address],
            [to1Wallet.address, minterWallet.address],
            [scAddress1, scAddress2],
            [tokenId1, tokenId2],
            [user1Signature, user2Signature]
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
        let tokenId1 = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let tokenId2 = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);
        // excute dvp with mismatched tokens

        // await testTwoPartyDVP(zkcsc,minterWallet,to1Wallet,tokenId1,tokenId2,scAddress1,scAddress2)

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
            tokenId1
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
            tokenId2
        );
        const user2Signature = await signChunkHash(to1Wallet, user2ChunkHash);
        console.log("User2 ChunkHash:", user2ChunkHash);
        console.log("User2 Signature:", user2Signature);

        // 4. Relayer 聚合并执行 DVP
        console.log("=== Relayer Executing DVP ===");
        await revokeRecentApprovedToken(minterWallet,zkcscAddress, scAddress1);

        await expect(zkcsc.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [minterWallet.address, to1Wallet.address],
            [to1Wallet.address, minterWallet.address],
            [scAddress1, scAddress2],
            [tokenId1, tokenId2],
            [user1Signature, user2Signature]
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
        let tokenId1 = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let tokenId2 = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);

        await testCancelDVP(zkcsc,minterWallet,to1Wallet,tokenId1,tokenId2,scAddress1,scAddress2)
        await sleep(4000)
        const minterApprovedTokenList = await getApproveTokenList(client,minterWallet.address,scAddress1,zkcscAddress,minterMeta)
        let split_tokens = minterApprovedTokenList.split_tokens
        console.log("Minter Approved Token List:", split_tokens);

        // 提取所有token_id到一个数组中
        let tokenIds = split_tokens.map(token => '0x' + token.token_id);
        console.log("Token IDs:", tokenIds);

        // 验证tokenId1不在已批准的token列表中
        expect(tokenIds).to.not.include(tokenId1);
        console.log(`✅ Passed: ${tokenId1} is not in minter approved token list`);

        const to1ApprovedTokenList = await getApproveTokenList(client,to1Wallet.address,scAddress2,zkcscAddress,to1Meta)
        split_tokens = to1ApprovedTokenList.split_tokens
        console.log("To1 Approved Token List:", split_tokens);

        // 提取所有token_id到一个数组中
        tokenIds = split_tokens.map(token => '0x' + token.token_id);
        console.log("Token IDs:", tokenIds);

        // 验证tokenId1不在已批准的token列表中
        expect(tokenIds).to.not.include(tokenId2);
        console.log(`✅ Passed: ${tokenId1} is not in to1 approved token list`);
    });
    it("Cancel DVP to release approved token after revoke", async () => {
        const amount1 = 10
        const amount2 = 20
        console.log("PreBalance : ",{preBalance1,preBalance2})

        //approve for token
        let tokenId1 = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let tokenId2 = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);
        await revokeRecentApprovedToken(minterWallet,zkcscAddress, scAddress1);
        await testCancelDVP(zkcsc,minterWallet,to1Wallet,tokenId1,tokenId2,scAddress1,scAddress2)

        await sleep(4000)

        const minterApprovedTokenList = await getApproveTokenList(client,minterWallet.address,scAddress1,zkcscAddress,minterMeta)
        let split_tokens = minterApprovedTokenList.split_tokens
        console.log("Minter Approved Token List:", split_tokens);

        // 提取所有token_id到一个数组中
        let tokenIds = split_tokens.map(token => '0x' + token.token_id);
        console.log("Token IDs:", tokenIds);

        // 验证tokenId1不在已批准的token列表中
        expect(tokenIds).to.not.include(tokenId1);
        console.log(`✅ Passed: ${tokenId1} is not in minter approved token list`);

        const to1ApprovedTokenList = await getApproveTokenList(client,to1Wallet.address,scAddress2,zkcscAddress,to1Meta)
        split_tokens = to1ApprovedTokenList.split_tokens
        console.log("To1 Approved Token List:", split_tokens);

        // 提取所有token_id到一个数组中
        tokenIds = split_tokens.map(token => '0x' + token.token_id);
        console.log("Token IDs:", tokenIds);

        // 验证tokenId1不在已批准的token列表中
        expect(tokenIds).to.not.include(tokenId2);
        console.log(`✅ Passed: ${tokenId1} is not in to1 approved token list`);

    });
    it("Should Reverted: executeDVP with missing parameters", async () => {
        const amount1 = 10
        const amount2 = 20
        console.log("PreBalance : ",{preBalance1,preBalance2})

        //approve for token
        let tokenId1 = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let tokenId2 = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);

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
            tokenId1
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
            tokenId2
        );
        const user2Signature = await signChunkHash(to1Wallet, user2ChunkHash);
        console.log("User2 ChunkHash:", user2ChunkHash);
        console.log("User2 Signature:", user2Signature);

        // 测试参数数量不匹配的情况
        console.log("=== Testing DVP with mismatched array lengths ===");

        // 1. chunkHashes 数量少于其他参数
        await expect(zkcsc.executeDVP(
            bundleHash,
            [user1ChunkHash], // 只有一个 chunkHash
            [minterWallet.address, to1Wallet.address],
            [to1Wallet.address, minterWallet.address],
            [scAddress1, scAddress2],
            [tokenId1, tokenId2],
            [user1Signature, user2Signature]
        )).revertedWith("DVP: Array length mismatch");

        // 2. fromAddresses 数量少于其他参数
        await expect(zkcsc.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [minterWallet.address], // 只有一个 fromAddress
            [to1Wallet.address, minterWallet.address],
            [scAddress1, scAddress2],
            [tokenId1, tokenId2],
            [user1Signature, user2Signature]
        )).revertedWith("DVP: Array length mismatch");

        // 3. toAddresses 数量少于其他参数
        await expect(zkcsc.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [minterWallet.address, to1Wallet.address],
            [to1Wallet.address], // 只有一个 toAddress
            [scAddress1, scAddress2],
            [tokenId1, tokenId2],
            [user1Signature, user2Signature]
        )).revertedWith("DVP: Array length mismatch");

        // 4. tokenAddresses 数量少于其他参数
        await expect(zkcsc.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [minterWallet.address, to1Wallet.address],
            [to1Wallet.address, minterWallet.address],
            [scAddress1], // 只有一个 tokenAddress
            [tokenId1, tokenId2],
            [user1Signature, user2Signature]
        )).revertedWith("DVP: Array length mismatch");

        // 5. tokenIds 数量少于其他参数
        await expect(zkcsc.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [minterWallet.address, to1Wallet.address],
            [to1Wallet.address, minterWallet.address],
            [scAddress1, scAddress2],
            [tokenId1], // 只有一个 tokenId
            [user1Signature, user2Signature]
        )).revertedWith("DVP: Array length mismatch");

        // 6. signatures 数量少于其他参数
        await expect(zkcsc.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [minterWallet.address, to1Wallet.address],
            [to1Wallet.address, minterWallet.address],
            [scAddress1, scAddress2],
            [tokenId1, tokenId2],
            [user1Signature] // 只有一个 signature
        )).revertedWith("DVP: Array length mismatch");

        console.log("✅ All missing parameter tests passed");
    });
    it("Should Reverted: executeDVP with invalid chunkHash", async () => {
        const amount1 = 10
        const amount2 = 20
        console.log("PreBalance : ",{preBalance1,preBalance2})

        //approve for token
        let tokenId1 = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let tokenId2 = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);

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
            tokenId1
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
            tokenId2
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
            tokenId2 // 错误的 tokenId
        );

        await expect(zkcsc.executeDVP(
            bundleHash,
            [invalidChunkHash, user2ChunkHash], // 第一个 chunkHash 无效
            [minterWallet.address, to1Wallet.address],
            [to1Wallet.address, minterWallet.address],
            [scAddress1, scAddress2],
            [tokenId1, tokenId2],
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
            [tokenId1, tokenId2],
            [randomSignature, user2Signature]
        )).revertedWith("DVP: Invalid chunkHash");

        console.log("✅ All invalid chunkHash tests passed");
    });
    it("Should Reverted: executeDVP with mismatched addresses", async () => {
        const amount1 = 10
        const amount2 = 20
        console.log("PreBalance : ",{preBalance1,preBalance2})

        //approve for token
        let tokenId1 = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let tokenId2 = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);

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
            tokenId1
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
            tokenId2
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
            [tokenId1, tokenId2],
            [user1Signature, user2Signature]
        )).revertedWith("DVP: Invalid chunkHash");

        // 2. 使用错误的 token 地址
        await expect(zkcsc.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [minterWallet.address, to1Wallet.address],
            [to1Wallet.address, minterWallet.address],
            [scAddress2, scAddress1], // 交换了 token 地址
            [tokenId1, tokenId2],
            [user1Signature, user2Signature]
        )).revertedWith("DVP: Invalid chunkHash");

        // 3. 使用错误的 tokenId
        await expect(zkcsc.executeDVP(
            bundleHash,
            [user1ChunkHash, user2ChunkHash],
            [minterWallet.address, to1Wallet.address],
            [to1Wallet.address, minterWallet.address],
            [scAddress1, scAddress2],
            [tokenId2, tokenId1], // 交换了 tokenId
            [user1Signature, user2Signature]
        )).revertedWith("DVP: Invalid chunkHash");

        console.log("✅ All mismatched addresses tests passed");
    });
    it("Should Reverted: executeDVP with invalid signatures", async () => {
        const amount1 = 10
        const amount2 = 20
        console.log("PreBalance : ",{preBalance1,preBalance2})

        //approve for token
        let tokenId1 = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let tokenId2 = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);

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
            tokenId1
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
            tokenId2
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
            [tokenId1, tokenId2],
            [user2Signature, user1Signature] // 交换了签名
        )).revertedWith("DVP: Signature not from 'from' address");
        console.log("✅ All invalid signatures tests passed");
    });

});

