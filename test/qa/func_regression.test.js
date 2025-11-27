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


describe.only('Private Token - Function Cases', function () {
    this.timeout(1200000);
    const MINT_AMOUNT = 100;
    const TRANSFER_AMOUNT = 10;

    let testConfig;
    let helper;
    let metadata;
    let scAddress;
    let result;
    let node3Instution,node4Instution;
    let l1Provider;
    let proxyAddress

    before(async function () {
        testConfig = new TestConfig();
        helper = new TokenTestHelper(testConfig);
        scAddress = testConfig.contractAddress;
        node3Instution = testConfig.institutions.node3;
        node4Instution = testConfig.institutions.node4;
        l1Provider = helper.ethersProvider;
        proxyAddress = testConfig.configuration.ADDRESSES.PROXY_ADDRESS;
        metadata = {
            admin: await helper.createMetadata(testConfig.institutions.node3.ethPrivateKey),
            minter: await helper.createMetadata(accounts.MinterKey),
            spender: await helper.createMetadata(accounts.Spender1Key),
            to1: await helper.createMetadata(accounts.To1PrivateKey),
            node4Admin: await helper.createMetadata(testConfig.institutions.node4.ethPrivateKey)
        };
    });
    describe('Insititutions Check', function () {

        let registryContract;

        before(async function () {
            registryContract = await ethers.getContractAt("InstitutionUserRegistry", proxyAddress);
        });
        it('getAllInstitutions', async function () {
            const institutions = await registryContract.getAllInstitutions();
            console.log("Institutions:", institutions);
            expect(institutions[0].name).to.equal(testConfig.configuration.institutions[0].name);
        });
        it('Should node3 and node4 Institution are enabled', async function () {
            //node3
            result = await registryContract.getInstitution(node3Instution.address);
            expect(result[8].toLowerCase()).to.equal(node3Instution.address.toLowerCase());
            expect(result[13]).to.equal(false);
            //node4
            result = await registryContract.getInstitution(node4Instution.address);
            expect(result[8].toLowerCase()).to.equal(node4Instution.address.toLowerCase());
            expect(result[13]).to.equal(false);


        });
        it('should map token to institution', async function () {
            const institution = await registryContract.getTokenInstitution(testConfig.contractAddress);
            expect(institution[0]).to.equal(testConfig.configuration.institutions[0].name);

        });
        it('should map users to their managers', async function () {
            //node3
            for (const user of node3Instution.users) {
                const manager = await registryContract.getUserManager(user.address);
                console.log(`User ${user.address} manager: ${manager}`);
                expect(manager.toLowerCase()).to.equal(node3Instution.address.toLowerCase());
            }
            //node4
            for (const user of node4Instution.users) {
                const manager = await registryContract.getUserManager(user.address);
                console.log(`User ${user.address} manager: ${manager}`);
                expect(manager.toLowerCase()).to.equal(node4Instution.address.toLowerCase());
            }
        });

        it("should map institution address to their manager", async function () {
            //node3
            result = await registryContract.getInstitution(node3Instution.address);
            expect(result[8].toLowerCase()).to.equal(node3Instution.address.toLowerCase());
            //node4
            result = await registryContract.getInstitution(node4Instution.address);
            expect(result[8].toLowerCase()).to.equal(node4Instution.address.toLowerCase());

        });

        it("Should get token institution manager", async function () {
            expect(await registryContract.getTokenInstitutionManager(scAddress)).to.equal(node3Instution.address);
        });

        it("Should map user and its institution", async function () {
            //node3
            for (const user of node3Instution.users) {
                console.log(`User ${user.address} `)
                result = await registryContract.getUserInstitution(user.address);
                expect(result[8].toLowerCase()).to.equal(node3Instution.address.toLowerCase());
            }
            //node4
            for (const user of node4Instution.users) {
                console.log(`User ${user.address} `)
                result = await registryContract.getUserInstitution(user.address);
                expect(result[8].toLowerCase()).to.equal(node4Instution.address.toLowerCase());
            }

        });

        it("Should get manger Grumpkin public key", async function () {
            const pubKey = await registryContract.getUserInstGrumpkinPubKey(node3Instution.address);
            expect(pubKey.x).to.equal(node3Instution.publicKey.x);
        });

        it("Should check if address is institution manager", async function () {
            //node3
            expect(await registryContract.isInstitutionManager(node3Instution.address)).to.equal(true);
            //node4
            expect(await registryContract.isInstitutionManager(node4Instution.address)).to.equal(true);

        });

        it('get InstitutionCallers ',async () => {
            let insi
            //node3
            let adminWalletNode = new ethers.Wallet(node3Instution.ethPrivateKey, l1Provider);
            insi = await ethers.getContractAt("InstitutionUserRegistry", proxyAddress, adminWalletNode);
            result = await insi.getInstitutionCallers(adminWalletNode.address)
            console.log(`Institution ${node3Instution.name} callers: ${result}`);
            expect( result.length)>0
            //node4
            adminWalletNode = new ethers.Wallet(node4Instution.ethPrivateKey, l1Provider);
            insi = await ethers.getContractAt("InstitutionUserRegistry", proxyAddress, adminWalletNode);
            result = await insi.getInstitutionCallers(adminWalletNode.address)
            console.log(`Institution ${node4Instution.name} callers: ${result}`);
            expect( result.length)>0

        });
        it.skip("replaceInstitutionCallers for node3 and demo", async function () {
            let callerResult,result
            let adminWalletNode
            let institition
            let insi
            const proxyAdmin = new ethers.Wallet(node3Instution.ethPrivateKey, l1Provider);
            insi = await ethers.getContractAt("InstitutionUserRegistry", proxyAddress, proxyAdmin);
            //node4
            institition = testConfig.configuration.institutions[1]
            adminWalletNode = new ethers.Wallet(institition.ethPrivateKey, l1Provider);
            callerResult = await insi.getInstitutionCallers(adminWalletNode.address)
            console.log(`Institution ${institition.name} callers: ${callerResult}`);
            if (callerResult.length === 0) {
                result = await insi.replaceInstitutionCallers(adminWalletNode.address, [adminWalletNode.address])
            }
            await sleep(3000)
            //demo
            institition = testConfig.configuration.institutions[2]
            adminWalletNode = new ethers.Wallet(institition.ethPrivateKey, l1Provider);
            callerResult = await insi.getInstitutionCallers(adminWalletNode.address)
            console.log(`Institution ${institition.name} callers: ${callerResult}`);
            if (callerResult.length === 0) {
                result = await insi.replaceInstitutionCallers(adminWalletNode.address, [adminWalletNode.address])
            }
            await sleep(3000)
        });
        it.skip('Should be active of institution users ',async function (){
            let client
            //node3
            client = node3Instution.client
            let privateKey = node3Instution.ethPrivateKey;
            for (const user of node3Instution.users){
                console.log(`Node3 user ${user.address}  `)
                // console.log(client)
                let result = await getAccount(privateKey,client, user.address)
                console.log(`User ${user.address} status: ${result.account_status}`);

                // If user is not active, activate them
                if (result.account_status !== 'ACCOUNT_STATUS_ACTIVE'){
                    console.log(`User ${user.address} ${result.account_status}, need to update to active`)
                    await updateAccountStatus(privateKey,client, user.address,2)
                    // Re-check the status after update
                    result = await getAccount(privateKey,client, user.address)
                    console.log(result)
                    console.log(`User ${user.address} new status: ${result.account_status}`);
                }

                // Assert that the user is now active
                expect(result.account_status).to.equal('ACCOUNT_STATUS_ACTIVE');
            }

            //node4
            client = node4Instution.client
            privateKey = node4Instution.ethPrivateKey;
            for (const user of node4Instution.users){
                console.log(`Node4 user ${user.address} `)
                // console.log(client)
                let result = await getAccount(privateKey,client, user.address)
                console.log(`User ${user.address} status: ${result.account_status}`);

                // If user is not active, activate them
                if (result.account_status !== 'ACCOUNT_STATUS_ACTIVE'){
                    console.log(`User ${user.address} ${result.account_status}, need to update to active`)
                    await updateAccountStatus(privateKey,client, user.address,2)
                    // Re-check the status after update
                    result = await getAccount(privateKey,client, user.address)
                    console.log(result)
                    console.log(`User ${user.address} new status: ${result.account_status}`);
                }

                // Assert that the user is now active
                expect(result.account_status).to.equal('ACCOUNT_STATUS_ACTIVE');
            }
        });
    });
    describe('Private Mint', function () {
        beforeEach(async function () {
            this.minterInitialBalance = await helper.getPrivateBalance(accounts.Minter);
        });

        it('should mint tokens to minter account', async function () {
            await helper.mint(accounts.Minter, MINT_AMOUNT);

            const finalBalance = await helper.getPrivateBalance(accounts.Minter);
            expect(finalBalance).to.equal(this.minterInitialBalance + MINT_AMOUNT);
        });

        it('should mint tokens to user in same node', async function () {
            const initialBalance = await helper.getPrivateBalance(accounts.To1);

            await helper.mint(accounts.To1, MINT_AMOUNT);

            const finalBalance = await helper.getPrivateBalance(accounts.To1);
            expect(finalBalance).to.equal(initialBalance + MINT_AMOUNT);
        });

    });
    describe('Private Transfer', function () {
        const TRANSFER_AMOUNT = 10;

        it('should transfer tokens within same node', async function () {
            await helper.mint(accounts.Minter, 100);
            const senderInitialBalance = await helper.getPrivateBalance(accounts.Minter);
            const recipientInitialBalance = await helper.getPrivateBalance(accounts.To1);

            await helper.transfer(helper.wallets.minter, accounts.To1, TRANSFER_AMOUNT, metadata.minter);
            await sleep(2000)
            const senderFinalBalance = await helper.getPrivateBalance(accounts.Minter);
            const recipientFinalBalance = await helper.getPrivateBalance(accounts.To1);

            expect(senderFinalBalance).to.equal(senderInitialBalance - TRANSFER_AMOUNT);
            expect(recipientFinalBalance).to.equal(recipientInitialBalance + TRANSFER_AMOUNT);
        });

        it('should transfer all available balance', async function () {
            await helper.cancelAllSplitTokens(helper.wallets.minter);
            await helper.revokeAllApprovedTokens(helper.wallets.minter);

            const fullAmount = await helper.getPrivateBalance(accounts.Minter);
            const recipientInitialBalance = await helper.getPrivateBalance(accounts.To1);

            await helper.transfer(helper.wallets.minter, accounts.To1, fullAmount, metadata.minter);

            const senderFinalBalance = await helper.getPrivateBalance(accounts.Minter);
            const recipientFinalBalance = await helper.getPrivateBalance(accounts.To1);

            expect(senderFinalBalance).to.equal(0);
            expect(recipientFinalBalance).to.equal(recipientInitialBalance + fullAmount);
        });
        it('should transfers tokens ', async function () {
            await helper.mint(accounts.Minter, 110)
            const senderInitialBalance = await helper.getPrivateBalance(accounts.Minter);
            const recipientInitialBalance = await helper.getPrivateBalance(accounts.To1);
            await helper.transfers(helper.wallets.minter, accounts.To1, 10,10, metadata.minter)
            const TRANSFER_AMOUNT = 100;
            const senderFinalBalance = await helper.getPrivateBalance(accounts.Minter);
            const recipientFinalBalance = await helper.getPrivateBalance(accounts.To1);

            expect(senderFinalBalance).to.equal(senderInitialBalance - TRANSFER_AMOUNT);
            expect(recipientFinalBalance).to.equal(recipientInitialBalance + TRANSFER_AMOUNT);
        });
    });
    describe('Approve and TransferFrom', function () {
        before(async function () {
            await helper.mint(accounts.Minter, 100);
            await helper.mint(accounts.To1, 100);
        });

        it('should approve and transfer token', async function () {
            const ownerInitialBalance = await helper.getPrivateBalance(accounts.To1);

            await helper.approveTransferFrom(
                helper.wallets.to1,
                helper.wallets.spender,
                accounts.To2,
                10,
                metadata.to1
            );
            await sleep(3000);
            const ownerFinalBalance = await helper.getPrivateBalance(accounts.To1);
            expect(ownerFinalBalance).to.equal(ownerInitialBalance - 10);
        });

        it('should approve and transfers tokens', async function () {
            await helper.mint(accounts.To1, 100)
            const ownerInitialBalance = await helper.getPrivateBalance(accounts.To1);

            await helper.approveTransferFroms(
                helper.wallets.to1,
                helper.wallets.spender,
                accounts.To2,
                10,
                10,
                metadata.to1
            )
            await sleep(3000);
            const ownerFinalBalance = await helper.getPrivateBalance(accounts.To1);
            expect(ownerFinalBalance).to.equal(ownerInitialBalance - 100);
        });


        it('should approve and transfer tokens cross bank', async function () {
            const ownerInitialBalance = await helper.getPrivateBalance(accounts.To1);
            const crossNodeUser = testConfig.institutions.node4.users[0].address;
            await helper.approveTransferFrom(
                helper.wallets.to1,
                helper.wallets.spender,
                crossNodeUser,
                10,
                metadata.to1
            );
            await sleep(3000);
            const ownerFinalBalance = await helper.getPrivateBalance(accounts.To1);
            expect(ownerFinalBalance).to.equal(ownerInitialBalance - 10);
        });

        it('should handle multiple approvals independently', async function () {
            await helper.revokeAllApprovedTokens(helper.wallets.to1);

            const ownerInitialBalance = await helper.getPrivateBalance(accounts.To1);

            const proof1 = await helper.generateApproveProof(accounts.To1, accounts.To2, 5, metadata.to1);
            const proof2 = await helper.generateApproveProof(accounts.To1, accounts.To2, 10, metadata.to1);

            // Execute first approval
            const tokenId1 = ethers.toBigInt(proof1.transfer_token_id);
            await callPrivateTransferFrom(helper.wallets.spender, testConfig.contractAddress, accounts.To1, accounts.To2, tokenId1);

            let ownerBalance = await helper.getPrivateBalance(accounts.To1);
            expect(ownerBalance).to.equal(ownerInitialBalance - 5);

            // Execute second approval
            const tokenId2 = ethers.toBigInt(proof2.transfer_token_id);
            await callPrivateTransferFrom(helper.wallets.spender, testConfig.contractAddress, accounts.To1, accounts.To2, tokenId2);

            ownerBalance = await helper.getPrivateBalance(accounts.To1);
            expect(ownerBalance).to.equal(ownerInitialBalance - 15);
        });

        it('should fail when approving more than balance', async function () {
            const excessiveAmount = (await helper.getPrivateBalance(accounts.To1)) + 1000;

            await expect(
                helper.generateApproveProof(accounts.To1, accounts.To2, excessiveAmount, metadata.to1)
            ).to.be.rejectedWith(/insufficient balance/i);
        });
    });
    describe('Revoke Approval', function () {
        before(async function () {
            await helper.mint(accounts.To1, 1000);
        });

        it('should revoke approved token', async function () {
            const proof = await helper.generateApproveProof(accounts.To1, accounts.To2, 10, metadata.to1);
            const tokenId = ethers.toBigInt(proof.transfer_token_id);

            let exists = await helper.checkAllowanceExists(accounts.To1, proof);
            expect(exists).to.be.true;

            await callPrivateRevoke(testConfig.contractAddress, helper.wallets.to1, helper.wallets.spender.address, tokenId);

            exists = await helper.checkAllowanceExists(accounts.To1, proof);
            expect(exists).to.be.false;
        });
    });
    describe('Burn Tokens', function () {
        before(async function () {
            await helper.mint(accounts.Minter, 100);
        });

        it('should burn token successfully', async function () {
            const initialBalance = await helper.getPrivateBalance(accounts.Minter);
            await helper.burn(helper.wallets.minter, 10, metadata.minter);

            const finalBalance = await helper.getPrivateBalance(accounts.Minter);
            expect(finalBalance).to.equal(initialBalance - 10);
        });

        it('should burns tokens successfully', async function () {
            await helper.mint(accounts.Minter, 210)
            const initialBalance = await helper.getPrivateBalance(accounts.Minter);
            await helper.burns(helper.wallets.minter, 10,20, metadata.minter);
            await sleep(3000)
            const finalBalance = await helper.getPrivateBalance(accounts.Minter);
            console.log(initialBalance,finalBalance)
            expect(finalBalance).to.equal(initialBalance - 200);
        })

        it('should burn all available tokens', async function () {
            await helper.cancelAllSplitTokens(helper.wallets.minter);
            await helper.revokeAllApprovedTokens(helper.wallets.minter);
            await sleep(2000)
            const fullAmount = await helper.getPrivateBalance(accounts.Minter);
            await helper.burn(helper.wallets.minter, fullAmount, metadata.minter);

            const finalBalance = await helper.getPrivateBalance(accounts.Minter);
            expect(finalBalance).to.equal(0);
        });
    });
    describe('Cancel Split Tokens', function () {
        before(async function () {
            await helper.mint(accounts.Minter, 100);
        });

        it('should cancel split tokens', async function () {
            await helper.generateSplitProof(accounts.Minter, accounts.To1, 10, CommentType.TRANSFER, metadata.minter);
            await helper.generateSplitProof(accounts.Minter, null, 20, CommentType.BURN, metadata.minter);

            let tokens = await getSplitTokenList(
                testConfig.institutions.node3.client,
                accounts.Minter,
                testConfig.contractAddress,
                metadata.minter
            );
            expect(tokens.split_tokens.length).to.be.greaterThan(0);

            await helper.cancelAllSplitTokens(helper.wallets.minter);

            tokens = await getSplitTokenList(
                testConfig.institutions.node3.client,
                accounts.Minter,
                testConfig.contractAddress,
                metadata.minter
            );
            expect(tokens.split_tokens.length).to.equal(0);
        });

        it('should fail to cancel non-existent token', async function () {
            const fakeTokenId = ethers.toBigInt("0x1234567890abcdef");
            await expect(
                callPrivateCancel(testConfig.contractAddress, helper.wallets.minter, fakeTokenId)
            ).to.be.revertedWith("PrivateERCToken: token does not exist");
        });
    });
    describe('Total Supply & Minter Allowance', function () {

        it('should track total supply correctly', async function () {
            const initialSupply = await helper.getTotalSupply();
            //mint
            await helper.mint(accounts.Minter, 1000);
            const afterMint = await helper.getTotalSupply();
            expect(afterMint).to.equal(initialSupply + 1000);
            // burn
            await helper.burn(helper.wallets.minter, 50, metadata.minter);
            const afterBurn = await helper.getTotalSupply();
            expect(afterBurn).to.equal(afterMint - 50);
            //transfer
            await helper.transfer(helper.wallets.minter, accounts.To1, 25, metadata.minter);
            const afterTransfer = await helper.getTotalSupply();
            expect(afterTransfer).to.equal(afterBurn);
            const splitRequest = {
                sc_address: testConfig.contractAddress,
                token_type: '0',
                from_address: accounts.Minter,
                to_address: accounts.Minter,
                amount: 50,
                comment: 'Convert'
            };
            let response = await testConfig.institutions.node3.client.generateSplitToken(splitRequest, metadata.minter);
            console.log("Generate transfer Proof response:", response);
            await testConfig.institutions.node3.client.waitForActionCompletion(testConfig.institutions.node3.client.getTokenActionStatus, response.request_id, metadata.minter)
            await helper.convertToUSDC(helper.wallets.minter, response, metadata.minter)
            const afterConvertUSDC = await helper.getTotalSupply();
            expect(afterConvertUSDC).to.equal(afterTransfer-50);
            //to pUSDC
            await helper.convertToPUSDC(helper.wallets.minter, 50, metadata.minter)
            const afterConvertPUSDC = await helper.getTotalSupply();
            expect(afterConvertPUSDC).to.equal(afterConvertUSDC+50);

        });

        it('should manage minter allowance correctly', async function () {
            const initialAllowance = await helper.getMinterAllowance(metadata.minter);

            await helper.mint(accounts.Minter, 100);
            const afterMint = await helper.getMinterAllowance(metadata.minter);
            expect(afterMint).to.equal(initialAllowance - 100);

            await helper.transfer(helper.wallets.minter, accounts.To1, 50, metadata.minter);
            const afterTransfer = await helper.getMinterAllowance(metadata.minter);
            expect(afterTransfer).to.equal(afterMint);

            await helper.burn(helper.wallets.minter, 25, metadata.minter);
            const afterBurn = await helper.getMinterAllowance(metadata.minter);
            expect(afterBurn).to.equal(afterTransfer);
        });
    });
    describe('Gas Usage', function () {
        const MAX_GAS_LIMIT = 30000000;

        it('should keep mint gas under limit', async function () {
            const receipt = await helper.mint(accounts.Minter, 20);
            expect(receipt.gasUsed).to.be.lessThan(MAX_GAS_LIMIT);
        });

        it('should keep transfer gas under limit', async function () {
            await helper.mint(accounts.Minter, 100);
            const receipt = await helper.transfer(helper.wallets.minter, accounts.To1, 10, metadata.minter);
            expect(receipt.gasUsed).to.be.lessThan(MAX_GAS_LIMIT);
        });

        it('should keep burn gas under limit', async function () {
            await helper.mint(accounts.Minter, 100);
            const receipt = await helper.burn(helper.wallets.minter, 10, metadata.minter);
            expect(receipt.gasUsed).to.be.lessThan(MAX_GAS_LIMIT);
        });
    });
    describe('Token Conversion (pUSDC <-> USDC)', function () {
        const CONVERT_AMOUNT = 10;

        before(async function () {
            await helper.mint(accounts.Minter, 100);
            await sleep(2000)
            await helper.mint(accounts.To1, 100);
        });

        it('should convert pUSDC to USDC', async function () {
            const userWallet = helper.wallets.minter;
            const userAddress = accounts.Minter;
            const userMetadata = metadata.minter;
            await helper.revokeAllApprovedTokens(userWallet)
            await helper.cancelAllSplitTokens(userWallet)

            const privateBefore = await helper.getPrivateBalance(userAddress);
            const publicBefore = await helper.getPublicBalance(userAddress);

            const proof = await helper.generateSplitProof(
                userAddress,
                userAddress,
                CONVERT_AMOUNT,
                CommentType.CONVERT,
                userMetadata
            );

            await helper.convertToUSDC(userWallet, proof, userMetadata);

            const privateAfter = await helper.getPrivateBalance(userAddress);
            const publicAfter = await helper.getPublicBalance(userAddress);

            expect(privateAfter).to.equal(privateBefore - CONVERT_AMOUNT);
            expect(publicAfter).to.equal(publicBefore + CONVERT_AMOUNT);
        });

        it('should convert USDC to pUSDC', async function () {
            const userWallet = helper.wallets.minter;
            const userMetadata = metadata.minter;

            const privateBefore = await helper.getPrivateBalance(accounts.Minter);
            const publicBefore = await helper.getPublicBalance(accounts.Minter);

            await helper.convertToPUSDC(userWallet, CONVERT_AMOUNT, userMetadata);

            const privateAfter = await helper.getPrivateBalance(accounts.Minter);
            const publicAfter = await helper.getPublicBalance(accounts.Minter);
            console.log(`privateBefore: ${privateBefore}, privateAfter: ${privateAfter}`)
            console.log(`publicBefore: ${publicBefore}, publicAfter: ${publicAfter}`)
            expect(privateAfter).to.equal(privateBefore + CONVERT_AMOUNT);
            expect(publicAfter).to.equal(publicBefore - CONVERT_AMOUNT);
        });
    });
    describe('Transactions with node4',function (){

        it('mint tokens to user in different node', async function () {
            console.log(`Cross node user: ${node4Instution.address}`)
            const node3BalanceBefore = await helper.getPrivateBalance(node4Instution.address);
            const node4BalanceBefore = await helper.getPrivateBalance(node4Instution.address, 'node4');

            await helper.mint(node4Instution.address, 200);
            await sleep(3000);

            const node3BalanceAfter = await helper.getPrivateBalance(node4Instution.address);
            const node4BalanceAfter = await helper.getPrivateBalance(node4Instution.address, 'node4');
            console.log(`Node3 balance: ${node3BalanceBefore} -> ${node3BalanceAfter}`)
            console.log(`Node4 balance: ${node4BalanceBefore} -> ${node4BalanceAfter}`)
            expect(node3BalanceAfter).to.equal(node3BalanceBefore);
            expect(node4BalanceAfter).to.equal(node4BalanceBefore + 200);
        });
        it('transfer tokens to user in different node', async function () {
            await helper.mint(helper.wallets.minter.address,100)
            const crossNodeUser = node4Instution.address;

            const node4BalanceBefore = await helper.getPrivateBalance(crossNodeUser, 'node4');

            await helper.transfer(helper.wallets.minter, crossNodeUser, TRANSFER_AMOUNT, metadata.minter);
            await sleep(3000);

            const node4BalanceAfter = await helper.getPrivateBalance(crossNodeUser, 'node4');

            expect(node4BalanceAfter).to.equal(node4BalanceBefore + TRANSFER_AMOUNT);
        });

        it('approve transfer tokens to user in different node', async function () {
            const ownerInitialBalance = await helper.getPrivateBalance(accounts.To1);
            await helper.approveTransferFrom(
                helper.wallets.to1,
                helper.wallets.spender,
                node4Instution.address,
                10,
                metadata.to1
            );
            await sleep(3000);
            const ownerFinalBalance = await helper.getPrivateBalance(accounts.To1);
            expect(ownerFinalBalance).to.equal(ownerInitialBalance - 10);
        });

        it('transfer token from user of node4 to node3',async function (){
            const crossNodeUser = node4Instution.address;
            const node4BalanceBefore = await helper.getPrivateBalance(crossNodeUser, 'node4');
            console.log(`Node4 balance: ${node4BalanceBefore}`)
            //split token
            const fromWallet = helper.wallets.node4Admin;
            const toAddress = accounts.Minter;
            await helper.transferFromNode4(fromWallet,toAddress,TRANSFER_AMOUNT)
            await sleep(3000);
            const node4BalanceAfter = await helper.getPrivateBalance( crossNodeUser, 'node4');
            expect(node4BalanceAfter).to.equal(node4BalanceBefore - TRANSFER_AMOUNT);
        })
        it('burn token from user of node4 ',async function (){
            const crossNodeUser = node4Instution.address;
            const node4BalanceBefore = await helper.getPrivateBalance(crossNodeUser, 'node4');
            console.log(`Node4 balance: ${node4BalanceBefore}`)
            //split token
            const fromWallet = helper.wallets.node4Admin;
            await helper.burnFromNode4(fromWallet,TRANSFER_AMOUNT)
            const node4BalanceAfter = await helper.getPrivateBalance( crossNodeUser, 'node4');
            expect(node4BalanceAfter).to.equal(node4BalanceBefore - TRANSFER_AMOUNT);
        })

    });
    describe('Institution Disable',function (){
        let registryContract;
        let l1Provider;
        let proxyAddress
        let node3Instution;
        let node4Institution;
        let node3AdminWallet;
        let node4AdminWallet;
        let manager;

        before(async function () {
            proxyAddress = testConfig.configuration.ADDRESSES.PROXY_ADDRESS;
            registryContract = await ethers.getContractAt("InstitutionUserRegistry", proxyAddress);
            node3Instution = testConfig.configuration.institutions[0];
            node4Institution = testConfig.configuration.institutions[1];
            l1Provider = helper.ethersProvider;
            node3AdminWallet = new ethers.Wallet(node3Instution.ethPrivateKey,l1Provider);
            node4AdminWallet = new ethers.Wallet(node4Institution.ethPrivateKey,l1Provider);
            manager = await registryContract.connect(node3AdminWallet);
        });
        it('Operation not allowed when add node4 to disabled node',async function () {
            let result = await manager.isInstitutionManagerBlacklisted(node4AdminWallet.address)
            console.log("node4 is disabled: ",result)
            if (!result){
                console.log("node4 is not in blacklist")
                await helper.mint(node4AdminWallet.address,100)
                console.log("set node4 to blacklist")
                await manager.setInstitutionManagerBlacklist(node4AdminWallet.address,true)
                await sleep(10000)
            }
            result = await manager.isInstitutionManagerBlacklisted(node4AdminWallet.address)
            expect(result).to.equal(true)
            // should not allowe to operate with
            try{
                await helper.mint(node4AdminWallet.address,100)
            } catch (e) {
                expect(e.details).to.include("bank is blacklisted")
            };
            try {
                await helper.transfer(helper.wallets.minter,node4AdminWallet.address,10,metadata.minter)
            }catch (e) {
                expect(e.details).to.include("bank is blacklisted")
            };
            //should not allow to operate from
            try {
                await helper.transfer(node4AdminWallet,accounts.Minter,10,metadata.node4Admin)
            }
            catch (e) {
                expect(e.details).to.include("failed to get current account for address")
            };
        });
        it('Operation allowed when remove node4 from disabled node',async function () {
            let result = await manager.isInstitutionManagerBlacklisted(node4AdminWallet.address)
            console.log("node4 is disabled: ",result)
            if (result){
                console.log("node4 is in blacklist")
                await manager.setInstitutionManagerBlacklist(node4AdminWallet.address,false)
                await sleep(15000)
            }
            result = await manager.isInstitutionManagerBlacklisted(node4AdminWallet.address)
            console.log("node4 is disabled: ",result)
            expect(result).to.equal(false)
            await helper.mint(node4AdminWallet.address,100)
            await helper.transfer(helper.wallets.minter,node4AdminWallet.address,10,metadata.minter)
            await helper.transfer(node4AdminWallet,accounts.Minter,10,metadata.node4Admin)
            await helper.burn(node4AdminWallet,10,metadata.node4Admin)
        });
        after(async function () {
            await manager.isInstitutionManagerBlacklisted(node4AdminWallet.address)
        })

    })
});
describe.skip('demo-bank function cases',function (){

})

