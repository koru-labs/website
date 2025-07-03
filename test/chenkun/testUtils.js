const assert = require('node:assert');

const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')
// const { createClient } = require('../qa/token_http');
// const rpcUrl = "a5f8d3d4c9d084f8ead607b8fe85e09b-1456818969.us-west-1.elb.amazonaws.com:50051"
// const rpcUrl = "http://127.0.0.1:8080"
const rpcUrl = "127.0.0.1:50051"
// const rpcUrl = "http://qa-node3-node-http.hamsa-ucl.com:8080"
// const rpcUrl = "qa-node4-node.hamsa-ucl.com:50051"
const client = createClient(rpcUrl)

const {
    callPrivateMint,
    callPrivateTransfer,
    callPrivateTransferFrom,
    getAddressBalance,
    callPrivateCancel,
    callPrivateBurn,
    getPublicTotalSupply,
    getTotalSupplyNode3, getToken,
} = require("../help/testHelp")
const hre = require("hardhat");
const grpc = require("@grpc/grpc-js");
const {makeEmptyAccountState} = require("hardhat/internal/hardhat-network/provider/fork/AccountState");

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
    await sleep(1000)
    await getAddressBalance2(client,config.contracts.PrivateERCToken,accounts.Minter)
}

async function testDirectMintByAuth() {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    console.time('testDirectMint'); // Start timing
    const generateRequest = {
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
    await sleep(1000)
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
    await sleep(3000)
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
    await sleep(1000)
    await getAddressBalance2(client,config.contracts.PrivateERCToken,accounts.Minter,metadata)
    await getAddressBalance2(client,config.contracts.PrivateERCToken,accounts.To1,metadata2)

}
async function testApproveByAuth(){
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
    await getAddressBalance2(client,config.contracts.PrivateERCToken,accounts.Minter,metadata)
    await getAddressBalance2(client,config.contracts.PrivateERCToken,accounts.Spender1,metadata2)
    await getAddressBalance2(client,config.contracts.PrivateERCToken,accounts.To1,metadata3)
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
    await sleep(1000)
    await getAddressBalance2(client,config.contracts.PrivateERCToken,accounts.Minter)

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

async function mintForGnark() {
    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        to_address: accounts.Minter,
        amount: 100
    };
    let response = await client.generateMintProof(generateRequest);
    console.log("Generate Mint Proof response:", response);
    let receipt = await callPrivateMint(config.contracts.PrivateERCToken, response, minterWallet)
    console.log("receipt", receipt)

    await sleep(3000)

    await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.Minter)
}

async function splitForGnark() {
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: accounts.To1,
        amount: 1
    };

    let response = await client.generateSplitToken(splitRequest);
    console.log("Generate transfer Proof response:", response);
    let proofResult = await client.waitForActionCompletion(client.getSplitToken, response.requestId)
    if (proofResult.status == "TOKEN_ACTION_STATUS_SUC") {
        console.log("proofResult", proofResult)
        let receipt = await callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,accounts.To1,'0x'+proofResult.transferTokenId)
        console.log("receipt", receipt)
    }

    await sleep(3000)

    await getAddressBalance2(client, config.contracts.PrivateERCToken, accounts.Minter)
}

