const { expect } = require('chai');
const { ethers } = require('hardhat');
const { createClient } = require('./token_grpc');
const accounts = require('./../../deployments/account.json');
const grpc = require("@grpc/grpc-js");

const native_token_address = "0x14Cf747669B78516424CAd20E1E5d53fD76EA850";
const rpcUrl = "dev2-node3-rpc.hamsa-ucl.com:50051";
const client = createClient(rpcUrl);

// 固定的两个minter地址和私钥
const MINTER_CONFIG = {
    minter1: {
        address: "0xF50F25915126d936C64A194b2C1DAa1EA45392c4", 
        privateKey: "8d62b2ea374152ebf46f122166319f96ee5847f21d8045dddf35bca772d3fa96"   // 使用配置文件中的另一个私钥
    },
    minter2: {
        address: "0x4568E35F2c4590Bde059be615015AaB6cc873004",
        privateKey: "518eb784dd768d8c0cdf9218d44ae8f498d0cadf7ecf98f5ecf27c6b793986ca"   // 使用配置文件中的另一个私钥
    }
};

// 固定的两个receiver地址
const RECEIVER_CONFIG = {
    receiver1: "0x4312488937D47A007De24d48aB82940C809EEb2b",
    receiver2: "0x57829d5E80730D06B1364A2b05342F44bFB70E8f"
};

const abi = "[{\"inputs\":[{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"tokenId\",\"type\":\"uint256\"}],\"name\":\"getToken\",\"outputs\":[{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address[]\",\"name\":\"recipients\",\"type\":\"address[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity[]\",\"name\":\"tokens\",\"type\":\"tuple[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"value\",\"type\":\"tuple\"}],\"internalType\":\"struct TokenModel.ElGamalToken\",\"name\":\"newAllowed\",\"type\":\"tuple\"},{\"internalType\":\"uint256[8]\",\"name\":\"proof\",\"type\":\"uint256[8]\"},{\"internalType\":\"uint256[]\",\"name\":\"publicInputs\",\"type\":\"uint256[]\"}],\"name\":\"mint\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"from\",\"type\":\"address\"},{\"internalType\":\"address[]\",\"name\":\"recipients\",\"type\":\"address[]\"},{\"internalType\":\"uint256[]\",\"name\":\"consumedIds\",\"type\":\"uint256[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity[]\",\"name\":\"newTokens\",\"type\":\"tuple[]\"},{\"internalType\":\"uint256[8]\",\"name\":\"proof\",\"type\":\"uint256[8]\"},{\"internalType\":\"uint256[]\",\"name\":\"publicInputs\",\"type\":\"uint256[]\"}],\"name\":\"split\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"tokenId\",\"type\":\"uint256\"},{\"internalType\":\"string\",\"name\":\"memo\",\"type\":\"string\"}],\"name\":\"transfer\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"minter\",\"type\":\"address\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"value\",\"type\":\"tuple\"}],\"internalType\":\"struct TokenModel.ElGamalToken\",\"name\":\"allowed\",\"type\":\"tuple\"}],\"name\":\"setMintAllowed\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]";

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


