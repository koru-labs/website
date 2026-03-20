---
title: Prerequisites
---

# Prerequisites

Before you start building on UCL, make sure you have the following installed and configured.

## Required Tools

### Node.js

```bash
# Check Node.js version
node --version
# Should be v18 or higher
```

### npm or yarn

```bash
# npm
npm --version

# or yarn
yarn --version
```

### Git

```bash
git --version
```

## Required Dependencies

Install the following packages for Ethereum development:

```bash
npm install ethers hardhat @nomicfoundation/hardhat
```

## Account Setup

You'll need:

1. **Private Key**: Your account's private key
2. **gRPC Endpoint**: Contact the UCL team to get your gRPC endpoint
3. **RPC Endpoint**: Your L1 RPC endpoint
4. **Token Contract Address**: The address of the PrivateERCToken contract

## Deployment Requirement

Before running operation guides like Mint, Transfer, or Approve, you must have a deployed token stack for your environment:

- Infrastructure contracts (event proxy + institution registry)
- `PrivateERCToken` (PrivateUSDC proxy)
- Configured minter permissions for the accounts you plan to use

If these are not deployed yet, follow [Deployment Overview](/docs/deployment/overview) first.

## Network Configuration

UCL uses the following network parameters:

```javascript
const networkConfig = {
    name: 'BESU',
    chainId: 1337,
};
```

## Next Steps

- [Deployment Overview](/docs/deployment/overview) - Deploy infrastructure and token contracts first
- [Architecture Overview](/docs/getting-started/architecture) - Understand the system design
- [Setup Guide](/docs/how-tos/setup) - Configure your development environment
