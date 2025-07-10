const hre = require("hardhat");
const {ethers} = hre;
const accounts = require("../../../deployments/account.json");
const {deployToken} = require("../token/deploy_token");

const {createAuthMetadata} = require("../../../test/help/testHelp.js")
const {createClient} = require('../../../test/qa/token_grpc');
const hardhatConfig = require("../../../hardhat.config");
const deployed = require('../../../deployments/image9.json');
const {sleep} = require("../../../test/help/testHelp");


const institutions = [
    // {
    //     address: "0x2c44c4B96AE5f9c9dbf32cF3AA743Cd0277F3127",
    //     ethPrivateKey: "f951e1bd9ef0359e6886ae77e5fd30d566ef098d099c78fd3fb68588657618cc",
    //     name: "Node1",
    //     rpcUrl: "qa-node1-rpc.hamsa-ucl.com:50051",
    //     nodeUrl: "https://qa-node1-proxy.hamsa-ucl.com:8443",
    //     httpUrl: "http://qa-node1-http.hamsa-ucl.com:8080",
    //     publicKey: {
    //         x: "8870958234945531012140077554967107612834978073622531518187994135599594024004",
    //         y: "1602896076095556872064323498591590133311615038843128356451925530793022734414",
    //     },
    //     privateKey: "416573880578171335403689549793041749905608668623681787361470319903201766514",
    //     users: [
    //         {address: "0x5a3288A7400B2cd5e0568728E8216D9392094892", role: "normal"}
    //     ]
    // },
    // {
    //     address: "0x03d68e57f1f9939d3FDcf97B5e7a1d0Be995Ec67",
    //     ethPrivateKey: "d9597e2d88463e47d1b6c2431879f06d440a6ff980a51a1f8c830623b112f329",
    //     name: "Node2",
    //     rpcUrl: "qa-node2-rpc.hamsa-ucl.com:50051",
    //     nodeUrl: "https://qa-node2-proxy.hamsa-ucl.com:8443",
    //     httpUrl: "http://qa-node2-http.hamsa-ucl.com:8080",
    //     publicKey: {
    //         x: "5820367833026910549315409246395472618478921328059164198985819674997868240519",
    //         y: "16447690327536854731829234134374272913253014843200385847735869511531503932278",
    //     },
    //     privateKey: "2168409685083436357554395152062201983676872832460334205932174282094784521144",
    //     users: [
    //         {address: "0xF8041E1185C7106121952bA9914ff904A4A01c80", role: "normal"}
    //     ]
    // },
    {
        address: "0xf17f52151EbEF6C7334FAD080c5704D77216b732",
        ethPrivateKey: "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f",
        name: "Node3",
        rpcUrl: "qa-node3-rpc.hamsa-ucl.com:50051",
        nodeUrl: "https://qa-node3-proxy.hamsa-ucl.com:8443",
        httpUrl: "http://qa-node3-http.hamsa-ucl.com:8080",
        publicKey: {
            x: "14867489045451479287215256054831019265497990299815167173241037631264676460349",
            y: "9519187890267549073736999464396081731503319602421352094119155053337094535674",
        },
        privateKey: "2607683766450702001126943055270332377994929386369594371567962723856157825017",
        users: [
            {address: "0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB", role: "normal"},
            {address: "0xf17f52151EbEF6C7334FAD080c5704D77216b732", role: "admin"},
            {address: "0xf0b6C36D47f82Fc13eFEE4CC8223Dc19E6c0D766", role: "normal"},
            {address: "0x8c8af239FfB9A6e93AC4b434C71a135572A1021C", role: "normal"},
            {address: "0x4312488937D47A007De24d48aB82940C809EEb2b", role: "normal"},
            {address: "0x57829d5E80730D06B1364A2b05342F44bFB70E8f", role: "normal"},
            {address: "0xF50F25915126d936C64A194b2C1DAa1EA45392c4", role: "minter"},
            {address: "0x4568E35F2c4590Bde059be615015AaB6cc873004", role: "minter"},
            {address: "0x46946c52eb91cd2c8ed347b0a7758d9b22cee383", role: "normal"}  //this is account in wlin meta-mask
        ]
    },
    {
        address: "0x93d2Ce0461C2612F847e074434d9951c32e44327",
        ethPrivateKey: "81690fb141b4ae5682ad1fd73b29ae1bcc67891e93de73c6f636402deac21171",
        name: "Node4",
        rpcUrl: "qa-node4-rpc.hamsa-ucl.com:50051",
        nodeUrl: "https://qa-node4-proxy.hamsa-ucl.com:8443",
        httpUrl: "http://qa-node4-http.hamsa-ucl.com:8080",
        publicKey: {
            x: "20939066757645918795634673682728216909767846507882077869735730662556512988867",
            y: "10484302653646958667875402192638179073860126846729616349907290732560904524336",
        },
        privateKey: "1269647837676258859940892295235950289673852489198963778624801308185618508021",
        users: [
            {address: "0xbA268f776F70caDB087e73020dfE41c7298363Ed", role: "normal"}
        ]
    }
]


