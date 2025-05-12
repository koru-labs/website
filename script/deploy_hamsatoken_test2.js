const hre = require("hardhat");
const {ignition, ethers} = hre;
const provider = ethers.provider;

const contractAddress = '0xE7894E639ca33A99e05Fa957B8659dab2b51242D';

const userTest = "0x977954402132612Cc1d144E57e16eaf0E4cbcfcB";

testNonce().then();

async function testNonce() {
    const [userA] = await ethers.getSigners()

    const userAEthBalance = await getEthBalance(userA.address);
    console.log("userAEthBalance：", userAEthBalance);
    const ChildToken = await ethers.getContractFactory("HamsaToken");
    const child = await ChildToken.deploy();
    await child.waitForDeployment();
    console.log("部署用户地址：", userA.address);
    console.log("部署合约地址：", child.target)
    let amount = 100;
    let mintTx = await child.mint(userA.address, amount);
    // await mintTx.wait();
    console.log("mint amount done")
    // const balance = await child.balanceOf(userA.address)
    // console.log("userA的余额: " + balance)
    let approveTx = await child.approve(userTest, amount);
    // await approveTx.wait();
    console.log("approve amount done");
}


async function main() {
    const [userA] = await ethers.getSigners()

    const userAEthBalance = await getEthBalance(userA.address);
    console.log("userAEthBalance：", userAEthBalance);


    const ChildToken = await ethers.getContractFactory("HamsaToken");
    const child = await ChildToken.deploy();
    await child.waitForDeployment();

    console.log("部署用户地址：", userA.address);

    // // var address = "0x018bd741Ef1252343480E631C190C54Ea2eEF639";
    // // const child = await hre.ethers.getContractAt("HamsaToken", address);
    console.log("部署合约地址：", child.target)


    let amount = 100;
    let mintTx = await child.mint(userA.address, amount);
    // await mintTx.wait();
    console.log("mint amount done")
    // const balance = await child.balanceOf(userA.address)
    // console.log("userA的余额: " + balance)
    let approveTx = await child.approve(userTest, amount);
    // await approveTx.wait();
    console.log("approve amount done");
    // const allowance = await child.allowance(userA.address, userTest);
    // console.log("授权userTest金额: " + allowance);
    // console.log("mint：", txmint)
    // await txmint.wait()
    // const balance = await child.balanceOf(userA.address)
    // console.log("userA的余额: " + balance)

    // await aproveTx.wait();
    // const allowance = await child.allowance(userA.address,userTest);
    // console.log("后-授权userTest金额: " + allowance);


    // // 获取用户 B 的钱包实例（假设已经有用户 B 的钱包）
    // const userBWallet = new ethers.Wallet("0xc5446fda20f0b6ae6c24ababad898faa1251cc524783fabf4d84a673c41b74ef", ethers.provider);
    // const userCWallet = new ethers.Wallet("0x0740d6df0c4fb2cc880f14a72ac7118ede6d0613417ef35a92a73d9344ad0d0b", ethers.provider);
    //
    // const userBEthBalance = await getEthBalance(userBWallet.address);
    // console.log("userBEthBalance：", userBEthBalance);
    // const userCEthBalance = await getEthBalance(userCWallet.address);
    // console.log("userCEthBalance：", userCEthBalance);
    //
    // if (userBEthBalance < 1) {
    //     await transferEth(userA, userBWallet.address);
    //     const userBEthBalance = await getEthBalance(userBWallet.address);
    //     console.log("userBEthBalance：", userBEthBalance);
    // }
    // if (userCEthBalance < 1) {
    //     await transferEth(userA, userCWallet.address);
    //     const userCEthBalance = await getEthBalance(userCWallet.address);
    //     console.log("userCEthBalance：", userCEthBalance);
    // }


// 用户A 给用户 B 转账 1000 个代币
//     let txTransfer = await child.connect(userA).transfer(userBWallet.address, 100000);
//     await txTransfer.wait()
//
//     const userBWalletBalance = await child.balanceOf(userBWallet.address)
//     console.log("userB的余额: " + userBWalletBalance)


// 用户 B 授权用户 C 500个代币
//     console.log("userB approve start")
//     let tx = await child.connect(userBWallet).approve(userCWallet.address, 500);
//     await tx.wait()
//     console.log("userB approve finished")


// 用户 B 转账给用户 C 10 个代币（这里假设已经授权成功）
//     txTransfer = await child.connect(userBWallet).transfer(userCWallet.address, 10);
//     await txTransfer.wait()
//
//     const userCWalletBalance2 = await child.balanceOf(userBWallet.address)
//     console.log("userB的余额: " + userCWalletBalance2)
}

