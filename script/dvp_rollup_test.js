const hre = require("hardhat");
const {ethers} = hre;
const p = require('poseidon-lite');
const crypto = require("crypto");
const assert = require('assert');
const {Wallet} = require("ethers");
const chai = require("chai");
const expect = chai.expect;
const hardhatConfig = require('../hardhat.config');

const escorwAddress ='0x993120Ffa250CF1879880D440cff0176752c17C2'


const customNetwork = {
    name: "HAMSA",
    chainId: 1001
};

const options = {
    batchMaxCount: 1,
    staticNetwork: true
};

const customerAKey ="1fc9cb8571b3bc33a733f4a2b89bad0b2670e52eeec65db0a7622fc85f113484"
const customerBKey = "25535682af0cef01617e38366b0250df584a96fd390c5bc7751c265103a07ce2"
const L1Key="32ef95df4ea8de4f6b5518106e97dbb3e5b97cdbb4a33adfeaa9f14e729f51eb";

const bankARpcUrl = hardhatConfig.networks.server_L2_2.url;
const bankBRpcUrl = hardhatConfig.networks.server_L2_3.url;

const bankAProvider = new ethers.JsonRpcProvider(bankARpcUrl, customNetwork, options);
const walletA= new ethers.Wallet(customerAKey, bankAProvider);


const bankBProvider = new ethers.JsonRpcProvider(bankBRpcUrl, customNetwork, options);
const walletB = new ethers.Wallet(customerBKey, bankBProvider);

let HamsaTokenAddress= "0xDeb622aA41057fFf16610651c65315DBFD569B85"


async function checkCustomerBalance(tokenAddress, wallet){
    const HamsaToken = await ethers.getContractFactory("HamsaToken");
    let hamsaToken = HamsaToken.attach(tokenAddress).connect(wallet)
    let balance = await hamsaToken.balanceOf(wallet.address)
    console.log("balance", balance)
}


async function customerScheduleTransfer(wallet, chunkHash, bundleHash) {
    const HamsaToken = await ethers.getContractFactory("HamsaToken");
    let hamsaToken = HamsaToken.attach(HamsaTokenAddress).connect(wallet)

    let tx = await hamsaToken.mint(await wallet.getAddress(), 200)
    await tx.wait();

    tx = await hamsaToken.approve(escorwAddress, 100);
    await tx.wait();


    let expire=Math.floor(Date.now() / 1000) + 60*20
    let schduleRequest= {
        tokenAddress: HamsaTokenAddress,
        to: '0x08883F8d938055aed23b0A64dcd7fD140028F648',
        tokenType: 0,
        amount:100,

        index:0,
        chunkHash: chunkHash,
        bundleHash: bundleHash,
        expireTime:expire
    }

    const DvpEscrow = await ethers.getContractFactory("DvpEscrow");
    const dvpEscrow = await DvpEscrow.attach(escorwAddress).connect(walletA);

    tx = await dvpEscrow.scheduleTransfer(schduleRequest);
    await tx.wait();
}

async function customerScheduleMint(wallet, chunkHash, bundleHash) {
    let expire=Math.floor(Date.now() / 1000) + 60*20
    let schduleRequest= {
        tokenAddress: HamsaTokenAddress,
        to: '0x08883F8d938055aed23b0A64dcd7fD140028F648',
        tokenType: 0,
        amount:100,

        index:0,
        chunkHash: chunkHash,
        bundleHash: bundleHash,
        expireTime:expire
    }

    const DvpEscrow = await ethers.getContractFactory("DvpEscrow");
    const dvpEscrow = await DvpEscrow.attach(escorwAddress).connect(walletA);

    tx = await dvpEscrow.scheduleMint(schduleRequest);
    await tx.wait();
}

async function customerScheduleBurn(wallet, chunkHash, bundleHash) {
    const HamsaToken = await ethers.getContractFactory("HamsaToken");
    let hamsaToken = HamsaToken.attach(HamsaTokenAddress).connect(wallet)

    let tx = await hamsaToken.mint(await wallet.getAddress(), 200)
    await tx.wait();

    tx = await hamsaToken.approve(escorwAddress, 100);
    await tx.wait();

    let expire=Math.floor(Date.now() / 1000) + 60*20
    let schduleRequest= {
        tokenAddress: HamsaTokenAddress,
        to: '0x08883F8d938055aed23b0A64dcd7fD140028F648',
        tokenType: 0,
        amount:100,

        index:0,
        chunkHash: chunkHash,
        bundleHash: bundleHash,
        expireTime:expire
    }

    const DvpEscrow = await ethers.getContractFactory("DvpEscrow");
    const dvpEscrow = await DvpEscrow.attach(escorwAddress).connect(walletA);

    tx = await dvpEscrow.scheduleBurn(schduleRequest);
    await tx.wait();
}

function generateHash() {
    let chunkHash1 = "0x"+ crypto.randomBytes(32).toString("hex");
    let chunkHash2 = "0x" +  crypto.randomBytes(32).toString("hex");

    let hash= p.poseidon3([chunkHash1, chunkHash2, 0]);
    let bundleHash = "0x" + hash.toString(16).padStart(64,"0");
    return [chunkHash1, chunkHash2, bundleHash]
}

async function executeDvpTransfer(){
    let [chunkHash1, chunkHash2, bundleHash] =generateHash();
    console.log("chunkHash1: ", chunkHash1)
    console.log("chunkHash2: ", chunkHash2)
    console.log("bundlehash: ", bundleHash)

    await customerScheduleTransfer(walletA, chunkHash1, bundleHash);
    await customerScheduleTransfer(walletB, chunkHash2, bundleHash);
}

async function executeDvpMint(){
    let [chunkHash1, chunkHash2, bundleHash] =generateHash();
    console.log("chunkHash1: ", chunkHash1)
    console.log("chunkHash2: ", chunkHash2)
    console.log("bundlehash: ", bundleHash)

    await customerScheduleMint(walletA, chunkHash1, bundleHash);
    await customerScheduleMint(walletB, chunkHash2, bundleHash);
}

async function executeDvpBurn(){
    let [chunkHash1, chunkHash2, bundleHash] =generateHash();
    console.log("chunkHash1: ", chunkHash1)
    console.log("chunkHash2: ", chunkHash2)
    console.log("bundlehash: ", bundleHash)

    await customerScheduleBurn(walletA, chunkHash1, bundleHash);
    await customerScheduleBurn(walletB, chunkHash2, bundleHash);
}


executeDvpTransfer().then()
