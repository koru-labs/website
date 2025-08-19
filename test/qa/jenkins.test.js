const { expect } = require("chai");
const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')


const rpcUrl = "qa-node3-rpc.hamsa-ucl.com:50051"
const rpcUrl_1 = "qa-node4-rpc.hamsa-ucl.com:50051"
// const rpcUrl = 'a901f625f7fbc414d89f04b67325365c-1938211366.us-west-1.elb.amazonaws.com:50051'
// const rpcUrl_1 = "a10062b98cbe34ba2a0b278754c41a1e-660863113.us-west-1.elb.amazonaws.com:50051"
const client = createClient(rpcUrl)
const client1 = createClient(rpcUrl_1)

const {
    callPrivateMint,
    callPrivateTransfer,
    callPrivateBurn,
    callPrivateCancel,
    getMinterAllowance,
    getTotalSupplyNode3,
    getPublicTotalSupply,
    getPublicBalance,
    createAuthMetadata,
    registerUser,
    updateAccountStatus,
    updateAccountRole,
    getAccount,
    isBlackList,
    addToBlackList,
    removeFromBlackList,
    getEvents,
    getHamsaEvents,
    getSplitTokenList,
    getAddressBalance2,
    callPrivateTransferFrom,
    callPrivateRevoke,
    getApprovedAllowance,
    allowBanksInTokenSmartContract,
    setMinterAllowed,
    getUserManager,
    assertEventsContain
} = require("../help/testHelp")
const {address, hexString} = require("hardhat/internal/core/config/config-validation");
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

const adminWallet = new ethers.Wallet(accounts.OwnerKey, l1Provider);
const minterWallet = new ethers.Wallet(accounts.MinterKey, l1Provider);
const spender1Wallet = new ethers.Wallet(accounts.Spender1Key, l1Provider);
const to1Wallet = new ethers.Wallet(accounts.To1PrivateKey, l1Provider);

const toAddress1 = accounts.To1;
const toAddress2 = accounts.To2;


const userInNode1 = '0xbA268f776F70caDB087e73020dfE41c7298363Ed';
const userInNode2 = '0xF8041E1185C7106121952bA9914ff904A4A01c80';
const userInNode3 = '0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB';
const userInNode4 = '0x5a3288A7400B2cd5e0568728E8216D9392094892';
const adminPrivateKey = hardhatConfig.networks.ucl_L2.accounts[1];
const node4AdminPrivateKey = "81690fb141b4ae5682ad1fd73b29ae1bcc67891e93de73c6f636402deac21171";

const amount = 10;
let preBalance,postBalance;
let preAllowance,postAllowance;

// const minterMeta = await createAuthMetadata(accounts.MinterKey);
// const onwerMeta = await createAuthMetadata(accounts.Owner)

async function mint(address,amount) {
    const minterMeta = await createAuthMetadata(accounts.MinterKey);
    const generateRequest = {
        from_address: accounts.Minter,
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        to_address: address,
        amount: amount
    };
    const response = await client.generateMintProof(generateRequest,minterMeta);
    console.log("generateMintProof:", response)
    const receipt = await callPrivateMint(config.contracts.PrivateERCToken, response, minterWallet)
    console.log("callPrivateMint:", receipt)
    let tx = await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
    console.log("callPrivateMint:", tx)
    return  receipt
}

async function mintBy(address,amount,minterWallet) {
    const key = minterWallet.privateKey
    const minterMeta = await createAuthMetadata(key);
    const wallet = new ethers.Wallet(key, l1Provider);
    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: minterWallet.address,
        to_address: address,
        amount: amount
    };
    console.log("generateMintRequest:", generateRequest)
    const response = await client.generateMintProof(generateRequest,minterMeta);
    console.log("generateMintProofResult:", response)
    const receipt = await callPrivateMint(config.contracts.PrivateERCToken, response, wallet)
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
    return  receipt
}
async function ReserveTokensAndTransfer(toAddress,amount,metadata) {
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: toAddress,
        amount: amount,
        comment:"transfer"
    };
    console.log("generateSplitTokenRequest:", splitRequest)
    try {
        let response = await client.generateSplitToken(splitRequest,metadata);
        console.log("Generate transfer Proof response:", response);
        await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,metadata)
        let receipt = await callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress,'0x'+response.transfer_token_id)
        await sleep(4000)
        console.log("callPrivateTransfer:", receipt)
        return receipt
    }catch (error){
        const wrappedError = new Error('Transfer failed: ' + error.details);
        wrappedError.code = error.code;
        wrappedError.details = error.details;
        throw wrappedError;
    }
}
async function TransferSplitProof(toAddress,amount,metadata) {
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: toAddress,
        amount: amount,
        comment:"transfer"
    };
    let response = await client.generateSplitToken(splitRequest,metadata);
    console.log("Generate transfer Proof response:", response);
    // await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,metadata)
    return response
}
async function BurnSplitProof(amount) {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: accounts.Minter,
        amount: amount,
        comment:"burn"
    };
    let response = await client.generateSplitToken(splitRequest,metadata);
    console.log("Generate burn Proof response:", response);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,metadata)
    return response

}
async function ReserveTokensAndTransferFrom(fromWallet,spenderWallet,fromAddress,toAddress,amount,fromMetadata){
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: fromAddress,
        spender_address : accounts.Spender1,
        to_address: toAddress,
        amount: amount,
        comment:"ApproveTransfer"
    };
    console.log("generateSplitTokenRequest:", splitRequest)
    try {
        let response = await client.generateApproveProof(splitRequest,fromMetadata);
        console.log("Generate transfer Proof response:", response);
        await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,fromMetadata)
        await callPrivateTransferFrom(spenderWallet,config.contracts.PrivateERCToken,fromAddress,toAddress,'0x'+response.transfer_token_id)
        await sleep(1000)
        // console.log("receipt", receipt)
        // return receipt
    }catch (error){
        console.log(error)
        return error
    }

}

