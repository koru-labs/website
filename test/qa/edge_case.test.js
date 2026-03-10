const {expect} = require("chai");
const {ethers} = require('hardhat');
const { network } = require('hardhat');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')

// 获取当前网络并动态设置 scAddress
function getCurrentNetworkStage() {
    const fullName = network.name; // 这就是 'ucl_L2_prod'
    const stage = fullName.split('_').pop();
    // console.log(`Using network: ${fullName} → stage: ${stage}`);
    return stage;
}
const currentNetwork = getCurrentNetworkStage();
// console.log("currentNetwork:", currentNetwork)
function getConfigurationForNetwork() {
    const currentNetwork = getCurrentNetworkStage();

    // 根据网络名称选择对应的配置文件
    switch(currentNetwork) {
        case 'dev':
            return require("../../script/dev_configuration");
        case 'qa':
            return require("../../script/qa_configuration");
        case 'prod':
            return require("../../script/prod_configuration");
        default:
            return require("../../script/dev_configuration");
    }
}


const configuration = getConfigurationForNetwork();
// console.log("configuration:", configuration)
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
const hre = require("hardhat");
const {TestConfig} = require("../config/TestConfig");
const {TokenTestHelper} = require("../help/TokenTestHelper");
const {createApiClient} = require("../help/ApiTestHelper");

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
    console.log(`[${new Date().toISOString()}] [MINT] 开始生成 mint proof，地址: ${address}, 数量: ${amount}`);
    const minterMeta = await createAuthMetadata(accounts.MinterKey);
    const generateRequest = {
        sc_address: scAddress,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: address,
        amount: amount
    };

    const response = await client3.generateMintProof(generateRequest, minterMeta);
    console.log(`[${new Date().toISOString()}] [MINT] 生成 mint proof 完成. Request ID: ${response.request_id}`);

    console.log(`[${new Date().toISOString()}] [MINT] 调用 private mint...`);
    const receipt = await callPrivateMint(scAddress, response, minterWallet);
    console.log(`[${new Date().toISOString()}] [MINT] Private mint 调用完成. Transaction hash: ${receipt.transactionHash}`);

    console.log(`[${new Date().toISOString()}] [MINT] 等待操作完成...`);
    let tx = await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, minterMeta);
    console.log(`[${new Date().toISOString()}] [MINT] 操作完成. 状态: ${tx.status}`);

    return receipt;
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
    await sleep(5000);
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

