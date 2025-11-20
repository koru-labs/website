const hre = require("hardhat");
const {ethers} = hre;
const fs = require("fs");
const path = require("path");

const { deployToken,
    allowBanksInTokenSmartContract,
    setMinterAllowed,
    deployTokenDemoBank,
    setMinterAllowedDemoBank,
    allowBanksInTokenSmartContractDemoBank

} = require("./deploy_token")

const {loadExistingDeployments, saveDeploymentInfo, getImage9EnvironmentData} = require("../deploy_help");

async function main() {
    const deployed = getImage9EnvironmentData();

    await deployToken(deployed);
    await allowBanksInTokenSmartContract(deployed);
    await setMinterAllowed(deployed);
    await saveDeploymentInfo(deployed, hre, ethers, fs, path)

    // deploy demo bank
    // await deployTokenDemoBank(deployed);
    // await setMinterAllowedDemoBank(deployed);
    // await saveDeploymentInfo(deployed, hre, ethers, fs, path)

}

main().then();