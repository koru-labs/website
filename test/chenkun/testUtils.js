const assert = require('node:assert');

const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')
// const { createClient } = require('../qa/token_http');
// const rpcUrl = "127.0.0.1:50051"
const rpcUrl = "qa-node3-rpc.hamsa-ucl.com:50051"
// const rpcUrl = "a9c20a6c009e44a11b75092155632a0e-1098386893.us-west-1.elb.amazonaws.com:50051"
const client = createClient(rpcUrl)

const {
    callPrivateMint,
    callPrivateTransfer,
    callPrivateTransferFrom,
    getAddressBalance,
    callPrivateCancel,
    callPrivateRevoke,
    callPrivateBurn,
    getPublicTotalSupply,
    getAddressBalance2,
    getTotalSupplyNode3, getToken,
} = require("../help/testHelp")
const hre = require("hardhat");
const grpc = require("@grpc/grpc-js");
const {makeEmptyAccountState} = require("hardhat/internal/hardhat-network/provider/fork/AccountState");
const deployed = require("../../deployments/image9.json");
const {testConvert2pUSDCWithProvidedData} = require("../sun/private_usdc_test");

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
const spenderWallet = new ethers.Wallet(accounts.Spender1Key, l1Provider);
const amount = 1;


async function mintForStart() {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        to_address: accounts.Minter,
        amount: 100
    };
    let response = await client.generateMintProof(generateRequest, metadata);
    console.log("Generate Mint Proof response:", response);

    let receipt = await callPrivateMint(config.contracts.PrivateERCToken, response, minterWallet)
    console.log("receipt", receipt)

    await sleep(2000)

    await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.Minter,metadata)
}

async function testDirectMintByAuth() {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    console.time('testDirectMint'); // Start timing
    const generateRequest = {
        from_address: accounts.Minter,
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        to_address: accounts.Minter,
        amount: 100
    };
    let response = await client.generateDirectMint(generateRequest,metadata);
    console.log("Generate Mint Proof response:", response);
    // let response1 = await client.getTokenActionStatus(response.request_id,metadata);
    // console.log("Generate Mint Proof response:", response1);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata)
    console.timeEnd('testDirectMint'); // End timing
    await getAddressBalance2(client,config.contracts.PrivateERCToken,accounts.Minter,metadata)
}
async function testDirectBurnByAuth() {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    console.time('testDirectBurn'); // Start timing
    const startTime = Date.now(); // 获取当前时间戳（毫秒）
    console.log("Starting testDirectBurn at:", new Date(startTime).toISOString()); // 打印开始时间
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        amount: amount
    };

    let response = await client.generateDirectBurn(splitRequest,metadata);
    console.log("Generate transfer Proof response:", response);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,metadata)
    console.timeEnd('testDirectBurn'); // End timing
    const endTime = Date.now(); // 获取结束时间戳
    console.log("Finished testDirectBurn at:", new Date(endTime).toISOString()); // 打印结束时间
    await getAddressBalance2(client,config.contracts.PrivateERCToken,accounts.Minter,metadata)
}
async function testDirectTransferByAuth(){
    const metadata = await createAuthMetadata(accounts.MinterKey);
    const metadata2 = await createAuthMetadata(accounts.To1PrivateKey);

    console.time('testDirectTransfer')
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address : accounts.To1,
        amount: amount
    };

    let response = await client.generateDirectTransfer(splitRequest,metadata);
    console.log("Generate transfer Proof response:", response);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,metadata)
    console.timeEnd('testDirectTransfer')
    await getAddressBalance2(client,config.contracts.PrivateERCToken,accounts.Minter,metadata)
    await getAddressBalance2(client,config.contracts.PrivateERCToken,accounts.To1,metadata2)

}
async function testTransferFromByAuth(){
    const metadata = await createAuthMetadata(accounts.MinterKey);
    const metadata2 = await createAuthMetadata(accounts.Spender1Key);
    const metadata3 = await createAuthMetadata(accounts.To1PrivateKey);
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        spender_address : accounts.Spender1,
        to_address: accounts.To1,
        amount: amount
    };

    let response = await client.generateApproveProof(splitRequest,metadata);
    console.log("Generate transfer Proof response:", response);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,metadata)
    let receipt = await callPrivateTransferFrom(spenderWallet,config.contracts.PrivateERCToken,accounts.Minter,accounts.To1,'0x'+response.transfer_token_id)
    console.log("receipt", receipt)
    await sleep(5000)
    await getAddressBalance2(client,config.contracts.PrivateERCToken,accounts.Minter,metadata)
    await getAddressBalance2(client,config.contracts.PrivateERCToken,accounts.Spender1,metadata2)
    await getAddressBalance2(client,config.contracts.PrivateERCToken,accounts.To1,metadata3)
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testReserveTokensAndBurn(){
    const metadata = await createAuthMetadata(accounts.MinterKey);
    const metadata2 = await createAuthMetadata(accounts.To1PrivateKey);
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        amount: amount
    };

    let response = await client.generateSplitToken(splitRequest,metadata);
    console.log("Generate transfer Proof response:", response);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,metadata)

    let receipt = await callPrivateBurn(config.contracts.PrivateERCToken,minterWallet,'0x'+response.transfer_token_id)
    await sleep(2000)
    await getAddressBalance2(client,config.contracts.PrivateERCToken,accounts.Minter,metadata)

}

