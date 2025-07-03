const assert = require('node:assert');

const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
let accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')


const rpcUrl = "qa-node3-rpc.hamsa-ucl.com:50051"
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

const minterWallet = new ethers.Wallet(accounts.MinterKey, l1Provider);
const spender1Wallet = new ethers.Wallet(accounts.Spender1Key, l1Provider);
const to1Wallet = new ethers.Wallet(accounts.To1PrivateKey, l1Provider);


let newUserPrivateKey = "267d5dc2af7a0ea942834c34bfdf6250d2ce599e3e86c0e4cb59815805cce97a";
let newUserAddress = "0x9817dBBfBd209CC7B4bF1AC25A4Ca450EAE135BD";
const newUserWallet = new ethers.Wallet(newUserPrivateKey, l1Provider);


let newUser2PrivateKey = "74f5037b731a49d897b5a1945a871337ed76dae8f830d5ca1b64a965048655a5";
let newUser2Address = "0x9d88b996c7ce52aA2623FE52f6f1481120BCa2CE";
const newUser2Wallet = new ethers.Wallet(newUser2PrivateKey, l1Provider);

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
    accounts.To2= "0x46946c52eb91cd2c8ed347b0a7758d9b22cee383"

    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        to_address: accounts.To2,
        amount: 1
    };
    let metData= await createAuthMetadata(accounts.MinterKey)
    let response = await client.generateMintProof(generateRequest, metData);
    console.log("Generate Mint Proof response:", response);
    let proofResult = await client.waitForProofCompletion( client.getMintProof, response.request_id)

    console.log("Mint Proof Result:", proofResult);
    let receipt = await callPrivateMint(config.contracts.PrivateERCToken, proofResult, minterWallet)
    console.log("receipt", receipt)

    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.To2)
    console.log("balance: ", balance)
}

async function testMintForNewUser(newUserAddress) {
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


    //this will fail, we need to connect to node1 to decode the amount
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

    let actionResult = await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id)
    console.log("direct transfer result: ", actionResult)

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

    let result = await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id)
    console.log("direct transfer result: ", result)

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

async function testNewUserSplitTokensAndBurn(newUserWallet){
    let newUserAddress= newUserWallet.address;

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

async function testNewUserSplitTokensAndTransfer(newUserWallet){
    let newUserAddress = newUserWallet.address

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
    const institutionRegistration = await ethers.getContractAt("InstitutionUserRegistry", config.contracts.InstitutionUserRegistry, newUserWallet);
    let tx = await institutionRegistration.registerUser("0xf17f52151EbEF6C7334FAD080c5704D77216b732");
    let receipt = await tx.wait();
    console.log("user registration receipt: ", receipt);
}

async function registerNewUserInNode1(){
    const institutionRegistration = await ethers.getContractAt("InstitutionUserRegistry", config.contracts.InstitutionUserRegistry, newUser2Wallet);
    let tx = await institutionRegistration.registerUser("0x2c44c4B96AE5f9c9dbf32cF3AA743Cd0277F3127");
    let receipt = await tx.wait();
    console.log("user registration receipt: ", receipt);
}

async function testTotalSupply(){
    let result = await getPublicTotalSupply(config.contracts.PrivateERCToken);
    console.log("the total supply is: ", result)
}


async function createAuthMetadata(privateKey, messagePrefix = "login") {
    const wallet = new ethers.Wallet(privateKey);
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${messagePrefix}_${timestamp}`;
    const signature = await wallet.signMessage(message);

    const metadata = new grpc.Metadata();
    metadata.set('address', wallet.address.toLowerCase());
    metadata.set('signature', signature);
    metadata.set('message', message);

    return metadata;
}

// checkDeployedUSDC().then();
testMint().then()
// checkToken(accounts.Minter, '0x61914ef2a2e652a88afbe081269ce156b194786d6380f49c062fe2cc295cecef').then();

// mintForStart().then()
// testTotalSupply().then();

// testDirectTransfer().then();
// testDirectTransferPeers().then();
// checkBalance(accounts.To2).then()

// testReserveTokens().then();

// testReserveTokensAndBurn().then();
// checkBalance(accounts.Minter).then()

// testReserveTokensAndTransfer().then();
// checkBalance(accounts.To2).then()


// testBurnToken().then();


// testApprove().then();
// testTransferFrom().then();

/* test register new user in node3 */
// registerNewUserInNode3().then();
// testMintForNewUser(newUserAddress).then();
// testNewUserSplitTokensAndTransfer(newUserWallet).then();
// testNewUserSplitTokensAndBurn(newUserAddress).then()
// checkBalance(newUserAddress).then()

/* test register new user in node1 */
// registerNewUserInNode1().then();
// testMintForNewUser(newUser2Address).then();
