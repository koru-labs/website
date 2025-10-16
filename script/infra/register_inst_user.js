const {ethers} = require("hardhat");

const {createAuthMetadata} = require("../../test/help/testHelp.js")
const {createClient} = require('../../test/qa/token_grpc');
const { getEnvironmentConfig } = require('../deploy_help.js');
const Fixed_Addresses = getEnvironmentConfig();

async function registerInstitutionAndUser() {

    const institutionUserRegistry = await ethers.getContractAt("InstitutionUserRegistry", Fixed_Addresses.ADDRESSES.PROXY_ADDRESS);
    let institutions = Fixed_Addresses.institutions;
    for (let i = 0; i < institutions.length; i++) {
        console.log(`Register institution ${institutions[i].address} in InstitutionUserRegistry smart contract...`);
        try {
            let regTx = await institutionUserRegistry.registerInstitution(
                institutions[i].address,
                institutions[i].name,
                institutions[i].publicKey,
                institutions[i].rpcUrl,
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

        let client;
        try {
            client = createClient(institutions[i].rpcUrl);
            console.log(`Connected to node ${institutions[i].rpcUrl}`);
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
            // RPC call contract to register user
            await registerUser(client, institutions[i].ethPrivateKey, address, role);

            //JS call contract to register user
            // const wallet = new ethers.Wallet(institutions[i].ethPrivateKey, ethers.provider);
            // const institutionUserRegistry = await ethers.getContractAt("InstitutionUserRegistry",     const institutionUserRegistry = await ethers.getContractAt("InstitutionUserRegistry", Fixed_Addresses.ADDRESSES.PROXY_ADDRESS, wallet);
            // try {
            //     let regTx = await institutionUserRegistry.registerUser(address);
            //     await regTx.wait();
            // } catch (error) {
            //     if (!error.message.includes("User already registered")) {
            //         console.log(error)
            //     }
            //     continue;
            // }
            console.log(`Registered user ${address} under Bank ${institutions[i].address}`);
        }
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

//execute after main is completed and k8s configuration is updated and ucl-node are been restarted
registerInstitutionAndUser().then();