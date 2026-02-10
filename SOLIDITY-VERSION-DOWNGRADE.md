# Solidity 版本降级文档

## 背景

根据 Ethernal 审计报告 Q1，Solidity 编译器版本设置为 0.8.25，高于 polygon-edge EVM 支持的版本。

从 Solidity v0.8.20 开始引入了 `PUSH0` 操作码，但 **ucl-node2 (polygon-edge) EVM 不支持此操作码**（已验证：ucl-node2 的 opcodes.go 中没有 PUSH0 定义）。

## 尝试的解决方案

### 方案 1: 降级到 Solidity 0.8.19 ❌
- **结果**: 编译失败
- **原因**: 堆栈太深错误 (`YulException: Variable expr_8956_mpos is 1 too deep in the stack`)
- **问题文件**: `PrivateTokenCore.sol` 的 `privateSplitToken` 函数
- **说明**: 0.8.19 的优化器无法处理复杂函数

### 方案 2: 使用 Solidity 0.8.20 + evmVersion "paris" ❌
- **配置**: 
  ```javascript
  version: '0.8.20',
  evmVersion: 'paris',  // 避免使用 PUSH0
  viaIR: true,
  optimizer: { enabled: true, runs: 200 }
  ```
- **结果**: 编译失败
- **原因**: 同样的堆栈太深错误
- **说明**: 即使使用 paris EVM 版本，0.8.20 的优化器仍然无法处理 `privateSplitToken` 函数的复杂度

### 方案 3: 禁用 viaIR ❌
- **配置**: `viaIR: false`
- **结果**: 更严重的堆栈太深错误
- **说明**: 传统优化器比 IR 编译器更差

## 根本原因分析

`PrivateTokenCore.sol` 的 `privateSplitToken` 函数过于复杂：
- 18 个堆栈变量
- 多个内存操作
- 复杂的结构体和数组操作
- EVM 堆栈限制为 16 个槽位

**Solidity 0.8.25 的优化器比 0.8.20 更强大**，能够更好地处理堆栈深度问题，这就是为什么原始代码在 0.8.25 下能编译通过。

## 可行的解决方案

### 选项 A: 重构合约代码（推荐）✅
**优点**:
- 彻底解决堆栈深度问题
- 可以使用 0.8.20 + paris
- 兼容 ucl-node2 (polygon-edge)
- 代码更清晰、更易维护

**需要做的**:
1. 将 `privateSplitToken` 函数拆分成多个小函数
2. 使用 struct 组合相关变量
3. 减少局部变量数量

**示例重构**:
```solidity
// 将验证逻辑提取到单独的函数
function _validateSplitToken(...) internal returns (bool) {
    // 验证逻辑
}

// 将代币处理逻辑提取到单独的函数  
function _processSplitTokens(...) internal {
    // 代币处理逻辑
}

// 主函数变得更简洁
function privateSplitToken(...) external {
    _validateSplitToken(...);
    _processSplitTokens(...);
}
```

### 选项 B: 为 ucl-node2 添加 PUSH0 支持 ⚠️
**优点**:
- 可以使用 Solidity 0.8.25
- 不需要修改合约代码

**缺点**:
- 需要修改 ucl-node2 (polygon-edge) 源码
- 需要测试和验证
- 可能影响现有部署

**参考**: ucl-zk-server 已经支持 PUSH0（见 `pkg/state/runtime/fakevm/eips.go`）

### 选项 C: 保持使用 0.8.25 并接受风险 ❌
**不推荐**: 部署的合约将无法在 ucl-node2 上正常运行

## 当前状态

- ✅ 所有合约文件版本号已更新到 0.8.20
- ✅ 文件级别事件声明已移到 contract/library 内部（0.8.20 不支持文件级事件）
- ✅ hardhat.config.js 配置为 0.8.20 + paris
- ❌ **编译失败**: `PrivateTokenCore.sol` 堆栈太深错误

## 建议

**立即行动**: 重构 `PrivateTokenCore.privateSplitToken` 函数以减少堆栈深度

**长期考虑**: 为 ucl-node2 添加 PUSH0 支持，以便将来可以使用更新的 Solidity 版本




根据 Solidity 官方文档，文件级别的事件声明是从 Solidity 0.8.22 开始支持的。

关键信息：
Solidity 0.8.22 (2023年10月发布) 引入了文件级别事件定义功能
Solidity 0.8.20 不支持文件级别事件
因此，之前将事件从文件级别移到 contract/library 内部的修改必须保留
版本支持情况：
❌ Solidity 0.8.19: 不支持文件级别事件
❌ Solidity 0.8.20: 不支持文件级别事件
❌ Solidity 0.8.21: 不支持文件级别事件
✅ Solidity 0.8.22+: 支持文件级别事件
结论：
使用 Solidity 0.8.20 + evmVersion "paris" 方案时：

✅ 保留所有之前的语法修改（事件移到 contract 内部）
✅ 保留 hardhat.config.js 的配置（version: 0.8.20, evmVersion: 'paris'）
✅ 不需要还原任何代码
这些修改是必要的，因为 0.8.20 确实不支持文件级别的事件声