const {ethers} = require("hardhat");
const deployed = require("../../deployments/image9.json");
const {institutions} = require("../circle/configuration");
const {createClient} = require("../../test/qa/token_grpc");
const {createAuthMetadata} = require("../../test/help/testHelp");

const registrar_address = "0x0000000000000000000000000000000000000000";

async function registerNewBankAndUsers() {
    const institutionUserRegistry = await ethers.getContractAt("InstitutionUserRegistry", registrar_address);
    let instInfo={
        address: "0x0000000000000000000000000000000000000000",  //manager address
        name: "demo_bank",          // bank name
        publicKey:"",     // public key
        nodeUrl:"",       // rpc url
        httpUrl:"",        // proxy url
        users: [
            {
                "address":"0x000",
                "role":"user"
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

async function registerUser(nodeUrl, auth, userAddress, role) {
    //we must use rest api to register user
}