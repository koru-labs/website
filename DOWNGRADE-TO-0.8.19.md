# 降级到 Solidity 0.8.19

## 执行的修改

### 1. 修改 hardhat.config.js

```javascript
// 从 0.8.20 降级到 0.8.19
solidity: {
    version: '0.8.19',  // ← 降级
    settings: {
        // 移除 evmVersion: 'paris'（0.8.19 不需要，因为没有 PUSH0）
        optimizer: {
            enabled: true,
            runs: 200,
        },
        viaIR: true,
    },
}
```

### 2. 修改 pragma 声明

修改了 3 个文件的 pragma 声明：

#### contracts/ucl/curves/Lock.sol
```solidity
// 从: pragma solidity ^0.8.20;
// 改为: pragma solidity ^0.8.0;
```

#### contracts/native/INativeToken.sol
```solidity
// 从: pragma solidity ^0.8.20;
// 改为: pragma solidity ^0.8.0;
```

#### contracts/test/TokenRegistryTemplate.sol
```solidity
// 从: pragma solidity ^0.8.20;
// 改为: pragma solidity ^0.8.0;
```

### 3. 移除 nova 目录

```bash
# nova 目录已移到项目根目录
mv contracts/ucl/circle/nova ./nova
```

## 编译状态

### 正在编译中...

```bash
npx hardhat compile --force
```

编译过程可能需要几分钟，因为合约很复杂（特别是 ZK 验证器合约）。

### 检查编译进度

```bash
# 查看编译进程
ps aux | grep solc

# 应该看到 solc 进程占用高 CPU（正常现象）
```

## 0.8.19 vs 0.8.20 的区别

### 0.8.20 引入的主要变化

1. **PUSH0 操作码** (EIP-3855)
   - 新增 PUSH0 (0x5f) 操作码
   - 更高效地将 0 推入堆栈
   - **polygon-edge 不支持**

2. **优化器改进**
   - 更好的堆栈管理
   - 减少"Stack too deep"错误

### 0.8.19 的特点

- ✅ 不生成 PUSH0 操作码
- ✅ 兼容 polygon-edge
- ⚠️ 优化器相对较弱
- ⚠️ 可能遇到"Stack too deep"错误

## 潜在问题

### 1. Stack Too Deep 错误

如果编译时遇到"Stack too deep"错误：

```
CompilerError: Stack too deep. Try compiling with `--via-ir`
```

**解决方案**:

#### 方案 A: 调整 optimizer runs
```javascript
optimizer: {
    enabled: true,
    runs: 1,  // 减少 runs 可以减少堆栈深度
}
```

#### 方案 B: 重构复杂函数
特别是 `PrivateTokenCore.privateSplitToken` 函数（18个堆栈变量）

#### 方案 C: 使用 viaIR
```javascript
viaIR: true,  // 已启用
```

### 2. 编译时间长

0.8.19 的编译可能比 0.8.20 慢，特别是使用 `viaIR: true` 时。

**正常现象**: 复杂合约编译可能需要 5-10 分钟

### 3. Gas 成本增加

0.8.19 生成的字节码可能比 0.8.20 更大，导致部署和执行 gas 成本增加。

## 验证步骤

### 1. 编译成功
```bash
npx hardhat compile
# 应该成功，没有错误
```

### 2. 检查字节码
```bash
# 确认没有 PUSH0 操作码
# PUSH0 的操作码是 0x5f
grep -r "5f" artifacts/contracts/ | wc -l
# 应该返回 0 或很少（如果有，可能是其他上下文）
```

### 3. 部署测试
```bash
# 部署到 ucl-node2 测试网
npx hardhat run scripts/deploy.js --network local_L2

# 如果部署成功，说明兼容
```

### 4. 功能测试
```bash
# 运行测试套件
npx hardhat test

# 确保所有测试通过
```

## 兼容性检查

### ✅ 0.8.19 支持的特性（项目中使用的）

| 特性 | 最低版本 | 0.8.19 支持 |
|------|---------|------------|
| Custom Errors | 0.8.4 | ✅ |
| Unchecked 块 | 0.8.0 | ✅ |
| User-Defined Value Types | 0.8.8 | ✅ |
| Global using for | 0.8.13 | ✅ |

### ❌ 0.8.19 不支持的特性（项目中未使用）

| 特性 | 版本 | 影响 |
|------|------|------|
| PUSH0 操作码 | 0.8.20+ | ✅ 无影响（未使用） |
| Transient Storage | 0.8.24+ | ✅ 无影响（未使用） |

## 回滚方案

如果 0.8.19 遇到问题，可以回滚到 0.8.20：

```javascript
// hardhat.config.js
solidity: {
    version: '0.8.20',
    settings: {
        evmVersion: 'paris',  // 重要：避免 PUSH0
        optimizer: {
            enabled: true,
            runs: 200,
        },
        viaIR: true,
    },
}
```

并恢复 pragma 声明：
```solidity
pragma solidity ^0.8.20;
```

## 监控编译

### 查看编译进度
```bash
# 查看 solc 进程
ps aux | grep solc

# 查看 CPU 使用率
top -pid $(pgrep solc)
```

### 编译日志
```bash
# 如果编译卡住，可以查看详细日志
npx hardhat compile --verbose
```

### 强制重新编译
```bash
# 清理缓存
npx hardhat clean

# 重新编译
npx hardhat compile --force
```

## 总结

已成功降级到 Solidity 0.8.19：

- ✅ 修改了 hardhat.config.js
- ✅ 修改了 3 个文件的 pragma 声明
- ✅ 移除了 nova 目录
- ⏳ 正在编译中...

**等待编译完成后**，需要验证：
1. 编译成功
2. 没有 PUSH0 操作码
3. 部署到 ucl-node2 测试
4. 运行测试套件

如果遇到"Stack too deep"错误，可以尝试调整 optimizer runs 或重构复杂函数。
