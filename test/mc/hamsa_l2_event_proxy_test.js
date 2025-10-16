const assert = require("node:assert");

const {ethers, network} = require("hardhat");
const hardhatConfig = require("../../hardhat.config");
const deployment = require("../../deployments/image9.json");

async function getAdminWallet(provider) {
    const networkConfig = hardhatConfig.networks[network.name];
    if (!networkConfig || !Array.isArray(networkConfig.accounts) || networkConfig.accounts.length === 0) {
        throw new Error(`No accounts configured for network ${network.name}`);
    }
    const adminKey = networkConfig.accounts[0].startsWith("0x")
        ? networkConfig.accounts[0]
        : `0x${networkConfig.accounts[0]}`;
    return new ethers.Wallet(adminKey, provider);
}

function createEventInterface() {
    const eventAbi = [
        "event EventReceived(string eventId, address eventSource, address eventAccount, string topic, bytes eventBody)"
    ];
    return new ethers.Interface(eventAbi);
}

function parseEventLogs(receipt, contractInterface, contractAddress) {
    const normalized = contractAddress.toLowerCase();
    const topic = contractInterface.getEvent("EventReceived").topicHash;

    return receipt.logs
        .filter((log) => log.address.toLowerCase() === normalized && log.topics[0] === topic)
        .map((log) => {
            const parsed = contractInterface.parseLog(log);
            const args = parsed.args;
            return {
                eventId: args[0],
                eventSource: args[1],
                eventAccount: args[2],
                topic: args[3],
                eventBody: args[4],
                transactionHash: log.transactionHash,
                blockNumber: log.blockNumber
            };
        });
}

async function testProxyEventEmission({provider, adminWallet, proxyAddress}) {
    console.log("=== Test: Proxy Event Emission ===");
    const l2Event = await ethers.getContractAt("HamsaL2Event", proxyAddress, adminWallet);
    const eventInterface = createEventInterface();

    const topic = "ProxyEventTest";
    const eventBody = ethers.AbiCoder.defaultAbiCoder().encode(["string"], ["hello-proxy"]);

    const tx = await l2Event.sendEvent(adminWallet.address, adminWallet.address, topic, eventBody);
    const receipt = await tx.wait();
    console.log("sendEvent tx hash:", receipt.hash);

    const events = parseEventLogs(receipt, eventInterface, proxyAddress);
    assert(events.length > 0, "Expected to capture at least one EventReceived log");
    const matched = events.find((evt) => evt.topic === topic);
    assert(matched, `Expected to find EventReceived log with topic ${topic}`);
    console.log("Captured EventReceived:", {
        eventId: matched.eventId,
        topic: matched.topic,
        tx: matched.transactionHash
    });
}

async function testAbSwitching({provider, adminWallet, proxyAddress}) {
    console.log("=== Test: Proxy A/B Switching ===");
    const proxy = await ethers.getContractAt("HamsaL2EventProxy", proxyAddress, adminWallet);
    const l2Event = await ethers.getContractAt("HamsaL2Event", proxyAddress, adminWallet);

    const original = {
        implementationA: await proxy.implementationA(),
        implementationB: await proxy.implementationB(),
        percentage: Number(await proxy.percentageToB())
    };
    console.log("Original proxy state:", original);

    const HamsaL2EventV2 = await ethers.getContractFactory("HamsaL2EventV2", adminWallet);
    const implB = await HamsaL2EventV2.deploy();
    await implB.waitForDeployment();
    console.log("Deployed test implementation B at:", implB.target);

    const proxiedV2 = await ethers.getContractAt("HamsaL2EventV2", proxyAddress, adminWallet);

    // Ensure marker() is unavailable when routing strictly to implementation A
    await (await proxy.setImplementationB(implB.target, 0)).wait();
    let markerFailed = false;
    try {
        await proxiedV2.marker();
    } catch (error) {
        markerFailed = true;
        console.log("marker() correctly unavailable when routing to implementation A");
    }
    assert(markerFailed, "marker() should fail when percentageToB is 0");

    // Route all traffic to implementation B and confirm marker() works
    await (await proxy.setImplementationB(implB.target, 100)).wait();
    const markerValue = await proxiedV2.marker();
    assert.strictEqual(markerValue, "HamsaL2EventV2", "Expected marker() to return implementation B identifier");
    console.log("marker() returned:", markerValue);

    // Emit an event while routing to implementation B
    const topic = "ProxyEventTestB";
    const eventBody = ethers.AbiCoder.defaultAbiCoder().encode(["string"], ["hello-proxy-b"]);
    const tx = await l2Event.sendEvent(adminWallet.address, adminWallet.address, topic, eventBody);
    const receipt = await tx.wait();
    console.log("sendEvent (B) tx hash:", receipt.hash);

    const events = parseEventLogs(receipt, createEventInterface(), proxyAddress);
    const matched = events.find((evt) => evt.topic === topic);
    assert(matched, `Expected to find EventReceived log from implementation B with topic ${topic}`);
    console.log("Captured EventReceived from implementation B:", {
        eventId: matched.eventId,
        topic: matched.topic,
        tx: matched.transactionHash
    });

    // Restore original configuration
    if (original.implementationB === ethers.ZeroAddress) {
        await (await proxy.setImplementationB(implB.target, original.percentage)).wait();
    } else {
        await (await proxy.setImplementationB(original.implementationB, original.percentage)).wait();
    }
    await (await proxy.setImplementationA(original.implementationA)).wait();
    console.log("Proxy configuration restored");
}

async function main() {
    const provider = ethers.provider;
    const adminWallet = await getAdminWallet(provider);
    const proxyAddress = deployment.contracts.HamsaL2Event;
    if (!proxyAddress || proxyAddress === ethers.ZeroAddress) {
        throw new Error("HamsaL2Event proxy address is missing in deployments/image9.json");
    }

    console.log("Running on network:", network.name);
    console.log("Using proxy address:", proxyAddress);
    console.log("Admin wallet:", adminWallet.address);

    await testProxyEventEmission({provider, adminWallet, proxyAddress});
    await testAbSwitching({provider, adminWallet, proxyAddress});

    console.log("✅ HamsaL2Event proxy tests completed");
}

if (require.main === module) {
    main().then(() => {
        process.exit(0);
    }).catch((error) => {
        console.error("❌ HamsaL2Event proxy tests failed:", error);
        process.exit(1);
    });
}
