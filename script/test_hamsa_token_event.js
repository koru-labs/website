const hre = require("hardhat");
const {ethers} = hre;
const p = require('poseidon-lite');
const crypto = require("crypto");
const assert = require('assert');
const {Wallet} = require("ethers");
const chai = require("chai");
const expect = chai.expect;
const hardhatConfig = require('../hardhat.config');

//token contract address
const dvtA = "0xac07D22807D759246e7402DF60964cBC915d6A64";
// const dvtA = "0xBA5f71671bd4ED783E0482f3Da1FfF1E96DB5f2B";

const dvtAEscortingAddress = '0x80245F9D2e2950b028c53A4Bd1851045ff2F53d3';

const bankA = hardhatConfig.networks.server_L2_1.accounts[1];
const client1 = hardhatConfig.networks.server_L2_1.accounts[2];
const client3 = hardhatConfig.networks.server_L2_1.accounts[3];
const adminPrivateKey = hardhatConfig.networks.server_L2_1.accounts[0];
//node rpc url
const bankARpcUrl = hardhatConfig.networks.server_L2_2.url;

const customNetwork = {
    name: "UCL",
    chainId: 1001
};

const options = {
    batchMaxCount: 1,
    staticNetwork: true
};

// provider
const bankAProvider = new ethers.JsonRpcProvider(bankARpcUrl, customNetwork, options);
//wallet
const userAWallet = new ethers.Wallet(client1,bankAProvider);
const userCWallet = new ethers.Wallet(client3,bankAProvider);
const adminWallet = new ethers.Wallet(adminPrivateKey,bankAProvider);
const bankAWalletOfDvtA = new ethers.Wallet(bankA, bankAProvider);
let HamsaTokenFactory

async function mintToken(provider,tokenAddress,userWallet,amount){
    HamsaTokenFactory = await ethers.getContractFactory("HamsaToken")
    let HamsaToken = await HamsaTokenFactory.attach(tokenAddress).connect(userWallet);
    const tx = await HamsaToken.mint(userWallet.address, amount);
    await tx.wait();
}

async function getTokenBalance(provider, tokenAddress, account) {
    // Get the contract factory for HamsaToken.
    HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
    // Attach the contract factory to the provided token address and connect it to the provider.
    let HamsaToken = await HamsaTokenFactory.attach(tokenAddress).connect(provider);
    // Get the balance of the specified account for the attached token contract.
    let balance = await HamsaToken.balanceOf(account);
    // Return the balance.
    return balance;
}

