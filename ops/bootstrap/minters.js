const {ethers} = require("hardhat");
const {createAuthMetadata} = require("../shared/auth");
const {createOpsClient} = require("../shared/grpc");
const {logStep, logWarn} = require("../shared/log");

function extractMinterUsers(environment) {
    const minters = [];

    for (const institution of environment.institutions || []) {
        for (const user of institution.users || []) {
            if (!String(user.role || "").includes("minter")) {
                continue;
            }

            minters.push({
                institutionName: institution.name,
                institutionAddress: institution.address,
                institutionPrivateKey: institution.ethPrivateKey,
                grpcUrl: institution.grpcUrl,
                address: user.address,
            });
        }
    }

    return minters;
}

async function configureMinters(environment, deployed) {
    logStep("Configure token minters");

    const node3Institution = environment.institutions.find((institution) => institution.name === "Node3");
    if (!node3Institution || !node3Institution.grpcUrl) {
        logWarn("Skip minter bootstrap: Node3 grpcUrl is not configured");
        return [];
    }

    const tokenFactory = await ethers.getContractFactory("PrivateUSDC", {
        libraries: {
            TokenEventLib: deployed.libraries.TokenEventLib,
            TokenUtilsLib: deployed.libraries.TokenUtilsLib,
            TokenVerificationLib: deployed.libraries.TokenVerificationLib,
            SignatureChecker: deployed.libraries.SignatureChecker,
        },
    });
    const token = tokenFactory.attach(deployed.contracts.PrivateERCToken);
    const client = createOpsClient(node3Institution.grpcUrl);
    const metadata = await createAuthMetadata(environment.roles.ownerKey);
    const minters = extractMinterUsers(environment);
    const configured = [];

    for (const minter of minters) {
        const response = await client.encodeElgamalAmount(100000000, metadata);
        const privateAllowedAmount = {
            id: ethers.toBigInt(response.token_id),
            cl_x: ethers.toBigInt(response.amount.cl_x),
            cl_y: ethers.toBigInt(response.amount.cl_y),
            cr_x: ethers.toBigInt(response.amount.cr_x),
            cr_y: ethers.toBigInt(response.amount.cr_y),
        };

        const privacyTx = await token.configurePrivacyMinter(minter.address, privateAllowedAmount);
        await privacyTx.wait();

        const minterTx = await token.configureMinter(minter.address, 100000000);
        await minterTx.wait();

        configured.push(minter.address);
    }

    return configured;
}

module.exports = {
    configureMinters,
};
