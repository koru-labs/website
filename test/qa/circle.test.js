const { expect } = require("chai");
const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')


const rpcUrl = 'a3bd5f10689564cd3b8f07857dcad794-1518118954.us-west-1.elb.amazonaws.com:50051'
const client = createClient(rpcUrl)

const {
    callPrivateMint,
    callPrivateTransfer,
    callPrivateBurn,
    callPrivateApprove,
    callPrivateTransferFrom,
    getAddressBalance,
    getAllowanceBalance,
    getTotalSupplyNode3,
    getPublicTotalSupply
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
    let response = await client.generateDirectTransfer(transferRequest);
    console.log("Generate transfer Proof response:", response);
    let proofResult = await client.waitForActionCompletion(client.getTransferProof, response.request_id)
    console.log("transfer Proof Result:", proofResult)

    // let receipt = await callPrivateTransfer(config.contracts.PrivateERCToken, proofResult, minterWallet)
    // console.log("receipt", receipt)

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
    let proofResult = await client.waitForActionCompletion(client.getBurnProof, response.request_id)

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

}

async function ApproveWithWallet(fromWallet,amount) {
    const approveRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: fromWallet.address,
        to_address: accounts.Spender1,
        amount: amount
    };

    let response = await client.generateApproveProof(approveRequest);
    console.log("Generate Approve Proof response:", response);
    let proofResult = await client.waitForProofCompletion(client.getApproveProof, response.request_id)

    console.log("Approve Proof Result:", proofResult);
    let receipt = await callPrivateApprove(config.contracts.PrivateERCToken, proofResult, fromWallet)
    console.log("receipt", receipt)

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
}

async function TransferFromOther(fromAddress,toAddress,amount) {
    const transferFromRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: fromAddress,
        to_address: toAddress,
        allowance_cancel_address: accounts.Spender1,
        amount: amount
    };
    console.log("transferFromRequest:", transferFromRequest)
    let response = await client.generateTransferFromProof(transferFromRequest);
    console.log("Generate TransformFrom Proof response:", response);
    let proofResult = await client.waitForProofCompletion(client.getTransferFromProof, response.request_id)

    console.log("TransferFrom Proof Result:", proofResult);
    let receipt = await callPrivateTransferFrom(config.contracts.PrivateERCToken, proofResult, spender1Wallet)
    console.log("receipt", receipt)
}

async function getTokenBalance(address){
    let balance = await getAddressBalance(client, config.contracts.PrivateERCToken, address)
    console.log("account balance: ", balance)
    return Number(balance.balance)
}

