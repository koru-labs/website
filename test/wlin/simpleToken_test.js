const {ethers, network}=require("hardhat");
const {networks} = require("../../hardhat.config");
const {ether} = require("@openzeppelin/test-helpers");

const simpleTokenAddress = "0xC8c03647d39a96f02f6Ce8999bc22493C290e734";

async function printNetwork(){
    const net = await ethers.provider.getNetwork();
    console.log("Chain ID:", net.chainId);
}

async function deploySimpleToken() {
    const CurveBabyJubJub = await ethers.getContractFactory("CurveBabyJubJub");
    const curveBabyJubJub = await CurveBabyJubJub.deploy();
    await curveBabyJubJub.waitForDeployment();
    console.log("CurveBabyJubJub is deployed at :", curveBabyJubJub.target);

    const CurveBabyJubJubHelper = await ethers.getContractFactory("CurveBabyJubJubHelper", {
        libraries: {
            CurveBabyJubJub:curveBabyJubJub.target
        }
    })
    const curveBabyJubJubHelper = await CurveBabyJubJubHelper.deploy();
    await curveBabyJubJubHelper.waitForDeployment();
    console.log("CurveBabyJubJubHelper is deployed at :", curveBabyJubJubHelper.target);

    const SimpleToken = await ethers.getContractFactory("SimpleToken", {
        libraries: {
            "CurveBabyJubJubHelper": curveBabyJubJubHelper.target
        }});
    const simpleToken = await SimpleToken.deploy("simple", "$S");
    await simpleToken.waitForDeployment();

    console.log("SimpleToken is deployed at: ", simpleToken.target);
}


async function checkBalance(){
    const [signer] = await ethers.getSigners();
    const simpleToken = await ethers.getContractAt("SimpleToken", simpleTokenAddress);
    let balance = await simpleToken.balanceOf(signer.address);
    console.log("balance:", balance);
}

async function transfer(){
    const [signer] = await ethers.getSigners();
    const simpleToken = await ethers.getContractAt("SimpleToken", simpleTokenAddress);
    let tx = await simpleToken.transfer("0xfAdb253d9AD9b2d6D37471fA80F398f76D8347B8", 888);
    await tx.wait();
}

async function getLastBlock() {
    const block = await ethers.provider.getBlock("latest");
    console.log("latest block:", block.number, "hash:", block.hash, "timestamp:", block.timestamp,);
}


// printNetwork().then();
// deploySimpleToken().then()
// checkBalance().then();
// transfer().then();
//
// getLastBlock().then();