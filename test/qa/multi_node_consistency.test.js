/**
 * Multi-Node Consistency Test Suite
 * 
 * This test suite validates business consistency across 4 geographically distributed
 * blockchain nodes. It executes operations (mint, split, transfer) on a primary node
 * and verifies that transaction results and token states are identical across all nodes.
 * 
 * Test Coverage:
 * 1. Node Connection Verification
 *    - Verifies all 4 nodes are connected with independent instances
 * 
 * 2. Transaction Consistency Tests
 *    - Mint transaction consistency across nodes
 *    - Split transaction consistency across nodes
 *    - Transfer transaction consistency across nodes
 * 
 * 3. Token State Consistency Tests
 *    - Token state after mint across nodes
 *    - Token state after split across nodes
 *    - Token state after transfer across nodes
 * 
 * Node Configuration:
 * - Node 1: l2-node1-native.hamsa-ucl.com (Primary)
 * - Node 2: l2-node2-native.hamsa-ucl.com
 * - Node 3: l2-node3-native.hamsa-ucl.com
 * - Node 4: l2-node4-native.hamsa-ucl.com
 * 
 * Requirements:
 * - All 4 nodes must be accessible and operational
 * - Test wallet must have sufficient permissions for mint/split/transfer operations
 * - Network connectivity must be stable across all nodes
 * 
 * Timeout Configuration:
 * - Test suite timeout: 600000ms (10 minutes)
 * - Transaction confirmation timeout: 60000ms (1 minute) per node
 * 
 * @author Multi-Node Consistency Test Team
 * @version 1.0.0
 */

const { expect } = require('chai');
const { ethers } = require('hardhat');
const { createClient } = require('./token_grpc');
const accounts = require('./../../deployments/account.json');

// Import from NativeTestHelper
const {
    NATIVE_TOKEN_ADDRESS,
    NATIVE_ABI,
    createAuthMetadata,
    sleep,
    setupMintAllowance
} = require('./../help/NativeTestHelper');

// Node configuration
// Multi-node setup for native token consistency testing
const NODE_CONFIGS = [
    {
        name: 'Node 1',
        grpcUrl: 'l2-node1-native.hamsa-ucl.com:50051',
        httpUrl: 'http://l2-node1-native.hamsa-ucl.com:8545'
    },
    {
        name: 'Node 2',
        grpcUrl: 'l2-node2-native.hamsa-ucl.com:50051',
        httpUrl: 'http://l2-node2-native.hamsa-ucl.com:8545'
    },
    {
        name: 'Node 3',
        grpcUrl: 'l2-node3-native.hamsa-ucl.com:50051',
        httpUrl: 'http://l2-node3-native.hamsa-ucl.com:8545'
    },
    {
        name: 'Node 4',
        grpcUrl: 'l2-node4-native.hamsa-ucl.com:50051',
        httpUrl: 'http://l2-node4-native.hamsa-ucl.com:8545'
    }
];

