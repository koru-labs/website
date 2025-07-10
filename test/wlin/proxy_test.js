const assert = require('node:assert');

const {ethers} = require('hardhat');
const deployed = require("../../deployments/image9.json")
const hardhatConfig = require('../../hardhat.config');

const registry1_address="0x6F810294857252A20C639dCA1Ae9C871eC534982"
const registryB_address="0xC768DD4Fb7Ce831725e62d81d2FC35Ce90B87c2E";
const proxy_address="0x3A64c7d00C4e6A6cBD85d796A8e98c3b478F7B8a";


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



async function deployRegistry() {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });

    const instRegistry = await InstRegistry.deploy();
    await instRegistry.waitForDeployment();
    console.log("InstitutionUserRegistry is deployed at: ", instRegistry.target);
}


async function deployRegistryB() {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistryB");


    const instRegistry = await InstRegistry.deploy();
    await instRegistry.waitForDeployment();
    console.log("InstitutionUserRegistryB is deployed at: ", instRegistry.target);
}

async function testRegistryOwner() {
    const instRegistry = await ethers.getContractAt("InstitutionUserRegistry", proxy_address);
    let result = await instRegistry.owner();
    console.log("registry owner: ", result);

    result = await instRegistry.getEventAddress();
    console.log("registry event: ", result);
}

async function registerInstInRegistry1() {
    const instRegistry = await ethers.getContractAt("InstitutionUserRegistry", proxy_address);
    let tx = await instRegistry.registerInstitution(bankAddress, "node1", bankPublicKey, "https://www.visa.com:8443",  "http://www.visa.com:8080" );
    let receipt = await tx.wait();

    let inst = await instRegistry.getInstitution(bankAddress);
    console.log("on-chain inst: ", inst);
}

async function registerUserInRegistry1() {
    const instRegistry = await ethers.getContractAt("InstitutionUserRegistry", proxy_address, bankManagerWallet);
    let tx = await instRegistry.registerUser(userAddress);
    await tx.wait();

    let result = await instRegistry.getUserManager(userAddress)
    console.log("user manager: ", result);
}

async function deployProxy() {
    let [deployer, signer]= await ethers.getSigners();
    const Proxy = await ethers.getContractFactory("PercentRouterProxy");
    const proxy = await Proxy.deploy(registry1_address);
    await proxy.waitForDeployment();
    console.log("proxy is deployed at: ", proxy.target)


    const proxied = await ethers.getContractAt("InstitutionUserRegistry", proxy.target);
    let tx = await proxied.initialize(deployer.address, deployed.contracts.HamsaL2Event);
    await tx.wait();

    console.log("initalize is done")

    let result = await proxied.getEventAddress( );
    console.log("registry event: ", result);
}

async function setupProxy() {
    const proxy = await ethers.getContractAt("PercentRouterProxy", proxy_address);
    let tx = await proxy.setImplementationB(registryB_address, 1);
    await tx.wait();
}

async function testGetUserManagerThroughProxy() {
    const proxy = await ethers.getContractAt("InstitutionUserRegistry", proxy_address);
    let result = await proxy.getUserManager(userAddress)
    console.log("user manager: ", result);
}



// deployRegistry().then();
// deployRegistryB().then();

// deployProxy().then();

// testRegistryOwner().then();

// registerInstInRegistry1().then();
// registerUserInRegistry1().then();


// setupProxy().then();
// testGetUserManagerThroughProxy().then();