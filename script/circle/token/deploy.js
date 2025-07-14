const hre = require("hardhat");
const {ethers} = hre;
const fs = require("fs");
const path = require("path");

const { deployToken,
    allowBanksInTokenSmartContract,
    setMinterAllowed} = require("./deploy_token")

const {loadExistingDeployments, saveDeploymentInfo} = require("../deploy_help");

async function main() {
    const deployed = require('../../../deployments/image9.json');

    await deployToken(deployed)
    await allowBanksInTokenSmartContract(deployed);
    await setMinterAllowed(deployed)
    await saveDeploymentInfo(deployed,hre, ethers, fs, path)
}

main().then();