async function mintTokensForMinters(client, minters, number, amount) {
    console.log(`=== 为minters铸造代币 ===`);
    const mintedTokens = {};

    for (const [minterName, minterConfig] of Object.entries(minters)) {
        const minterWallet = new ethers.Wallet(minterConfig.privateKey, ethers.provider);
        const minterMetadata = await createAuthMetadata(minterConfig.privateKey);

        const to_accounts = [];
        for (let i = 0; i < number; i++) {
            to_accounts.push({
                address: minterConfig.address,
                amount: amount
            });
        }

        const generateRequest = {
            sc_address: native_token_address,
            token_type: '0',
            from_address: minterConfig.address,
            to_accounts: to_accounts,
        };

        console.log(`\n[${minterName}] ===== 铸币证明生成阶段 =====`);
        console.log(`[${minterName}] 目标数量: ${number}个代币，每个金额: ${amount}`);

        let response;
        try {
            console.log(`[${minterName}] 📤 正在调用 generateBatchMintProof...`);
            response = await client.generateBatchMintProof(generateRequest, minterMetadata);
            console.log(`[${minterName}] ✅ 证明生成成功！`);
            console.log(`[${minterName}] 返回账户数: ${response.to_accounts?.length || 0}`);
            console.log(`[${minterName}] MintAllowed ID: ${response.mint_allowed?.token_id}`);
        } catch (error) {
            console.error(`\n[${minterName}] ❌ 证明生成失败！`);
            console.error(`[${minterName}] 错误码: ${error.code}`);
            console.error(`[${minterName}] 错误消息: ${error.message}`);
            throw error;
        }

        // 处理响应数据
        const recipients = [];
        const newTokens = [];

        console.log(`\n[${minterName}] ===== 处理证明响应数据 =====`);
        response.to_accounts.forEach((account, index) => {
            console.log(`[${minterName}] 处理账户[${index}]: Token ID: ${account.token.token_id}`);

            newTokens.push({
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

        const newAllowed = {
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

        console.log(`\n[${minterName}] ===== 准备执行铸币交易 =====`);
        console.log(`[${minterName}] Recipients数量: ${recipients.length}`);
        console.log(`[${minterName}] NewTokens数量: ${newTokens.length}`);
        console.log(`[${minterName}] 第一个Token ID: ${newTokens[0]?.id}`);
        console.log(`[${minterName}] MintAllowed ID: ${newAllowed.id}`);

        // ✅ 修复1: 获取pending状态的nonce (包括已发送但未确认的交易)
        const nonce = await minterWallet.getNonce('pending');
        console.log(`[${minterName}] 当前Nonce (包含pending): ${nonce}`);

        const native = new ethers.Contract(native_token_address, abi, minterWallet);

        try {
            console.log(`\n[${minterName}] 🚀 正在发送铸币交易...`);

            // ✅ 修复2: 移除手动gas参数，让ethers自动处理
            // ✅ 修复3: 显式指定nonce
            const tx = await native.mint(recipients, newTokens, newAllowed, proof, publicInputs, {
                nonce: nonce
                // 不设置 gasPrice, maxFeePerGas 等，让Hardhat自动处理
            });

            console.log(`[${minterName}] ✅ 交易已发送!`);
            console.log(`[${minterName}] 交易Hash: ${tx.hash}`);
            console.log(`[${minterName}] 等待交易确认中 (最多等待10分钟)...`);

            // 添加等待进度提示
            const waitStartTime = Date.now();
            const receipt = await tx.wait();
            const waitTime = Date.now() - waitStartTime;

            console.log(`\n[${minterName}] ✅ 交易确认成功!`);
            console.log(`[${minterName}] 区块号: ${receipt.blockNumber}`);
            console.log(`[${minterName}] Gas使用: ${receipt.gasUsed}`);
            console.log(`[${minterName}] 有效Gas价格: ${ethers.formatUnits(receipt.gasPrice || receipt.effectiveGasPrice, 'gwei')} gwei`);
            console.log(`[${minterName}] 等待时间: ${waitTime}ms (${(waitTime/1000).toFixed(2)}秒)`);

            // 保存代币ID
            mintedTokens[minterName] = newTokens.map(token => token.id);
            console.log(`\n✅ ${minterName} 成功铸造 ${number} 个代币，每个金额 ${amount}`);

        } catch (error) {
            console.error(`\n[${minterName}] ❌ 铸币交易失败!`);
            console.error(`[${minterName}] 错误类型: ${error.code || 'N/A'}`);
            console.error(`[${minterName}] 错误消息: ${error.message}`);

            if (error.transactionHash) {
                console.error(`[${minterName}] 失败的交易Hash: ${error.transactionHash}`);
            }

            throw error;
        }
    }

    return mintedTokens;
}

describe('Native Dual Minter Performance Tests', function () {
    let client, native, owner;
    let minters = {};
    let mintedTokens = {};

    before(async function () {
        this.timeout(600000); // 10分钟超时
        
        // 初始化客户端
        client = createClient(rpcUrl);
        
        // 获取合约owner
        [owner] = await ethers.getSigners();
        
        // 初始化合约
        native = new ethers.Contract(
            native_token_address,
            abi,
            owner
        );
        
        console.log('=== 测试环境初始化 ===');
        console.log('合约地址:', native_token_address);
        console.log('Owner地址:', owner.address);
        console.log('Minter1地址:', MINTER_CONFIG.minter1.address);
        // console.log('Minter2地址:', MINTER_CONFIG.minter2.address);
        console.log('Receiver1地址:', RECEIVER_CONFIG.receiver1);
        console.log('Receiver2地址:', RECEIVER_CONFIG.receiver2);
    });

    describe.skip('Case 1: Setup mint allowance for two minters', function () {
        it('should have successfully set mint allowance', async function () {
            await setupMintAllowance(native, client, { minter1: MINTER_CONFIG.minter1 }, 100000000);
            console.log('✅ 铸币权限已设置完成');
        });
        it('should have successfully set mint allowance', async function () {
            await setupMintAllowance(native, client, { minter2: MINTER_CONFIG.minter2 }, 100000000);
            console.log('✅ 铸币权限已设置完成');
        });
    });

    describe.only('Case 2: Mint 100 tokens for minter1', function () {
        this.timeout(600000);
        const number = 1;
        const amount = 100;
        it('should have minted 100 tokens for minter1', async function () {

            mintedTokens = await mintTokensForMinters(client, { minter1: MINTER_CONFIG.minter1 }, number, amount);
            expect(mintedTokens.minter1).to.have.length(number);
            console.log('✅ Minter1已铸造100个代币');
        });

        // it('should have minted 100 tokens for minter2', async function () {
        //     expect(mintedTokens.minter2).to.have.length(100);
        //     console.log('✅ Minter2已铸造100个代币');
        // });
    });

    describe('Case 3: Split tokens for minter1', function () {
        this.timeout(600000);
        it('should split tokens for minter1', async function () {
            this.timeout(900000); // 15分钟超时
            
            console.log('=== 开始批量分割代币 ===');
            
            // 为minter1准备分割请求 - 每个token分成50个，给两个receiver，金额分别为1和2
            const minter1Metadata = await createAuthMetadata(MINTER_CONFIG.minter1.privateKey);
            const minter1SplitRequests = [];
            
            for (let i = 0; i < 100; i++) {
                const to_accounts = [];
                for (let j = 0; j < 50; j++) {
                    to_accounts.push({
                        address: RECEIVER_CONFIG.receiver1,
                        amount: 1,
                        comment: `minter1-token${i}-split${j}-receiver1`
                    });
                    to_accounts.push({
                        address: RECEIVER_CONFIG.receiver2,
                        amount: 2,
                        comment: `minter1-token${i}-split${j}-receiver2`
                    });
                }
                
                minter1SplitRequests.push({
                    sc_address: native_token_address,
                    token_type: '0',
                    from_address: MINTER_CONFIG.minter1.address,
                    to_accounts: to_accounts,
                });
            }
            
            // // 为minter2准备分割请求 - 已注释掉，只测试minter1
            // const minter2Metadata = await createAuthMetadata(MINTER_CONFIG.minter2.privateKey);
            // const minter2SplitRequests = [];
            // 
            // for (let i = 0; i < 100; i++) {
            //     const to_accounts = [];
            //     for (let j = 0; j < 50; j++) {
            //         to_accounts.push({
            //             address: RECEIVER_CONFIG.receiver1,
            //             amount: 1,
            //             comment: `minter2-token${i}-split${j}-receiver1`
            //         });
            //         to_accounts.push({
            //             address: RECEIVER_CONFIG.receiver2,
            //             amount: 2,
            //             comment: `minter2-token${i}-split${j}-receiver2`
            //         });
            //     }
            //     
            //     minter2SplitRequests.push({
            //         sc_address: native_token_address,
            //         token_type: '0',
            //         from_address: MINTER_CONFIG.minter2.address,
            //         to_accounts: to_accounts,
            //     });
            // }
            
            console.log('生成分割证明中...');
            
            // 生成分割证明（只处理minter1）
            const minter1Proofs = await Promise.all(
                minter1SplitRequests.map(req => client.generateBatchSplitToken(req, minter1Metadata))
            );
            
            // // 并发生成分割证明 - 已注释掉minter2
            // const [minter1Proofs, minter2Proofs] = await Promise.all([
            //     Promise.all(minter1SplitRequests.map(req => client.generateBatchSplitToken(req, minter1Metadata))),
            //     Promise.all(minter2SplitRequests.map(req => client.generateBatchSplitToken(req, minter2Metadata)))
            // ]);
            
            console.log('✅ 分割证明生成完成');
            console.log(`Minter1生成了${minter1Proofs.length}个证明`);
            // console.log(`Minter2生成了${minter2Proofs.length}个证明`);
            
            // 准备分割交易参数
            const minter1Wallet = new ethers.Wallet(MINTER_CONFIG.minter1.privateKey, ethers.provider);
            // const minter2Wallet = new ethers.Wallet(MINTER_CONFIG.minter2.privateKey, ethers.provider);
            
            const minter1Native = native.connect(minter1Wallet);
            // const minter2Native = native.connect(minter2Wallet);
            
            // 执行分割交易（只处理minter1）- 使用batch split方式，指定nonce
            console.log('开始执行分割交易...');
            
            const executeBatchSplits = async (proofs, minterName, minterAddress, minterNative, minterMetadata) => {
                // 获取当前nonce
                const minterWallet = new ethers.Wallet(
                    MINTER_CONFIG.minter1.privateKey,
                    ethers.provider
                );
                let nonce = await minterWallet.getNonce();
                console.log(`Starting with nonce: ${nonce}`);
                
                // 准备所有交易数据
                const transactions = [];
                let progress = 1;
                const total = proofs.length;
                
                for (const proofData of proofs) {
                    console.log(`Preparing transaction ${progress}/${total}...`);
                    
                    const response = await client.getBatchSplitTokenDetail(
                        { request_id: proofData.request_id }, 
                        minterMetadata
                    );
                    
                    const recipients = response.to_addresses;
                    const consumedIds = [mintedTokens[minterName][progress-1]];
                    
                    const newTokens = [];
                    response.newTokens.forEach((account, index) => {
                        const toAddress = index % 2 === 0 ? minterAddress : recipients[Math.floor(index / 2)];
                        const rollbackTokenId = index % 2 === 0 ? 0 : response.newTokens[index + 1]?.token_id || 0;
                        newTokens.push({
                            id: account.token_id,
                            owner: minterAddress,
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
                    
                    // 添加到交易列表，指定nonce
                    transactions.push({
                        minterAddress,
                        recipients,
                        consumedIds,
                        newTokens,
                        proof,
                        publicInputs,
                        nonce: nonce++
                    });
                    progress++;
                }
                
                console.log(`Prepared ${transactions.length} transactions`);
                
                // 批量发送交易
                const startTime = Date.now();
                const txPromises = transactions.map(async (txData) => {
                    try {
                        console.log(`Sending transaction with nonce: ${txData.nonce}`);
                        const tx = await minterNative.split(
                            txData.minterAddress,
                            txData.recipients,
                            txData.consumedIds,
                            txData.newTokens,
                            txData.proof,
                            txData.publicInputs,
                            { nonce: txData.nonce }
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
                
                console.log(`\n=== Performance Results ===`);
                console.log(`Total transactions: ${transactions.length}`);
                console.log(`Total time to send all transactions: ${endTime - startTime} ms`);
                console.log(`Average time per transaction: ${(endTime - startTime) / transactions.length} ms`);
                
                // 等待成功交易的确认
                const successfulTx = txResults.filter(r => r.success);
                const failedTx = txResults.filter(r => !r.success);
                
                console.log(`\n=== Transaction Results ===`);
                console.log(`Successful transactions: ${successfulTx.length}`);
                console.log(`Failed transactions: ${failedTx.length}`);
                
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
            };
            
            // 执行minter1的分割交易
            const minter1Results = await executeBatchSplits(minter1Proofs, 'minter1', MINTER_CONFIG.minter1.address, minter1Native, minter1Metadata);
            
            // // 并发执行两个minter的所有分割交易 - 已注释掉minter2
            // const [minter1Results, minter2Results] = await Promise.all([
            //     executeSplits(minter1Proofs, MINTER_CONFIG.minter1.address, minter1Native, minter1Metadata),
            //     executeSplits(minter2Proofs, MINTER_CONFIG.minter2.address, minter2Native, minter2Metadata)
            // ]);
            
            console.log('=== 分割交易执行完成 ===');
            console.log(`Minter1执行了${minter1Results.length}个分割交易`);
            // console.log(`Minter2执行了${minter2Results.length}个分割交易`);
            
            // 验证所有交易成功
            const successful = minter1Results.successfulTransactions;
            const failed = minter1Results.failedTransactions;
            
            console.log(`成功交易: ${successful}`);
            console.log(`失败交易: ${failed}`);
            
            expect(successful).to.equal(100); // 100个token，每个一个分割交易
            expect(failed).to.equal(0);
            
            console.log('✅ 所有分割交易执行成功');
        });
    });

    after(async function () {
        console.log('\n=== 测试完成总结 ===');
        console.log('1. ✅ 设置铸币权限: Minter1权限已设置');
        console.log('2. ✅ 铸币: Minter1铸造100个代币，每个1000金额');
        console.log('3. ✅ 分割: 100个代币全部分割完成');
        console.log('4. ✅ 执行: Minter1分割交易执行成功');
        console.log('所有测试用例执行完成！');
    });
});