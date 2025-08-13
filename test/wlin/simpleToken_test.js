const {ethers, network}=require("hardhat");
const {networks} = require("../../hardhat.config");
const {ether} = require("@openzeppelin/test-helpers");

const simpleTokenAddress = "";

async function printNetwork(){
    const net = await ethers.provider.getNetwork();
    console.log("Chain ID:", net.chainId);
}

async function deploySimpleToken(){
    const SimpleToken = await ethers.getContractFactory("SimpleToken");
    const simpleToken = await SimpleToken.deploy("simple", "$S");
    await simpleToken.waitForDeployment();

    console.log("SimpleToken is deployed at: ", simpleToken.target);
}

async function checkBalance(){
    let[signer] = await ethers.getSigners();
    let balance = await ethers.provider.getBalance(signer.address);
    console.log("balance:", balance);
}

// printNetwork().then();
// checkBalance().then();
deploySimpleToken().then()