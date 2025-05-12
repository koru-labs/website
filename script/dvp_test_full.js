const hre = require("hardhat");
const {ethers} = hre;
const p = require('poseidon-lite');
const crypto = require("crypto");
const drexAddress = "0xac07D22807D759246e7402DF60964cBC915d6A64";
const dvt1Address = "0xb58d983A5D9EE215A4540329d3d9C7364Bd4Af4c";
const dvt2Address = "0x80245F9D2e2950b028c53A4Bd1851045ff2F53d3";

const client1Address = "0x23eabdd1584Cc04E5962524F48B9c6f4d1Ef98cD";
const client1PrivateKey = "0x5f990426b4495f3d4f089ce948dca5365bf00d72b52c4e0f59bfdba1bd4593e0";

const client2Address = "0x977954402132612Cc1d144E57e16eaf0E4cbcfcB";
const client2PrivateKey = "0xc5446fda20f0b6ae6c24ababad898faa1251cc524783fabf4d84a673c41b74ef";

const bank1Address = "0xa1608Fc30958cD232de765b003D4f3A4995049b6";
const bank1PrivateKey = "0x0740d6df0c4fb2cc880f14a72ac7118ede6d0613417ef35a92a73d9344ad0d0b";

const bank2Address = "0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB";
const bank2PrivateKey = "0x555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787";

const centralBankEscrotingAddress = "0x80245F9D2e2950b028c53A4Bd1851045ff2F53d3";
const bank1EscrotingAddress = "0x42807f0F6C5e8Fc49455CA28c0B116b45AF7af20";
const bank2EscrotingAddress = "0xd6b5DB0bA8Eb51803bD0DBF03041f84Bd6e2F6B9";

const customNetwork = {
    name: "UCL",
    chainId: 1001
};

const options = {
    batchMaxCount: 1,
    staticNetwork: true
};

const centralBankRpcUrl = "http://54.178.62.243:8123";
const bank1RpcUrl = "http://35.78.208.30:8123";
const bank2RpcUrl = "http://13.231.127.203:8123";
const centralBankProvider = new ethers.JsonRpcProvider(centralBankRpcUrl, customNetwork, options);
const bank1Provider = new ethers.JsonRpcProvider(bank1RpcUrl, customNetwork, options);
const bank2Provider = new ethers.JsonRpcProvider(bank2RpcUrl, customNetwork, options);

const amount = 100;

const chunkHash1 = "0x" + crypto.randomBytes(32).toString("hex");
const chunkHash2 = "0x" + crypto.randomBytes(32).toString("hex");
const bundleHash1 = "0x" + p.poseidon2([chunkHash1, chunkHash2]).toString(16).padStart(64, "0")
console.log("chunkHash1", chunkHash1)
console.log("chunkHash2", chunkHash2)
console.log("bundleHash1", bundleHash1)
console.log("-----------------------------------------------------------------------------------")

const chunkHash3 = "0x" + crypto.randomBytes(32).toString("hex");
const chunkHash4 = "0x" + crypto.randomBytes(32).toString("hex");
const bundleHash2 = "0x" + p.poseidon2([chunkHash3, chunkHash4]).toString(16).padStart(64, "0")
console.log("chunkHash3", chunkHash3)
console.log("chunkHash4", chunkHash4)
console.log("bundleHash2", bundleHash2)
console.log("-----------------------------------------------------------------------------------")