function convertBigInt2Hex(number) {
    return ethers.toBigInt(number).toString(10)
}
async function getAddressBalance2(grpcClient, scAddress, account,metadata) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress)
    let amount = await contract.privateBalanceOf(account)

    let balance=  {
        cl_x: convertBigInt2Hex(amount[0]),
        cl_y: convertBigInt2Hex(amount[1]),
        cr_x: convertBigInt2Hex(amount[2]),
        cr_y: convertBigInt2Hex(amount[3])
    }
    let result = await grpcClient.getAccountBalance(scAddress, account,metadata)
    let decodeAmount = 0
    if (balance.cl_x != '0') {
        decodeAmount = await grpcClient.decodeElgamalAmount(balance,metadata)
    }

    console.log("===================================================================");
    console.log("Checking Owner Balance");
    console.log("Owner Address:", account);
    console.log("-------------------------------------------------------------------");
    console.log("Decrypted On-chain Balance:", decodeAmount);
    console.log("Database Balance:", result);
    console.log("===================================================================\n");

    return result
}
async function testMintProof() {
    // const Field = await ethers.getContractFactory("Test123");
    // const field = await Field.deploy();
    // await field.waitForDeployment();
    const field = await ethers.getContractAt("Test123", '0x01153E92465d297da7f7016F9F499BeF405406Ff');

    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        amount: amount
    };

    let proofResult = await client.generateSplitToken(splitRequest);
    console.log("Generate transfer Proof response:", response);
    const proof = proofResult.proof.map(p => ethers.toBigInt(p));
    const input = proofResult.input.map(i => ethers.toBigInt(i));
    // let proofResult = {
    //     "proof": [
    //         "20704621465965902899370514217142220959014623338609974176522156475130355227584",
    //         "4154258205787308145486951134874050137930006570400603167074751449782632063638",
    //         "6621062848775694552341088259244635842386952165994990908924926316982181602079",
    //         "11313879978330335430635251590752358899577965530301389401964148611085083007330",
    //         "1904424993665653638633233801839942262681441540007915861712855904936945607928",
    //         "3531006800291596388584831755408717857615241818827657275691700014052851253782",
    //         "16350317391325684733058535313167936872697356027531383652125470264845786991898",
    //         "13179728849646058237540051913146775335438036988519200505155706883446894049602"
    //     ],
    //     "input": [
    //         "17965178807605681775593476527901391566646357775548805416191630067931921590266",
    //         "17997503520096523373978760079614633178183544935372525079367653487073845131371",
    //         "2799658707790704252170544877645553735081603739176317448125814928308770685127",
    //         "10724405929777949929088094477911843117820716522007699467531083531418761611245",
    //         "5192894850169903791362725127170990533579393264039011019312527579157434122682",
    //         "3520759003147830951096692733752297189099154564751426768970341245712748028104",
    //         "12198584175471209254826133453768949644194543392114153616758839294312748081016",
    //         "11146190807925755856066759478278517227418629794838021816289759838424674944240",
    //         "17359619073730972551415589558340400392541834216552872124804640010702245254128",
    //         "19707683610726694133921201606412303415403410406611983852234271995680536030591",
    //         "14880766180244154770131590108381907624837659483302814589180484099767736005296",
    //         "7592798006130376633380281739818126745491458686960244167395214458583488328280",
    //         "17359619073730972551415589558340400392541834216552872124804640010702245254128",
    //         "19707683610726694133921201606412303415403410406611983852234271995680536030591",
    //         "14880766180244154770131590108381907624837659483302814589180484099767736005296",
    //         "7592798006130376633380281739818126745491458686960244167395214458583488328280",
    //         "14867489045451479287215256054831019265497990299815167173241037631264676460349",
    //         "9519187890267549073736999464396081731503319602421352094119155053337094535674",
    //         "14867489045451479287215256054831019265497990299815167173241037631264676460349",
    //         "9519187890267549073736999464396081731503319602421352094119155053337094535674",
    //         "14867489045451479287215256054831019265497990299815167173241037631264676460349",
    //         "9519187890267549073736999464396081731503319602421352094119155053337094535674"
    //     ],
    //     "success": true,
    //     "message": "ok"
    // }
    // const proof = proofResult.proof.map(p => ethers.toBigInt(p));
    // const input = proofResult.input.map(i => ethers.toBigInt(i));
    console.log("proof:", proof)
    console.log("input:", input)
    field.verifyProof(proof,input);
}
async function testCkun() {
    const Field = await ethers.getContractFactory("Test123");
    const field = await Field.deploy();
    await field.waitForDeployment();
    let proofResult =  {
        "proof": [
            "15024877914083033078472302925279322469595280637829609270041461270252969746646",
            "20323733212571875007086969792069111221824033707054207226776534848768762661814",
            "18723045133680818881232973988853539602611364794496933611671896943610399542406",
            "12165483988068262611639596271143737742051599923618867775704009327698758938774",
            "13420020104892966592311944764684095690226660029893144241164362106778654229630",
            "16524361806398985093689384225148647027643597942618904227662943730461091896702",
            "17302880661004336969907493535152765889479530863867837764111347090634711356717",
            "9656261867066298051527092411895071141764649639322390808606917380740773571571"
        ],
            "input": [
            "17178178295789621300845230937028035635663558133370991957136507193907725632920",
            "4875271418526773850694943640951396355372113298442878826972310222676534996849",
            "17241559641100460019253859999086669596878409916468046195092678422508930609001",
            "10448191953239935720752735240140405310344986397947046589343178468078270085551",
            "265873344800576416662864177294701553857172528328061109999139523633577511849",
            "17199895774120682188131494472104121027756827451358145158011211853984273681072",
            "5850651513034773176870852687685469154365387514154528401924225925714802327487",
            "5496128072490784526846704598042033427900552655560593618811236975040529100509",
            "11436935289375938358821026551467988192549762734118582904392720854544733908501",
            "13018396207456055269198710221408461489797585480949392269635310346483976753991",
            "17155940539083175591422456225947173590945152465840954358838037280051171756565",
            "3201124279097570141446702204575840382245871660507214551971019082896267738722",
            "11436935289375938358821026551467988192549762734118582904392720854544733908501",
            "13018396207456055269198710221408461489797585480949392269635310346483976753991",
            "17155940539083175591422456225947173590945152465840954358838037280051171756565",
            "3201124279097570141446702204575840382245871660507214551971019082896267738722",
            "14867489045451479287215256054831019265497990299815167173241037631264676460349",
            "9519187890267549073736999464396081731503319602421352094119155053337094535674",
            "14867489045451479287215256054831019265497990299815167173241037631264676460349",
            "9519187890267549073736999464396081731503319602421352094119155053337094535674"
        ],
            "success": true,
            "message": "ok"
    }
    const proof = proofResult.proof.map(p => ethers.toBigInt(p));
    const input = proofResult.input.map(i => ethers.toBigInt(i));
    console.log("proof:", proof)
    console.log("input:", input)
    field.verifyProof(proof,input);
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
// testDirectMintByAuth().then()
// testDirectBurnByAuth().then()
// testDirectTransferByAuth().then()
testApproveByAuth().then();

// testGetSplitTokenList().then()
// testDirectMint().then()

// testDirectBurn().then()
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
// mintForGnark().then()
// testMintProof().then()
// testCkun().then()
// splitForGnark().then()