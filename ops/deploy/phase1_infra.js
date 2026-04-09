const hre = require("hardhat");
const {ethers} = hre;
const {logInfo, logStep} = require("../shared/log");

async function deployContract(name, args = [], options = undefined) {
    const factory = await ethers.getContractFactory(name, options);
    const contract = await factory.deploy(...args);
    await contract.waitForDeployment();
    logInfo(`${name} deployed`, contract.target);
    return contract;
}

async function deployPhase1Infra(environment) {
    logStep("Deploy phase 1 infra");

    const deployed = {
        libraries: {},
        contracts: {},
        metadata: {
            environment: environment.name,
            network: hre.network.name,
        },
    };

    const curveBabyJubJub = await deployContract("CurveBabyJubJub");
    deployed.libraries.CurveBabyJubJub = curveBabyJubJub.target;

    const curveBabyJubJubHelper = await deployContract("CurveBabyJubJubHelper", [], {
        libraries: {
            CurveBabyJubJub: deployed.libraries.CurveBabyJubJub,
        },
    });
    deployed.libraries.CurveBabyJubJubHelper = curveBabyJubJubHelper.target;

    const mintAllowedTokenVerifier = await deployContract("MintAllowedTokenVerifier");
    deployed.libraries.MintAllowedTokenVerifier = mintAllowedTokenVerifier.target;

    const splitTokenVerifier = await deployContract("SplitTokenVerifier");
    deployed.libraries.SplitTokenVerifier = splitTokenVerifier.target;

    const splitAllowanceTokenVerifier = await deployContract("SplitAllowanceTokenVerifier");
    deployed.libraries.SplitAllowanceTokenVerifier = splitAllowanceTokenVerifier.target;

    const convert2pUSDCVerifier = await deployContract("Convert2pUSDCVerifier");
    deployed.libraries.Convert2pUSDCVerifier = convert2pUSDCVerifier.target;

    const convert2USDCVerifier = await deployContract("Convert2USDCVerifier");
    deployed.libraries.Convert2USDCVerifier = convert2USDCVerifier.target;

    const revealTotalSupplyVerifier = await deployContract("RevealTotalSupplyVerifier");
    deployed.libraries.RevealTotalSupplyVerifier = revealTotalSupplyVerifier.target;

    const tokenVerificationLib = await deployContract("TokenVerificationLib", [], {
        libraries: {
            MintAllowedTokenVerifier: deployed.libraries.MintAllowedTokenVerifier,
            SplitTokenVerifier: deployed.libraries.SplitTokenVerifier,
            SplitAllowanceTokenVerifier: deployed.libraries.SplitAllowanceTokenVerifier,
            Convert2pUSDCVerifier: deployed.libraries.Convert2pUSDCVerifier,
            Convert2USDCVerifier: deployed.libraries.Convert2USDCVerifier,
            RevealTotalSupplyVerifier: deployed.libraries.RevealTotalSupplyVerifier,
        },
    });
    deployed.libraries.TokenVerificationLib = tokenVerificationLib.target;

    const signatureChecker = await deployContract("SignatureChecker");
    deployed.libraries.SignatureChecker = signatureChecker.target;

    const tokenEventLib = await deployContract("TokenEventLib");
    deployed.libraries.TokenEventLib = tokenEventLib.target;

    const tokenUtilsLib = await deployContract("contracts/ucl/circle/lib/TokenUtilsLib.sol:TokenUtilsLib");
    deployed.libraries.TokenUtilsLib = tokenUtilsLib.target;

    let hamsaImplementationAddress = environment.addresses.HAMSAL2EVENT_IMPLEMENTATION;
    if (!hamsaImplementationAddress) {
        const implementation = await deployContract("HamsaL2Event");
        hamsaImplementationAddress = implementation.target;
    }
    deployed.contracts.HamsaL2EventImplementation = hamsaImplementationAddress;

    let hamsaProxyAddress = environment.addresses.HAMSAL2EVENT_PROXY;
    if (!hamsaProxyAddress) {
        const proxy = await deployContract("HamsaL2EventProxy", [hamsaImplementationAddress]);
        hamsaProxyAddress = proxy.target;
    } else {
        const proxy = await ethers.getContractAt("HamsaL2EventProxy", hamsaProxyAddress);
        const tx = await proxy.setImplementationA(hamsaImplementationAddress);
        await tx.wait();
    }
    deployed.contracts.HamsaL2Event = hamsaProxyAddress;

    const institutionRegistryAddress = environment.addresses.INSTITUTION_REGISTRATION;
    if (institutionRegistryAddress) {
        deployed.contracts.InstitutionUserRegistry = institutionRegistryAddress;
    } else {
        const registry = await deployContract("InstitutionUserRegistry", [], {
            libraries: {
                TokenEventLib: deployed.libraries.TokenEventLib,
            },
        });
        deployed.contracts.InstitutionUserRegistry = registry.target;
    }

    let instUserProxyAddress = environment.addresses.PROXY_ADDRESS;
    if (!instUserProxyAddress) {
        const proxy = await deployContract("InstPercentRouterProxy", [
            deployed.contracts.InstitutionUserRegistry,
        ]);
        instUserProxyAddress = proxy.target;
        const [deployer] = await ethers.getSigners();
        const proxiedRegistry = await ethers.getContractAt("InstitutionUserRegistry", instUserProxyAddress);
        const tx = await proxiedRegistry.initialize(deployer.address, deployed.contracts.HamsaL2Event);
        await tx.wait();
    } else {
        const proxy = await ethers.getContractAt("InstPercentRouterProxy", instUserProxyAddress);
        const tx = await proxy.setImplementationA(deployed.contracts.InstitutionUserRegistry);
        await tx.wait();
    }
    deployed.contracts.InstUserProxy = instUserProxyAddress;

    return deployed;
}

module.exports = {
    deployPhase1Infra,
};
