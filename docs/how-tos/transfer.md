---
title: Transfer Tokens
---

# Transfer Tokens

Transferring tokens in UCL requires a two-step process due to the UTXO model.

## Why Two Steps?

Unlike ERC20 where you call `transfer(amount)`, UCL requires:

1. **Split**: Split your tokens into transfer tokens
2. **Transfer**: Execute the actual transfer

This design enables:
- Privacy through zero-knowledge proofs
- Fine-grained control over each token
- Complete transaction privacy

## Two-Step Process

```
gRPC: generateSplitToken() → Contract: privateTransfers()
```

## Step 1: Split Tokens (gRPC)

```javascript
const { createAuthMetadata, sleep } = require('./script/helpers');

const splitRequest = {
    sc_address: tokenContractAddress,
    token_type: '0',
    from_address: senderAddress,
    to_address: receiverAddress,
    amount: 1,  // Number of tokens to transfer
};

const metadata = await createAuthMetadata(senderPrivateKey);
const grpcResponse = await client.generateSplitToken(splitRequest, metadata);

console.log('Split Response:', grpcResponse);
// Returns: { request_id, transfer_token_id }

// Wait for processing
await client.waitForActionCompletion(
    client.getTokenActionStatus,
    grpcResponse.request_id,
    metadata
);

// Wait for chain confirmation
await sleep(5000);
```

## Step 2: Execute Transfer (Contract)

```javascript
const { callPrivateTransfers } = require('./script/helpers');

const transferTokenId = ethers.toBigInt(grpcResponse.transfer_token_id);

const receipt = await callPrivateTransfers(
    senderWallet,
    tokenContractAddress,
    [transferTokenId]
);

console.log('Transfer Transaction:', receipt.hash);
```

## Complete Example

```javascript
const { ethers } = require('hardhat');
const { createAuthMetadata, callPrivateTransfers, sleep } = require('./script/helpers');

async function transferTokens() {
    // Setup
    const provider = new ethers.JsonRpcProvider(L1Url);
    const wallet = new ethers.Wallet(senderPrivateKey, provider);
    const tokenAddress = '0x...';

    // Step 1: Split tokens
    const splitRequest = {
        sc_address: tokenAddress,
        token_type: '0',
        from_address: wallet.address,
        to_address: receiverAddress,
        amount: 5,  // Transfer 5 tokens
    };

    const metadata = await createAuthMetadata(senderPrivateKey);
    const splitResponse = await client.generateSplitToken(splitRequest, metadata);

    // Wait for processing
    await client.waitForActionCompletion(
        client.getTokenActionStatus,
        splitResponse.request_id,
        metadata
    );

    await sleep(5000);

    // Step 2: Execute transfer
    const tokenId = ethers.toBigInt(splitResponse.transfer_token_id);
    const receipt = await callPrivateTransfers(wallet, tokenAddress, [tokenId]);

    console.log(`Transferred 5 tokens. Transaction: ${receipt.hash}`);
}

transferTokens();
```

## Important Notes

### Token IDs

Each token has a unique ID. When you transfer `N` tokens, you get `N` token IDs starting from `transfer_token_id`.

### Waiting Times

- **After Split**: Always wait for `waitForActionCompletion`
- **Before Transfer**: Add a delay (`sleep(5000)`) for chain confirmation

### Error Handling

```javascript
try {
    const splitResponse = await client.generateSplitToken(request, metadata);
    await client.waitForActionCompletion(
        client.getTokenActionStatus,
        splitResponse.request_id,
        metadata
    );
    await sleep(5000);

    const tokenId = ethers.toBigInt(splitResponse.transfer_token_id);
    const receipt = await callPrivateTransfers(wallet, tokenAddress, [tokenId]);
} catch (error) {
    console.error('Transfer failed:', error.message);
}
```

## Comparison with ERC20

| ERC20 | UCL |
|-------|-----|
| `token.transfer(to, amount)` | `generateSplitToken()` + `callPrivateTransfers()` |
| Immediate | Requires waiting |
| One transaction | Two steps |

## Next Steps

- [Batch Operations](/docs/how-tos/batch-operations) - Transfer multiple tokens
- [Approve Tokens](/docs/how-tos/approve) - Authorize third parties
