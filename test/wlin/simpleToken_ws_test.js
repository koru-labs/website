const { ethers } = require("hardhat");
const { WebSocketProvider } = require("ethers");
const WebSocket = require("ws");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

class InsecureWebSocket extends WebSocket {
    constructor(url, protocols, options) {
        super(url, protocols, {
            ...options,
            rejectUnauthorized: false,
        });
    }
}

const provider = new WebSocketProvider("wss://localhost:8545/ws", undefined, {
    WebSocket: InsecureWebSocket,
});
// Use your private key directly since we can't use hardhat's getSigners() with custom provider
const signer = new ethers.Wallet("555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787", provider);

async function printNetwork() {
    const net = await provider.getNetwork();
    console.log("Chain ID:", net.chainId);
}

async function deploySimpleToken() {
    const CurveBabyJubJub = await ethers.getContractFactory("CurveBabyJubJub", signer);
    const curveBabyJubJub = await CurveBabyJubJub.deploy();
    await curveBabyJubJub.waitForDeployment();
    console.log("CurveBabyJubJub is deployed at :", curveBabyJubJub.target);

    const CurveBabyJubJubHelper = await ethers.getContractFactory("CurveBabyJubJubHelper", {
        signer,
        libraries: {
            CurveBabyJubJub: curveBabyJubJub.target,
        },
    });
    const curveBabyJubJubHelper = await CurveBabyJubJubHelper.deploy();
    await curveBabyJubJubHelper.waitForDeployment();
    console.log("CurveBabyJubJubHelper is deployed at :", curveBabyJubJubHelper.target);

    const SimpleToken = await ethers.getContractFactory("SimpleToken", {
        signer,
        libraries: {
            CurveBabyJubJubHelper: curveBabyJubJubHelper.target,
        },
    });
    const simpleToken = await SimpleToken.deploy("simple", "$S");
    await simpleToken.waitForDeployment();
    console.log("SimpleToken is deployed at: ", simpleToken.target);
}

deploySimpleToken().then();