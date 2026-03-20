---
title: Contract Methods
---

# Contract Methods Reference

These are the smart contract methods you call after generating proofs via gRPC.

## Contract: PrivateERCToken

### privateMint

Mints new tokens.

```solidity
function privateMint(
    address to,
    Token memory newToken,
    Token memory mintAllowed,
    Amount memory supplyAmount,
    uint256[] memory proof,
    uint256[] memory input
) external;
```

**Parameters:**
- `to` - Recipient address
- `newToken` - New token data from gRPC
- `mintAllowed` - Mint authorization from gRPC
- `supplyAmount` - Supply tracking from gRPC
- `proof` - ZK proof from gRPC
- `input` - Public inputs from gRPC

---

### privateTransfer / privateTransfers

Transfers tokens to another address.

```solidity
// Single transfer
function privateTransfer(uint256 tokenId) external;

// Batch transfer
function privateTransfers(uint256[] memory tokenIds) external;
```

**Parameters:**
- `tokenIds` - Array of token IDs to transfer

---

### privateBurn / privateBurns

Burns (destroys) tokens.

```solidity
// Single burn
function privateBurn(uint256 tokenId) external;

// Batch burn
function privateBurns(uint256[] memory tokenIds) external;
```

**Parameters:**
- `tokenIds` - Array of token IDs to burn

---

### privateTransferFroms

Transfers tokens using an approved allowance.

```solidity
function privateTransferFroms(
    uint256[] memory tokenIds,
    address from,
    address to
) external;
```

**Parameters:**
- `tokenIds` - Approved token IDs to transfer
- `from` - Token owner address
- `to` - Recipient address

---

### privateBurnFroms

Burns tokens using an approved allowance.

```solidity
function privateBurnFroms(
    address from,
    uint256[] memory tokenIds
) external;
```

**Parameters:**
- `from` - Token owner address
- `tokenIds` - Approved token IDs to burn

---

### privateCancelToken

Cancels a pending token operation.

```solidity
function privateCancelToken(uint256 tokenId) external;
```

**Parameters:**
- `tokenId` - Token ID to cancel

---

### privateRevokeApproval

Revokes an existing approval.

```solidity
function privateRevokeApproval(
    address spender,
    uint256 tokenId
) external;
```

**Parameters:**
- `spender` - The spender address
- `tokenId` - Token ID to revoke

---

### privateTotalSupply

Returns the total supply of private tokens.

```solidity
function privateTotalSupply() external view returns (uint256);
```

---

## Helper Function Wrappers

These are provided by the UCL SDK for easier integration:

```javascript
const {
    callPrivateMint,
    callPrivateTransfer,
    callPrivateTransfers,
    callPrivateBurn,
    callPrivateBurns,
    callPrivateBurnFroms,
    callPrivateTransferFroms,
    callPrivateApprove,
    callPrivateCancel,
    callPrivateRevoke,
} = require('./script/helpers');
```

## Usage Example

```javascript
const { callPrivateTransfers } = require('./script/helpers');

// After getting token IDs from gRPC
const tokenIds = [BigInt('0x100'), BigInt('0x101')];

const receipt = await callPrivateTransfers(
    wallet,
    tokenContractAddress,
    tokenIds
);

console.log('Transaction:', receipt.hash);
```

## Return Values

All contract methods return a transaction receipt:

```javascript
{
    hash: '0x...',           // Transaction hash
    blockNumber: 12345,      // Block number
    gasUsed: '21000',       // Gas used
    status: 1,              // 1 = success, 0 = failure
    logs: [...],            // Event logs
}
```

## Events

The contract emits these events:

| Event | Parameters |
|-------|------------|
| `Transfer` | `from`, `to`, `tokenId` |
| `Mint` | `to`, `tokenId`, `amount` |
| `Burn` | `from`, `tokenId` |
| `Approval` | `owner`, `spender`, `tokenId` |

## Next Steps

- [Helper Functions](/docs/api/helpers) - SDK utility functions
- [Examples](/docs/examples/simple-transfer) - Complete working examples
