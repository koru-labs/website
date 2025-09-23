const hre = require("hardhat");
const {ethers} = hre;
const fs = require("fs");
const path = require("path");
const  {
    deployLibs,
    deployL2Event, deployL1Handle,deployL1BlobCommitmentVerify
} = require("./deploy_infra")
const {deployInstProxy, deployInstUserRegistry} = require("./deploy_inst_user_registry")

async function main() {
    let deployed = {
        libraries: {},
        contracts: {},
        accounts: {},
    };

    await deployLibs(deployed);
    await deployL2Event(deployed);
    // await deployL1Handle(deployed);
    // await deployL1BlobCommitmentVerify(deployed);
    await deployInstUserRegistry(deployed);
    await deployInstProxy(deployed);
    await saveDeploymentInfo(deployed,hre, ethers, fs, path);
}

main().then();

//execute after main is completed and k8s configuration is updated and ucl-node are been restarted
// registerInstitutionAndUser().then();