
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
// const rpcUrl ='aa4db6db10866450fb6685fb175e72f9-423262944.us-west-1.elb.amazonaws.com:50051'
const rpcUrl ='localhost:50051'
const client = createClient(rpcUrl)

// const scAddress = '0xE574B589f5E80C3d1e6b72e866E2f1Df5C6F1836'


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

async function getMintTokenAndCallL1(requestId){
    let result = await client.getMintProof(requestId)
    // console.log("Mint Proof Result:", result);
    const [deployer,singer,depositor] = await ethers.getSigners()
    const contract = await hre.ethers.getContractAt("PrivateERCToken",scAddress)
    const amount = {
        cl_x: ethers.toBigInt(result.amount.cl_x),
        cl_y: ethers.toBigInt(result.amount.cl_y),
        cr_x: ethers.toBigInt(result.amount.cr_x),
        cr_y: ethers.toBigInt(result.amount.cr_y)
    };
    const supplyAmount = {
        cl_x: ethers.toBigInt(result.supply_amount.cl_x),
        cl_y: ethers.toBigInt(result.supply_amount.cl_y),
        cr_x: ethers.toBigInt(result.supply_amount.cr_x),
        cr_y: ethers.toBigInt(result.supply_amount.cr_y)
    };
    const proofData = Buffer.from(result.proof, "hex");
    const mintResult = await contract.privateMint(result.to_address,amount,supplyAmount,proofData);
    await mintResult.wait();
    console.log("Result:", mintResult);

    const token1 = await contract.getAccountToken(result.to_address, amount);
    console.log(`Result for requestId ${requestId}:`, token1);
}

async function getTransferTokenAndCallL1(requestId){
    let result = await client.getTransferProof(requestId)
    const [deployer,singer,depositor] = await ethers.getSigners()
    const contract = await hre.ethers.getContractAt("PrivateERCToken",scAddress)

    const consumedTokens = convertParentTokenIds(result.parentTokenId);
    const transferAmount = {
        "cl_x": ethers.toBigInt(result.amount.cl_x),
        "cl_y": ethers.toBigInt(result.amount.cl_y),
        "cr_x": ethers.toBigInt(result.amount.cr_x),
        "cr_y": ethers.toBigInt(result.amount.cr_y)
    }
    const remainingAmount = {
        "cl_x": ethers.toBigInt(result.new_balance.cl_x),
        "cl_y": ethers.toBigInt(result.new_balance.cl_y),
        "cr_x": ethers.toBigInt(result.new_balance.cr_x),
        "cr_y": ethers.toBigInt(result.new_balance.cr_y)
    }
    const proofData = Buffer.from(result.proof, "hex");

    const result1 = await contract.privateTransfer(consumedTokens,result.to_address,transferAmount,remainingAmount,proofData);
    console.log("Result:", result1);
    await result1.wait();
    const token1 = await contract.getAccountToken(result.to_address, transferAmount);
    console.log(`Result for requestId ${requestId}:`, token1);
    const token2 = await contract.getAccountToken(result.from_address, remainingAmount);
    console.log(`Result for requestId ${requestId}:`, token2);
}


