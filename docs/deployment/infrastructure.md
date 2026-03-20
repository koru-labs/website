---
title: 'Phase 1: Infrastructure'
---

# Phase 1: Infrastructure Deployment

This phase deploys all ZK cryptographic libraries, the L2 event proxy, and the institution user registry. These contracts are shared across all pUSDC token instances on the same network.

## Command

```bash
npm run deploy-infra-qa
# Runs: npx hardhat run script/infra/deploy.js --network ucl_L2_qa
```

## Entry Point

[`script/infra/deploy.js`](../../../script/infra/deploy.js) — orchestrates four sub-steps in sequence:

```js
await deployLibs(deployed);
await deployL2Event(deployed);
await deployInstUserRegistry(deployed);
await deployInstProxy(deployed);
await saveDeploymentInfo(deployed, hre, ethers, fs, path);
```

---

## Step 1: Deploy ZK Cryptographic Libraries

**Function:** `deployLibs()` in `script/infra/deploy_infra.js`  
**Sub-functions:** defined in `script/infra/deploy_verifier.js`

Contracts are deployed in dependency order:

```
CurveBabyJubJub
└── CurveBabyJubJubHelper        (links CurveBabyJubJub)

MintAllowedTokenVerifier  ─┐
SplitTokenVerifier         │
SplitAllowanceTokenVerifier├── TokenVerificationLib  (links all 6 verifiers)
Convert2pUSDCVerifier      │
Convert2USDCVerifier       │
RevealTotalSupplyVerifier  ─┘

SignatureChecker            (standalone)
TokenEventLib               (standalone)
TokenUtilsLib               (standalone)
```

### Contracts Deployed

| Contract | Purpose |
|----------|---------|
| `CurveBabyJubJub` | Baby JubJub elliptic curve arithmetic (ZK core) |
| `CurveBabyJubJubHelper` | Utility helpers for curve operations |
| `MintAllowedTokenVerifier` | ZK proof verifier: mint allowance check |
| `SplitTokenVerifier` | ZK proof verifier: token split / transfer |
| `SplitAllowanceTokenVerifier` | ZK proof verifier: allowance split |
| `Convert2pUSDCVerifier` | ZK proof verifier: USDC → pUSDC conversion |
| `Convert2USDCVerifier` | ZK proof verifier: pUSDC → USDC conversion |
| `RevealTotalSupplyVerifier` | ZK proof verifier: total supply reveal |
| `TokenVerificationLib` | Aggregation library linking all verifiers |
| `SignatureChecker` | ECDSA signature verification utility |
| `TokenEventLib` | Event emission utility |
| `TokenUtilsLib` | General token utility functions |

All deployed addresses are stored under `deployed.libraries`.

---

## Step 2: Deploy HamsaL2Event

**Function:** `deployL2Event()` in `script/infra/deploy_infra.js`

`HamsaL2Event` is an upgradeable proxy that emits audit events from all token operations on the L2 network. It supports an optional A/B traffic split across two implementations.

### Behavior (Smart Reuse)

The function reads the addresses from the environment configuration file (e.g., `script/qa_configuration.js`) and decides whether to deploy fresh or reuse:

| Config key | Address set? | Behavior |
|-----------|-------------|---------|
| `HAMSAL2EVENT_IMPLEMENTATION` | No | Deploy a new implementation contract |
| `HAMSAL2EVENT_IMPLEMENTATION` | Yes | Reuse existing — skip deployment |
| `HAMSAL2EVENT_PROXY` | No | Deploy a new `HamsaL2EventProxy` and initialize it |
| `HAMSAL2EVENT_PROXY` | Yes | Reuse — call `proxy.setImplementationA(newImpl)` to upgrade |
| `HAMSAL2EVENT_IMPLEMENTATION_B` | Set | Configure `setImplementationB(addr, percentage)` for A/B routing |
| `HAMSAL2EVENT_PERCENTAGE_TO_B` | > 0 | Route that percentage of calls to implementation B |

### QA Configuration

