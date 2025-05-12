const { ethers } = require("hardhat");
const hre = require("hardhat");
const { CONTRACT_CONFIG } = require("./config");

// 获取合约 ABI
async function getTokenScBaseAbi() {
  try {
    // 从已部署合约获取 ABI
    const artifact = await hre.artifacts.readArtifact("TokenScBase");
    return artifact.abi;
  } catch (error) {
    console.error("Failed to get TokenScBase ABI:", error.message);
    throw error;
  }
}

// 铸造代币
async function mintToken(token, proof, signer) {
  try {
    console.log("准备铸造代币...");
    
    // 从配置文件中读取合约地址
    const tokenScAddress = CONTRACT_CONFIG.tokenScBase;
    
    // 获取 ABI
    const abi = await getTokenScBaseAbi();
    
    // 创建合约实例
    const tokenScBase = new ethers.Contract(tokenScAddress, abi, signer);
    
    // 调用合约方法
    const tx = await tokenScBase.mintToken(token, proof);
    await tx.wait();
    
    console.log(`代币铸造成功，交易哈希: ${tx.hash}`);
    return tx;
  } catch (error) {
    console.error("铸造代币时出错:", error);
    throw error;
  }
}

// 分割代币
async function splitToken(parentTokenUpdate, childTokens, proof, signer) {
  try {
    console.log("准备分割代币...");
    
    // 从配置文件中读取合约地址
    const tokenScAddress = CONTRACT_CONFIG.tokenScBase;
    
    // 获取 ABI
    const abi = await getTokenScBaseAbi();
    
    // 创建合约实例
    const tokenScBase = new ethers.Contract(tokenScAddress, abi, signer);
    
    // 打印参数以便调试
    console.log("Parent Token Update:", {
      id: parentTokenUpdate.id.toString(),
      owner: parentTokenUpdate.owner,
      cl_x: parentTokenUpdate.cl_x.toString(),
      cl_y: parentTokenUpdate.cl_y.toString(),
      cr_x: parentTokenUpdate.cr_x.toString(),
      cr_y: parentTokenUpdate.cr_y.toString()
    });
    
    console.log("Child Tokens:", childTokens.map(token => ({
      id: token.id.toString(),
      owner: token.owner,
      manager: token.manager,
      cl_x: token.cl_x.toString(),
      cl_y: token.cl_y.toString(),
      cr_x: token.cr_x.toString(),
      cr_y: token.cr_y.toString(),
      status: token.status
    })));
    
    console.log("Proof length:", proof.length);
    
    // 调用合约方法
    const tx = await tokenScBase.splitToken(parentTokenUpdate, childTokens, proof);
    await tx.wait();
    
    console.log(`代币分割成功，交易哈希: ${tx.hash}`);
    return tx;
  } catch (error) {
    console.error("分割代币时出错:", error);
    console.error("错误详情:", error.toString());
    
    if (error.reason) console.error("错误原因:", error.reason);
    if (error.code) console.error("错误代码:", error.code);
    if (error.method) console.error("调用方法:", error.method);
    if (error.transaction) console.error("交易详情:", error.transaction);
    
    throw error;
  }
}

/**
 * Convert plaintext amount to encrypted token
 */
async function convertPlainToPrivateToken(owner, manager, tokenType, amount, tokenId, signer) {
  try {
    console.log("Starting conversion of plaintext amount to encrypted token...");
    const tokenScAddress = CONTRACT_CONFIG.tokenScBase;

    const abi = await getTokenScBaseAbi();

    // Create contract instance
    const tokenScBase = new ethers.Contract(tokenScAddress, abi, signer);

    console.log("Conversion parameters:", {
      owner: owner,
      manager: manager,
      tokenType: tokenType.toString(),
      amount: amount.toString(),
      tokenId: tokenId.toString()
    });

    const tx = await tokenScBase.convertPlainToPrivateToken(
      owner,
      manager,
      tokenType,
      amount,
      tokenId
    );

    const receipt = await tx.wait();

    const eventSignature = "TokenConverted(address,address,uint256,address,address,uint256,uint256,uint256,uint256,uint256,uint256,uint8,uint256)";
    const eventTopic = ethers.id(eventSignature);
    const log = receipt.logs.find(log => log.topics[0] === eventTopic);

    if (log) {
      console.log("Event triggered successfully:");
      console.log(`  - Token ID: ${tokenId}`);
      console.log(`  - Owner: ${owner}`);
      console.log(`  - Manager: ${manager}`);
      console.log(`  - Converted amount: ${amount}`);
    }

    console.log(`Plaintext amount successfully converted to encrypted token, transaction hash: ${tx.hash}`);
    return tx;
  } catch (error) {
    console.error("Error converting plaintext amount to encrypted token:", error);
    console.error("Error details:", error.message);

    if (error.reason) console.error("Error reason:", error.reason);
    if (error.code) console.error("Error code:", error.code);
    if (error.method) console.error("Method called:", error.method);
    if (error.transaction) console.error("Transaction details:", JSON.stringify(error.transaction, null, 2));

    throw error;
  }
}

// Other token operations (merge, exchange, remove) can be added here...

module.exports = { mintToken, splitToken, convertPlainToPrivateToken};