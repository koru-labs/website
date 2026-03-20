---
title: Burn Tokens
---

# Burn Tokens

Burning permanently destroys tokens, removing them from circulation.

## Two Ways to Burn

### 1. Direct Burn (Simple)

If you already own tokens, you can burn them directly:

```javascript
const { callPrivateBurn } = require('./script/helpers');

// Burn a single token
const receipt = await callPrivateBurn(
    tokenContractAddress,
    wallet,
    tokenId
);

// Or burn multiple
const receipt = await callPrivateBurns(
    tokenContractAddress,
    wallet,
    [tokenId1, tokenId2, tokenId3]
);
```

### 2. Burn via Split (Privacy-Enhanced)

For enhanced privacy, use the split mechanism:

```
gRPC: generateSplitToken() → Contract: privateBurns()
```

This approach:
- Creates a new token for burning
- Provides additional privacy
- Useful for automated burn operations

## Step 1: Split for Burn (gRPC)

```javascript
const { createAuthMetadata } = require('./script/helpers');

const splitRequest = {
    sc_address: tokenContractAddress,
    token_type: '0',
    from_address: ownerAddress,
    amount: 1,
    comment: 'for burn',
};

const metadata = await createAuthMetadata(ownerPrivateKey);
const grpcResponse = await client.generateSplitToken(splitRequest, metadata);

await client.waitForActionCompletion(
    client.getTokenActionStatus,
    grpcResponse.request_id,
    metadata
);
```

## Step 2: Execute Burn (Contract)

```javascript
const { callPrivateBurns } = require('./script/helpers');

const burnTokenId = ethers.toBigInt(grpcResponse.transfer_token_id);

const receipt = await callPrivateBurns(
    tokenContractAddress,
    ownerWallet,
    [burnTokenId]
);

console.log('Burn Transaction:', receipt.hash);
```

## Complete Example

```javascript
const { ethers } = require('hardhat');
const { createAuthMetadata, callPrivateBurns, sleep } = require('./script/helpers');

async function burnTokens() {
    const provider = new ethers.JsonRpcProvider(L1Url);
    const wallet = new ethers.Wallet(privateKey, provider);
    const tokenAddress = '0x...';

    // Step 1: Split for burn
    const splitRequest = {
        sc_address: tokenAddress,
        token_type: '0',
        from_address: wallet.address,
        amount: 1,
        comment: 'burn for test',
    };

    const metadata = await createAuthMetadata(privateKey);
    const splitResponse = await client.generateSplitToken(splitRequest, metadata);

    await client.waitForActionCompletion(
        client.getTokenActionStatus,
        splitResponse.request_id,
        metadata
    );

    await sleep(5000);

    // Step 2: Execute burn
    const burnTokenId = ethers.toBigInt(splitResponse.transfer_token_id);
    const receipt = await callPrivateBurns(tokenAddress, wallet, [burnTokenId]);

    console.log(`Burned token. Transaction: ${receipt.hash}`);
}

burnTokens();
```

## BurnFrom (Authorized Burn)

Allow a third party to burn your tokens:

```javascript
const { callPrivateBurnFroms } = require('./script/helpers');

// Spender burns tokens owned by owner
const receipt = await callPrivateBurnFroms(
    spenderWallet,
    tokenContractAddress,
    ownerAddress,
    [approvedTokenId1, approvedTokenId2]
);
```

## Comparison with ERC20

| Method | ERC20 | UCL |
|--------|-------|-----|
| Burn | `burn(amount)` | `callPrivateBurns(tokenIds)` |
| Authorized Burn | `burnFrom(from, amount)` | `callPrivateBurnFroms(wallet, from, tokenIds)` |

## Important Notes

1. **Irreversible**: Burned tokens cannot be recovered
2. **Token IDs**: Each token is a unique ID
3. **Verification**: You must own the tokens you're burning

## Next Steps

- [Batch Operations](/docs/how-tos/batch-operations) - Burn multiple tokens
- [Examples](/docs/examples/simple-transfer) - See complete examples
