const {ethers, network}=require("hardhat");
const {networks} = require("../../hardhat.config");
const {ether} = require("@openzeppelin/test-helpers");
const {createClient} = require('../qa/token_grpc');
const accounts = require('./../../deployments/account.json');
const grpc = require("@grpc/grpc-js");
const {parseEventsFromReceipt} = require("../sun/native_token_event_test");

const abi = "[{\"inputs\":[{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"tokenId\",\"type\":\"uint256\"}],\"name\":\"getToken\",\"outputs\":[{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address[]\",\"name\":\"recipients\",\"type\":\"address[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity[]\",\"name\":\"tokens\",\"type\":\"tuple[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"value\",\"type\":\"tuple\"}],\"internalType\":\"struct TokenModel.ElGamalToken\",\"name\":\"newAllowed\",\"type\":\"tuple\"},{\"internalType\":\"uint256[8]\",\"name\":\"proof\",\"type\":\"uint256[8]\"},{\"internalType\":\"uint256[]\",\"name\":\"publicInputs\",\"type\":\"uint256[]\"}],\"name\":\"mint\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"from\",\"type\":\"address\"},{\"internalType\":\"address[]\",\"name\":\"recipients\",\"type\":\"address[]\"},{\"internalType\":\"uint256[]\",\"name\":\"consumedIds\",\"type\":\"uint256[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity[]\",\"name\":\"newTokens\",\"type\":\"tuple[]\"},{\"internalType\":\"uint256[8]\",\"name\":\"proof\",\"type\":\"uint256[8]\"},{\"internalType\":\"uint256[]\",\"name\":\"publicInputs\",\"type\":\"uint256[]\"}],\"name\":\"split\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"tokenId\",\"type\":\"uint256\"},{\"internalType\":\"string\",\"name\":\"memo\",\"type\":\"string\"}],\"name\":\"transfer\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"minter\",\"type\":\"address\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"value\",\"type\":\"tuple\"}],\"internalType\":\"struct TokenModel.ElGamalToken\",\"name\":\"allowed\",\"type\":\"tuple\"}],\"name\":\"setMintAllowed\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]";
const native_token_address = "0x2065aeb20705f8ff647ceca6090e748ecdd71771";

const fromAddress = accounts.Minter;
// const rpcUrl = "localhost:50051";
const rpcUrl = "dev2-node3-rpc.hamsa-ucl.com:50051";
const client = createClient(rpcUrl);

