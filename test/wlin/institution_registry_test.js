const {ethers} = require('hardhat');
const deployed = require("../../deployments/image9.json")

const registry_address = "0xfeA7B62B9fa8f7bd50ceB661a71A950E5Ef75087"

const bankAddress = "0x2c44c4B96AE5f9c9dbf32cF3AA743Cd0277F3127"
const bankPublicKey = {
    x: "0x27c07a015b9e7d73519e8bcfc8ddd6cf760b51f55938e0f83affb2ff7d244220",
    y: "0x27e09fb8be7b593a38e107cce390183bd2b15eea7b62c4cc8ad7fae388c9b66f",
}

async function deployRegistry() {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });

    const instRegistry = await InstRegistry.deploy(deployed.contracts.HamsaL2Event);
    await instRegistry.waitForDeployment();

    console.log("InstitutionUserRegistry is deployed at: ", instRegistry.target);
}

async function testRegistryInstMissingName() {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });
    const instRegistry = await InstRegistry.attach(registry_address);
    let tx = await instRegistry.registerInstitution(bankAddress, "", bankPublicKey, "http");
    console.log("tx: ", tx)
}

async function testRegistryInstMissingPublicKey() {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });
    const instRegistry = await InstRegistry.attach(registry_address);
    let tx = await instRegistry.registerInstitution(bankAddress, "node1", {x:0, y:0}, "http");
    console.log("tx: ", tx)
}

async function testRegistryInstMissingNodeUrl() {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });
    const instRegistry = await InstRegistry.attach(registry_address);
    let tx = await instRegistry.registerInstitution(bankAddress, "node1", bankPublicKey, "");
    console.log("tx: ", tx)
}


async function testRegistryInstCorrectly() {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });
    const instRegistry = await InstRegistry.attach(registry_address);
    let tx = await instRegistry.registerInstitution(bankAddress, "node1", bankPublicKey, "http://www.visa.com");
    let receipt = await tx.wait();
}

async function testUpdateNotRegisteredInst() {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });
    const instRegistry = await InstRegistry.attach(registry_address);
    let tx = await instRegistry.updateInstitution("0x85FC6056e234c36860C7B0ae451c24E041eE939F", "node1", "http://www.visa-update.com");
    await tx.wait();
}

async function testUpdateInstNodeUrl() {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });
    const instRegistry = await InstRegistry.attach(registry_address);
    let tx = await instRegistry.updateInstitution(bankAddress, "node1-update", "http://www.visa-update2.com");
    await tx.wait();

    let inst = await instRegistry.getInstitution(bankAddress);
    console.log("updated inst: ", inst);
}

// deployRegistry().then();
// testRegistryInstMissingName().then();
// testRegistryInstMissingPublicKey().then();
// testRegistryInstMissingNodeUrl().then();

// testRegistryInstCorrectly().then();
// testUpdateNotRegisteredInst().then();
testUpdateInstNodeUrl().then()