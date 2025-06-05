const { expect } = require("chai");
const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')


const rpcUrl = "a5f8d3d4c9d084f8ead607b8fe85e09b-1456818969.us-west-1.elb.amazonaws.com:50051"
// const rpcUrl = 'dev-node3-node.hamsa-ucl.com:50051'
const client = createClient(rpcUrl)

const {
    callPrivateMint,
    callPrivateTransfer,
    callPrivateBurn,
    // callPrivateApprove,
    // callPrivateTransferFrom,
    getAddressBalance,
    getTotalSupplyNode3,
    getPublicTotalSupply,
    registerUser,
    isBlackList,
    addToBlackList,
    removeFromBlackList,
    getEvents
} = require("../help/testHelp")
const {address} = require("hardhat/internal/core/config/config-validation");

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

const toAddress1 = accounts.To1;
const to1Wallet = new ethers.Wallet(accounts.To1PrivateKey, l1Provider);
const toAddress2 = accounts.To2;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const userInNode1 = '0x5a3288A7400B2cd5e0568728E8216D9392094892';
const userInNode2 = '0xF8041E1185C7106121952bA9914ff904A4A01c80';
const userInNode3 = '0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB';
const userInNode4 = '0xbA268f776F70caDB087e73020dfE41c7298363Ed';


const amount = 100;
let preBalance,postBalance;
let preAllowance,postAllowance;


// async function mint(address,amount) {
//     const generateRequest = {
//         sc_address: config.contracts.PrivateERCToken,
//         token_type: '0',
//         to_address: address,
//         amount: amount
//     };
//     console.log("generateMintRequest:", generateRequest)
//     let response = await client.generateMintProof(generateRequest);
//     console.log("Generate Mint Proof response:", response);
//     let proofResult = await client.waitForProofCompletion(client.getMintProof, response.request_id)
//
//     console.log("Mint Proof Result:", proofResult);
//     let receipt = await callPrivateMint(config.contracts.PrivateERCToken, proofResult, minterWallet)
//     console.log("receipt", receipt)
//
// }

async function mint(address,amount) {
    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        to_address: address,
        amount: amount
    };
    console.log("generateMintRequest:", generateRequest)
    try {
        const response = await client.generateMintProof(generateRequest);
        const proofResult = await client.waitForProofCompletion(client.getMintProof, response.request_id)
        const receipt = await callPrivateMint(config.contracts.PrivateERCToken, proofResult, minterWallet)
        return  receipt
    }catch (error){
        const wrappedError = new Error('Minting failed: ' + error.details);
        wrappedError.code = error.code;
        wrappedError.details = error.details;
        throw wrappedError;
    }
}

async function ReserveTokensAndTransfer(toAddress,amount) {
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: toAddress,
        amount: amount
    };
    console.log("generateSplitTokenRequest:", splitRequest)
    let response = await client.generateSplitToken(splitRequest);
    console.log("Generate transfer Proof response:", response);
    let proofResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id)
    if (proofResult.status == "TOKEN_ACTION_STATUS_SUC") {
        console.log("proofResult", proofResult)
        let tokenId = '0x'+proofResult.transfer_token_id
        console.log("tokenId", tokenId)
        // let receipt = await callPrivateTransfer(config.contracts.PrivateERCToken,tokenId,toAddress,minterWallet)
        let receipt = await callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress,tokenId)
        console.log("receipt", receipt)
    }

}

async function ReserveTokensAndTransferFrom(fromWallet,fromAddress,toAddress,amount){
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: fromAddress,
        to_address: toAddress,
        amount: amount
    };

    let response = await client.generateSplitToken(splitRequest);
    console.log("Generate transfer Proof response:", response);
    let proofResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id)
    if (proofResult.status == "TOKEN_ACTION_STATUS_SUC") {
        console.log("proofResult", proofResult)
        let receipt = await callPrivateTransfer(fromWallet,config.contracts.PrivateERCToken,toAddress,'0x'+proofResult.transfer_token_id)
        console.log("receipt", receipt)
    }
}

async function ReserveTokensAndTransferFrom2(toAddress,amount){
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.To1,
        to_address: toAddress,
        amount: amount
    };

    let response = await client.generateSplitToken(splitRequest);
    console.log("Generate transfer Proof response:", response);
    let proofResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id)
    if (proofResult.status == "TOKEN_ACTION_STATUS_SUC") {
        console.log("proofResult", proofResult)
        let receipt = await callPrivateTransfer(to1Wallet,config.contracts.PrivateERCToken,toAddress,'0x'+proofResult.transfer_token_id)
        console.log("receipt", receipt)
    }
}

