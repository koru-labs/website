const hre = require("hardhat");
const {ethers} = hre;
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("部署UCL Image9合约...");

    // 跟踪所有部署的合约和库
    let deployed = {
        libraries: {},
        contracts: {},
        accounts: {},
    };

    // 1. 部署基础库
    console.log("\n=== 部署基础库 ===");

    console.log("部署Library库...");
    try {
        const LibraryFactory = await ethers.getContractFactory("testLibrary");
        const library = await LibraryFactory.deploy();
        await library.waitForDeployment();
        console.log("Library部署到:", library.target);
        deployed.libraries.Library = library.target;
    } catch (error) {
        console.error("Library部署失败:", error.message);
    }

    console.log("部署Fr库...");
    try {
        const FrFactory = await ethers.getContractFactory("FrOps");
        const fr = await FrFactory.deploy();
        await fr.waitForDeployment();
        console.log("Fr部署到:", fr.target);
        deployed.libraries.Fr = fr.target;
    } catch (error) {
        console.error("Fr部署失败:", error.message);
    }

    console.log("部署Fq库...");
    try {
        const FqFactory = await ethers.getContractFactory("FqOps");
        const fq = await FqFactory.deploy();
        await fq.waitForDeployment();
        console.log("Fq部署到:", fq.target);
        deployed.libraries.Fq = fq.target;
    } catch (error) {
        console.error("Fq部署失败:", error.message);
    }

    // 2. 部署Nova相关库
    console.log("\n=== 部署Nova相关库 ===");

    console.log("部署RelaxedR1CSSNARKForSMLib库...");
    try {
        const RelaxedR1CSSNARKForSMLibFactory = await ethers.getContractFactory("RelaxedR1CSSNARKForSMLib");
        const relaxedR1CSSNARKForSMLib = await RelaxedR1CSSNARKForSMLibFactory.deploy();
        await relaxedR1CSSNARKForSMLib.waitForDeployment();
        console.log("RelaxedR1CSSNARKForSMLib部署到:", relaxedR1CSSNARKForSMLib.target);
        deployed.libraries.RelaxedR1CSSNARKForSMLib = relaxedR1CSSNARKForSMLib.target;
    } catch (error) {
        console.error("RelaxedR1CSSNARKForSMLib部署失败:", error.message);
    }

    console.log("部署BatchedRelaxedR1CSSNARKLib库...");
    try {
        const BatchedRelaxedR1CSSNARKLibFactory = await ethers.getContractFactory("BatchedRelaxedR1CSSNARKLib");
        const batchedRelaxedR1CSSNARKLib = await BatchedRelaxedR1CSSNARKLibFactory.deploy();
        await batchedRelaxedR1CSSNARKLib.waitForDeployment();
        console.log("BatchedRelaxedR1CSSNARKLib部署到:", batchedRelaxedR1CSSNARKLib.target);
        deployed.libraries.BatchedRelaxedR1CSSNARKLib = batchedRelaxedR1CSSNARKLib.target;
    } catch (error) {
        console.error("BatchedRelaxedR1CSSNARKLib部署失败:", error.message);
    }

    console.log("部署Field库...");
    const Field = await ethers.getContractFactory("Field");
    const field = await Field.deploy();
    await field.waitForDeployment();
    console.log("Field部署到:", field.target);
    deployed.libraries.Field = field.target;

    console.log("部署Grumpkin库...");
    const Grumpkin = await ethers.getContractFactory("Grumpkin", {
        libraries: {
            "Field": field.target,
            "CommonUtilities": field.target,
        }
    });
    const grumpkin = await Grumpkin.deploy();
    await grumpkin.waitForDeployment();
    console.log("Grumpkin部署到:", grumpkin.target);
    deployed.libraries.Grumpkin = grumpkin.target;

    console.log("部署ZkVerifier库...");
    try {
        const ZkVerifierFactory = await ethers.getContractFactory("ZkVerifier", {
            libraries: {
                "RelaxedR1CSSNARKForSMLib": deployed.libraries.RelaxedR1CSSNARKForSMLib,
                "BatchedRelaxedR1CSSNARKLib": deployed.libraries.BatchedRelaxedR1CSSNARKLib
            }
        });
        const zkVerifier = await ZkVerifierFactory.deploy();
        await zkVerifier.waitForDeployment();
        console.log("ZkVerifier部署到:", zkVerifier.target);
        deployed.libraries.ZkVerifier = zkVerifier.target;
    } catch (error) {
        console.error("ZkVerifier部署失败:", error.message);
    }

    // 3. 部署Poseidon相关库
    console.log("\n=== 部署TokenSc相关库 ===");

    console.log("部署TokenGrumpkinLib库...");
    try {
        const TokenGrumpkinLibFactory = await ethers.getContractFactory("TokenGrumpkinLib",{
            libraries: {
                "Grumpkin": deployed.libraries.Grumpkin,
            }
        });
        const tokenGrumpkinLib = await TokenGrumpkinLibFactory.deploy();
        await tokenGrumpkinLib.waitForDeployment();
        console.log("TokenGrumpkinLib部署到:", tokenGrumpkinLib.target);
        deployed.libraries.TokenGrumpkinLib = tokenGrumpkinLib.target;
    } catch (error) {
        console.error("TokenGrumpkinLib部署失败:", error.message);
    }

    console.log("部署TokenVerificationLib库...");
    try {
        const TokenVerificationLibFactory = await ethers.getContractFactory("TokenVerificationLib", {
            libraries: {
                "ZkVerifier": deployed.libraries.ZkVerifier,
                // "Grumpkin": deployed.libraries.Grumpkin
            }
        });
        const tokenVerificationLib = await TokenVerificationLibFactory.deploy();
        await tokenVerificationLib.waitForDeployment();
        console.log("TokenVerificationLib部署到:", tokenVerificationLib.target);
        deployed.libraries.TokenVerificationLib = tokenVerificationLib.target;
    } catch (error) {
        console.error("TokenVerificationLib部署失败:", error.message);
    }

    console.log("部署TokenEventLib库...");
    try {
        // const TokenEventLibFactory = await ethers.getContractFactory("TokenEventLib");
        // const tokenEventLib = await TokenEventLibFactory.deploy();
        // await tokenEventLib.waitForDeployment();
        // console.log("TokenEventLib部署到:", tokenEventLib.target);
        // deployed.libraries.TokenEventLib = tokenEventLib.target;

        // 本地部署
        deployed.libraries.TokenEventLib = "0xA7F9F8D8985a133f9332750b4082bA2921d2bD40";
    } catch (error) {
        console.error("TokenEventLib部署失败:", error.message);
    }

    // 4. 部署业务合约
    console.log("\n=== 部署业务合约 ===");

    // 部署事件合约
    console.log("部署HamsaL2Event合约...");
    try {
        // const HamsaL2EventFactory = await ethers.getContractFactory("HamsaL2Event");
        // const hamsaL2Event = await HamsaL2EventFactory.deploy();
        // await hamsaL2Event.waitForDeployment();
        // console.log("HamsaL2Event部署到:", hamsaL2Event.target);
        // deployed.contracts.HamsaL2Event = hamsaL2Event.target;

        // 本地部署
        deployed.contracts.HamsaL2Event = "0x85aC82a07b3B9E10B89a6E6F7ac98D81f48f0A1d";

        // 部署银行注册合约
        console.log("部署InstitutionRegistration合约...");
        const InstitutionRegistrationFactory = await ethers.getContractFactory("InstitutionRegistration",{
            libraries: {
               "TokenEventLib": deployed.libraries.TokenEventLib,
            }
        });
        const institutionRegistration = await InstitutionRegistrationFactory.deploy(deployed.contracts.HamsaL2Event);
        await institutionRegistration.waitForDeployment();
        console.log("InstitutionRegistration部署到:", institutionRegistration.target);
        deployed.contracts.InstitutionRegistration = institutionRegistration.target;

        await registerInstitution(institutionRegistration);

        // 部署代币合约
        console.log("部署PrivateERCToken合约...");
        const PrivateERCTokenFactory = await ethers.getContractFactory("PrivateERCToken", {
            libraries: {
                "TokenEventLib": deployed.libraries.TokenEventLib,
                "TokenVerificationLib": deployed.libraries.TokenVerificationLib,
                "TokenGrumpkinLib": deployed.libraries.TokenGrumpkinLib,
            }
        });
        const event_address = deployed.contracts.HamsaL2Event;
        // 检查所有库和InstitutionRegistration合约是否已成功部署
        if (!deployed.libraries.TokenEventLib ||
            !deployed.libraries.TokenVerificationLib ||
            !deployed.libraries.Grumpkin ||
            !institutionRegistration.target) {
            throw new Error("部分库或InstitutionRegistration合约部署失败，无法部署PrivateERCToken合约");
        }
        const privateERCToken = await PrivateERCTokenFactory.deploy(0, event_address, institutionRegistration.target);
        await privateERCToken.waitForDeployment();
        console.log("PrivateERCToken部署到:", privateERCToken.target);
        deployed.contracts.PrivateERCToken = privateERCToken.target;

        console.log("为PrivateERCToken添加银行账户并授予角色...");
        const institutionAccountsP1 = [
            "0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB",
            "0x627306090abaB3A6e1400e9345bC60c78a8BEf57",
            "0xb65Ebc891fBE21A42F73f9cf364759fbCF51A56A",
            "0x57829d5E80730D06B1364A2b05342F44bFB70E8f",
            "0xf17f52151EbEF6C7334FAD080c5704D77216b732"
        ];
        await setupTokenAccountsAndRoles(privateERCToken, institutionAccountsP1, "PrivateERCToken");

        const amount =   {
            "cl_x": ethers.toBigInt("0x0674c295e0f0892fbf309a316af3adacf8023d5e597bf55533806bd0362170c6"),
            "cl_y": ethers.toBigInt("0x0cb84b5c84cadfa88f4edf89d2fcf051c100aa015a80c202f517a008296c0359"),
            "cr_x": ethers.toBigInt("0x1e347c17ddd4fc6ac3ec66da2d2eb23e866b1fe9cab8493a5f1137a49fdcd2fd"),
            "cr_y": ethers.toBigInt("0x2f2419a3e2efa0de0a9ebe16b0dd90fe8dbcba985b7bd0d1546f197226a5759f"),
        }
        await privateERCToken.setInstitutionAllowance('0xf17f52151EbEF6C7334FAD080c5704D77216b732',amount);

        const privateERCToken2 = await PrivateERCTokenFactory.deploy(0, event_address, institutionRegistration.target);
        await privateERCToken2.waitForDeployment();
        console.log("PrivateERCToken2部署到:", privateERCToken2.target);
        deployed.contracts.PrivateERCToken2 = privateERCToken2.target;

        console.log("为PrivateERCToken2添加银行账户并授予角色...");
        const institutionAccountsP2 = [
            "0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB",
            "0x627306090abaB3A6e1400e9345bC60c78a8BEf57",
            "0xb65Ebc891fBE21A42F73f9cf364759fbCF51A56A",
            "0xf17f52151EbEF6C7334FAD080c5704D77216b732",
            "0x57829d5E80730D06B1364A2b05342F44bFB70E8f"
        ];
        await setupTokenAccountsAndRoles(privateERCToken2, institutionAccountsP2, "PrivateERCToken2");
        const amount1 =   {
            "cl_x": ethers.toBigInt("0x0674c295e0f0892fbf309a316af3adacf8023d5e597bf55533806bd0362170c6"),
            "cl_y": ethers.toBigInt("0x0cb84b5c84cadfa88f4edf89d2fcf051c100aa015a80c202f517a008296c0359"),
            "cr_x": ethers.toBigInt("0x1e347c17ddd4fc6ac3ec66da2d2eb23e866b1fe9cab8493a5f1137a49fdcd2fd"),
            "cr_y": ethers.toBigInt("0x2f2419a3e2efa0de0a9ebe16b0dd90fe8dbcba985b7bd0d1546f197226a5759f"),
        }
         await privateERCToken2.setInstitutionAllowance('0xf17f52151EbEF6C7334FAD080c5704D77216b732',amount1);
    } catch (error) {
        console.error("业务合约部署失败:", error.message);
    }

    //include institution admin address
    deployed.accounts = {
        node3_institution_admin_address: "0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB",
        node4_institution_admin_address: "0x122A4F8848fB5df788340FD07fc7276cc038dC01"
    }

    // 5. 保存部署信息
    await saveDeploymentInfo(deployed, hre, ethers, fs, path);

    console.log("\n部署完成！");

    return deployed;
}