describe.only('Test internal transfer within a bank ', function () {
    this.timeout(120000);
    before(async function () {
        HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
    })
    it("mint", async () => {
        const amount = 20000;
        console.log("------------ start to mint dvtA to userA ------------")
        let tokenBefore = await getTokenBalance(bankAProvider, dvtA, userAWallet.address);
        console.log("userA token balance before mint is : ", tokenBefore);
        await mintToken(bankAProvider, dvtA, userAWallet, amount);
        let tokenAfter = await getTokenBalance(bankAProvider, dvtA, userAWallet.address);
        console.log("user dvtA token balance after mint is : ", tokenAfter);
        let increase = parseInt(tokenAfter.toString()) - parseInt(tokenBefore.toString());
        assert.strictEqual(increase, amount, 'Mint operation failed. Token balance increase is not as expected.');
    })
    it("transfer", async () => {
        const amount = 100n;
        const token = HamsaTokenFactory.attach(dvtA).connect(userAWallet);
        let tokenBeforeA = await getTokenBalance(bankAProvider, dvtA, userAWallet.address);
        let tokenBeforeC = await getTokenBalance(bankAProvider, dvtA, userCWallet.address);
        //internal transfer
        let tx = await token.transfer(userCWallet.address, amount);
        await tx.wait()
        // assertion
        let tokenAfterA = await getTokenBalance(bankAProvider, dvtA, userAWallet.address);
        let tokenAfterC = await getTokenBalance(bankAProvider, dvtA, userCWallet.address);

        expect(tokenAfterC - tokenBeforeC).equal(amount, 'After tranfer, recevier token balance should increase');
        expect(tokenBeforeA - tokenAfterA).equal(amount, 'After tranfer, sender token balance should increase');
    })
    it('burn', async function () {
        const amount = 100n;
        console.log('------------ start to burn dvtA  ------------');
        try {
            let tokenBefore = await getTokenBalance(bankAProvider, dvtA, userAWallet.address);
            console.log('userA token balance before burn is : ', tokenBefore);
            const token = HamsaTokenFactory.attach(dvtA).connect(userAWallet);
            let tx = await token.burn(amount);
            await tx.wait()
            console.log(tx.hash)
            let tokenAfter = await getTokenBalance(bankAProvider, dvtA, userAWallet.address);
            console.log('user dvtA token balance after burn is : ', tokenAfter);
            const descrease = tokenBefore - tokenAfter;
            expect(descrease).to.equal(amount);
        } catch (error) {
            console.error('Burn operation failed:', error);
            expect.fail('Burn operation failed. Token balance decrease is not as expected.');
        }
    })
    it('approve', async function () {
        const amount = 100n;
        console.log('------------ start to approve dvtA  ------------');
        try {
            const token = HamsaTokenFactory.attach(dvtA).connect(userAWallet);
            let txApprove = await token.approve(dvtAEscortingAddress, amount);
            await txApprove.wait();
        } catch (error) {
            console.error('approve operation failed:', error);
        }
    })
    it('deposit', async function () {
        const amount = 100n;
        console.log('------------ start to deposit dvtA  ------------');
        try {
            const token = HamsaTokenFactory.attach(dvtA).connect(userAWallet);
            console.log('userA token balance before deposit is : ', await getTokenBalance(bankAProvider,dvtA,userAWallet.address));
            let txDeposit = await token.deposit(userAWallet.address,bankAWalletOfDvtA.address, amount);
            await txDeposit.wait();
            console.log('userA token balance after deposit is : ', await getTokenBalance(bankAProvider,dvtA,userAWallet.address));
        } catch (error) {
            console.error('deposit operation failed:', error);
        }
    })
    it('withdraw', async function () {
        const amount = 100n;
        console.log('------------ start to withdraw dvtA  ------------');
        try {
            const token = HamsaTokenFactory.attach(dvtA).connect(userAWallet);
            console.log('userA token balance before withdraw is : ', await getTokenBalance(bankAProvider,dvtA,userAWallet.address));
            let txDeposit = await token.withdraw(userAWallet.address,bankAWalletOfDvtA.address, amount);
            await txDeposit.wait();
            console.log('userA token balance after withdraw is : ', await getTokenBalance(bankAProvider,dvtA,userAWallet.address));
        } catch (error) {
            console.error('withdraw operation failed:', error);
        }
    })
    it('freezeAccount', async function () {
        const amount = 100n;
        console.log('------------ start to freezeAccount  ------------');
        try {
            // const adminWallet = new ethers.Wallet(admin, bankAProvider);
            const token = HamsaTokenFactory.attach(dvtA).connect(adminWallet);
            let tx = await token.freezeAccount(adminWallet.address,userAWallet.address, amount);
            await tx.wait();
        } catch (error) {
            console.error('freezeAccount operation failed:', error);
        }
    })
    it('unfreezeAccount', async function () {
        const amount = 100n;
        console.log('------------ start to unfreezeAccount  ------------');
        try {
            const token = HamsaTokenFactory.attach(dvtA).connect(adminWallet);
            let txDeposit = await token.unfreezeAccount(adminWallet.address,userAWallet.address, amount);
            await txDeposit.wait();
        } catch (error) {
            console.error('unfreezeAccount operation failed:', error);
        }
    })
})