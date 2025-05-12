const { ethers } = require("hardhat");
const hre = require("hardhat");
const hardhatConfig = require("../hardhat.config");
const L1_RPC = hardhatConfig.networks.server_aws_L1_besu.url;
// ====================== 配置区域 ======================
// 请在此处修改配置参数
const CONFIG = {
  // L1TMSC合约地址
  contractAddress: "0x41ae9200Db967E96d4c9B556da4a614E8369990E",
  
  // 调用者私钥（必须是银行管理员）
  // 如果不设置，将使用hardhat配置的默认账户
  privateKey: "555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787",
  
  // 目标银行管理员地址
  bankAdminTo: "0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB",
  
  // 代币地址
  l1Erc20Address: "0x0E3A70Be317A3f137d11FabC41Ce21EF86Bd3a2A",
  
  // 代币类型
  tokenType: 0,
  
  // 结算金额（以wei为单位）
  amount: "3",
  
  // 新增参数: bundleHashes数组
  bundleHashes: [1, 2, 3],
  
  // 新增参数: amounts数组 (需要确保总和等于amount)
  amounts: [1, 1, 1]
};
// ====================== 配置结束 ======================

async function main() {
  // 打印privateKey对应的地址
  if (CONFIG.privateKey && CONFIG.privateKey.length > 0) {
    const wallet = new ethers.Wallet(CONFIG.privateKey);
    console.log("privateKey对应的地址:", wallet.address);
  }

  console.log("使用网络:", hre.network.name);
  console.log("合约地址:", CONFIG.contractAddress);
  console.log("目标银行管理员:", CONFIG.bankAdminTo);
  console.log("代币地址:", CONFIG.l1Erc20Address);
  console.log("代币类型:", CONFIG.tokenType);
  console.log("结算金额:", CONFIG.amount);
  console.log("Bundle Hashes:", CONFIG.bundleHashes);
  console.log("Amounts:", CONFIG.amounts);
  
  // 验证amounts总和是否等于amount
  const totalAmount = CONFIG.amounts.reduce((sum, amount) => sum + amount, 0);
  if (totalAmount != CONFIG.amount) {
    console.error(`错误: amounts总和(${totalAmount})不等于配置的amount(${CONFIG.amount})`);
    process.exit(1);
  }
  
  // 获取网络配置
  const [deployer] = await ethers.getSigners();
  console.log("默认调用者地址:", deployer.address);
  
  // 如果提供了私钥，使用私钥创建新的签名者
  let signer = deployer;
  if (CONFIG.privateKey && CONFIG.privateKey.length > 0) {
    const provider = new ethers.JsonRpcProvider(L1_RPC);
    signer = new ethers.Wallet(CONFIG.privateKey, provider);
    console.log("使用配置的私钥，地址:", signer.address);
  }
  
  // 加载合约ABI
  const L1TMSC = await ethers.getContractFactory("L1TMSC");
  const tmsc = L1TMSC.attach(CONFIG.contractAddress).connect(signer);
  
  console.log("开始调用settle函数...");
  
  try {
    // 查询当前银行管理员的余额
    const currentBalance = await tmsc.balanceOfBank(signer.address, CONFIG.l1Erc20Address, CONFIG.tokenType);
    console.log("当前银行管理员余额:", currentBalance.toString());
    
    // 查询目标银行管理员的余额
    const targetBalance = await tmsc.balanceOfBank(CONFIG.bankAdminTo, CONFIG.l1Erc20Address, CONFIG.tokenType);
    console.log("目标银行管理员余额:", targetBalance.toString());
    
    // 调用settle函数 - 更新为新的参数列表
    const tx = await tmsc.settle(
      CONFIG.bankAdminTo,
      CONFIG.l1Erc20Address,
      CONFIG.tokenType,
      ethers.parseUnits(CONFIG.amount, 0), // 将字符串转换为BigNumber
      CONFIG.bundleHashes,
      CONFIG.amounts
    );
    
    console.log("交易已发送，等待确认...");
    console.log("交易哈希:", tx.hash);
    
    // 等待交易确认
    const receipt = await tx.wait();
    
    console.log("交易已确认!");
    console.log("区块号:", receipt.blockNumber);
    console.log("Gas使用量:", receipt.gasUsed.toString());
    
    // 检查交易状态
    if (receipt.status === 1) {
      console.log("交易成功!");
    } else {
      console.log("交易失败!");
    }
    
    // 获取更新后的余额
    const balance = await tmsc.balanceOfBank(signer.address, CONFIG.l1Erc20Address, CONFIG.tokenType);
    console.log("当前余额:", balance.toString());
    
    const toBalance = await tmsc.balanceOfBank(CONFIG.bankAdminTo, CONFIG.l1Erc20Address, CONFIG.tokenType);
    console.log("目标账户余额:", toBalance.toString());
    
  } catch (error) {
    console.error("调用settle函数失败:", error);
    
    // 尝试解析错误信息
    if (error.reason) {
      console.error("错误原因:", error.reason);
    }
  }
}

// 执行主函数
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 