const assert = require('node:assert');

const {ethers} = require('hardhat');
const deployed = require("../../deployments/image9.json")
const hardhatConfig = require('../../hardhat.config');

const registry1_address="0x3f267Fdd8E35A71546bC35126D010bD15F119b0d"
const registryB_address="0x651F063b3f24f7971DF2dbBE48F226390BaDfF63";
const proxy_address="0xcDc049Db9D6bbe407E6FB87F212682C2000F6939";
const prod_proxy_address="0x0449034be472297A9303818f568cB5275E199Aab"


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
    const Proxy = await ethers.getContractFactory("InstPercentRouterProxy");
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

async function setupProxy(proxy_address) {
    const proxy = await ethers.getContractAt("InstPercentRouterProxy", proxy_address);
    let tx = await proxy.setImplementationB(registryB_address, 50);
    await tx.wait();

    tx = await proxy.setImplementationA(registryB_address);
    await tx.wait();
}

async function testGetUserManagerThroughProxy(proxy_address) {
    const proxy = await ethers.getContractAt("InstitutionUserRegistry", proxy_address);
    let result = await proxy.getUserManager(userAddress)
    console.log("user manager: ", result);
}


async function testProxySettings(proxy_address){
    const proxy = await ethers.getContractAt("InstPercentRouterProxy", proxy_address);
    let admin = await proxy.admin();
    let implA = await proxy.implementationA();
    let implB = await proxy.implementationB();
    let percent = await proxy.percentageToB();

    console.log({
        admin,
        implA,
        implB, percent
    })
}

async function testInstRegistryUpgrade(proxy_address) {
    const proxy = await ethers.getContractAt("InstPercentRouterProxy", proxy_address);

}


// deployRegistry().then();
// deployRegistryB().then();

// deployProxy().then();

//testRegistryOwner().then();
// registerInstInRegistry1().then();
// registerUserInRegistry1().then();

// setupProxy(proxy_address).then();
// testGetUserManagerThroughProxy(proxy_address).then();
// testProxySettings(proxy_address).then();



// setupProxy(prod_proxy_address).then();
// testGetUserManagerThroughProxy(prod_proxy_address).then();
// testProxySettings(prod_proxy_address).then();

