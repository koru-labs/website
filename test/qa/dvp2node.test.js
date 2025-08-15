const { expect } = require("chai");
const {ethers} = require('hardhat');
const hre = require("hardhat");
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')
const fs = require("fs");
const path = require("path");

const { deployToken,
    allowBanksInTokenSmartContract,
    setMinterAllowed, setMinterAllowedNode4
} = require("../../script/circle/token/deploy_token")

const {loadExistingDeployments, saveDeploymentInfo} = require("../../script/circle/deploy_help");

async function main() {
    const deployed = config;

    await deployToken(deployed)
    await allowBanksInTokenSmartContract(deployed);
    await setMinterAllowed(deployed);
    await setMinterAllowedNode4(deployed);
    await saveDeploymentInfo(deployed,hre, ethers, fs, path)
}



const rpcUrl = "qa-node3-rpc.hamsa-ucl.com:50051"
const rpcUrl_1 = "qa-node4-rpc.hamsa-ucl.com:50051"
// const rpcUrl = 'a901f625f7fbc414d89f04b67325365c-1938211366.us-west-1.elb.amazonaws.com:50051'
// const rpcUrl_1 = "a10062b98cbe34ba2a0b278754c41a1e-660863113.us-west-1.elb.amazonaws.com:50051"
const client = createClient(rpcUrl)
const client4 = createClient(rpcUrl_1)

