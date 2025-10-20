const {expect} = require("chai");
const {ethers, network} = require("hardhat");

const deployed = require("../../deployments/image9.json");
const configuration = require("../../script/configuration");

describe("InstitutionUserRegistry token lookups", function () {
    let registry;
    let tokenAddress;
    let expectedInstitution;

    before(function () {
        if (network.name === "hardhat") {
            this.skip();
        }

        if (!deployed.contracts?.InstUserProxy || !deployed.contracts?.PrivateERCToken) {
            this.skip();
        }
    });

    before(async function () {
        tokenAddress = deployed.contracts.PrivateERCToken;
        registry = await ethers.getContractAt("InstitutionUserRegistry", deployed.contracts.InstUserProxy);

        const linkedManager = await registry.getTokenInstitutionManager(tokenAddress);
        expectedInstitution = configuration.institutions.find(
            (institution) => ethers.getAddress(institution.address) === ethers.getAddress(linkedManager)
        );

        expect(expectedInstitution, "Expected institution is not defined in configuration").to.not.be.undefined;
    });

    it("returns the institution manager linked to the deployed token", async function () {
        const linkedManager = await registry.getTokenInstitutionManager(tokenAddress);
        console.log("Linked manager:", linkedManager);
        expect(ethers.getAddress(linkedManager)).to.equal(ethers.getAddress(expectedInstitution.address));
    });

    it("returns the institution details linked to the deployed token", async function () {
        const linkedInstitution = await registry.getTokenInstitution(tokenAddress);
        console.log("Linked institution:", linkedInstitution);

        expect(ethers.getAddress(linkedInstitution.managerAddress)).to.equal(ethers.getAddress(expectedInstitution.address));
        expect(linkedInstitution.name).to.equal(expectedInstitution.name);
        expect(linkedInstitution.rpcUrl).to.equal(expectedInstitution.rpcUrl);
        expect(linkedInstitution.nodeUrl).to.equal(expectedInstitution.nodeUrl);
        expect(linkedInstitution.httpUrl).to.equal(expectedInstitution.httpUrl);
        expect(linkedInstitution.publicKey.x).to.equal(BigInt(expectedInstitution.publicKey.x));
        expect(linkedInstitution.publicKey.y).to.equal(BigInt(expectedInstitution.publicKey.y));
    });
});