async function ReserveTokensAndBurn(amount) {
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: accounts.Minter,
        amount: amount
    };

    let response = await client.generateSplitToken(splitRequest);
    console.log("Generate Split Proof response:", response);
    let tokenResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id);
    console.log("tokenResult: ", tokenResult)
    let receipt = await callPrivateBurn(config.contracts.PrivateERCToken, minterWallet, '0x'+tokenResult.transfer_token_id);
    console.log("privateBurn receipt: ", receipt)
}
async function ReserveTokensAndBurnFromUser(wallet,address,amount) {
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: address,
        to_address: address,
        amount: amount
    };

    let response = await client.generateSplitToken(splitRequest);
    console.log("Generate Split Proof response:", response);
    let tokenResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id);
    console.log("tokenResult: ", tokenResult)
    let receipt = await callPrivateBurn(config.contracts.PrivateERCToken, wallet, '0x'+tokenResult.transfer_token_id);
    console.log("privateBurn receipt: ", receipt)
}
//
// async function Approve(amount) {
//     const approveRequest = {
//         sc_address: config.contracts.PrivateERCToken,
//         token_type: '0',
//         from_address: accounts.Minter,
//         to_address: accounts.Spender1,
//         amount: amount
//     };
//     let response = await client.generateApproveProof(approveRequest);
//     console.log("Generate Approve Proof response:", response);
//     let proofResult = await client.waitForProofCompletion(client.getApproveProof, response.request_id)
//
//     console.log("Approve Proof Result:", proofResult);
//     let receipt = await callPrivateApprove(config.contracts.PrivateERCToken, proofResult, minterWallet)
//     console.log("receipt", receipt)
//
// }
//
// async function ApproveWithWallet(fromWallet,amount) {
//     const approveRequest = {
//         sc_address: config.contracts.PrivateERCToken,
//         token_type: '0',
//         from_address: fromWallet.address,
//         to_address: accounts.Spender1,
//         amount: amount
//     };
//
//     let response = await client.generateApproveProof(approveRequest);
//     console.log("Generate Approve Proof response:", response);
//     let proofResult = await client.waitForProofCompletion(client.getApproveProof, response.request_id)
//
//     console.log("Approve Proof Result:", proofResult);
//     let receipt = await callPrivateApprove(config.contracts.PrivateERCToken, proofResult, fromWallet)
//     console.log("receipt", receipt)
//
// }
//
// async function TransferFrom(toAddress,amount) {
//     const transferFromRequest = {
//         sc_address: config.contracts.PrivateERCToken,
//         token_type: '0',
//         from_address: accounts.Minter,
//         to_address: toAddress,
//         allowance_cancel_address: accounts.Spender1,
//         amount: amount
//     };
//     let response = await client.generateTransferFromProof(transferFromRequest);
//     console.log("Generate TransformFrom Proof response:", response);
//     let proofResult = await client.waitForProofCompletion(client.getTransferFromProof, response.request_id)
//
//     console.log("TransferFrom Proof Result:", proofResult);
//     let receipt = await callPrivateTransferFrom(config.contracts.PrivateERCToken, proofResult, spender1Wallet)
//     console.log("receipt", receipt)
// }
//
// async function TransferFromOther(fromAddress,toAddress,amount) {
//     const transferFromRequest = {
//         sc_address: config.contracts.PrivateERCToken,
//         token_type: '0',
//         from_address: fromAddress,
//         to_address: toAddress,
//         allowance_cancel_address: accounts.Spender1,
//         amount: amount
//     };
//     console.log("transferFromRequest:", transferFromRequest)
//     let response = await client.generateTransferFromProof(transferFromRequest);
//     console.log("Generate TransformFrom Proof response:", response);
//     let proofResult = await client.waitForProofCompletion(client.getTransferFromProof, response.request_id)
//
//     console.log("TransferFrom Proof Result:", proofResult);
//     let receipt = await callPrivateTransferFrom(config.contracts.PrivateERCToken, proofResult, spender1Wallet)
//     console.log("receipt", receipt)
// }

async function getTokenBalance(address){
    let balance = await client.getAccountBalance(config.contracts.PrivateERCToken, address)
    // console.log(`address ${address} account balance ${balance.balance} `)
    // console.log("account balance: ", await getAddressBalance(client, config.contracts.PrivateERCToken, address))
    return Number(balance.balance)
}

