const hre = require("hardhat");
const {ethers} = hre;
const crypto = require('crypto');
const p = require('poseidon-lite');
const hardhatConfig = require("../hardhat.config");


const customNetwork = {
    name: "HAMSA",
    chainId: 1001
};


const l1CustomNetwork = {
    name: "BESU",
    chainId: 1337
};
const options = {
    batchMaxCount: 1,
    staticNetwork: true
};



const L1Url = hardhatConfig.networks.localBesu.url;
const L2Url = hardhatConfig.networks.localL2.url;
const L1user = hardhatConfig.networks.localBesu.accounts[0];
const L2user = hardhatConfig.networks.localL2.accounts[0];
console.log("L1.url:", L1Url);
console.log("L2.url:", L2Url);

console.log("L1user:", L1user);
console.log("L2user:", L2user);


const l1Provider = new ethers.JsonRpcProvider(L1Url, l1CustomNetwork, options);
const l2Provider = new ethers.JsonRpcProvider(L2Url, customNetwork, options);

const L1userWallet = new ethers.Wallet(L1user, l1Provider);
const L2userWallet = new ethers.Wallet(L2user, l2Provider);
console.log("L1user address:", L1userWallet.address);
console.log("L2user address:", L2userWallet.address);


let simpleAddress = '0x21FFB36EF1dDe3a05EA96e15337ad80FdfC61bF5';
const escortingAddress = '0x993120Ffa250CF1879880D440cff0176752c17C2';
const dvpMatchAddress = "0x7f1Dc0F5F8dafd9715Ea51f6c11b92929b2Dbdea";//更改

const poseidonHashAddress = "0xB21cad4F940870bFA14c31caA706360438A1E4a1";
const poseidonT4Address = "0xF021fD12846869B204d743B83557Ce8aeC50b617";

let chunkHash1 = "";
let chunkHash2 = "";
let bundleHash = "";


async function scheduleTransfer1() {
    console.log("start simple is deployed")
    const SimpleToken = await ethers.getContractFactory("Simple", L2userWallet);
    const simple = await SimpleToken.deploy("simple", "$simple")
    await simple.waitForDeployment()
    simpleAddress = await simple.getAddress();
    console.log("token deployed at ", simpleAddress)
    let tx = await simple.approve(escortingAddress, 100 * 1000000);
    await tx.wait();
    console.log("token approve done")

    let [chunk1, chunk2, bundle] = await testHashT4()

    let expire = Math.floor(Date.now() / 1000) + 60 * 20
    let schduleRequest = {
        tokenAddress: simpleAddress,
        to: '0x08883F8d938055aed23b0A64dcd7fD140028F648',
        // to: '0x983b4bA7e42E664dDBfe4ed3E0Ea07D90EFCc13B',
        tokenType: 0,
        amount: 100,
        index: 0,
        chunkHash: chunk1,
        bundleHash: bundle,
        expireTime: expire,
        sender:ethers.ZeroAddress
    }
    const DvpEscorting = await ethers.getContractFactory("DvpEscrow");
    const dvpEscrow = await DvpEscorting.attach(escortingAddress).connect(L2userWallet);
    console.log("@@@scheduleTransfer.schduleRequest:", schduleRequest)
    tx = await dvpEscrow.scheduleTransfer(schduleRequest);
    await tx.wait();
    console.log("@@@scheduleTransfer.schduleRequest done ....:")


}


async function testHashT4() {
    chunkHash1 = "0x" + crypto.randomBytes(32).toString("hex");
    chunkHash2 = "0x" + crypto.randomBytes(32).toString("hex");

    console.log("chunkHash1", chunkHash1)
    console.log("chunkHash2", chunkHash2)

    let hash = p.poseidon3([chunkHash1, chunkHash2, 0]);
    bundleHash = "0x" + hash.toString(16).padStart(64, "0")
    console.log("bundleHash: ", bundleHash)
    return [chunkHash1, chunkHash2, bundleHash];
}

async function testCommitBundlePart21() {
    console.log("start commitBundle")
    const DvpMatch = await ethers.getContractFactory("DvpMatch", {
        signer: L1user,
        libraries: {
            PoseidonHasher: poseidonHashAddress,
            PoseidonT4: poseidonT4Address
        }
    });

    // const match = DvpMatch.attach(dvpMatchAddress);
    const match = await DvpMatch.attach(dvpMatchAddress).connect(L1userWallet);
    let newBlockHash = "0xd5ec7708486a709f9ec981eb0232998a5b4808d554b076bd947d31f2211b8c10";
    let newStateRoot = "0x5940c5d24a7f038efc2f5fb92b41e86e5e727a574b927957da341be13faf5dac";
    let newTransactionRoot = "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421";
    let newReceiptRoot = "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421"
    let bundleRequest = {
        blockNum: 2,
        index: 1,
        transactionHash: "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",
        txLeafHash: 0,
        chunkHash: chunkHash2,
        bundleHash: bundleHash,
        expireTime: Math.floor(new Date().getTime() / 1000) + 3600 * 20
    }
    console.log("@@@request bundleRequest:", bundleRequest)
    let tx = await match.commitBatchWithBundles(2, newBlockHash, newStateRoot, newTransactionRoot, newReceiptRoot, [bundleRequest])
    await tx.wait();
    console.log("compile commitBatchWithBundles tx: ", tx.hash);
    await getBalance();


}



async function getBalance() {
    const SimpleTokenFactory = await ethers.getContractFactory("Simple");
    let simpleAddress = "0x5209bdd93D12448a3488257398DA751C84619890";//单独查询需要修改
    console.log("simpleAddress:", simpleAddress);
    const simpleToken = await SimpleTokenFactory.attach(simpleAddress).connect(L2userWallet);


    console.log("recipient simpleToken balance", await simpleToken.balanceOf("0xf17f52151EbEF6C7334FAD080c5704D77216b732"));
    console.log("escorting simpleToken balance", await simpleToken.balanceOf(escortingAddress));
    console.log("deployer simpleToken balance", await simpleToken.balanceOf(L2userWallet.address));
}

async function testDvp() {
    try {
        await scheduleTransfer1();
        await testCommitBundlePart21();
    } catch (error) {
        console.error('An error occurred during test:', error);
    }
}


testDvp().then();





