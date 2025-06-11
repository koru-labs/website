const assert = require('node:assert');

const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
// const {createClient} = require('../qa/token_grpc')
const { createClient } = require('../qa/token_http');
// const rpcUrl = "a5f8d3d4c9d084f8ead607b8fe85e09b-1456818969.us-west-1.elb.amazonaws.com:50051"
// const rpcUrl = "http://127.0.0.1:8080"
const rpcUrl = "http://sb-node3-node-http.hamsa-ucl.com:8080"
// const rpcUrl = "sb-node4-node.hamsa-ucl.com:50051"
const client = createClient(rpcUrl)

const {
    callPrivateMint,
    callPrivateTransfer,
    getAddressBalance,
    callPrivateCancel,
    callPrivateBurn,
    getPublicTotalSupply,
    getTotalSupplyNode3, getToken,
} = require("../help/testHelp")

const l1CustomNetwork = {
    name: "BESU",
    chainId: 1337
};
const options = {
    batchMaxCount: 1,
    staticNetwork: true
};


const L1Url = hardhatConfig.networks.ucl_L2.url;
const l1Provider = new ethers.JsonRpcProvider(L1Url, l1CustomNetwork, options);

const minterWallet = new ethers.Wallet(accounts.MinterKey, l1Provider);
const to1Wallet = new ethers.Wallet(accounts.To1PrivateKey, l1Provider);
const node4minterWallet = new ethers.Wallet(accounts.Node4MinterKey, l1Provider);
const amount = 1;


async function mintForStart() {
    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        to_address: accounts.Minter,
        amount: 100
    };
    let response = await client.generateMintProof(generateRequest);
    console.log("Generate Mint Proof response:", response);
    let proofResult = await client.waitForProofCompletion(client.getMintProof, response.requestId)

    console.log("Mint Proof Result:", proofResult);
    let receipt = await callPrivateMint(config.contracts.PrivateERCToken, proofResult, minterWallet)
    console.log("receipt", receipt)

    await sleep(5000)

    await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Minter)
}
async function testDirectMint() {
    console.time('testDirectMint'); // Start timing
    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        to_address: accounts.Minter,
        amount: 100
    };
    let response = await client.generateDirectMint(generateRequest);
    console.log("Generate Mint Proof response:", response);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.requestId)
    console.timeEnd('testDirectMint'); // End timing
    await sleep(3000)
    await checkBalance(accounts.Minter)
}


async function testGetSplitTokenList() {
    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        owner_address: accounts.Minter,
    };
    let response = await client.getSplitTokenList(generateRequest);
    console.log("Generate Mint Proof response:", response);
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testReserveTokensAndTransfer(){
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: accounts.To1,
        amount: amount
    };

    let response = await client.generateSplitToken(splitRequest);
    console.log("Generate transfer Proof response:", response);
    let proofResult = await client.waitForActionCompletion(client.getSplitToken, response.requestId)
    if (proofResult.status == "TOKEN_ACTION_STATUS_SUC") {
        console.log("proofResult", proofResult)
        let receipt = await callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,accounts.To1,'0x'+proofResult.transfer_token_id)
        console.log("receipt", receipt)
    }
}

async function testActionStatus(requestId){
    let result = await client.getTokenActionStatus(requestId)
    console.log("result", result)
}

async function testReserveTokensAndBurn(){
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        amount: amount
    };

    let response = await client.generateSplitToken(splitRequest);
    console.log("Generate transfer Proof response:", response);
    let proofResult = await client.waitForActionCompletion(client.getSplitToken, response.requestId)
    if (proofResult.status == "TOKEN_ACTION_STATUS_SUC") {
        console.log("proofResult", proofResult)
        let receipt = await callPrivateBurn(config.contracts.PrivateERCToken,minterWallet,'0x'+proofResult.transfer_token_id)
        console.log("receipt", receipt)
    }
}

async function testDirectBurn() {
    console.time('testDirectBurn'); // Start timing
    const startTime = Date.now(); // 获取当前时间戳（毫秒）
    console.log("Starting testDirectBurn at:", new Date(startTime).toISOString()); // 打印开始时间
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        amount: amount
    };

    let response = await client.generateDirectBurn(splitRequest);
    console.log("Generate transfer Proof response:", response);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.requestId)
    console.timeEnd('testDirectBurn'); // End timing
    const endTime = Date.now(); // 获取结束时间戳
    console.log("Finished testDirectBurn at:", new Date(endTime).toISOString()); // 打印结束时间
    await sleep(3000)
    await checkBalance(accounts.Minter)
}

async function testDirectTransfer(){
    console.time('testDirectTransfer')
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address : accounts.To1,
        amount: amount
    };

    let response = await client.generateDirectTransfer(splitRequest);
    console.log("Generate transfer Proof response:", response);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.requestId)
    console.timeEnd('testDirectTransfer')
    await sleep(3000)
    await checkBalance(accounts.Minter)
    await checkBalance(accounts.To1)
}