async function getMinterAllowance(){
    const request = {
        sc_address: config.contracts.PrivateERCToken
    };
    let allowance = await client.getMintAllowed(request)
    console.log("allowance: ", allowance)
    return Number(allowance.amount)
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function DirectMint(receiver,amount) {
    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        to_address: receiver,
        amount: amount
    };
    let response = await client.generateDirectMint(generateRequest);
    console.log("Generate Mint Proof response:", response);
    await client.waitForActionCompletion(client.getMintProof, response.request_id)
}

async function DirectTransfer(from,receiver,amount) {
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: from,
        to_address : receiver,
        amount: amount
    };

    let response = await client.generateDirectTransfer(splitRequest);
    console.log("Generate transfer Proof response:", response);
    await client.waitForActionCompletion(client.getSplitToken, response.request_id)
}

async function DirectBurn(address,amount) {
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: address,
        amount: amount
    };

    let response = await client.generateDirectBurn(splitRequest);
    console.log("Generate transfer Proof response:", response);
    await client.waitForActionCompletion(client.getSplitToken, response.request_id)
}


describe("Check address balance",function (){
    it("get address balance", async function () {
        console.log(await getTokenBalance(accounts.Minter));
        console.log(await getTokenBalance(accounts.To1));
        console.log(await getTokenBalance(accounts.To2));
    });
})


describe("Mint", function () {
    this.timeout(1200000);
    const recevier = accounts.Minter;
    beforeEach(async function () {
        preBalance = await getTokenBalance(recevier);
    });

    it('mint_100_success',async () => {
        try {
            await mint(recevier,amount);
            postBalance = await getTokenBalance(recevier);
            expect(postBalance).to.equal(preBalance + amount);
        }catch (error){
            console.log(error)
        }
    });
    it('mint_1_success',async () => {
        try {
            const amount = 1;
            await mint(recevier,amount);
            postBalance = await getTokenBalance(recevier);
            expect(postBalance).to.equal(preBalance + amount);
        }catch (error){
            console.log(error)
        }
    });
    it('mint_0_Invalid Amount',async () => {
        const amount = 0;
        try {
            await mint(recevier,amount);
        }catch (error){
            console.log("error:",error)
            expect(error.code).to.equal(2);
            expect(error.details).to.equal("Invalid Amount");
        }
    });
    it('mint_a_Invalid Amount',async () => {
        const amount = 'a';
        try {
            await mint(recevier,amount);
        }catch (error){
            console.log("error:",error)
            expect(error.details).to.equal("Invalid Amount");
        }
    });

    it.skip('mint_100_5_times_success', async () => {
        const times = 5
        try {
            for (let i = 0; i < times; i++) {
                await mint(recevier,amount);
            }
            postBalance = await getTokenBalance(recevier);
            expect(postBalance).to.equal(preBalance + amount * times);
        }catch (error){
            console.log(error)
        }
    });
    it('mint_amount_larger_than_allowance_insufficient',async ()=>{
        const allowance = await getMinterAllowance()
        const amount = allowance + 1
        try {
            await mint(recevier,amount);
        }catch (error){
            expect(error.details).to.equal("allowedAmount is insufficient")
        }
    });
    it('mint_negative',async () => {
        const amount = -1;
        try {
            await mint(recevier,amount);
        }catch (error){
            expect(error.details).to.equal("Invalid Amount")
        }
    });
    it('mint_to_spenderAddress_success',async () => {
        const preBalanceSpender = await getTokenBalance(accounts.Spender1);
        try{
            await mint(accounts.Spender1,amount);
            const postBalanceSpender = await getTokenBalance(accounts.Spender1);
            expect(postBalanceSpender).to.equal(preBalanceSpender + amount);
        }catch (error){
            console.log("error:",error)
        }
    });
    it('mint_to_userAddress_success',async () => {
        const userAddress = accounts.To1;
        const preBalanceUser = await getTokenBalance(userAddress);
        try{
            await mint(userAddress,amount);
            const postBalanceUser = await getTokenBalance(userAddress);
            expect(postBalanceUser).to.equal(preBalanceUser + amount);
        }catch (error){
            console.log("error:",error)
        }
    });
    it('mint_to_zeroAddress',async () => {
        try {
            await mint(ZERO_ADDRESS,amount);
        }catch (error){
            expect(error.details).to.equal("failed to get GrumpkinKey for to address")
        }
    });
    it('mint to a new address',async () => {
        const wallet = ethers.Wallet.createRandom();
        const toAddress = wallet.address;
        try {
            await mint(toAddress,amount);
        }catch (error){
            expect(error.details).to.equal("failed to get GrumpkinKey for to address")
        }

    });
    it.skip('mint_allowance_success',async ()=>{
        const allowance = await getMinterAllowance()
        const amount = allowance
        try {
            await mint(recevier,amount);
            postBalance = await getTokenBalance(recevier);
            expect(postBalance).to.equal(preBalance + amount);
        }catch (error){
            console.log("error:",error)
        }
    });
});

