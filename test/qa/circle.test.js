const { expect } = require("chai");
const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')


const rpcUrl = 'ac365b5fc227f46c5850d8590ddb0357-2076305457.us-west-1.elb.amazonaws.com:50051'
const client = createClient(rpcUrl)

const {
    callPrivateMint,
    callPrivateTransfer,
    callPrivateBurn,
    callPrivateApprove,
    callPrivateTransferFrom,
    getAddressBalance,
    getAllowanceBalance
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

const toAddress1 = accounts.To1;
const toAddress2 = accounts.To2;
const amount = 100;
let preBalance,postBalance;
let preAllowance,postAllowance;


async function mint(amount) {
    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        to_address: accounts.Minter,
        amount: amount
    };
    let response = await client.generateMintProof(generateRequest);
    console.log("Generate Mint Proof response:", response);
    let proofResult = await client.waitForProofCompletion(client.getMintProof, response.request_id)

    console.log("Mint Proof Result:", proofResult);
    let receipt = await callPrivateMint(config.contracts.PrivateERCToken, proofResult, minterWallet)
    console.log("receipt", receipt)

    // let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Minter)
    // console.log("balance: ", balance)
}


async function Transfer(toAddress,amount) {
    const transferRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: toAddress,
        amount: amount
    };
    let response = await client.generateTransferProof(transferRequest);
    console.log("Generate transfer Proof response:", response);
    let proofResult = await client.waitForProofCompletion(client.getTransferProof, response.request_id)

    console.log("Transfer Proof Result:", proofResult);
    let receipt = await callPrivateTransfer(config.contracts.PrivateERCToken, proofResult, minterWallet)
    console.log("receipt", receipt)

    // let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.To1)
    // console.log("balance: ", balance)
}

async function Burn(amount) {
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

    // let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Minter)
    // console.log("balance: ", balance)
}


async function Approve(amount) {
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

    console.log("Approve Proof Result:", proofResult);
    let receipt = await callPrivateApprove(config.contracts.PrivateERCToken, proofResult, minterWallet)
    console.log("receipt", receipt)

    // let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Minter)
    // console.log("balance: ", balance)
}

async function TransferFrom(toAddress,amount) {
    const transferFromRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: toAddress,
        allowance_cancel_address: accounts.Spender1,
        amount: amount
    };
    let response = await client.generateTransferFromProof(transferFromRequest);
    console.log("Generate TransformFrom Proof response:", response);
    let proofResult = await client.waitForProofCompletion(client.getTransferFromProof, response.request_id)

    console.log("TransferFrom Proof Result:", proofResult);
    let receipt = await callPrivateTransferFrom(config.contracts.PrivateERCToken, proofResult, spender1Wallet)
    console.log("receipt", receipt)

    // let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Spender1)
    // console.log("spender1 balance: ", balance)
    //
    // balance = await getAddressBalance(client, config.contracts.PrivateERCToken, toAddress)
    // console.log("To2 balance: ", balance)
}

async function getTokenBalance(address){
    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, address)
    console.log("account balance: ", balance)
    return Number(balance.balance)
}

async function getTokenAllowance(address){
    let allowance = await getAllowanceBalance(client, config.contracts.PrivateERCToken, address, spender1Wallet)
    console.log("account allowance: ", allowance)
    return allowance
}

// getTokenAllowance(accounts.Minter).then()
//
describe("Mint", function () {
    this.timeout(1200000);
    beforeEach(async function () {
        preBalance = await getTokenBalance(accounts.Minter);
    });

    it('mint_100_init',async () => {
        await mint(amount);
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance + amount);
    });
    it('mint_200',async () => {
        const amount = 200;
        await mint(amount);
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance + amount);
    });
    it('mint_1',async () => {
        const amount = 1;
        await mint(amount);
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance + amount);
    });
    it('mint_100_5_times', async () => {
        const times = 5
        for (let i = 0; i < times; i++) {
            await mint(amount);
        }
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance + amount * times);
    });
    it.skip('mint_amount_larger_than_allowance',async ()=>{
        const amount = 20000
        await mint(amount)
    })
    it.skip('mint_0',async () => {
        const amount = 0;
        await mint(amount);
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance + amount);
    });
    it.skip('mint_negative',async () => {
        const amount = -1;
        await mint(amount);
        // postBalance = await getTokenBalance(accounts.Minter);
        // expect(postBalance).to.equal(preBalance + amount);
    });

});

