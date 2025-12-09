const {ethers} = require("hardhat");

// L2Event ABI for event listening (defined in contracts/test/INativeToken.sol - IL2Event interface)
const l2EventAbi = [
    "event EventReceived(string eventId, address eventSource, address eventAccount, string topic, bytes eventBody)",
    "event RollupEventReceived(string eventId, address eventSource, string topic, bytes eventBody)"
];

/**
 * Setup event listeners for native token events
 * @param {string} nativeTokenAddress - The native token contract address (events are emitted from this contract)
 * @returns {ethers.Contract} - The contract instance with event listeners attached
 */
async function setupEventListeners(nativeTokenAddress) {
    const [signer] = await ethers.getSigners();
    const l2Event = new ethers.Contract(nativeTokenAddress, l2EventAbi, signer);

    // Listen for EventReceived (TokenMinted, TokenMintAllowedUpdated, TokenDeleted, TokenCanceled)
    l2Event.on("EventReceived", (eventId, eventSource, eventAccount, topic, eventBody) => {
        console.log("\n========== EventReceived ==========");
        console.log("Event ID:", eventId);
        console.log("Event Source:", eventSource);
        console.log("Event Account:", eventAccount);
        console.log("Topic:", topic);
        console.log("Event Body (hex):", eventBody);
        
        // Decode based on topic
        try {
            if (topic === "TokenMinted") {
                console.log(">> TokenMinted event detected");
            } else if (topic === "TokenMintAllowedUpdated") {
                console.log(">> TokenMintAllowedUpdated event detected");
            } else if (topic === "TokenDeleted") {
                console.log(">> TokenDeleted event detected");
            } else if (topic === "TokenCanceled") {
                console.log(">> TokenCanceled event detected");
            }
        } catch (e) {
            console.log("Failed to decode event body:", e.message);
        }
        console.log("====================================\n");
    });

    // Listen for RollupEventReceived (RollupSplit, RollupTransfer, RollupMint)
    l2Event.on("RollupEventReceived", (eventId, eventSource, topic, eventBody) => {
        console.log("\n======== RollupEventReceived ========");
        console.log("Event ID:", eventId);
        console.log("Event Source:", eventSource);
        console.log("Topic:", topic);
        console.log("Event Body (hex):", eventBody);
        
        // Decode based on topic
        try {
            if (topic === "RollupSplit") {
                console.log(">> RollupSplit event detected");
            } else if (topic === "RollupTransfer") {
                console.log(">> RollupTransfer event detected");
            } else if (topic === "RollupMint") {
                console.log(">> RollupMint event detected");
            } else if (topic === "RollupCancel") {
                console.log(">> RollupCancel event detected");
            }
        } catch (e) {
            console.log("Failed to decode event body:", e.message);
        }
        console.log("=====================================\n");
    });

    console.log("Event listeners setup completed for contract:", nativeTokenAddress);
    return l2Event;
}

/**
 * Parse events from transaction receipt
 * @param {object} receipt - Transaction receipt
 * @param {string} nativeTokenAddress - The native token contract address
 */
async function parseEventsFromReceipt(receipt, nativeTokenAddress) {
    const [signer] = await ethers.getSigners();
    const l2Event = new ethers.Contract(nativeTokenAddress, l2EventAbi, signer);
    
    console.log("\n========== Parsing Events from Receipt ==========");
    
    if (receipt.logs && receipt.logs.length > 0) {
        console.log(`Found ${receipt.logs.length} logs in receipt`);
        
        for (let i = 0; i < receipt.logs.length; i++) {
            const log = receipt.logs[i];
            console.log(`\nLog ${i}:`);
            console.log("  Address:", log.address);
            console.log("  Topics:", log.topics);
            
            try {
                const parsed = l2Event.interface.parseLog({
                    topics: log.topics,
                    data: log.data
                });
                if (parsed) {
                    console.log("  Event Name:", parsed.name);
                    console.log("  Event Args:", parsed.args);
                }
            } catch (e) {
                console.log("  (Could not parse as L2Event)");
            }
        }
    } else {
        console.log("No logs found in receipt");
    }
    console.log("=================================================\n");
}

/**
 * Run test function with event listeners
 * @param {Function} testFn - The test function to run
 * @param {string} nativeTokenAddress - The native token contract address
 */
async function runTestWithEvents(testFn, nativeTokenAddress) {
    console.log("Setting up event listeners...");
    const l2Event = await setupEventListeners(nativeTokenAddress);
    
    console.log("\nRunning test...\n");
    await testFn();
    
    // Wait a bit for any pending events
    console.log("\nWaiting for events...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Remove listeners
    l2Event.removeAllListeners();
    console.log("Test completed.");
}

module.exports = {
    l2EventAbi,
    setupEventListeners,
    parseEventsFromReceipt,
    runTestWithEvents
};
