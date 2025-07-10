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
    getAddressBalance2
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
const adminPrivateKey = hardhatConfig.networks.ucl_L2.accounts[1];
const node4AdminPrivateKey = hardhatConfig.networks.ucl_L2.accounts[10];

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
    console.log("generateMintRequest:", generateRequest)
    try {
        const response = await client.generateMintProof(generateRequest,minterMeta);
        console.log("generateMintRequest:", response)
        const receipt = await callPrivateMint(config.contracts.PrivateERCToken, response, minterWallet)
        console.log("callPrivateMint:", receipt)
        await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
        // await sleep(3000);
        return  receipt
    }catch (error){
        const wrappedError = new Error('Minting failed: ' + error.details);
        wrappedError.code = error.code;
        wrappedError.details = error.details;
        throw wrappedError;
    }
}

async function mintBy(address,amount,minterWallet) {
    const key = minterWallet.privateKey
    const minterMeta = await createAuthMetadata(key);
    const generateRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: minterWallet.address,
        to_address: address,
        amount: amount
    };
    console.log("generateMintRequest:", generateRequest)
    try {
        const response = await client.generateMintProof(generateRequest,minterMeta);
        console.log("generateMintRequest:", response)
        const receipt = await callPrivateMint(config.contracts.PrivateERCToken, response, minterWallet)
        await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
        console.log("generateMintRequest:", receipt)
        // await sleep(2000);
        return  receipt
    }catch (error){
        console.log(error)
        const wrappedError = new Error('Minting failed: ' + error.details);
        wrappedError.code = error.code;
        wrappedError.details = error.details;
        throw wrappedError;
    }
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
        console.log("##############")
        let receipt = await callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress,'0x'+response.transfer_token_id)
        await sleep(2000)
        return receipt
    }catch (error){
        const wrappedError = new Error('Transfer failed: ' + error.details);
        wrappedError.code = error.code;
        wrappedError.details = error.details;
        throw wrappedError;
    }
}
async function ReserveTokensToTransfer(toAddress,amount,metadata) {
    try {
        const splitRequest = {
            sc_address: config.contracts.PrivateERCToken,
            token_type: '0',
            from_address: accounts.Minter,
            to_address: toAddress,
            amount: amount
        };
        let response = await client.generateSplitToken(splitRequest,metadata);
        console.log("Generate transfer Proof response:", response);
        await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,metadata)
    }catch (error){
        const wrappedError = new Error('Transfer failed: ' + error.details);
        wrappedError.code = error.code;
        wrappedError.details = error.details;
        throw wrappedError;
    }

}
async function ReserveTokensToBurn(amount) {
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
    }catch (error){
        const wrappedError = new Error('Burn failed: ' + error.details);
        wrappedError.code = error.code;
        wrappedError.details = error.details;
        throw wrappedError;
    }

}
async function ReserveTokensAndTransferFrom(fromWallet,fromAddress,toAddress,amount,metadata){
    const splitRequest = {
        sc_address: config.contracts.PrivateERCToken,
        token_type: '0',
        from_address: fromAddress,
        to_address: toAddress,
        amount: amount
    };
    console.log("generateSplitTokenRequest:", splitRequest)
    try {
        let response = await client.generateSplitToken(splitRequest,metadata);
        console.log("Generate transfer Proof response:", response);
        await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,metadata)
        let receipt = await callPrivateTransfer(fromWallet,config.contracts.PrivateERCToken,toAddress,'0x'+response.transfer_token_id)
        // let receipt = await callPrivateTransfer(minterWallet,config.contracts.PrivateERCToken,toAddress,'0x'+response.transfer_token_id) // minter can call transfer
        // await sleep(3000);
        //console.log("receipt", receipt)
        return receipt
    }catch (error){
        console.log("error", error)
        const wrappedError = new Error('Transfer failed: ' + error.details);
        wrappedError.code = error.code;
        wrappedError.details = error.details;
        throw wrappedError;
    }
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
        await sleep(2000)
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

