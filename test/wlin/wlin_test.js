const assert = require('node:assert');

const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')


const rpcUrl = "a5f8d3d4c9d084f8ead607b8fe85e09b-1456818969.us-west-1.elb.amazonaws.com:50051"
const client = createClient(rpcUrl)

const {
    callPrivateMint,
    callPrivateTransfer,
    callPrivateBurn,
    callPrivateApprove,
    callPrivateTransferFrom,
    getAddressBalance,
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

const minterWallet = new ethers.Wallet(accounts.MinterKey, l1Provider);
const spender1Wallet = new ethers.Wallet(accounts.Spender1Key, l1Provider);
const to1Wallet = new ethers.Wallet(accounts.To1PrivateKey, l1Provider);


let newUserPrivateKey = "267d5dc2af7a0ea942834c34bfdf6250d2ce599e3e86c0e4cb59815805cce97a";
let newUserAddress = "0x9817dBBfBd209CC7B4bF1AC25A4Ca450EAE135BD";
const newUserWallet = new ethers.Wallet(newUserPrivateKey, l1Provider);

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

    await client.waitForActionCompletion(client.getMintProof, response.request_id)

    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Minter)
    console.log("balance: ", balance)
}


async function testMint() {
    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        to_address: accounts.To2,
        amount: 1
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

async function testMintForNewUser() {
    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        to_address: newUserAddress,
        amount: 21
    };
    let response = await client.generateMintProof(generateRequest);
    console.log("Generate Mint Proof response:", response);
    let proofResult = await client.waitForProofCompletion(client.getMintProof, response.request_id)

    console.log("Mint Proof Result:", proofResult);
    let receipt = await callPrivateMint(config.contracts.PrivateERCToken, proofResult, minterWallet)
    console.log("receipt", receipt)

    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, newUserAddress)
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

async function testDirectTransferPeers(){
    const transferRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.To1,
        to_address: accounts.To2,
        amount: 2
    };

    let response = await client.generateDirectTransfer(transferRequest);
    console.log("Generate transfer Proof response:", response);
    let proofResult = await client.waitForActionCompletion(client.getTransferProof, response.request_id)

    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.To2)
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
    let tokenResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id);
    console.log("tokenResult: ", tokenResult)
}

async function testReserveTokensAndBurn(){
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: accounts.Minter,
        amount: amount
    };

    let response = await client.generateSplitToken(splitRequest);
    console.log("Generate transfer Proof response:", response);
    let tokenResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id);
    console.log("tokenResult: ", tokenResult)
    let receipt = await callPrivateBurn(config.contracts.PrivateERCToken, minterWallet, '0x'+tokenResult.transfer_token_id);
    console.log("privateBurn receipt: ", receipt)
    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Minter)
    console.log("balance of Minter:", balance)
}

async function testNewUserSplitTokensAndBurn(){
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: newUserAddress,
        amount: amount
    };

    let response = await client.generateSplitToken(splitRequest);
    console.log("Generate transfer Proof response:", response);
    let tokenResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id);
    console.log("tokenResult: ", tokenResult)
    let receipt = await callPrivateBurn(config.contracts.PrivateERCToken, newUserWallet, '0x'+tokenResult.transfer_token_id);
    console.log("privateBurn receipt: ", receipt)
    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, newUserAddress)
    console.log("balance of newUser:", balance)
}

async function testReserveTokensAndTransfer(){
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: accounts.To2,
        amount: amount
    };

    let response = await client.generateSplitToken(splitRequest);
    console.log("Generate transfer Proof response:", response);
    let tokenResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id);
    console.log("tokenResult: ", tokenResult)
    let receipt = await callPrivateTransfer(minterWallet, config.contracts.PrivateERCToken, accounts.To2, '0x'+tokenResult.transfer_token_id);
    console.log("privateBurn receipt: ", receipt)

    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Minter)
    console.log("balance of Minter:", balance)
}

async function testNewUserSplitTokensAndTransfer(){
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: newUserAddress,
        to_address: accounts.To2,
        amount: amount
    };

    let response = await client.generateSplitToken(splitRequest);
    console.log("Generate transfer Proof response:", response);
    let tokenResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id);
    console.log("tokenResult: ", tokenResult)
    let receipt = await callPrivateTransfer(newUserWallet, config.contracts.PrivateERCToken, accounts.To2, '0x'+tokenResult.transfer_token_id);
    console.log("privateBurn receipt: ", receipt)

    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, newUserAddress)
    console.log("balance of newUser:", balance)
}


