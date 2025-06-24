const assert = require('node:assert');
const { ethers } = require('ethers');
const grpc = require('@grpc/grpc-js');
const { createClient } = require('../qa/token_grpc');

const rpcUrl = "localhost:50051";
const client = createClient(rpcUrl);


async function testRegisterAccount() {
    const privateKey = "0x555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787";
    const wallet = new ethers.Wallet(privateKey);

    // 生成正确的签名数据
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `login_${timestamp}`;
    const signature = await wallet.signMessage(message);

    // 创建元数据
    const metadata = new grpc.Metadata();
    metadata.set('address', wallet.address.toLowerCase());
    metadata.set('signature', signature);
    metadata.set('message', message);

    const request = {
        address: wallet.address,
        role: 2
    };

    try {
        const response = await client.registerAccount(request, metadata);
        console.log("registerAccount response:", response);

        // 查询操作状态
        const actionRequest = {
            request_id: response.request_id,
        };

        const actionResponse = await client.getAccountAction(actionRequest, metadata);
        console.log("action response:", actionResponse);
    } catch (error) {
        console.error("gRPC call failed:", error);
    }
}

testRegisterAccount().then();