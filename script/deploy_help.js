const path = require("path");
const fs = require("fs");
const hre = require("hardhat");
const {ethers} = hre;



// Helper function to get environment-specific configuration
function getEnvironmentConfig() {
    const networkName = hre.network.name;
    let environment;

    // Determine environment based on network name
    if (networkName.includes('dev') || networkName.includes('development')) {
        environment = 'dev';
    } else if (networkName.includes('qa') || networkName.includes('test')) {
        environment = 'qa';
    } else if (networkName.includes('prod') || networkName.includes('production') || networkName.includes('mainnet')) {
        environment = 'prod';
    } else {
        // Default to dev configuration if no specific environment pattern found
        console.log(`Warning: Unknown environment for network "${networkName}", defaulting to dev configuration`);
        environment = 'dev';
    }

    // Directly load from environment-specific JS configuration files
    let configPath;
    if (networkName.includes('dev') || networkName.includes('development')) {
        configPath = path.join(__dirname, 'dev_configuration.js');
    } else if (networkName.includes('qa') || networkName.includes('test')) {
        configPath = path.join(__dirname, 'qa_configuration.js');
    } else {
        configPath = path.join(__dirname, 'dev_configuration.js');
    }

    try {
        delete require.cache[require.resolve(configPath)];
        const config = require(configPath);
        console.log(`Loaded configuration for environment: ${networkName} (${environment})`);
        return config;
    } catch (error) {
        console.error(`Error loading configuration from ${configPath}:`, error);
        throw new Error(`Failed to load environment configuration for network: ${networkName}`);
    }
}

async function loadExistingDeployments() {
    const deploymentsDir = path.join(__dirname, "../../deployments");
    const filename = "image9.json";
    const filepath = path.join(deploymentsDir, filename);

    console.log(`Looking for existing deployments in: ${filename}`);

    if (fs.existsSync(filepath)) {
        const data = fs.readFileSync(filepath, 'utf8');
        const existingDeployments = JSON.parse(data);

        // Get current network info
        const currentNetwork = hre.network.name;
        const currentChainId = (await ethers.provider.getNetwork()).chainId.toString();

        // Check if network matches
        if (existingDeployments.metadata?.network === currentNetwork &&
            existingDeployments.metadata?.chainId === currentChainId) {
            console.log(`Found existing deployments for network: ${currentNetwork} (chainId: ${currentChainId})`);
            return existingDeployments;
        } else {
            console.log(`Network mismatch detected. Previous deployment was on ${existingDeployments.metadata?.network} (chainId: ${existingDeployments.metadata?.chainId}), current network is ${currentNetwork} (chainId: ${currentChainId})`);
            console.log("Removing previous deployment information...");
            fs.unlinkSync(filepath);
            return null;
        }
    }
    console.log(`No existing deployments found for environment: ${filename}`);
    return null;
}

async function loadExistingDeploymentsForL1() {
    const deploymentsDir = path.join(__dirname, "../../deployments");
    const filename = "image9.json";
    const filepath = path.join(deploymentsDir, filename);

    console.log(`Looking for existing L1 deployments in: ${filename}`);

    if (fs.existsSync(filepath)) {
        const data = fs.readFileSync(filepath, 'utf8');
        const existingDeployments = JSON.parse(data);
        console.log(`Found existing L1 deployments for environment: ${filename}`);
        return existingDeployments;
    }
    console.log(`No existing L1 deployments found for environment: ${filename}`);
    return null;
}

async function saveDeploymentInfo(deployed, hre, ethers, fs, path) {
    console.log("\n=== Save deployment information ===");

    const networkName = hre.network.name;
    const chainId = (await ethers.provider.getNetwork()).chainId.toString();
    const timestamp = new Date().toISOString();

    let environment;
    if (networkName.includes('dev') || networkName.includes('development')) {
        environment = 'dev';
    } else if (networkName.includes('qa') || networkName.includes('test')) {
        environment = 'qa';
    } else if (networkName.includes('prod') || networkName.includes('production') || networkName.includes('mainnet')) {
        environment = 'prod';
    } else {
        environment = 'dev';
    }

    console.log(`Saving deployment information for environment: ${environment} (${networkName})`);

    const deploymentsDir = path.join(__dirname, "../../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, {recursive: true});
    }

    const image9Path = path.join(deploymentsDir, "image9.json");

    try {
        let image9Data = {};
        if (fs.existsSync(image9Path)) {
            const existingData = fs.readFileSync(image9Path, 'utf8');
            image9Data = JSON.parse(existingData);
        }

        const deploymentData = {
            libraries: {},
            contracts: {},
            accounts: deployed.accounts || {},
            metadata: {
                timestamp: timestamp,
                network: networkName,
                chainId: chainId
            }
        };

        if (deployed.ADDRESSES) {
            for (const [key, value] of Object.entries(deployed.ADDRESSES)) {
                if (key.includes('Lib') || key.includes('Verifier') || key.includes('Helper') || key.includes('Checker')) {
                    const libName = key.replace(/_/g, '');
                    deploymentData.libraries[libName] = value;
                } else if (value && value !== "") {
                    const contractName = key.replace(/_/g, '');
                    deploymentData.contracts[contractName] = value;
                }
            }
        }

        if (deployed.libraries) {
            Object.assign(deploymentData.libraries, deployed.libraries);
        }
        if (deployed.contracts) {
            Object.assign(deploymentData.contracts, deployed.contracts);
        }

        image9Data[environment] = deploymentData;

        fs.writeFileSync(image9Path, JSON.stringify(image9Data, null, 2));
        console.log(`Deployment information updated in: ${image9Path}`);
        console.log(`Environment updated: ${environment}`);
        // console.log(`Libraries: ${Object.keys(deploymentData.libraries).length}`);
        // console.log(`Contracts: ${Object.keys(deploymentData.contracts).length}`);

    } catch (error) {
        console.error(`Error saving deployment information:`, error);
        throw error;
    }
}


function getImage9EnvironmentData() {
    const networkName = hre.network.name;
    let environment;
    if (networkName.includes('dev') || networkName.includes('development')) {
        environment = 'dev';
    } else if (networkName.includes('qa') || networkName.includes('test')) {
        environment = 'qa';
    } else if (networkName.includes('prod') || networkName.includes('production') || networkName.includes('mainnet')) {
        environment = 'prod';
    } else {
        console.log(`Warning: Unknown environment for network "${networkName}", defaulting to dev configuration`);
        environment = 'dev';
    }

    const image9Path = path.join(__dirname, "../../deployments/image9.json");

    try {
        if (!fs.existsSync(image9Path)) {
            throw new Error(`image9.json not found at ${image9Path}`);
        }

        const data = fs.readFileSync(image9Path, 'utf8');
        const image9Data = JSON.parse(data);

        if (!image9Data[environment]) {
            throw new Error(`Environment "${environment}" not found in image9.json`);
        }

        console.log(`Loaded ${environment} configuration from image9.json for network: ${networkName}`);
        return image9Data[environment];

    } catch (error) {
        console.error(`Error loading ${environment} configuration from image9.json:`, error);
        throw new Error(`Failed to load ${environment} configuration from image9.json: ${error.message}`);
    }
}

module.exports = {
    loadExistingDeployments,
    loadExistingDeploymentsForL1,
    saveDeploymentInfo,
    getEnvironmentConfig,
    getImage9EnvironmentData
}