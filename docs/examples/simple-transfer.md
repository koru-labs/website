---
title: Simple Transfer
---

# Simple Transfer

A complete, runnable example showing how to transfer tokens from one address to another.

## Prerequisites

- Node.js installed
- UCL dependencies installed
- Access to gRPC endpoint
- Test accounts with tokens

## The Code

```javascript
const { ethers } = require('hardhat');
const { createAuthMetadata, callPrivateTransfers, sleep } = require('./script/helpers');
const { createClient } = require('./test/qa/token_grpc');

/**
 * Simple Transfer Example
 * Transfers 1 token from sender to receiver
 */
async function simpleTransfer() {
    // ============== Configuration ==============
    const config = {
        grpcUrl: 'your-grpc-url:50051',
        l1RpcUrl: 'your-l1-rpc-url',
        tokenAddress: '0x...',  // Token contract address
        senderPrivateKey: '0x...',
        receiverAddress: '0x...',
    };

    // ============== Setup ==============
    const client = createClient(config.grpcUrl);
    const provider = new ethers.JsonRpcProvider(config.l1RpcUrl);
    const wallet = new ethers.Wallet(config.senderPrivateKey, provider);

    console.log('Sender:', wallet.address);
    console.log('Receiver:', config.receiverAddress);

    // ============== Step 1: Split Tokens ==============
    console.log('\n[1/3] Splitting tokens...');

    const splitRequest = {
        sc_address: config.tokenAddress,
        token_type: '0',
        from_address: wallet.address,
        to_address: config.receiverAddress,
        amount: 1,  // Transfer 1 token
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

    // ============== Step 2: Execute Transfer ==============
    console.log('\n[3/3] Executing transfer...');

    const transferTokenId = ethers.toBigInt(splitResponse.transfer_token_id);

    const receipt = await callPrivateTransfers(
        wallet,
        config.tokenAddress,
        [transferTokenId]
    );

    console.log('\n✅ Transfer successful!');
    console.log('Transaction Hash:', receipt.hash);
    console.log('Block Number:', receipt.blockNumber);
}

simpleTransfer()
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
┌─────────────────────────────────────────────────────────────┐
│                    Simple Transfer Flow                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Client                                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. generateSplitToken()                             │   │
│  │    - Creates transfer token                          │   │
│  │    - Returns transfer_token_id                       │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  gRPC Server                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 2. Generate ZK Proof                                 │   │
│  │    - Proves ownership                                 │   │
│  │    - Validates transfer                               │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  Blockchain                                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 3. privateTransfers(tokenId)                        │   │
│  │    - Verifies proof                                  │   │
│  │    - Transfers ownership                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Key Points

| Step | Function | Purpose |
|------|----------|---------|
| 1 | `generateSplitToken` | Create transfer token with ZK proof |
| 2 | `waitForActionCompletion` | Wait for gRPC processing |
| 3 | `privateTransfers` | Execute on-chain transfer |

## Running the Example

```bash
# Install dependencies
npm install ethers hardhat

# Run the script
node scripts/simple-transfer.js
```

## Expected Output

```
Sender: 0xABC...
Receiver: 0xDEF...

[1/3] Splitting tokens...
Split response: { requestId: 'abc123', transferTokenId: '0x1234...' }
Split completed!

[2/3] Waiting for chain confirmation...

[3/3] Executing transfer...

✅ Transfer successful!
Transaction Hash: 0x5678...
Block Number: 12345

Done!
```

## Next Steps

- [Batch Transfer Example](/docs/examples/batch-transfer) - Transfer multiple tokens
- [Approve and TransferFrom](/docs/examples/approve-and-transferfrom) - Use allowances
