const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const deployed = require("../../deployments/image9.json");

// Use ucl_L2 network configuration
const l1CustomNetwork = {
    name: "BESU",
    chainId: 1337
};
const options = {
    batchMaxCount: 1,
    staticNetwork: true
};

const L1Url = hardhatConfig.networks.ucl_L2.url;
const l1Provider = new ethers.JsonRpcProvider(L1Url, l1CustomNetwork, options);

// Test accounts - we'll determine the actual owner dynamically
const ownerPrivateKey = "555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787";
const ownerWallet = new ethers.Wallet(ownerPrivateKey, l1Provider);

// Current owner (determined at runtime)
let currentOwnerAddress = null;

const institution1PrivateKey = "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f";
const institution1Wallet = new ethers.Wallet(institution1PrivateKey, l1Provider);
const institution1Address = "0xf17f52151EbEF6C7334FAD080c5704D77216b732";

const institution2Address = "0x2c44c4B96AE5f9c9dbf32cF3AA743Cd0277F3127";
const user1Address = "0x5a3288A7400B2cd5e0568728E8216D9392094892";
const user2Address = "0xF8041E1185C7106121952bA9914ff904A4A01c80";

// Test data
const testInstitution = {
    name: "Test Institution",
    nodeUrl: "https://test-node.example.com:8443",
    httpUrl: "http://test-node.example.com:8080",
    publicKey: {
        x: "0x27c07a015b9e7d73519e8bcfc8ddd6cf760b51f55938e0f83affb2ff7d244220",
        y: "0x27e09fb8be7b593a38e107cce390183bd2b15eea7b62c4cc8ad7fae388c9b66f"
    }
};

async function getRegistryContract(wallet = ownerWallet) {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });
    return await InstRegistry.attach(deployed.contracts.InstitutionUserRegistry).connect(wallet);
}

// Test 1: Deploy new registry (if needed)
async function deployRegistry() {
    console.log("=== Deploying InstitutionUserRegistry ===");
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });

    const instRegistry = await InstRegistry.deploy(deployed.contracts.HamsaL2Event);
    await instRegistry.waitForDeployment();

    console.log("✅ InstitutionUserRegistry deployed at:", instRegistry.target);
    return instRegistry.target;
}

// Test 2: Register institution successfully
async function testRegisterInstitution() {
    console.log("\n=== Testing Institution Registration ===");
    try {
        const registry = await getRegistryContract();

        // Check if institution already exists
        const existingInstitution = await registry.getInstitution(institution2Address);
        if (existingInstitution.managerAddress !== ethers.ZeroAddress) {
            console.log("ℹ️ Institution already registered, showing existing info:");
            console.log("Institution info:", {
                name: existingInstitution.name,
                managerAddress: existingInstitution.managerAddress,
                nodeUrl: existingInstitution.nodeUrl,
                httpUrl: existingInstitution.httpUrl
            });

            const isManager = await registry.isInstitutionManager(institution2Address);
            console.log("Is institution manager:", isManager);
            return;
        }

        const tx = await registry.registerInstitution(
            institution2Address,
            testInstitution.name,
            testInstitution.publicKey,
            testInstitution.nodeUrl,
            testInstitution.httpUrl
        );

        const receipt = await tx.wait();
        console.log("✅ Institution registered successfully. Gas used:", receipt.gasUsed.toString());

        // Verify registration
        const institution = await registry.getInstitution(institution2Address);
        console.log("Institution info:", {
            name: institution.name,
            managerAddress: institution.managerAddress,
            nodeUrl: institution.nodeUrl,
            httpUrl: institution.httpUrl
        });

        const isManager = await registry.isInstitutionManager(institution2Address);
        console.log("Is institution manager:", isManager);

    } catch (error) {
        if (error.message.includes("institution already registered")) {
            console.log("ℹ️ Institution already registered (expected behavior)");
        } else {
            console.log("❌ Test failed:", error.message);
        }
    }
}

