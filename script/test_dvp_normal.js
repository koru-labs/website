const hre = require("hardhat");
const {ethers} = hre;
const p = require('poseidon-lite');
const crypto = require("crypto");
const assert = require('assert');
const {Wallet} = require("ethers");
const chai = require("chai");
const expect = chai.expect;
const hardhatConfig = require('../hardhat.config');


//token contract address
const drex = "0xAa54f4B933177556eAA713740a1DE6A8487E05ed";
const dvtA = "0xbc2BE65EF422999c6218C766e90831DDB483d43B";
const dvtB = "0xac07D22807D759246e7402DF60964cBC915d6A64";

const drexEscrotingAddress = "0xF4435Fb054E1f69f102C1601bD8aE9836f88815A";
const dvtAEscortingAddress = "0x02f7aC504d940bb1f8C84724502745c787d6BaFa";
const dvtBEscortingAddress = "0x80245F9D2e2950b028c53A4Bd1851045ff2F53d3";

const bankA = hardhatConfig.networks.serverL2_2.accounts[0];
const bankB = hardhatConfig.networks.serverL2_2.accounts[1];
const client1 = hardhatConfig.networks.serverL2_2.accounts[2];
const client2 = hardhatConfig.networks.serverL2_2.accounts[3];
const client3 = hardhatConfig.networks.serverL2_2.accounts[4];
const adminPrivateKey = hardhatConfig.networks.serverL2_1.accounts[0];
const l1AdminPrivateKey = hardhatConfig.networks.serverL2_1.accounts[1];

//node rpc url
//node rpc url
const L1Url = hardhatConfig.networks.serverBesu.url;
const centralBankRpcUrl = hardhatConfig.networks.serverL2_1.url;
const bankARpcUrl = hardhatConfig.networks.serverL2_2.url;
const bankBRpcUrl = hardhatConfig.networks.serverL2_3.url;
console.log("L1.url:", L1Url)
console.log("server_L2_1.url:", centralBankRpcUrl)
console.log("server_L2_2.url:", bankARpcUrl)
console.log("server_L2_3.url:", bankBRpcUrl)
// const bankARpcUrl = hardhatConfig.networks.serverL2_2.url;
// const bankBRpcUrl = hardhatConfig.networks.serverL2_3.url;

const customNetwork = {
    name: "HAMSA",
    chainId: 1001
};
const l1CustomNetwork = {
    name: "besu",
    chainId: 1337
};
const options = {
    batchMaxCount: 1,
    staticNetwork: true
};


// provider
const centralBankProvider = new ethers.JsonRpcProvider(L1Url, l1CustomNetwork, options);
const bankAProvider = new ethers.JsonRpcProvider(bankARpcUrl, customNetwork, options);
const bankBProvider = new ethers.JsonRpcProvider(bankBRpcUrl, customNetwork, options);
const L1Provider = new ethers.JsonRpcProvider(L1Url,l1CustomNetwork,options);

const userAWallet = new ethers.Wallet(client1, bankAProvider);
const userBWallet = new ethers.Wallet(client2, bankBProvider);
const userCWallet = new ethers.Wallet(client3, bankAProvider);
// const adminWallet = new ethers.Wallet(adminPrivateKey, centralBankProvider);
const l1AdminWallet = new ethers.Wallet(l1AdminPrivateKey, L1Provider);

const bankAWalletOfDvtA = new ethers.Wallet(bankA, bankAProvider);
const bankAWalletOfDvtB = new ethers.Wallet(bankA, bankBProvider);
const bankBWalletOfDvtA = new ethers.Wallet(bankB, bankAProvider);
const bankBWalletOfDvtB = new ethers.Wallet(bankB, bankBProvider);
const bankAWalletOfCBDC = new ethers.Wallet(bankA, centralBankProvider);
const bankBWalletOfCBDC = new ethers.Wallet(bankB, centralBankProvider);
const adminWallet = new ethers.Wallet(adminPrivateKey, centralBankProvider)

let HamsaTokenFactory, DvpEscrowFactory;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function mintToken(provider, tokenAddress, userWallet, amount) {
    HamsaTokenFactory = await ethers.getContractFactory("HamsaToken")
    let HamsaToken = await HamsaTokenFactory.attach(tokenAddress).connect(userWallet);
    const tx = await HamsaToken.mint(userWallet.address, amount);
    await tx.wait();
}

