const {ethers, network}=require("hardhat");
const {networks} = require("../../hardhat.config");
const {ether} = require("@openzeppelin/test-helpers");

const simpleTokenAddress = "0xb9A219631Aed55eBC3D998f17C3840B7eC39C0cc";

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
    const SimpleToken = await ethers.getContractFactory("SimpleToken");
    const simpleToken = await SimpleToken.attach(simpleTokenAddress);
    let balance = await simpleToken.balanceOf(signer.address);
    console.log("balance:", balance);
}

async function transfer(){
    const [signer] = await ethers.getSigners();
    const SimpleToken = await ethers.getContractFactory("SimpleToken");
    const simpleToken = await SimpleToken.attach(simpleTokenAddress);
    let tx = await simpleToken.transfer("0xfAdb253d9AD9b2d6D37471fA80F398f76D8347B8", 888);
    await tx.wait();
}



// printNetwork().then();
deploySimpleToken().then()
// checkBalance().then();
// transfer().then();