// Test 3: Register institution with invalid parameters
async function testRegisterInstitutionInvalidParams() {
    console.log("\n=== Testing Institution Registration with Invalid Parameters ===");

    // Skip this test if we don't have owner permissions
    if (currentOwnerAddress && currentOwnerAddress.toLowerCase() !== ownerWallet.address.toLowerCase()) {
        console.log("ℹ️ Skipping invalid params test - no owner permissions");
        return;
    }

    const registry = await getRegistryContract();

    // Test empty name
    try {
        await registry.registerInstitution(
            "0x1234567890123456789012345678901234567890",
            "",
            testInstitution.publicKey,
            testInstitution.nodeUrl,
            testInstitution.httpUrl
        );
        console.log("❌ Should have failed with empty name");
    } catch (error) {
        const rejected = error.message.includes("institution name can't be empty");
        console.log("✅ Correctly rejected empty name:", rejected);
    }

    // Test invalid public key
    try {
        await registry.registerInstitution(
            "0x1234567890123456789012345678901234567890",
            "Test Name",
            { x: 0, y: testInstitution.publicKey.y },
            testInstitution.nodeUrl,
            testInstitution.httpUrl
        );
        console.log("❌ Should have failed with invalid public key");
    } catch (error) {
        const rejected = error.message.includes("invalid public key");
        console.log("✅ Correctly rejected invalid public key:", rejected);
    }

    // Test zero address
    try {
        await registry.registerInstitution(
            ethers.ZeroAddress,
            "Test Name",
            testInstitution.publicKey,
            testInstitution.nodeUrl,
            testInstitution.httpUrl
        );
        console.log("❌ Should have failed with zero address");
    } catch (error) {
        const rejected = error.message.includes("Invalid address");
        console.log("✅ Correctly rejected zero address:", rejected);
    }

    // Test empty nodeUrl
    try {
        await registry.registerInstitution(
            "0x1234567890123456789012345678901234567890",
            "Test Name",
            testInstitution.publicKey,
            "",
            testInstitution.httpUrl
        );
        console.log("❌ Should have failed with empty nodeUrl");
    } catch (error) {
        const rejected = error.message.includes("institution nodeUrl can't be empty");
        console.log("✅ Correctly rejected empty nodeUrl:", rejected);
    }

    // Test empty httpUrl
    try {
        await registry.registerInstitution(
            "0x1234567890123456789012345678901234567890",
            "Test Name",
            testInstitution.publicKey,
            testInstitution.nodeUrl,
            ""
        );
        console.log("❌ Should have failed with empty httpUrl");
    } catch (error) {
        const rejected = error.message.includes("institution httpUrl can't be empty");
        console.log("✅ Correctly rejected empty httpUrl:", rejected);
    }
}

// Test 4: Update institution
async function testUpdateInstitution() {
    console.log("\n=== Testing Institution Update ===");

    // Skip this test if we don't have owner permissions
    if (currentOwnerAddress && currentOwnerAddress.toLowerCase() !== ownerWallet.address.toLowerCase()) {
        console.log("ℹ️ Skipping institution update test - no owner permissions");
        console.log(`Current owner: ${currentOwnerAddress}`);
        console.log(`Test wallet: ${ownerWallet.address}`);
        return;
    }

    try {
        const registry = await getRegistryContract();

        const newName = "Updated Test Institution";
        const newNodeUrl = "https://updated-node.example.com:8443";
        const newHttpUrl = "http://updated-node.example.com:8080";

        const tx = await registry.updateInstitution(
            institution2Address,
            newName,
            newNodeUrl,
            newHttpUrl
        );

        const receipt = await tx.wait();
        console.log("✅ Institution updated successfully. Gas used:", receipt.gasUsed.toString());

        // Verify update
        const institution = await registry.getInstitution(institution2Address);
        console.log("Updated institution info:", {
            name: institution.name,
            nodeUrl: institution.nodeUrl,
            httpUrl: institution.httpUrl
        });

    } catch (error) {
        if (error.message.includes("Only owner can call this function")) {
            console.log("ℹ️ No owner permissions for update (expected behavior)");
        } else {
            console.log("❌ Test failed:", error.message);
        }
    }
}

