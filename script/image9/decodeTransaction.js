const fs = require('fs');
const path = require('path');
const hre = require("hardhat");
const ethers = hre.ethers;

const artifactsPath = '/Users/hamsa/dev/ucl-contract/artifacts/contracts/ucl/image9/base/TokenScBase.sol/TokenScBase.json';


const txHash = "0xec303193ee20e0fa7e515a3bd8af7c2ffa3a4ba9c031274ece0e127e9aad61ff";

async function main() {
  try {
    const provider = ethers.provider;
    
    console.log(`获取交易 ${txHash} 的详情...`);
    const tx = await provider.getTransaction(txHash);
    
    if (!tx) {
      console.error('未找到交易');
      process.exit(1);
    }
    
    if (!tx.to) {
      console.log('这是一个合约创建交易，没有调用方法');
      process.exit(0);
    }
    
    // 读取TokenScBase的ABI
    try {
      const abiContent = fs.readFileSync(artifactsPath, 'utf8');
      const abiJson = JSON.parse(abiContent);
      
      // 根据ethers版本兼容处理
      let contractInterface;
      if (ethers.Interface) {
        contractInterface = new ethers.Interface(abiJson.abi);
      } else if (ethers.utils && ethers.utils.Interface) {
        contractInterface = new ethers.utils.Interface(abiJson.abi);
      } else {
        throw new Error("无法找到适配的ethers Interface类");
      }
      
      try {
        const decoded = contractInterface.parseTransaction({ data: tx.data });
        
        if (decoded) {
          if (['transferToken', 'mintToken', 'burnToken'].includes(decoded.name)) {
            console.log('\n解码结果:');
            console.log('合约地址:', tx.to);
            console.log('调用方法:', decoded.name);
            console.log('函数签名:', decoded.signature);
            console.log('参数:');
            
            switch(decoded.name) {
              case 'transferToken':
                console.log('  tokenId:', decoded.args.tokenId.toString());
                console.log('  toManager:', decoded.args.toManager);
                console.log('  to:', decoded.args.to);
                break;
              
              case 'mintToken':
                const token = decoded.args.token;
                console.log('  token:');
                console.log('    id:', token.id.toString());
                console.log('    tokenType:', token.tokenType.toString());
                console.log('    owner:', token.owner);
                console.log('    manager:', token.manager);
                console.log('    cl_x:', token.cl_x.toString());
                console.log('    cl_y:', token.cl_y.toString());
                console.log('    cr_x:', token.cr_x.toString());
                console.log('    cr_y:', token.cr_y.toString());
                console.log('    status:', token.status);
                console.log('    parentId:', token.parentId?.toString() || '0');
                console.log('  proof 长度:', (typeof ethers.utils?.hexDataLength === 'function' 
                  ? ethers.utils.hexDataLength(decoded.args.proof) 
                  : decoded.args.proof.slice(2).length / 2), '字节');
                break;
              
              case 'burnToken':
                console.log('  tokenId:', decoded.args.tokenId.toString());
                break;
              
              default:
                const args = decoded.args;
                for (const [name, value] of Object.entries(args)) {
                  if (!isNaN(parseInt(name))) continue; // 跳过数字索引
                  formatAndPrintArg(name, value);
                }
            }
          } else {
            console.log(`解码到的方法 ${decoded.name} 不在函数列表内`);
            console.log('函数签名:', decoded.signature);
          }
        } else {
          console.error('无法解析交易数据');
        }
      } catch (e) {
        console.error('解析交易数据时出错:', e.message);
        console.log('原始交易数据:', tx.data);
      }
    } catch (e) {
      console.error(`读取ABI文件失败:`, e.message);
    }
  } catch (error) {
    console.error('解码过程中发生错误:', error);
  }
}

// 格式化和打印参数
function formatAndPrintArg(nameOrIndex, value) {
  let formattedValue = '';
  
  if (typeof value === 'object' && value !== null) {
    // 兼容不同版本的BigNumber检测
    const isBigNumber = (val) => {
      return (
        ethers.BigNumber?.isBigNumber?.(val) || // ethers v4/v5
        (val._isBigNumber === true) || // ethers v5
        (val.constructor?.name === 'BigNumber') // 其他情况
      );
    };
    
    if (isBigNumber(value)) {
      formattedValue = value.toString();
    } else if (Array.isArray(value)) {
      formattedValue = JSON.stringify(value.map(v => 
        isBigNumber(v) ? v.toString() : v
      ), null, 2);
    } else {
      // 处理复杂对象，转换里面的BigNumber
      const processedObj = {};
      for (const [k, v] of Object.entries(value)) {
        if (isBigNumber(v)) {
          processedObj[k] = v.toString();
        } else if (typeof v === 'object' && v !== null) {
          processedObj[k] = JSON.stringify(v);
        } else {
          processedObj[k] = v;
        }
      }
      formattedValue = JSON.stringify(processedObj, null, 2);
    }
  } else {
    formattedValue = value;
  }
  
  console.log(`  ${nameOrIndex}: ${formattedValue}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 