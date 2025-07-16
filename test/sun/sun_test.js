const privateUSDCTest = require('./private_usdc_test');

// 1. 检查合约基本信息
privateUSDCTest.checkPrivateUSDC()
    .then(() => {
        console.log("合约基本信息检查完成");
        return privateUSDCTest.checkTotalSupply();
    })
    .then(() => {
        console.log("总供应量检查完成");
        // 设置铸币者权限，为测试准备足够的铸币额度
        const accounts = require('./../../deployments/account.json');
        const mintAmount = 10000000000; // 10 USDC (考虑到小数位)
        return privateUSDCTest.configureMinterAllowance(accounts.Minter, mintAmount);
    })
    .then(() => {
        return privateUSDCTest.testConvert2pUSDCWithProvidedData();
    })
    .then((convert2pUSDCResult) => {
        console.log("等待区块确认...");
        return privateUSDCTest.sleep(5000)
            .then(() => convert2pUSDCResult);
    })
    .then((convert2pUSDCResult) => {
        if (convert2pUSDCResult) {
            return privateUSDCTest.getPrivateTokens("0x9817dBBfBd209CC7B4bF1AC25A4Ca450EAE135BD")
                .then((tokens) => {
                    if (tokens && tokens.length > 0) {
                        // 检查token对象的结构，适应可能的不同格式
                        const tokenId = tokens[0].token_id || tokens[0].id || tokens[0];
                        console.log(`找到 token ID: ${tokenId}，用于 convert2USDC 测试`);
                        return tokenId;
                    }
                    console.log("没有可用的 token ID 进行 convert2USDC 测试");
                    return null;
                });
        } else {
            console.log("convert2pUSDC 测试失败，跳过 convert2USDC 测试");
            return null;
        }
    })
    .then((tokenId) => {
        if (tokenId) {
            console.log(`使用 tokenId ${tokenId} 执行 convert2USDC 测试...`);
            return privateUSDCTest.testConvert2USDCWithProvidedData(tokenId);
        } else {
            console.log("没有有效的 tokenId，跳过 convert2USDC 测试");
            return null;
        }
    })
    .then(() => {
        return privateUSDCTest.checkTotalSupply();
    })
    .then(() => {
        console.log("============= 测试完成 =============");
        process.exit(0);
    })
    .catch(error => {
        console.error("测试过程中出现错误:", error);
        process.exit(1);
    }); 