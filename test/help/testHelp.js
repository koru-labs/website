const {ethers} = require("hardhat")


async function callPrivateMint(scAddress, proofResult, minterWallet) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress, minterWallet);
    const amount = {
        cl_x: ethers.toBigInt(proofResult.amount.cl_x),
        cl_y: ethers.toBigInt(proofResult.amount.cl_y),
        cr_x: ethers.toBigInt(proofResult.amount.cr_x),
        cr_y: ethers.toBigInt(proofResult.amount.cr_y)
    };
    const supplyAmount = {
        cl_x: ethers.toBigInt(proofResult.supply_amount.cl_x),
        cl_y: ethers.toBigInt(proofResult.supply_amount.cl_y),
        cr_x: ethers.toBigInt(proofResult.supply_amount.cr_x),
        cr_y: ethers.toBigInt(proofResult.supply_amount.cr_y)
    };
    const proofData = Buffer.from(proofResult.proof, "hex");
    const tx = await contract.privateMint(proofResult.to_address,amount,supplyAmount,proofData);
    let receipt = await tx.wait();
    return receipt;
}

async function callPrivateTransfer(scAddress, proofResult, senderWallet){
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress, senderWallet)
    const consumedTokens = convertParentTokenIds(proofResult.parentTokenId);

    const transferAmount = {
        "cl_x": ethers.toBigInt(proofResult.amount.cl_x),
        "cl_y": ethers.toBigInt(proofResult.amount.cl_y),
        "cr_x": ethers.toBigInt(proofResult.amount.cr_x),
        "cr_y": ethers.toBigInt(proofResult.amount.cr_y)
    }
    const remainingAmount = {
        "cl_x": ethers.toBigInt(proofResult.new_balance.cl_x),
        "cl_y": ethers.toBigInt(proofResult.new_balance.cl_y),
        "cr_x": ethers.toBigInt(proofResult.new_balance.cr_x),
        "cr_y": ethers.toBigInt(proofResult.new_balance.cr_y)
    }
    const proofData = Buffer.from(proofResult.proof, "hex");

    const tx = await contract.privateTransfer(consumedTokens,proofResult.to_address,transferAmount,remainingAmount,proofData);
    let receipt = await tx.wait();
    return receipt
}

async function callPrivateTransfer2(scAddress, tokenId, to, minterWallet) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress, minterWallet);
    const tx = await contract.privateTransfer(tokenId,to);
    let receipt = await tx.wait();
    return receipt;
}


async function callPrivateBurn2(scAddress, tokenId, minterWallet) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress, minterWallet);
    const tx = await contract.privateBurn(tokenId);
    let receipt = await tx.wait();
    return receipt;
}


async function callPrivateApprove(scAddress, proofResult, ownerWallet){
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress, ownerWallet);

    const consumedTokens = convertParentTokenIds(proofResult.parentTokenId);
    const transferAmount = {
        "cl_x": ethers.toBigInt(proofResult.allowance.cl_x),
        "cl_y": ethers.toBigInt(proofResult.allowance.cl_y),
        "cr1_x": ethers.toBigInt(proofResult.allowance.cr1_x),
        "cr1_y": ethers.toBigInt(proofResult.allowance.cr1_y),
        "cr2_x": ethers.toBigInt(proofResult.allowance.cr2_x),
        "cr2_y": ethers.toBigInt(proofResult.allowance.cr2_y)
    }
    const remainingAmount = {
        "cl_x": ethers.toBigInt(proofResult.new_balance.cl_x),
        "cl_y": ethers.toBigInt(proofResult.new_balance.cl_y),
        "cr_x": ethers.toBigInt(proofResult.new_balance.cr_x),
        "cr_y": ethers.toBigInt(proofResult.new_balance.cr_y)
    }

    const proofData = Buffer.from(proofResult.proof, "hex");

    const tx = await contract.privateApprove(consumedTokens,proofResult.to_address,transferAmount,remainingAmount,proofData);
    let receipt = await tx.wait();
    return receipt
}


async function callPrivateBurn(scAddress, proofResult, accountWallet) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress, accountWallet)
    const consumedTokens = convertParentTokenIds(proofResult.parentTokenId);

    const amount = {
        "cl_x": ethers.toBigInt(proofResult.supply_decrease.cl_x),
        "cl_y": ethers.toBigInt(proofResult.supply_decrease.cl_y),
        "cr_x": ethers.toBigInt(proofResult.amount.cr_x),
        "cr_y": ethers.toBigInt(proofResult.amount.cr_y)
    }
    const consumedTokensRemainingAmount = {
        "cl_x": ethers.toBigInt(proofResult.new_balance.cl_x),
        "cl_y": ethers.toBigInt(proofResult.new_balance.cl_y),
        "cr_x": ethers.toBigInt(proofResult.new_balance.cr_x),
        "cr_y": ethers.toBigInt(proofResult.new_balance.cr_y)
    }
    const supplyDecrease = {
        "cl_x": ethers.toBigInt(proofResult.supply_decrease.cl_x),
        "cl_y": ethers.toBigInt(proofResult.supply_decrease.cl_y),
        "cr_x": ethers.toBigInt(proofResult.supply_decrease.cr_x),
        "cr_y": ethers.toBigInt(proofResult.supply_decrease.cr_y)
    }
    const proofData = Buffer.from(proofResult.proof, "hex");

    const tx = await contract.privateBurn(consumedTokens,amount,consumedTokensRemainingAmount,supplyDecrease,proofData);
    console.log("Result:", tx);
    let receipt = await tx.wait();
    return receipt
}



