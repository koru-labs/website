
const hre = require("hardhat");
const {ethers} = hre;
const crypto = require('crypto');
const p = require('poseidon-lite');

const simpleAddress='0xE7894E639ca33A99e05Fa957B8659dab2b51242D'
const simpleTPFTAddress="0x21FFB36EF1dDe3a05EA96e15337ad80FdfC61bF5";

const escrowAddress ='0x993120Ffa250CF1879880D440cff0176752c17C2';//原始
// const escortingAddress ='0x0f698EB6816DcE963ea5CfABDaaFba3707997dcd';//代理



const zeroAddress ='0x0000000000000000000000000000000000000000'
async function deploySimple(){
    const [deployer] = await ethers.getSigners()
    const SimpleToken = await ethers.getContractFactory("Simple");
    const simple = await SimpleToken.deploy("simple", "$simple")
    await simple.waitForDeployment()
    console.log("simple is deployed at ", await simple.getAddress())
}

async function deploySimpleTPFT(){
    const [deployer] = await ethers.getSigners()
    const SimpleTPFt = await ethers.getContractFactory("SimpleTPFt");
    const simpleTPFT = await SimpleTPFt.deploy();
    await simpleTPFT.waitForDeployment()
    console.log("simpleTPFT deployment is done")

    let tx = await simpleTPFT.setApprovalForAll(escrowAddress, true);
    await tx.wait();
    console.log("simpleTPFT approve is done")


    console.log("simpleTPFT is deployed at ", await simpleTPFT.getAddress())
}

async function scheduleTransfer1() {
    // const [deployer] = await ethers.getSigners()
    const SimpleToken = await ethers.getContractFactory("Simple");
    const simple = await SimpleToken.attach(simpleAddress);

    const DvpEscorting = await ethers.getContractFactory("DvpEscrow");
    const escorting = await DvpEscorting.attach(escrowAddress);


    // let tx = await simple.approve(escortingAddress, 1000);
    // await tx.wait();

    let [chunk1, chunk2, bundle] = await testHashT4()

    let expire=Math.floor(Date.now() / 1000) + 60*20
    let schduleRequest= {
        tokenAddress: simpleAddress,
        to: '0x08883F8d938055aed23b0A64dcd7fD140028F648',
        tokenType: 0,
        amount:100,

        index:0,
        chunkHash: chunk1,
        bundleHash: bundle,
        expireTime:expire,
        sender: zeroAddress
    }
    console.log("=====scheduleTransfer request:",schduleRequest);
    tx = await escorting.scheduleTransfer(schduleRequest);
    await tx.wait();

    // console.log("recipient simpleToken balance: ", await simple.balanceOf("0x08883F8d938055aed23b0A64dcd7fD140028F648"));
    // console.log("escort simpleToken balance: ",  await simple.balanceOf(escortingAddress))
    //
    // let slot  = await escorting.Transactions("0x1e525eb6d7872925ab5de5448fd36aa0af16eb62583af94f2ab93e2b7a7f1d26")
    // console.log("slot: ", slot)
}

async function scheduleTransfer1155() {
    const [deployer] = await ethers.getSigners()

    const DvpEscorting = await ethers.getContractFactory("DvpEscrow");
    const escorting = await DvpEscorting.attach(escrowAddress);


    let [chunk1, chunk2, bundle] = await testHashT4()

    let expire=Math.floor(Date.now() / 1000) + 60*20
    let schduleRequest= {
        tokenAddress: simpleTPFTAddress,
        to: '0x08883F8d938055aed23b0A64dcd7fD140028F648',
        tokenType: 100,
        amount:1,

        index:0,
        chunkHash: chunk1,
        bundleHash: bundle,
        expireTime: expire,
        sender:     await deployer.getAddress()
    }
    console.log("=====scheduleTransfer request:",schduleRequest);
    tx = await escorting.scheduleTransfer1155(schduleRequest);
    await tx.wait();
}

async function ApproveFunds() {
    const [deployer] = await ethers.getSigners()
    const SimpleToken = await ethers.getContractFactory("Simple");
    const simple = await SimpleToken.attach(simpleAddress);

    const DvpEscorting = await ethers.getContractFactory("DvpEscrow");
    const escorting = await DvpEscorting.attach(escrowAddress);

    let tx = await simple.approve(escrowAddress, 10000*1000000);
    await tx.wait();

    console.log("approve Simple to DvpEscorting");
}

async function scheduleBurn() {
    const SimpleToken = await ethers.getContractFactory("Simple");
    const simple = await SimpleToken.attach(simpleAddress);

    const DvpEscorting = await ethers.getContractFactory("DvpEscrow");
    const escorting = await DvpEscorting.attach(escrowAddress);


    let tx = await simple.approve(escrowAddress, 1000);
    await tx.wait();

    let [chunk1, chunk2, bundle] = await testHashT4()

    let expire=Math.floor(Date.now() / 1000) + 60*20
    let schduleRequest= {
        tokenAddress: simpleAddress,
        to: '0x08883F8d938055aed23b0A64dcd7fD140028F648',
        tokenType: 0,
        amount:100,

        index:0,
        chunkHash: chunk1,
        bundleHash: bundle,
        expireTime:expire,
        sender: zeroAddress
    }
    console.log("=====scheduleTransfer request:",schduleRequest);

    tx = await escorting.scheduleBurn(schduleRequest);
    await tx.wait();
    console.log("escorting simpleToken balance", await simple.balanceOf(escrowAddress));
}

