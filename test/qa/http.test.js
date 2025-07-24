const chai = require('chai');
const { expect } = require("chai");
const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const axios = require('axios');
const {getSplitTokenList} = require("../help/testHelp");


const toAddress1 = accounts.To1;
const toAddress2 = accounts.To2;
const userInNode4 = '0xbA268f776F70caDB087e73020dfE41c7298363Ed';
const adminPrivateKey = hardhatConfig.networks.ucl_L2.accounts[1];
const node4AdminPrivateKey = hardhatConfig.networks.ucl_L2.accounts[10];
const httpUrl = 'http://qa-node3-http.hamsa-ucl.com:8080/v1';

const amount = 10;
const tokenType = 0
const scAddress = config.contracts.PrivateERCToken

async function createAuthHeaders(privateKey, messagePrefix = "login") {
    const wallet = new ethers.Wallet(privateKey);
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${messagePrefix}_${timestamp}`;
    const signature = await wallet.signMessage(message);

    return {
        'Content-Type': 'application/json',
        'Grpc-Metadata-Address': wallet.address.toLowerCase(),
        'Grpc-Metadata-Signature': signature,
        'Grpc-Metadata-Message': message
    };
}
async function sendHttpRPC(endpoint, body, headers) {
    const fullUrl = `${httpUrl}${endpoint}`;
    try {
        console.log(`Sending request to ${fullUrl}`);
        const response = await axios.post(fullUrl, body, {
            headers: headers,
            timeout: 15000
        });
        console.log('Response:', response.data);
        return response.data;
    } catch (error) {
        console.error(`Failed to call ${endpoint}:`, error.response?.data || error.message);
        throw error;
    }
}
async function DirectMint(toAddress, amount){
    const minterHeaaders = await createAuthHeaders(accounts.MinterKey)
    return sendHttpRPC('/direct/mint', {
        scAddress: scAddress,
        toAddress: toAddress,
        amount: amount
    }, minterHeaaders)
}
async function DirectTranfer(fromPrivateKey,fromAddress,toAddress, amount){
    const fromHeaaders = await createAuthHeaders(fromPrivateKey)
    return sendHttpRPC('/direct/transfer', {
        scAddress: scAddress,
        fromAddress: fromAddress,
        toAddress: toAddress,
        amount: amount
    }, fromHeaaders)
}

async function DirectBurn(fromPrivateKey,fromAddress, amount){
    const fromHeaaders = await createAuthHeaders(fromPrivateKey)
    return sendHttpRPC('/direct/burn', {
        scAddress: scAddress,
        fromAddress: fromAddress,
        amount: amount
    }, fromHeaaders)
}

async function GenerateSplitToken(fromPrivateKey,scAddress,fromAddress,amount,toAddress){
    const fromHeaaders = await createAuthHeaders(fromPrivateKey)
    return sendHttpRPC('/split/token', {
        scAddress: scAddress,
        tokenType: tokenType,
        fromAddress: fromAddress,
        toAddress: toAddress,
        amount: amount
    }, fromHeaaders)
}

async function GetSplitToken(fromPrivateKey,requestId){
    const fromHeaaders = await createAuthHeaders(fromPrivateKey)
    return sendHttpRPC('/query/split/token', {
        requestId: requestId,
    }, fromHeaaders)
}

async function GetTokenActionStatus(fromPrivateKey,requestId){
    const fromHeaaders = await createAuthHeaders(fromPrivateKey)
    return sendHttpRPC('/query/token/status', {
        requestId: requestId,
    }, fromHeaaders)
}
async function GetSplitTokenList(fromPrivateKey,scAddress){
    const fromHeaaders = await createAuthHeaders(fromPrivateKey)
    const owner_wallet = new ethers.Wallet(fromPrivateKey);
    return sendHttpRPC('/query/split/tokens', {
        ownerAddress: owner_wallet.address,
        scAddress: scAddress
    }, fromHeaaders)
}

async function GetSplitTokenDetail(fromPrivateKey,tokenId){
    const fromHeaaders = await createAuthHeaders(fromPrivateKey)
    return sendHttpRPC('/query/split/tokens/detail', {
        tokenId: tokenId
    }, fromHeaaders)
}

async function GetAccount(address){
    const adminHeaders = await createAuthHeaders(adminPrivateKey)
    return sendHttpRPC('/account/query', {
        accountAddress: address
    }, adminHeaders)
}

async function GetAddressBalance(ownerAddress,scAddress){
    const adminHeaders = await createAuthHeaders(adminPrivateKey)
    const reponse = await sendHttpRPC('/query/balance', {
        ownerAddress: ownerAddress,
        scAddress: scAddress
    }, adminHeaders)
    return Number(reponse.balance)
}

async function DecodeElgamalAmount(ElGamal){
    const adminHeaders = await createAuthHeaders(adminPrivateKey)
    return sendHttpRPC('/elgamal/decode', {
        ElGamal: ElGamal
    }, adminHeaders)
}


async function RegisterAccount(address,roles){
    const adminHeaders = await createAuthHeaders(adminPrivateKey)
    return sendHttpRPC('/account/register', {
        accountAddress: address,
        accountRoles: roles
    })
}
async function UpdateAccountStatus(address,status){
    const adminHeaders = await createAuthHeaders(adminPrivateKey)
    return sendHttpRPC('/account/update/status', {
        accountAddress: address,
        accountStatus: status
    })
}
async function UpdateAccountRoles(address,roles){
    const adminHeaders = await createAuthHeaders(adminPrivateKey)
    return sendHttpRPC('/account/update/role', {
        accountAddress: address,
        accountRoles: roles
    })
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function waitForTokenActionStatus(privateKey,requestId){
    while (true) {
        try {
            const result = await GetTokenActionStatus(privateKey,requestId);
            if (result.status === "TOKEN_ACTION_STATUS_SUC") {
                console.log("Token action completed successfully.");
                return result;
            } else if (result.status === "TOKEN_ACTION_STATUS_FAIL") {
                throw new Error("Token action failed.");
            } else {
                console.log(`Current status: ${result.status}. Waiting...`);
                await sleep(5000); // 等待5秒后继续查询
            }
        } catch (error) {
            console.error("Error while checking token action status:", error);
            throw error;
        }
    }
}


describe('Mint,Transfer,Burn Flows', function () {
    let adminHeaders,minterHeaders,spenderHeaders,to1Headers
    before(async function () {
        adminHeaders = await createAuthHeaders(adminPrivateKey)
        // minterHeaders = await createAuthHeaders(accounts.MinterKey)
        spenderHeaders = await createAuthHeaders(accounts.Spender1Key)
        to1Headers = await createAuthHeaders(accounts.To1PrivateKey);
    })
    it('DirectMint ', async () => {
        const preBalance = await GetAddressBalance(accounts.Minter,scAddress);
        let tx = await DirectMint(accounts.Minter, amount);
        let requestId = tx.requestId;
        await waitForTokenActionStatus(accounts.MinterKey,requestId);
        const postBalance = await GetAddressBalance(accounts.Minter,scAddress);
        expect(postBalance).equal(preBalance + amount);
    });
    it('Direct Transfer from minter to to1 ',async () => {
        const preBalanceFrom = await GetAddressBalance(accounts.Minter,scAddress);
        const preBalanceTo = await GetAddressBalance(accounts.To1,scAddress);
        let tx = await DirectTranfer(accounts.MinterKey,accounts.Minter,accounts.To1,amount);
        let requestId = tx.requestId;
        await waitForTokenActionStatus(accounts.MinterKey,requestId);
        const postBalanceFrom = await GetAddressBalance(accounts.Minter,scAddress);
        const postBalanceTo = await GetAddressBalance(accounts.To1,scAddress);
        expect(postBalanceFrom).equal(preBalanceFrom - amount);
        expect(postBalanceTo).equal(preBalanceTo + amount);
    });

    it('Direct Transfer from minter to user cross bank ',async () => {
        const preBalanceFrom = await GetAddressBalance(accounts.Minter,scAddress);
        let tx = await DirectTranfer(accounts.MinterKey,accounts.Minter,userInNode4,amount);
        let requestId = tx.requestId;
        await waitForTokenActionStatus(accounts.MinterKey,requestId);
        const postBalanceFrom = await GetAddressBalance(accounts.Minter,scAddress);
        expect(postBalanceFrom).equal(preBalanceFrom - amount);
    });
    it('Direct Transfer from to1 to user cross bank ',async () => {
        const preBalanceFrom = await GetAddressBalance(accounts.To1,scAddress);
        let tx = await DirectTranfer(accounts.To1PrivateKey,accounts.To1,userInNode4,amount);
        let requestId = tx.requestId;
        await waitForTokenActionStatus(accounts.To1PrivateKey,requestId);
        const postBalanceFrom = await GetAddressBalance(accounts.To1,scAddress);
        expect(postBalanceFrom).equal(preBalanceFrom - amount);
    });

    it('Direct Burn ',async () => {
        const preBalance = await GetAddressBalance(accounts.Minter,scAddress);
        let tx = await DirectBurn(accounts.MinterKey,accounts.Minter,amount);
        let requestId = tx.requestId;
        await waitForTokenActionStatus(accounts.MinterKey,requestId);
        const postBalance = await GetAddressBalance(accounts.Minter,scAddress);
        expect(postBalance).equal(preBalance - amount);
    });

});

describe('Split token flow', function () {
    let adminHeaders,minterHeaders,spenderHeaders,to1Headers
    before(async function () {
        adminHeaders = await createAuthHeaders(adminPrivateKey)
        // minterHeaders = await createAuthHeaders(accounts.MinterKey)
        spenderHeaders = await createAuthHeaders(accounts.Spender1Key)
        to1Headers = await createAuthHeaders(accounts.To1PrivateKey);
    })
    it.only('Split token ',async () => {
        let tx = await GenerateSplitToken(accounts.MinterKey,scAddress,accounts.Minter, amount, accounts.To1);
        console.log(tx)
        tx = await GetSplitTokenList(accounts.MinterKey,scAddress)
        console.log(tx)
    });

})
