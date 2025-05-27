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

async function getAllowanceBalance(grpcClient, scAddress, owner, spender) {
    // const contract = await ethers.getContractAt("PrivateERCToken", scAddress);
    // let contractAllowance = await contract.getAccountAllowance(owner, spender);
    //
    // const contractAllowanceAmount = {
    //     cl_x: convertBigInt2Hex(contractAllowance[0]),
    //     cl_y: convertBigInt2Hex(contractAllowance[1]),
    //     cr1_x: convertBigInt2Hex(contractAllowance[2]),
    //     cr1_y: convertBigInt2Hex(contractAllowance[3]),
    //     cr2_x: convertBigInt2Hex(contractAllowance[4]),
    //     cr2_y: convertBigInt2Hex(contractAllowance[5])
    // };

    const grpcResult = await grpcClient.getAddressAllowance(owner, spender, scAddress);
    const grpcAllowanceAmount = Number(grpcResult.amount);

    // if (contractAllowanceAmount.cl_x !== grpcAllowanceAmount.cl_x ||
    //     contractAllowanceAmount.cl_y !== grpcAllowanceAmount.cl_y ||
    //     contractAllowanceAmount.cr1_x !== grpcAllowanceAmount.cr1_x ||
    //     contractAllowanceAmount.cr1_y !== grpcAllowanceAmount.cr1_y ||
    //     contractAllowanceAmount.cr2_x !== grpcAllowanceAmount.cr2_x ||
    //     contractAllowanceAmount.cr2_y !== grpcAllowanceAmount.cr2_y) {
    //     throw new Error(`Allowance mismatch: contract returned ${JSON.stringify(contractAllowanceAmount)}, gRPC returned ${JSON.stringify(grpcAllowanceAmount)}`);
    // }

    return grpcAllowanceAmount;
}

async function getTotalSupply(scAddress){
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress)
    let amount = await contract.privateTotalSupply()
    return amount
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
    getTotalSupply
}