const hre = require("hardhat");
const {ethers} = hre;
const chai = require("chai");
const expect = chai.expect;
const hardhatConfig = require('../hardhat.config');
const Web3 = require('web3')
const {web3} = require("@openzeppelin/test-helpers/src/setup");
//token contract address
const dvtA = "0xbc2BE65EF422999c6218C766e90831DDB483d43B";

const dvtAEscortingAddress = "0x02f7aC504d940bb1f8C84724502745c787d6BaFa";

const bankA = hardhatConfig.networks.dev_ucl.accounts[1];
const client1 = hardhatConfig.networks.dev_ucl.accounts[2];
const client3 = hardhatConfig.networks.dev_ucl.accounts[3];
//node rpc url
const bankARpcUrl = hardhatConfig.networks.dev_ucl.url;

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

let HamsaTokenFactory,DvpEscortingFactory;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('eth_chainId',function (){
    this.timeout(120000)
    it('get chain id success', async () => {
        let tx = await bankAProvider.send('eth_chainId')
        console.log("chain id is ",parseInt(tx.substring(2), 16))
        expect(parseInt(tx.substring(2), 16)).equal(customNetwork.chainId)
    });
})

describe('eth_syncing',function (){
    this.timeout(120000)
    it('get eth_syncing success', async () => {
        let tx = await bankAProvider.send('eth_syncing')
        console.log(tx)
        expect(tx).equal(false)
    });
})

describe('eth_getBlockByNumber',function (){
    this.timeout(120000)
    it('getBlockByNumber success', async () => {
        let tx = await bankAProvider.send('eth_getBlockByNumber',["latest", true])
        console.log(tx)
    });
})

describe('eth_getBlockByHash',function (){
    this.timeout(120000)
    it('getBlockByHash success', async () => {
        const parentHash = '0x472b0f67b26612d44986a491359fd811fdd532a9c87fb0b71d695625b035dbdc';
        let tx = await bankAProvider.send('eth_getBlockByHash',[parentHash, false])
        console.log(tx)
    });
})

describe('eth_blockNumber',function (){
    this.timeout(120000)
    it('getBlockNum success', async () => {
        let tx = await bankAProvider.send('eth_blockNumber')
        console.log("most recent block is ",parseInt(tx.substring(2), 16))
    });
})

describe('eth_gasPrice',function (){
    this.timeout(120000)
    it('get current gas price in wei success', async () => {
        let tx = await bankAProvider.send('eth_gasPrice')
        console.log("current gas price in wei is ",parseInt(tx.substring(2), 16))
    });
})

describe('eth_getBalance',function (){
    this.timeout(120000)
    let account
    it('get account balance success', async () => {
        let tx = await bankAProvider.send('eth_getBalance',[userAWallet.address, "latest"])
        console.log("userA balance is ",parseInt(tx.substring(2), 16))
    });
    it('get account zeroAddress', async () => {
        let tx = await bankAProvider.send('eth_getBalance',[ethers.ZeroAddress, "latest"])
        console.log("userA balance is ",parseInt(tx.substring(2), 16))
    });
    it('get account not exist', async () => {
        account = userAWallet.address + '1'
        console.log(account)
        let tx = await bankAProvider.send('eth_getBalance',[account, "latest"])
        console.log("userA balance is ",parseInt(tx.substring(2), 16))
    });
})

describe('eth_sendRawTransaction',function (){
    this.timeout(120000)
    it('eth_sendRawTransaction success', async () => {
        const sender = userAWallet.address
        const senderKey = client1
        const receiver  = userCWallet.address
        const amount = 1
        const value = ethers.parseEther(amount.toString());
        const gasLimit = await bankAProvider.estimateGas({
            from:sender,
            to:receiver,
            value:value
        })
        const nonce = await bankAProvider.getTransactionCount(sender)
        console.log("nonce is ",nonce)
        //transaction object
        const transactionObject = {
            to:receiver,
            gasLimit: 700000,
            gasPrice: 1000,
            nonce:nonce,
            value: value,
            type:0
            // maxFeePerGas: ethers.parseUnits('50', 'gwei'),
            // maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei'),
        };
        // let tx =await userAWallet.sendTransaction(transactionObject)
        // console.log(tx.hash)
        //sign
        const signedTxn = await userAWallet.signTransaction(transactionObject)
        // Send the signed transaction to the network
        try {
            let tx = await bankAProvider.send('eth_sendRawTransaction', [signedTxn]);
            console.log("Transaction Hash:", tx);

            // Optionally, wait for the transaction to be confirmed
            let receipt = await bankAProvider.waitForTransaction(tx);
            console.log("Transaction was mined in block", receipt.blockNumber);
        } catch (error) {
            console.error("Error sending transaction:", error);
        }
    });
})

