// test/PrivateToken.test.js
const { expect } = require('chai');
const { ethers, network} = require('hardhat');
const { TestConfig } = require('../config/TestConfig');
const { TokenTestHelper,TokenType, CommentType } = require('../help/TokenTestHelper');
const accounts = require('../../deployments/account.json');
const hardhatConfig = require("../../hardhat.config");

const l1CustomNetwork = {
    name: "BESU",
    chainId: 1337
};

const providerOptions = {
    batchMaxCount: 1,
    staticNetwork: true
};
async function getProvider() {
    const networkName = network.name;
    let l1Url;

    if (hardhatConfig.networks[networkName] && hardhatConfig.networks[networkName].url) {
        l1Url = hardhatConfig.networks[networkName].url;
    }

    if (!l1Url) {
        throw new Error(`No RPC url configured for current network: ${networkName}`);
    }

    console.log("L1Url:", l1Url);
    return new ethers.JsonRpcProvider(l1Url, l1CustomNetwork, providerOptions);
}


describe('Institution Cases', function () {
    this.timeout(1200000);

    let testConfig;
    let helper;
    let metadata;
    let registryContract;
    let l1Provider;
    let proxyAddress
    let scAddress;
    let node3Instution;

    before(async function () {
        testConfig = new TestConfig();
        helper = new TokenTestHelper(testConfig);
        l1Provider = await getProvider();
        proxyAddress = testConfig.configuration.ADDRESSES.PROXY_ADDRESS;
        registryContract = await ethers.getContractAt("InstitutionUserRegistry", proxyAddress);
        scAddress = testConfig.contractAddress;
        node3Instution = testConfig.configuration.institutions[0];

        metadata = {
            admin: await helper.createMetadata(testConfig.institutions.node3.ethPrivateKey),
            minter: await helper.createMetadata(accounts.MinterKey),
            spender: await helper.createMetadata(accounts.Spender1Key),
            to1: await helper.createMetadata(accounts.To1PrivateKey),
            node4Admin: await helper.createMetadata(testConfig.institutions.node4.ethPrivateKey)
        };
    });

    describe("Query Functions", function () {
        it('getAllInstitutions', async function () {
            const institutions = await registryContract.getAllInstitutions();
            console.log("Institutions:", institutions);
            expect(institutions[0].name).to.equal(testConfig.configuration.institutions[0].name);
        });
        it('should map token to institution', async function () {
            const institution = await registryContract.getTokenInstitution(testConfig.contractAddress);
            expect(institution[0]).to.equal(testConfig.configuration.institutions[0].name);
        });
        it('should map users to their managers', async function () {
            for(institutions of testConfig.configuration.institutions){
                console.log(`#########Institution ${institutions.name}############`);
                for (const user of institutions.users) {
                    const manager = await registryContract.getUserManager(user.address);
                    console.log(`User ${user.address} manager: ${manager}`);
                    expect(manager).to.equal(institutions.address);
                }
            }
        });

        it("should map institution address to their manager", async function () {
            for (institution of testConfig.configuration.institutions){
                console.log(`#########Institution ${institution.name}############`);
                const result = await registryContract.getInstitution(institution.address);
                expect(result[1]).to.equal(institution.address);
            }
        });

        it("Should get token institution manager", async function () {
            expect(await registryContract.getTokenInstitutionManager(scAddress)).to.equal(node3Instution.address);
        });

        it("Should map user and its institution", async function () {
            for (institution of testConfig.configuration.institutions){
                console.log(`#########Institution ${institution.name}############`);
                for(user of institution.users){
                    console.log(`User ${user.address} `)
                    const result = await registryContract.getUserInstitution(user.address);
                    expect(result[1]).to.equal(institution.address);
                }
            }
        });

        it("Should get manger Grumpkin public key", async function () {
            const pubKey = await registryContract.getUserInstGrumpkinPubKey(node3Instution.address);
            expect(pubKey.x).to.equal(node3Instution.publicKey.x);
        });

        it("Should check if address is institution manager", async function () {
            for(institution of testConfig.configuration.institutions){
                console.log(`#########Institution ${institution.name}############`);
                expect(await registryContract.isInstitutionManager(institution.address)).to.equal(true);
            }
        });

        it.only('get InstitutionCallers ',async () => {
            let insi
            // const adminWallet = new ethers.Wallet(testConfig.configuration.institutions[0].ethPrivateKey, l1Provider);
            for (institution of testConfig.configuration.institutions){
                console.log(`#########Institution ${institution.name}############`);
                const adminWalletNode = new ethers.Wallet(institution.ethPrivateKey, l1Provider);
                console.log(`Institution ${institution.name} admin: ${adminWalletNode.address}`)
                insi = await ethers.getContractAt("InstitutionUserRegistry", proxyAddress, adminWalletNode);
                const result = await insi.getInstitutionCallers(adminWalletNode.address)
                console.log(`Institution ${institution.name} callers: ${result}`);

            }
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
    });


});

// 辅助函数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}