async function createAuthMetadata(privateKey, messagePrefix = "login") {
    const wallet = new ethers.Wallet(privateKey);
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${messagePrefix}_${timestamp}`;
    const signature = await wallet.signMessage(message);

    const metadata = new grpc.Metadata();
    metadata.set('address', wallet.address.toLowerCase());
    metadata.set('signature', signature);
    metadata.set('message', message);

    return metadata;
}

async function testMint() {
    const [signer,minter] = await ethers.getSigners();
    const native = new ethers.Contract(
        native_token_address,
        abi,
        minter
    );
    const metadata = await createAuthMetadata(accounts.MinterKey);

    const to_accounts = [
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
    ]
    const generateRequest = {
        sc_address: native_token_address,
        token_type: '0',
        from_address:accounts.Minter,
        to_accounts: to_accounts,
    };

    console.log("Starting to generate mint proof...");
    let response = await client.generateBatchMintProof(generateRequest, metadata);
    console.log("response", response);
    // 5 recipients
    const recipients = [];
    // 5 tokens (TokenEntity[])
    const newTokens = [];
    var fromAddress = response.from_address;
    response.to_accounts.forEach((account, index) => {
        newTokens.push( {
            id: account.token.token_id,
            owner: account.address,
            status: 2,
            amount: {
                cl_x: account.token.cl_x,
                cl_y: account.token.cl_y,
                cr_x: account.token.cr_x,
                cr_y: account.token.cr_y,
            },
            to: account.address,
            rollbackTokenId: 0
        });
        recipients.push(account.address);
    });
    // newAllowed (ElGamalToken[]) - mint_allowed
    const newAllowed =
        {
            id: response.mint_allowed.token_id,
            value: {
                cl_x: response.mint_allowed.cl_x,
                cl_y: response.mint_allowed.cl_y,
                cr_x: response.mint_allowed.cr_x,
                cr_y: response.mint_allowed.cr_y,
            }
        };
    const proof = response.proof.map(p => ethers.toBigInt(p));
    const publicInputs = response.input.map(i => ethers.toBigInt(i));
    let tx = await native.mint(recipients, newTokens, newAllowed, proof, publicInputs);
    console.log(tx);
    console.log("wait for response of tx");
    let rc = await tx.wait();
    console.log(rc);
}

async function testBatchedSplit() {
    try {
        const metadata = await createAuthMetadata(accounts.MinterKey);
        const to_accounts = [
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
        ]
        const splitRequest = {
            sc_address:  native_token_address,
            token_type: '0',
            from_address: accounts.Minter,
            to_accounts: to_accounts,
        };

        let response = await client.generateBatchSplitToken(splitRequest, metadata);
        console.log("response", response);
        // await testSplit(response.request_id, accounts.Minter);

        await testBatchSplitPerformance([response.request_id], accounts.Minter);
        return response;

    } catch (error) {
        console.error(`Direct burn test failed: ${error.message}`);
        throw error;
    }
}

async function getTokenById(){
    const [signer,minter] = await ethers.getSigners();
    const native = new ethers.Contract(
        native_token_address,
        abi,
        signer
    );
    // const native = await ethers.getContractAt("INativeToken", native_token_address);
    console.log("signerAddress", minter.address);
    let response = await native.getToken('0x4312488937d47a007de24d48ab82940c809eeb2b', "6942366546375406974365613639641394814723361027376872444852209164007263434783")
    console.log("response", response);
}
async function testSplit(requestId,fromAddress) {
    const [signer,minter] = await ethers.getSigners();

    const native = new ethers.Contract(
        native_token_address,
        abi,
        minter
    );
    const metadata = await createAuthMetadata(accounts.MinterKey);
    const splitRequest = {
        request_id: requestId
    };
    let response = await client.getBatchSplitTokenDetail(splitRequest,metadata);
    console.log("batched Split:", response);
    // Recipients (5 addresses for 5 transfer pairs)
    const recipients = response.to_addresses;

    // Consumed token IDs
    const consumedIds = [];
    response.consumedIds.forEach((ids) => {
        consumedIds.push(ids.token_id);
    });

    // NewTokens: [changeToken, transferToken1, rollbackToken1, transferToken2, rollbackToken2, ...]
    // Total 11 tokens: 1 change + 5 pairs (transfer + rollback)
    var newTokens = [];
    response.newTokens.forEach((account, index) => {
        var toAddress = index % 2 === 0 ? fromAddress : recipients[(index - 1) / 2];
        var rollbackTokenId = index % 2 === 0 ? 0 : response.newTokens[index+1].token_id;
        newTokens.push( {
            id: account.token_id,
            owner: fromAddress,
            status: 2,
            amount: {
                cl_x: account.cl_x,
                cl_y: account.cl_y,
                cr_x: account.cr_x,
                cr_y: account.cr_y,
            },
            to: toAddress,
            rollbackTokenId: rollbackTokenId
        });
    });

    const proof = response.proof.map(p => ethers.toBigInt(p));
    const publicInputs = response.public_input.map(i => ethers.toBigInt(i));
    console.log(fromAddress, recipients, consumedIds, newTokens, proof, publicInputs);
    let tx = await native.split(fromAddress, recipients, consumedIds, newTokens, proof, publicInputs);
    console.log(tx);
    console.log("wait for response of tx");
    let rc = await tx.wait();
    console.log(rc);
    await parseEventsFromReceipt(rc, native_token_address);
}

async function testTransfer() {
    const [signer, minter] = await ethers.getSigners();

    const native = new ethers.Contract(
        native_token_address,
        abi,
        minter
    );

    let tx = await native.transfer('6942366546375406974365613639641394814723361027376872444852209164007263434783',  "hello word");
    console.log(tx);
    console.log("wait for response of tx");
    let rc = await tx.wait();
    console.log(rc);
}

async function testSetMintAllowed() {
    const [signer, minter] = await ethers.getSigners();

    const native = new ethers.Contract(
        native_token_address,
        abi,
        signer
    );
    const metadata = await createAuthMetadata(accounts.OwnerKey);

    let response = await client.encodeElgamalAmount(100000000, metadata);
    const tokenId = ethers.toBigInt(response.token_id);
    const clx = ethers.toBigInt(response.amount.cl_x);
    const cly = ethers.toBigInt(response.amount.cl_y);
    const crx = ethers.toBigInt(response.amount.cr_x);
    const cry = ethers.toBigInt(response.amount.cr_y);
    let allowed = {
        id: tokenId,
        value: {
            cl_x: clx,
            cl_y: cly,
            cr_x: crx,
            cr_y: cry
        }
    }
    let tx = await native.setMintAllowed(accounts.Minter,  allowed);
    console.log(tx);
    console.log("wait for response of tx");
    let rc = await tx.wait();
    console.log(rc);
}


// 新增的批量性能测试函数
async function testBatchSplitPerformance(requestIds, fromAddress) {
    const [signer, minter] = await ethers.getSigners();
    const native = new ethers.Contract(native_token_address, abi, minter);
    const metadata = await createAuthMetadata(accounts.MinterKey);

    // 获取当前nonce
    let nonce = await minter.getNonce();
    console.log(`Starting with nonce: ${nonce}`);

    // 准备所有交易数据
    const transactions = [];
    let x = 1;
    let len= requestIds.length;
    for (const requestId of requestIds) {
        console.log(`Preparing transaction ${x}/${len} for requestId: ${requestId}`);
        x++;
        // 获取split token详细信息
        const splitRequest = { request_id: requestId };
        const response = await client.getBatchSplitTokenDetail(splitRequest, metadata);

        // 组装交易参数
        const recipients = response.to_addresses;

        const consumedIds = [];
        response.consumedIds.forEach((ids) => {
            consumedIds.push(ids.token_id);
        });

        const newTokens = [];
        response.newTokens.forEach((account, index) => {
            const toAddress = index % 2 === 0 ? fromAddress : recipients[(index - 1) / 2];
            const rollbackTokenId = index % 2 === 0 ? 0 : response.newTokens[index+1].token_id;
            newTokens.push({
                id: account.token_id,
                owner: fromAddress,
                status: 2,
                amount: {
                    cl_x: account.cl_x,
                    cl_y: account.cl_y,
                    cr_x: account.cr_x,
                    cr_y: account.cr_y,
                },
                to: toAddress,
                rollbackTokenId: rollbackTokenId
            });
        });

        const proof = response.proof.map(p => ethers.toBigInt(p));
        const publicInputs = response.public_input.map(p => ethers.toBigInt(p));

        // 添加到交易列表
        transactions.push({
            fromAddress,
            recipients,
            consumedIds,
            newTokens,
            proof,
            publicInputs,
            nonce: nonce++
        });
    }

    console.log(`Prepared ${transactions.length} transactions`);

    // 批量发送交易
    const startTime = Date.now();
    const txPromises = transactions.map(async (txData) => {
        try {
            console.log(`Sending transaction with nonce: ${txData.nonce}`);
            const tx = await native.split(
                txData.fromAddress,
                txData.recipients,
                txData.consumedIds,
                txData.newTokens,
                txData.proof,
                txData.publicInputs,
                { nonce: txData.nonce } // 使用指定的nonce
            );
            return { tx, nonce: txData.nonce, success: true };
        } catch (error) {
            console.error(`Error sending transaction with nonce ${txData.nonce}:`, error.message);
            return { error: error.message, nonce: txData.nonce, success: false };
        }
    });

    // 等待所有交易发送完成
    const txResults = await Promise.all(txPromises);
    const endTime = Date.now();

    console.log(`\n=== Performance Test Results ===`);
    console.log(`Total transactions: ${transactions.length}`);
    console.log(`Total time to send all transactions: ${endTime - startTime} ms`);
    console.log(`Average time per transaction: ${(endTime - startTime) / transactions.length} ms`);

    // 统计成功和失败的交易
    const successfulTx = txResults.filter(r => r.success);
    const failedTx = txResults.filter(r => !r.success);

    console.log(`\n=== Transaction Results ===`);
    console.log(`Successful transactions: ${successfulTx.length}`);
    console.log(`Failed transactions: ${failedTx.length}`);

    // 输出成功的交易哈希
    if (successfulTx.length > 0) {
        console.log(`\nSuccessful transaction hashes:`);
        successfulTx.forEach(result => {
            console.log(`Nonce ${result.nonce}: ${result.tx.hash}`);
        });
    }

    // 输出失败的交易信息
    if (failedTx.length > 0) {
        console.log(`\nFailed transactions:`);
        failedTx.forEach(result => {
            console.log(`Nonce ${result.nonce}: ${result.error}`);
        });
    }

    // 等待成功交易的确认
    if (successfulTx.length > 0) {
        console.log(`\nWaiting for transaction confirmations...`);
        const confirmPromises = successfulTx.map(async (result) => {
            try {
                const receipt = await result.tx.wait();
                return { nonce: result.nonce, receipt, success: true };
            } catch (error) {
                return { nonce: result.nonce, error: error.message, success: false };
            }
        });

        const confirmResults = await Promise.all(confirmPromises);
        const confirmedTx = confirmResults.filter(r => r.success);

        console.log(`\n=== Confirmation Results ===`);
        console.log(`Confirmed transactions: ${confirmedTx.length}`);
    }

    return {
        totalTransactions: transactions.length,
        successfulTransactions: successfulTx.length,
        failedTransactions: failedTx.length,
        totalTime: endTime - startTime,
        averageTimePerTx: (endTime - startTime) / transactions.length
    };
}

// 添加timeout辅助函数
const withTimeout = (promise, timeoutMs, nonce) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Transaction with nonce ${nonce} timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        })
    ]);
};

async function testBatchedSplitForPerformance() {
    try {
        const metadata = await createAuthMetadata(accounts.MinterKey);
        const requestIds = [];
        let count = 150;
        // 调用5次generateBatchSplitToken
        for (let i = 0; i < count; i++) {
            console.log(`Generating batch split token request ${i + 1}/ ${count} ...`);

            // 为每次请求生成不同的to_accounts，使用不同的amount值
            const to_accounts = [
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
            ];

            const splitRequest = {
                sc_address:  native_token_address,
                token_type: '0',
                from_address: accounts.Minter,
                to_accounts: to_accounts,
            };

            let response = await client.generateBatchSplitToken(splitRequest, metadata);
            console.log(`Response for request ${i + 1}:`, response);

            // 收集request_id
            requestIds.push(response.request_id);
        }

        console.log("All generateBatchSplitToken requests completed.");
        console.log("Collected requestIds:", requestIds);

        // 调用性能测试函数，传递所有request_id
        await testBatchSplitPerformance(requestIds, accounts.Minter);

        return requestIds;

    } catch (error) {
        console.error(`Direct burn test failed: ${error.message}`);
        throw error;
    }
}

async function testBatched() {
    try {
        var requestIds = [
            'dd643983bd418f9e32daf2dfb881d99d9e6dfe3088aec3f997ff6d477290b65',
            '7097b7124d4ef7f13fd41c867c444987920688362d9e8fbe4212a2344b0ea2ad',
            '4d86b80212c47987d705a4a543aa658351c134fc543cac2c329ea1a1ddf20799',
            'c2ef5a010ba0a19205b24f6b0f76f3e45e961da9b421b8cb0fa46cdfdcff7655',
            '22405cafb1f3dc9d5de57a74cde1b49e8b0f49acb27af67339a98a5b67f9fe3c',
            '6f52f9baa814c5dbdb8abc61fed8714fa5db8acade3fd0882ade8dfc29a89058',
            '95829ef864d7cbd9beb3aa7166891813e3862c8a7830e9f0ddba1128d05d27a8',
            '1c3695e8d88dc04864d04a3c66af0f0ead8c64125e17b77058712ea20cadc1b8',
            '8c67eb184690e5d1a55860d83daa8a76df053c5f6f5762febf10258707ad5653',
            '6e391c2bb0f5558b4cc4b7cd4847ce455cef81e87701231bc3ec8376aea8228e',
            '3a3a95b2d87bff0c1f6b833ce66f0dd64bb779efd821e43cd31a9f40d4ccecd8',
            'e7e3d460d5aeea81deb667fd19b41ff80e6269d199938552fbf834c2fa7561e6',
            '480015606e2fa41fadcdabcebb2b06f22eea104a21cf6cd181f49a3114778ad9',
            '835ad44808e4415bd5ce176125a37473698c0f942c515cbd36fbbd4529d23f3d',
            '3c5e25a8abb7789ba8c734b473f28067fe949e37607e81be4b49dbd11670185f',
            'e8e99716b633b2432453243018d808c5b5eeb72e158471befb325d00f0bb38be',
            '2371f6d4ef17a31c5571362cafe412f9ca4476694ec6ecc77b0e98f5eda1d510',
            'fe72c670e760d76138e07af81b6122625add04fa7c352ca9446315852f558d1e',
            'b818200ddb7cf3222dc1e175b0be6c6818ced66564e2ddc1a6ba43782edf296c',
            '36470cd0db4c8ef3dc2922e8fdfc8d59441c63033fbb0df116a4029d7f08b63',
            '899be1584b0d521002ab4ce030360fa87896ae1af74af9a519ca131465c8fc15',
            '93b797957673fcea5c65c88337f2473ba63ad24e433f1ebf501e7f89ac3cec59',
            'a6420a5d681f629af9fa0965ef0d397b5f449e84af0d9641831beaee2be8f18b',
            '82ef0f4e425c6816cd5948b46865fdcf1f70b5fd9ae266a5d502888b06d2b46c',
            '27e698e10fb562beee7489828cefd3bfb24de9ff8f9b4d3d4f7396852c00fe93',
            '3e8f7a4098cf8e0106349f058529f0a662514742164f70e8f1a4f32cb29bbb14',
            '4c22814a30778436e960f35ee16b7ab8ebe508204adb24ba4451652917044765',
            'fd98dfa117c561d5ef3f5f30ca486b7a4acd656f254cf1376b738572dd012d9b',
            'bbfb8c15a23e1f544fea54bf28626e8490d617710c3e4632894f376ac3b7c816',
            'a995e72b04dca21caa4455ca41300a5f960e498e1af50dd41d726ba27a140107',
            '14bc4b885e1dfcf2b1d7515361d5d28cc8797465ccfaa71955c992a320cf2b7d',
            'f9e8b7c814560516c33ccedf032081c0dd9662d38ceba13bc5065c1dbf157e7e',
            '20e670f59e5c574b6806a4822a78978c60daa7e129a9d18f9f7a163942ce2ce',
            '331254621ef07f28ab8140b4cae77ae5c37a7b420b8892faa252df8fef0b0c04',
            '746c457c4d98e5d5562ba288e2cb1036bad52df3b2bec586e188e3075c540319',
            '643ec4123c086465511726c7c62f0e8836ab7a6e1e9e579247c605585a39e1e4',
            '3974c2663f9afce918a3a8a925379f16033b4a54f85a873ae0e1482677e3dc4',
            '9921568be67a7783fad9c444c6db842e365e1748eaad2d76184864e775897155',
            'a00fc2a379c56e606a478a35c8bcedd27bcdf0cf16b01e14c2e308b5bbeacedd',
            'a0f596de16a4b17eb8812154e316e9802316a1554471c189cc697c91c206e8ea',
            'e3b53fa1cb8ecf0d8f1b47867358eb232f7e266c07749ccfd679b8cde53e579c',
            '3c5bded46b98c0e9bd96b8aeeea13291e7c1ebf27de953b03353b472e102e47',
            '986862bebcf207eb245e65ffe6cef13693a307291975c0097bfa51cf7f7d524e',
            '6fe0b023a2b725613ee017e19117967226beef122d534b6d71ebdfa0fdbc5a3f',
            '71aa804eaf2454aadfb8af6e38671b4629b128d2efae3d9ad03953d73e9facc9',
            '95f548abc5325f15c1e7ca090843c529e20f6f2ba83da6f040347fd017b40868',
            'c16a006832d757366161de203e6069fd683541d41f169883fa86b28d6bd8ec69',
            'dd1d983311f91e455b3e2419c09512bddda1b1412b44cd92fb0996bec1b1b3f7',
            '975c760f53070b740533f3d508a31541e447444b00dd1bbd48ccb868b9eec6ed',
            '41b12d4528807c0552196389175e391d018ba830e6fb77479934a5a352173346',
            'b415dd1bbd5bd976c498b58357dec6191f9d9cc8040e6bdab540aeeed1c3b87d',
            '9f6435fe2c2ebdfd867da65f4c5b31360006d32e95ec26a79c5d096c90ef2ef5',
            'bf48a471135332ecdc01e90f6e5b0c41571fbcca028f55e6cef551be1082a518',
            'c06d729775875f3bd15f518b47998013ea5eb1e8eebea13bb70cd67ddfc15799',
            'bf01575c4a64a09290dc0528d2abb86816a86461bc64eaac9fb8b064d1573e1a',
            '6fbb78ef1dac63d934d19a380080ab43fa3f7869b0041716dac260448b73ae13',
            'aad2f1496bd739910b588ebedd81fb4a01bc661d2b93d69a4a713598a87400fd',
            '7cabcd0274b72580da1eb51a20de0a80d1f230f103ec30d822620347fe8b3675',
            'fbbaa49e1772df031c8ba846a52a2f6f34a29dce8dff4533bfcbd448c9c7a0c8',
            '6c87d673525135213c27bfcae48258e186b430c13bdb549aa1666b4a7f1d7023',
            '1117770599cd1892c9c0e7b5a89a71ed3551ebd7862c8e1e96ce9acd58f8f4ad',
            'ae4779dbde13def299fa191872a3a7dfc47c6ed3dba49d0bf7b2ebe6fa1212d6',
            '2a5184d3916635dcf80c370c5f18746dd183390b428245bbc1276dbfa67fa9d',
            'a70419e4bc01586fbd4a16176925a475ca6411ae6fc484f28aae6d59f14e541b',
            'c71c782ae994a18e55dad9413e446b1f9438f77fceba4df97bdf4b402c5f4f89',
            '821ea4676d46fb77420a2c5a8482b15345b713332db99c4195adba666dbc08c3',
            '3ea8c4814c4c015e1cc0c9af4ebe45c78b86b56e978701370cd799f0275f003f',
            'f7222f886f6f667476248dc31d6e5363f1c780b9db5994291384f42e004e1406',
            'ee8adc31058d5e2189217c8cfb9592cd6d2734e0a5249f24d432beb7f8c948c7',
            'cce8a1165b21cc80fdefecf46c9425e1f37c9e97b6b8499d239e7d521a7c9193',
            '73d63f96f408556469915f7c896af2f5239bf528f0592ba04c408b373de4202c',
            '845f99157c89966f768cdc641d188c69b1bfd9cab38f074a65d93159b70347e4',
            'ec52334fc0cc170542975c855d1bf68070c81c4e5460da56566f76402cf003dc',
            '3d036a8684d714700c1f0a0cda6c53b4bd29f679dad2fa2ad53acf2f713f77d8',
            'f7afbd182d1d68599eef93061fcc4fcdef8c2238c622e8bb6ad0f98a3d28e019',
            'fcee887a0ac0a796b6959d0ebc800b1054f35f72994b8d9ce34d42d6844907f2',
            '7934f491fd758d5e6f6409e2802fa19592766ce5540ce15201a0448495e1e0ca',
            '4177e66fc7f5fce779e76b8c1ddf87875f84c6c76be8c0c64bd9aca8e3a0d53c',
            '860904ef423017e5f6ca4ade9df877dd59957f8dbfc7e11a5e03c4a657d73238',
            'f484f5242268c62f503ba30fc77d2f1c78804085e903a2943189413c3f24b7b9',
            'addde93772ffa7802ff3e9f579ca92650e6b767b5cc451b8e045217fa5f4d828',
            '1ba324679a2f475feb4c8f7f613154d6a29bdb98825f0a712c8126b05fcd4f35',
            'cb33986a96a59263bd87a0fae699d22095e491983fa1835a3a7d9f4b575e09d',
            '54c4315bd41286f6ca94c8161ced76270e6a1d015e230fe4c45da9af94869e36',
            'ce1a383ec5baf3dbf9ed6be58654a2b6913afb45ad2ee3fd94fa79ab773626ed',
            'ce39b500b127deae3277cf049c737d82b3db5acb539275681146f4e5f7fe2e10',
            '2080cd635385075eecf168c3642f55d62eb686981788483e65901587c93a9056',
            '6d29a6d2bd6fb43337c2d325f11b124074ec83186ce01cbc0a41b99da197937b',
            '5c507d5825db179a47c06b583ed88f27c35b9c88ac56214ed0bc7f28558f82b7',
            'd18c1e64a8ecc9b48914868e5fbc16b41a764fc4c6a42563f1788ce1c6560e04',
            '4603ab541f2bd3a56e898b8dce3fe5e09eeb521f9d4fe449444f025788adf4e0',
            '3fbc8a6079b6786a56b13be53fe124cce1f8bd932fb4e1d708670ccd51aab7e1',
            '578fa46ea8648b3185dd21e589d6f45693d8571d65cba1c53d947c8bf80ba65d',
            '46cd9bc194487a6040ae3c1174effabc79abda81b405c495b7dab316995ec8f2',
            '2a1042b86c05687500622aa4ead0fdc82ce155f4b361bcc92a4254153d37ec68',
            'a878c41b5ef6042989cbb11e7508161f9c7e9bb9b7471f5cbd57201339a41b17',
            'f617aa2b7f97fb8d6b94c3e9b07036309ab0ddee73cef25d47e9d4d594c81d46',
            '4d4b0c3b8c4c147e2963e31243ef825c7d9e71771c359b48637542fbc2c37867',
            'b8b44a2f9d8a007f8887425b400d4b96ea2e211379a15dcd30567f72af794522',
            '80706e7422101875b2c1f67d41d8af8c4a18a5150d138b0b1eae6c81d7acb33a',
            'f2f255c02acb5aaa3a3ca620cb1a495a03d9b899ee829d423733f4970a4def71',
            '1971d8225fdc447d01749dadc95671a9210ca2a5f27acce28a58c0d61ebc5740',
            'c6135b5a62bb9876aa2538fbc89fdc7e069334d34cab7c387c0f98b55d8b25e8',
            '9aec1b2b2ddc3f5da4a3af54b0a14eb4b690818e33e7b9c4bca980bebe00622b',
            'c24788782921ef91c83978eae6db01792f0534af7bad63bee54c8a131ff967b1',
            '3b6c19149fc5bb5ee16d463b928b5bdecb03cb27881073f5bc112c7a1a293cfa',
            '749fa12d3791ba01567a19d7ce2ccee47097ae33b260c5a0ecfd5843e3133fec',
            '82c4624f102f97501c8c6599a46e73bf67ee4928bc5ec1ef434f5f5c2a099eb7',
            'a982e838974738ca5cc1d765b6ba1f6fa31fca907c751f33aa45335a1c67cf48',
            '8c4ae69acfc4bff2c3db7c66965b88bc2bc5b643ba023e022f180197a3ed2a59',
            '11ac328e9cc368c6f19f395944e034ed7a68000601fcab02d523dc69f865d545',
            'c0f1e49bbaff5518e93e18d0774b23f379feef82470324d90e7613e37d91574b',
            '6a5330220fad1d514ccf60cb7d55761509437ce75e417836bd77d09381e094d1',
            'eec83f09ed92b220d203436122f4268d4f52a65ca29cd743ac456ae022e1add3',
            'ad0c62a46bad1ea0462b1f8a1714a152f5ee2fbf4eeaea3a9c9897fad923e99b',
            '5b07fbafbf3dda46e54fc9f018c4f3e26d5cf335fb1e4430397f7d3f5f8c41ff',
            '9b7c03b1bb205909163f0d54cfdc6717c348f7d7d7fbed7d8457c365e3983021',
            '4e7a4dc573eda706599317caabd8355417cd699b150891da7d87fd79179a9dad',
            '4310e42f78e8b7baed1bb75fdeceb45643ab9ae909b6a41fa77b019489fa7d42',
            '69eb8e7c4a095ed502b3248cc9f988406c94537739bb290ac191f316127989cb',
            'f593974923be0fd84870fffcf4d72dd2b2fd51afa3d954ea5232d8af92874b90',
            '2dc55017f0fb9292f2b3653ca0c4f50d8f84068fbc26976013d4c3f532c6c483',
            '49e43538ac8becc832d05b7aa2975a54577b603c7a3dee0893241db1bfc63e64',
            '1b1da4bee4bb982727a120057474da993194a919d22930dfe9e419421b5ba03e',
            'b57fadc4f6cd6aaff4ccb7f7c0669b2bdfbdabdd52865effe8ab84eaccb25d3c',
            '8cbb0a5f61a26529ffe095969c15eebc10cf80d8dbb94393084ee5cd91ca0549',
            'f28f64ebbb6f38286afbe8b83b804868d559e14c5e61ad981518079a5fc58322',
            '2ec47f4fab8aec7fa759ceeb0b7fc2c8887bf72949637d9ea682a1aecf7774cb',
            'd2532a15b80eb82a532db5a08033321c5f8b8b471017a2c9c770f6b963d5aa07',
            '2e3796857465de8ec59a430e0fb1f957b5d52d49d2772219a635520b357ac7cf',
            '94b553f00743f3e5609387828db7917e3b5bd246e3e3872a7261ed3e1c2908fe',
            '89daf097337d21921bf38face7bf2cfdb7638e9975ec674f5f0157680a0a49c',
            'f219e2ff537c8fc63a8663dcdab8fc6bcb8b8a5df5a18226803ecac5654010e5',
            '3106ac753f0ac986800418985df29ad466a293f6100c50fe2635bde4d00205bd',
            '9cdc9586a4202d312ed28ebdff311e33729c88426686ab4a28efc9654a33cb2',
            '6014f36f15f88b1101a206e137eecd0d2923e2bceda3585256a2f34b5264511e',
            'c250f6eecdbb4b1089f764a8260777ffe0e03a73f640eb76ade28109efe63037',
            '6b31d4630f691be55a66b4847de9efda7bfe28031fb3cca3b2782e03b04976d5',
            'feaf1bdf82cf5ab7361752ddb3358d991806dab0241f2e51fe02a1c8093a498d',
            'dc8747ca93973230a310715d31625d6e6b30595c785261f6dd3d19f89ab98c53',
            '623203516a78d8e106b9eabdb0061c2087bc60895dbd2cc04f0932da5048446c',
            'ac3b6d56bff5fb4e95906b9c95422458b34d4fe3e1ba4b0c97222b9453868220',
            'f933a72fda2290179f4f7ff5534e4f5ae2a34f490c1a6bee3e0b4a166d80a69d',
            'caa5a74dcd6a53ed0a167b41f0740a703f579d8757569db53e4ab5ccf49b95c7',
            'd684517b26a37730936497f2d49259f6508f546a3dc57bfce945eff7dbef7bc5',
            '812bae846b8f5ec97c996ea5258458358e9c6b3320503d5b9bb57bccc7422797',
            '52611fc5fe9351b0cb1ae75e47211c41e7799be720437dce05c28ad6520843bd',
            '34a59f470816bd2109847e6d94e659a132f0b6ebb9032da51de7c162549a2374',
            '8e1f03b54f5425bdae74f48aca90b32f0b3787bc86e4eb0f8123c2fa54fe3a0f',
            'd8f38bc4611c26c53648eb9986e1e76821dc1a7e0cae4292dfcc3593559e9438',
            'e681eed6a7e0e53107f5e6aafa2a9a16cf383dd1112eb9e567dfca60f091418b',
            'a08bc84e10e94d59cfc7252a6a6e3e24ea95ecac163a6c74e7b710c6ea4f41c',
            '1032c5d97be7e2cc071f9323139ab3b0c45e61f7c71062ffc42330f8cd368125',
            '9ffb13e4b84e0ed6fef0825cae0e7458807f72e27fc798b3455bacc080a734a9',
            '70c9c68a20d40bf9df7d320d8a6ad2b1d08844269161873eb317b2ed95f650e1',
            'dea2fde1f6276f0667e4f59c9d37232c39a089038299fbf95e2887907c7c8b74',
            '2d0edcd7ef7a3b9f09522a56066572e8e1d2c80a95c57e540f2d413d057abdd3',
            '2e057605b093defc440b779be324302581a5b95c5a2b7407600d91b9e288c6cd',
            'ee8ee7d2e369851631b3bb73e203f1f8eda7c36cf743d93fd802f7e3c6a6713a',
            '56f5df877da05b1bdeef0469ec5c2b98458735dca6507a369a1cf0419e32e5e1',
            '98a77f92dd8f376b6aa55be781736518b4df3236dbc112809156a4738a3ad4a6',
            '70b318d8b2645006c2c434dbdd34aa7c7c72f94227d33860de06a31887973c11',
            '956e6f0782231c5b39482e5619a59f51c8c23f5df35d7c4d8c8f5e837407b513',
            '8686e6d2f061febd9a3e19ae603816b12019edbf3dc5841dde7db326c03f4d7b',
            '2fe7e2dd2d4cee05f24eb869d39244b57e289ae66e445095658447fc7cac4f48',
            'fedb279c3ab95b67271ff2f9a11a5be101bf51a4c0c946bf55d7b821a48113e1',
            'f8420273905e614649496c7bc6e6ffaf5350fdebe2a5545f23c01a76f27093ac',
            'c5290c5ff701887f6240cfc6fa08d6cd48dda4acb4a00b01ea93ec5103d2b625',
            'd0df6d0b3584a9f83c973d2692b74e4f60f54513bd2287d971d2c45b88ba9cf5',
            '654ac2791717ec841f772e3cf6e770e82d2d8fa912a28d73635cd571ecef8375',
            '3a487edc649fc7c601d9f5b6f9eec7a2129b0cc6d29213892a5a8c90230d727b',
            'aa97ac69d21a1e61c8e6cdee33a1cad4c0cb33a47836c0bb34c056097af7b8ac',
            'e6ee1fcd1026174b08984406e523d4133facff670225955d99d24876f238615a',
            '9f8ac46cd67709845898ed752d312128bf62608520154f6f112e68599d3f79f5',
            'ece449e4391dd41e1143aa2d08934900f5bea519c353f7f225065f6eb6e1a756',
            '9a88e7423fa64c82a251ea81430159198d9e492010be7a2b42689edf28c8fa5f',
            '1dc09a54141b9cdccdb586a5b9970b61fb3047df42ed8c05e97cd449dff21369',
            'dff9621e8bfd19947202d2154841b2718a4029a4ba386c65a2431befd494cc5d',
            '5cb56b853c324dd0aa8f6bb3ee9285d6cab21c78ef7b323e9474ac2270671e1a',
            'b1fc8198281300cb0f8e7e2bfe809b5ee6e5154cb718238a7754ee75337dd03',
            '4ac2d8b3aa2bf7fb899cd891f7ada77fef554934dd904537fc9c2ea7a2020a94',
            '9c1ebe7d2147ca3ba9542eae7fedf729efe334a9d22673cb9d9669276fad7171',
            'df7d31b8e877722af92d19714587c323157de5b2d7c7d9cd7116240184c303ac',
            '1490a432070373b44378e20c70f0c87943c39d732c6663b3869710e2d26da54d',
            'c6591af46cd50aae99a4c1367709b40b9de7bbe18d14ea2d9f0ac00d8889ca75',
            '9f486abdb32f83c2b475330953bf19ea555eb9c83fb8b60868de8bda75d2ac44',
            '91e445e444d4502c86438b248c101a26734c894d6275555a2b0381478654810d',
            '6af130cb1ffee7404f3bcdd5c3d63d2e937398e549315561b8815fe9b33d7d7c',
            'e55939b1b2a8875cc3961d596e50a6c5bf629ba2d3ce7566e8f0bc4fda2035d',
            '275047e0431b83ee16f29617b578a2383751ed30168d48c1a410c107936bdbe5',
            '37879f29b8d264a34d66685d16f2f1c141f80800591e4d2f473aab775044fd24',
            '1d5e7d75fbc88d125175642c07b2d28f034801c91e65a6b8149eb92b2829a108',
            '95ef1f18bf62f7e8e8d4254c38360ad385f2f1cf13b2095ec1e8d48f6a84041d',
            'ba47beb0372560ebfd175dd95f1d56d3353760291d9e2158426755974f5d0779',
            '6573e6ba2e0db2363d60c9afd5c4024e9266bdeb34b42c710bd95826e63ce043',
            '551f031a29c90be5e3b6266760c298dfbd36ea7fc7da4d896148b5162d9220bc',
            '58774571e45e82f8a741b88160270d7d13501386a644714d68bb8212de8a5497',
            '7a1eb19ae55750cee26f1e80a5240111373adcdb9781e79db6c9f655a110e13',
            '5104a1b60d11dff870c0c2e77a9bcafe7be440f03284ce27dc270bc63e32c950',
            'e2e643e9be89df30c06481391ea27032665694ececfa8363055366217f2f1196',
            '7d1459be98753d0415001e4fda80df8b60db6c78ee611a3b64b8a52944204029',
            'da3cc0900d2e70c797da0080bfc220a9ae5304fef996eb0f5dfaedf787870f5d',
            'eb6ea9d2671875d5ab75542a7b2894190ed8491516a9abe483d4895abee6a8c8',
            '5873bb3e536ae621a7cef8ff846cce5c3ee6cc22d0f7e084db0db6e6aceb50ee',
            'f558341bdc96f00f7ab8f85cfac90c8726b3641b530a2d83efc89ee798d06904',
            '7a443af025719a1b2beb010aae806da0582539d6dc003fe6d231a3f7c7db013d',
            '858171902ed20c922e48a6db343c89f5aa66238b3d83d55e4aa80743694d70dc',
            '7d669c9d80c5b656c7a1c3fe27fc09cd84234494d31b78af189ddbbd7f978176',
            '6ecb2068a224a0a21b49af6d984446673f8affccdb571e9a17a05b911f340ede',
            '97e392a4d9c44382a766a3249678028176f8f03cf395a78b168bee94f351ea74',
            'fab3a018e3fae6d7e1daa7a8c589314385a1e000c60ad44b46b2c7df5861e6c4',
            'f240c3ec165b2268e82f991c501a19447571704f5b1bde7e335f83f77fdc93b0',
            'e318afb18e92af42fd0f54b0a22effe79280e709be72ab2c5f5c2ce7a7d0f78f',
            'c2a9cf137f555ba8ee4c8f6c3c7444f6593b130dd8a92b3b3ca49ec364fbb363',
            'ce7e1ce79fb3a6908a139aaaf9801510d1aadda07634968001cefcd19828e901',
            '1138c3c849026e292302f8fd37ee61152b94bf7be52b6de4c7fff57edb3c3b56',
            '87ec33feeba567b83c6e4ca0f76e104dfe0b0f0bc6de02af8c4dc5470a3a96c4',
            'f32bfbd630df2f8a0e70e7e9d53d422717462d595a1842117443615d1752add3',
            '132d74999991a6d78468b55fa612bc4a9121545a421ecc1452ce1734c5db2793',
            'df3439c546f86b075143519432662bd0c99f1d0c869721e36680b281ac839edb',
            '21b2c8a983128284fe36f505d41d065bbb7edbb73420d26b43e6b71dd32e7989',
            'f0f1f9259fe20d6597394b6b319c84aa9962f656028eaa7f4c28274c76697fa5',
            'f42dcc00c4863ca71d8047043d96f4b46521ff93814c25ed4fff47f5428e3724',
            '6ea5a437d40c4c0f86def39f2d0207f796cd19e7e900b7e608099d7a6fb7179d',
            '5d47d6bb58954c50f06370140fb318e76d385d13e946e47581700d23c1816b52',
            'b310b46006a2a93d29e5a5e0e83385c8abd02f1d9139b55f02a260b1dc69753c',
            '91a6df067850b9a90f9f375c6b387f7095efa4d37bef2911c3119a62342ffbda',
            'f30fbc706986a36d81fb457dde4ad551989ee64df8c2c2d742c8d72aefb8667f',
            'ef4f94eda11d514be71891305e5c87b866c663b02bae029415d5ae7c91b1198',
            '37e07e28cb3a057834875acc2afeee5ef5f5b76135902c0ef73e2ab9900114a2',
            '79861642c8a6c177de9bf7321699710ae7c36d99d6d2311f498ae4539e8d8d5f',
            'df2380a1adf7318fc8fa309aab284f8d642943527fec99d7ee1fef03bc5645c9',
            '7172e9a98f6075248286c54bd2662378482cf09fd75b1774dd77e446b1a51744',
            '2da11f4d0ca48b06a6905de60d08e50a326c9d57c59f893826a0e07c4ef389d',
            'a42ecfd5e0bb23d7b5cf7f6590d8e749a1e23833cf5ee4381581f2a63e6e04c0',
            'a15e7199fafb8526226e818dcec506c0e4654904c820127e2a697a8fa14165ab',
            'b834e4ca29cebb54e69b8b816af43578fd7c367606167a1c718b3035d25db3fb',
            'b2c1b431597b15130a5aef7739e2837f369b57b2b9d0243a31733539c76057ce',
            'e001fa73d3d9ddd00623dc2d9dc2746b16066bdefc8ce2da56762f42a15bb1c3',
        ];

        // 调用性能测试函数，传递所有request_id
        await testBatchSplitPerformance(requestIds, accounts.Minter);

        return requestIds;

    } catch (error) {
        console.error(`Direct burn test failed: ${error.message}`);
        throw error;
    }
}

// testSetMintAllowed().then();
// testMint().then();
// testBatchedSplit().then();
// getTokenById().then();
// testSplit('2e907f3f4092af579be595bb4b04e0ff898c647f1ba2f6aad332556839ed771',accounts.Minter).then()
// testTransfer().then();

// testBatched().then()
testBatchedSplitForPerformance().then()