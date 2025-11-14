const {ethers} = require("hardhat")
const { expect } = require("chai");
const hardhatConfig = require("../../hardhat.config");
const grpc = require('@grpc/grpc-js');
const {getEnvironmentConfig, getImage9EnvironmentData} = require("../../script/deploy_help");
// const config = require('./../../deployments/image9.json');
const config = getImage9EnvironmentData();
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc')
const configuration = getEnvironmentConfig();


const l1Provider = ethers.provider;

const node3Institution = configuration.institutions.find(institution => institution.name === "Node3");
if (!node3Institution) {
    throw new Error("Node3 institution not found in config");
}
// find node4 institution
const node4Institution = configuration.institutions.find(institution => institution.name === "Node4");
if (!node3Institution) {
    throw new Error("Node4 institution not found in config");
}

const key = node3Institution.privateKey

async function callPrivateMint(scAddress, proofResult, minterWallet) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress, minterWallet);
    const newToken = {
        id : ethers.toBigInt(proofResult.token.token_id),
        owner: proofResult.to_address,
        status: 2,
        amount: {
            cl_x: ethers.toBigInt(proofResult.token.cl_x),
            cl_y: ethers.toBigInt(proofResult.token.cl_y),
            cr_x: ethers.toBigInt(proofResult.token.cr_x),
            cr_y: ethers.toBigInt(proofResult.token.cr_y),
        },
        to: proofResult.to_address,
        rollbackTokenId: ethers.toBigInt(0),
        tokenType: 2,
    }

    const mintAllowed = {
        id : ethers.toBigInt(proofResult.mint_allowed.token_id),
        cl_x: ethers.toBigInt(proofResult.mint_allowed.cl_x),
        cl_y: ethers.toBigInt(proofResult.mint_allowed.cl_y),
        cr_x: ethers.toBigInt(proofResult.mint_allowed.cr_x),
        cr_y: ethers.toBigInt(proofResult.mint_allowed.cr_y)
    };
    const supplyAmount = {
        id : ethers.toBigInt(proofResult.supply_amount.token_id),
        cl_x: ethers.toBigInt(proofResult.supply_amount.cl_x),
        cl_y: ethers.toBigInt(proofResult.supply_amount.cl_y),
        cr_x: ethers.toBigInt(proofResult.supply_amount.cr_x),
        cr_y: ethers.toBigInt(proofResult.supply_amount.cr_y)
    };
    const proof = proofResult.proof.map(p => ethers.toBigInt(p));
    const input = proofResult.input.map(i => ethers.toBigInt(i));
    console.log(newToken,mintAllowed,supplyAmount)
    const tx = await contract.privateMint(proofResult.to_address,newToken,mintAllowed,supplyAmount,proof,input);
    let receipt = await tx.wait();
    return receipt;
}


async function callPrivateTransfer(wallet, scAddress, tokenId) {
    const contract = await ethers.getContractAt("PrivateUSDC", scAddress, wallet);
    // const contract = await ethers.getContractAt("PrivateUSDC", scAddress, wallet);
    console.log("contract address is :",contract.target)
    const tx = await contract.privateTransfers([tokenId]);
    let receipt = await tx.wait();
    console.log("Result:", receipt);
    return receipt;
}



async function callPrivateTransfers(wallet, scAddress, tokenIds) {
    const contract = await ethers.getContractAt("PrivateUSDC", scAddress, wallet);
    const tx = await contract.privateTransfers(tokenIds);
    let receipt = await tx.wait();
    console.log("Result:", receipt);
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


async function callPrivateTransferFrom(wallet, scAddress, from,to, tokenId) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress, wallet);
    const tx = await contract.privateTransferFroms([tokenId],from,to);
    let receipt = await tx.wait();
    return receipt;
}

async function callPrivateTransferFroms(wallet, scAddress, from, to, tokenIds) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress, wallet);
    const tx = await contract.privateTransferFroms(tokenIds, from, to);
    let receipt = await tx.wait();
    return receipt;
}

