const {ethers, network}=require("hardhat");
const {networks} = require("../../hardhat.config");
const {ether} = require("@openzeppelin/test-helpers");
const axios = require("axios");

const dummyTokenAddress = "0x559fb86531dF1bb8377338Ee5ab29d9b8Fd453A1";
const toAddress="0xfAdb253d9AD9b2d6D37471fA80F398f76D8347B8"

async function deployDummyToken() {
    const DummyToken = await ethers.getContractFactory("DummyPrivateToken");
    const dummyToken = await  DummyToken.deploy();
    await dummyToken.waitForDeployment()
    console.log("dummyToken is deployed at: ", await dummyToken.getAddress());
}

async function addAnToken() {
    let [signer] = await ethers.getSigners();
    const dummyToken = await  ethers.getContractAt("DummyPrivateToken",dummyTokenAddress);


    let token = {
        id: 1,
        owner: signer.address,
        status: 1,
        amount: {
            cl_x: 4,
            cl_y: 5,
            cr_x: 6,
            cr_y: 7,
        },
        to: toAddress,
        rollbackTokenId:8,
        tokenType: 2,
    }
    let tx = await dummyToken.setAccountToken(signer.address, token);
    let receipt = await tx.wait();
    console.log("receipt", receipt);
}

async function getToken() {
    let [signer] = await ethers.getSigners();
    const dummyToken = await  ethers.getContractAt("DummyPrivateToken",dummyTokenAddress);

    let resp = await dummyToken.getAccountToken2(signer.address, 1);
    console.log("resp: ", resp);
}

async function privateTransfer() {
    const dummyToken = await  ethers.getContractAt("DummyPrivateToken",dummyTokenAddress);
    let tx = await dummyToken.privateTransfers([1]);
    let receipt = await tx.wait();
    console.log("receipt", receipt);
}

async function callEmptyUpdate() {
    const dummyToken = await  ethers.getContractAt("DummyPrivateToken",dummyTokenAddress);
    let tx = await dummyToken.update();
    let receipt = await tx.wait();
    console.log("receipt", receipt);
}

// 0x99af998d
async function calculateSignature() {
    const hash = ethers.keccak256(ethers.toUtf8Bytes("privateTransfers(uint256[])"));
    const selector = hash.slice(0, 10);
    console.log("selector", selector);
}

async function getNonce(){
    let [signer] = await ethers.getSigners();
    const nonce = await ethers.provider.getTransactionCount(signer.address);
    console.log("nonce: ", nonce);
}

async function batchTransfer(){
    const l1CustomNetwork = {
        name: "BESU",
        chainId: 1337
    };
    const options = {
        batchMaxCount: 1000,
        staticNetwork: true
    };
    const privateKey = "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f";
    const providerUrl = "http://localhost:8545";
    const provider = new ethers.JsonRpcProvider(providerUrl,l1CustomNetwork, options);
    const wallet = new ethers.Wallet(privateKey, provider);

    // const ERC20_ABI = ["function transfer(address to, uint256 amount) public returns (bool)"];
    const ERC20_ABI = ["function privateTransfers(uint256[] calldata tokenIds) external returns (bool)"];


    const iface = new ethers.Interface(ERC20_ABI);

    const batchPayload = [];

    const from = wallet.address;
    let nonce = await provider.getTransactionCount(from, "latest");
    let chainId=ethers.provider.chainId


    for (let i = 0; i < 10000; i++) {
        const data = iface.encodeFunctionData("privateTransfers", [
            [1],
        ]);

        const tx = {
            to: dummyTokenAddress,
            data,
            nonce,
            gasLimit: 100_000,
            gasPrice:0,
            chainId: chainId,
            type: 0,
        };

        const signedTx = await wallet.signTransaction(tx);

        batchPayload.push({
            jsonrpc: "2.0",
            id: i + 1,
            method: "eth_sendRawTransaction",
            params: [signedTx],
            nonce: nonce,
        });
        nonce++;
    }
    console.log("batchPayload:", batchPayload)

    const response = await axios.post(providerUrl, batchPayload, {
        headers: { "Content-Type": "application/json" },
    });
    console.log("response:", response.data)
}

// calculateSignature().then();
// getNonce().then()

// deployDummyToken().then();
// addAnToken().then();
// privateTransfer().then();

// getToken().then();

batchTransfer().then()

// callEmptyUpdate().then();