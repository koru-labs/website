const assert = require('node:assert');

const {ethers} = require('hardhat');
const deployed = require("../../deployments/image9.json")
const hardhatConfig = require('../../hardhat.config');

const data1_address="0xa55DD243467503978bC5392e5a94322d0d19b85b";
const registry1_address="0xf750cD79d9328890D36204FBB7574a29423D86DA"

const proxy_address="0xE6FA53dfaf8bE234Dd141aE584ceB1229Bb1ebB5";

const data2_address="0xf0BD2d753f133052FFE2A1d90521E9078cF9f9b9";
const registry2_address="0x229B7C72d989e33bbb6ba7340560A8de0C71e4Bb";

const bankAddress = "0x2c44c4B96AE5f9c9dbf32cF3AA743Cd0277F3127"
const bankPrivateKey="f951e1bd9ef0359e6886ae77e5fd30d566ef098d099c78fd3fb68588657618cc"
const bankPublicKey = {
    x: "0x27c07a015b9e7d73519e8bcfc8ddd6cf760b51f55938e0f83affb2ff7d244220",
    y: "0x27e09fb8be7b593a38e107cce390183bd2b15eea7b62c4cc8ad7fae388c9b66f",
}
const userAddress="0xbA268f776F70caDB087e73020dfE41c7298363Ed";

const l1CustomNetwork = {
    name: "BESU",
    chainId: 1337
};
const options = {
    batchMaxCount: 1,
    staticNetwork: true
};

const L1Url = hardhatConfig.networks.ucl_L2.url;
const l1Provider = new ethers.JsonRpcProvider(L1Url, l1CustomNetwork, options);
const bankManagerWallet = new ethers.Wallet(bankPrivateKey, l1Provider);

async function deployData() {
    const InstData = await ethers.getContractFactory("InstitutionUserData");
    const instData = await InstData.deploy();
    await instData.waitForDeployment();
    console.log("instData is deployed at: ", instData.target)
}

async function deployRegistry(data_address) {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });

    const instRegistry = await InstRegistry.deploy(deployed.contracts.HamsaL2Event, data_address);
    await instRegistry.waitForDeployment();
    console.log("InstitutionUserRegistry is deployed at: ", instRegistry.target);

    const instData = await ethers.getContractAt("InstitutionUserData", data_address);
    let tx = await instData.setAllowedCaller(instRegistry.target, true);
    await tx.wait();
}

async function registerInstInRegistry1() {
    const instRegistry = await ethers.getContractAt("InstitutionUserRegistry", registry1_address);
    let tx = await instRegistry.registerInstitution(bankAddress, "node1", bankPublicKey, "https://www.visa.com:8443",  "http://www.visa.com:8080" );
    let receipt = await tx.wait();

    let inst = await instRegistry.getInstitution(bankAddress);
    console.log("on-chain inst: ", inst);
}

async function registerUserInRegistry1() {
    const instRegistry = await ethers.getContractAt("InstitutionUserRegistry", registry1_address, bankManagerWallet);
    let tx = await instRegistry.registerUser(userAddress);
    await tx.wait();

    let result = await instRegistry.getUserManager(userAddress)
    console.log("user manager: ", result);
}

async function deployProxy() {
    const Proxy = await ethers.getContractFactory("HamsaTransparentProxy");
    const proxy = await Proxy.deploy(registry1_address);
    await proxy.waitForDeployment();
    console.log("proxy is deployed at: ", proxy.target)
}

async function setupProxy() {
    const proxy = await ethers.getContractAt("HamsaTransparentProxy", proxy_address);
    let tx = await proxy.setImplementationA(registry1_address);
    await tx.wait();

    tx = await proxy.setImplementationA(registry1_address);
    await tx.wait();
}

async function testGetUserManagerThroughProxy() {
    const proxy = await ethers.getContractAt("InstitutionUserRegistry", registry1_address, bankManagerWallet);
    let result = await proxy.getUserManager(userAddress)
    console.log("user manager: ", result);
}


// deployData().then();
// deployRegistry(data1_address).then();

// deployProxy().then();

// deployData().then();
// deployRegistry(data2_address).then();

// registerInstInRegistry1().then();
// registerUserInRegistry1().then();


// setupProxy().then();

testGetUserManagerThroughProxy().then();