async function callPrivateBurnFroms(wallet, scAddress, from, tokenIds) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress, wallet);
    const tx = await contract.privateBurnFroms(from, tokenIds);
    let receipt = await tx.wait();
    return receipt;
}

async function callPrivateBurns(scAddress, wallet, tokenIds) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress, wallet);
    const tx = await contract.privateBurns(tokenIds);
    let receipt = await tx.wait();
    return receipt;
}

async function getAddressBalance(grpcClient, scAddress, address,meta) {
    let result = await grpcClient.getAccountBalance(scAddress, address, meta)
    // let decodeAmount = await grpcClient.decodeElgamalAmount(balance)
    return Number(result.balance)
}

async function getPublicBalance(account) {
    const contract = await ethers.getContractAt("PrivateUSDC", config.contracts.PrivateERCToken)
    let amount = await contract.balanceOf(account)
    return Number(amount)
}
async function getAddressBalance2(grpcClient, scAddress, account) {
    const metadata = await createAuthMetadata(accounts.OwnerKey);
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress)
    let amount = await contract.privateBalanceOf(account)

    let balance=  {
        cl_x: convertBigInt2Hex(amount[0]),
        cl_y: convertBigInt2Hex(amount[1]),
        cr_x: convertBigInt2Hex(amount[2]),
        cr_y: convertBigInt2Hex(amount[3])
    }
    let result = await grpcClient.getAccountBalance(scAddress, account,metadata)
    let decodeAmount = { balance: '0' }
    if (balance.cl_x != '0') {
        decodeAmount = await grpcClient.decodeElgamalAmount(balance,metadata)
    }

    console.log("===================================================================");
    console.log("Checking Owner Balance");
    console.log("Owner Address:", account);
    console.log("-------------------------------------------------------------------");
    console.log("Decrypted On-chain Balance:", decodeAmount);
    console.log("Database Balance:", result);
    console.log("===================================================================\n");
    // if (decodeAmount.balance != result.balance) {
    //     console.log("Balance in database and on-chain Mismatch");
    //     // console.log({decodeAmount,result})
    // }else {
    //     return result
    // }
    return result
}

async function getTotalSupplyNode3(grpcClient, scAddress,metadata,wallet) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress, wallet);
    // let contractFact = await ethers.getContractAt("PrivateERCToken", scAddress);
    // let contract = contractFact.attach(wallet)

    let amount = await contract.privateTotalSupply()
    // console.log("Total Supply:", amount)
    // let balance=  {
    //     cl_x: convertBigInt2Hex(amount[0]),
    //     cl_y: convertBigInt2Hex(amount[1]),
    //     cr_x: convertBigInt2Hex(amount[2]),
    //     cr_y: convertBigInt2Hex(amount[3])
    // }
    //  amount = [
    //     4454341540565941680420336000337082971104667342900809180771646425082108053854n,
    //     646733961612468307970552120021574606487878303051279260636940126306882543090n,
    //     3315709687871048041818972036061985732604328766579592931346435598881325352763n,
    //     13178588232214544695572971480419066046621516549265728004469502354242495923189n
    // ]
    let balance = {
            cl_x: convertBigInt2Hex(amount[0]),
            cl_y: convertBigInt2Hex(amount[1]),
            cr_x: convertBigInt2Hex(amount[2]),
            cr_y: convertBigInt2Hex(amount[3])
        }
    console.log(balance)
    let result = await grpcClient.decodeElgamalAmount(balance,metadata)
    console.log(result)
    return Number(result.balance)
}

async function getPublicTotalSupply(scAddress) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress)
    let amount = await contract.publicTotalSupply()
    // console.log("Public Total Supply: ", amount[0])
    return amount[0]
}

// async function getApprovedAllowance(scAddress,wallet,owner) {
//     const contract = await ethers.getContractAt("PrivateERCToken", scAddress,wallet)
//     console.log("Approve owner: ", owner)
//     let approvedToken = await contract.getAllowanceTokensFrom(owner)
//     console.log("Approve token: ", '0x'+approvedToken.toString(16))
//     return '0x'+approvedToken.toString(16)
// }

