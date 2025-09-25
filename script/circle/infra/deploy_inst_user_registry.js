const {ethers} = require("hardhat");
const {getEnvironmentConfig} = require('../deploy_help.js');

async function deployInstProxy(deployed) {
    let [deployer] = await ethers.getSigners();

    const Fixed_Addresses = getEnvironmentConfig();

    if (!Fixed_Addresses.PROXY_ADDRESS) {
        console.log("deployInstProxy deployment starts");

        const Proxy = await ethers.getContractFactory("InstPercentRouterProxy");
        const proxy = await Proxy.deploy(deployed.contracts.InstitutionUserRegistry);
        await proxy.waitForDeployment();
        console.log("proxy is deployed at: ", proxy.target)


        const proxied = await ethers.getContractAt("InstitutionUserRegistry", proxy.target);
        let tx = await proxied.initialize(deployer.address, deployed.contracts.HamsaL2Event);
        await tx.wait();

        deployed.contracts.InstUserProxy = proxy.target

        console.log("proxy initialization is done")

        let result = await proxied.getEventAddress();
        console.log("registry event: ", result);

        console.log("deployInstProxy deployment completed");
    } else {
        const proxy = await ethers.getContractAt("InstPercentRouterProxy", Fixed_Addresses.PROXY_ADDRESS);
        let tx = await proxy.setImplementationA(deployed.contracts.InstitutionUserRegistry)
        await tx.wait();

        deployed.contracts.InstUserProxy = Fixed_Addresses.PROXY_ADDRESS
        console.log("deployInstProxy is skipped due to address in circle/configuration.js")
    }
}

async function deployInstUserRegistry(deployed) {
    let [deployer] = await ethers.getSigners();
    console.log("InstUserRegistry deployment starts");

    const Fixed_Addresses = getEnvironmentConfig();

    if (!Fixed_Addresses.INSTITUTION_REGISTRATION) {
        console.log("Deploying new InstitutionUserRegistry.sol contract...");
        const InstitutionUserRegistryFactory = await ethers.getContractFactory("InstitutionUserRegistry", {
            libraries: {
                "TokenEventLib": deployed.libraries.TokenEventLib,
            }
        });
        const institutionUserRegistry = await InstitutionUserRegistryFactory.deploy();
        await institutionUserRegistry.waitForDeployment();

        deployed.contracts.InstitutionUserRegistry = institutionUserRegistry.target;
        console.log("InstitutionUserRegistry.sol deployed to:", institutionUserRegistry.target);

    } else {
        console.log("Reusing existing InstitutionUserRegistry.sol at:", Fixed_Addresses.INSTITUTION_REGISTRATION);
        deployed.contracts.InstitutionUserRegistry = Fixed_Addresses.INSTITUTION_REGISTRATION;
    }
    console.log("InstUserRegistry deployment finished");
}

module.exports = {
    deployInstProxy,
    deployInstUserRegistry
};