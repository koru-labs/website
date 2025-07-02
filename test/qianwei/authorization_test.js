const assert = require('node:assert');
const {ethers} = require('ethers');
const grpc = require('@grpc/grpc-js');
const {createClient} = require('../qa/token_grpc');

// const rpcUrl = "localhost:50051";
const rpcUrl = "qa-node3-rpc.hamsa-ucl.com:50051";
const client = createClient(rpcUrl);

// admin
const privateKey = "555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787";
// normal
// const privateKey = "518eb784dd768d8c0cdf9218d44ae8f498d0cadf7ecf98f5ecf27c6b793986ca";//0x4568E35F2c4590Bde059be615015AaB6cc873004

// const address = "0x8c8af239FfB9A6e93AC4b434C71a135572A1021C";
// const address = "0x4312488937D47A007De24d48aB82940C809EEb2b";
const address = "0x4568E35F2c4590Bde059be615015AaB6cc873004";//test

async function createAuthMetadata(privateKey, messagePrefix = "login") {
    const wallet = new ethers.Wallet(privateKey);
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${messagePrefix}_${timestamp}`;
    const signature = await wallet.signMessage(message);

    const metadata = new grpc.Metadata();
    metadata.set('address', wallet.address.toLowerCase());
    metadata.set('signature', signature);
    metadata.set('message', message);

    return metadata;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testUpdateAccountStatus() {
    try {
        const metadata = await createAuthMetadata(privateKey);

        const request = {
            account_address: address,
            account_status: 0, //0:inactive,2:active
        };
        const response = await client.updateAccountStatus(request, metadata);
        console.log("Success:", response);
        if (response.status !== "ASYNC_ACTION_STATUS_FAIL") {
            await delay(10000);
            const actionRequest = {
                request_id: response.request_id,
            };
            const actionResponse = await client.getAsyncAction(actionRequest, metadata);
            console.log("action response:", actionResponse);
        }
    } catch (error) {
        console.error("gRPC call failed:", error);
    }
}

async function testRegisterAccount() {
    const metadata = await createAuthMetadata(privateKey);
    const request = {
        account_address: address,
        account_role: "minter",//minter,admin,normal
    };

    try {
        const response = await client.registerAccount(request, metadata);
        console.log("registerAccount response:", response);
        if (response.status !== "ASYNC_ACTION_STATUS_FAIL") {
            const actionRequest = {
                request_id: response.request_id,
            };
            await delay(10000);
            const actionResponse = await client.getAsyncAction(actionRequest, metadata);
            console.log("action response:", actionResponse);
        }
    } catch (error) {
        console.error("gRPC call failed:", error);
    }
}

async function testGetAsyncAction() {
    try {
        const metadata = await createAuthMetadata(privateKey);
        const request_id = "f4dd2d79d8c0357c4637ccdf099f7f82281b1e771b1287387ebffd9a709ee4fb"
        const actionRequest = {
            request_id: request_id,
        };
        const actionResponse = await client.getAsyncAction(actionRequest, metadata);
        console.log("action response:", actionResponse);
    } catch (error) {
        console.error("gRPC call failed:", error);
    }
}



async function testUpdateAccountRole() {
    try {
        const metadata = await createAuthMetadata(privateKey);
        const actionRequest = {
            account_address: address,
            account_role: "minter",//minter,admin,normal
        };
        const actionResponse = await client.updateAccountRole(actionRequest, metadata);
        console.log("action response:", actionResponse);
    } catch (error) {
        console.error("gRPC call failed:", error);
    }
}

async function testGetAccount() {
    try {
        const metadata = await createAuthMetadata(privateKey);
        const actionRequest = {
            account_address: address,
        };
        const actionResponse = await client.getAccount(actionRequest, metadata);
        console.log("action response:", actionResponse);
    } catch (error) {
        console.error("gRPC call failed:", error);
    }
}


testRegisterAccount().then();
// testGetAsyncAction().then();
// testUpdateAccountStatus().then();
// testUpdateAccountRole().then();
// testGetAccount().then();