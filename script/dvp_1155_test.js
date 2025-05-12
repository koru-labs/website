const hre = require("hardhat");
const {ethers} = hre;
const p = require('poseidon-lite');
const crypto = require('crypto');

const simple1155_address ="0xd152D80F201b74fDE6FcEF206b399d56a24FB45d";
const escrowAddress ='0x993120Ffa250CF1879880D440cff0176752c17C2'


async function deploy1155(){
    const [deployer] = await ethers.getSigners()

    const Simple1155 = await ethers.getContractFactory("Simple1155");
    const simple1155 = await Simple1155.deploy()
    await simple1155.waitForDeployment();


    console.log("simple1155 is deployed at: ", await simple1155.getAddress())
}

async function getBalance() {
    const [deployer] = await ethers.getSigners()

    const Simple1155 = await ethers.getContractFactory("Simple1155");
    const simple1155 = await Simple1155.attach(simple1155_address);

    const address = await deployer.getAddress();

    let balance = await simple1155.balanceOf(address, 0);
    console.log("balance: ", balance)
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


async function scheduleTransfer1() {
    const [deployer] = await ethers.getSigners()

    const Simple1155 = await ethers.getContractFactory("Simple1155");
    const simple1155 = await Simple1155.attach(simple1155_address);

    const DvpEscorting = await ethers.getContractFactory("DvpEscrow");
    const escorting = await DvpEscorting.attach(escortingAddress);

    let result = await simple1155.setApprovalForAll(escrowAddress, true)
    await result.wait();

    let [chunk1, chunk2, bundle] = await testHashT4()

    let expire=Math.floor(Date.now() / 1000) + 60*20
    let schduleRequest= {
        tokenAddress: simple1155_address,
        to: '0x08883F8d938055aed23b0A64dcd7fD140028F648',
        tokenType: 0,
        amount: 100,

        index:0,
        chunkHash: chunk1,
        bundleHash: bundle,
        expireTime:expire
    }

    tx = await escorting.scheduleTransfer1155(schduleRequest);
    await tx.wait();
}

deploy1155().then();
// getBalance().then()
// scheduleTransfer1().then()