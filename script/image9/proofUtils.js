const fs = require('fs');
const path = require('path');

// 从 proof.txt 文件中读取证明
function readProofFromFile() {
  try {
    // 加载证明数据
    const proofPath = path.join(__dirname, "proof.txt");
    let proofData = fs.readFileSync(proofPath, "utf8").trim();
    
    // 确保 proof 以 0x 开头
    if (!proofData.startsWith("0x")) {
      proofData = "0x" + proofData;
    }
    
    console.log(`Proof data loaded, length: ${proofData.length}`);
    return proofData;
  } catch (error) {
    console.error("Failed to read proof from file:", error.message);
    // 返回空证明，避免中断执行
    return "0x";
  }
}

module.exports = { readProofFromFile }; 