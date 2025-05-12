const hre = require("hardhat");
const {ethers} = hre;
const p = require('poseidon-lite');
const crypto = require("crypto");
const assert = require('assert');
const hardhatConfig = require('../hardhat.config');

//token contract address
const drex = "0xF9B60A7122B6afd560A2F9a8d71063798a25e67d";
const dvtA = "0xBA5f71671bd4ED783E0482f3Da1FfF1E96DB5f2B";
const dvtB = "0xf970B83b43781b89202F31362A866EB2Adca2fEC";

const drexEscrotingAddress = "0x993120Ffa250CF1879880D440cff0176752c17C2";
const dvtAEscortingAddress = "0x993120Ffa250CF1879880D440cff0176752c17C2";
const dvtBEscortingAddress = "0x993120Ffa250CF1879880D440cff0176752c17C2";

const bankA = hardhatConfig.networks.serverL2_1.accounts[1];
const bankB = hardhatConfig.networks.serverL2_1.accounts[2];
const client1 = hardhatConfig.networks.serverL2_1.accounts[3];
const client2 = hardhatConfig.networks.serverL2_1.accounts[4];

//node rpc url
const centralBankRpcUrl = hardhatConfig.networks.serverL2_1.url;
const bankARpcUrl = hardhatConfig.networks.serverL2_2.url;
const bankBRpcUrl = hardhatConfig.networks.serverL2_3.url;

const customNetwork = {
    name: "UCL",
    chainId: 1001
};

const options = {
    batchMaxCount: 1,
    staticNetwork: true
};

// provider
const centralBankProvider = new ethers.JsonRpcProvider(centralBankRpcUrl, customNetwork, options);
const bankAProvider = new ethers.JsonRpcProvider(bankARpcUrl, customNetwork, options);
const bankBProvider = new ethers.JsonRpcProvider(bankBRpcUrl, customNetwork, options);

//wallet
const userAWallet = new ethers.Wallet(client1,bankAProvider);
const userBWallet = new ethers.Wallet(client2,bankBProvider);
const bankBWalletOfDvtA = new ethers.Wallet(bankB,bankAProvider);
const bankBWalletOfDvtB = new ethers.Wallet(bankB,bankBProvider);
const bankBWalletOfDrex = new ethers.Wallet(bankB,centralBankProvider);
const bankAWalletOfDvtA = new ethers.Wallet(bankA,bankAProvider);
const bankAWalletOfDvtB = new ethers.Wallet(bankA,bankBProvider);
const bankAWalletOfDrex = new ethers.Wallet(bankA,centralBankProvider);

let HamsaTokenFactory,DvpEscortingFactory;

