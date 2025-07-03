const { expect } = require("chai");
const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')


const rpcUrl = "qa-node3-rpc.hamsa-ucl.com:50051"
const rpcUrl_1 = "qa-node4-rpc.hamsa-ucl.com:50051"
// const rpcUrl_1 = "a05f5e91e78cd465ca269b49a892c8ee-1959633984.us-west-1.elb.amazonaws.com:50051"
// const rpcUrl = 'ad42e5760742f4ab58a7d9e2809c59c8-1992668984.us-west-1.elb.amazonaws.com:50051'
const client = createClient(rpcUrl)
const client1 = createClient(rpcUrl_1)

const {
    callPrivateMint,
    callPrivateTransfer,
    callPrivateBurn,
    callPrivateCancel,
    // callPrivateApprove,
    // callPrivateTransferFrom,
    getAddressBalance,
    getTotalSupplyNode3,
    getPublicTotalSupply,
    createAuthMetadata,
    registerUser,
    updateAccountStatus,
    updateAccountRole,
    getAccount,
    isBlackList,
    addToBlackList,
    removeFromBlackList,
    getEvents,
    getSplitTokenList
} = require("../help/testHelp")
const {address} = require("hardhat/internal/core/config/config-validation");
const {bigint} = require("hardhat/internal/core/params/argumentTypes");

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


const userInNode1 = '0xbA268f776F70caDB087e73020dfE41c7298363Ed';
const userInNode2 = '0xF8041E1185C7106121952bA9914ff904A4A01c80';
const userInNode3 = '0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB';
const userInNode4 = '0x5a3288A7400B2cd5e0568728E8216D9392094892';
const adminPrivateKey = "555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787";

const amount = 100;
let preBalance,postBalance;
let preAllowance,postAllowance;

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
        await sleep(1000);
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
    try {
        let response = await client.generateSplitToken(splitRequest);
        console.log("Generate transfer Proof response:", response);
        let proofResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id)
        if (proofResult.status == "TOKEN_ACTION_STATUS_SUC") {
            console.log("proofResult", proofResult)
            let tokenId = '0x'+proofResult.transfer_token_id
            console.log("tokenId", tokenId)
            try {
                await callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress,tokenId)
                await sleep(1000);
            }catch (error){
                return  error
            }
        }
    }catch (error){
        const wrappedError = new Error('Transfer failed: ' + error.details);
        wrappedError.code = error.code;
        wrappedError.details = error.details;
        throw wrappedError;
    }

}

async function ReserveTokensToTransfer(toAddress,amount) {
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: toAddress,
        amount: amount
    };
    console.log("generateSplitTokenRequest:", splitRequest)
    try {
        let response = await client.generateSplitToken(splitRequest);
        console.log("Generate transfer Proof response:", response);
        let proofResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id)
        if (proofResult.status == "TOKEN_ACTION_STATUS_SUC") {
            console.log("proofResult", proofResult)
            let tokenId = '0x'+proofResult.transfer_token_id
            console.log("tokenId", tokenId)
            // try {
            //     await callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress,tokenId)
            // }catch (error){
            //     return  error
            // }

        }
    }catch (error){
        const wrappedError = new Error('Transfer failed: ' + error.details);
        wrappedError.code = error.code;
        wrappedError.details = error.details;
        throw wrappedError;
    }

}

async function ReserveTokensToBurn(amount) {
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        // to_address: toAddress,
        amount: amount
    };
    console.log("generateSplitTokenRequest:", splitRequest)
    try {
        let response = await client.generateSplitToken(splitRequest);
        console.log("Generate Burn Proof response:", response);
        let proofResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id)
        if (proofResult.status == "TOKEN_ACTION_STATUS_SUC") {
            console.log("proofResult", proofResult)
            let tokenId = '0x'+proofResult.transfer_token_id
            console.log("tokenId", tokenId)
            // try {
            //     await callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress,tokenId)
            // }catch (error){
            //     return  error
            // }

        }
    }catch (error){
        const wrappedError = new Error('Transfer failed: ' + error.details);
        wrappedError.code = error.code;
        wrappedError.details = error.details;
        throw wrappedError;
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
    try {
        let response = await client.generateSplitToken(splitRequest);
        console.log("Generate transfer Proof response:", response);
        let proofResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id)
        if (proofResult.status == "TOKEN_ACTION_STATUS_SUC") {
            console.log("proofResult", proofResult)
            try {
                await callPrivateTransfer(fromWallet,config.contracts.PrivateERCToken,toAddress,'0x'+proofResult.transfer_token_id)
                await sleep(1000);
            }catch (error){
                return  error
            }
        }
    }catch (error){
        const wrappedError = new Error('Transfer failed: ' + error.details);
        wrappedError.code = error.code;
        wrappedError.details = error.details;
        throw wrappedError;
    }
}

async function ReserveTokensAndBurn(amount) {
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        // to_address: accounts.Minter,
        amount: amount
    };
    try {
        let response = await client.generateSplitToken(splitRequest);
        console.log("Generate burn Proof response:", response);
        let tokenResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id);
        if (tokenResult.status == "TOKEN_ACTION_STATUS_SUC") {
            console.log("tokenResult", tokenResult)
            try {
                let receipt =await callPrivateBurn(config.contracts.PrivateERCToken, minterWallet, '0x'+tokenResult.transfer_token_id);
                console.log("privateBurn receipt: ", receipt)
                await sleep(1000);
            }catch (error){
                return  error
            }
        }
    }catch (error){
        const wrappedError = new Error('Burn failed: ' + error.details);
        wrappedError.code = error.code;
        wrappedError.details = error.details;
        throw wrappedError;
    }


}
// async function ReserveTokensAndBurnFromUser(wallet,address,amount) {
//     const splitRequest = {
//         sc_address: config.contracts.PrivateERCToken,
//         token_type: '0',
//         from_address: address,
//         to_address: address,
//         amount: amount
//     };
//
//     let response = await client.generateSplitToken(splitRequest);
//     console.log("Generate Split Proof response:", response);
//     let tokenResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id);
//     console.log("tokenResult: ", tokenResult)
//     let receipt = await callPrivateBurn(config.contracts.PrivateERCToken, wallet, '0x'+tokenResult.transfer_token_id);
//     console.log("privateBurn receipt: ", receipt)
// }
async function getTokenBalance(address){
    let balance = await client.getAccountBalance(config.contracts.PrivateERCToken, address)
    // console.log(`address ${address} account balance ${balance.balance} `)
    // console.log("account balance: ", await getAddressBalance(client, config.contracts.PrivateERCToken, address))
    return Number(balance.balance)
}
function convertBigInt2Hex(number) {
    return ethers.toBigInt(number).toString(16)
}

async function getTokenBalanceOnChain(address){
    const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken)
    let amount = await contract.privateBalanceOf(address)
    console.log("amount: ", amount)
    let balance=  {
        cl_x: convertBigInt2Hex(amount[0]),
        cl_y: convertBigInt2Hex(amount[1]),
        cr_x: convertBigInt2Hex(amount[2]),
        cr_y: convertBigInt2Hex(amount[3])
    }
    console.log("balance: ", balance)
    let decodeAmount = await client.decodeElgamalAmount(balance)
    return Number(decodeAmount.balance)
}

async function getTokenBalanceInNode1(address){
    let balance = await client1.getAccountBalance(config.contracts.PrivateERCToken, address)
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
    try {
        const response = await client.generateDirectMint(generateRequest);
        await client.waitForActionCompletion(client.getMintProof, response.request_id)
        await sleep(1000);
    }catch (error){
        const wrappedError = new Error('Minting failed: ' + error.details);
        wrappedError.code = error.code;
        wrappedError.details = error.details;
        throw wrappedError;
    }
}
async function DirectTransfer(from,receiver,amount) {
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: from,
        to_address : receiver,
        amount: amount
    };

    try {
        const response = await client.generateDirectTransfer(splitRequest);
        await client.waitForActionCompletion(client.getSplitToken, response.request_id);
        await sleep(1000);
    }catch (error){
        const wrappedError = new Error('Minting failed: ' + error.details);
        wrappedError.code = error.code;
        wrappedError.details = error.details;
        throw wrappedError;
    }
}
async function DirectBurn(address,amount) {
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: address,
        amount: amount
    };

    try {
        const response = await client.generateDirectBurn(splitRequest);
        await client.waitForActionCompletion(client.getSplitToken, response.request_id)
        await sleep(1000);
    }catch (error){
        const wrappedError = new Error('Minting failed: ' + error.details);
        wrappedError.code = error.code;
        wrappedError.details = error.details;
        throw wrappedError;
    }
}