describe('Http api test cases', function () {
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
            await apiClient.regesterAccount(request);

            const result = await apiClient.queryAccount({ accountAddress: userAddress });
            expect(result.accountAddress.toLowerCase()).equal(request.accountAddress.toLowerCase());
            expect(result.accountStatus).equal('ACCOUNT_STATUS_INACTIVE');
            expect(result.accountRoles).equal(request.accountRoles);
            expect(result.firstName).equal(request.firstName);
            expect(result.lastName).equal(request.lastName);
            expect(result.phoneNumber).equal(request.phoneNumber);
            expect(result.email).equal(request.email);
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

        /* -------------------------------------------------- */
        /*  原有用例保持不变                                   */
        /* -------------------------------------------------- */
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

        /* -------------------------------------------------- */
        /*  循环等待直到激活                                     */
        /* -------------------------------------------------- */
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

    describe('token service', function () {
        // const node3Admin = testConfig.institutions.node3.address
        const node3Minter = accounts.Minter
        const toAddress = accounts.To1
        let result
        let requestId

        it('Step1: asset query ', async () => {
            const request = {
                accountAddress: node3Minter,
                scAddress: scAddress
            };
            result = await apiClient.queryAssets(request);
            expect(result.data.some(item => item.scAddress === scAddress)).to.be.true;
        });
        it('Step2: generate mint proof ', async () => {
            const request = {
                scAddress: scAddress,
                tokenType: 0,
                fromAddress: node3Minter,
                toAddress: toAddress,
                amount: 1000
            };

        });
        it('Step3: query mint proof ',async () => {

        });
        it('Step4: mint token ',async () => {

        });
        it('Step5: query user token balance',async () => {

        });
        it('Step6: bank mintAllowance query',async () => {

        });
        it('Step7: generate split proof for transfer',async () => {

        });
        it('Step8: token status query',async () => {

        });
        it('Step9: generate split proof for burn',async () => {

        });
        it('Step10: generate approve proof',async () => {

        });
        it('Step11: query approves tokens',async () => {

        });
        it('Step12: usdc convert',async () => {

        });
        it('Step13: pusdc convert',async () => {

        });
        it('Step14: amount encode',async () => {

        });
        it('Step15: amount decode',async () => {

        });
        it('Step16: bank profile query',async () => {

        });
        it('Step17: bank managers query',async () => {

        });
        it('Step18: smart contract status update',async () => {

        });



    });

});
// 辅助函数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}