describe("Transfer",  function (){
    this.timeout(1200000);
    let preBalanceTo,postBalanceTo;
    beforeEach(async function () {
        preBalance = await getTokenBalance(accounts.Minter);
        await mint(500)
    });
    it('transfer_100_address1',async () => {
        preBalanceTo = await getTokenBalance(toAddress1);
        await Transfer(toAddress1,amount);
        postBalanceTo = await getTokenBalance(toAddress1);
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance - amount);
        expect(postBalanceTo).to.equal(preBalanceTo + amount);
    });
    it('transfer_100_address2',async () => {
        preBalanceTo = await getTokenBalance(toAddress2);
        await Transfer(toAddress2,amount);
        postBalanceTo = await getTokenBalance(toAddress2);
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance - amount);
        expect(postBalanceTo).to.equal(preBalanceTo + amount);
    });
    it('transfer_100_5_times',async () => {
        const times = 5
        preBalanceTo = await getTokenBalance(toAddress1);
        if (preBalance>=amount*times){
            for (let i = 0; i < times; i++) {
                await Transfer(toAddress1,amount);
           }
        }
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance - amount * times);
        postBalanceTo = await getTokenBalance(toAddress1);
        expect(postBalanceTo).to.equal(preBalanceTo + amount * times);
    });
    it.skip('transfer_amount_larger_than_balance',async ()=>{
        const amount = preBalance + 1
        await Transfer(toAddress1,amount)
    })
    it.skip('transfer_0',async () => {
        const amount = 0;
        await Transfer(toAddress1,amount);
    });

})

describe("Burn", function () {
    this.timeout(1200000);
    let preBalanceTo,postBalanceTo;
    beforeEach(async function () {
        preBalance = await getTokenBalance(accounts.Minter);
        await mint(500)
    });

    it('burn_100 ', async () => {
        await Burn(amount);
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance - amount);

    });
    it('burn_100_5_times', async () => {
        const times = 5
        for (let i = 0; i < times; i++) {
            await Burn(amount);
        }
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance - amount * times);
    });
    it.skip('burn_amount_larger_than_balance',async ()=>{
        const amount = preBalance + 1
        await Burn(amount)
    })
    it.skip('burn_0',async () => {
        const amount = 0;
        await Burn(amount);
    });
});

describe("Approve And TranferFrom", function () {
    this.timeout(1200000);
    let preBalanceTo,postBalanceTo;
    beforeEach(async function () {
        preBalance = await getTokenBalance(accounts.Minter);
        await mint(1000)
    });
    it('Approve_100_transferFrom_100 ', async () => {
        preBalanceTo = await getTokenBalance(toAddress1);
        await Approve(100);
        await TransferFrom(toAddress1,100);
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance - 100);
        postBalanceTo = await getTokenBalance(toAddress1);
        expect(postBalanceTo).to.equal(preBalanceTo + 100);
    });

    it('Approve_100_transferFrom_99', async () => {
        preBalanceTo = await getTokenBalance(toAddress1);
        const amount_approve = 100;
        await Approve(amount_approve);
        const amount_transferFrom = 99;
        await TransferFrom(toAddress1,amount_transferFrom);
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance - amount_transferFrom);
        postBalanceTo = await getTokenBalance(toAddress1);
        expect(postBalanceTo).to.equal(preBalanceTo + amount_transferFrom);
    });

    it('Approve_500_transferFrom_100_5_times', async () => {
        preBalanceTo = await getTokenBalance(toAddress2);
        const amount_approve = 500;
        await Approve(amount_approve);
        const times = 5;
        for (let i = 0; i < times; i++) {
            await TransferFrom(toAddress2,100)
        }
        postBalance = await getTokenBalance(accounts.Minter);
        expect(postBalance).to.equal(preBalance - amount_approve * times);
        postBalanceTo = await getTokenBalance(toAddress2);
        expect(postBalanceTo).to.equal(preBalanceTo + amount_approve * times);
    })
});

