const {ethers} = require("hardhat")
const config = require('./../../deployments/image9.json');
const hardhatConfig = require("../../hardhat.config");
const accounts = require("../../deployments/account.json");

const l1CustomNetwork = {
    name: "BESU",
    chainId: 1337
};
const options = {
    batchMaxCount: 1,
    staticNetwork: true
};


const L1Url = hardhatConfig.networks.ucl_L2.url;
const l1Provider = new ethers.JsonRpcProvider(L1Url, l1CustomNetwork, options);

async function callPrivateMint(scAddress, proofResult, minterWallet) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress, minterWallet);
    const amount = {
        cl_x: ethers.toBigInt(proofResult.amount.clX),
        cl_y: ethers.toBigInt(proofResult.amount.clY),
        cr_x: ethers.toBigInt(proofResult.amount.crX),
        cr_y: ethers.toBigInt(proofResult.amount.crY)
    };
    const supplyAmount = {
        cl_x: ethers.toBigInt(proofResult.supplyAmount.clX),
        cl_y: ethers.toBigInt(proofResult.supplyAmount.clY),
        cr_x: ethers.toBigInt(proofResult.supplyAmount.crX),
        cr_y: ethers.toBigInt(proofResult.supplyAmount.crY)
    };
    const proof = proofResult.proof.map(p => ethers.toBigInt(p));
    const input = proofResult.input.map(i => ethers.toBigInt(i));
    const tx = await contract.privateMint(proofResult.toAddress,amount,supplyAmount,proof,input);
    let receipt = await tx.wait();
    return receipt;
}


async function callPrivateTransfer(wallet, scAddress, to, tokenId) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress, wallet);
    const tx = await contract.privateTransfer(tokenId,to);
    let receipt = await tx.wait();
    return receipt;
}


async function callPrivateTransferFrom(wallet, scAddress, from,to, tokenId) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress, wallet);
    const tx = await contract.privateTransferFrom(tokenId,from,to);
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


async function getAddressBalance(grpcClient, scAddress, account) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress)
    let amount = await contract.privateBalanceOf(account)


    let balance=  {
        cl_x: convertBigInt2Hex(amount[0]),
        cl_y: convertBigInt2Hex(amount[1]),
        cr_x: convertBigInt2Hex(amount[2]),
        cr_y: convertBigInt2Hex(amount[3])
    }
    let result = await grpcClient.getAccountBalance(scAddress, account)
    let decodeAmount = await grpcClient.decodeElgamalAmount(balance)

    console.log("===================================================================");
    console.log("Checking Owner Balance");
    console.log("Owner Address:", account);
    console.log("-------------------------------------------------------------------");
    console.log("Decrypted On-chain Balance:", decodeAmount);
    console.log("Database Balance:", result);
    console.log("===================================================================\n");

    return result
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
    let result = await grpcClient.decodeElgamalAmount(balance)
    return Number(result.balance)
}

async function getPublicTotalSupply(scAddress) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress)
    let amount = await contract.publicTotalSupply()
    console.log("Public Total Supply: ", amount[0])
    return amount[0]
}

async function getAllowanceBalance(grpcClient, scAddress, owner, spender) {
    const grpcResult = await grpcClient.getAddressAllowance(owner, spender, scAddress);
    const grpcAllowanceAmount = Number(grpcResult.amount);
    return grpcAllowanceAmount;
}

async function getSplitTokenList(grpcClient,owner, scAddress){
    const grpcResult = await grpcClient.getSplitTokenList(owner, scAddress);
    return grpcResult;
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

async function callPrivateBurn(scAddress, wallet, tokenId) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress, wallet);
    let tx = await contract.privateBurn(tokenId)
    let receipt = await tx.wait();
    return receipt;
}

async function callPrivateCancel(scAddress, wallet, tokenId) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress, wallet);
    let tx = await contract.privateCancelToken(tokenId)
    let receipt = await tx.wait();
    return receipt;
}

async function registerUser(userAddress) {
    const onwerWallet = new ethers.Wallet('555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787', l1Provider);
    const institutionRegistration = await ethers.getContractAt("InstitutionUserRegistry", config.contracts.InstitutionUserRegistry,onwerWallet);
    let userRegTx = await institutionRegistration.registerUserByOwner(
        userAddress,
        '0xf17f52151EbEF6C7334FAD080c5704D77216b732'
    );
    await userRegTx.wait();
    console.log(`Registered user ${userAddress} under Bank 0xf17f52151EbEF6C7334FAD080c5704D77216b732 `);
}

async function isBlackList(userAddress) {
    const onwerWallet = new ethers.Wallet('555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787', l1Provider);
    const contract = await ethers.getContractAt("PrivateUSDC", config.contracts.PrivateERCToken,onwerWallet);
    let tx = await contract.isBlacklisted(userAddress);
    return tx;
}

async function addToBlackList(userAddress) {
    const onwerWallet = new ethers.Wallet('555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787', l1Provider);
    const contract = await ethers.getContractAt("PrivateUSDC", config.contracts.PrivateERCToken,onwerWallet);
    await contract.blacklist(userAddress)
}

async function removeFromBlackList(userAddress) {
    const onwerWallet = new ethers.Wallet('555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787', l1Provider);
    const contract = await ethers.getContractAt("PrivateUSDC", config.contracts.PrivateERCToken,onwerWallet);
    await contract.unBlacklist(userAddress)
}

async function getEvents(eventName){
    try {
        const event_address = config.contracts.PrivateERCToken;
        const l1Bridge = await ethers.getContractAt("PrivateUSDC", event_address);


        const endBlock = await l1Provider.getBlockNumber();  // 最新区块
        const startBlock = endBlock - 10000;  // 起始区块
        const batchSize = 1000;  // 每次查询的区块范围

        // 事件名称（确保事件名称正确）
        // const eventName = "TokenSplitDebugEvent";  // 请根据实际情况修改事件名称

        for (let fromBlock = startBlock; fromBlock <= endBlock; fromBlock += batchSize) {
            const toBlock = Math.min(fromBlock + batchSize - 1, endBlock);

            console.log(`Fetching events from block ${fromBlock} to ${toBlock}...`);

            // 获取指定事件名称的事件
            const events = await l1Bridge.queryFilter(eventName, fromBlock, toBlock);

            if (events.length === 0) {
                console.log(`No events found from block ${fromBlock} to ${toBlock}`);
            }

            events.forEach(event => {
                console.log('Event Name:', event.eventName);  // 事件名称
                console.log('Event Data:', event.args);   // 事件数据
                console.log('-----------------------------');
            });
        }
    } catch (err) {
        console.error('Error fetching events:', err);
    }
}

module.exports =  {
    callPrivateMint,
    callPrivateTransfer,
    callPrivateTransferFrom,
    callPrivateBurn,
    getAddressBalance,
    getAllowanceBalance,
    getTotalSupplyNode3,
    getPublicTotalSupply,
    callPrivateCancel,
    registerUser,
    isBlackList,
    addToBlackList,
    removeFromBlackList,
    getEvents,
    getSplitTokenList,
}