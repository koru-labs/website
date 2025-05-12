const hre = require("hardhat");
const {ethers} = hre;

async function deployEscorting() {
    const [deployer] = await ethers.getSigners()
    const DvpEscorting = await ethers.getContractFactory("DvpEscrow");
    const escorting = await DvpEscorting.deploy();
    await escorting.waitForDeployment();
    console.log("escorting is deployed to: ", escorting.target);
    // console.log("the deploy has address", await deployer.getAddress())

    // const SimpleToken = await ethers.getContractFactory("Simple");
    // const simple = await SimpleToken.deploy("simple", "s$");
    // await simple.waitForDeployment()
    // console.log("simple is deployed to:", simple.target);
}

async function deploySimpleToken() {
    const [deployer] = await ethers.getSigners()
    const SimpleToken = await ethers.getContractFactory("Simple");
    const simple = await SimpleToken.deploy("simple", "s$");
    await simple.waitForDeployment()
    console.log("simple is deployed to:", simple.target);
}

// deploySimpleToken().then()
deployEscorting().then()