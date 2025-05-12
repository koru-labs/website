const hre = require("hardhat");
const {ignition, ethers} = hre;

async  function main() {
    const [deployer] = await ethers.getSigners();
    let validium = await ethers.getContractFactory("PolygonValidiumEtrog");
    validium = validium.attach(
        "0x9a3DBCa554e9f6b9257aAa24010DA8377C57c17e"
    );

    console.log("inittBatch", await validium.initBatch());
    console.log("currentBatch", await validium.currentBatch());
    console.log("batchNum", await validium.batchNum());

    let rollup = await ethers.getContractFactory("PolygonRollupManagerMock");
    rollup = rollup.attach(
        "0xa50a51c09a5c451C52BB714527E1974b686D8e77"
    );
    console.log("rollup info", await rollup.rollupIDToRollupData(1));

    // const batches = [
    //     {
    //         transactionsHash: ethers.keccak256(ethers.toUtf8Bytes("0x20ac3237f1410d4b2e58fda22bff9dc1a4111d3169a1446b112de5133f919873")),
    //         forcedGlobalExitRoot:   '0x0000000000000000000000000000000000000000000000000000000000000000',
    //         forcedTimestamp: 0, // 当前时间戳
    //         forcedBlockHashL1:   '0x0000000000000000000000000000000000000000000000000000000000000000'
    //     },
    //     {
    //         transactionsHash: ethers.keccak256(ethers.toUtf8Bytes("0x233c319a969a97d9c1d855262ae897ef419091deb11b111a439bf2363451447f")),
    //         forcedGlobalExitRoot:   '0x0000000000000000000000000000000000000000000000000000000000000000',
    //         forcedTimestamp: 0, // 当前时间戳
    //         forcedBlockHashL1:   '0x0000000000000000000000000000000000000000000000000000000000000000'
    //     }
    // ];
    //
    // const l2Coinbase = ethers.ZeroAddress;
    // const signaturesAndAddrs =  ethers.encodeBytes32String("1234");
    // let maxSequenceTimestamp= Math.floor(Date.now() / 1000);
    //
    // const functionGasFees = await validium.sequenceBatchesValidium.estimateGas(batches, maxSequenceTimestamp,0, l2Coinbase, signaturesAndAddrs);
    // console.log("gas: ", functionGasFees);

}


main().then()