async function getAppriveTokenAndCallL1(requestId){
    let result = await client.getApproveProof(requestId)
    console.log("Approve Proof Result:", result);
    const [deployer,singer,depositor] = await ethers.getSigners()
    const contract = await hre.ethers.getContractAt("PrivateERCToken",scAddress)

    const consumedTokens = convertParentTokenIds(result.parentTokenId);
    const transferAmount = {
        "cl_x": ethers.toBigInt(result.allowance.cl_x),
        "cl_y": ethers.toBigInt(result.allowance.cl_y),
        "cr1_x": ethers.toBigInt(result.allowance.cr1_x),
        "cr1_y": ethers.toBigInt(result.allowance.cr1_y),
        "cr2_x": ethers.toBigInt(result.allowance.cr2_x),
        "cr2_y": ethers.toBigInt(result.allowance.cr2_y)
    }
    const remainingAmount = {
        "cl_x": ethers.toBigInt(result.new_balance.cl_x),
        "cl_y": ethers.toBigInt(result.new_balance.cl_y),
        "cr_x": ethers.toBigInt(result.new_balance.cr_x),
        "cr_y": ethers.toBigInt(result.new_balance.cr_y)
    }

    const proofData = Buffer.from(result.proof, "hex");

    const result1 = await contract.privateApprove(consumedTokens,result.to_address,transferAmount,remainingAmount,proofData);
    console.log("Result:", result1);
    const transfer = {
        "cl_x": ethers.toBigInt(result.allowance.cl_x),
        "cl_y": ethers.toBigInt(result.allowance.cl_y),
        "cr_x": ethers.toBigInt(result.allowance.cr1_x),
        "cr_y": ethers.toBigInt(result.allowance.cr1_y),
    }
    const token1 = await contract.getAccountToken(result.to_address, transfer);
    console.log(`Result ${requestId}:`, token1);
    const token2 = await contract.getAccountAllowance(result.from_address, result.to_address);
    console.log(`Result ${requestId}:`, token2);
}
function convertParentTokenIds(parentTokenIds) {
    return parentTokenIds.map(id => {
        const bigIntValue = ethers.toBigInt(`0x${id}`);
        return uint256ToBytes32(bigIntValue);
    });
}
function uint256ToBytes32(uint256) {
    if (typeof uint256 !== "bigint") {
        throw new Error("Input must be a BigInt");
    }
    let hexString = uint256.toString(16);
    hexString = hexString.padStart(64, "0");
    const bytes32 = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
        bytes32[i] = parseInt(hexString.slice(i * 2, (i + 1) * 2), 16);
    }
    return bytes32;
}

async function testMint() {
    const requestIds = [
        '879ae5b59f084b3acbfa8bbfc379ef9b3a3b3b10f7ef7cfe05dbe0c3ccacfb51',
        '83b2eb80271d7469b8323cb74c963f350439b9f5e419b0c9e35a70676052be76',
        'c81d11a56a934a08c79d21c2dc67d26d5cb81fb1b2c25208275595c09c760e1d',
        '43e27ea224ffcb791ff2ef4e5f5cbee22bde7ab09ff096f4255313d67ad88e85',
        'b185fcbb034738bda05a6d397e506edd39d1c5555344a74b3fce4819bd9c5bf4',
        '1ffb431987f37b4d4a87f9d07264263e81c4acb3faf7977635179ae5cf6bc7ab',
        'c9c5bac8b6492a19c7999741fc589c68fbd69d0793dd7b538407cf8a24472440'
    ]
    for (const requestId of requestIds) {
        await getMintTokenAndCallL1(requestId)
    }
}
async function setMinter() {
    const [deployer,singer,depositor] = await ethers.getSigners()
    const child = await hre.ethers.getContractAt("PrivateERCToken",scAddress)
    const minterAllowedAmount =   {
        "cl_x": ethers.toBigInt("0x0674c295e0f0892fbf309a316af3adacf8023d5e597bf55533806bd0362170c6"),
        "cl_y": ethers.toBigInt("0x0cb84b5c84cadfa88f4edf89d2fcf051c100aa015a80c202f517a008296c0359"),
        "cr_x": ethers.toBigInt("0x1e347c17ddd4fc6ac3ec66da2d2eb23e866b1fe9cab8493a5f1137a49fdcd2fd"),
        "cr_y": ethers.toBigInt("0x2f2419a3e2efa0de0a9ebe16b0dd90fe8dbcba985b7bd0d1546f197226a5759f"),
    }
    await child.configurePrivacyMinter('0xf17f52151EbEF6C7334FAD080c5704D77216b732',minterAllowedAmount);
}
// generateTokenProof(config.contracts.PrivateERCToken,"0xACFa9A52a0F11E8a1E7DaE8789DD43C58476E5BC",100).then()
// getMintTokenProof("e3eecdf7524771463048ad253bbf912d51233617bbba750981f9d1c51801f3a1").then()
// mintToken(config.contracts.PrivateERCToken,"0xACFa9A52a0F11E8a1E7DaE8789DD43C58476E5BC",100).then()
// getMintTokenAndCallL1('c9c5bac8b6492a19c7999741fc589c68fbd69d0793dd7b538407cf8a24472440').then()

// testMint().then()
// getToken().then()
// getTransferTokenAndCallL1('b6c3f49cc2c064d9b7e812f11e6649f55ea3006183a7a918458848be3bd3095d').then()
// getAppriveTokenAndCallL1('ec54af517a2acd4f8b6d0583cab05c97995b95442d58730ad22c4987d60fad18').then()
setMinter().then()

const scAddress = '0xA097bd9Dd476e74fc4d50777f654c47a6500E678'