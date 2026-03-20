---
title: Helper Functions
---

# Helper Functions

The UCL SDK provides helper functions to simplify common operations.

## Import

```javascript
const helpers = require('./script/helpers');

// Or destructured
const {
    callPrivateMint,
    callPrivateTransfers,
    sleep,
} = require('./script/helpers');
```

## Token Operations

### callPrivateMint

Mints new tokens.

```javascript
const receipt = await callPrivateMint(
    tokenContractAddress,  // string
    grpcResponse,         // gRPC response object
    wallet                // ethers.Wallet
);
```

---

### callPrivateTransfer

Transfers a single token.

```javascript
const receipt = await callPrivateTransfer(
    wallet,
    tokenContractAddress,
    tokenId  // bigint
);
```

---

### callPrivateTransfers

Transfers multiple tokens.

```javascript
const receipt = await callPrivateTransfers(
    wallet,
    tokenContractAddress,
    [tokenId1, tokenId2, ...]  // bigint[]
);
```

---

### callPrivateBurn

Burns a single token.

```javascript
const receipt = await callPrivateBurn(
    tokenContractAddress,
    wallet,
    tokenId  // bigint
);
```

---

### callPrivateBurns

Burns multiple tokens.

```javascript
const receipt = await callPrivateBurns(
    tokenContractAddress,
    wallet,
    [tokenId1, tokenId2, ...]  // bigint[]
);
```

---

### callPrivateTransferFroms

Transfers authorized tokens.

```javascript
const receipt = await callPrivateTransferFroms(
    spenderWallet,      // The spender's wallet
    tokenContractAddress,
    ownerAddress,       // Token owner
    receiverAddress,   // Recipient
    [tokenId1, ...]    // Authorized token IDs
);
```

---

### callPrivateBurnFroms

Burns authorized tokens.

```javascript
const receipt = await callPrivateBurnFroms(
    spenderWallet,
    tokenContractAddress,
    ownerAddress,
    [tokenId1, ...]
);
```

---

### callPrivateApprove

Approves tokens for a spender.

```javascript
const receipt = await callPrivateApprove(
    tokenContractAddress,
    grpcResponse,
    ownerWallet
);
```

---

### callPrivateCancel

Cancels a pending token.

```javascript
const receipt = await callPrivateCancel(
    tokenContractAddress,
    wallet,
    tokenId
);
```

---

### callPrivateRevoke

Revokes an approval.

```javascript
const receipt = await callPrivateRevoke(
    tokenContractAddress,
    wallet,
    spenderAddress,
    tokenId
);
```

---

## Utility Functions

### createAuthMetadata

Creates authentication metadata for gRPC calls.

```javascript
const metadata = await createAuthMetadata(privateKey);
```

**Parameters:**
- `privateKey` - The account's private key

**Returns:**
- Metadata object for gRPC calls

---

### getApproveTokenList

Queries approved tokens for a spender.

```javascript
const approvedTokens = await getApproveTokenList(
    client,
    ownerAddress,
    tokenContractAddress,
    spenderAddress,
    metadata
);
```

**Parameters:**
- `client` - gRPC client
- `ownerAddress` - Token owner
- `tokenContractAddress` - Token contract
- `spenderAddress` - Authorized spender
- `metadata` - Auth metadata

**Returns:**
- Array of approved token IDs

---

### sleep

Pauses execution for a specified duration.

```javascript
await sleep(milliseconds);
```

**Example:**

```javascript
// Wait 2 seconds
await sleep(2000);

// Wait 5 seconds
await sleep(5000);
```

---

### getPrivateBalance

Gets the private token balance of an address.

```javascript
const balance = await getPrivateBalance(
    client,
    address,
    tokenContractAddress,
    metadata
);
```

---

### getAddressBalance

Gets the ETH/native token balance.

```javascript
const balance = await getAddressBalance(address, provider);
```

---

## Complete Import

```javascript
const {
    // Token operations
    callPrivateMint,
    callPrivateTransfer,
    callPrivateTransfers,
    callPrivateBurn,
    callPrivateBurns,
    callPrivateBurnFroms,
    callPrivateTransferFrom,
    callPrivateTransferFroms,
    callPrivateApprove,
    callPrivateCancel,
    callPrivateRevoke,

    // Utilities
    createAuthMetadata,
    getApproveTokenList,
    getPrivateBalance,
    getAddressBalance,
    sleep,
} = require('./script/helpers');
```

## Error Handling

All functions can throw errors. Use try-catch:

```javascript
try {
    const receipt = await callPrivateTransfers(wallet, tokenAddress, tokenIds);
    console.log('Success:', receipt.hash);
} catch (error) {
    console.error('Failed:', error.message);
}
```

## Next Steps

- [Examples](/docs/examples/simple-transfer) - Working code examples
- [Contract Methods](/docs/api/contract-methods) - Low-level contract API