async function generateApprove(fromWallet,fromAddress,toAddress,amount,fromMetadata){
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: fromAddress,
        spender_address : accounts.Spender1,
        to_address: toAddress,
        amount: amount,
        comment:"ApproveTransfer"
    };
    console.log("generateSplitTokenRequest:", splitRequest)
    try {
        let response = await client.generateApproveProof(splitRequest,fromMetadata);
        console.log("Generate transfer Proof response:", response);
        await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,fromMetadata)
        return  response
        // let receipt = await callPrivateRevoke(spenderWallet,config.contracts.PrivateERCToken,fromAddress,toAddress,'0x'+response.transfer_token_id)
        // let receipt = await callPrivateRevoke(config.contracts.PrivateERCToken,fromAddress,accounts.Spender1,'0x'+response.transfer_token_id)
    }catch (error){
        console.log(error)
        return error
    }
}

async function revoke(fromWallet,response){
    console.log("revoke token id :", '0x'+response.transfer_token_id)
    let receipt = await callPrivateRevoke(config.contracts.PrivateERCToken,fromWallet,accounts.Spender1,'0x'+response.transfer_token_id)
    console.log("receipt", receipt)
    return receipt
}

async function ReserveTokensAndBurn(amount) {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    try {
        const splitRequest = {
            sc_address: config.contracts.PrivateERCToken,
            token_type: '0',
            from_address: accounts.Minter,
            amount: amount,
            comment:"Burn"
        };
        let response = await client.generateSplitToken(splitRequest,metadata);
        console.log("Generate burn Proof response:", response);
        await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,metadata)
        let receipt = await callPrivateBurn(config.contracts.PrivateERCToken,minterWallet,'0x'+response.transfer_token_id)
        await sleep(4000)
        return receipt
    }catch (error){
        const wrappedError = new Error('Burn failed: ' + error.details);
        wrappedError.code = error.code;
        wrappedError.details = error.details;
        throw wrappedError;
    }


}
async function getTokenBalanceByAuth(grpcClient, account, metadata){

    let balance = await getAddressBalance2(grpcClient, config.contracts.PrivateERCToken, account, metadata)
    return Number(balance.balance)
}

async function getTokenBalanceByAdmin(account){
    const metadata = await  createAuthMetadata(adminPrivateKey)
    let balance = await getAddressBalance2(client, config.contracts.PrivateERCToken, account, metadata)
    console.log("balance: ", balance)
    return Number(balance.balance)
}

function convertBigInt2Hex(number) {
    return ethers.toBigInt(number).toString(10)
}

async function getTokenBalanceOnChain(address, metadata){
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
    let decodeAmount = await client.decodeElgamalAmount(balance, metadata)
    return Number(decodeAmount.balance)
}

