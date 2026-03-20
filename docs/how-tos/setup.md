---
title: Setup
---

# Setup

This guide walks you through setting up your development environment to interact with UCL.

## Before You Start: Deploy pUSDC First

Before running mint, transfer, or approve flows, make sure pUSDC contracts are already deployed for your target environment.

1. Read [Deployment Overview](/docs/deployment/overview)
2. Complete [Phase 1: Infrastructure](/docs/deployment/infrastructure)
3. Complete [Phase 2: Token](/docs/deployment/token)

After deployment, use the deployed `PrivateERCToken` address (from `deployments/image9.json`) in the setup and code examples below.

## Installation

### 1. Install Node.js Dependencies

```bash
npm install ethers hardhat @nomicfoundation/hardhat
```

### 2. Install gRPC Dependencies

The gRPC client is included in the project:

```javascript
const { createClient } = require('./test/qa/token_grpc');
```

## Configuration

### Network Setup

```javascript
const { ethers } = require('hardhat');

// Network configuration
const l1CustomNetwork = {
    name: 'BESU',
    chainId: 1337,
};

const options = {
    batchMaxCount: 1,
    staticNetwork: true,
};

// Connect to L1
const L1Url = 'your-l1-rpc-url:50051';
const l1Provider = new ethers.JsonRpcProvider(L1Url, l1CustomNetwork, options);
```

### Initialize Wallet

```javascript
const privateKey = 'your-private-key';
const wallet = new ethers.Wallet(privateKey, l1Provider);
```

### Initialize gRPC Client

```javascript
const rpcUrl = 'your-grpc-url:50051';
const client = createClient(rpcUrl);
```

## Create Authentication Metadata

Most gRPC calls require authentication metadata:

```javascript
const { createAuthMetadata } = require('./script/helpers');

const metadata = await createAuthMetadata(privateKey);
```

## Environment Variables

Create a `.env` file:

```bash
# Private keys
PRIVATE_KEY=0x...

# Endpoints
GRPC_URL=qa-node3-rpc.hamsa-ucl.com:50051
L1_RPC_URL=https://...
```

## Project Structure

```
my-project/
├── contracts/
├── scripts/
├── test/
├── docs/
└── .env
```

## Helper Functions

Import helper functions from the UCL SDK:

```javascript
const {
    // Token operations
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

    // Utilities
    createAuthMetadata,
    getApproveTokenList,
    sleep,
} = require('./script/helpers');
```

## Quick Test

Verify your setup with a simple connection test:

```javascript
async function testSetup() {
    const { createAuthMetadata } = require('./script/helpers');

    // Test wallet
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log('Wallet address:', wallet.address);

    // Test metadata
    const metadata = await createAuthMetadata(process.env.PRIVATE_KEY);
    console.log('Metadata created successfully');

    // Test gRPC connection
    const client = createClient(process.env.GRPC_URL);
    console.log('gRPC client connected');
}

testSetup();
```

## Next Steps

- [Deploy pUSDC](/docs/deployment/overview) - Complete deployment first
- [Mint Tokens](/docs/how-tos/mint) - Create new tokens
- [Transfer Tokens](/docs/how-tos/transfer) - Send tokens to others
- [Approve Tokens](/docs/how-tos/approve) - Authorize third parties
