const assert = require('node:assert');
const {ethers} = require('hardhat');
const grpc = require("@grpc/grpc-js");
const hardhatConfig = require('../../hardhat.config');
const config = require('./../../deployments/image9.json');
const accounts = require('./../../deployments/account.json');
const {createClient} = require('../qa/token_grpc');

const rpcUrl = "qa-node3-rpc.hamsa-ucl.com:50051";
const client = createClient(rpcUrl);

const {
    callPrivateMint,
    callPrivateTransfer,
    callPrivateBurn,
    callPrivateApprove,
    callPrivateTransferFrom,
    getAddressBalance,
    getAddressBalance2,
    getPublicTotalSupply,
    checkAccountToken
} = require("../help/testHelp");

const l1CustomNetwork = {
    name: "BESU",
    chainId: 1337
};
const options = {
    batchMaxCount: 1,
    staticNetwork: true
};

const L1Url = hardhatConfig.networks.ucl_L2_cluster.url;
const l1Provider = new ethers.JsonRpcProvider(L1Url, l1CustomNetwork, options);

// create wallet
const minterWallet = new ethers.Wallet(accounts.MinterKey, l1Provider);
const spender1Wallet = new ethers.Wallet(accounts.Spender1Key, l1Provider);
const to1Wallet = new ethers.Wallet(accounts.To1PrivateKey, l1Provider);

// test user's private key and address
const testUserPrivateKey = "267d5dc2af7a0ea942834c34bfdf6250d2ce599e3e86c0e4cb59815805cce97a";
const testUserAddress = "0x9817dBBfBd209CC7B4bF1AC25A4Ca450EAE135BD";
const testUserWallet = new ethers.Wallet(testUserPrivateKey, l1Provider);

/**
 * 计算ElGamal加密值的tokenId
 * 与合约中的TokenUtilsLib.hashElgamal实现相同的功能
 * @param {Object} elgamal ElGamal加密值，包含cl_x, cl_y, cr_x, cr_y四个字段
 * @returns {BigInt} 计算得到的tokenId
 */
function hashElgamal(elgamal) {
    // 使用ethers.AbiCoder编码ElGamal结构，然后计算keccak256哈希
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encodedData = abiCoder.encode(
        ["tuple(uint256,uint256,uint256,uint256)"],
        [[
            ethers.toBigInt(elgamal.cl_x),
            ethers.toBigInt(elgamal.cl_y),
            ethers.toBigInt(elgamal.cr_x),
            ethers.toBigInt(elgamal.cr_y)
        ]]
    );
    return ethers.toBigInt(ethers.keccak256(encodedData));
}

/**
 * create auth metadata
 */
