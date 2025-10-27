const {expect} = require("chai");
const {ethers, network} = require('hardhat');
const config = require('./../../deployments/image9.json');
const hardhatConfig = require("../../hardhat.config");
const assert = require("node:assert");
const accounts = require('./../../deployments/account.json');

// 获取当前网络并动态设置 scAddress
function getCurrentNetworkStage() {
    const fullName = network.name; // 这就是 'ucl_L2_prod'
    const stage = fullName.split('_').pop();
    console.log(`Using network: ${fullName} → stage: ${stage}`);
    return stage;
}
const currentNetwork = getCurrentNetworkStage();
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
const node3Institution = configuration.institutions.find(institution => institution.name === "Node3");
if (!node3Institution) {
    throw new Error("Node3 institution not found in config");
}

const deployed = config[currentNetwork];
// console.log("deployed:", deployed)

function getLibraries() {
    const libs = deployed.libraries || {};
    const required = ["TokenEventLib", "TokenUtilsLib", "TokenVerificationLib", "SignatureChecker"];
    for (const key of required) {
        if (!libs[key]) {
            throw new Error(`Missing library address for ${key}`);
        }
    }
    return {
        TokenEventLib: libs.TokenEventLib,
        TokenUtilsLib: libs.TokenUtilsLib,
        TokenVerificationLib: libs.TokenVerificationLib,
        SignatureChecker: libs.SignatureChecker
    };
}

async function deployTestImplementation(adminWallet) {
    const HamsaL2EventV2 = await ethers.getContractFactory("HamsaL2EventV2", adminWallet);
    const implB = await HamsaL2EventV2.deploy();
    await implB.waitForDeployment();
    console.log("Deployed test implementation B at:", implB.target);
    return implB.target;

}


