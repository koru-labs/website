const hre = require("hardhat");
const {ethers} = hre;
const crypto = require('crypto');
const p = require('poseidon-lite');

const simpleAddress = '0xE7894E639ca33A99e05Fa957B8659dab2b51242D'
const escortingAddress = '0x993120Ffa250CF1879880D440cff0176752c17C2'

const poseidonHashAddress = "0x4A6EA541263c363478da333239E38E96E2cC8653"
const poseidonT4Address = "0x96C1f5d31C4c627d6e84A046D4790cAC4F17d3ED"
const dvpMatchAddress = "0xECB550dE5c73e6690AB4521C03EC9D476617167E"

const bankAppAddress = "0x0f698EB6816DcE963ea5CfABDaaFba3707997dcd"
const defaultProvider = ethers.provider;

const zeroAddress ='0x0000000000000000000000000000000000000000'


// need simple needs to approve dvp-escrow for transaction

const uclProvider = new ethers.JsonRpcProvider("http://localhost:8123",
    {
        name: "UCL",
        chainId: 1001
    },
    {
        batchMaxCount: 1,
        staticNetwork: true
    }
);
const besuProvider = new ethers.JsonRpcProvider("http://localhost:8545",
    {
        name: "Besu",
        chainId: 1337
    },
    {
        batchMaxCount: 1,
        staticNetwork: true
    }
);
const uclWallet = new ethers.Wallet("f7a610afa00eac908941fe2c9f8cd57142408d2edf13aed4e4efa52fe7958ab1", uclProvider);
const besuWallet = new ethers.Wallet("c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3", besuProvider)

async function deploySimpleToken(){
    const SimpleToken = (await ethers.getContractFactory("Simple")).connect(uclWallet)
    const simple = (await SimpleToken.deploy("simple", "$simple"))
    await simple.waitForDeployment()
    console.log("simple is deployed at ", await simple.getAddress())
}

async function approveSimpleForDvpEscrow(){
    const SimpleToken = await ethers.getContractFactory("Simple")
    const simple = SimpleToken.attach(simpleAddress).connect(uclWallet)
    let tx = await simple.approve(escortingAddress, 10000*1000000);
    await tx.wait();
}

async function deployBankApp(){
    const BankApp = (await ethers.getContractFactory("BankApp")).connect(uclWallet);
    const bankApp= await BankApp.deploy(escortingAddress, simpleAddress);
    await bankApp.waitForDeployment();
    console.log("bankApp is deployed at: ", await bankApp.getAddress());
}


async function startStressTest() {
    // ucWallet should have the same address as the first account configured in the L2local network
    console.log("ucl Balance:", await uclProvider.getBalance(await uclWallet.getAddress()))

    const SimpleToken = await ethers.getContractFactory("Simple");
    const simple = await SimpleToken.attach(simpleAddress).connect(uclWallet);
    console.log("sender simpleToken balance", await simple.balanceOf(uclWallet.address));


    const DvpEscorting = await ethers.getContractFactory("DvpEscrow");
    const escorting = await DvpEscorting.attach(escortingAddress).connect(uclWallet);

    const BankApp = await ethers.getContractFactory("BankApp");
    const bankApp = await BankApp.attach(bankAppAddress).connect(uclWallet);


    const [deployer, account1, account2] = await ethers.getSigners()
    const DvpMatch = await ethers.getContractFactory("DvpMatch", {
        signer: deployer[0],
        libraries: {
            PoseidonHasher: poseidonHashAddress,
            PoseidonT4: poseidonT4Address
        }
    });
    const match = DvpMatch.attach(dvpMatchAddress).connect(besuWallet);


    let uclNonce = await uclProvider.getTransactionCount(uclWallet.address)
    let besuNonce = await defaultProvider.getTransactionCount(await account1.getAddress())
    let rounds = 1;

    console.log("besuNonce:", besuNonce, " uclNonce: ", uclNonce)


    for(let i=0;i<rounds;i++) {
        let [chunkHash1, chunkHash2, bundleHash] = await generateHashT4()
        // console.log("chunkHash 1: ", chunkHash1)
        // console.log("chunkHash 2: ", chunkHash2)

        console.log("besuNonce:", besuNonce + i, " uclNonce: ", uclNonce + i)
        let expire = Math.floor(Date.now() / 1000) + 60 * 60 * 1;

        let t1 = await scheduleL2Transfer(escorting, uclWallet, uclNonce + i, chunkHash1, bundleHash, expire)
        // await scheduleL2Mint(escorting, uclWallet, uclNonce + i,  chunkHash1, bundleHash)
        // await scheduleL2Burn(escorting, uclWallet, uclNonce + i,  chunkHash1, bundleHash)
        // let t1 = await scheduleL2TransferThroughBankApp(bankApp, uclWallet, uclNonce+i,  chunkHash1, bundleHash, expire)
        await t1.wait();

        let t2 =  await triggerL1BundleCommit(match, besuWallet,  besuNonce + i,  chunkHash2, bundleHash, expire)
        await t2.wait();

        await testL1MatchVariables(bundleHash)
        // console.log("t2", await t2.wait())
        // console.log("bundleHash: ", bundleHash, "t2: ", t2.hash)
    }
}


