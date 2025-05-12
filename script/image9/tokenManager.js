const { ethers } = require("hardhat");
const { addBankAccount, removeBankAccount, isBankAccount } = require("./bankAccountManager");
const { mintToken, splitToken, convertPlainToPrivateToken } = require("./tokenOperations");
const { readProofFromFile } = require("./proofUtils");

// Main function to run the script
async function testSplitToken() {
  try {
    // 通过私钥构建signer
    const mySigner = new ethers.Wallet("8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63", ethers.provider);
    
    // 读取证明
    const proof = readProofFromFile();
  
    // 示例：分割代币 - 使用从txt文件中提取的参数信息
    const parentTokenUpdate = {
      id: ethers.toBigInt("0xca4b06f16742fe1e4cb994c50ee3e9403ed1d5a5c02a613d00efb47037898bc0"),
      owner: "0xf17f52151EbEF6C7334FAD080c5704D77216b732",
      cl_x: ethers.toBigInt("0x2564988b3dacee1aad0528e794bd8a606dd8d17643c3c992fe95c32c32b0664a"),
      cl_y: ethers.toBigInt("0x0d73e0341690c1a8152912df2273500990b4423ae552890c7f0bd16ae62bee28"),
      cr_x: ethers.toBigInt("0x1f5cc71299004499735d9ab3688f403e4d8b41d2c1c77f6f3533288b2f871de5"),
      cr_y: ethers.toBigInt("0x026b5ce26fcc0b8317d0f95a93508406dc5a230dd759b9ed2b5f23f1f46c5f00")
    };
    
    const childTokens = [
      {
        id: ethers.toBigInt("0xf3b192e3428d23f6c3d29ecebddfd4cb7fc185bc7323c931de068ae57cb112c1"),
        owner: "0xf17f52151EbEF6C7334FAD080c5704D77216b732",
        manager: "0xfe3b557e8fb62b89f4916b721be55ceb828dbd73",
        cl_x: ethers.toBigInt("0x0a23cdc397aded486e71183013576c45e66b82a24325bc377e555b1460d6faef"),
        cl_y: ethers.toBigInt("0x085c40e47e2c34221159d61e931419f85e9d5fce772842875fb4641ebfeb3d87"),
        cr_x: ethers.toBigInt("0x13fba696d57a97c20b24b78e695ef92eb7d2317262de8afe1c76dec659ff9f3d"),
        cr_y: ethers.toBigInt("0x2ab42f0b6fa12b60bfa982f14fa330ecf79ab58ffee5732768321fac240f4a3c"),
        status: 1
      },
      {
        id: ethers.toBigInt("0xc2dd41c0cd9183503540315e309c3b8923ca06044d6f5c6413ce041254f2aa0b"),
        owner: "0x23eabdd1584Cc04E5962524F48B9c6f4d1Ef98cD",
        manager: "0x122A4F8848fB5df788340FD07fc7276cc038dC01",
        cl_x: ethers.toBigInt("0x166d34d5c52c602912efe114af22454972b0529705b88a7dc7fe2efd20bb7d3a"),
        cl_y: ethers.toBigInt("0x070b6e34ed4ccba2c7002252ee00caea57dfc4c5d610ec8f60cd561fdb194bcd"),
        cr_x: ethers.toBigInt("0x2c8c26b6955ae35e29923501b82b6964ac21090a9590cb2c84c842db77ffd414"),
        cr_y: ethers.toBigInt("0x00c82c15740d2a293fbfaa6e92f5aff454dfeacddd6ad9c585a89911e09897d1"),
        status: 1
      }
    ];
    
    console.log("准备调用splitToken...");
    console.log(parentTokenUpdate);
    console.log(childTokens);
    await splitToken(parentTokenUpdate, childTokens, proof, mySigner);
    console.log("splitToken 调用完成");
  } catch (error) {
    console.error("Error in main function:", error);
  }
}

async function testMintToken() {
  try {
    // 通过私钥构建signer
    const mySigner = new ethers.Wallet("8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63", ethers.provider);
    const tokenScBase = await getTokenScBaseContract(mySigner);

    const token = {
      id: ethers.toBigInt("0xca4b06f16742fe1e4cb994c50ee3e9403ed1d5a5c02a613d00efb47037898bc0"),
      owner: "0xf17f52151EbEF6C7334FAD080c5704D77216b732",
      manager: "0xfe3b557e8fb62b89f4916b721be55ceb828dbd73",
      cl_x: ethers.toBigInt("0x2564988b3dacee1aad0528e794bd8a606dd8d17643c3c992fe95c32c32b0664a"),
      cl_y: ethers.toBigInt("0x0d73e0341690c1a8152912df2273500990b4423ae552890c7f0bd16ae62bee28"),
    }
    const tx = await tokenScBase.mintToken(token, proof, mySigner);
    await tx.wait();
    console.log("mintToken 调用完成");
  } catch (error) {
    console.error("Error in mintToken function:", error);
  }
}

/**
 * Test the convertPlainToPrivateToken function
 * This function demonstrates converting a plaintext balance to an encrypted token
 */
async function testConvertPlainToPrivateToken() {
  try {
    console.log("Starting test for convertPlainToPrivateToken...");
    
    // Create signer with private key
    const privateKey = "8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63";
    const mySigner = new ethers.Wallet(privateKey, ethers.provider);
    
    // Define parameters for conversion
    const owner = "0xf17f52151EbEF6C7334FAD080c5704D77216b732"; // Token owner address
    const manager = "0xfe3b557e8fb62b89f4916b721be55ceb828dbd73"; // Token manager address
    const tokenType = 1; // 1 for ERC20, 2 for ERC1155
    const amount = ethers.parseEther("100"); // Amount to convert (100 tokens)
    
    // Generate a random token ID based on current timestamp and a random number
    const randomHex = Math.floor(Math.random() * 1000000).toString(16);
    const timestamp = Date.now().toString(16);
    const tokenId = ethers.toBigInt(`0x${timestamp}${randomHex}`);
    
    console.log("Test parameters:");
    console.log(`  - Owner: ${owner}`);
    console.log(`  - Manager: ${manager}`);
    console.log(`  - Token Type: ${tokenType}`);
    console.log(`  - Amount: ${ethers.formatEther(amount)} tokens`);
    console.log(`  - Token ID: ${tokenId.toString(16)}`);
    
    // Call the function to convert plaintext to private token
    const tx = await convertPlainToPrivateToken(
      owner,
      manager,
      tokenType,
      amount,
      tokenId,
      mySigner
    );
    
    console.log(`Transaction submitted with hash: ${tx.hash}`);
    console.log("convertPlainToPrivateToken test completed");
  } catch (error) {
    console.error("Error in convertPlainToPrivateToken test:", error);
    console.error("Error details:", error.message);
    
    if (error.reason) console.error("Error reason:", error.reason);
    if (error.code) console.error("Error code:", error.code);
  }
}

async function main() {
  try {
    // Add bank account
    await addBankAccount("0xFE3B557E8Fb62b89F4916B721be55cEb828dBd73");
    
    // Test convertPlainToPrivateToken function
    await testConvertPlainToPrivateToken();
    
    // Uncomment to test other functions
    // await testSplitToken();
    // await testMintToken();
    
    console.log("All tests completed successfully");
  } catch (error) {
    console.error("Error in main function:", error);
  }
}

// Run main function
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Error running script:", error);
      process.exit(1);
    });
}