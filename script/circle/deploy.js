const hre = require("hardhat");
const {ethers} = hre;
const fs = require("fs");
const path = require("path");
const {address} = require("hardhat/internal/core/config/config-validation");
const accounts = require("../../deployments/account.json");
// let hamsal2event = "0x1a9122150280DBDB9f2b6b5438811d2943e3A6aA"; //dev
let hamsal2event = "0x80238AD5B21A9f253094073256d602f53131F82b";// qa
const ADDRESSES = {
    TOKEN_EVENT_LIB: "",
    HAMSAL2EVENT: hamsal2event,
    INSTITUTION_REGISTRATION: ""
};

// Add function to check existing deployments
async function loadExistingDeployments() {
    const deploymentsDir = path.join(__dirname, "../../deployments");
    const filepath = path.join(deploymentsDir, "image9.json");

    if (fs.existsSync(filepath)) {
        const data = fs.readFileSync(filepath, 'utf8');
        const existingDeployments = JSON.parse(data);

        // Get current network info
        const currentNetwork = hre.network.name;
        const currentChainId = (await ethers.provider.getNetwork()).chainId.toString();

        // Check if network matches
        if (existingDeployments.metadata?.network === currentNetwork &&
            existingDeployments.metadata?.chainId === currentChainId) {
            console.log(`Found existing deployments for network: ${currentNetwork} (chainId: ${currentChainId})`);
            return existingDeployments;
        } else {
            console.log(`Network mismatch detected. Previous deployment was on ${existingDeployments.metadata?.network} (chainId: ${existingDeployments.metadata?.chainId}), current network is ${currentNetwork} (chainId: ${currentChainId})`);
            console.log("Removing previous deployment information...");
            fs.unlinkSync(filepath);
            return null;
        }
    }
    return null;
}

