const assert = require('node:assert');

const { ethers } = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts =require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')


const rpcUrl ='ac365b5fc227f46c5850d8590ddb0357-2076305457.us-west-1.elb.amazonaws.com:50051'
const client = createClient(rpcUrl)

const { callPrivateMint,
    callPrivateTransfer,
    callPrivateBurn,
    callPrivateApprove,
    callPrivateTransferFrom} = require("../help/testHelp")

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
const amount =1;


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
    let name= await privateUSDC.name();
    let symbol = await privateUSDC.symbol();
    let decimals = await privateUSDC.decimals();
    let currency = await privateUSDC.currency();
    console.log("(name, symbol, decimals, currency)", name, symbol, decimals, currency);
    assert.equal(decimals.toString(), "6")

    // validate minters
    let masterMinter= await privateUSDC.masterMinter();
    let isMinter = await privateUSDC.isMinter(accounts.Minter);

    console.log("masterMinter: ", masterMinter)
    console.log("isMinter: ", isMinter)
    assert.equal(masterMinter,accounts.MasterMinter);
    assert.equal(isMinter, true)

    // validate pauser
    let pauser = await privateUSDC.pauser();
    let paused= await privateUSDC.paused();
    console.log("(pauser, paused)", pauser, paused);
    assert.equal(paused, false)


    //validate blackList
    let blacklister = await privateUSDC.blacklister();
    let is_blackedListed = await privateUSDC.isBlacklisted(accounts.BlockedAccount)
    console.log("blacklister", blacklister);
    console.log(`${accounts.BlockedAccount} is blackedListed:`, is_blackedListed);
    assert.equal(is_blackedListed, true)
}

async function generateMintProof() {
    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        to_address: accounts.To2,
        amount: amount
    };
    let response = await client.generateMintProof(generateRequest);
    console.log("Generate Mint Proof response:", response);
    let proofResult = await client.waitForProofCompletion(client.getMintProof, response.request_id)

    console.log("Mint Proof Result:", proofResult);
    await callPrivateMint(config.contracts.PrivateERCToken,  proofResult, minterWallet)
}


generateMintProof().then()
// checkDeployedUSDC().then();