async function getTokenBalance(provider, tokenAddress, account) {
    HamsaTokenFactory = await ethers.getContractFactory("HamsaToken")
    let HamsaToken = await HamsaTokenFactory.attach(tokenAddress).connect(provider);
    let balance = await HamsaToken.balanceOf(account);
    return balance;
}

async function getCDBCBalance() {
    const bankABalance = await getTokenBalance(centralBankProvider, drex, bankAWalletOfCBDC.address);
    const bankBBalance = await getTokenBalance(centralBankProvider, drex, bankBWalletOfCBDC.address);
    console.log("bankA centralBank balance is ", bankABalance);
    console.log("bankB centralBank balance is ", bankBBalance);
    // return {bankABalance,bankBBalance}

}

async function getBundleTransaction(bundleHash, bankProvider) {
    let BundleTransaction = await bankProvider.send("eth_checkTransactionBundle", [bundleHash]);
    console.log("BundleTransaction", BundleTransaction);
}

async function checkBundleTransaction(bundleHash, bankProvider) {
    let BundleTransaction = await bankProvider.send("eth_checkTransactionBundle", [bundleHash]);
    console.log("BundleTransaction", BundleTransaction);
    let status = BundleTransaction.Status;
    while (status !== 2) {
        // console.log("bundle status is not 2, continue fetch status, current status is : ", status);
        await sleep(2000);
        BundleTransaction = await bankProvider.send("eth_checkTransactionBundle", [bundleHash]);
        console.log("BundleTransaction", BundleTransaction);
        status = BundleTransaction.Status;
    }
}
async function checkTransactionStatus(bundleHash,wallet,escortingAddress){
    const DvpEscrow = await ethers.getContractFactory("DvpEscrow");
    const dvpEscrow = await DvpEscrow.attach(escortingAddress).connect(wallet);
    let slot  = await dvpEscrow.Transactions(bundleHash)

    console.log("slot: ", slot)
}
async function transferEth(provider, privateKey, fromAddress, toAddress, amount) {
    const wallet = new ethers.Wallet(privateKey, provider);
    if (wallet.address.toLowerCase() !== fromAddress.toLowerCase()) {
        throw new Error('Wallet address does not match the provided fromAddress.');
    }

    const amountInWei = ethers.parseEther(amount.toString());
    const transaction = {
        to: toAddress,
        value: amountInWei,
    };
    try {
        const response = await wallet.sendTransaction(transaction);
        console.log(`Transaction hash: ${response.hash}`);
        return response;
    } catch (error) {
        console.error('Error sending transaction:', error);
        throw error;
    }
}

async function checkTokenBalance(provider, tokenAddress, accountWallet, amount) {
    let balance = await getTokenBalance(provider, tokenAddress, accountWallet.address)
    if (balance >= amount) {
        console.log("user token balance is enough for the transaction")
    } else {
        await mintToken(provider, tokenAddress, accountWallet, amount)
        console.log("after minted, user token balance is ", await getTokenBalance(provider, tokenAddress, accountWallet.address))
    }
}

async function scheduleTransfer(fromWallet,fromTokenAddress,fromDvpAddress,toAddress,amount,index,chunkHash,bundleHash){
    const TokenFactory = await ethers.getContractFactory("HamsaToken");
    const DvpEscrowFactory = await ethers.getContractFactory("DvpEscrow");

    let Token = await TokenFactory.attach(fromTokenAddress).connect(fromWallet)
    // approve amount to dvp
    let tx = await Token.approve(fromDvpAddress,amount)
    await tx.wait()
    // scheduleRequset
    let expire=Math.floor(Date.now() / 1000) + 60*20
    let schduleRequest= {
        tokenAddress: fromTokenAddress,
        to: toAddress,
        tokenType: 0,
        amount:amount,
        index:index,
        chunkHash: chunkHash,
        bundleHash: bundleHash,
        expireTime:expire
    }
    // dvp scheduleTransfer
    const dvpEscrow = await DvpEscrowFactory.attach(fromDvpAddress).connect(fromWallet);
    tx = await dvpEscrow.scheduleTransfer(schduleRequest);
    await tx.wait();
    console.log(tx.hash)
}

