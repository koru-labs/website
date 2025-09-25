const { expect } = require("chai");
const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')

//qa
const rpcUrl_node3 = "qa-node3-rpc.hamsa-ucl.com:50051"
const L1Url = hardhatConfig.networks.ucl_L2_qa.url;
const adminPrivateKey = hardhatConfig.networks.ucl_L2_qa.accounts[1];
//dev

const l1CustomNetwork = {
    name: "BESU",
    chainId: 1337
};
const options = {
    batchMaxCount: 1,
    staticNetwork: true
};
const l1Provider = new ethers.JsonRpcProvider(L1Url, l1CustomNetwork, options);
const {
    callPrivateMint,
    createAuthMetadata,
    registerUser,
    getAccount,
    getAddressBalance2, updateAccountStatus, updateAccountRole,
} = require("../help/testHelp")
const {address, hexString} = require("hardhat/internal/core/config/config-validation");

const amount = 10;
const client3 = createClient(rpcUrl_node3)
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

describe("Authorization test cases",async function (){
    this.timeout(1200000);
    const scAddress1 = '0x2a85A14cB9Fefdf55f2Bb8550FEAe8f1C8595697';
    const scAddress2 = '0xE777fAf8240196bA99c6e2a89E8F24B75C52Eb2a';
    const minter1 = ethers.Wallet.createRandom();
    const minter2 = ethers.Wallet.createRandom();
    const normal = ethers.Wallet.createRandom();
    const newAdmin = ethers.Wallet.createRandom();
    const minter1Wallet = new ethers.Wallet(minter1.privateKey, l1Provider);
    const minter2Wallet = new ethers.Wallet(minter2.privateKey, l1Provider);
    const normalWallet = new ethers.Wallet(normal.privateKey, l1Provider);
    const newAdminWallet = new ethers.Wallet(newAdmin.privateKey, l1Provider);
    const minter1Meta = await createAuthMetadata(minter1.privateKey);
    const minter2Meta = await createAuthMetadata(minter2.privateKey);
    const normalMeta = await createAuthMetadata(normal.privateKey);
    const minterMeta = await createAuthMetadata(accounts.MinterKey);
    const minterWallet = new ethers.Wallet(accounts.MinterKey, l1Provider);

    const newAdminMeta = await createAuthMetadata(newAdmin.privateKey);
    const adminMeta = await createAuthMetadata(adminPrivateKey);

    describe("mint permission", async function () {
        this.timeout(120000);

        it("Success:register user with different role", async function () {
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

            console.log("register normal...")
            await registerUser(adminPrivateKey,client3, normalWallet.address, "normal");
            await sleep(10000);
            response = await getAccount(adminPrivateKey,client3, normalWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("normal");

            console.log("register admin...")
            await registerUser(adminPrivateKey,client3, newAdmin.address, "admin");
            await sleep(10000);
            response = await getAccount(adminPrivateKey,client3, newAdminWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("admin");

        });
        it("Success:set minteAllowance with different role", async function () {

            console.log("set minterAllowance for minter1 at scAddress1...")
            await setMinterAllowed( minter1Wallet.address, scAddress1);
            await sleep(10000);
            let response = await getMinterAllowed(minter1Wallet.address, scAddress1, minter1Meta);

            console.log("set minterAllowance for minter2 at scAddress2...")
            await setMinterAllowed( minter2Wallet.address, scAddress2);
            await sleep(10000);
            response = await getMinterAllowed(minter2Wallet.address, scAddress2, minter2Meta);

            console.log("set minterAllowance for normal at scAddress2...")
            await setMinterAllowed( normalWallet.address, scAddress2);
            await sleep(10000);
            response = await getMinterAllowed(normalWallet.address, scAddress2, adminMeta);

        });
        it('Success: Minter1 has permission to mint with scAddress1', async () => {
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
        it('Success: Minter2 has permission to mint with scAddress2', async () => {
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
        it('Success: normal setted allowance has permission to mint with scAddress2', async () => {
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
        it('Permission denied: Minter1 mint with scAddress2 ', async () => {
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
        it('Permission denied: Minter2 mint with scAddress1 ', async () => {
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
        it('Permission denied: admin not set allowance mint with scAddress ', async () => {
            const generateRequest = {
                sc_address: scAddress1,
                token_type: '0',
                from_address: newAdminWallet.address,
                to_address: accounts.To1,
                amount: 10
            };
            console.log("generateMintRequest:", generateRequest)
            try {
                await client3.generateMintProof(generateRequest,newAdminMeta);
            }catch (error){
                console.log("error: ",error)
                expect(error.details).contains ("permission denied. Required: minter");
            }
        });
    });
    describe('Registe permission',async function (){
        this.timeout(120000);
        it('Repeat registration with different role ',async () => {
            const wallet = ethers.Wallet.createRandom();
            await registerUser(adminPrivateKey,client3, wallet.address, "minter");
            // await registerUser(adminPrivateKey,client, accounts.Minter, "minter");
            await sleep(10000);
            let response = await getAccount(adminPrivateKey,client3, wallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("minter");

            await registerUser(adminPrivateKey,client3, wallet.address, "normal");
            await sleep(10000);
            response = await getAccount(adminPrivateKey,client3, wallet.address);
            console.log(response);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("minter,normal");
        });
        it('Repeat registration with same role ',async () => {
            const wallet = ethers.Wallet.createRandom();
            await registerUser(adminPrivateKey,client3, wallet.address, "minter");
            await sleep(10000);
            let response = await getAccount(adminPrivateKey,client3, wallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("minter");

            await registerUser(adminPrivateKey,client3, wallet.address, "minter");
            await sleep(10000);
            response = await getAccount(adminPrivateKey,client3, wallet.address);
            console.log(response);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("minter");

            //Same role , different order
            await registerUser(adminPrivateKey,client3, wallet.address, "minter,normal");
            await sleep(10000);
            response = await getAccount(adminPrivateKey,client3, wallet.address);
            console.log(response);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("minter,normal");

            await registerUser(adminPrivateKey,client3, wallet.address, "normal,minter");
            await sleep(10000);
            response = await getAccount(adminPrivateKey,client3, wallet.address);
            console.log(response);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("minter,normal");
        });

    });
    describe("Admin role permission", function () {
        this.timeout(1200000);
        const userWallet = ethers.Wallet.createRandom();
        it('Registe user with new admin auth ', async () => {
            const key = newAdminWallet.privateKey;
            await registerUser(key,client3, userWallet.address, "normal");
            await sleep(10000);
            let response = await getAccount(key,client3, userWallet.address);
            console.log("user account: ",response)
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("normal");
        });
        it('Update user status to inactive with admin auth', async () => {
            await updateAccountStatus(adminPrivateKey,client3,userWallet.address,0);
            await sleep(4000);
            let response = await getAccount(adminPrivateKey,client3, userWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_INACTIVE");
        });
        it('Update user status to active with admin auth', async () => {
            await updateAccountStatus(adminPrivateKey,client3,userWallet.address,2);
            await sleep(4000);
            let response = await getAccount(adminPrivateKey,client3, userWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
        });
        it('Update user role: normal,minter,admin',async () => {
            // normal -> minter
            await updateAccountRole(adminPrivateKey,client3,userWallet.address,'minter')
            let response = await getAccount(adminPrivateKey,client3, userWallet.address);
            console.log( response)
            expect(response.account_roles).equal("minter");
            // minter -> admin,normal
            await updateAccountRole(adminPrivateKey,client3,userWallet.address,'admin,normal')
            response = await getAccount(adminPrivateKey,client3, userWallet.address);
            expect(response.account_roles).equal("admin,normal");
            // admin -> minter
            await updateAccountRole(adminPrivateKey,client3,userWallet.address,'admin')
            response = await getAccount(adminPrivateKey,client3, userWallet.address);
            expect(response.account_roles).equal("admin");
            //minter -> normal
            await updateAccountRole(adminPrivateKey,client3,userWallet.address,'normal')
            response = await getAccount(adminPrivateKey,client3, userWallet.address);
            expect(response.account_roles).equal("normal");
        });
        it('Should reverted: update user role normal -> normal ', async () => {
            let response =  await updateAccountRole(adminPrivateKey,client3,userWallet.address,'normal')
            expect(response.status).to.equal("ASYNC_ACTION_STATUS_FAIL");
            expect(response. message).to.include(" account already has role");
        });
        it('admin can check all role account ', async () => {
            let response = await getAccount(adminPrivateKey,client3, newAdminWallet.address)
            expect(response).to.have.property('account_address', newAdminWallet.address.toLowerCase());

            response = await getAccount(adminPrivateKey,client3,minter1.address )
            expect(response).to.have.property('account_address', minter1.address.toLowerCase());

            response = await getAccount(adminPrivateKey,client3,normalWallet.address )
            expect(response).to.have.property('account_address', normalWallet.address.toLowerCase());

        });

    })
    describe("Normal role permission", function () {
        this.timeout(1200000)
        const newUser = ethers.Wallet.createRandom()
        const userKey = newUser.privateKey;
        it('Should reverted: Use normal auth to registe account',async ()=>{
            const normalMetadata = await createAuthMetadata(normalWallet.privateKey);
            const request = {
                account_address: newUser.address,
                account_role: 'normal',//minter,admin,normal
            };
            expect( await client3.registerAccount(request, normalMetadata)).reverted

        })
        it('should reverted: update user status with normal auth', async () => {
            try {
                await updateAccountStatus(userKey,client3,normalWallet.address,2);
            }catch (err){
                expect(err.details).to.include('permission denied')
            }
        });
        it('Should reverted: update user role with normal user auth ', async () => {
            try {
                await updateAccountRole(normalPrivateKey,client3,normalWallet.address,'minter')
            }catch (error){
                expect(err.details).to.include('permission denied')
            }
        });
        it('normal can check itself ', async () => {
            let response = await getAccount(normalPrivateKey,client3, normalWallet.address)
            expect(response).to.have.property('account_address', normalWallet.address.toLowerCase());
        });
        it('normal can not check others', async () => {
            try {
                await getAccount(normalPrivateKey,client3, minterWallet.address)
            }catch (error){
                expect(error.details).to.include('current user is not the owner of the resource');
            }

            try {
                await getAccount(normalPrivateKey,client3, adminWallet.address)
            }catch (error){
                expect(error.details).to.include('current user is not the owner of the resource');
            }
        });
        it('Should reverted: mint proof with normal user auth', async () => {
            const generateRequest = {
                from_address: accounts.Minter,
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                to_address: accounts.To1,
                amount: 10
            };
            try {
                await client3.generateMintProof(generateRequest,normalMeta);
            }catch (error){
                expect(error.details).to.include('permission denied')
            }
        });
    })
    describe('Grpc api with meta',async function (){


    });
    describe('Grpc api without meta',async function (){
        it.only('generateMintProof',async ()=> {
            await mintBy(accounts.To1,100,minterWallet,config.contracts.PrivateERCToken)
            const generateRequest = {
                from_address: accounts.Minter,
                sc_address: config.contracts.PrivateERCToken,
                token_type: '0',
                to_address: accounts.To1,
                amount: amount
            };
            try {
                await client3.generateMintProof(generateRequest,minterMeta);
            }catch (error){
                console.log(error)
            }

        });
    });
})


