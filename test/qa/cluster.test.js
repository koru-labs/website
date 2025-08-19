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
async function checkNodePerformance() {
    const providers = [
        { name: "Node1", provider: node1_provider },
        { name: "Node2", provider: node2_provider },
        { name: "Node3", provider: node3_provider }
    ];

    const performance = {};

    for (const { name, provider } of providers) {
        try {
            const start = Date.now();
            const blockNumber = await provider.getBlockNumber();
            const end = Date.now();

            performance[name] = {
                responseTime: end - start,
                blockNumber: blockNumber
            };
        } catch (error) {
            console.error(`Error checking performance on ${name}:`, error.message);
            performance[name] = "ERROR";
        }
    }

    return performance;
}
async function checkNetworkConnectivity() {
    const providers = [
        { name: "Node1", provider: node1_provider },
        { name: "Node2", provider: node2_provider },
        { name: "Node3", provider: node3_provider }
    ];

    const connectivity = {};

    // 检查每个节点是否能访问其他节点的信息
    for (const { name: sourceName, provider: sourceProvider } of providers) {
        connectivity[sourceName] = {};

        for (const { name: targetName, provider: targetProvider } of providers) {
            if (sourceName === targetName) {
                connectivity[sourceName][targetName] = "SELF";
                continue;
            }

            try {
                // 尝试从源节点获取目标节点相关的网络信息
                const sourceNetwork = await sourceProvider.getNetwork();
                const targetNetwork = await targetProvider.getNetwork();

                // 检查网络ID是否一致
                const networkMatch = sourceNetwork.chainId === targetNetwork.chainId;

                // 检查区块高度差异
                const sourceBlock = await sourceProvider.getBlockNumber();
                const targetBlock = await targetProvider.getBlockNumber();
                const blockDiff = Math.abs(sourceBlock - targetBlock);

                // 如果区块高度差异在可接受范围内（例如10个区块），认为连通性正常
                const isConnected = networkMatch && blockDiff < 10;

                connectivity[sourceName][targetName] = {
                    connected: isConnected,
                    networkMatch: networkMatch,
                    blockDifference: blockDiff,
                    sourceBlock: sourceBlock,
                    targetBlock: targetBlock
                };
            } catch (error) {
                console.error(`Error checking connectivity from ${sourceName} to ${targetName}:`, error.message);
                connectivity[sourceName][targetName] = {
                    connected: false,
                    error: error.message
                };
            }
        }
    }

    return connectivity;
}

async function checkPeerConnectivity() {
    const providers = [
        { name: "Node1", provider: node1_provider },
        { name: "Node2", provider: node2_provider },
        { name: "Node3", provider: node3_provider }
    ];

    const peerInfo = {};

    for (const { name, provider } of providers) {
        try {
            // 尝试获取节点的peer信息（如果RPC支持）
            // 注意：不是所有RPC都支持这个方法，使用try-catch处理
            let peerCount;
            try {
                peerCount = await provider.send("net_peerCount", []);
            } catch (methodError) {
                // 尝试其他可能的peer计数方法
                try {
                    peerCount = await provider.send("parity_netPeers", []);
                } catch (parityError) {
                    peerCount = "METHOD_NOT_SUPPORTED";
                }
            }

            peerInfo[name] = {
                peerCount: peerCount,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`Error checking peers on ${name}:`, error.message);
            peerInfo[name] = {
                peerCount: "ERROR",
                error: error.message
            };
        }
    }

    return peerInfo;
}

async function checkContractStateConsistency(address) {
    const providers = [
        { name: "Node1", provider: node1_provider },
        { name: "Node2", provider: node2_provider },
        { name: "Node3", provider: node3_provider }
    ];

    const contractStates = {};

    for (const { name, provider } of providers) {
        try {
            const SimpleToken = await ethers.getContractFactory("SimpleToken");
            const simpleToken = await SimpleToken.attach(simpleTokenAddress).connect(provider);

            // 检查多个状态变量
            const balance = await simpleToken.balanceOf(address);
            const totalSupply = await simpleToken.totalSupply();
            const name = await simpleToken.name();
            const symbol = await simpleToken.symbol();

            contractStates[name] = {
                balance: balance,
                totalSupply: totalSupply,
                name: name,
                symbol: symbol
            };
        } catch (error) {
            console.error(`Error checking contract state on ${name}:`, error.message);
            contractStates[name] = "ERROR";
        }
    }

    return contractStates;
}

async function checkMultipleAddressesBalanceConsistency(addresses) {
    const providers = [
        { name: "Node1", provider: node1_provider },
        { name: "Node2", provider: node2_provider },
        { name: "Node3", provider: node3_provider }
    ];

    const balanceStates = {};

    for (const address of addresses) {
        balanceStates[address] = {};

        for (const { name, provider } of providers) {
            try {
                const SimpleToken = await ethers.getContractFactory("SimpleToken");
                const simpleToken = await SimpleToken.attach(simpleTokenAddress).connect(provider);
                const balance = await simpleToken.balanceOf(address);
                balanceStates[address][name] = balance;
            } catch (error) {
                console.error(`Error checking balance for ${address} on ${name}:`, error.message);
                balanceStates[address][name] = "ERROR";
            }
        }
    }

    return balanceStates;
}

