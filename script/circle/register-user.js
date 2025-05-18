const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("=== User Registration Test ===");
  
  // Load deployment info
  const deploymentsDir = path.join(__dirname, "../../deployments");
  const filepath = path.join(deploymentsDir, "image9.json");
  
  if (!fs.existsSync(filepath)) {
    console.error("Deployment file not found. Please deploy contracts first.");
    return;
  }
  
  const deployed = JSON.parse(fs.readFileSync(filepath, "utf8"));
  
  // Get contract instances
  const institutionRegistrationAddress = deployed.contracts.InstitutionRegistration;
  console.log("InstitutionRegistration address:", institutionRegistrationAddress);
  
  const InstitutionRegistration = await ethers.getContractFactory("InstitutionRegistration");
  const institutionRegistration = InstitutionRegistration.attach(institutionRegistrationAddress);
  
  // Get signers
  const [deployer, user1, user2] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("User 1:", user1.address);
  console.log("User 2:", user2.address);
  
  // Get institution information
  const inst1Address = "0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB";
  console.log("\nGetting institution info for:", inst1Address);
  const institution = await institutionRegistration.getInstitution(inst1Address);
  console.log("Institution Name:", institution.name);
  console.log("Institution Manager Address:", institution.managerAddress);
  console.log("Institution Public Key:", {
    x: institution.publicKey.x.toString(),
    y: institution.publicKey.y.toString()
  });
  
  // Register users
  console.log("\nRegistering User 1 under Institution 1...");
  try {
    const tx1 = await institutionRegistration.registerUser(user1.address, inst1Address);
    await tx1.wait();
    console.log(`User ${user1.address} registered successfully under manager ${inst1Address}`);
  } catch (error) {
    console.error("Failed to register User 1:", error.message);
  }
  
  // Try to register the same user again (should fail)
  console.log("\nTrying to register User 1 again (should fail)...");
  try {
    const tx2 = await institutionRegistration.registerUser(user1.address, inst1Address);
    await tx2.wait();
    console.log(`User ${user1.address} registered again (this shouldn't happen)`);
  } catch (error) {
    console.log("Registration failed as expected:", error.message.substring(0, 100) + "...");
  }
  
  // Query user's manager
  console.log("\nQuerying manager for User 1...");
  const manager = await institutionRegistration.getUserManager(user1.address);
  console.log(`User ${user1.address} is managed by ${manager}`);
  
  // Get all users managed by an institution
  console.log("\nGetting all users managed by Institution 1...");
  const users = await institutionRegistration.getManagerUsers(inst1Address);
  console.log(`Institution ${inst1Address} manages ${users.length} users:`);
  for (let i = 0; i < users.length; i++) {
    console.log(`- ${users[i]}`);
  }
  
  console.log("\nTest completed.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error in test script:", error);
    process.exit(1);
  }); 