describe("ReserveTokensAndTransfer",  function (){
    this.timeout(1200000);
    let preBalanceTo,postBalanceTo;
    beforeEach(async function () {
        await mint(accounts.Minter,100);
        preBalance = await getTokenBalance(accounts.Minter);
    });
    it('transfer_10_address1',async () => {
        const amount = 10
        preBalanceTo = await getTokenBalance(toAddress1);
        await ReserveTokensAndTransfer(toAddress1,amount);
        postBalanceTo = await getTokenBalance(toAddress1);
        postBalance = await getTokenBalance(accounts.Minter);
        console.log({preBalance,postBalance,preBalanceTo,postBalanceTo})
        expect(postBalance).to.equal(preBalance - amount);
        expect(postBalanceTo).to.equal(preBalanceTo + amount);
    });
    it('transfer_51_address2',async () => {
        const amount = 51
        preBalanceTo = await getTokenBalance(toAddress2);
        await ReserveTokensAndTransfer(toAddress2,amount);
        postBalanceTo = await getTokenBalance(toAddress2);
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance - amount);
        expect(postBalanceTo).to.equal(preBalanceTo + amount);
    });
    it('transfer_to_zero_address--Failed',async () => {
        preBalanceTo = await getTokenBalance(ZERO_ADDRESS);
        await ReserveTokensAndTransfer(ZERO_ADDRESS,amount);
    });
    it('transfer_to_spender',async () => {
        const recevier = accounts.Spender1;
        preBalanceTo = await getTokenBalance(recevier);
        await ReserveTokensAndTransfer(recevier,amount);
        postBalanceTo = await getTokenBalance(recevier);
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance - amount);
        expect(postBalanceTo).to.equal(preBalanceTo + amount);
    });
    it('transfer_to_node1_user',async () => {
        const recevier = userInNode1;
        preBalanceTo = await getTokenBalance(recevier);
        await ReserveTokensAndTransfer(recevier,amount);
        postBalanceTo = await getTokenBalance(recevier);
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance - amount);
        expect(postBalanceTo).to.equal(preBalanceTo + amount);
    });
    it('transfer_to_node2_user',async () => {
        const recevier = userInNode2;
        preBalanceTo = await getTokenBalance(recevier);
        await ReserveTokensAndTransfer(recevier,amount);
        postBalanceTo = await getTokenBalance(recevier);
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance - amount);
        expect(postBalanceTo).to.equal(preBalanceTo + amount);
    });
    it('transfer_to_node4_user',async () => {
        const recevier = userInNode4;
        preBalanceTo = await getTokenBalance(recevier);
        await ReserveTokensAndTransfer(recevier,amount);
        postBalanceTo = await getTokenBalance(recevier);
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance - amount);
        expect(postBalanceTo).to.equal(preBalanceTo + amount);
    });
    it('transfer_to_minter_itself',async () => {
        const recevier = accounts.Minter;
        await ReserveTokensAndTransfer(recevier,amount);
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance);
    });
    it('transfer_100_5_times',async () => {
        const amount = 50;
        const times = 5
        preBalanceTo = await getTokenBalance(toAddress1);
        if (preBalance>=amount*times){
            for (let i = 0; i < times; i++) {
                await ReserveTokensAndTransfer(toAddress1,amount);
           }
        }
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance - amount * times);
        postBalanceTo = await getTokenBalance(toAddress1);
        expect(postBalanceTo).to.equal(preBalanceTo + amount * times);
    });
    it('transfer_amount_larger_than_balance--Failed',async ()=>{
        const amount = preBalance + 1
        await ReserveTokensAndTransfer(toAddress1,amount)
    })
    it('transfer_0',async () => {
        const amount = 0;
        preBalanceTo = await getTokenBalance(toAddress1);
        await ReserveTokensAndTransfer(toAddress1,amount);
        postBalanceTo = await getTokenBalance(toAddress1);
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance - amount);
        expect(postBalanceTo).to.equal(preBalanceTo + amount);
    });
    it('transfer_negative',async () => {
        const amount = -1;
        await ReserveTokensAndTransfer(toAddress1,amount);
    });
    it('transfer_all_amount',async () => {
        const amount = await getTokenBalance(accounts.Minter);
        console.log("minter amount:",amount)
        preBalanceTo = await getTokenBalance(toAddress1);
        await ReserveTokensAndTransfer(toAddress1,amount);
        postBalanceTo = await getTokenBalance(toAddress1);
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance - amount);
        expect(postBalanceTo).to.equal(preBalanceTo + amount);
    });
    it.only('transfer 50 from user1 address to user2',async () => {
        const amount = 50;
        await mint(accounts.To1,100);
        preBalance = await getTokenBalance(accounts.To1);
        preBalanceTo = await getTokenBalance(accounts.To2);
        if (preBalance>=amount){
            console.log("from user balance is ",preBalance)
            await ReserveTokensAndTransferFrom2( accounts.To2,amount)
            postBalance = await getTokenBalance(accounts.To1);
            postBalanceTo = await getTokenBalance(accounts.To2);
            console.log({preBalance,postBalance,preBalanceTo,postBalanceTo})
            console.log("to2 balance",await getTokenBalance(accounts.To2))
        }else {
            console.log("balance is not enough")
        }

    });
    it('transfer 50 from to1 address to otherBank user',async () => {
        const amount = 50;
        await mint(accounts.To1,100);
        preBalance = await getTokenBalance(accounts.To1);
        if (preBalance>=amount){
            console.log("from user balance is ",preBalance)
            await ReserveTokensAndTransferFrom(to1Wallet,accounts.To1, userInNode1,amount)
            postBalance = await getTokenBalance(accounts.To1);
            console.log({preBalance,postBalance})
        }else {
            console.log("balance is not enough")
        }
    });
})

