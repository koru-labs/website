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

    client.generateDirectTransfer = async function(request) {
        return promisify(client.GenerateDirectTransfer.bind(client), request);
    };


    client.generateTransferProof = async function(request) {
        return promisify(client.GenerateTransferProof.bind(client), request);
    };

    client.generateApproveProof = async function(request) {
        return promisify(client.GenerateApproveProof.bind(client), request);
    };

    client.generateTransferFromProof = async function(request) {
        return promisify(client.GenerateTransferFromProof.bind(client), request);
    };

    client.generateBurnProof = async function(request) {
        return promisify(client.GenerateBurnProof.bind(client), request);
    };

    // Proof retrieval methods
    client.getMintProof = async function(requestId) {
        const request = { requestId };
        return promisify(client.GetMintProof.bind(client), request);
    };

    client.getTransferProof = async function(requestId) {
        const request = { requestId };
        return promisify(client.GetTransferProof.bind(client), request);
    };

    client.getApproveProof = async function(requestId) {
        const request = { requestId };
        return promisify(client.GetApproveProof.bind(client), request);
    };

    client.getTransferFromProof = async function(requestId) {
        const request = { requestId };
        return promisify(client.GetTransferFromProof.bind(client), request);
    };

    client.getBurnProof = async function(requestId) {
        const request = { requestId };
        return promisify(client.GetBurnProof.bind(client), request);
    };

    // Status checking and polling methods
    client.getActionStatus = async function(requestId) {
        const request = { requestId };
        return promisify(client.GetActionStatus.bind(client), request);
    };

    client.getAccountBalance = async function(scAddress, ownerAddress, balance) {
        const request = {
            sc_address: scAddress,
            owner_address: ownerAddress,
            balance
        };
        console.log("request", request);
        return promisify(client.GetAddressBalance.bind(client), request);
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

                    } else if (result.status=="TOKEN_ACTION_STATUS_FAIL") {
                        reject(result);

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

// Export all individual methods for direct usage
async function generateMintProof(client, request) {
    return client.generateMintProof(request);
}

async function generateTransferProof(client, request) {
    return client.generateTransferProof(request);
}

async function generateDirectTransfer(client, request) {
    return client.generateDirectTransfer(request);
}

async function generateApproveProof(client, request) {
    return client.generateApproveProof(request);
}

async function generateTransferFromProof(client, request) {
    return client.generateTransferFromProof(request);
}

async function generateBurnProof(client, request) {
    return client.generateBurnProof(request);
}

async function getMintProof(client, requestId) {
    return client.getMintProof(requestId);
}

async function getTransferProof(client, requestId) {
    return client.getTransferProof(requestId);
}

async function getApproveProof(client, requestId) {
    return client.getApproveProof(requestId);
}

async function getTransferFromProof(client, requestId) {
    return client.getTransferFromProof(requestId);
}

async function getBurnProof(client, requestId) {
    return client.getBurnProof(requestId);
}


module.exports = {
    createClient,
    TokenActionStatusEnum,
    generateMintProof,
    generateTransferProof,
    generateApproveProof,
    generateTransferFromProof,
    generateBurnProof,
    getMintProof,
    getTransferProof,
    getApproveProof,
    getTransferFromProof,
    getBurnProof
};