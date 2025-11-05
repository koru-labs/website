const {ethers} = require("hardhat");
const axios = require("axios");
const grpc = require("@grpc/grpc-js");



const registrar_address = "0xF3B8Ee2b8273A62f697CA730d8aBAb120E6C70cc";
const token_address ="0x6883Dd89C54B0547022cbB058d8aC959AC0Fb089";

const instInfo={
    address: "0xF8041E1185C7106121952bA9914ff904A4A01c80",    //manager address
    name: "demo_bank",          // bank name
    rpcUrl: "ucl-nodebank-rpc.hamsa-ucl.com:50051",
    nodeUrl: "https://ucl-nodebank-proxy.hamsa-ucl.com:8443",
    httpUrl: "http://ucl-nodebank-http.hamsa-ucl.com:8080",

    publicKey: {
        x: "7230488632214515390939351614066831418110197551947786886664878007977472527345",
        y: "6166469736216213106615234239044638228325738100744854403655815252655385879271",
    },
    privateKey: "1487221860409677879583471694965119728642086935894812518137600209436052391173",
    ethPrivateKey:"1bf1fbfb91c484e78cb8adb55ff3fee99825b49af57ba0eb0b79f82b3ffb563f",

    users: [
        {
            "address":"0xD486bd3B1Bb9d1980C5b624b5491325bF9628B43",
            "privateKey":"e0baa6238c61addf4e4b05ea2c8ad50565a38ca0589505228b35806a33df5d5b",
            "role":"normal"
        },
        {
            "address":"0xf48dEaec45131706F32C96083c38a43aFFC89a4a",
            "privateKey":"0d4e1fc283ef9bbf3d4cf3456ed20b079a4e0939c9fa4850676d62901bf94371",
            "role":"normal"
        },
        {
            "address":"0x93d2Ce0461C2612F847e074434d9951c32e44327",
            "privateKey":"81690fb141b4ae5682ad1fd73b29ae1bcc67891e93de73c6f636402deac21171",
            "role":"normal"
        },
        {
            "address":"0x5a3288A7400B2cd5e0568728E8216D9392094892",
            "privateKey":"360b3f569579a0e824fab18c21d6e583b060e2339142c6833c899029fc8e428d",
            "role":"normal"
        }
    ]
}

async function registerNewBank() {
    const institutionUserRegistry = await ethers.getContractAt("InstitutionUserRegistry", registrar_address);

    let regTx = await institutionUserRegistry.registerInstitution(
        instInfo.address, instInfo.name, instInfo.publicKey, instInfo.rpcUrl, instInfo.nodeUrl, instInfo.httpUrl);
    await regTx.wait();

    let resultInfo = await institutionUserRegistry.getInstitution(instInfo.address);
    console.log("registered instInfo on-chain:", resultInfo);
}

async function updateBank() {
    const institutionUserRegistry = await ethers.getContractAt("InstitutionUserRegistry", registrar_address);

    let regTx = await institutionUserRegistry.updateInstitution(
        instInfo.address, instInfo.name, instInfo.rpcUrl, instInfo.nodeUrl, instInfo.httpUrl);
    await regTx.wait();

    let resultInfo = await institutionUserRegistry.getInstitution(instInfo.address);
    console.log("registered instInfo on-chain:", resultInfo);
}

async function registerBankUsers(){
    let auth=await  createAuth()
    for(let u of instInfo.users) {
        await registerUser(instInfo.nodeUrl, auth, u.address, u.role);
    }
}


async function  createAuth() {
    const wallet = new ethers.Wallet(instInfo.ethPrivateKey);
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `login_${timestamp}`;
    const signature = await wallet.signMessage(message);

    const auth= {
        'address': wallet.address.toLowerCase(),
        'Grpc-Metadata-Signature': signature,
        'Grpc-Metadata-Message': message
    }
    return auth
}

async function registerUser(nodeUrl, auth, userAddress, role) {
    const payload ={
        "account_address": userAddress,
        "account_roles": role
    }
    let headers= { "Content-Type": "application/json", ... auth }
    const response = await axios.post(instInfo.httpUrl+"/v1/account/register", payload, {
        headers: headers,
    });
    console.log("register user response:", response.data);
}


