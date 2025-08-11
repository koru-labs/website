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



describe.skip("Deployment", function () {
    let zkcsc

    it('Step1: Deploy TPFt',async () => {
        console.log("=== Deploying Simple TPFt Contract ===");
        const simpleTPFt = await ethers.getContractFactory("simpleTPFt");
        const tpft = await simpleTPFt.deploy(); // 如果有构造函数参数，请添加
        await tpft.waitForDeployment();
        console.log("Simple TPFt deployed at:", tpft.target);
    });
    it('Step2: Deploy ZKCSC ',async () => {
        zkcsc = await deployZKCSC();
        console.log("ZKCSC Deployed at:", zkcsc.target)
    });
    it('Step3: Deploy TPFt DVP Contract',async () => {
        console.log("=== Deploying TPFt dvp Contract ===");
        const tpftFactory = await ethers.getContractFactory("TPFtDVP");
        const tpftdvp = await tpftFactory.deploy(zkcsc.target); // 如果有构造函数参数，请添加
        await tpftdvp.waitForDeployment();
        console.log("TPFt DVP deployed at:", tpftdvp.target);
    });
});

describe("TPFtDVP Contract", function () {
    let tpftDVP,simpleTPFt, zkcsc;
    let minterMeta, spenderMeta, to1Meta;
    let tpftTokenId;

    const TPFtAddress = "0xbF25D531990314063424dBf353F47a9754A874f5";
    const scAddress = config.contracts.PrivateERCToken;
    const zkcscAddress = "0x32ae842BdF1dfdc5341d5b369986F84E2d4Fc334";
    const TPFtDVPAddress = "0x6F98c597dC623c6d46afF283122CB4D405eC3363";

    before(async () => {
        minterMeta = await createAuthMetadata(accounts.MinterKey)
        spenderMeta = await createAuthMetadata(accounts.Spender1Key)
        to1Meta = await createAuthMetadata(accounts.To1PrivateKey);

        tpftDVP = await ethers.getContractAt("TPFtDVP", TPFtDVPAddress);
        simpleTPFt = await ethers.getContractAt("SimpleTPFt", TPFtAddress);
        zkcsc = await ethers.getContractAt("ZKCSC", zkcscAddress);

    });

    beforeEach(async () => {
        preBalance = {
            minter: await getTokenBalanceByAdmin(accounts.Minter,scAddress),
            user: await getTokenBalanceByAdmin(accounts.To1,scAddress)
        }
    });

    it('Step1: Mint PrivateToken to user ',async () => {
        await DirectMint(accounts.To1,config.contracts.PrivateERCToken,100);
        const postBalance = await getTokenBalanceByAdmin(accounts.To1,scAddress)
        expect(postBalance).equal(preBalance.user + 100)
    });
    it('Step2: Mint TPFt token to minter ',async () => {
        tpftTokenId = await simpleTPFt.mint
    });


});
