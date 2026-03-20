---
title: 'Phase 2: Token'
---

# Phase 2: Token Deployment

This phase deploys the `PrivateUSDC` token contract (implementation + proxy) and configures minting permissions for all registered minter accounts.

> **Prerequisite:** Phase 1 must be completed successfully. This phase reads library addresses from `deployments/image9.json` produced by Phase 1.

## Command

```bash
npm run deploy-token-qa
# Runs: npx hardhat run script/token/deploy.js --network ucl_L2_qa
```

## Entry Point

[`script/token/deploy.js`](../../../script/token/deploy.js) — orchestrates three steps:

```js
const deployed = getImage9EnvironmentData();  // read Phase 1 output

await deployToken(deployed);
await setMinterAllowed(deployed);
await saveDeploymentInfo(deployed, hre, ethers, fs, path);
```

---

## Step 1: Load Phase 1 Output

**Function:** `getImage9EnvironmentData()` in `script/deploy_help.js`

Reads `deployments/image9.json` and returns the `qa` section. This provides the library addresses (`TokenEventLib`, `TokenVerificationLib`, `TokenUtilsLib`, `SignatureChecker`) that are required for linking the `PrivateUSDC` contract factory.

If `image9.json` does not exist or the `qa` key is missing, the script throws an error. Run Phase 1 first.

---

## Step 2: Deploy PrivateUSDC

**Function:** `deployToken()` in `script/token/deploy_token.js`

The deployer is the **Node3 institution wallet**, resolved from the environment configuration:

```js
// From qa_configuration.js
const node3Institution = config.institutions.find(i => i.name === "Node3");
// address: "0xf17f52151EbEF6C7334FAD080c5704D77216b732"
```

### 2a — Deploy Implementation Contract

`PrivateUSDC` is deployed with all four library links:

```js
const PrivateUSDCFactory = await ethers.getContractFactory("PrivateUSDC", {
    libraries: {
        "TokenEventLib":        deployed.libraries.TokenEventLib,
        "TokenUtilsLib":        deployed.libraries.TokenUtilsLib,
        "TokenVerificationLib": deployed.libraries.TokenVerificationLib,
        "SignatureChecker":     deployed.libraries.SignatureChecker,
    },
    signer: wallet,
});
const implementation = await PrivateUSDCFactory.deploy();
```

### 2b — Deploy PrivateUSDCProxy

A transparent proxy is deployed wrapping the implementation:

```js
const ProxyFactory = await ethers.getContractFactory("PrivateUSDCProxy", wallet);
const proxy = await ProxyFactory.deploy(implementation.target);
```

### 2c — Initialize the Proxy

`initialize()` is called once on the proxy to set all roles and associations:

```js
await privateUSDC.initialize(
    "Private USDC",       // token name
    "USDC",               // token symbol
    "USD",                // currency
    4,                    // decimals (0.0001 precision)
    accounts.Owner,       // masterMinter role
    accounts.Pauser,      // pauser role
    accounts.BlackLister, // blackLister role
    accounts.Owner,       // owner role
    hamsaL2EventProxy,    // HamsaL2Event proxy address
    instUserProxy         // InstitutionUserRegistry proxy address
);
```

Role addresses (`Owner`, `Pauser`, `BlackLister`) are loaded from `deployments/account.json`.  
`hamsaL2EventProxy` and `instUserProxy` come from `qa_configuration.js` `ADDRESSES`.

### QA Addresses Used

| Parameter | Source | QA Value |
|-----------|--------|----------|
| `hamsaL2Event` | `HAMSAL2EVENT_PROXY` | `0x3536Ca51D15f6fc0a76c1f42693F7949b5165F0D` |
| `institutionRegistration` | `PROXY_ADDRESS` | `0x7f1Dc0F5F8dafd9715Ea51f6c11b92929b2Dbdea` |

Deployed addresses are saved as:
- `deployed.contracts.PrivateERCToken` — proxy address
- `deployed.contracts.PrivateERCTokenImplementation` — implementation address

---

## Step 3: Configure Minters

**Function:** `setMinterAllowed()` in `script/token/deploy_token.js`

