// test/PrivateToken.test.js
const { expect } = require('chai');
const { ethers } = require('hardhat');
const { TestConfig } = require('../config/TestConfig');
const { TokenTestHelper,TokenType, CommentType } = require('../help/TokenTestHelper');
const {createApiClient} = require('../help/ApiTestHelper');
const accounts = require('../../deployments/account.json');
const {
    callPrivateCancel,
    callPrivateRevoke,
    callPrivateTransferFrom,
    getSplitTokenList,
    getAccount,
    registerUser,
    updateAccountStatus, isBlackList, addToBlackList, getEvents, callPrivateMint, removeFromBlackList,
    callPrivateTransfer
} = require('../help/testHelp');
const {applyProviderWrappers} = require("hardhat/internal/core/providers/construction");


describe('Account service cases', function () {
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
        // await helper.mint(accounts.Minter,100)

    });

    describe('update account status', function () {
        const user = accounts.To1 ;

        it('query account status', async function () {
            const result = await apiClient.queryAccount({ accountAddress: user });
            expect(result.accountAddress.toLowerCase()).equal(user.toLowerCase());
        });
        it('update account of node3 to Active', async function () {
            let result = await apiClient.queryAccount({ accountAddress: user });
            const preStatus = result.accountStatus;
            // update to ACCOUNT_STATUS_INACTIVE
            if (preStatus === 'ACCOUNT_STATUS_INACTIVE'){
                await apiClient.updateAccountStatus({
                    accountAddress: user,
                    accountStatus: 'ACCOUNT_STATUS_ACTIVE'
                });
            }
            await waitForStatus(user, 'ACCOUNT_STATUS_ACTIVE');
            await helper.mint(user,100)
        });
        it('update account of node3 to Inactive', async function () {
            let { accountStatus } = await apiClient.queryAccount({ accountAddress: user });
            if (accountStatus === 'ACCOUNT_STATUS_ACTIVE') {
                await apiClient.updateAccountStatus({
                    accountAddress: user,
                    accountStatus:  'ACCOUNT_STATUS_INACTIVE',
                });

                await waitForStatus(user, 'ACCOUNT_STATUS_INACTIVE');
            }
            if (accountStatus === 'ACCOUNT_STATUS_INACTIVE'){
                // transfer to
                await expect(helper.transfer(helper.wallets.minter, user, 10, metadata.minter)).reverted
                await expect(helper.mint(user, 10)).reverted
                try {
                    await helper.approveTransferFrom(
                        helper.wallets.to1,
                        helper.wallets.spender,
                        accounts.To2,
                        10,
                        metadata.to1
                    );
                    await sleep(3000);
                }catch ( error){
                    expect(error.details).equal('current account is not active')
                }
            }

        });

        it('update account of node4 to Inactive - should fail', async function () {
            const user = testConfig.institutions.node4.users[0].address
            let result = await apiClient.queryAccount({ accountAddress: user });
            const preStatus = result.accountStatus;
            // update to ACCOUNT_STATUS_INACTIVE
            if (preStatus === 'ACCOUNT_STATUS_ACTIVE'){
                result = await apiClient.updateAccountStatus({
                    accountAddress: user,
                    accountStatus: 'ACCOUNT_STATUS_INACTIVE'
                });
                const requestId = result.requestId;
                await sleep(10000)
                result = await apiClient.queryAccountActionStatus(requestId)
                expect(result.status).equal('ASYNC_ACTION_STATUS_FAIL')
                expect(result.message).equal('User not managed by this institution')
            }
        });
        after(async function () {
            await apiClient.updateAccountStatus({
                accountAddress: user,
                accountStatus: 'ACCOUNT_STATUS_ACTIVE'
            });
            await sleep(5000)
        });
    });

    describe('register and update account', function () {
        let userWallet, userAddress;
        let result;

        before(async function () {
            userWallet = ethers.Wallet.createRandom();
            userAddress = userWallet.address;
        });

        it('register account', async function () {
            const request = {
                accountAddress: userAddress,
                accountRoles: 'admin,normal',
                firstName: 'David',
                lastName: 'Doe',
                phoneNumber: '(555) 123-4567',
                email: 'david.doe@example.com',
            };
            console.log(request);
            result = await apiClient.regesterAccount(request);
            console.log(result);
            result = await apiClient.queryAccount({ accountAddress: userAddress });
            console.log(result);
            expect(result.accountAddress.toLowerCase()).equal(request.accountAddress.toLowerCase());
            expect(result.accountStatus).equal('ACCOUNT_STATUS_INACTIVE');
            expect(result.accountRoles).equal(request.accountRoles);
            expect(result.firstName).equal(request.firstName);
            expect(result.lastName).equal(request.lastName);
            expect(result.phoneNumber).equal(request.phoneNumber);
            expect(result.email).equal(request.email);
        });
        it('update account to active automatically', async function () {
            await waitForStatus(userAddress, 'ACCOUNT_STATUS_ACTIVE');

        });

        it('register without email – should fail', async function () {
            const tmpWallet = ethers.Wallet.createRandom();
            const request = {
                accountAddress: tmpWallet.address,
                accountRoles: 'normal',
                firstName: 'Email',
                lastName: 'Less',
                phoneNumber: '(000) 000-0001',
                // email 缺失
            };
            try {
                await apiClient.regesterAccount(request);
            }catch ( error){
                console.log(error.response.data)
                expect(error.response.status).equal(400)
            }

        });

        it('register without phone – should fail', async function () {
            const tmpWallet = ethers.Wallet.createRandom();
            const request = {
                accountAddress: tmpWallet.address,
                accountRoles: 'normal',
                firstName: 'Phone',
                lastName: 'Less',
                email: 'phoneless@example.com',
                // phoneNumber 缺失
            };
            try {
                await apiClient.regesterAccount(request);
            }catch ( error){
                console.log(error.response.data)
                expect(error.response.status).equal(400)
            }
        });

        it('register without first/last name – should fail', async function () {
            const tmpWallet = ethers.Wallet.createRandom();
            const request = {
                accountAddress: tmpWallet.address,
                // accountRoles: 'normal',
                firstName: 'Roles',
                lastName: 'Less',
                email: 'rolesless@example.com',
                phoneNumber: '(000) 000-0002',
                // firstName / lastName 缺失
            };
            try {
                await apiClient.regesterAccount(request);
            }catch ( error){
                console.log(error.response.data)
                expect(error.response.status).equal(400)
            }
        });
        it('register without roles – should fail', async function () {
            const tmpWallet = ethers.Wallet.createRandom();
            const request = {
                accountAddress: tmpWallet.address,

                accountRoles: 'normal',
                email: 'noname@example.com',
                phoneNumber: '(000) 000-0002',
                // firstName / lastName 缺失
            };
            try {
                await apiClient.regesterAccount(request);
            }catch ( error){
                console.log(error.response.data)
                expect(error.response.status).equal(400)
            }
        });

        it('register with same address - account exist', async function () {
            const request = {
                accountAddress: userAddress,
                accountRoles: 'admin,normal',
                firstName: 'David',
                lastName: 'Doe',
                phoneNumber: '(555) 123-4567',
                email: 'david.doe2@example.com',
            };
            await apiClient.regesterAccount(request);
            const result = await apiClient.queryAccount({ accountAddress: userAddress });
            expect(result.email).not.equal(request.email); // 第一次的数据仍保留
        });

        it('register with different address and same infos - should success', async function () {
            userWallet = ethers.Wallet.createRandom();
            userAddress = userWallet.address;
            const request = {
                accountAddress: userAddress,
                accountRoles: 'admin,normal',
                firstName: 'David',
                lastName: 'Doe',
                phoneNumber: '(555) 123-4567',
                email: 'david.doe@example.com',
            };
            await apiClient.regesterAccount(request);
            const result = await apiClient.queryAccount({ accountAddress: userAddress });
            expect(result.email).equal(request.email);
        });

        it('update account infos', async function () {
            const request = {
                accountAddress: userAddress,
                accountRoles: 'normal',
                firstName: 'Davids',
                lastName: 'Does',
                phoneNumber: '(555) 123-45678',
                email: 'david.doe3@example.com',
            };
            await apiClient.updateAccount(request);
            const result = await apiClient.queryAccount({ accountAddress: userAddress });
            expect(result.firstName).equal('Davids');
            expect(result.email).equal('david.doe3@example.com');
        });

        it('update account with new address - should fail', async function () {
            const newWallet = ethers.Wallet.createRandom();
            const newAddress = newWallet.address;
            const request = {
                accountAddress: newAddress,
                accountRoles: 'normal',
                firstName: 'Davids',
                lastName: 'Does',
                phoneNumber: '(555) 123-45678',
                email: 'david.doe3@example.com',
            };
            await apiClient.updateAccount(request);
            try {
                await apiClient.queryAccount({ accountAddress: newAddress });
            } catch (error) {
                console.log(error.response.data)
                expect(error.response.status).equal(404);
                expect(error.response.data.message).equal('Account not found');
            }
        });

        it('operate with registed address - should success', async function () {
            // 若当前未激活，则激活
            let result = await apiClient.queryAccount({ accountAddress: userAddress });
            if (result.accountStatus === 'ACCOUNT_STATUS_INACTIVE') {
                await apiClient.updateAccountStatus({
                    accountAddress: userAddress,
                    accountStatus: 'ACCOUNT_STATUS_ACTIVE',
                });
            }

            // 轮询直到链上/库内状态真正变为 ACTIVE
            await waitForStatus(userAddress, 'ACCOUNT_STATUS_ACTIVE');

            // 以下业务操作与之前保持一致
            const l1Provider = helper.ethersProvider;
            const wallet = new ethers.Wallet(userWallet.privateKey, l1Provider);
            const userMeta = await helper.createMetadata(userWallet.privateKey);
            const preBalance = await helper.getPrivateBalance(userAddress);
            await helper.mint(userAddress, 100);
            const afterMintBalance = await helper.getPrivateBalance(userAddress);
            expect(afterMintBalance).equal(preBalance + 100);
            await helper.transfer(wallet, accounts.To1, 10, userMeta);
            const afterTransferBalance = await helper.getPrivateBalance(userAddress);
            console.log(afterTransferBalance,afterMintBalance)
            expect(afterTransferBalance).equal(afterMintBalance - 10);
        });
    });

    describe.skip('register institution and update it', function () {
        const pkX = '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d217'
        const pkY = '0x4a202a0b8b7c1f0e0f7c0c4c0f1f0e0d0c0b0a0f0e0d0c0b0a0f0e0d0c0b0a0f0e0d0c0b0a0f0e0d0c0b0a0f0e0d0c0b0a0f0e0d0c0b0a0f0e0d0c0b0a0f0e0d0c0b0a0f0'



    });
});
// 辅助函数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}