async function mintTokens() {
    let HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");

    let bank1Wallet = new ethers.Wallet(bank1PrivateKey, centralBankProvider);
    let HamsaToken = await HamsaTokenFactory.attach(drexAddress).connect(bank1Wallet);
    console.log("bank1 drex pre balance", await HamsaToken.balanceOf(bank1Address));
    await HamsaToken.mint(bank1Address, 1000000000000);
    await sleep(3000);
    console.log("bank1 drex post balance", await HamsaToken.balanceOf(bank1Address));

    // mint dvt1 to bank1
    bank1Wallet = new ethers.Wallet(bank1PrivateKey, bank1Provider);
    HamsaToken = await HamsaTokenFactory.attach(dvt1Address).connect(bank1Wallet);
    console.log("bank1 dvt1 pre balance", await HamsaToken.balanceOf(bank1Address));
    await HamsaToken.mint(bank1Address, 1000000000000);
    await sleep(3000);
    console.log("bank1 dvt1 post balance", await HamsaToken.balanceOf(bank1Address));

    console.log("client1 dvt1 pre balance", await HamsaToken.balanceOf(client1Address));
    await HamsaToken.mint(client1Address, 1000000000000);
    await sleep(3000);
    console.log("client1 dvt1 post balance", await HamsaToken.balanceOf(client1Address));

    // mint dvt2 to bank2
    const client2Wallet = new ethers.Wallet(client2PrivateKey, bank2Provider);
    HamsaToken = await HamsaTokenFactory.attach(dvt2Address).connect(client2Wallet);
    console.log("bank2 dvt2 pre balance", await HamsaToken.balanceOf(bank2Address));
    await HamsaToken.mint(bank2Address, 1000000000000);
    await sleep(3000);
    console.log("bank2 dvt2 post balance", await HamsaToken.balanceOf(bank2Address));

    console.log("client2 dvt2 pre balance", await HamsaToken.balanceOf(client2Address));
    await HamsaToken.mint(client2Address, 1000000000000);
    await sleep(3000);
    console.log("client2 dvt2 post balance", await HamsaToken.balanceOf(client2Address));
}

async function getAllBalance() {
    console.log("---------------------All account balance-----------------------------")
    let HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
    let client1Wallet = new ethers.Wallet(client1PrivateKey, bank1Provider);
    let HamsaToken = await HamsaTokenFactory.attach(dvt1Address).connect(client1Wallet);
    console.log("client1 dvt1 balance", await HamsaToken.balanceOf('0x23eabdd1584Cc04E5962524F48B9c6f4d1Ef98cD'));

    HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
    const bank1Wallet = new ethers.Wallet(bank1PrivateKey, centralBankProvider);
    HamsaToken = await HamsaTokenFactory.attach(drexAddress).connect(bank1Wallet);
    console.log("bank1 drex balance", await HamsaToken.balanceOf(bank1Address));

    HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
    let bank2Wallet = new ethers.Wallet(bank2PrivateKey, centralBankProvider);
    HamsaToken = await HamsaTokenFactory.attach(drexAddress).connect(bank2Wallet);
    console.log("bank2 drex balance", await HamsaToken.balanceOf(bank2Address));

    HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
    bank2Wallet = new ethers.Wallet(bank2PrivateKey, bank2Provider);
    HamsaToken = await HamsaTokenFactory.attach(dvt2Address).connect(bank2Wallet);
    console.log("bank2 dvt2 balance", await HamsaToken.balanceOf(bank2Address));

    HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
    const client2Wallet = new ethers.Wallet(client2PrivateKey, bank2Provider);
    HamsaToken = await HamsaTokenFactory.attach(dvt2Address).connect(client2Wallet);
    console.log("client2 dvt2 balance", await HamsaToken.balanceOf(client2Address));
    console.log("---------------------All account balance-----------------------------")
}

async function bank1Transfer() {
    console.log("---------------------bank1Transfer start-----------------------------")
    const client1Wallet = new ethers.Wallet(client1PrivateKey, bank1Provider);
    const HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
    const HamsaToken = await HamsaTokenFactory.attach(dvt1Address).connect(client1Wallet);
    // approve
    let tx = await HamsaToken.approve(bank1EscrotingAddress, amount);
    await sleep(3000);
    // scheduleTransfer
    const DvpEscortingFactory = await ethers.getContractFactory("DvpEscorting");
    const DvpEscorting = await DvpEscortingFactory.attach(bank1EscrotingAddress).connect(client1Wallet);
    tx = await DvpEscorting.scheduleTransfer(dvt1Address, bank2Address, amount, chunkHash1, bundleHash1);
    await sleep(3000);
    console.log("---------------------bank1Transfer end-----------------------------")
}