describe("HamsaL2 Event Proxy Extended Tests", function () {
    let provider;
    let proxyAddress;
    let proxyForAdminLookup;
    let l2Event;
    let adminWallet;
    let proxy;
    let originalState;
    let implementationBAddress;

    before(async function () {
        provider = ethers.provider;
        proxyAddress = deployed.contracts.HamsaL2Event;
        adminWallet = new ethers.Wallet(node3Institution.ethPrivateKey, provider);
        proxy = await ethers.getContractAt("HamsaL2EventProxy", proxyAddress, adminWallet);
        const realAdmin = await proxy.admin();
        // console.log("On-chain admin:", realAdmin);
        l2Event = await ethers.getContractAt("HamsaL2Event", proxyAddress, adminWallet);

        // Save original state
        originalState = {
            implementationA: await proxy.implementationA(),
            implementationB: await proxy.implementationB(),
            implementationB_percentage: Number(await proxy.percentageToB())
        };
        console.log("Original proxy state:", originalState);
    });

    after(async function () {
        implementationBAddress = configuration
        // Restore original configuration
        await (await proxy.setImplementationB(originalState.implementationA,100)).wait();
        const nowState = {
            implementationA: await proxy.implementationA(),
            implementationB: await proxy.implementationB(),
            implementationB_percentage: Number(await proxy.percentageToB())
        };
        console.log("Original proxy state:", nowState);
        console.log("Proxy configuration restored");
    });

    describe("Percentage-based routing tests", function () {
        this.timeout(6000000);
        let implementationB;
        let proxiedV2;

        before(async function () {
            implementationB = await deployTestImplementation(adminWallet);
            proxiedV2 = await ethers.getContractAt("HamsaL2EventV2", proxyAddress, adminWallet);
        });

        it("Should correctly route 0% traffic to implementation B", async function () {
            await (await proxy.setImplementationB(implementationB, 0)).wait();
            const nowState = {
                implementationA: await proxy.implementationA(),
                implementationB: await proxy.implementationB(),
                implementationB_percentage: Number(await proxy.percentageToB())
            };
            console.log("Now proxy state:", nowState)
            let allCallsFailed = true;
            const testIterations = 10;

            for (let i = 0; i < testIterations; i++) {
                try {
                    await proxiedV2.marker();
                    allCallsFailed = false;
                    break;
                } catch (error) {
                    console.log(`Call ${i+1}: marker() correctly failed when routing to implementation A`);
                }
            }
            assert(allCallsFailed, "All marker() calls should fail when routing 0% to implementation B");
        });

        it("Should correctly route 100% traffic to implementation B", async function () {
            await (await proxy.setImplementationB(implementationB, 100)).wait();
            const nowState = {
                implementationA: await proxy.implementationA(),
                implementationB: await proxy.implementationB(),
                implementationB_percentage: Number(await proxy.percentageToB())
            };
            console.log("Now proxy state:", nowState)
            const markerValue = await proxiedV2.marker();
            assert.strictEqual(markerValue, "HamsaL2EventV2", "Expected marker() to return implementation B identifier");
            console.log("marker() returned:", markerValue);
        });

        it("Should correctly route 50% traffic with probability distribution", async function () {
            const percentage = 60;
            const tolerance = 15
            await (await proxy.setImplementationB(implementationB, percentage)).wait();
            if (Number(await proxy.percentageToB()) !== percentage) {
                console.log("Implementation B not set correctly, setting it now");
                await (await proxy.setImplementationB(implementationB, percentage)).wait();
            }
            // Make multiple calls to test probabilistic routing
            let implementationACalls = 0;
            let implementationBCalls = 0;
            const totalCalls = 200;
            for (let i = 0; i < totalCalls; i++) {
                console.log(`this is ${i+1} call`)
                try {
                    await proxiedV2.marker();
                    console.log(" route to B")
                    implementationBCalls++;
                } catch (error) {
                    implementationACalls++;
                }
            }
            
            console.log(`A calls: ${implementationACalls}, B calls: ${implementationBCalls}`);
            
            // Allow some variance due to probabilistic nature (±15%)
            assert(implementationACalls > totalCalls * (100 - percentage - tolerance) / 100 &&
                implementationACalls < totalCalls * (100 - percentage + tolerance) / 100,
                `Approximately ${100 - percentage}% of calls should route to implementation A`);

            assert(implementationBCalls > totalCalls * (percentage - tolerance) / 100 &&
                implementationBCalls < totalCalls * (percentage + tolerance) / 100,
                `Approximately ${percentage}% of calls should route to implementation B`);

        });

        it("Should handle edge case when implementation B is zero address with 0% traffic", async function () {
            await expect(proxy.setImplementationB(ethers.ZeroAddress, 0)).to.be.reverted;
        });
    });

    describe.only("Admin functionality tests", function () {
        this.timeout(6000000);
        let implementationB;

        before(async function () {
            implementationB = await deployTestImplementation(adminWallet);
        });

        it("Should allow admin to update implementation A", async function () {
            const newImplementationA = await deployTestImplementation(adminWallet);
            await (await proxy.setImplementationA(newImplementationA)).wait();
            
            const implA = await proxy.implementationA();
            assert.equal(implA, newImplementationA);
            
            // Reset to original for other tests
            await (await proxy.setImplementationA(originalState.implementationA)).wait();
        });

        it("Should fail when non-admin tries to update implementations", async function () {

            const nonAdmin = new ethers.Wallet(accounts.MinterKey, provider);
            const proxyNotAdmin = await ethers.getContractAt("HamsaL2EventProxy", proxyAddress, nonAdmin);

            try {
                await (await proxyNotAdmin.setImplementationB(implementationB, 50)).wait();
                assert.fail("Non-admin should not be able to update implementation");
            } catch (error) {
                assert(error.message.includes("Not admin"), "Error should be 'Not admin'");
            }
        });

        it("Should fail when setting invalid percentage (>100)", async function () {
            try {
                await (await proxy.setImplementationB(implementationB, 101)).wait();
                assert.fail("Should not allow percentage > 100");
            } catch (error) {
                assert(error.message.includes("Invalid percentage"), "Error should be 'Invalid percentage'");
            }
        });

        it("Should fail when setting implementation B to zero address with non-zero percentage", async function () {

            await expect(proxy.setImplementationB(ethers.ZeroAddress, 50)).to.be.reverted;

        });
    });

});