// async function getMinterAllowance(){
//     const request = {
//         sc_address: config.contracts.PrivateERCToken
//     };
//     let allowance = await client.getMintAllowed(request)
//     console.log("allowance: ", allowance)
//     return Number(allowance.amount)
// }

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
    try {
        const response = await client.generateDirectMint(generateRequest,minterMeta);
        console.log("Generate Mint Proof response:", response);
        const receipt = await client.waitForActionCompletion(client.getMintProof, response.request_id,minterMeta)
        // const receipt = await client.waitForActionCompletion(client.getMintProof, response,minterMeta)
        //console.log("receipt", receipt)

        // await sleep(3000);
    }catch (error){
        const wrappedError = new Error('Minting failed: ' + error.details);
        wrappedError.code = error.code;
        wrappedError.details = error.details;
        throw wrappedError;
    }
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

    try {
        let response = await client.generateDirectTransfer(splitRequest,minterMeta);
        console.log("Generate transfer Proof response:", response);
        await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id,minterMeta)
        // await sleep(3000);
    }catch (error){
        const wrappedError = new Error('Minting failed: ' + error.details);
        wrappedError.code = error.code;
        wrappedError.details = error.details;
        throw wrappedError;
    }
}
async function DirectBurn(address,amount) {
    const minterMeta = await createAuthMetadata(accounts.MinterKey)
    try {
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
        // await sleep(3000);
    }catch (error){
        const wrappedError = new Error('Burn failed: ' + error.details);
        wrappedError.code = error.code;
        wrappedError.details = error.details;
        throw wrappedError;
    }
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

describe.only("Function Cases",function (){

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

        it.skip('set  minter allowedAmount ',async () => {
            const minterAllowedAmount = {
                "cl_x": 17965178807605681775593476527901391566646357775548805416191630067931921590266n,
                "cl_y": 17997503520096523373978760079614633178183544935372525079367653487073845131371n,
                "cr_x": 2799658707790704252170544877645553735081603739176317448125814928308770685127n,
                "cr_y": 10724405929777949929088094477911843117820716522007699467531083531418761611245n,
            };

            // 获取 admin 签名者，用于调用 configurePrivacyMinter
            const adminSigner = await ethers.provider.getSigner();

            // 获取 PrivateUSDC 合约实例，使用 admin 签名者作为调用者
            const privateUSDC = await ethers.getContractAt("PrivateUSDC", config.contracts.PrivateERCToken, adminSigner);

            const Institution = await ethers.getContractAt("InstitutionUserRegistry", config.contracts.InstitutionUserRegistry, adminSigner);
            console.log("manager: ",await Institution.getUserManager(minterWallet.address))
            // 设置新 minter 的 allowance（铸造限额）
            await privateUSDC.configurePrivacyMinter(accounts.Minter, minterAllowedAmount);
            // 使用新 minter 进行 mint 操作
            // const minterWallet = new ethers.Wallet(minterPrivateKey);
            await sleep(2000);

        });

        it('Mint 1 tokens to minter',async () => {
            try {
                const amount = 1;
                let recepit = await mint(recevier,amount);
                console.log("recepit: ", recepit)
                postBalance = await getTokenBalanceByAdmin(recevier);
                expect(postBalance).to.equal(preBalance + amount);
            }catch (error){
                console.log(error)
            }
        });
        it('Mint  10 to spender in node3',async () => {
            const preBalanceSpender = await getTokenBalanceByAdmin(accounts.Spender1);
            try{
                await mint(accounts.Spender1,amount);
                const postBalanceSpender = await getTokenBalanceByAdmin(accounts.Spender1);
                expect(postBalanceSpender).to.equal(preBalanceSpender + amount);
            }catch (error){
                console.log("error:",error)
            }
        });
        it('Mint  10 to user in node3',async () => {
            const userAddress = accounts.To1;
            const preBalanceUser = await getTokenBalanceByAdmin(userAddress);
            try{
                await mint(userAddress,amount);
                const postBalanceUser = await getTokenBalanceByAdmin(userAddress);
                expect(postBalanceUser).to.equal(preBalanceUser + amount);
            }catch (error){
                console.log("error:",error)
            }
        });
        it('Mint amount 10 with string format',async ()=>{
            try {
                await mint(recevier,amount.toString());
                postBalance = await getTokenBalanceByAdmin(recevier);
                expect(postBalance).to.equal(preBalance + amount);
            }catch (error){
                console.log(error)
            }
        });
        it('Mint  10 to user cross node',async () => {
            const userAddress = userInNode1;
            const preBalanceUser = await getTokenBalanceInNode1(userAddress);
            console.log(preBalanceUser)
            try{
                await mint(userAddress,amount);
                const postBalanceUser = await getTokenBalanceInNode1(userAddress);
                console.log(postBalanceUser)
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
            await mint(accounts.Minter,50);
            await mint(accounts.To1,10);
            // await registerUser(adminPrivateKey,client1,userInNode1,"normal")
        });

        beforeEach(async function () {
            preBalance = await getTokenBalanceByAdmin(accounts.Minter);
        });
        it('transfer to user1 inBank with 1',async () => {
            const amount = 1
            preBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            await ReserveTokensAndTransfer(toAddress1,amount,minterMeta);
            postBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            console.log({preBalance,postBalance,preBalanceTo,postBalanceTo})
            expect(postBalance).to.equal(preBalance - amount);
            expect(postBalanceTo).to.equal(preBalanceTo + amount);
        });
        it('transfer to user1 inBank with 10 string format',async () => {
            const amount = 10;
            preBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            await ReserveTokensAndTransfer(toAddress1,amount.toString(),minterMeta);
            postBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            console.log({preBalance,postBalance,preBalanceTo,postBalanceTo})
            expect(postBalance).to.equal(preBalance - amount);
            expect(postBalanceTo).to.equal(preBalanceTo + amount);
        });

        it('transfer to spender inBank with 10',async () => {
            const recevier = accounts.Spender1;
            preBalanceTo = await getTokenBalanceByAdmin(recevier);
            await ReserveTokensAndTransfer(recevier,amount,minterMeta);
            postBalanceTo = await getTokenBalanceByAdmin(recevier);
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            expect(postBalance).to.equal(preBalance - amount);
            expect(postBalanceTo).to.equal(preBalanceTo + amount);
        });
        it('transfer to user cross Bank with 100',async () => {
            const recevier = userInNode1;
            preBalanceTo = await getTokenBalanceInNode1(recevier);
            await ReserveTokensAndTransfer(recevier,amount,minterMeta);
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            postBalanceTo = await getTokenBalanceInNode1(recevier);
            expect(postBalance).to.equal(preBalance - amount);
            expect(postBalanceTo).to.equal(preBalanceTo + amount);
        });
        it('transfer all amount',async () => {
            await cancelAllSplitTokens(minterWallet,config.contracts.PrivateERCToken);
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
                await ReserveTokensAndTransferFrom( to1Wallet,accounts.To1, accounts.To2,amount,to1Meta)
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
                await ReserveTokensAndTransferFrom(to1Wallet,accounts.To1, userInNode1,amount,to1Meta)
                postBalance = await getTokenBalanceByAdmin(accounts.To1);
                expect(postBalance).to.equal(preBalance - amount);
            }else {
                console.log("balance is not enough")
            }
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
            // expect(postBalanceMinter).to.equal(preBalanceMinter + 50);
            expect(postBalanceTo1).to.equal(preBalanceTo1);
            expect(postBalanceTo1).to.equal(preBalanceTo1+10);
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
            // await sleep(10000)
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
            // await DirectMint(accounts.Minter, amount);
            // await DirectMint(accounts.To1, amount);
            // await DirectMint(userInNode1, amount);
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

        it('Try to DirectBurn 100 for user of other bank',async () => {
            const burner = userInNode1
            try {
                await DirectBurn(burner, 100);
            }catch (error){
                console.log(error)
                expect(error.details).to.equal("No tokens are available for splitting.")
            }
        });

    });

    describe('Cancel splitToken', function () {
        this.timeout(1200000);
        it('split token list ',async () => {
            await DirectMint(accounts.Minter, 50);
            await ReserveTokensToTransfer(accounts.To1,10,minterMeta);
            await ReserveTokensToBurn(20);
            // console.log(await getSplitTokenList(client,accounts.Minter,config.contracts.PrivateERCToken))
            console.log(await getSplitTokenList(client,accounts.Minter,config.contracts.PrivateERCToken,minterMeta))
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
            await ReserveTokensToTransfer(accounts.To1,10,minterMeta);
            const ownerWallet = minterWallet ;
            const scAddress = config.contracts.PrivateERCToken;
            const result = await getSplitTokenList(client,ownerWallet.address,scAddress,minterMeta);
            const splitTokens = result.split_tokens;
            console.log("splitTokens: ", splitTokens)
            if (splitTokens.length > 0){
                for (let i = 0; i < splitTokens.length; i++) {
                    let splitToken = splitTokens[i];
                    console.log("cancel split token: ", splitToken.token_id)
                    // await callPrivateCancel(scAddress, ownerWallet, splitToken.token_id);
                    let receipt = await callPrivateCancel(scAddress, ownerWallet, ethers.toBigInt('0x'+splitToken.token_id))
                    //console.log("receipt", receipt)
                    await expect(callPrivateCancel(scAddress, ownerWallet, ethers.toBigInt('0x'+splitToken.token_id))).to.be.revertedWith("token.owner != msg.sender")

                }
            }
        });
    });
    describe("check contract totalSupply", function () {
        this.timeout(1200000);
        let totalSupplyPre,totalSupplyPost;
        const amount = 20;
        before(async function () {
            await cancelAllSplitTokens(minterWallet,config.contracts.PrivateERCToken)
            // await mint(accounts.Minter, amount);
            // await mint(accounts.To1, amount);
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
        it('totalSupply_keep_same_after_directTransfer_otherBank',async () => {
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

    describe.skip("Authorization", function () {
        const normalWallet = ethers.Wallet.createRandom();
        const minterWallet = ethers.Wallet.createRandom();
        const adminWallet = ethers.Wallet.createRandom();
        const minterPrivateKey = minterWallet.privateKey
        const normalPrivateKey = normalWallet.privateKey
        describe("Registe",function (){
            this.timeout(1200000);
            it.skip('Registe user with exist admin auth test', async () => {
                await registerUser(adminPrivateKey,client, accounts.To1, "normal");
                await registerUser(adminPrivateKey,client, accounts.To2, "normal");
                await registerUser(adminPrivateKey,client, accounts.Spender1, "normal");
                // await registerUser(adminPrivateKey,client, adminWallet.address, "admin");
                // await registerUser(adminPrivateKey,client, minterWallet.address, "minter");
                // await registerUser(adminPrivateKey,client, accounts.Minter, "minter");
                await sleep(2000);
                // let response = await getAccount(adminPrivateKey,client, normalWallet.address);
                // console.log("normal account: ",response)
                // expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
                // expect(response.account_roles).equal("normal");
                //
                // response = await getAccount(adminPrivateKey,client, minterWallet.address);
                // expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
                // expect(response.account_roles).equal("minter");
                // const minterAllowedAmount = {
                //     "cl_x": 17965178807605681775593476527901391566646357775548805416191630067931921590266n,
                //     "cl_y": 17997503520096523373978760079614633178183544935372525079367653487073845131371n,
                //     "cr_x": 2799658707790704252170544877645553735081603739176317448125814928308770685127n,
                //     "cr_y": 10724405929777949929088094477911843117820716522007699467531083531418761611245n,
                // }
                // const privateUSDC = await getPrivateUSDC(minterPrivateKey);
                // await privateUSDC.configurePrivacyMinter(accounts.Minter, minterAllowedAmount);

                // response = await getAccount(adminPrivateKey,client, adminWallet.address);
                // expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
                // expect(response.account_roles).equal("admin");

            });


            it('Registe user with exist admin auth', async () => {
                await registerUser(adminPrivateKey,client, normalWallet.address, "normal");
                await registerUser(adminPrivateKey,client, adminWallet.address, "admin");
                await registerUser(adminPrivateKey,client, minterWallet.address, "minter");
                // await registerUser(adminPrivateKey,client, accounts.Minter, "minter");
                await sleep(2000);
                let response = await getAccount(adminPrivateKey,client, normalWallet.address);
                console.log("normal account: ",response)
                expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
                expect(response.account_roles).equal("normal");

                response = await getAccount(adminPrivateKey,client, minterWallet.address);
                expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
                expect(response.account_roles).equal("minter");
                // const minterAllowedAmount = {
                //     "cl_x": 17965178807605681775593476527901391566646357775548805416191630067931921590266n,
                //     "cl_y": 17997503520096523373978760079614633178183544935372525079367653487073845131371n,
                //     "cr_x": 2799658707790704252170544877645553735081603739176317448125814928308770685127n,
                //     "cr_y": 10724405929777949929088094477911843117820716522007699467531083531418761611245n,
                // }
                // const privateUSDC = await getPrivateUSDC(minterPrivateKey);
                // await privateUSDC.configurePrivacyMinter(accounts.Minter, minterAllowedAmount);

                response = await getAccount(adminPrivateKey,client, adminWallet.address);
                expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
                expect(response.account_roles).equal("admin");

            });
            it('Operation with new minter ',async () => {
                const minterAllowedAmount = {
                    "cl_x": 17965178807605681775593476527901391566646357775548805416191630067931921590266n,
                    "cl_y": 17997503520096523373978760079614633178183544935372525079367653487073845131371n,
                    "cr_x": 2799658707790704252170544877645553735081603739176317448125814928308770685127n,
                    "cr_y": 10724405929777949929088094477911843117820716522007699467531083531418761611245n,
                };

                // 获取 admin 签名者，用于调用 configurePrivacyMinter
                const adminSigner = await ethers.provider.getSigner();

                // 获取 PrivateUSDC 合约实例，使用 admin 签名者作为调用者
                const privateUSDC = await ethers.getContractAt("PrivateUSDC", config.contracts.PrivateERCToken, adminSigner);

                const insi = await ethers.getContractAt("InstitutionUserRegistry", config.contracts.InstitutionUserRegistry, adminSigner);
                console.log("manager: ",await insi.getUserManager(minterWallet.address))
                // 设置新 minter 的 allowance（铸造限额）
                await privateUSDC.configurePrivacyMinter(minterWallet.address, minterAllowedAmount);
                // 使用新 minter 进行 mint 操作
                // const minterWallet = new ethers.Wallet(minterPrivateKey);
                await sleep(2000);

                // const newMinterWallet = new ethers.Wallet(minterWallet.privateKey, l1Provider);
                // const balancePre = await getTokenBalanceByAdmin(minterWallet.address)
                // await mintBy(minterWallet.address, 100, newMinterWallet);
                // let balancePost = await getTokenBalanceByAdmin(minterWallet.address)
                // console.log({balancePre,balancePost})
                // expect(balancePost).equal(balancePre+100);
                // console.log("minterKey: ",minterWallet.privateKey)
                // console.log("normalKey: ",normalWallet.privateKey)
            });

            it('Registe user with new admin auth ', async () => {
                const userWallet = ethers.Wallet.createRandom();
                const key = adminWallet.privateKey;
                await registerUser(key,client, userWallet.address, "normal");
                await sleep(2000);
                let response = await getAccount(key,client, userWallet.address);
                expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
                expect(response.account_role).equal("normal");
            });
            it('Should reverted: Use minter auth to registe account',async ()=>{
                const minterMetadata = await createAuthMetadata(minterWallet.privateKey);
                const newUser = ethers.Wallet.createRandom()
                const request = {
                    account_address: newUser.address,
                    account_role: 'normal',//minter,admin,normal
                };
                expect( await client.registerAccount(request, minterMetadata)).reverted

            })
            it('Should reverted: Use normal auth to registe account',async ()=>{
                const normalMetadata = await createAuthMetadata(normalWallet.privateKey);
                const newUser = ethers.Wallet.createRandom()
                const request = {
                    account_address: newUser.address,
                    account_role: 'normal',//minter,admin,normal
                };
                expect( await client.registerAccount(request, normalMetadata)).reverted

            })
        });

        describe("Update user status",function (){
            this.timeout(1200000);
            const adminPrivateKey = adminWallet.privateKey
            it('Update user status to inactive with admin auth', async () => {
                await updateAccountStatus(adminPrivateKey,client,normalWallet.address,0);
                await sleep(2000);
                let response = await getAccount(adminPrivateKey,client, normalWallet.address);
                expect(response.account_status).equal("ACCOUNT_STATUS_INACTIVE");

                await updateAccountStatus(adminPrivateKey,client,minterWallet.address,0);
                await sleep(2000);
                response = await getAccount(adminPrivateKey,client, minterWallet.address);
                expect(response.account_status).equal("ACCOUNT_STATUS_INACTIVE");
            });

            it('Update user status to active with admin auth', async () => {
                await updateAccountStatus(adminPrivateKey,client,normalWallet.address,2);
                await sleep(2000);
                let response = await getAccount(adminPrivateKey,client, normalWallet.address);
                expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");

                await updateAccountStatus(adminPrivateKey,client,minterWallet.address,2);
                await sleep(2000);
                response = await getAccount(adminPrivateKey,client, minterWallet.address);
                expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            });

            it('should reverted: update user status with minter auth', async () => {
                try {
                    await updateAccountStatus(minterPrivateKey,client,normalWallet.address,2);
                }catch (err){
                    expect(err.details).to.include('permission denied')
                }
            });
            it('should reverted: update user status with normal auth', async () => {
                try {
                    await updateAccountStatus(normalPrivateKey,client,normalWallet.address,2);
                }catch (err){
                    expect(err.details).to.include('permission denied')
                }
            });
        });
        describe("Update user role",function (){
            this.timeout(1200000);
            const adminPrivateKey = adminWallet.privateKey
            it('Update user role: normal,minter,admin',async () => {
                // normal -> minter
                await updateAccountRole(adminPrivateKey,client,normalWallet.address,'minter')
                let response = await getAccount(adminPrivateKey,client, normalWallet.address);
                expect(response.account_role).equal("minter");
                // minter -> admin
                await updateAccountRole(adminPrivateKey,client,normalWallet.address,'admin')
                response = await getAccount(adminPrivateKey,client, normalWallet.address);
                expect(response.account_role).equal("admin");
                // admin -> minter
                await updateAccountRole(adminPrivateKey,client,normalWallet.address,'minter')
                response = await getAccount(adminPrivateKey,client, normalWallet.address);
                expect(response.account_role).equal("minter");
                //minter -> normal
                await updateAccountRole(adminPrivateKey,client,normalWallet.address,'normal')
                response = await getAccount(adminPrivateKey,client, normalWallet.address);
                expect(response.account_role).equal("normal");
                //normal -> admin
                await updateAccountRole(adminPrivateKey,client,normalWallet.address,'admin')
                response = await getAccount(adminPrivateKey,client, normalWallet.address);
                expect(response.account_role).equal("admin");
                //admin -> normal
                await updateAccountRole(adminPrivateKey,client,normalWallet.address,'normal')
                response = await getAccount(adminPrivateKey,client, normalWallet.address);
                expect(response.account_role).equal("normal");
            });
            it('Should revert: update user role with minter auth ', async () => {
                try {
                    await updateAccountRole(minterPrivateKey,client,normalWallet.address,'minter')
                }catch (error){
                    expect(err.details).to.include('permission denied')
                }
            });
            it('Should revert: update user role with normal user auth ', async () => {
                try {
                    await updateAccountRole(normalPrivateKey,client,normalWallet.address,'minter')
                }catch (error){
                    expect(err.details).to.include('permission denied')
                }
            });


        });
        describe("getAsyncAction",function (){
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
        });
        describe("getAccount",function (){
            this.timeout(120000);
            it('admin can check all role account ', async () => {
                let response = await getAccount(adminPrivateKey,client, adminWallet.address)
                expect(response).to.have.property('account_address', adminWallet.address.toLowerCase());

                response = await getAccount(adminPrivateKey,client,minterWallet.address )
                expect(response).to.have.property('account_address', minterWallet.address.toLowerCase());

                response = await getAccount(adminPrivateKey,client,normalWallet.address )
                expect(response).to.have.property('account_address', normalWallet.address.toLowerCase());

            });

            it('minter can check itself ', async () => {
                let response = await getAccount(minterPrivateKey,client, minterWallet.address)
                expect(response).to.have.property('account_address', minterWallet.address.toLowerCase());
            });

            it('normal can check itself ', async () => {
                let response = await getAccount(normalPrivateKey,client, normalWallet.address)
                expect(response).to.have.property('account_address', normalWallet.address.toLowerCase());
            });

            it('minter can not check others', async () => {
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

    });

    describe("check gas used", function () {
        this.timeout(1200000);
        const MAX_GAS_LIMIT = 30000000;
        it('Check gas used during mint ',async () => {
            const receipt = await mint(accounts.Minter, 20);
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
});


describe("Boundary value cases",function (){
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
        it("Check address balance on node3 with INVALID_ADDRESS", async function () {
            expect(await ethers.isAddress(INVALID_ADDRESS)).false
            expect(await getTokenBalanceByAdmin(INVALID_ADDRESS)).reverted

        })
    });

    describe("Mint with boundary values", function () {
        this.timeout(1200000);
        const recevier = accounts.Minter;
        beforeEach(async function () {
            preBalance = await getTokenBalanceByAdmin(recevier);
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
                await mint(recevier,amount);
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
            console.log(await getTokenBalanceByAdmin(toAddress))
            const generateRequest = {
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                to_address: toAddress,
                amount: amount
            };
            console.log("generateMintRequest:", generateRequest)
            const response = await client.generateMintProof(generateRequest,minterMeta);
            // const proofResult = await client.waitForProofCompletion(client.getMintProof, response.request_id)
            let receipt = await callPrivateMint(config.contracts.PrivateERCToken, response, minterWallet)
            await sleep(1000);
            console.log(await getTokenBalanceByAdmin(toAddress))
            await expect( await callPrivateMint(config.contracts.PrivateERCToken, response, minterWallet)).to.revertedWith("initialMinterAllowance not match")

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
            console.log("Generate mint Proof response:", response)
            // let proofResult = await client.waitForProofCompletion(client.getMintProof, response.request_id)
            // let proofTem = "1"+ proofResult.proof ;
            // proofResult.proof = proofTem;
            // await expect(callPrivateMint(config.contracts.PrivateERCToken, proofResult, minterWallet)).to.reverted

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
            preBalance = await getTokenBalanceByAdmin(accounts.Minter);
        });
        it('Should revert: transfer with amount 0',async () => {
            const amount = 0;
            preBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            try {
                await ReserveTokensAndTransfer(toAddress1,amount);
                postBalanceTo = await getTokenBalanceByAdmin(toAddress1);
                postBalance = await getTokenBalanceByAdmin(accounts.Minter);
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
            preBalanceTo = await getTokenBalanceByAdmin(ZERO_ADDRESS);
            expect(await ReserveTokensAndTransfer(ZERO_ADDRESS,amount)).to.revertedWith("PrivateERCToken: to is the zero address")
        });
        it('Should revert: transfer with used tokenId',async () => {
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
            preBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            const toAddress = accounts.To1;
            console.log(await getTokenBalanceByAdmin(accounts.To1));
            console.log(await getTokenBalanceByAdmin(accounts.To2))
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
            const amount = await getTokenBalanceByAdmin(accounts.Minter);
            console.log("minter amount:",amount)
            preBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            await cancelAllSplitTokens(minterWallet,config.contracts.PrivateERCToken)
            await ReserveTokensAndTransfer(toAddress1,amount);
            postBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            expect(postBalance).to.equal(preBalance - amount);
            expect(postBalanceTo).to.equal(preBalanceTo + amount);
        });

    })

    describe("Split and burn with boundary values", function () {
        this.timeout(1200000);

        beforeEach(async function () {
            preBalance = await getTokenBalanceByAdmin(accounts.Minter);
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
                postBalance = await getTokenBalanceByAdmin(accounts.Minter);
                expect(postBalance).to.equal(preBalance);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }
        });

        it('Should revert: burn -1 amount',async () => {
            const amount = -1;
            try {
                await ReserveTokensAndBurn(amount);
                postBalance = await getTokenBalanceByAdmin(accounts.Minter);
                expect(postBalance).to.equal(preBalance);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }
        });
        it('Should revert: burn MAX_UINT256 amount',async () => {
            try {
                await ReserveTokensAndBurn(MAX_UINT256);
                postBalance = await getTokenBalanceByAdmin(accounts.Minter);
                expect(postBalance).to.equal(preBalance);
            }catch (error){
                expect(error.details).to.equal("Invalid Amount")
            }
        });
        it('Should revert: burn MAX_UINT256 +1  amount',async () => {
            try {
                const amount = MAX_UINT256 + 1n;
                await ReserveTokensAndBurn(amount);
                postBalance = await getTokenBalanceByAdmin(accounts.Minter);
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
            const burn_amount = await getTokenBalanceByAdmin(accounts.Minter);
            await cancelAllSplitTokens(minterWallet,config.contracts.PrivateERCToken);
            await ReserveTokensAndBurn(burn_amount);
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
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
                await DirectMint(recevier,amount);
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
            const preBalance = await getTokenBalanceByAdmin(sender);
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
        const preBalance = await getTokenBalanceByAdmin(toAddress);
        await mint(toAddress, 100);
        let postBalance = await getTokenBalanceByAdmin(toAddress);
        console.log("new user balance is ", postBalance)
        expect(postBalance).to.equal(preBalance + 100);
    });
    it('Transfer to user', async () => {
        await mint(accounts.Minter, 100)
        const preBalance = await getTokenBalanceByAdmin(toAddress);
        await ReserveTokensAndTransfer(toAddress, 100);
        let postBalance = await getTokenBalanceByAdmin(toAddress);
        console.log("postBalance", postBalance)
        expect(postBalance).to.equal(preBalance + 100);
    });
    // it.skip('Step4: ReserveToken And Burn for user--Not needed', async () => {
    //     // user can not burn token
    //     const preBalance = await getTokenBalanceByAdmin(toAddress);
    //     console.log("preBalance", preBalance)
    //     await ReserveTokensAndBurnFromUser(userWallet, toAddress, 100);
    //     let postBalance = await getTokenBalanceByAdmin(toAddress);
    //     console.log("postBalance", postBalance)
    //     expect(postBalance).to.equal(preBalance - 100);
    // });
    it('ReserveToken And transfer for user', async () => {
        const amount = 100
        const recevier  = accounts.To1;
        const preBalance = await getTokenBalanceByAdmin(toAddress);
        const preBalanceTo  = await getTokenBalanceByAdmin(recevier);
        console.log("preBalance", preBalance)
        await ReserveTokensAndTransferFrom(userWallet, toAddress, recevier, amount);
        const postBalance = await getTokenBalanceByAdmin(toAddress);
        const postBalanceTo = await getTokenBalanceByAdmin(recevier);
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
        const preBalance = await getTokenBalanceByAdmin(toAddress);

        await mint(toAddress, 100);
        let postBalance = await getTokenBalanceByAdmin(toAddress);
        console.log("new user balance is after mint", postBalance)
        expect(postBalance).to.equal(preBalance + 100);

        await mint(accounts.Minter, 100)
        await ReserveTokensAndTransfer(toAddress, 100);
        postBalance = await getTokenBalanceByAdmin(toAddress);
        console.log("new user balance is after transferIn", postBalance)
        expect(postBalance).to.equal(preBalance + 200);

        await ReserveTokensAndTransferFrom(userWallet, toAddress, accounts.To2, 100);
        postBalance = await getTokenBalanceByAdmin(toAddress);
        console.log("new user balance is after transferOut", postBalance)
    });

});

describe('Security cases', function () {
    let adminMeta,minterMeta,spenderMeta,to1Meta

    before(async function () {
        adminMeta = await createAuthMetadata(adminPrivateKey)
        minterMeta = await createAuthMetadata(accounts.MinterKey)
        spenderMeta = await createAuthMetadata(accounts.Spender1Key)
        to1Meta = await createAuthMetadata(accounts.To1PrivateKey);

    })

    describe('Mint security', function () {
        this.timeout(1200000);
        it('Should revert: mint with used proof',async () => {
            const toAddress = accounts.To1;
            console.log(await getTokenBalanceByAdmin(toAddress))
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
            console.log(await getTokenBalanceByAdmin(toAddress))
            await expect(callPrivateMint(config.contracts.PrivateERCToken, proofResult, minterWallet)).to.revertedWith("initialMinterAllowance not match")

        });
        it('Should revert: mint with invalid proof',async () => {
            const toAddress = accounts.To1;
            console.log(await getTokenBalanceByAdmin(toAddress))
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
            preBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            const toAddress = accounts.To1;
            console.log(await getTokenBalanceByAdmin(accounts.To1));
            console.log(await getTokenBalanceByAdmin(accounts.To2))
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
            console.log(await getTokenBalanceByAdmin(toAddress))
            console.log(await getTokenBalanceByAdmin(accounts.Minter))
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
                console.log(await getTokenBalanceByAdmin(toAddress))
                console.log(await getTokenBalanceByAdmin(accounts.Minter))
                await expect(callPrivateBurn(config.contracts.PrivateERCToken, minterWallet, tokenId)).to.reverted
            }
        });
    });
});





