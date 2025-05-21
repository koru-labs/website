
const hre = require("hardhat");
const { ethers } = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const {createClient} = require('../qa/token_grpc')

const amount1 =   {
    "cl_x": ethers.toBigInt("0x0d029eb41b5625e223245a725edc6e5423f6f5e724d2fe4d032c9236417e3669"),
    "cl_y": ethers.toBigInt("0x2c82bb1c78c69d653b7a69036c51fa519410cae862406409b2d04d21d90c2775"),
    "cr_x": ethers.toBigInt("0x265836014f928100c4b529a96e88fb90e04dd5dce9bab6cc943acbb41d0439a0"),
    "cr_y": ethers.toBigInt("0x127652b20a9c8eb19634fd64c1f75f9d18ffbece57c71e14879ed66d9f4b6d3d"),
}

const amount2 =   {
    "cl_x": ethers.toBigInt("0x17118a9fa7718e08b6df8b152df1d466efdb462db3527bec11ce0b99e313a03e"),
    "cl_y": ethers.toBigInt("0x2551993d77f3a77cb033b52165cfc83ab3600b460b605caf2cd59ffe21431cc7"),
    "cr_x": ethers.toBigInt("0x1cd89d45c98f78c5c2cb3a66ba1a5c047b15faac6130c75585dfe03adeab7fce"),
    "cr_y": ethers.toBigInt("0x2639e268d5bb43de0f07fa7fb809591d7edad099267118970eece9c70b73358e"),
}
const rpcUrl ='aa4db6db10866450fb6685fb175e72f9-423262944.us-west-1.elb.amazonaws.com:50051'
const client = createClient(rpcUrl)

async function getTokens(accountAddress){
    const [deployer, singer, depositor] = await ethers.getSigners()
    const tokenContract1 = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken);
    const tokenContract2 = await ethers.getContractAt("PrivateERCToken", config.contracts.PrivateERCToken2);

    const result1 = await child.getAccountToken(accountAddress,amount1);
    const result2 = await child.getAccountToken(accountAddress,amount2);
    return  [result1,result2];
}



async function mintToken(contract,accountAddress,amount){
    const generateRequest = {
        sc_address: contract,
        token_type: '0',
        to_address:accountAddress,
        amount: amount
    };
    let result = await client.generateMintProof(generateRequest);
    console.log("Generate Mint Proof Result:", result);
    const requestId = result.request_id;

    result = await client.getMintProof(requestId)
    console.log("Mint Proof Result:", result);
    while (result.proof){
        // calculate proofData
        const [deployer,singer,depositor] = await ethers.getSigners()
        const contract = await hre.ethers.getContractAt("PrivateERCToken","0xD339B3F9d821d8f72e54fF0775A9558B207E4f2E")
        const proofData = {
            request_id: requestId,
            proof: result.proof,
            token_type: 0,
            amount: amount,
            to_address: accountAddress,
            sc_address: contract,
            from_address: "0x0000000000000000000000000000000000000000",
            nonce: 0,
            signature: "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        }
        result = await child.privateMint('0xe46fe251dd1d9ffc247bc0ddb6d61e4ee4416ecb',amount1,amount2,proofData);
        console.log("Result:", result);

    }





}

// generateTokenProof(config.contracts.PrivateERCToken,"0xACFa9A52a0F11E8a1E7DaE8789DD43C58476E5BC",100).then()
// getMintTokenProof("e3eecdf7524771463048ad253bbf912d51233617bbba750981f9d1c51801f3a1").then()
mintToken(config.contracts.PrivateERCToken,"0xACFa9A52a0F11E8a1E7DaE8789DD43C58476E5BC",100).then()