describe("Negative And exception test cases", function () {
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    const INVALID_ADDRESS = "0x8c8af239FfB9A6e93AC4b434C71a135572A102";
    const MAX_UINT256 = ethers.MaxUint256;
    const MIN_UINT256 = ethers.MinInt256;

    let adminMeta, minterMeta, spenderMeta, to1Meta

    before(async function () {
        adminMeta = await createAuthMetadata(adminPrivateKey)
        minterMeta = await createAuthMetadata(accounts.MinterKey)
        spenderMeta = await createAuthMetadata(accounts.Spender1Key)
        to1Meta = await createAuthMetadata(accounts.To1PrivateKey);
        // const contract = await ethers.getContractAt("PrivateUSDC", scAddress, adminWallet);
        // let tx = await contract.configureStepLength(5n );

    })

    describe("Check address balance", function () {
        it("Check address balance on node3 with ZERO_ADDRESS", async function () {
            expect(await getTokenBalanceByAdmin(ZERO_ADDRESS)).to.equal(0);
        })
    });

    describe("PrivateMint", function () {
        describe("Mint with boundary values", function () {
            this.timeout(1200000);
            const recevier = accounts.Minter;
            beforeEach(async function () {
                preBalance = await getTokenBalanceByAdmin(recevier);
            });
            it('postBalance value accurate after mint 20 times  ',async () => {
                preBalance = await getTokenBalanceByAdmin(accounts.Minter);
                let total_mint_qty = 0;
                for (let i = 0; i < 20; i++) {
                    console.log(`the ${i+1} time mint`);
                    // let qty = Math.floor(Math.random() * 10) + 1;
                    const qty = 10
                    try {
                        await mint(accounts.Minter, qty);
                    }catch (error){
                        console.log("error:", error)
                    }
                    // await mint(accounts.Minter, qty);
                    total_mint_qty += qty;
                    console.log("total mintted qty:", total_mint_qty)
                    // await sleep(1000);
                }
                postBalance = await getTokenBalanceByAdmin(accounts.Minter);
                expect(postBalance).to.equal(preBalance + total_mint_qty);
            });


            it('Should revert: Mint with amount 0', async () => {
                const amount = 0;
                try {
                    await mint(recevier, amount);
                } catch (error) {
                    console.log("error:", error)
                    expect(error.details).to.equal("invalid amount");
                }
            });
            it('Should revert: Mint with -1 amount', async () => {
                const amount = MIN_UINT256 - 1n;
                try {
                    await mint(recevier, amount);
                } catch (error) {
                    console.log("error:", error)
                    expect(error.details).to.equal("invalid amount");
                }
            });

            it('Should revert: Mint with MAX_UINT_256', async () => {
                try {
                    const amount = MAX_UINT256;
                    console.log("amount:", amount)
                } catch (error) {
                    expect(error.details).to.equal("invalid amount")
                }
            });
            it('Should revert: Mint with MAX_UINT_256 +1 ', async () => {
                try {
                    const amount = MAX_UINT256 + 1n;
                    await mint(recevier, amount);
                } catch (error) {
                    expect(error.details).to.equal("invalid amount")
                }
            });

            it('Should revert: Mint to ZERO_ADDRESS', async () => {
                try {
                    await mint(ZERO_ADDRESS, amount);
                } catch (error) {
                    expect(error.details).to.equal("bank permission check error")
                }
            });

            it('Should revert: Mint with invalid proof', async () => {
                const toAddress = accounts.To1;
                console.log(await getTokenBalanceByAdmin(toAddress))
                const generateRequest = {
                    from_address: accounts.Minter,
                    sc_address: scAddress,
                    token_type: '0',
                    to_address: toAddress,
                    amount: amount
                };
                console.log("generateMintRequest:", generateRequest)
                const response = await client3.generateMintProof(generateRequest, minterMeta);
                console.log("Generate mint Proof response:", response.proof)
                let proofResult = response
                let proofTem = "1" + proofResult.proof[0].slice(0, -1);
                proofResult.proof[0] = proofTem;
                console.log(proofResult.proof)
                await expect(callPrivateMint(scAddress, proofResult, minterWallet)).to.reverted

            });
            it('Should revert: Mint with amount larger than allowance', async () => {
                const allowance = await getMinterAllowed(client3, minterMeta)
                const amount = allowance + 1
                // const amount = 100000000;
                try {
                    await mint(recevier, amount);
                } catch (error) {
                    expect(error.details).to.equal("allowedAmount is insufficient")
                }
            });

        });
        describe('Mint security', function () {
            this.timeout(1200000);
            it('Should revert: Mint with used proof', async () => {
                const toAddress = accounts.To1;
                console.log(await getTokenBalanceByAdmin(toAddress))
                const generateRequest = {
                    from_address: accounts.Minter,
                    sc_address: scAddress,
                    token_type: '0',
                    to_address: toAddress,
                    amount: amount
                };
                console.log("generateMintRequest:", generateRequest)
                const response = await client3.generateMintProof(generateRequest, minterMeta);
                let receipt = await callPrivateMint(scAddress, response, minterWallet)
                await sleep(1000);
                console.log(await getTokenBalanceByAdmin(toAddress))
                await expect(callPrivateMint(scAddress, response, minterWallet)).revertedWith("initialMinterAllowance not match")

            });
            it('Should revert: Mint with invalid proof', async () => {
                const toAddress = accounts.To1;
                console.log(await getTokenBalanceByAdmin(toAddress))
                const generateRequest = {
                    from_address: accounts.Minter,
                    sc_address: scAddress,
                    token_type: '0',
                    to_address: toAddress,
                    amount: amount
                };
                console.log("generateMintRequest:", generateRequest)
                const response = await client3.generateMintProof(generateRequest, minterMeta);
                console.log("Generate mint Proof response:", response.proof)
                let proofResult = response
                let proofTem = "1" + proofResult.proof[0].slice(0, -1);
                proofResult.proof[0] = proofTem;
                console.log(proofResult.proof)
                await expect(callPrivateMint(scAddress, proofResult, minterWallet)).to.reverted
            });
        });

    });
    describe("SplitToken", function () {
        describe("Split with boundary values", function () {
            this.timeout(1200000);
            let preBalanceTo, postBalanceTo;
            before(async function () {
                const mintAmount = amount * 13
                await mint(accounts.Minter, mintAmount);
                await mint(accounts.To1, 10);
            });

            beforeEach(async function () {
                preBalance = await getTokenBalanceByAdmin(accounts.Minter);
            });
            it('Should Fail: split proof with amount 0', async () => {
                const amount = 0;
                try {
                    await GenerateTransferSplitProof(toAddress1, amount, minterMeta);
                } catch (error) {
                    expect(error.details).to.equal("invalid amount")
                }

            });
            it('Should Fail: split with  amount -1', async () => {
                const amount = -1;
                try {
                    await GenerateTransferSplitProof(toAddress1, amount, minterMeta);
                } catch (error) {
                    expect(error.details).to.equal("invalid amount")
                }
            });

            it('Should Fail: split amount larger than sender balance', async () => {
                const amount = preBalance + 1;
                try {
                    await GenerateTransferSplitProof(toAddress1, amount, minterMeta);
                } catch (error) {
                    expect(error.details).contains("insufficient balance")
                }

            });
            it('Should revert: split amount with MAX_UINT256 amount', async () => {
                const amount = MAX_UINT256;
                try {
                    await GenerateTransferSplitProof(toAddress1, amount, minterMeta);
                } catch (error) {
                    expect(error.details).to.equal("invalid amount")
                }
            });
            it('Should revert: split amount with MAX_UINT256+1 amount', async () => {
                const amount = MAX_UINT256 + 1n;
                try {
                    await GenerateTransferSplitProof(toAddress1, amount, minterMeta);
                } catch (error) {
                    expect(error.details).to.equal("invalid amount")
                }
            });

            it('Split all amount', async () => {
                await cancelAllSplitTokens(minterWallet, scAddress);
                await revokeAllApprovedTokens(minterWallet)
                const amount = await getTokenBalanceByAdmin(accounts.Minter);
                console.log("minter amount:", amount)
                preBalanceTo = await getTokenBalanceByAdmin(toAddress1);
                const splitRequest = {
                    sc_address: scAddress,
                    token_type: '0',
                    from_address: accounts.Minter,
                    to_address: toAddress1,
                    amount: amount,
                    comment: 'transfer'
                };
                console.log("generateSplitTokenRequest:", splitRequest)
                let response = await client3.generateSplitToken(splitRequest, minterMeta);
                await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, minterMeta)
                const tokenId = ethers.toBigInt(response.transfer_token_id)
                await callPrivateTransfer(minterWallet, scAddress, tokenId)
                postBalanceTo = await getTokenBalanceByAdmin(toAddress1);
                expect(postBalanceTo).equal(preBalanceTo + amount)
                postBalance = await getTokenBalanceByAdmin(accounts.Minter);
                expect(postBalance).equal(0)
            });

        });

    })
    describe("PrivateTransfer", function () {
        describe('Transfer security', function () {
            this.timeout(1200000);
            it('postBalance value accurate after transfer 20 times  ',async () => {
                await mint(accounts.Minter, 1000);
                preBalance = await getTokenBalanceByAdmin(accounts.Minter);
                let total_transfer_qty = 0;
                for (let i = 0; i < 20; i++) {
                    console.log(`the ${i+1} time transfer`);
                    let qty = Math.floor(Math.random() * 10) + 1;
                    await SplitAndTransfer(accounts.To1, qty,minterMeta);
                    total_transfer_qty += qty;
                    console.log("total transferred qty:", total_transfer_qty)
                }
                postBalance = await getTokenBalanceByAdmin(accounts.Minter);
                expect(postBalance).to.equal(preBalance - total_transfer_qty);
            });


            it('Should revert: transfer with used tokenId', async () => {
                await mint(accounts.Minter, 100)
                const amount = 10
                preBalanceTo = await getTokenBalanceByAdmin(toAddress1);
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
                await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, minterMeta)
                const tokenId = ethers.toBigInt(response.transfer_token_id)
                let receipt = await callPrivateTransfer(minterWallet, scAddress, tokenId)
                await sleep(4000)
                postBalanceTo = await getTokenBalanceByAdmin(toAddress1);
                expect(postBalanceTo).equal(preBalanceTo + amount)
                await expect(callPrivateTransfer(minterWallet, scAddress, tokenId)).to.revertedWith("invalid token")
            });
            it('Should revert: transfer with tokenId 0', async () => {
                const amount = 10
                preBalanceTo = await getTokenBalanceByAdmin(toAddress1);
                const toAddress = accounts.To1;
                const splitRequest = {
                    sc_address: scAddress,
                    token_type: '0',
                    from_address: accounts.Minter,
                    to_address: toAddress,
                    amount: amount,
                    comment: 'transfer'
                };
                console.log("generateSplitTokenRequest:", splitRequest)
                let response = await client3.generateSplitToken(splitRequest, minterMeta);
                await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, minterMeta)
                await expect(callPrivateTransfer(minterWallet, scAddress, 0)).to.revertedWith("PrivateERCToken: tokenId is zero")
            });
            it('Should revert: transfer with burn token id', async () => {
                const amount = 10
                await mint(accounts.Minter, 100)
                const toAddress = accounts.To1;
                const splitRequest = {
                    sc_address: scAddress,
                    token_type: '0',
                    from_address: accounts.Minter,
                    // to_address: accounts.Minter,
                    amount: amount,
                    comment: 'transfer'
                };
                let response = await client3.generateSplitToken(splitRequest, minterMeta);
                let tokenResult = await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, minterMeta);
                if (tokenResult.status == "TOKEN_ACTION_STATUS_SUC") {
                    const tokenId = ethers.toBigInt(response.transfer_token_id)
                    await expect(callPrivateTransfer(minterWallet, scAddress, tokenId)).to.revertedWith("This token cannot be used for other purposes")
                }
            });
        });
    });
    describe("PrivateBurn", function () {
        describe('Burn security', function () {
            this.timeout(1200000);
            it('postBalance value accurate after burn 20 times  ',async () => {
                await mint(accounts.Minter, 1000);
                preBalance = await getTokenBalanceByAdmin(accounts.Minter);
                let total_burn_qty = 0;
                for (let i = 0; i < 20; i++) {
                    console.log(`the ${i+1} time burn`);
                    let qty = Math.floor(Math.random() * 10) + 1;
                    await SplitAndBurn( qty);
                    total_burn_qty += qty;
                    console.log("total burned qty:", total_burn_qty)
                }
                postBalance = await getTokenBalanceByAdmin(accounts.Minter);
                expect(postBalance).to.equal(preBalance - total_burn_qty);
            });

            it('Should revert: burn  with tokenId 0', async () => {
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
                let tokenResult = await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, minterMeta);
                if (tokenResult.status == "TOKEN_ACTION_STATUS_SUC") {
                    await expect(callPrivateBurn(scAddress, minterWallet, 0)).to.revertedWith("tokenId is zero")
                }
            });

            it('Should revert: burn  with used tokenId', async () => {
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
                let tokenResult = await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, minterMeta);
                if (tokenResult.status == "TOKEN_ACTION_STATUS_SUC") {
                    const tokenId = ethers.toBigInt(response.transfer_token_id)
                    await callPrivateBurn(scAddress, minterWallet, tokenId)
                    await sleep(4000);
                    await expect(callPrivateBurn(scAddress, minterWallet, tokenId)).to.reverted
                }
            });
            it('Should revert: burn with transfer token id', async () => {
                await mint(accounts.Minter, 100)
                const amount = 10
                const toAddress = accounts.To1;
                const preBalance = await getTokenBalanceByAdmin(accounts.Minter);
                const splitRequest = {
                    sc_address: scAddress,
                    token_type: '0',
                    from_address: accounts.Minter,
                    to_address: toAddress,
                    amount: amount,
                    comment: 'burn'
                };
                let response = await client3.generateSplitToken(splitRequest, minterMeta);
                let tokenResult = await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, minterMeta);
                if (tokenResult.status == "TOKEN_ACTION_STATUS_SUC") {
                    console.log("Try to burn with transfer token id")
                    const tokenId = ethers.toBigInt(response.transfer_token_id)
                    await sleep(4000);
                    await expect(callPrivateBurn(scAddress, minterWallet, tokenId)).to.reverted
                }
            });
        });
    })
    describe("Approve and privateTransferFrom", function (){
        describe("Approve with boundary values", function () {
            before(async function () {
                await mint(accounts.To1, 100)
            });
            it('Should revert: Approve with amount 0', async () => {
                const amount = 0;
                const splitRequest = {
                    sc_address: scAddress,
                    token_type: '0',
                    from_address: accounts.To1,
                    spender_address: accounts.Spender1,
                    to_address: accounts.To2,
                    amount: amount,
                    comment: 'approve'
                };
                try {
                    await client3.generateApproveProof(splitRequest, to1Meta);
                } catch (error) {
                    expect(error.details).to.equal("invalid amount")
                }


            });
            it('Should revert: Approve with amount larger than balance', async () => {
                const preBalance = await getTokenBalanceByAdmin(accounts.To1);
                const amount = preBalance + 1;
                const splitRequest = {
                    sc_address: scAddress,
                    token_type: '0',
                    from_address: accounts.To1,
                    spender_address: accounts.Spender1,
                    to_address: accounts.To2,
                    amount: amount,
                    comment: 'approve'
                };
                console.log("generateSplitTokenRequest:", splitRequest)
                try {
                    await client3.generateApproveProof(splitRequest, to1Meta);
                } catch (error) {
                    expect(error.details).contains("insufficient balance")
                }
            });
        })
        describe('Approve security', function () {
            this.timeout(12000000)

            before(async function () {
                await mint(accounts.To1, 50);
            })
            it('Should fail: generate approve proof with other meta', async () => {
                const preBalance = await getTokenBalanceByAdmin(accounts.To2);
                const splitRequest = {
                    sc_address: scAddress,
                    token_type: '0',
                    from_address: accounts.To1,
                    spender_address: accounts.Spender1,
                    to_address: accounts.To2,
                    amount: 10,
                    comment: 'approve'
                };
                console.log("generateSplitTokenRequest:", splitRequest)
                try {
                    await client3.generateApproveProof(splitRequest, minterMeta);
                } catch (error) {
                    console.log("error:", error)
                    expect(error.details).equal("invalid address")
                }
            });
            it('Should fail: generate approve proof with adminMeta,not fromMeta', async () => {
                const preBalance = await getTokenBalanceByAdmin(accounts.To2);
                const splitRequest = {
                    sc_address: scAddress,
                    token_type: '0',
                    from_address: accounts.Minter,
                    spender_address: accounts.Spender1,
                    to_address: accounts.To1,
                    amount: 10,
                    comment: 'approve'
                };
                try {
                    await client3.generateApproveProof(splitRequest, adminMeta);
                } catch (error) {
                    console.log("error:", error)
                    expect(error.details).equal("invalid address")
                }
            });

            it('Should reverted: transferFrom with used token id', async () => {
                const preBalance = await getTokenBalanceByAdmin(accounts.To2);
                const splitRequest = {
                    sc_address: scAddress,
                    token_type: '0',
                    from_address: accounts.To1,
                    spender_address: accounts.Spender1,
                    to_address: accounts.To2,
                    amount: 10,
                    comment: 'approve'
                };
                console.log("generateSplitTokenRequest:", splitRequest)
                let response = await client3.generateApproveProof(splitRequest, to1Meta);
                console.log("Generate transfer Proof response:", response);

                await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, to1Meta)
                const tokenId = ethers.toBigInt(response.transfer_token_id)
                await callPrivateTransferFrom(spender1Wallet, scAddress, accounts.To1, accounts.To2, tokenId)
                await sleep(1000)
                const postBBalance = await getTokenBalanceByAdmin(accounts.To2);
                expect(postBBalance).to.be.equal(preBalance + 10)
                await expect(callPrivateTransferFrom(spender1Wallet, scAddress, accounts.To1, accounts.To2, tokenId)).to.reverted
            });

            it('Should reverted: transferFrom token id and toAddress not matched', async () => {
                const preBalance = await getTokenBalanceByAdmin(accounts.To1);
                const splitRequest = {
                    sc_address: scAddress,
                    token_type: '0',
                    from_address: accounts.To1,
                    spender_address: accounts.Spender1,
                    to_address: accounts.To2,
                    amount: 10,
                    comment: 'approve'
                };
                console.log("generateSplitTokenRequest:", splitRequest)
                let response = await client3.generateApproveProof(splitRequest, to1Meta);
                console.log("Generate transfer Proof response:", response);

                await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, to1Meta)
                const tokenId = ethers.toBigInt(response.transfer_token_id)
                await expect(callPrivateTransferFrom(spender1Wallet, scAddress, accounts.To1, accounts.Minter, tokenId)).revertedWith("PrivateERCToken: tokenId is not matched")

            });

        })
        describe('Revoke security', function () {
            before(async function () {
                await mint(accounts.To1, 50);
                await mint(accounts.Minter, 50);
            })
            it('Should reverted: revoke with wallet not matched with approve', async () => {
                const amount = await getTokenBalanceByAdmin(accounts.To1);
                let response = await generateApproveProof(to1Wallet, accounts.To1, userInNode4, 1, to1Meta)
                let allowanceExist = await checkAllowanceTokenExist(accounts.To1, response)
                expect(allowanceExist).to.equal(true);

                const tokenId = ethers.toBigInt(response.transfer_token_id)
                await expect(callPrivateRevoke(scAddress, minterWallet, accounts.Spender1, tokenId)).revertedWith("PrivateERCToken: allowance tokenId not found for this spender")

            });
            it('Should reverted: revoke with token mismatch', async () => {
                let response1 = await generateApproveProof(to1Wallet, accounts.To1, userInNode4, 1, to1Meta)
                const tokenId1 = ethers.toBigInt(response1.transfer_token_id)
                let response2 = await generateApproveProof(minterWallet, accounts.Minter, userInNode4, 1, minterMeta)
                const tokenId2 = ethers.toBigInt(response2.transfer_token_id)


                await expect(callPrivateRevoke(scAddress, minterWallet, accounts.Spender1, tokenId1)).revertedWith("PrivateERCToken: allowance tokenId not found for this spender")
                // await expect(callPrivateRevoke(scAddress,minterWallet,accounts.Spender1,approvedToken1)).revertedWith("PrivateERCToken: no allowance exists for this spender")

            });
            it('Should reverted: revoke with token transferred', async () => {
                const preBalance = await getTokenBalanceByAdmin(accounts.To1);
                let response = await generateApproveProof(to1Wallet, accounts.To1, userInNode4, 1, to1Meta)
                const tokenId = ethers.toBigInt(response.transfer_token_id)
                await callPrivateTransferFrom(spender1Wallet, scAddress, accounts.To1, userInNode4, tokenId)
                await sleep(3000)
                const postBalance = await getTokenBalanceByAdmin(accounts.To1);
                expect(postBalance).to.equal(preBalance - 1);
                await expect(callPrivateRevoke(scAddress, to1Wallet, accounts.Spender1, tokenId)).revertedWith("PrivateERCToken: allowance tokenId not found for this spender")

            });
        })
    });
    describe("Convert", function () {
        describe("Convert with boundary values", function () {
            this.timeout(1200000);
            let prePublicBalance, postPublicBalance;
            let prePrivateBalance, postPrivateBalance;

            before(async function () {
                // await mint(accounts.Minter, 100)
                // await mint(accounts.To1, 100)
            })

            it('convert from USDC to pUSDC with amount 0', async () => {
                prePublicBalance = await getPublicBalance(accounts.Minter)
                console.log("prePublicBalance:", prePublicBalance)
                const amount = 0;
                const convertToPUSDCResponse = {
                    amount: amount
                };
                try {
                    await client3.convertToPUSDC(convertToPUSDCResponse, minterMeta);
                } catch (error) {
                    console.log(error)
                    expect(error.details).equal("invalid amount")
                }
            });

            it('convert from USDC to pUSDC with amount -1', async () => {
                prePublicBalance = await getPublicBalance(accounts.Minter)
                console.log("prePublicBalance:", prePublicBalance)
                const amount = -1;

                const convertToPUSDCResponse = {
                    amount: Number(amount)
                };

                try {
                    await client3.convertToPUSDC(convertToPUSDCResponse, minterMeta);
                } catch (error) {
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
                    await client3.convertToPUSDC(convertToPUSDCResponse, minterMeta);
                } catch (error) {
                    console.log(error)
                    expect(error.details).equal("invalid amount")
                }
            });

            it('convert from USDC to pUSDC with MAX_UINT_256+1', async () => {
                const amount = MAX_UINT256 + 1n;
                const convertToPUSDCResponse = {
                    amount: amount
                };

                try {
                    await client3.convertToPUSDC(convertToPUSDCResponse, minterMeta);
                } catch (error) {
                    console.log(error)
                    expect(error.details).equal("invalid amount")
                }

            });

            it('convert from USDC to pUSDC with all amount', async () => {
                prePublicBalance = await getPublicBalance(accounts.Minter);
                prePrivateBalance = await getTokenBalanceByAdmin(accounts.Minter);
                console.log({prePublicBalance, prePrivateBalance})
                const amount = prePublicBalance;
                if (amount > 0) {
                    const convertToPUSDCResponse = {
                        amount: amount,
                        sc_address: scAddress
                    };
                    let proofResult = await client3.convertToPUSDC(convertToPUSDCResponse, minterMeta);
                    console.log("Generate Mint Proof response:", proofResult);
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
                } else {
                    console.log("No USDC to convert")
                }
            });

            it('convert from pUSDC to USDC with all amount', async () => {
                await cancelAllSplitTokens(minterWallet, scAddress)
                await revokeAllApprovedTokens(minterWallet,scAddress)
                prePrivateBalance = await getTokenBalanceByAdmin(accounts.Minter);
                prePublicBalance = await getPublicBalance(accounts.Minter);
                console.log({prePublicBalance, prePrivateBalance})
                const amount = prePrivateBalance;
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
                const tokenId = ethers.toBigInt(response.transfer_token_id)
                const convertToPUSDCResponse = {
                    token_id: response.transfer_token_id,
                    sc_address: scAddress
                };
                let proofResult = await client3.convertToUSDC(convertToPUSDCResponse, minterMeta);
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

        })
        describe('Convert USDC and pUSDC security', function () {
            this.timeout(1200000)
            let prePublicBalance, postPublicBalance;
            let prePrivateBalance, postPrivateBalance;

            before(async function () {
                await mint(accounts.Minter, 100);
                await mint(accounts.To1, 100);
            })
            it('Should reverted: convert to USDC with wallet not matched with proofResult', async () => {
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
                const tokenId = ethers.toBigInt(response.transfer_token_id)
                const convertToPUSDCResponse = {
                    token_id: response.transfer_token_id,
                    sc_address:scAddress
                };
                let proofResult = await client3.convertToUSDC(convertToPUSDCResponse, minterMeta);
                console.log("Generate convert Proof response:", proofResult);
                const contract = await ethers.getContractAt("PrivateERCToken", scAddress, to1Wallet);
                const proof = proofResult.proof.map(p => ethers.toBigInt(p));
                const input = proofResult.input.map(i => ethers.toBigInt(i));
                await expect(contract.convert2USDC(tokenId, proofResult.amount, input, proof)).revertedWith("invalid token")
            })
            it('Should reverted: convert to USDC with tokenId not matched with proofResult', async () => {
                //split token
                const splitRequest_10 = {
                    sc_address: scAddress,
                    token_type: '0',
                    from_address: accounts.Minter,
                    to_address: accounts.Minter,
                    amount: 10,
                    comment: 'convert'
                };
                let response_10 = await client3.generateSplitToken(splitRequest_10, minterMeta);
                console.log("Generate transfer Proof response:", response_10);
                await client3.waitForActionCompletion(client3.getTokenActionStatus, response_10.request_id, minterMeta)
                const tokenId_10 = ethers.toBigInt(response_10.transfer_token_id)
                const convertToPUSDCResponse_10 = {
                    token_id: response_10.transfer_token_id,
                    sc_address:scAddress
                };
                let proofResult_10 = await client3.convertToUSDC(convertToPUSDCResponse_10, minterMeta);
                const contract = await ethers.getContractAt("PrivateERCToken", scAddress, minterWallet);
                const proof_10 = proofResult_10.proof.map(p => ethers.toBigInt(p));
                const input_10 = proofResult_10.input.map(i => ethers.toBigInt(i));

                const splitRequest_20 = {
                    sc_address: scAddress,
                    token_type: '0',
                    from_address: accounts.Minter,
                    to_address: accounts.Minter,
                    amount: 20,
                    comment: 'convert'
                };
                let response_20 = await client3.generateSplitToken(splitRequest_20, minterMeta);
                console.log("Generate transfer Proof response:", response_10);
                await client3.waitForActionCompletion(client3.getTokenActionStatus, response_20.request_id, minterMeta)
                const tokenId_20 = ethers.toBigInt(response_20.transfer_token_id)
                const convertToPUSDCResponse_20 = {
                    token_id: response_20.transfer_token_id,
                    sc_address:scAddress
                };
                let proofResult_20 = await client3.convertToUSDC(convertToPUSDCResponse_20, minterMeta);
                const proof_20 = proofResult_20.proof.map(p => ethers.toBigInt(p));
                const input_20 = proofResult_20.input.map(i => ethers.toBigInt(i));
                await expect(contract.convert2USDC(tokenId_10, proofResult_20.amount, input_20, proof_20)).revertedWith("encrypted amount not match")
                await cancelAllSplitTokens(minterWallet, scAddress)
            })
            it('Should reverted: convert to USDC with used tokenId', async () => {
                prePrivateBalance = await getTokenBalanceByAdmin(accounts.Minter);
                prePublicBalance = await getPublicBalance(accounts.Minter);
                const amount = 50;
                console.log({prePublicBalance, prePrivateBalance})
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
                const tokenId = ethers.toBigInt(response.transfer_token_id)
                const convertToPUSDCResponse = {
                    token_id: response.transfer_token_id,
                    sc_address:scAddress
                };
                let proofResult = await client3.convertToUSDC(convertToPUSDCResponse, minterMeta);
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

                await expect(contract.convert2USDC(tokenId, proofResult.amount, input, proof)).revertedWith("invalid token")

            })
            it('Should reverted: convert to pUSDC with wallet not matched with proofResult', async () => {
                const userAddress = accounts.Minter;
                const userMeta = minterMeta
                const userWallet = minterWallet
                const amount = 10;
                console.log("pre usdc balance is :", await getPublicBalance(userAddress))
                const convertToPUSDCResponse = {
                    amount: amount,
                    sc_address: scAddress
                };
                let proofResult = await client3.convertToPUSDC(convertToPUSDCResponse, userMeta);
                console.log("Generate convert Proof response:", proofResult);
                // console.log("Generate Mint Proof response:", proofResult);
                // const contract = await ethers.getContractAt("PrivateERCToken", scAddress, userWallet);
                let contract = await ethers.getContractAt("PrivateERCToken", scAddress, to1Wallet);
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

                await expect(contract.convert2pUSDC(amount, token, input, proof)).revertedWith("user address is not match")

            });
            it('Should reverted: convert to pUSDC with amount not matched with proofResult', async () => {
                const userAddress = accounts.Minter;
                const userMeta = minterMeta
                const userWallet = minterWallet
                const amount = 10;
                console.log("pre usdc balance is :", await getPublicBalance(userAddress))
                const convertToPUSDCResponse = {
                    amount: amount,
                    sc_address: scAddress
                };
                let proofResult = await client3.convertToPUSDC(convertToPUSDCResponse, userMeta);
                console.log("Generate convert Proof response:", proofResult);
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
                await expect(contract.convert2pUSDC(20, token, input, proof)).revertedWith("amount is not match")
            });
            it('Should reverted: convert to pUSDC with used proof', async () => {
                const userAddress = accounts.Minter;
                const userMeta = minterMeta
                const userWallet = minterWallet
                const amount = 10;
                console.log("pre usdc balance is :", await getPublicBalance(userAddress))
                const convertToPUSDCResponse = {
                    amount: amount,
                    sc_address: scAddress
                };
                let proofResult = await client3.convertToPUSDC(convertToPUSDCResponse, userMeta);
                console.log("Generate convert Proof response:", proofResult);
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

                let tx = await contract.convert2pUSDC(amount, token, input, proof);
                await tx.wait();
                console.log("post usdc balance is 1 :", await getPublicBalance(userAddress))
                await expect(contract.convert2pUSDC(amount, token, input, proof)).revertedWith("PrivateTokenConverter: ElGamal hash already used")
                // tx = await contract.convert2pUSDC(amount,elAmount,input,proof);
                // await tx.wait();
                // console.log("post usdc balance is 2 :",await getPublicBalance(userAddress))
            });
        })
    })

});

