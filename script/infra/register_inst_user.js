const {ethers} = require("hardhat");

const {createAuthMetadata} = require("../../test/help/testHelp.js")
const {createClient} = require('../../test/qa/token_grpc');
const {getEnvironmentConfig} = require('../deploy_help.js');
const Fixed_Addresses = getEnvironmentConfig();

async function registerInstitutionAndUser() {

    const institutionUserRegistry = await ethers.getContractAt("InstitutionUserRegistry", Fixed_Addresses.ADDRESSES.PROXY_ADDRESS);
    let institutions = Fixed_Addresses.institutions;
    for (let i = 0; i < institutions.length; i++) {
        console.log(`Register institution ${institutions[i].name} with address ${institutions[i].address} in InstitutionUserRegistry smart contract...`);
        try {
            let requestRegisterInstitution = {
                managerAddress: institutions[i].address,
                name: institutions[i].name,
                streetAddress: institutions[i].streetAddress,
                suiteNo: institutions[i].suiteNo,
                city: institutions[i].city,
                state: institutions[i].state,
                zip: institutions[i].zip,
                publicKey: institutions[i].publicKey,
                rpcUrl: institutions[i].rpcUrl,
                nodeUrl: institutions[i].nodeUrl,
                httpUrl: institutions[i].httpUrl
            }
            let regTx = await institutionUserRegistry.registerInstitution(requestRegisterInstitution);
            await regTx.wait();
            console.log(`Bank ${institutions[i].address} is registered successfully in InstitutionUserRegistry`);
        } catch (error) {
            if (!error.message.includes("institution already registered")) {
                console.log(error)
            }
        }

        try {
            let regTx = await institutionUserRegistry.replaceInstitutionCallers(
                institutions[i].address, [institutions[i].address]
            );
            await regTx.wait();
            console.log(`Bank ${institutions[i].address} is set Callers successfully in InstitutionUserRegistry`);
        } catch (error) {
            console.log(error)
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
        if (institutions[i].users && institutions[i].users.length > 0) {
            for (let j = 0; j < institutions[i].users.length; j++) {
                let {address, role} = institutions[i].users[j];
                // don't remove below line
                if (address == institutions[i].address) {
                    continue;
                }
                // RPC call contract to register user
                const roles = role.split(',');
                const validRoles = roles.map(r => {
                    r = r.trim();
                    return (r === 'normal' || r === 'admin') ? r : 'normal';// normal,admin
                }).filter((value, index, self) => self.indexOf(value) === index);

                role = validRoles.join(',');
                if (!role) role = 'normal';
                institutions[i].users[j].role = role;
                await registerUser(client, institutions[i].ethPrivateKey, institutions[i].users[j]);

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
}


async function registerUser(client, privateKey, user) {
    const metadata = await createAuthMetadata(privateKey);
    const request = {
        account_address: user.address,
        account_roles: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone_number: user.phone_number,
    };
    try {
        // console.log("registerAccount request:", request);
        const response = await client.registerAccount(request, metadata);
        console.log("registerAccount response:", response);
    } catch (error) {
        console.error("registerAccount failed:", error);
    }
}

//execute after main is completed and k8s configuration is updated and ucl-node are been restarted
registerInstitutionAndUser().then();