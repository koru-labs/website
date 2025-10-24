const assert = require('node:assert');
const {ethers} = require('ethers');
const grpc = require('@grpc/grpc-js');
const {createClient} = require('../qa/token_grpc');
const axios = require('axios');
const { getEnvironmentConfig } = require('../../script/deploy_help.js');
const config = getEnvironmentConfig();
const rpcUrl = "localhost:50051";
// const rpcUrl = "qa-node3-rpc.hamsa-ucl.com:50051";
// find node3 institution
// const node3Institution = config.institutions.find(institution => institution.name === "Node3");
// if (!node3Institution) {
//     throw new Error("Node3 institution not found in config");
// }
// const rpcUrl = node3Institution.rpcUrl;
// const httpUrl = "http://localhost:8080";
// const httpUrl = "http://qa-node3-http.hamsa-ucl.com:8080";

const client = createClient(rpcUrl);

const request_id = "203811416ade1a647f6dae34470de12fb1f8cee706d2d3a9bf717081b6e432a1"

// admin
// const privateKey = "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f"; //N0DE3
const privateKey = "5c231ce8344bac49d30d2c13db074ee7757c574caabfcb8349074b5486c08c7e"; //demobank
// const privateKey = "81690fb141b4ae5682ad1fd73b29ae1bcc67891e93de73c6f636402deac21171"; //NODE4
// owner 0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB
// const privateKey = "555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787";

// normal
// const privateKey = "518eb784dd768d8c0cdf9218d44ae8f498d0cadf7ecf98f5ecf27c6b793986ca";//0x4568E35F2c4590Bde059be615015AaB6cc873004

// const address = "0x8c8af239FfB9A6e93AC4b434C71a135572A1021C";
// const address = "0x4312488937D47A007De24d48aB82940C809EEb2b";
// const address = "0x1a245eF2f03911Bf782FBdEAe379113ff068A311";//test
// const address = "0x983b4ba7e42e664ddbfe4ed3e0ea07d90efcc13b";//test
const address = "0x4312488937D47A007De24d48aB82940C809EEb2b";//test

async function createAuthMetadata(privateKey, messagePrefix = "login") {
    const wallet = new ethers.Wallet(privateKey);
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${messagePrefix}_${timestamp}`;
    const signature = await wallet.signMessage(message);

    const metadata = new grpc.Metadata();
    // metadata.set('address', wallet.address.toLowerCase());
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
            account_status: 2, //0:inactive,2:active
        };
        const response = await client.updateAccountStatus(request, metadata);
        console.log("Success:", response);
        await delay(10000);
        const actionRequest = {
            request_id: response.request_id,
        };
        const actionResponse = await client.getAsyncAction(actionRequest, metadata);
        console.log("action response:", actionResponse);
    } catch (error) {
        console.error("gRPC call failed:", error);
    }
}

async function testRegisterAccount() {
    const metadata = await createAuthMetadata(privateKey);
    const request = {
        account_address: address,
        account_roles: "normal",//minter,admin,normal
    };

    try {
        const response = await client.registerAccount(request, metadata);
        console.log("registerAccount response:", response);
        if (response.request_id) {
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
            account_roles: "normal",//minter,admin,normal
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


async function createAuthHeaders(privateKey, messagePrefix = "login") {
    const wallet = new ethers.Wallet(privateKey);
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${messagePrefix}_${timestamp}`;
    const signature = await wallet.signMessage(message);

    return {
        'Content-Type': 'application/json',
        'Grpc-Metadata-Address': wallet.address.toLowerCase(),
        'Grpc-Metadata-Signature': signature,
        'Grpc-Metadata-Message': message
    };
}

async function testGetAccountForHttp() {
    try {
        const headers = await createAuthHeaders(privateKey);
        // console.log('Request headers:', headers);
        const response = await axios.post(`${httpUrl}/v1/account/query`, {
            account_address: address
        }, {
            headers: headers,
            timeout: 15000
        });

        console.log("HTTP response:", response.data);
        return response.data;
    } catch (error) {
        console.error("HTTP call failed:", error.response?.data || error.message);
        throw error;
    }
}


// testRegisterAccount().then();
testGetAsyncAction().then();
// testUpdateAccountStatus().then();
// testUpdateAccountRole().then();
// testGetAccount().then();
// testGetAccountForHttp().then();