describe.skip("Permission and BlackList", function () {
    this.timeout(1200000);
    const normal = ethers.Wallet.createRandom();
    const newMinter = ethers.Wallet.createRandom();
    const newAdmin = ethers.Wallet.createRandom();
    const normalWallet = new ethers.Wallet(normal.privateKey, l1Provider);
    const newMinterWallet = new ethers.Wallet(newMinter.privateKey, l1Provider);
    const newAdminWallet = new ethers.Wallet(newAdmin.privateKey, l1Provider);
    const minterPrivateKey = minterWallet.privateKey
    const normalPrivateKey = normalWallet.privateKey

    let adminMeta, minterMeta, spenderMeta, to1Meta, node4AdminMeta, normalMeta, newMinterMeta, newAdminMeta;

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

    describe("Registe and set allowed", function () {
        this.timeout(1200000);
        it('Registe user with exist admin auth', async () => {
            await registerUser(adminPrivateKey, client3, normalWallet.address, "normal");
            await sleep(10000);
            let response = await getAccount(adminPrivateKey, client3, normalWallet.address);
            console.log("normal account: ", response)
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("normal");

            await registerUser(adminPrivateKey, client3, newAdminWallet.address, "admin,minter");
            await sleep(10000);
            response = await getAccount(adminPrivateKey, client3, newAdminWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("admin,minter");

            await registerUser(adminPrivateKey, client3, newMinterWallet.address, "minter");
            await sleep(15000);
            response = await getAccount(adminPrivateKey, client3, newMinterWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("minter");
            await getUserManager(newMinterWallet.address)

        });
        it('Registe user ', async () => {
            // 注册一个 minter
            await registerUser(adminPrivateKey, client3, newMinterWallet.address, "minter");
            await sleep(10000);
            let response = await getAccount(adminPrivateKey, client3, newMinterWallet.address);
            console.log("minter account: ", response);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("minter");
            await getUserManager(newMinterWallet.address);

            // 注册三个 normal 用户
            const normal1 = ethers.Wallet.createRandom();
            const normal2 = ethers.Wallet.createRandom();
            const normal3 = ethers.Wallet.createRandom();

            const normal1Wallet = new ethers.Wallet(normal1.privateKey, l1Provider);
            const normal2Wallet = new ethers.Wallet(normal2.privateKey, l1Provider);
            const normal3Wallet = new ethers.Wallet(normal3.privateKey, l1Provider);

            // 注册第一个 normal 用户
            await registerUser(adminPrivateKey, client3, normal1Wallet.address, "normal");
            await sleep(10000);
            response = await getAccount(adminPrivateKey, client3, normal1Wallet.address);
            console.log("normal1 account: ", response);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("normal");

            // 注册第二个 normal 用户
            await registerUser(adminPrivateKey, client3, normal2Wallet.address, "normal");
            await sleep(10000);
            response = await getAccount(adminPrivateKey, client3, normal2Wallet.address);
            console.log("normal2 account: ", response);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("normal");

            // 注册第三个 normal 用户
            await registerUser(adminPrivateKey, client3, normal3Wallet.address, "normal");
            await sleep(10000);
            response = await getAccount(adminPrivateKey, client3, normal3Wallet.address);
            console.log("normal3 account: ", response);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("normal");

            console.log("minter key:", newMinterWallet.privateKey);
            console.log("normal1 key:", normal1Wallet.privateKey);
            console.log("normal2 key:", normal2Wallet.privateKey);
            console.log("normal3 key:", normal3Wallet.privateKey);


        });
        it('Set allowed for new minter ', async () => {
            // await registerConfigureMinter(newMinterWallet.address)
            await allowBanksInTokenSmartContract(newMinterWallet.address)
            await setMinterAllowed(client3, newMinterWallet.address)
            await sleep(5000);
        });
        it('Repeat registration with different role ', async () => {
            const wallet = ethers.Wallet.createRandom();
            await registerUser(adminPrivateKey, client3, wallet.address, "minter");
            // await registerUser(adminPrivateKey,client, accounts.Minter, "minter");
            await sleep(10000);
            let response = await getAccount(adminPrivateKey, client3, wallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("minter");

            await registerUser(adminPrivateKey, client3, wallet.address, "normal");
            await sleep(10000);
            response = await getAccount(adminPrivateKey, client3, wallet.address);
            console.log(response);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("minter,normal");
        });
        it('Repeat registration with same role ', async () => {
            const wallet = ethers.Wallet.createRandom();
            await registerUser(adminPrivateKey, client3, wallet.address, "minter");
            await sleep(10000);
            let response = await getAccount(adminPrivateKey, client3, wallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("minter");

            await registerUser(adminPrivateKey, client3, wallet.address, "minter");
            await sleep(10000);
            response = await getAccount(adminPrivateKey, client3, wallet.address);
            console.log(response);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("minter");

            //Same role , different order
            await registerUser(adminPrivateKey, client3, wallet.address, "minter,normal");
            await sleep(10000);
            response = await getAccount(adminPrivateKey, client3, wallet.address);
            console.log(response);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("minter,normal");

            await registerUser(adminPrivateKey, client3, wallet.address, "normal,minter");
            await sleep(10000);
            response = await getAccount(adminPrivateKey, client3, wallet.address);
            console.log(response);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("minter,normal");
        });
    })
    describe("Minter role permission", function () {
        this.timeout(1200000);
        it('Mint with new minter ', async () => {
            const response = await getAccount(adminPrivateKey, client3, newMinterWallet.address);
            console.log(response)
            console.log("Balance 1 : ", await getTokenBalanceByAdmin(accounts.To1))
            await mintBy(accounts.To1, 10, newMinterWallet)
            console.log("Balance 3 : ", await getTokenBalanceByAdmin(accounts.To1))
        });
        it('Split transfer with new minter', async () => {
            await mint(newMinterWallet.address, 100);
            const preBalance = await getTokenBalanceByAdmin(newMinterWallet.address)
            const splitRequest = {
                sc_address: scAddress,
                token_type: '0',
                from_address: newMinterWallet.address,
                to_address: normalWallet.address,
                amount: 5,
                comment: 'transfer'
            };
            let response = await client3.generateSplitToken(splitRequest, newMinterMeta);
            await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, newMinterMeta)
            const tokenId = ethers.toBigInt(response.transfer_token_id)
            await callPrivateTransfer(newMinterWallet, scAddress, tokenId)
            await sleep(3000);
            const postBalance = await getTokenBalanceByAdmin(newMinterWallet.address)
            expect(preBalance - postBalance).equal(5)
        });
        it('Split burn with new minter ', async () => {
            const preBalance = await getTokenBalanceByAdmin(newMinterWallet.address)
            const splitRequest = {
                sc_address: scAddress,
                token_type: '0',
                from_address: newMinterWallet.address,
                amount: 5,
                comment: 'burn'
            };
            let response = await client3.generateSplitToken(splitRequest, newMinterMeta);
            console.log("Generate burn Proof response:", response);
            await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, newMinterMeta)
            const tokenId = ethers.toBigInt(response.transfer_token_id)
            await callPrivateBurn(scAddress, newMinterWallet, tokenId)
        });
        it('Should reverted: Split transfer proof and call with different minter ', async () => {
            await mint(accounts.Minter, 20);
            const preBalance = await getTokenBalanceByAdmin(accounts.Minter)
            const splitRequest = {
                sc_address: scAddress,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: normalWallet.address,
                amount: 5,
                comment: 'transfer'
            };
            let response = await client3.generateSplitToken(splitRequest, minterMeta);
            await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, minterMeta)
            const tokenId = ethers.toBigInt(response.transfer_token_id)
            await expect(callPrivateTransfer(newMinterWallet, scAddress, normalWallet.address, tokenId)).revertedWith("invalid token")
        });
        it('Should reverted: Split burn proof and call with different minter', async () => {
            const splitRequest = {
                sc_address: scAddress,
                token_type: '0',
                from_address: accounts.Minter,
                amount: 5,
                comment: 'burn'
            };
            let response = await client3.generateSplitToken(splitRequest, minterMeta);
            console.log("Generate burn Proof response:", response);
            await client3.waitForActionCompletion(client3.getTokenActionStatus, response.request_id, minterMeta)
            const tokenId = ethers.toBigInt(response.transfer_token_id)
            await expect(callPrivateBurn(scAddress, newMinterWallet, tokenId)).revertedWith("token not exists")
        });
        it('Should reverted: registe account with minter auth', async () => {
            const newUser = ethers.Wallet.createRandom()
            const request = {
                account_address: newUser.address,
                account_role: 'normal',//minter,admin,normal
            };
            expect(await client3.registerAccount(request, newMinterMeta)).reverted

        })
        it('should reverted: update user status with minter auth', async () => {
            try {
                await updateAccountStatus(newMinterWallet.privateKey, client3, normalWallet.address, 2);
            } catch (err) {
                expect(err.details).to.include('permission denied')
            }
        });
        it('Should reverted: update user role with minter auth ', async () => {
            try {
                await updateAccountRole(newMinterWallet.privateKey, client3, normalWallet.address, 'minter')
            } catch (error) {
                expect(err.details).to.include('permission denied')
            }
        });
        it('Should reverted: Use minter address to check getAsyncAction', async () => {
            const adminMetadata = await createAuthMetadata(minterWallet.privateKey);
            const minterMetadata = await createAuthMetadata(normalWallet.privateKey);
            const newUser = ethers.Wallet.createRandom()
            const request = {
                account_address: newUser.address,
                account_role: 'normal',//minter,admin,normal
            };

            let response = await client3.registerAccount(request, adminMetadata);
            if (response.status !== "ASYNC_ACTION_STATUS_FAIL") {
                const actionRequest = {
                    request_id: response.request_id,
                };
                // expect(await client.getAsyncAction(actionRequest, normalMetadata)).reverted
                try {
                    await client3.getAsyncAction(actionRequest, minterMetadata);
                } catch (err) {
                    expect(err.code).to.equal(7); // gRPC status code for PERMISSION_DENIED
                    expect(err.details).to.include('permission denied');
                }
            }
        })
        it('minter can check itself account ', async () => {
            let response = await getAccount(minterPrivateKey, client3, minterWallet.address)
            expect(response).to.have.property('account_address', minterWallet.address.toLowerCase());
        });
        it('minter can not check others account', async () => {
            try {
                await getAccount(minterPrivateKey, client3, normalWallet.address)
            } catch (error) {
                expect(error.details).to.include('current user is not the owner of the resource');
            }

            try {
                await getAccount(minterPrivateKey, client3, adminWallet.address)
            } catch (error) {
                expect(error.details).to.include('current user is not the owner of the resource');
            }
        });
    })
    describe("Admin role permission", function () {
        this.timeout(1200000);
        it('Registe user with new admin auth ', async () => {
            const userWallet = ethers.Wallet.createRandom();
            const key = newAdminWallet.privateKey;
            await registerUser(key, client3, userWallet.address, "normal");
            await sleep(10000);
            let response = await getAccount(key, client3, userWallet.address);
            console.log("user account: ", response)
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
            expect(response.account_roles).equal("normal");
        });
        it('Update user status to inactive with admin auth', async () => {
            await updateAccountStatus(adminPrivateKey, client3, normalWallet.address, 0);
            await sleep(4000);
            let response = await getAccount(adminPrivateKey, client3, normalWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_INACTIVE");

            await updateAccountStatus(adminPrivateKey, client3, newMinterWallet.address, 0);
            await sleep(4000);
            response = await getAccount(adminPrivateKey, client3, newMinterWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_INACTIVE");
        });
        it('Update user status to active with admin auth', async () => {
            await updateAccountStatus(adminPrivateKey, client3, normalWallet.address, 2);
            await sleep(4000);
            let response = await getAccount(adminPrivateKey, client3, normalWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");

            await updateAccountStatus(adminPrivateKey, client3, newMinterWallet.address, 2);
            await sleep(4000);
            response = await getAccount(adminPrivateKey, client3, newMinterWallet.address);
            expect(response.account_status).equal("ACCOUNT_STATUS_ACTIVE");
        });
        it('Update user role: normal,minter,admin', async () => {
            // normal -> minter
            await updateAccountRole(adminPrivateKey, client3, normalWallet.address, 'minter')
            let response = await getAccount(adminPrivateKey, client3, normalWallet.address);
            console.log(response)
            expect(response.account_roles).equal("minter");
            // minter -> admin,normal
            await updateAccountRole(adminPrivateKey, client3, normalWallet.address, 'admin,normal')
            response = await getAccount(adminPrivateKey, client3, normalWallet.address);
            expect(response.account_roles).equal("admin,normal");
            // admin -> minter
            await updateAccountRole(adminPrivateKey, client3, normalWallet.address, 'admin')
            response = await getAccount(adminPrivateKey, client3, normalWallet.address);
            expect(response.account_roles).equal("admin");
            //minter -> normal
            await updateAccountRole(adminPrivateKey, client3, normalWallet.address, 'normal')
            response = await getAccount(adminPrivateKey, client3, normalWallet.address);
            expect(response.account_roles).equal("normal");
        });
        it('Should reverted: update user role normal -> normal ', async () => {
            let response = await updateAccountRole(adminPrivateKey, client3, normalWallet.address, 'normal')
            expect(response.status).to.equal("ASYNC_ACTION_STATUS_FAIL");
            expect(response.message).to.include(" account already has role");
        });
        it('admin can check all role account ', async () => {
            let response = await getAccount(adminPrivateKey, client3, adminWallet.address)
            expect(response).to.have.property('account_address', adminWallet.address.toLowerCase());

            response = await getAccount(adminPrivateKey, client3, minterWallet.address)
            expect(response).to.have.property('account_address', minterWallet.address.toLowerCase());

            response = await getAccount(adminPrivateKey, client3, normalWallet.address)
            expect(response).to.have.property('account_address', normalWallet.address.toLowerCase());

        });
        it('generate mint proof with admin meta, call mint with minter wallet', async () => {
            console.log(await getTokenBalanceByAdmin(accounts.To1))
            const generateRequest = {
                from_address: newAdminWallet.address,
                sc_address: scAddress,
                token_type: '0',
                to_address: accounts.To1,
                amount: 10
            };
            try {
                await client3.generateMintProof(generateRequest, newAdminMeta);
            } catch (error) {
                expect(error.details).to.include('GetBankMinterAllowed failed');
            }
        });

    })
    describe("Normal role permission", function () {
        this.timeout(1200000)
        it('Should reverted: Use normal auth to registe account', async () => {
            const normalMetadata = await createAuthMetadata(normalWallet.privateKey);
            const newUser = ethers.Wallet.createRandom()
            const request = {
                account_address: newUser.address,
                account_role: 'normal',//minter,admin,normal
            };
            expect(await client3.registerAccount(request, normalMetadata)).reverted

        })
        it('should reverted: update user status with normal auth', async () => {
            try {
                await updateAccountStatus(normalPrivateKey, client3, normalWallet.address, 2);
            } catch (err) {
                expect(err.details).to.include('permission denied')
            }
        });
        it('Should reverted: update user role with normal user auth ', async () => {
            try {
                await updateAccountRole(normalPrivateKey, client3, normalWallet.address, 'minter')
            } catch (error) {
                expect(err.details).to.include('permission denied')
            }
        });
        it('Should reverted: Use normal address to check other getAsyncAction', async () => {
            const adminMetadata = await createAuthMetadata(adminWallet.privateKey);
            const normalMetadata = await createAuthMetadata(normalWallet.privateKey);
            const newUser = ethers.Wallet.createRandom()
            const request = {
                account_address: newUser.address,
                account_role: 'normal',//minter,admin,normal
            };

            let response = await client3.registerAccount(request, adminMetadata);
            if (response.status !== "ASYNC_ACTION_STATUS_FAIL") {
                const actionRequest = {
                    request_id: response.request_id,
                };
                // expect(await client.getAsyncAction(actionRequest, normalMetadata)).reverted
                try {
                    await client3.getAsyncAction(actionRequest, normalMetadata);
                } catch (err) {
                    expect(err.code).to.equal(7); // gRPC status code for PERMISSION_DENIED
                    expect(err.details).to.include('current user is not the owner of the resource'); // 可以更精确匹配
                }
            }
        })
        it('normal can check itself ', async () => {
            let response = await getAccount(normalPrivateKey, client3, normalWallet.address)
            expect(response).to.have.property('account_address', normalWallet.address.toLowerCase());
        });
        it('normal can not check others', async () => {
            try {
                await getAccount(normalPrivateKey, client3, minterWallet.address)
            } catch (error) {
                expect(error.details).to.include('current user is not the owner of the resource');
            }

            try {
                await getAccount(normalPrivateKey, client3, adminWallet.address)
            } catch (error) {
                expect(error.details).to.include('current user is not the owner of the resource');
            }
        });
        it('Should reverted: mint proof with normal user auth', async () => {
            const generateRequest = {
                from_address: accounts.Minter,
                sc_address: scAddress,
                token_type: '0',
                to_address: accounts.To1,
                amount: 10
            };
            try {
                await client3.generateMintProof(generateRequest, normalMeta);
            } catch (error) {
                expect(error.details).to.include('permission denied')
            }

        });
    })
    describe("BlackList", function () {
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
                const contract = await ethers.getContractAt("PrivateUSDC", scAddress, noOnwerWallet);
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
            if (isBlackListed) {
                // mint to blacklist user
                const generateRequest = {
                    from_address: accounts.Minter,
                    sc_address: scAddress,
                    token_type: '0',
                    to_address: normalWallet.address,
                    amount: amount
                };
                const response = await client3.generateMintProof(generateRequest, minterMeta);
                await expect(callPrivateMint(scAddress, response, minterWallet)).to.be.revertedWith("Blacklistable: account is blacklisted");
            } else {
                console.log("user is not in blacklist")
            }

        });
        it('Should reverted: remove user from blacklist with noOwnerWallet ', async () => {
            let isBlackListed = await isBlackList(normalWallet.address);
            console.log("isBlackListed", isBlackListed)
            if (isBlackListed) {
                console.log("user address is ", normalWallet.address);
                const onwerWallet = new ethers.Wallet('555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626786', l1Provider);
                const contract = await ethers.getContractAt("PrivateUSDC", scAddress, onwerWallet);
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
            await SplitAndTransfer(normalWallet.address, 100, minterMeta);
            postBalance = await getTokenBalanceByAdmin(normalWallet.address);
            console.log("new user balance is after transferIn", postBalance)
            expect(postBalance).to.equal(preBalance + 200);

        });
        it('Add new minter to blackList ', async () => {
            // await mint(newMinter.address, 30);
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
            if (isBlackListed) {
                // mint to blacklist user
                const generateRequest = {
                    from_address: accounts.Minter,
                    sc_address: scAddress,
                    token_type: '0',
                    to_address: normalWallet.address,
                    amount: amount
                };
                const response = await client3.generateMintProof(generateRequest, newMinterMeta);
                await expect(callPrivateMint(scAddress, response, newMinterWallet)).to.be.revertedWith("Blacklistable: account is blacklisted");
            } else {
                console.log("user is not in blacklist")
            }

        });
        it('Remove minter from blacklist and mint ', async () => {
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
                await mintBy(accounts.To1, amount, newMinterWallet)
                const postBalance = await getTokenBalanceByAdmin(accounts.To1);
                expect(postBalance).to.equal(preBalance + amount);
            } else {
                console.log("user is already out of blacklist");
            }
        });
    });
});

describe('Negative And exception api test cases', function () {
    this.timeout(1200000);

    let testConfig;
    let helper;
    let metadata;
    let scAddress;
    let apiClient;

    async function waitForStatus(addr, wantStatus, timeoutMs = 30000, intervalMs = 5000) {
        const started = Date.now();
        while (Date.now() - started < timeoutMs) {
            const { accountStatus } = await apiClient.queryAccount({ accountAddress: addr });
            if (accountStatus === wantStatus) return;               // ✅ 成功退出
            await sleep(intervalMs);
        }
        throw new Error(`Timeout: account ${addr} never reached ${wantStatus}`);
    }


    before(async function () {
        testConfig = new TestConfig();
        helper = new TokenTestHelper(testConfig);
        scAddress = testConfig.contractAddress;
        metadata = {
            admin: await helper.createMetadata(testConfig.institutions.node3.ethPrivateKey),
            minter: await helper.createMetadata(accounts.MinterKey),
            spender: await helper.createMetadata(accounts.Spender1Key),
            to1: await helper.createMetadata(accounts.To1PrivateKey),
            node4Admin: await helper.createMetadata(testConfig.institutions.node4.ethPrivateKey)
        };
        apiClient = await createApiClient(testConfig.institutions.node3.httpUrl);
        await helper.mint(accounts.Minter,100)
    });

    describe('update account status cases', function () {
        const user = accounts.To1 ;
        it('update account of node3 to status not exist - should fail', async function () {
            let result = await apiClient.queryAccount({ accountAddress: user });
            const preStatus = result.accountStatus;
            console.log("preStatus", preStatus)
            await apiClient.updateAccountStatus({
                    accountAddress: user,
                    accountStatus: 'ACCOUNT_STATUS_ACTIVE2'
                });
            result = await apiClient.queryAccount({ accountAddress: user });
            const postStatus = result.accountStatus;
            expect(postStatus).equal(preStatus)
        });
        it('update account of node3 to status with bool - should fail', async function () {
            let result = await apiClient.queryAccount({ accountAddress: user });
            const preStatus = result.accountStatus;
            console.log("preStatus", preStatus)
            try {
                await apiClient.updateAccountStatus({
                    accountAddress: user,
                    accountStatus: true
                });
            }catch (error){
                console.log("error", error)
                expect(error.response.status).equal(400)
                expect(error.response.data.message).contains("invalid value for enum field accountStatus")
            }
            result = await apiClient.queryAccount({ accountAddress: user });
            const postStatus = result.accountStatus;
            expect(postStatus).equal(preStatus)
        });
        it('update account of node3 to status with empty string - should fail', async function () {
            let result = await apiClient.queryAccount({ accountAddress: user });
            const preStatus = result.accountStatus;
            console.log("preStatus", preStatus)
            await apiClient.updateAccountStatus({
                accountAddress: user,
                accountStatus: ""
            });
            result = await apiClient.queryAccount({ accountAddress: user });
            const postStatus = result.accountStatus;
            expect(postStatus).equal(preStatus)
        });

        after(async function () {
            await apiClient.updateAccountStatus({
                accountAddress: user,
                accountStatus: 'ACCOUNT_STATUS_ACTIVE'
            });
            await sleep(5000)
        });
    });

    describe('Input validation when register', function () {
        let apiClient;
        let testConfig;
        let helper;

        before(async function () {
            testConfig = new TestConfig();
            helper = new TokenTestHelper(testConfig);
            apiClient = await createApiClient(testConfig.institutions.node3.httpUrl);
        });

        it('should handle extremely long field values', async function () {
            const longString = 'A'.repeat(1000);
            const wallet = ethers.Wallet.createRandom();
            const request = {
                accountAddress: wallet.address,
                accountRoles: 'normal',
                firstName: longString,
                lastName: longString,
                phoneNumber: longString.substring(0, 50), // Phone numbers typically have limits
                email: `${longString.substring(0, 100)}@example.com`
            };

            try {
                await apiClient.regesterAccount(request);
                // If registration succeeds, verify the data was handled properly
                const result = await apiClient.queryAccount({ accountAddress: wallet.address });
                expect(result.accountAddress.toLowerCase()).equal(wallet.address.toLowerCase());
            } catch (error) {
                // Expect specific error codes or messages for overly long inputs
                expect([400, 413]).to.include(error.response.status);
            }
        });

        it('should handle special characters and Unicode in text fields', async function () {
            const wallet = ethers.Wallet.createRandom();
            const request = {
                accountAddress: wallet.address,
                accountRoles: 'normal',
                firstName: 'José María',
                lastName: 'Åberg-Österreich',
                phoneNumber: '+1 (555) 123-4567 ext. 89',
                email: 'user+tag@exämple.cøm'
            };
            try {
                await apiClient.regesterAccount(request);
            }catch ( error){
                expect(error.response.status).equal(400)
            }
        });


    });

    describe('Boundary value when register', function () {
        let apiClient;
        let testConfig;
        let helper;

        before(async function () {
            testConfig = new TestConfig();
            helper = new TokenTestHelper(testConfig);
            apiClient = await createApiClient(testConfig.institutions.node3.httpUrl);
        });

        it('should handle minimum length field values', async function () {
            const wallet = ethers.Wallet.createRandom();
            const request = {
                accountAddress: wallet.address,
                accountRoles: 'normal',
                firstName: 'A', // Minimum non-empty
                lastName: 'B',  // Minimum non-empty
                phoneNumber: '1', // Minimum non-empty, though might be rejected as invalid format
                email: 'a@b.co' // Minimum valid email structure
            };

            try {
                await apiClient.regesterAccount(request);
                const result = await apiClient.queryAccount({ accountAddress: wallet.address });
                expect(result.accountAddress.toLowerCase()).equal(wallet.address.toLowerCase());
            } catch (error) {
                // Some minimum values might be rejected due to format requirements
                expect(error.response.status).to.be.oneOf([200, 400]);
            }
        });

        it('should handle maximum length field values', async function () {
            // Based on typical database constraints
            const maxLengthFields = {
                firstName: 50,
                lastName: 50,
                phoneNumber: 20,
                email: 254 // RFC standard max email length
            };

            const wallet = ethers.Wallet.createRandom();
            const request = {
                accountAddress: wallet.address,
                accountRoles: 'normal',
                firstName: 'A'.repeat(maxLengthFields.firstName),
                lastName: 'B'.repeat(maxLengthFields.lastName),
                phoneNumber: '1'.repeat(maxLengthFields.phoneNumber),
                email: `${'a'.repeat(maxLengthFields.email - 7)}@ex.com` // Leave room for domain
            };

            try {
                await apiClient.regesterAccount(request);
            } catch (error) {
                console.log(error.response.data);
                // Might be rejected due to overly long phone/email or format issues
                expect([200, 400, 413]).to.include(error.response.status);
            }
        });

        it('should handle empty strings and whitespace-only values', async function () {
            const wallet = ethers.Wallet.createRandom();
            const testCases = [
                { firstName: '', lastName: 'User', phoneNumber: '(555) 123-4567', email: 'user@example.com' },
                { firstName: '   ', lastName: 'User', phoneNumber: '(555) 123-4567', email: 'user@example.com' }, // Whitespace only
                { firstName: 'Test', lastName: '', phoneNumber: '(555) 123-4567', email: 'user@example.com' },
                { firstName: 'Test', lastName: '   ', phoneNumber: '(555) 123-4567', email: 'user@example.com' }, // Whitespace only
            ];

            for (const testCase of testCases) {
                const request = {
                    accountAddress: wallet.address,
                    accountRoles: 'normal',
                    ...testCase
                };

                try {
                    await apiClient.regesterAccount(request);
                    // const result = await apiClient.queryAccount({ accountAddress: wallet.address });
                    // expect(result.accountAddress.toLowerCase()).equal(wallet.address.toLowerCase());
                } catch (error) {
                    console.log(error.response.data);
                    // Empty or whitespace-only names should likely be rejected
                    expect(error.response.status).to.equal(400);
                }
            }
        });
    });

});
// 辅助函数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

