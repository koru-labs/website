const path = require("path");
const fs = require("fs");
const hre = require("hardhat");
const {ethers} = hre;

// Helper function to get environment-specific filename
function getDeploymentFilename() {
    const networkName = hre.network.name;
    
    // Determine environment based on network name
    let environment;
    if (networkName.includes('dev') || networkName.includes('development')) {
        environment = 'dev';
    } else if (networkName.includes('qa') || networkName.includes('test')) {
        environment = 'qa';
    } else if (networkName.includes('prod') || networkName.includes('production') || networkName.includes('mainnet')) {
        environment = 'prod';
    } else {
        // Default to network name if no specific environment pattern found
        environment = networkName;
    }
    
    return `image9_${environment}.json`;
}

// Helper function to get environment-specific configuration
function getEnvironmentConfig() {
    const networkName = hre.network.name;
    let configPath;
    
    // Determine which configuration file to use based on network name
    if (networkName.includes('dev') || networkName.includes('development')) {
        configPath = path.join(__dirname, 'dev_configuration.js');
    } else if (networkName.includes('qa') || networkName.includes('test')) {
        configPath = path.join(__dirname, 'qa_configuration.js');
    } else {
        // Default to dev configuration if no specific environment pattern found
        console.log(`Warning: Unknown environment for network "${networkName}", defaulting to dev configuration`);
        configPath = path.join(__dirname, 'dev_configuration.js');
    }
    
    try {
        // Clear require cache to ensure fresh load
        delete require.cache[require.resolve(configPath)];
        const config = require(configPath);
        console.log(`Loaded configuration for environment: ${networkName}`);
        return config;
    } catch (error) {
        console.error(`Error loading configuration from ${configPath}:`, error);
        throw new Error(`Failed to load environment configuration for network: ${networkName}`);
    }
}

async function loadExistingDeployments() {
    const deploymentsDir = path.join(__dirname, "../../deployments");
    const filename = getDeploymentFilename();
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
    const filename = getDeploymentFilename();
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
    deployed.metadata = {
        timestamp: new Date().toISOString(),
        network: hre.network.name,
        chainId: (await ethers.provider.getNetwork()).chainId.toString(),
        environment: getDeploymentFilename().replace('image9_', '').replace('.json', '')
    };

    const deploymentsDir = path.join(__dirname, "../../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, {recursive: true});
    }

    const filename = getDeploymentFilename();
    const filepath = path.join(deploymentsDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(deployed, null, 2));
    console.log(`Deployment information saved to: ${filepath}`);
    console.log(`Environment: ${deployed.metadata.environment}`);
}


module.exports = {
    loadExistingDeployments,
    loadExistingDeploymentsForL1,
    saveDeploymentInfo,
    getDeploymentFilename,
    getEnvironmentConfig
}