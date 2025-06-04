const assert = require('node:assert');

const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')

const rpcUrl = "a31b8f17091f84b9b966146b6032acd3-1561831942.us-west-1.elb.amazonaws.com:50051"
// const rpcUrl = "127.0.0.1:50051"
const client = createClient(rpcUrl)

const {
    callPrivateMint,
    callPrivateTransfer,
    getAddressBalance,
    callPrivateCancel,
    callPrivateBurn,
    getPublicTotalSupply,
    getTotalSupplyNode3,
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

const amount = 10;


async function mintForStart() {
    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        to_address: accounts.Minter,
        amount: 100
    };
    let response = await client.generateMintProof(generateRequest);
    console.log("Generate Mint Proof response:", response);
    let proofResult = await client.waitForProofCompletion(client.getMintProof, response.request_id)

    console.log("Mint Proof Result:", proofResult);
    let receipt = await callPrivateMint(config.contracts.PrivateERCToken, proofResult, minterWallet)
    console.log("receipt", receipt)

    await sleep(5000)

    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Minter)
    console.log("balance: ", balance)
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
    let proofResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id)
    if (proofResult.status == "TOKEN_ACTION_STATUS_SUC") {
        console.log("proofResult", proofResult)
        let receipt = await callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,accounts.To1,'0x'+proofResult.transfer_token_id)
        console.log("receipt", receipt)
    }
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
    let proofResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id)
    if (proofResult.status == "TOKEN_ACTION_STATUS_SUC") {
        console.log("proofResult", proofResult)
        let receipt = await callPrivateBurn(config.contracts.PrivateERCToken,minterWallet,'0x'+proofResult.transfer_token_id)
        console.log("receipt", receipt)
    }
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
    let proofResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id)
    if (proofResult.status == "TOKEN_ACTION_STATUS_SUC") {
        console.log("proofResult", proofResult)
        let tokenId = ethers.toBigInt('0x'+proofResult.transfer_token_id)
        console.log("tokenId", tokenId)

        let receipt = await callPrivateCancel(config.contracts.PrivateERCToken,minterWallet,tokenId)
        console.log("receipt", receipt)
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
        amount: amount
    };

    let response = await client.generateSplitToken(splitRequest);
    console.log("Generate transfer Proof response:", response);
    let proofResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id)
    if (proofResult.status == "TOKEN_ACTION_STATUS_SUC") {
        console.log("proofResult", proofResult)
        let receipt = await callPrivateTransfer(to1Wallet,config.contracts.PrivateERCToken,accounts.To2,'0x'+proofResult.transfer_token_id)
        console.log("receipt", receipt)
    }
}
// mintForStart().then() //mint
// testReserveTokensAndBurn().then(); // burn
// testReserveTokensAndTransfer().then();// transfer
// testReserveTokensAndCancel().then();//cancel
// checkTotalSupply().then()
checkBalance(accounts.To2).then()
// testReserveTokensAndTransfer2().then()