async function testCrossBankReserveTokensAndTransfer2Node1(){
    let toAddress ="0x5a3288A7400B2cd5e0568728E8216D9392094892";
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address:toAddress,
        amount: amount
    };

    let response = await client.generateSplitToken(splitRequest);
    console.log("Generate transfer Proof response:", response);
    let tokenResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id);
    console.log("tokenResult: ", tokenResult)
    let receipt = await callPrivateTransfer(minterWallet, config.contracts.PrivateERCToken, toAddress, '0x'+tokenResult.transfer_token_id);
    console.log("PrivateTransfer receipt: ", receipt)
    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Minter)
    console.log("balance of Minter:", balance)
}

async function testCrossBankReserveTokensAndTransfer2Node2(){
    let toAddress ="0xF8041E1185C7106121952bA9914ff904A4A01c80";
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address:toAddress,
        amount: amount
    };

    let response = await client.generateSplitToken(splitRequest);
    console.log("Generate transfer Proof response:", response);
    let tokenResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id);
    console.log("tokenResult: ", tokenResult)
    let receipt = await callPrivateTransfer(minterWallet, config.contracts.PrivateERCToken, toAddress, '0x'+tokenResult.transfer_token_id);
    console.log("PrivateTransfer receipt: ", receipt)
    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Minter)
    console.log("balance of Minter:", balance)
}

async function testCrossBankReserveTokensAndTransfer2Node4(){
    let toAddress ="0xbA268f776F70caDB087e73020dfE41c7298363Ed";
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address:toAddress,
        amount: amount
    };

    let response = await client.generateSplitToken(splitRequest);
    console.log("Generate transfer Proof response:", response);
    let tokenResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id);
    console.log("tokenResult: ", tokenResult)
    let receipt = await callPrivateTransfer(minterWallet, config.contracts.PrivateERCToken, toAddress, '0x'+tokenResult.transfer_token_id);
    console.log("PrivateTransfer receipt: ", receipt)
    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Minter)
    console.log("balance of Minter:", balance)
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

async function testBurnToken() {
    let tokenId = "61914ef2a2e652a88afbe081269ce156b194786d6380f49c062fe2cc295cecef"
    let receipt = await callPrivateBurn(config.contracts.PrivateERCToken, minterWallet, '0x'+ tokenId);
    console.log("privateBurn receipt: ", receipt)
    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Minter)
    console.log("balance of Minter:", balance)
}

async function registerNewUserInNode3(){
    const institutionRegistration = await ethers.getContractAt("InstitutionRegistration", config.contracts.InstitutionRegistration, newUserWallet);
    let tx = await institutionRegistration.registerUser("0xf17f52151EbEF6C7334FAD080c5704D77216b732");
    let receipt = await tx.wait();
    console.log("user registration receipt: ", receipt);
}

async function registerNewUserInNode1(){
    const institutionRegistration = await ethers.getContractAt("InstitutionRegistration", config.contracts.InstitutionRegistration, newUserWallet);
    let tx = await institutionRegistration.registerUser("0x2c44c4B96AE5f9c9dbf32cF3AA743Cd0277F3127");
    let receipt = await tx.wait();
    console.log("user registration receipt: ", receipt);
}

// checkDeployedUSDC().then();
// testMint().then()
// checkToken(accounts.Minter, '0x61914ef2a2e652a88afbe081269ce156b194786d6380f49c062fe2cc295cecef').then();

// mintForStart().then()
// testDirectTransfer().then();
// testDirectTransferPeers().then();
// checkBalance(accounts.Minter).then()

// testReserveTokens().then();

// testReserveTokensAndBurn().then();
// testReserveTokensAndTransfer().then();
// checkBalance(accounts.Minter).then()

// testCrossBankReserveTokensAndTransfer2Node1().then();
// testCrossBankReserveTokensAndTransfer2Node2().then();
// testCrossBankReserveTokensAndTransfer2Node4().then();


// testBurnToken().then();
// testTransfer().then();
// testBurn().then();

// testApprove().then();
// testTransferFrom().then();
// registerNewUserInNode3().then();

/* test register new user in node3 */
// testMintForNewUser().then();
// testNewUserSplitTokensAndTransfer().then();
// testNewUserSplitTokensAndBurn().then()
// checkBalance(newUserAddress).then()

/* test register new user in node1 */
// registerNewUserInNode1().then();
// testMintForNewUser().then();
