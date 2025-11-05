const assert = require('node:assert');

const {ethers, network} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const {getImage9EnvironmentData, getEnvironmentConfig} = require('../../script/deploy_help');
const accounts = require('../../deployments/account.json');

const config = getImage9EnvironmentData();
const environmentConfig = getEnvironmentConfig();

const l1CustomNetwork = {
    name: "BESU",
    chainId: 1337
};

const providerOptions = {
    batchMaxCount: 1,
    staticNetwork: true
};

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeAddress(address) {
    return ethers.getAddress(address);
}

function tryNormalize(address) {
    if (!address) {
        return null;
    }
    try {
        return normalizeAddress(address);
    } catch (error) {
        return null;
    }
}

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

function pickTargetInstitution() {
    if (!environmentConfig?.institutions?.length) {
        throw new Error("No institutions defined in environment configuration");
    }

    const preferredNames = ["Node3", "node3"];
    const preferred = environmentConfig.institutions.find((inst) => preferredNames.includes(inst.name));
    return preferred || environmentConfig.institutions[0];
}

function selectCallerCandidates(institution) {
    const manager = normalizeAddress(institution.address);
    const candidates = [];

    if (Array.isArray(institution.users)) {
        for (const user of institution.users) {
            if (!user?.address) {
                continue;
            }
            const candidate = normalizeAddress(user.address);
            if (candidate !== manager) {
                candidates.push(candidate);
            }
        }
    }

    if (candidates.length === 0) {
        // fall back to known accounts
        const fallbacks = [accounts.Spender1, accounts.To1, accounts.Minter, accounts.Minter2, accounts.Minter3];
        for (const fallback of fallbacks) {
            if (!fallback) {
                continue;
            }
            const candidate = normalizeAddress(fallback);
            if (candidate !== manager) {
                candidates.push(candidate);
            }
        }
    }

    const unique = [...new Set(candidates)];
    if (unique.length < 2) {
        throw new Error("Not enough unique caller candidates to perform replacement test");
    }

    return unique.slice(0, 3);
}

async function fetchCurrentCallers(registry, institutionAddress) {
    const callers = await registry.getInstitutionCallers(institutionAddress);
    return callers.map(normalizeAddress);
}

function computeRestorationSet(previousCallers, manager) {
    const unique = new Set();
    for (const caller of previousCallers) {
        if (caller === manager) {
            continue;
        }
        unique.add(caller);
    }
    return Array.from(unique);
}

async function resolveRegistryContract(ownerWallet, institutionAddress) {
    const addressSet = new Set();
    const candidates = [];

    const instUserProxy = tryNormalize(config?.contracts?.InstUserProxy);
    if (instUserProxy) {
        addressSet.add(instUserProxy);
    }

    const envProxy = tryNormalize(environmentConfig?.ADDRESSES?.PROXY_ADDRESS);
    if (envProxy) {
        addressSet.add(envProxy);
    }

    const imageRegistry = tryNormalize(config?.contracts?.InstitutionUserRegistry);
    if (imageRegistry) {
        addressSet.add(imageRegistry);
    }

    const envRegistry = tryNormalize(environmentConfig?.ADDRESSES?.INSTITUTION_REGISTRATION);
    if (envRegistry) {
        addressSet.add(envRegistry);
    }

    for (const address of addressSet) {
        candidates.push(address);
    }

    if (candidates.length === 0) {
        throw new Error("No candidate registry addresses found in config files");
    }

    let lastError;

    for (const candidate of candidates) {
        try {
            const contract = await ethers.getContractAt("InstitutionUserRegistry", candidate, ownerWallet);
            await contract.getInstitutionCallers(institutionAddress);
            console.log(`Using InstitutionUserRegistry at ${candidate}`);
            return contract;
        } catch (error) {
            lastError = error;
            const isBadData = error?.code === "BAD_DATA" || error?.code === "UNSUPPORTED_OPERATION";
            if (!isBadData) {
                throw error;
            }
            console.log(`Skipping candidate ${candidate}: ${error.shortMessage || error.message}`);
        }
    }

    throw lastError || new Error("Unable to resolve InstitutionUserRegistry contract");
}

