const { expect } = require("chai");
const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')


const rpcUrl_node3 = "dev-node3-rpc.hamsa-ucl.com:50051:50051"
// const rpcUrl_node3 = 'a901f625f7fbc414d89f04b67325365c-1938211366.us-west-1.elb.amazonaws.com:50051'
// const rpcUrl_node4 = "a10062b98cbe34ba2a0b278754c41a1e-660863113.us-west-1.elb.amazonaws.com:50051"
const client3 = createClient(rpcUrl_node3)
const adminPrivateKey = hardhatConfig.networks.dev_ucl_L2.accounts[1];
const {
    callPrivateMint,
    createAuthMetadata,
    registerUser,
    getAccount,
    getAddressBalance2,
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


const L1Url = hardhatConfig.networks.dev_ucl_L2.url;
const l1Provider = new ethers.JsonRpcProvider(L1Url, l1CustomNetwork, options);

const amount = 10;



async function mintBy(to,amount,minterWallet,scAddress) {
    const key = minterWallet.privateKey
    const minterMeta = await createAuthMetadata(key);
    const wallet = new ethers.Wallet(key, l1Provider);
    const generateRequest = {
        sc_address: scAddress,
        token_type: '0',
        from_address: minterWallet.address,
        to_address: address,
        amount: amount
    };
    console.log("generateMintRequest:", generateRequest)
    const response = await client3.generateMintProof(generateRequest,minterMeta);
    console.log("generateMintProofResult:", response)
    const receipt = await callPrivateMint(scAddress, response, wallet)
    await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id,minterMeta)
    return  receipt
}

async function getTokenBalanceByAdmin(account){
    const metadata = await  createAuthMetadata(adminPrivateKey)
    let balance = await getAddressBalance2(client3, config.contracts.PrivateERCToken, account, metadata)
    return Number(balance.balance)
}