async function scheduleMint(fromWallet,fromTokenAddress,fromDvpAddress,amount,index,chunkHash,bundleHash){
    const TokenFactory = await ethers.getContractFactory("HamsaToken");
    const DvpEscrowFactory = await ethers.getContractFactory("DvpEscrow");

    let Token = await TokenFactory.attach(fromTokenAddress).connect(fromWallet)
    // scheduleRequset
    let expire=Math.floor(Date.now() / 1000) + 60*20
    let schduleRequest= {
        tokenAddress: fromTokenAddress,
        to: fromWallet.address,
        tokenType: 0,
        amount:amount,
        index:index,
        chunkHash: chunkHash,
        bundleHash: bundleHash,
        expireTime:expire
    }
    // dvp scheduleMint
    const dvpEscrow = await DvpEscrowFactory.attach(fromDvpAddress).connect(fromWallet);
    tx = await dvpEscrow.scheduleMint(schduleRequest);
    await tx.wait();
    console.log(tx.hash)
}
async function scheduleBurn(fromWallet,fromTokenAddress,fromDvpAddress,amount,index,chunkHash,bundleHash){
    const TokenFactory = await ethers.getContractFactory("HamsaToken");
    const DvpEscrowFactory = await ethers.getContractFactory("DvpEscrow");

    let Token = await TokenFactory.attach(fromTokenAddress).connect(fromWallet)
    // approve amount to dvp
    let tx = await Token.approve(fromDvpAddress,amount)
    await tx.wait()
    // scheduleRequset
    let expire=Math.floor(Date.now() / 1000) + 60*20
    let schduleRequest= {
        tokenAddress: fromTokenAddress,
        to: ethers.ZeroAddress,
        tokenType: 0,
        amount:amount,
        index:index,
        chunkHash: chunkHash,
        bundleHash: bundleHash,
        expireTime:expire
    }
    // dvp scheduleBurn
    const dvpEscrow = await DvpEscrowFactory.attach(fromDvpAddress).connect(fromWallet);
    tx = await dvpEscrow.scheduleBurn(schduleRequest);
    await tx.wait();
    console.log(tx.hash)
}

async function createTpft(tpftAddress,tpftData,minterInfo) {
    const simpleTPFtFactory = await ethers.getContractFactory("SimpleTPFt");
    const simpleTPFt = simpleTPFtFactory.attach(tpftAddress).connect(minterInfo.wallet);
    let tx = await simpleTPFt.createTPFt(tpftData);
    await tx.wait()
    const id = await simpleTPFt.getTPFtId(tpftData);
    console.log("tpft id", id);
    return id
}

async function mintTpft(tpftAddress,tpftData,minterInfo,sellerInfo,amount) {
    const simpleTPFtFactory = await ethers.getContractFactory("SimpleTPFt");
    const simpleTPFt = simpleTPFtFactory.attach(tpftAddress).connect(minterInfo.wallet);
    const id = await simpleTPFt.getTPFtId(tpftData);
    console.log("tpft id", id);
    let tx = await simpleTPFt.mint(sellerInfo.address, tpftData, amount);
    await tx.wait()
    const balance = await simpleTPFt.balanceOf(sellerInfo.address, id);
    console.log("balance", balance);
}
async function tpftBalance(tpftAddress,tpftData,minterInfo,userAddress) {
    const simpleTPFtFactory = await ethers.getContractFactory("SimpleTPFt");
    const simpleTPFt = simpleTPFtFactory.attach(tpftAddress).connect(minterInfo.wallet);
    const id = await simpleTPFt.getTPFtId(tpftData);
    const balance = await simpleTPFt.balanceOf(userAddress, id);
    return balance
}
async function scheduleTransferTPFt(tpftAddress,tpftData,amount,sellerInfo,buyerAddress,index,chunkHash,bundleHash){
    const simpleTPFtFactory = await ethers.getContractFactory("SimpleTPFt");
    const simpleTPFt = simpleTPFtFactory.attach(tpftAddress).connect(sellerInfo.wallet);
    const tokenId = await simpleTPFt.getTPFtId(tpftData);
    const expire = Math.floor(Date.now() / 1000) + 60 * 30;
    let tx = await simpleTPFt.setApprovalForAll(sellerInfo.dvpEscorting, true);
    await tx.wait()
    const isApproved = await simpleTPFt.isApprovedForAll(sellerInfo.address, sellerInfo.dvpEscorting);
    console.log("isApproved", isApproved);
    let balance = await simpleTPFt.balanceOf(sellerInfo.address, tokenId);
    console.log("seller pre balance", balance);
    const scheduleRequest = {
        tokenAddress: tpftAddress,
        to: buyerAddress,
        tokenType: tokenId,
        amount: amount,
        index: index,
        chunkHash: chunkHash,
        bundleHash: bundleHash,
        expireTime: expire
    }
    console.log(scheduleRequest)
    const DvpEscrowFactory = await ethers.getContractFactory("DvpEscrow");
    const dvpEscrow = DvpEscrowFactory.attach(sellerInfo.dvpEscorting).connect(sellerInfo.wallet);
    tx = await dvpEscrow.scheduleTransfer1155(scheduleRequest);
    await tx.wait()
    balance = await simpleTPFt.balanceOf(sellerInfo.address, tokenId);
    console.log("seller post balance", balance);
    console.log("scheduleTransfer1155 hash", tx.hash);
}