const {
    createAuthMetadata,
    getAddressBalance2,
    callPrivateRevoke,
    getApproveTokenList, callPrivateMint
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

const to1Wallet = new ethers.Wallet(accounts.To1PrivateKey, l1Provider);

const adminPrivateKey = hardhatConfig.networks.ucl_L2.accounts[1];
const node4AdminPrivateKey = "81690fb141b4ae5682ad1fd73b29ae1bcc67891e93de73c6f636402deac21171";
const node3MinterWallet = new ethers.Wallet(accounts.MinterKey, l1Provider);
const node4MinterWallet = new ethers.Wallet(accounts.Node4MinterKey, l1Provider);


let preBalance,postBalance;
let preAllowance,postAllowance;

const node4Accounts = {
    "MasterMinter": "0x03d68e57f1f9939d3FDcf97B5e7a1d0Be995Ec67",
    "MasterMinterKey": "d9597e2d88463e47d1b6c2431879f06d440a6ff980a51a1f8c830623b112f329",
    "Pauser": "0x03d68e57f1f9939d3FDcf97B5e7a1d0Be995Ec67",
    "PauserKey": "d9597e2d88463e47d1b6c2431879f06d440a6ff980a51a1f8c830623b112f329",
    "BlackLister": "0x03d68e57f1f9939d3FDcf97B5e7a1d0Be995Ec67",
    "BlackListerKey": "d9597e2d88463e47d1b6c2431879f06d440a6ff980a51a1f8c830623b112f329",

    "Owner": "0x93d2Ce0461C2612F847e074434d9951c32e44327",
    "OwnerKey": "81690fb141b4ae5682ad1fd73b29ae1bcc67891e93de73c6f636402deac21171",
    "Minter": "0xbA268f776F70caDB087e73020dfE41c7298363Ed",
    "MinterKey": "f083c679bb978f6e2eb8611de27319b2e3a329d307eb5fd1d532a1cd6b63fff9"
}


async function deployTokenInNode4() {
    let hamsal2event = config.contracts.HamsaL2Event;
    let institutionRegistration = config.contracts.InstUserProxy;

    // 使用重构后的合约名和路径
    const PrivateUSDCFactory = await ethers.getContractFactory("PrivateUSDC", {
        libraries: {
            "TokenEventLib": config.libraries.TokenEventLib,
            "TokenUtilsLib": config.libraries.TokenUtilsLib,
            "TokenVerificationLib": config.libraries.TokenVerificationLib,
            "SignatureChecker": config.libraries.SignatureChecker
        }
    });

    const privateUSDC = await PrivateUSDCFactory.deploy();
    await privateUSDC.waitForDeployment();
    console.log("PrivateUSDC is deployed at:", privateUSDC.target);
    config.contracts.PrivateERCToken = privateUSDC.target;

    console.log("Initializing PrivateUSDC...");
    //
    const initTx = await privateUSDC.initialize(
        "Private USDC",
        "PUSDC",
        "USD",
        6,
        node4Accounts.MasterMinter,
        node4Accounts.Pauser,
        node4Accounts.BlackLister,
        node4Accounts.Owner,
        hamsal2event,
        institutionRegistration
    );
    await initTx.wait();
    console.log("PrivateUSDC initialized successfully");
}
//
async function allowBanksInTokenSmartContractInNode4() {
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
    const ownerWallet = new ethers.Wallet(node4Accounts.OwnerKey, l1Provider);
    const privateUSDC = await ethers.getContractAt("PrivateUSDC", config.contracts.PrivateERCToken, ownerWallet);

    for (let i = 0; i < config.institutions.length; i++) {
        let bankAddress = config.institutions[i].address;
        let tx = await privateUSDC.updateAllowedBank(bankAddress, true);
        await tx.wait();
        console.log(`Bank ${bankAddress} allowed successfully`);
    }
}
//
async function setMinterAllowedInNode4() {
    const minterAllowedAmount = {
        "cl_x": 17965178807605681775593476527901391566646357775548805416191630067931921590266n,
        "cl_y": 17997503520096523373978760079614633178183544935372525079367653487073845131371n,
        "cr_x": 2799658707790704252170544877645553735081603739176317448125814928308770685127n,
        "cr_y": 10724405929777949929088094477911843117820716522007699467531083531418761611245n,
    }

    console.log("Configuring minter allowed amount...");

    const minters = [
        {account: node4Accounts.Minter, name: "Minter"},
    ];

    const PrivateUSDCFactory = await ethers.getContractFactory("PrivateUSDC", {
        libraries: {
            "TokenEventLib": config.libraries.TokenEventLib,
            "TokenUtilsLib": config.libraries.TokenUtilsLib,
            "TokenVerificationLib": config.libraries.TokenVerificationLib,
            "SignatureChecker": config.libraries.SignatureChecker
        }
    });
    const privateUSDC = await PrivateUSDCFactory.attach(config.contracts.PrivateERCToken);

    for (const minter of minters) {
        await privateUSDC.configurePrivacyMinter(minter.account, minterAllowedAmount);
        console.log(`Minter allowed amount configured successfully for ${minter.name} (${minter.account})`);
    }
}


async function getTokenBalanceByAuth(grpcClient, account,scAddress, metadata){

    let balance = await getAddressBalance2(grpcClient, scAddress, account, metadata)
    return Number(balance.balance)
}

async function getTokenBalanceInNode3(account,scAddress){
    const metadata = await  createAuthMetadata(adminPrivateKey)
    let balance = await getAddressBalance2(client, scAddress, account, metadata)
    return Number(balance.balance)
}
async function getTokenBalanceInNode4(address,scAddress){
    const metadata = await createAuthMetadata(node4AdminPrivateKey)
    // console.log(node4AdminPrivateKey)
    let balance = await getAddressBalance2(client4, scAddress, address, metadata)
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function MintWithNode(client,minterWallet,receiver,amount,scAddress) {
    const minterMeta = await createAuthMetadata(minterWallet.privateKey)
    const generateRequest = {
        from_address: minterWallet.address,
        sc_address: scAddress,
        token_type: '0',
        to_address: receiver,
        amount: amount
    };
    console.log("generateMintProof request:", generateRequest)
    const response = await client.generateMintProof(generateRequest,minterMeta);
    console.log("generateMintProof:", response)
    const receipt = await callPrivateMint(config.contracts.PrivateERCToken, response, minterWallet)
    console.log("callPrivateMint:", receipt)
    let tx = await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
    console.log("callPrivateMint:", tx)
}

async function approveTokensWithNode(client,tokenAddress, fromWallet, fromAddress, spenderAddress, toAddress,amount) {
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

describe("Deploy token contract",function (){
    this.timeout(1200000)
    it.skip('create user ',async () => {
        const account1 = ethers.Wallet.createRandom();
        const account2 = ethers.Wallet.createRandom();
        const account3 = ethers.Wallet.createRandom();
        const account4 = ethers.Wallet.createRandom();
        console.log(
            account1.address,
            account1.privateKey,
            account2.address,
            account2.privateKey,
            account3.address,
            account3.privateKey,
            account4.address,
            account4.privateKey
        )

    });

    it('Deploy in node3 ',async () => {
        const deployed = config
        await deployToken(deployed)
        await allowBanksInTokenSmartContract(deployed);
        await setMinterAllowed(deployed);
        await setMinterAllowedNode4(deployed);
        await saveDeploymentInfo(deployed,hre, ethers, fs, path)
    });

    it.only('Deploy in node4 ', async () => {
        await deployTokenInNode4()
        await allowBanksInTokenSmartContractInNode4();
        await setMinterAllowedInNode4();
        // await saveDeploymentInfo(deployed,hre, ethers, fs, path)
    });

})

describe("DVP with one token contract between node3 and node4", function () {
    this.timeout(1200000)
    const scAddress1 = config.contracts.PrivateERCToken;
    // const scAddress2 = '0x009361e8032C83b83A4A02D642B247988A45f784';
    const zkcscAddress = '0x60B9222666D9587936c51decC7e093F7aDe27046';
    const MAX_UINT256 = ethers.MaxUint256;
    const MIN_UINT256 = ethers.MinInt256;

    const amount = 600;

    let preBalance1,postBalance1;
    let preBalance2,postBalance2;
    let zkcsc;
    let minterMeta,spenderMeta,to1Meta
    let node3Minter, node4Minter

    before(async () => {
        minterMeta = await createAuthMetadata(accounts.MinterKey)
        spenderMeta = await createAuthMetadata(accounts.Spender1Key)
        to1Meta = await createAuthMetadata(accounts.To1PrivateKey);
        node3Minter = await createAuthMetadata(accounts.Minter3Key);
    });

    // beforeEach(async () => {
    //     preBalance1 = {
    //         minter: await getTokenBalanceInNode3(accounts.Minter,scAddress1),
    //         user: await getTokenBalanceInNode3(accounts.To1,scAddress1)
    //     }
    //     preBalance2 = {
    //         minter: await getTokenBalanceInNode4(accounts.Minter,scAddress1),
    //         user: await getTokenBalanceInNode4(accounts.To1,scAddress1)
    //     }
    // });


    it("Mint to user", async () => {
        // await MintWithNode(client,node3MinterWallet, accounts.Minter,amount,scAddress1);
        await MintWithNode(client4,node4MinterWallet, accounts.Node4Minter,amount,scAddress1);
        // postBalance1 = {
        //     minter: await getTokenBalanceInNode3(accounts.Minter,scAddress1),
        //     user: await getTokenBalanceInNode3(accounts.To1,scAddress1)
        // }
        // postBalance2 = {
        //     minter: await getTokenBalanceInNode4(accounts.Minter,scAddress1),
        //     user: await getTokenBalanceInNode4(accounts.Node4Minter,scAddress1)
        // }
        // expect(postBalance1.minter).equal(preBalance1.minter + amount);
        // expect(postBalance1.user).equal(preBalance1.user);
        // expect(postBalance2.minter).equal(preBalance2.minter);
        // expect(postBalance2.user).equal(preBalance2.user + amount);

    });
    it('Deploy ZKCSC ',async () => {
        zkcsc = await deployZKCSC();
        console.log("ZKCSC Deployed at:", zkcsc.target)
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
            minter: await getTokenBalanceInNode3(accounts.Minter,scAddress1),
            user: await getTokenBalanceInNode3(accounts.To1,scAddress1)
        }
        postBalance2 = {
            minter: await getTokenBalanceInNode4(accounts.Minter,scAddress2),
            user: await getTokenBalanceInNode4(accounts.To1,scAddress2)
        }
        console.log("PostBalance : ",{postBalance1,postBalance2})
        expect(postBalance1.minter).equal(preBalance1.minter - amount1);
        expect(postBalance1.user).equal(preBalance1.user + amount1);
        expect(postBalance2.minter).equal(preBalance2.minter + amount2);
        expect(postBalance2.user).equal(preBalance2.user - amount2);
    });

});