describe("ReserveTokensAndBurn", function () {
    this.timeout(1200000);
    // before(async function  () {
    //     await mint(accounts.Minter, 1000);
    // })
    beforeEach(async function () {
        preBalance = await getTokenBalance(accounts.Minter);
    });
    it('burn_100_minter', async () => {
        await ReserveTokensAndBurn(amount);
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance - amount);

    });
    it('burn_100_5_times', async () => {
        const times = 5
        for (let i = 0; i < times; i++) {
            await ReserveTokensAndBurn(amount);
        }
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance - amount * times);
    });
    it('burn_amount_larger_than_balance',async ()=>{
        const amount = preBalance + 1
        await ReserveTokensAndBurn(amount)
    })
    it('burn_0',async () => {
        const amount = 0;
        await ReserveTokensAndBurn(amount);
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance - amount);
    });
    it('burn_negative_amount',async () => {
        const amount = -1;
        await ReserveTokensAndBurn(amount);
    });
    it.skip('burn_all_amount',async () => {
        const burn_amount = await getTokenBalance(accounts.Minter);
        await ReserveTokensAndBurn(burn_amount);
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance - burn_amount);
    });
    it.skip('Burn 50 for user--not needed',async () => {
        const amount = 50;
        await mint(accounts.To1,amount);
        preBalance = await getTokenBalance(accounts.To1);
        if (preBalance>=amount){
            console.log("from user balance is ",preBalance)
            await ReserveTokensAndBurnFromUser(to1Wallet,accounts.To1, amount)
            postBalance = await getTokenBalance(accounts.To1);
            console.log({preBalance,postBalance})
        }else {
            console.log("balance is not enough")
        }

    });
});

describe("check contract totalSupply", function () {
    this.timeout(1200000);
    let totalSupplyPre,totalSupplyPost;
    // before(async function  () {
    //     await mint(accounts.Minter, 1000);
    // })

    it('check_contract_totalSupply', async () => {
        console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken));
        console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
    });
    it('totalSupply_add_after_mint ',async () => {
        totalSupplyPre = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
        await mint(accounts.Minter, 200);
        totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
        expect(totalSupplyPost).to.equal(totalSupplyPre + 200);
        console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken));
        console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
    });
    it('totalSupply_sub_after_burn ',async () => {
        totalSupplyPre  = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
        await ReserveTokensAndBurn(100);
        totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
        expect(totalSupplyPost).to.equal(totalSupplyPre - 100);
        console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken));
        console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
    });
    it('totalSupply_keep_same_after_transfer',async () => {
        totalSupplyPre = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
        console.log("totalSupplyPre: ",totalSupplyPre)
        const minterBalance = await getTokenBalance(accounts.Minter);
        if(minterBalance>=100){
            await ReserveTokensAndTransfer(toAddress1,100);
            totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
            console.log("totalSupplyPost: ",totalSupplyPost)
            expect(totalSupplyPost).to.equal(totalSupplyPre);
        }
        console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken));
        console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
    });
    it('public total supply update 5 mint and burn',async () => {
        const publicTotalSupplyPre = await getPublicTotalSupply(config.contracts.PrivateERCToken);
        const privateTotalSupplyPre = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);

        for(let i=0;i<5;i++){
            await mint(accounts.Minter,200);
            await ReserveTokensAndBurn(100);
        }
        const publicTotalSupplyPost = await getPublicTotalSupply(config.contracts.PrivateERCToken);
        const privateTotalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
        console.log("public total supply change record: ",{publicTotalSupplyPre,publicTotalSupplyPost});
        console.log("private total supply change record: ",{privateTotalSupplyPre,privateTotalSupplyPost});
    });
});