async function bank2Transfer() {
    console.log("---------------------bank2Transfer start-----------------------------")
    const bank2Wallet = new ethers.Wallet(bank2PrivateKey, bank2Provider);
    const HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
    const HamsaToken = await HamsaTokenFactory.attach(dvt2Address).connect(bank2Wallet);
    // approve
    let tx = await HamsaToken.approve(bank2EscrotingAddress, amount);
    await sleep(3000);
    // scheduleTransfer
    const DvpEscortingFactory = await ethers.getContractFactory("DvpEscorting");
    const DvpEscorting = await DvpEscortingFactory.attach(bank2EscrotingAddress).connect(bank2Wallet);
    tx = await DvpEscorting.scheduleTransfer(dvt2Address, client2Address, amount, chunkHash2, bundleHash1);
    await sleep(3000);
    console.log("---------------------bank2Transfer end-----------------------------")
}

async function checkBundleTransaction(provider, bundleHash) {
    let BundleTransaction = await provider.send("eth_checkTransactionBundle", [bundleHash]);
    console.log("BundleTransaction", BundleTransaction);
    let status = BundleTransaction.Status;
    while (status !== 2) {
        console.log("bundle status is not 2, continue fetch status, current status is : ", status);
        await sleep(2000);
        BundleTransaction = await provider.send("eth_checkTransactionBundle", [bundleHash]);
        console.log("BundleTransaction", BundleTransaction);
        status = BundleTransaction.Status;
    }
}

async function settlement() {
    // burn dvt1 from bank2 settlement account in bank1 node
    console.log("---------------------settlement start-----------------------------")
    const bank2Wallet = new ethers.Wallet(bank2PrivateKey, bank1Provider);
    let HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
    let HamsaToken = await HamsaTokenFactory.attach(dvt1Address).connect(bank2Wallet);
    // approve
    await HamsaToken.approve(bank1EscrotingAddress, amount);
    await sleep(3000);
    // scheduleBurn
    let DvpEscortingFactory = await ethers.getContractFactory("DvpEscorting");
    let DvpEscorting = await DvpEscortingFactory.attach(bank1EscrotingAddress).connect(bank2Wallet);
    await DvpEscorting.scheduleBurn(dvt1Address, amount, chunkHash3, bundleHash2);
    await sleep(3000);


    // transfer DREX to bank2 from bank1 in central bank node
    const bank1Wallet = new ethers.Wallet(bank1PrivateKey, centralBankProvider);
    HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
    HamsaToken = await HamsaTokenFactory.attach(drexAddress).connect(bank1Wallet);
    // approve
    await HamsaToken.approve(centralBankEscrotingAddress, amount);
    await sleep(3000);
    // scheduleTransfer
    DvpEscortingFactory = await ethers.getContractFactory("DvpEscorting");
    DvpEscorting = await DvpEscortingFactory.attach(centralBankEscrotingAddress).connect(bank1Wallet);
    await DvpEscorting.scheduleTransfer(drexAddress, bank2Address, amount, chunkHash4, bundleHash2);
    await sleep(3000);
    console.log("---------------------settlement end-----------------------------")
}

