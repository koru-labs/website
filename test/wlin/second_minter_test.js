const assert = require('node:assert');

const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')


const rpcUrl = "qa-node3-node.hamsa-ucl.com:50051"
const client = createClient(rpcUrl)

const {
    callPrivateMint,
    callPrivateTransfer,
    callPrivateBurn,
    callPrivateApprove,
    callPrivateTransferFrom,
    getAddressBalance,
    getPublicTotalSupply,
    checkAccountToken
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

const minter2Wallet = new ethers.Wallet(accounts.Minter2Key, l1Provider);
const amount=1;

async function testMint() {
    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter2,
        to_address: accounts.To2,
        amount: 1
    };
    let response = await client.generateMintProof(generateRequest);
    console.log("Generate Mint Proof response:", response);
    let proofResult = await client.waitForProofCompletion(client.getMintProof, response.request_id)

    console.log("Mint Proof Result:", proofResult);
    let receipt = await callPrivateMint(config.contracts.PrivateERCToken, proofResult, minter2Wallet)
    console.log("receipt", receipt)

    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.To2)
    console.log("balance: ", balance)
}

async function mintForStart() {
    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter2,
        to_address: accounts.Minter2,
        amount: 20
    };
    let response = await client.generateMintProof(generateRequest);
    console.log("Generate Mint Proof response:", response);
    let proofResult = await client.waitForProofCompletion(client.getMintProof, response.request_id)

    console.log("Mint Proof Result:", proofResult);
    let receipt = await callPrivateMint(config.contracts.PrivateERCToken, proofResult, minter2Wallet)
    console.log("receipt", receipt)

    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Minter2)
    console.log("balance: ", balance)
}

async function testCrossBankReserveTokensAndTransfer2Node1(){
    let toAddress ="0x5a3288A7400B2cd5e0568728E8216D9392094892";
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter2,
        to_address: toAddress,
        amount: 3
    };

    let response = await client.generateSplitToken(splitRequest);
    console.log("Generate transfer Proof response:", response);
    let tokenResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id);
    console.log("tokenResult: ", tokenResult)
    let receipt = await callPrivateTransfer(minter2Wallet, config.contracts.PrivateERCToken, toAddress, '0x'+tokenResult.transfer_token_id);
    console.log("PrivateTransfer receipt: ", receipt)
    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Minter2)
    console.log("balance of Minter2:", balance)
}

async function testCrossBankReserveTokensAndTransfer2Node2(){
    let toAddress ="0xF8041E1185C7106121952bA9914ff904A4A01c80";
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter2,
        to_address:toAddress,
        amount: amount
    };

    let response = await client.generateSplitToken(splitRequest);
    console.log("Generate transfer Proof response:", response);
    let tokenResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id);
    console.log("tokenResult: ", tokenResult)
    let receipt = await callPrivateTransfer(minter2Wallet, config.contracts.PrivateERCToken, toAddress, '0x'+tokenResult.transfer_token_id);
    console.log("PrivateTransfer receipt: ", receipt)
    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Minter2)
    console.log("balance of Minter2:", balance)
}

async function testCrossBankReserveTokensAndTransfer2Node4(){
    let toAddress ="0xbA268f776F70caDB087e73020dfE41c7298363Ed";
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter2,
        to_address:toAddress,
        amount: amount
    };

    let response = await client.generateSplitToken(splitRequest);
    console.log("Generate transfer Proof response:", response);
    let tokenResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id);
    console.log("tokenResult: ", tokenResult)
    let receipt = await callPrivateTransfer(minter2Wallet, config.contracts.PrivateERCToken, toAddress, '0x'+tokenResult.transfer_token_id);
    console.log("PrivateTransfer receipt: ", receipt)
    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Minter)
    console.log("balance of Minter2:", balance)
}


// testMint().then()

// mintForStart().then();
// testCrossBankReserveTokensAndTransfer2Node1().then();
testCrossBankReserveTokensAndTransfer2Node2().then();
// testCrossBankReserveTokensAndTransfer2Node4().then();