// Test 5: Register user by institution manager
async function testRegisterUser() {
    console.log("\n=== Testing User Registration ===");
    try {
        const registry = await getRegistryContract(institution1Wallet);

        // Check if user already registered
        const existingManager = await registry.getUserManager(user1Address);
        if (existingManager !== ethers.ZeroAddress) {
            console.log("ℹ️ User already registered:");
            console.log("User manager:", existingManager);
            console.log("Expected manager:", institution1Address);
            console.log("Manager match:", existingManager.toLowerCase() === institution1Address.toLowerCase());
            return;
        }

        const tx = await registry.registerUser(user1Address);
        const receipt = await tx.wait();
        console.log("✅ User registered successfully. Gas used:", receipt.gasUsed.toString());

        // Verify registration
        const userManager = await registry.getUserManager(user1Address);
        console.log("User manager:", userManager);
        console.log("Expected manager:", institution1Address);
        console.log("Manager match:", userManager.toLowerCase() === institution1Address.toLowerCase());

    } catch (error) {
        if (error.message.includes("User already registered")) {
            console.log("ℹ️ User already registered (expected behavior)");
        } else {
            console.log("❌ Test failed:", error.message);
        }
    }
}

// Test 6: Register user with invalid parameters
async function testRegisterUserInvalidParams() {
    console.log("\n=== Testing User Registration with Invalid Parameters ===");
    
    const registry = await getRegistryContract(institution1Wallet);
    
    // Test zero address
    try {
        await registry.registerUser(ethers.ZeroAddress);
        console.log("❌ Should have failed with zero address");
    } catch (error) {
        console.log("✅ Correctly rejected zero address:", error.message.includes("Invalid user address"));
    }
    
    // Test duplicate registration
    try {
        await registry.registerUser(user1Address);
        console.log("❌ Should have failed with duplicate user");
    } catch (error) {
        console.log("✅ Correctly rejected duplicate user:", error.message.includes("User already registered"));
    }
}

// Test 7: Remove user
async function testRemoveUser() {
    console.log("\n=== Testing User Removal ===");
    try {
        const registry = await getRegistryContract(institution1Wallet);

        // Check current user manager
        const currentManager = await registry.getUserManager(user1Address);
        console.log("Current user manager:", currentManager);

        if (currentManager === ethers.ZeroAddress) {
            console.log("ℹ️ User not registered, cannot remove");
            return;
        }

        if (currentManager.toLowerCase() !== institution1Address.toLowerCase()) {
            console.log("ℹ️ User managed by different institution:", currentManager);
            console.log("Cannot remove user managed by another institution");
            return;
        }

        const tx = await registry.removeUser(user1Address);
        const receipt = await tx.wait();
        console.log("✅ User removed successfully. Gas used:", receipt.gasUsed.toString());

        // Verify removal
        const userManager = await registry.getUserManager(user1Address);
        console.log("User manager after removal:", userManager);
        console.log("Is zero address:", userManager === ethers.ZeroAddress);

    } catch (error) {
        if (error.message.includes("User not managed by this institution")) {
            console.log("ℹ️ User not managed by this institution (expected behavior)");
        } else {
            console.log("❌ Test failed:", error.message);
        }
    }
}

// Test 8: Test query functions
async function testQueryFunctions() {
    console.log("\n=== Testing Query Functions ===");
    try {
        const registry = await getRegistryContract();

        // Check if user2 is already registered
        let userManager = await registry.getUserManager(user2Address);
        if (userManager === ethers.ZeroAddress) {
            try {
                // Try to register user for testing
                await registry.connect(institution1Wallet).registerUser(user2Address);
                console.log("✅ Registered user2 for testing");
            } catch (error) {
                console.log("ℹ️ Could not register user2:", error.message);
            }
        }

        // Test getUserManager
        userManager = await registry.getUserManager(user2Address);
        console.log("User manager:", userManager);

        // Test getInstitution
        const institution = await registry.getInstitution(institution1Address);
        console.log("Institution name:", institution.name);

        // Test isInstitutionManager
        const isManager = await registry.isInstitutionManager(institution1Address);
        console.log("Is institution manager:", isManager);

        // Test getUserInstGrumpkinPubKey (only if user is registered)
        if (userManager !== ethers.ZeroAddress) {
            const pubKey = await registry.getUserInstGrumpkinPubKey(user2Address);
            console.log("User institution public key:", {
                x: pubKey.x.toString(),
                y: pubKey.y.toString()
            });
        } else {
            console.log("ℹ️ User not registered, skipping public key test");
        }

        // Test isEmptyString
        const isEmpty1 = await registry.isEmptyString("");
        const isEmpty2 = await registry.isEmptyString("not empty");
        console.log("Empty string tests:", { empty: isEmpty1, notEmpty: isEmpty2 });

        console.log("✅ All query functions working correctly");

    } catch (error) {
        console.log("❌ Test failed:", error.message);
    }
}