describe.skip("check minter allowed balance", function () {
    this.timeout(1200000);
    let preAllowance,postAllowance;
    beforeEach(async function () {
        preAllowance = await getMinterAllowance();
    });
    it('check minterAllowance ',async () => {
        console.log("minterAllowance: ",await getMinterAllowance());
    });

    it('MinterAllowance should decrease after mint', async () => {
        await mint(accounts.Minter, 100);
        postAllowance = await getMinterAllowance();
        expect(postAllowance).to.equal(preAllowance - 100);
    });
    it('MinterAllowance should decrease after mint to user', async () => {
        await mint(accounts.To1, 100);
        postAllowance = await getMinterAllowance();
        expect(postAllowance).to.equal(preAllowance - 100);
    });
    it('MinterAllowance should keep same after transfer to user', async () => {
        const accountBalance = await getTokenBalance(accounts.Minter);
        if(accountBalance>=100){
            await ReserveTokensAndTransfer(accounts.To1, 100);
            postAllowance = await getMinterAllowance();
            expect(postAllowance).to.equal(preAllowance);
        }else {
            console.log("Minter balance is not enough")
        }
    });
    it('MinterAllowance should keep same after transfer to other bank user', async () => {
        const accountBalance = await getTokenBalance(accounts.Minter);
        if(accountBalance>=100){
            await ReserveTokensAndTransfer(userInNode1, 100);
            postAllowance = await getMinterAllowance();
            expect(postAllowance).to.equal(preAllowance);
        }else {
            console.log("Minter balance is not enough")
        }
    });
    it('MinterAllowance should keep same after transfer user amount to other bank user', async () => {
        const accountBalance = await getTokenBalance(accounts.To1);
        if(accountBalance>=100){
            await ReserveTokensAndTransferFrom(to1Wallet,accounts.To1, userInNode1, 100);
            postAllowance = await getMinterAllowance();
            expect(postAllowance).to.equal(preAllowance);
        }else {
            await mint(accounts.To1,100);
            await ReserveTokensAndTransferFrom(to1Wallet,accounts.To1, userInNode1, 100);
            postAllowance = await getMinterAllowance();
            expect(postAllowance).to.equal(preAllowance-100);
        }
    });
    it('MinterAllowance should keep same after burn', async () => {
        await ReserveTokensAndBurn( 100);
        postAllowance = await getMinterAllowance();
        expect(postAllowance).to.equal(preAllowance);
    });
    it('MinterAllowance should keep same after burn for user', async () => {
        const accountBalance = await getTokenBalance(accounts.To1);
        if(accountBalance>=100){
            await ReserveTokensAndBurnFromUser( to1Wallet,accounts.To1, 100);
            postAllowance = await getMinterAllowance();
            expect(postAllowance).to.equal(preAllowance);
        }else {
            await mint(accounts.To1,100);
            await ReserveTokensAndBurnFromUser( to1Wallet,accounts.To1, 100);
            postAllowance = await getMinterAllowance();
            expect(postAllowance).to.equal(preAllowance-100);
        }
    });
});

