---
title: Batch Operations
---

# Batch Operations

UCL supports batch operations for efficiency - transferring, burning, or approving multiple tokens in a single transaction.

## Batch Transfer

Transfer multiple tokens at once:

```javascript
const { callPrivateTransfers } = require('./script/helpers');

// Transfer multiple token IDs
const tokenIds = [
    BigInt('0x123'),
    BigInt('0x124'),
    BigInt('0x125'),
];

const receipt = await callPrivateTransfers(
    wallet,
    tokenContractAddress,
    tokenIds
);

console.log(`Transferred ${tokenIds.length} tokens. Transaction: ${receipt.hash}`);
```

## Batch Burn

Burn multiple tokens at once:

```javascript
const { callPrivateBurns } = require('./script/helpers');

const tokenIds = [
    BigInt('0x123'),
    BigInt('0x124'),
    BigInt('0x125'),
];

const receipt = await callPrivateBurns(
    tokenContractAddress,
    wallet,
    tokenIds
);

console.log(`Burned ${tokenIds.length} tokens. Transaction: ${receipt.hash}`);
```

## Batch TransferFrom

Transfer multiple authorized tokens:

```javascript
const { callPrivateTransferFroms } = require('./script/helpers');

const approvedTokenIds = [
    BigInt('0x200'),
    BigInt('0x201'),
    BigInt('0x202'),
];

const receipt = await callPrivateTransferFroms(
    spenderWallet,
    tokenContractAddress,
    ownerAddress,
    receiverAddress,
    approvedTokenIds
);

console.log(`Transferred ${approvedTokenIds.length} approved tokens.`);
```

## Batch BurnFrom

Burn multiple authorized tokens:

```javascript
const { callPrivateBurnFroms } = require('./script/helpers');

const approvedTokenIds = [
    BigInt('0x200'),
    BigInt('0x201'),
];

const receipt = await callPrivateBurnFroms(
    spenderWallet,
    tokenContractAddress,
    ownerAddress,
    approvedTokenIds
);

console.log(`Burned ${approvedTokenIds.length} approved tokens.`);
```

## Efficiency Tips

### Gas Optimization

Batch operations save gas:

| Operation | Single | Batch (10) | Savings |
|-----------|--------|------------|---------|
| Transfer | 21,000 gas | 21,000 + 5,000/gas | ~30% |
| Burn | 21,000 gas | 21,000 + 5,000/gas | ~30% |

### When to Use Batch

- **Payroll**: Pay multiple employees at once
- **Distributions**: Airdrops or rewards
- **Sweeping**: Consolidate multiple tokens

## Complete Batch Transfer Example

```javascript
const { ethers } = require('hardhat');
const { createAuthMetadata, callPrivateTransfers, sleep } = require('./script/helpers');

async function batchTransfer(numTokens) {
    const provider = new ethers.JsonRpcProvider(L1Url);
    const wallet = new ethers.Wallet(privateKey, provider);
    const tokenAddress = '0x...';

    // Step 1: Split tokens
    const splitRequest = {
        sc_address: tokenAddress,
        token_type: '0',
        from_address: wallet.address,
        to_address: receiverAddress,
        amount: numTokens,
    };

    const metadata = await createAuthMetadata(privateKey);
    const splitResponse = await client.generateSplitToken(splitRequest, metadata);

    await client.waitForActionCompletion(
        client.getTokenActionStatus,
        splitResponse.request_id,
        metadata
    );

    await sleep(5000);

    // Step 2: Create array of token IDs
    const baseTokenId = ethers.toBigInt(splitResponse.transfer_token_id);
    const tokenIds = Array.from(
        { length: numTokens },
        (_, i) => baseTokenId + BigInt(i)
    );

    // Step 3: Execute batch transfer
    const receipt = await callPrivateTransfers(wallet, tokenAddress, tokenIds);

    console.log(`Batch transferred ${numTokens} tokens.`);
    console.log('Transaction:', receipt.hash);
}

batchTransfer(10);  // Transfer 10 tokens
```

## Error Handling for Batches

```javascript
try {
    const receipt = await callPrivateTransfers(wallet, tokenAddress, tokenIds);
} catch (error) {
    // Check which tokens failed
    console.error('Batch transfer failed:', error.message);
    // Some tokens may have failed while others succeeded
}
```

## Next Steps

- [Simple Transfer Example](/docs/examples/simple-transfer) - Complete working example
- [API Reference](/docs/api/grpc-api) - Full API details
