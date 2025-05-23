const hre = require("hardhat");
const { ethers } = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const {createClient} = require('../qa/token_grpc');
const testUtils = require('../qa/testUtils');
const { expect } = require('chai');

const userA = '0xACFa9A52a0F11E8a1E7DaE8789DD43C58476E5BC'
const userB = '0xb7F31438c2B381b1852895BE929626aea45B4660'

const l1CustomNetwork = {
    name: "BESU",
    chainId: 1337
};
const options = {
    batchMaxCount: 1,
    staticNetwork: true
};
const rpcUrl ='aa4db6db10866450fb6685fb175e72f9-423262944.us-west-1.elb.amazonaws.com:50051'
// const rpcUrl ='localhost:50051'
const client = createClient(rpcUrl)

const scAddress = config.contracts.PrivateERCToken;
const provider = new ethers.JsonRpcProvider(hardhatConfig.networks.ucl_node2.url, l1CustomNetwork, options)
// const circleWallet = new ethers.Wallet(hardhatConfig.networks.ucl_node2.accounts[0], provider);
// const managerWallet = new ethers.Wallet(hardhatConfig.networks.ucl_node2.accounts[1], provider);
// const minterWallet = new ethers.Wallet(hardhatConfig.networks.ucl_node2.accounts[2], provider);

const masterMinterWallet = new ethers.Wallet(hardhatConfig.networks.ucl_node2.accounts[1], provider);
const minterWallet = new ethers.Wallet(hardhatConfig.networks.ucl_node2.accounts[2], provider);
const spenderWallet = new ethers.Wallet(hardhatConfig.networks.ucl_node2.accounts[3], provider);


describe.skip("Minter allowance", function () {
    this.timeout(120000);
    it("Step1 : set 10000 allowance to minter", async function () {
        await testUtils.setMinter();
    });
    it("Step2 : set 10000 allowance to minter again,it should keep 10000,", async function () {
        await testUtils.mintToken(userA, 100);
    })
    it("Step3 : after mint to user,allowance should descrease", async function () {
        await testUtils.setMinter();
    })
    it("Step4 : set a small amount", async function () {
        await testUtils.setMinter();
    })
    it("Step5 : set a big amount", async function () {
        await testUtils.setMinter();
    });
    it("Step6 : set a negative amount", async function () {
        await testUtils.setMinter();
    });
    it("Step7 : set a zero amount", async function () {
        await testUtils.setMinter();
    })

});

describe("Mint", function () {
    this.timeout(1200000);
    // before(async function () {
    //
    // });
    it.skip("Step1 : set 10000 allowance to minter", async function () {
        await testUtils.setMinter();
    });
    it.only("Step2 : mint 100 tokens to userA", async function () {
        await testUtils.mintToken(userA, 200);
    });
    it("Step3 : mint 200 tokens to userB", async function () {
        await testUtils.mintToken(userB, 200);
    });

    it("Step4 : mint amount > minter allowance", async function () {
        try {
            await testUtils.mintToken(userA, 10001)
        }
        catch (e) {
            expect(e.message).to.equal("Error: 3:insufficient allowance")
        }
    });
    it("Step5 : try to mint 0 ", async function () {
        try {
            await testUtils.mintToken(userA, 0)
        }
        catch (e) {
            expect(e.message).to.equal("Error: 3:insufficient allowance")
        }
    });
    it("Step6 : try to mint all allowance amount", async function () {
        await testUtils.mintToken(userA, 100);
    });

});