describe("New user and BlackList", function () {
    this.timeout(1200000);
    const wallet = ethers.Wallet.createRandom();
    const key = wallet.privateKey;
    const userWallet = new ethers.Wallet(key,l1Provider);
    const toAddress = wallet.address;
    it.skip('New user should not be able to mint', async () => {
        try {
            await mint(toAddress, 100)
        } catch (error) {
            expect(error.details).to.equal("failed to get GrumpkinKey for to address")
        }
    });
    it('Step1: Registe user', async () => {
        await registerUser(toAddress);
    });
    it.skip('Step2: Mint to user', async () => {
        const preBalance = await getTokenBalance(toAddress);
        await mint(toAddress, 100);
        let postBalance = await getTokenBalance(toAddress);
        console.log("new user balance is ", postBalance)
        expect(postBalance).to.equal(preBalance + 100);
    });
    it.skip('Step3: Transfer to user', async () => {
        await mint(accounts.Minter, 100)
        const preBalance = await getTokenBalance(toAddress);
        await ReserveTokensAndTransfer(toAddress, 100);
        let postBalance = await getTokenBalance(toAddress);
        console.log("postBalance", postBalance)
        expect(postBalance).to.equal(preBalance + 100);
    });
    // it.skip('Step4: ReserveToken And Burn for user--Not needed', async () => {
    //     // user can not burn token
    //     const preBalance = await getTokenBalance(toAddress);
    //     console.log("preBalance", preBalance)
    //     await ReserveTokensAndBurnFromUser(userWallet, toAddress, 100);
    //     let postBalance = await getTokenBalance(toAddress);
    //     console.log("postBalance", postBalance)
    //     expect(postBalance).to.equal(preBalance - 100);
    // });
    it.skip('Step4: ReserveToken And transfer for user', async () => {
        const amount = 100
        const preBalance = await getTokenBalance(toAddress);
        const preBalanceTo  = await getTokenBalance(accounts.Minter);
        console.log("preBalance", preBalance)
        await ReserveTokensAndTransferFrom(userWallet, toAddress, accounts.Minter, amount);
        const postBalance = await getTokenBalance(toAddress);
        const postBalanceTo = await getTokenBalance(accounts.Minter);
        console.log("postBalance", postBalance)
        expect(postBalance).to.equal(preBalance - amount);
        expect(postBalanceTo).to.equal(preBalanceTo + amount);
    });
    it('Step5: Add user to blacklist ', async () => {
        let isBlackListed = await isBlackList(toAddress);
        if (!isBlackListed) {
            console.log("user address is ", toAddress);
            await addToBlackList(toAddress);

            let retries = 5;
            while (retries > 0) {
                await sleep(3000);
                isBlackListed = await isBlackList(toAddress);
                if (isBlackListed) {
                    break;
                }
                retries--;
            }

            console.log("isBlackListed", isBlackListed);
            await getEvents("Blacklisted");
            expect(isBlackListed).to.equal(true);
            console.log("add user to blacklist success");
        } else {
            console.log("user is already in blacklist");
        }
    });
    it.skip('Step6: Try to operation for blacklist address ', async () => {
        let isBlackListed = await isBlackList(toAddress);
        console.log("isBlackListed", isBlackListed)
        if(isBlackListed){
            try {
                await mint(toAddress, 100)
            } catch (error) {
                console.log("error", error)
                expect(error.details).to.equal("failed to get GrumpkinKey for to address")
            }
        }else {
            console.log("user is not in blacklist")
        }

    });
    it('Step7: Remove user from blacklist ', async () => {
        let isBlackListed = await isBlackList(toAddress);
        console.log("isBlackListed", isBlackListed)
        if (isBlackListed) {
            console.log("user address is ", toAddress);
            await removeFromBlackList(toAddress);

            let retries = 5;
            while (retries > 0) {
                await sleep(3000);
                isBlackListed = await isBlackList(toAddress);
                if (!isBlackListed) {
                    break;
                }
                retries--;
            }

            console.log("isBlackListed", isBlackListed);
            await getEvents("UnBlacklisted");
            expect(isBlackListed).to.equal(false);
            console.log("Remove user from blacklist success");
        } else {
            console.log("user is already out of blacklist");
        }
    });
    it('Step8: Try to operation for address removed from blackList ', async () => {
        const preBalance = await getTokenBalance(toAddress);
        await mint(toAddress, 100);
        let postBalance = await getTokenBalance(toAddress);
        console.log("new user balance is after mint", postBalance)
        expect(postBalance).to.equal(preBalance + 100);

        await mint(accounts.Minter, 100)
        await ReserveTokensAndTransfer(toAddress, 100);
        postBalance = await getTokenBalance(toAddress);
        console.log("new user balance is after transfer", postBalance)
        expect(postBalance).to.equal(preBalance + 200);
    });
});