async function testReserveTokensAndTransfer(){
    const metadata = await createAuthMetadata(accounts.MinterKey);
    const metadata2 = await createAuthMetadata(accounts.To1PrivateKey);
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: accounts.To1,
        amount: amount
    };

    let response = await client.generateSplitToken(splitRequest,metadata);
    console.log("Generate transfer Proof response:", response);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,metadata)

    let receipt = await callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,accounts.To1,'0x'+response.transfer_token_id)
    await sleep(1000)
    await getAddressBalance2(client,config.contracts.PrivateERCToken,accounts.Minter,metadata)
    await getAddressBalance2(client,config.contracts.PrivateERCToken,accounts.To1,metadata2)
}

async function testApproveTokensAndRevoke(){
    const metadata = await createAuthMetadata(accounts.MinterKey);
    const metadata2 = await createAuthMetadata(accounts.Spender1Key);
    const metadata3 = await createAuthMetadata(accounts.To1PrivateKey);
    await getAddressBalance2(client,config.contracts.PrivateERCToken,accounts.Minter,metadata)
    await getAddressBalance2(client,config.contracts.PrivateERCToken,accounts.To1,metadata3)

    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        spender_address : accounts.Spender1,
        to_address: accounts.To1,
        amount: amount
    };

    let response = await client.generateApproveProof(splitRequest,metadata3);
    console.log("Generate transfer Proof response:", response);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,metadata)
    await sleep(2000)
    let receipt = await callPrivateRevoke(config.contracts.PrivateERCToken,minterWallet,accounts.Spender1,'0x'+response.transfer_token_id)
    console.log("receipt", receipt)

    await sleep(2000)
    await getAddressBalance2(client,config.contracts.PrivateERCToken,accounts.Minter,metadata)
    await getAddressBalance2(client,config.contracts.PrivateERCToken,accounts.To1,metadata3)
}

async function testReserveTokensAndCancel(){
    const metadata = await createAuthMetadata(accounts.MinterKey);
    const metadata2 = await createAuthMetadata(accounts.To1PrivateKey);
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: accounts.To1,
        amount: amount
    };

    let response = await client.generateSplitToken(splitRequest,metadata);
    console.log("Generate transfer Proof response:", response);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,metadata)

    let receipt = await callPrivateCancel(config.contracts.PrivateERCToken,minterWallet,'0x'+response.transfer_token_id)
    await sleep(2000)
    await getAddressBalance2(client,config.contracts.PrivateERCToken,accounts.Minter,metadata)
}

async function checkBalance(account) {
    await getAddressBalance(client, config.contracts.PrivateERCToken, account)
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
async function testInstituteInformation() {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });
    const instRegistry = await InstRegistry.attach(config.contracts.InstUserProxy);

    // let tx = await instRegistry.registerUser(accounts.Spender1);
    // await tx.wait();
    let inst = await instRegistry.getUserManager("0xbA268f776F70caDB087e73020dfE41c7298363Ed");
    console.log("user registration ", inst);
    let inst1 = await instRegistry.getUserInstGrumpkinPubKey("0xbA268f776F70caDB087e73020dfE41c7298363Ed");
    console.log("user registration ", inst1);
}

async function testConvert2pUSDC() {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    const convertToPUSDCResponse = {
        amount: amount
    };
    let proofResult = await client.convertToPUSDC(convertToPUSDCResponse, metadata);
    console.log("Generate Mint Proof response:", proofResult);
    const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, minterWallet);
    const elAmount = {
        cl_x: ethers.toBigInt(proofResult.elgamal.cl_x),
        cl_y: ethers.toBigInt(proofResult.elgamal.cl_y),
        cr_x: ethers.toBigInt(proofResult.elgamal.cr_x),
        cr_y: ethers.toBigInt(proofResult.elgamal.cr_y)
    };
    const proof = proofResult.proof.map(p => ethers.toBigInt(p));
    const input = proofResult.input.map(i => ethers.toBigInt(i));
    // if (proof.length !== 8) {
    //     throw new Error(`proof array length is ${proof.length}, expected 8`);
    // }
    // if (input.length !== 7) {
    //     throw new Error(`input array length is ${input.length}, expected 7`);
    // }

    const tx = await contract.convert2pUSDC(amount,elAmount,input,proof);
    let receipt = await tx.wait();
    console.log("receipt", receipt)
    return receipt;

}

async function testConvert2USDC() {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    // const metadata2 = await createAuthMetadata(accounts.To1PrivateKey);
    // const splitRequest = {
    //     sc_address: config.contracts.PrivateERCToken,
    //     token_type: '0',
    //     from_address: accounts.Minter,
    //     amount: amount
    // };
    // let response = await client.generateSplitToken(splitRequest,metadata);
    // console.log("Generate transfer Proof response:", response);
    // await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,metadata)
    // let tokenId = response.transfer_token_id
    let tokenId = 'e4827f4805d16b29a39ff4eafe60dc468b46a24781d167ad70f5a06f16666719'
    const convertToPUSDCResponse = {
        token_id: tokenId
    };
    let proofResult = await client.convertToUSDC(convertToPUSDCResponse, metadata);
    console.log("Generate Mint Proof response:", proofResult);

    const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, minterWallet);
    const proof = proofResult.proof.map(p => ethers.toBigInt(p));
    const input = proofResult.input.map(i => ethers.toBigInt(i));
    const tx = await contract.convert2USDC('0x'+tokenId,proofResult.amount,input,proof);
    let receipt = await tx.wait();
    console.log("receipt", receipt)
    return receipt;

}
// testConvert2pUSDC().then();
// testConvert2USDC().then()


// mintForStart().then();
// testReserveTokensAndBurn().then();
// testReserveTokensAndTransfer().then()
// testReserveTokensAndCancel().then()
// testApproveTokensAndRevoke().then()
// testTransferFromByAuth().then();

//   direct-transaction
testDirectMintByAuth().then()
// testDirectBurnByAuth().then()
// testDirectTransferByAuth().then()

// testInstituteInformation().then()