function convertBigInt2Hex(number) {
    return ethers.toBigInt(number).toString(10)
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function setMinterAllowed(minterAddress,scAddress) {
    // 100000000
    const minterAllowedAmount = {
        "cl_x": 8895614456713527930646781641706567219048008339818679528193267225240163992465n,
        "cl_y": 10465769983483180333303121510928911057403261686183445963612161142265101845642n,
        "cr_x": 10462314994173544132664727677411046159599561185912928545538319707034863928823n,
        "cr_y": 1554994249304612964512028380915011460418934054578159688039856354745619696113n,
    }

    console.log(`Configure ${minterAddress} allowed amount...`)

    const minters = [
        {account: minterAddress, name: "Minter"},
    ];

    const PrivateUSDCFactory = await ethers.getContractFactory("PrivateUSDC", {
        libraries: {
            "TokenEventLib": config.libraries.TokenEventLib,
            "TokenUtilsLib": config.libraries.TokenUtilsLib,
            "TokenVerificationLib": config.libraries.TokenVerificationLib,
            "SignatureChecker": config.libraries.SignatureChecker
        }
    });
    const privateUSDC = await PrivateUSDCFactory.attach(scAddress);


    for (const minter of minters) {
        await privateUSDC.configurePrivacyMinter(minterAddress, minterAllowedAmount);
        console.log(`Minter allowed amount configured successfully for ${minter.name} (${minter.account})`)
    }
}

async function getMinterAllowed(minterAddress,scAddress,meta) {
    const Request = {
        sc_address: scAddress,
        address: minterAddress
    };
    console.log("getMintAllowed Request:", Request)
    const grpcResult = await client3.getMintAllowed(Request, meta);
    return Number(grpcResult.amount);
}

describe("minter role permission at contract", async function () {
    this.timeout(1200000);

    // register different accounts as minter at diffrent contracts, account can only mint token at it's contract
    const scAddress1 = '0x2a85A14cB9Fefdf55f2Bb8550FEAe8f1C8595697';
    const scAddress2 = '0xE777fAf8240196bA99c6e2a89E8F24B75C52Eb2a';
    const minter1 = ethers.Wallet.createRandom();
    const minter2 = ethers.Wallet.createRandom();
    const normal = ethers.Wallet.createRandom();
    const minter1Wallet = new ethers.Wallet(minter1.privateKey, l1Provider);
    const minter2Wallet = new ethers.Wallet(minter2.privateKey, l1Provider);
    const normalWallet = new ethers.Wallet(normal.privateKey, l1Provider);
    const minter1Meta = await createAuthMetadata(minter1.privateKey);
    const minter2Meta = await createAuthMetadata(minter2.privateKey);
    const normalMeta = await createAuthMetadata(normal.privateKey);
    const adminMeta = await createAuthMetadata(adminPrivateKey);


    it("register minter", async function () {
        this.timeout(60000)
        console.log("register minter1...")
        await registerUser(adminPrivateKey,client3, minter1Wallet.address, "minter");
        await sleep(10000);
        let response = await getAccount(adminPrivateKey,client3, minter1Wallet.address);
        expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
        expect(response.account_roles).equal("minter");
        console.log("register minter2...")
        await registerUser(adminPrivateKey,client3, minter2Wallet.address, "minter");
        await sleep(10000);
        let response2 = await getAccount(adminPrivateKey,client3, minter2Wallet.address);
        expect(response2.account_status).equal("ACCOUNT_STATUS_ACTIVE");
        expect(response2.account_roles).equal("minter");
    });
    it("register normal", async function () {
        this.timeout(60000)
        console.log("register normal...")
        await registerUser(adminPrivateKey,client3, normalWallet.address, "normal");
        await sleep(10000);
        let response = await getAccount(adminPrivateKey,client3, normalWallet.address);
        expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
        expect(response.account_roles).equal("normal");
    });
    it("set minteAllowance", async function () {
        await setMinterAllowed( minter1Wallet.address, scAddress1);
        await sleep(10000);
        let response = await getMinterAllowed(minter1Wallet.address, scAddress1, minter1Meta);
        console.log( response);

        await setMinterAllowed( minter2Wallet.address, scAddress2);
        await sleep(10000);
        response = await getMinterAllowed(minter2Wallet.address, scAddress2, minter2Meta);
        console.log( response);

        await setMinterAllowed( normalWallet.address, scAddress2);
        await sleep(10000);
        response = await getMinterAllowed(normalWallet.address, scAddress2, adminMeta);
        console.log( response);

    });
    it.skip('Minter1 mint with token1 ', async () => {
        const meta = minter1Meta
        const wallet = minter1Wallet
        const scAddress = scAddress1;
        const preAllowance = await getMinterAllowed(wallet.address, scAddress, meta);
        console.log("pre allowance is :", preAllowance)
        const generateRequest = {
            sc_address: scAddress,
            token_type: '0',
            from_address: wallet.address,
            to_address: accounts.To1,
            amount: 10
        };
        console.log("generateMintRequest:", generateRequest)
        const response = await client3.generateMintProof(generateRequest,meta);
        console.log("generateMintProofResult:", response)
        const receipt = await callPrivateMint(scAddress, response, wallet)
        await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id,meta)
        const postAllowance = await getMinterAllowed(wallet.address, scAddress, meta);
        expect(preAllowance - postAllowance).equal(10);
    });
    it.skip('Minter2 mint with token2 ', async () => {
        const meta = minter2Meta
        const wallet = minter2Wallet
        const scAddress = scAddress2;
        const preAllowance = await getMinterAllowed(wallet.address, scAddress, meta);
        console.log("pre allowance is :", preAllowance)
        const generateRequest = {
            sc_address: scAddress,
            token_type: '0',
            from_address: wallet.address,
            to_address: accounts.To1,
            amount: 10
        };
        console.log("generateMintRequest:", generateRequest)
        const response = await client3.generateMintProof(generateRequest,meta);
        console.log("generateMintProofResult:", response)
        const receipt = await callPrivateMint(scAddress, response, wallet)
        await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id,meta)
        const postAllowance = await getMinterAllowed(wallet.address, scAddress, meta);
        expect(preAllowance - postAllowance).equal(10);
    });
    it('normal user which set allowance to  mint with token2 ', async () => {
        const meta = normalMeta
        const wallet = normalWallet
        const scAddress = scAddress2;
        const preAllowance = await getMinterAllowed(wallet.address, scAddress, adminMeta);
        console.log("pre allowance is :", preAllowance)
        const generateRequest = {
            sc_address: scAddress,
            token_type: '0',
            from_address: wallet.address,
            to_address: accounts.To1,
            amount: 10
        };
        console.log("generateMintRequest:", generateRequest)
        const response = await client3.generateMintProof(generateRequest,meta);
        console.log("generateMintProofResult:", response)
        const receipt = await callPrivateMint(scAddress, response, wallet)
        await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id,meta)
        const postAllowance = await getMinterAllowed(wallet.address, scAddress, adminMeta);
        expect(preAllowance - postAllowance).equal(10);
    });
    it.skip('Permission denied: Minter1 mint with token2 ', async () => {
        const generateRequest = {
            sc_address: scAddress2,
            token_type: '0',
            from_address: minter1.address,
            to_address: accounts.To1,
            amount: 10
        };
        console.log("generateMintRequest:", generateRequest)
        try {
            await client3.generateMintProof(generateRequest,minter1Meta);
        }catch (error){
            console.log("error: ",error)
            expect(error.details).contains ("permission denied. Required: minter");
        }
    });
    it.skip('Permission denied: Minter2 mint with token1 ', async () => {
        const generateRequest = {
            sc_address: scAddress1,
            token_type: '0',
            from_address: minter2.address,
            to_address: accounts.To1,
            amount: 10
        };
        console.log("generateMintRequest:", generateRequest)
        try {
            await client3.generateMintProof(generateRequest,minter2Meta);
        }catch (error){
            console.log("error: ",error)
            expect(error.details).contains ("permission denied. Required: minter");
        }
    });

})