describe('Direct Mint', function () {
    this.timeout(1200000);
    it('Mint to minter ',async () => {
        const recevier = accounts.Minter
        const preBalance = await getTokenBalance(recevier);
        await DirectMint(recevier, 100);
        let postBalance = await getTokenBalance(recevier);
        expect(postBalance).to.equal(preBalance + 100);
    });
    it('Mint to user in bank ',async () => {
        const recevier = accounts.To1
        const preBalance = await getTokenBalance(recevier);
        await DirectMint(recevier, 100);
        let postBalance = await getTokenBalance(recevier);
        expect(postBalance).to.equal(preBalance + 100);
    });
    it('Mint to user in other bank ',async () => {
        const recevier = userInNode2
        // const preBalance = await getTokenBalance(recevier);
        await DirectMint(recevier, 100);
        // let postBalance = await getTokenBalance(recevier);
        // expect(postBalance).to.equal(preBalance + 100);
    });
    it('Mint to new user ',async () => {
        const wallet = ethers.Wallet.createRandom();
        const key = wallet.privateKey;
        const userWallet = new ethers.Wallet(key,l1Provider);
        const recevier = wallet.address;

        await registerUser(recevier);

        const preBalance = await getTokenBalance(recevier);
        await DirectMint(recevier, 100);
        let postBalance = await getTokenBalance(recevier);
        expect(postBalance).to.equal(preBalance + 100);
    });

});

describe('Direct Transfer', function () {
    this.timeout(1200000);
    it('Transfer from minter to user in bank ',async () => {
        const sender = accounts.Minter;
        const recevier = accounts.To1;
        await DirectMint(sender,amount);
        const preBalanceFrom = await getTokenBalance(sender);
        const preBalanceTo = await getTokenBalance(recevier);
        await DirectTransfer(sender,recevier, amount);
        const postBalanceFrom = await getTokenBalance(sender);
        const postBalanceTo = await getTokenBalance(recevier);
        expect(postBalanceFrom).to.equal(preBalanceFrom - amount);
        expect(postBalanceTo).to.equal(preBalanceTo + amount);
    });
    it('Transfer from minter to user in other bank ',async () => {
        const sender = accounts.Minter;
        const recevier = userInNode2;
        await DirectMint(sender,amount);
        const preBalanceFrom = await getTokenBalance(sender);
        await DirectTransfer(sender,recevier, amount);
        const postBalanceFrom = await getTokenBalance(sender);
        expect(postBalanceFrom).to.equal(preBalanceFrom - amount);
    });
    it('Transfer from userA to userB in bank ',async () => {
        const sender = accounts.To1;
        const recevier = accounts.To2;
        await DirectMint(sender,amount);
        const preBalanceFrom = await getTokenBalance(sender);
        const preBalanceTo = await getTokenBalance(recevier);
        await DirectTransfer(sender,recevier, amount);
        const postBalanceFrom = await getTokenBalance(sender);
        const postBalanceTo = await getTokenBalance(recevier);
        expect(postBalanceFrom).to.equal(preBalanceFrom - amount);
        expect(postBalanceTo).to.equal(preBalanceTo + amount);
    });
    it('Transfer from userA to user  in other bank ',async () => {
        const sender = accounts.To1;
        const recevier = userInNode4;
        await DirectMint(sender,amount);
        const preBalanceFrom = await getTokenBalance(sender);
        await DirectTransfer(sender,recevier, amount);
        const postBalanceFrom = await getTokenBalance(sender);
        expect(postBalanceFrom).to.equal(preBalanceFrom - amount);
    });
    it('Transfer from minter to new user in bank ',async () => {
        const wallet = ethers.Wallet.createRandom();
        const key = wallet.privateKey;
        const userWallet = new ethers.Wallet(key,l1Provider);
        const recevier = wallet.address;

        await registerUser(recevier);

        const sender = accounts.Minter;
        await DirectMint(sender,amount);
        const preBalanceFrom = await getTokenBalance(sender);
        const preBalanceTo = await getTokenBalance(recevier);
        await DirectTransfer(sender,recevier, amount);
        const postBalanceFrom = await getTokenBalance(sender);
        const postBalanceTo = await getTokenBalance(recevier);
        expect(postBalanceFrom).to.equal(preBalanceFrom - amount);
        expect(postBalanceTo).to.equal(preBalanceTo + amount);
    });
});

describe('Direct Burn', function () {
    this.timeout(1200000);
    it('Minter Burn ',async () => {
        const burner = accounts.Minter
        await DirectMint(burner, amount);
        const preBalance = await getTokenBalance(burner);
        await DirectBurn(burner, amount);
        let postBalance = await getTokenBalance(burner);
        expect(postBalance).to.equal(preBalance - amount);
    });
    it('User in bank burn  ',async () => {
        const burner = accounts.To1
        await DirectMint(burner, amount);
        const preBalance = await getTokenBalance(burner);
        await DirectBurn(burner, amount);
        let postBalance = await getTokenBalance(burner);
        expect(postBalance).to.equal(preBalance - amount);
    });


});