async function scheduleL2Transfer(escorting, uclWallet, nonce, chunkHash, bundleHash, expire) {
    let scheduleRequest = {
        tokenAddress: simpleAddress,
        to: '0x08883F8d938055aed23b0A64dcd7fD140028F648',
        tokenType: 0,
        amount: 100,

        index: 0,
        chunkHash: chunkHash,
        bundleHash: bundleHash,
        expireTime: expire,
        sender: zeroAddress
    }

    const data = await escorting.interface.encodeFunctionData("scheduleTransfer",
        [scheduleRequest])

    return uclWallet.sendTransaction({
        type: 0,
        to: escortingAddress,
        nonce: nonce,
        value: 0,
        gasLimit: 700000,
        gasPrice: 1000,
        data: data
    })
}

// triggerDvp(address to, uint256 chunkHash, uint256 bundleHash, uint256 expireTime)
async function scheduleL2TransferThroughBankApp(bankApp, uclWallet, nonce, chunkHash, bundleHash, expire) {
    let to= "0x08883F8d938055aed23b0A64dcd7fD140028F648";

    const data = await bankApp.interface.encodeFunctionData("triggerDvp",
        [to, chunkHash, bundleHash, expire]);

    return uclWallet.sendTransaction({
        type: 0,
        to: bankAppAddress,
        nonce: nonce,
        value: 0,
        gasLimit: 700000,
        gasPrice: 1000,
        data: data
    })
}

async function scheduleL2Mint(escorting, uclWallet, nonce, chunkHash, bundleHash, expire) {
    const data = await escorting.interface.encodeFunctionData("scheduleMint",
        [simpleAddress, "0x08883F8d938055aed23b0A64dcd7fD140028F648", 10, chunkHash, bundleHash, expire])

    return uclWallet.sendTransaction({
        type: 0,
        to: escortingAddress,
        nonce: nonce,
        value: 0,
        gasLimit: 700000,
        data: data
    })
}

async function scheduleL2Burn(escorting, uclWallet, nonce, chunkHash, bundleHash, expire) {
    const data = await escorting.interface.encodeFunctionData("scheduleBurn",
        [simpleAddress, 1000, chunkHash, bundleHash, expire])

    return uclWallet.sendTransaction({
        type: 0,
        to: escortingAddress,
        nonce: nonce,
        value: 0,
        gasLimit: 700000,
        data: data
    })
}

