const {ethers, network}=require("hardhat");
const {networks} = require("../../hardhat.config");
const {ether} = require("@openzeppelin/test-helpers");

const dummyTokenAddress = "0x05CFcc5c600945df11BB799344bE75429Dc72097";


async function deployDummyToken() {
    const DummyToken = await ethers.getContractFactory("DummyToken");
    const dummyToken = await  DummyToken.deploy();
    await dummyToken.waitForDeployment()
    console.log("dummyToken is deployed at: ", await dummyToken.getAddress());
}

async function getCode() {
    const code = await ethers.provider.getCode(dummyTokenAddress);
    console.log("code", code);
}


async function getStorage() {
    const value = await ethers.provider.getStorage(dummyTokenAddress, 5);
    console.log("storage", value);
}

async function getValue() {
    const dummyToken = await  ethers.getContractAt("DummyToken",dummyTokenAddress);
    const value = await dummyToken.echo();
    console.log("value", value);
}

async function setValue() {
    const dummyToken = await  ethers.getContractAt("DummyToken",dummyTokenAddress);
    let tx = await dummyToken.update();
    await tx.wait();
}
async function getFixArrayItem() {
    const dummyToken = await  ethers.getContractAt("DummyToken",dummyTokenAddress);
    let value = await dummyToken.fixValues(1);
    console.log("value", value);
}

async function getDynArrayItem() {
    const dummyToken = await  ethers.getContractAt("DummyToken",dummyTokenAddress);
    let value = await dummyToken.dynValues(1);
    console.log("value", value);
}

async function updateFirstCassStudent() {
    const dummyToken = await  ethers.getContractAt("DummyToken",dummyTokenAddress);
    let tx = await dummyToken.updateFirstClassStudent({
        id:1,
        name:"wenhao",
        score: 99
    });
    let receipt = await tx.wait();
    console.log("receipt", receipt);
}

async function getFirstCassStudent() {
    let [deployer] = await ethers.getSigners();
    const dummyToken = await  ethers.getContractAt("DummyToken",dummyTokenAddress);
    let resp = await  dummyToken.firstClass(deployer.address)
    console.log("resp", resp);
}

async function updateOtherCassStudent() {
    const dummyToken = await  ethers.getContractAt("DummyToken",dummyTokenAddress);
    let tx = await dummyToken.updateOtherClassStudent(100, {
        id: 3,
        name:"sally",
        score: 99
    });
    let receipt = await tx.wait();
    console.log("receipt", receipt);
}

async function getOtherCassStudent() {
    let [deployer] = await ethers.getSigners();
    const dummyToken = await  ethers.getContractAt("DummyToken",dummyTokenAddress);
    let resp = await  dummyToken.getOtherClassStudent(100)
    console.log("resp", resp);
}

// deployDummyToken().then();
// getCode().then()
// getStorage().then();
// getValue().then()
// getFixArrayItem().then()
// getFixArrayItem().then()
// getDynArrayItem().then()
// getFirstCassStudent().then();
getOtherCassStudent().then();

// updateFirstCassStudent().then();
// updateOtherCassStudent().then();




// setValue().then();

