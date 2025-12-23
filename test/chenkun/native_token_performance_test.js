const {ethers, network}=require("hardhat");
const {networks} = require("../../hardhat.config");
const {ether} = require("@openzeppelin/test-helpers");
const {createClient} = require('../qa/token_grpc');
const accounts = require('./../../deployments/account.json');
const grpc = require("@grpc/grpc-js");
const {parseEventsFromReceipt} = require("../sun/native_token_event_test");

const abi = "[{\"inputs\":[{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"tokenId\",\"type\":\"uint256\"}],\"name\":\"getToken\",\"outputs\":[{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address[]\",\"name\":\"recipients\",\"type\":\"address[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity[]\",\"name\":\"tokens\",\"type\":\"tuple[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"value\",\"type\":\"tuple\"}],\"internalType\":\"struct TokenModel.ElGamalToken\",\"name\":\"newAllowed\",\"type\":\"tuple\"},{\"internalType\":\"uint256[8]\",\"name\":\"proof\",\"type\":\"uint256[8]\"},{\"internalType\":\"uint256[]\",\"name\":\"publicInputs\",\"type\":\"uint256[]\"},{\"internalType\":\"uint256\",\"name\":\"PaddingNum\",\"type\":\"uint256\"}],\"name\":\"mint\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"minter\",\"type\":\"address\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"value\",\"type\":\"tuple\"}],\"internalType\":\"struct TokenModel.ElGamalToken\",\"name\":\"allowed\",\"type\":\"tuple\"}],\"name\":\"setMintAllowed\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"from\",\"type\":\"address\"},{\"internalType\":\"address[]\",\"name\":\"recipients\",\"type\":\"address[]\"},{\"internalType\":\"uint256[]\",\"name\":\"consumedIds\",\"type\":\"uint256[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity[]\",\"name\":\"newTokens\",\"type\":\"tuple[]\"},{\"internalType\":\"uint256[8]\",\"name\":\"proof\",\"type\":\"uint256[8]\"},{\"internalType\":\"uint256[]\",\"name\":\"publicInputs\",\"type\":\"uint256[]\"},{\"internalType\":\"uint256\",\"name\":\"PaddingNum\",\"type\":\"uint256\"}],\"name\":\"split\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"tokenId\",\"type\":\"uint256\"},{\"internalType\":\"string\",\"name\":\"memo\",\"type\":\"string\"}],\"name\":\"transfer\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]"
const native_token_address = "0x455413b11d8e2cddd1443990349221590684a5f0";

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
    const [signer, minter] = await ethers.getSigners();
    const native = new ethers.Contract(
        native_token_address,
        abi,
        signer
    );
    console.log("signerAddress", minter.address);

    let tokens = [
        '10905053622205438689739027999115239912597380720811595399288006884145536738357',
        '10519509999971084793225904706957460494464595230186142022875960696832366960974',
        '10694312173746923066453951994784672039742994060051175911165582260494482344266',
        '10370119094176972306172511240775284172383198153810103985037890508173601839935',
        '10049302483018309625939913161922941530481695941028893449516103421063183339747',
        '10153449980621794834163425791546919823573562666316006167153574672104660859273',
        '10626152131601749046586119710884659090126679340587751025913694974121461310607',
        '11160844704918862802166424862513886897069707870833504412559916051139162663752',
        '10409712064253944818049590490462302516761126880291184107402043857187515119515',
        '10079709895952366494606168140825840392494515171910722042296575614636148121033',
        '10831027374570781184293989827384556639356664690744767266127336883817831331228',
        '10369142022574585260067544463592989127236967895998189725124588655875427400407',
    ];

    const results = {
        success: [],
        failed: []
    };

    console.log(`开始处理 ${tokens.length} 个 tokenId...`);

    // 使用 for...of 循环代替 forEach，以便更好地控制异步操作和错误处理
    for (const tokenId of tokens) {
        try {
            let response = await native.getToken(accounts.Minter, tokenId);
            console.log(`token ${tokenId} 查询成功，response: ${response.id}`);
            results.success.push({ tokenId, response });
        } catch (error) {
            console.error(`token ${tokenId} 查询失败，错误: ${error.message}`);
            results.failed.push({ tokenId, error: error.message });
        }
    }

    // 输出汇总结果
    console.log(`\n=== 查询结果汇总 ===`);
    console.log(`总查询数: ${tokens.length}`);
    console.log(`成功数: ${results.success.length}`);
    console.log(`失败数: ${results.failed.length}`);

    if (results.failed.length > 0) {
        console.log(`\n失败的 tokenId 列表:`);
        results.failed.forEach(item => {
            console.log(`- ${item.tokenId}: ${item.error}`);
        });
    }

    return results;
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

    let tx = await native.transfer('18106704663288068145491098640877218307881382666044997452210139370058196822164',  "hello word");
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
        let count = 10;
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
                // {address: accounts.To1,amount: 1,comment:"1"},
                // {address: accounts.To1,amount: 1,comment:"1"},
                // {address: accounts.To1,amount: 1,comment:"1"},
                // {address: accounts.To1,amount: 1,comment:"1"},
                // {address: accounts.To1,amount: 1,comment:"1"},
                // {address: accounts.To1,amount: 1,comment:"1"},
                // {address: accounts.To1,amount: 1,comment:"1"},
                // {address: accounts.To1,amount: 1,comment:"1"},
                // {address: accounts.To1,amount: 1,comment:"1"},
                // {address: accounts.To1,amount: 1,comment:"1"},
                // {address: accounts.To1,amount: 1,comment:"1"},
                // {address: accounts.To1,amount: 1,comment:"1"},
                // {address: accounts.To1,amount: 1,comment:"1"},
                // {address: accounts.To1,amount: 1,comment:"1"},
                // {address: accounts.To1,amount: 1,comment:"1"},
                // {address: accounts.To1,amount: 1,comment:"1"},
                // {address: accounts.To1,amount: 1,comment:"1"},
                // {address: accounts.To1,amount: 1,comment:"1"},
                // {address: accounts.To1,amount: 1,comment:"1"},
                // {address: accounts.To1,amount: 1,comment:"1"},
                // {address: accounts.To1,amount: 1,comment:"1"},
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
        '21350816825480577333141102120676617053892918441217241735953636696052225604375',
        '4745825129654455032533893703129013900838866663897749003790969366622225598696',
        '4813758263750543897772908020868249422492544893242163825995221290684106585767',
        '1226065539496860957012371379434010808803929799981691598316000429159181173492',
        '19241688198201817139466250174312269619573416830753679624985134508191332435751',
        '18303189489378600709369794734046902056800461188619302791850036922550150695695',
        '11376603406969987994582448024978395895883496303040409735964054880922168086550',
        '4577034225750352476284376114102530759659148015175975113907495156153569465365',
        '382208582573851191750333969595702288511528832018399544311062737036594789073',
        '2099141328528561932815230735254825034243259767144625223224507787895681804372',
        '6765183097521258569749176203934599806249915004849796168619628136294551431684',
        '20975217844942381523008801639275926150709580778786950205460677401753135047715',
        '16195130313734831413197689085594292754701406959025720686415536681837000044974',
        '11899904674513530641999193099590286829170473664126950290822085893964130617830',
        '580080289417679181866750317500749540002016614505851324175754180058293111001',
        '13324288387494057539210253170602870494169483443290919264559412102499369362299',
        '6082787084695025130873721250894138865282112602603541182562785385375040320485',
        '21634802919871595002497460583209229323130211618160950069964286829701377610820',
        '5030737550036475852667977049689451404420328009711175012256158406741133178911',
        '15352932513620528122818409692311753170859107757063343892112773417154124122522',
        '17803955944033799079977556941435479609067427510370017405716844179673132886793',
        '14058927110418143128769323945319125712493202165024893402123577402377247828340',
        '9235632335549489185795684871309005884374993005023174404482207471850911722377',
        '19018572432885808700479466607464789786095032217397218415733033309376327290725',
        '13169235270394674967967356147996729358630710743703213408059796834535438576508',
        '3649013354636959114797365611512927539353615524673245184847463475472984936463',
        '25342494523186899607679148003025520256189761236345968614173598065820586134',
        '12634220879709230996888934510167986728091466394802157082717092405607461507849',
        '6249549122952658068206951966599875951877857989267272936492449458187787067834',
        '18106704663288068145491098640877218307881382666044997452210139370058196822164',
        '16504503646013263974057035039306845053225822633496134565750064600654175543383',
        '16190066770929703405485847154146855859244319864590340513141240523322959740776',
    ];
    testTransferConcurrent(tokenIds).then(results => {
        console.log('所有transfer操作执行完成');
        console.log('详细结果:', results);
    }).catch(error => {
        console.error('并发transfer操作失败:', error);
    });
}
async function testNonce() {
    const [signer, minter] = await ethers.getSigners();
    let nonce = await minter.getNonce();
    console.log("nonce", nonce);
}
// testSetMintAllowed().then();
// testMint().then();
// testMintSequential().then();
// testBatchedSplit().then();
getTokenById().then();
// testSplit('2e907f3f4092af579be595bb4b04e0ff898c647f1ba2f6aad332556839ed771',accounts.Minter).then()
// testTransfer().then();
// testNonce().then();
// testGetSplitToken().then()
// testBatched().then()
// testBatchedSplitForPerformance().then()
// testTransfers().then()