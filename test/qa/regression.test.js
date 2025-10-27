const {expect} = require("chai");
const {ethers, network} = require('hardhat');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')

// 获取当前网络并动态设置 scAddress
function getCurrentNetworkStage() {
    const fullName = network.name; // 这就是 'ucl_L2_prod'
    const stage = fullName.split('_').pop();
    console.log(`Using network: ${fullName} → stage: ${stage}`);
    return stage;
}
const currentNetwork = getCurrentNetworkStage();
console.log("currentNetwork:", currentNetwork)
function getConfigurationForNetwork() {
    const currentNetwork = getCurrentNetworkStage();

    // 根据网络名称选择对应的配置文件
    switch(currentNetwork) {
        case 'dev':
            return require("../../script/dev_configuration");
        case 'qa':
            return require("../../script/qa_configuration");
        case 'demo':
            return require("../../script/demo_configuration");
        case 'prod':
            return require("../../script/prod_configuration");
        default:
            return require("../../script/dev_configuration");
    }
}


const configuration = getConfigurationForNetwork();
console.log("configuration:", configuration)
// find node3 institution
const node3Institution = configuration.institutions.find(institution => institution.name === "Node3");
if (!node3Institution) {
    throw new Error("Node3 institution not found in config");
}
// find node4 institution
const node4Institution = configuration.institutions.find(institution => institution.name === "Node4");
if (!node3Institution) {
    throw new Error("Node4 institution not found in config");
}
const rpcUrl_node3 = node3Institution.rpcUrl;
const rpcUrl_node4 = node4Institution.rpcUrl;
const adminPrivateKey = node3Institution.ethPrivateKey;

const scAddress = config[currentNetwork]?.contracts?.PrivateERCToken;
const client3 = createClient(rpcUrl_node3)
const client4 = createClient(rpcUrl_node4)
const node4AdminPrivateKey = node4Institution.ethPrivateKey;


const {
    callPrivateMint,
    callPrivateTransfer,
    callPrivateBurn,
    callPrivateCancel,
    getMinterAllowed,
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
    callPrivateTransferFrom,
    callPrivateRevoke,
    // getApprovedAllowance,
    allowBanksInTokenSmartContract,
    setMinterAllowed,
    getUserManager,
    assertEventsContain, isAllowanceExists, getApproveTokenList,
    callPrivateTransfers,
    getAddressBalance
} = require("../help/testHelp")
const {address, hexString} = require("hardhat/internal/core/config/config-validation");
const {bigint} = require("hardhat/internal/core/params/argumentTypes");

const l1Provider = ethers.provider;
const adminWallet = new ethers.Wallet(accounts.OwnerKey, l1Provider);
const minterWallet = new ethers.Wallet(accounts.MinterKey, l1Provider);
const spender1Wallet = new ethers.Wallet(accounts.Spender1Key, l1Provider);

const to1Wallet = new ethers.Wallet(accounts.To1PrivateKey, l1Provider);
const toAddress1 = accounts.To1;


const toAddress2 = accounts.To2;
const userInNode4 = node4Institution.users[0].address

const amount = 10;
let preBalance, postBalance;
let preAllowance, postAllowance;

async function mint(address, amount) {
    const minterMeta = await createAuthMetadata(accounts.MinterKey);
    const generateRequest = {
        sc_address: scAddress,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: address,
        amount: amount
    };
    const response = await client3.generateMintProof(generateRequest, minterMeta);
    console.log("generateMintProof:", response)
    const receipt = await callPrivateMint(scAddress, response, minterWallet)
    console.log("callPrivateMint:", receipt)
    let tx = await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, minterMeta)
    console.log("callPrivateMint:", tx)
    return receipt
}

async function mintBy(address, amount, minterWallet) {
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
    const response = await client3.generateMintProof(generateRequest, minterMeta);
    console.log("generateMintProofResult:", response)
    const receipt = await callPrivateMint(scAddress, response, wallet)
    await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, minterMeta)
    return receipt
}

async function SplitAndTransfer(toAddress, amount, metadata) {
    const splitRequest = {
        sc_address: scAddress,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: toAddress,
        amount: amount,
        comment: "transfer"
    };
    console.log("generateSplitTokenRequest:", splitRequest)
    // try {
    let response = await client3.generateSplitToken(splitRequest, metadata);
    console.log("Generate transfer Proof response:", response);
    await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, metadata)
    console.log("Transferring split token...");
    try {
        const tokenId = ethers.toBigInt(response.transfer_token_id)
        let receipt = await callPrivateTransfer(minterWallet, scAddress, tokenId)
        console.log("callPrivateTransfers:", receipt)
        return receipt
    } catch (error) {
        const wrappedError = new Error('Transfer failed: ' + error.details);
        wrappedError.code = error.code;
        wrappedError.details = error.details;
        throw wrappedError;
    }
}

async function GenerateTransferSplitProof(toAddress, amount, metadata) {
    const splitRequest = {
        sc_address: scAddress,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: toAddress,
        amount: amount,
        comment: "transfer"
    };
    let response = await client3.generateSplitToken(splitRequest, metadata);
    console.log("Generate transfer Proof response:", response);
    await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, metadata)
    return response
}

async function GenerateBurnSplitProof(amount) {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    const splitRequest = {
        sc_address: scAddress,
        token_type: '0',
        from_address: accounts.Minter,
        amount: amount,
        comment: "burn"
    };
    let response = await client3.generateSplitToken(splitRequest, metadata);
    console.log("Generate burn Proof response:", response);
    await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, metadata)
    return response

}

async function ApproveAndTransferFrom(fromWallet, spenderWallet, fromAddress, toAddress, amount, fromMetadata) {
    const splitRequest = {
        sc_address: scAddress,
        token_type: '0',
        from_address: fromAddress,
        spender_address: accounts.Spender1,
        to_address: toAddress,
        amount: amount,
        comment: "ApproveTransfer"
    };
    console.log("generateSplitTokenRequest:", splitRequest)
    let response = await client3.generateApproveProof(splitRequest, fromMetadata);
    console.log("Generate transfer Proof response:", response);
    await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, fromMetadata)
    const tokenId = ethers.toBigInt(response.transfer_token_id)
    let receipt = await callPrivateTransferFrom(spenderWallet, scAddress, fromAddress, toAddress, tokenId)
    await sleep(1000)
    console.log("receipt", receipt)
    return receipt
}