async function scheduleMint() {
    const SimpleToken = await ethers.getContractFactory("Simple");
    const simple = await SimpleToken.attach(simpleAddress);

    const DvpEscorting = await ethers.getContractFactory("DvpEscrow");
    const escorting = await DvpEscorting.attach(escrowAddress);


    let tx = await simple.approve(escrowAddress, 1000);
    await tx.wait();

    let [chunk1, chunk2, bundle] = await testHashT4()

    let expire=Math.floor(Date.now() / 1000) + 60*20
    let schduleRequest= {
        tokenAddress: simpleAddress,
        to: '0x08883F8d938055aed23b0A64dcd7fD140028F648',
        tokenType: 0,
        amount:100,

        index:0,
        chunkHash: chunk1,
        bundleHash: bundle,
        expireTime:expire,
        sender: zeroAddress
    }
    console.log("=====scheduleTransfer request:",schduleRequest);

    tx = await escorting.scheduleMint(schduleRequest)
    await tx.wait();
    console.log("escorting simpleToken balance", await simple.balanceOf(escrowAddress));
}

async function checkTransactionStatus(){
    const DvpEscrow = await ethers.getContractFactory("DvpEscrow");
    const dvpEscrow = await DvpEscrow.attach(escrowAddress);
    let slot  = await dvpEscrow.Transactions("0x143e2100af663ce88421e5d897cce424fc2620ef3996ef7bd19c20f347fb38b9")

    console.log("slot: ", slot)
}

async  function testHashT4() {
    const [deployer, account1, account2] = await ethers.getSigners()

    let chunkHash1 = "0x"+ crypto.randomBytes(32).toString("hex");
    let chunkHash2 = "0x" +  crypto.randomBytes(32).toString("hex");
    let chunkHash3 = "0x" +  crypto.randomBytes(32).toString("hex");


    console.log("chunkHash1", chunkHash1)
    console.log("chunkHash2", chunkHash2)
    // console.log("chunkHash3", chunkHash3)

    let hash= p.poseidon3([chunkHash1, chunkHash2, 0]);
    let bundleHash= "0x" + hash.toString(16).padStart(64,"0")
    console.log("bundleHash: ", bundleHash)
    return [chunkHash1, chunkHash2, bundleHash];
}


async function getBalance() {
    const [deployer] = await ethers.getSigners()

    const SimpleToken = await ethers.getContractFactory("Simple");
    const simple = await SimpleToken.attach(simpleAddress);

    console.log("recipient simpleToken balance", await simple.balanceOf("0x08883F8d938055aed23b0A64dcd7fD140028F648"));
    console.log("escorting simpleToken balance", await simple.balanceOf(escrowAddress));
    console.log("deployer simpleToken balance", await simple.balanceOf("0x23eabdd1584Cc04E5962524F48B9c6f4d1Ef98cD"));
}

async function testEth(){
    let eth = await ethers.provider.getBalance("0x993120Ffa250CF1879880D440cff0176752c17C2")
    console.log("eth", eth);
}

async function testMint() {
    const SimpleToken = await ethers.getContractFactory("Simple");
    const simple = await SimpleToken.attach(simpleAddress);

    let tx = await simple.mint("0x08883F8d938055aed23b0A64dcd7fD140028F648", 10)
    await tx.wait();
}

async function misc() {
    let name = await ethers.provider.resolveName("Admin");
    console.log("name", name)
}

async function  testExecute(){
    const DvpEscrow = await ethers.getContractFactory("DvpEscrow");
    const escrow = await DvpEscrow.attach(escrowAddress);
    let t = await escrow.execute(1);
}

async function checkBundleTransaction() {
    let bundleHash ="205bc49ad80c256f3ac9982ff652e221030e25a1c3d438abb625f48418e14554";
    let BundleTransaction = await ethers.provider.send("eth_checkTransactionBundle", [bundleHash]);
    console.log("BundleTransaction", BundleTransaction);
}


async function getEthBalance() {
    const [deployer] = await ethers.getSigners()
    let balance  = await ethers.provider.getBalance("0x87f0e49bd849B895EF96c5C955c99e59d2e83C4B")
    console.log("balance: ", balance)
}

//
// deployHamsaToken().then()
// deploySimple().then()
// deploySimpleTPFT().then();
// ApproveFunds().then()

// testHashT4().then()

scheduleTransfer1().then()
// scheduleTransfer1155().then();
// scheduleBurn().then()
// scheduleMint().then();

// checkTransactionStatus().then()

// executeTransfer().then()
// testMint().then()

// testEth().then()
// misc().then()
// testExecute().then()
//
// checkBundleTransaction().then();

// deploySimple().then();
// ApproveFunds().then();
// scheduleTransfer1().then();


// getBalance().then()
// getEthBalance().then()