async function callPrivateTransferFrom(scAddress, proofResult, spenderWallet) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress, spenderWallet)
    const oldAllowance = {
        "cl_x": ethers.toBigInt(proofResult.old_allowance.cl_x),
        "cl_y": ethers.toBigInt(proofResult.old_allowance.cl_y),
        "cr1_x": ethers.toBigInt(proofResult.old_allowance.cr1_x),
        "cr1_y": ethers.toBigInt(proofResult.old_allowance.cr1_y),
        "cr2_x": ethers.toBigInt(proofResult.old_allowance.cr2_x),
        "cr2_y": ethers.toBigInt(proofResult.old_allowance.cr2_y)
    }
    const newAllowance = {
        "cl_x": ethers.toBigInt(proofResult.new_allowance.cl_x),
        "cl_y": ethers.toBigInt(proofResult.new_allowance.cl_y),
        "cr1_x": ethers.toBigInt(proofResult.new_allowance.cr1_x),
        "cr1_y": ethers.toBigInt(proofResult.new_allowance.cr1_y),
        "cr2_x": ethers.toBigInt(proofResult.new_allowance.cr2_x),
        "cr2_y": ethers.toBigInt(proofResult.new_allowance.cr2_y)
    }
    const amount = {
        "cl_x": ethers.toBigInt(proofResult.amount.cl_x),
        "cl_y": ethers.toBigInt(proofResult.amount.cl_y),
        "cr_x": ethers.toBigInt(proofResult.amount.cr_x),
        "cr_y": ethers.toBigInt(proofResult.amount.cr_y)
    }
    const proofData = Buffer.from(proofResult.proof, "hex");

    const tx = await contract.privateTransferFrom(proofResult.from_address,oldAllowance,newAllowance,proofResult.to_address, amount,proofData);
    let receipt = await tx.wait();
    return receipt
}


async function getAddressBalance(grpcClient, scAddress, account) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress)
    let amount = await contract.privateBalanceOf(account)


    let balance=  {
        cl_x: convertBigInt2Hex(amount[0]),
        cl_y: convertBigInt2Hex(amount[1]),
        cr_x: convertBigInt2Hex(amount[2]),
        cr_y: convertBigInt2Hex(amount[3])
    }
    let result = await grpcClient.getAccountBalance(scAddress, account, balance)
    return result
}

async function checkAccountToken(scAddress, account, tokenId) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress)
    let token = await contract.getAccountTokenById(account, tokenId)

    return token;
}


async function getTotalSupplyNode3(grpcClient, scAddress) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress)
    let amount = await contract.privateTotalSupply()
    let balance=  {
        cl_x: convertBigInt2Hex(amount[0]),
        cl_y: convertBigInt2Hex(amount[1]),
        cr_x: convertBigInt2Hex(amount[2]),
        cr_y: convertBigInt2Hex(amount[3])
    }
    let result = await grpcClient.getAccountBalance(scAddress,'0xf17f52151EbEF6C7334FAD080c5704D77216b732', balance)
    const decimalValue = hexToDecimal(result.decryptBalance)
    return decimalValue
}

async function getPublicTotalSupply(scAddress) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress)
    let amount = await contract.publicTotalSupply()
    return amount
}

async function getAllowanceBalance(grpcClient, scAddress, owner, spender) {
    const grpcResult = await grpcClient.getAddressAllowance(owner, spender, scAddress);
    const grpcAllowanceAmount = Number(grpcResult.amount);
    return grpcAllowanceAmount;
}

function hexToDecimal(hexString) {
    // Remove the '0x' prefix if present
    const hex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;

    // Convert to BigInt first
    const bigIntValue = BigInt('0x' + hex);

    // Safely convert to Number (with range check)
    if (bigIntValue <= Number.MAX_SAFE_INTEGER) {
        return Number(bigIntValue);
    } else {
        // For numbers beyond safe range, return as string or throw error
        return bigIntValue.toString();
        // Alternatively: throw new Error("Value exceeds safe integer range");
    }
}
function convertBigInt2Hex(number) {
    return ethers.toBigInt(number).toString(16)
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

module.exports =  {
    callPrivateMint,
    callPrivateTransfer,
    callPrivateBurn,
    callPrivateApprove,
    callPrivateTransferFrom,
    getAddressBalance,
    getAllowanceBalance,
    getTotalSupplyNode3,
    getPublicTotalSupply,
    checkAccountToken,
    callPrivateTransfer2,
    callPrivateBurn2
}