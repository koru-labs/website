const hre = require("hardhat");
const { ethers } = hre;
const fs = require("fs");
const path = require("path");
const {address} = require("hardhat/internal/core/config/config-validation");
const accounts = require("../../deployments/account.json");

const ADDRESSES = {
    TOKEN_EVENT_LIB: "",
    HAMSAL2EVENT: "0x0b82178c50Ca1414C1B048f2E507c18Fca1d59aC"
};

async function main() {
    console.log("Deploy UCL SandBox smart contracts...");

    
    let deployed = {
        libraries: {},
        contracts: {},
        accounts: {},
    };

    
    console.log("\n=== Deploy libraries ===");

    // console.log("部署Library库...");
    // try {
    //     const LibraryFactory = await ethers.getContractFactory("testLibrary");
    //     const library = await LibraryFactory.deploy();
    //     await library.waitForDeployment();
    //     console.log("Library部署到:", library.target);
    //     deployed.libraries.Library = library.target;
    // } catch (error) {
    //     console.error("Library部署失败:", error.message);
    // }

    console.log("Deploy Fr Lib...");
    try {
        const FrFactory = await ethers.getContractFactory("FrOps");
        const fr = await FrFactory.deploy();
        await fr.waitForDeployment();
        console.log("Fr Lib is deployed at :", fr.target);
        deployed.libraries.Fr = fr.target;
    } catch (error) {
        console.error("Fr deployment failed:", error.message);
    }

    console.log("Deploy Fq Lib...");
    try {
        const FqFactory = await ethers.getContractFactory("FqOps");
        const fq = await FqFactory.deploy();
        await fq.waitForDeployment();
        console.log("Fq is deployed at :", fq.target);
        deployed.libraries.Fq = fq.target;
    } catch (error) {
        console.error("Fq deployment failed:", error.message);
    }

    
    console.log("\n=== Deploy Nova Libs ===");

    console.log("Deploy RelaxedR1CSSNARKForSMLib...");
    try {
        const RelaxedR1CSSNARKForSMLibFactory = await ethers.getContractFactory("RelaxedR1CSSNARKForSMLib");
        const relaxedR1CSSNARKForSMLib = await RelaxedR1CSSNARKForSMLibFactory.deploy();
        await relaxedR1CSSNARKForSMLib.waitForDeployment();
        console.log("RelaxedR1CSSNARKForSMLib is deployed at :", relaxedR1CSSNARKForSMLib.target);
        deployed.libraries.RelaxedR1CSSNARKForSMLib = relaxedR1CSSNARKForSMLib.target;
    } catch (error) {
        console.error("RelaxedR1CSSNARKForSMLib deployment failed:", error.message);
    }

    console.log("Deploy BatchedRelaxedR1CSSNARKLib...");
    try {
        const BatchedRelaxedR1CSSNARKLibFactory = await ethers.getContractFactory("BatchedRelaxedR1CSSNARKLib");
        const batchedRelaxedR1CSSNARKLib = await BatchedRelaxedR1CSSNARKLibFactory.deploy();
        await batchedRelaxedR1CSSNARKLib.waitForDeployment();
        console.log("BatchedRelaxedR1CSSNARKLib is deployed at :", batchedRelaxedR1CSSNARKLib.target);
        deployed.libraries.BatchedRelaxedR1CSSNARKLib = batchedRelaxedR1CSSNARKLib.target;
    } catch (error) {
        console.error("BatchedRelaxedR1CSSNARKLib deployment failed:", error.message);
    }

    console.log("Deploy Field Lib...");
    const Field = await ethers.getContractFactory("Field");
    const field = await Field.deploy();
    await field.waitForDeployment();
    console.log("Field is deployed at :", field.target);
    deployed.libraries.Field = field.target;

    console.log("Deploy Grumpkin Lib...");
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

    console.log("Deploy ZkVerifier Lib...");
    try {
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
    } catch (error) {
        console.error("ZkVerifier deployment failed:", error.message);
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

    
    console.log("Deploy InstitutionRegistration smart contract ...");
    const InstitutionRegistrationFactory = await ethers.getContractFactory("InstitutionRegistration", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });
    const institutionRegistration = await InstitutionRegistrationFactory.deploy(deployed.contracts.HamsaL2Event);
    await institutionRegistration.waitForDeployment();

    console.log("InstitutionRegistration deployed to:", institutionRegistration.target);
    deployed.contracts.InstitutionRegistration = institutionRegistration.target;

    await registerInstitution(institutionRegistration);

    const SignatureChecker = await ethers.getContractFactory("SignatureChecker")
    const signatureChecker = await SignatureChecker.deploy();
    await signatureChecker.waitForDeployment()
    deployed.libraries.SignatureChecker = signatureChecker.target;

    console.log("Deploy PrivateERCToken smart contract...");
    const HamsaUSDCFactory = await ethers.getContractFactory("HamsaUSDC", {
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
        !institutionRegistration.target) {
        throw new Error("Deployment of HamsaUSDC failed");
    }

    const hamsaUSDC = await HamsaUSDCFactory.deploy();
    await hamsaUSDC.waitForDeployment();
    console.log("PrivateERCToken is deployed at :", hamsaUSDC.target);
    deployed.contracts.PrivateERCToken = hamsaUSDC.target;

    
    console.log("Initializing PrivateERCToken...");
    const initTx = await hamsaUSDC.initialize(
        "Private ERC Token", 
        "PET", 
        "USD", 
        6, 
        accounts.MasterMinter,
        accounts.Pauser,
        accounts.BlackLister,
        accounts.Owner,
        event_address,
        institutionRegistration.target
    );
    await initTx.wait();
    console.log("PrivateERCToken initialized successfully");

    const minterAllowedAmount =   {
        "cl_x": ethers.toBigInt("0x0674c295e0f0892fbf309a316af3adacf8023d5e597bf55533806bd0362170c6"),
        "cl_y": ethers.toBigInt("0x0cb84b5c84cadfa88f4edf89d2fcf051c100aa015a80c202f517a008296c0359"),
        "cr_x": ethers.toBigInt("0x1e347c17ddd4fc6ac3ec66da2d2eb23e866b1fe9cab8493a5f1137a49fdcd2fd"),
        "cr_y": ethers.toBigInt("0x2f2419a3e2efa0de0a9ebe16b0dd90fe8dbcba985b7bd0d1546f197226a5759f"),
    }
    await hamsaUSDC.configureMinter(accounts.Minter, 1000);
    await hamsaUSDC.configurePrivacyMinter(accounts.Minter,minterAllowedAmount);
    let tx = await hamsaUSDC.blacklist(accounts.BlockedAccount);
    await tx.wait();

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
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const filepath = path.join(deploymentsDir, "image9.json");
    fs.writeFileSync(filepath, JSON.stringify(deployed, null, 2));
    console.log(`deployment information is saved to : ${filepath}`);
}


async function registerInstitution(institutionRegistration) {
    
    const institutions = [
        {
            address: "0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB",
            name: "Institution 1",
            publicKey: {
                x: "0x12cb22204290ed3f7d00cc703bceffdb09d0e3667acec8b3e95d867b2b977139",
                y: "0x245a12e0241b5503fec50ce02e2e63c38f1ad751a2540cae9b7008553256227d",
                s:"0x289c5b8affebd596657c547ddd273f41a6ea39c0f0a93aea766f9b457b00babb",
            }
        },
        {
            address: "0x122A4F8848fB5df788340FD07fc7276cc038dC01",
            name: "Institution 2",
            publicKey: {
                x: "0x0da58bc89e5e79370d284b950e9787b0a415c7eb924f7ad878ae02f1c1cbf08d",
                y: "0x09a199d04bf1f4edd076b04fac483e355ccc7cda5f7a3730fab21fdaf06772d2",
                s: "0x2b03804fc6cb37b4a024d9bfcccf4ee5b39aa2f05083804f707cc9ea2b9e17b8"
            }
        }
        , {
            address: "0xfAdb253d9AD9b2d6D37471fA80F398f76D8347B8",
            name: "Institution 3",
            publicKey: {
                x: "0x07d1f17c69afc61219c3ef99c2b5f2ad95652f9a5a742d9f41507c39b1f60cc6",
                y: "0x223c436026d084b482180d0a35415a95b7e01b7f932478ad469f084e03fb1883",
                s: "0x04c3c1afa2f7989e7eccc561e6e691fed49fe11b07b07ba9e43134bb0e522129"
            }
        }, {
            address: "0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73",
            name: "Institution 4",
            publicKey: {
                x: "0x2e02198276673e31c219dc599124d1f9a7c5b501b50e54f0bf13434a945dd0d8",
                y: "0x1b784dce213ce92d2d95b6cf8adcc408c43fe2466d477896c17535509d7a634d",
                s: "0x1c5c6569eb1fb54371b7a251f27c0ebfed2b56d55a58cd5ac90b4feb670264cd"
            }
        }, {
            address: "0x57829d5E80730D06B1364A2b05342F44bFB70E8f",
            name: "Institution 5",
            publicKey: {
                x: "0x1a8757f7c321d2c4a61d00d32f8aa82ac8d393aebfad7cc90c724912244fbaa9",
                y: "0x1c12bca19f23c212b8b50d3df6274f909057496aa7e776196325fe3f37ae1e51",
                s: "0x0cdf05cb547361ca0f6cc94e0aa58da2df8eb2f8922b595fbe04345c8d6e34cc"
            }
        }, {
            address: "0xf17f52151EbEF6C7334FAD080c5704D77216b732",
            name: "Institution 5",
            publicKey: {
                x: "0x260966dc3f87c49de63c2b777617f9f6ccb11b7be01d5248383618939453944a",
                y: "0x0012858a1d2ab976fd22a3620acd587b43319177bd677df84089630e21d7ffaf"
            }
        }
    ]
    for (let i = 0; i < institutions.length; i++) {
        console.log(`Register institution ${institutions[i].address} in InstitutionRegistration smart contract...`);
        let regTx = await institutionRegistration.registerInstitution(
            institutions[i].address,
            institutions[i].name,
            institutions[i].publicKey
        );
        await regTx.wait();
        console.log(`Bank ${institutions[i].address} is registered successfully in InstitutionRegistration`);

        
        let userRegTx = await institutionRegistration.registerUser(
            institutions[i].address,
            institutions[i].address
        );
        await userRegTx.wait();
        console.log(`Registered user ${institutions[i].address} under under Bank ${institutions[i].address}`);
    }
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed: ", error);
        process.exit(1);
    });