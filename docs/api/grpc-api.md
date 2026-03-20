---
title: gRPC API
---

# gRPC API Reference

The gRPC API handles privacy computations and zero-knowledge proof generation.

## Base URL

```
your-grpc-endpoint:50051
```

## Authentication

Most requests require authentication metadata:

```javascript
const { createAuthMetadata } = require('./script/helpers');

const metadata = await createAuthMetadata(privateKey);
```

## Methods

### generateMintProof

Generates a zero-knowledge proof for minting new tokens.

**Request:**

```javascript
{
    sc_address: string,      // Token contract address
    token_type: string,      // Token type ('0' for standard)
    from_address: string,   // Minter address
    to_address: string,     // Receiver address
    amount: number,         // Amount to mint
}
```

**Response:**

```javascript
{
    proof: string[],         // ZK proof
    input: string[],        // Public inputs
    token: {                // New token data
        token_id: string,
        cl_x: string,
        cl_y: string,
        cr_x: string,
        cr_y: string,
    },
    mint_allowed: {         // Mint authorization
        token_id: string,
        cl_x: string,
        cl_y: string,
        cr_x: string,
        cr_y: string,
    },
    supply_amount: {        // Supply tracking
        token_id: string,
        cl_x: string,
        cl_y: string,
        cr_x: string,
        cr_y: string,
    },
}
```

---

### generateSplitToken

Generates a proof for splitting/transferring tokens.

**Request:**

```javascript
{
    sc_address: string,      // Token contract address
    token_type: string,     // Token type
    from_address: string,   // Sender address
    to_address: string,    // Receiver address
    amount: number,        // Amount to transfer
    comment?: string,      // Optional comment
}
```

**Response:**

```javascript
{
    request_id: string,     // For status checking
    transfer_token_id: string, // First token ID of transferred tokens
}
```

---

### generateApproveProof

Generates a proof for approving tokens to a spender.

**Request:**

```javascript
{
    sc_address: string,       // Token contract address
    token_type: string,       // Token type
    from_address: string,    // Owner address
    spender_address: string, // Spender address
    to_address: string,      // Spender address (tokens go to spender)
    amount: number,          // Amount to approve
    comment?: string,        // Optional comment
}
```

**Response:**

```javascript
{
    request_id: string,       // For status checking
    transfer_token_id: string, // Approved token ID
}
```

---

### getTokenActionStatus

Query the status of a pending action.

**Request:**

```javascript
{
    request_id: string,    // From generateSplitToken/generateApproveProof
}
```

**Response:**

```javascript
{
    status: string,       // 'pending', 'completed', 'failed'
    message?: string,     // Status message
}
```

---

### waitForActionCompletion

Helper function to wait for an action to complete.

```javascript
await client.waitForActionCompletion(
    client.getTokenActionStatus,
    requestId,
    metadata
);
```

## Usage Example

```javascript
const { createClient } = require('./test/qa/token_grpc');
const { createAuthMetadata } = require('./script/helpers');

const client = createClient('your-grpc-url:50051');
const metadata = await createAuthMetadata(privateKey);

// Generate split token proof
const splitRequest = {
    sc_address: tokenAddress,
    token_type: '0',
    from_address: sender,
    to_address: receiver,
    amount: 1,
};

const response = await client.generateSplitToken(splitRequest, metadata);

// Wait for completion
await client.waitForActionCompletion(
    client.getTokenActionStatus,
    response.request_id,
    metadata
);

console.log('Transfer token ID:', response.transfer_token_id);
```

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_ADDRESS` | Invalid address format |
| `INSUFFICIENT_BALANCE` | Not enough tokens |
| `INVALID_AMOUNT` | Invalid amount |
| `UNAUTHORIZED` | Not authorized to perform action |
| `PROOF_FAILED` | ZK proof generation failed |
| `NETWORK_ERROR` | Network connection issue |

## Next Steps

- [Contract Methods](/docs/api/contract-methods) - On-chain contract API
- [Helper Functions](/docs/api/helpers) - SDK helper functions