async function registerUserForGrpc() {
    for (let i = 0; i < institutions.length; i++) {
        let client;
        try {
            client = createClient(institutions[i].rpcUrl);
        } catch (error) {
            console.error(`[ERROR] Failed to connect to node ${institutions[i].name}:`, {
                rpcUrl: institutions[i].rpcUrl,
                error: error.message,
                stack: error.stack
            });
            continue;
        }

        for (let j = 0; j < institutions[i].users.length; j++) {
            let {address, role} = institutions[i].users[j];
            // don't remove below line
            if (address == institutions[i].address) {
                continue;
            }
            await registerUser(client, institutions[i].ethPrivateKey, address, role);
            console.log(`Registered user ${address} under Bank ${institutions[i].address}`);
        }
    }
}

async function registerInstitutionAndMintersAndConfigureMinter() {

    const minters = [
        {account: accounts.Minter, name: "Minter"},
        {account: accounts.Minter2, name: "Minter2"},
        {account: accounts.Minter3, name: "Minter3"}
    ];


    const InstitutionUserRegistryFactory = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });
    const institutionUserRegistry = await InstitutionUserRegistryFactory.attach(deployed.contracts.InstitutionUserRegistry);
    for (let i = 0; i < institutions.length; i++) {
        console.log(`Register institution ${institutions[i].address} in InstitutionUserRegistry smart contract...`);
        // Register institutions
        try {
            let regTx = await institutionUserRegistry.registerInstitution(
                institutions[i].address,
                institutions[i].name,
                institutions[i].publicKey,
                institutions[i].nodeUrl,
                institutions[i].httpUrl
            );
            await regTx.wait();
            console.log(`Bank ${institutions[i].address} is registered successfully in InstitutionUserRegistry`);
        } catch (error) {
            if (!error.message.includes("institution already registered")) {
                console.log(error)
            }
        }

        // Register minters
        let client;
        try {
            client = createClient(institutions[i].rpcUrl);
        } catch (error) {
            console.error(`[ERROR] Failed to connect to node ${institutions[i].name}:`, {
                rpcUrl: institutions[i].rpcUrl,
                error: error.message,
                stack: error.stack
            });
            continue;
        }

        for (const minter of minters) {
            await registerUser(client, institutions[i].ethPrivateKey, minter.account, "minter");
            console.log(`Registered minter ${minter.name} (${minter.account}) via institution ${institutions[i].name}`);
        }
    }

    // configure minter allowed amount
    const minterAllowedAmount = {
        "cl_x": 17965178807605681775593476527901391566646357775548805416191630067931921590266n,
        "cl_y": 17997503520096523373978760079614633178183544935372525079367653487073845131371n,
        "cr_x": 2799658707790704252170544877645553735081603739176317448125814928308770685127n,
        "cr_y": 10724405929777949929088094477911843117820716522007699467531083531418761611245n,
    }
    console.log("Configure minter allowed amount...")

    const PrivateUSDCFactory = await ethers.getContractFactory("PrivateUSDC", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
            "SignatureChecker": deployed.libraries.SignatureChecker,
            "CurveBabyJubJubHelper": deployed.libraries.CurveBabyJubJubHelper,
            "TokenVerificationLib": deployed.libraries.TokenVerificationLib
        }
    });
    const privateUSDC = await PrivateUSDCFactory.attach(deployed.contracts.PrivateERCToken);

    try {
        for (const minter of minters) {
            await privateUSDC.configurePrivacyMinter(accounts.Minter, minterAllowedAmount);
            console.log(`Minter allowed amount configured successfully for ${minter.name} (${minter.account})`)
        }
    } catch (error) {
        console.log(error)
    }
}


