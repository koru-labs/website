const {ethers, network}=require("hardhat");
const {networks} = require("../../hardhat.config");
const {ether} = require("@openzeppelin/test-helpers");
const {createClient} = require('../qa/token_grpc');
const accounts = require('./../../deployments/account.json');
const grpc = require("@grpc/grpc-js");
const {parseEventsFromReceipt} = require("../sun/native_token_event_test");

const abi = "[{\"inputs\":[{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"tokenId\",\"type\":\"uint256\"}],\"name\":\"getToken\",\"outputs\":[{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address[]\",\"name\":\"recipients\",\"type\":\"address[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity[]\",\"name\":\"tokens\",\"type\":\"tuple[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"value\",\"type\":\"tuple\"}],\"internalType\":\"struct TokenModel.ElGamalToken\",\"name\":\"newAllowed\",\"type\":\"tuple\"},{\"internalType\":\"uint256[8]\",\"name\":\"proof\",\"type\":\"uint256[8]\"},{\"internalType\":\"uint256[]\",\"name\":\"publicInputs\",\"type\":\"uint256[]\"},{\"internalType\":\"uint256\",\"name\":\"PaddingNum\",\"type\":\"uint256\"}],\"name\":\"mint\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"minter\",\"type\":\"address\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"value\",\"type\":\"tuple\"}],\"internalType\":\"struct TokenModel.ElGamalToken\",\"name\":\"allowed\",\"type\":\"tuple\"}],\"name\":\"setMintAllowed\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"from\",\"type\":\"address\"},{\"internalType\":\"address[]\",\"name\":\"recipients\",\"type\":\"address[]\"},{\"internalType\":\"uint256[]\",\"name\":\"consumedIds\",\"type\":\"uint256[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity[]\",\"name\":\"newTokens\",\"type\":\"tuple[]\"},{\"internalType\":\"uint256[8]\",\"name\":\"proof\",\"type\":\"uint256[8]\"},{\"internalType\":\"uint256[]\",\"name\":\"publicInputs\",\"type\":\"uint256[]\"},{\"internalType\":\"uint256\",\"name\":\"PaddingNum\",\"type\":\"uint256\"}],\"name\":\"split\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"tokenId\",\"type\":\"uint256\"},{\"internalType\":\"string\",\"name\":\"memo\",\"type\":\"string\"}],\"name\":\"transfer\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]"
const native_token_address = "0xE752b9013333Ae56C0DbEF69F66beBE227a3388A";

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
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
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
    const bathcedSize = response.batched_size
    console.log("bathcedSize", bathcedSize);
    let tx = await native.mint(recipients, newTokens, newAllowed, proof, publicInputs, bathcedSize - to_accounts.length);
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
    console.log("signerAddress", minter.address);
    let response = await native.getToken('0x983b4bA7e42E664dDBfe4ed3E0Ea07D90EFCc13B', "4385598658768795221101503380093200974804168076317207794219303818609721418979")
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

    let tx = await native.transfer('3240122696165267122125630750990396030503503895201738639543917722614805737645',  "hello word");
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
        const bathcedSize = response.batched_size;
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
            bathcedSize,
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
                txData.bathcedSize - txData.recipients.length,
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
        ];

        // 调用性能测试函数，传递所有request_id
        await testBatchSplitPerformance(requestIds, accounts.Minter);

        return requestIds;

    } catch (error) {
        console.error(`Direct burn test failed: ${error.message}`);
        throw error;
    }
}
async function testGetSplitToken() {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    let tokens = await client.getSplitTokenList(accounts.Minter, native_token_address,metadata);
    console.log("Get split token list response:", tokens);
    console.log("Get split token list response:", tokens.split_tokens.length);
}