describe("Test Eth", function () {
    this.timeout(120000)
    it('check account eth', async () => {
        console.log("eth is ", await centralBankProvider.getBalance(bankAWalletOfCBDC.address))
        console.log("userA eth is ", await bankBProvider.getBalance(userBWallet.address))
    });
    it.skip('send eth to account on node2', async () => {
        let toAddress = client1Address
        console.log("account eth before ", await bankAProvider.getBalance(toAddress))
        let sendPrivate = client1PrivateKey;
        let senderAddress = client1Address;
        let amount = 1;
        let tx = await transferEth(bankAProvider, sendPrivate, senderAddress, toAddress, amount)
        await tx.wait();
        console.log("account eth after ", await bankAProvider.getBalance(toAddress))
    });
    it.skip('send eth to account on node3', async () => {
        let toAddress = "0x173e9c0FCad1c3628Bb177299053a71BF5ec1E66"
        console.log("account eth before ", await bankBProvider.getBalance(toAddress))
        let sendPrivate = client1PrivateKey;
        let senderAddress = client1Address;
        let amount = 1;
        let tx = await transferEth(bankBProvider, sendPrivate, senderAddress, toAddress, amount)
        await tx.wait();
        console.log("account eth after ", await bankBProvider.getBalance(toAddress))
    });
    it('send eth to account on node1', async () => {
        let toAddress = bankAWalletOfCBDC.address
        console.log("account eth before ", await centralBankProvider.getBalance(toAddress))
        let sendPrivate = adminPrivateKey;
        let senderAddress = adminWallet.address;
        let amount = 1;
        let tx = await transferEth(centralBankProvider, sendPrivate, senderAddress, toAddress, amount)
        await tx.wait();
        console.log("account eth after ", await centralBankProvider.getBalance(toAddress))
    });

})

describe("Test Check BundleHash", function () {
    this.timeout(120000);
    it("node2", async () => {
        // let bundleHash = '0x24878e048b4cb7a70cfc0271ea9004e4f832d781eb095d7d5c64474339c5c9d2';
        const bundleHash = '0x2782376261bcbc48722712da254eb9579c0fad8cca80e7a892877f97257ff6d4';
        // let bundleHash = '0x16e06156a60017743124872ac04eb7f33f3d8c02e0d65b94e88ca978bd058556';
        let BundleTransaction = await bankAProvider.send("eth_checkTransactionBundle", [bundleHash]);
        // await checkBundleTransaction(bundleHash,bankAProvider)
        // let BundleTransaction = await bankAProvider.send("eth_getTransactionByHash", [bundleHash,false]);
        console.log("BundleTransaction", BundleTransaction);
    })
    it("node2", async () => {
        let bundleHash = '0x1e39745e4679a0f09ba78d43ad8c60fa02cdd240acda75cdb7afe6b6c6fbf3b9';
        // let bundleHash = '0x16e06156a60017743124872ac04eb7f33f3d8c02e0d65b94e88ca978bd058556';
        let slot = await checkTransactionStatus(bundleHash,userAWallet,dvtAEscortingAddress)
        console.log("slot is ", slot);
    })
    it("node3", async () => {
        // let bundleHash = '0x1e39745e4679a0f09ba78d43ad8c60fa02cdd240acda75cdb7afe6b6c6fbf3b9';
        let bundleHash = '0x1616bdf4b604e6adc8c3007633f6e602ae9703db3880f8fb068359ffc4409c50';
        let slot = await checkTransactionStatus(bundleHash,bankBWalletOfDvtB,dvtBEscortingAddress)
        console.log("slot is ", slot);
    })
    it.skip("node3", async () => {
        // let bundleHash = '0x1e39745e4679a0f09ba78d43ad8c60fa02cdd240acda75cdb7afe6b6c6fbf3b9';
        let bundleHash = '0x1616bdf4b604e6adc8c3007633f6e602ae9703db3880f8fb068359ffc4409c50';
        let BundleTransaction = await bankBProvider.send("eth_checkTransactionBundle",['0x1616bdf4b604e6adc8c3007633f6e602ae9703db3880f8fb068359ffc4409c50'])
        console.log("BundleTransaction is ",BundleTransaction)
    })
})