async function registerConfigureMinter() {
    // configure minter allowed amount
    const minterAllowedAmount = {
        "cl_x": 17965178807605681775593476527901391566646357775548805416191630067931921590266n,
        "cl_y": 17997503520096523373978760079614633178183544935372525079367653487073845131371n,
        "cr_x": 2799658707790704252170544877645553735081603739176317448125814928308770685127n,
        "cr_y": 10724405929777949929088094477911843117820716522007699467531083531418761611245n,
    }
    console.log("Configure minter allowed amount...")
    const minters = [
        {account: accounts.Minter, name: "Minter"},
        {account: accounts.Minter2, name: "Minter2"},
        {account: accounts.Minter3, name: "Minter3"}
    ];

    const PrivateUSDCFactory = await ethers.getContractFactory("PrivateUSDC", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
            "SignatureChecker": deployed.libraries.SignatureChecker,
            "CurveBabyJubJubHelper": deployed.libraries.CurveBabyJubJubHelper,
            "TokenVerificationLib": deployed.libraries.TokenVerificationLib
        }
    });
    const privateUSDC = await PrivateUSDCFactory.attach(deployed.contracts.PrivateERCToken);

    try {
        for (const minter of minters) {
            await privateUSDC.configurePrivacyMinter(accounts.Minter, minterAllowedAmount);
            console.log(`Minter allowed amount configured successfully for ${minter.name} (${minter.account})`)
        }
    } catch (error) {
        console.log(error)
    }
}

async function registerMintersForGrpc() {

    const minters = [
        {account: accounts.Minter, name: "Minter"},
        {account: accounts.Minter2, name: "Minter2"},
        {account: accounts.Minter3, name: "Minter3"}
    ];


    for (let i = 0; i < institutions.length; i++) {
        // Register minters
        let client;
        try {
            client = createClient(institutions[i].rpcUrl);
        } catch (error) {
            console.error(`[ERROR] Failed to connect to node ${institutions[i].name}:`, {
                rpcUrl: institutions[i].rpcUrl,
                error: error.message,
                stack: error.stack
            });
            continue;
        }

        for (const minter of minters) {
            await registerUser(client, institutions[i].ethPrivateKey, minter.account, "minter");
            console.log(`Registered minter ${minter.name} (${minter.account}) via institution ${institutions[i].name}`);
        }
    }

}

async function registerInstitution() {
    const InstitutionUserRegistryFactory = await ethers.getContractFactory("InstitutionUserRegistry", {
        libraries: {
            "TokenEventLib": deployed.libraries.TokenEventLib,
        }
    });
    const institutionUserRegistry = await InstitutionUserRegistryFactory.attach(deployed.contracts.InstitutionUserRegistry);
    for (let i = 0; i < institutions.length; i++) {
        console.log(`Register institution ${institutions[i].address} in InstitutionUserRegistry smart contract...`);
        // Register institutions
        try {
            let regTx = await institutionUserRegistry.registerInstitution(
                institutions[i].address,
                institutions[i].name,
                institutions[i].publicKey,
                institutions[i].nodeUrl,
                institutions[i].httpUrl
            );
            await regTx.wait();
            console.log(`Bank ${institutions[i].address} is registered successfully in InstitutionUserRegistry`);
        } catch (error) {
            if (!error.message.includes("institution already registered")) {
                console.log(error)
            }
        }
    }
}

async function allowBanksInTokenSmartContract() {
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

    for (let i = 0; i < institutions.length; i++) {
        let bankAddress = institutions[i].address;
        let tx = await privateUSDC.updateAllowedBank(bankAddress, true)
        await tx.wait();
    }
}


async function registerUser(client, privateKey, userAddress, role) {
    const metadata = await createAuthMetadata(privateKey);
    const request = {
        account_address: userAddress,
        account_roles: role,//minter,admin,normal
    };
    try {
        const response = await client.registerAccount(request, metadata);
        console.log("registerAccount response:", response);
    } catch (error) {
        console.error("registerAccount failed:", error);
    }
}

async function main() {
    await deployToken();

    await allowBanksInTokenSmartContract();

    await sleep(10000)
    await registerInstitution();

    await sleep(10000)
    await registerMintersForGrpc();

    await registerConfigureMinter();

    // await registerInstitutionAndMintersAndConfigureMinter();
    await registerUserForGrpc();
}

//
// main().then();

//1. deploy token
deployToken().then();
//2. allow banks in token smart contract
allowBanksInTokenSmartContract().then();
//3. register institution
registerInstitution().then();
//4. register minters
registerMintersForGrpc().then();
//5. register configure minter
registerConfigureMinter().then();
//6. register user
registerUserForGrpc().then();




