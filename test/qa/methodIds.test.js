// test/hamsa_explorer_api.test.js
// Hamsa Explorer API Test Suite - Mocha/Chai Format
// Tests all 6 APIs with and without methodIds filtering where applicable

const { expect } = require('chai');
const fetch = require('node-fetch');

// ========================================
// Configuration
// ========================================
const CONFIG = {
    API_ENDPOINT: 'http://L2-node11.hamsa-ucl.com:8545',
    DEFAULT_PAGE_SIZE: 10,
    RATE_LIMIT_DELAY: 300, // ms between tests
    TEST_BLOCK_NUMBER: '3062', // Static block for consistent testing
    TEST_METHOD_IDS: ['0x60806040', '0x485cc955', '0x615f5063'],
    SAMPLE_ADDRESS: '0xf17f52151EbEF6C7334FAD080c5704D77216b732',
};

// ANSI color codes for formatted output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    gray: '\x1b[90m',
};

// ========================================
// Helper Functions
// ========================================

/**
 * Sends JSON-RPC request to the API endpoint
 * @param {string} method - RPC method name
 * @param {Object|Array} params - Method parameters
 * @param {number} id - Request ID
 * @returns {Promise<Object>} {success: boolean, data?: Object, error?: string}
 */
async function sendRequest(method, params, id) {
    const payload = {
        jsonrpc: '2.0',
        method,
        params: Array.isArray(params) ? params : [params],
        id,
    };

    try {
        const response = await fetch(CONFIG.API_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Handle JSON-RPC error response
        if (data.error) {
            throw new Error(`RPC Error: ${JSON.stringify(data.error)}`);
        }

        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Delays execution to prevent rate limiting
 * @param {number} ms - Milliseconds to delay
 */
const delay = (ms = CONFIG.RATE_LIMIT_DELAY) =>
    new Promise(resolve => setTimeout(resolve, ms));

/**
 * Logs test execution details
 * @param {string} testName - Test description
 * @param {Object} request - Request object
 * @param {Object} response - Response object
 */
function logTestInfo(testName, request, response) {
    console.log(`\n${colors.cyan}${'='.repeat(80)}${colors.reset}`);
    console.log(`${colors.bright}${colors.yellow}🧪 ${testName}${colors.reset}`);
    console.log(`${colors.gray}Method: ${request.method} | ID: ${request.id}${colors.reset}`);
    console.log(`${colors.magenta}📤 Request:${colors.reset}`, JSON.stringify(request.params, null, 2));

    if (!response.success) {
        console.log(`${colors.red}❌ Error: ${response.error}${colors.reset}`);
        return;
    }

    console.log(`${colors.green}✅ Response: Success${colors.reset}`);
    const result = response.data.result;

    // Log relevant metrics based on API method
    const metrics = {
        explorer_getBlockList: `Blocks=${result?.data?.list?.length || 0}, Total=${result?.data?.total || 0}`,
        explorer_getBlockDetail: `Block=${result?.data?.blockNumber}, Transactions=${result?.data?.list?.length || 0}`,
        explorer_getTransactionList: `Txns=${result?.data?.list?.length || 0}, Total=${result?.data?.total || 0}`,
        explorer_getBlockTransactionCount: `Total=${result?.data?.total || 0}, Filtered=${result?.data?.list?.length || 0}`,
        explorer_getLineData: `Points=${result?.data?.length || 0}`,
        explorer_getTransactionByHash: `Block=${result?.data?.blockNumber}`,
    };

    console.log(`${colors.blue}📊 Metrics:${colors.reset} ${metrics[request.method] || 'N/A'}`);
}

// ========================================
// Test Data Cache
// ========================================
let testDataCache = {
    blockNumber: null,
    transactionHash: null,
    methodId: null,
    fromAddress: null,
};

/**
 * Initializes test data by fetching a sample transaction
 * Caches results to avoid duplicate API calls
 */
async function initializeTestData() {
    if (testDataCache.transactionHash) return testDataCache;

    try {
        const response = await sendRequest(
            'explorer_getTransactionList',
            { page: 1, pageSize: 10 },
            999
        );

        if (response.success && response.data.result?.data?.list?.length > 0) {
            const tx = response.data.result.data.list[0];
            testDataCache = {
                blockNumber: tx.blockNumber.toString(),
                transactionHash: tx.hash,
                methodId: tx.metadata?.methodId,
                fromAddress: tx.from,
            };
            console.log(`${colors.gray}Test data initialized:`, testDataCache, colors.reset);
        }
    } catch (error) {
        console.warn(`${colors.yellow}⚠️  Failed to initialize test data: ${error.message}${colors.reset}`);
    }

    return testDataCache;
}

// ========================================
// Test Suites
// ========================================

describe('Hamsa Explorer API Tests', function() {
    this.timeout(10000);

    // Initialize test data once before all tests
    before(async function() {
        console.log(`${colors.bright}\n🚀 Starting Hamsa Explorer API Test Suite${colors.reset}`);
        console.log(`${colors.gray}Endpoint: ${CONFIG.API_ENDPOINT}${colors.reset}\n`);
        await initializeTestData();
    });

    describe('1. explorer_getBlockList', () => {
        it('should fetch block list without methodIds filter', async () => {
            const request = {
                method: 'explorer_getBlockList',
                params: { page: 1, pageSize: CONFIG.DEFAULT_PAGE_SIZE },
                id: 1,
            };

            const response = await sendRequest(request.method, request.params, request.id);
            logTestInfo('Block List - No Filter', request, response);

            expect(response.success).to.be.true;
            expect(response.data.result).to.have.property('data');
            expect(response.data.result.data.list).to.be.an('array');
            expect(response.data.result.data.list.length).to.be.at.most(CONFIG.DEFAULT_PAGE_SIZE);
        });

        it('should fetch block list with onlyWithTxn filter', async () => {
            const request = {
                method: 'explorer_getBlockList',
                params: { page: 1, pageSize: 5, onlyWithTxn: true },
                id: 2,
            };

            const response = await sendRequest(request.method, request.params, request.id);
            logTestInfo('Block List - Only With Transactions', request, response);
            console.log('Block List:', response.data.result.data.list)
            expect(response.success).to.be.true;
            expect(response.data.result.data.list).to.be.an('array');
            // All returned blocks should have at least 1 transaction
            response.data.result.data.list.forEach(block => {
                expect(Number(block.txn)).to.be.greaterThan(0);
            });
        });

        it('should fetch block list with methodIds filter', async () => {
            const request = {
                method: 'explorer_getBlockList',
                params: {
                    page: 1,
                    pageSize: 5,
                    methodIds: [CONFIG.TEST_METHOD_IDS[2]],
                    onlyWithTxn: true,
                },
                id: 3,
            };

            const response = await sendRequest(request.method, request.params, request.id);
            logTestInfo('Block List - With methodIds Filter', request, response);

            expect(response.success).to.be.true;
            expect(response.data.result.data.list).to.be.an('array');
        });
    });

    describe('2. explorer_getBlockDetail', () => {
        before(async () => {
            await delay();
        });

        it('should fetch block detail without methodIds filter', async () => {
            const blockNumber = testDataCache.blockNumber || CONFIG.TEST_BLOCK_NUMBER;

            const request = {
                method: 'explorer_getBlockDetail',
                params: { blockNumber:blockNumber },
                id: 4,
            };

            const response = await sendRequest(request.method, request.params, request.id);
            logTestInfo(`Block Detail - Block #${blockNumber} (No Filter)`, request, response);

            expect(response.success).to.be.true;
            expect(response.data.result.data.blockNumber).to.equal(blockNumber);
        });

        it('should fetch block detail with methodIds filter', async () => {
            const blockNumber = testDataCache.blockNumber || CONFIG.TEST_BLOCK_NUMBER;

            const request = {
                method: 'explorer_getBlockDetail',
                params: {
                    blockNumber,
                    methodIds: CONFIG.TEST_METHOD_IDS,
                },
                id: 5,
            };

            const response = await sendRequest(request.method, request.params, request.id);
            logTestInfo(`Block Detail - Block #${blockNumber} (With methodIds)`, request, response);

            expect(response.success).to.be.true;
            expect(response.data.result.data.blockNumber).to.equal(blockNumber);

            // If transactions exist, verify they match the filter
            const transactions = response.data.result.data.list || [];
            if (transactions.length > 0) {
                const hasMatchingMethodId = transactions.some(tx =>
                    CONFIG.TEST_METHOD_IDS.some(id => tx.input?.startsWith(id))
                );
                expect(hasMatchingMethodId).to.be.true;
            }
        });
    });

    describe('3. explorer_getLineData', () => {
        before(async () => {
            await delay();
        });

        it('should fetch daily line data', async () => {
            const request = {
                method: 'explorer_getLineData',
                params: { type: 'day' },
                id: 6,
            };

            const response = await sendRequest(request.method, request.params, request.id);
            logTestInfo('Line Data - Daily', request, response);

            expect(response.success).to.be.true;
            expect(response.data.result.data).to.be.an('array');
            expect(response.data.result.data.length).to.be.greaterThan(0);
        });

        it('should fetch hourly line data', async () => {
            const request = {
                method: 'explorer_getLineData',
                params: { type: 'hour' },
                id: 7,
            };

            const response = await sendRequest(request.method, request.params, request.id);
            logTestInfo('Line Data - Hourly', request, response);

            expect(response.success).to.be.true;
            expect(response.data.result.data).to.be.an('array');
        });
    });

    describe('4. explorer_getTransactionList', () => {
        before(async () => {
            await delay();
        });

        it('should fetch transaction list without methodIds filter', async () => {
            const request = {
                method: 'explorer_getTransactionList',
                params: { page: 1, pageSize: CONFIG.DEFAULT_PAGE_SIZE },
                id: 8,
            };

            const response = await sendRequest(request.method, request.params, request.id);
            logTestInfo('Transaction List - No Filter', request, response);

            expect(response.success).to.be.true;
            expect(response.data.result.data.list).to.be.an('array');
            expect(response.data.result.data.list.length).to.be.at.most(CONFIG.DEFAULT_PAGE_SIZE);
        });

        it('should fetch transaction list with methodIds filter', async () => {
            const methodId = testDataCache.methodId || CONFIG.TEST_METHOD_IDS[2];

            const request = {
                method: 'explorer_getTransactionList',
                params: {
                    page: 1,
                    pageSize: CONFIG.DEFAULT_PAGE_SIZE,
                    methodIds: [methodId]
                },
                id: 9,
            };

            const response = await sendRequest(request.method, request.params, request.id);
            logTestInfo(`Transaction List - Filtered by methodIds: [${methodId}]`, request, response);

            expect(response.success).to.be.true;
            expect(response.data.result.data.list).to.be.an('array');

            // Verify all results contain the methodId
            const transactions = response.data.result.data.list;
            if (transactions.length > 0) {
                transactions.forEach(tx => {
                    expect(tx.metadata?.methodId).to.equal(methodId);
                });
            }
        });

        it('should fetch transaction list filtered by from address', async function() {
            const fromAddress = testDataCache.fromAddress || CONFIG.SAMPLE_ADDRESS;
            if (!fromAddress) this.skip();

            const request = {
                method: 'explorer_getTransactionList',
                params: {
                    page: 1,
                    pageSize: 5,
                    from: fromAddress,
                },
                id: 10,
            };

            const response = await sendRequest(request.method, request.params, request.id);
            logTestInfo(`Transaction List - Filtered by From: ${fromAddress.substring(0, 10)}...`, request, response);

            expect(response.success).to.be.true;
            expect(response.data.result.data.list).to.be.an('array');
        });

        it('should fetch transaction list in strict mode (true)', async function() {
            const fromAddress = testDataCache.fromAddress || CONFIG.SAMPLE_ADDRESS;
            if (!fromAddress) this.skip();

            const request = {
                method: 'explorer_getTransactionList',
                params: {
                    page: 1,
                    pageSize: 5,
                    from: fromAddress,
                    strictMode: true,
                },
                id: 11,
            };

            const response = await sendRequest(request.method, request.params, request.id);
            logTestInfo('Transaction List - Strict Mode', request, response);

            expect(response.success).to.be.true;
            expect(response.data.result.data.list).to.be.an('array');
        });

        it('should fetch transaction list filtered by block number', async function() {
            const blockNumber = testDataCache.blockNumber;
            if (!blockNumber) this.skip();

            const request = {
                method: 'explorer_getTransactionList',
                params: {
                    page: 1,
                    pageSize: 10,
                    blockNumber: blockNumber.toString(),
                },
                id: 12,
            };

            const response = await sendRequest(request.method, request.params, request.id);
            logTestInfo(`Transaction List - Block #${blockNumber}`, request, response);

            expect(response.success).to.be.true;
            const transactions = response.data.result.data.list;
            if (transactions.length > 0) {
                expect(transactions[0].blockNumber.toString()).to.equal(blockNumber);
            }
        });

        it('should fetch transaction list filtered by hash', async function() {
            const hash = testDataCache.transactionHash;
            if (!hash) this.skip();

            const request = {
                method: 'explorer_getTransactionList',
                params: {
                    page: 1,
                    pageSize: 5,
                    hash,
                },
                id: 13,
            };

            const response = await sendRequest(request.method, request.params, request.id);
            logTestInfo(`Transaction List - Hash: ${hash.substring(0, 16)}...`, request, response);

            expect(response.success).to.be.true;
            const transactions = response.data.result.data.list;
            if (transactions.length > 0) {
                expect(transactions[0].hash).to.equal(hash);
            }
        });
    });

    describe('5. explorer_getTransactionByHash', () => {
        before(async () => {
            await delay();
        });

        it('should fetch transaction by hash', async function() {
            const hash = testDataCache.transactionHash;
            if (!hash) this.skip();

            const request = {
                method: 'explorer_getTransactionByHash',
                params: [hash],
                id: 14,
            };

            const response = await sendRequest(request.method, request.params, request.id);
            logTestInfo('Transaction By Hash', request, response);
            console.log(response.data.result)
            if (response.data.result.data.list>0){
                expect(response.data.result.data.list[0].hash).to.equal(hash);
            }
        });
    });

    describe('6. explorer_getBlockTransactionCount', () => {
        before(async () => {
            await delay();
        });

        it('should fetch block transaction count without methodIds filter', async function() {
            const blockNumber = testDataCache.blockNumber.toString();

            const request = {
                method: 'explorer_getBlockTransactionCount',
                params: { blockNumber:blockNumber },
                id: 15,
            };

            const response = await sendRequest(request.method, request.params, request.id);
            logTestInfo(`Block Tx Count - Block #${blockNumber}`, request, response);

            expect(response.success).to.be.true;
            console.log(response.data.result)
            expect(response.data.result).to.have.property('txnCount');
        });

        it('should fetch block transaction count with methodIds filter', async function() {
            const blockNumber = testDataCache.blockNumber || CONFIG.TEST_BLOCK_NUMBER;
            const request = {
                method: 'explorer_getBlockTransactionCount',
                params: { blockNumber: blockNumber.toString(), methodIds: [testDataCache.methodId] },
                id: 15,
            };
            console.log(request.params)
            const response = await sendRequest(request.method, request.params, request.id);
            logTestInfo(`Block Tx Count - Filtered by methodIds`, request, response);
            console.log(response.data.result)
            expect(response.success).to.be.true;
            if (response.data.result.total > 0){
                expect(response.data.result.metadata.methodId).to.equal(methodId);
            }
        });
    });

    // Final summary
    after(() => {
        console.log(`\n${colors.green}${'='.repeat(80)}${colors.reset}`);
        console.log(`${colors.bright}🏁 Test Suite Completed${colors.reset}`);
        console.log(`${colors.gray}Endpoint: ${CONFIG.API_ENDPOINT}${colors.reset}`);
        console.log(`${colors.green}${'='.repeat(80)}${colors.reset}\n`);
    });
});