Each user with `role: "minter"` in the environment configuration is granted minting permission. The function communicates with the Node3 gRPC endpoint to generate ElGamal-encrypted allowance values.

**gRPC endpoint (QA):** `qa-node3-rpc.hamsa-ucl.com:50051`

### Minters Configured in QA

| Institution | Minter Address |
|-------------|----------------|
| Node3 | `0xe46fe251dd1d9ffc247bc0ddb6d61e4ee4416ecb` |
| Node3 | `0xF50F25915126d936C64A194b2C1DAa1EA45392c4` |
| Node3 | `0x4568E35F2c4590Bde059be615015AaB6cc873004` |
| Node3 | `0x983b4bA7e42E664dDBfe4ed3E0Ea07D90EFCc13B` |
| Node4 | `0xbA268f776F70caDB087e73020dfE41c7298363Ed` |

### For Each Minter

```js
// 1. Encode 100,000,000 as an ElGamal ciphertext via gRPC
const response = await client.encodeElgamalAmount(100_000_000, metadata);

// 2. Set privacy minter allowance (ZK encrypted limit)
await privateUSDC.configurePrivacyMinter(minter.account, {
    id:   tokenId,
    cl_x: clx,
    cl_y: cly,
    cr_x: crx,
    cr_y: cry,
});

// 3. Set plaintext minter allowance
await privateUSDC.configureMinter(minter.account, 100_000_000);
```

The minting allowance is `100,000,000` units. With `decimals = 4`, this equals **$10,000.00**.

### Bank Access Mode

The contract operates in **blacklist mode**: all institution addresses are permitted by default. To block a specific bank, call:

```js
await privateUSDC.updateBlockedBank(bankAddress, true);
```

No explicit allow-listing is required during deployment.

---

## Step 4: Save Deployment Info

**Function:** `saveDeploymentInfo()` in `script/deploy_help.js`

The two new contract addresses are merged into `deployments/image9.json` under the `qa` key:

```json
{
  "qa": {
    "contracts": {
      "PrivateERCToken":                "0x...",
      "PrivateERCTokenImplementation":  "0x...",
      ...
    }
  }
}
```

---

## Verifying the Deployment

After Phase 2 completes, verify the key values in `deployments/image9.json`:

```bash
cat deployments/image9.json | node -e \
  "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); \
   console.log(JSON.stringify(d.qa.contracts, null, 2))"
```

Expected output will include:

```json
{
  "HamsaL2Event": "0x3536Ca51D15f6fc0a76c1f42693F7949b5165F0D",
  "InstitutionUserRegistry": "0x1858cCeC051049Fa1269E958da2d33bCA27c6Db8",
  "InstUserProxy": "0x7f1Dc0F5F8dafd9715Ea51f6c11b92929b2Dbdea",
  "PrivateERCToken": "0x<newly deployed>",
  "PrivateERCTokenImplementation": "0x<newly deployed>"
}
```

---

## Deploying for demo_bank (Optional)

To also deploy a separate token instance for the `demo_bank` institution, uncomment the following lines in `script/token/deploy.js`:

```js
// deploy demo bank
await deployTokenDemoBank(deployed);
await setMinterAllowedDemoBank(deployed);
await saveDeploymentInfo(deployed, hre, ethers, fs, path);
```

The demo bank deployment follows the same steps but uses the `demo_bank` institution wallet and its own role addresses for initialization.

---

## Common Issues

### `image9.json not found`

Phase 1 has not been run or targeted a different network. Run `npm run deploy-infra-qa` first.

### gRPC connection refused

The `qa-node3-rpc.hamsa-ucl.com:50051` endpoint must be reachable. Verify network connectivity and that the gRPC node is running before executing Phase 2.

### `Node3 institution not found in config`

`script/qa_configuration.js` must contain an institution entry with `name: "Node3"`. Check that the configuration file has not been accidentally modified.

---

## Related Docs

- [Phase 1: Infrastructure](/docs/deployment/infrastructure) — ZK libraries and event proxy
- [Deployment Overview](/docs/deployment/overview) — end-to-end summary
- [Contract Methods](/docs/api/contract-methods) — PrivateUSDC on-chain API reference
- [Mint Tokens](/docs/how-tos/mint) — how to mint after deployment
