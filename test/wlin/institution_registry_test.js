const {ethers} = require('hardhat');
const deployed = require("../../deployments/image9.json")
const hardhatConfig = require('../../hardhat.config');

const inst_data_address="0x4B6EeCBAd11f32534E75c132D4fe79E6Ef83ebE5";
const registry_address = "0x6Bd7701FC4CF215076e0196D8A621032408D11b0"

const bankAddress = "0x2c44c4B96AE5f9c9dbf32cF3AA743Cd0277F3127"
const bankPrivateKey="f951e1bd9ef0359e6886ae77e5fd30d566ef098d099c78fd3fb68588657618cc"
const bankPublicKey = {
    x: "0x27c07a015b9e7d73519e8bcfc8ddd6cf760b51f55938e0f83affb2ff7d244220",
    y: "0x27e09fb8be7b593a38e107cce390183bd2b15eea7b62c4cc8ad7fae388c9b66f",
}
const userAddress="0xbA268f776F70caDB087e73020dfE41c7298363Ed";

const l1CustomNetwork = {
    name: "BESU",
    chainId: 1337
};
const options = {
    batchMaxCount: 1,
    staticNetwork: true
};


const L1Url = hardhatConfig.networks.ucl_L2.url;
const l1Provider = new ethers.JsonRpcProvider(L1Url, l1CustomNetwork, options);
const bankManagerWallet = new ethers.Wallet(bankPrivateKey, l1Provider);



async function deployData() {
    const InstData = await ethers.getContractFactory("InstitutionUserData");
    const instData = await InstData.deploy();
    await instData.waitForDeployment();
    console.log("instData is deployed at: ", instData.target)
}

async function deployRegistry() {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });

    const instRegistry = await InstRegistry.deploy(deployed.contracts.HamsaL2Event, inst_data_address);
    await instRegistry.waitForDeployment();
    console.log("InstitutionUserRegistry is deployed at: ", instRegistry.target);

    const InstData = await ethers.getContractFactory("InstitutionUserData");
    const instData= InstData.attach(inst_data_address);
    let tx = await instData.setAllowedCaller(instRegistry.target, true);
    await tx.wait();
}

async function testRegistryInstMissingName() {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });
    const instRegistry = await InstRegistry.attach(registry_address);
    let tx = await instRegistry.registerInstitution(bankAddress, "", bankPublicKey, "http", "http");
    console.log("tx: ", tx)
}

async function testRegistryInstMissingPublicKey() {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });
    const instRegistry = await InstRegistry.attach(registry_address);
    let tx = await instRegistry.registerInstitution(bankAddress, "node1", {x:0, y:0}, "http", "http");
    console.log("tx: ", tx)
}

async function testRegistryInstMissingNodeUrl() {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });
    const instRegistry = await InstRegistry.attach(registry_address);
    let tx = await instRegistry.registerInstitution(bankAddress, "node1", bankPublicKey, "", "http");
    console.log("tx: ", tx)
}

async function testRegistryInstMissingHttpUrl() {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });
    const instRegistry = await InstRegistry.attach(registry_address);
    let tx = await instRegistry.registerInstitution(bankAddress, "node1", bankPublicKey, "http", "");
    console.log("tx: ", tx)
}


async function testRegistryInstCorrectly() {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });
    const instRegistry = await InstRegistry.attach(registry_address);
    let tx = await instRegistry.registerInstitution(bankAddress, "node1", bankPublicKey, "https://www.visa.com:8443",  "http://www.visa.com:8080" );
    let receipt = await tx.wait();

    let inst = await instRegistry.getInstitution(bankAddress);
    console.log("on-chain inst: ", inst);

}

async function testUpdateNotRegisteredInst() {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });
    const instRegistry = await InstRegistry.attach(registry_address);
    let tx = await instRegistry.updateInstitution("0x85FC6056e234c36860C7B0ae451c24E041eE939F", "node1", "http://www.visa-update.com", "");
    await tx.wait();
}

async function testUpdateInstNodeUrl() {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });
    const instRegistry = await InstRegistry.attach(registry_address);
    let tx = await instRegistry.updateInstitution(bankAddress, "node1-update", "http://www.visa-update2.com","");
    await tx.wait();

    let inst = await instRegistry.getInstitution(bankAddress);
    console.log("updated inst: ", inst);
}

async function testUpdateInstHttpUrl() {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });
    const instRegistry = await InstRegistry.attach(registry_address);
    let tx = await instRegistry.updateInstitution(bankAddress, "node1-update", "", "http://www.visa-update.com:8080");
    await tx.wait();

    let inst = await instRegistry.getInstitution(bankAddress);
    console.log("updated inst: ", inst);
}

async function testInstituteInformation() {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });
    const instRegistry = await InstRegistry.attach(registry_address);
    let inst = await instRegistry.getInstitution(bankAddress);
    console.log("inst info ", inst);
}

async function testUserInformation() {
    const InstRegistry = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });
    const instRegistry = await InstRegistry.attach(registry_address);
    let inst = await instRegistry.getUserManager(bankAddress);
    console.log("user manager ", inst);
}

async function testRegisterUser() {
    const instRegistry = await ethers.getContractAt("InstitutionUserRegistry", registry_address, bankManagerWallet);
    let tx = await instRegistry.registerUser(userAddress);
    await tx.wait();

    let result = await instRegistry.getUserManager(userAddress)
    console.log("user manager: ", result);
}

async function testRemoveUser() {
    const instRegistry = await ethers.getContractAt("InstitutionUserRegistry", registry_address, bankManagerWallet);
    let tx = await instRegistry.registerUser(userAddress);
    await tx.wait();

    tx = await instRegistry.removeUser(userAddress)
    await tx.wait();

    let result2 = await instRegistry.getUserManager(userAddress)
    console.log("user after remove: ", result2);
}

async function  testIsInstitutionManager() {
    const instRegistry = await ethers.getContractAt("InstitutionUserRegistry", registry_address, bankManagerWallet);
    let result = await instRegistry.isInstitutionManager(bankAddress);
    console.log("result: ", result);
}

// deployData().then();
// deployRegistry().then();
// testRegistryInstMissingName().then();
// testRegistryInstMissingPublicKey().then();
// testRegistryInstMissingNodeUrl().then();
// testRegistryInstMissingHttpUrl().then();

// testRegistryInstCorrectly().then();

// testUpdateNotRegisteredInst().then();
// testUpdateInstNodeUrl().then()
// testUpdateInstHttpUrl().then();
// testInstituteInformation().then();

testRegisterUser().then();
// testRemoveUser().then();

// testUserInformation().then();

// testIsInstitutionManager().then();