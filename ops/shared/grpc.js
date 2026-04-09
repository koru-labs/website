const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const path = require("path");

const PROTO_PATH = path.resolve(__dirname, "../../test/qa/token.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [path.dirname(PROTO_PATH)],
});

const descriptor = grpc.loadPackageDefinition(packageDefinition);
const TokenService = descriptor.tokenproof.v1.TokenService;
const AccountService = descriptor.tokenproof.v1.AccountService;

function promisifyByMetadata(fn, request, metadata) {
    return new Promise((resolve, reject) => {
        fn(request, metadata, (error, response) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(response);
        });
    });
}

function createOpsClient(url) {
    const tokenClient = new TokenService(url, grpc.credentials.createInsecure());
    const accountClient = new AccountService(url, grpc.credentials.createInsecure());

    return {
        registerAccount(request, metadata) {
            return promisifyByMetadata(accountClient.registerAccount.bind(accountClient), request, metadata);
        },
        encodeElgamalAmount(amount, metadata) {
            return promisifyByMetadata(
                tokenClient.EncodeElgamalAmount.bind(tokenClient),
                {amount},
                metadata,
            );
        },
    };
}

module.exports = {
    createOpsClient,
};
