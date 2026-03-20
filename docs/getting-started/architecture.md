---
title: Architecture
---

# Architecture

UCL uses a **dual-layer architecture** that separates privacy computation from on-chain execution.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Application                     │
│  ┌─────────────────────┐      ┌─────────────────────────┐ │
│  │   gRPC Client       │      │   Ethereum Contract    │ │
│  │                     │      │   (ethers.js)          │ │
│  │ - generateMintProof │      │ - privateMint           │ │
│  │ - generateSplitToken│      │ - privateTransfers      │ │
│  │ - generateApprove   │      │ - privateBurns          │ │
│  │ - waitForCompletion │      │ - privateTransferFroms │ │
│  └──────────┬──────────┘      └───────────┬─────────────┘ │
└─────────────┼──────────────────────────────┼──────────────┘
              │                              │
              ▼                              ▼
┌─────────────────────────┐      ┌─────────────────────────────┐
│     gRPC Server         │      │      Blockchain Node         │
│                         │      │                               │
│  - Privacy Computation  │      │  - Transaction Execution     │
│  - ZK Proof Generation │      │  - State Storage             │
│  - Token Operations    │      │  - Event Emission            │
└─────────────────────────┘      └─────────────────────────────┘
```

## Two-Step Operations

Almost every operation requires **two steps**:

1. **gRPC Call**: Generate zero-knowledge proof for the operation
2. **Contract Call**: Execute the actual operation on-chain

### Example: Transfer

```
Step 1 (gRPC): generateSplitToken()
  - Input: from, to, amount
  - Output: transfer_token_id, proof

Step 2 (Contract): privateTransfers()
  - Input: token_ids[]
  - Output: transaction receipt
```

## Why This Architecture?

### Privacy Computation (gRPC)

- Zero-knowledge proofs require heavy cryptographic computation
- Keeps proof generation separate from blockchain
- Allows for optimized hardware (GPUs) for ZK circuits

### On-Chain Execution (Contract)

- Leverages Ethereum's battle-tested execution environment
- Provides finality and immutability
- Enables integration with other DeFi protocols

## Components

### gRPC API

| Method | Description |
|--------|-------------|
| `generateMintProof` | Generate proof for minting new tokens |
| `generateSplitToken` | Generate proof for splitting/transferring tokens |
| `generateApproveProof` | Generate proof for approving tokens |
| `getTokenActionStatus` | Query the status of an operation |
| `waitForActionCompletion` | Wait for on-chain confirmation |

### Smart Contract

| Method | Description |
|--------|-------------|
| `privateMint` | Mint new tokens |
| `privateTransfer(s)` | Transfer tokens |
| `privateBurn(s)` | Burn/destroy tokens |
| `privateTransferFroms` | Transfer authorized tokens |
| `privateBurnFroms` | Burn authorized tokens |
| `privateCancelToken` | Cancel pending operation |

## Next Steps

- [UTXO Model](/docs/core-concepts/utxo-model) - Understand our token model
- [Setup Guide](/docs/how-tos/setup) - Start building