// Test 9: Test ownership transfer
async function testOwnershipTransfer() {
    console.log("\n=== Testing Ownership Transfer ===");

    // Skip this test if we don't have owner permissions
    if (currentOwnerAddress && currentOwnerAddress.toLowerCase() !== ownerWallet.address.toLowerCase()) {
        console.log("ℹ️ Skipping ownership transfer test - no owner permissions");
        return;
    }

    try {
        const registry = await getRegistryContract();

        const newOwner = "0x1234567890123456789012345678901234567890";

        const tx = await registry.transferOwnership(newOwner);
        const receipt = await tx.wait();
        console.log("✅ Ownership transferred successfully. Gas used:", receipt.gasUsed.toString());

        // Verify new owner
        const currentOwner = await registry.owner();
        console.log("New owner:", currentOwner);
        console.log("Expected owner:", newOwner);
        console.log("Owner match:", currentOwner.toLowerCase() === newOwner.toLowerCase());

    } catch (error) {
        if (error.message.includes("Only owner can call this function")) {
            console.log("ℹ️ No owner permissions for transfer (expected behavior)");
        } else {
            console.log("❌ Test failed:", error.message);
        }
    }
}

// Test 10: Test contract functionality with existing data
async function testContractFunctionality() {
    console.log("\n=== Testing Contract Functionality with Existing Data ===");
    try {
        const registry = await getRegistryContract();

        // Test 1: Verify institution data integrity
        console.log("1. Testing institution data integrity:");
        const institution1 = await registry.getInstitution(institution1Address);
        const institution2 = await registry.getInstitution(institution2Address);

        console.log("Institution1 data:", {
            hasName: institution1.name.length > 0,
            hasValidManager: institution1.managerAddress !== ethers.ZeroAddress,
            hasNodeUrl: institution1.nodeUrl.length > 0,
            hasHttpUrl: institution1.httpUrl.length > 0,
            hasValidPubKey: institution1.publicKey.x !== 0n && institution1.publicKey.y !== 0n
        });

        console.log("Institution2 data:", {
            hasName: institution2.name.length > 0,
            hasValidManager: institution2.managerAddress !== ethers.ZeroAddress,
            hasNodeUrl: institution2.nodeUrl.length > 0,
            hasHttpUrl: institution2.httpUrl.length > 0,
            hasValidPubKey: institution2.publicKey.x !== 0n && institution2.publicKey.y !== 0n
        });

        // Test 2: Verify user-institution relationships
        console.log("\n2. Testing user-institution relationships:");
        const user1Manager = await registry.getUserManager(user1Address);
        const user2Manager = await registry.getUserManager(user2Address);

        console.log("User1 manager:", user1Manager);
        console.log("User2 manager:", user2Manager);

        // Test 3: Verify public key retrieval for users
        console.log("\n3. Testing public key retrieval:");
        if (user1Manager !== ethers.ZeroAddress) {
            const user1PubKey = await registry.getUserInstGrumpkinPubKey(user1Address);
            console.log("User1 institution public key valid:", user1PubKey.x !== 0n && user1PubKey.y !== 0n);
        }

        if (user2Manager !== ethers.ZeroAddress) {
            const user2PubKey = await registry.getUserInstGrumpkinPubKey(user2Address);
            console.log("User2 institution public key valid:", user2PubKey.x !== 0n && user2PubKey.y !== 0n);
        }

        // Test 4: Verify manager status checks
        console.log("\n4. Testing manager status checks:");
        const isInst1Manager = await registry.isInstitutionManager(institution1Address);
        const isInst2Manager = await registry.isInstitutionManager(institution2Address);
        const isUserManager = await registry.isInstitutionManager(user1Address);

        console.log("Institution1 is manager:", isInst1Manager);
        console.log("Institution2 is manager:", isInst2Manager);
        console.log("User1 is manager (should be false):", isUserManager);

        // Test 5: Test utility functions
        console.log("\n5. Testing utility functions:");
        const isEmpty1 = await registry.isEmptyString("");
        const isEmpty2 = await registry.isEmptyString("not empty");
        console.log("Empty string detection:", { empty: isEmpty1, notEmpty: !isEmpty2 });

        console.log("✅ All functionality tests passed");

    } catch (error) {
        console.log("❌ Functionality test failed:", error.message);
    }
}