async function main() {
    console.log("Deploy UCL SandBox smart contracts...");

    let deployed = {
        libraries: {},
        contracts: {},
        accounts: {},
    };

    // Load existing deployments
    const existingDeployments = await loadExistingDeployments();

    console.log("\n=== Deploy Nova Libs ===");

    // Check if all Nova libraries are already deployed
    const novaLibraries = [
        "Fr",
        "Fq",
        "RelaxedR1CSSNARKForSMLib",
        "BatchedRelaxedR1CSSNARKLib",
        "Field",
        "Grumpkin",
        "ZkVerifier"
    ];

    // const allNovaLibsDeployed = novaLibraries.every(lib => existingDeployments?.libraries?.[lib]);

    // don't do this as it make trouble shooting very difficult
    // if (!allNovaLibsDeployed)
    {
        console.log("Deploying all Nova libraries...");

        // Deploy Fr Lib
        const FrFactory = await ethers.getContractFactory("FrOps");
        const fr = await FrFactory.deploy();
        await fr.waitForDeployment();
        console.log("Fr Lib is deployed at :", fr.target);
        deployed.libraries.Fr = fr.target;

        // Deploy Fq Lib
        const FqFactory = await ethers.getContractFactory("FqOps");
        const fq = await FqFactory.deploy();
        await fq.waitForDeployment();
        console.log("Fq is deployed at :", fq.target);
        deployed.libraries.Fq = fq.target;

        // Deploy Field first as it's a dependency
        const Field = await ethers.getContractFactory("Field");
        const field = await Field.deploy();
        await field.waitForDeployment();
        console.log("Field is deployed at :", field.target);
        deployed.libraries.Field = field.target;

        // Deploy Grumpkin
        const Grumpkin = await ethers.getContractFactory("Grumpkin", {
            libraries: {
                "Field": field.target,
                "CommonUtilities": field.target,
            }
        });
        const grumpkin = await Grumpkin.deploy();
        await grumpkin.waitForDeployment();
        console.log("Grumpkin is deployed at :", grumpkin.target);
        deployed.libraries.Grumpkin = grumpkin.target;

        // Deploy RelaxedR1CSSNARKForSMLib
        const RelaxedR1CSSNARKForSMLibFactory = await ethers.getContractFactory("RelaxedR1CSSNARKForSMLib");
        const relaxedR1CSSNARKForSMLib = await RelaxedR1CSSNARKForSMLibFactory.deploy();
        await relaxedR1CSSNARKForSMLib.waitForDeployment();
        console.log("RelaxedR1CSSNARKForSMLib is deployed at :", relaxedR1CSSNARKForSMLib.target);
        deployed.libraries.RelaxedR1CSSNARKForSMLib = relaxedR1CSSNARKForSMLib.target;

        // Deploy BatchedRelaxedR1CSSNARKLib
        const BatchedRelaxedR1CSSNARKLibFactory = await ethers.getContractFactory("BatchedRelaxedR1CSSNARKLib");
        const batchedRelaxedR1CSSNARKLib = await BatchedRelaxedR1CSSNARKLibFactory.deploy();
        await batchedRelaxedR1CSSNARKLib.waitForDeployment();
        console.log("BatchedRelaxedR1CSSNARKLib is deployed at :", batchedRelaxedR1CSSNARKLib.target);
        deployed.libraries.BatchedRelaxedR1CSSNARKLib = batchedRelaxedR1CSSNARKLib.target;

        // Deploy ZkVerifier
        const ZkVerifierFactory = await ethers.getContractFactory("ZkVerifier", {
            libraries: {
                "RelaxedR1CSSNARKForSMLib": deployed.libraries.RelaxedR1CSSNARKForSMLib,
                "BatchedRelaxedR1CSSNARKLib": deployed.libraries.BatchedRelaxedR1CSSNARKLib
            }
        });
        const zkVerifier = await ZkVerifierFactory.deploy();
        await zkVerifier.waitForDeployment();
        console.log("ZkVerifier is deployed at:", zkVerifier.target);
        deployed.libraries.ZkVerifier = zkVerifier.target;
    }

    console.log("\n=== Deploy TokenSc Libs ===");
    console.log("Deploy TokenGrumpkinLib...");
    try {
        const TokenGrumpkinLibFactory = await ethers.getContractFactory("TokenGrumpkinLib", {
            libraries: {
                "Grumpkin": deployed.libraries.Grumpkin,
            }
        });
        const tokenGrumpkinLib = await TokenGrumpkinLibFactory.deploy();
        await tokenGrumpkinLib.waitForDeployment();
        console.log("TokenGrumpkinLib is deployed at :", tokenGrumpkinLib.target);
        deployed.libraries.TokenGrumpkinLib = tokenGrumpkinLib.target;
    } catch (error) {
        console.error("TokenGrumpkinLib deployment failed:", error.message);
    }

    console.log("Deploy TokenVerificationLib...");
    try {
        const TokenVerificationLibFactory = await ethers.getContractFactory("TokenVerificationLib", {
            libraries: {
                "ZkVerifier": deployed.libraries.ZkVerifier,
            }
        });
        const tokenVerificationLib = await TokenVerificationLibFactory.deploy();
        await tokenVerificationLib.waitForDeployment();
        console.log("TokenVerificationLib is deployed at :", tokenVerificationLib.target);
        deployed.libraries.TokenVerificationLib = tokenVerificationLib.target;
    } catch (error) {
        console.error("TokenVerificationLib deployment failed:", error.message);
    }

    if (ADDRESSES.TOKEN_EVENT_LIB == "") {
        console.log("Deploy TokenEventLib...");
        try {
            const TokenEventLibFactory = await ethers.getContractFactory("TokenEventLib");
            const tokenEventLib = await TokenEventLibFactory.deploy();
            await tokenEventLib.waitForDeployment();
            console.log("TokenEventLib is deployed at :", tokenEventLib.target);
            deployed.libraries.TokenEventLib = tokenEventLib.target;

        } catch (error) {
            console.error("TokenEventLib deployment failed:", error.message);
        }
    } else {
        console.log("Use already deployed TokenEventLib:", ADDRESSES.TOKEN_EVENT_LIB);
        deployed.libraries.TokenEventLib = ADDRESSES.TOKEN_EVENT_LIB;
    }


    console.log("\n=== Deploy business smart contracts ===");


    if (ADDRESSES.HAMSAL2EVENT == "") {
        console.log("Deploy HamsaL2Event...");

        const HamsaL2EventFactory = await ethers.getContractFactory("HamsaL2Event");
        const hamsaL2Event = await HamsaL2EventFactory.deploy();
        await hamsaL2Event.waitForDeployment();
        console.log("HamsaL2Event is deploy at :", hamsaL2Event.target);
        deployed.contracts.HamsaL2Event = hamsaL2Event.target;
    } else {
        deployed.contracts.HamsaL2Event = ADDRESSES.HAMSAL2EVENT
    }

    console.log("Checking InstitutionUserRegistry.sol smart contract...");
    if (ADDRESSES.INSTITUTION_REGISTRATION == "") {
        console.log("Deploying new InstitutionUserRegistry.sol contract...");
        const InstitutionUserRegistryFactory = await ethers.getContractFactory("InstitutionUserRegistry", {
            libraries: {
                "TokenEventLib": deployed.libraries.TokenEventLib,
            }
        });
        const institutionUserRegistry = await InstitutionUserRegistryFactory.deploy(deployed.contracts.HamsaL2Event);
        await institutionUserRegistry.waitForDeployment();

        console.log("InstitutionUserRegistry.sol deployed to:", institutionUserRegistry.target);
        deployed.contracts.InstitutionUserRegistry = institutionUserRegistry.target;


        await registerInstitutionAndUser(deployed.contracts.InstitutionUserRegistry);
    } else {
        console.log("Reusing existing InstitutionUserRegistry.sol at:", ADDRESSES.INSTITUTION_REGISTRATION);
        deployed.contracts.InstitutionUserRegistry = ADDRESSES.INSTITUTION_REGISTRATION;
    }

    const SignatureChecker = await ethers.getContractFactory("SignatureChecker")
    const signatureChecker = await SignatureChecker.deploy();
    await signatureChecker.waitForDeployment()
    deployed.libraries.SignatureChecker = signatureChecker.target;

    console.log("Deploy PrivateERCToken smart contract...");
    const PrivateUSDCFactory = await ethers.getContractFactory("PrivateUSDC", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
            "TokenVerificationLib": deployed.libraries.TokenVerificationLib,
            "TokenGrumpkinLib": deployed.libraries.TokenGrumpkinLib,
            "SignatureChecker": signatureChecker.target
        }
    });
    const event_address = deployed.contracts.HamsaL2Event;

    if (!deployed.libraries.TokenEventLib ||
        !deployed.libraries.TokenVerificationLib ||
        !deployed.libraries.Grumpkin ||
        !deployed.contracts.InstitutionUserRegistry) {
        throw new Error("Deployment of HamsaUSDC failed");
    }

    const privateUSDC = await PrivateUSDCFactory.deploy();
    await privateUSDC.waitForDeployment();
    console.log("PrivateERCToken is deployed at :", privateUSDC.target);
    deployed.contracts.PrivateERCToken = privateUSDC.target;


    console.log("Initializing PrivateERCToken...");
    const initTx = await privateUSDC.initialize(
        "Private ERC Token",
        "PET",
        "USD",
        6,
        accounts.MasterMinter,
        accounts.Pauser,
        accounts.BlackLister,
        accounts.Owner,
        event_address,
        deployed.contracts.InstitutionUserRegistry
    );
    await initTx.wait();
    console.log("PrivateERCToken initialized successfully");

    const minterAllowedAmount = {
        "cl_x": ethers.toBigInt("0x10029eb129bcca705cf2b0366bfb7b33f5cb462e47a4d600c8cabde8c4a44ed4"),
        "cl_y": ethers.toBigInt("0x09944660246404d26c916866dfa5d3d13dc3e739645d60803f240e0f5127fccb"),
        "cr_x": ethers.toBigInt("0x01269732a28d979aee067862a8aeb9ca6085c89180c198b6f13f20d10bdb4cd3"),
        "cr_y": ethers.toBigInt("0x0e4b8f1fc03b7dc6dc830ccd18b7ff4d82b667aea18aa4fca221b3d6830fa2a2"),
    }
    await privateUSDC.configurePrivacyMinter(accounts.Minter, minterAllowedAmount);
    await privateUSDC.configurePrivacyMinter(accounts.Minter2, minterAllowedAmount);


    await saveDeploymentInfo(deployed, hre, ethers, fs, path);
    console.log("\nDeployment is done ！");
    return deployed;
}

