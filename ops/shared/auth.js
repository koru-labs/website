const grpc = require("@grpc/grpc-js");
const {ethers} = require("hardhat");

async function createAuthMetadata(privateKey, messagePrefix = "login") {
    const wallet = new ethers.Wallet(privateKey);
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${messagePrefix}_${timestamp}`;
    const signature = await wallet.signMessage(message);
    const metadata = new grpc.Metadata();

    metadata.set("address", wallet.address.toLowerCase());
    metadata.set("signature", signature);
    metadata.set("message", message);

    return metadata;
}

module.exports = {
    createAuthMetadata,
};
