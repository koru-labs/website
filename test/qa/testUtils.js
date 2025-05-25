
const hre = require("hardhat");
const { ethers } = require('hardhat');
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts= require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')
const {getBurnProof} = require("./token_grpc");

const l1CustomNetwork = {
    name: "BESU",
    chainId: 1337
};
const options = {
    batchMaxCount: 1,
    staticNetwork: true
};

const provider = new ethers.JsonRpcProvider(hardhatConfig.networks.ucl_node2.url, l1CustomNetwork, options)
const masterMinterWallet = new ethers.Wallet("555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787", provider);
const minterWallet = new ethers.Wallet("ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f", provider);
const spenderWallet = new ethers.Wallet("a8ee6be3949318b57fbdfefdc86cd3a9033b8946789cb33db209e0c623c45cb5", provider);

const rpcUrl ='ac365b5fc227f46c5850d8590ddb0357-2076305457.us-west-1.elb.amazonaws.com:50051'
const client = createClient(rpcUrl)

const scAddress = config.contracts.PrivateERCToken;



function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function mintToken(amount){
    const generateRequest = {
        sc_address: scAddress,
        token_type: '0',
        to_address: accounts.Minter,
        amount: amount
    };
    let result = await client.generateMintProof(generateRequest);
    console.log("Generate Mint Proof Result:", result);
    const requestId = result.request_id;
    for (let i = 0; i < 300; i++) {
        await sleep(10000);
        result = await client.getMintProof(requestId)
        console.log("Mint Proof Result:", result.status);
        if (result.proof !== "") {
            await getMintTokenAndCallL1(requestId)
            break;
        }
    }
}

async function tranferToken(amount){
    const generateRequest = {
        sc_address: scAddress,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: accounts.To1,
        amount: amount
    };

    let result = await client.generateTransferProof(generateRequest);
    console.log("Generate transfer Proof Result:", result);
    const requestId = result.request_id;
    var proof;
    for (let i = 0; i < 300; i++) {
        await sleep(10000);
        result = await client.getTransferProof(requestId)
        console.log("proof generation status: ", result.status);
        if (result.proof !== "") {
            proof= result
            break
        }
    }

    console.log("proof: ", proof);
    await getTransferTokenAndCallL1(requestId)
}

async function burnToken(amount){
    const generateRequest = {
        sc_address: scAddress,
        token_type: '0',
        from_address: accounts.Minter,
        amount: amount
    };

    let result = await client.generateBurnProof(generateRequest);
    console.log("Generate burn Proof Result:", result);
    const requestId = result.request_id;
    for (let i = 0; i < 300; i++) {
        await sleep(10000);
        result = await client.getBurnProof(requestId)
        console.log("Burn Proof Result:", result.status);
        if (result.proof !== "") {
            await getBurnProofAndCallL1(requestId)
            break;
        }
    }
}


async function approveToken(amount){
    const generateRequest = {
        sc_address: scAddress,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: accounts.Spender1,
        amount: amount
    };

    let result = await client.generateApproveProof(generateRequest);
    console.log("Generate approve Proof Result:", result);
    const requestId = result.request_id;
    for (let i = 0; i < 300; i++) {
        await sleep(10000);
        result = await client.getApproveProof(requestId)
        console.log("approve Proof Result:", result.status);
        if (result.proof !== "") {
            await getApproveTokenAndCallL1(requestId)
            break;
        }
    }
}


async function transferFromToken(amount){
    const generateRequest = {
        sc_address: scAddress,
        token_type: '0',
        from_address: accounts.Minter,
        to_address: accounts.To2,
        allowance_cancel_address: accounts.Spender1,
        amount: amount
    };

    let result = await client.generateTransferFromProof(generateRequest);
    console.log("Generate transferFrom Proof Result:", result);
    const requestId = result.request_id;
    for (let i = 0; i < 300; i++) {
        await sleep(10000);
        result = await client.getTransferFromProof(requestId)
        console.log("transferFrom Proof Result:", result.status);
        if (result.proof !== "") {
            await getTransferFromProofAndCallL1(requestId)
            break;
        }
    }
}


async function getMintTokenAndCallL1(requestId){
    let result = await client.getMintProof(requestId)
    // console.log("Mint Proof Result:", result);
    const [deployer,singer,depositor] = await ethers.getSigners()
    const contract = await hre.ethers.getContractAt("PrivateERCToken",scAddress, minterWallet)
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
    console.log(`Result for smart contract to_address token ${requestId}:`, token1);
    const token2 = await contract.getAccountToken(result.from_address, remainingAmount);
    console.log(`Result for smart contract from_address remainingToken ${requestId}:`, token2);
}

async function getTransferTokenAndCallL1(requestId){
    let result = await client.getTransferProof(requestId)
    const [deployer,singer,depositor] = await ethers.getSigners()
    const contract = await hre.ethers.getContractAt("PrivateERCToken",scAddress,minterWallet)

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
    console.log(`Result for smart contract to_address token ${requestId}:`, token1);
    const token2 = await contract.getAccountToken(result.from_address, remainingAmount);
    console.log(`Result for smart contract from_address remainingToken ${requestId}:`, token2);
}


