const {loadConfig} = require("../shared/env");
const {readArtifact} = require("../shared/artifacts");

async function main() {
    const environment = loadConfig();
    const deployment = readArtifact(environment, "deployment");

    console.log("Mint scenario placeholder");
    console.log(JSON.stringify({
        environment: environment.name,
        token: deployment.contracts.PrivateERCToken,
        nextStep: "Implement proof generation and contract call flow in ops/scenarios/mint.js",
    }, null, 2));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