describe("Multi-Node Consistency Tests", function () {
    this.timeout(600000); // 10 minutes

    let nodes = [];
    let primaryWallet;
    let primaryMetadata;
    let receiver1 = accounts.To1;

    /**
     * Initialize connections to all nodes
     * Creates independent provider, contract, and gRPC client for each node
     * @throws {Error} If any node connection fails
     */
    async function initializeNodeConnections() {
        console.log("Initializing connections to all 4 nodes...\n");
        
        // Clear any existing connections
        nodes = [];
        
        for (let i = 0; i < NODE_CONFIGS.length; i++) {
            const config = NODE_CONFIGS[i];
            console.log(`  Connecting to ${config.name}...`);
            
            try {
                // Create independent provider for this node
                const provider = new ethers.JsonRpcProvider(config.httpUrl);
                
                // Create independent contract instance for this node
                const contract = new ethers.Contract(
                    NATIVE_TOKEN_ADDRESS,
                    NATIVE_ABI,
                    provider
                );
                
                // Create independent gRPC client for this node
                const client = createClient(config.grpcUrl);
                
                // Store node connection
                nodes.push({
                    name: config.name,
                    grpcUrl: config.grpcUrl,
                    httpUrl: config.httpUrl,
                    provider: provider,
                    contract: contract,
                    client: client
                });
                
                console.log(`    ✅ ${config.name} connected successfully`);
            } catch (error) {
                console.error(`    ❌ Failed to connect to ${config.name}`);
                console.error(`       Error: ${error.message}`);
                console.error(`       Stack: ${error.stack}`);
                throw new Error(`Node connection failed for ${config.name}: ${error.message}`);
            }
        }
        
        console.log(`\n✅ All ${nodes.length} nodes connected successfully\n`);
    }

    /**
     * Wait for transaction confirmation on a specific node
     * @param {ethers.Provider} provider - The provider for the node
     * @param {string} txHash - Transaction hash to wait for
     * @param {string} nodeName - Name of the node (for logging)
     * @param {number} timeout - Timeout in milliseconds (default: 60000)
     * @returns {Promise<Object>} Transaction receipt
     * @throws {Error} If timeout occurs or transaction fails
     */
    async function waitForTransactionOnNode(provider, txHash, nodeName, timeout = 60000) {
        console.log(`    Waiting for tx on ${nodeName}...`);
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            try {
                const receipt = await provider.getTransactionReceipt(txHash);
                if (receipt) {
                    console.log(`      ✅ ${nodeName}: Confirmed in block ${receipt.blockNumber}`);
                    return receipt;
                }
            } catch (error) {
                // Log error but continue polling
                if (Date.now() - startTime > timeout / 2) {
                    console.log(`      ⚠️  ${nodeName}: Still waiting... (${error.message})`);
                }
            }
            await sleep(1000);
        }
        
        const elapsed = Date.now() - startTime;
        throw new Error(
            `Timeout waiting for transaction ${txHash} on ${nodeName} after ${elapsed}ms. ` +
            `This may indicate network issues or the transaction was not propagated to this node.`
        );
    }

    /**
     * Wait for transaction confirmation on all nodes
     * @param {string} txHash - Transaction hash to wait for
     * @returns {Promise<Array>} Array of receipts from all nodes
     * @throws {Error} If any node times out
     */
    async function waitForTransactionOnAllNodes(txHash) {
        console.log(`\n  ⏳ Waiting for transaction to propagate to all nodes...`);
        console.log(`     Transaction hash: ${txHash}\n`);
        
        const receipts = [];
        const errors = [];
        
        for (const node of nodes) {
            try {
                const receipt = await waitForTransactionOnNode(node.provider, txHash, node.name);
                receipts.push({ node: node.name, receipt });
            } catch (error) {
                console.error(`  ❌ Failed to get transaction on ${node.name}: ${error.message}`);
                errors.push({ node: node.name, error: error.message });
            }
        }
        
        if (errors.length > 0) {
            const errorSummary = errors.map(e => `${e.node}: ${e.error}`).join('\n  ');
            throw new Error(
                `Transaction propagation failed on ${errors.length} node(s):\n  ${errorSummary}`
            );
        }
        
        console.log(`  ✅ Transaction confirmed on all ${nodes.length} nodes\n`);
        return receipts;
    }

    /**
     * Validate transaction consistency across all nodes
     * @param {string} txHash - Transaction hash to validate
     * @throws {Error} If consistency validation fails
     */
    async function validateTransactionConsistency(txHash) {
        console.log(`\n  🔍 Validating transaction consistency across all nodes...`);
        
        let receipts;
        try {
            receipts = await waitForTransactionOnAllNodes(txHash);
        } catch (error) {
            console.error(`\n  ❌ Failed to get transaction receipts from all nodes`);
            throw error;
        }
        
        // Extract transaction details from each node
        const txDetails = receipts.map(r => ({
            node: r.node,
            txHash: r.receipt.hash,
            status: r.receipt.status,
            blockNumber: r.receipt.blockNumber
        }));
        
        // Log details from each node
        console.log(`\n  📊 Transaction details from each node:`);
        txDetails.forEach(detail => {
            console.log(`     ${detail.node}:`);
            console.log(`       - Hash: ${detail.txHash}`);
            console.log(`       - Status: ${detail.status}`);
            console.log(`       - Block: ${detail.blockNumber}`);
        });
        
        // Validate consistency
        const firstTx = txDetails[0];
        const mismatches = [];
        
        for (let i = 1; i < txDetails.length; i++) {
            const currentTx = txDetails[i];
            
            // Check transaction hash
            if (currentTx.txHash !== firstTx.txHash) {
                mismatches.push(
                    `Transaction hash mismatch: ${firstTx.node} (${firstTx.txHash}) vs ` +
                    `${currentTx.node} (${currentTx.txHash})`
                );
            }
            
            // Check status
            if (currentTx.status !== firstTx.status) {
                mismatches.push(
                    `Transaction status mismatch: ${firstTx.node} (${firstTx.status}) vs ` +
                    `${currentTx.node} (${currentTx.status})`
                );
            }
            
            // Check block number
            if (currentTx.blockNumber !== firstTx.blockNumber) {
                mismatches.push(
                    `Block number mismatch: ${firstTx.node} (${firstTx.blockNumber}) vs ` +
                    `${currentTx.node} (${currentTx.blockNumber})`
                );
            }
        }
        
        if (mismatches.length > 0) {
            console.error(`\n  ❌ Consistency validation failed:`);
            mismatches.forEach(m => console.error(`     - ${m}`));
            throw new Error(`Transaction consistency validation failed:\n${mismatches.join('\n')}`);
        }
        
        // Use Chai assertions for final validation
        for (let i = 1; i < txDetails.length; i++) {
            const currentTx = txDetails[i];
            expect(currentTx.txHash).to.equal(firstTx.txHash);
            expect(currentTx.status).to.equal(firstTx.status);
            expect(currentTx.blockNumber).to.equal(firstTx.blockNumber);
        }
        
        console.log(`\n  ✅ Transaction consistency validated: All nodes report identical results\n`);
    }

    /**
     * Validate token state consistency across all nodes
     * @param {BigInt} tokenId - Token ID to validate
     * @param {string} ownerAddress - Expected owner address
     * @param {string} operationType - Type of operation (for logging)
     * @throws {Error} If consistency validation fails
     */
    async function validateTokenStateConsistency(tokenId, ownerAddress, operationType) {
        console.log(`\n  🔍 Validating token state consistency for token ${tokenId}...`);
        
        const tokenStates = [];
        const errors = [];
        
        // Query token state from all nodes
        for (const node of nodes) {
            try {
                const tokenState = await node.contract.getToken(ownerAddress, tokenId);
                tokenStates.push({
                    node: node.name,
                    state: tokenState
                });
                
                console.log(`     ${node.name}:`);
                console.log(`       - Token ID: ${tokenState.id.toString()}`);
                console.log(`       - Owner: ${tokenState.owner}`);
                console.log(`       - Status: ${tokenState.status}`);
            } catch (error) {
                console.error(`     ❌ ${node.name}: Failed to get token`);
                console.error(`        Error: ${error.message}`);
                errors.push({ node: node.name, error: error.message });
            }
        }
        
        if (errors.length > 0) {
            const errorSummary = errors.map(e => `${e.node}: ${e.error}`).join('\n  ');
            throw new Error(
                `Failed to get token state from ${errors.length} node(s):\n  ${errorSummary}`
            );
        }
        
        // Validate consistency
        const firstState = tokenStates[0].state;
        const mismatches = [];
        
        for (let i = 1; i < tokenStates.length; i++) {
            const currentState = tokenStates[i].state;
            const currentNode = tokenStates[i].node;
            const firstNode = tokenStates[0].node;
            
            // Check token ID
            if (currentState.id.toString() !== firstState.id.toString()) {
                mismatches.push(
                    `Token ID: ${firstNode} (${firstState.id.toString()}) vs ` +
                    `${currentNode} (${currentState.id.toString()})`
                );
            }
            
            // Check owner
            if (currentState.owner !== firstState.owner) {
                mismatches.push(
                    `Owner: ${firstNode} (${firstState.owner}) vs ` +
                    `${currentNode} (${currentState.owner})`
                );
            }
            
            // Check status
            if (currentState.status !== firstState.status) {
                mismatches.push(
                    `Status: ${firstNode} (${firstState.status}) vs ` +
                    `${currentNode} (${currentState.status})`
                );
            }
            
            // Check encrypted amount components
            const amountFields = ['cl_x', 'cl_y', 'cr_x', 'cr_y'];
            for (const field of amountFields) {
                if (currentState.amount[field].toString() !== firstState.amount[field].toString()) {
                    mismatches.push(
                        `Amount.${field}: ${firstNode} (${firstState.amount[field].toString()}) vs ` +
                        `${currentNode} (${currentState.amount[field].toString()})`
                    );
                }
            }
        }
        
        if (mismatches.length > 0) {
            console.error(`\n  ❌ Token state consistency validation failed:`);
            mismatches.forEach(m => console.error(`     - ${m}`));
            throw new Error(`Token state consistency validation failed:\n${mismatches.join('\n')}`);
        }
        
        // Use Chai assertions for final validation
        for (let i = 1; i < tokenStates.length; i++) {
            const currentState = tokenStates[i].state;
            expect(currentState.id.toString()).to.equal(firstState.id.toString());
            expect(currentState.owner).to.equal(firstState.owner);
            expect(currentState.status).to.equal(firstState.status);
            expect(currentState.amount.cl_x.toString()).to.equal(firstState.amount.cl_x.toString());
            expect(currentState.amount.cl_y.toString()).to.equal(firstState.amount.cl_y.toString());
            expect(currentState.amount.cr_x.toString()).to.equal(firstState.amount.cr_x.toString());
            expect(currentState.amount.cr_y.toString()).to.equal(firstState.amount.cr_y.toString());
        }
        
        console.log(`\n  ✅ Token state consistency validated: All nodes report identical state\n`);
    }

    before(async function () {
        console.log("\n╔════════════════════════════════════════════════════════════╗");
        console.log("║     Multi-Node Consistency Test Initialization            ║");
        console.log("╚════════════════════════════════════════════════════════════╝\n");
        
        // Initialize wallet and metadata
        primaryWallet = new ethers.Wallet(accounts.MinterKey, ethers.provider);
        primaryMetadata = await createAuthMetadata(accounts.MinterKey);
        console.log(`Primary wallet address: ${primaryWallet.address}\n`);
        
        // Initialize connections to all nodes
        await initializeNodeConnections();
        
        // Setup mint allowance for the primary wallet (minter)
        console.log("Setting up mint allowance for minter...");
        const ownerWallet = new ethers.Wallet(accounts.OwnerKey, ethers.provider);
        const ownerContract = new ethers.Contract(
            NATIVE_TOKEN_ADDRESS,
            NATIVE_ABI,
            ownerWallet
        );
        
        const primaryNode = nodes[0];
        const allowanceAmount = 1000000000; // Large allowance for all tests
        
        const setAllowedTx = await setupMintAllowance(
            ownerContract,
            primaryNode.client,
            primaryWallet.address,
            accounts.OwnerKey,
            allowanceAmount
        );
        console.log(`✅ Mint allowance set successfully, tx: ${setAllowedTx.hash}\n`);
        await sleep(3000);
        
        console.log("╔════════════════════════════════════════════════════════════╗");
        console.log("║     Initialization Complete - Ready for Testing           ║");
        console.log("╚════════════════════════════════════════════════════════════╝\n");
    });

    describe.only("Setup and Connection", function () {
        it("should connect to all 4 nodes successfully", async function () {
            console.log("\n🔍 TEST: Verify all nodes are connected\n");
            
            // Verify we have 4 nodes
            expect(nodes.length).to.equal(4, "Should have 4 node connections");
            
            // Verify each node has required components
            for (const node of nodes) {
                console.log(`  Verifying ${node.name}...`);
                
                // Verify provider exists and is distinct
                expect(node.provider).to.exist;
                expect(node.provider).to.be.instanceOf(ethers.JsonRpcProvider);
                
                // Verify contract exists and is distinct
                expect(node.contract).to.exist;
                expect(node.contract.target).to.equal(NATIVE_TOKEN_ADDRESS);
                
                // Verify gRPC client exists
                expect(node.client).to.exist;
                
                console.log(`    ✅ ${node.name} verified`);
            }
            
            // Verify all providers are distinct instances
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    expect(nodes[i].provider).to.not.equal(nodes[j].provider,
                        `${nodes[i].name} and ${nodes[j].name} should have distinct providers`);
                    
                    // Verify contracts have different providers (which ensures they are distinct)
                    expect(nodes[i].contract.runner).to.not.equal(nodes[j].contract.runner,
                        `${nodes[i].name} and ${nodes[j].name} should have distinct contract runners`);
                    
                    expect(nodes[i].client).to.not.equal(nodes[j].client,
                        `${nodes[i].name} and ${nodes[j].name} should have distinct clients`);
                }
            }
            
            console.log(`\n  ✅ All 4 nodes connected with independent instances\n`);
        });
    });

    describe.only("Transaction Consistency Tests", function () {
        it("should verify mint transaction consistency across all nodes", async function () {
            console.log("\n╔════════════════════════════════════════════════════════════╗");
            console.log("║     TEST: Mint Transaction Consistency                    ║");
            console.log("╚════════════════════════════════════════════════════════════╝\n");
            
            // Execute mint operation on node1 (primary node)
            const primaryNode = nodes[0];
            const primaryContract = new ethers.Contract(
                NATIVE_TOKEN_ADDRESS,
                NATIVE_ABI,
                primaryWallet
            );
            
            const numberOfTokens = 2;
            const tokenAmount = 1000;
            
            console.log(`  📝 Executing mint operation on ${primaryNode.name}...`);
            console.log(`     - Number of tokens: ${numberOfTokens}`);
            console.log(`     - Amount per token: ${tokenAmount}\n`);
            
            // Create mint request
            const to_accounts = Array(numberOfTokens).fill().map(() => ({
                address: primaryWallet.address,
                amount: tokenAmount
            }));
            
            const generateRequest = {
                sc_address: NATIVE_TOKEN_ADDRESS,
                token_type: '0',
                from_address: primaryWallet.address,
                to_accounts: to_accounts,
            };
            
            // Generate proof using primary node's gRPC client
            const response = await primaryNode.client.generateBatchMintProof(generateRequest, primaryMetadata);
            
            const recipients = response.to_accounts.map(account => account.address);
            const batchedSize = response.batched_size;
            
            const newTokens = response.to_accounts.map((account) => ({
                id: account.token.token_id,
                owner: account.address,
                status: 2,
                amount: {
                    cl_x: account.token.cl_x,
                    cl_y: account.token.cl_y,
                    cr_x: account.token.cr_x,
                    cr_y: account.token.cr_y,
                },
                to: account.address,
                rollbackTokenId: 0
            }));
            
            const newAllowed = {
                id: response.mint_allowed.token_id,
                value: {
                    cl_x: response.mint_allowed.cl_x,
                    cl_y: response.mint_allowed.cl_y,
                    cr_x: response.mint_allowed.cr_x,
                    cr_y: response.mint_allowed.cr_y,
                }
            };
            
            const proof = response.proof.map(p => ethers.toBigInt(p));
            const publicInputs = response.input.map(i => ethers.toBigInt(i));
            const padding = Math.max(Number(batchedSize) - to_accounts.length, 0);
            
            // Execute mint transaction
            const mintTx = await primaryContract.mint(recipients, newTokens, newAllowed, proof, publicInputs, padding);
            console.log(`  ✅ Mint transaction submitted: ${mintTx.hash}\n`);
            
            // Validate transaction consistency across all nodes
            await validateTransactionConsistency(mintTx.hash);
            
            console.log("╔════════════════════════════════════════════════════════════╗");
            console.log("║     ✅ Mint Transaction Consistency Test PASSED           ║");
            console.log("╚════════════════════════════════════════════════════════════╝\n");
        });

        it("should verify split transaction consistency across all nodes", async function () {
            console.log("\n╔════════════════════════════════════════════════════════════╗");
            console.log("║     TEST: Split Transaction Consistency                   ║");
            console.log("╚════════════════════════════════════════════════════════════╝\n");
            
            const primaryNode = nodes[0];
            const primaryContract = new ethers.Contract(
                NATIVE_TOKEN_ADDRESS,
                NATIVE_ABI,
                primaryWallet
            );
            
            console.log(`  📝 Executing split operation on ${primaryNode.name}...`);
            console.log(`     - Recipients: 2\n`);
            
            // Create split request
            const splitRequests = {
                sc_address: NATIVE_TOKEN_ADDRESS,
                token_type: '0',
                from_address: primaryWallet.address,
                to_accounts: [
                    { address: receiver1, amount: 100, comment: "split-1" },
                    { address: receiver1, amount: 100, comment: "split-2" }
                ]
            };
            
            // Generate split proof
            const splitProofResponse = await primaryNode.client.generateBatchSplitToken(splitRequests, primaryMetadata);
            await sleep(2000);
            
            const detailResponse = await primaryNode.client.getBatchSplitTokenDetail(
                { request_id: splitProofResponse.request_id },
                primaryMetadata
            );
            
            const recipients = detailResponse.to_addresses;
            const consumedIds = detailResponse.consumedIds.map(ids => ids.token_id);
            
            const newTokens = detailResponse.newTokens.map((account, idx) => ({
                id: account.token_id,
                owner: primaryWallet.address,
                status: 2,
                amount: {
                    cl_x: ethers.toBigInt(account.cl_x),
                    cl_y: ethers.toBigInt(account.cl_y),
                    cr_x: ethers.toBigInt(account.cr_x),
                    cr_y: ethers.toBigInt(account.cr_y)
                },
                to: idx % 2 === 0 ? primaryWallet.address : recipients[Math.floor(idx / 2)],
                rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1].token_id
            }));
            
            const proof = detailResponse.proof.map(p => ethers.toBigInt(p));
            const publicInputs = detailResponse.public_input.map(i => ethers.toBigInt(i));
            const paddingNum = detailResponse.batched_size - recipients.length;
            
            // Execute split transaction
            const splitTx = await primaryContract.split(
                primaryWallet.address,
                recipients,
                consumedIds,
                newTokens,
                proof,
                publicInputs,
                paddingNum
            );
            console.log(`  ✅ Split transaction submitted: ${splitTx.hash}\n`);
            
            // Validate transaction consistency across all nodes
            await validateTransactionConsistency(splitTx.hash);
            
            console.log("╔════════════════════════════════════════════════════════════╗");
            console.log("║     ✅ Split Transaction Consistency Test PASSED          ║");
            console.log("╚════════════════════════════════════════════════════════════╝\n");
        });

        it("should verify transfer transaction consistency across all nodes", async function () {
            console.log("\n╔════════════════════════════════════════════════════════════╗");
            console.log("║     TEST: Transfer Transaction Consistency                ║");
            console.log("╚════════════════════════════════════════════════════════════╝\n");
            
            const primaryNode = nodes[0];
            const primaryContract = new ethers.Contract(
                NATIVE_TOKEN_ADDRESS,
                NATIVE_ABI,
                primaryWallet
            );
            
            console.log(`  📝 Executing transfer operation on ${primaryNode.name}...`);
            
            // Get a token to transfer
            const tokenListResponse = await primaryNode.client.getSplitTokenList(
                primaryWallet.address,
                NATIVE_TOKEN_ADDRESS,
                primaryMetadata
            );
            
            if (!tokenListResponse.split_tokens || tokenListResponse.split_tokens.length === 0) {
                console.log("  ⚠️  No tokens available for transfer, skipping test");
                this.skip();
            }
            
            const tokenId = ethers.toBigInt(tokenListResponse.split_tokens[0].token_id);
            console.log(`     - Token ID: ${tokenId.toString()}\n`);
            
            // Execute transfer transaction
            const transferTx = await primaryContract.transfer(tokenId, "multi-node-consistency-test");
            console.log(`  ✅ Transfer transaction submitted: ${transferTx.hash}\n`);
            
            // Validate transaction consistency across all nodes
            await validateTransactionConsistency(transferTx.hash);
            
            console.log("╔════════════════════════════════════════════════════════════╗");
            console.log("║     ✅ Transfer Transaction Consistency Test PASSED       ║");
            console.log("╚════════════════════════════════════════════════════════════╝\n");
        });
    });

    describe("Token State Consistency Tests", function () {
        let mintedTokenIds = [];

        it("should verify token state consistency after mint across all nodes", async function () {
            console.log("\n╔════════════════════════════════════════════════════════════╗");
            console.log("║     TEST: Token State After Mint Consistency              ║");
            console.log("╚════════════════════════════════════════════════════════════╝\n");
            
            const primaryNode = nodes[0];
            const primaryContract = new ethers.Contract(
                NATIVE_TOKEN_ADDRESS,
                NATIVE_ABI,
                primaryWallet
            );
            
            const numberOfTokens = 3;
            const tokenAmount = 2000;
            
            console.log(`  📝 Executing mint operation on ${primaryNode.name}...`);
            console.log(`     - Number of tokens: ${numberOfTokens}`);
            console.log(`     - Amount per token: ${tokenAmount}\n`);
            
            // Create mint request
            const to_accounts = Array(numberOfTokens).fill().map(() => ({
                address: primaryWallet.address,
                amount: tokenAmount
            }));
            
            const generateRequest = {
                sc_address: NATIVE_TOKEN_ADDRESS,
                token_type: '0',
                from_address: primaryWallet.address,
                to_accounts: to_accounts,
            };
            
            // Generate proof
            const response = await primaryNode.client.generateBatchMintProof(generateRequest, primaryMetadata);
            
            const recipients = response.to_accounts.map(account => account.address);
            const batchedSize = response.batched_size;
            
            const newTokens = response.to_accounts.map((account) => ({
                id: account.token.token_id,
                owner: account.address,
                status: 2,
                amount: {
                    cl_x: account.token.cl_x,
                    cl_y: account.token.cl_y,
                    cr_x: account.token.cr_x,
                    cr_y: account.token.cr_y,
                },
                to: account.address,
                rollbackTokenId: 0
            }));
            
            const newAllowed = {
                id: response.mint_allowed.token_id,
                value: {
                    cl_x: response.mint_allowed.cl_x,
                    cl_y: response.mint_allowed.cl_y,
                    cr_x: response.mint_allowed.cr_x,
                    cr_y: response.mint_allowed.cr_y,
                }
            };
            
            const proof = response.proof.map(p => ethers.toBigInt(p));
            const publicInputs = response.input.map(i => ethers.toBigInt(i));
            const padding = Math.max(Number(batchedSize) - to_accounts.length, 0);
            
            // Execute mint transaction
            const mintTx = await primaryContract.mint(recipients, newTokens, newAllowed, proof, publicInputs, padding);
            console.log(`  ✅ Mint transaction submitted: ${mintTx.hash}\n`);
            
            // Wait for transaction to propagate to all nodes
            await waitForTransactionOnAllNodes(mintTx.hash);
            
            // Store minted token IDs for later tests
            mintedTokenIds = newTokens.map(token => ethers.toBigInt(token.id));
            
            // Validate token state consistency for each minted token
            console.log(`  🔍 Validating token state for ${mintedTokenIds.length} minted tokens...\n`);
            for (const tokenId of mintedTokenIds) {
                await validateTokenStateConsistency(tokenId, primaryWallet.address, 'mint');
            }
            
            console.log("╔════════════════════════════════════════════════════════════╗");
            console.log("║     ✅ Token State After Mint Consistency Test PASSED     ║");
            console.log("╚════════════════════════════════════════════════════════════╝\n");
        });

        it("should verify token state consistency after split across all nodes", async function () {
            console.log("\n╔════════════════════════════════════════════════════════════╗");
            console.log("║     TEST: Token State After Split Consistency             ║");
            console.log("╚════════════════════════════════════════════════════════════╝\n");
            
            const primaryNode = nodes[0];
            const primaryContract = new ethers.Contract(
                NATIVE_TOKEN_ADDRESS,
                NATIVE_ABI,
                primaryWallet
            );
            
            console.log(`  📝 Executing split operation on ${primaryNode.name}...`);
            console.log(`     - Recipients: 2\n`);
            
            // Create split request
            const splitRequests = {
                sc_address: NATIVE_TOKEN_ADDRESS,
                token_type: '0',
                from_address: primaryWallet.address,
                to_accounts: [
                    { address: receiver1, amount: 200, comment: "split-state-1" },
                    { address: receiver1, amount: 200, comment: "split-state-2" }
                ]
            };
            
            // Generate split proof
            const splitProofResponse = await primaryNode.client.generateBatchSplitToken(splitRequests, primaryMetadata);
            await sleep(2000);
            
            const detailResponse = await primaryNode.client.getBatchSplitTokenDetail(
                { request_id: splitProofResponse.request_id },
                primaryMetadata
            );
            
            const recipients = detailResponse.to_addresses;
            const consumedIds = detailResponse.consumedIds.map(ids => ids.token_id);
            
            const newTokens = detailResponse.newTokens.map((account, idx) => ({
                id: account.token_id,
                owner: primaryWallet.address,
                status: 2,
                amount: {
                    cl_x: ethers.toBigInt(account.cl_x),
                    cl_y: ethers.toBigInt(account.cl_y),
                    cr_x: ethers.toBigInt(account.cr_x),
                    cr_y: ethers.toBigInt(account.cr_y)
                },
                to: idx % 2 === 0 ? primaryWallet.address : recipients[Math.floor(idx / 2)],
                rollbackTokenId: idx % 2 === 0 ? 0 : detailResponse.newTokens[idx + 1].token_id
            }));
            
            const proof = detailResponse.proof.map(p => ethers.toBigInt(p));
            const publicInputs = detailResponse.public_input.map(i => ethers.toBigInt(i));
            const paddingNum = detailResponse.batched_size - recipients.length;
            
            // Execute split transaction
            const splitTx = await primaryContract.split(
                primaryWallet.address,
                recipients,
                consumedIds,
                newTokens,
                proof,
                publicInputs,
                paddingNum
            );
            console.log(`  ✅ Split transaction submitted: ${splitTx.hash}\n`);
            
            // Wait for transaction to propagate to all nodes
            await waitForTransactionOnAllNodes(splitTx.hash);
            
            // Validate token state consistency for all new tokens
            const newTokenIds = newTokens.map(token => ethers.toBigInt(token.id));
            console.log(`  🔍 Validating token state for ${newTokenIds.length} split tokens...\n`);
            for (const tokenId of newTokenIds) {
                await validateTokenStateConsistency(tokenId, primaryWallet.address, 'split');
            }
            
            console.log("╔════════════════════════════════════════════════════════════╗");
            console.log("║     ✅ Token State After Split Consistency Test PASSED    ║");
            console.log("╚════════════════════════════════════════════════════════════╝\n");
        });

        it("should verify token state consistency after transfer across all nodes", async function () {
            console.log("\n╔════════════════════════════════════════════════════════════╗");
            console.log("║     TEST: Token State After Transfer Consistency          ║");
            console.log("╚════════════════════════════════════════════════════════════╝\n");
            
            const primaryNode = nodes[0];
            const primaryContract = new ethers.Contract(
                NATIVE_TOKEN_ADDRESS,
                NATIVE_ABI,
                primaryWallet
            );
            
            console.log(`  📝 Executing transfer operation on ${primaryNode.name}...`);
            
            // Get a token to transfer
            const tokenListResponse = await primaryNode.client.getSplitTokenList(
                primaryWallet.address,
                NATIVE_TOKEN_ADDRESS,
                primaryMetadata
            );
            
            if (!tokenListResponse.split_tokens || tokenListResponse.split_tokens.length === 0) {
                console.log("  ⚠️  No tokens available for transfer, skipping test");
                this.skip();
            }
            
            const tokenId = ethers.toBigInt(tokenListResponse.split_tokens[0].token_id);
            console.log(`     - Token ID: ${tokenId.toString()}\n`);
            
            // Execute transfer transaction
            const transferTx = await primaryContract.transfer(tokenId, "multi-node-state-test");
            console.log(`  ✅ Transfer transaction submitted: ${transferTx.hash}\n`);
            
            // Wait for transaction to propagate to all nodes
            await waitForTransactionOnAllNodes(transferTx.hash);
            
            // Validate token state consistency after transfer
            // Note: After transfer, the token still belongs to the original owner (primaryWallet)
            // but its status/type changes to indicate it has been transferred
            await validateTokenStateConsistency(tokenId, primaryWallet.address, 'transfer');
            
            console.log("╔════════════════════════════════════════════════════════════╗");
            console.log("║     ✅ Token State After Transfer Consistency Test PASSED ║");
            console.log("╚════════════════════════════════════════════════════════════╝\n");
        });
    });
});