async function generateApproveProof(fromWallet, fromAddress, toAddress, amount, fromMetadata) {
    const splitRequest = {
        sc_address: scAddress,
        token_type: '0',
        from_address: fromAddress,
        spender_address: accounts.Spender1,
        to_address: toAddress,
        amount: amount,
        comment: "ApproveTransfer"
    };
    console.log("generateApproveTokenRequest:", splitRequest)
    let response = await client3.generateApproveProof(splitRequest, fromMetadata);
    console.log("Generate transfer Proof response:", response);
    await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, fromMetadata)
    return response
}

async function revoke(fromWallet, response) {

    console.log("revoke token id :", response.transfer_token_id)
    const tokenId = ethers.toBigInt(response.transfer_token_id)
    // let receipt = await callPrivateRevoke(scAddress,fromWallet,accounts.Spender1,tokenId)
    // console.log("receipt", receipt)
    // return receipt
    try {
        receipt = await callPrivateRevoke(scAddress, fromWallet, accounts.Spender1, tokenId)
        return receipt
    } catch (error) {
        return error
    }

}

async function SplitAndBurn(amount) {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    try {
        const splitRequest = {
            sc_address: scAddress,
            token_type: '0',
            from_address: accounts.Minter,
            amount: amount,
            comment: "Burn"
        };
        let response = await client3.generateSplitToken(splitRequest, metadata);
        console.log("Generate burn Proof response:", response);
        const tokenId = ethers.toBigInt(response.transfer_token_id)
        await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, metadata)
        let receipt = await callPrivateBurn(scAddress, minterWallet, tokenId)
        await sleep(4000)
        return receipt
    } catch (error) {
        const wrappedError = new Error('Burn failed: ' + error.details);
        wrappedError.code = error.code;
        wrappedError.details = error.details;
        throw wrappedError;
    }


}

