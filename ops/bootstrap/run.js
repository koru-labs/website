const hre = require("hardhat");
const {ethers} = hre;
const {deployPhase2Token} = require("../deploy/phase2_token");
const {loadConfig} = require("../shared/env");
const {readArtifact, writeArtifact} = require("../shared/artifacts");
const {logStep} = require("../shared/log");
const {registerInstitutions, registerUsers} = require("./register");
const {configureMinters} = require("./minters");

async function main() {
    const environment = loadConfig();
    const deployed = readArtifact(environment, "infra");

    logStep(`Bootstrap contracts for ${environment.name}`);

    const registeredInstitutions = await registerInstitutions(environment, deployed);
    if (registeredInstitutions.length === 0) {
        throw new Error("No institution was registered. Check ops environment config before bootstrap.");
    }

    await deployPhase2Token(environment, deployed);
    const userResult = await registerUsers(environment, deployed);
    const configuredMinters = await configureMinters(environment, deployed);
    const network = await ethers.provider.getNetwork();

    writeArtifact(environment, "bootstrap", {
        environment: environment.name,
        network: hre.network.name,
        chainId: Number(network.chainId),
        registeredInstitutions,
        registeredUsers: userResult.registeredUsers,
        skippedInstitutions: userResult.skippedInstitutions,
        configuredMinters,
    });

    writeArtifact(environment, "deployment", {
        environment: environment.name,
        network: hre.network.name,
        chainId: Number(network.chainId),
        rpcUrl: environment.rpcUrl,
        libraries: deployed.libraries,
        contracts: deployed.contracts,
        accounts: deployed.accounts || {},
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
