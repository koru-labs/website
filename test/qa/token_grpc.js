const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, './token.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const TokenService = protoDescriptor.tokenproof.v1.TokenService;

// Token action status enum
const TokenActionStatusEnum = {
    TOKEN_ACTION_STATUS_PENDING: 0,
    TOKEN_ACTION_STATUS_PROVE_SUC: 1,
    TOKEN_ACTION_STATUS_SUC: 2,
    TOKEN_ACTION_STATUS_CALL_L1: 3,
    TOKEN_ACTION_STATUS_FAIL: 4,
    TOKEN_ACTION_STATUS_PENDING_PROOF: 5,
    TOKEN_ACTION_STATUS_CALL_L1_SUC: 6
};

function createClient(url) {
    const client = new TokenService(url, grpc.credentials.createInsecure());


    // Proof generation methods
    client.generateMintProof = async function(request) {
        return promisify(client.GenerateMintProof.bind(client), request);
    };

    // Proof retrieval methods
    client.getMintProof = async function(requestId) {
        const request = { requestId };
        return promisify(client.GetMintProof.bind(client), request);
    };

    // Status checking and polling methods
    client.getActionStatus = async function(requestId) {
        const request = { requestId };
        return promisify(client.GetActionStatus.bind(client), request);
    };

    client.getAccountBalance = async function(scAddress, ownerAddress, balance) {
        const request = {
            sc_address: scAddress,
            owner_address: ownerAddress
        };
        console.log("request", request);
        return promisify(client.GetAddressBalance.bind(client), request);
    };

    client.decodeElgamalAmount = async function(ownerAddress, balance) {
        const request = {
            balance: balance,
            owner_address: ownerAddress
        };
        console.log("request", request);
        return promisify(client.DecodeElgamalAmount.bind(client), request);
    };

    client.getAddressAllowance  = async function(ownerAddress, spenderAddress,scAddress) {
        const request = {
            owner_address: ownerAddress,
            spender_address: spenderAddress,
            sc_address: scAddress
        };
        return promisify(client.GetAddressAllowance.bind(client), request);
    };

    client.generateSplitToken = async function(request) {
        return promisify(client.GenerateSplitToken.bind(client), request);
    };

    client.getSplitToken = async function(requestId) {
        const request = { requestId };
        return promisify(client.GetSplitToken.bind(client), request);
    };

    client.waitForProofCompletion = async function(callBack, requestId, interval = 4000) {
        return new Promise(async (resolve, reject) => {
            while (true) {
                try {
                    const result = await callBack(requestId);

                    if (result.proof !== "") {
                        resolve(result)
                        return
                    } else {
                        console.log("wait for proof. status = ", result.status)
                    }

                    await sleep(interval);
                } catch (error) {
                    console.error("Failed to query request status", error);
                    reject(error);
                    return;
                }
            }
        });
    };

    client.waitForActionCompletion = async function(callBack, requestId, interval = 4000) {
        return new Promise(async (resolve, reject) => {
            while (true) {
                try {
                    const result = await callBack(requestId);

                    if (result.status == "TOKEN_ACTION_STATUS_SUC") {
                        resolve(result)
                        return
                    } else if (result.status=="TOKEN_ACTION_STATUS_FAIL") {
                        reject(result);
                        return
                    } else {
                        console.log("wait for proof. status = ", result.status)
                    }
                    await sleep(interval);
                } catch (error) {
                    console.error("Failed to query request status", error);
                    reject(error);
                    return;
                }
            }
        });
    };

    return client;
}

function promisify(grpcMethod, request) {
    return new Promise((resolve, reject) => {
        grpcMethod(request, (err, response) => {
            if (err) {
                console.error("GRPC Error:", err);
                reject(err);
            } else {
                resolve(response);
            }
        });
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


module.exports = {
    createClient,
    TokenActionStatusEnum,
};