```js
"HAMSAL2EVENT_IMPLEMENTATION": "0x35AFB3c0d77217f4527b3ACa2832a9Bb0d3153bF",
"HAMSAL2EVENT_PROXY":          "0x3536Ca51D15f6fc0a76c1f42693F7949b5165F0D",
"HAMSAL2EVENT_IMPLEMENTATION_B": "",
"HAMSAL2EVENT_PERCENTAGE_TO_B":  0
```

In QA, both addresses are pre-set, so the script **updates** the existing proxy to point to the latest implementation without redeploying the proxy.

The proxy address is saved as `deployed.contracts.HamsaL2Event`.

---

## Step 3: Deploy InstitutionUserRegistry

**Function:** `deployInstUserRegistry()` in `script/infra/deploy_inst_user_registry.js`

`InstitutionUserRegistry` stores institution and user registrations. It is linked against `TokenEventLib`.

### Behavior

| Config key | Address set? | Behavior |
|-----------|-------------|---------|
| `INSTITUTION_REGISTRATION` | No | Deploy new `InstitutionUserRegistry` contract |
| `INSTITUTION_REGISTRATION` | Yes | Reuse existing address — skip deployment |

### QA Configuration

```js
"INSTITUTION_REGISTRATION": "0x1858cCeC051049Fa1269E958da2d33bCA27c6Db8"
```

The address is saved as `deployed.contracts.InstitutionUserRegistry`.

---

## Step 4: Deploy InstPercentRouterProxy

**Function:** `deployInstProxy()` in `script/infra/deploy_inst_user_registry.js`

`InstPercentRouterProxy` is a proxy contract that wraps `InstitutionUserRegistry` and routes calls with optional percentage-based traffic splitting.

### Behavior

| Config key | Address set? | Behavior |
|-----------|-------------|---------|
| `PROXY_ADDRESS` | No | Deploy new `InstPercentRouterProxy`, call`proxy.initialize(deployer, HamsaL2Event)` |
| `PROXY_ADDRESS` | Yes | Reuse — call `proxy.setImplementationA(InstitutionUserRegistry)` to upgrade |

### QA Configuration

```js
"PROXY_ADDRESS": "0x7f1Dc0F5F8dafd9715Ea51f6c11b92929b2Dbdea"
```

The address is saved as `deployed.contracts.InstUserProxy`.

---

## Step 5: Save Deployment Info

**Function:** `saveDeploymentInfo()` in `script/deploy_help.js`

All collected addresses are written to `deployments/image9.json` under the `qa` key:

```json
{
  "qa": {
    "libraries": {
      "CurveBabyJubJub":             "0x...",
      "CurveBabyJubJubHelper":       "0x...",
      "MintAllowedTokenVerifier":    "0x...",
      "SplitTokenVerifier":          "0x...",
      "SplitAllowanceTokenVerifier": "0x...",
      "Convert2pUSDCVerifier":       "0x...",
      "Convert2USDCVerifier":        "0x...",
      "RevealTotalSupplyVerifier":   "0x...",
      "TokenVerificationLib":        "0x...",
      "SignatureChecker":             "0x...",
      "TokenEventLib":               "0x...",
      "TokenUtilsLib":               "0x..."
    },
    "contracts": {
      "HamsaL2EventImplementation":  "0x...",
      "HamsaL2Event":                "0x...",
      "InstitutionUserRegistry":     "0x...",
      "InstUserProxy":               "0x..."
    },
    "metadata": {
      "network":    "ucl_L2_qa",
      "chainId":    "1337",
      "timestamp":  "2026-03-20T..."
    }
  }
}
```

This file is consumed by Phase 2.

---

## Common Issues

### "Network mismatch detected"

`loadExistingDeployments()` validates that the stored `chainId` and network name match the current network. If `image9.json` was written by a different network, it is automatically deleted and a fresh deployment starts.

### New environment (no addresses in config)

If all `ADDRESSES` fields in the configuration file are empty, the script performs a full fresh deployment of all contracts and initializes them. Fill in the addresses after the first run to enable smart reuse on subsequent runs.

---

## Next Steps

- [Phase 2: Token Deployment](/docs/deployment/token) — deploy PrivateUSDC and configure minters
