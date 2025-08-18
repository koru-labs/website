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
    createAuthMetadata,
    getAddressBalance2,
    callPrivateTransferFrom,
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
const node4AdminPrivateKey = hardhatConfig.networks.ucl_L2.accounts[10];

const amount = 10;
let preBalance,postBalance;
let preAllowance,postAllowance;

// const minterMeta = await createAuthMetadata(accounts.MinterKey);
// const onwerMeta = await createAuthMetadata(accounts.Owner)


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

// async function DirectMint(receiver,amount) {
//     const minterMeta = await createAuthMetadata(accounts.MinterKey)
//     const generateRequest = {
//         sc_address: config.contracts.PrivateERCToken,
//         token_type: '0',
//         to_address: receiver,
//         amount: amount
//     };
//     try {
//         const response = await client.generateDirectMint(generateRequest,minterMeta);
//         console.log("Generate Mint Proof response:", response);
//         const receipt = await client.waitForActionCompletion(client.getMintProof, response.request_id,minterMeta)
//         // const receipt = await client.waitForActionCompletion(client.getMintProof, response,minterMeta)
//         console.log("receipt", receipt)
//
//         await sleep(3000);
//     }catch (error){
//         const wrappedError = new Error('Minting failed: ' + error.details);
//         wrappedError.code = error.code;
//         wrappedError.details = error.details;
//         throw wrappedError;
//     }
// }

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

const MAX_UINT256 = ethers.MaxUint256;
const MIN_UINT256 = ethers.MinInt256;

describe('Privacy Proof', function () {
    this.timeout(1200000)
    let minterMeta,to1Meta, minterWallet
    before(async () => {
        minterMeta = await createAuthMetadata(accounts.MinterKey)
        minterWallet = new ethers.Wallet(accounts.MinterKey, l1Provider)
        to1Meta = await createAuthMetadata(accounts.To1PrivateKey)
    })

    describe('Mint Proof', function () {
        it('Mint Proof with amount 10', async () => {
            const toAddress = userInNode1;
            const preBalance = await getTokenBalanceInNode1(toAddress)
            const generateRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: minterWallet.address,
                to_address: toAddress,
                amount: amount
            };
            const response = await client.generateMintProof(generateRequest,minterMeta);
            expect(response.status).to.equal("TOKEN_ACTION_STATUS_PROVE_SUC")
            const receipt = await callPrivateMint(config.contracts.PrivateERCToken, response, minterWallet)
            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
            await sleep(2000)
            const postBalance = await getTokenBalanceInNode1(toAddress)
            expect(postBalance).to.equal(preBalance + amount)
        });
        it('Should Fail: Mint Proof with amount 0', async () => {
            const toAddress = accounts.To1;
            const generateRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: minterWallet.address,
                to_address: toAddress,
                amount: 0
            };
            try {
                const response = await client.generateMintProof(generateRequest,minterMeta);
            }catch ( error){
                console.log(error)
                expect(error.details).to.equal("invalid amount")
            }
        });
        it('Should Fail:Mint Proof with MAX_UINT256+1', async () => {
            const toAddress = accounts.To1;
            const generateRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: minterWallet.address,
                to_address: toAddress,
                amount: MAX_UINT256+1n
            };
            try {
                const response = await client.generateMintProof(generateRequest,minterMeta);
            }catch ( error){
                console.log(error)
                expect(error.details).to.equal("invalid amount")
            }
        });
    });
    describe('Split Proof',function (){
        before(async () => {
            await DirectMint(accounts.Minter,100)
        })

        it('Split transfer Proof with amount 10', async () => {
            const preBalance = await getTokenBalanceByAdmin(accounts.Minter)
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: accounts.To1,
                amount: 10,
                comment: "Transfer"
            };
            let response = await client.generateSplitToken(splitRequest,minterMeta);
            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
            expect(response.status).to.equal("TOKEN_ACTION_STATUS_PROVE_SUC")
            await callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,accounts.To1,'0x'+response.transfer_token_id)
            await sleep(2000)
            const postBalance = await getTokenBalanceByAdmin(accounts.Minter)
            expect(postBalance).to.equal(preBalance - 10)
        });

        it('Split burn Proof with amount 10', async () => {
            const preBalance = await getTokenBalanceByAdmin(accounts.Minter)
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                // to_address: accounts.To1,
                amount: 10,
                comment: "Burn"
            };
            let response = await client.generateSplitToken(splitRequest,minterMeta);
            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
            expect(response.status).to.equal("TOKEN_ACTION_STATUS_PROVE_SUC")
            await callPrivateBurn(config.contracts.PrivateERCToken,minterWallet,'0x'+response.transfer_token_id)
            await sleep(2000)
            const postBalance = await getTokenBalanceByAdmin(accounts.Minter)
            expect(postBalance).to.equal(preBalance - 10)
        });

        it('Split Proof with amount 0', async () => {
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: accounts.To1,
                amount: 0,
                comment: "Transfer"
            };
            try {
                await client.generateSplitToken(splitRequest,minterMeta);
            }catch (error){
                console.log(error)
                expect(error.details).to.equal("invalid amount")
            }
        });

    })

    describe('Approve Proof',function (){
        before(async () => {
            await DirectMint(accounts.To1,100)
        })

        it('Approve Proof with amount 10', async () => {
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.To1,
                spender_address : accounts.Spender1,
                to_address: userInNode1,
                amount: 10,
                comment: "ApproveToTransfer"
            };
            console.log("generateSplitTokenRequest:", splitRequest)
            let response = await client.generateApproveProof(splitRequest,to1Meta);
            console.log("Generate transfer Proof response:", response);
            await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,to1Meta)
            expect(response.status).to.equal("TOKEN_ACTION_STATUS_PROVE_SUC")
        });

        it('Approve Proof with amount 0', async () => {
            const splitRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                from_address: accounts.To1,
                spender_address : accounts.Spender1,
                to_address: userInNode1,
                amount: 0,
                comment: "ApproveToTransfer"
            };
            try {
                await client.generateApproveProof(splitRequest,to1Meta);
            }catch (error){
                console.log(error)
                expect(error.details).to.equal("invalid amount")
            }

        });
    })


});




