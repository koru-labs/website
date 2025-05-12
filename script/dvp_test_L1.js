const hre = require("hardhat");
const {ethers} = hre;
const p = require('poseidon-lite');
const crypto = require('crypto');

const poseidonHashAddress="0xc411e80F5B474aF3a970378cD1d8a225651A359e"
const poseidonT4Address="0xa4b1F4eBA08Bd7afFA913Fd1C348bfb5462CBB9a"
const dvpMatchAddress="0xF033602321024cEd81aaA111Ad467921c303DE2A"

const bundleHash="0x12b8a467e9a3e5ce45cd62c6dee9f1f3440fd6918fc75be0bfb5f4abc21d19ee";

async function testCommitBundlePart21() {
    const [deployer] = await ethers.getSigners()

    const DvpMatch = await ethers.getContractFactory("DvpMatch",  {
        signer: deployer[0],
        libraries: {
            PoseidonHasher: poseidonHashAddress,
            PoseidonT4: poseidonT4Address
        }});

    const match = DvpMatch.attach(dvpMatchAddress);
    let newBlockHash="0xd5ec7708486a709f9ec981eb0232998a5b4808d554b076bd947d31f2211b8c10";
    let newStateRoot ="0x5940c5d24a7f038efc2f5fb92b41e86e5e727a574b927957da341be13faf5dac";
    let newTransactionRoot="0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421";
    let newReceiptRoot="0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421"
    let bundleRequest ={
        blockNum:2,
        index:1,
        transactionHash:"0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",
        txLeafHash: 0,
        chunkHash: "0x580cae98ecf420fe590e10970c2563f815b5f4ec61dc12833fa033451653839e",//chunkHash2
        bundleHash:"0x203b3a1d212e37a4f26fff5a1faaf75c6e377d66a69c6c01cb73886c1a70c977",
        expireTime: Math.floor(new Date().getTime() / 1000) + 3600*10
    }

    let tx = await match.commitBatchWithBundles(2, newBlockHash, newStateRoot, newTransactionRoot, newReceiptRoot, [bundleRequest] )
    console.log("tx: ", await tx.wait());
}

async function testCommitBundlePart22() {
    const [deployer] = await ethers.getSigners()

    const DvpMatch = await ethers.getContractFactory("DvpMatch",  {
        signer: deployer[0],
        libraries: {
            PoseidonHasher: poseidonHashAddress,
            PoseidonT4: poseidonT4Address
        }});

    const match = DvpMatch.attach(dvpMatchAddress);
    let newBlockHash="0xd5ec7708486a709f9ec981eb0232998a5b4808d554b076bd947d31f2211b8c10";
    let newStateRoot ="0x5940c5d24a7f038efc2f5fb92b41e86e5e727a574b927957da341be13faf5dac";
    let newTransactionRoot="0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421";
    let newReceiptRoot="0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421"
    let bundleRequest ={
        blockNum:2,
        index:2,
        transactionHash:"0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421",

        chunkHash: "0xf1673bd1f56fe7615cd7e4bc99aacecf5973973c53d715e19a9b5bd3b30c2002",
        bundleHash:"0x0400e0bbac86550dc7446069fd72c18658957deed865690485417658ed50b77e",
        expireTime: Math.floor(new Date().getTime() / 1000) + 3600
    }

    let tx = await match.commitBatchWithBundles(2, newBlockHash, newStateRoot, newTransactionRoot, newReceiptRoot, [bundleRequest] )
    await tx.wait();
}

async function testMatchVariables(){
    const [deployer, account1, account2] = await ethers.getSigners()

    const DvpMatch = await ethers.getContractFactory("DvpMatch",  {
        signer: deployer[0],
        libraries: {
            PoseidonHasher: poseidonHashAddress,
            PoseidonT4: poseidonT4Address
        }});
    const match = DvpMatch.attach(dvpMatchAddress);

    console.log("bundle", await match.bundleMap(bundleHash));
    console.log("expired", await match.bundleExpired(bundleHash));
    console.log("filled", await match.bundleFilled(bundleHash));
    console.log("verifyBundlesEnabled", await match.verifyBundlesEnabled());
    // console.log("calculatedChainHash", await match.calculatedChainHash());

    // enabled verify Bundles Enabled
    let tx2 = await match.enabledVerifyBundles()
    await tx2.wait();
    console.log("enabled verifyBundlesEnabled", await match.verifyBundlesEnabled());

    // disabled verify Bundles Enabled
    let tx1 = await match.disabledVerifyBundles()
    await tx1.wait();
    console.log("disabled verifyBundlesEnabled", await match.verifyBundlesEnabled());
}