async function testReserveTokensAndCancel(){
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: accounts.To1,
        amount: amount
    };

    let response = await client.generateSplitToken(splitRequest);
    console.log("Generate transfer Proof response:", response);
    let proofResult = await client.waitForActionCompletion(client.getSplitToken, response.requestId)
    if (proofResult.status == "TOKEN_ACTION_STATUS_SUC") {
        console.log("proofResult", proofResult)
        let tokenId = ethers.toBigInt('0x'+proofResult.transfer_token_id)
        console.log("tokenId", tokenId)

        let receipt = await callPrivateCancel(config.contracts.PrivateERCToken,minterWallet,tokenId)
        console.log("receipt", receipt)
    }
}

async function testGetToken(tokenId){
    let receipt = await getToken(minterWallet, config.contracts.PrivateERCToken, accounts.Minter,'0x' + tokenId)
    console.log("receipt", receipt)
}



async function testReserveTokensAndGetTokenDetail(){
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: accounts.To1,
        amount: amount
    };

    let response = await client.generateSplitToken(splitRequest);
    console.log("Generate transfer Proof response:", response);
    let proofResult = await client.waitForActionCompletion(client.getSplitToken, response.requestId)
    if (proofResult.status == "TOKEN_ACTION_STATUS_SUC") {
        console.log("proofResult", proofResult)
        let response = await client.getSplitTokenDetail(proofResult.transfer_token_id);
        console.log("Generate transfer Proof response:", response);
    }
}
async function checkBalance(account) {
    await getAddressBalance(client, config.contracts.PrivateERCToken, account)
}
async function checkTotalSupply() {
    let balance = await getTotalSupplyNode3(client,config.contracts.PrivateERCToken)
    console.log("balance: ", balance)
}
async function testReserveTokensAndTransfer2(){
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.To1,
        to_address: accounts.To2,
        amount: 1
    };

    let response = await client.generateSplitToken(splitRequest);
    console.log("Generate transfer Proof response:", response);
    let proofResult = await client.waitForActionCompletion(client.getSplitToken, response.requestId)
    if (proofResult.status == "TOKEN_ACTION_STATUS_SUC") {
        console.log("proofResult", proofResult)
        let receipt = await callPrivateTransfer(to1Wallet,config.contracts.PrivateERCToken,accounts.To2,'0x'+proofResult.transfer_token_id)
        console.log("receipt", receipt)
    }
}

async function setMintAllowed(){
    let response = await client.encodeElgamalAmount(100000);
    console.log("response", response)
    const minterAllowedAmount = {
        "cl_x": ethers.toBigInt(response.amount.cl_x),
        "cl_y": ethers.toBigInt(response.amount.cl_y),
        "cr_x": ethers.toBigInt(response.amount.cr_x),
        "cr_y": ethers.toBigInt(response.amount.cr_y),
    };
    let response2 = await client.decodeElgamalAmount(response.amount);
    console.log("response2", response2)
    const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken);
    const tx = await contract.configurePrivacyMinter(accounts.Node4minter,minterAllowedAmount);
    console.log("tx:", tx)
}

async function getTransactionDetails(txHash) {
    try {
        // 获取交易详情
        const transaction = await l1Provider.getTransaction(txHash);
        if (!transaction) {
            console.log("Transaction not found.");
            return;
        }

        // console.log("Transaction Details:", transaction);

        const receipt = await l1Provider.getTransactionReceipt(txHash);
        console.log("Transaction Receipt:", receipt);
    } catch (error) {
        console.error("Error fetching transaction details:", error.message);
    }
}
async function runTestDirectBurnMultipleTimes(times) {
    console.time('Total Execution Time'); // Start timing total execution

    for (let i = 0; i < times; i++) {
        console.log(`Running testDirectBurn #${i + 1}`);
        await testDirectBurn(); // Wait for each execution to complete
    }

    console.timeEnd('Total Execution Time'); // End timing total execution
}

// testGetSplitTokenList().then()
// testDirectMint().then()
testDirectBurn().then()
// testDirectTransfer().then()
// testActionStatus('cb15fdd3032d7aa81007e7e8d03d1dcff06ae5e744921b0a54117815ef0ac148').then()
// getTransactionDetails('0xe818616f807e6a9cd8fe7e0c18c3436fc070d7d0df3636add36fe7e815ea5be8').then()
// setMintAllowed().then()
// mintForStart().then() //mint
// testReserveTokensAndBurn().then(); // burn
// testReserveTokensAndTransfer().then();// transfer
// testReserveTokensAndCancel().then();//cancel
// testReserveTokensAndGetTokenDetail().then();
// checkTotalSupply().then()
// checkBalance(accounts.To2).then()
// testReserveTokensAndTransfer2().then()
// testGetToken('124fe437d8d8a7e51a3a1a7f492952ac9e025dcce7a497394a1a641b7b4193a1').then()