async function checkContractStorageConsistency(slot) {
    const providers = [
        { name: "Node1", provider: node1_provider },
        { name: "Node2", provider: node2_provider },
        { name: "Node3", provider: node3_provider }
    ];

    const storageValues = {};

    for (const { name, provider } of providers) {
        try {
            // 直接读取存储槽的值
            const storageValue = await provider.getStorageAt(simpleTokenAddress, slot);
            storageValues[name] = storageValue;
        } catch (error) {
            console.error(`Error checking storage slot ${slot} on ${name}:`, error.message);
            storageValues[name] = "ERROR";
        }
    }

    return storageValues;
}
async function checkMultipleAddressesBalanceConsistency(addresses) {
    const providers = [
        { name: "Node1", provider: node1_provider },
        { name: "Node2", provider: node2_provider },
        { name: "Node3", provider: node3_provider }
    ];

    const balanceStates = {};

    for (const address of addresses) {
        balanceStates[address] = {};

        for (const { name, provider } of providers) {
            try {
                const SimpleToken = await ethers.getContractFactory("SimpleToken");
                const simpleToken = await SimpleToken.attach(simpleTokenAddress).connect(provider);
                const balance = await simpleToken.balanceOf(address);
                balanceStates[address][name] = balance;
            } catch (error) {
                console.error(`Error checking balance for ${address} on ${name}:`, error.message);
                balanceStates[address][name] = "ERROR";
            }
        }
    }

    return balanceStates;
}

async function checkContractStorageConsistency(slot) {
    const providers = [
        { name: "Node1", provider: node1_provider },
        { name: "Node2", provider: node2_provider },
        { name: "Node3", provider: node3_provider }
    ];

    const storageValues = {};

    for (const { name, provider } of providers) {
        try {
            // 直接读取存储槽的值
            const storageValue = await provider.getStorage(simpleTokenAddress, slot);
            storageValues[name] = storageValue;
        } catch (error) {
            console.error(`Error checking storage slot ${slot} on ${name}:`, error.message);
            storageValues[name] = "ERROR";
        }
    }

    return storageValues;
}

async function checkContractAllowanceConsistency(owner, spender) {
    const providers = [
        { name: "Node1", provider: node1_provider },
        { name: "Node2", provider: node2_provider },
        { name: "Node3", provider: node3_provider }
    ];

    const allowances = {};

    for (const { name, provider } of providers) {
        try {
            const SimpleToken = await ethers.getContractFactory("SimpleToken");
            const simpleToken = await SimpleToken.attach(simpleTokenAddress).connect(provider);
            const allowance = await simpleToken.allowance(owner, spender);
            allowances[name] = allowance;
        } catch (error) {
            console.error(`Error checking allowance on ${name}:`, error.message);
            allowances[name] = "ERROR";
        }
    }

    return allowances;
}

async function checkContractAllowanceConsistency(owner, spender) {
    const providers = [
        { name: "Node1", provider: node1_provider },
        { name: "Node2", provider: node2_provider },
        { name: "Node3", provider: node3_provider }
    ];

    const allowances = {};

    for (const { name, provider } of providers) {
        try {
            const SimpleToken = await ethers.getContractFactory("SimpleToken");
            const simpleToken = await SimpleToken.attach(simpleTokenAddress).connect(provider);
            const allowance = await simpleToken.allowance(owner, spender);
            allowances[name] = allowance;
        } catch (error) {
            console.error(`Error checking allowance on ${name}:`, error.message);
            allowances[name] = "ERROR";
        }
    }

    return allowances;
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
    it('comprehensive network health check', async () => {
        console.log("=== Comprehensive Network Health Check ===");
        // 1. 基本连接检查
        await testNodeConnections();
        // 2. 区块链一致性检查
        const blockchainStates = await checkBlockchainConsistency();
        console.log("Blockchain states:", blockchainStates);
        // 3. 网络连通性检查
        const connectivity = await checkNetworkConnectivity();
        console.log("Network connectivity:", JSON.stringify(connectivity, null, 2));
        // 4. Peer连接检查
        const peerInfo = await checkPeerConnectivity();
        console.log("Peer information:", peerInfo);
        // 5. Gas一致性检查
        const gasInfo = await checkGasConsistency();
        console.log("Gas information:", gasInfo);
        console.log("=== Network Health Check Complete ===");
    });
    it('check blockchain consistency of chainId and latestBlockHash', async () => {
        const states = await checkBlockchainConsistency();
        console.log("Blockchain states:", states);
        // 验证所有节点的chainId一致
        const chainIds = Object.values(states).map(state => state.chainId);
        const allSameChainId = chainIds.every(id => id === chainIds[0]);
        expect(allSameChainId).to.be.true;

        // check latestBlockHash
        const latestBlockHashes = Object.values(states).map(state => state.latestBlockHash);
        const allSameLatestBlockHash = latestBlockHashes.every(hash => hash === latestBlockHashes[0]);
        expect(allSameLatestBlockHash).to.be.true;

    });
    it('transfer and transaction check synchronization', async () => {
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
    it('comprehensive contract state consistency check', async () => {
        console.log("=== Comprehensive Contract State Consistency Check ===");

        const [signer] = await ethers.getSigners();
        const receiver_address = "0x4312488937D47A007De24d48aB82940C809EEb2b";

        // 1. 基本合约状态检查
        const contractStates = await checkContractStateConsistency(receiver_address);
        console.log("Contract states:", contractStates);

        // 2. 多地址余额检查
        const addresses = [signer.address, receiver_address];
        const balanceStates = await checkMultipleAddressesBalanceConsistency(addresses);
        console.log("Multiple addresses balance states:", balanceStates);

        // 3. Allowance检查
        const allowances = await checkContractAllowanceConsistency(signer.address, receiver_address);
        console.log("Allowances:", allowances);

        // 4. 关键存储槽检查
        const storageSlots = ["0x0", "0x1", "0x2"];
        for (const slot of storageSlots) {
            const storageValues = await checkContractStorageConsistency(slot);
            console.log(`Storage slot ${slot}:`, storageValues);
        }

        console.log("=== Contract State Consistency Check Complete ===");
    });

});

