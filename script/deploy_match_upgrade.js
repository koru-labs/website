const hre = require("hardhat");
require("@openzeppelin/hardhat-upgrades");



async function deploy() {
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deploying contracts with the account: ${deployer.address}`);

    // 部署 PoseidonHasher 和 PoseidonT4
    const PoseidonHasher = await hre.ethers.getContractFactory("PoseidonHasher");
    const poseidonHasher = await PoseidonHasher.deploy();
    await poseidonHasher.waitForDeployment();
    console.log("PoseidonHasher is deployed at ", poseidonHasher.target);

    const PoseidonT4 = await hre.ethers.getContractFactory("PoseidonT4");
    const poseidonT4 = await PoseidonT4.deploy();
    await poseidonT4.waitForDeployment();
    console.log("PoseidonT4 is deployed at ", poseidonT4.target);

    // 获取 DvpMatchLogic 合约工厂
    const DvpMatchLogic = await hre.ethers.getContractFactory("DvpMatch", {
        libraries: {
            PoseidonHasher: poseidonHasher.target,
            PoseidonT4: poseidonT4.target
        },
    });
    const dvpMatchLogic = await DvpMatchLogic.deploy();
    await dvpMatchLogic.waitForDeployment();
    console.log(`DvpMatchLogic deployed to: ${dvpMatchLogic.target}`);

    // 部署代理合约
    const DvpMatchProxy = await hre.ethers.getContractFactory("TransparentProxy");
    const dvpMatchProxy = await DvpMatchProxy.deploy(dvpMatchLogic.target, deployer.address, "0x");
    await dvpMatchProxy.waitForDeployment();
    console.log(`DvpMatchProxy deployed to: ${dvpMatchProxy.target}`);


    // 部署 DvpMatchLogicV2
    const DvpMatchLogicV2 = await hre.ethers.getContractFactory("DvpMatch", {
        libraries: {
            PoseidonHasher: poseidonHasher.target,
            PoseidonT4: poseidonT4.target
        },
    });
    const dvpMatchLogicV2 = await DvpMatchLogicV2.deploy();
    await dvpMatchLogicV2.waitForDeployment();
    console.log("DvpMatchLogicV2 deployed to:", await dvpMatchLogicV2.getAddress());

    await dvpMatchProxy.upgradeTo(dvpMatchProxy.target);
    console.log("Upgraded to DvpMatchLogicV2");
}

async function upgrades() {
    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deploying contracts with the account: ${deployer.address}`);
    const dvpMatchProxyAddress = "0xE8c39eb64789c72A1fa3C2a9E75c84E4016c493f"


    // 部署 PoseidonHasher 和 PoseidonT4
    const PoseidonHasher = await hre.ethers.getContractFactory("PoseidonHasher");
    const poseidonHasher = await PoseidonHasher.deploy();
    await poseidonHasher.waitForDeployment();
    console.log("PoseidonHasher is deployed at ", poseidonHasher.target);

    const PoseidonT4 = await hre.ethers.getContractFactory("PoseidonT4");
    const poseidonT4 = await PoseidonT4.deploy();
    await poseidonT4.waitForDeployment();
    console.log("PoseidonT4 is deployed at ", poseidonT4.target);

    // 部署代理合约
    const dvpMatchProxy = await hre.ethers.getContractAt("TransparentProxy",
        dvpMatchProxyAddress);
    console.log("dvpMatchProxy:", dvpMatchProxy.target);

    // 获取 DvpMatchLogic 合约工厂
    const DvpMatchLogicV2 = await hre.ethers.getContractFactory("DvpMatch", {
        libraries: {
            PoseidonHasher: poseidonHasher.target,
            PoseidonT4: poseidonT4.target
        },
    });
    const dvpMatchLogicV2 = await DvpMatchLogicV2.deploy();
    await dvpMatchLogicV2.waitForDeployment();

    console.log("DvpMatchLogicV2 deployed to:", await dvpMatchLogicV2.getAddress());
    await dvpMatchProxy.upgradeTo(dvpMatchLogicV2.target);//必须管理员操作
    console.log("Upgraded to DvpMatchLogicV2");

    //管理员只能调用 upgradeTo
    //管理员不能调用其他方法
    //poseidonHasherAddress和poseidonT4Address，可以重新生成

}



// deploy().then();
// upgrades().then();
