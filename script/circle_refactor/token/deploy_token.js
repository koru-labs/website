const hre = require("hardhat");
const {ethers} = hre;
const hardhatConfig = require('../../../hardhat.config');
const accounts = require("../../../deployments/account.json");
const config = require("../configuration");

async function deployToken(deployed) {
    let hamsal2event = deployed.contracts.HamsaL2Event;
    let institutionRegistration = deployed.contracts.InstUserProxy;

    // 使用重构后的合约名和路径
    const PrivateUSDCFactory = await ethers.getContractFactory("PrivateUSDC", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
            "TokenUtilsLib": deployed.libraries.TokenUtilsLib,
            "TokenVerificationLib": deployed.libraries.TokenVerificationLib,
            "SignatureChecker": deployed.libraries.SignatureChecker
        }
    });

    const privateUSDC = await PrivateUSDCFactory.deploy();
    await privateUSDC.waitForDeployment();
    console.log("PrivateUSDC is deployed at:", privateUSDC.target);
    deployed.contracts.PrivateERCToken = privateUSDC.target;

    console.log("Initializing PrivateUSDC...");
    const initTx = await privateUSDC.initialize(
        "Private USDC",
        "PUSDC",
        "USD",
        6,
        accounts.MasterMinter,
        accounts.Pauser,
        accounts.BlackLister,
        accounts.Owner,
        hamsal2event,
        institutionRegistration
    );
    await initTx.wait();
    console.log("PrivateUSDC initialized successfully");
}

async function allowBanksInTokenSmartContract(deployed) {
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
    const ownerWallet = new ethers.Wallet(accounts.OwnerKey, l1Provider);
    const privateUSDC = await ethers.getContractAt("PrivateUSDC", deployed.contracts.PrivateERCToken, ownerWallet);

    for (let i = 0; i < config.institutions.length; i++) {
        let bankAddress = config.institutions[i].address;
        let tx = await privateUSDC.updateAllowedBank(bankAddress, true);
        await tx.wait();
        console.log(`Bank ${bankAddress} allowed successfully`);
    }
}

async function setMinterAllowed(deployed) {
    const minterAllowedAmount = {
        "cl_x": 17965178807605681775593476527901391566646357775548805416191630067931921590266n,
        "cl_y": 17997503520096523373978760079614633178183544935372525079367653487073845131371n,
        "cr_x": 2799658707790704252170544877645553735081603739176317448125814928308770685127n,
        "cr_y": 10724405929777949929088094477911843117820716522007699467531083531418761611245n,
    }

    console.log("Configuring minter allowed amount...");

    const minters = [
        {account: accounts.Minter, name: "Minter"},
        {account: accounts.Minter2, name: "Minter2"},
        {account: accounts.Minter3, name: "Minter3"}
    ];

    const PrivateUSDCFactory = await ethers.getContractFactory("PrivateUSDC", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
            "TokenUtilsLib": deployed.libraries.TokenUtilsLib,
            "TokenVerificationLib": deployed.libraries.TokenVerificationLib,
            "SignatureChecker": deployed.libraries.SignatureChecker
        }
    });
    const privateUSDC = await PrivateUSDCFactory.attach(deployed.contracts.PrivateERCToken);

    for (const minter of minters) {
        await privateUSDC.configurePrivacyMinter(minter.account, minterAllowedAmount);
        console.log(`Minter allowed amount configured successfully for ${minter.name} (${minter.account})`);
    }
}

module.exports = {
    deployToken,
    allowBanksInTokenSmartContract,
    setMinterAllowed
};