async function enableBankInTokenSmartContract() {
    // NOTE: Changed to blacklist mode - banks are allowed by default
    // This function is no longer needed unless you want to unblock a previously blocked bank
    console.log("Bank is allowed by default (blacklist mode). No action needed.");

    // To unblock a previously blocked bank (uncomment if needed):
    // let [deployer, node3Owner] = await ethers.getSigners();
    // const privateUSDC = await ethers.getContractAt("PrivateUSDC", token_address, node3Owner);
    // let tx = await privateUSDC.updateBlockedBank(instInfo.address, false);
    // let r = await tx.wait();
    // console.log("receipt: ", r)
}


//set minter allowed
async function makeBankAdminMinter() {
    let [masterMinter] = await ethers.getSigners();
    const privateUSDC = await ethers.getContractAt("PrivateUSDC", token_address, masterMinter);


    let auth = await createAuth()
    let amount = 100000000
    let headers= { "Content-Type": "application/json", ... auth }

    let response = await axios.post(instInfo.httpUrl+"/v1/elgamal/encode", {
        amount: amount
    }, {
        headers: headers,
    });
    response = response.data


    const tokenId = ethers.toBigInt(response.tokenId);
    const clx = ethers.toBigInt(response.amount.clX);
    const cly = ethers.toBigInt(response.amount.clY);
    const crx = ethers.toBigInt(response.amount.crX);
    const cry = ethers.toBigInt(response.amount.crY);
    const minterAllowedAmount = {
        "id": tokenId,
        "cl_x": clx,
        "cl_y": cly,
        "cr_x": crx,
        "cr_y": cry,
    }
    let tx = await privateUSDC.configurePrivacyMinter(instInfo.address, minterAllowedAmount);
    let r = await tx.wait();
    console.log("receipt: ", r)

    tx = await privateUSDC.configureMinter(instInfo.address, amount);
    r = await tx.wait();
    console.log("receipt: ", r)
}

async function checkSeededBankInfo() {
    const institutionUserRegistry = await ethers.getContractAt("InstitutionUserRegistry", registrar_address);
    let instInfo = await institutionUserRegistry.getInstitution("0xf17f52151EbEF6C7334FAD080c5704D77216b732");
    console.log("Seeded instInfo:", instInfo);

}

async function getLastBlock() {
    const block = await ethers.provider.getBlock("latest");
    console.log("latest block:", block.number, "hash:", block.hash, "timestamp:", block.timestamp,);
}

async function verifyCode(){
    let code = await ethers.provider.getCode(token_address);
    console.log("code:", code);
}

async function verifyEthAddress(){
    const wallet = new ethers.Wallet(instInfo.ethPrivateKey);

    // Get the Ethereum address
    console.log("Address:", wallet.address);
}

async function getOwner() {
    const privateUSDC = await ethers.getContractAt("PrivateUSDC", token_address);
    let owner = await privateUSDC.owner();
    console.log("owner:", owner);
}

async  function checkUserInst() {
    const institutionUserRegistry = await ethers.getContractAt("InstitutionUserRegistry", registrar_address);
    let admin = await institutionUserRegistry.getUserManager("0xD486bd3B1Bb9d1980C5b624b5491325bF9628B43");
    let inst = await institutionUserRegistry.getInstitution(admin);
    console.log("user inst:", inst);
}

async function deployDummy(){
    const Dummy = await ethers.getContractFactory("DummyToken");
    const dummy = await Dummy.deploy();
    await dummy.waitForDeployment();

    console.log("dummy is deployed at:", await dummy.getAddress());
}

deployDummy().then();
// getLastBlock().then();
// verifyCode().then();
// checkSeededBankInfo().then();
// verifyEthAddress().then();

// registerNewBank().then()
// updateBank().then();
// registerBankUsers().then();
// getOwner().then();
// enableBankInTokenSmartContract().then()
// makeBankAdminMinter().then()

// checkUserInst().then();