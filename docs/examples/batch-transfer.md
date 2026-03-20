---
title: Batch Transfer
---

# Batch Transfer

A complete example showing how to transfer multiple tokens in a single transaction.

## Prerequisites

- Same as Simple Transfer
- Sender must have multiple tokens (one token per Token ID)

## The Code

```javascript
const { ethers } = require('hardhat');
const { createAuthMetadata, callPrivateTransfers, sleep } = require('./script/helpers');
const { createClient } = require('./test/qa/token_grpc');

/**
 * Batch Transfer Example
 * Transfers N tokens from sender to receiver
 */
async function batchTransfer(numTokens) {
    // ============== Configuration ==============
    const config = {
        grpcUrl: 'your-grpc-url:50051',
        l1RpcUrl: 'your-l1-rpc-url',
        tokenAddress: '0x...',
        senderPrivateKey: '0x...',
        receiverAddress: '0x...',
    };

    // ============== Setup ==============
    const client = createClient(config.grpcUrl);
    const provider = new ethers.JsonRpcProvider(config.l1RpcUrl);
    const wallet = new ethers.Wallet(config.senderPrivateKey, provider);

    console.log(`Batch Transfer: ${numTokens} tokens`);
    console.log('From:', wallet.address);
    console.log('To:', config.receiverAddress);

    // ============== Step 1: Split Multiple Tokens ==============
    console.log(`\n[1/3] Splitting ${numTokens} tokens...`);

    const splitRequest = {
        sc_address: config.tokenAddress,
        token_type: '0',
        from_address: wallet.address,
        to_address: config.receiverAddress,
        amount: numTokens,  // Split into N tokens
    };

    const metadata = await createAuthMetadata(config.senderPrivateKey);
    const splitResponse = await client.generateSplitToken(splitRequest, metadata);

    console.log('Split response:', {
        requestId: splitResponse.request_id,
        transferTokenId: splitResponse.transfer_token_id,
    });

    // Wait for gRPC processing
    await client.waitForActionCompletion(
        client.getTokenActionStatus,
        splitResponse.request_id,
        metadata
    );

    console.log('Split completed!');

    // Wait for chain confirmation
    console.log('\n[2/3] Waiting for chain confirmation...');
    await sleep(5000);

    // ============== Step 2: Create Token ID Array ==============
    console.log('\n[3/3] Executing batch transfer...');

    // Generate array of token IDs
    // If transfer_token_id is 0x100, we get 0x100, 0x101, 0x102, ...
    const baseTokenId = ethers.toBigInt(splitResponse.transfer_token_id);
    const tokenIds = Array.from(
        { length: numTokens },
        (_, i) => baseTokenId + BigInt(i)
    );

    console.log('Token IDs:', tokenIds.map(id => ethers.toHexString(id)));

    // ============== Step 3: Execute Batch Transfer ==============
    const receipt = await callPrivateTransfers(
        wallet,
        config.tokenAddress,
        tokenIds
    );

    console.log('\n✅ Batch Transfer successful!');
    console.log('Tokens transferred:', numTokens);
    console.log('Transaction Hash:', receipt.hash);
    console.log('Gas used:', receipt.gasUsed.toString());
}

// Run with 10 tokens
batchTransfer(10)
    .then(() => {
        console.log('\nDone!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    });
```

## How It Works

```
Step 1: Split N tokens
┌─────────────────────────────────────────────────────┐
│ Request: amount: 10                                  │
│ Response: transfer_token_id: 0x100                   │
│ Token IDs generated: [0x100, 0x101, ... 0x109]     │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
Step 2: Batch Transfer
┌─────────────────────────────────────────────────────┐
│ contract.privateTransfers([0x100, 0x101, ...])     │
│ Single transaction for all tokens                   │
└─────────────────────────────────────────────────────┘
```

## Gas Efficiency

Batch transfers are more gas efficient:

| Method | Gas Cost |
|--------|----------|
| 10 single transfers | ~210,000 gas |
| 1 batch transfer | ~70,000 gas |
| **Savings** | **~67%** |

## Running the Example

```bash
# Run with 10 tokens
node scripts/batch-transfer.js 10

# Run with 100 tokens
node scripts/batch-transfer.js 100
```

## Expected Output

```
Batch Transfer: 10 tokens
From: 0xABC...
To: 0xDEF...

[1/3] Splitting 10 tokens...
Split response: { requestId: 'abc123', transferTokenId: '0x100' }
Split completed!

[2/3] Waiting for chain confirmation...

[3/3] Executing batch transfer...
Token IDs: [0x100, 0x101, 0x102, 0x103, 0x104, 0x105, 0x106, 0x107, 0x108, 0x109]

✅ Batch Transfer successful!
Tokens transferred: 10
Transaction Hash: 0x5678...
Gas used: 72000

Done!
```

## Use Cases

- **Payroll**: Pay multiple employees in one transaction
- **Airdrops**: Distribute tokens to many recipients
- **Rewards**: Batch reward distributions
- **Sweeping**: Consolidate tokens from multiple sources

## Next Steps

- [Approve and TransferFrom](/docs/examples/approve-and-transferfrom) - Authorized transfers
- [API Reference](/docs/api/grpc-api) - Full API details
