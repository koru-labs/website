---
title: Deployment Overview
---

# pUSDC Deployment Overview

This section covers how to deploy the UCL Private USDC (pUSDC) contracts to a target network. The deployment is a two-phase sequential process.

## Prerequisites

Before running any deployment, ensure the following are in place:

- Node.js v18+ installed
- Dependencies installed: `npm install`
- Deployer accounts funded with native gas tokens on the target network
- `deployments/account.json` populated with the `Owner`, `Pauser`, and `BlackLister` addresses
- The correct environment configuration file updated (e.g., `script/qa_configuration.js` for QA)
- The target gRPC node is reachable (required by Phase 2)

## Deployment Phases

pUSDC deployment consists of exactly two phases that **must be run in order**:

| Phase | npm Script | Entry Script | Description |
|-------|-----------|--------------|-------------|
| **Phase 1** | `deploy-infra-qa` | `script/infra/deploy.js` | Deploy ZK libraries, event proxy, and institution registry |
| **Phase 2** | `deploy-token-qa` | `script/token/deploy.js` | Deploy PrivateUSDC token contract and configure minters |

Phase 2 reads contract addresses produced by Phase 1 from `deployments/image9.json`. Running Phase 2 before Phase 1 will fail.

## Quick Start (QA Environment)

```bash
# Phase 1 — Deploy infrastructure
npm run deploy-infra-qa

# Phase 2 — Deploy token
npm run deploy-token-qa
```

## Target Network: `ucl_L2_qa`

| Property | Value |
|----------|-------|
| RPC URL | `https://l2-node11.hamsa-ucl.com:8545` |
| Chain ID | `1337` |
| Config file | `script/qa_configuration.js` |
| Deployment output | `deployments/image9.json` (key: `qa`) |

## Environment Detection

The environment is determined automatically from the Hardhat network name:

| Network name contains | Environment loaded |
|-----------------------|--------------------|
| `dev` / `development` | `script/dev_configuration.js` |
| `qa` / `test` | `script/qa_configuration.js` |
| `prod` / `production` | `script/prod_configuration.js` |

## Deployment Output

Both phases write their results to `deployments/image9.json` under the environment key:

```json
{
  "qa": {
    "libraries": {
      "CurveBabyJubJub": "0x...",
      "TokenVerificationLib": "0x...",
      "SignatureChecker": "0x...",
      "TokenEventLib": "0x...",
      "TokenUtilsLib": "0x..."
    },
    "contracts": {
      "HamsaL2Event": "0x...",
      "InstitutionUserRegistry": "0x...",
      "InstUserProxy": "0x...",
      "PrivateERCToken": "0x...",
      "PrivateERCTokenImplementation": "0x..."
    },
    "metadata": {
      "network": "ucl_L2_qa",
      "chainId": "1337",
      "timestamp": "..."
    }
  }
}
```

## Full Call Chain

```
npm run deploy-infra-qa
└── script/infra/deploy.js
    ├── deployLibs()           — ZK cryptographic libraries
    ├── deployL2Event()        — HamsaL2Event proxy (reuse or update)
    ├── deployInstUserRegistry() — InstitutionUserRegistry (reuse or deploy)
    ├── deployInstProxy()      — InstPercentRouterProxy (reuse or update)
    └── saveDeploymentInfo()   → writes to image9.json["qa"]

npm run deploy-token-qa
└── script/token/deploy.js
    ├── getImage9EnvironmentData()  — reads image9.json["qa"] (Phase 1 output)
    ├── deployToken()               — PrivateUSDC implementation + proxy
    ├── setMinterAllowed()          — configure minters via gRPC + contract
    └── saveDeploymentInfo()        → appends to image9.json["qa"]
```

## Next Steps

- [Phase 1: Infrastructure](/docs/deployment/infrastructure) — detailed steps for the infra deployment
- [Phase 2: Token](/docs/deployment/token) — detailed steps for the token deployment
