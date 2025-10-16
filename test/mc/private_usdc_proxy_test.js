const assert = require("node:assert/strict");

const {ethers, network} = require("hardhat");
const deployment = require("../../deployments/image9.json");
const configuration = require("../../script/configuration");

function resolveProxyAddress() {
    const configured = configuration.ADDRESSES.PRIVATE_USDC_NODE3_PROXY;
    if (configured && configured !== "") {
        return configured;
    }
    const deployedProxy = deployment.contracts?.PrivateERCToken;
    if (!deployedProxy || deployedProxy === "") {
        throw new Error("PrivateUSDC proxy address not found in configuration or deployments");
    }
    return deployedProxy;
}

function getLibraries() {
    const libs = deployment.libraries || {};
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

async function deployTestImplementation(wallet) {
    const libraries = getLibraries();
    const factory = await ethers.getContractFactory("PrivateUSDCV2", {
        libraries,
        signer: wallet
    });
    const implementation = await factory.deploy();
    await implementation.waitForDeployment();
    console.log("Deployed PrivateUSDCV2 at:", implementation.target);
    return implementation.target;
}

async function main() {
    const provider = ethers.provider;
    const proxyAddress = resolveProxyAddress();

    console.log("Running on network:", network.name);
    console.log("Proxy address:", proxyAddress);

    const proxyForAdminLookup = await ethers.getContractAt("PrivateUSDCProxy", proxyAddress);
    const proxyAdminAddress = await proxyForAdminLookup.proxyAdmin();
    const institutionAdmin = configuration.institutions.find(
        (inst) => inst.address.toLowerCase() === proxyAdminAddress.toLowerCase()
    );

    if (!institutionAdmin) {
        throw new Error(`Proxy admin ${proxyAdminAddress} not found in configuration.institutions`);
    }

    const adminWallet = new ethers.Wallet(institutionAdmin.ethPrivateKey, provider);
    console.log("Admin wallet:", adminWallet.address);

    const proxy = proxyForAdminLookup.connect(adminWallet);
    const original = {
        implementationA: await proxy.implementationA(),
        implementationB: await proxy.implementationB(),
        percentage: Number(await proxy.percentageToB())
    };
    console.log("Original proxy state:", original);

    const implementationB = await deployTestImplementation(adminWallet);
    const proxiedV2 = await ethers.getContractAt("PrivateUSDCV2", proxyAddress, adminWallet);

    console.log("Setting implementationB with 0% traffic (should still route to A)...");
    await (await proxy.setImplementationB(implementationB, 0)).wait();

    let markerFailed = false;
    try {
        await proxiedV2.marker();
    } catch (error) {
        markerFailed = true;
        console.log("marker() correctly unavailable when percentageToB is 0");
    }
    assert(markerFailed, "marker() should fail when routing to implementation A");

    console.log("Routing 100% traffic to implementationB...");
    await (await proxy.setImplementationB(implementationB, 100)).wait();
    const markerValue = await proxiedV2.marker();
    assert.equal(markerValue, "PrivateUSDCV2", "marker() should return implementation identifier");
    console.log("marker() returned:", markerValue);

    const initialized = await proxiedV2.isInitialized();
    console.log("isInitialized() (delegated through proxy):", initialized);

    // Restore original configuration
    if (original.implementationB === ethers.ZeroAddress) {
        await (await proxy.setImplementationB(ethers.ZeroAddress, 0)).wait();
    } else {
        await (await proxy.setImplementationB(original.implementationB, original.percentage)).wait();
    }

    console.log("Proxy configuration restored");
    console.log("✅ PrivateUSDC proxy A/B switch test completed");
}

if (require.main === module) {
    main().then(() => {
        process.exit(0);
    }).catch((error) => {
        console.error("❌ PrivateUSDC proxy test failed:", error);
        process.exit(1);
    });
}