async function saveDeploymentInfo(deployed, hre, ethers, fs, path) {
    console.log("\n=== 保存部署信息 ===");

    // 添加部署元数据
    deployed.metadata = {
        timestamp: new Date().toISOString(),
        network: hre.network.name,
        chainId: (await ethers.provider.getNetwork()).chainId.toString() // 将BigInt转换为字符串
    };

    // 保存部署信息
    const deploymentsDir = path.join(__dirname, "../../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, {recursive: true});
    }

    const filepath = path.join(deploymentsDir, "image9.json");
    fs.writeFileSync(filepath, JSON.stringify(deployed, null, 2));
    console.log(`部署信息已保存到: ${filepath}`);
}

async function setupTokenAccountsAndRoles(tokenContract, institutionAccounts, tokenName) {
    const MINTER_ROLE = await tokenContract.MINTER_ROLE();
    // const BANK_ROLE = await tokenContract.BANK_ROLE(); // Assuming BANK_ROLE is also needed or managed by addInstitutionAccount
    let tx;

    for (const account of institutionAccounts) {
        console.log(`Adding institution account ${account} to ${tokenName}...`);
        tx = await tokenContract.addInstitutionAccount(account);
        await tx.wait();
        console.log(`Institution account ${account} added to ${tokenName}.`);
        
        console.log(`Granting MINTER_ROLE to ${account} for ${tokenName}...`);
        tx = await tokenContract.grantRole(MINTER_ROLE, account);
        await tx.wait();
        console.log(`MINTER_ROLE granted to ${account} for ${tokenName}.`);
    }
}

