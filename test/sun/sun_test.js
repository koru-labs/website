const {ethers} = require('hardhat');
const privateUSDCTest = require('./private_usdc_test');

// 1. check contract basic info
privateUSDCTest.checkPrivateUSDC()
    .then(() => {
        console.log("check contract basic info done");
        return privateUSDCTest.checkTotalSupply();
    })
    .then(() => {
        console.log("check total supply done");
        // set minter allowance, prepare enough mint amount
        const accounts = require('./../../deployments/account.json');
        const mintAmount = 10000000000; // 10 USDC (consider decimal)
        return privateUSDCTest.configureMinterAllowance(accounts.Minter, mintAmount);
    })
    .then(() => {
        return privateUSDCTest.testConvert2pUSDCWithProvidedData();
    })
    .then((convert2pUSDCResult) => {
        console.log("wait for block confirmation...");
        return privateUSDCTest.sleep(5000)
            .then(() => convert2pUSDCResult);
    })
    .then((convert2pUSDCResult) => {
        // calculate tokenId using the hashElgamal function from private_usdc_test.js
        const value = {
            cl_x: "9110195795834256749834325857294556710933216128560630139315452502928549190459",
            cl_y: "10399448168241846983915852774721267829029794545882598909172187031009066819820",
            cr_x: "7864167786632000407000581592302633740834144670995005538167977204085621328516",
            cr_y: "7318124320389771021418443381934529404794999197683133795404485014163207955096"
        };
        
        // use the hashElgamal function from private_usdc_test.js
        const tokenId = privateUSDCTest.hashElgamal(value);
        
        console.log(`calculated tokenId: ${tokenId}`);
        return tokenId;
    })
    .then((tokenId) => {
        if (tokenId) {
            console.log(`use tokenId ${tokenId} to execute convert2USDC test...`);
            return privateUSDCTest.testConvert2USDCWithProvidedData(tokenId);
        } else {
            console.log("no valid tokenId, skip convert2USDC test");
            return null;
        }
    })
    .then(() => {
        return privateUSDCTest.checkTotalSupply();
    })
    .then(() => {
        console.log("============= test done =============");
        process.exit(0);
    })
    .catch(error => {
        console.error("error occurred in test:", error);
        process.exit(1);
    }); 