async function cancelAllSplitTokens(ownerWallet,scAddress){
    const ownerAddress = ownerWallet.address;
    const result = await getSplitTokenList(client,ownerAddress,scAddress);
    const splitTokens = result.split_tokens;
    if (splitTokens.length > 0){
        for (let i = 0; i < splitTokens.length; i++) {
            let splitToken = splitTokens[i];
            console.log("cancel split token: ", splitToken.token_id)
            // await callPrivateCancel(scAddress, ownerWallet, splitToken.token_id);
            let receipt = await callPrivateCancel(scAddress, ownerWallet, ethers.toBigInt('0x'+splitToken.token_id))
            console.log("receipt", receipt)
        }
    }
    await sleep(3000);
}

describe("Function Cases",function (){
    describe("Check address balance",function (){
        it("Check address balance on node3", async function () {
            console.log(await getTokenBalance(accounts.Minter));
            console.log(await getTokenBalance(accounts.To1));
            console.log(await getTokenBalance(accounts.To2));
        });
        it("Check address balance on other node", async function () {
            await DirectMint(userInNode1,100);
            console.log(await getTokenBalanceInNode1(userInNode1));
        })
    });
    describe("Mint", function () {
        this.timeout(1200000);
        const recevier = accounts.Minter;
        beforeEach(async function () {
            preBalance = await getTokenBalance(recevier);
        });

        it('Mint 1 tokens to minter',async () => {
            try {
                const amount = 1;
                let recepit = await mint(recevier,amount);
                console.log("recepit: ", recepit)
                postBalance = await getTokenBalance(recevier);
                expect(postBalance).to.equal(preBalance + amount);
            }catch (error){
                console.log(error)
            }
        });
        it('Mint  100 to spender in node3',async () => {
            const preBalanceSpender = await getTokenBalance(accounts.Spender1);
            try{
                await mint(accounts.Spender1,amount);
                const postBalanceSpender = await getTokenBalance(accounts.Spender1);
                expect(postBalanceSpender).to.equal(preBalanceSpender + amount);
            }catch (error){
                console.log("error:",error)
            }
        });
        it('Mint  100 to user in node3',async () => {
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
        it('Mint amount 100 with string format',async ()=>{
            try {
                await mint(recevier,amount.toString());
                postBalance = await getTokenBalance(recevier);
                expect(postBalance).to.equal(preBalance + amount);
            }catch (error){
                console.log(error)
            }
        });
        it('Mint  100 to user cross node',async () => {
            const userAddress = userInNode1;
            const preBalanceUser = await getTokenBalanceInNode1(userAddress);
            try{
                await mint(userAddress,amount);
                const postBalanceUser = await getTokenBalanceInNode1(userAddress);
                expect(postBalanceUser).to.equal(preBalanceUser + amount);
            }catch (error){
                console.log("error:",error)
            }
        });
    });
    describe("Split and transfer",  function (){
        this.timeout(1200000);
        let preBalanceTo,postBalanceTo;
        before(async function () {
            const mintAmount = amount * 13
            await mint(accounts.Minter,mintAmount);
            await mint(accounts.To1,100);
        });

        beforeEach(async function () {
            preBalance = await getTokenBalance(accounts.Minter);
        });
        it('transfer to user1 inBank with 1',async () => {
            const amount = 1
            preBalanceTo = await getTokenBalance(toAddress1);
            await ReserveTokensAndTransfer(toAddress1,amount);
            postBalanceTo = await getTokenBalance(toAddress1);
            postBalance = await getTokenBalance(accounts.Minter);
            console.log({preBalance,postBalance,preBalanceTo,postBalanceTo})
            expect(postBalance).to.equal(preBalance - amount);
            expect(postBalanceTo).to.equal(preBalanceTo + amount);
        });
        it('transfer to user1 inBank with 100 string format',async () => {
            const amount = 100;
            preBalanceTo = await getTokenBalance(toAddress1);
            await ReserveTokensAndTransfer(toAddress1,amount.toString());
            postBalanceTo = await getTokenBalance(toAddress1);
            postBalance = await getTokenBalance(accounts.Minter);
            console.log({preBalance,postBalance,preBalanceTo,postBalanceTo})
            expect(postBalance).to.equal(preBalance - amount);
            expect(postBalanceTo).to.equal(preBalanceTo + amount);
        });

        it('transfer to spender inBank with 100',async () => {
            const recevier = accounts.Spender1;
            preBalanceTo = await getTokenBalance(recevier);
            await ReserveTokensAndTransfer(recevier,amount);
            postBalanceTo = await getTokenBalance(recevier);
            postBalance = await getTokenBalance(accounts.Minter);
            expect(postBalance).to.equal(preBalance - amount);
            expect(postBalanceTo).to.equal(preBalanceTo + amount);
        });
        it('transfer to user cross Bank with 100',async () => {
            const recevier = userInNode1;
            preBalanceTo = await getTokenBalance(recevier);
            await ReserveTokensAndTransfer(recevier,amount);
            postBalance = await getTokenBalance(accounts.Minter);
            expect(postBalance).to.equal(preBalance - amount);
        });
        it('transfer all amount',async () => {
            await cancelAllSplitTokens(minterWallet,config.contracts.PrivateERCToken);
            const amount = await getTokenBalance(accounts.Minter);
            console.log("minter amount:",amount)
            preBalanceTo = await getTokenBalance(toAddress1);
            await cancelAllSplitTokens(minterWallet,config.contracts.PrivateERCToken)
            await ReserveTokensAndTransfer(toAddress1,amount);
            postBalanceTo = await getTokenBalance(toAddress1);
            postBalance = await getTokenBalance(accounts.Minter);
            expect(postBalance).to.equal(preBalance - amount);
            expect(postBalanceTo).to.equal(preBalanceTo + amount);
        });
        it('transfer 50 from user1 address to user2',async () => {
            const amount = 50;
            const sender = accounts.To1;
            const senderWallet = to1Wallet;
            preBalance = await getTokenBalance(sender);
            preBalanceTo = await getTokenBalance(accounts.To2);
            if (preBalance>=amount){
                await ReserveTokensAndTransferFrom( to1Wallet,accounts.To1, accounts.To2,amount)
                postBalance = await getTokenBalance(accounts.To1);
                postBalanceTo = await getTokenBalance(accounts.To2);
                expect(postBalance).to.equal(preBalance - amount);
                expect(postBalanceTo).to.equal(preBalanceTo + amount);
            }else {
                console.log("balance is not enough")
            }

        });
        it('transfer 50 from user1 address to otherBank user',async () => {
            const amount = 50;
            preBalance = await getTokenBalance(accounts.To1);
            if (preBalance>=amount){
                await ReserveTokensAndTransferFrom(to1Wallet,accounts.To1, userInNode1,amount)
                postBalance = await getTokenBalance(accounts.To1);
                expect(postBalance).to.equal(preBalance - amount);
            }else {
                console.log("balance is not enough")
            }
        });
    })

    describe("Split and burn", function () {
        this.timeout(1200000);

        beforeEach(async function () {
            preBalance = await getTokenBalance(accounts.Minter);
        });
        it('minter burn 100', async () => {
            await mint(accounts.Minter,1000);
            preBalance = await getTokenBalance(accounts.Minter);
            await ReserveTokensAndBurn(amount);
            postBalance = await getTokenBalance(accounts.Minter);
            console.log(postBalance)
            expect(postBalance).to.equal(preBalance - amount);

        });
        it('burn amount 1', async () => {
            const amount = 1
            preBalance = await getTokenBalance(accounts.Minter);
            await ReserveTokensAndBurn(amount);
            postBalance = await getTokenBalance(accounts.Minter);
            console.log(postBalance)
            expect(postBalance).to.equal(preBalance - amount);

        });
        it('burn with 100 string format', async () => {
            const amount = 100
            await mint(accounts.Minter,100);
            preBalance = await getTokenBalance(accounts.Minter);
            await ReserveTokensAndBurn(amount.toString());
            postBalance = await getTokenBalance(accounts.Minter);
            console.log(postBalance)
            expect(postBalance).to.equal(preBalance - amount);

        });
        it('burn all minter amount',async () => {
            const burn_amount = await getTokenBalance(accounts.Minter);
            await cancelAllSplitTokens(minterWallet,config.contracts.PrivateERCToken);
            await ReserveTokensAndBurn(burn_amount);
            postBalance = await getTokenBalance(accounts.Minter);
            expect(postBalance).to.equal(preBalance - burn_amount);
        });
    });

    describe('Full token life: mint ,tranfer, burn', function () {
        this.timeout(1200000);
        const userAddress = userInNode1;
        before(async function () {
            preBalanceMinter = await getTokenBalance(accounts.Minter);
            preBalanceTo1 = await getTokenBalance(accounts.To1);
            preBalanceTo2 = await getTokenBalance(accounts.To2);
            preBalanceUser = await getTokenBalanceInNode1(userAddress)
        });
        it('Step1: mint 1000 to minter ', async () => {
            await DirectMint(accounts.Minter, 1000);
        });
        it('Step2: transfer 300 to recevier1 in node ', async () => {
            await DirectTransfer(accounts.Minter, accounts.To1, 300);
        });
        it('Step3: transfer 100 to recevier2 in node ', async () => {
            await DirectTransfer(accounts.Minter, accounts.To2, 100);
        });
        it('Step4: transfer 100 to user cross node ', async () => {
            await DirectTransfer(accounts.Minter, userAddress, 100);
        });
        it('Step5: transfer 100 from to1 to to2 in node ', async () => {
            await DirectTransfer(accounts.To1, accounts.To2, 100);
        });
        it('Step6: transfer 100 from to1 to user cross node ', async () => {
            await DirectTransfer(accounts.To1, userAddress, 100);
        });
        it('Step7: minter burn 100 ', async () => {
            await DirectBurn(accounts.Minter, 100);
        });
        it('Step8: to1 burn 100 ', async () => {
            await DirectBurn(accounts.To1, 100);
        });
        it('Step9: check balance ', async () => {
            postBalanceMinter = await getTokenBalance(accounts.Minter);
            postBalanceTo1 = await getTokenBalance(accounts.To1);
            postBalanceTo2 = await getTokenBalance(accounts.To2);
            postBalanceUser = await getTokenBalanceInNode1(userAddress);
            expect(postBalanceMinter).to.equal(preBalanceMinter + 400);
            expect(postBalanceTo1).to.equal(preBalanceTo1);
            expect(postBalanceTo2).to.equal(preBalanceTo2 + 200);
            expect(postBalanceUser).to.equal(preBalanceUser + 200);
        });

    });

    describe('Direct Mint', function () {
        this.timeout(1200000);
        it('DirectMint 100 to minter ',async () => {
            const recevier = accounts.Minter
            const preBalance = await getTokenBalance(recevier);
            await DirectMint(recevier, 100);
            let postBalance = await getTokenBalance(recevier);
            expect(postBalance).to.equal(preBalance + 100);
        });
        it('DirectMint to user in bank ',async () => {
            const recevier = accounts.To1
            const preBalance = await getTokenBalance(recevier);
            await DirectMint(recevier, 100);
            let postBalance = await getTokenBalance(recevier);
            expect(postBalance).to.equal(preBalance + 100);
        });
        it('DirectMint to user in other bank, check recevier balance ',async () => {
            const recevier = userInNode1
            const preBalance = await getTokenBalanceInNode1(recevier);
            console.log("user balance is before mint", preBalance)
            await DirectMint(recevier, 100);
            let postBalance = await getTokenBalanceInNode1(recevier);
            console.log("user balance is after mint", postBalance)
            expect(postBalance).to.equal(preBalance + 100);
        });
    });

    describe('Direct Transfer', function () {
        this.timeout(1200000);
        before(async function () {
            await DirectMint(accounts.Minter, amount*6);
            await DirectMint(accounts.To1, amount*2);
        });
        it('Transfer from minter to user in bank ',async () => {
            const sender = accounts.Minter;
            const recevier = accounts.To1;
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
            const recevier = userInNode1;
            const preBalanceFrom = await getTokenBalance(sender);
            const preBalanceTo = await getTokenBalanceInNode1(recevier);
            await DirectTransfer(sender,recevier, amount);
            const postBalanceFrom = await getTokenBalance(sender);
            const postBalanceTo = await getTokenBalanceInNode1(recevier);
            expect(postBalanceFrom).to.equal(preBalanceFrom - amount);
            expect(postBalanceTo).to.equal(preBalanceTo + amount);
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
            const recevier = userInNode1;
            await DirectMint(sender,amount);
            const preBalanceFrom = await getTokenBalance(sender);
            const preBalanceTo = await getTokenBalanceInNode1(recevier);
            await DirectTransfer(sender,recevier, amount);
            const postBalanceFrom = await getTokenBalance(sender);
            const postBalanceTo = await getTokenBalanceInNode1(recevier);
            expect(postBalanceFrom).to.equal(preBalanceFrom - amount);
            expect(postBalanceTo).to.equal(preBalanceTo + amount);
        });
    });

    describe('Direct Burn', function () {
        this.timeout(1200000);
        before(async function () {
            await DirectMint(accounts.Minter, amount);
            await DirectMint(accounts.To1, amount*3);
        });
        it('DirectBurn 100 for minter ',async () => {
            const burner = accounts.Minter
            const preBalance = await getTokenBalance(burner);
            await DirectBurn(burner, amount);
            let postBalance = await getTokenBalance(burner);
            expect(postBalance).to.equal(preBalance - amount);
        });
        it('DirectBurn 100 for user',async () => {
            const burner = accounts.To1
            const preBalance = await getTokenBalance(burner);
            await DirectBurn(burner, amount);
            let postBalance = await getTokenBalance(burner);
            expect(postBalance).to.equal(preBalance - amount);
        });
        it('Try to DirectBurn 100 for user of other bank',async () => {
            const burner = userInNode1
            await DirectMint(burner, amount);
            try {
                await DirectBurn(burner, 100);
            }catch (error){
                expect(error.details).to.equal("No tokens are available for splitting.")
            }
        });

    });

    describe('Cancel splitToken', function () {
        this.timeout(1200000);
        it('split token list ',async () => {
            await DirectMint(accounts.Minter, 500);
            await ReserveTokensToTransfer(accounts.To1,100);
            await ReserveTokensToBurn(200);
            // console.log(await getSplitTokenList(client,accounts.Minter,config.contracts.PrivateERCToken))
            console.log(await getSplitTokenList(client,accounts.Minter,config.contracts.PrivateERCToken))
            let splitTokens = await getSplitTokenList(client,accounts.Minter,config.contracts.PrivateERCToken)
            expect(splitTokens.split_tokens.length).not.to.equal(0);
        });
        it('cancle split tokens',async () => {
            await cancelAllSplitTokens(minterWallet,config.contracts.PrivateERCToken)
        });
        it('split token list after should be null ',async () => {
            let splitTokens = await getSplitTokenList(client,accounts.Minter,config.contracts.PrivateERCToken)
            console.log(splitTokens.split_tokens)
            expect(splitTokens.split_tokens.length).to.equal(0);
        });
        it('Try to cancel split tokens again',async () => {
            await DirectMint(accounts.Minter, 200);
            await ReserveTokensToTransfer(accounts.To1,100);
            const ownerWallet = minterWallet ;
            const scAddress = config.contracts.PrivateERCToken;
            const result = await getSplitTokenList(client,ownerWallet.address,scAddress);
            const splitTokens = result.split_tokens;
            console.log("splitTokens: ", splitTokens)
            if (splitTokens.length > 0){
                for (let i = 0; i < splitTokens.length; i++) {
                    let splitToken = splitTokens[i];
                    console.log("cancel split token: ", splitToken.token_id)
                    // await callPrivateCancel(scAddress, ownerWallet, splitToken.token_id);
                    let receipt = await callPrivateCancel(scAddress, ownerWallet, ethers.toBigInt('0x'+splitToken.token_id))
                    console.log("receipt", receipt)
                    await expect(callPrivateCancel(scAddress, ownerWallet, ethers.toBigInt('0x'+splitToken.token_id))).to.be.revertedWith("token.owner != msg.sender")

                }
            }
        });
    });
    describe("check contract totalSupply", function () {
        this.timeout(1200000);
        let totalSupplyPre,totalSupplyPost;
        const amount = 20;
        beforeEach(async function () {
            await cancelAllSplitTokens(minterWallet,config.contracts.PrivateERCToken)
        })

        it('check_contract_totalSupply', async () => {
            console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken));
            console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
        });
        it('totalSupply_add_after_mint ',async () => {
            totalSupplyPre = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
            await mint(accounts.Minter, amount);
            totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
            expect(totalSupplyPost).to.equal(totalSupplyPre + amount);
            console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken));
            console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
        });
        it('totalSupply_add_after_directMint ',async () => {
            totalSupplyPre = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
            await DirectMint(accounts.Minter, amount);
            totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
            expect(totalSupplyPost).to.equal(totalSupplyPre + amount);
            console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken));
            console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
        });
        it('totalSupply_add_after_directMint_user ',async () => {
            totalSupplyPre = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
            await DirectMint(accounts.To1, amount);
            totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
            expect(totalSupplyPost).to.equal(totalSupplyPre + amount);
            console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken));
            console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
        });
        it('totalSupply_add_after_directMint_user_other_bank ',async () => {
            totalSupplyPre = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
            await DirectMint(userInNode1, amount);
            totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
            expect(totalSupplyPost).to.equal(totalSupplyPre + amount);
            console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken));
            console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
        });
        it('totalSupply_sub_after_burn ',async () => {
            totalSupplyPre  = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
            await ReserveTokensAndBurn(amount);
            totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
            expect(totalSupplyPost).to.equal(totalSupplyPre - amount);
            console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken));
            console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
        });
        it('totalSupply_sub_after_directBurn ',async () => {
            await DirectMint(accounts.To1, amount);
            totalSupplyPre  = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
            await DirectBurn(accounts.To1,amount);
            totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
            expect(totalSupplyPost).to.equal(totalSupplyPre - amount);
            console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken));
            console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
        });
        it('totalSupply_keep_same_after_transfer',async () => {
            totalSupplyPre = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
            console.log("totalSupplyPre: ",totalSupplyPre)
            const minterBalance = await getTokenBalance(accounts.Minter);
            if(minterBalance>=100){
                await ReserveTokensAndTransfer(toAddress1,amount);
                totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
                console.log("totalSupplyPost: ",totalSupplyPost)
                expect(totalSupplyPost).to.equal(totalSupplyPre);
            }
            console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken));
            console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
        });
        it('totalSupply_keep_same_after_directTransfer',async () => {

            totalSupplyPre = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
            console.log("totalSupplyPre: ",totalSupplyPre)
            const minterBalance = await getTokenBalance(accounts.Minter);
            if(minterBalance>=100){
                await DirectTransfer(accounts.Minter,accounts.To1,amount);
                totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
                console.log("totalSupplyPost: ",totalSupplyPost)
                expect(totalSupplyPost).to.equal(totalSupplyPre);
            }
            console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken));
            console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
        });
        it('totalSupply_keep_same_after_directTransfer_otherBank',async () => {
            totalSupplyPre = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
            console.log("totalSupplyPre: ",totalSupplyPre)
            const minterBalance = await getTokenBalance(accounts.Minter);
            if(minterBalance>=amount){
                await DirectTransfer(accounts.Minter,userInNode4,amount);
                totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken);
                console.log("totalSupplyPost: ",totalSupplyPost)
                expect(totalSupplyPost).to.equal(totalSupplyPre);
            }
            console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken));
            console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
        });
    });
    describe('Verify amount consistency ', function () {
        this.timeout(1200000);
        it('verify amount consistency for minter',async () => {
            // await DirectMint(accounts.Minter, 500);
            const balanceOnChain = await getTokenBalanceOnChain(accounts.Minter);
            console.log("balanceOnChain: ", balanceOnChain)
            const balanceOffChain = await getTokenBalance(accounts.Minter);
            console.log("balanceOffChain: ", balanceOffChain)
            expect(balanceOnChain).to.equal(balanceOffChain);
        });
        it('verify amount consistency for to1',async () => {
            // await DirectMint(accounts.Minter, 500);
            const balanceOnChain = await getTokenBalanceOnChain(accounts.To1);
            console.log("balanceOnChain: ", balanceOnChain)
            const balanceOffChain = await getTokenBalance(accounts.To1);
            console.log("balanceOffChain: ", balanceOffChain)
            expect(balanceOnChain).to.equal(balanceOffChain);
        });
        it('verify amount consistency for to2',async () => {
            // await DirectMint(accounts.Minter, 500);
            const balanceOnChain = await getTokenBalanceOnChain(accounts.To2);
            console.log("balanceOnChain: ", balanceOnChain)
            const balanceOffChain = await getTokenBalance(accounts.To2);
            console.log("balanceOffChain: ", balanceOffChain)
            expect(balanceOnChain).to.equal(balanceOffChain);
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
        it('MinterAllowance should decrease after Directmint', async () => {
            await DirectMint(accounts.Minter, 100);
            postAllowance = await getMinterAllowance();
            expect(postAllowance).to.equal(preAllowance - 100);
        });
        it('MinterAllowance should decrease after mint to user', async () => {
            await mint(accounts.To1, 100);
            postAllowance = await getMinterAllowance();
            expect(postAllowance).to.equal(preAllowance - 100);
        });
        it('MinterAllowance should decrease after Directmint to user on other node', async () => {
            await DirectMint(userInNode1, 100);
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

    });

    describe.only("Authorization", function () {
        this.timeout(1200000);
        const normalWallet = ethers.Wallet.createRandom();
        const minterWallet = ethers.Wallet.createRandom();
        const adminWallet = ethers.Wallet.createRandom();

        it('Registe user as normal ', async () => {
            const userAddress = normalWallet.address;
            await registerUser(adminPrivateKey,client, userAddress, "normal");
            await sleep(2000);
            const response = await getAccount(adminPrivateKey,client, userAddress);
            console.log(response)
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_role).equal("normal");
        });
        it('Registe user as minter ', async () => {
            const userAddress = minterWallet.address;
            await registerUser(adminPrivateKey,client, userAddress, "minter");
            await sleep(2000);
            const response = await getAccount(adminPrivateKey,client, userAddress);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_role).equal("minter");
        });
        it('Registe user as admin ', async () => {
            const userAddress = adminWallet.address;
            await registerUser(adminPrivateKey,client, userAddress, "admin");
            await sleep(10000);
            const response = await getAccount(adminPrivateKey,client, userAddress);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_role).equal("admin");
        });
        it.skip('Update user status to inactive', async () => {
            await updateAccountStatus(adminPrivateKey,client,normalWallet.address,0);
            await sleep(2000);
            let response = await getAccount(adminPrivateKey,client, normalWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_INACTIVE");

            await updateAccountStatus(adminPrivateKey,client,minterWallet.address,0);
            await sleep(2000);
            response = await getAccount(adminPrivateKey,client, minterWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_INACTIVE");

            await updateAccountStatus(adminPrivateKey,client,adminWallet.address,0);
            await sleep(2000);
            response = await getAccount(adminPrivateKey,client, adminWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_INACTIVE");

        });

        it.skip('Update user status to active', async () => {
            await updateAccountStatus(adminPrivateKey,client,normalWallet.address,2);
            await sleep(2000);
            let response = await getAccount(adminPrivateKey,client, normalWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");

            await updateAccountStatus(adminPrivateKey,client,minterWallet.address,2);
            await sleep(2000);
            response = await getAccount(adminPrivateKey,client, minterWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");

            await updateAccountStatus(adminPrivateKey,client,adminWallet.address,2);
            await sleep(2000);
            response = await getAccount(adminPrivateKey,client, adminWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");

        });

        it.skip('Update user role: normal,minter,admin',async () => {
            // normal - minter
            await updateAccountRole(adminPrivateKey,client,normalWallet.address,'minter')
            let response = await getAccount(adminPrivateKey,client, normalWallet.address);
            expect(response.account_role).equal("minter");
            // minter - admin
            await updateAccountRole(adminPrivateKey,client,normalWallet.address,'admin')
            response = await getAccount(adminPrivateKey,client, normalWallet.address);
            expect(response.account_role).equal("admin");
            // admin - minter
            await updateAccountRole(adminPrivateKey,client,normalWallet.address,'minter')
            response = await getAccount(adminPrivateKey,client, normalWallet.address);
            expect(response.account_role).equal("minter");
            //minter - normal
            await updateAccountRole(adminPrivateKey,client,normalWallet.address,'normal')
            response = await getAccount(adminPrivateKey,client, normalWallet.address);
            expect(response.account_role).equal("normal");
            //normal - admin
            await updateAccountRole(adminPrivateKey,client,normalWallet.address,'admin')
            response = await getAccount(adminPrivateKey,client, normalWallet.address);
            expect(response.account_role).equal("admin");
            //admin - normal
            await updateAccountRole(adminPrivateKey,client,normalWallet.address,'normal')
            response = await getAccount(adminPrivateKey,client, normalWallet.address);
            expect(response.account_role).equal("normal");

        });

        it.skip('Use new admin to operate the normal address ',async () => {
            const privateKey = adminWallet.privateKey;
            // update status
            await updateAccountStatus(privateKey,client,normalWallet.address,0);
            let response = await getAccount(privateKey,client, normalWallet.address);
            console.log(response)
            expect(response.account_status).equal("ACCOUNT_STATUS_INACTIVE");

            await updateAccountStatus(privateKey,client,normalWallet.address,2);
            response = await getAccount(privateKey,client, normalWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");

            // update account role

            await updateAccountRole(privateKey,client,normalWallet.address,'minter')
            response = await getAccount(privateKey,client, normalWallet.address);
            expect(response.account_role).equal("minter");

            await updateAccountRole(privateKey,client,normalWallet.address,'normal')
            response = await getAccount(privateKey,client, normalWallet.address);
            expect(response.account_role).equal("normal");

        });
        it.skip('Use new minter to operate the normal address ',async () => {
            const privateKey = minterWallet.privateKey;
            // update status
            await updateAccountStatus(privateKey,client,normalWallet.address,0);
            let response = await getAccount(privateKey,client, normalWallet.address);
            expect(response.details).to.equal("current user is not the owner of the resource")

            await updateAccountRole(privateKey,client,normalWallet.address,'minter')
            response = await getAccount(privateKey,client,normalWallet.address)
            expect(response.details).to.equal("current user is not the owner of the resource")
        });

        it.skip('Should reverted: Use new normal to operate the normal address ',async () => {
            const privateKey = normalWallet.privateKey;
            expect(await updateAccountStatus(privateKey,client,normalWallet.address,0)).reverted
            expect(await updateAccountRole(privateKey,client,normalWallet.address,'minter')).reverted
        });

        it('Should reverted: Use normal address to registe account',async ()=>{
            const adminMetadata = await createAuthMetadata(adminWallet.privateKey);
            const normalMetadata = await createAuthMetadata(normalWallet.privateKey);

            const newUser = ethers.Wallet.createRandom()

            const request = {
                account_address: newUser.address,
                account_role: 'normal',//minter,admin,normal
            };

            expect( await client.registerAccount(request, normalMetadata)).reverted

        })

        it('Should reverted: Use normal address to check getAsyncAction',async ()=>{
            const adminMetadata = await createAuthMetadata(adminWallet.privateKey);
            const normalMetadata = await createAuthMetadata(normalWallet.privateKey);

            const newUser = ethers.Wallet.createRandom()

            const request = {
                account_address: newUser.address,
                account_role: 'normal',//minter,admin,normal
            };

            let response = await client.registerAccount(request, adminMetadata);
            if (response.status !== "ASYNC_ACTION_STATUS_FAIL") {
                const actionRequest = {
                    request_id: response.request_id,
                };
                expect(await client.getAsyncAction(actionRequest, normalMetadata)).reverted
            }
        })




    });


    describe("check gas used", function () {
        this.timeout(1200000);
        const MAX_GAS_LIMIT = 30000000;
        it('Check gas used during mint ',async () => {
            const receipt = await mint(accounts.Minter, 100);
            expect(receipt.gasUsed).to.be.lessThan(MAX_GAS_LIMIT)
        });
        it('Check gas used during transfer ',async () => {
            const amount = 100
            const toAddress = accounts.To1;
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
                let tokenId = '0x'+proofResult.transfer_token_id
                const receipt =  await callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress,tokenId)
                await sleep(1000);
                expect(receipt.gasUsed).to.be.lessThan(MAX_GAS_LIMIT)
            }
        });
        it('Check gas used during burn',async () => {
            await DirectMint(accounts.Minter,amount);
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                // to_address: accounts.Minter,
                amount: amount
            };
            let response = await client.generateSplitToken(splitRequest);
            let tokenResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id);
            if (tokenResult.status == "TOKEN_ACTION_STATUS_SUC") {
                const receipt =await callPrivateBurn(config.contracts.PrivateERCToken, minterWallet, '0x'+tokenResult.transfer_token_id);
                expect(receipt.gasUsed).to.be.lessThan(MAX_GAS_LIMIT)
            }
        });

    });
});


describe("Boundary value cases",function (){
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    const INVALID_ADDRESS = "0x8c8af239FfB9A6e93AC4b434C71a135572A102";
    const MAX_UINT256 = ethers.MaxUint256;
    const MIN_UINT256 = ethers.MinInt256;

    describe("Check address balance",function (){
        it("Check address balance on node3 with ZERO_ADDRESS", async function () {
            expect(await getTokenBalance(ZERO_ADDRESS)).to.equal(0);
        })
        it("Check address balance on node3 with INVALID_ADDRESS", async function () {
            expect(await ethers.isAddress(INVALID_ADDRESS)).false
            expect(await getTokenBalance(INVALID_ADDRESS)).to.equal(0);
        })
    });

    describe("Mint with boundary values", function () {
        this.timeout(1200000);
        const recevier = accounts.Minter;
        beforeEach(async function () {
            preBalance = await getTokenBalance(recevier);
        });
        it('Should revert: Mint with amount 0',async () => {
            const amount = MIN_UINT256;
            try {
                await mint(recevier,amount);
            }catch (error){
                console.log("error:",error)
                expect(error.code).to.equal(2);
                expect(error.details).to.equal("Invalid Amount");
            }
        });
        it('Should revert: Mint with -1 amount',async () => {
            const amount = MIN_UINT256 - 1n;
            try {
                await mint(recevier,amount);
            }catch (error){
                console.log("error:",error)
                expect(error.details).to.equal("Invalid Amount");
            }
        });

        it('Should revert: Mint with MAX_UINT_256',async ()=>{

            try {
                const amount = MAX_UINT256;
                console.log("amount:", amount)
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }
        });
        it('Should revert: Mint with MAX_UINT_256 +1 ',async ()=>{
            try {
                const amount = MAX_UINT256 + 1n;
                await mint(recevier,MAX_UINT256);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }
        });

        it('Should revert: Mint to ZERO_ADDRESS',async () => {
            try {
                await mint(ZERO_ADDRESS,amount);
            }catch (error){
                expect(error.details).to.equal("failed to get GrumpkinKey for to address")
            }
        });

        it('Should revert: Mint with used proof',async () => {
            const toAddress = accounts.To1;
            console.log(await getTokenBalance(toAddress))
            const generateRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                to_address: toAddress,
                amount: amount
            };
            console.log("generateMintRequest:", generateRequest)
            const response = await client.generateMintProof(generateRequest);
            const proofResult = await client.waitForProofCompletion(client.getMintProof, response.request_id)
            let receipt = await callPrivateMint(config.contracts.PrivateERCToken, proofResult, minterWallet)
            await sleep(1000);
            console.log(await getTokenBalance(toAddress))
            await expect(callPrivateMint(config.contracts.PrivateERCToken, proofResult, minterWallet)).to.revertedWith("initialMinterAllowance not match")

        });
        it('Should revert: Mint with invalid proof',async () => {
            const toAddress = accounts.To1;
            console.log(await getTokenBalance(toAddress))
            const generateRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                to_address: toAddress,
                amount: amount
            };
            console.log("generateMintRequest:", generateRequest)
            const response = await client.generateMintProof(generateRequest);
            let proofResult = await client.waitForProofCompletion(client.getMintProof, response.request_id)
            let proofTem = "1"+ proofResult.proof ;
            proofResult.proof = proofTem;
            await expect(callPrivateMint(config.contracts.PrivateERCToken, proofResult, minterWallet)).to.reverted

        });
        it.skip('Should revert: mint with amount larger than allowance',async ()=>{
            // const allowance = await getMinterAllowance()
            // const amount = allowance + 1
            const amount = 100000000;
            try {
                await mint(recevier,amount);
            }catch (error){
                expect(error.details).to.equal("allowedAmount is insufficient")
            }
        });
        it.skip('Should revert:Mint after allowance exhaustion',async ()=>{
            const allowance = await getMinterAllowance()
            const amount = allowance
            if(allowance == 0){
                try {
                    await mint(recevier,1);
                }catch (error){
                    expect(error.details).to.equal("allowedAmount is insufficient")
                }
            }else {
                await mint(recevier,amount);
                await sleep(1000);
                try {
                    await mint(recevier,1);
                }catch (error){
                    expect(error.details).to.equal("allowedAmount is insufficient")
                }
            }
        });
    });
    describe("Split and transfer boundary values",  function (){
        this.timeout(1200000);
        let preBalanceTo,postBalanceTo;
        before(async function () {
            const mintAmount = amount * 13
            await mint(accounts.Minter,mintAmount);
            await mint(accounts.To1,100);
        });

        beforeEach(async function () {
            preBalance = await getTokenBalance(accounts.Minter);
        });
        it('Should revert: transfer with amount 0',async () => {
            const amount = 0;
            preBalanceTo = await getTokenBalance(toAddress1);
            try {
                await ReserveTokensAndTransfer(toAddress1,amount);
                postBalanceTo = await getTokenBalance(toAddress1);
                postBalance = await getTokenBalance(accounts.Minter);
                expect(postBalance).to.equal(preBalance - amount);
                expect(postBalanceTo).to.equal(preBalanceTo + amount);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }

        });
        it('Should revert: transfer with  amount -1',async () => {
            const amount = -1;
            try {
                await ReserveTokensAndTransfer(toAddress1,amount);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }
        });

        it('Should revert: transfer amount larger than sender balance',async ()=>{
            const amount = preBalance +1;
            try {
                await ReserveTokensAndTransfer(toAddress1,amount);
            }catch (error){
                expect(error.details).to.equal("total amount of parent tokens is insufficient")
            }
        });
        it('Should revert: transfer with MAX_UINT256 amount',async () => {
            try {
                await ReserveTokensAndTransfer(toAddress1,MAX_UINT256);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }
        });
        it('Should revert: transfer with MAX_UINT256+1 amount',async () => {
            try {
                const amount = MAX_UINT256 + 1n;
                await ReserveTokensAndTransfer(toAddress1,amount);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }
        });
        it('Should revert: transfer to  ZERO_ADDRESS',async () => {
            preBalanceTo = await getTokenBalance(ZERO_ADDRESS);
            expect(await ReserveTokensAndTransfer(ZERO_ADDRESS,amount)).to.revertedWith("PrivateERCToken: to is the zero address")
        });
        it('Should revert: transfer with used tokenId',async () => {
            const amount = 10
            preBalanceTo = await getTokenBalance(toAddress1);
            const toAddress = accounts.To1;
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
                let tokenId = '0x'+proofResult.transfer_token_id
                await callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress,tokenId)
                await sleep(1000);
                await expect(callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress,tokenId)).to.revertedWith("PrivateERCToken: tokenId is not matched")
            }
        });
        it('Should revert: transfer with tokenId 0',async () => {
            const amount = 10
            preBalanceTo = await getTokenBalance(toAddress1);
            const toAddress = accounts.To1;
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
                let tokenId = '0x'+proofResult.transfer_token_id
                console.log("proofResult", proofResult)
                await expect(callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress,0)).to.revertedWith("PrivateERCToken: tokenId is zero")
            }
        });
        it('Should revert: transfer to address not matched',async () => {
            const amount = 10
            preBalanceTo = await getTokenBalance(toAddress1);
            const toAddress = accounts.To1;
            console.log(await getTokenBalance(accounts.To1));
            console.log(await getTokenBalance(accounts.To2))
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
                // console.log("proofResult", proofResult);
                let tokenId = '0x'+proofResult.transfer_token_id
                await expect(callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,accounts.To2,tokenId)).to.revertedWith("PrivateERCToken: tokenId is not matched")
            }

        });
        it('transfer all amount',async () => {
            await cancelAllSplitTokens(minterWallet,config.contracts.PrivateERCToken);
            const amount = await getTokenBalance(accounts.Minter);
            console.log("minter amount:",amount)
            preBalanceTo = await getTokenBalance(toAddress1);
            await cancelAllSplitTokens(minterWallet,config.contracts.PrivateERCToken)
            await ReserveTokensAndTransfer(toAddress1,amount);
            postBalanceTo = await getTokenBalance(toAddress1);
            postBalance = await getTokenBalance(accounts.Minter);
            expect(postBalance).to.equal(preBalance - amount);
            expect(postBalanceTo).to.equal(preBalanceTo + amount);
        });

    })

    describe("Split and burn with boundary values", function () {
        this.timeout(1200000);

        beforeEach(async function () {
            preBalance = await getTokenBalance(accounts.Minter);
        });

        it('Should revert: burn amount larger than minter balance',async ()=>{
            const amount = preBalance + 1
            try {
                await ReserveTokensAndBurn(amount);
            }catch (error){
                console.log(error)
                expect(error.details).to.equal("total amount of parent tokens is insufficient")
            }
        })
        it('Should revert: burn  0',async () => {
            const amount = 0;
            try {
                await ReserveTokensAndBurn(amount);
                postBalance = await getTokenBalance(accounts.Minter);
                expect(postBalance).to.equal(preBalance);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }
        });

        it('Should revert: burn -1 amount',async () => {
            const amount = -1;
            try {
                await ReserveTokensAndBurn(amount);
                postBalance = await getTokenBalance(accounts.Minter);
                expect(postBalance).to.equal(preBalance);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }
        });
        it('Should revert: burn MAX_UINT256 amount',async () => {
            try {
                await ReserveTokensAndBurn(MAX_UINT256);
                postBalance = await getTokenBalance(accounts.Minter);
                expect(postBalance).to.equal(preBalance);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }
        });
        it('Should revert: burn MAX_UINT256 +1  amount',async () => {
            try {
                const amount = MAX_UINT256 + 1n;
                await ReserveTokensAndBurn(amount);
                postBalance = await getTokenBalance(accounts.Minter);
                expect(postBalance).to.equal(preBalance);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }
        });
        it('Should revert: burn  with tokenId 0',async () => {
            await DirectMint(accounts.Minter,amount);
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                // to_address: accounts.Minter,
                amount: amount
            };
            let response = await client.generateSplitToken(splitRequest);
            let tokenResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id);
            if (tokenResult.status == "TOKEN_ACTION_STATUS_SUC") {
                await expect(callPrivateBurn(config.contracts.PrivateERCToken, minterWallet, 0)).to.revertedWith("PrivateERCToken: tokenId is zero")
            }
        });
        it('Should revert: burn  with used tokenId',async () => {
            await DirectMint(accounts.Minter,amount);
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                // to_address: accounts.Minter,
                amount: amount
            };
            let response = await client.generateSplitToken(splitRequest);
            let tokenResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id);
            if (tokenResult.status == "TOKEN_ACTION_STATUS_SUC") {
                const tokenId = '0x'+tokenResult.transfer_token_id;
                await callPrivateBurn(config.contracts.PrivateERCToken, minterWallet, tokenId);
                await sleep(2000);
                await expect(callPrivateBurn(config.contracts.PrivateERCToken, minterWallet, 0)).to.revertedWith("PrivateERCToken: tokenId is zero")
            }
        });
        it('burn all minter amount',async () => {
            const burn_amount = await getTokenBalance(accounts.Minter);
            await cancelAllSplitTokens(minterWallet,config.contracts.PrivateERCToken);
            await ReserveTokensAndBurn(burn_amount);
            postBalance = await getTokenBalance(accounts.Minter);
            expect(postBalance).to.equal(preBalance - burn_amount);
        });
    });
    describe('Direct Mint with boundary values', function () {
        this.timeout(1200000);

        it('Try to directMint 0 amount to user ',async () => {
            const recevier = accounts.Minter
            try {
                await DirectMint(recevier,0);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }
        });
        it('Try to directMint  -1 amount to user ',async () => {
            const recevier = accounts.Minter
            try {
                await DirectMint(recevier,-1);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }
        });
        it('Try to directMint  MAX_UINT256 to user ',async () => {
            const recevier = accounts.To1
            try {
                await DirectMint(recevier,MAX_UINT256);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }
        });
        it('Try to directMint  MAX_UINT256 +1  to user ',async () => {
            const recevier = accounts.To1
            try {
                const amount = MAX_UINT256 + 1n;
                await DirectMint(recevier,MAX_UINT256);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }
        });
        it('Try to directMint  100 to zeroAddress ',async () => {
            const recevier = ZERO_ADDRESS
            try {
                await DirectMint(recevier,amount);
            }catch (error){
                expect(error.details).to.equal("failed to get GrumpkinKey for to address")
            }
        });
        it.skip('Try to directMint  after allowance exhaustion ',async () => {
            const recevier = accounts.To1
            const allowance = await getMinterAllowance();
            if (allowance == 0){
                try {
                    await DirectMint(recevier,1);
                }catch (error){
                    expect(error.details).to.equal("Invalid Amount")
                }
            }else {
                await DirectMint(accounts.Minter,allowance);
                await sleep(3000)
                try {
                    await DirectMint(recevier,1);
                }catch (error){
                    expect(error.details).to.equal("Invalid Amount")
                }
            }
        });
    });

    describe('Direct Transfer with boundary values', function () {
        this.timeout(1200000);
        before(async function () {
            await DirectMint(accounts.Minter, amount*6);
            await DirectMint(accounts.To1, amount*2);
        });

        it('Try to transfer from minter to user in bank with 0 amount ',async () => {
            const sender = accounts.Minter;
            const recevier = accounts.To1;
            const amount = 0;
            try {
                await DirectTransfer(sender,recevier, amount);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }
        });
        it('Try to ransfer from minter to user in bank with -1 amount ',async () => {
            const sender = accounts.Minter;
            const recevier = accounts.To1;
            const amount = -1;
            try {
                await DirectTransfer(sender,recevier, amount);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }
        });
        it('Try to ransfer from minter to user in bank with MAX_UINT amount ',async () => {
            const sender = accounts.Minter;
            const recevier = accounts.To1;
            const amount = MAX_UINT256;
            try {
                await DirectTransfer(sender,recevier, amount);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }
        });
        it('Try to ransfer from minter to user in bank with MAX_UINT+1 amount',async () => {
            const sender = accounts.Minter;
            const recevier = accounts.To1;
            const amount =MAX_UINT256 + 1n;
            try {
                await DirectTransfer(sender,recevier, amount);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }
        });
        it('Try to transfer from minter to ZERO ADDRESS ',async () => {
            const sender = accounts.Minter;
            const recevier = ZERO_ADDRESS;
            const amount = 100;
            try {
                await DirectTransfer(sender,recevier, amount);
            }catch (error){
                expect(error.details).to.equal("Invalid toAddress")
            }
        });

        it('Try to transfer from userA to ZERO ADDRESS',async () => {
            const sender = accounts.To1;
            const recevier = ZERO_ADDRESS;
            await DirectMint(sender,amount);
            try {
                await DirectTransfer(sender,recevier, amount);
            }catch (error){
                expect(error.details).to.equal("Invalid toAddress")
            }
        });
        it('Try to transfer larger amount than minter owned',async () => {
            const sender = accounts.Minter;
            const recevier = accounts.To1;
            const preBalance = await getTokenBalance(sender);
            console.log(preBalance)
            const amount = preBalance + 1;
            try {
                await DirectTransfer(sender,recevier, amount);
            }catch (error){
                expect(error.details).to.equal("total amount of parent tokens is insufficient")
            }
        });

    });

    describe('Direct Burn with boundary values', function () {
        this.timeout(1200000);
        before(async function () {
            await DirectMint(accounts.Minter, amount);
            await DirectMint(accounts.To1, amount*3);
        });
        it('Try to DirectBurn 100 for user of other bank',async () => {
            const burner = userInNode1
            await DirectMint(burner, amount);
            try {
                await DirectBurn(burner, 100);
            }catch (error){
                expect(error.details).to.equal("No tokens are available for splitting.")
            }
        });
        it('Try to burn 0 amount',async () => {
            const burner = accounts.To1
            await DirectMint(burner, amount);
            try {
                await DirectBurn(burner, 0);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }

        });
        it('Try to burn -1 amount',async () => {
            const burner = accounts.To1
            try {
                await DirectBurn(burner, -1);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }
        });
        it('Try to burn MAX_UINT256 amount',async () => {
            const burner = accounts.Minter
            try {
                await DirectBurn(burner, MAX_UINT256);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }
        });
        it('Try to burn MAX_UINT256+1 amount',async () => {
            const burner = accounts.Minter
            try {
                const amount = MAX_UINT256 + 1n;
                await DirectBurn(burner, amount);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }
        });
    });

})
describe("Permission and BlackList", function () {
    this.timeout(1200000);
    const wallet = ethers.Wallet.createRandom();
    const key = wallet.privateKey;
    const userWallet = new ethers.Wallet(key,l1Provider);
    const toAddress = wallet.address;
    it('New user should not be able to mint to', async () => {
        try {
            await mint(toAddress, 100)
        } catch (error) {
            expect(error.details).to.equal("failed to get GrumpkinKey for to address")
        }
    });
    it('Registe user', async () => {
        await registerUser(toAddress);
        await sleep(2000);
    });
    it('Mint to user', async () => {
        const preBalance = await getTokenBalance(toAddress);
        await mint(toAddress, 100);
        let postBalance = await getTokenBalance(toAddress);
        console.log("new user balance is ", postBalance)
        expect(postBalance).to.equal(preBalance + 100);
    });
    it('Transfer to user', async () => {
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
    it('ReserveToken And transfer for user', async () => {
        const amount = 100
        const recevier  = accounts.To1;
        const preBalance = await getTokenBalance(toAddress);
        const preBalanceTo  = await getTokenBalance(recevier);
        console.log("preBalance", preBalance)
        await ReserveTokensAndTransferFrom(userWallet, toAddress, recevier, amount);
        const postBalance = await getTokenBalance(toAddress);
        const postBalanceTo = await getTokenBalance(recevier);
        console.log("postBalance", postBalance)
        expect(postBalance).to.equal(preBalance - amount);
        expect(postBalanceTo).to.equal(preBalanceTo + amount);
    });
    it('Should revert: mint without minterWallet', async () => {
        const address = accounts.To1;
        const generateRequest = {
            sc_address: config.contracts.PrivateERCToken,
            token_type: '0',
            to_address: address,
            amount: amount
        };
        const response = await client.generateMintProof(generateRequest);
        const proofResult = await client.waitForProofCompletion(client.getMintProof, response.request_id)
        await expect(callPrivateMint(config.contracts.PrivateERCToken, proofResult, spender1Wallet)).to.reverted
    });
    it('Should revert: Add user to blacklist without ownerWallet', async () => {
        let isBlackListed = await isBlackList(toAddress);
        if (!isBlackListed) {
            console.log("user address is ", toAddress);
            const noOnwerWallet = new ethers.Wallet('555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626786', l1Provider);
            const contract = await ethers.getContractAt("PrivateUSDC", config.contracts.PrivateERCToken,noOnwerWallet);
            await expect(contract.blacklist(toAddress)).to.reverted
        }
    });
    it('Add user to blacklist ', async () => {
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
    it('Should revert: operation for blacklist address ', async () => {
        let isBlackListed = await isBlackList(toAddress);
        console.log("isBlackListed", isBlackListed)
        if(isBlackListed){
            const generateRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                to_address: toAddress,
                amount: amount
            };
            const response = await client.generateMintProof(generateRequest);
            const proofResult = await client.waitForProofCompletion(client.getMintProof, response.request_id)
            await expect(callPrivateMint(config.contracts.PrivateERCToken, proofResult, minterWallet)).to.be.revertedWith("Blacklistable: account is blacklisted");

        }else {
            console.log("user is not in blacklist")
        }

    });
    it('Should revert: remove user from blacklist with noOwnerWallet ', async () => {
        let isBlackListed = await isBlackList(toAddress);
        console.log("isBlackListed", isBlackListed)
        if (isBlackListed) {
            console.log("user address is ", toAddress);
            const onwerWallet = new ethers.Wallet('555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626786', l1Provider);
            const contract = await ethers.getContractAt("PrivateUSDC", config.contracts.PrivateERCToken,onwerWallet);
            await expect(contract.unBlacklist(toAddress)).to.reverted
        } else {
            console.log("user is already out of blacklist");
        }
    });
    it('Remove user from blacklist ', async () => {
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
    it('Try to operation for address removed from blackList ', async () => {
        const preBalance = await getTokenBalance(toAddress);

        await mint(toAddress, 100);
        let postBalance = await getTokenBalance(toAddress);
        console.log("new user balance is after mint", postBalance)
        expect(postBalance).to.equal(preBalance + 100);

        await mint(accounts.Minter, 100)
        await ReserveTokensAndTransfer(toAddress, 100);
        postBalance = await getTokenBalance(toAddress);
        console.log("new user balance is after transferIn", postBalance)
        expect(postBalance).to.equal(preBalance + 200);

        await ReserveTokensAndTransferFrom(userWallet, toAddress, accounts.To2, 100);
        postBalance = await getTokenBalance(toAddress);
        console.log("new user balance is after transferOut", postBalance)
    });

});

describe('Security cases', function () {
    describe('Mint security', function () {
        this.timeout(1200000);
        it('Should revert: mint with used proof',async () => {
            const toAddress = accounts.To1;
            console.log(await getTokenBalance(toAddress))
            const generateRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                to_address: toAddress,
                amount: amount
            };
            console.log("generateMintRequest:", generateRequest)
            const response = await client.generateMintProof(generateRequest);
            const proofResult = await client.waitForProofCompletion(client.getMintProof, response.request_id)
            let receipt = await callPrivateMint(config.contracts.PrivateERCToken, proofResult, minterWallet)
            await sleep(1000);
            console.log(await getTokenBalance(toAddress))
            await expect(callPrivateMint(config.contracts.PrivateERCToken, proofResult, minterWallet)).to.revertedWith("initialMinterAllowance not match")

        });
        it('Should revert: mint with invalid proof',async () => {
            const toAddress = accounts.To1;
            console.log(await getTokenBalance(toAddress))
            const generateRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                to_address: toAddress,
                amount: amount
            };
            console.log("generateMintRequest:", generateRequest)
            const response = await client.generateMintProof(generateRequest);
            let proofResult = await client.waitForProofCompletion(client.getMintProof, response.request_id)
            let proofTem = "1"+ proofResult.proof ;
            proofResult.proof = proofTem;
            await expect(callPrivateMint(config.contracts.PrivateERCToken, proofResult, minterWallet)).to.reverted
        });
    });
    describe('Transfer security', function () {
        this.timeout(1200000);
        it('Should revert: transfer with used tokenId',async () => {
            const amount = 10
            preBalanceTo = await getTokenBalance(toAddress1);
            const toAddress = accounts.To1;
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
                let tokenId = '0x'+proofResult.transfer_token_id
                await callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress,tokenId)
                await sleep(1000);
                await expect(callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress,tokenId)).to.revertedWith("PrivateERCToken: tokenId is not matched")
            }
        });
        it('Should revert: transfer with tokenId 0',async () => {
            const amount = 10
            preBalanceTo = await getTokenBalance(toAddress1);
            const toAddress = accounts.To1;
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
                let tokenId = '0x'+proofResult.transfer_token_id
                console.log("proofResult", proofResult)
                await expect(callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress,0)).to.revertedWith("PrivateERCToken: tokenId is zero")
            }
        });
        it('Should revert: transfer to address not matched',async () => {
            const amount = 10
            preBalanceTo = await getTokenBalance(toAddress1);
            const toAddress = accounts.To1;
            console.log(await getTokenBalance(accounts.To1));
            console.log(await getTokenBalance(accounts.To2))
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
                // console.log("proofResult", proofResult);
                let tokenId = '0x'+proofResult.transfer_token_id
                await expect(callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,accounts.To2,tokenId)).to.revertedWith("PrivateERCToken: tokenId is not matched")
            }

        });
        it('Transfer two tokens consecutively',async () => {
            const amount = 10
            await DirectMint(accounts.Minter,100)
            const preBalanceTo = await getTokenBalance(toAddress1);
            const preBalanceFrom = await getTokenBalance(accounts.Minter);
            const toAddress = accounts.To1;
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: toAddress,
                amount: amount
            };
            console.log("generateSplitTokenRequest:", splitRequest)
            let response1 = await client.generateSplitToken(splitRequest);
            let proofResult1 = await client.waitForActionCompletion(client.getSplitToken, response1.request_id);

            let response2 = await client.generateSplitToken(splitRequest);
            let proofResult2 = await client.waitForActionCompletion(client.getSplitToken, response2.request_id);

            if (proofResult1.status == "TOKEN_ACTION_STATUS_SUC"&& proofResult2.status == "TOKEN_ACTION_STATUS_SUC" ) {
                let tokenId1 = '0x'+proofResult1.transfer_token_id
                let tokenId2 = '0x'+proofResult2.transfer_token_id
                await callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress,tokenId1)
                await sleep(1000);
                await callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress,tokenId2)
                await sleep(1000);
                const postBalanceTo = await getTokenBalance(toAddress1);
                const postBalanceFrom = await getTokenBalance(accounts.Minter);
                console.log("postBalanceTo", postBalanceTo)
                console.log("preBalanceTo", preBalanceTo)
                expect(postBalanceTo).to.equal(preBalanceTo+amount*2);
                expect(postBalanceFrom).to.equal(preBalanceFrom-amount*2);
            }
        });
        it('Should revert: transfer with burn token id',async () => {
            const amount = 10
            await DirectMint(accounts.Minter,100)
            const toAddress = accounts.To1;
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                // to_address: accounts.Minter,
                amount: amount
            };
            let response = await client.generateSplitToken(splitRequest);
            let tokenResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id);
            if (tokenResult.status == "TOKEN_ACTION_STATUS_SUC") {
                const tokenId = '0x'+tokenResult.transfer_token_id
                await expect(callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress,tokenId)).to.revertedWith("PrivateERCToken: tokenId is not matched")
            }
        });
    });
    describe('Burn security', function () {
        this.timeout(1200000);
        it('Should revert: burn  with tokenId 0',async () => {
            await DirectMint(accounts.Minter,amount);
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                // to_address: accounts.Minter,
                amount: amount
            };
            let response = await client.generateSplitToken(splitRequest);
            let tokenResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id);
            if (tokenResult.status == "TOKEN_ACTION_STATUS_SUC") {
                await expect(callPrivateBurn(config.contracts.PrivateERCToken, minterWallet, 0)).to.revertedWith("PrivateERCToken: tokenId is zero")
            }
        });
        it('Should revert: burn  with used tokenId',async () => {
            await DirectMint(accounts.Minter,amount);
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                // to_address: accounts.Minter,
                amount: amount
            };
            let response = await client.generateSplitToken(splitRequest);
            let tokenResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id);
            if (tokenResult.status == "TOKEN_ACTION_STATUS_SUC") {
                const tokenId = '0x'+tokenResult.transfer_token_id
                await callPrivateBurn(config.contracts.PrivateERCToken, minterWallet, tokenId)
                await sleep(2000);
                await expect(callPrivateBurn(config.contracts.PrivateERCToken, minterWallet, tokenId)).to.reverted
            }
        });
        it('Should revert: burn with transfer token id',async () => {
            const amount = 10
            const toAddress = accounts.To1;
            console.log(await getTokenBalance(toAddress))
            console.log(await getTokenBalance(accounts.Minter))
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: toAddress,
                amount: amount
            };
            let response = await client.generateSplitToken(splitRequest);
            let tokenResult = await client.waitForActionCompletion(client.getSplitToken, response.request_id);
            if (tokenResult.status == "TOKEN_ACTION_STATUS_SUC") {
                const tokenId = '0x'+tokenResult.transfer_token_id
                // await callPrivateBurn(config.contracts.PrivateERCToken, minterWallet, tokenId)
                await sleep(2000);
                console.log(await getTokenBalance(toAddress))
                console.log(await getTokenBalance(accounts.Minter))
                await expect(callPrivateBurn(config.contracts.PrivateERCToken, minterWallet, tokenId)).to.reverted
            }
        });
    });
});





