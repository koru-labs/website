const {ethers, network}=require("hardhat");
const {networks} = require("../../hardhat.config");
const {ether} = require("@openzeppelin/test-helpers");
const { expect } = require("chai");

const simpleTokenAddress = "0xC8c03647d39a96f02f6Ce8999bc22493C290e734";

const cluster_node1_url = "http://L2-node1.hamsa-ucl.com:8545";
const cluster_node2_url = "http://L2-node2.hamsa-ucl.com:8545";
const cluster_node3_url = "http://L2-node3.hamsa-ucl.com:8545";
const l1CustomNetwork = {
    name: "BESU",
    chainId: 1337
};
const options = {
    batchMaxCount: 1,
    staticNetwork: true
};
const node1_provider = new ethers.JsonRpcProvider(cluster_node1_url, l1CustomNetwork, options);
const node2_provider = new ethers.JsonRpcProvider(cluster_node2_url, l1CustomNetwork, options);
const node3_provider = new ethers.JsonRpcProvider(cluster_node3_url, l1CustomNetwork, options);
async function printNetwork(){
    const net = await ethers.provider.getNetwork();
    console.log("Chain ID:", net.chainId);
}
async function testNodeConnections() {
    const providers = [
        { name: "Node1", provider: node1_provider },
        { name: "Node2", provider: node2_provider },
        { name: "Node3", provider: node3_provider }
    ];

    for (const { name, provider } of providers) {
        try {
            const network = await provider.getNetwork();
            const blockNumber = await provider.getBlockNumber();
            console.log(`${name} - ChainId: ${network.chainId}, Block: ${blockNumber}`);
        } catch (error) {
            console.error(`Failed to connect to ${name}:`, error.message);
        }
    }
}
async function deploySimpleToken(){
    const SimpleToken = await ethers.getContractFactory("SimpleToken");
    const simpleToken = await SimpleToken.deploy("simple", "$S");
    await simpleToken.waitForDeployment();
    console.log("SimpleToken is deployed at: ", simpleToken.target);
}

