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

    console.log("部署TokenVerificationLib库...");
    try {
        const TokenVerificationLibFactory = await ethers.getContractFactory("TokenVerificationLib", {
            libraries: {
                "ZkVerifier": deployed.libraries.ZkVerifier,
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
        const TokenOperationsLibFactory = await ethers.getContractFactory("TokenOperationsLib");
        const tokenOperationsLib = await TokenOperationsLibFactory.deploy();
        await tokenOperationsLib.waitForDeployment();
        console.log("TokenOperationsLib部署到:", tokenOperationsLib.target);
        deployed.libraries.TokenOperationsLib = tokenOperationsLib.target;
    } catch (error) {
        console.error("TokenOperationsLib部署失败:", error.message);
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

        // 调用BankRegistration的register方法 (使用占位符数据)
        console.log("注册银行到BankRegistration合约 (使用占位符)...");
        const placeholderBankAddress = "0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB"; // 您后续可以修改此地址
        const placeholderPublicKey = { x: "0x0000000000000000000000000000000000000000000000000000000000000001", y: "0x0000000000000000000000000000000000000000000000000000000000000001" }; // 您后续可以修改此公钥, ensuring it's a valid bytes32 representation if needed by the contract
        let regTx = await bankRegistration.register(placeholderBankAddress, placeholderPublicKey);
        await regTx.wait();
        console.log(`银行 ${placeholderBankAddress} 已使用占位符公钥注册到BankRegistration`);

        // 部署代币合约
        console.log("部署PrivateERCToken合约...");
        const PrivateERCTokenFactory = await ethers.getContractFactory("PrivateERCToken", {
            libraries: {
                "TokenVerificationLib": deployed.libraries.TokenVerificationLib,
                "TokenOperationsLib": deployed.libraries.TokenOperationsLib,
                "TokenEventLib": deployed.libraries.TokenEventLib
            }
        });
        const event_address = hamsaL2Event.target;
        // 检查所有库和BankRegistration合约是否已成功部署
        if (!deployed.libraries.TokenVerificationLib ||
            !deployed.libraries.TokenOperationsLib ||
            !deployed.libraries.TokenEventLib ||
            !bankRegistration.target) {
            throw new Error("部分库或BankRegistration合约部署失败，无法部署PrivateERCToken合约");
        }
        const privateERCToken = await PrivateERCTokenFactory.deploy(0, event_address, bankRegistration.target);
        await privateERCToken.waitForDeployment();
        console.log("PrivateERCToken部署到:", privateERCToken.target);
        deployed.contracts.PrivateERCToken = privateERCToken.target;

        console.log("为PrivateERCToken添加银行账户并授予角色...");
        const MINTER_ROLE_P1 = await privateERCToken.MINTER_ROLE();
        const BANK_ROLE_P1 = await privateERCToken.BANK_ROLE(); // Assuming BANK_ROLE is also needed or managed by addBankAccount

        let tx;
        const bankAccountsP1 = [
            "0x4568E35F2c4590Bde059be615015AaB6cc873004",
            "0x627306090abaB3A6e1400e9345bC60c78a8BEf57"
        ];

        for (const account of bankAccountsP1) {
            console.log(`Adding bank account ${account} to PrivateERCToken...`);
            tx = await privateERCToken.addBankAccount(account);
            await tx.wait();
            console.log(`Bank account ${account} added to PrivateERCToken.`);
            
            console.log(`Granting MINTER_ROLE to ${account} for PrivateERCToken...`);
            tx = await privateERCToken.grantRole(MINTER_ROLE_P1, account);
            await tx.wait();
            console.log(`MINTER_ROLE granted to ${account} for PrivateERCToken.`);
        }


        const privateERCToken2 = await PrivateERCTokenFactory.deploy(0, event_address, bankRegistration.target);
        await privateERCToken2.waitForDeployment();
        console.log("PrivateERCToken2部署到:", privateERCToken2.target);
        deployed.contracts.PrivateERCToken2 = privateERCToken2.target;

        console.log("为PrivateERCToken2添加银行账户并授予角色...");
        const MINTER_ROLE_P2 = await privateERCToken2.MINTER_ROLE();
        const BANK_ROLE_P2 = await privateERCToken2.BANK_ROLE(); // Assuming BANK_ROLE is also needed

        const bankAccountsP2 = [
            "0x4568E35F2c4590Bde059be615015AaB6cc873004",
            "0x627306090abaB3A6e1400e9345bC60c78a8BEf57",
            "0xb65Ebc891fBE21A42F73f9cf364759fbCF51A56A"
        ];

        for (const account of bankAccountsP2) {
            console.log(`Adding bank account ${account} to PrivateERCToken2...`);
            tx = await privateERCToken2.addBankAccount(account);
            await tx.wait();
            console.log(`Bank account ${account} added to PrivateERCToken2.`);

            console.log(`Granting MINTER_ROLE to ${account} for PrivateERCToken2...`);
            tx = await privateERCToken2.grantRole(MINTER_ROLE_P2, account);
            await tx.wait();
            console.log(`MINTER_ROLE granted to ${account} for PrivateERCToken2.`);
        }

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