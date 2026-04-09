const hre = require("hardhat");
const {ethers} = hre;
const {deployPhase1Infra} = require("./phase1_infra");
const {loadConfig} = require("../shared/env");
const {writeArtifact} = require("../shared/artifacts");
const {logStep} = require("../shared/log");

async function main() {
    const environment = loadConfig();

    logStep(`Deploy contracts for ${environment.name}`);

    const deployed = await deployPhase1Infra(environment);
    const network = await ethers.provider.getNetwork();

    writeArtifact(environment, "infra", {
        environment: environment.name,
        network: hre.network.name,
        chainId: Number(network.chainId),
        rpcUrl: environment.rpcUrl,
        libraries: deployed.libraries,
        contracts: deployed.contracts,
    });

    writeArtifact(environment, "runtime", {
        environment: environment.name,
        network: hre.network.name,
        chainId: Number(network.chainId),
        rpcUrl: environment.rpcUrl,
        contracts: deployed.contracts,
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