async function triggerL1BundleCommit(match, besuWallet, nonce,chunkHash, bundleHash, expire) {
    const [deployer, account1, account2] = await ethers.getSigners()
    console.log("balance: ", await  defaultProvider.getBalance(account1.address));

    let newBlockHash="0xd5ec7708486a709f9ec981eb0232998a5b4808d554b076bd947d31f2211b8c10";
    let newStateRoot ="0x5940c5d24a7f038efc2f5fb92b41e86e5e727a574b927957da341be13faf5dac";
    let newTransactionRoot="0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421";
    let newReceiptRoot="0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421"

    let bundleRequest ={
        blockNum: 2,
        transactionHash: chunkHash,
        chunkHash: chunkHash,
        bundleHash: bundleHash,
        expireTime: expire,
        index: 1
    }

    const data = await match.interface.encodeFunctionData("commitBatchWithBundles",
        [2, newBlockHash, newStateRoot, newTransactionRoot, newReceiptRoot, [bundleRequest]])

    let tx = {
        type : 0,
        to: dvpMatchAddress,
        nonce: nonce,
        value: 0,
        gasLimit: 300000,
        gasPrice : 1000,
        data: data
    }
    return account1.sendTransaction(tx)
}

async function generateHashT4() {
    const chunkHash1 = "0x" + crypto.randomBytes(32).toString("hex");
    const chunkHash2 = "0x" + crypto.randomBytes(32).toString("hex");

    console.log("chunkHash1", chunkHash1)
    console.log("chunkHash2", chunkHash2)
    const bundleHash = "0x" + p.poseidon3([chunkHash1, chunkHash2, '0x0']).toString(16).padStart(64, "0");

    console.log("bundleHash: ", bundleHash)
    return [chunkHash1, chunkHash2, bundleHash];
}

async function testL1MatchVariables(bundleHash) {
    const [deployer] = await ethers.getSigners()

    const DvpMatch = await ethers.getContractFactory("DvpMatch", {
        signer: deployer[0],
        libraries: {
            PoseidonHasher: poseidonHashAddress,
            PoseidonT4: poseidonT4Address
        }
    });
    const match = DvpMatch.attach(dvpMatchAddress);

    console.log("bundle", await match.bundleMap(bundleHash));
    console.log("expired", await match.bundleExpired(bundleHash));
    console.log("filled", await match.bundleFilled(bundleHash));

}

async function verifyTransaction() {
    let hash = "0x8e4ba755e3f9d2f63d234da31eda36dea984d603b70e7b2bba3b4a5869bc800f";
    // let hash ="0x7d738df7b700e4912f6e7ff8ddf59ff94c82d7b3058d00620bf5c7861145b147"
    // let tx = await defaultProvider.getTransaction(hash) ;
    //
    // console.log("tx: ", tx)

    let r = await defaultProvider.getTransactionReceipt(hash)
    console.log("r: ", r)
}


async function getNonce() {
    const uclProvider = new ethers.JsonRpcProvider("http://localhost:8123",
        {
            name: "UCL",
            chainId: 1001
        },
        {
            batchMaxCount: 1,
            staticNetwork: true
        }
    );

    const uclWallet = new ethers.Wallet("5f990426b4495f3d4f089ce948dca5365bf00d72b52c4e0f59bfdba1bd4593e0", uclProvider);
    for (let i = 1; i < 100000;) {
        let nonce = await uclWallet.getNonce()
        console.log("nonce", nonce)
    }
}

async function checkTransactionStatus(bundleHash){
    const DvpEscrow = await ethers.getContractFactory("DvpEscrow");
    const dvpEscrow = await DvpEscrow.attach(escortingAddress).attach(uclWallet);
    let slot  = await dvpEscrow.Transactions(bundleHash)

    console.log("slot: ", slot)
}

// deploySimpleToken().then()
// approveSimpleForDvpEscrow().then()
// deployBankApp().then()
// getNonce().then()
// verifyTransaction().then()
// testL1MatchVariables("0x2b614e74d110d1e016c838a272b6da6fc923cc468a03048ca6cc4c7b63b119fd").then()
// checkBalance().then()

// checkTransactionStatus("0x143e2100af663ce88421e5d897cce424fc2620ef3996ef7bd19c20f347fb38b9").then()
startStressTest().then()

