const hre = require("hardhat");
const {ethers} = hre;
const accounts = require("../../deployments/account.json");
const {logStep} = require("../shared/log");

async function deployPhase2Token(environment, deployed) {
    logStep("Deploy phase 2 token");

    const node3Institution = environment.institutions.find((institution) => institution.name === "Node3");
    if (!node3Institution) {
        throw new Error("Node3 institution configuration is required");
    }

    const tokenWallet = new ethers.Wallet(node3Institution.ethPrivateKey, ethers.provider);
    const tokenFactory = await ethers.getContractFactory("PrivateUSDC", {
        libraries: {
            TokenEventLib: deployed.libraries.TokenEventLib,
            TokenUtilsLib: deployed.libraries.TokenUtilsLib,
            TokenVerificationLib: deployed.libraries.TokenVerificationLib,
            SignatureChecker: deployed.libraries.SignatureChecker,
        },
        signer: tokenWallet,
    });

    const implementation = await tokenFactory.deploy();
    await implementation.waitForDeployment();

    const proxyFactory = await ethers.getContractFactory("PrivateUSDCProxy", tokenWallet);
    const proxy = await proxyFactory.deploy(implementation.target);
    await proxy.waitForDeployment();

    const privateUSDC = await ethers.getContractAt("PrivateUSDC", proxy.target, tokenWallet);
    const tx = await privateUSDC.initialize(
        environment.token.name,
        environment.token.symbol,
        environment.token.currency,
        environment.token.decimals,
        environment.roles.owner,
        environment.roles.pauser,
        environment.roles.blackLister,
        environment.roles.owner,
        deployed.contracts.HamsaL2Event,
        deployed.contracts.InstUserProxy,
    );
    await tx.wait();

    deployed.contracts.PrivateERCToken = proxy.target;
    deployed.contracts.PrivateERCTokenImplementation = implementation.target;
    deployed.accounts = {
        Owner: accounts.Owner,
        OwnerKey: accounts.OwnerKey,
        MasterMinter: accounts.MasterMinter,
        Pauser: accounts.Pauser,
        BlackLister: accounts.BlackLister,
    };

    return deployed;
}

module.exports = {
    deployPhase2Token,
};