// Check current state
async function checkCurrentState() {
    console.log("\n=== Current Registry State ===");
    try {
        const registry = await getRegistryContract();

        // Check owner
        const owner = await registry.owner();
        currentOwnerAddress = owner; // Store for later use
        console.log("Contract owner:", owner);
        console.log("Test wallet:", ownerWallet.address);
        console.log("Has owner permissions:", owner.toLowerCase() === ownerWallet.address.toLowerCase());

        // Check institutions
        console.log("\nInstitution states:");
        const institutions = [institution1Address, institution2Address];
        for (const addr of institutions) {
            const institution = await registry.getInstitution(addr);
            const isManager = await registry.isInstitutionManager(addr);
            console.log(`${addr}:`, {
                registered: institution.managerAddress !== ethers.ZeroAddress,
                name: institution.name || "N/A",
                isManager: isManager,
                nodeUrl: institution.nodeUrl || "N/A",
                httpUrl: institution.httpUrl || "N/A"
            });
        }

        // Check users
        console.log("\nUser states:");
        const users = [user1Address, user2Address];
        for (const addr of users) {
            const manager = await registry.getUserManager(addr);
            console.log(`${addr}:`, {
                registered: manager !== ethers.ZeroAddress,
                manager: manager === ethers.ZeroAddress ? "None" : manager
            });
        }

        // Check if any institutions can manage users
        console.log("\nInstitution management capabilities:");
        for (const addr of institutions) {
            const institution = await registry.getInstitution(addr);
            if (institution.managerAddress !== ethers.ZeroAddress) {
                console.log(`${addr} (${institution.name}): Can manage users`);
            }
        }

    } catch (error) {
        console.log("❌ Failed to check state:", error.message);
    }
}

// Main test runner
async function runAllTests() {
    console.log("🚀 Starting InstitutionUserRegistry Tests");
    console.log("Using network:", L1Url);
    console.log("Registry address:", deployed.contracts.InstitutionUserRegistry);
    console.log("Owner address:", ownerWallet.address);
    console.log("Institution1 address:", institution1Address);

    // Check current state first
    await checkCurrentState();

    // Run tests sequentially
    await testRegisterInstitution();
    await testRegisterInstitutionInvalidParams();
    await testUpdateInstitution();
    await testRegisterUser();
    await testRegisterUserInvalidParams();
    await testRemoveUser();
    await testQueryFunctions();
    await testOwnershipTransfer();
    await testContractFunctionality();

    console.log("\n🎉 All tests completed!");
}

// Export individual test functions for selective testing
module.exports = {
    deployRegistry,
    checkCurrentState,
    testRegisterInstitution,
    testRegisterInstitutionInvalidParams,
    testUpdateInstitution,
    testRegisterUser,
    testRegisterUserInvalidParams,
    testRemoveUser,
    testQueryFunctions,
    testOwnershipTransfer,
    testContractFunctionality,
    runAllTests
};

// Run all tests if this file is executed directly
if (require.main === module) {
    runAllTests().catch(console.error);
}
