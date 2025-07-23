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
    getSplitTokenList,
    getAddressBalance2,
    callPrivateTransferFrom,
    callPrivateRevoke,
    getApprovedAllowance,
    allowBanksInTokenSmartContract,
    setMinterAllowed,
    registerConfigureMinter,
    getUserManager
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
        amount: amount
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
        amount: amount
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
        amount: amount
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
        amount: amount
    };
    console.log("generateSplitTokenRequest:", splitRequest)
    try {
        let response = await client.generateApproveProof(splitRequest,fromMetadata);
        console.log("Generate transfer Proof response:", response);
        await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,fromMetadata)
        let receipt = await callPrivateTransferFrom(spenderWallet,config.contracts.PrivateERCToken,fromAddress,toAddress,'0x'+response.transfer_token_id)
        await sleep(1000)
        console.log("receipt", receipt)
        return receipt
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
        amount: amount
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
            amount: amount
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
async function DirectTransfer(from,receiver,amount) {
    const minterMeta = await createAuthMetadata(accounts.MinterKey)
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: from,
        to_address : receiver,
        amount: amount
    };
    let response = await client.generateDirectTransfer(splitRequest,minterMeta);
    console.log("Generate transfer Proof response:", response);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
}
async function DirectBurn(address,amount) {
    const minterMeta = await createAuthMetadata(accounts.MinterKey)
    const splitRequest =
        {
            sc_address: config.contracts.PrivateERCToken,
            token_type: '0',
            from_address: address,
            amount: amount
        };

    let response = await client.generateDirectBurn(splitRequest,minterMeta);
    console.log("Generate transfer Proof response:", response);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
}
async function cancelAllSplitTokens(ownerWallet,scAddress){
    const metadata = await createAuthMetadata(adminPrivateKey)
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
    describe("Check address balance with role auth",function (){
        this.timeout(1200000);
        it('Admin role check balance: minter and normal',async () => {
            // admin role can check all user balance
            console.log(await getTokenBalanceByAdmin(accounts.Minter));
            console.log(await getTokenBalanceByAdmin(accounts.To1));

        });
        it('Minter role check balance',async () => {
            console.log(await getTokenBalanceByAuth(client,accounts.Minter,minterMeta));

            try {
                await getTokenBalanceByAuth(client,accounts.To1,minterMeta)
            }catch (error){
                expect(error.details).to.include("failed to get current account for address");
            }

        });
        it('normal role check balance',async () => {
            await getTokenBalanceByAuth(client,accounts.To1,to1Meta)
            try {
                await getTokenBalanceByAuth(client,accounts.Minter,to1Meta)
            }catch (error){
                expect(error.details).to.include("failed to get current account for address");
            }

        });

        it("Check address balance on other node", async function () {
            console.log(await getTokenBalanceByAuth(client1,userInNode1,node4AdminMeta));
        })
    });
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
        it('Mint  10 to spender in node3',async () => {
            const preBalanceSpender = await getTokenBalanceByAdmin(accounts.Spender1);
            await mint(accounts.Spender1,amount);
            const postBalanceSpender = await getTokenBalanceByAdmin(accounts.Spender1);
            expect(postBalanceSpender).to.equal(preBalanceSpender + amount);
        });
        it('Mint  10 to user in node3',async () => {
            const userAddress = accounts.To1;
            const preBalanceUser = await getTokenBalanceByAdmin(userAddress);
            await mint(userAddress,amount);
            const postBalanceUser = await getTokenBalanceByAdmin(userAddress);
            expect(postBalanceUser).to.equal(preBalanceUser + amount);
        });
        it('Mint amount 10 with string format',async ()=>{
            await mint(recevier,amount.toString());
            postBalance = await getTokenBalanceByAdmin(recevier);
            expect(postBalance).to.equal(preBalance + amount);
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
        it('transfer to user1 inBank with 10 string format',async () => {
            preBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            await ReserveTokensAndTransfer(toAddress1,amount.toString(),minterMeta);
            postBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            console.log({preBalance,postBalance,preBalanceTo,postBalanceTo})
            expect(postBalance).to.equal(preBalance - amount);
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
        it('transfer all amount',async () => {
            // await cancelAllSplitTokens(minterWallet,config.contracts.PrivateERCToken);
            const amount = await getTokenBalanceByAdmin(accounts.Minter);
            console.log("minter amount:",amount)
            preBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            // await cancelAllSplitTokens(minterWallet,config.contracts.PrivateERCToken)
            await ReserveTokensAndTransfer(toAddress1,amount,minterMeta);
            postBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
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
            await mint(accounts.Minter,10);
            await mint(accounts.To1,10);
        });

        it('Approve transfer: minter to to1 ', async () => {
            preBalance = await getTokenBalanceByAdmin(accounts.To1);
            await ReserveTokensAndTransferFrom(minterWallet,spender1Wallet,accounts.Minter,accounts.To1,1,minterMeta)
            postBalance = await getTokenBalanceByAdmin(accounts.To1);
            expect(postBalance).to.equal(preBalance + 1);
        });
        it('Approve transfer: minter to user cross bank ', async () => {
            preBalance = await getTokenBalanceByAdmin(accounts.Minter);
            await ReserveTokensAndTransferFrom(minterWallet,spender1Wallet,accounts.Minter,userInNode1,1,minterMeta)
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            expect(postBalance).to.equal(preBalance - 1);
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
        it('Should fail: approve to1 to to2 in bank exceed amount ', async () => {
            preBalance = await getTokenBalanceByAdmin(accounts.To1);
            const amount = preBalance+ 1;
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.To1,
                spender_address : accounts.Spender1,
                to_address: accounts.To2,
                amount: amount
            };
            console.log("generateSplitTokenRequest:", splitRequest)
            let response = await client.generateApproveProof(splitRequest,to1Meta);
            console.log("generateApproveProof:", response)
            expect(response.status).to.equal("TOKEN_ACTION_STATUS_FAIL");
            postBalance = await getTokenBalanceByAdmin(accounts.To1);
            expect(postBalance).to.equal(preBalance);
        });

    })
    describe("Approve and revoke", function () {
        this.timeout(1200000);
        let preBalance,postBalance;

        before(async function () {
            await mint(accounts.Minter,10);
            await mint(accounts.To1,10);
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
            expect(approvedToken).to.equal('0');
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
            expect(approvedToken).to.equal('0');
            await getTokenBalanceByAdmin(accounts.To1);

        });

        it('Approve and revoke: to1 to user cross bank all amount', async () => {
            const preBalance = await getTokenBalanceByAdmin(accounts.To1);
            const amount = await getTokenBalanceByAdmin(accounts.To1);
            console.log("amount 2:", amount)
            // const amount = 10;
            let response = await generateApprove(to1Wallet,accounts.To1,userInNode1,amount,to1Meta)
            let approvedToken = await getApprovedAllowance(config.contracts.PrivateERCToken,spender1Wallet,accounts.To1)
            await revoke(to1Wallet,response)
            approvedToken = await getApprovedAllowance(config.contracts.PrivateERCToken,spender1Wallet,accounts.To1)
            expect(approvedToken).to.equal('0');
            const postBalance = await getTokenBalanceByAdmin(accounts.To1);
            expect(postBalance).to.equal(preBalance);
        });
    })
    describe("Split and burn", function () {
        this.timeout(1200000);

        beforeEach(async function () {
            preBalance = await getTokenBalanceByAdmin(accounts.Minter);
        });
        it('minter burn 10', async () => {
            await mint(accounts.Minter,20);
            preBalance = await getTokenBalanceByAdmin(accounts.Minter);
            await ReserveTokensAndBurn(amount);
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            expect(postBalance).to.equal(preBalance - amount);

        });
        it('burn amount 1', async () => {
            const amount = 1
            await ReserveTokensAndBurn(amount);
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            console.log(postBalance)
            expect(postBalance).to.equal(preBalance - amount);

        });
        it('burn with 10 string format', async () => {
            const amount = 10
            if (preBalance>=amount){
                await ReserveTokensAndBurn(amount.toString());
                postBalance = await getTokenBalanceByAdmin(accounts.Minter);
                expect(postBalance).to.equal(preBalance - amount);
                console.log("minter balance:",await getTokenBalanceByAdmin(accounts.Minter))
            }else {
                console.log("balance is not enough")
            }
        });
        it('burn all minter amount',async () => {
            const burn_amount = await getTokenBalanceByAdmin(accounts.Minter);
            await cancelAllSplitTokens(minterWallet,config.contracts.PrivateERCToken);
            await ReserveTokensAndBurn(burn_amount);
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            expect(postBalance).to.equal(preBalance - burn_amount);
        });
    });
    describe('Full token life: mint ,tranfer, burn', function () {
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
            await DirectTransfer(accounts.Minter, accounts.To1, 30);
        });
        it('Step3: transfer 10 to recevier2 in node ', async () => {
            await DirectTransfer(accounts.Minter, accounts.To2, 10);
        });
        it('Step4: transfer 10 to user cross node ', async () => {
            await DirectTransfer(accounts.Minter, userAddress, 10);
        });
        it('Step5: transfer 10 from to1 to to2 in node ', async () => {
            await DirectTransfer(accounts.To1, accounts.To2, 10);
        });
        it('Step6: transfer 10 from to1 to user cross node ', async () => {
            await DirectTransfer(accounts.To1, userAddress, 10);
        });
        it('Step7: minter burn 10 ', async () => {
            await DirectBurn(accounts.Minter, 10);
        });
        it('Step8: to1 burn 100 ', async () => {
            await DirectBurn(accounts.To1, 10);
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
    describe('Direct Mint', function () {
        this.timeout(1200000);
        it('DirectMint 10 to minter ',async () => {
            const recevier = accounts.Minter
            const preBalance = await getTokenBalanceByAdmin(recevier);
            console.log("minter balance is before mint", preBalance)
            await DirectMint(recevier, amount);
            let postBalance = await getTokenBalanceByAdmin(recevier);
            console.log("minter balance is after mint", postBalance)
            expect(postBalance).to.equal(preBalance + amount);
            console.log("minter balance:",await getTokenBalanceByAdmin(accounts.Minter))
        });
        it('DirectMint to user in bank ',async () => {
            const recevier = accounts.To1
            const preBalance = await getTokenBalanceByAdmin(recevier);
            await DirectMint(recevier, amount);
            let postBalance = await getTokenBalanceByAdmin(recevier);
            expect(postBalance).to.equal(preBalance + amount);
        });
        it('DirectMint to user in other bank, check recevier balance ',async () => {
            const recevier = userInNode1
            const preBalance = await getTokenBalanceInNode1(recevier);
            console.log("user balance is before mint", preBalance)
            await DirectMint(recevier, amount);
            let postBalance = await getTokenBalanceInNode1(recevier);
            console.log("user balance is after mint", postBalance)
            expect(postBalance).to.equal(preBalance + amount);
        });
    });
    describe('Direct Transfer', function () {
        this.timeout(1200000);
        before(async function () {
            await DirectMint(accounts.Minter, 20);
        });
        it('Transfer from minter to user in bank ',async () => {
            const sender = accounts.Minter;
            const recevier = accounts.To1;
            const preBalanceFrom = await getTokenBalanceByAdmin(sender);
            const preBalanceTo = await getTokenBalanceByAdmin(recevier);
            await DirectTransfer(sender,recevier, amount);
            const postBalanceFrom = await getTokenBalanceByAdmin(sender);
            const postBalanceTo = await getTokenBalanceByAdmin(recevier);
            expect(postBalanceFrom).to.equal(preBalanceFrom - amount);
            expect(postBalanceTo).to.equal(preBalanceTo + amount);
        });
        it('Transfer from minter to user in other bank ',async () => {
            const sender = accounts.Minter;
            const recevier = userInNode1;
            const preBalanceFrom = await getTokenBalanceByAdmin(sender);
            const preBalanceTo = await getTokenBalanceInNode1(recevier);
            await DirectTransfer(sender,recevier, amount);
            const postBalanceFrom = await getTokenBalanceByAdmin(sender);
            const postBalanceTo = await getTokenBalanceInNode1(recevier);
            expect(postBalanceFrom).to.equal(preBalanceFrom - amount);
            expect(postBalanceTo).to.equal(preBalanceTo + amount);
        });
        it('Transfer from userA to userB in bank ',async () => {
            const amount = 5;
            const sender = accounts.To1;
            const recevier = accounts.To2;
            await DirectMint(sender,amount);
            const preBalanceFrom = await getTokenBalanceByAdmin(sender);
            const preBalanceTo = await getTokenBalanceByAdmin(recevier);
            await DirectTransfer(sender,recevier, amount);
            const postBalanceFrom = await getTokenBalanceByAdmin(sender);
            const postBalanceTo = await getTokenBalanceByAdmin(recevier);
            expect(postBalanceFrom).to.equal(preBalanceFrom - amount);
            expect(postBalanceTo).to.equal(preBalanceTo + amount);
        });
        it('Transfer from userA to user  in other bank ',async () => {
            const amount = 5;
            const sender = accounts.To1;
            const recevier = userInNode1;
            const preBalanceFrom = await getTokenBalanceByAdmin(sender);
            const preBalanceTo = await getTokenBalanceInNode1(recevier);
            await DirectTransfer(sender,recevier, amount);
            const postBalanceFrom = await getTokenBalanceByAdmin(sender);
            const postBalanceTo = await getTokenBalanceInNode1(recevier);
            expect(postBalanceFrom).to.equal(preBalanceFrom - amount);
            expect(postBalanceTo).to.equal(preBalanceTo + amount);
        });
    });
    describe('Direct Burn', function () {
        this.timeout(1200000);
        before(async function () {
            await DirectMint(accounts.Minter, amount);
            await DirectMint(accounts.To1, amount);
            await DirectMint(userInNode1, amount);
        });
        it('DirectBurn 10 for minter ',async () => {
            const burner = accounts.Minter
            const preBalance = await getTokenBalanceByAdmin(burner);
            console.log("minter balance is before burn", preBalance)
            await DirectBurn(burner, amount);
            let postBalance = await getTokenBalanceByAdmin(burner);
            expect(postBalance).to.equal(preBalance - amount);
        });
        it('DirectBurn 10 for user',async () => {
            const burner = accounts.To1
            const preBalance = await getTokenBalanceByAdmin(burner);
            console.log("burner balance is before burn", preBalance)
            await DirectBurn(burner, amount);
            let postBalance = await getTokenBalanceByAdmin(burner);
            expect(postBalance).to.equal(preBalance - amount);
        });
        it('Try to DirectBurn 10 for user of other bank',async () => {
            const burner = userInNode1
            await DirectMint(burner, amount);
            const minterMeta = await createAuthMetadata(accounts.MinterKey)
            const splitRequest =
                {
                    sc_address: config.contracts.PrivateERCToken,
                    token_type: '0',
                    from_address: burner,
                    amount: amount
                };

            let response = await client.generateDirectBurn(splitRequest,minterMeta);
            console.log("Generate transfer Proof response:", response);
            expect(response.status).to.equal("TOKEN_ACTION_STATUS_FAIL");

        });})
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
        it('split token list after should be null ',async () => {
            let splitTokens = await getSplitTokenList(client,accounts.Minter,config.contracts.PrivateERCToken,minterMeta)
            console.log(splitTokens.split_tokens)
            expect(splitTokens.split_tokens.length).to.equal(0);
        });
        it('Try to cancel split tokens again',async () => {
            await DirectMint(accounts.Minter, 20);
            const metadata = await createAuthMetadata(adminPrivateKey)
            const ownerAddress = accounts.Minter;
            const result = await getSplitTokenList(client,ownerAddress,config.contracts.PrivateERCToken,metadata);
            const splitTokens = result.split_tokens;
            console.log("splitTokens: ", splitTokens)
            if (splitTokens.length > 0){
                for (let i = 0; i < splitTokens.length; i++) {
                    let splitToken = splitTokens[i];
                    console.log("cancel split token: ", splitToken.token_id)
                    // await callPrivateCancel(scAddress, ownerWallet, splitToken.token_id);
                    let receipt = await callPrivateCancel(config.contracts.PrivateERCToken, minterWallet, '0x'+splitToken.token_id)
                    console.log("receipt", receipt)
                    await sleep(3000);
                    await expect(callPrivateCancel(config.contracts.PrivateERCToken, minterWallet, '0x'+splitToken.token_id)).revertedWith("PrivateERCToken: token does not exist")
                }
            }
            await sleep(3000);
        });
    });
    describe("check contract totalSupply", function () {
        this.timeout(1200000);
        let totalSupplyPre,totalSupplyPost;
        before(async function () {
            await mint(accounts.Minter, amount);
            await mint(accounts.To1, amount);
        })

        it('check_contract_totalSupply', async () => {
            console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta));
            console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
        });
        it('totalSupply_add_after_mint ',async () => {
            totalSupplyPre = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta);
            await mint(accounts.Minter, amount);
            totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta);
            expect(totalSupplyPost).to.equal(totalSupplyPre + amount);
            console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta));
            console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
        });
        it('totalSupply_add_after_directMint ',async () => {
            totalSupplyPre = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta);
            await DirectMint(accounts.Minter, amount);
            totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta);
            expect(totalSupplyPost).to.equal(totalSupplyPre + amount);
            console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta));
            console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
        });
        it('totalSupply_add_after_directMint_user ',async () => {
            totalSupplyPre = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta);
            await DirectMint(accounts.To1, amount);
            totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta);
            expect(totalSupplyPost).to.equal(totalSupplyPre + amount);
            console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta));
            console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
        });
        it('totalSupply_add_after_directMint_user_other_bank ',async () => {
            totalSupplyPre = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta);
            await DirectMint(userInNode1, amount);
            totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta);
            expect(totalSupplyPost).to.equal(totalSupplyPre + amount);
            console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta));
            console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
        });
        it('totalSupply_sub_after_burn ',async () => {
            totalSupplyPre  = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta);
            await ReserveTokensAndBurn(amount);
            totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta);
            console.log({totalSupplyPost,totalSupplyPre})
            expect(totalSupplyPost).to.equal(totalSupplyPre - amount);
            console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta));
            console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
        });
        it('totalSupply_sub_after_directBurn ',async () => {
            await DirectMint(accounts.To1, amount);
            totalSupplyPre  = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta);
            await DirectBurn(accounts.To1,amount);
            totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta);
            expect(totalSupplyPost).to.equal(totalSupplyPre - amount);
            console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta));
            console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
        });
        it('totalSupply_keep_same_after_transfer',async () => {
            totalSupplyPre = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta);
            console.log("totalSupplyPre: ",totalSupplyPre)
            const minterBalance = await getTokenBalanceByAdmin(accounts.Minter);
            if(minterBalance>=100){
                await ReserveTokensAndTransfer(toAddress1,amount,minterMeta);
                totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta);
                console.log("totalSupplyPost: ",totalSupplyPost)
                expect(totalSupplyPost).to.equal(totalSupplyPre);
            }
            console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta));
            console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
        });
        it('totalSupply_keep_same_after_directTransfer',async () => {

            totalSupplyPre = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta);
            console.log("totalSupplyPre: ",totalSupplyPre)
            const minterBalance = await getTokenBalanceByAdmin(accounts.Minter);
            if(minterBalance>=100){
                await DirectTransfer(accounts.Minter,accounts.To1,amount);
                totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta);
                console.log("totalSupplyPost: ",totalSupplyPost)
                expect(totalSupplyPost).to.equal(totalSupplyPre);
            }
            console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta));
            console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
        });
        it.skip('totalSupply_keep_same_after_directTransfer_otherBank',async () => {
            totalSupplyPre = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta);
            console.log("totalSupplyPre: ",totalSupplyPre)
            const minterBalance = await getTokenBalanceByAdmin(accounts.Minter);
            if(minterBalance>=amount){
                await DirectTransfer(accounts.Minter,userInNode4,amount);
                totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta);
                console.log("totalSupplyPost: ",totalSupplyPost)
                expect(totalSupplyPost).to.equal(totalSupplyPre);
            }
            console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta));
            console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
        });

        it('totalSupply_decrease_after_convert2USDC ',async () => {
            await DirectMint(accounts.Minter, 10);
            totalSupplyPre  = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta);
            console.log("totalSupplyPre: ",totalSupplyPre)
            const amount = 5;
            const prePrivateBalance = await getTokenBalanceByAdmin(accounts.Minter);
            const prePublicBalance = await getPublicBalance(accounts.Minter);
            console.log({prePublicBalance,prePrivateBalance})
            //split token
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: accounts.Minter,
                amount: amount
            };
            let response = await client.generateSplitToken(splitRequest,minterMeta);
            console.log("Generate transfer Proof response:", response);
            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
            const tokenId = '0x'+response.transfer_token_id;
            const convertToPUSDCResponse = {
                token_id: response.transfer_token_id
            };
            let proofResult = await client.convertToUSDC(convertToPUSDCResponse, minterMeta);
            const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, minterWallet);
            const proof = proofResult.proof.map(p => ethers.toBigInt(p));
            const input = proofResult.input.map(i => ethers.toBigInt(i));
            let tx = await contract.convert2USDC(tokenId,proofResult.amount,input,proof);
            await tx.wait();

            const postPrivateBalance = await getTokenBalanceByAdmin(accounts.Minter);
            const postPublicBalance = await getPublicBalance(accounts.Minter);
            console.log({postPublicBalance,postPrivateBalance})
            expect(postPrivateBalance).to.equal(prePrivateBalance-amount);
            expect(postPublicBalance).to.equal(prePublicBalance+amount);

            totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta);
            console.log({totalSupplyPost,totalSupplyPre})
            expect(totalSupplyPost).to.equal(totalSupplyPre - amount);
            console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta));
            console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
        });
        it('totalSupply_increase_after_convert2pUSDC ',async () => {
            totalSupplyPre = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta);
            console.log("totalSupplyPre: ",totalSupplyPre)
            const prePublicBalance = await getPublicBalance(accounts.Minter);
            const prePrivateBalance = await getTokenBalanceByAdmin(accounts.Minter);
            console.log({prePublicBalance,prePrivateBalance})
            const amount = 10;
            const metadata = await createAuthMetadata(accounts.MinterKey);
            const convertToPUSDCResponse = {
                amount: amount
            };
            let proofResult = await client.convertToPUSDC(convertToPUSDCResponse, metadata);
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

            const postPublicBalance = await getPublicBalance(accounts.Minter);
            const postPrivateBalance = await getTokenBalanceByAdmin(accounts.Minter);
            console.log({postPublicBalance,postPrivateBalance})
            expect(postPublicBalance).to.equal(prePublicBalance-amount);
            expect(postPrivateBalance).to.equal(prePrivateBalance+amount);


            totalSupplyPost = await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta);
            expect(totalSupplyPost).to.equal(totalSupplyPre + amount);
            console.log("contract totalSupply is ",await getTotalSupplyNode3(client, config.contracts.PrivateERCToken,adminMeta));
            console.log("contract publicTotalSupply is",await getPublicTotalSupply(config.contracts.PrivateERCToken));
        });

    });
    describe('Verify amount consistency ', function () {
        this.timeout(1200000);
        before(async () => {
            await DirectMint(accounts.Minter, 50);
            await DirectMint(accounts.To1, 50);
            await DirectMint(accounts.To2, 50);
        });

        it('verify amount consistency for minter',async () => {
            // await DirectMint(accounts.Minter, 500);
            console.log(await getTokenBalanceByAdmin(accounts.Minter))
            const balanceOnChain = await getTokenBalanceOnChain(accounts.Minter,adminMeta);
            console.log("balanceOnChain: ", balanceOnChain)
            const balanceOffChain = await getTokenBalanceByAdmin(accounts.Minter);
            console.log("balanceOffChain: ", balanceOffChain)
            expect(balanceOnChain).to.equal(balanceOffChain);
        });
        it('verify amount consistency for to1',async () => {
            // await DirectMint(accounts.Minter, 500);
            const balanceOnChain = await getTokenBalanceOnChain(accounts.To1,adminMeta);
            console.log("balanceOnChain: ", balanceOnChain)
            const balanceOffChain = await getTokenBalanceByAdmin(accounts.To1);
            console.log("balanceOffChain: ", balanceOffChain)
            expect(balanceOnChain).to.equal(balanceOffChain);
        });
        it('verify amount consistency for to2',async () => {
            // await DirectMint(accounts.Minter, 500);
            const balanceOnChain = await getTokenBalanceOnChain(accounts.To2,adminMeta);
            console.log("balanceOnChain: ", balanceOnChain)
            const balanceOffChain = await getTokenBalanceByAdmin(accounts.To2);
            console.log("balanceOffChain: ", balanceOffChain)
            expect(balanceOnChain).to.equal(balanceOffChain);
        });
    });
    describe.skip("check minter allowed balance", function () {
        this.timeout(1200000);
        let preAllowance,postAllowance;
        beforeEach(async function () {
            preAllowance = await getMinterAllowance(config.contracts.PrivateERCToken,minterWallet.address);
        });
        it('check minterAllowance ',async () => {
            console.log("minterAllowance: ",preAllowance);
        });

        it('MinterAllowance should decrease after mint', async () => {
            await mint(accounts.Minter, 100);
            postAllowance = await getMinterAllowance(config.contracts.PrivateERCToken,minterWallet.address);
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
            const accountBalance = await getTokenBalanceByAdmin(accounts.Minter);
            if(accountBalance>=100){
                await ReserveTokensAndTransfer(accounts.To1, 100);
                postAllowance = await getMinterAllowance();
                expect(postAllowance).to.equal(preAllowance);
            }else {
                console.log("Minter balance is not enough")
            }
        });
        it('MinterAllowance should keep same after transfer to other bank user', async () => {
            const accountBalance = await getTokenBalanceByAdmin(accounts.Minter);
            if(accountBalance>=100){
                await ReserveTokensAndTransfer(userInNode1, 100);
                postAllowance = await getMinterAllowance();
                expect(postAllowance).to.equal(preAllowance);
            }else {
                console.log("Minter balance is not enough")
            }
        });
        it('MinterAllowance should keep same after transfer user amount to other bank user', async () => {
            const accountBalance = await getTokenBalanceByAdmin(accounts.To1);
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
    describe("check gas used", function () {
        this.timeout(1200000);
        const MAX_GAS_LIMIT = 30000000;
        it('Check gas used during mint ',async () => {
            const receipt = await mint(accounts.Minter, 20);
            console.log(receipt)
            expect(receipt.gasUsed).to.be.lessThan(MAX_GAS_LIMIT)
        });
        it('Check gas used during transfer ',async () => {
            const amount = 10
            const toAddress = accounts.To1;
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: toAddress,
                amount: amount
            };
            let response = await client.generateSplitToken(splitRequest,minterMeta);
            console.log("Generate transfer Proof response:", response);
            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
            let receipt = await callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress,'0x'+response.transfer_token_id)
            expect(receipt.gasUsed).to.be.lessThan(MAX_GAS_LIMIT)
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
            let response = await client.generateSplitToken(splitRequest,minterMeta);
            console.log("Generate burn Proof response:", response);
            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
            let receipt = await callPrivateBurn(config.contracts.PrivateERCToken,minterWallet,'0x'+response.transfer_token_id)

            expect(receipt.gasUsed).to.be.lessThan(MAX_GAS_LIMIT)
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
            const amount = 50;
            prePrivateBalance = await getTokenBalanceByAdmin(accounts.Minter);
            prePublicBalance = await getPublicBalance(accounts.Minter);
            console.log({prePublicBalance,prePrivateBalance})
            //split token
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: accounts.Minter,
                amount: amount
            };
            let response = await client.generateSplitToken(splitRequest,minterMeta);
            console.log("Generate transfer Proof response:", response);
            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
            const tokenId = '0x'+response.transfer_token_id;
            const convertToPUSDCResponse = {
                token_id: response.transfer_token_id
            };
            let proofResult = await client.convertToUSDC(convertToPUSDCResponse, minterMeta);
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
            const amount = 50;
            prePrivateBalance = await getTokenBalanceByAdmin(userAddress);
            prePublicBalance = await getPublicBalance(userAddress);
            console.log({prePublicBalance,prePrivateBalance})
            //split token
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: userAddress,
                to_address: userAddress,
                amount: amount
            };
            let response = await client.generateSplitToken(splitRequest,userMeta);
            console.log("Generate transfer Proof response:", response);
            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,userMeta)
            const tokenId = '0x'+response.transfer_token_id;
            const convertToPUSDCResponse = {
                token_id: response.transfer_token_id
            };
            let proofResult = await client.convertToUSDC(convertToPUSDCResponse, userMeta);
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
describe("Boundary value cases",function (){
    this.timeout(1200000);
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    const INVALID_ADDRESS = "0x8c8af239FfB9A6e93AC4b434C71a135572A102";
    const MAX_UINT256 = ethers.MaxUint256;
    const MIN_UINT256 = ethers.MinInt256;

    let adminMeta,minterMeta,spenderMeta,to1Meta

    before(async function () {
        adminMeta = await createAuthMetadata(adminPrivateKey)
        minterMeta = await createAuthMetadata(accounts.MinterKey)
        spenderMeta = await createAuthMetadata(accounts.Spender1Key)
        to1Meta = await createAuthMetadata(accounts.To1PrivateKey);
    })

    describe("Check address balance",function (){
        it("Check address balance on node3 with ZERO_ADDRESS", async function () {
            expect(await getTokenBalanceByAdmin(ZERO_ADDRESS)).to.equal(0);
        })
    });

    describe("Mint with boundary values", function () {
        this.timeout(1200000);
        const recevier = accounts.Minter;
        beforeEach(async function () {
            preBalance = await getTokenBalanceByAdmin(recevier);
        });
        it('Should revert: Mint with amount 0',async () => {
            const amount = 0;
            try {
                await mint(recevier,amount);
            }catch (error){
                console.log("error:",error)
                expect(error.code).to.equal(2);
                expect(error.details).to.equal("invalid amount");
            }
        });
        it('Should revert: Mint with -1 amount',async () => {
            const amount = MIN_UINT256 - 1n;
            try {
                await mint(recevier,amount);
            }catch (error){
                console.log("error:",error)
                expect(error.details).to.equal("invalid amount");
            }
        });

        it('Should revert: Mint with MAX_UINT_256',async ()=>{
            try {
                const amount = MAX_UINT256;
                console.log("amount:", amount)
            }catch (error){
                expect(error.details).to.equal("invalid amount")
            }
        });
        it('Should revert: Mint with MAX_UINT_256 +1 ',async ()=>{
            try {
                const amount = MAX_UINT256 + 1n;
                await mint(recevier,amount);
            }catch (error){
                expect(error.details).to.equal("invalid amount")
            }
        });

        it('Should revert: Mint to ZERO_ADDRESS',async () => {
            try {
                await mint(ZERO_ADDRESS,amount);
            }catch (error){
                expect(error.details).to.equal("failed to get GrumpkinKey for to address")
            }
        });

        it('Should revert: Mint with invalid proof',async () => {
            const toAddress = accounts.To1;
            console.log(await getTokenBalanceByAdmin(toAddress))
            const generateRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                to_address: toAddress,
                amount: amount
            };
            console.log("generateMintRequest:", generateRequest)
            const response = await client.generateMintProof(generateRequest,minterMeta);
            console.log("Generate mint Proof response:", response.proof)
            let proofResult = response
            let proofTem = "1"+ proofResult.proof[0].slice(0,-1) ;
            proofResult.proof[0] = proofTem;
            console.log(proofResult.proof)
            await expect(callPrivateMint(config.contracts.PrivateERCToken, proofResult, minterWallet)).to.reverted

        });
        it('Should revert: Mint with amount larger than allowance',async ()=>{
            // const allowance = await getMinterAllowance()
            // const amount = allowance + 1
            const amount = 100000000;
            try {
                await mint(recevier,amount);
            }catch (error){
                expect(error.details).to.equal("allowedAmount is insufficient")
            }
        });
        it.skip('Should revert: Mint after allowance exhaustion',async ()=>{
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
    describe("Split with boundary values",  function (){
        this.timeout(1200000);
        let preBalanceTo,postBalanceTo;
        before(async function () {
            const mintAmount = amount * 13
            await mint(accounts.Minter,mintAmount);
            await mint(accounts.To1,10);
        });

        beforeEach(async function () {
            preBalance = await getTokenBalanceByAdmin(accounts.Minter);
        });
        it('Should Fail: split proof with amount 0',async () => {
            const amount = 0;
            let response = await TransferSplitProof(toAddress1,amount,minterMeta);
            console.log("response:", response)
            expect(response.status).equal("TOKEN_ACTION_STATUS_FAIL")

        });
        it('Should Fail: split with  amount -1',async () => {
            const amount = -1;
            let response = await TransferSplitProof(toAddress1,amount,minterMeta);
            expect(response.status).equal("TOKEN_ACTION_STATUS_FAIL")
        });

        it('Should Fail: split amount larger than sender balance',async ()=>{
            const amount = preBalance +1;
            let response = await TransferSplitProof(toAddress1,amount,minterMeta);
            expect(response.status).equal("TOKEN_ACTION_STATUS_FAIL")

        });
        it('Should revert: split amount with MAX_UINT256 amount',async () => {
            let response = await TransferSplitProof(toAddress1,MAX_UINT256,minterMeta);
            expect(response.status).equal("TOKEN_ACTION_STATUS_FAIL")
        });
        it('Should revert: split amount with MAX_UINT256+1 amount',async () => {
            const amount = MAX_UINT256 + 1n;
            let response = await TransferSplitProof(toAddress1,amount,minterMeta);
            expect(response.status).equal("TOKEN_ACTION_STATUS_FAIL")
        });
        it('Should revert: split to ZERO_ADDRESS',async () => {
            let response = await TransferSplitProof(ZERO_ADDRESS,amount,minterMeta);
            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
            await expect(callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,ZERO_ADDRESS,'0x'+response.transfer_token_id)).revertedWith("PrivateERCToken: to is the zero address")
        });

        it('transfer all amount',async () => {
            await cancelAllSplitTokens(minterWallet,config.contracts.PrivateERCToken);
            const amount = await getTokenBalanceByAdmin(accounts.Minter);
            console.log("minter amount:",amount)
            preBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            await cancelAllSplitTokens(minterWallet,config.contracts.PrivateERCToken)
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: toAddress1,
                amount: amount
            };
            console.log("generateSplitTokenRequest:", splitRequest)
            let response = await client.generateSplitToken(splitRequest,minterMeta);
            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
            await callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress1,'0x'+response.transfer_token_id)
            postBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            expect(postBalanceTo).equal(preBalanceTo + amount)
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            expect(postBalance).equal(0)
        });

    })

    describe("Approve with boundary values",function (){
        before(async function () {
            await DirectMint(accounts.To1,100)
        });
        it('Should revert: Approve with amount 0',async ()=>{
            const amount =0;
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.To1,
                spender_address : accounts.Spender1,
                to_address: accounts.To2,
                amount: amount
            };
            let response = await client.generateApproveProof(splitRequest,to1Meta);
            console.log("Generate transfer Proof response:", response);
            expect(response.status).equal("TOKEN_ACTION_STATUS_FAIL")
        });
        it('Should revert: Approve with amount larger than balance',async ()=>{
            const preBalance = await getTokenBalanceByAdmin(accounts.To1);
            const amount = preBalance + 1;
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.To1,
                spender_address : accounts.Spender1,
                to_address: accounts.To2,
                amount: amount
            };
            console.log("generateSplitTokenRequest:", splitRequest)
            let response = await client.generateApproveProof(splitRequest,to1Meta);
            expect(response.status).equal("TOKEN_ACTION_STATUS_FAIL")
        });
    })

    describe("Convert with boundary values",function (){
        this.timeout(1200000);
        let prePublicBalance,postPublicBalance;
        let prePrivateBalance,postPrivateBalance;

        before(async function () {
            // await DirectMint(accounts.Minter,100)
            // await DirectMint(accounts.To1,100)
        })

        it('convert from USDC to pUSDC with amount 0', async () => {
            prePublicBalance = await getPublicBalance(accounts.Minter)
            console.log("prePublicBalance:",prePublicBalance)
            const amount = 0;
            const convertToPUSDCResponse = {
                amount: amount
            };
            try {
                await client.convertToPUSDC(convertToPUSDCResponse, minterMeta);
            }catch (error){
                console.log(error)
                expect(error.details).equal("invalid amount")
            }
        });

        it('convert from USDC to pUSDC with amount larger than balance', async () => {
            prePublicBalance = await getPublicBalance(accounts.Minter)
            console.log("prePublicBalance:",prePublicBalance)
            const amount =prePublicBalance + 1 ;
            const convertToPUSDCResponse = {
                amount: amount
            };
            try {
                await client.convertToPUSDC(convertToPUSDCResponse, minterMeta);
            }catch (error){
                console.log(error)
                expect(error.details).equal("invalid amount")
            }



        });

        it('convert from USDC to pUSDC with amount -1', async () => {
            prePublicBalance = await getPublicBalance(accounts.Minter)
            console.log("prePublicBalance:",prePublicBalance)
            const amount =-1 ;

            const convertToPUSDCResponse = {
                amount: Number(amount)
            };

            try {
                await client.convertToPUSDC(convertToPUSDCResponse, minterMeta);
            }catch (error){
                console.log(error)
                expect(error.details).equal("invalid amount")
            }


        });

        it('convert from USDC to pUSDC with MAX_UINT_256', async () => {
            const amount = MAX_UINT256;
            const convertToPUSDCResponse = {
                amount: amount
            };
            try {
                await client.convertToPUSDC(convertToPUSDCResponse, minterMeta);
            }catch (error){
                console.log(error)
                expect(error.details).equal("invalid amount")
            }
        });

        it('convert from USDC to pUSDC with MAX_UINT_256+1', async () => {
            const amount = MAX_UINT256+1n;
            const convertToPUSDCResponse = {
                amount: amount
            };

            try {
                await client.convertToPUSDC(convertToPUSDCResponse, minterMeta);
            }catch (error){
                console.log(error)
                expect(error.details).equal("invalid amount")
            }

        });

        it('convert from USDC to pUSDC with all amount', async () => {
            prePublicBalance = await getPublicBalance(accounts.Minter);
            prePrivateBalance = await getTokenBalanceByAdmin(accounts.Minter);
            console.log({prePublicBalance,prePrivateBalance})
            const amount = prePublicBalance;
            const convertToPUSDCResponse = {
                amount: amount
            };
            let proofResult = await client.convertToPUSDC(convertToPUSDCResponse, minterMeta);
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
            const tx = await contract.convert2pUSDC(amount,elAmount,input,proof);
            let receipt = await tx.wait();
            expect(receipt.status).to.equal(1);

            postPublicBalance = await getPublicBalance(accounts.Minter);
            postPrivateBalance = await getTokenBalanceByAdmin(accounts.Minter);
            console.log({postPublicBalance,postPrivateBalance})
            expect(postPublicBalance).to.equal(prePublicBalance-amount);
            expect(postPrivateBalance).to.equal(prePrivateBalance+amount);

        });

        it('convert from pUSDC to USDC with all amount', async () => {
            await sleep(3000);
            await cancelAllSplitTokens(minterWallet,config.contracts.PrivateERCToken)

            prePrivateBalance = await getTokenBalanceByAdmin(accounts.Minter);
            prePublicBalance = await getPublicBalance(accounts.Minter);
            console.log({prePublicBalance,prePrivateBalance})
            const amount = prePrivateBalance;
            //split token
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: accounts.Minter,
                amount: amount
            };
            let response = await client.generateSplitToken(splitRequest,minterMeta);
            console.log("Generate transfer Proof response:", response);
            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
            const tokenId = '0x'+response.transfer_token_id;
            const convertToPUSDCResponse = {
                token_id: response.transfer_token_id
            };
            let proofResult = await client.convertToUSDC(convertToPUSDCResponse, minterMeta);
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

    })

})
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
        it.only('Registe user with exist admin auth', async () => {
            // await registerUser(adminPrivateKey,client, normalWallet.address, "normal");
            // await sleep(10000);
            // let response = await getAccount(adminPrivateKey,client, normalWallet.address);
            // console.log("normal account: ",response)
            // expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            // expect(response.account_roles).equal("normal");

            // await registerUser(adminPrivateKey,client, newAdminWallet.address, "admin,minter");
            // await sleep(10000);
            // response = await getAccount(adminPrivateKey,client, newAdminWallet.address);
            // expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            // expect(response.account_roles).equal("admin,minter");

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
            await getUserManager(newMinterWallet.address)
            // await setMinterAllowed(newMinterWallet.address)
            // await sleep(5000);
        });
        it('Repeat registration with different role ',async () => {
            const wallet = ethers.Wallet.createRandom();
            await registerUser(adminPrivateKey,client, wallet.address, "minter");
            // await registerUser(adminPrivateKey,client, accounts.Minter, "minter");
            await sleep(10000);
            let response = await getAccount(adminPrivateKey,client, wallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("minter");

            await registerUser(adminPrivateKey,client, wallet.address, "normal");
            await sleep(10000);
            response = await getAccount(adminPrivateKey,client, wallet.address);
            console.log(response);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("minter,normal");
        });
        it('Repeat registration with same role ',async () => {
            const wallet = ethers.Wallet.createRandom();
            await registerUser(adminPrivateKey,client, wallet.address, "minter");
            await sleep(10000);
            let response = await getAccount(adminPrivateKey,client, wallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("minter");

            await registerUser(adminPrivateKey,client, wallet.address, "minter");
            await sleep(10000);
            response = await getAccount(adminPrivateKey,client, wallet.address);
            console.log(response);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("minter");

            //Same role , different order
            await registerUser(adminPrivateKey,client, wallet.address, "minter,normal");
            await sleep(10000);
            response = await getAccount(adminPrivateKey,client, wallet.address);
            console.log(response);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("minter,normal");

            await registerUser(adminPrivateKey,client, wallet.address, "normal,minter");
            await sleep(10000);
            response = await getAccount(adminPrivateKey,client, wallet.address);
            console.log(response);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("minter,normal");
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
        it.skip('Split transfer with new minter ', async () => {
            const preBalance = await getTokenBalanceByAdmin(newMinterWallet.address)
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: newMinterWallet.address,
                to_address: normalWallet.address,
                amount: 5
            };
            let response = await client.generateSplitToken(splitRequest,newMinterMeta);
            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,newMinterMeta)
            await callPrivateTransfer(newMinterWallet,config.contracts.PrivateERCToken,normalWallet.address,'0x'+response.transfer_token_id)
            await sleep(3000);
            const postBalance = await getTokenBalanceByAdmin(newMinterWallet.address)
            expect(preBalance-postBalance).equal(5)
        });
        it('Should reverted: Split transfer proof and call with different minter ', async () => {
            await DirectMint(accounts.Minter,20);
            const preBalance = await getTokenBalanceByAdmin(accounts.Minter)
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: normalWallet.address,
                amount: 5
            };
            let response = await client.generateSplitToken(splitRequest,minterMeta);
            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
            await expect(callPrivateTransfer(newMinterWallet,config.contracts.PrivateERCToken,normalWallet.address,'0x'+response.transfer_token_id)).revertedWith("PrivateERCToken: tokenId is not matched")
        });
        it.skip('Split burn with new minter ', async () => {
            const preBalance = await getTokenBalanceByAdmin(newMinterWallet.address)
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: newMinterWallet.address,
                amount: 5
            };
            let response = await client.generateSplitToken(splitRequest,newMinterMeta);
            console.log("Generate burn Proof response:", response);
            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,newMinterMeta)
            await callPrivateBurn(config.contracts.PrivateERCToken,newMinterWallet,'0x'+response.transfer_token_id)
        });
        it('Should reverted: Split burn proof and call with different minter', async () => {
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                amount: 5
            };
            let response = await client.generateSplitToken(splitRequest,minterMeta);
            console.log("Generate burn Proof response:", response);
            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
            await expect(callPrivateBurn(config.contracts.PrivateERCToken,newMinterWallet,'0x'+response.transfer_token_id)).revertedWith("invalid token")
        });
        it('Should reverted: registe account with minter auth',async ()=>{
            const newUser = ethers.Wallet.createRandom()
            const request = {
                account_address: newUser.address,
                account_role: 'normal',//minter,admin,normal
            };
            expect( await client.registerAccount(request, newMinterMeta)).reverted

        })
        it('should reverted: update user status with minter auth', async () => {
            try {
                await updateAccountStatus(newMinterWallet.privateKey,client,normalWallet.address,2);
            }catch (err){
                expect(err.details).to.include('permission denied')
            }
        });
        it('Should reverted: update user role with minter auth ', async () => {
            try {
                await updateAccountRole(newMinterWallet.privateKey,client,normalWallet.address,'minter')
            }catch (error){
                expect(err.details).to.include('permission denied')
            }
        });
        it('Should reverted: Use minter address to check getAsyncAction',async ()=>{
            const adminMetadata = await createAuthMetadata(minterWallet.privateKey);
            const minterMetadata = await createAuthMetadata(normalWallet.privateKey);
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
                // expect(await client.getAsyncAction(actionRequest, normalMetadata)).reverted
                try {
                    await client.getAsyncAction(actionRequest, minterMetadata);
                }catch (err) {
                    expect(err.code).to.equal(7); // gRPC status code for PERMISSION_DENIED
                    expect(err.details).to.include('permission denied'); // 可以更精确匹配
                }
            }
        })
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
        it('Should reverted: update user role normal -> normal ', async () => {
            let response =  await updateAccountRole(minterPrivateKey,client,normalWallet.address,'normal')
            expect(response.status).to.equal("ASYNC_ACTION_STATUS_FAIL");
            expect(response. message).to.include(" account already has role");
        });
        it('admin can check all role account ', async () => {
            let response = await getAccount(adminPrivateKey,client, adminWallet.address)
            expect(response).to.have.property('account_address', adminWallet.address.toLowerCase());

            response = await getAccount(adminPrivateKey,client,minterWallet.address )
            expect(response).to.have.property('account_address', minterWallet.address.toLowerCase());

            response = await getAccount(adminPrivateKey,client,normalWallet.address )
            expect(response).to.have.property('account_address', normalWallet.address.toLowerCase());

        });
        it('generate mint proof with admin meta, call mint with minter wallet',async () => {
            console.log(await getTokenBalanceByAdmin(accounts.To1))
            const generateRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                to_address: accounts.To1,
                amount: 10
            };
            const response = await client.generateMintProof(generateRequest,newAdminMeta);
            console.log("generateMintProof:", response)
            const receipt = await callPrivateMint(config.contracts.PrivateERCToken, response, minterWallet)
            console.log("callPrivateMint:", receipt)
            let tx = await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,newAdminMeta)
            console.log("callPrivateMint:", tx)
            console.log(await getTokenBalanceByAdmin(accounts.To1))
        });

    })
    describe("Normal role permission", function () {
        this.timeout(1200000)
        it('Should reverted: Use normal auth to registe account',async ()=>{
            const normalMetadata = await createAuthMetadata(normalWallet.privateKey);
            const newUser = ethers.Wallet.createRandom()
            const request = {
                account_address: newUser.address,
                account_role: 'normal',//minter,admin,normal
            };
            expect( await client.registerAccount(request, normalMetadata)).reverted

        })
        it('should reverted: update user status with normal auth', async () => {
            try {
                await updateAccountStatus(normalPrivateKey,client,normalWallet.address,2);
            }catch (err){
                expect(err.details).to.include('permission denied')
            }
        });
        it('Should reverted: update user role with normal user auth ', async () => {
            try {
                await updateAccountRole(normalPrivateKey,client,normalWallet.address,'minter')
            }catch (error){
                expect(err.details).to.include('permission denied')
            }
        });
        it('Should reverted: Use normal address to check other getAsyncAction',async ()=>{
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
                // expect(await client.getAsyncAction(actionRequest, normalMetadata)).reverted
                try {
                    await client.getAsyncAction(actionRequest, normalMetadata);
                }catch (err) {
                    expect(err.code).to.equal(7); // gRPC status code for PERMISSION_DENIED
                    expect(err.details).to.include('current user is not the owner of the resource'); // 可以更精确匹配
                }
            }
        })
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
        it('Should reverted: mint proof with normal user auth', async () => {
            const generateRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                to_address: accounts.To1,
                amount: 10
            };
            try {
                await client.generateMintProof(generateRequest,normalMeta);
            }catch (error){
                expect(error.details).to.include('permission denied')
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
describe('Security cases', function () {
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
    describe("Registe new account",function (){
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
            await sleep(10000);
            response = await getAccount(adminPrivateKey,client, newMinterWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("minter");
        });
    })
    describe('Mint security', function () {
        this.timeout(1200000);
        it('Should revert: Mint with used proof',async () => {
            const toAddress = accounts.To1;
            console.log(await getTokenBalanceByAdmin(toAddress))
            const generateRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                to_address: toAddress,
                amount: amount
            };
            console.log("generateMintRequest:", generateRequest)
            const response = await client.generateMintProof(generateRequest,minterMeta);
            let receipt = await callPrivateMint(config.contracts.PrivateERCToken, response, minterWallet)
            await sleep(1000);
            console.log(await getTokenBalanceByAdmin(toAddress))
            await expect( callPrivateMint(config.contracts.PrivateERCToken, response, minterWallet)).revertedWith("initialMinterAllowance not match")

        });
        it('Should revert: Mint with invalid proof',async () => {
            const toAddress = accounts.To1;
            console.log(await getTokenBalanceByAdmin(toAddress))
            const generateRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                to_address: toAddress,
                amount: amount
            };
            console.log("generateMintRequest:", generateRequest)
            const response = await client.generateMintProof(generateRequest,minterMeta);
            console.log("Generate mint Proof response:", response.proof)
            let proofResult = response
            let proofTem = "1"+ proofResult.proof[0].slice(0,-1) ;
            proofResult.proof[0] = proofTem;
            console.log(proofResult.proof)
            await expect(callPrivateMint(config.contracts.PrivateERCToken, proofResult, minterWallet)).to.reverted
        });
    });
    describe('Transfer security', function () {
        this.timeout(1200000);
        it('Should revert: transfer with used tokenId',async () => {
            await DirectMint(accounts.Minter, 100)
            const amount = 10
            preBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            const toAddress = accounts.To1;
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: toAddress,
                amount: amount
            };
            let response = await client.generateSplitToken(splitRequest,minterMeta);
            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
            let receipt = await callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress,'0x'+response.transfer_token_id)
            await sleep(4000)
            postBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            expect(postBalanceTo).equal(preBalanceTo + amount)
            await expect(callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress,'0x'+response.transfer_token_id)).to.revertedWith("PrivateERCToken: tokenId is not matched")
        });
        it('Should revert: transfer with tokenId 0',async () => {
            const amount = 10
            preBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            const toAddress = accounts.To1;
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: toAddress,
                amount: amount
            };
            console.log("generateSplitTokenRequest:", splitRequest)
            let response = await client.generateSplitToken(splitRequest,minterMeta);
            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
            await expect(callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress,0)).to.revertedWith("PrivateERCToken: tokenId is zero")
        });
        it('Should revert: transfer to address not matched',async () => {
            const amount = 10
            preBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            const toAddress = accounts.To1;
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: toAddress,
                amount: amount
            };
            console.log("generateSplitTokenRequest:", splitRequest)
            let response = await client.generateSplitToken(splitRequest,minterMeta);
            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
            await expect(callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,accounts.To2,'0x'+response.transfer_token_id)).to.revertedWith("PrivateERCToken: tokenId is not matched")


        });
        it('Transfer two tokens consecutively',async () => {
            const amount = 10
            await DirectMint(accounts.Minter,100)
            const preBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            const preBalanceFrom = await getTokenBalanceByAdmin(accounts.Minter);
            const toAddress = accounts.To1;
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: toAddress,
                amount: amount
            };
            console.log("generateSplitTokenRequest:", splitRequest)
            let response1 = await client.generateSplitToken(splitRequest,minterMeta);
            let proofResult1 = await client.waitForActionCompletion(client.getTokenActionStatus, response1.request_id,minterMeta);

            let response2 = await client.generateSplitToken(splitRequest,minterMeta);
            let proofResult2 = await client.waitForActionCompletion(client.getTokenActionStatus, response2.request_id,minterMeta);

            if (proofResult1.status == "TOKEN_ACTION_STATUS_SUC"&& proofResult2.status == "TOKEN_ACTION_STATUS_SUC" ) {
                let tokenId1 = '0x'+response1.transfer_token_id
                let tokenId2 = '0x'+response2.transfer_token_id
                await callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress,tokenId1)
                await sleep(1000);
                await callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress,tokenId2)
                await sleep(1000);
                const postBalanceTo = await getTokenBalanceByAdmin(toAddress1);
                const postBalanceFrom = await getTokenBalanceByAdmin(accounts.Minter);
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
            let response = await client.generateSplitToken(splitRequest,minterMeta);
            let tokenResult = await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta);
            if (tokenResult.status == "TOKEN_ACTION_STATUS_SUC") {
                const tokenId = '0x'+response.transfer_token_id
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
            let response = await client.generateSplitToken(splitRequest,minterMeta);
            let tokenResult = await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta);
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
            let response = await client.generateSplitToken(splitRequest,minterMeta);
            let tokenResult = await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta);
            if (tokenResult.status == "TOKEN_ACTION_STATUS_SUC") {
                const tokenId = '0x'+response.transfer_token_id
                await callPrivateBurn(config.contracts.PrivateERCToken, minterWallet, tokenId)
                await sleep(4000);
                await expect(callPrivateBurn(config.contracts.PrivateERCToken, minterWallet, tokenId)).to.reverted
            }
        });
        it.skip('Should revert: burn with transfer token id',async () => {
            const amount = 10
            const toAddress = accounts.To1;
            console.log(await getTokenBalanceByAdmin(toAddress))
            console.log(await getTokenBalanceByAdmin(accounts.Minter))
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: toAddress,
                amount: amount
            };
            let response = await client.generateSplitToken(splitRequest,minterMeta);
            let tokenResult = await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta);
            if (tokenResult.status == "TOKEN_ACTION_STATUS_SUC") {
                const tokenId = '0x'+response.transfer_token_id
                await sleep(4000);
                console.log(await getTokenBalanceByAdmin(toAddress))
                console.log(await getTokenBalanceByAdmin(accounts.Minter))
                await expect(callPrivateBurn(config.contracts.PrivateERCToken, minterWallet, tokenId)).to.reverted
            }
        });
    });
    describe('Approve security', function () {
        this.timeout(12000000)

        before(async function () {
            await DirectMint(accounts.To1,50);
        })
        it('Should fail: generate approve proof with other meta', async () => {
            const preBalance = await getTokenBalanceByAdmin(accounts.To2);
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.To1,
                spender_address : accounts.Spender1,
                to_address: accounts.To2,
                amount: 10
            };
            console.log("generateSplitTokenRequest:", splitRequest)
            // console.log("minter address: ",newMinter.address)
            // let response = await client.generateApproveProof(splitRequest,newMinterMeta);
            let response = await client.generateApproveProof(splitRequest,minterMeta);
            console.log("Generate transfer Proof response:", response);
            expect(response.status).equal("TOKEN_ACTION_STATUS_FAIL")
        });
        it('Should fail: generate approve proof with adminMeta,not fromMeta', async () => {
            const preBalance = await getTokenBalanceByAdmin(accounts.To2);
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                spender_address : accounts.Spender1,
                to_address: accounts.To1,
                amount: 10
            };
            console.log("generateSplitTokenRequest:", splitRequest)
            let response = await client.generateApproveProof(splitRequest,newAdminMeta);
            console.log("Generate transfer Proof response:", response);
            expect(response.status).equal("TOKEN_ACTION_STATUS_FAIL")
        });

        it('Should reverted: transferFrom with used token id', async () => {
            const preBalance = await getTokenBalanceByAdmin(accounts.To2);
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.To1,
                spender_address : accounts.Spender1,
                to_address: accounts.To2,
                amount: 10
            };
            console.log("generateSplitTokenRequest:", splitRequest)
            console.log("minter address: ",newMinter.address)
            let response = await client.generateApproveProof(splitRequest,to1Meta);
            console.log("Generate transfer Proof response:", response);

            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,to1Meta)
            await callPrivateTransferFrom(spender1Wallet,config.contracts.PrivateERCToken,accounts.To1,accounts.To2,'0x'+response.transfer_token_id)
            await sleep(1000)
            const postBBalance = await getTokenBalanceByAdmin(accounts.To2);
            expect(postBBalance).to.be.equal(preBalance+10)
            await expect(callPrivateTransferFrom(spender1Wallet,config.contracts.PrivateERCToken,accounts.To1,accounts.To2,'0x'+response.transfer_token_id)).to.reverted
        });

        it('Should reverted: transferFrom token id and toAddress not matched', async () => {
            const preBalance = await getTokenBalanceByAdmin(accounts.To1);
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.To1,
                spender_address : accounts.Spender1,
                to_address: accounts.To2,
                amount: 10
            };
            console.log("generateSplitTokenRequest:", splitRequest)
            console.log("minter address: ",newMinter.address)
            let response = await client.generateApproveProof(splitRequest,to1Meta);
            console.log("Generate transfer Proof response:", response);

            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,to1Meta)
            await expect(callPrivateTransferFrom(spender1Wallet,config.contracts.PrivateERCToken,accounts.To1,accounts.Minter,'0x'+response.transfer_token_id)).revertedWith("PrivateERCToken: tokenId is not matched")

        });

    })
    describe('Revoke security',function () {
        before(async function () {
            await DirectMint(accounts.To1,50);
            await DirectMint(accounts.Minter,50);
        })
        it('Should reverted: revoke with wallet not matched with approve',async () => {
            const amount = await getTokenBalanceByAdmin(accounts.To1);
            let response = await generateApprove(to1Wallet,accounts.To1,userInNode1,1,to1Meta)
            let approvedToken = await getApprovedAllowance(config.contracts.PrivateERCToken,spender1Wallet,accounts.To1)
            await expect(callPrivateRevoke(config.contracts.PrivateERCToken,minterWallet,accounts.Spender1,approvedToken)).revertedWith("PrivateERCToken: allowance tokenId mismatch")
        });
        it('Should reverted: revoke with token mismatch',async () => {
            let response1 = await generateApprove(to1Wallet,accounts.To1,userInNode1,1,to1Meta)
            let approvedToken1 = await getApprovedAllowance(config.contracts.PrivateERCToken,spender1Wallet,accounts.To1)
            console.log("approvedToken1:", approvedToken1)
            let response2 = await generateApprove(minterWallet,accounts.Minter,userInNode1,1,to1Meta)
            let approvedToken2 = await getApprovedAllowance(config.contracts.PrivateERCToken,spender1Wallet,accounts.Minter)
            console.log("approvedToken2:", approvedToken2)

            await expect(callPrivateRevoke(config.contracts.PrivateERCToken,minterWallet,accounts.Spender1,approvedToken1)).revertedWith("PrivateERCToken: allowance tokenId mismatch")

        });
        it('Should reverted: revoke with token transferred',async () => {
            const preBalance = await getTokenBalanceByAdmin(accounts.To1);
            let response = await generateApprove(to1Wallet,accounts.To1,userInNode1,1,to1Meta)
            let approvedToken = await getApprovedAllowance(config.contracts.PrivateERCToken,spender1Wallet,accounts.To1)
            await callPrivateTransferFrom(spender1Wallet,config.contracts.PrivateERCToken,accounts.To1,userInNode1,approvedToken)
            await sleep(3000)
            const postBalance = await getTokenBalanceByAdmin(accounts.To1);
            expect(postBalance).to.equal(preBalance-1);
            await expect(callPrivateRevoke(config.contracts.PrivateERCToken,to1Wallet,accounts.Spender1,approvedToken)).revertedWith("PrivateERCToken: no allowance exists for this spender")

        });
    })

    describe('Convert USDC and pUSDC security',function () {
        this.timeout(1200000)
        before(async function () {
            // await DirectMint(accounts.Minter,50);
            // await DirectMint(accounts.To1,50);
        })
        it('Should reverted: convert to pUSDC with wallet not matched with proofResult',async () => {
            const userAddress = accounts.Minter;
            const userMeta = minterMeta
            const userWallet = minterWallet
            const amount = 10;
            console.log("pre usdc balance is :",await getPublicBalance(userAddress))
            const convertToPUSDCResponse = {
                amount: amount
            };
            let proofResult = await client.convertToPUSDC(convertToPUSDCResponse, userMeta);
            // console.log("Generate Mint Proof response:", proofResult);
            // const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, userWallet);
            let contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, to1Wallet);
            const elAmount = {
                cl_x: ethers.toBigInt(proofResult.elgamal.cl_x),
                cl_y: ethers.toBigInt(proofResult.elgamal.cl_y),
                cr_x: ethers.toBigInt(proofResult.elgamal.cr_x),
                cr_y: ethers.toBigInt(proofResult.elgamal.cr_y)
            };
            const proof = proofResult.proof.map(p => ethers.toBigInt(p));
            const input = proofResult.input.map(i => ethers.toBigInt(i));
            let tx = await contract.convert2pUSDC(amount,elAmount,input,proof);
            let receipt = await tx.wait();
            console.log("convert2pUSDC tx:", receipt);
            expect(receipt.status).to.equal(1);
            console.log("post usdc balance is 1 :",await getPublicBalance(userAddress))

            let contract2 = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, userWallet);
            tx = await contract2.convert2pUSDC(amount,elAmount,input,proof);
            await tx.wait();
            console.log("post usdc balance is 2 :",await getPublicBalance(userAddress))

        });

        it('Should reverted: convert to pUSDC with amount not matched with proofResult',async () => {
            const userAddress = accounts.Minter;
            const userMeta = minterMeta
            const userWallet = minterWallet
            const amount = 10;
            console.log("pre usdc balance is :",await getPublicBalance(userAddress))
            const convertToPUSDCResponse = {
                amount: amount
            };
            let proofResult = await client.convertToPUSDC(convertToPUSDCResponse, userMeta);
            const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, userWallet);
            const elAmount = {
                cl_x: ethers.toBigInt(proofResult.elgamal.cl_x),
                cl_y: ethers.toBigInt(proofResult.elgamal.cl_y),
                cr_x: ethers.toBigInt(proofResult.elgamal.cr_x),
                cr_y: ethers.toBigInt(proofResult.elgamal.cr_y)
            };
            const proof = proofResult.proof.map(p => ethers.toBigInt(p));
            const input = proofResult.input.map(i => ethers.toBigInt(i));
            await expect(contract.convert2pUSDC(20,elAmount,input,proof)).revertedWith("amount is not match")
        });

        it('Should reverted: convert to pUSDC with used proof',async () => {
            const userAddress = accounts.Minter;
            const userMeta = minterMeta
            const userWallet = minterWallet
            const amount = 10;
            console.log("pre usdc balance is :",await getPublicBalance(userAddress))
            const convertToPUSDCResponse = {
                amount: amount
            };
            let proofResult = await client.convertToPUSDC(convertToPUSDCResponse, userMeta);
            const contract = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken, userWallet);
            const elAmount = {
                cl_x: ethers.toBigInt(proofResult.elgamal.cl_x),
                cl_y: ethers.toBigInt(proofResult.elgamal.cl_y),
                cr_x: ethers.toBigInt(proofResult.elgamal.cr_x),
                cr_y: ethers.toBigInt(proofResult.elgamal.cr_y)
            };
            const proof = proofResult.proof.map(p => ethers.toBigInt(p));
            const input = proofResult.input.map(i => ethers.toBigInt(i));

            let tx = await contract.convert2pUSDC(amount,elAmount,input,proof);
            await tx.wait();
            console.log("post usdc balance is 1 :",await getPublicBalance(userAddress))
            await expect(contract.convert2pUSDC(amount,elAmount,input,proof)).revertedWith("amount is not match")
            // tx = await contract.convert2pUSDC(amount,elAmount,input,proof);
            // await tx.wait();
            // console.log("post usdc balance is 2 :",await getPublicBalance(userAddress))
        });

        // it('Should reverted: convert to USDC with amount is 0',async ())

    })
});




