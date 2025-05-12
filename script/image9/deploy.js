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
    console.log("\n=== 部署Poseidon相关库 ===");
    const PoseidonHash = await ethers.getContractFactory("PoseidonU2bn256Hasher");
    const hash= await PoseidonHash.deploy();
    await hash.waitForDeployment();
    console.log("PoseidonHasher is deployed at ", hash.target);

    console.log("\n=== 部署TokenSc相关库 ===");

    console.log("部署TokenVerificationLib库...");
    try {
        const TokenVerificationLibFactory = await ethers.getContractFactory("TokenVerificationLib", {
            libraries: {
                "ZkVerifier": deployed.libraries.ZkVerifier,
                "PoseidonU2bn256Hasher":  hash.target,
            }
        });
        const tokenVerificationLib = await TokenVerificationLibFactory.deploy();
        await tokenVerificationLib.waitForDeployment();
        console.log("TokenVerificationLib部署到:", tokenVerificationLib.target);
        deployed.libraries.TokenVerificationLib = tokenVerificationLib.target;
    } catch (error) {
        console.error("TokenVerificationLib部署失败:", error.message);
    }

    console.log("部署TokenOperationsLib库...");
    try {
        const TokenOperationsLibFactory = await ethers.getContractFactory("TokenOperationsLib", {
            libraries: {
                "Grumpkin": deployed.libraries.Grumpkin
            }
        });
        const tokenOperationsLib = await TokenOperationsLibFactory.deploy();
        await tokenOperationsLib.waitForDeployment();
        console.log("TokenOperationsLib部署到:", tokenOperationsLib.target);
        deployed.libraries.TokenOperationsLib = tokenOperationsLib.target;
    } catch (error) {
        console.error("TokenOperationsLib部署失败:", error.message);
    }

    console.log("部署DVPLib库...");
    try {
        const DVPLibFactory = await ethers.getContractFactory("DVPLib");
        const dvpLib = await DVPLibFactory.deploy();
        await dvpLib.waitForDeployment();
        console.log("DVPLib部署到:", dvpLib.target);
        deployed.libraries.DVPLib = dvpLib.target;
    } catch (error) {
        console.error("DVPLib部署失败:", error.message);
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
        console.log("部署BankRegistration合约...");
        const BankRegistrationFactory = await ethers.getContractFactory("BankRegistration");
        const bankRegistration = await BankRegistrationFactory.deploy();
        await bankRegistration.waitForDeployment();
        console.log("BankRegistration部署到:", bankRegistration.target);
        deployed.contracts.BankRegistration = bankRegistration.target;

        // 部署代币合约
        console.log("部署TokenScBase合约...");
        const TokenScBaseFactory = await ethers.getContractFactory("TokenScBase", {
            libraries: {
                "TokenVerificationLib": deployed.libraries.TokenVerificationLib,
                "TokenOperationsLib": deployed.libraries.TokenOperationsLib,
                "DVPLib": deployed.libraries.DVPLib,
                "TokenEventLib": deployed.libraries.TokenEventLib
            }
        });
        // console.log("使用指定的event地址：0xdDA6327139485221633A1FcD65f4aC932E60A2e1");
        // const event_address = hamsaL2Event.target;
        const event_address = "0xdDA6327139485221633A1FcD65f4aC932E60A2e1";
        // 检查所有库是否已成功部署
        if (!deployed.libraries.TokenVerificationLib ||
            !deployed.libraries.TokenOperationsLib ||
            !deployed.libraries.DVPLib ||
            !deployed.libraries.TokenEventLib) {
            throw new Error("部分库部署失败，无法部署TokenScBase合约");
        }
        const tokenScBase = await TokenScBaseFactory.deploy(0, event_address);
        await tokenScBase.waitForDeployment();
        console.log("TokenScBase部署到:", tokenScBase.target);
        deployed.contracts.TokenScBase = tokenScBase.target;
        let tx = await tokenScBase.addBankAccount("0x4568E35F2c4590Bde059be615015AaB6cc873004");
        await tx.wait();
        tx = await tokenScBase.addBankAccount("0x4568E35F2c4590Bde059be615015AaB6cc873004");
        await tx.wait();
        tx = await tokenScBase.addBankAccount("0x627306090abaB3A6e1400e9345bC60c78a8BEf57");
        await tx.wait();
        tx = await tokenScBase.addBankAccount("0x4568E35F2c4590Bde059be615015AaB6cc873004");
        await tx.wait();

        const tokenScBase2 = await TokenScBaseFactory.deploy(0, event_address);
        await tokenScBase2.waitForDeployment();
        console.log("TokenScBase2部署到:", tokenScBase2.target);
        deployed.contracts.TokenScBase2 = tokenScBase2.target;
        tx = await tokenScBase2.addBankAccount("0x4568E35F2c4590Bde059be615015AaB6cc873004");
        await tx.wait();
        tx = await tokenScBase2.addBankAccount("0x4568E35F2c4590Bde059be615015AaB6cc873004");
        await tx.wait();
        tx = await tokenScBase2.addBankAccount("0x627306090abaB3A6e1400e9345bC60c78a8BEf57");
        await tx.wait();
        tx = await tokenScBase2.addBankAccount("0x4568E35F2c4590Bde059be615015AaB6cc873004");
        await tx.wait();


        tx = await tokenScBase2.addBankAccount("0xb65Ebc891fBE21A42F73f9cf364759fbCF51A56A");
        await tx.wait();
        tx = await tokenScBase2.addBankAccount("0xb65Ebc891fBE21A42F73f9cf364759fbCF51A56A");
        await tx.wait();
        tx = await tokenScBase2.addBankAccount("0x627306090abaB3A6e1400e9345bC60c78a8BEf57");
        await tx.wait();
        tx = await tokenScBase2.addBankAccount("0x4568E35F2c4590Bde059be615015AaB6cc873004");
        await tx.wait();

        const ZkAsc = await ethers.getContractFactory("ZkAsc");
        const zkAsc = await ZkAsc.deploy();
        await zkAsc.waitForDeployment();
        console.log(" zkAsc is deployed at: ", zkAsc.target)
        deployed.contracts.zkAsc = zkAsc.target;

    } catch (error) {
        console.error("业务合约部署失败:", error.message);
    }

    //include bank admin address
    deployed.accounts = {
        node3_bank_admin_address: "0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB",
        node4_bank_admin_address: "0x122A4F8848fB5df788340FD07fc7276cc038dC01"
    }

    // 5. 保存部署信息
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

    console.log("\n部署完成！");

    return deployed;
}

// 执行部署
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("部署过程中发生错误:", error);
        process.exit(1);
    });