describe('Test check token balance', function () {
    this.timeout(120000);
    before(async function () {
        HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
    })
    it("check account token balance on bankA", async () => {
        console.log("userA account token balance on bankA is ", await getTokenBalance(bankAProvider, dvtA, userAWallet.address));
        console.log("bankB account token balance on bankA is ", await getTokenBalance(bankAProvider, dvtA, bankBWalletOfDvtA.address));
    })
    it("check account token balance on bankB", async () => {
        console.log("userB account token balance on bankB is ", await getTokenBalance(bankBProvider, dvtB, userBWallet.address));
        console.log("bankA account token balance on bankB is ", await getTokenBalance(bankBProvider, dvtB, bankBWalletOfDvtB.address));
    })
    it("check account token balance on centralBank", async () => {
        console.log("bankA account token balance on centralBank is ", await getTokenBalance(centralBankProvider, drex, bankAWalletOfCBDC.address));
        console.log("bankB account token balance on centralBank is ", await getTokenBalance(centralBankProvider, drex, bankBWalletOfCBDC.address));
    })
})

describe('Test mint token on L2 node', function () {
    this.timeout(120000);
    before(async function () {
        HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
    })
    it("mint tokens to user and bank accounts on bankA node", async () => {
        const amount = 20000;
        console.log("------------ start to mint dvtA to userA ------------")
        let tokenBefore = await getTokenBalance(bankAProvider, dvtA, userAWallet.address);
        console.log("userA token balance before mint is : ", tokenBefore);
        await mintToken(bankAProvider, dvtA, userAWallet, amount);
        let tokenAfter = await getTokenBalance(bankAProvider, dvtA, userAWallet.address);
        console.log("user dvtA token balance after mint is : ", tokenAfter);
        let increase = parseInt(tokenAfter.toString()) - parseInt(tokenBefore.toString());
        assert.strictEqual(increase, amount, 'Mint operation failed. Token balance increase is not as expected.');
        console.log("------------ start to mint dvtA to bankA ------------")
        tokenBefore = await getTokenBalance(bankAProvider, dvtA, bankAWalletOfDvtA.address);
        console.log("bankA dvtA token balance before mint is : ", tokenBefore);
        await mintToken(bankAProvider, dvtA, bankAWalletOfDvtA, amount);
        tokenAfter = await getTokenBalance(bankAProvider, dvtA, bankAWalletOfDvtA.address);
        console.log("bankA dvtA balance after mint is : ", tokenAfter);
        increase = parseInt(tokenAfter.toString()) - parseInt(tokenBefore.toString());
        assert.strictEqual(increase, amount, 'Mint operation failed. Token balance increase is not as expected.');
    })

    it("mint tokens to user and bank accounts on bankB node", async () => {
        const amount = 20000;
        console.log("------------ start to mint dvtB to userB ------------")
        tokenBefore = await getTokenBalance(bankBProvider, dvtB, userBWallet.address);
        console.log("bankA dvtA token balance before mint is : ", tokenBefore);
        await mintToken(bankBProvider, dvtB, userBWallet, amount);
        tokenAfter = await getTokenBalance(bankBProvider, dvtB, userBWallet.address);
        console.log("bankA dvtA balance after mint is : ", tokenAfter);
        increase = parseInt(tokenAfter.toString()) - parseInt(tokenBefore.toString());
        assert.strictEqual(increase, amount, 'Mint operation failed. Token balance increase is not as expected.');
        console.log("------------ start to mint dvtB to bankB address ------------")
        tokenBefore = await getTokenBalance(bankBProvider, dvtB, bankBWalletOfDvtB.address);
        console.log("bank account token balance before mint is : ", tokenBefore);
        await mintToken(bankBProvider, dvtB, bankBWalletOfDvtB, amount);
        tokenAfter = await getTokenBalance(bankBProvider, dvtB, bankBWalletOfDvtB.address);
        console.log("bank account  balance after mint is : ", tokenAfter);
        increase = parseInt(tokenAfter.toString()) - parseInt(tokenBefore.toString());
        assert.strictEqual(increase, amount, 'Mint operation failed. Token balance increase is not as expected.');
    })
    it("mint tokens to bank accounts on centralBank node", async () => {
        const amount = 20000;
        console.log("------------ start to mint Drex to bankA address ------------")
        let tokenBefore = await getTokenBalance(centralBankProvider, drex, bankAWalletOfCBDC.address);
        console.log("bank account token balance before mint is : ", tokenBefore);
        await mintToken(centralBankProvider, drex, bankAWalletOfCBDC, amount);
        let tokenAfter = await getTokenBalance(centralBankProvider, drex, bankAWalletOfCBDC.address);
        console.log("bank account  balance after mint is : ", tokenAfter);
        let increase = parseInt(tokenAfter.toString()) - parseInt(tokenBefore.toString());
        assert.strictEqual(increase, amount, 'Mint operation failed. Token balance increase is not as expected.');
        console.log("------------ start to mint Drex to bankB address ------------")
        tokenBefore = await getTokenBalance(centralBankProvider, drex, bankBWalletOfCBDC.address);
        console.log("bank account token balance before mint is : ", tokenBefore);
        await mintToken(centralBankProvider, drex, bankBWalletOfCBDC, amount);
        tokenAfter = await getTokenBalance(centralBankProvider, drex, bankBWalletOfCBDC.address);
        console.log("bank account  balance after mint is : ", tokenAfter);
        increase = parseInt(tokenAfter.toString()) - parseInt(tokenBefore.toString());
        assert.strictEqual(increase, amount, 'Mint operation failed. Token balance increase is not as expected.');
    })
})

