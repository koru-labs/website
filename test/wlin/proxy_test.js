const assert = require('node:assert');

const {ethers} = require('hardhat');

const proxy_address="0xa7085357455EB65Da04dFc1Db353f4758ad4666e";
const simpleA_address="0x390ee40dAbAdEeB6A181AC052bC697D84C39e0f8"
const simpleB_address="0x368365b4368C2741333466Ead3c81e491B320BaE"

async function deployProxy() {
    const SimpleA = await ethers.getContractFactory("SimpleA");
    const simpleA = await SimpleA.deploy();
    await simpleA.waitForDeployment();
    console.log("simpleA is deployed at: ", simpleA.target)

    const Proxy = await ethers.getContractFactory("HamsaTransparentProxy");
    const proxy = await Proxy.deploy(simpleA.target);
    await proxy.waitForDeployment()
    console.log("the proxy is deployed at: ", proxy.target);
}

async function deploySimpleB() {
    const SimpleB = await ethers.getContractFactory("SimpleB");
    const simpleB = await SimpleB.deploy();
    await simpleB.waitForDeployment();
    console.log("the simpleB is deployed at: ", simpleB.target)
}

async function setupABTest(){
    const Proxy = await ethers.getContractFactory("HamsaTransparentProxy");
    const proxy = await Proxy.attach(proxy_address);
    let tx = await proxy.setImplementationB(simpleB_address);
    let rc = await tx.wait();
    console.log(rc);

    tx = await proxy.setImplBPercent(50);
    rc = await tx.wait();
    console.log(rc);
}

async function setupABDone(){
    const Proxy = await ethers.getContractFactory("HamsaTransparentProxy");
    const proxy = await Proxy.attach(proxy_address);

    let tx = await proxy.setImplementationA(simpleB_address);
    let rc = await tx.wait();
    console.log(rc);

    // tx = await proxy.setImplBPercent(0);
    // rc = await tx.wait();
    // console.log(rc);
}

async function testInfo() {
    let [deployer, signer] = await ethers.getSigners();

    const Implementation = await ethers.getContractFactory("SimpleA", signer);
    const impl = await Implementation.attach(proxy_address);
    let result = await impl.info();
    console.log("result: ", result);
}

// deployProxy().then();
// deploySimpleB().then();

// setupABTest().then()
// setupABDone().then();

testInfo().then()