async function registerInstitution(institutionRegistration) {
    // 调用InstitutionRegistration的register方法
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
        ,{
            address: "0xfAdb253d9AD9b2d6D37471fA80F398f76D8347B8",
            name: "Institution 3",
            publicKey: {
                x: "0x07d1f17c69afc61219c3ef99c2b5f2ad95652f9a5a742d9f41507c39b1f60cc6",
                y: "0x223c436026d084b482180d0a35415a95b7e01b7f932478ad469f084e03fb1883",
                s: "0x04c3c1afa2f7989e7eccc561e6e691fed49fe11b07b07ba9e43134bb0e522129"
            }
        },{
            address: "0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73",
            name: "Institution 4",
            publicKey: {
                x: "0x2e02198276673e31c219dc599124d1f9a7c5b501b50e54f0bf13434a945dd0d8",
                y: "0x1b784dce213ce92d2d95b6cf8adcc408c43fe2466d477896c17535509d7a634d",
                s: "0x1c5c6569eb1fb54371b7a251f27c0ebfed2b56d55a58cd5ac90b4feb670264cd"
            }
        },{
            address: "0x57829d5E80730D06B1364A2b05342F44bFB70E8f",
            name: "Institution 5",
            publicKey: {
                x: "0x1a8757f7c321d2c4a61d00d32f8aa82ac8d393aebfad7cc90c724912244fbaa9",
                y: "0x1c12bca19f23c212b8b50d3df6274f909057496aa7e776196325fe3f37ae1e51",
                s: "0x0cdf05cb547361ca0f6cc94e0aa58da2df8eb2f8922b595fbe04345c8d6e34cc"
            }
        },{
            address: "0xf17f52151EbEF6C7334FAD080c5704D77216b732",
            name: "Institution 5",
            publicKey: {
                x: "0x260966dc3f87c49de63c2b777617f9f6ccb11b7be01d5248383618939453944a",
                y: "0x0012858a1d2ab976fd22a3620acd587b43319177bd677df84089630e21d7ffaf",
                s: "0x2fb5b87323812e6fb1ca82c18f7e822403a1076dca78cdb6511fe50e2bcb9610"
            }
        }
    ]
    for (let i = 0; i < institutions.length; i++) {
        console.log(`注册银行 ${institutions[i].address} 到InstitutionRegistration合约...`);
        let regTx = await institutionRegistration.registerInstitution(
            institutions[i].address, 
            institutions[i].name, 
            institutions[i].publicKey
        );
        await regTx.wait();
        console.log(`银行 ${institutions[i].address} 已注册到InstitutionRegistration`);
        
        // Register the institution also as a user under itself as manager
        let userRegTx = await institutionRegistration.registerUser(
            institutions[i].address,
            institutions[i].address
        );
        await userRegTx.wait();
        console.log(`银行 ${institutions[i].address} 已作为用户注册到其自己的管理下`);
    }
}

// 执行部署
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("部署过程中发生错误:", error);
        process.exit(1);
    });