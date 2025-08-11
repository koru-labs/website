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

describe("DVP with different token contract in node3", function () {
    this.timeout(1200000)
    const scAddress1 = '0x4e7d8fF47A4754945a9D42106a6e923BA450D8bD';
    const scAddress2 = '0x3456344AB83d8771d8F8E3A269262fb1D32BEfca';
    const zkcscAddress = '0xf4DeC7DD923d2D1cf8C67a4F23412d7D670F2125';
    const relayerCallerAddress = '0x43F4B6770D578A8E06337005AAE1617c53462163';
    const MAX_UINT256 = ethers.MaxUint256;
    const MIN_UINT256 = ethers.MinInt256;

    const amount = 200;

    let preBalance1,postBalance1;
    let preBalance2,postBalance2;
    let zkcsc, relayerCaller;
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
    it('Deploy relayerCaller ',async () => {
        // let relayerCallerFactory = await ethers.getContractFactory("RelayerCaller");
        // relayerCaller = await relayerCallerFactory.deploy(zkcsc.target);
        // await relayerCaller.waitForDeployment();
        // console.log("RelayerCaller Deployed at:", relayerCaller.target)

        relayerCaller = await ethers.getContractAt("RelayerCaller", relayerCallerAddress);

    });

    it("relayCaller excuteDVP test", async () => {
        const amount1 = 10
        const amount2 = 20
        console.log("PreBalance : ",{preBalance1,preBalance2})

        //approve for token
        let tokenId1 = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let tokenId2 = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);
        // excute dvp with relayerCaller
        console.log("=== Testing DVP ===");

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

        // 4. Relayer 聚合并执行 DVP
        console.log("=== Relayer Executing DVP ===");
        const chunkHashes = [user1ChunkHash, user2ChunkHash];
        const froms =[minterWallet.address, to1Wallet.address];
        const tos = [to1Wallet.address, minterWallet.address];
        const tokenAddresses = [scAddress1, scAddress2];
        const tokenIds = [tokenId1, tokenId2];
        const signatures = [user1Signature, user2Signature];

        console.log("=== Dvp Reqeusts ===")
        console.log({bundleHash, chunkHashes, froms, tos, tokenAddresses, tokenIds, signatures})
        let tx = await relayerCaller.callExecuteDVP(
            bundleHash,
            chunkHashes,
            froms,
            tos,
            tokenAddresses,
            tokenIds,
            signatures
        );
        await tx.wait();

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
    it("relayCaller cancelDVP test", async () => {
        const amount1 = 10
        const amount2 = 20
        console.log("PreBalance : ",{preBalance1,preBalance2})

        //approve for token
        let tokenId1 = await approveTokens(scAddress1, minterWallet, accounts.Minter, zkcsc.target, accounts.To1,amount1);
        let tokenId2 = await approveTokens(scAddress2, to1Wallet, accounts.To1, zkcsc.target, accounts.Minter,amount2);
        // excute dvp with relayerCaller
        console.log("=== Testing DVP ===");

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

        // 4. Relayer 聚合并执行 DVP
        console.log("=== Relayer Executing DVP ===");
        const chunkHashes = [user1ChunkHash, user2ChunkHash];
        const froms =[minterWallet.address, to1Wallet.address];
        const tos = [to1Wallet.address, minterWallet.address];
        const tokenAddresses = [scAddress1, scAddress2];
        const tokenIds = [tokenId1, tokenId2];
        const signatures = [user1Signature, user2Signature];

        console.log("=== Dvp Cancel Reqeusts ===")
        console.log({bundleHash, chunkHashes, froms, tos, tokenAddresses, tokenIds, signatures})
        let tx = await relayerCaller.callCancelDVP(
            bundleHash,
            chunkHashes,
            froms,
            tos,
            tokenAddresses,
            tokenIds,
            signatures
        );
        await tx.wait();

        postBalance1 = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress1),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress1)
        }
        postBalance2 = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress2),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress2)
        }
        console.log("PostBalance : ",{postBalance1,postBalance2})
        expect(postBalance1.minter).equal(preBalance1.minter);
        expect(postBalance1.user).equal(preBalance1.user);
        expect(postBalance2.minter).equal(preBalance2.minter);
        expect(postBalance2.user).equal(preBalance2.user);

        const minterApprovedTokenList = await getApproveTokenList(client,minterWallet.address,scAddress1,zkcscAddress,minterMeta)
        let split_tokens = minterApprovedTokenList.split_tokens
        console.log("Minter Approved Token List:", split_tokens);

        // 提取所有token_id到一个数组中
        let ApprovedtokenIds = split_tokens.map(token => '0x' + token.token_id);
        console.log("minter Approved Token IDs:", tokenIds);

        // 验证tokenId1不在已批准的token列表中
        expect(ApprovedtokenIds).to.not.include(tokenId1);
        console.log(`✅ Passed: ${tokenId1} is not in minter approved token list`);

        const to1ApprovedTokenList = await getApproveTokenList(client,to1Wallet.address,scAddress2,zkcscAddress,to1Meta)
        split_tokens = to1ApprovedTokenList.split_tokens
        console.log("To1 Approved Token List:", split_tokens);

        // 提取所有token_id到一个数组中
        ApprovedtokenIds = split_tokens.map(token => '0x' + token.token_id);
        console.log("Token IDs:", tokenIds);

        // 验证tokenId1不在已批准的token列表中
        expect(ApprovedtokenIds).to.not.include(tokenId2);
        console.log(`✅ Passed: ${tokenId1} is not in to1 approved token list`);
    });

});

