const assert = require('node:assert');

const hre = require("hardhat");
const { ethers } = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts =require('./../../deployments/account.json');

const {createClient} = require('../qa/token_grpc')

const amount1 =   {
    "cl_x": ethers.toBigInt("0x0d029eb41b5625e223245a725edc6e5423f6f5e724d2fe4d032c9236417e3669"),
    "cl_y": ethers.toBigInt("0x2c82bb1c78c69d653b7a69036c51fa519410cae862406409b2d04d21d90c2775"),
    "cr_x": ethers.toBigInt("0x265836014f928100c4b529a96e88fb90e04dd5dce9bab6cc943acbb41d0439a0"),
    "cr_y": ethers.toBigInt("0x127652b20a9c8eb19634fd64c1f75f9d18ffbece57c71e14879ed66d9f4b6d3d"),
}

const amount2 =   {
    "cl_x": ethers.toBigInt("0x17118a9fa7718e08b6df8b152df1d466efdb462db3527bec11ce0b99e313a03e"),
    "cl_y": ethers.toBigInt("0x2551993d77f3a77cb033b52165cfc83ab3600b460b605caf2cd59ffe21431cc7"),
    "cr_x": ethers.toBigInt("0x1cd89d45c98f78c5c2cb3a66ba1a5c047b15faac6130c75585dfe03adeab7fce"),
    "cr_y": ethers.toBigInt("0x2639e268d5bb43de0f07fa7fb809591d7edad099267118970eece9c70b73358e"),
}
const rpcUrl ='aa4db6db10866450fb6685fb175e72f9-423262944.us-west-1.elb.amazonaws.com:50051'
const client = createClient(rpcUrl)


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

const L1Minter = "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f";
const L1MinterWallet = new ethers.Wallet(L1Minter, l1Provider);

const L1Sender = "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f";
const L1SenderWallet = new ethers.Wallet(L1Minter, l1Provider);

const amount =1;
const accountAddress=config.accounts


async function checkDeployedUSDC() {
    const HamsaUSDCFactory = await ethers.getContractFactory("HamsaUSDC", {
        libraries: {
            "TokenEventLib": config.libraries.TokenEventLib,
            "TokenVerificationLib": config.libraries.TokenVerificationLib,
            "TokenGrumpkinLib": config.libraries.TokenGrumpkinLib,
            "SignatureChecker": config.libraries.SignatureChecker
        }
    });

    const hamsaUSDC = await HamsaUSDCFactory.attach(config.contracts.PrivateERCToken);

    //validate basic properties
    let name= await hamsaUSDC.name();
    let symbol = await hamsaUSDC.symbol();
    let decimals = await hamsaUSDC.decimals();
    let currency = await hamsaUSDC.currency();
    console.log("(name, symbol, decimals, currency)", name, symbol, decimals, currency);
    assert.equal(decimals.toString(), "6")

    // validate minters
    let masterMinter= await hamsaUSDC.masterMinter();
    let isMinter = await hamsaUSDC.isMinter(accounts.Minter);

    console.log("masterMinter: ", masterMinter)
    console.log("isMinter: ", isMinter)
    assert.equal(masterMinter,accounts.MasterMinter);
    assert.equal(isMinter, true)

    // validate pauser
    let pauser = await hamsaUSDC.pauser();
    let paused= await hamsaUSDC.paused();
    console.log("(pauser, paused)", pauser, paused);
    assert.equal(paused, false)


    //validate blackList
    let blacklister = await hamsaUSDC.blacklister();
    let is_blackedListed = await hamsaUSDC.isBlacklisted(accounts.BlockedAccount)
    console.log("blacklister", blacklister);
    console.log(`${accounts.BlockedAccount} is blackedListed:`, is_blackedListed);
    assert.equal(is_blackedListed, true)
}

async function generateMintProof() {
    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        to_address:accountAddress,
        amount: amount
    };
    let result = await client.generateMintProof(generateRequest);
    console.log("Generate Mint Proof Result:", result);
    const requestId = result.request_id;

    result = await client.getMintProof(requestId)
    console.log("Mint Proof Result:", result);
}


// generateMintProof().then()
checkDeployedUSDC().then();