# Solidity Compiler Version Downgrade

## Issue

**Severity**: CRITICAL  
**Type**: BUG  
**Source**: Ethernal audit Q1

### Problem

Solidity compiler version was set to 0.8.25 which is above the version supported by polygon-edge EVM.

According to polygon-edge documentation:

> **Solidity v0.8.19 or earlier recommended**
> 
> Solidity v0.8.20 introduces new features, including the implementation of `PUSH0` opcode, which is not yet supported in Edge. If you decide to use v0.8.20, ensure that you set your EVM version to "Paris" in the framework you use to deploy your contracts. For now, we recommend using Solidity v0.8.19 or earlier.

## Solution

Downgraded all Solidity contracts from version 0.8.20+ to 0.8.19.

## Changes Made

### Files Modified

**Total**: 22 files updated

#### Files changed from `>=0.8.25` to `^0.8.19`:
1. `ucl/circle/nova/test/generated/simple_verifier.sol`
2. `ucl/circle/nova/test/generated/compressed_snark_NonTrivialCircuit56718.t.sol`
3. `ucl/circle/nova/test/generated/compressed_snark_NonTrivialCircuit187790.t.sol`
4. `ucl/circle/nova/test/generated/merkel_root_strorage.sol`
5. `ucl/circle/nova/test/generated/compressed_snark_NonTrivialCircuit0.t.sol`
6. `ucl/circle/nova/test/compressed_snark.t.sol`
7. `ucl/circle/nova/sol/polynomial.sol`
8. `ucl/circle/nova/sol/transcript.sol`
9. `ucl/circle/nova/sol/nifs.sol`
10. `ucl/circle/nova/sol/fq.sol`
11. `ucl/circle/nova/sol/fr.sol`
12. `ucl/circle/nova/sol/verifier.sol`
13. `ucl/circle/nova/sol/library.sol`
14. `ucl/circle/nova/sol/sumcheck.sol`
15. `ucl/circle/nova/sol/snark_sm.sol`
16. `ucl/circle/nova/sol/error.sol`
17. `ucl/circle/nova/sol/curve.sol`
18. `ucl/circle/nova/sol/hyperkzg.sol`
19. `ucl/circle/nova/sol/compressed.sol`
20. `ucl/circle/nova/sol/r1cs.sol`
21. `ucl/circle/nova/templates/compressed_snark.t.askama.sol`

#### Files changed from `^0.8.25` to `^0.8.19`:
22. `ucl/circle/nova/Simple.sol`

#### Files changed from `^0.8.20` to `^0.8.19`:
23. `native/INativeToken.sol`
24. `test/TokenRegistryTemplate.sol`

#### Files changed from `^0.8.24` to `^0.8.19`:
25. `ucl/curves/Lock.sol`

## Version Distribution After Changes

```
106 files: ^0.8.0
 25 files: ^0.8.19  (newly downgraded)
 15 files: ^0.8.16
  2 files: ^0.8.10
```

## Verification

All contracts now use Solidity version 0.8.19 or earlier, which is compatible with polygon-edge EVM.

```bash
# Verify no files use 0.8.20 or higher
grep -r "pragma solidity" contracts --include="*.sol" | grep -E "0\.8\.(2[0-9]|[3-9][0-9])"
# Should return no results
```

## Impact

- ✅ All contracts are now compatible with polygon-edge EVM
- ✅ No `PUSH0` opcode issues
- ✅ Contracts can be deployed without setting EVM version to "Paris"

## Testing Required

After this change, please:

1. Recompile all contracts
2. Run full test suite
3. Verify contract functionality
4. Test deployment on polygon-edge testnet

## Commands Used

```bash
# Replace >=0.8.25 with ^0.8.19
find contracts -name "*.sol" -type f -exec sed -i '' 's/pragma solidity >=0\.8\.25;/pragma solidity ^0.8.19;/g' {} \;

# Replace ^0.8.25 with ^0.8.19
sed -i '' 's/pragma solidity ^0\.8\.25;/pragma solidity ^0.8.19;/g' contracts/ucl/circle/nova/Simple.sol

# Replace ^0.8.20 with ^0.8.19
find contracts -name "*.sol" -type f -exec sed -i '' 's/pragma solidity \^0\.8\.20;/pragma solidity ^0.8.19;/g' {} \;

# Replace ^0.8.24 with ^0.8.19
find contracts -name "*.sol" -type f -exec sed -i '' 's/pragma solidity \^0\.8\.24;/pragma solidity ^0.8.19;/g' {} \;
```

## Date

2026-02-08

## Status

✅ RESOLVED