async function getApproveTokenAndCallL1(requestId){
    let result = await client.getApproveProof(requestId)
    console.log("Approve Proof Result:", result);
    const [deployer,singer,depositor] = await ethers.getSigners()
    const contract = await hre.ethers.getContractAt("PrivateERCToken",scAddress,minterWallet)

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
    await result1.wait();
    const transfer = {
        "cl_x": ethers.toBigInt(result.allowance.cl_x),
        "cl_y": ethers.toBigInt(result.allowance.cl_y),
        "cr_x": ethers.toBigInt(result.allowance.cr1_x),
        "cr_y": ethers.toBigInt(result.allowance.cr1_y),
    }
    const token1 = await contract.getAccountToken(result.from_address, remainingAmount);
    console.log(`Result ${requestId}:`, token1);
    const token2 = await contract.getAccountAllowance(result.from_address, result.to_address);
    console.log(`Result ${requestId}:`, token2);
}


async function getBurnProofAndCallL1(requestId) {
    let result = await client.getBurnProof(requestId)
    console.log("Approve Proof Result:", result);
    const [deployer,singer,depositor] = await ethers.getSigners()
    const contract = await hre.ethers.getContractAt("PrivateERCToken",scAddress,minterWallet)

    const consumedTokens = convertParentTokenIds(result.parentTokenId);
    const amount = {
        "cl_x": ethers.toBigInt(result.supply_decrease.cl_x),
        "cl_y": ethers.toBigInt(result.supply_decrease.cl_y),
        "cr_x": ethers.toBigInt(result.amount.cr_x),
        "cr_y": ethers.toBigInt(result.amount.cr_y)
    }
    const consumedTokensRemainingAmount = {
        "cl_x": ethers.toBigInt(result.new_balance.cl_x),
        "cl_y": ethers.toBigInt(result.new_balance.cl_y),
        "cr_x": ethers.toBigInt(result.new_balance.cr_x),
        "cr_y": ethers.toBigInt(result.new_balance.cr_y)
    }
    const supplyDecrease = {
        "cl_x": ethers.toBigInt(result.supply_decrease.cl_x),
        "cl_y": ethers.toBigInt(result.supply_decrease.cl_y),
        "cr_x": ethers.toBigInt(result.supply_decrease.cr_x),
        "cr_y": ethers.toBigInt(result.supply_decrease.cr_y)
    }
    const proofData = Buffer.from(result.proof, "hex");

    const result1 = await contract.privateBurn(consumedTokens,amount,consumedTokensRemainingAmount,supplyDecrease,proofData);
    console.log("Result:", result1);
    await result1.wait();
    const token2 = await contract.getAccountToken(result.from_address, consumedTokensRemainingAmount);
    console.log(`Result for requestId ${requestId}:`, token2);
}



async function getTransferFromProofAndCallL1(requestId) {
    let result = await client.getTransferFromProof(requestId)
    console.log("Approve Proof Result:", result);
    const [deployer,singer,depositor] = await ethers.getSigners()
    const contract = await hre.ethers.getContractAt("PrivateERCToken",scAddress,spenderWallet)
    const oldAllowance = {
        "cl_x": ethers.toBigInt(result.old_allowance.cl_x),
        "cl_y": ethers.toBigInt(result.old_allowance.cl_y),
        "cr1_x": ethers.toBigInt(result.old_allowance.cr1_x),
        "cr1_y": ethers.toBigInt(result.old_allowance.cr1_y),
        "cr2_x": ethers.toBigInt(result.old_allowance.cr2_x),
        "cr2_y": ethers.toBigInt(result.old_allowance.cr2_y)
    }
    const newAllowance = {
        "cl_x": ethers.toBigInt(result.new_allowance.cl_x),
        "cl_y": ethers.toBigInt(result.new_allowance.cl_y),
        "cr1_x": ethers.toBigInt(result.new_allowance.cr1_x),
        "cr1_y": ethers.toBigInt(result.new_allowance.cr1_y),
        "cr2_x": ethers.toBigInt(result.new_allowance.cr2_x),
        "cr2_y": ethers.toBigInt(result.new_allowance.cr2_y)
    }
    const amount = {
        "cl_x": ethers.toBigInt(result.amount.cl_x),
        "cl_y": ethers.toBigInt(result.amount.cl_y),
        "cr_x": ethers.toBigInt(result.amount.cr_x),
        "cr_y": ethers.toBigInt(result.amount.cr_y)
    }
    const proofData = Buffer.from(result.proof, "hex");

    const result1 = await contract.privateTransferFrom(result.from_address,oldAllowance,newAllowance,result.to_address, amount,proofData);
    console.log("Result:", result1);
    await result1.wait();
    const token2 = await contract.getAccountAllowance(result.from_address, accounts.Spender1);
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

//
// mintToken(100).then()
// tranferToken(1).then()
// burnToken(1).then()
// approveToken(10).then()
// transferFromToken(1).then()

// getMintTokenAndCallL1('e5fb1cb6d751fa0c2d7c9f641d3c3f6264760509bc4569ae4eb590e4049dcdb').then()
// getTransferTokenAndCallL1('5a3b4f9c455dbc15492b2ddc2fad14dc3fb1c238cbf4e5e9b80656f69cf3702e').then() //todo
// getApproveTokenAndCallL1('ad17895f4559f4b02b1bbc0ffdf4c4a9fe2cc90b85a238a425097a6213d44c0a').then()
// getBurnProofAndCallL1('8600301a87c04f80b37a5b0122a21dda6239370655eaf2ce9f2241b5e91d42f1').then()
// getTransferFromProofAndCallL1('2727c0f1d9e32301c3161f52acf124fe121bb03f67593ff10f972d8d3011daf2').then()