async function executeBundleTxn(wallet, dvpEscortingAddress, bundleHash) {
    let DvpEscortingFactory = await ethers.getContractFactory("DvpEscorting");
    let DvpEscorting = await DvpEscortingFactory.attach(dvpEscortingAddress).connect(wallet);
    await DvpEscorting.execute(bundleHash);
    await sleep(3000);
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getTokenBalance(provider, tokenAddress, account) {
    let HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
    let HamsaToken = await HamsaTokenFactory.attach(tokenAddress).connect(provider);
    let balance = await HamsaToken.balanceOf(account);
    console.log("balance", balance);
}

async function getEthBalance(provider, account) {
    // 查询地址的 ETH 余额
    const balance = await provider.getBalance(account);
    console.log('eth balance: ', balance);
}

async function getDvpTransactions(provider, dvpEscortingAddress, bundleHash) {
    let DvpEscortingFactory = await ethers.getContractFactory("DvpEscorting");
    let DvpEscorting = await DvpEscortingFactory.attach(dvpEscortingAddress).connect(provider);
    let transactions = await DvpEscorting.Transactions(bundleHash);
    console.log("DvpTransaction", transactions)
}

async function getTransactionReceipt(hash) {
    let transactionReceipt = await bank1Provider.getTransactionReceipt(hash);
    console.log("TransactionReceipt", await transactionReceipt)
    console.log("TransactionReceipt", await transactionReceipt.getTransaction())
}

async function transferEth(account, amount) {
    const bank1Wallet = new ethers.Wallet(bank1PrivateKey, centralBankProvider);
    let wallet = bank1Wallet.connect(centralBankProvider);
    // 创建交易对象
    const tx = {
        to: account,
        value: amount,
    };
    // 发送交易
    const transactionResponse = await wallet.sendTransaction(tx);
    await transactionResponse.wait();
    console.log("交易已发送:", transactionResponse.hash);
    const balance = await bank1Provider.getBalance(account);
    console.log("balance", balance);
}


const centralBankAddress = "0x173e9c0FCad1c3628Bb177299053a71BF5ec1E66";
const tpftAddress = '0x80245F9D2e2950b028c53A4Bd1851045ff2F53d3'
const tpft1002Address = '0xd6b5DB0bA8Eb51803bD0DBF03041f84Bd6e2F6B9'
const tpft1052Address = '0xd152D80F201b74fDE6FcEF206b399d56a24FB45d'
const acronym = "LTN";
const code = "1001";
const maturityDate = 1755734400;
const operationId = 202408260001;
const centralBankPrivateKey = "dd1b675f049d3d275f5274df0c157ef7cd42cd3a538c28fca603d042302e86d4";


async function createTpft() {
    const centralBankWallet = new ethers.Wallet(centralBankPrivateKey, centralBankProvider);
    let tpftFactory = await ethers.getContractFactory("TPFt");
    let tpft = await tpftFactory.attach(tpftAddress).connect(centralBankWallet);
    // 创建TPFtData对象
    const tpftData = {
        acronym: acronym,
        code: code,
        maturityDate: maturityDate
    };
    await tpft.createTPFt(tpftData);
    await sleep(3000);

    let tpFtId = await tpft.getTPFtId(tpftData);
    console.log("new tpFtId ", tpFtId);
}

async function mintTpft() {
    const centralBankWallet = new ethers.Wallet("dd1b675f049d3d275f5274df0c157ef7cd42cd3a538c28fca603d042302e86d4", centralBankProvider);
    let tpftFactory = await ethers.getContractFactory("TPFt");
    let tpft = await tpftFactory.attach(tpftAddress).connect(centralBankWallet);
    // 创建TPFtData对象
    const tpftData = {
        acronym: acronym,
        code: code,
        maturityDate: maturityDate
    };
    let tpFtId = await tpft.getTPFtId(tpftData);
    console.log("mint tpFtId ", tpFtId);
    await tpft.mint("0x173e9c0FCad1c3628Bb177299053a71BF5ec1E66", tpftData, 1000000);
    await sleep(3000);
    let balance = await tpft.balanceOf("0x173e9c0FCad1c3628Bb177299053a71BF5ec1E66", tpFtId);
    console.log("central bank balance", balance);
}

async function transferTpft() {
    const centralBankWallet = new ethers.Wallet(centralBankPrivateKey, centralBankProvider);

    let tpftFactory = await ethers.getContractFactory("TPFt");
    let tpft = await tpftFactory.attach(tpftAddress).connect(centralBankWallet);

    await tpft.setApprovalForAll(tpft1002Address, true);
    await sleep(5000);

    let tpft1002Factory = await ethers.getContractFactory("TPFtOperation1002");
    let tpft1002 = await tpft1002Factory.attach(tpft1002Address).connect(centralBankWallet);

    // 创建TPFtData对象
    const tpftData = {
        acronym: acronym,
        code: code,
        maturityDate: maturityDate
    };
    let tpFtId = await tpft.getTPFtId(tpftData);
    console.log("transfer tpFtId ", tpFtId);
    await tpft1002.auctionPlacement(operationId, centralBankAddress, bank1Address, 0, tpftData, 1000000, 9900000000);
    await sleep(3000);
    let order = await tpft1002.auctionOrders(operationId);
    console.log("tpft order", order);
}

async function getTpftBalance() {
    const centralBankWallet = new ethers.Wallet(centralBankPrivateKey, centralBankProvider);
    let tpftFactory = await ethers.getContractFactory("TPFt");
    let tpft = await tpftFactory.attach(tpftAddress).connect(centralBankWallet);
    // 创建TPFtData对象
    const tpftData = {
        acronym: acronym,
        code: code,
        maturityDate: maturityDate
    };
    let tpFtId = await tpft.getTPFtId(tpftData);
    console.log("balance tpFtId ", tpFtId);
    let balance = await tpft.balanceOf(bank2Address, tpFtId);
    console.log("tpft balance", balance);
}


async function auctionPlacement() {
    const bank1Wallet = new ethers.Wallet(bank1PrivateKey, centralBankProvider);
    let tpft1002Factory = await ethers.getContractFactory("TPFtOperation1002");
    let tpft1002 = await tpft1002Factory.attach(tpft1002Address).connect(bank1Wallet);
    const tpftData = {
        acronym: acronym,
        code: code,
        maturityDate: maturityDate
    };
    let tx = await tpft1002.auctionPlacement(operationId, centralBankAddress, bank1Address, 1, tpftData, 1000, 9900000000);
    await sleep(5000);
    console.log("tx hash", tx.hash);
    let order = await tpft1002.auctionOrders(operationId);
    console.log("order", order);
}

async function scheduleBurn() {
    const bank2Wallet = new ethers.Wallet(bank2PrivateKey, bank1Provider);
    let DvpEscortingFactory = await ethers.getContractFactory("DvpEscorting");
    let DvpEscorting = await DvpEscortingFactory.attach(bank1EscrotingAddress).connect(bank2Wallet);

    let HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
    let HamsaToken = await HamsaTokenFactory.attach(dvt1Address).connect(bank1Provider);
    let balance = await HamsaToken.balanceOf(bank2Address);
    console.log("pre balance", balance);

    let tx = await DvpEscorting.scheduleBurn(dvt1Address, 100, chunkHash1, bundleHash1);
    console.log("tx", tx);
    await sleep(3000);
    balance = await HamsaToken.balanceOf(bank2Address);
    console.log("post balance", balance);
}

// scheduleBurn()

// mintTokens()

// getTokenBalance(bank2Provider, dvt2Address, bank2Address);

// getTransactionReceipt("0xe5dede54dcfd1d9cf3337db61cb56191a18d70999fa85077eeb95aeadc232b3a")

// auctionPlacement()

// transferEth(centralBankAddress, 10000000000000);

// getTpftBalance()

/*createTpft().then(() => {
    return mintTpft();
}).then(() => {
    return transferTpft();
})*/

getAllBalance()
    .then(() => {
        return bank1Transfer();
    })
    .then(() => {
        return bank2Transfer();
    })
    .then(() => {
        return checkBundleTransaction(bank1Provider, bundleHash1);
    })
    .then(() => {
        return checkBundleTransaction(bank2Provider, bundleHash1);
    })
    .then(() => {
        return settlement();
    })
    .then(() => {
        return checkBundleTransaction(bank1Provider, bundleHash2);
    })
    .then(() => {
        return checkBundleTransaction(centralBankProvider, bundleHash2);
    })
    .then(() => {
        return getAllBalance();
    })
    .catch(error => {
        console.error(error);
    });

/*
bank1Transfer()
    .then(() => {
        return bank2Transfer();
    })
    .then(() => {
        const bank1Wallet = new ethers.Wallet(bank1PrivateKey, bank1Provider);
        return executeBundleTxn(bank1Wallet, bank1EscrotingAddress, bundleHash1);
    })
    .then(() => {
        const bank2Wallet = new ethers.Wallet(bank2PrivateKey, bank1Provider);
        return executeBundleTxn(bank2Wallet, bank2EscrotingAddress, bundleHash1);
    })
    .then(() => {
        return getDvpTransactions(bank1Provider, bank1EscrotingAddress, bundleHash1)
    })
    .then(() => {
        return settlement();
    })
    .then(() => {
        const bank1Wallet = new ethers.Wallet(client1PrivateKey, bank1Provider);
        return executeBundleTxn(bank1Wallet, bank1EscrotingAddress, bundleHash2);
    })
    .then(() => {
        const bank1Wallet = new ethers.Wallet(client1PrivateKey, centralBankProvider);
        return executeBundleTxn(bank1Wallet, centralBankEscrotingAddress, bundleHash2);
    })
    .then(() => {
        return getDvpTransactions(bank1Provider, bank1EscrotingAddress, bundleHash2)
    })
    .catch(error => {
        console.error(error);
    });
*/
