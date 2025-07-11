
async function loadExistingDeployments() {
    const deploymentsDir = path.join(__dirname, "../../deployments");
    const filepath = path.join(deploymentsDir, "image9.json");

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
    return null;
}

async function saveDeploymentInfo(deployed, hre, ethers, fs, path) {
    console.log("\n=== Save deployment information ===");
    deployed.metadata = {
        timestamp: new Date().toISOString(),
        network: hre.network.name,
        chainId: (await ethers.provider.getNetwork()).chainId.toString()
    };

    const deploymentsDir = path.join(__dirname, "../../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, {recursive: true});
    }

    const filepath = path.join(deploymentsDir, "image9.json");
    fs.writeFileSync(filepath, JSON.stringify(deployed, null, 2));
    console.log(`deployment information is saved to : ${filepath}`);
}


module.exports = {
    loadExistingDeployments,
    saveDeploymentInfo
}