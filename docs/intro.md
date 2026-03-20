---
slug: /
title: Welcome to UCL Private Token
---

# UCL Private Token

Welcome to the UCL Private Token documentation. This documentation is designed for Ethereum developers who want to understand and build applications on our privacy-preserving blockchain.

## What is UCL?

UCL (Universal Confidential Ledger) is a privacy-preserving blockchain built on Ethereum technology. It uses **Zero-Knowledge Proofs (ZKP)** to enable confidential transactions while maintaining the benefits of a public blockchain.

## Key Features

- **Privacy by Default**: All transactions are encrypted using zero-knowledge proofs
- **EVM Compatible**: Works with standard Ethereum tools (ethers.js, Hardhat, etc.)
- **UTXO Model**: Each token is unique (similar to NFT), providing granular control
- **Enterprise Ready**: Designed for financial institutions and privacy-sensitive applications

## Quick Links

- [Getting Started](/docs/getting-started/prerequisites) - Set up your development environment
- [Core Concepts](/docs/core-concepts/utxo-model) - Understand our privacy architecture
- [How To Guides](/docs/how-tos/setup) - Programmatic access to the chain
- [DvP Guide](/docs/dvp) - Delivery versus Payment with pToken + ZKCSC
- [Examples](/docs/examples/simple-transfer) - Build your first app

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Application                      │
│  ┌─────────────────────┐      ┌─────────────────────────┐  │
│  │   gRPC Client       │      │   Smart Contract        │  │
│  │ (Proof Generation) │      │   (Execution)            │  │
│  └──────────┬──────────┘      └───────────┬─────────────┘  │
└─────────────┼──────────────────────────────┼────────────────┘
              │                              │
              ▼                              ▼
┌─────────────────────────┐      ┌─────────────────────────────┐
│     gRPC Server         │      │      Blockchain Node       │
│  (Privacy Computation)  │      │  (Ethereum EVM)             │
└─────────────────────────┘      └─────────────────────────────┘
```

## Who Is This For?

This documentation is tailored for developers who:

- Are familiar with Ethereum and EVM
- Know how to use tools like ethers.js and Hardhat
- Want to build privacy-preserving applications
- Need to understand our unique UTXO-based token model

## Next Steps

Start by reading the [Getting Started](/docs/getting-started/prerequisites) guide to set up your development environment.