const assert = require('node:assert');
const {ethers} = require('ethers');
const grpc = require('@grpc/grpc-js');
const {createClient} = require('../qa/token_grpc');

const rpcUrl = "localhost:50051";
const client = createClient(rpcUrl);

// admin
const privateKey = "555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787";
// normal
// const privateKey = "2b42ed39b2d9c3d576320af626b90a62ce726ee0f25764061947891415dbe782";

// const address = "0x8c8af239FfB9A6e93AC4b434C71a135572A1021C";
// const address = "0x4312488937D47A007De24d48aB82940C809EEb2b";
const address = "0x4312488937D47A007De24d48aB82940C809EEb2b";//test

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

async function testUpdateAccountStatus() {
    try {
        const metadata = await createAuthMetadata(privateKey);

        const request = {
            account_address: address,
            account_status: 2,
        };
        const response = await client.updateAccountStatus(request, metadata);
        console.log("Success:", response);
        if (response.status !== "ASYNC_ACTION_STATUS_FAIL") {
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
        account_role: "minter"
    };

    try {
        const response = await client.registerAccount(request, metadata);
        console.log("registerAccount response:", response);
        if (response.status !== "ASYNC_ACTION_STATUS_FAIL") {
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

async function testGetAsyncAction() {
    try {
        const metadata = await createAuthMetadata(privateKey);
        const request_id = "a5aa75f0c6c66c7ed35d82025685fe380652f4c1e9f5e81113cf36cf6cb22fbc"
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
            account_role: "minter",
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


// testRegisterAccount().then();
// testGetAsyncAction().then();
// testUpdateAccountStatus().then();
// testUpdateAccountRole().then();
testGetAccount().then();