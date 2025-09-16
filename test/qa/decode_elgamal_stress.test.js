const { expect } = require("chai");
const { ethers } = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const { createClient } = require('../qa/token_grpc');
const https = require('https');

const httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 60000,
    freeSocketTimeout: 30000
});

// Node3 GRPC 连接
const rpcUrl = "qa-node3-rpc.hamsa-ucl.com:50051";
const client = createClient(rpcUrl);

const clientWithPool = createClient(rpcUrl, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    // gRPC 连接池相关配置
    'grpc.max_connection_idle_ms': 30000,
    'grpc.max_connection_age_ms': 60000,
    'grpc.keepalive_time_ms': 10000,
    'grpc.keepalive_timeout_ms': 5000,
    'grpc.keepalive_permit_without_calls': 1,
    'grpc.http2.max_pings_without_data': 0,
    'grpc.client_idle_timeout_ms': 5000
});

const {
    createAuthMetadata
} = require("../help/testHelp");

const adminPrivateKey = hardhatConfig.networks.ucl_L2.accounts[0];
const balance = {
    cl_x: "1964037076661478832091343095893178906711955991017793273625890630250133225131",
    cl_y: "15905501110278917982136565763010546337694082364420938370758314633459389867828",
    cr_x: "6032315780222124442197125438972811787823257335241885174315052214529236213245",
    cr_y: "4661193269845438292333666932675091279526371009153842373600639673542587256610"
}
/**
 * 生成随机的大整数字符串
 * @param {number} min 最小值
 * @param {number} max 最大值
 * @returns {string} 随机数字符串
 */
function generateRandomBigInt(min, max) {
    const range = BigInt(max) - BigInt(min);
    const randomBigInt = BigInt(min) + (BigInt(Math.floor(Math.random() * Number(range))));
    return randomBigInt.toString();
}

/**
 * 生成随机的ElGamal加密金额
 * @param {number} amount 原始金额 (1 到 1000000)
 * @returns {object} 包含 cl_x, cl_y, cr_x, cr_y 的对象
 */
async function generateRandomElGamalAmount(amount,metadata) {
    const convertToPUSDCResponse = {
        amount: amount
    };

    console.log("Generating proof for conversion to private USDC...");
    let proofResult = await client.convertToPUSDC(convertToPUSDCResponse, metadata);
    console.log("Conversion proof response:", proofResult);

    const elAmount = {
        cl_x: ethers.toBigInt(proofResult.elgamal.cl_x),
        cl_y: ethers.toBigInt(proofResult.elgamal.cl_y),
        cr_x: ethers.toBigInt(proofResult.elgamal.cr_x),
        cr_y: ethers.toBigInt(proofResult.elgamal.cr_y)
    };
    return elAmount;
}

/**
 * 执行单次 decodeElgamalAmount API 调用
 * @param {object} elgamalAmount ElGamal加密金额
 * @param {object} metadata 认证元数据
 * @returns {object} 包含成功状态、响应时间等信息的结果
 */
