const hre = require("hardhat");
const {ethers} = hre;
const options = {
    batchMaxCount: 1,
    staticNetwork: true
};

const customNetwork = {
    name: "UCL",
    chainId: 1001
};

const L1CustomNetwork = {
    name: "BESU",
    chainId: 1337
};


//local
// const L1 = "http://localhost:8545";
// server
const L1 = "http://18.179.22.133:8545";
const L1_1_DeployerAddress = "0x234501152f471FFd6e28eCcda2008445DeAcAddF";
const L1_1_DeployerPrivateKey = "6594d4aa834aa586f2e575a9d30b4fe9c7e9621e95000e7039844561aa40fa64";

const L1_2_DeployerAddress = "0x0299cC12F19C17D1579Ae360B0a36B9d521813CB";
const L1_2_DeployerPrivateKey = "6bc3bc0667819a977e1948222237ffcd36fde248cdd17dde66c73e0a1969f502";

const L1_3_DeployerAddress = "0x81c942B3970e93d072d3242732b74b2E58e89275";
const L1_3_DeployerPrivateKey = "63a54a050e3d49d8412c2a3e94998975272158b7ef6bf14e75fad753e1b83a42";




const L1_Provider = new ethers.JsonRpcProvider(L1, L1CustomNetwork, options);

//local
// const L2_1 = "http://localhost:8123";
// const L2_2 = "http://localhost:8123";
// const L2_3 = "http://localhost:8123";

// server
const L2_1 = "http://54.178.62.243:8123";
const L2_2 = "http://35.78.208.30:8123";
const L2_3 = "http://13.231.127.203:8123";

const L2_1_Provider = new ethers.JsonRpcProvider(L2_1, customNetwork, options);
const L2_2_Provider = new ethers.JsonRpcProvider(L2_2, customNetwork, options);
const L2_3_Provider = new ethers.JsonRpcProvider(L2_3, customNetwork, options);
const L2DeployerAddress = "0x1a245eF2f03911Bf782FBdEAe379113ff068A311";
const L2DeployerPrivateKey = "45a90e2af691f22825629bec6e2e020e1f84a3a4fd51f8705e9016e194d5c94e";

const L2TokenDeployerAddress = "0x23eabdd1584Cc04E5962524F48B9c6f4d1Ef98cD";
const L2TokenDeployerPrivateKey = "0x5f990426b4495f3d4f089ce948dca5365bf00d72b52c4e0f59bfdba1bd4593e0";

async function deployEscortingByNode1() {
    const DvpEscorting = await ethers.getContractFactory("DvpEscorting");
    const L2Wallet = new ethers.Wallet(L2DeployerPrivateKey, L2_1_Provider);
    const escorting = await DvpEscorting.connect(L2Wallet).deploy();
    await escorting.waitForDeployment();
    console.log("L2-node1-EscortAddress: ", escorting.target);
}

async function deployEscortingByNode2() {
    const DvpEscorting = await ethers.getContractFactory("DvpEscorting");
    const L2Wallet = new ethers.Wallet(L2DeployerPrivateKey, L2_2_Provider);
    const escorting = await DvpEscorting.connect(L2Wallet).deploy();
    await escorting.waitForDeployment();
    console.log("L2-node2-EscortAddress: ", escorting.target);
}

async function deployEscortingByNode3() {
    const DvpEscorting = await ethers.getContractFactory("DvpEscorting");
    const L2Wallet = new ethers.Wallet(L2DeployerPrivateKey, L2_3_Provider);
    const escorting = await DvpEscorting.connect(L2Wallet).deploy();
    await escorting.waitForDeployment();
    console.log("L2-node3-EscortAddress: ", escorting.target);
}

async function deployMatchNode1() {
    const L1Wallet = new ethers.Wallet(L1_1_DeployerPrivateKey, L1_Provider);
    const PoseidonHash = await ethers.getContractFactory("PoseidonHasher");
    const hash = await PoseidonHash.connect(L1Wallet).deploy();
    await hash.waitForDeployment();
    // console.log("PoseidonHasher is deployed at ", hash.target);
    const DvpMatch = await ethers.getContractFactory("DvpMatch", {
        signer: L1_1_DeployerAddress,
        libraries: {
            PoseidonHasher: hash.target,
        },
    });
    const match = await DvpMatch.connect(L1Wallet).deploy();
    await match.waitForDeployment()
    console.log("L1 node1 Match Address:", match.target);
}