async function getTokenBalanceInNode1(address){
    const metadata = await createAuthMetadata(node4AdminPrivateKey)
    console.log(node4AdminPrivateKey)
    // let balance = await client1.getAccountBalance(config.contracts.PrivateERCToken, address,metadata)
    let balance = await getAddressBalance2(client1, config.contracts.PrivateERCToken, address, metadata)
    // console.log(`address ${address} account balance ${balance.balance} `)
    // console.log("account balance: ", await getAddressBalance(client, config.contracts.PrivateERCToken, address))
    return Number(balance.balance)
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function DirectMint(receiver,amount) {
    const minterMeta = await createAuthMetadata(accounts.MinterKey)
    const generateRequest = {
        from_address: accounts.Minter,
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        to_address: receiver,
        amount: amount
    };
    const response = await client.generateDirectMint(generateRequest,minterMeta);
    console.log("Generate Mint Proof response:", response);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
    await sleep(4000)
}
async function DirectTransfer(from,receiver,amount,meta) {
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: from,
        to_address : receiver,
        amount: amount,
        comment:"Transfer"
    };
    let response = await client.generateDirectTransfer(splitRequest,meta);
    console.log("Generate transfer Proof response:", response);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,meta)
}
async function DirectBurn(address,amount,meta) {
    const splitRequest =
        {
            sc_address: config.contracts.PrivateERCToken,
            token_type: '0',
            from_address: address,
            amount: amount,
            comment:"Burn"
        };

    let response = await client.generateDirectBurn(splitRequest,meta);
    console.log("Generate transfer Proof response:", response);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,meta)
}
async function cancelAllSplitTokens(ownerWallet,scAddress){
    // const metadata = await createAuthMetadata(adminPrivateKey)
    const metadata = await createAuthMetadata(ownerWallet.privateKey)
    const ownerAddress = ownerWallet.address;
    const result = await getSplitTokenList(client,ownerAddress,scAddress,metadata);
    const splitTokens = result.split_tokens;
    console.log("splitTokens: ", splitTokens)
    if (splitTokens.length > 0){
        for (let i = 0; i < splitTokens.length; i++) {
            let splitToken = splitTokens[i];
            console.log("cancel split token: ", splitToken.token_id)
            // await callPrivateCancel(scAddress, ownerWallet, splitToken.token_id);
            let receipt = await callPrivateCancel(scAddress, ownerWallet, '0x'+splitToken.token_id)
            //console.log("receipt", receipt)
        }
    }
    await sleep(3000);
}
describe("Function Cases",function (){

    let adminMeta,minterMeta,spenderMeta,to1Meta,node4AdminMeta

    before(async function () {
        adminMeta = await createAuthMetadata(adminPrivateKey)
        minterMeta = await createAuthMetadata(accounts.MinterKey)
        spenderMeta = await createAuthMetadata(accounts.Spender1Key)
        to1Meta = await createAuthMetadata(accounts.To1PrivateKey);
        node4AdminMeta = await createAuthMetadata(node4AdminPrivateKey);

        // await registerUser(adminPrivateKey,client,accounts.Minter,"minter");
        // await registerUser(adminPrivateKey,client,accounts.To1,"normal");
        // await registerUser(adminPrivateKey,client,accounts.To2,"normal");
        // await registerUser(adminPrivateKey,client1,userInNode1,"normal");
        // await updateAccountStatus(adminPrivateKey,client1,userInNode1,2)
    })
    describe("Mint", function () {
        this.timeout(1200000);
        const recevier = accounts.Minter;
        beforeEach(async function () {
            preBalance = await getTokenBalanceByAdmin(recevier);
        });

        it('Mint 1 tokens to minter',async () => {
            const amount = 1;
            let recepit = await mint(recevier,amount);
            postBalance = await getTokenBalanceByAdmin(recevier);
            expect(postBalance).to.equal(preBalance + amount);
        });
        it('Mint  10 to user in node3',async () => {
            const userAddress = accounts.To1;
            const preBalanceUser = await getTokenBalanceByAdmin(userAddress);
            await mint(userAddress,amount);
            const postBalanceUser = await getTokenBalanceByAdmin(userAddress);
            expect(postBalanceUser).to.equal(preBalanceUser + amount);
        });
        it('Mint  10 to user cross node',async () => {
            const userAddress = userInNode1;
            const preBalanceUser = await getTokenBalanceInNode1(userAddress);
            console.log(preBalanceUser)
            await mint(userAddress,amount);
            const postBalanceUser = await getTokenBalanceInNode1(userAddress);
            expect(postBalanceUser).to.equal(preBalanceUser + amount);
        });
    });
    describe("Split and transfer",  function (){
        this.timeout(1200000);
        let preBalanceTo,postBalanceTo;
        beforeEach(async function () {
            preBalance = await getTokenBalanceByAdmin(accounts.Minter);
        });
        it('transfer to user1 inBank with 1',async () => {
            await DirectMint(accounts.Minter,100)
            preBalance = await getTokenBalanceByAdmin(accounts.Minter);
            preBalanceTo = await getTokenBalanceByAdmin(accounts.To1);
            await ReserveTokensAndTransfer(accounts.To1,amount,minterMeta);
            postBalanceTo = await getTokenBalanceByAdmin(accounts.To1);
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            console.log({preBalance,postBalance,preBalanceTo,postBalanceTo})
            expect(postBalance).to.equal(preBalance-amount);
            expect(postBalanceTo).to.equal(preBalanceTo + amount);
        });

        it('transfer to user cross Bank with 10',async () => {
            const recevier = userInNode1;
            preBalanceTo = await getTokenBalanceInNode1(recevier);
            await ReserveTokensAndTransfer(recevier,amount,minterMeta);
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            postBalanceTo = await getTokenBalanceInNode1(recevier);
            expect(postBalance).to.equal(preBalance - amount);
            expect(postBalanceTo).to.equal(preBalanceTo + amount);
        });
        it('transfer 5 from user1 address to user2',async () => {
            const amount = 5;
            const sender = accounts.To1;
            const senderWallet = to1Wallet;
            preBalance = await getTokenBalanceByAdmin(sender);
            console.log("sender balance:",preBalance)
            preBalanceTo = await getTokenBalanceByAdmin(accounts.To2);
            if (preBalance>=amount){
                await ReserveTokensAndTransferFrom( to1Wallet,spender1Wallet,accounts.To1, accounts.To2,amount,to1Meta)
                postBalance = await getTokenBalanceByAdmin(accounts.To1);
                postBalanceTo = await getTokenBalanceByAdmin(accounts.To2);
                expect(postBalance).to.equal(preBalance - amount);
                expect(postBalanceTo).to.equal(preBalanceTo + amount);
            }else {
                console.log("balance is not enough")
            }

        });
        it('transfer 5 from user1 address to otherBank user',async () => {
            const amount = 5;
            preBalance = await getTokenBalanceByAdmin(accounts.To1);
            if (preBalance>=amount){
                await ReserveTokensAndTransferFrom(to1Wallet,spender1Wallet,accounts.To1, userInNode1,amount,to1Meta)
                postBalance = await getTokenBalanceByAdmin(accounts.To1);
                expect(postBalance).to.equal(preBalance - amount);
            }else {
                console.log("balance is not enough")
            }
        });
    })
    describe("Approve and tranfer",function (){
        this.timeout(1200000);
        let preBalance,postBalance;

        before(async function () {
            await mint(accounts.Minter,100);
            await mint(accounts.To1,100);
        });

        it('Approve transfer: to1 to to2 in bank ', async () => {
            preBalance = await getTokenBalanceByAdmin(accounts.To1);
            await ReserveTokensAndTransferFrom(to1Wallet,spender1Wallet,accounts.To1,accounts.To2,1,to1Meta)
            postBalance = await getTokenBalanceByAdmin(accounts.To1);
            expect(postBalance).to.equal(preBalance - 1);
        });
        it('Approve transfer: to1 to user cross bank ', async () => {
            preBalance = await getTokenBalanceByAdmin(accounts.To1);
            await ReserveTokensAndTransferFrom(to1Wallet,spender1Wallet,accounts.To1,userInNode1,1,to1Meta)
            postBalance = await getTokenBalanceByAdmin(accounts.To1);
            expect(postBalance).to.equal(preBalance - 1);
        });

    })
    describe("Approve and revoke", function () {
        this.timeout(1200000);
        let preBalance,postBalance;
        before(async function () {
            await mint(accounts.Minter,100);
            await mint(accounts.To1,100);
        });
        beforeEach(async function () {
            preBalance = await getTokenBalanceByAdmin(accounts.Minter);
        });
        it('Approve and revoke: minter to to1 ', async () => {
            // const amount = await getTokenBalanceByAdmin(accounts.Minter);
            const amount = 1
            let response = await generateApprove(minterWallet,accounts.Minter,accounts.To1,amount,minterMeta)
            let approvedToken = await getApprovedAllowance(config.contracts.PrivateERCToken,spender1Wallet,accounts.Minter)
            await revoke(minterWallet,response)
            approvedToken = await getApprovedAllowance(config.contracts.PrivateERCToken,spender1Wallet,accounts.Minter)
            expect(approvedToken).to.equal('0x0');
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            expect(postBalance).to.equal(preBalance);
        });
        it('Approve and revoke: to1 to user cross bank ', async () => {
            // const preBalance = await getTokenBalanceByAdmin(accounts.To1);

            const amount = await getTokenBalanceByAdmin(accounts.To1);
            console.log("amount 1:", amount)
            let response = await generateApprove(to1Wallet,accounts.To1,userInNode1,1,to1Meta)
            let approvedToken = await getApprovedAllowance(config.contracts.PrivateERCToken,spender1Wallet,accounts.To1)
            await getTokenBalanceByAdmin(accounts.To1);
            await revoke(to1Wallet,response)
            approvedToken = await getApprovedAllowance(config.contracts.PrivateERCToken,spender1Wallet,accounts.To1)
            expect(approvedToken).to.equal('0x0');
            await getTokenBalanceByAdmin(accounts.To1);

        });
    })
    describe("Split and burn", function () {
        this.timeout(1200000);

        beforeEach(async function () {
            preBalance = await getTokenBalanceByAdmin(accounts.Minter);
        });
        it('minter burn 10', async () => {
            await DirectMint(accounts.Minter,20);
            preBalance = await getTokenBalanceByAdmin(accounts.Minter);
            console.log("minter balance:",preBalance)
            await ReserveTokensAndBurn(amount);
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            expect(postBalance).to.equal(preBalance - amount);

        });
    });
    describe('Full token life: directMint ,directTranfer, directBurn', function () {
        this.timeout(1200000);
        const userAddress = userInNode1;
        let preBalanceMinter,preBalanceTo1,preBalanceTo2,preBalanceUser
        before(async function () {
            preBalanceMinter = await getTokenBalanceByAdmin(accounts.Minter);
            preBalanceTo1 = await getTokenBalanceByAdmin(accounts.To1);
            preBalanceTo2 = await getTokenBalanceByAdmin(accounts.To2);
            preBalanceUser = await getTokenBalanceInNode1(userAddress)
        });
        it('Step1: mint 100 to minter ', async () => {
            await DirectMint(accounts.Minter, 100);
        });
        it('Step2: transfer 30 to recevier1 in node ', async () => {
            await DirectTransfer(accounts.Minter, accounts.To1, 30,minterMeta);
        });
        it('Step3: transfer 10 to recevier2 in node ', async () => {
            await DirectTransfer(accounts.Minter, accounts.To2, 10,minterMeta);
        });
        it('Step4: transfer 10 to user cross node ', async () => {
            await DirectTransfer(accounts.Minter, userAddress, 10,minterMeta);
        });
        it('Step5: transfer 10 from to1 to to2 in node ', async () => {
            await DirectTransfer(accounts.To1, accounts.To2, 10,to1Meta);
        });
        it('Step6: transfer 10 from to1 to user cross node ', async () => {
            await DirectTransfer(accounts.To1, userAddress, 10,to1Meta);
        });
        it('Step7: minter burn 10 ', async () => {
            await DirectBurn(accounts.Minter, 10,minterMeta);
        });
        it('Step8: to1 burn 100 ', async () => {
            await DirectBurn(accounts.To1, 10,to1Meta);
        });
        it('Step9: check balance ', async () => {
            const postBalanceMinter = await getTokenBalanceByAdmin(accounts.Minter);
            const postBalanceTo1 = await getTokenBalanceByAdmin(accounts.To1);
            const postBalanceTo2 = await getTokenBalanceByAdmin(accounts.To2);
            const postBalanceUser = await getTokenBalanceInNode1(userAddress);
            expect(postBalanceMinter).to.equal(preBalanceMinter + 40);
            expect(postBalanceTo1).to.equal(preBalanceTo1);
            expect(postBalanceTo2).to.equal(preBalanceTo2 + 20);
            expect(postBalanceUser).to.equal(preBalanceUser + 20);
        });

    });
    describe('Cancel splitToken', function () {
        this.timeout(1200000);
        it('split token list ',async () => {
            await DirectMint(accounts.Minter, 50);
            await TransferSplitProof(accounts.To1,10,minterMeta);
            await BurnSplitProof(20);
            // console.log(await getSplitTokenList(client,accounts.Minter,config.contracts.PrivateERCToken))
            // console.log(await getSplitTokenList(client,accounts.Minter,config.contracts.PrivateERCToken,minterMeta))
            await sleep(3000)
            let splitTokens = await getSplitTokenList(client,accounts.Minter,config.contracts.PrivateERCToken,minterMeta)
            expect(splitTokens.split_tokens.length).not.to.equal(0);
        });
        it('cancle split tokens',async () => {
            await cancelAllSplitTokens(minterWallet,config.contracts.PrivateERCToken)
        });
    });
    describe("convert USDC and pUSDC",function (){
        this.timeout(1200000);
        let prePublicBalance,postPublicBalance;
        let prePrivateBalance,postPrivateBalance;
        before(async function (){
            await DirectMint(accounts.Minter,100);
            await DirectMint(accounts.To1,100);
        })
        it('Convert2USDC: convert from pUSDC to USDC for minter',async () => {
            const amount = 10;
            prePrivateBalance = await getTokenBalanceByAdmin(accounts.Minter);
            prePublicBalance = await getPublicBalance(accounts.Minter);
            console.log({prePublicBalance,prePrivateBalance})
            //split token
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: accounts.Minter,
                amount: amount,
                comment: 'convert'
            };
            let response = await client.generateSplitToken(splitRequest,minterMeta);
            console.log("Generate transfer Proof response:", response);
            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
            const tokenId = '0x'+response.transfer_token_id;
            const convertToPUSDCResponse = {
                token_id: response.transfer_token_id
            };
            let proofResult = await client.convertToUSDC(convertToPUSDCResponse, minterMeta);
            console.log("Generate convert Proof response:", proofResult);
            const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, minterWallet);
            const proof = proofResult.proof.map(p => ethers.toBigInt(p));
            const input = proofResult.input.map(i => ethers.toBigInt(i));
            let tx = await contract.convert2USDC(tokenId,proofResult.amount,input,proof);
            await tx.wait();

            postPrivateBalance = await getTokenBalanceByAdmin(accounts.Minter);
            postPublicBalance = await getPublicBalance(accounts.Minter);
            console.log({postPublicBalance,postPrivateBalance})
            expect(postPrivateBalance).to.equal(prePrivateBalance-amount);
            expect(postPublicBalance).to.equal(prePublicBalance+amount);

        });
        it('Convert2USDC: convert from pUSDC to USDC for user',async () => {
            const userAddress = accounts.To1;
            const userMeta = to1Meta
            const userWallet = to1Wallet
            const amount = 10;
            prePrivateBalance = await getTokenBalanceByAdmin(userAddress);
            prePublicBalance = await getPublicBalance(userAddress);
            console.log({prePublicBalance,prePrivateBalance})
            //split token
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: userAddress,
                to_address: userAddress,
                amount: amount,
                comment: 'convert'
            };
            let response = await client.generateSplitToken(splitRequest,userMeta);
            console.log("Generate transfer Proof response:", response);
            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,userMeta)
            const tokenId = '0x'+response.transfer_token_id;
            const convertToPUSDCResponse = {
                token_id: response.transfer_token_id
            };
            let proofResult = await client.convertToUSDC(convertToPUSDCResponse, userMeta);
            console.log("Generate convert Proof response:", proofResult);
            const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, userWallet);
            const proof = proofResult.proof.map(p => ethers.toBigInt(p));
            const input = proofResult.input.map(i => ethers.toBigInt(i));
            let tx = await contract.convert2USDC(tokenId,proofResult.amount,input,proof);
            await tx.wait();
            postPrivateBalance = await getTokenBalanceByAdmin(userAddress);
            postPublicBalance = await getPublicBalance(userAddress);
            console.log({postPublicBalance,postPrivateBalance})
            expect(postPrivateBalance).to.equal(prePrivateBalance-amount);
            expect(postPublicBalance).to.equal(prePublicBalance+amount);

        });
        it('Convert2pUDSC: convert from USDC to pUSDC for minter',async () => {
            prePublicBalance = await getPublicBalance(accounts.Minter);
            prePrivateBalance = await getTokenBalanceByAdmin(accounts.Minter);
            console.log({prePublicBalance,prePrivateBalance})
            const amount = 10;
            const metadata = await createAuthMetadata(accounts.MinterKey);
            const convertToPUSDCResponse = {
                amount: amount
            };
            let proofResult = await client.convertToPUSDC(convertToPUSDCResponse, metadata);
            console.log("Generate convert Proof response:", proofResult);
            // console.log("Generate Mint Proof response:", proofResult);
            const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, minterWallet);
            const elAmount = {
                cl_x: ethers.toBigInt(proofResult.elgamal.cl_x),
                cl_y: ethers.toBigInt(proofResult.elgamal.cl_y),
                cr_x: ethers.toBigInt(proofResult.elgamal.cr_x),
                cr_y: ethers.toBigInt(proofResult.elgamal.cr_y)
            };
            const proof = proofResult.proof.map(p => ethers.toBigInt(p));
            const input = proofResult.input.map(i => ethers.toBigInt(i));
            const tx = await contract.convert2pUSDC(amount,elAmount,input,proof);
            let receipt = await tx.wait();
            expect(receipt.status).to.equal(1);

            postPublicBalance = await getPublicBalance(accounts.Minter);
            postPrivateBalance = await getTokenBalanceByAdmin(accounts.Minter);
            console.log({postPublicBalance,postPrivateBalance})
            expect(postPublicBalance).to.equal(prePublicBalance-amount);
            expect(postPrivateBalance).to.equal(prePrivateBalance+amount);

        });
        it('Convert2pUDSC: convert from USDC to pUSDC for user',async () => {
            const userAddress = accounts.To1;
            const userMeta = to1Meta
            const userWallet = to1Wallet
            prePublicBalance = await getPublicBalance(userAddress);
            prePrivateBalance = await getTokenBalanceByAdmin(userAddress);
            console.log({prePublicBalance,prePrivateBalance})
            const amount = 10;
            const convertToPUSDCResponse = {
                amount: amount
            };
            let proofResult = await client.convertToPUSDC(convertToPUSDCResponse, userMeta);
            console.log("Generate convert Proof response:", proofResult);
            // console.log("Generate Mint Proof response:", proofResult);
            const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, userWallet);
            const elAmount = {
                cl_x: ethers.toBigInt(proofResult.elgamal.cl_x),
                cl_y: ethers.toBigInt(proofResult.elgamal.cl_y),
                cr_x: ethers.toBigInt(proofResult.elgamal.cr_x),
                cr_y: ethers.toBigInt(proofResult.elgamal.cr_y)
            };
            const proof = proofResult.proof.map(p => ethers.toBigInt(p));
            const input = proofResult.input.map(i => ethers.toBigInt(i));
            const tx = await contract.convert2pUSDC(amount,elAmount,input,proof);
            let receipt = await tx.wait();
            expect(receipt.status).to.equal(1);

            postPublicBalance = await getPublicBalance(userAddress);
            postPrivateBalance = await getTokenBalanceByAdmin(userAddress);
            console.log({postPublicBalance,postPrivateBalance})
            expect(postPublicBalance).to.equal(prePublicBalance-amount);
            expect(postPrivateBalance).to.equal(prePrivateBalance+amount);
        });
    })
});
describe("Permission and BlackList", function () {
    this.timeout(1200000);
    const normal = ethers.Wallet.createRandom();
    const newMinter = ethers.Wallet.createRandom();
    const newAdmin = ethers.Wallet.createRandom();
    const normalWallet = new ethers.Wallet(normal.privateKey, l1Provider);
    const newMinterWallet = new ethers.Wallet(newMinter.privateKey, l1Provider);
    const newAdminWallet = new ethers.Wallet(newAdmin.privateKey, l1Provider);
    const minterPrivateKey = minterWallet.privateKey
    const normalPrivateKey = normalWallet.privateKey

    let adminMeta,minterMeta,spenderMeta,to1Meta,node4AdminMeta,normalMeta,newMinterMeta,newAdminMeta;

    before(async function () {
        adminMeta = await createAuthMetadata(adminPrivateKey)
        minterMeta = await createAuthMetadata(accounts.MinterKey)
        spenderMeta = await createAuthMetadata(accounts.Spender1Key)
        to1Meta = await createAuthMetadata(accounts.To1PrivateKey);
        node4AdminMeta = await createAuthMetadata(node4AdminPrivateKey);

        normalMeta = await createAuthMetadata(normalPrivateKey)
        newMinterMeta = await createAuthMetadata(newMinterWallet.privateKey)
        newAdminMeta = await createAuthMetadata(newAdminWallet.privateKey)
    })

    describe("Registe and set allowed",function (){
        this.timeout(1200000);
        it('Registe user with exist admin auth', async () => {
            await registerUser(adminPrivateKey,client, normalWallet.address, "normal");
            await sleep(10000);
            let response = await getAccount(adminPrivateKey,client, normalWallet.address);
            console.log("normal account: ",response)
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("normal");

            await registerUser(adminPrivateKey,client, newAdminWallet.address, "admin,minter");
            await sleep(10000);
            response = await getAccount(adminPrivateKey,client, newAdminWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("admin,minter");

            await registerUser(adminPrivateKey,client, newMinterWallet.address, "minter");
            await sleep(15000);
            response = await getAccount(adminPrivateKey,client, newMinterWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("minter");
            await getUserManager(newMinterWallet.address)

        });
        it('Set allowed for new minter ',async () => {
            // await registerConfigureMinter(newMinterWallet.address)
            await allowBanksInTokenSmartContract(newMinterWallet.address)
            await setMinterAllowed(newMinterWallet.address)
            await sleep(5000);
        });
    })
    describe("Minter role permission", function () {
        this.timeout(1200000);
        it('Mint with new minter ',async () => {
            const response = await getAccount(adminPrivateKey,client, newMinterWallet.address);
            console.log(response)
            console.log("Balance 1 : ",await getTokenBalanceByAdmin(accounts.To1))
            await mintBy(accounts.To1, 10, newMinterWallet)
            console.log("Balance 3 : ",await getTokenBalanceByAdmin(accounts.To1))
        });
        it('Split transfer with new minter', async () => {
            await DirectMint(newMinterWallet.address,100);
            const preBalance = await getTokenBalanceByAdmin(newMinterWallet.address)
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: newMinterWallet.address,
                to_address: normalWallet.address,
                amount: 5,
                comment: 'transfer'
            };
            let response = await client.generateSplitToken(splitRequest,newMinterMeta);
            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,newMinterMeta)
            await callPrivateTransfer(newMinterWallet,config.contracts.PrivateERCToken,normalWallet.address,'0x'+response.transfer_token_id)
            await sleep(3000);
            const postBalance = await getTokenBalanceByAdmin(newMinterWallet.address)
            expect(preBalance-postBalance).equal(5)
        });
        it('Split burn with new minter ', async () => {
            const preBalance = await getTokenBalanceByAdmin(newMinterWallet.address)
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: newMinterWallet.address,
                amount: 5,
                comment: 'burn'
            };
            let response = await client.generateSplitToken(splitRequest,newMinterMeta);
            console.log("Generate burn Proof response:", response);
            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,newMinterMeta)
            await callPrivateBurn(config.contracts.PrivateERCToken,newMinterWallet,'0x'+response.transfer_token_id)
        });
        it('minter can check itself account ', async () => {
            let response = await getAccount(minterPrivateKey,client, minterWallet.address)
            expect(response).to.have.property('account_address', minterWallet.address.toLowerCase());
        });
        it('minter can not check others account', async () => {
            try {
                await getAccount(minterPrivateKey,client, normalWallet.address)
            }catch (error){
                expect(error.details).to.include('current user is not the owner of the resource');
            }

            try {
                await getAccount(minterPrivateKey,client, adminWallet.address)
            }catch (error){
                expect(error.details).to.include('current user is not the owner of the resource');
            }
        });
    })
    describe("Admin role permission", function () {
        this.timeout(1200000);
        it('Registe user with new admin auth ', async () => {
            const userWallet = ethers.Wallet.createRandom();
            const key = newAdminWallet.privateKey;
            await registerUser(key,client, userWallet.address, "normal");
            await sleep(10000);
            let response = await getAccount(key,client, userWallet.address);
            console.log("user account: ",response)
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("normal");
        });
        it('Update user status to inactive with admin auth', async () => {
            await updateAccountStatus(adminPrivateKey,client,normalWallet.address,0);
            await sleep(4000);
            let response = await getAccount(adminPrivateKey,client, normalWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_INACTIVE");

            await updateAccountStatus(adminPrivateKey,client,newMinterWallet.address,0);
            await sleep(4000);
            response = await getAccount(adminPrivateKey,client, newMinterWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_INACTIVE");
        });
        it('Update user status to active with admin auth', async () => {
            await updateAccountStatus(adminPrivateKey,client,normalWallet.address,2);
            await sleep(4000);
            let response = await getAccount(adminPrivateKey,client, normalWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");

            await updateAccountStatus(adminPrivateKey,client,newMinterWallet.address,2);
            await sleep(4000);
            response = await getAccount(adminPrivateKey,client, newMinterWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
        });
        it('Update user role: normal,minter,admin',async () => {
            // normal -> minter
            await updateAccountRole(adminPrivateKey,client,normalWallet.address,'minter')
            let response = await getAccount(adminPrivateKey,client, normalWallet.address);
            console.log( response)
            expect(response.account_roles).equal("minter");
            // minter -> admin,normal
            await updateAccountRole(adminPrivateKey,client,normalWallet.address,'admin,normal')
            response = await getAccount(adminPrivateKey,client, normalWallet.address);
            expect(response.account_roles).equal("admin,normal");
            // admin -> minter
            await updateAccountRole(adminPrivateKey,client,normalWallet.address,'admin')
            response = await getAccount(adminPrivateKey,client, normalWallet.address);
            expect(response.account_roles).equal("admin");
            //minter -> normal
            await updateAccountRole(adminPrivateKey,client,normalWallet.address,'normal')
            response = await getAccount(adminPrivateKey,client, normalWallet.address);
            expect(response.account_roles).equal("normal");
        });
        it('admin can check all role account ', async () => {
            let response = await getAccount(adminPrivateKey,client, adminWallet.address)
            expect(response).to.have.property('account_address', adminWallet.address.toLowerCase());

            response = await getAccount(adminPrivateKey,client,minterWallet.address )
            expect(response).to.have.property('account_address', minterWallet.address.toLowerCase());

            response = await getAccount(adminPrivateKey,client,normalWallet.address )
            expect(response).to.have.property('account_address', normalWallet.address.toLowerCase());

        });
    })
    describe("Normal role permission", function () {
        this.timeout(1200000)
        it('normal can check itself ', async () => {
            let response = await getAccount(normalPrivateKey,client, normalWallet.address)
            expect(response).to.have.property('account_address', normalWallet.address.toLowerCase());
        });
        it('normal can not check others', async () => {
            try {
                await getAccount(normalPrivateKey,client, minterWallet.address)
            }catch (error){
                expect(error.details).to.include('current user is not the owner of the resource');
            }

            try {
                await getAccount(normalPrivateKey,client, adminWallet.address)
            }catch (error){
                expect(error.details).to.include('current user is not the owner of the resource');
            }
        });
    })
    describe("BlackList",function (){
        it('New user not registed should not be able to mint to', async () => {
            const toAddress = ethers.Wallet.createRandom().address;
            try {
                await mint(toAddress, 100)
            } catch (error) {
                expect(error.details).to.equal("failed to get GrumpkinKey for to address")
            }
        });
        it('Should revert: Add user to blacklist without ownerWallet', async () => {
            let isBlackListed = await isBlackList(normalWallet.address);
            if (!isBlackListed) {
                console.log("user address is ", normalWallet.address);
                const noOnwerWallet = new ethers.Wallet('555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626786', l1Provider);
                const contract = await ethers.getContractAt("PrivateUSDC", config.contracts.PrivateERCToken,noOnwerWallet);
                await expect(contract.blacklist(normalWallet.address)).to.reverted
            }
        });
        it('Add normal user to blacklist ', async () => {
            let isBlackListed = await isBlackList(normalWallet.address);
            if (!isBlackListed) {
                console.log("user address is ", normalWallet.address);
                await addToBlackList(normalWallet.address);

                let retries = 5;
                while (retries > 0) {
                    await sleep(3000);
                    isBlackListed = await isBlackList(normalWallet.address);
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
        it('Should reverted: mint to blacklist address ', async () => {
            let isBlackListed = await isBlackList(normalWallet.address);
            console.log("isBlackListed", isBlackListed)
            if(isBlackListed){
                // mint to blacklist user
                const generateRequest = {
                    from_address: accounts.Minter,
                    sc_address: config.contracts.PrivateERCToken,
                    token_type: '0',
                    to_address: normalWallet.address,
                    amount: amount
                };
                const response = await client.generateMintProof(generateRequest,minterMeta);
                await expect(callPrivateMint(config.contracts.PrivateERCToken, response, minterWallet)).to.be.revertedWith("Blacklistable: account is blacklisted");
            }else {
                console.log("user is not in blacklist")
            }

        });
        it('Should reverted: remove user from blacklist with noOwnerWallet ', async () => {
            let isBlackListed = await isBlackList(normalWallet.address);
            console.log("isBlackListed", isBlackListed)
            if (isBlackListed) {
                console.log("user address is ", normalWallet.address);
                const onwerWallet = new ethers.Wallet('555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626786', l1Provider);
                const contract = await ethers.getContractAt("PrivateUSDC", config.contracts.PrivateERCToken,onwerWallet);
                await expect(contract.unBlacklist(normalWallet.address)).to.reverted
            } else {
                console.log("user is already out of blacklist");
            }
        });
        it('Remove user from blacklist ', async () => {
            let isBlackListed = await isBlackList(normalWallet.address);
            console.log("isBlackListed", isBlackListed)
            if (isBlackListed) {
                console.log("user address is ", normalWallet.address);
                await removeFromBlackList(normalWallet.address);

                let retries = 5;
                while (retries > 0) {
                    await sleep(3000);
                    isBlackListed = await isBlackList(normalWallet.address);
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
        it('Operation for address removed from blackList ', async () => {
            const preBalance = await getTokenBalanceByAdmin(normalWallet.address);

            await mint(normalWallet.address, 100);
            let postBalance = await getTokenBalanceByAdmin(normalWallet.address);
            console.log("new user balance is ", postBalance)
            expect(postBalance).to.equal(preBalance + 100);

            await mint(accounts.Minter, 100)
            await ReserveTokensAndTransfer(normalWallet.address, 100,minterMeta);
            postBalance = await getTokenBalanceByAdmin(normalWallet.address);
            console.log("new user balance is after transferIn", postBalance)
            expect(postBalance).to.equal(preBalance + 200);

        });
        it('Add new minter to blackList ',async () => {
            // await DirectMint(newMinter.address, 30);
            let isBlackListed = await isBlackList(newMinter.address);
            if (!isBlackListed) {
                await addToBlackList(newMinter.address);
                let retries = 5;
                while (retries > 0) {
                    await sleep(3000);
                    isBlackListed = await isBlackList(newMinter.address);
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
        it('Should reverted: mint with minter in blackList ', async () => {
            let isBlackListed = await isBlackList(newMinter.address);
            console.log("isBlackListed", isBlackListed)
            if(isBlackListed){
                // mint to blacklist user
                const generateRequest = {
                    from_address: accounts.Minter,
                    sc_address: config.contracts.PrivateERCToken,
                    token_type: '0',
                    to_address: normalWallet.address,
                    amount: amount
                };
                const response = await client.generateMintProof(generateRequest,newMinterMeta);
                await expect(callPrivateMint(config.contracts.PrivateERCToken, response, newMinterWallet)).to.be.revertedWith("Blacklistable: account is blacklisted");
            }else {
                console.log("user is not in blacklist")
            }

        });
        it('Remove minter from blacklist and mint ',async () => {
            let isBlackListed = await isBlackList(newMinter.address);
            console.log("isBlackListed", isBlackListed)
            if (isBlackListed) {
                console.log("user address is ", newMinter.address);
                await removeFromBlackList(newMinter.address);

                let retries = 5;
                while (retries > 0) {
                    await sleep(3000);
                    isBlackListed = await isBlackList(newMinter.address);
                    if (!isBlackListed) {
                        break;
                    }
                    retries--;
                }

                console.log("isBlackListed", isBlackListed);
                await getEvents("UnBlacklisted");
                expect(isBlackListed).to.equal(false);
                console.log("Remove minter from blacklist success");

                const preBalance = await getTokenBalanceByAdmin(accounts.To1);
                await mintBy(accounts.To1, amount,newMinterWallet)
                const postBalance = await getTokenBalanceByAdmin(accounts.To1);
                expect(postBalance).to.equal(preBalance + amount);
            } else {
                console.log("user is already out of blacklist");
            }
        });
    });
});