describe('Test internal transfer within a bank ', function () {
    this.timeout(120000);
    before(async function () {
        HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
    })
    it("userA internal transfer to userC in bankA", async () => {
        const amount = 100n;
        const token = HamsaTokenFactory.attach(dvtA).connect(userAWallet);
        let tokenBeforeA = await getTokenBalance(bankAProvider, dvtA, userAWallet.address);
        let tokenBeforeC = await getTokenBalance(bankAProvider, dvtA, userCWallet.address);
        //internal transfer
        let tx = await token.transfer(userCWallet.address, amount);
        await tx.wait()
        // assertion
        let tokenAfterA = await getTokenBalance(bankAProvider, dvtA, userAWallet.address);
        let tokenAfterC = await getTokenBalance(bankAProvider, dvtA, userCWallet.address);

        expect(tokenAfterC - tokenBeforeC).equal(amount, 'After tranfer, recevier token balance should increase');
        expect(tokenBeforeA - tokenAfterA).equal(amount, 'After tranfer, sender token balance should increase');
    })
})

describe('Test L2 node cross bank transfer', function () {
    // Set a timeout of 1200000 milliseconds for this testsuit
    this.timeout(1200000);
    let chunkHash1, chunkHash2, chunkHash3, bundleHash;
    before(async function () {
        //Get the contract factories for HamsaToken and DvpEscrow before running the tests.
        HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
        DvpEscrowFactory = await ethers.getContractFactory("DvpEscrow");
        await checkTokenBalance(bankAProvider, dvtA, userAWallet, 1000)
        // await checkTokenBalance(bankBProvider, dvtB, bankBWalletOfDvtB, 1000)
        // await checkTokenBalance(centralBankProvider, drex, adminWallet, 1000)
    })
    beforeEach(async function () {
        // Generate random chunk hashes and calculate a bundle hash before each test.
        chunkHash1 = "0x" + crypto.randomBytes(32).toString("hex");
        chunkHash2 = "0x" + crypto.randomBytes(32).toString("hex");
        chunkHash3 = 0;
        bundleHash ="0x" + p.poseidon3([chunkHash1, chunkHash2, chunkHash3]).toString(16).padStart(64,"0");
    });

    it("scheduleTransfer between node2 and node3",async ()=>{
        console.log("hash is ", {chunkHash1, chunkHash2, bundleHash})
        console.log("start to scheduleTransfer in node2")
        const amount = 100;
        // await scheduleTransfer(userAWallet,dvtA,dvtAEscortingAddress,bankBWalletOfDvtA.address,amount,0,chunkHash1,bundleHash)
        console.log("start to scheduleTransfer in node3")
        await scheduleTransfer(bankBWalletOfDvtB,dvtB,dvtBEscortingAddress,userBWallet.address,amount,1,chunkHash2,bundleHash)
        await checkTransactionStatus(bundleHash,bankBWalletOfDvtB,dvtBEscortingAddress)
    })

    it("scheduleTransfer between node1 and node2",async ()=>{
        console.log("hash is ", {chunkHash1, chunkHash2, bundleHash: bundleHash})
        console.log("start to scheduleTransfer in node1")
        const amount = 100;
        await scheduleTransfer(adminWallet,drex,drexEscrotingAddress,bankAWalletOfCBDC.address,amount,0,chunkHash1,bundleHash)
        console.log("start to scheduleTransfer in node2")
        await scheduleTransfer(userAWallet,dvtA,dvtAEscortingAddress,bankBWalletOfDvtA.address,amount,1,chunkHash2,bundleHash)
        await checkTransactionStatus(bundleHash,userAWallet,dvtAEscortingAddress)
    })

    it("scheduleTransfer between node1 and node3",async ()=>{
        console.log("hash is ", {chunkHash1, chunkHash2, bundleHash: bundleHash})
        console.log("start to scheduleTransfer in node1")
        const amount = 100;
        await scheduleTransfer(adminWallet,drex,drexEscrotingAddress,bankBWalletOfCBDC.address,amount,0,chunkHash1,bundleHash)
        console.log("start to scheduleTransfer in node3")
        await scheduleTransfer(bankBWalletOfDvtB,dvtB,dvtBEscortingAddress,userBWallet.address,amount,1,chunkHash2,bundleHash)
        await checkTransactionStatus(bundleHash,bankBWalletOfDvtB,dvtBEscortingAddress)
    })
})
describe('Test L2 node cross bank settlement', function () {
    // Set a timeout of 1200000 milliseconds for this testsuit
    this.timeout(1200000);
    let chunkHash1, chunkHash2, chunkHash3, bundleHash;
    before(async function () {
        //Get the contract factories for HamsaToken and DvpEscrow before running the tests.
        await checkTokenBalance(bankAProvider, dvtA, bankBWalletOfDvtA, 1000);
        await checkTokenBalance(bankBProvider, dvtB, bankAWalletOfDvtB, 1000);
    })
    const amount = 10n;
    beforeEach(async function () {
        // Generate random chunk hashes and calculate a bundle hash before each test.
        chunkHash1 = "0x" + crypto.randomBytes(32).toString("hex");
        chunkHash2 = "0x" + crypto.randomBytes(32).toString("hex");
        chunkHash3 = 0;
        bundleHash ="0x" + p.poseidon3([chunkHash1, chunkHash2, chunkHash3]).toString(16).padStart(64,"0");
    })
    it("scheduleMint and schenduleBurn between node1 and node2",async ()=>{
        //schenduleBurn dvtA in node2
        console.log("hash is ", {chunkHash1, chunkHash2, bundleHash})
        console.log("start to scheduleBurn in node2")
        const amount = 100;
        await scheduleBurn(bankBWalletOfDvtA,dvtA,dvtAEscortingAddress,amount,0,chunkHash1,bundleHash)
        //scheduleMint drex in centralbank
        console.log("start to scheduleMint in node1")
        await scheduleMint(bankBWalletOfCBDC,drex,drexEscrotingAddress,amount,1,chunkHash2,bundleHash)
        await checkTransactionStatus(bundleHash,bankBWalletOfCBDC,drexEscrotingAddress)
    })
    it("scheduleMint and schenduleBurn between node1 and node3",async ()=>{
        //schenduleBurn dvtA in node3
        console.log("hash is ", {chunkHash1, chunkHash2, bundleHash})
        console.log("start to scheduleBurn in node3")
        const amount = 100;
        await scheduleBurn(bankAWalletOfDvtB,dvtB,dvtBEscortingAddress,amount,0,chunkHash1,bundleHash)
        //scheduleMint drex in centralbank
        console.log("start to scheduleMint in node1")
        await scheduleMint(bankAWalletOfCBDC,drex,drexEscrotingAddress,amount,1,chunkHash2,bundleHash)
        await checkTransactionStatus(bundleHash,bankAWalletOfCBDC,drexEscrotingAddress)
    })
    it("scheduleMint and schenduleBurn between node2 and node3",async ()=>{
        //schenduleBurn dvtA in node2
        console.log("hash is ", {chunkHash1, chunkHash2, bundleHash})
        console.log("start to scheduleBurn in node2")
        const amount = 100;
        await scheduleBurn(bankBWalletOfDvtA,dvtA,dvtAEscortingAddress,amount,0,chunkHash1,bundleHash)
        //scheduleMint drex in centralbank
        console.log("start to scheduleMint in node3")
        await scheduleMint(bankBWalletOfDvtB,dvtB,dvtBEscortingAddress,amount,1,chunkHash2,bundleHash)
        await checkTransactionStatus(bundleHash,bankBWalletOfDvtB,dvtBEscortingAddress)
    })
})

