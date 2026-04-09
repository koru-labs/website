const {ethers} = require("hardhat");
const {createAuthMetadata} = require("../shared/auth");
const {createOpsClient} = require("../shared/grpc");
const {logInfo, logStep, logWarn} = require("../shared/log");

function isInstitutionBootstrapReady(institution) {
    return Boolean(
        institution &&
        institution.address &&
        institution.name &&
        institution.rpcUrl &&
        institution.nodeUrl &&
        institution.httpUrl &&
        institution.publicKey &&
        institution.publicKey.x &&
        institution.publicKey.y
    );
}

function normalizeRole(role) {
    const roles = String(role || "normal")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

    const validRoles = roles
        .map((value) => (value === "admin" || value === "normal" || value === "minter" ? value : "normal"))
        .filter((value, index, self) => self.indexOf(value) === index);

    return validRoles.length > 0 ? validRoles.join(",") : "normal";
}

async function registerInstitutions(environment, deployed) {
    logStep("Register institutions");

    const registry = await ethers.getContractAt("InstitutionUserRegistry", deployed.contracts.InstUserProxy);
    const registered = [];

    for (const institution of environment.institutions || []) {
        if (!isInstitutionBootstrapReady(institution)) {
            logWarn(`Skip institution ${institution.name}: bootstrap fields are incomplete`);
            continue;
        }

        const existing = await registry.getInstitution(institution.address);
        if (existing.managerAddress !== ethers.ZeroAddress) {
            logInfo(`Institution already registered: ${institution.name}`);
        } else {
            const tx = await registry.registerInstitution({
                managerAddress: institution.address,
                name: institution.name,
                streetAddress: institution.streetAddress,
                suiteNo: institution.suiteNo,
                city: institution.city,
                state: institution.state,
                zip: institution.zip,
                email: institution.email,
                phoneNumber: institution.phoneNumber,
                publicKey: institution.publicKey,
                rpcUrl: institution.rpcUrl,
                nodeUrl: institution.nodeUrl,
                httpUrl: institution.httpUrl,
            });
            await tx.wait();
            logInfo(`Institution registered: ${institution.name}`);
        }

        const callersTx = await registry.replaceInstitutionCallers(
            institution.address,
            [institution.address],
        );
        await callersTx.wait();

        registered.push(institution.name);
    }

    return registered;
}

async function registerUsers(environment) {
    logStep("Register institution users");

    const results = {
        registeredUsers: [],
        skippedInstitutions: [],
    };

    for (const institution of environment.institutions || []) {
        if (!institution.grpcUrl) {
            results.skippedInstitutions.push({
                institution: institution.name,
                reason: "missing grpcUrl",
            });
            continue;
        }

        const client = createOpsClient(institution.grpcUrl);
        const metadata = await createAuthMetadata(institution.ethPrivateKey);

        for (const user of institution.users || []) {
            if (user.address.toLowerCase() === institution.address.toLowerCase()) {
                continue;
            }

            const normalizedRole = normalizeRole(user.role);
            const request = {
                account_address: user.address,
                account_roles: normalizedRole,
                first_name: user.first_name || "",
                last_name: user.last_name || "",
                email: user.email || "",
                phone_number: user.phone_number || "",
            };

            try {
                await client.registerAccount(request, metadata);
                results.registeredUsers.push({
                    institution: institution.name,
                    address: user.address,
                    role: normalizedRole,
                });
            } catch (error) {
                logWarn(`registerAccount failed for ${user.address}: ${error.message}`);
            }
        }
    }

    return results;
}

module.exports = {
    registerInstitutions,
    registerUsers,
};