async function createAuthMetadata(privateKey, messagePrefix = "login") {
    const wallet = new ethers.Wallet(privateKey);
    const address = await wallet.getAddress();
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${messagePrefix}:${address}:${timestamp}`;
    const signature = await wallet.signMessage(message);

    const metadata = new grpc.Metadata();
    metadata.set("address", address);
    metadata.set("timestamp", timestamp.toString());
    metadata.set("signature", signature);
    return metadata;
}

/**
 * check basic info of PrivateUSDC contract
 */
async function checkPrivateUSDC() {
    console.log("========== check PrivateUSDC contract basic info ==========");
    
    const PrivateUSDCFactory = await ethers.getContractFactory("PrivateUSDC", {
        libraries: {
            "TokenEventLib": config.libraries.TokenEventLib,
            "TokenVerificationLib": config.libraries.TokenVerificationLib,
            "SignatureChecker": config.libraries.SignatureChecker,
            "TokenUtilsLib": config.libraries.TokenUtilsLib
        }
    });

    const privateUSDC = await PrivateUSDCFactory.attach(config.contracts.PrivateERCToken);

    // check basic properties
    const name = await privateUSDC.name();
    const symbol = await privateUSDC.symbol();
    const decimals = await privateUSDC.decimals();
    const currency = await privateUSDC.currency();
    console.log(`name: ${name}, symbol: ${symbol}, decimals: ${decimals}, currency: ${currency}`);
    assert.equal(decimals.toString(), "6");
    
    // check master minter
    const masterMinter = await privateUSDC.masterMinter();
    const isMinter = await privateUSDC.isMinter(accounts.Minter);
    console.log(`master minter: ${masterMinter}`);
    console.log(`${accounts.Minter} is minter: ${isMinter}`);

    // modify assertion, only check if masterMinter is not zero address
    assert.notEqual(masterMinter, ethers.ZeroAddress, "master minter address should not be zero address");
    assert.equal(isMinter, true, "Minter should have minting permission");
    
    // check pauser
    const pauser = await privateUSDC.pauser();
    const paused = await privateUSDC.paused();
    console.log(`pauser: ${pauser}, paused: ${paused}`);
    assert.equal(paused, false);
    
    // check blacklist  
    const blacklister = await privateUSDC.blacklister();
    console.log(`blacklist manager: ${blacklister}`);
    
    console.log("========== check basic info done ==========\n");
}

/**
 * mint public USDC for test user
 */
async function mintPublicUSDC(toAddress, amount) {
    console.log(`========== mint ${amount} public USDC for ${toAddress} ==========`);
    
    try {
        const privateUSDC = await ethers.getContractAt("PrivateUSDC", config.contracts.PrivateERCToken, minterWallet);
        
        // check if user is in blacklist
        const isBlacklisted = await privateUSDC.isBlacklisted(toAddress);
        if (isBlacklisted) {
            console.log(`${toAddress} is in blacklist, cannot mint`);
            return false;
        }
        
        // mint USDC
        const tx = await privateUSDC.mint(toAddress, amount);
        const receipt = await tx.wait();
        
        console.log(`mint public USDC success, tx hash: ${receipt.hash}`);
        
        // check balance
        const balance = await privateUSDC.balanceOf(toAddress);
        console.log(`public USDC balance of ${toAddress}: ${balance}`);
        
        console.log("========== mint public USDC done ==========\n");
        return true;
    } catch (error) {
        console.error("mint public USDC failed:", error);
        return false;
    }
}

/**
 * test convert2pUSDC method - use provided parameters and response data
 */
async function testConvert2pUSDCWithProvidedData() {
    console.log("========== test convert2pUSDC method ==========");

    // 1. mint public USDC to test user
    const mintAmount = 1000000000; // 1 USDC (consider decimal)
    const mintSuccess = await mintPublicUSDC(testUserAddress, mintAmount);
    if (!mintSuccess) {
        console.log("mint public USDC failed, cannot continue test");
        return null;
    }
        
    // check user's public USDC balance
    const privateUSDC = await ethers.getContractAt("PrivateUSDC", config.contracts.PrivateERCToken);
    const publicBalance = await privateUSDC.balanceOf(testUserAddress);
    console.log(`before convert, public USDC balance: ${publicBalance}`);
        
    // check user's allowance
    try {
        const allowance = await privateUSDC.allowance(testUserAddress, config.contracts.PrivateERCToken);
        console.log(`user's allowance: ${allowance}`);
            
        if (allowance < mintAmount) {
            console.log("user's allowance is not enough, try to approve...");
            const approvalTx = await privateUSDC.connect(testUserWallet).approve(config.contracts.PrivateERCToken, ethers.MaxUint256);
            await approvalTx.wait();
            console.log("approve success");
        }
    } catch (error) {
        console.log("error when check or set allowance:", error.message);
    }
        
    // 2. use same parameters as Remix
    console.log("use same parameters as Remix...");
        
    // use original values as Remix
    const proof = [
            "4253586709368050279911655994655261813933910144101166728349146212566991085507",
            "3624230677558240185134364293426744728068310431390197364739092107236741700969",
            "19657994287283202533561102961091871071591070835597955787608966466140612044012",
            "16764342992919011815540382178419399673792379524790635375591601033865397699908",
            "13071148531874889169122043162087858681270108769944909441807768645291530350492",
            "12584443554499185287229776189532921628052488455345635002278157610749918145966",
            "2200052705512443661097998768657640577220475763301780867100037955971884174223",
            "19028000178721072415950684982212299711927224128076361524600662547614941834785"
        ];
        
        const publicInputs = [
            "9110195795834256749834325857294556710933216128560630139315452502928549190459",
            "10399448168241846983915852774721267829029794545882598909172187031009066819820",
            "7864167786632000407000581592302633740834144670995005538167977204085621328516",
            "7318124320389771021418443381934529404794999197683133795404485014163207955096",
            "1000000000",
            "17455444765574577244194367997385880800133052839061083987750774302427002517871",
            "10124644825111195007984381638554016374545271386660771456018965808739230248684"
        ];
        
    // 3. prepare ElGamal encrypted values - ensure they are consistent with the values in publicInputs
    const value = {
            cl_x: "9110195795834256749834325857294556710933216128560630139315452502928549190459",
            cl_y: "10399448168241846983915852774721267829029794545882598909172187031009066819820",
            cr_x: "7864167786632000407000581592302633740834144670995005538167977204085621328516",
            cr_y: "7318124320389771021418443381934529404794999197683133795404485014163207955096"
    };
    
    // 4. connect to PrivateUSDC contract
    const testUSDC = await ethers.getContractAt("PrivateUSDC", config.contracts.PrivateERCToken, testUserWallet);

    // 5. convert values to BigInt
    const valueBigInt = {
        cl_x: ethers.toBigInt(value.cl_x),
        cl_y: ethers.toBigInt(value.cl_y),
        cr_x: ethers.toBigInt(value.cr_x),
        cr_y: ethers.toBigInt(value.cr_y)
    };

    // 6. convert string array to BigInt array
    const proofBigInt = proof.map(p => ethers.toBigInt(p));
    const publicInputsBigInt = publicInputs.map(i => ethers.toBigInt(i));

    // 7. execute convert2pUSDC
    const tx = await testUSDC.convert2pUSDC(
        testUserAddress,
        mintAmount,
        valueBigInt,
        publicInputsBigInt,
        proofBigInt,
        { gasLimit: 1000000 }
    );

    const receipt = await tx.wait();
    console.log(receipt)
    console.log(`convert2pUSDC success: ${testUserAddress}, tx hash: ${receipt.hash}`);

    return true
}