async function testMintSequential() {
    for (let i = 0; i < 10; i++) {
        console.log(`开始第 ${i + 1} 次调用 testMint`);
        await testMint();
        // 等待一段时间，例如1秒
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log(`完成第 ${i + 1} 次调用 testMint`);
    }
}
async function testTransferConcurrent(tokenIds) {
    try {
        const [signer, minter] = await ethers.getSigners();
        const native = new ethers.Contract(
            native_token_address,
            abi,
            minter
        );

        console.log(`开始并发执行 ${tokenIds.length} 个transfer操作`);
        const startTime = Date.now();

        // 获取账户当前nonce，用于显式管理nonce
        const startingNonce = await minter.getNonce();
        console.log(`起始nonce: ${startingNonce}`);

        // 创建并发的transfer操作数组
        const transferPromises = tokenIds.map((tokenId, index) => {
            return new Promise(async (resolve, reject) => {
                try {
                    console.log(`开始执行第 ${index + 1} 个transfer操作，tokenId: ${tokenId}`);

                    // 为每个交易分配一个唯一的nonce
                    const nonce = startingNonce + index;
                    console.log(`第 ${index + 1} 个交易使用nonce: ${nonce}`);

                    // 显式指定nonce发送交易
                    let tx = await native.transfer(
                        tokenId,
                        `hello word ${index + 1}`,
                        { nonce: nonce } // 显式指定nonce
                    );

                    console.log(`第 ${index + 1} 个transfer操作已发送，tx hash: ${tx.hash}, nonce: ${nonce}`);
                    let rc = await tx.wait();
                    console.log(`第 ${index + 1} 个transfer操作已完成，receipt nonce: ${rc.nonce}`);
                    resolve({ success: true, tokenId, txHash: tx.hash, nonce: nonce, receipt: rc });
                } catch (error) {
                    console.error(`第 ${index + 1} 个transfer操作失败，tokenId: ${tokenId}，错误: ${error.message}`);
                    resolve({ success: false, tokenId, error: error.message });
                }
            });
        });

        // 并发执行所有transfer操作
        const results = await Promise.all(transferPromises);

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        // 统计结果
        const successfulTransfers = results.filter(result => result.success).length;
        const failedTransfers = results.filter(result => !result.success).length;

        console.log(`\n=== 并发transfer操作结果统计 ===`);
        console.log(`总操作数: ${tokenIds.length}`);
        console.log(`成功操作数: ${successfulTransfers}`);
        console.log(`失败操作数: ${failedTransfers}`);
        console.log(`总耗时: ${totalTime} 毫秒`);
        console.log(`平均耗时: ${Math.round(totalTime / tokenIds.length)} 毫秒/操作`);

        return results;
    } catch (error) {
        console.error(`并发transfer操作执行失败: ${error.message}`);
        throw error;
    }
}

async function testTransfers() {
    const tokenIds = [
        '1959638575550990603320548750781691395032427107305952096002298799845415140525',
        '8962815611116123569610421009364173946262796802819620336139590999795083329913',
        '21866601158687426373179398453393658086397047655792553425064046538505616897707',
        '14843313671378035743446088870588153531594818848011361150837369189521373956943',
        '2373861657360026689896294442169029271610896378061725307365638434424158556533',
        '18919140638282579923933478153861055104765893530973370482959480708177277253296',
        '11023446684178911882316150860878885011138918037692984505928866666803741898304',
        '15144217353832658690604150561327639919863975952673566260034014910963899607467',
        '13704401578236207559314982550539508056957987819927280923469053232215817115071',
        '7628953566750631722381128650397781208247395195368718079551418542046388076232',
        '3876877179757234547002860863912097261435928869442332322614684336741995474822',
        '12548863085420229163763492203305369316117212986684178431731691584147406092174',
        '1053683940063761641171888137324607349177529231632068787377011960444577197324',
        '8805325156418013850186169514347393576057448937293326417051025387064156725955',
        '18092067383437205026149342538690327532043532150669035635650698225884599547407',
        '13502864120574229960520802400865357072600021234202953073787942728254712945449',
        '17140478961380858998307426358212306428639344482390389365962562121420983386759',
        '11705963622057369580625327992118494635482961326166607598188108028986738922233',
        '16010429620173833918508823732547949929721243898636874530296023478564807597745',
        '3859868357652196277317340304061771849258042891761020180735788680577937243371',
        '19450892471605054657087860657316113413524922841742285057700833790499341321759',
        '12018721373316406290752153658341151698520267298137281451358569296817933738336',
        '7056568821158080402947299942524297504137250232867873304076689692122530737716',
        '8016247909526787537174479097796479950570602822722989289001802089209640565795',
        '14967660985379114534527249564474006636733614414951246739882880582583955099336',
        '557914357004437658977419154319122846067387511674974799839579155755575321986',
        '11529309480424318153958479800963969892212232177571686613426207406088702384219',
        '20467417085197104215371503493571265087079892088679792261539306387120702607242',
        '4385598658768795221101503380093200974804168076317207794219303818609721418979',
        '373292785665268722327308623597187901202723023011143006276633832026027851028',

    ];
    testTransferConcurrent(tokenIds).then(results => {
        console.log('所有transfer操作执行完成');
        console.log('详细结果:', results);
    }).catch(error => {
        console.error('并发transfer操作失败:', error);
    });
}
// testSetMintAllowed().then();
testMint().then();
// testMintSequential().then();
// testBatchedSplit().then();
// getTokenById().then();
// testSplit('2e907f3f4092af579be595bb4b04e0ff898c647f1ba2f6aad332556839ed771',accounts.Minter).then()
// testTransfer().then();

// testGetSplitToken().then()
// testBatched().then()
// testBatchedSplitForPerformance().then()
// testTransfers().then()