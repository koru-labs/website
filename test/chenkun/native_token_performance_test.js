const {ethers, network}=require("hardhat");
const {networks} = require("../../hardhat.config");
const {ether} = require("@openzeppelin/test-helpers");
const {createClient} = require('../qa/token_grpc');
const accounts = require('./../../deployments/account.json');
const grpc = require("@grpc/grpc-js");
const {parseEventsFromReceipt} = require("../sun/native_token_event_test");

const abi = "[{\"inputs\":[{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"tokenId\",\"type\":\"uint256\"}],\"name\":\"getToken\",\"outputs\":[{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address[]\",\"name\":\"recipients\",\"type\":\"address[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity[]\",\"name\":\"tokens\",\"type\":\"tuple[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"value\",\"type\":\"tuple\"}],\"internalType\":\"struct TokenModel.ElGamalToken\",\"name\":\"newAllowed\",\"type\":\"tuple\"},{\"internalType\":\"uint256[8]\",\"name\":\"proof\",\"type\":\"uint256[8]\"},{\"internalType\":\"uint256[]\",\"name\":\"publicInputs\",\"type\":\"uint256[]\"},{\"internalType\":\"uint256\",\"name\":\"PaddingNum\",\"type\":\"uint256\"}],\"name\":\"mint\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"minter\",\"type\":\"address\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"value\",\"type\":\"tuple\"}],\"internalType\":\"struct TokenModel.ElGamalToken\",\"name\":\"allowed\",\"type\":\"tuple\"}],\"name\":\"setMintAllowed\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"from\",\"type\":\"address\"},{\"internalType\":\"address[]\",\"name\":\"recipients\",\"type\":\"address[]\"},{\"internalType\":\"uint256[]\",\"name\":\"consumedIds\",\"type\":\"uint256[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity[]\",\"name\":\"newTokens\",\"type\":\"tuple[]\"},{\"internalType\":\"uint256[8]\",\"name\":\"proof\",\"type\":\"uint256[8]\"},{\"internalType\":\"uint256[]\",\"name\":\"publicInputs\",\"type\":\"uint256[]\"},{\"internalType\":\"uint256\",\"name\":\"PaddingNum\",\"type\":\"uint256\"}],\"name\":\"split\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"tokenId\",\"type\":\"uint256\"},{\"internalType\":\"string\",\"name\":\"memo\",\"type\":\"string\"}],\"name\":\"transfer\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]"
const native_token_address = "0x7634899c18372657bac3eb6198fbc5791e736586";

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
    // const native = await ethers.getContractAt("INativeToken", native_token_address);
    console.log("signerAddress", minter.address);
    let response = await native.getToken(accounts.Minter, "4683979180028596418636960116215541970947703876173175470760849050835674256688")
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
        let count = 200;
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
// testSetMintAllowed().then();
// testMint().then();
// testBatchedSplit().then();
// getTokenById().then();
// testSplit('2e907f3f4092af579be595bb4b04e0ff898c647f1ba2f6aad332556839ed771',accounts.Minter).then()
// testTransfer().then();

// testGetSplitToken().then()
// testBatched().then()
testBatchedSplitForPerformance().then()