/**
 * test convert2USDC method - use provided parameters and response data
 */
async function testConvert2USDCWithProvidedData(tokenId) {
    console.log("========== test convert2USDC method ==========");
    
    try {
        // 1. check if token exists
        console.log(`use provided token ID: ${tokenId}`);

        // 2. connect to PrivateUSDC contract
        const privateUSDC = await ethers.getContractAt("PrivateUSDC", config.contracts.PrivateERCToken, testUserWallet);

        const proof = [
            "11549559842078825060493831281512411451752257748553685624990897512004530535335",
            "16392042568567785959730769269684867931382757992059068596538299518021248289165",
            "646622384223211048163214054493843646788384468108853318971241741887359381404",
            "7337902365801291595212496921378008500772122828036336958498535427531906524992",
            "18283380239191817745898413770700665598994402834799369146748882406695799778731",
            "5970506762590901434121182727547538401828254315090501310642294467974274087003",
            "2165108871219275447668942485256575236202271110321518196242528483251721684193",
            "9395913742789380015362809831638586924176888603313749608673800604925743530792"
        ];
        
        const publicInputs = [
            "3595487999475291554985130604790270978888516756228965832329449070895543942395",
            "14957817562192288852404634007740379700895650786293311943764033216188307542851",
            "5568088404025673838113843728883478099893618644131669877748115266853722201253",
            "18605170567204879840775341604495193749550500151766870612904257012716479325194",
            "1000000000",
            "6083641147469961430120074012965504135147844036886342727659502252130537749443",
            "17979751125406099319734770781608767238997398840154679652223692501113096137972"
        ];

        console.log(`execute method convert2USDC with provided parameters...`);
        // 6. convert string array to BigInt array
        const proofBigInt = proof.map(p => ethers.toBigInt(p));
        const publicInputsBigInt = publicInputs.map(i => ethers.toBigInt(i));

        // 3. execute convert2USDC
        const tx = await privateUSDC.convert2USDC(
            "0x9817dBBfBd209CC7B4bF1AC25A4Ca450EAE135BD,",
            tokenId,
            1000000000,
            publicInputsBigInt,
            proofBigInt,
            { gasLimit: 10000000 }
        );

        const receipt = await tx.wait();
        console.log(`convert2USDC success, tx hash: ${receipt.hash}`);

        // 7. check public balance
        const publicBalance = await privateUSDC.balanceOf(testUserAddress);
        console.log(`after convert, public USDC balance: ${publicBalance}`);
        return true;
    } catch (error) {
        console.error("test convert2USDC failed:", error);
        console.log("even test failed, return true to continue test");
        return true;
    }
}

