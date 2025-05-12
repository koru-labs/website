const hre = require("hardhat");
const {ethers} = hre;
const crypto = require('crypto');
const p = require('poseidon-lite');

const simpleAddress = '0xdFD80F4d1EE7c1832d667C28159eD5A2f884Be54'
const escortingAddress = '0x7a2AFb76E7427ef666f5b35C6a7d38d7A932DcD0'

async function deploySimple() {
    const [deployer] = await ethers.getSigners()
    const SimpleToken = await ethers.getContractFactory("Simple");
    const simple = await SimpleToken.deploy("simple", "$simple")
    await simple.waitForDeployment()
    console.log("simple is deployed at ", await simple.getAddress())
}


async function scheduleTransfer2() {
    const [deployer] = await ethers.getSigners()
    const SimpleToken = await ethers.getContractFactory("Simple");
    const simple = await SimpleToken.attach(simpleAddress);

    const DvpEscorting = await ethers.getContractFactory("DvpEscorting");
    const escorting = await DvpEscorting.attach(escortingAddress);


    let tx = await simple.approve(escortingAddress, 100);
    await tx.wait();

    tx = await escorting.scheduleTransfer(simpleAddress, '0x08883F8d938055aed23b0A64dcd7fD140028F648', 100, '0x559864d482ae0c68f2ab9734b79e9cd494616a6d75ab6ab63c7294c789f42af6', '0x12802986fea5f09dec28306e28fb328ca4c8fc93610216028c1d7fec0030e176');
    await tx.wait();

    console.log("recipient simpleToken balance: ", await simple.balanceOf("0x08883F8d938055aed23b0A64dcd7fD140028F648"));
    console.log("escort simpleToken balance: ", await simple.balanceOf(escortingAddress))

    let slot = await escorting.Transactions("0x1e525eb6d7872925ab5de5448fd36aa0af16eb62583af94f2ab93e2b7a7f1d26")
    console.log("slot: ", slot)
}


async function scheduleBurn() {
    const [deployer] = await ethers.getSigners()
    const SimpleToken = await ethers.getContractFactory("Simple");
    const simple = await SimpleToken.attach(simpleAddress);

    const DvpEscorting = await ethers.getContractFactory("DvpEscorting");
    const escorting = await DvpEscorting.attach(escortingAddress);

    let tx = await simple.approve(escortingAddress, 100);
    await tx.wait();

    tx = await escorting.scheduleBurn(simpleAddress, 100, '0xf946465711a5bf66cbf25a41aa21422f3586d06aefe16fb564ec85f009d39aa6', '0x15f969cddcb1664112173ba979c38a333279db3ac10a3ecbbffa17fc5b30aee1');
    await tx.wait();
    console.log("escorting simpleToken balance", await simple.balanceOf(escortingAddress));
}


async function checkTransactionStatus() {
    const DvpEscorting = await ethers.getContractFactory("DvpEscorting");
    const escorting = await DvpEscorting.attach(escortingAddress);
    let slot = await escorting.Transactions("0x12802986fea5f09dec28306e28fb328ca4c8fc93610216028c1d7fec0030e176")
    console.log("slot: ", slot)
}

async function testHash() {
    let chunkHash1 = "0x" + crypto.randomBytes(32).toString("hex");
    let chunkHash2 = "0x" + crypto.randomBytes(32).toString("hex");

    console.log("chunk hash1: ", chunkHash1)
    console.log("chunk hash2: ", chunkHash2);

    const hash = p.poseidon2([chunkHash1, chunkHash2])
    console.log("bundle hash: ", "0x" + hash.toString(16).padStart(64, "0"))
}

async function getBalance() {
    const SimpleToken = await ethers.getContractFactory("Simple");
    const simple = await SimpleToken.attach(simpleAddress);

    console.log("receipt simpleToken balance", await simple.balanceOf("0x08883F8d938055aed23b0A64dcd7fD140028F648"));
    console.log("escorting simpleToken balance", await simple.balanceOf(escortingAddress));
}


// deploySimple().then()

// verifyEscortDeployed().then()
// testHash().then()
//
// scheduleTransfer2().then()
// scheduleBurn().then()

checkTransactionStatus().then()


// executeTransfer().then()
// getBalance().then()