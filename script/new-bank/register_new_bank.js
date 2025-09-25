const {ethers} = require("hardhat");
const deployed = require("../../deployments/image9.json");
const {institutions} = require("../circle/configuration");
const {createClient} = require("../../test/qa/token_grpc");
const {createAuthMetadata} = require("../../test/help/testHelp");

const registrar_address = "0x0000000000000000000000000000000000000000";
const token_address ="0x0000";

async function registerNewBankAndUsers() {
    const institutionUserRegistry = await ethers.getContractAt("InstitutionUserRegistry", registrar_address);
    let instInfo={
        address: "0xF8041E1185C7106121952bA9914ff904A4A01c80",  //manager address
        name: "demo_bank",          // bank name
        publicKey: "1421780564511859285720349193299491592886736156607994176748849443213281645090",     // public key
        nodeUrl:"",        // rpc url
        httpUrl:"",        // proxy url
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
    let regTx = await institutionUserRegistry.registerInstitution(
        instInfo.address, instInfo.name, instInfo.publicKey, instInfo.nodeUrl, instInfo.httpUrl);
    await regTx.wait();
    let auth=""
    for(let u in instInfo.users) {
        await registerUser(instInfo.nodeUrl, auth, u.address, u.role);
    }
    console.log("registerNewBankAndUsers is done")
}


async function enableBankInTokenSmartContract() {

}


//set minter allowed
async function makeBankAdminMinter() {

}

async function registerUser(nodeUrl, auth, userAddress, role) {
    //we must use rest api to register user
}