const hre = require("hardhat");
const {ignition, ethers} = hre;


const validium2Module = require("../ignition/modules/validium2")
const simpleModule = require("../ignition/modules/simple")
const CDKDataCommitteeModule = require("../ignition/modules/CDKDataCommittee")
const {zeroPadBytes} = require("ethers");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);


    const {validium2} = await ignition.deploy(validium2Module)
    const validium2Address = await validium2.getAddress();
    console.log("Deploy validium2 address:", validium2Address)

    const CDKValidium2 = await ethers.getContractFactory("CDKValidium2");
    const cdkValidium2 = await CDKValidium2.attach(validium2Address);

    // 检查合约是否已经初始化
    const initialized = await cdkValidium2.isInitialized();
    if (!initialized) {
        const initializeTx = await cdkValidium2.initialize({
            admin: deployer.address,
            trustedSequencer: deployer.address,
            pendingStateTimeout: 86400, // 1 day in seconds
            trustedAggregator: deployer.address,
            trustedAggregatorTimeout: 43200, // 12 hours in seconds
        }, "0xf7f440853e06409432a8b5dd84806f859ba881f465f68daeb538f51828192354", "localhost", "hamsa1", "8");
        await initializeTx.wait();
        console.log("CDKValidium2 initialized");
    } else {
        console.log("Contract is already initialized");
    }

    //构造BatchData数组
    const batches = [
        {
            transactionsHash: ethers.keccak256(ethers.toUtf8Bytes("0x20ac3237f1410d4b2e58fda22bff9dc1a4111d3169a1446b112de5133f919873")),
            // globalExitRoot: ethers.keccak256(ethers.toUtf8Bytes("0xAc836406f6813f1ff2b50AA45992C56bd2C13C41")),

            globalExitRoot:   '0x0000000000000000000000000000000000000000000000000000000000000000',

            timestamp: Math.floor(Date.now() / 1000), // 当前时间戳
            minForcedTimestamp: 0 // 非强制批次
        },
        {
            transactionsHash: ethers.keccak256(ethers.toUtf8Bytes("0x233c319a969a97d9c1d855262ae897ef419091deb11b111a439bf2363451447f")),
            globalExitRoot:      '0x0000000000000000000000000000000000000000000000000000000000000000',

            timestamp: Math.floor(Date.now() / 1000), // 当前时间戳
            minForcedTimestamp: 0 // 非强制批次
        }
    ];

    // L2 coinbase地址
    const l2Coinbase = ethers.ZeroAddress;

    // 签名和地址的字节数组
    const signaturesAndAddrs =  ethers.encodeBytes32String("1234");


    // 调用sequenceBatches方法
    const tx = await cdkValidium2.sequenceBatches(batches, l2Coinbase, signaturesAndAddrs);

    console.log("333")
    // 等待交易完成
    await tx.wait();

    console.log("Batches sequenced successfully");

}


main().then()