async function executeSingleDecodeRequest(metadata) {
    const startTime = Date.now();
    try {
        // 使用连接池的客户端
        const response = await client.decodeElgamalAmount(balance, metadata);
        // const response = await clientWithPool.decodeElgamalAmount(balance, metadata);
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        return {
            success: true,
            responseTime,
            decodedBalance: response.balance,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        return {
            success: false,
            responseTime,
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}
// async function executeSingleDecodeRequest( metadata) {
//     const response = await client.decodeElgamalAmount(balance, metadata);
// }

/**
 * 批量执行 decodeElgamalAmount 请求
 * @param {number} batchSize 批次大小
 * @param {object} metadata 认证元数据
 * @returns {array} 批次执行结果
 */
async function executeBatchRequests(batchSize, metadata) {
    const tasks = Array(batchSize).fill().map(() => () => executeSingleDecodeRequest(metadata));
    const startTime = Date.now();
    const concurrencyLimit = batchSize;
    // const concurrencyLimit = 2000;
    const results = [];

    // 分批并发执行
    for (let i = 0; i < tasks.length; i += concurrencyLimit) {
        const batch = tasks.slice(i, i + concurrencyLimit);
        const batchResults = await Promise.all(batch.map(task => task()));
        results.push(...batchResults);
    }

    const endTime = Date.now();

    const totalTime = endTime - startTime;
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return {
        batchSize,
        totalTime,
        successCount,
        failureCount,
        qps: ((successCount / totalTime) * 1000).toFixed(2),
        avgResponseTime: results.filter(r => r.success).reduce((sum, r) => sum + r.responseTime, 0) / successCount || 0,
        results
    };
}

/**
 * 休眠函数
 * @param {number} ms 毫秒数
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe("DecodeElgamalAmount API 压力测试", function () {
    this.timeout(300000); // 5分钟超时
    
    let metadata;
    
    before(async function () {
        console.log("正在初始化测试环境...");

        metadata = await createAuthMetadata(adminPrivateKey);
        console.log("测试环境初始化完成");
    });

    it("基础功能测试 - 单次请求", async function () {
        console.log("\n=== 基础功能测试 ===");
        

        const result = await executeSingleDecodeRequest( metadata);
        
        console.log(`请求结果: ${result.success ? '成功' : '失败'}`);
        console.log(`响应时间: ${result.responseTime}ms`);
        
        if (result.success) {
            console.log(`解码结果: ${result.decodedBalance}`);
        } else {
            console.log(`错误信息: ${result.error}`);
        }
        
        expect(result).to.have.property('success');
        expect(result).to.have.property('responseTime');
    });

    it.only("持续压测", async function () {
        console.log("\n=== 持续压测  ===");

        const rounds = 100;
        const batchSize = 10000;
        const allResults = [];

        // 轮次间隔
        // const roundInterval = 10;
        const roundInterval = 1;

        for (let round = 1; round <= rounds; round++) {
            console.log(`\n--- 第 ${round} 轮 ---`);

            const batchResult = await executeBatchRequests(batchSize, metadata);
            allResults.push(batchResult);

            console.log(`第${round}轮 - 成功: ${batchResult.successCount}/${batchResult.batchSize}, QPS: ${batchResult.qps}, 平均响应时间: ${batchResult.avgResponseTime.toFixed(2)}ms`);

            // 缩短轮次间隔
            if (round < rounds) {
                console.log(`等待${roundInterval}ms后进行下一轮...`);
                await sleep(roundInterval);
            }
        }

        // 汇总统计
        const totalRequests = allResults.reduce((sum, r) => sum + r.batchSize, 0);
        const totalSuccess = allResults.reduce((sum, r) => sum + r.successCount, 0);
        const totalTime = allResults.reduce((sum, r) => sum + r.totalTime, 0);
        const avgQPS = allResults.reduce((sum, r) => sum + parseFloat(r.qps), 0) / allResults.length;
        const avgResponseTime = allResults.reduce((sum, r) => sum + r.avgResponseTime, 0) / allResults.length;

        console.log(`\n=== 持续压测汇总 ===`);
        console.log(`总请求数: ${totalRequests}`);
        console.log(`总成功数: ${totalSuccess}`);
        console.log(`总成功率: ${((totalSuccess / totalRequests) * 100).toFixed(2)}%`);
        console.log(`总耗时: ${totalTime}ms`);
        console.log(`平均QPS: ${avgQPS.toFixed(2)}`);
        console.log(`平均响应时间: ${avgResponseTime.toFixed(2)}ms`);

        expect(totalSuccess).to.be.greaterThan(0);
    });
    it("并行压测 - 多轮并发执行", async function () {
        console.log("\n=== 并行压测 (5轮并发执行) ===");

        const rounds = 5;
        const batchSize = 100;

        // 并发执行多轮测试
        const promises = [];
        for (let i = 0; i < rounds; i++) {
            promises.push(executeBatchRequests(batchSize, metadata));
        }

        const startTime = Date.now();
        const results = await Promise.all(promises);
        const endTime = Date.now();

        const totalRequests = results.reduce((sum, r) => sum + r.batchSize, 0);
        const totalSuccess = results.reduce((sum, r) => sum + r.successCount, 0);
        const totalTime = endTime - startTime;
        const avgQPS = ((totalSuccess / totalTime) * 1000).toFixed(2);

        console.log(`\n=== 并行压测汇总 ===`);
        console.log(`总请求数: ${totalRequests}`);
        console.log(`总成功数: ${totalSuccess}`);
        console.log(`总成功率: ${((totalSuccess / totalRequests) * 100).toFixed(2)}%`);
        console.log(`总耗时: ${totalTime}ms`);
        console.log(`平均QPS: ${avgQPS}`);

        results.forEach((result, index) => {
            console.log(`第${index+1}轮 - 成功: ${result.successCount}/${result.batchSize}, QPS: ${result.qps}`);
        });

        expect(totalSuccess).to.be.greaterThan(0);
    });
});