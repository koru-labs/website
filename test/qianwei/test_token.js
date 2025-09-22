const hre = require("hardhat");
const {ignition, ethers} = hre;
const provider = ethers.provider;

const contractAddress = '0xa918ac1c8860C3b35A5dFFd9bdFA3994e383c820';

const userTest = "0x977954402132612Cc1d144E57e16eaf0E4cbcfcB";



async function testDeployToken() {
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
    await mintTx.wait();
    console.log("mint amount done")
    const balance = await child.balanceOf(userA.address)
    console.log("userA的余额: " + balance)
    // let approveTx = await child.approve(userTest, amount);
    // await approveTx.wait();
    // console.log("approve amount done");
}

async function testFindToken() {
    const [userA] = await ethers.getSigners()

    const ChildToken = await ethers.getContractFactory("HamsaToken");
    const child = await ChildToken.attach(contractAddress);
    const balance = await child.balanceOf(userA.address)
    console.log("userA的余额: " + balance)
}


async function main() {
    const [userA] = await ethers.getSigners()

    // const userAEthBalance = await getEthBalance(userA.address);
    const userAEthBalance = await getEthBalance("0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB");
    // console.log("用户地址：", userA.address);
    console.log("0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB：", userAEthBalance);
    //
    //
    // const ChildToken = await ethers.getContractFactory("HamsaToken");
    // const child = await ChildToken.deploy();
    // await child.waitForDeployment();
    //


    // var address = "0xb4B46bdAA835F8E4b4d8e208B6559cD267851051";
    // var address = "0x703848F4c85f18e3acd8196c8eC91eb0b7Bd0797";
    // // var address = "0x0643D39D47CF0ea95Dbea69Bf11a7F8C4Bc34968";
    // const child = await hre.ethers.getContractAt("HamsaToken", address);
    // console.log("合约地址：", child.target)
    // const balance = await child.balanceOf(userA.address)
    // console.log("userA的余额: " + balance)


    // let amount = 100;
    // let mintTx = await child.mint(userA.address, amount);
    // await mintTx.wait();
    // console.log("mint amount done")
    // const balance = await child.balanceOf(userA.address)
    // console.log("userA的余额: " + balance)
    // let approveTx = await child.approve(userTest, amount);
    // await approveTx.wait();
    // console.log("approve amount done");
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
    const [userA] = await ethers.getSigners();
    await transferEth(userA, "0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB");

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

// const accounts = [
//     {
//         address: "0x26602fAE94ccAA633fB5C2c2510E2d5149f470e5",
//         privateKey: "0xd857f30957a39f2185c2db6e98ce064673c878df9efccd35d8ce23c882a5a0ab"
//     },
//     {
//         address: "0xE4c0F735Dc58AC1C8A92E890BD34891d4E35B3D1",
//         privateKey: "0xee58f20bdaf4d78131d3fa9f6932843545284bc67b5b3951377f783ed6ba252f"
//     },
//     {
//         address: "0x328d520C836fc1C74F9a5795603B1d57ca858180",
//         privateKey: "0xb9a04b6d2fb19f688099d3632c67f992f700640ded7173d1291a5b2bc64ea691"
//     },
//     {
//         address: "0xf9e2b176F81ECF78cF1Caf75639A4C81e7458180",
//         privateKey: "0x3ef17fdbfcac8ce7543420dd9cd3493bcea5a4836cfa59e76db5ab67a55c064d"
//     },
//     {
//         address: "0xAf28DAE47b53cFB610b505d11baE8B3Fd148eADd",
//         privateKey: "0x6f808d43fce5190d82cf0662eb7b5a1ee6d7b929c59993a4eee9640ecfb7efa3"
//     },
//     {
//         address: "0x967Bebc8AC5e61487EcE11c099086E2ceb4EB09D",
//         privateKey: "0x4eb7b1f50854a634194ecd7fb784ae6249e1a144fda71d18170a0ef1076415bd"
//     },
//     {
//         address: "0x6B7704860E5Efbd146C95594Fc0Da2ceE8a95826",
//         privateKey: "0x09aecf6d49ff3068c51ba55df4b1dbd5fe0e211105e7c4d48927472f10d6ed7a"
//     }
// ];

const accounts = [
    // {
    //     address: "0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB",
    //     privateKey: "0xd857f30957a39f2185c2db6e98ce064673c878df9efccd35d8ce23c882a5a0ab"
    // },
    // {
    //     address: "0xf17f52151EbEF6C7334FAD080c5704D77216b732",
    //     privateKey: "0xee58f20bdaf4d78131d3fa9f6932843545284bc67b5b3951377f783ed6ba252f"
    // },
    // {
    //     address: "0xfAdb253d9AD9b2d6D37471fA80F398f76D8347B8",
    //     privateKey: "0xb9a04b6d2fb19f688099d3632c67f992f700640ded7173d1291a5b2bc64ea691"
    // },
    // {
    //     address: "0xfe3b557e8fb62b89f4916b721be55ceb828dbd73",
    //     privateKey: "0x3ef17fdbfcac8ce7543420dd9cd3493bcea5a4836cfa59e76db5ab67a55c064d"
    // },
    // {
    //     address: "57829d5E80730D06B1364A2b05342F44bFB70E8f",
    //     privateKey: "0x6f808d43fce5190d82cf0662eb7b5a1ee6d7b929c59993a4eee9640ecfb7efa3"
    // },
    // {
    //     address: "0x93d2Ce0461C2612F847e074434d9951c32e44327",
    //     privateKey: "0x4eb7b1f50854a634194ecd7fb784ae6249e1a144fda71d18170a0ef1076415bd"
    // },
    {
        address: "fE5acd71116FB8a03510FF171222F01164609c97",
        privateKey: "0x09aecf6d49ff3068c51ba55df4b1dbd5fe0e211105e7c4d48927472f10d6ed7a"
    }
];
async function batchTransferEth() {
    const [sender] = await ethers.getSigners();
    const balance = await ethers.provider.getBalance(sender.address);
    console.log(`sender 地址: ${sender.address}`);
    console.log(`sender 余额: ${balance} ETH`);

    const amount = ethers.parseEther("100"); // 每个账户转1 ETH

    // 批量转账
    for (const account of accounts) {
        try {
            const tx = await sender.sendTransaction({
                to: account.address,
                value: amount
            });
            console.log(`转账到 ${account.address} 交易已发送，哈希: ${tx.hash}`);
            await tx.wait();
            console.log(`转账到 ${account.address} 已确认`);
        } catch (error) {
            console.error(`转账到 ${account.address} 失败:`, error.message);
        }
    }

    // 查询余额
    console.log("\n开始查询账户余额:");
    for (const account of accounts) {
        const balance = await ethers.provider.getBalance(account.address);
        console.log(`${account.address} 余额: ${balance} ETH`);
    }
}

// batchTransferEth().then();
// stresssTest().then()
// getEthBalance2().then();
// main().catch((error) => {
//     console.log(error)
// })
testDeployToken().then();
// testFindToken().then();