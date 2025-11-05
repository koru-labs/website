const {ethers, network}=require("hardhat");
const {networks} = require("../../hardhat.config");
const {ether} = require("@openzeppelin/test-helpers");

const dummyTokenAddress = "0x559fb86531dF1bb8377338Ee5ab29d9b8Fd453A1";
const toAddress="0xfAdb253d9AD9b2d6D37471fA80F398f76D8347B8"

async function deployDummyToken() {
    const DummyToken = await ethers.getContractFactory("DummyPrivateToken");
    const dummyToken = await  DummyToken.deploy();
    await dummyToken.waitForDeployment()
    console.log("dummyToken is deployed at: ", await dummyToken.getAddress());
}

async function addAnToken() {
    let [signer] = await ethers.getSigners();
    const dummyToken = await  ethers.getContractAt("DummyPrivateToken",dummyTokenAddress);


    let token = {
        id: 1,
        owner: signer.address,
        status: 1,
        amount: {
            cl_x: 4,
            cl_y: 5,
            cr_x: 6,
            cr_y: 7,
        },
        to: toAddress,
        rollbackTokenId:8,
        tokenType: 2,
    }
    let tx = await dummyToken.setAccountToken(signer.address, token);
    let receipt = await tx.wait();
    console.log("receipt", receipt);
}

async function getToken() {
    let [signer] = await ethers.getSigners();
    const dummyToken = await  ethers.getContractAt("DummyPrivateToken",dummyTokenAddress);

    let resp = await dummyToken.getAccountToken2(signer.address, 1);
    console.log("resp: ", resp);
}

async function privateTransfer() {
    const dummyToken = await  ethers.getContractAt("DummyPrivateToken",dummyTokenAddress);
    let tx = await dummyToken.privateTransfers([1]);
    let receipt = await tx.wait();
    console.log("receipt", receipt);
}

async function callEmptyUpdate() {
    const dummyToken = await  ethers.getContractAt("DummyPrivateToken",dummyTokenAddress);
    let tx = await dummyToken.update();
    let receipt = await tx.wait();
    console.log("receipt", receipt);
}

// 0x99af998d
async function calculateSignature() {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("privateTransfers(uint256[])"));
    const selector = hash.slice(0, 10);
    console.log("selector", selector);
}
// calculateSignature().then();

// deployDummyToken().then();
// addAnToken().then();
// privateTransfer().then();

getToken().then();



// callEmptyUpdate().then();