async function testL1Hash() {
    const [deployer, account1, account2] = await ethers.getSigners()

    console.log("p2: ", p.poseidon2([0, 0]));

    const DvpMatch = await ethers.getContractFactory("DvpMatch",  {
        signer: deployer[0],
        libraries: {
            PoseidonHasher: poseidonHashAddress,
            PoseidonT4: poseidonT4Address
        }});
    const match = DvpMatch.attach(dvpMatchAddress);
    console.log("hash2 value", await match.hash2(0,0));
}

async function cancelBundle(){
    const [deployer] = await ethers.getSigners()

    const DvpMatch = await ethers.getContractFactory("DvpMatch",  {
        signer: deployer[0],
        libraries: {
            PoseidonHasher: poseidonHashAddress,
            PoseidonT4: poseidonT4Address
        }});
    const match = DvpMatch.attach(dvpMatchAddress);
    let tx=await match.cancelBundle(bundleHash);
    await tx.wait();
}

async function triggerBundleFill(){
    const [deployer] = await ethers.getSigners()

    const DvpMatch = await ethers.getContractFactory("DvpMatch",  {
        signer: deployer[0],
        libraries: {
            PoseidonHasher: poseidonHashAddress,
            PoseidonT4: poseidonT4Address
        }});
    const match = DvpMatch.attach(dvpMatchAddress);
    let tx=await match.triggerBundleEvents(1, "0x1a605994811ffda8a09ddd8acf279936e1c7d3309e5f090a4bc2f38a9e72739a");
    await tx.wait();
}

async function triggerCancelExpired(){
    const [deployer] = await ethers.getSigners()

    const DvpMatch = await ethers.getContractFactory("DvpMatch",  {
        signer: deployer[0],
        libraries: {
            PoseidonHasher: poseidonHashAddress,
            PoseidonT4: poseidonT4Address
        }});
    const match = DvpMatch.attach(dvpMatchAddress);
    let tx=await match.cancelExpiredBundles();
    await tx.wait();

    console.log("size:", await match.pendingCount())
}
async  function triggerExpire(){
    const [deployer] = await ethers.getSigners()

    const DvpMatch = await ethers.getContractFactory("DvpMatch",  {
        signer: deployer[0],
        libraries: {
            PoseidonHasher: poseidonHashAddress,
            PoseidonT4: poseidonT4Address
        }});
    const match = DvpMatch.attach(dvpMatchAddress);
    let tx = await match.tryExpireBundles();
    await tx.wait()
}

async  function testHashT4() {
    const [deployer, account1, account2] = await ethers.getSigners()

    let chunkHash1 = "0x"+ crypto.randomBytes(32).toString("hex");
    let chunkHash2 = "0x" +  crypto.randomBytes(32).toString("hex");
    let chunkHash3 = "0x" +  crypto.randomBytes(32).toString("hex");


    console.log("chunkHash1", chunkHash1)
    console.log("chunkHash2", chunkHash2)
    // console.log("chunkHash3", chunkHash3)

    let hash= p.poseidon3([chunkHash1, chunkHash2, "0"]);
    console.log("bundle hash: ", "0x" + hash.toString(16).padStart(64,"0"))
}

async function verifyH4() {
    const [deployer] = await ethers.getSigners()

    let value = p.poseidon3(["0x69bac3dd73dc6730cd364e371c32d210459f0d81a44837bc7dd99f5165138b34",
        "0x880483ebd94e238d223c13d3cbba037f78ea3c5eef1bef8804fc68cb00b1aa91",
        "0"])
    console.log("value: ", value)
}


// testHashT4().then();


// testCommitBundlePart20().then()
// testCommitBundlePart21().then()
// testCommitBundlePart22().then()

// triggerCancelExpired().then()
// triggerBundleFill().then()
// testMatchVariables().then()

cancelBundle().then();
// testL1Hash().then();
// triggerExpire().then();
// testHashT4().then();
// verifyH4();