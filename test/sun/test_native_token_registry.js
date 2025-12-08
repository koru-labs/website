/**
 * 快速测试 0x2041 TokenRegistry
 * 
 * 运行: npx hardhat run hamsa/contracts/test_native_token_registry.js --network localhost
 */

const { ethers } = require("hardhat");

const REGISTRY = "0x0000000000000000000000000000000000002041";

async function main() {
    console.log("🚀 快速测试 TokenRegistry (0x2041)\n");

    const [signer] = await ethers.getSigners();
    
    // 连接合约
    const registry = new ethers.Contract(
        REGISTRY,
        [
            "function createNativeToken(string,string,uint8) returns (address)",
            "function enableOrDisableNativeToken(address,bool)",
            "function getAllTokenAddresses() view returns (address[])",
            "function getTokenCount() view returns (uint256)",
            "function getTokenMetadata(address) view returns (tuple(address,string,string,uint8,bool))",
            "function isTokenRegistered(address) view returns (bool)",
            "event NativeTokenRegistered(address indexed sender, address indexed tokenAddress)",
            "event NativeTokenStatusChanged(address indexed tokenAddress, bool disabled)"
        ],
        signer
    );

    // 1. 注册代币
    console.log("1️⃣  注册代币...");
    const tx = await registry.createNativeToken("Test Token", "TEST", 6);
    const receipt = await tx.wait();
    
    // 解析 NativeTokenRegistered 事件
    const event = receipt.logs
        .map(log => { try { return registry.interface.parseLog(log); } catch { return null; } })
        .find(e => e && e.name === "NativeTokenRegistered");
    
    let tokenAddress;
    if (event) {
        tokenAddress = event.args.tokenAddress;
        console.log("✅ 注册成功", `发送者: ${event.args.sender}`, `代币地址: ${tokenAddress}\n`);
    } else {
        console.log("✅ 注册成功（未找到事件）\n");
    }

    // 2. 查询总数
    console.log("2️⃣  查询代币总数...");
    const count = await registry.getTokenCount();
    console.log(`✅ 总数: ${count}\n`);

    // 3. 获取所有地址
    console.log("3️⃣  获取所有代币...");
    const tokens = await registry.getAllTokenAddresses();
    console.log(`✅ 找到 ${tokens.length} 个代币:`);
    tokens.forEach((addr, i) => console.log(`   ${i + 1}. ${addr}`));
    console.log();

    // 4. 查询详情
    if (tokens.length > 0) {
        console.log("4️⃣  查询第一个代币详情...");
        const meta = await registry.getTokenMetadata(tokens[0]);
        console.log(`✅ 名称: ${meta[1]}`, `符号: ${meta[2]}`, `精度: ${meta[3]}`, `禁用: ${meta[4]}\n`);

        // 5. 检查是否注册
        console.log("5️⃣  检查代币状态...");
        const isReg = await registry.isTokenRegistered(tokens[0]);
        console.log(`✅ 已注册: ${isReg}\n`);

        // 6. 禁用代币
        console.log("6️⃣  禁用代币...");
        const disableTx = await registry.enableOrDisableNativeToken(tokens[0], true);
        const disableReceipt = await disableTx.wait();
        
        const statusEvent = disableReceipt.logs
            .map(log => { try { return registry.interface.parseLog(log); } catch { return null; } })
            .find(e => e && e.name === "NativeTokenStatusChanged");
        
        if (statusEvent) {
            console.log(`✅ 禁用成功`, `代币: ${statusEvent.args.tokenAddress}`, `禁用: ${statusEvent.args.disabled}\n`);
        }

        // 7. 再次查询详情验证
        console.log("7️⃣  验证禁用状态...");
        const metaAfter = await registry.getTokenMetadata(tokens[0]);
        console.log(`✅ 名称: ${metaAfter[1]}`, `禁用: ${metaAfter[4]}\n`);

        // 8. 重新启用代币
        console.log("8️⃣  重新启用代币...");
        const enableTx = await registry.enableOrDisableNativeToken(tokens[0], false);
        await enableTx.wait();
        const metaEnabled = await registry.getTokenMetadata(tokens[0]);
        console.log(`✅ 启用成功`, `禁用: ${metaEnabled[4]}\n`);
    }

    console.log("🎉 测试完成！");
}

main().catch(console.error);
