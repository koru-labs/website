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
        const TokenEventLibFactory = await ethers.getContractFactory("TokenEventLib");
        const tokenEventLib = await TokenEventLibFactory.deploy();
        await tokenEventLib.waitForDeployment();
        console.log("TokenEventLib部署到:", tokenEventLib.target);
        deployed.libraries.TokenEventLib = tokenEventLib.target;
    } catch (error) {
        console.error("TokenEventLib部署失败:", error.message);
    }

    // 4. 部署业务合约
    console.log("\n=== 部署业务合约 ===");

    // 部署事件合约
    console.log("部署HamsaL2Event合约...");
    try {
        const HamsaL2EventFactory = await ethers.getContractFactory("HamsaL2Event");
        const hamsaL2Event = await HamsaL2EventFactory.deploy();
        await hamsaL2Event.waitForDeployment();
        console.log("HamsaL2Event部署到:", hamsaL2Event.target);
        deployed.contracts.HamsaL2Event = hamsaL2Event.target;

        // 部署银行注册合约
        console.log("部署InstitutionRegistration合约...");
        const InstitutionRegistrationFactory = await ethers.getContractFactory("InstitutionRegistration",{
            libraries: {
               "TokenEventLib": deployed.libraries.TokenEventLib,
            }
        });
        const institutionRegistration = await InstitutionRegistrationFactory.deploy(hamsaL2Event.target);
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
        const event_address = hamsaL2Event.target;
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
            "0xb65Ebc891fBE21A42F73f9cf364759fbCF51A56A"
        ];
        await setupTokenAccountsAndRoles(privateERCToken, institutionAccountsP1, "PrivateERCToken");

        const amount =   {
            "cl_x": ethers.toBigInt("0x1109596d367157eba09903ef4b20674c3c63f8fb18ed184c1d4795bcd0cd2541"),
            "cl_y": ethers.toBigInt("0x2f40198c786fffc711dffebea979facc21b7fb3ffe43a6bb3ac884137e0b7a24"),
            "cr_x": ethers.toBigInt("0x24ba4d7eba5319e531f4c41635f10818abc76c11daa23f471fbf4d72b721d302"),
            "cr_y": ethers.toBigInt("0x19ea03f1b2f6537ff3c7a3fc89c0887f99b2b3a7f210a2ac1e6590bcc93e4494"),
        }
        const result = await privateERCToken.setInstitutionAllowance('0xe46fe251dd1d9ffc247bc0ddb6d61e4ee4416ecb',amount);

        const privateERCToken2 = await PrivateERCTokenFactory.deploy(0, event_address, institutionRegistration.target);
        await privateERCToken2.waitForDeployment();
        console.log("PrivateERCToken2部署到:", privateERCToken2.target);
        deployed.contracts.PrivateERCToken2 = privateERCToken2.target;

        console.log("为PrivateERCToken2添加银行账户并授予角色...");
        const institutionAccountsP2 = [
            "0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB",
            "0x627306090abaB3A6e1400e9345bC60c78a8BEf57",
            "0xb65Ebc891fBE21A42F73f9cf364759fbCF51A56A"
        ];
        await setupTokenAccountsAndRoles(privateERCToken2, institutionAccountsP2, "PrivateERCToken2");
        const amount1 =   {
            "cl_x": ethers.toBigInt("0x1109596d367157eba09903ef4b20674c3c63f8fb18ed184c1d4795bcd0cd2541"),
            "cl_y": ethers.toBigInt("0x2f40198c786fffc711dffebea979facc21b7fb3ffe43a6bb3ac884137e0b7a24"),
            "cr_x": ethers.toBigInt("0x24ba4d7eba5319e531f4c41635f10818abc76c11daa23f471fbf4d72b721d302"),
            "cr_y": ethers.toBigInt("0x19ea03f1b2f6537ff3c7a3fc89c0887f99b2b3a7f210a2ac1e6590bcc93e4494"),
        }
         await privateERCToken2.setInstitutionAllowance('0xe46fe251dd1d9ffc247bc0ddb6d61e4ee4416ecb',amount1);
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
                x: "0x27f3ab05685e52314069bdddd0979f04b941f2252eda57d9d0de26dc6e96c086",
                y: "0x2f71df388898be1e711469a5aaf9937f3ab8d7741b8327aef741083b9df723d9"
            }
        },
        {
            address: "0x122A4F8848fB5df788340FD07fc7276cc038dC01",
            name: "Institution 2",
            publicKey: {
                x: "0x1c3be47d32cc829ae0814313d59917ae97b47b753f1f73ce866623f9e16b0276",
                y: "0x01048275bfe07fc21516331a733d33fdd64c46bccf91ff54953db5cb192c4f24"
            }
        }
        ,{
            address: "0xfAdb253d9AD9b2d6D37471fA80F398f76D8347B8",
            name: "Institution 3",
            publicKey: {
                x: "0x1c3be47d32cc829ae0814313d59917ae97b47b753f1f73ce866623f9e16b0276",
                y: "0x01048275bfe07fc21516331a733d33fdd64c46bccf91ff54953db5cb192c4f24"
            }
        },{
            address: "0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73",
            name: "Institution 4",
            publicKey: {
                x: "0x27f3ab05685e52314069bdddd0979f04b941f2252eda57d9d0de26dc6e96c086",
                y: "0x2f71df388898be1e711469a5aaf9937f3ab8d7741b8327aef741083b9df723d9"
            }
        },{
            address: "0x57829d5E80730D06B1364A2b05342F44bFB70E8f",
            name: "Institution 5",
            publicKey: {
                x: "0x1c3be47d32cc829ae0814313d59917ae97b47b753f1f73ce866623f9e16b0276",
                y: "0x01048275bfe07fc21516331a733d33fdd64c46bccf91ff54953db5cb192c4f24"
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