const hre = require("hardhat");
const {ignition, ethers} = hre;

async function deploy() {
    const [deployer] = await ethers.getSigners();

    const tpftFactory = await ethers.getContractFactory("TPFt", deployer);
    const tpftContract = await tpftFactory.deploy();
    await tpftContract.waitForDeployment();
    const tpftAddress = tpftContract.target;
    console.log("tpft address:", tpftAddress);

    const tpft1002Factory = await ethers.getContractFactory("TPFtOperation1002", deployer);
    const tpft1002Contract = await tpft1002Factory.deploy('0x173e9c0FCad1c3628Bb177299053a71BF5ec1E66', tpftAddress);
    await tpft1002Contract.waitForDeployment();
    const tpft1002Address = tpft1002Contract.target;
    console.log("tpft1002 address:", tpft1002Address);

    const tpft1052Factory = await ethers.getContractFactory("TPFtOperation1052", deployer);
    const tpft1052Contract = await tpft1052Factory.deploy(tpftAddress);
    await tpft1052Contract.waitForDeployment();
    const tpft1052Address = tpft1052Contract.target;
    console.log("tpft1052 address:", tpft1052Address);
}

deploy().then()