describe('eth_getTransactionByHash',function (){
    this.timeout(120000)
    let transactionHash;
    before(async function(){
        HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
    })
    it("transfer", async () => {
        const amount = 100n;
        const token = HamsaTokenFactory.attach(dvtA).connect(userAWallet);
        //internal transfer
        let tx = await token.transfer(userCWallet.address, amount);
        await tx.wait()
        // assertion
        transactionHash = tx.hash
    })
    it('eth_getTransactionByHash success', async () =>{
        // const transactionHash = '0x1e36d68247ea197e214c6b7fd14388f84c8b4db76a51ef61dd0c913951378505';
        // const hash = '0x75595023db5e7edb5383d416f8e7cb56f8ade4e95b666af01ff7f6b812dfa8fb';
        let tx = await bankAProvider.send('eth_getTransactionByHash',[transactionHash])
        // let tx = await bankAProvider.getTransactionResult(transactionHash)
        console.log(tx)
    })
})

describe('eth_getTransactionReceipt',function (){
    this.timeout(120000)
    let transactionHash;
    before(async function(){
        HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
    })
    it("transfer", async () => {
        const amount = 100n;
        const token = HamsaTokenFactory.attach(dvtA).connect(userAWallet);
        //internal transfer
        let tx = await token.transfer(userCWallet.address, amount);
        await tx.wait()
        // assertion
        transactionHash = tx.hash
    })
    it('eth_getTransactionReceipt success', async () =>{
        // const hash = '0x6abc9685ecf4e862232e3eb4957968ceb48d6b23558e602433e8d230d92bb09b';
        // const hash = '0x75595023db5e7edb5383d416f8e7cb56f8ade4e95b666af01ff7f6b812dfa8fb';
        let tx = await bankAProvider.send('eth_getTransactionReceipt',[transactionHash])
        // let tx = await bankAProvider.getTransactionResult(transactionHash)
        console.log(tx)
    })
})

describe('eth_getTransactionCount',function (){
    this.timeout(120000)
    it('get account transactionCount success', async () => {
        let tx = await bankAProvider.send('eth_getTransactionCount',[userAWallet.address,"latest"])
        console.log("account current transactionCount is  ",parseInt(tx.substring(2), 16))
    });
})

describe('eth_getBlockTransactionCountByNumber',function (){
    this.timeout(120000)
    it('getBlockTransactionCountByNumber success', async () => {
        let tx = await bankAProvider.send('eth_getBlockTransactionCountByNumber',["latest"])
        console.log("account current transactionCount is  ",tx)
    });
})

describe('eth_getLogs',function (){
    this.timeout(120000)
    it('eth_getLogs success', async () => {
        let tx = await bankAProvider.send('eth_getLogs',[])
        console.log("log  ",tx)
    });
})

// describe('eth_getCode fail',function (){
//     this.timeout(120000)
//     it('eth_getCode success', async () => {
//         let tx = await bankAProvider.send('eth_getCode',[dvtA,"latest"])
//         // let tx = await bankAProvider.getCode(userAWallet.address,'latest')
//         // let tx = await bankAProvider.getCode('0x4200000000000000000000000000000000000015','latest')
//         console.log("code is ",tx)
//     });
// })

describe('eth_call',function (){
    this.timeout(120000)
    it('eth_call token balanceOf success', async () => {
        HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
        let TokenInstance = HamsaTokenFactory.attach(dvtA).connect(bankAProvider)
        let account = userCWallet.address
        const userBalance = await TokenInstance.balanceOf(account)
        const functionSelect = web3.eth.abi.encodeFunctionSignature('balanceOf(address)')
        const functionData = functionSelect+ethers.zeroPadValue(userCWallet.address, 32).slice(2);
        const params = {
            to:dvtA,
            data: functionData
        }
        let tx = await bankAProvider.send('eth_call',[params,'latest'])
        console.log("call result is ",tx)
        const eth_call_balance = parseInt(tx.substring(2), 16)
        expect(eth_call_balance).equal(userBalance)
    });
})

// describe.only('eth_getStorageAt fail',function (){
//     this.timeout(120000)
//     const contractAddress =
//     it('eth_getStorageAt success', async () => {
//         const HamsaTokenFactory = await ethers.getContractFactory("HamsaToken");
//         const tokenInstance = HamsaTokenFactory.attach(dvtA).connect(bankAProvider);
//         let tx = await bankAProvider.send('eth_getStorageAt',[dvtA,0x53,'latest'])
//         console.log("call result is ",tx)
//     });
//     it('eth_getStorageAt2 success', async () => {
//         let tx = await bankAProvider.getStorage(dvtA,0n,'latest')
//         console.log("call result is ",tx)
//     });
// })

describe('eth_estimateGas',function (){
    this.timeout(120000)
    it('eth_estimateGas success', async () => {
        const estimate = await bankAProvider.estimateGas({
            "from": userAWallet.address,
            "to": userCWallet.address,
            "value": "0x1",
        });
        console.log(estimate);
    });
    it('eth_estimateGas success', async () => {
        const functionSelect = web3.eth.abi.encodeFunctionSignature('balanceOf(address)')
        const params = {
            "from": userAWallet.address,
            "to": userCWallet.address,
            "value": "0x1",
        }
        let tx = await bankAProvider.send('eth_estimateGas',[params,'latest'])
        console.log("call result is ",parseInt(tx.substring(2), 16))
    });
})