async function getSplitTokenList(grpcClient,owner, scAddress,metadata){
    const grpcResult = await grpcClient.getSplitTokenList(owner, scAddress, metadata);
    return grpcResult;
}

async function getApproveTokenList(grpcClient,ownerAddress, scAddress,spenderAddress,metadata){
    console.log({ownerAddress, scAddress,spenderAddress})
    // const grpcResult = await grpcClient.getApproveTokenList(ownerAddress, scAddress,spenderAddress, metadata);
    const grpcResult = await grpcClient.getApproveTokenList(ownerAddress, scAddress,"", metadata);
    return grpcResult;
}

async function isAllowanceExists(scAddress,owner,spender,tokenId) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress)
    const result = await contract.isAllowanceExists(owner,spender,tokenId)
    return result
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
    return ethers.toBigInt(number).toString(10)
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
    return callPrivateBurns(scAddress, wallet, [tokenId]);
}

async function createAuthMetadata(privateKey, messagePrefix = "login") {
    const wallet = new ethers.Wallet(privateKey);
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${messagePrefix}_${timestamp}`;
    const signature = await wallet.signMessage(message);

    const metadata = new grpc.Metadata();
    // metadata.set('address', wallet.address.toLowerCase());
    metadata.set('signature', signature);
    metadata.set('message', message);

    return metadata;
}

async function callPrivateCancel(scAddress, wallet, tokenId) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress, wallet);
    let tx = await contract.privateCancelToken(tokenId)
    let receipt = await tx.wait();
    return receipt;
}

async function callPrivateRevoke(scAddress, wallet,spenderAddress, tokenId) {
    const contract = await ethers.getContractAt("PrivateERCToken", scAddress, wallet);
    let tx = await contract.privateRevokeApproval(spenderAddress,tokenId)
    let receipt = await tx.wait();
    return receipt;
}

async function registerUser(privateKey,client,userAddress,role) {
    const metadata = await createAuthMetadata(privateKey);
    const request = {
        account_address: userAddress,
        account_roles: role,//minter,admin,normal
    };

    try {
        const response = await client.registerAccount(request, metadata);
        // console.log("registerAccount response:", response);
        // const actionRequest = {
        //     account_address: userAddress,
        // };
        // const actionResponse = await client.getAccount(actionRequest, metadata);
        // console.log("user status:", actionResponse);
        await sleep(3000)
        if (response.status !== "ASYNC_ACTION_STATUS_FAIL") {
            const actionRequest = {
                request_id: response.request_id,
            };
            // await sleep(3000);
            const actionResponse = await client.getAsyncAction(actionRequest, metadata);
            console.log("action response:", actionResponse);
            return actionResponse
        }
    } catch (error) {
        console.error("gRPC call failed:", error);
        return error
    }
}

async function updateAccountStatus(privateKey,client,userAddress,status) {
    try {
        const metadata = await createAuthMetadata(privateKey);

        const request = {
            account_address: userAddress,
            account_status: status, //0:inactive,2:active
        };
        const response = await client.updateAccountStatus(request, metadata);
        console.log("Success:", response);
        if (response.status !== "ASYNC_ACTION_STATUS_FAIL") {
            await sleep(3000);
            const actionRequest = {
                request_id: response.request_id,
            };
            const actionResponse = await client.getAsyncAction(actionRequest, metadata);
            console.log("action response:", actionResponse);
            return actionResponse
        }
        if (response.status === "ASYNC_ACTION_STATUS_FAIL") {
            // 捕捉到失败状态，可以抛出错误以便调用者统一处理
            const error = new Error("Server responded with failure");
            error.details = response.message; // 将原始响应消息作为错误详情
            throw error;
        }
    } catch (error) {
        console.error("gRPC call failed:", error);
        return error
    }
}

async function updateAccountRole(privateKey,client,userAddress,role) {
    try {
        const metadata = await createAuthMetadata(privateKey);
        const actionRequest = {
            account_address: userAddress,
            account_roles: role,//minter,admin,normal
        };
        const actionResponse = await client.updateAccountRole(actionRequest, metadata);
        await sleep(3000)
        console.log("action response:", actionResponse);
        return actionResponse

    } catch (error) {
        console.error("gRPC call failed:", error);
        return error
    }
}

async function getAccount(privateKey,client,userAddress) {
    try {
        const metadata = await createAuthMetadata(privateKey);
        const actionRequest = {
            account_address: userAddress,
        };
        const actionResponse = await client.getAccount(actionRequest, metadata);
        console.log("action response:", actionResponse);
        return actionResponse;
    } catch (error) {
        console.error("gRPC call failed:", error);
        return error
    }
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
        const startBlock = endBlock - 3000;  // 起始区块
        const batchSize = 1000;  // 每次查询的区块范围

        // 事件名称（确保事件名称正确）
        // const eventName = "TokenSplitDebugEvent";  // 请根据实际情况修改事件名称

        for (let fromBlock = startBlock; fromBlock <= endBlock; fromBlock += batchSize) {
            const toBlock = Math.min(fromBlock + batchSize - 1, endBlock);

            console.log(`Fetching events  from block ${fromBlock} to ${toBlock}...`);
            console.log("eventName:",eventName)
            // 获取指定事件名称的事件
            const events = await l1Bridge.queryFilter(eventName, fromBlock, toBlock);
            console.log("events:",events)
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
async function getHamsaEvents(){
    try {
        const event_address = config.contracts.HamsaL2Event;
        const l1Bridge = await ethers.getContractAt("HamsaL2Event", event_address);

        const endBlock = await l1Provider.getBlockNumber();  // 最新区块
        const startBlock = Math.max(0, endBlock - 100);  // 最多查100个区块
        const batchSize = 100;  // 查询的区块范围

        console.log(`Fetching events from block ${startBlock} to ${endBlock}...`);

        // 获取指定事件名称的事件
        const events = await l1Bridge.queryFilter('EventReceived', startBlock, endBlock);

        if (events.length === 0) {
            console.log(`No events found from block ${startBlock} to ${endBlock}`);
            return [];
        } else {
            console.log(`Found ${events.length} events from block ${startBlock} to ${endBlock}`);
            // 按区块号降序排列，返回最新的事件
            events.sort((a, b) => b.blockNumber - a.blockNumber);
            return events;
        }
    } catch (err) {
        console.error('Error fetching events:', err);
        return [];
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function registerConfigureMinter(address) {
    // configure minter allowed amount
    const minterAllowedAmount = {
        "cl_x": 17965178807605681775593476527901391566646357775548805416191630067931921590266n,
        "cl_y": 17997503520096523373978760079614633178183544935372525079367653487073845131371n,
        "cr_x": 2799658707790704252170544877645553735081603739176317448125814928308770685127n,
        "cr_y": 10724405929777949929088094477911843117820716522007699467531083531418761611245n,
    }
    console.log("Configure minter allowed amount...")
    const minters = [
        {account: address, name: "Minter"},
    ];
    const l1CustomNetwork = {
        name: "BESU",
        chainId: 1337
    };
    const options = {
        batchMaxCount: 1,
        staticNetwork: true
    };
    // const key = hardhatConfig.networks.ucl_L2.accounts[0];
    const l1Provider = new ethers.JsonRpcProvider(L1Url, l1CustomNetwork, options);
    let ownerWallet = new ethers.Wallet(key, l1Provider);
    const privateUSDC = await ethers.getContractAt("PrivateUSDC",config.contracts.PrivateERCToken, ownerWallet);
    try {
        for (const minter of minters) {
            await privateUSDC.configurePrivacyMinter(minter.account, minterAllowedAmount);
            console.log(`Minter allowed amount configured successfully for ${minter.name} (${minter.account})`)
            const Institution = await ethers.getContractAt("InstitutionUserRegistry", config.contracts.InstUserProxy, ownerWallet);
            console.log("manager: ",await Institution.getUserManager(address))

        }
    } catch (error) {
        console.log(error)
    }
}


async function allowBanksInTokenSmartContract(minterAddress) {
    // NOTE: Changed to blacklist mode - banks are allowed by default
    // This function now does nothing unless you want to unblock a previously blocked bank
    console.log(`Bank ${minterAddress} is allowed by default (blacklist mode). No action needed.`);

    // To unblock a previously blocked bank (uncomment if needed):
    // const l1CustomNetwork = {
    //     name: "BESU",
    //     chainId: 1337
    // };
    // const options = {
    //     batchMaxCount: 1,
    //     staticNetwork: true
    // };
    // const l1Provider = new ethers.JsonRpcProvider(L1Url, l1CustomNetwork, options);
    // const ownerWallet = new ethers.Wallet(accounts.OwnerKey, l1Provider);
    // const privateUSDC = await ethers.getContractAt("PrivateUSDC",config.contracts.PrivateERCToken, ownerWallet);
    // let tx = await privateUSDC.updateBlockedBank(minterAddress, false);
    // await tx.wait();
    // console.log(tx);
}

async function getUserManager(address) {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });
    const instRegistry = await InstRegistry.attach(config.contracts.InstUserProxy);
    let inst = await instRegistry.getUserManager(address);
    console.log("user registration ", inst);
    let inst1 = await instRegistry.getUserInstGrumpkinPubKey(address);
    console.log("user registration ", inst1);
}

async function setMinterAllowed(client,minterAddress) {
    console.log("Configuring minter allowed amount...");
    const PrivateUSDCFactory = await ethers.getContractFactory("PrivateUSDC", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
            "TokenUtilsLib": deployed.libraries.TokenUtilsLib,
            "TokenVerificationLib": deployed.libraries.TokenVerificationLib,
            "SignatureChecker": deployed.libraries.SignatureChecker
        }
    });
    const privateUSDC = await PrivateUSDCFactory.attach(deployed.contracts.PrivateERCToken);
    const metadata = await createAuthMetadata(accounts.OwnerKey);
    let response = await client.encodeElgamalAmount(100000000, metadata);
    const tokenId = ethers.toBigInt(response.token_id);
    const clx = ethers.toBigInt(response.amount.cl_x);
    const cly = ethers.toBigInt(response.amount.cl_y);
    const crx = ethers.toBigInt(response.amount.cr_x);
    const cry = ethers.toBigInt(response.amount.cr_y);
    const minterAllowedAmount = {
        "id": tokenId,
        "cl_x": clx,
        "cl_y": cly,
        "cr_x": crx,
        "cr_y": cry,
    }
    await privateUSDC.configurePrivacyMinter(minterAddress, minterAllowedAmount);
    await privateUSDC.configureMinter(minterAddress, 100000000);
    console.log(`Minter allowed amount configured successfully for ${minterAddress} `);
}

function assertEventsContain(events, expectedEventNames) {
    const actualEventNames = events
        .filter(event => event && event.args && event.args.length > 3)
        .map(event => event.args[3]);

    expectedEventNames.forEach(eventName => {
        expect(actualEventNames).to.include(eventName);
    });
}

async function getMinterAllowed(grpcClient,meta) {
    const Request = {
        sc_address: config.contracts.PrivateERCToken,
        address: accounts.Minter
    };
    const grpcResult = await grpcClient.getMintAllowed(Request, meta);
    return Number(grpcResult.amount);
}


module.exports =  {
    callPrivateMint,
    callPrivateTransfer,
    callPrivateTransfers,
    callPrivateTransferFrom,
    callPrivateTransferFroms,
    callPrivateBurnFroms,
    callPrivateBurns,
    callPrivateBurn,
    getAddressBalance,
    getAddressBalance2,
    getPublicBalance,
    getTotalSupplyNode3,
    getPublicTotalSupply,
    callPrivateCancel,
    callPrivateRevoke,
    createAuthMetadata,
    registerUser,
    updateAccountRole,
    updateAccountStatus,
    getAccount,
    isBlackList,
    addToBlackList,
    removeFromBlackList,
    getEvents,
    getSplitTokenList,
    sleep,
    allowBanksInTokenSmartContract,
    setMinterAllowed,
    // registerConfigureMinter
    getUserManager,
    getHamsaEvents,
    assertEventsContain,
    getApproveTokenList,
    isAllowanceExists,
    getMinterAllowed
}
