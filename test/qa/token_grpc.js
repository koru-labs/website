const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const PROTO_PATH = path.join(__dirname, './token_bak.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});


const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);

const TokenService = protoDescriptor.tokenproof.v1.TokenService;
const AccountService = protoDescriptor.tokenproof.v1.AccountService;

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
    const accountClient = new AccountService(url, grpc.credentials.createInsecure());


    // Proof generation methods
    client.generateMintProof = async function (request) {
        return promisify(client.GenerateMintProof.bind(client), request);
    };

    client.getMintProof = async function (requestId) {
        const request = {requestId};
        return promisify(client.GetMintProof.bind(client), request);
    };

    client.generateDirectMint = async function (request) {
        return promisify(client.GenerateDirectMint.bind(client), request);
    };

    client.generateDirectTransfer = async function (request) {
        return promisify(client.GenerateDirectTransfer.bind(client), request);
    };

    client.generateDirectBurn = async function (request) {
        return promisify(client.GenerateDirectBurn.bind(client), request);
    };

    client.getTokenActionStatus = async function (requestId) {
        const request = {requestId};
        return promisify(client.GetTokenActionStatus.bind(client), request);
    };

    // Status checking and polling methods
    client.getActionStatus = async function (requestId) {
        const request = {requestId};
        return promisify(client.GetActionStatus.bind(client), request);
    };

    client.getAccountBalance = async function (scAddress, ownerAddress, balance) {
        const request = {
            sc_address: scAddress,
            owner_address: ownerAddress
        };
        return promisify(client.GetAddressBalance.bind(client), request);
    };

    client.decodeElgamalAmount = async function (balance) {
        const request = {
            balance: balance,
        };
        return promisify(client.DecodeElgamalAmount.bind(client), request);
    };

    client.encodeElgamalAmount = async function (balance) {
        const request = {
            amount: balance,
        };
        return promisify(client.EncodeElgamalAmount.bind(client), request);
    };

    client.getAddressAllowance = async function (ownerAddress, spenderAddress, scAddress) {
        const request = {
            owner_address: ownerAddress,
            spender_address: spenderAddress,
            sc_address: scAddress
        };
        return promisify(client.GetAddressAllowance.bind(client), request);
    };

    client.generateSplitToken = async function (request) {
        return promisify(client.GenerateSplitToken.bind(client), request);
    };

    client.getSplitToken = async function (requestId) {
        const request = {requestId};
        return promisify(client.GetSplitToken.bind(client), request);
    };

    client.getMintAllowed = async function (request) {
        return promisify(accountClient.GetMintAllowed.bind(client), request);
    };

    client.getSplitTokenList = async function (owner_address, sc_address) {
        const request = {
            owner_address: owner_address,
            sc_address: sc_address,
        };
        return promisify(client.GetSplitTokenList.bind(client), request);
    };

    client.getSplitTokenDetail = async function (token_id) {
        const request = {
            token_id: token_id,
        };
        return promisify(client.GetSplitTokenDetail.bind(client), request);
    };

    client.registerAccount = async function (request, metadata) {
        return promisifyByMetadata(accountClient.registerAccount.bind(accountClient), request, metadata);
    };

    client.updateAccountStatus = function (request, metadata) {
        return promisifyByMetadata(accountClient.updateAccountStatus.bind(accountClient), request, metadata);
    };


    client.updateAccountRole = async function (request, metadata) {
        return promisifyByMetadata(accountClient.updateAccountRole.bind(accountClient), request, metadata);
    };

    client.getAsyncAction = async function (request, metadata) {
        return promisifyByMetadata(accountClient.getAsyncAction.bind(accountClient), request, metadata);
    };

    client.getAccount = async function (request, metadata) {
        return promisifyByMetadata(accountClient.getAccount.bind(accountClient), request, metadata);
    };


    client.waitForProofCompletion = async function (callBack, requestId, interval = 4000) {
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

    client.waitForActionCompletion = async function (callBack, requestId, interval = 1000) {
        return new Promise(async (resolve, reject) => {
            while (true) {
                try {
                    const result = await callBack(requestId);

                    if (result.status == "TOKEN_ACTION_STATUS_SUC") {
                        resolve(result)
                        return
                    } else if (result.status == "TOKEN_ACTION_STATUS_FAIL") {
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

function createMetadataInterceptor(metadata) {
    return (options, nextCall) => {
        return new grpc.InterceptingCall(nextCall(options), {
            start: (metadataList, listener, next) => {
                if (metadata) {
                    for (const [key, value] of Object.entries(metadata.getMap())) {
                        metadataList.add(key, value);
                    }
                }
                next(metadataList, listener);
            }
        });
    };
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

function promisifyByMetadata(grpcMethod, request, metadata) {
    return new Promise((resolve, reject) => {
        grpcMethod(request, metadata, (err, response) => {
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