async function runReplaceInstitutionCallersTest() {
    console.log("=== replaceInstitutionCallers Test Start ===");

    const l1Provider = await getProvider();
    const ownerWallet = new ethers.Wallet(accounts.OwnerKey, l1Provider);

    const targetInstitution = pickTargetInstitution();
    const institutionAddress = normalizeAddress(targetInstitution.address);

    const registry = await resolveRegistryContract(ownerWallet, institutionAddress);

    const managerAddress = institutionAddress;

    console.log("Target institution:", targetInstitution.name);
    console.log("Institution manager:", managerAddress);

    const previousCallers = await fetchCurrentCallers(registry, institutionAddress);
    console.log("Existing callers:", previousCallers);

    const newCallers = selectCallerCandidates(targetInstitution);
    console.log("New caller set (without manager):", newCallers);

    console.log("Calling replaceInstitutionCallers...");
    const replaceTx = await registry.replaceInstitutionCallers(institutionAddress, newCallers);
    const replaceReceipt = await replaceTx.wait();
    console.log("replaceInstitutionCallers tx hash:", replaceReceipt.hash);
    console.log("Gas used:", replaceReceipt.gasUsed.toString());

    await sleep(1000);

    const updatedCallers = await fetchCurrentCallers(registry, institutionAddress);
    console.log("Updated callers:", updatedCallers);

    const updatedSet = new Set(updatedCallers);
    const newSet = new Set(newCallers.map(normalizeAddress));

    // Ensure manager is present even if not provided
    const managerPresent = updatedSet.has(managerAddress);
    assert.strictEqual(managerPresent, true, "Manager address should always be present after replacement");

    for (const caller of newSet) {
        const inList = updatedSet.has(caller);
        assert.strictEqual(inList, true, `Caller ${caller} missing from updated list`);

        const isCaller = await registry.isInstitutionCaller(institutionAddress, caller);
        assert.strictEqual(isCaller, true, `Caller ${caller} not marked as active in mapping`);
    }

    for (const oldCaller of previousCallers) {
        if (newSet.has(oldCaller) || oldCaller === managerAddress) {
            continue;
        }
        const stillEnabled = await registry.isInstitutionCaller(institutionAddress, oldCaller);
        assert.strictEqual(stillEnabled, false, `Old caller ${oldCaller} should have been removed`);
    }

    console.log("✅ Primary replacement check passed");

    // Negative test: duplicate callers should revert
    try {
        await registry.replaceInstitutionCallers(institutionAddress, [newCallers[0], newCallers[0]]);
        console.error("❌ Expected duplicate caller replacement to revert");
    } catch (error) {
        const reverted = error.message.includes("caller duplicated");
        assert.strictEqual(reverted, true, `Unexpected revert reason for duplicate callers: ${error.message}`);
        console.log("✅ Duplicate caller protection confirmed");
    }

    // Negative test: zero address should revert
    try {
        await registry.replaceInstitutionCallers(institutionAddress, [ethers.ZeroAddress]);
        console.error("❌ Expected zero address replacement to revert");
    } catch (error) {
        const reverted = error.message.includes("caller is empty");
        assert.strictEqual(reverted, true, `Unexpected revert reason for zero address: ${error.message}`);
        console.log("✅ Zero address validation confirmed");
    }

    // Restore previous callers to avoid leaving side effects
    const callersToRestore = computeRestorationSet(previousCallers, managerAddress);
    console.log("Restoring original callers (without manager in payload):", callersToRestore);

    const restoreTx = await registry.replaceInstitutionCallers(institutionAddress, callersToRestore);
    await restoreTx.wait();

    await sleep(1000);
    const restoredCallers = await fetchCurrentCallers(registry, institutionAddress);
    console.log("Restored callers:", restoredCallers);

    const restoredSet = new Set(restoredCallers);
    assert.strictEqual(restoredSet.has(managerAddress), true, "Manager address missing after restoration");
    for (const caller of previousCallers) {
        const expected = caller === managerAddress || callersToRestore.includes(caller);
        assert.strictEqual(restoredSet.has(caller), expected, `Caller ${caller} mismatch after restoration`);
    }

    console.log("✅ Restoration confirmed");
    console.log("=== replaceInstitutionCallers Test Completed ===");
}

async function main() {
    try {
        await runReplaceInstitutionCallersTest();
    } catch (error) {
        console.error("❌ replaceInstitutionCallers test failed:", error);
        process.exitCode = 1;
        throw error;
    }
}

if (require.main === module) {
    main()
        .then(() => {
            console.log("All replaceInstitutionCallers checks completed.");
            process.exit(0);
        })
        .catch((error) => {
            console.error("Execution error:", error);
            process.exit(1);
        });
}
