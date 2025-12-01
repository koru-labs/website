// test/config/TestConfig.js
const { network, ethers} = require('hardhat');
const { createClient } = require('../qa/token_grpc');
const config = require('../../deployments/image9.json');

const NetworkStage = Object.freeze({
    DEV: 'dev',
    QA: 'qa',
    PROD: 'prod'
});
const l1CustomNetwork = {
    name: "BESU",
    chainId: 1337
};
const options = {
    batchMaxCount: 1,
    staticNetwork: true
};
class TestConfig {
    constructor() {
        this.stage = this.#getNetworkStage();
        this.envConfig = config[this.stage];
        this.configuration = this.#loadConfiguration();
        this.contractAddress = this.envConfig.contracts.PrivateERCToken;
        this.institutions = this.#loadInstitutions();
    }


    #getNetworkStage() {
        const fullName = network.name; // e.g., 'ucl_L2_prod'
        return fullName.split('_').pop();
    }

    #loadConfiguration() {
        const configMap = {
            [NetworkStage.DEV]: require('../../script/dev_configuration'),
            [NetworkStage.QA]: require('../../script/qa_configuration'),
            [NetworkStage.PROD]: require('../../script/prod_configuration')
        };
        return configMap[this.stage] || configMap[NetworkStage.DEV];
    }

    #loadInstitutions() {
        const node3 = this.configuration.institutions.find(i => i.name === 'Node3');
        const node4 = this.configuration.institutions.find(i => i.name === 'Node4');
        // const demo_bank = this.configuration.institutions.find(i => i.name === 'demo_bank');

        if (!node3 || !node4) {
            throw new Error('Node3/Node4 institution not found in configuration');
        }
        // if (!node3 || !node4 || !demo_bank) {
        //     throw new Error('Node3/Node4/demo institution not found in configuration');
        // }

        return {
            node3: {
                ...node3,
                client: createClient(node3.rpcUrl),
                provider: new ethers.JsonRpcProvider(node3.nodeUrl, l1CustomNetwork, options),
                httpUrl: node3.httpUrl
            },
            node4: {
                ...node4,
                client: createClient(node4.rpcUrl),
                provider: new ethers.JsonRpcProvider(node4.nodeUrl, l1CustomNetwork, options),
                httpUrl: node4.httpUrl
            },
            // demo_bank: {
            //     ...demo_bank,
            //     client: createClient(demo_bank.rpcUrl),
            //     provider: new ethers.JsonRpcProvider(demo_bank.nodeUrl, l1CustomNetwork, options)
            // }
        };
    }
}

module.exports = { TestConfig, NetworkStage };