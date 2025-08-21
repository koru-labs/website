const hre = require("hardhat");
const {ethers} = hre;
const fs = require("fs");
const path = require("path");
const  {
    deployLibs,
    deployL2Event, deployL1Handle,deployL1BlobCommitmentVerify
} = require("./deploy_infra")
const {deployInstProxy, deployInstUserRegistry} = require("./deploy_inst_user_registry")


const registerInstitutionAndUser = require("./register_inst_user")

const {loadExistingDeployments, saveDeploymentInfo} = require("../deploy_help");
const {sleep} = require("../../../test/help/testHelp");

async function main() {
    let deployed = {
        libraries: {},
        contracts: {},
        accounts: {},
    };

    await deployLibs(deployed);
    await deployL2Event(deployed);
    await deployL1Handle(deployed);
    // await deployL1BlobCommitmentVerify(deployed);
    await deployInstUserRegistry(deployed);
    await deployInstProxy(deployed);
    await saveDeploymentInfo(deployed,hre, ethers, fs, path);
    // await sleep(10000)
    // await registerInstitutionAndUser()
}

main().then();

//execute after main is completed and k8s configuration is updated and ucl-node are been restarted
// registerInstitutionAndUser().then();