async function getTokenAllowance(address){
    let allowance = await getAllowanceBalance(client, config.contracts.PrivateERCToken, address, spender1Wallet.address)
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

describe.only("Direct Transfer",  function (){
    this.timeout(1200000);
    let preBalanceTo,postBalanceTo;
    // before(async function  () {
    //     await mint(1000);
    // })
    beforeEach(async function () {
        preBalance = await getTokenBalance(accounts.Minter);
    });
    it('transfer_100_address1',async () => {
        preBalanceTo = await getTokenBalance(toAddress1);
        await Transfer(toAddress1,amount);
        postBalanceTo = await getTokenBalance(toAddress1);
        postBalance = await getTokenBalance(accounts.Minter);
        console.log({preBalance,postBalance,preBalanceTo,postBalanceTo})
        expect(postBalance).to.equal(preBalance - amount);
        expect(postBalanceTo).to.equal(preBalanceTo + amount);
    });
    it('transfer_100_address2',async () => {
        const amount = 51
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
    it.skip('transfer_all_amount',async () => {
        const amount = await getTokenBalance(accounts.Minter);
        await Transfer(toAddress1,amount);
    });

})

describe("Burn", function () {
    this.timeout(1200000);
    let preBalanceTo,postBalanceTo;
    before(async function  () {
        await mint(1000);
    })
    beforeEach(async function () {
        preBalance = await getTokenBalance(accounts.Minter);
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
    it.skip('burn_all_amount',async () => {
        const burn_amount = await getTokenBalance(accounts.Minter);
        await Burn(burn_amount);
    });
});

describe("Approve And TranferFrom", function () {
    this.timeout(1200000);
    let preBalanceTo,postBalanceTo;
    before(async function  () {
        await mint(1000);
    })

    beforeEach(async function () {
        preBalance = await getTokenBalance(accounts.Minter);
        console.log('minter preBalance: ',preBalance)
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
        expect(postBalance).to.equal(preBalance - amount_approve);
        postBalanceTo = await getTokenBalance(toAddress2);
        expect(postBalanceTo).to.equal(preBalanceTo + amount_approve);
    })
    it.skip('Approve_all_minter_balance_transferFrom', async () => {
        const amount = await getTokenBalance(accounts.Minter)
        preBalanceTo = await getTokenBalance(toAddress1);
        console.log("Try to approve and transferFrom :",amount)
        await Approve(amount);
        await TransferFrom(toAddress1,amount);
        postBalance = await getTokenBalance(accounts.Minter);
        console.log("minter balance change record: ",{preBalance,amount,postBalance})
        expect(postBalance).to.equal(preBalance - amount);
        postBalanceTo = await getTokenBalance(toAddress1);
        expect(postBalanceTo).to.equal(preBalanceTo + amount);
    });
});

describe("Check address balance", function () {
    this.timeout(1200000);
    it('check_address_balance', async () => {
        console.log("minter balance is ",await getAddressBalance(client, config.contracts.PrivateERCToken, accounts.Minter));
        console.log("address1 balance is ",await getAddressBalance(client, config.contracts.PrivateERCToken, toAddress1));
        console.log("address2 balance is ",await getAddressBalance(client, config.contracts.PrivateERCToken, toAddress2));
    });
});

describe("check contract totalSupply", function () {
    this.timeout(1200000);
    let totalSupplyPre,totalSupplyPost;
    // before(async function  () {
    //     await mint(200);
    // })
    it('check_contract_totalSupply', async () => {
        console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken));
    });
    it('totalSupply_add_after_mint ',async () => {
        totalSupplyPre = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
        await mint(100);
        totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
        expect(totalSupplyPost).to.equal(totalSupplyPre + 100);
    });
    it('totalSupply_sub_after_burn ',async () => {
        totalSupplyPre  = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
        await Burn(100);
        totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
        expect(totalSupplyPost).to.equal(totalSupplyPre - 100);
    });
    it('totalSupply_keep_same_after_transfer',async () => {
        totalSupplyPre = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
        const minterBalance = await getTokenBalance(accounts.Minter);
        if(minterBalance>=100){
            await Transfer(toAddress1,100);
            totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
            expect(totalSupplyPost).to.equal(totalSupplyPre);
        }
    });
    it('totalSupply_keep_same_after_transferFrom',async () => {
        totalSupplyPre = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
        const minterBalance = await getTokenBalance(accounts.Minter);
        if(minterBalance>=100){
            await Approve(100);
            await TransferFrom(toAddress1,100);
            totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
            expect(totalSupplyPost).to.equal(totalSupplyPre);
        }
    });
    it('check public total supply ',async () => {
        console.log(await getPublicTotalSupply(config.contracts.PrivateERCToken))
        console.log(await getTotalSupplyNode3(client, config.contracts.PrivateERCToken))

    });
    it('public total supply update 5 mint and burn',async () => {
        const publicTotalSupplyPre = await getPublicTotalSupply(config.contracts.PrivateERCToken);
        const privateTotalSupplyPre = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);

        for(let i=0;i<5;i++){
            await mint(200);
            await Burn(100);
        }
        const publicTotalSupplyPost = await getPublicTotalSupply(config.contracts.PrivateERCToken);
        const privateTotalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
        console.log("public total supply change record: ",{publicTotalSupplyPre,publicTotalSupplyPost});
        console.log("private total supply change record: ",{privateTotalSupplyPre,privateTotalSupplyPost});

    });
});
describe("approve and check allowance", function () {
    this.timeout(1200000);
    before(async function  () {
        await mint(1000);
    })
    it('check allowance balance', async () => {
        await Approve(100);
        const allowanced = await getTokenAllowance(accounts.Minter);
        console.log("allowanced is ",allowanced);
        expect(allowanced).to.equal(100);
    });
    it('add approve amount, allowance should keep as added amount', async () => {
        await Approve(200);
        let allowanced = await getTokenAllowance(accounts.Minter);
        expect(allowanced).to.equal(200);
    })
    it('decrease approve amount, allowance should keep as decreased amount', async () => {
        await Approve(99);
        let allowanced = await getTokenAllowance(accounts.Minter);
        expect(allowanced).to.equal(99);
    })
    it('approve 0, allowance should be 0', async () => {
        await Approve(0);
        let allowanced = await getTokenAllowance(accounts.Minter);
        expect(allowanced).to.equal(0);
    })
    it.skip('try to Approval exceeds balance', async () => {
        const amount = await getTokenBalance(accounts.Minter) + 1;
        await Approve(amount);
        let allowanced = await getTokenAllowance(accounts.Minter);
        console.log("allowanced is ",allowanced)
        // expect(allowanced).to.equal(0);
    });
    it.skip("approve for toAddress2",async()=>{

        await mint(1000);
        await Transfer(toAddress2,500);

        const userWallet = new ethers.Wallet('35c285cae6a13a0e13ef7db25776e60b02745922da3b39513b94114c2c5d9add',l1Provider)
        const userBalancePre = await getTokenBalance(userWallet.address);
        if (userBalancePre>=100){

            await ApproveWithWallet(userWallet,100)
            let allowanced = await getTokenAllowance(userWallet.address);
            console.log("allowanced is ",allowanced)
            expect(allowanced).to.equal(100);
            await TransferFromOther(userWallet.address,toAddress1,100);
            allowanced = await getTokenAllowance(userWallet.address);
            expect(allowanced).to.equal(0);
        }else {
            console.log("user balance is not enough")
        }
    })
});