// transferEth1().then();
async function transferEth1() {
    // const [userA] = await ethers.getSigners();
    // await transferEth(userA, "0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB");

    const userAEthBalance = await getEthBalance("0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB");
    console.log("userAEthBalance：", userAEthBalance);
}


async function transferEth(sender, receiverAddress) {
    // 构建转账交易
    const tx = {
        to: receiverAddress,
        value: ethers.parseEther("100")
    };

    // 发送交易
    const sendTx = await sender.sendTransaction(tx);

    // 等待交易确认
    await sendTx.wait();
}


async function getEthBalance(address) {
    // 查询当前账户的以太币余额（这里说的 gas 余额不准确，更准确是以太币余额）
    let balance = await provider.getBalance(address);
    // 将余额从 Wei 转换为 Ether（以数字形式）
    const balanceInEther = ethers.formatEther(balance);
    return parseFloat(balanceInEther);
}

async function testSmartContractStorage() {
    const [userA] = await ethers.getSigners()
    const userAEthBalance = await getEthBalance(userA.address);
    console.log("userAEthBalance：", userAEthBalance);


    const ChildToken = await ethers.getContractFactory("HamsaToken");
    const child = await ChildToken.attach("0x7a628D2616FC4449F1eCf19DbCBF4B7446e2e14e");

    const userBWallet = new ethers.Wallet("0xc5446fda20f0b6ae6c24ababad898faa1251cc524783fabf4d84a673c41b74ef", ethers.provider);
    const userCWallet = new ethers.Wallet("0x0740d6df0c4fb2cc880f14a72ac7118ede6d0613417ef35a92a73d9344ad0d0b", ethers.provider);

    let txTransfer = await child.connect(userBWallet).transfer(userCWallet.address, 10);
    await txTransfer.wait()
    const userCWalletBalance2 = await child.balanceOf(userBWallet.address)
    console.log("userB的余额: " + userCWalletBalance2)
}

async function testGlobalState() {
    const [userA] = await ethers.getSigners()

    let userAEthBalance = await provider.getBalance(userA.address);
    console.log("userAEthBalance：", userAEthBalance);

    let tx = await userA.sendTransaction({
        to: "0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB",
        value: 100
    })
    await tx.wait()

    userAEthBalance = await provider.getBalance(userA.address);
    console.log("userAEthBalance：", userAEthBalance);
}

function sleep(ms) {
    return new Promise((resolve) => {
        if (ms <= 0) {
            resolve();
            return;
        }
        setTimeout(() => sleep(ms - 100).then(resolve), 100);
    });
}

async function stresssTest() {
    const [userA, userB, userC] = await ethers.getSigners()

    let userAEthBalance = await provider.getBalance(userA.address);
    console.log("userAEthBalance：", userAEthBalance);

    let nonce1 = await provider.getTransactionCount(userA.address)
    console.log("nonce1", nonce1)

    for (let i = 0; i < 3000; i++) {
        let tx = await userA.sendTransaction({
            to: "0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB",
            value: 1,
            nonce: nonce1 + i
        })
    }

    let nonce2 = await provider.getTransactionCount(userB.address)
    console.log("nonce2", nonce2)
    for (let i = 0; i < 3000; i++) {
        let tx = await userB.sendTransaction({
            to: "0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB",
            value: 1,
            nonce: nonce2 + i
        })
    }

    let nonce3 = await provider.getTransactionCount(userC.address)
    console.log("nonce3", nonce3)
    for (let i = 0; i < 3000; i++) {
        let tx = await userC.sendTransaction({
            to: "0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB",
            value: 1,
            nonce: nonce3 + i
        })
    }
}


// testGlobalState().then()
// testSmartContractStorage().then()
async function getEthBalance2() {
    const [userA] = await ethers.getSigners()

    // let address = userA.address
    let address = "fe3b557e8fb62b89f4916b721be55ceb828dbd73"
    // 查询当前账户的以太币余额（这里说的 gas 余额不准确，更准确是以太币余额）
    let balance = await provider.getBalance(userA.address);
    // 将余额从 Wei 转换为 Ether（以数字形式）
    const balanceInEther = ethers.formatEther(balance);
    let number = parseFloat(balanceInEther);
    console.log("当前账户的以太币余额：", number)
}


// stresssTest().then()
// getEthBalance2().then();
// main().catch((error) => {
//     console.log(error)
// })