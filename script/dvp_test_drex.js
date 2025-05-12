const hre = require("hardhat");
const {ethers} = hre;
const p = require('poseidon-lite');
const crypto = require("crypto");
const {keccak256} = require('js-sha3');
const {Wallet} = require('ethers');


const drexAddress = "0xac07D22807D759246e7402DF60964cBC915d6A64";
const dvt1Address = "0xb58d983A5D9EE215A4540329d3d9C7364Bd4Af4c";
const dvt2Address = "0x80245F9D2e2950b028c53A4Bd1851045ff2F53d3";

const client1Address = "0x23eabdd1584Cc04E5962524F48B9c6f4d1Ef98cD";
const client1PrivateKey = "0x5f990426b4495f3d4f089ce948dca5365bf00d72b52c4e0f59bfdba1bd4593e0";

const client2Address = "0x977954402132612Cc1d144E57e16eaf0E4cbcfcB";
const client2PrivateKey = "0xc5446fda20f0b6ae6c24ababad898faa1251cc524783fabf4d84a673c41b74ef";

const bank1Address = "0xa1608Fc30958cD232de765b003D4f3A4995049b6";
const bank1PrivateKey = "0x0740d6df0c4fb2cc880f14a72ac7118ede6d0613417ef35a92a73d9344ad0d0b";

const bank2Address = "0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB";
const bank2PrivateKey = "0x555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787";

const centralBankEscrotingAddress = "0x80245F9D2e2950b028c53A4Bd1851045ff2F53d3";
const bank1EscrotingAddress = "0x42807f0F6C5e8Fc49455CA28c0B116b45AF7af20";
const bank2EscrotingAddress = "0xd6b5DB0bA8Eb51803bD0DBF03041f84Bd6e2F6B9";


const adminPrivateKey = "555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787";

const customNetwork = {
    name: "UCL",
    chainId: 1001
};

const options = {
    batchMaxCount: 1,
    staticNetwork: true
};

const centralBankRpcUrl = "http://54.178.62.243:8123";
const bank1RpcUrl = "http://35.78.208.30:8123";
const bank2RpcUrl = "http://13.231.127.203:8123";
const centralBankProvider = new ethers.JsonRpcProvider(centralBankRpcUrl, customNetwork, options);
const bank1Provider = new ethers.JsonRpcProvider(bank1RpcUrl, customNetwork, options);
const bank2Provider = new ethers.JsonRpcProvider(bank2RpcUrl, customNetwork, options);

const CDBCAddress = "0xd6D93306f24a74c1d8010931FAFE41E80d608D83";
const STRAddress = "0xE1a8595b15B3464E1C946ee930C4ef42440c0049";
const SwapOneStepAddress = "0x4e383f0E94AcCad8d7164De9dD418640bEa05DE4";
const SwapOneStepFromAddress = "0x3aC1A04b03C477E4d122553Eabf36cB5e8ab7598";
const SwapTwoStepAddress = "0x61f3D27725BEcF3C3724f37493b6365a301ea12E";
const TPFtAddress = "0xeB427A4C71D2791688D566B5472fDb82fF0A6C2A";
const TPFt1002Address = "0x08b30C5d298a665355d1c2E027D7D748a917122f";
const TPFt1052Address = "0x883FF8F9D8002bE92e111CE4D39a188Bd5B0EB84";
const KeyDictionaryAddress = "0x358820A757aA47D2076132fc0aF0c18330E5f37F";

const BankAToken = "0x640EAd9C1f416F3fD3654C651c1E43f72b490e20"
const BankAAccount = "0x6007467bC5B9Bb31819E4deFB1931f8cB58489e8";
const BankAPrivateKey = "0xa82ab4fb8a9e459577f46d927d34e57493eba895ef0719d3387f6f32be8c87ab";

const BankBToken = "0xfD201249dB112Af6076f226f33162dc0AabbF87b"
const BankBAccount = "0x26510eA6a28D8C936d7a3ecF2f3277b3FEF81421";
const BankBPrivateKey = "0x8dc87a07c18009392f463893a59b5d1581f7a892a4ad9121e9c7f41f97391cc5";

const bankANumber = 101;
const bankBNumber = 102;

const privateKey = Wallet.createRandom().privateKey;
console.log("client privateKey:", privateKey);
const clientWallet = new Wallet(privateKey);
console.log("client publicKey:", clientWallet.address);

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function drexEnableAccount(bankPublicKey) {
    let adminWallet = new ethers.Wallet(adminPrivateKey, centralBankProvider);

    let RealDigitalFactory = await ethers.getContractFactory("RealDigital");
    let RealDigital = await RealDigitalFactory.attach(CDBCAddress).connect(adminWallet);

    let tx = await RealDigital.enableAccount(bankPublicKey);
    await tx.wait();
}

async function dvtEnableAccount(bankPrivateKey, dvtAddress) {
    let bankWallet = new ethers.Wallet(bankPrivateKey, centralBankProvider);

    let dvtFactory = await ethers.getContractFactory("RealDigital");
    let dvt = await dvtFactory.attach(dvtAddress).connect(bankWallet);

    await dvt.enableAccount(clientWallet);
    await sleep(3000);
}

async function dvtGrantMoverRole(bankPrivateKey, dvtAddress) {
    let bankWallet = new ethers.Wallet(bankPrivateKey, centralBankProvider);

    let dvtFactory = await ethers.getContractFactory("RealDigital");
    let dvt = await dvtFactory.attach(dvtAddress).connect(bankWallet);

    let roleName = ethers.keccak256(ethers.toUtf8Bytes("MOVER_ROLE"));
    await dvt.grantRole(roleName, clientWallet);
    await sleep(3000);
}

async function addAccount(bankPrivateKey) {
    let taxId = Math.floor(Math.random() * 9000000000) + 1000000000;
    let bankNumber;
    let branch;
    if (bankPrivateKey === BankAPrivateKey) {
        bankNumber = bankANumber;
        branch = bankANumber;
    } else {
        bankNumber = bankBNumber;
        branch = bankBNumber;
    }
    let account = Math.floor(Math.random() * 9000000000) + 1000000000;
    let wallet = clientWallet.address;
    let bankWallet = new ethers.Wallet(bankPrivateKey, centralBankProvider);

    let KeyDictionaryFactory = await ethers.getContractFactory("KeyDictionary");
    let KeyDictionary = await KeyDictionaryFactory.attach(KeyDictionaryAddress).connect(bankWallet);

    const key = ethers.keccak256(ethers.toUtf8Bytes(taxId.toString()));
    console.log("key:", key);

    await KeyDictionary.addAccount(key, taxId, bankNumber, account, branch, wallet);
    await sleep(3000);

    let response = await KeyDictionary.getCustomerData(key);
    console.log("customerData:", response);
}

// drexEnableAccount()

addAccount(BankAPrivateKey)
    .then(() => {
        return dvtEnableAccount(BankAPrivateKey, BankAToken);
    })
    .then(() => {
        return dvtGrantMoverRole(BankAPrivateKey, BankAToken);
    })
    .catch(error => {
        console.error(error);
    });