async function saveDeploymentInfo(deployed, hre, ethers, fs, path) {
    console.log("\n=== Save deployment information ===");

    deployed.metadata = {
        timestamp: new Date().toISOString(),
        network: hre.network.name,
        chainId: (await ethers.provider.getNetwork()).chainId.toString()
    };

    const deploymentsDir = path.join(__dirname, "../../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, {recursive: true});
    }

    const filepath = path.join(deploymentsDir, "image9.json");
    fs.writeFileSync(filepath, JSON.stringify(deployed, null, 2));
    console.log(`deployment information is saved to : ${filepath}`);
}


async function registerInstitutionAndUser(institutionUserRegistryAddress) {
    const institutionUserRegistry = await ethers.getContractAt("InstitutionUserRegistry", institutionUserRegistryAddress);

    const institutions = [
        {
            address: "0x2c44c4B96AE5f9c9dbf32cF3AA743Cd0277F3127",
            ethPrivateKey: "f951e1bd9ef0359e6886ae77e5fd30d566ef098d099c78fd3fb68588657618cc",
            name: "Node1",
            nodeUrl: "https://qa-node1-proxy.hamsa-ucl.com:8443",
            httpUrl: "http://qa-node1-http.hamsa-ucl.com:8080",
            publicKey: {
                x: "0x27c07a015b9e7d73519e8bcfc8ddd6cf760b51f55938e0f83affb2ff7d244220",
                y: "0x27e09fb8be7b593a38e107cce390183bd2b15eea7b62c4cc8ad7fae388c9b66f",
            },
            privateKey: "0x01d5d0f71878b433db00449efa0907786c05ef271b00e85fd0270bd445daa27e",
            userAddresses: [
                "0x5a3288A7400B2cd5e0568728E8216D9392094892"
            ]
        },
        {
            address: "0x03d68e57f1f9939d3FDcf97B5e7a1d0Be995Ec67",
            ethPrivateKey: "d9597e2d88463e47d1b6c2431879f06d440a6ff980a51a1f8c830623b112f329",
            name: "Node2",
            nodeUrl: "https://qa-node2-proxy.hamsa-ucl.com:8443",
            httpUrl: "http://qa-node2-http.hamsa-ucl.com:8080",
            publicKey: {
                x: "0x0fb17de4db5168ce623d3c5733f3f39273fb43b194018cadcd4653c9b1d65424",
                y: "0x2a3cfce65fe973a9354834fe93cd430b6480798166e4c33ab50f4c87843194fc",
            },
            privateKey: "0x20b4a40e591bedccb987de33572eb4f7cb09671743df43aa8f2b0023dbb6253c",
            userAddresses: [
                "0xF8041E1185C7106121952bA9914ff904A4A01c80"
            ]
        },
        {
            address: "0xf17f52151EbEF6C7334FAD080c5704D77216b732",
            ethPrivateKey: "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f",
            name: "Node3",
            nodeUrl: "https://qa-node3-proxy.hamsa-ucl.com:8443",
            httpUrl: "http://qa-node3-http.hamsa-ucl.com:8080",
            publicKey: {
                x: "0x260966dc3f87c49de63c2b777617f9f6ccb11b7be01d5248383618939453944a",
                y: "0x0012858a1d2ab976fd22a3620acd587b43319177bd677df84089630e21d7ffaf",
            },
            privateKey: "0x2fb5b87323812e6fb1ca82c18f7e822403a1076dca78cdb6511fe50e2bcb9610",
            userAddresses: [
                "0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB",
                "0xf17f52151EbEF6C7334FAD080c5704D77216b732",
                "0xf0b6C36D47f82Fc13eFEE4CC8223Dc19E6c0D766",
                "0x8c8af239FfB9A6e93AC4b434C71a135572A1021C",
                "0x4312488937D47A007De24d48aB82940C809EEb2b",
                "0x57829d5E80730D06B1364A2b05342F44bFB70E8f",
                "0xF50F25915126d936C64A194b2C1DAa1EA45392c4",
                "0x46946c52eb91cd2c8ed347b0a7758d9b22cee383",   //this is account in wlin meta-mask
            ]
        },
        {
            address: "0x93d2Ce0461C2612F847e074434d9951c32e44327",
            ethPrivateKey: "81690fb141b4ae5682ad1fd73b29ae1bcc67891e93de73c6f636402deac21171",
            name: "Node4",
            nodeUrl: "https://qa-node4-proxy.hamsa-ucl.com:8443",
            httpUrl: "http://qa-node4-http.hamsa-ucl.com:8080",
            publicKey: {
                x: "0x200617a15d2b14b21e7fcfee20970928fdec8caf78a8395996d39685f4416c55",
                y: "0x1020c7e93610321fdffa7ac019165450187eeab7188d54f2a251794100c115ed",
            },
            privateKey: "0x0a4d3802de2c9bfabe2cabc18f4f3a34141b412093187d7a9958c437c1f7074f",
            userAddresses: [
                "0xbA268f776F70caDB087e73020dfE41c7298363Ed",
            ]
        }
    ]

    for (let i = 0; i < institutions.length; i++) {
        const wallet = new ethers.Wallet(institutions[i].ethPrivateKey, ethers.provider);
        const adminRegistry = await ethers.getContractAt("InstitutionUserRegistry", institutionUserRegistryAddress, wallet);


        console.log(`Register institution ${institutions[i].address} in InstitutionUserRegistry smart contract...`);
        let regTx = await institutionUserRegistry.registerInstitution(
            institutions[i].address,
            institutions[i].name,
            institutions[i].publicKey,
            institutions[i].nodeUrl,
            institutions[i].httpUrl
        );
        await regTx.wait();
        console.log(`Bank ${institutions[i].address} is registered successfully in InstitutionUserRegistry`);


        for (let j = 0; j < institutions[i].userAddresses.length; j++) {
            let userRegTx = await adminRegistry.registerUser(
                institutions[i].userAddresses[j],
            );
            await userRegTx.wait();
            console.log(`Registered user ${institutions[i].userAddresses[j]} under Bank ${institutions[i].address}`);
        }
    }
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed: ", error);
        process.exit(1);
    });