async function mintToken(provider,tokenAddress,userWallet,amount){
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

async function scheduleL2Transfer(tokenAddress,escorting,escortingAddress, uclWallet,targetAddress, nonce, chunkHash, bundleHash,expire,index) {
    const scheduleRequest = {
        tokenAddress: tokenAddress,
        to: targetAddress,
        tokenType: 0,
        amount: 1,
        index: index,
        chunkHash: chunkHash,
        bundleHash: bundleHash,
        expireTime: expire
    }
    const data = await escorting.interface.encodeFunctionData("scheduleTransfer",
        [scheduleRequest])

    return uclWallet.sendTransaction({
        type:0,
        to: escortingAddress,
        nonce: nonce,
        value: 0,
        gasLimit: 700000,
        gasPrice : 1000,
        data: data
    })
}



async function scheduleL2Mint(tokenAddress,escorting,escortingAddress, uclWallet,targetAddress, nonce, chunkHash, bundleHash,expire,index) {
    const scheduleRequest = {
        tokenAddress: tokenAddress,
        to: targetAddress,
        tokenType: 0,
        amount: 1,
        index: index,
        chunkHash: chunkHash,
        bundleHash: bundleHash,
        expireTime: expire
    }
    const data = await escorting.interface.encodeFunctionData("scheduleMint",
        [scheduleRequest])

    return uclWallet.sendTransaction({
        type:0,
        to: escortingAddress,
        nonce: nonce,
        value: 0,
        gasLimit: 700000,
        // maxFeePerGas: ethers.parseUnits('500', 'gwei'),
        // maxPriorityFeePerGas: ethers.parseUnits('200', 'gwei'),
        data: data
    })
}

async function scheduleL2Burn(tokenAddress,escorting,escortingAddress, uclWallet, nonce, chunkHash, bundleHash,expire,index) {
    const scheduleRequest = {
        tokenAddress: tokenAddress,
        to: ethers.ZeroAddress,
        tokenType: 0,
        amount: 1,
        index: index,
        chunkHash: chunkHash,
        bundleHash: bundleHash,
        expireTime: expire
    }
    const data = await escorting.interface.encodeFunctionData("scheduleBurn",
        [scheduleRequest])

    return uclWallet.sendTransaction({
        type:0,
        to: escortingAddress,
        nonce: nonce,
        value: 0,
        gasLimit: 700000,
        gasPrice : 1000,
        data: data
    })
}

async function transferTokenWithNonce(tokenContract,tokenAddress, fromWallet, toAddress, amount, specifiedNonce) {
    const data = tokenContract.interface.encodeFunctionData("transfer", [toAddress, amount]);
    const tx = {
        type: 0,
        to: tokenAddress,
        nonce: specifiedNonce,
        value: 0,
        gasLimit: 700000,
        gasPrice: 1000,
        data: data
    };
    return fromWallet.sendTransaction(tx);
}

async function getEthBalance(provider,account){
    const eth_balance = await centralBankProvider.getBalance(account);
    console.log("eth ",eth_balance)
    return eth_balance
}

describe('Check eth',function (){
    this.timeout(120000);
    it('check eth ',async () => {
        console.log(await getEthBalance(bankAProvider,userAWallet.address));
    });
})

describe('Check token balance ',function (){
    this.timeout(120000);
    it('check token balance ',async () => {
        console.log(await getTokenBalance(bankAProvider,dvtA, userAWallet.address));
    });
})


describe.only('Mint token on L2 node',function (){
    this.timeout(120000);
    let DvtAToken,dvtAEscorting,dvtBEscorting
    before(async function(){
        HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
        DvpEscortingFactory = await ethers.getContractFactory("DvpEscorting");
        DvtAToken = HamsaTokenFactory.attach(dvtA).connect(userAWallet);
        dvtAEscorting = await DvpEscortingFactory.attach(dvtAEscortingAddress).connect(userAWallet);
        dvtBEscorting = await DvpEscortingFactory.attach(dvtBEscortingAddress).connect(bankBWalletOfDvtB);
    })
    it("mint tokens to user and bank accounts on bankA node",async ()=>{
        const amount = 20000;
        console.log("------------ start to mint dvtA to userA ------------")
        let tokenBefore = await getTokenBalance(bankAProvider,dvtA,userAWallet.address);
        console.log("userA token balance before mint is : ",tokenBefore);
        await mintToken(bankAProvider,dvtA,userAWallet,amount);
        let tokenAfter = await getTokenBalance(bankAProvider,dvtA,userAWallet.address);
        console.log("user dvtA token balance after mint is : ",tokenAfter);
        let increase = parseInt(tokenAfter.toString()) - parseInt(tokenBefore.toString());
        assert.strictEqual(increase, amount, 'Mint operation failed. Token balance increase is not as expected.');
    })

    it("mint tokens to bank accounts on bankB node",async ()=>{
        const amount = 20000;
        console.log("------------ start to mint dvtB to bankB address ------------")
        tokenBefore = await getTokenBalance(bankBProvider,dvtB,bankBWalletOfDvtB.address);
        console.log("bank account token balance before mint is : ",tokenBefore);
        await mintToken(bankBProvider,dvtB,bankBWalletOfDvtB,amount);
        tokenAfter = await getTokenBalance(bankBProvider,dvtB,bankBWalletOfDvtB.address);
        console.log("bank account  balance after mint is : ",tokenAfter);
        increase = parseInt(tokenAfter.toString()) - parseInt(tokenBefore.toString());
        assert.strictEqual(increase, amount, 'Mint operation failed. Token balance increase is not as expected.');
    })
})


describe.only('StressTest',function (){
    this.timeout(1200000);
    before(async function(){
        HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
        DvpEscortingFactory = await ethers.getContractFactory("DvpEscrow");
    });
    it('token balance ', async () => {
        console.log("userA token balance is ",await getTokenBalance(bankAProvider,dvtA,userAWallet.address));
        console.log("bankB account dvtA balance is ",await getTokenBalance(bankAProvider,dvtA,bankBWalletOfDvtA.address));
        console.log("userB token balance is ",await getTokenBalance(bankBProvider,dvtB,userBWallet.address));
        console.log("bankB account dvtB balance is ",await getTokenBalance(bankBProvider,dvtB,bankBWalletOfDvtB.address));
    });

    it.only("scheduleTransfer",async ()=>{
        //1. transfer from userA to bankB account on bankA node
        //2, transfer from bankB account to userB on bankB node
        const dvtAToken = HamsaTokenFactory.attach(dvtA).connect(userAWallet);
        const dvtBToken = HamsaTokenFactory.attach(dvtB).connect(bankBWalletOfDvtB);
        const bankAEscroting = await DvpEscortingFactory.attach(dvtAEscortingAddress).connect(userAWallet);
        const bankBEscroting = await DvpEscortingFactory.attach(dvtBEscortingAddress).connect(bankBWalletOfDvtB);
        //approve dvtA
        console.log("userA balance is ",await getTokenBalance(bankAProvider,dvtA,userAWallet.address));
        let txApprove = await dvtAToken.approve(dvtAEscortingAddress,await dvtAToken.balanceOf(userAWallet.address));
        await txApprove.wait();
        //approve dvtB
        console.log("bankB balance is ",await getTokenBalance(bankBProvider,dvtB,bankBWalletOfDvtB.address));
        txApprove = await dvtBToken.approve(dvtBEscortingAddress,await dvtBToken.balanceOf(bankBWalletOfDvtB.address));
        await txApprove.wait();
        // get latest nonce
        let baseNonceA = await bankAProvider.getTransactionCount(userAWallet.address,'latest');
        let baseNonceB = await bankBProvider.getTransactionCount(bankBWalletOfDvtB.address,'latest');
        console.time('TransfersExecutionTime');
        for (let i = 0; i<1;i++){
            //get chunkHash
            let expireTime =Math.floor(Date.now() / 1000) + 60*30;
            console.log("the transaction number ",i)
            chunkHash1 = "0x" + crypto.randomBytes(32).toString("hex");
            chunkHash2 = "0x" + crypto.randomBytes(32).toString("hex");
            chunkHash3 = 0;
            bundleHash = "0x" + p.poseidon3([chunkHash1, chunkHash2,chunkHash3]).toString(16).padStart(64, "0");
            console.log("nonceA is ",baseNonceA+i,"nonceB is ",baseNonceB+i);
            // ScheduleTransfer on node2
            await scheduleL2Transfer(dvtA,bankAEscroting,dvtAEscortingAddress,userAWallet,bankBWalletOfDvtA.address,baseNonceA+i,chunkHash1,bundleHash,expireTime,0);
            // ScheduleTranfer on node3
            await scheduleL2Transfer(dvtB,bankBEscroting,dvtBEscortingAddress,bankBWalletOfDvtB,userBWallet.address,baseNonceB+i,chunkHash2,bundleHash,expireTime,1);
        }
        console.timeEnd('TransfersExecutionTime');
    })

    it.only("scheduleMint and scheduleBurn ",async ()=>{
        // 1. scheduleBurn from bankB account on bankA
        // 2, scheudleMint to bankB on central bank node
        const dvtToken = HamsaTokenFactory.attach(dvtA).connect(bankBWalletOfDvtA);
        const bankAEscroting = await DvpEscortingFactory.attach(dvtAEscortingAddress).connect(bankBWalletOfDvtA);
        const drexEscroting = await DvpEscortingFactory.attach(drexEscrotingAddress).connect(bankBWalletOfDrex);
        // approve all balance to escroting
        let txApprove = await dvtToken.approve(bankAEscroting,await dvtToken.balanceOf(bankBWalletOfDvtA.address));
        await txApprove.wait();
        let baseNonceA = await bankAProvider.getTransactionCount(bankBWalletOfDvtA.address,'latest');
        let baseNonceB = await centralBankProvider.getTransactionCount(bankBWalletOfDrex.address,'latest');
        console.time('TransfersExecutionTime');
        for (let i = 0; i<1;i++){
            //get hash
            let expireTime =Math.floor(Date.now() / 1000) + 60*30;
            console.log("the transaction number ",i)
            chunkHash1 = "0x" + crypto.randomBytes(32).toString("hex");
            chunkHash2 = "0x" + crypto.randomBytes(32).toString("hex");
            chunkHash3 = 0;
            bundleHash = "0x" + p.poseidon3([chunkHash1, chunkHash2,chunkHash3]).toString(16).padStart(64, "0");
            //burn on bankA node
            await scheduleL2Burn(dvtA,bankAEscroting,dvtAEscortingAddress,bankBWalletOfDvtA,baseNonceA+i,chunkHash1,bundleHash,expireTime,0);
            //mint drex to bankB account
            await scheduleL2Mint(drex,drexEscroting,drexEscrotingAddress,bankBWalletOfDrex,bankBWalletOfDrex.address,baseNonceB+i,chunkHash2,bundleHash,expireTime,1);
        }
        console.timeEnd('TransfersExecutionTime');
    })


    it.only("scheduleTransfer and token transfer",async ()=>{
        //1. transfer from userA to bankB account on bankA node
        //2, transfer from bankB account to userB on bankB node
        const dvtAToken = HamsaTokenFactory.attach(dvtA).connect(userAWallet);
        const dvtBToken = HamsaTokenFactory.attach(dvtB).connect(bankBWalletOfDvtB);
        const bankAEscroting = await DvpEscortingFactory.attach(dvtAEscortingAddress).connect(userAWallet);
        const bankBEscroting = await DvpEscortingFactory.attach(dvtBEscortingAddress).connect(bankBWalletOfDvtB);
        //approve dvtA
        console.log("userA balance is ",await getTokenBalance(bankAProvider,dvtA,userAWallet.address));
        let txApprove = await dvtAToken.approve(dvtAEscortingAddress,(await dvtAToken.balanceOf(userAWallet.address))-2000n);
        await txApprove.wait();
        //approve dvtB
        console.log("bankB balance is ",await getTokenBalance(bankBProvider,dvtB,bankBWalletOfDvtB.address));
        txApprove = await dvtBToken.approve(dvtBEscortingAddress,await dvtBToken.balanceOf(bankBWalletOfDvtB.address));
        await txApprove.wait();
        let baseNonceA = await bankAProvider.getTransactionCount(userAWallet.address,'latest');
        let baseNonceB = await bankBProvider.getTransactionCount(bankBWalletOfDvtB.address,'latest');
        console.log(baseNonceA,baseNonceB);
        console.time('TransfersExecutionTime');
        for (let i = 0; i<1;i++){
            //get chunkHash
            let expireTime =Math.floor(Date.now() / 1000) + 60*5;
            console.log("the transaction number ",i)
            chunkHash1 = "0x" + crypto.randomBytes(32).toString("hex");
            chunkHash2 = "0x" + crypto.randomBytes(32).toString("hex");
            chunkHash3 = 0;
            bundleHash = "0x" + p.poseidon3([chunkHash1, chunkHash2,chunkHash3]).toString(16).padStart(64, "0");
            let nonceA = baseNonceA + 2*i;
            let nonceB = baseNonceB + i;
            // ScheduleTransfer on node2
            await scheduleL2Transfer(dvtA,bankAEscroting,dvtAEscortingAddress,userAWallet,bankBWalletOfDvtA.address,nonceA,chunkHash1,bundleHash,expireTime,0);
            // ScheduleTranfer on node3
            await scheduleL2Transfer(dvtB,bankBEscroting,dvtBEscortingAddress,bankBWalletOfDvtB,userBWallet.address,nonceB,chunkHash2,bundleHash,expireTime,1);
            // token transfer
            await transferTokenWithNonce(dvtAToken,dvtA, userAWallet,bankBWalletOfDvtA.address,1,nonceA+1);
        }
        console.timeEnd('TransfersExecutionTime');
    })
})