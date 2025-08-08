const { ethers,hre } = require("hardhat");
const axios = require('axios');

async function main() {
    // 使用ucl_L2网络配置
    const provider = ethers.provider;
    const accounts = await ethers.getSigners();
    const sender = accounts[8];
    const receiver = accounts[9];

    console.log(`测试开始，发送方: ${sender.address}`);
    console.log(`接收方: ${receiver.address}`);


    let txCount = 0;
    let lastBlockNumber = await provider.getBlockNumber();

    // 在区块信息打印处添加
    const block = await provider.getBlock(lastBlockNumber);
    console.log(`区块Gas限制: ${block.gasLimit}`);
    console.log(`区块使用Gas: ${block.gasUsed}`);
    console.log(`平均每笔交易Gas: ${Number(block.gasUsed)/Number(block.transactions.length)}`);


    let maxTps = 0;
    const BATCH_SIZE = 1500; // 每批发送的交易数量

    try {
        let nonce = await provider.getTransactionCount(sender.address);

        while (true) {
            const txPromises = [];
            for (let i = 0; i < BATCH_SIZE; i++) {
                txPromises.push(
                    sender.sendTransaction({
                        to: receiver.address,
                        value: ethers.parseEther("0.0001"),
                        gasLimit: 21000,
                        nonce: nonce++
                    }).catch(async e => {
                        if (e.message.includes("already known") || e.code === "ECONNRESET") {
                            console.log("连接问题或重复交易，等待后重试...");
                            await new Promise(resolve => setTimeout(resolve, 2000));
                            return sender.sendTransaction({
                                to: receiver.address,
                                value: ethers.parseEther("0.0001"),
                                gasLimit: 21000,
                                nonce: nonce-1 // 使用相同的nonce重试
                            });
                        }
                        throw e;
                    })
                );
            }

            const results = await Promise.all(txPromises);
            txCount += results.length;

            // 等待区块确认
            const currentBlock = await provider.getBlock("latest");
            if (currentBlock.number > lastBlockNumber) {
                const block = await provider.getBlock(lastBlockNumber);
                const blockTxCount = block.transactions.length;

                // 计算TPS
                const tps = blockTxCount / (block.timestamp - (await provider.getBlock(lastBlockNumber - 1)).timestamp);
                maxTps = Math.max(maxTps, tps);

                console.log(`已发送 ${txCount} 笔交易 | 最新区块 #${currentBlock.number} 包含 ${blockTxCount} 笔交易 | 当前TPS: ${tps.toFixed(2)} | 最高TPS: ${maxTps.toFixed(2)}`);

                lastBlockNumber = currentBlock.number;
            } else {
                console.log(`已发送 ${txCount} 笔交易 | 等待区块确认...`);
            }

            // 适当延迟避免过载
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (error) {
        console.log(`测试结束，共发送 ${txCount} 笔交易`);
        console.log(`错误信息: ${error.message}`);
    }
}





async function batchSendTransactions() {
    const { ethers } = require("hardhat");
    const axios = require("axios");

    const providerUrl = "http://qa-ucl-l2.hamsa-ucl.com:8545";
    const provider = new ethers.JsonRpcProvider(providerUrl);
    const accounts = await ethers.getSigners();
    const sender = accounts[8];
    const receiver = accounts[9];
    const BATCH_SIZE = 5000;

    // 获取发送者的私钥（需要先在Hardhat配置中设置）
    const senderPrivateKey = "f951e1bd9ef0359e6886ae77e5fd30d566ef098d099c78fd3fb68588657618cc"; // 替换为实际私钥
    const wallet = new ethers.Wallet(senderPrivateKey, provider);

    console.log(`测试开始，发送方: ${wallet.address}`);
    console.log(`接收方: ${receiver.address}`);

    let txCount = 0;
    let maxTps = 0;
    let lastBlockNumber = await provider.getBlockNumber();

    try {
        let nonce = await provider.getTransactionCount(wallet.address, "latest");
        const chainId = (await provider.getNetwork()).chainId;

        while (true) {
            const batchPayload = [];

            // 1. 批量签名交易
            for (let i = 0; i < BATCH_SIZE; i++) {
                const tx = {
                    to: receiver.address,
                    value: ethers.parseEther("0.0001"),
                    gasLimit: 21000,
                    nonce: nonce + i,
                    chainId: chainId,
                    type: 0
                };
                const signedTx = await wallet.signTransaction(tx); // 使用Wallet而不是Signer

                batchPayload.push({
                    jsonrpc: "2.0",
                    id: nonce + i + 1,
                    method: "eth_sendRawTransaction",
                    params: [signedTx]
                });
            }

            // 2. 发送批量请求
            const response = await axios.post(providerUrl, batchPayload, {
                headers: { "Content-Type": "application/json" }
            });

            txCount += BATCH_SIZE;
            nonce += BATCH_SIZE;

            // 3. 更新区块信息并计算TPS
            const currentBlock = await provider.getBlock("latest");
            if (currentBlock.number > lastBlockNumber) {
                const block = await provider.getBlock(lastBlockNumber);
                const blockTxCount = block.transactions.length;

                const tps = blockTxCount / (block.timestamp - (await provider.getBlock(lastBlockNumber - 1)).timestamp);
                maxTps = Math.max(maxTps, tps);

                console.log(`已发送 ${txCount} 笔交易 | 最新区块 #${currentBlock.number} 包含 ${blockTxCount} 笔交易 | 当前TPS: ${tps.toFixed(2)} | 最高TPS: ${maxTps.toFixed(2)}`);
                lastBlockNumber = currentBlock.number;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (error) {
        console.log(`测试结束，共发送 ${txCount} 笔交易`);
        console.log(`错误信息: ${error.message}`);
    }
}

// main().then();

batchSendTransactions().then();