async function deployToNodes() {
    const [signer] = await ethers.getSigners();

    const providers = [
        { name: "Node1", provider: node1_provider },
        // { name: "Node2", provider: node2_provider },
        // { name: "Node3", provider: node3_provider }
    ];

    for (const { name, provider } of providers) {
        try {
            const connectedSigner = signer.connect(provider);
            const SimpleToken = await ethers.getContractFactory("SimpleToken");
            const simpleToken = await SimpleToken.connect(connectedSigner).deploy("simple", "$S");
            await simpleToken.waitForDeployment();
            console.log(`${name} - SimpleToken deployed at:`, simpleToken.target);
        } catch (error) {
            console.error(`Error deploying to ${name}:`, error.message);
        }
    }
}
async function getBalance(address){
    const SimpleToken = await ethers.getContractFactory("SimpleToken");
    const simpleToken = await SimpleToken.attach(simpleTokenAddress);
    let balance = await simpleToken.balanceOf(address);
    return balance;
}
async function checkBalanceAtCluster(address) {
    const providers = [
        { name: "Node1", provider: node1_provider },
        { name: "Node2", provider: node2_provider },
        { name: "Node3", provider: node3_provider }
    ];

    const balances = {};

    for (const { name, provider } of providers) {
        // 获取网络信息
        const network = await provider.getNetwork();
        // console.log(`${name} - ChainId: ${network.chainId}`);

        const code = await provider.getCode(simpleTokenAddress);
        if (code === '0x') {
            console.log(`${name} - Contract not found at ${simpleTokenAddress}`);
            balances[name] = "CONTRACT_NOT_FOUND";
            continue;
        }

        const SimpleToken = await ethers.getContractFactory("SimpleToken");
        const simpleToken = await SimpleToken.attach(simpleTokenAddress).connect(provider);
        const balance = await simpleToken.balanceOf(address);
        balances[name] = balance;
    }

    return balances;
}
async function checkBlockchainConsistency() {
    const providers = [
        { name: "Node1", provider: node1_provider },
        { name: "Node2", provider: node2_provider },
        { name: "Node3", provider: node3_provider }
    ];

    const states = {};

    for (const { name, provider } of providers) {
        try {
            // 检查区块高度
            const blockNumber = await provider.getBlockNumber();

            // 检查最新区块哈希
            const latestBlock = await provider.getBlock("latest");

            // 检查网络ID
            const network = await provider.getNetwork();

            states[name] = {
                blockNumber: blockNumber,
                latestBlockHash: latestBlock.hash,
                chainId: network.chainId
            };

            console.log(`${name} - Block: ${blockNumber}, ChainId: ${network.chainId}`);
        } catch (error) {
            console.error(`Error checking ${name}:`, error.message);
            states[name] = "ERROR";
        }
    }

    return states;
}
async function checkTransactionSync(txHash) {
    const providers = [
        { name: "Node1", provider: node1_provider },
        { name: "Node2", provider: node2_provider },
        { name: "Node3", provider: node3_provider }
    ];

    const txStatuses = {};

    for (const { name, provider } of providers) {
        try {
            // 检查交易是否在所有节点上都被确认
            const txReceipt = await provider.getTransactionReceipt(txHash);
            txStatuses[name] = {
                found: !!txReceipt,
                blockNumber: txReceipt ? txReceipt.blockNumber : null,
                status: txReceipt ? txReceipt.status : null
            };
        } catch (error) {
            console.error(`Error checking transaction on ${name}:`, error.message);
            txStatuses[name] = "ERROR";
        }
    }

    return txStatuses;
}
async function checkGasConsistency() {
    const providers = [
        { name: "Node1", provider: node1_provider },
        { name: "Node2", provider: node2_provider },
        { name: "Node3", provider: node3_provider }
    ];

    const gasInfo = {};

    for (const { name, provider } of providers) {
        try {
            const feeData = await provider.getFeeData();
            gasInfo[name] = {
                gasPrice: feeData.gasPrice?.toString(),
                maxFeePerGas: feeData.maxFeePerGas?.toString(),
                maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString()
            };
        } catch (error) {
            console.error(`Error checking gas on ${name}:`, error.message);
            gasInfo[name] = "ERROR";
        }
    }

    return gasInfo;
}
async function transfer(toAddress, amount){
    const [signer] = await ethers.getSigners();
    const SimpleToken = await ethers.getContractFactory("SimpleToken");
    const simpleToken = await SimpleToken.attach(simpleTokenAddress);
    let tx = await simpleToken.transfer(toAddress, amount);
    await tx.wait();
    return tx.hash;
}
describe("Check balance at different cluster after transfer", function () {
    this.timeout(120000)
    const receiver_address = "0x4312488937D47A007De24d48aB82940C809EEb2b";

    it.skip('Deploy contract ', async () => {
        await deploySimpleToken()
    });
    it('check blockchain consistency', async () => {
        const states = await checkBlockchainConsistency();
        console.log("Blockchain states:", states);

        // 验证所有节点的chainId一致
        const chainIds = Object.values(states).map(state => state.chainId);
        const allSameChainId = chainIds.every(id => id === chainIds[0]);
        expect(allSameChainId).to.be.true;
    });
    it('check gas consistency', async () => {
        const gasInfo = await checkGasConsistency();
        console.log("Gas information:", gasInfo);
    });
    it('transfer and check synchronization', async () => {
        // 检查转账前余额
        const preBalances = await checkBalanceAtCluster(receiver_address);
        // 执行转账
        const txHash = await transfer(receiver_address, 100);
        // 检查转账后余额
        const postBalances = await checkBalanceAtCluster(receiver_address);
        // 验证余额增加
        expect(postBalances["Node1"]).to.equal(preBalances["Node1"] + 100n);
        expect(postBalances["Node2"]).to.equal(preBalances["Node2"] + 100n);
        expect(postBalances["Node3"]).to.equal(preBalances["Node3"] + 100n);

        // 检查交易在所有节点上的同步情况
        const txSyncStatus = await checkTransactionSync(txHash);
        console.log("Transaction sync status:", txSyncStatus);

        // 验证交易在所有节点上都被确认
        Object.values(txSyncStatus).forEach(status => {
            expect(status.found).to.be.true;
            expect(status.status).to.equal(1); // 成功状态
        });
    });
    it('check balance at cluster', async () => {
        const balances = await checkBalanceAtCluster(receiver_address);
        expect(balances["Node1"]).equal(balances["Node2"]);
        expect(balances["Node1"]).equal(balances["Node3"]);
    });

});