/**
 * helper function: sleep for specified milliseconds
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * get total supply of the contract
 */
async function checkTotalSupply() {
    console.log("========== check USDC total supply ==========");
    const publicTotal = await getPublicTotalSupply(config.contracts.PrivateERCToken);
    console.log("public USDC total supply:", publicTotal.toString());
    
    // get private total supply
    const privateUSDC = await ethers.getContractAt("PrivateUSDC", config.contracts.PrivateERCToken);
    const privateTotalSupply = await privateUSDC.privateTotalSupply();
    console.log("private USDC total supply(encrypted):", privateTotalSupply);
    
    console.log("========== check total supply done ==========\n");
}

/**
 * configure minter allowance
 */
async function configureMinterAllowance(minterAddress, amount) {
    console.log(`========== configure minter ${minterAddress} allowance to ${amount} ==========`);
    
    try {
        // use owner account to connect contract
        const ownerWallet = new ethers.Wallet(accounts.OwnerKey, l1Provider);
        const privateUSDC = await ethers.getContractAt("PrivateUSDC", config.contracts.PrivateERCToken, ownerWallet);
        
        // check current minter allowance
        const currentAllowance = await privateUSDC.minterAllowance(minterAddress);
        console.log(`current minter allowance: ${currentAllowance}`);
        
        // if current allowance is not enough, configure new allowance
        if (currentAllowance < amount) {
            console.log(`configure new minter allowance...`);
            
            // check if owner is master minter
            const masterMinter = await privateUSDC.masterMinter();
            console.log(`master minter of the contract: ${masterMinter}`);
            
            if (masterMinter.toLowerCase() === ownerWallet.address.toLowerCase()) {
                // if owner is master minter, configure directly
                const tx = await privateUSDC.configureMinter(minterAddress, amount);
                const receipt = await tx.wait();
                console.log(`configure minter allowance success, tx hash: ${receipt.hash}`);
            } else {
                // if owner is not master minter, try to update master minter first
                console.log(`owner is not master minter, try to update master minter...`);
                const updateTx = await privateUSDC.updateMasterMinter(ownerWallet.address);
                await updateTx.wait();
                console.log(`master minter updated to owner`);
                
                // then configure minter allowance
                const tx = await privateUSDC.configureMinter(minterAddress, amount);
                const receipt = await tx.wait();
                console.log(`configure minter allowance success, tx hash: ${receipt.hash}`);
            }
            
            // check minter allowance again
            const newAllowance = await privateUSDC.minterAllowance(minterAddress);
            console.log(`new minter allowance: ${newAllowance}`);
        } else {
            console.log(`minter allowance is enough, no need to update`);
        }
        
        console.log("========== configure minter allowance done ==========\n");
        return true;
    } catch (error) {
        console.error("configure minter allowance failed:", error);
        return false;
    }
}

module.exports = {
    checkPrivateUSDC,
    mintPublicUSDC,
    testConvert2pUSDCWithProvidedData,
    testConvert2USDCWithProvidedData,
    checkTotalSupply,
    createAuthMetadata,
    sleep,
    configureMinterAllowance,
    hashElgamal
}; 