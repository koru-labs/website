# Solidity 版本降级文档

## 背景

根据 Ethernal 审计报告 Q1，Solidity 编译器版本设置为 0.8.25，高于 polygon-edge EVM 支持的版本。

从 Solidity v0.8.20 开始引入了 `PUSH0` 操作码，但 polygon-edge EVM 尚不支持此操作码。

## 修改内容

### 1. 版本号修改

将所有合约文件的 Solidity 版本从 `>=0.8.25` 或 `^0.8.20/0.8.24/0.8.25` 降级到 `^0.8.19`。

修改的文件包括：
- 所有 `contracts/` 目录下的 `.sol` 文件（共 26 个文件）
- `hardhat.config.js` 中的编译器版本配置

### 2. 语法兼容性修改

由于 Solidity 0.8.25 支持文件级别的事件声明，但 0.8.19 不支持，需要将文件级别的事件声明移到 contract/library 内部：

- `contracts/ucl/circle/nova/sol/library.sol`: 将 `event DebugUint(uint);` 移到 `testLibrary` 合约内部
- `contracts/ucl/circle/nova/sol/hyperkzg.sol`: 在 `HyperKZGVerifierTestLib` 库中添加 `event DebugUint(uint);`
- `contracts/ucl/circle/nova/test/compressed_snark.t.sol`: 在 `TestCompressedSNARK` 合约中添加 `event DebugUint(uint);`
- `contracts/ucl/circle/nova/test/generated/*.t.sol`: 在所有生成的测试合约中添加 `event DebugUint(uint);`
- `contracts/ucl/circle/nova/templates/compressed_snark.t.askama.sol`: 更新模板文件

### 3. 编译器配置优化

为了解决可能的"堆栈太深"问题，在 `hardhat.config.js` 中：
- 将 `optimizer.runs` 从 200 增加到 800
- 保持 `viaIR: true` 启用

## 已知问题

### 堆栈太深（Stack Too Deep）错误

**问题描述**：
编译时出现 `YulException: Variable expr_8956_mpos is 1 too deep in the stack` 错误。

**原因**：
Solidity 0.8.19 的编译器优化策略与 0.8.25 不同，某些复杂的合约函数可能会超出 EVM 的堆栈深度限制（16个变量）。

**可能的解决方案**：
1. 重构出问题的合约函数，减少局部变量数量
2. 将复杂函数拆分成多个小函数
3. 使用 struct 来组合多个相关变量
4. 调整编译器优化参数

**当前状态**：
需要定位具体是哪个合约文件导致的问题，然后进行针对性重构。

## 建议

如果堆栈太深的问题无法通过配置解决，建议：
1. 使用 Solidity 0.8.20，并在 hardhat.config.js 中设置 `evmVersion: "paris"` 来避免使用 PUSH0 操作码
2. 这样可以保持较新的编译器特性，同时兼容 polygon-edge EVM

配置示例：
```javascript
solidity: {
    version: '0.8.20',
    settings: {
        evmVersion: 'paris',  // 避免使用 PUSH0 操作码
        optimizer: {
            enabled: true,
            runs: 200,
        },
        viaIR: true,
    },
}
```

## 总结

已完成的修改：
1. ✅ 所有合约文件版本号已更新到 0.8.19
2. ✅ 文件级别事件声明已移到 contract/library 内部
3. ✅ 编译器优化参数已调整

待解决的问题：
1. ⚠️ 堆栈太深错误需要进一步调查和修复
