const hre = require("hardhat");
const {ignition, ethers} = hre;

async function main() {
    let [deployer] = await ethers.getSigners();
    let nonce = await ethers.provider.getTransactionCount(deployer.address)
    console.log("nonce", nonce);
    const contractBalance = await ethers.provider.getBalance(deployer.address);
    console.log("address:", deployer.address.toLowerCase(), ",contractBalance:", contractBalance);

    //测试estimateGas方法转账
    // const transaction = {
    //     to: '0xa433d964c8d80bc996f54217b93255be2b395b79', // 接收者地址
    //     data: '0xa9059cbb000000000000000000000000a433d964c8d80bc996f54217b93255be2b395b790000000000000000000000000000000000000000000000000000000000000001' // 交易数据（例如函数调用）
    // };

    //测试estimateGas方法的空操作
    // const transaction = {
    //     to: ethers.ZeroAddress,  // 空地址
    //     // to: '0xa433d964c8d80bc996f54217b93255be2b395b79', // 接收者地址
    //     value: 0  // 金额为 0
    // };
    // const gasLimit = await ethers.provider.estimateGas(transaction);
    // console.log("gasLimit:", gasLimit.toString());

    // 0xf3deab8df5c5e7faee261f2aba443a74eef87852ceed3d934db99fd0aa698d32
    // const transactionReceiptHash = "0xf3deab8df5c5e7faee261f2aba443a74eef87852ceed3d934db99fd0aa698d32";
    // const transactionReceipt = await ethers.provider.getTransactionReceipt(transactionReceiptHash);
    // console.log("transactionReceipt:", transactionReceipt.status);


}


main().then()
