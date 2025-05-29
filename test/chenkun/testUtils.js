const assert = require('node:assert');

const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')


const rpcUrl = "ae0d1f34ff0504b2380f13432dc74a54-973956847.us-west-1.elb.amazonaws.com:50051"
const client = createClient(rpcUrl)

const {
    callPrivateMint,
    callPrivateTransfer,
    callPrivateBurn,
    callPrivateApprove,
    callPrivateTransferFrom,
    getAddressBalance,
    checkAccountToken,
    callPrivateTransfer2,
    callPrivateBurn2
} = require("../help/testHelp")

const l1CustomNetwork = {
    name: "BESU",
    chainId: 1337
};
const options = {
    batchMaxCount: 1,
    staticNetwork: true
};


const L1Url = hardhatConfig.networks.ucl_node2.url;
const l1Provider = new ethers.JsonRpcProvider(L1Url, l1CustomNetwork, options);

const minterWallet = new ethers.Wallet(accounts.MinterKey, l1Provider);
const spender1Wallet = new ethers.Wallet(accounts.Spender1Key, l1Provider);

const amount = 1;


async function checkDeployedUSDC() {
    const PrivateUSDCFactory = await ethers.getContractFactory("PrivateUSDC", {
        libraries: {
            "TokenEventLib": config.libraries.TokenEventLib,
            "TokenVerificationLib": config.libraries.TokenVerificationLib,
            "TokenGrumpkinLib": config.libraries.TokenGrumpkinLib,
            "SignatureChecker": config.libraries.SignatureChecker
        }
    });

    const privateUSDC = await PrivateUSDCFactory.attach(config.contracts.PrivateERCToken);

    //validate basic properties
    let name = await privateUSDC.name();
    let symbol = await privateUSDC.symbol();
    let decimals = await privateUSDC.decimals();
    let currency = await privateUSDC.currency();
    console.log("(name, symbol, decimals, currency)", name, symbol, decimals, currency);
    assert.equal(decimals.toString(), "6")

    // validate minters
    let masterMinter = await privateUSDC.masterMinter();
    let isMinter = await privateUSDC.isMinter(accounts.Minter);

    console.log("masterMinter: ", masterMinter)
    console.log("isMinter: ", isMinter)
    assert.equal(masterMinter, accounts.MasterMinter);
    assert.equal(isMinter, true)

    // validate pauser
    let pauser = await privateUSDC.pauser();
    let paused = await privateUSDC.paused();
    console.log("(pauser, paused)", pauser, paused);
    assert.equal(paused, false)


    //validate blackList
    let blacklister = await privateUSDC.blacklister();
    let is_blackedListed = await privateUSDC.isBlacklisted(accounts.BlockedAccount)
    console.log("blacklister", blacklister);
    console.log(`${accounts.BlockedAccount} is blackedListed:`, is_blackedListed);
    assert.equal(is_blackedListed, true)
}

async function mintForStart() {
    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        to_address: accounts.Minter,
        amount: 10
    };
    let response = await client.generateMintProof(generateRequest);
    console.log("Generate Mint Proof response:", response);
    let proofResult = await client.waitForProofCompletion(client.getMintProof, response.request_id)

    console.log("Mint Proof Result:", proofResult);
    let receipt = await callPrivateMint(config.contracts.PrivateERCToken, proofResult, minterWallet)
    console.log("receipt", receipt)

    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Minter)
    console.log("balance: ", balance)
}


async function testMint() {
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

    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.To2)
    console.log("balance: ", balance)
}

async function testDirectTransfer(){
    const transferRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: accounts.To1,
        amount: amount
    };

    let response = await client.generateDirectTransfer(transferRequest);
    console.log("Generate transfer Proof response:", response);
    let proofResult = await client.waitForActionCompletion(client.getTransferProof, response.request_id)

    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.To1)
    console.log(`balance of ${accounts.To1}: `, balance)

}

async function testReserveTokens(){
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
        // let receipt = await callPrivateTransfer2(config.contracts.PrivateERCToken,tokenId,accounts.To1,minterWallet)
        // console.log("receipt", receipt)

        let receipt = await callPrivateBurn2(config.contracts.PrivateERCToken,tokenId,minterWallet)
        console.log("receipt", receipt)
    }
}

async function testTransfer() {
    const transferRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: accounts.To1,
        amount: amount
    };
    let response = await client.generateTransferProof(transferRequest);
    console.log("Generate transfer Proof response:", response);
    let proofResult = await client.waitForProofCompletion(client.getTransferProof, response.request_id)

    console.log("Transfer Proof Result:", proofResult);
    let receipt = await callPrivateTransfer(config.contracts.PrivateERCToken, proofResult, minterWallet)
    console.log("receipt", receipt)

    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.To1)
    console.log("balance: ", balance)
}

async function testBurn() {
    const burnRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        amount: amount
    };
    let response = await client.generateBurnProof(burnRequest);
    console.log("Generate burn Proof response:", response);
    let proofResult = await client.waitForProofCompletion(client.getBurnProof, response.request_id)

    console.log("Burn Proof Result:", proofResult);
    let receipt = await callPrivateBurn(config.contracts.PrivateERCToken, proofResult, minterWallet)
    console.log("receipt", receipt)

    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Minter)
    console.log("balance: ", balance)
}


async function testApprove() {
    const approveRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: accounts.Spender1,
        amount: amount
    };
    let response = await client.generateApproveProof(approveRequest);
    console.log("Generate Approve Proof response:", response);
    let proofResult = await client.waitForProofCompletion(client.getApproveProof, response.request_id)

    console.log("Burn Proof Result:", proofResult);
    let receipt = await callPrivateApprove(config.contracts.PrivateERCToken, proofResult, minterWallet)
    console.log("receipt", receipt)

    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Minter)
    console.log("balance: ", balance)
}

async function testTransferFrom() {
    const transferFromRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: accounts.To2,
        allowance_cancel_address: accounts.Spender1,
        amount: amount
    };
    let response = await client.generateTransferFromProof(transferFromRequest);
    console.log("Generate TransformFrom Proof response:", response);
    let proofResult = await client.waitForProofCompletion(client.getTransferFromProof, response.request_id)

    console.log("Burn Proof Result:", proofResult);
    let receipt = await callPrivateTransferFrom(config.contracts.PrivateERCToken, proofResult, spender1Wallet)
    console.log("receipt", receipt)

    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Spender1)
    console.log("spender1 balance: ", balance)

    balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.To2)
    console.log("To2 balance: ", balance)
}

async function checkBalance(account) {
    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, account)
    console.log("balance: ", balance)
}

async function checkToken(account, tokenId) {
    let token = await checkAccountToken(config.contracts.PrivateERCToken, account, tokenId)
    console.log("token: ", token);
}

// checkDeployedUSDC().then();
// testMint().then()
// checkToken(accounts.Minter, '0x229d74e030744056719a8b813d3fc091da6120e0bee73854e748cabaaaebaca4').then();

// mintForStart().then()
// testDirectTransfer().then();
// checkBalance(accounts.To1).then()

testReserveTokens().then();

// testTransfer().then();
// testBurn().then();

// testApprove().then();
// testTransferFrom().then();