async function deployMatchNode2() {
    const L1Wallet = new ethers.Wallet(L1_2_DeployerPrivateKey, L1_Provider);
    const PoseidonHash = await ethers.getContractFactory("PoseidonHasher");
    const hash = await PoseidonHash.connect(L1Wallet).deploy();
    await hash.waitForDeployment();
    // console.log("PoseidonHasher is deployed at ", hash.target);
    const DvpMatch = await ethers.getContractFactory("DvpMatch", {
        signer: L1_2_DeployerAddress,
        libraries: {
            PoseidonHasher: hash.target,
        },
    });
    const match = await DvpMatch.connect(L1Wallet).deploy();
    await match.waitForDeployment()
    console.log("L1 node2 Match Address:", match.target);
}

async function deployMatchNode3() {
    const L1Wallet = new ethers.Wallet(L1_3_DeployerPrivateKey, L1_Provider);
    const PoseidonHash = await ethers.getContractFactory("PoseidonHasher");
    const hash = await PoseidonHash.connect(L1Wallet).deploy();
    await hash.waitForDeployment();
    // console.log("PoseidonHasher is deployed at ", hash.target);
    const DvpMatch = await ethers.getContractFactory("DvpMatch", {
        signer: L1_3_DeployerAddress,
        libraries: {
            PoseidonHasher: hash.target,
        },
    });
    const match = await DvpMatch.connect(L1Wallet).deploy();
    await match.waitForDeployment()
    console.log("L1 node3 Match Address:", match.target);
}

async function deployDREXToken() {
    const SimpleToken = await ethers.getContractFactory("Simple");
    const L2Wallet = new ethers.Wallet(L2TokenDeployerPrivateKey, L2_1_Provider);
    const simple = await SimpleToken.connect(L2Wallet).deploy("HamsaToken", "DREX");
    await simple.waitForDeployment()
    console.log("L2 node1 DREX Token address:", simple.target);
}

async function deployDVTBToken() {
    const SimpleToken = await ethers.getContractFactory("Simple");
    const L2Wallet = new ethers.Wallet(L2TokenDeployerPrivateKey, L2_2_Provider);
    const simple = await SimpleToken.connect(L2Wallet).deploy("HamsaToken", "DVTB");
    await simple.waitForDeployment()
    console.log("L2 node2 DVTB Token address:", simple.target);
}

async function deployDVTAToken() {
    const SimpleToken = await ethers.getContractFactory("Simple");
    const L2Wallet = new ethers.Wallet(L2TokenDeployerPrivateKey, L2_3_Provider);
    const simple = await SimpleToken.connect(L2Wallet).deploy("HamsaToken", "DVTA");
    await simple.waitForDeployment()
    console.log("L2 node3 DVTA Token address:", simple.target);
}

// deployMatch().then()
// deployDREXToken().then()
// deployDVTBToken().then()
// deployDVTAToken().then()
// deployEscortingByNode1().then()
// deployEscortingByNode2().then()
// deployEscortingByNode3().then()

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function deployContractsInSequence() {
    try {
        // 使用 Promise 链接来顺序执行每个方法
        await deployMatchNode1();
        await deployMatchNode2();
        await deployMatchNode3();
        await sleep(3000); // 休眠 3 秒
        console.log("==================")
        await deployDREXToken();
        await deployDVTBToken();
        await deployDVTAToken();
        await sleep(3000); // 休眠 3 秒
        await deployEscortingByNode1();
        await deployEscortingByNode2();
        await deployEscortingByNode3();
        console.log("==================")

        console.log('All deployments completed successfully.');
    } catch (error) {
        console.error('An error occurred during deployment:', error);
    }
}



deployContractsInSequence().then()