function convertBigInt2Hex(number) {
    return ethers.toBigInt(number).toString(10)
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function cancelAllSplitTokens(ownerWallet) {
    const metadata = await createAuthMetadata(ownerWallet.privateKey)
    const ownerAddress = ownerWallet.address;
    const result = await getSplitTokenList(client3, ownerAddress, scAddress, metadata);
    console.log(result)
    const splitTokens = result.split_tokens;
    console.log("splitTokens: ", splitTokens)
    if (splitTokens.length > 0) {
        for (let i = 0; i < splitTokens.length; i++) {
            let splitToken = splitTokens[i];
            console.log("cancel split token: ", splitToken.token_id)
            // await callPrivateCancel(scAddress, ownerWallet, splitToken.token_id);
            const tokenId = ethers.toBigInt(splitToken.token_id)
            let receipt = await callPrivateCancel(scAddress, ownerWallet, tokenId)
            //console.log("receipt", receipt)
        }
    }
    await sleep(3000);
}

async function checkAllowanceTokenExist(owner, response) {
    const tokenId = ethers.toBigInt(response.transfer_token_id)
    console.log("checkAllowanceTokenExist:", response.transfer_token_id)
    console.log("checkAllowanceTokenExist tokenId:", tokenId)
    let result = await isAllowanceExists(scAddress, owner, accounts.Spender1, tokenId)
    return result
}

async function revokeAllApprovedTokens(ownerWallet) {
    const metadata = await createAuthMetadata(ownerWallet.privateKey)
    const ownerAddress = ownerWallet.address;
    const result = await getApproveTokenList(client3, ownerAddress, scAddress, accounts.Spender1, metadata);
    console.log(result)
    const splitTokens = result.split_tokens;
    console.log("splitTokens: ", splitTokens)
    if (splitTokens.length > 0) {
        for (let i = 0; i < splitTokens.length; i++) {
            let splitToken = splitTokens[i];
            console.log("revoke token: ", splitToken.token_id)
            const tokenId = ethers.toBigInt(splitToken.token_id)
            let receipt = await callPrivateRevoke(scAddress, ownerWallet, accounts.Spender1, tokenId)
        }
    }
    await sleep(3000);
}

async function getTokenBalanceByAdmin(address) {
    const adminMeta = await createAuthMetadata(adminPrivateKey)
    const result = await getAddressBalance(client3, scAddress, address, adminMeta);
    return result
}

async function getTokenBalanceInNode4(address) {
    const adminMeta = await createAuthMetadata(node4AdminPrivateKey)
    const result = await getAddressBalance(client4, scAddress, address, adminMeta);
    return result
}

async function getPublicBalance(account) {
    const contract = await ethers.getContractAt("PrivateUSDC", scAddress)
    let amount = await contract.balanceOf(account)
    return Number(amount)
}

describe("Function Cases", function () {

    let adminMeta, minterMeta, spenderMeta, to1Meta, node4AdminMeta

    before(async function () {
        adminMeta = await createAuthMetadata(adminPrivateKey)
        minterMeta = await createAuthMetadata(accounts.MinterKey)
        spenderMeta = await createAuthMetadata(accounts.Spender1Key)
        to1Meta = await createAuthMetadata(accounts.To1PrivateKey);
        node4AdminMeta = await createAuthMetadata(node4AdminPrivateKey);
    })
    describe.only("PirvateMint", function () {
        this.timeout(1200000);
        // beforeEach(async function () {
        //     preBalance = await getTokenBalanceByAdmin(accounts.Minter);
        // });

        it.only('Mint 100 tokens to minter', async () => {
            const amount = 100;
            console.log(currentNetwork)
            console.log(scAddress)
            let recepit = await mint(accounts.Minter, amount)
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            console.log("postBalance", postBalance)
            expect(postBalance).to.equal(preBalance + amount);
        });
        it('Mint  10 to user', async () => {
            const userAddress = accounts.To1;
            const preBalanceUser = await getTokenBalanceByAdmin(userAddress);
            await mint(userAddress, amount);
            const postBalanceUser = await getTokenBalanceByAdmin(userAddress);
            expect(postBalanceUser).to.equal(preBalanceUser + amount);
        });
        it('Mint amount 10 with string format', async () => {
            await mint(accounts.Minter, amount.toString());
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            expect(postBalance).to.equal(preBalance + amount);
        });
        it('Mint  10 to user another node', async () => {
            const userAddress = userInNode4;
            const preBalanceUserInNode4 = await getTokenBalanceInNode4(userAddress);
            const preBalanceUserInNode3 = await getTokenBalanceByAdmin(userAddress)
            await mint(userAddress, amount);
            await sleep(3000);
            const postBalanceUserInNode4 = await getTokenBalanceInNode4(userAddress);
            const postBalanceUserInNode3 = await getTokenBalanceByAdmin(userAddress)
            console.log({preBalanceUserInNode4,postBalanceUserInNode4})
            console.log({preBalanceUserInNode3,postBalanceUserInNode3})
            expect(postBalanceUserInNode4).to.equal(preBalanceUserInNode4 + amount);
            expect(postBalanceUserInNode3).to.equal(preBalanceUserInNode3);
        });
    });
    describe("Split and transfer", function () {
        this.timeout(1200000);
        let preBalanceTo, postBalanceTo;
        beforeEach(async function () {
            preBalance = await getTokenBalanceByAdmin(accounts.Minter);
        });
        it('transfer to user1 inBank with 1', async () => {
            await mint(accounts.Minter, 1000)
            preBalance = await getTokenBalanceByAdmin(accounts.Minter);
            preBalanceTo = await getTokenBalanceByAdmin(accounts.To1);
            await SplitAndTransfer(accounts.To1, amount, minterMeta);
            postBalanceTo = await getTokenBalanceByAdmin(accounts.To1);
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            // console.log({preBalance,postBalance,preBalanceTo,postBalanceTo});
            expect(postBalance).to.equal(preBalance - amount);
            expect(postBalanceTo).to.equal(preBalanceTo + amount);
        });
        it('transfer to user1 inBank with 10 string format', async () => {
            preBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            await SplitAndTransfer(toAddress1, amount.toString(), minterMeta);
            postBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            console.log({preBalance, postBalance, preBalanceTo, postBalanceTo})
            expect(postBalance).to.equal(preBalance - amount);
            expect(postBalanceTo).to.equal(preBalanceTo + amount);
        });

        it('transfer to user cross Bank with 10', async () => {
            const userAddress = userInNode4;
            const preBalanceUserInNode4 = await getTokenBalanceInNode4(userAddress);
            const preBalanceUserInNode3 = await getTokenBalanceByAdmin(userAddress)
            await SplitAndTransfer(userAddress, amount, minterMeta);
            await sleep(3000);
            const postBalanceUserInNode4 = await getTokenBalanceInNode4(userAddress);
            const postBalanceUserInNode3 = await getTokenBalanceByAdmin(userAddress)
            console.log({preBalanceUserInNode4,postBalanceUserInNode4})
            console.log({preBalanceUserInNode3,postBalanceUserInNode3})
            expect(postBalanceUserInNode4).to.equal(preBalanceUserInNode4 + amount);
            expect(postBalanceUserInNode3).to.equal(preBalanceUserInNode3);

        });
        it('transfer all amount', async () => {
            await cancelAllSplitTokens(minterWallet);
            await revokeAllApprovedTokens(minterWallet)
            const amount = await getTokenBalanceByAdmin(accounts.Minter);
            console.log("minter amount:", amount)
            preBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            // await cancelAllSplitTokens(minterWallet,scAddress)
            await SplitAndTransfer(toAddress1, amount, minterMeta);
            postBalanceTo = await getTokenBalanceByAdmin(toAddress1);
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            expect(postBalance).to.equal(preBalance - amount);
            expect(postBalanceTo).to.equal(preBalanceTo + amount);
        });
        it('transfer 5 from user1 address to user2', async () => {
            const amount = 5;
            const sender = accounts.To1;
            const senderWallet = to1Wallet;
            preBalance = await getTokenBalanceByAdmin(sender);
            console.log("sender balance:", preBalance)
            preBalanceTo = await getTokenBalanceByAdmin(accounts.To2);
            if (preBalance >= amount) {
                await ApproveAndTransferFrom(to1Wallet, spender1Wallet, accounts.To1, accounts.To2, amount, to1Meta)
                postBalance = await getTokenBalanceByAdmin(accounts.To1);
                postBalanceTo = await getTokenBalanceByAdmin(accounts.To2);
                expect(postBalance).to.equal(preBalance - amount);
                expect(postBalanceTo).to.equal(preBalanceTo + amount);
            } else {
                console.log("balance is not enough")
            }
        });
        it('transfer 5 from user1 address to otherBank user', async () => {
            const amount = 5;
            preBalance = await getTokenBalanceByAdmin(accounts.To1);
            if (preBalance >= amount) {
                const userAddress = userInNode4;
                const preBalanceUserInNode4 = await getTokenBalanceInNode4(userAddress);
                const preBalanceUserInNode3 = await getTokenBalanceByAdmin(userAddress)
                await ApproveAndTransferFrom(to1Wallet, spender1Wallet, accounts.To1, userAddress, amount, to1Meta)
                await sleep(3000);
                const postBalanceUserInNode4 = await getTokenBalanceInNode4(userAddress);
                const postBalanceUserInNode3 = await getTokenBalanceByAdmin(userAddress)
                console.log({preBalanceUserInNode4,postBalanceUserInNode4})
                console.log({preBalanceUserInNode3,postBalanceUserInNode3})
                expect(postBalanceUserInNode4).to.equal(preBalanceUserInNode4 + amount);
                expect(postBalanceUserInNode3).to.equal(preBalanceUserInNode3);

            } else {
                console.log("balance is not enough")
            }
        });
    })
    describe("Split and privateTransfers", function () {
        this.timeout(1200000);
        it('privateTransfers', async () => {
            await mint(accounts.Minter, 1000)
            const preBalance = await getTokenBalanceByAdmin(accounts.Minter);
            const splitRequest1 = {
                sc_address: scAddress,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: accounts.To1,
                amount: amount,
                comment: "transfer1"
            };
            let response1 = await client3.generateSplitToken(splitRequest1, minterMeta);
            console.log("Generate transfer Proof response:", response1);
            await client3.waitForActionCompletion(client3.getTokenActionStatus, response1.request_id, minterMeta)
            const tokenId1 = ethers.toBigInt(response1.transfer_token_id)
            const splitRequest2 = {
                sc_address: scAddress,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: accounts.To1,
                amount: amount,
                comment: "transfer1"
            };
            let response2 = await client3.generateSplitToken(splitRequest2, minterMeta);
            const tokenId2 = ethers.toBigInt(response2.transfer_token_id)
            console.log("Generate transfer Proof response:", response2);
            await client3.waitForActionCompletion(client3.getTokenActionStatus, response2.request_id, minterMeta)
            //privateTransfers
            await callPrivateTransfers(minterWallet, scAddress, [tokenId1, tokenId2])
            await sleep(3000)
            const postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            expect(preBalance-postBalance).to.equal( amount * 2);
        });
    })
    describe("Approve And TransferFrom", function () {
        this.timeout(1200000);
        let preBalance, postBalance;

        before(async function () {
            await mint(accounts.Minter, 100);
            await mint(accounts.To1, 100);
        });

        it('Approve transfer: minter to to1 ', async () => {
            preBalance = await getTokenBalanceByAdmin(accounts.To1);
            await ApproveAndTransferFrom(minterWallet, spender1Wallet, accounts.Minter, accounts.To1, 1, minterMeta)
            postBalance = await getTokenBalanceByAdmin(accounts.To1);
            expect(postBalance).to.equal(preBalance + 1);
        });
        it('Approve transfer: minter to user cross bank ', async () => {
            preBalance = await getTokenBalanceByAdmin(accounts.Minter);
            await ApproveAndTransferFrom(minterWallet, spender1Wallet, accounts.Minter, userInNode4, 1, minterMeta)
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            expect(postBalance).to.equal(preBalance - 1);
        });
        it('Approve transfer: to1 to to2 in bank ', async () => {
            preBalance = await getTokenBalanceByAdmin(accounts.To1);
            await ApproveAndTransferFrom(to1Wallet, spender1Wallet, accounts.To1, accounts.To2, 1, to1Meta)
            postBalance = await getTokenBalanceByAdmin(accounts.To1);
            expect(postBalance).to.equal(preBalance - 1);
        });

        it('Approve transfer: approve twice and transfer one of them ', async () => {
            await revokeAllApprovedTokens(to1Wallet);
            preBalance = await getTokenBalanceByAdmin(accounts.To1);
            const reponse1 = await generateApproveProof(to1Wallet, accounts.To1, accounts.To2, 1, to1Meta);
            const reponse2 = await generateApproveProof(to1Wallet, accounts.To1, accounts.To2, 2, to1Meta);
            const tokenId1 = ethers.toBigInt(reponse1.transfer_token_id)
            const tokenId2 = ethers.toBigInt(reponse2.transfer_token_id)
            let receipt = await callPrivateTransferFrom(spender1Wallet, scAddress, accounts.To1, accounts.To2, tokenId1)
            await sleep(1000)
            console.log("reponse2", reponse2)
            let approvedTokenList = await getApproveTokenList(client3, accounts.To1, scAddress, accounts.Spender1, to1Meta)
            postBalance = await getTokenBalanceByAdmin(accounts.To1);
            expect(postBalance).to.equal(preBalance - 1);
            await callPrivateTransferFrom(spender1Wallet, scAddress, accounts.To1, accounts.To2, tokenId2)
            await sleep(1000)
            postBalance = await getTokenBalanceByAdmin(accounts.To1);
            expect(postBalance).to.equal(preBalance - 3);
        });

        it('Approve transfer: to1 to user cross bank ', async () => {
            preBalance = await getTokenBalanceByAdmin(accounts.To1);
            await ApproveAndTransferFrom(to1Wallet, spender1Wallet, accounts.To1, userInNode4, 1, to1Meta)
            postBalance = await getTokenBalanceByAdmin(accounts.To1);
            expect(postBalance).to.equal(preBalance - 1);
        });
        it('Should fail: approve to1 to to2 in bank exceed amount ', async () => {
            preBalance = await getTokenBalanceByAdmin(accounts.To1);
            const amount = preBalance + 1;
            const splitRequest = {
                sc_address: scAddress,
                token_type: '0',
                from_address: accounts.To1,
                spender_address: accounts.Spender1,
                to_address: accounts.To2,
                amount: amount,
                comment: "TransferFrom"
            };
            console.log("generateSplitTokenRequest:", splitRequest)
            try {
                await client3.generateApproveProof(splitRequest, to1Meta)
            } catch (error) {
                expect(error.details).contains("insufficient balance")
            }
        });

    })
    describe("Approve and revoke", function () {
        this.timeout(1200000);
        let preBalance, postBalance;
        before(async function () {
            await mint(accounts.Minter, 100);
            await mint(accounts.To1, 100);
        });
        beforeEach(async function () {
            preBalance = await getTokenBalanceByAdmin(accounts.Minter);
        });
        it('Approve and revoke: minter to to1 ', async () => {
            // const amount = await getTokenBalanceByAdmin(accounts.Minter);
            const amount = 1
            let response = await generateApproveProof(minterWallet, accounts.Minter, accounts.To1, amount, minterMeta)
            console.log("generateApproveProof:", response)

            let allowanceExist = await checkAllowanceTokenExist(accounts.Minter, response)
            expect(allowanceExist).to.equal(true);
            await revoke(minterWallet, response)
            allowanceExist = await checkAllowanceTokenExist(accounts.Minter, response)
            expect(allowanceExist).to.equal(false);
        });
        it.skip('Approve and revoke: to1 to user cross bank ', async () => {
            let response = await generateApproveProof(to1Wallet, accounts.To1, userInNode4, 1, to1Meta)
            let allowanceExist = await checkAllowanceTokenExist(accounts.To1, response)
            expect(allowanceExist).to.equal(true);
            await revoke(to1Wallet, response)
            allowanceExist = await checkAllowanceTokenExist(accounts.To1, response)
            expect(allowanceExist).to.equal(false);
        });
        it.skip('Approve and revoke: to1 to user cross bank all amount', async () => {
            const preBalance = await getTokenBalanceByAdmin(accounts.To1);
            const amount = await getTokenBalanceByAdmin(accounts.To1);
            // const amount = 10;
            let response = await generateApproveProof(to1Wallet, accounts.To1, userInNode4, amount, to1Meta)
            let allowanceExist = await checkAllowanceTokenExist(accounts.To1, response)
            expect(allowanceExist).to.equal(true);
            await revoke(to1Wallet, response)
            allowanceExist = await checkAllowanceTokenExist(accounts.To1, response)
            expect(allowanceExist).to.equal(false);
            const postBalance = await getTokenBalanceByAdmin(accounts.To1);
            expect(postBalance).to.equal(preBalance);
        });

    })
    describe("PrivateBurn", function () {
        this.timeout(1200000);

        beforeEach(async function () {
            preBalance = await getTokenBalanceByAdmin(accounts.Minter);
        });
        it('minter burn 10', async () => {
            await mint(accounts.Minter, 20);
            preBalance = await getTokenBalanceByAdmin(accounts.Minter);
            await SplitAndBurn(amount);
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            expect(postBalance).to.equal(preBalance - amount);

        });
        it('burn amount 1', async () => {
            const amount = 1
            await SplitAndBurn(amount);
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            console.log(postBalance)
            expect(postBalance).to.equal(preBalance - amount);

        });
        it('burn with 10 string format', async () => {
            const amount = 10
            if (preBalance >= amount) {
                await SplitAndBurn(amount.toString());
                postBalance = await getTokenBalanceByAdmin(accounts.Minter);
                expect(postBalance).to.equal(preBalance - amount);
                console.log("minter balance:", await getTokenBalanceByAdmin(accounts.Minter))
            } else {
                console.log("balance is not enough")
            }
        });

        it('burn all minter amount', async () => {
            await cancelAllSplitTokens(minterWallet);
            await revokeAllApprovedTokens(minterWallet)
            console.log(await getSplitTokenList(client3, accounts.Minter, scAddress, minterMeta))
            const burn_amount = await getTokenBalanceByAdmin(accounts.Minter);
            await SplitAndBurn(burn_amount);
            postBalance = await getTokenBalanceByAdmin(accounts.Minter);
            expect(postBalance).to.equal(preBalance - burn_amount);
        });
    });
    describe('PrivateCancel', function () {
        this.timeout(1200000);
        it('split token list ', async () => {
            await mint(accounts.Minter, 50);
            await GenerateTransferSplitProof(accounts.To1, 10, minterMeta);
            await GenerateBurnSplitProof(20);
            await sleep(3000)
            let splitTokens = await getSplitTokenList(client3, accounts.Minter, scAddress, minterMeta)
            expect(splitTokens.split_tokens.length).not.to.equal(0);
        });
        it('cancle split tokens', async () => {
            await cancelAllSplitTokens(minterWallet)
            let splitTokens = await getSplitTokenList(client3, accounts.Minter, scAddress, minterMeta)
            expect(splitTokens.split_tokens.length).to.equal(0);
        });
        it('Try to cancel split tokens again', async () => {
            await mint(accounts.Minter, 20);
            await GenerateTransferSplitProof(accounts.To1, 10, minterMeta);
            const ownerAddress = accounts.Minter;
            const result = await getSplitTokenList(client3, ownerAddress, scAddress, minterMeta);
            const splitTokens = result.split_tokens;
            console.log("splitTokens: ", splitTokens)
            if (splitTokens.length > 0) {
                for (let i = 0; i < splitTokens.length; i++) {
                    let splitToken = splitTokens[i];
                    console.log("cancel split token: ", splitToken.token_id)
                    const tokenId = ethers.toBigInt(splitToken.token_id)
                    // await callPrivateCancel(scAddress, ownerWallet, splitToken.token_id);
                    let receipt = await callPrivateCancel(scAddress, minterWallet, tokenId)
                    console.log("receipt", receipt)
                    await sleep(3000);
                    await expect(callPrivateCancel(scAddress, minterWallet, tokenId)).revertedWith("PrivateERCToken: token does not exist")
                }
            }
            await sleep(3000);
        });
    });
    describe('Full token life: mint ,tranfer, burn', function () {
        this.timeout(1200000);
        const userAddress = userInNode4;
        let preBalanceMinter, preBalanceTo1, preBalanceTo2, preBalanceUser
        before(async function () {
            preBalanceMinter = await getTokenBalanceByAdmin(accounts.Minter);
            preBalanceTo1 = await getTokenBalanceByAdmin(accounts.To1);
            preBalanceTo2 = await getTokenBalanceByAdmin(accounts.To2);
            preBalanceUser = await getTokenBalanceInNode4(userAddress)
        });
        it('Step1: mint 100 to minter ', async () => {
            await mint(accounts.Minter, 100);
        });
        it('Step2: transfer 30 to recevier1 in node ', async () => {
            await SplitAndTransfer(accounts.To1, 30, minterMeta);
        });
        it('Step3: transfer 10 to recevier2 in node ', async () => {
            await SplitAndTransfer(accounts.To2, 10, minterMeta);
        });
        it('Step4: transfer 10 to user cross node ', async () => {
            await SplitAndTransfer(userAddress, 10, minterMeta);
        });
        it('Step5: minter burn 10 ', async () => {
            await SplitAndBurn(10);
        });
        it('Step6: check balance ', async () => {
            const postBalanceMinter = await getTokenBalanceByAdmin(accounts.Minter);
            const postBalanceTo1 = await getTokenBalanceByAdmin(accounts.To1);
            const postBalanceTo2 = await getTokenBalanceByAdmin(accounts.To2);
            const postBalanceUser = await getTokenBalanceInNode4(userAddress);
            expect(postBalanceMinter).to.equal(preBalanceMinter + 40);
            expect(postBalanceTo1).to.equal(preBalanceTo1 + 30);
            expect(postBalanceTo2).to.equal(preBalanceTo2 + 10);
            expect(postBalanceUser).to.equal(preBalanceUser + 10);
        });

    });
    describe("check contract totalSupply", function () {
        this.timeout(1200000);
        let totalSupplyPre, totalSupplyPost;
        before(async function () {
            await mint(accounts.Minter, amount);
            await mint(accounts.To1, amount);
        })
        it('check_contract_totalSupply', async () => {
            console.log("contract totalSupply is ", await getTotalSupplyNode3(client3, scAddress, adminMeta,minterWallet));
            console.log("contract publicTotalSupply is", await getPublicTotalSupply(scAddress));
        });
        it('totalSupply_add_after_mint ', async () => {
            totalSupplyPre = await getTotalSupplyNode3(client3, scAddress, adminMeta,minterWallet);
            await mint(accounts.Minter, amount);
            totalSupplyPost = await getTotalSupplyNode3(client3, scAddress, adminMeta);
            console.log("contract totalSupply is ", await getTotalSupplyNode3(client3, scAddress, adminMeta,minterWallet));
            console.log("contract publicTotalSupply is", await getPublicTotalSupply(scAddress));
            expect(totalSupplyPost).to.equal(totalSupplyPre + amount);
        });
        it('totalSupply_sub_after_burn ', async () => {
            totalSupplyPre = await getTotalSupplyNode3(client3, scAddress, adminMeta);
            await SplitAndBurn(amount);
            totalSupplyPost = await getTotalSupplyNode3(client3, scAddress, adminMeta);
            console.log({totalSupplyPost, totalSupplyPre})
            console.log("contract totalSupply is ", await getTotalSupplyNode3(client3, scAddress, adminMeta));
            console.log("contract publicTotalSupply is", await getPublicTotalSupply(scAddress));
            expect(totalSupplyPost).to.equal(totalSupplyPre - amount);
        });
        it('totalSupply_keep_same_after_transfer', async () => {
            totalSupplyPre = await getTotalSupplyNode3(client3, scAddress, adminMeta);
            console.log("totalSupplyPre: ", totalSupplyPre)
            const minterBalance = await getTokenBalanceByAdmin(accounts.Minter);
            if (minterBalance >= 100) {
                await SplitAndTransfer(toAddress1, amount, minterMeta);
                totalSupplyPost = await getTotalSupplyNode3(client3, scAddress, adminMeta);
                console.log("contract totalSupply is ", await getTotalSupplyNode3(client3, scAddress, adminMeta));
                console.log("contract publicTotalSupply is", await getPublicTotalSupply(scAddress));
                expect(totalSupplyPost).to.equal(totalSupplyPre);
            }
        });
        it('totalSupply_keep_same_after_cancel_burn', async () => {
            totalSupplyPre = await getTotalSupplyNode3(client3, scAddress, adminMeta);
            console.log("totalSupplyPre: ", totalSupplyPre)
            const minterBalance = await getTokenBalanceByAdmin(accounts.Minter);
            if (minterBalance >= amount) {
                const burnSplit = await GenerateBurnSplitProof(amount)
                await cancelAllSplitTokens(minterWallet)
                totalSupplyPost = await getTotalSupplyNode3(client3, scAddress, adminMeta);
                console.log("contract totalSupply is ", await getTotalSupplyNode3(client3, scAddress, adminMeta));
                console.log("contract publicTotalSupply is", await getPublicTotalSupply(scAddress));
                expect(totalSupplyPost).to.equal(totalSupplyPre);
            }
        });
        it('totalSupply_decrease_after_convert2USDC ', async () => {
            await mint(accounts.Minter, 10);
            totalSupplyPre = await getTotalSupplyNode3(client3, scAddress, adminMeta);
            console.log("totalSupplyPre: ", totalSupplyPre)
            const amount = 10;
            const prePrivateBalance = await getTokenBalanceByAdmin(accounts.Minter);
            const prePublicBalance = await getPublicBalance(accounts.Minter);
            console.log({prePublicBalance, prePrivateBalance})
            //split token
            const splitRequest = {
                sc_address: scAddress,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: accounts.Minter,
                amount: amount,
                comment: 'Convert'
            };
            let response = await client3.generateSplitToken(splitRequest, minterMeta);
            console.log("Generate transfer Proof response:", response);
            await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, minterMeta)
            const tokenId = ethers.toBigInt(response.transfer_token_id);
            const convertToPUSDCResponse = {
                token_id: response.transfer_token_id
            };
            let proofResult = await client3.convertToUSDC(convertToPUSDCResponse, minterMeta);
            const contract = await ethers.getContractAt("PrivateERCToken", scAddress, minterWallet);
            const proof = proofResult.proof.map(p => ethers.toBigInt(p));
            const input = proofResult.input.map(i => ethers.toBigInt(i));
            let tx = await contract.convert2USDC(tokenId, proofResult.amount, input, proof);
            await tx.wait();

            const postPrivateBalance = await getTokenBalanceByAdmin(accounts.Minter);
            const postPublicBalance = await getPublicBalance(accounts.Minter);
            console.log({postPublicBalance, postPrivateBalance})
            expect(postPrivateBalance).to.equal(prePrivateBalance - amount);
            expect(postPublicBalance).to.equal(prePublicBalance + amount);

            totalSupplyPost = await getTotalSupplyNode3(client3, scAddress, adminMeta);
            console.log("contract totalSupply is ", await getTotalSupplyNode3(client3, scAddress, adminMeta));
            console.log("contract publicTotalSupply is", await getPublicTotalSupply(scAddress));
            expect(totalSupplyPost).to.equal(totalSupplyPre - amount);
        });
        it('totalSupply_increase_after_convert2pUSDC ', async () => {
            totalSupplyPre = await getTotalSupplyNode3(client3, scAddress, adminMeta);
            console.log("totalSupplyPre: ", totalSupplyPre)
            const prePublicBalance = await getPublicBalance(accounts.Minter);
            const prePrivateBalance = await getTokenBalanceByAdmin(accounts.Minter);
            console.log({prePublicBalance, prePrivateBalance})
            const amount = 10;
            const metadata = await createAuthMetadata(accounts.MinterKey);
            const convertToPUSDCResponse = {
                amount: amount
            };
            let proofResult = await client3.convertToPUSDC(convertToPUSDCResponse, metadata);
            // console.log("Generate Mint Proof response:", proofResult);
            const contract = await ethers.getContractAt("PrivateERCToken", scAddress, minterWallet);
            const elAmount = {
                cl_x: ethers.toBigInt(proofResult.elgamal.cl_x),
                cl_y: ethers.toBigInt(proofResult.elgamal.cl_y),
                cr_x: ethers.toBigInt(proofResult.elgamal.cr_x),
                cr_y: ethers.toBigInt(proofResult.elgamal.cr_y)
            };

            const token = {
                id: ethers.toBigInt(proofResult.token_id),
                owner: accounts.Minter,
                status: 2,
                amount: elAmount,
                to: accounts.Minter,
                rollbackTokenId: 0n,
                tokenType: 4,
            }
            const proof = proofResult.proof.map(p => ethers.toBigInt(p));
            const input = proofResult.input.map(i => ethers.toBigInt(i));

            console.log("Executing conversion to private USDC...");
            const tx = await contract.convert2pUSDC(amount, token, input, proof);


            let receipt = await tx.wait();
            expect(receipt.status).to.equal(1);

            const postPublicBalance = await getPublicBalance(accounts.Minter);
            const postPrivateBalance = await getTokenBalanceByAdmin(accounts.Minter);
            console.log({postPublicBalance, postPrivateBalance})
            expect(postPublicBalance).to.equal(prePublicBalance - amount);
            expect(postPrivateBalance).to.equal(prePrivateBalance + amount);
            totalSupplyPost = await getTotalSupplyNode3(client3, scAddress, adminMeta);
            console.log("contract totalSupply is ", await getTotalSupplyNode3(client3, scAddress, adminMeta));
            console.log("contract publicTotalSupply is", await getPublicTotalSupply(scAddress));
            expect(totalSupplyPost).to.equal(totalSupplyPre + amount);
        });

    });
    describe("check minter allowed", function () {
        this.timeout(1200000);
        let preAllowance, postAllowance;
        beforeEach(async function () {
            preAllowance = await getMinterAllowed(client3, minterMeta);
        });
        it('check minterAllowance ', async () => {
            console.log("minter allowed: ", preAllowance);
        });

        it('MinterAllowance should decrease after mint', async () => {
            await mint(accounts.Minter, 100);
            postAllowance = await getMinterAllowed(client3, minterMeta);
            expect(postAllowance).to.equal(preAllowance - 100);
        });
        it('MinterAllowance should decrease after mint', async () => {
            await mint(accounts.Minter, 100);
            postAllowance = await getMinterAllowed(client3, minterMeta);
            ;
            expect(postAllowance).to.equal(preAllowance - 100);
        });
        it('MinterAllowance should decrease after mint to user', async () => {
            await mint(accounts.To1, 100);
            postAllowance = await getMinterAllowed(client3, minterMeta);
            expect(postAllowance).to.equal(preAllowance - 100);
        });
        it('MinterAllowance should decrease after mint to user another node', async () => {
            await mint(userInNode4, 100);
            postAllowance = await getMinterAllowed(client3, minterMeta);
            expect(postAllowance).to.equal(preAllowance - 100);
        });
        it('MinterAllowance should keep same after transfer to user', async () => {
            await SplitAndTransfer(accounts.To1, 10, minterMeta);
            postAllowance = await getMinterAllowed(client3, minterMeta);
            expect(postAllowance).to.equal(preAllowance);
        });
        it('MinterAllowance should keep same after transfer to other bank user', async () => {
            const accountBalance = await getTokenBalanceByAdmin(accounts.Minter);
            if (accountBalance >= 100) {
                await SplitAndTransfer(userInNode4, 100, minterMeta);
                postAllowance = await getMinterAllowed(client3, minterMeta);
                expect(postAllowance).to.equal(preAllowance);
            } else {
                console.log("Minter balance is not enough")
            }
        });
        it('MinterAllowance should keep same after transfer user amount to another bank user', async () => {
            const accountBalance = await getTokenBalanceByAdmin(accounts.To1);
            if (accountBalance >= 100) {
                await ApproveAndTransferFrom(to1Wallet, spender1Wallet, to1Wallet.address, userInNode4, 100, to1Meta);
                postAllowance = await getMinterAllowed(client3, minterMeta);
                expect(postAllowance).to.equal(preAllowance);
            } else {
                await mint(accounts.To1, 100);
                await ApproveAndTransferFrom(to1Wallet, spender1Wallet, to1Wallet.address, userInNode4, 100, to1Meta);
                postAllowance = await getMinterAllowed(client3, minterMeta);
                expect(postAllowance).to.equal(preAllowance - 100);
            }
        });
        it('MinterAllowance should keep same after burn', async () => {
            await SplitAndBurn(100);
            postAllowance = await getMinterAllowed(client3, minterMeta);
            expect(postAllowance).to.equal(preAllowance);
        });

    });
    describe("check gas used", function () {
        this.timeout(1200000);
        const MAX_GAS_LIMIT = 30000000;
        it('Check gas used during mint ', async () => {
            const receipt = await mint(accounts.Minter, 20);
            console.log(receipt)
            expect(receipt.gasUsed).to.be.lessThan(MAX_GAS_LIMIT)
        });
        it('Check gas used during transfer ', async () => {
            const amount = 10
            const toAddress = accounts.To1;
            const splitRequest = {
                sc_address: scAddress,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: toAddress,
                amount: amount,
                comment: 'transfer'
            };
            let response = await client3.generateSplitToken(splitRequest, minterMeta);
            console.log("Generate transfer Proof response:", response);
            await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, minterMeta)
            const tokenId = ethers.toBigInt(response.transfer_token_id)
            console.log("tokenId:", tokenId)
            let receipt = await callPrivateTransfer(minterWallet, scAddress, tokenId)
            expect(receipt.gasUsed).to.be.lessThan(MAX_GAS_LIMIT)
        });
        it('Check gas used during burn', async () => {
            await mint(accounts.Minter, amount);
            const splitRequest = {
                sc_address: scAddress,
                token_type: '0',
                from_address: accounts.Minter,
                // to_address: accounts.Minter,
                amount: amount,
                comment: 'burn'
            };
            let response = await client3.generateSplitToken(splitRequest, minterMeta);
            console.log("Generate burn Proof response:", response);
            await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, minterMeta)
            const tokenId = ethers.toBigInt(response.transfer_token_id)
            let receipt = await callPrivateBurn(scAddress, minterWallet, tokenId)

            expect(receipt.gasUsed).to.be.lessThan(MAX_GAS_LIMIT)
        });
    });
    describe("convert USDC and pUSDC", function () {
        this.timeout(1200000);
        let prePublicBalance, postPublicBalance;
        let prePrivateBalance, postPrivateBalance;
        before(async function () {
            await mint(accounts.Minter, 100);
            await mint(accounts.To1, 100);
        })
        it('Convert2USDC: convert from pUSDC to USDC for minter', async () => {
            const amount = 10;
            prePrivateBalance = await getTokenBalanceByAdmin(accounts.Minter);
            prePublicBalance = await getPublicBalance(accounts.Minter);
            console.log({prePublicBalance, prePrivateBalance})
            //split token
            const splitRequest = {
                sc_address: scAddress,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: accounts.Minter,
                amount: amount,
                comment: 'convert'
            };
            let response = await client3.generateSplitToken(splitRequest, minterMeta);
            console.log("Generate transfer Proof response:", response);
            await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, minterMeta)
            const tokenId = ethers.toBigInt(response.transfer_token_id);
            const convertToPUSDCResponse = {
                token_id: response.transfer_token_id
            };
            let proofResult = await client3.convertToUSDC(convertToPUSDCResponse, minterMeta);
            console.log("Generate convert Proof response:", proofResult);
            const contract = await ethers.getContractAt("PrivateERCToken", scAddress, minterWallet);
            const proof = proofResult.proof.map(p => ethers.toBigInt(p));
            const input = proofResult.input.map(i => ethers.toBigInt(i));
            let tx = await contract.convert2USDC(tokenId, proofResult.amount, input, proof);
            await tx.wait();

            postPrivateBalance = await getTokenBalanceByAdmin(accounts.Minter);
            postPublicBalance = await getPublicBalance(accounts.Minter);
            console.log({postPublicBalance, postPrivateBalance})
            expect(postPrivateBalance).to.equal(prePrivateBalance - amount);
            expect(postPublicBalance).to.equal(prePublicBalance + amount);

        });
        it('Convert2USDC: convert from pUSDC to USDC for user', async () => {
            const userAddress = accounts.To1;
            const userMeta = to1Meta
            const userWallet = to1Wallet
            const amount = 10;
            prePrivateBalance = await getTokenBalanceByAdmin(userAddress);
            prePublicBalance = await getPublicBalance(userAddress);
            console.log({prePublicBalance, prePrivateBalance})
            //split token
            const splitRequest = {
                sc_address: scAddress,
                token_type: '0',
                from_address: userAddress,
                to_address: userAddress,
                amount: amount,
                comment: 'convert'
            };
            let response = await client3.generateSplitToken(splitRequest, userMeta);
            console.log("Generate transfer Proof response:", response);
            await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, userMeta)
            const tokenId = ethers.toBigInt(response.transfer_token_id);
            const convertToPUSDCResponse = {
                token_id: response.transfer_token_id
            };
            let proofResult = await client3.convertToUSDC(convertToPUSDCResponse, userMeta);
            console.log("Generate convert Proof response:", proofResult);
            const contract = await ethers.getContractAt("PrivateERCToken", scAddress, userWallet);
            const proof = proofResult.proof.map(p => ethers.toBigInt(p));
            const input = proofResult.input.map(i => ethers.toBigInt(i));
            let tx = await contract.convert2USDC(tokenId, proofResult.amount, input, proof);
            await tx.wait();
            postPrivateBalance = await getTokenBalanceByAdmin(userAddress);
            postPublicBalance = await getPublicBalance(userAddress);
            console.log({postPublicBalance, postPrivateBalance})
            expect(postPrivateBalance).to.equal(prePrivateBalance - amount);
            expect(postPublicBalance).to.equal(prePublicBalance + amount);

        });
        it('Convert2pUDSC: convert from USDC to pUSDC for minter', async () => {
            prePublicBalance = await getPublicBalance(accounts.Minter);
            prePrivateBalance = await getTokenBalanceByAdmin(accounts.Minter);
            console.log({prePublicBalance, prePrivateBalance})
            const amount = 10;
            const metadata = await createAuthMetadata(accounts.MinterKey);
            const convertToPUSDCResponse = {
                amount: amount
            };
            let proofResult = await client3.convertToPUSDC(convertToPUSDCResponse, metadata);
            console.log("Generate convert Proof response:", proofResult);
            // console.log("Generate Mint Proof response:", proofResult);
            const contract = await ethers.getContractAt("PrivateERCToken", scAddress, minterWallet);
            const elAmount = {
                cl_x: ethers.toBigInt(proofResult.elgamal.cl_x),
                cl_y: ethers.toBigInt(proofResult.elgamal.cl_y),
                cr_x: ethers.toBigInt(proofResult.elgamal.cr_x),
                cr_y: ethers.toBigInt(proofResult.elgamal.cr_y)
            };
            const token = {
                id: ethers.toBigInt(proofResult.token_id),
                owner: accounts.Minter,
                status: 2,
                amount: elAmount,
                to: accounts.Minter,
                rollbackTokenId: 0n,
                tokenType: 4,
            }
            const proof = proofResult.proof.map(p => ethers.toBigInt(p));
            const input = proofResult.input.map(i => ethers.toBigInt(i));

            console.log("Executing conversion to private USDC...");
            const tx = await contract.convert2pUSDC(amount, token, input, proof);
            let receipt = await tx.wait();
            expect(receipt.status).to.equal(1);

            postPublicBalance = await getPublicBalance(accounts.Minter);
            postPrivateBalance = await getTokenBalanceByAdmin(accounts.Minter);
            console.log({postPublicBalance, postPrivateBalance})
            expect(postPublicBalance).to.equal(prePublicBalance - amount);
            expect(postPrivateBalance).to.equal(prePrivateBalance + amount);

        });
        it('Convert2pUDSC: convert from USDC to pUSDC for user', async () => {
            const userAddress = accounts.To1;
            const userMeta = to1Meta
            const userWallet = to1Wallet
            prePublicBalance = await getPublicBalance(userAddress);
            prePrivateBalance = await getTokenBalanceByAdmin(userAddress);
            console.log({prePublicBalance, prePrivateBalance})
            const amount = 10;
            const convertToPUSDCResponse = {
                amount: amount
            };
            let proofResult = await client3.convertToPUSDC(convertToPUSDCResponse, userMeta);
            console.log("Generate convert Proof response:", proofResult);
            // console.log("Generate Mint Proof response:", proofResult);
            const contract = await ethers.getContractAt("PrivateERCToken", scAddress, userWallet);
            const elAmount = {
                cl_x: ethers.toBigInt(proofResult.elgamal.cl_x),
                cl_y: ethers.toBigInt(proofResult.elgamal.cl_y),
                cr_x: ethers.toBigInt(proofResult.elgamal.cr_x),
                cr_y: ethers.toBigInt(proofResult.elgamal.cr_y)
            };
            const token = {
                id: ethers.toBigInt(proofResult.token_id),
                owner: accounts.Minter,
                status: 2,
                amount: elAmount,
                to: accounts.Minter,
                rollbackTokenId: 0n,
                tokenType: 4,
            }
            const proof = proofResult.proof.map(p => ethers.toBigInt(p));
            const input = proofResult.input.map(i => ethers.toBigInt(i));

            console.log("Executing conversion to private USDC...");
            const tx = await contract.convert2pUSDC(amount, token, input, proof);
            let receipt = await tx.wait();
            expect(receipt.status).to.equal(1);

            postPublicBalance = await getPublicBalance(userAddress);
            postPrivateBalance = await getTokenBalanceByAdmin(userAddress);
            console.log({postPublicBalance, postPrivateBalance})
            expect(postPublicBalance).to.equal(prePublicBalance - amount);
            expect(postPrivateBalance).to.equal(prePrivateBalance + amount);
        });
    })
});