describe.only('Test scheduleTransfer and scheduleTransfer1155', function () {
    // Set a timeout of 1200000 milliseconds for this testsuit
    this.timeout(1200000);
    let chunkHash1, chunkHash2, chunkHash3, bundleHash;
    let amount = 100;
    let tpftID,TPFtFactory
    // const tpftAddress = '0xaB219e1E2f6b1Bdf64A3EaD9dc20cC50C376DcA8'
    let tpftAddress
    const minterInfo = {
        "wallet": bankAWalletOfDvtA,
        "dvpEscorting":dvtAEscortingAddress
    }
    const sellerInfo = {
        "wallet":bankAWalletOfDvtA,
        "dvpEscorting":dvtAEscortingAddress,
        "address":bankAWalletOfDvtA.address
    }
    const tpftData = {
        "acronym": "LTN",
        "code": "1001",
        "maturityDate": 1755734400
    }

    before(async function () {
        //Get the contract factories for HamsaToken and DvpEscrow before running the tests.
        HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
        DvpEscrowFactory = await ethers.getContractFactory("DvpEscrow");
        TPFtFactory = await ethers.getContractFactory("SimpleTPFt");
        // await checkTokenBalance(bankAProvider, dvtA, userAWallet, amount)
        // await checkTokenBalance(bankBProvider, dvtB, bankBWalletOfDvtB, amount)

    })
    beforeEach(async function () {
        // Generate random chunk hashes and calculate a bundle hash before each test.
        chunkHash1 = "0x" + crypto.randomBytes(32).toString("hex");
        chunkHash2 = "0x" + crypto.randomBytes(32).toString("hex");
        chunkHash3 = 0;
        bundleHash ="0x" + p.poseidon3([chunkHash1, chunkHash2, chunkHash3]).toString(16).padStart(64,"0");
    });
    it("deploy 1155 ",async ()=>{
        console.log("-----------start to deploy TPFt-------")
        const SimpleTPFt = await TPFtFactory.connect(minterInfo.wallet).deploy();
        await SimpleTPFt.waitForDeployment();
        console.log("SimpleTPFt address", SimpleTPFt.target);
        tpftAddress = SimpleTPFt.target
    })
    it("create TPFt ",async ()=>{
        console.log("-----------start to create TPFt-------")
        tpftID= await createTpft(tpftAddress,tpftData,minterInfo)
    })
    it('mint TPFt to seller ',async () => {
        console.log("-----------start to mint TPFt-------")
        await mintTpft(tpftAddress,tpftData,minterInfo,sellerInfo,1000)
    });
    it('TPFt and dvt DVP on node2 and node3 ',async () => {
        console.log("-----------start to dvp transfer TPFt-------")
        console.log("hash is ", {chunkHash1, chunkHash2, bundleHash})
        const buyerAddress = userBWallet.address
        console.log("seller pre balance is ",await tpftBalance(tpftAddress,tpftData,minterInfo,sellerInfo.address))
        console.log("buyer pre balance is ",await tpftBalance(tpftAddress,tpftData,minterInfo,buyerAddress))
        // scheduleTransfer1155 on node2
        await scheduleTransferTPFt(tpftAddress,tpftData,amount,sellerInfo,buyerAddress,0,chunkHash1,bundleHash)
        // scheduleTranfer dvt on node3
        await scheduleTransfer(bankBWalletOfDvtB,dvtB,dvtBEscortingAddress,adminWallet.address,amount,1,chunkHash2,bundleHash)
        // console.log("after transfer, userB tpft balance is ",await tpftBalance(tpftAddress,tpftData,userBWallet.address))
        console.log("seller post balance is ",await tpftBalance(tpftAddress,tpftData,minterInfo,sellerInfo.address))
        console.log("buyer post balance is ",await tpftBalance(tpftAddress,tpftData,minterInfo,buyerAddress))
        console.log("-----------end to dvp transfer TPFt-------")
        await checkTransactionStatus(bundleHash,sellerInfo.wallet,sellerInfo.dvpEscorting)
        await checkTransactionStatus(bundleHash,bankBWalletOfDvtB,dvtBEscortingAddress)

    });


})
