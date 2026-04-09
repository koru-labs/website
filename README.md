# UCL Contract Ops

This repository contains the UCL smart contracts and the new `ops/` workflow
for deployment, bootstrap, and business-flow scenarios.

The intended lifecycle is:

1. start the local chain and supporting services with Bedrock
2. deploy shared contract infrastructure
3. bootstrap institutions, token contracts, and optional user/minter state
4. run explicit business scenarios such as mint, transfer, or burn

The new `ops/` flow is the supported path for deployment and initialization.
Legacy `script/` and ad hoc test entrypoints still exist in the repo, but they
are not the recommended operator interface.

This workflow now uses a single configuration center:

- [ops/config/current.js](/Users/hamsa/dev/ucl-contract/ops/config/current.js)

You do not pick an environment at command time.
You edit the current config once, then run the fixed commands.

## Repositories

For local Bedrock-based development, the typical sibling layout is:

```text
dev/
  ucl-bedrock/
  ucl/
  ucl-faucet/
  node-explorer/
  ucl-block-explorer-syncer/
  ucl-contract/
```

## Prerequisites

Before using this repository, make sure the following are already working:

- Docker Desktop is running
- Kurtosis is installed
- the Bedrock environment can start successfully
- `node` and `npm` are installed
- dependencies in this repo are installed with `npm install`

If you have not started Bedrock yet, do that first from
[ucl-bedrock README](/Users/hamsa/dev/ucl-bedrock/README.md).

## What `ops/` Does

The new workflow is split into three stages:

- `deploy`
  deploys shared infrastructure contracts and writes `infra.json`
- `bootstrap`
  registers institutions, deploys the token, and writes `bootstrap.json`
  plus `deployment.json`
- `scenario`
  runs explicit business flows against the deployed outputs

This separation is intentional:

- deployment stays focused on infrastructure
- bootstrap makes the environment usable for business integration
- scenarios stay optional and explicit

## Quick Start For A New Developer

This is the shortest complete path from zero to a usable local environment.

### 1. Start Bedrock

From [ucl-bedrock](/Users/hamsa/dev/ucl-bedrock):

```bash
./start.sh
```

Make sure the local UCL RPC is reachable:

```bash
curl http://127.0.0.1:18545
```

The default checked-in current config assumes:

- RPC URL: `http://127.0.0.1:18545`
- chain id: `100`

These defaults are already wired into:

- [ops/config/current.js](/Users/hamsa/dev/ucl-contract/ops/config/current.js)
- the `ucl_target` Hardhat network in [hardhat.config.js](/Users/hamsa/dev/ucl-contract/hardhat.config.js)

### 2. Install Dependencies

From [ucl-contract](/Users/hamsa/dev/ucl-contract):

```bash
npm install
```

### 3. Deploy Shared Infrastructure Contracts

```bash
npm run ops:deploy
```

This deploys:

- verifier and helper libraries
- `HamsaL2Event`
- `HamsaL2EventProxy`
- `InstitutionUserRegistry`
- `InstPercentRouterProxy`

The output is written to:

- [infra.json](/Users/hamsa/dev/ucl-contract/ops/outputs/current/infra.json)
- [runtime.json](/Users/hamsa/dev/ucl-contract/ops/outputs/current/runtime.json)

### 4. Bootstrap The Business Baseline

```bash
npm run ops:bootstrap
```

This does the following:

- registers Node3 and Node4 in `InstitutionUserRegistry`
- deploys `PrivateUSDC` implementation and proxy
- initializes the token against the registry and event contracts
- writes deployment/bootstrap artifacts

The output is written to:

- [bootstrap.json](/Users/hamsa/dev/ucl-contract/ops/outputs/current/bootstrap.json)
- [deployment.json](/Users/hamsa/dev/ucl-contract/ops/outputs/current/deployment.json)

If you want one command for both steps:

```bash
npm run ops:init
```

### 5. Inspect The Deployment Outputs

After bootstrap, the main file most people will use is:

- [deployment.json](/Users/hamsa/dev/ucl-contract/ops/outputs/current/deployment.json)

It contains:

- deployed contract addresses
- the chain RPC URL
- core operator accounts

Typical follow-up checks:

```bash
cat ops/outputs/current/infra.json
cat ops/outputs/current/bootstrap.json
cat ops/outputs/current/deployment.json
```

### 6. Run A Scenario Entrypoint

```bash
npm run ops:scenario:mint
```

At the moment this scenario is still a placeholder entrypoint. It verifies that
the scenario layer can resolve the deployed token and read the new output
artifacts. The next implementation step is to wire in proof generation and the
contract call flow.

## Optional: Enable User Registration And Minter Bootstrap

The local Bedrock bootstrap is intentionally tolerant.

By default it will:

- register institutions on-chain
- deploy the token
- skip user registration if no gRPC endpoint is configured
- skip minter proof initialization if no gRPC endpoint is configured

This keeps the environment usable even before the proof service stack is fully
integrated.

To enable the gRPC-backed parts of bootstrap, set real endpoints before running
`npm run ops:bootstrap`:

```bash
export BEDROCK_NODE3_GRPC_URL=127.0.0.1:50051
export BEDROCK_NODE4_GRPC_URL=127.0.0.1:50052
```

Additional optional overrides:

```bash
export BEDROCK_NODE3_REGISTRY_RPC_URL=bedrock-node3.local:50051
export BEDROCK_NODE4_REGISTRY_RPC_URL=bedrock-node4.local:50052
export BEDROCK_NODE3_NODE_URL=https://bedrock-node3.local:8443
export BEDROCK_NODE4_NODE_URL=https://bedrock-node4.local:8443
export BEDROCK_NODE3_HTTP_URL=http://bedrock-node3.local:8080
export BEDROCK_NODE4_HTTP_URL=http://bedrock-node4.local:8080
export BEDROCK_NODE3_PUBLIC_KEY_X=<value>
export BEDROCK_NODE3_PUBLIC_KEY_Y=<value>
export BEDROCK_NODE4_PUBLIC_KEY_X=<value>
export BEDROCK_NODE4_PUBLIC_KEY_Y=<value>
```

Then rerun:

```bash
npm run ops:bootstrap
```

With working gRPC endpoints, bootstrap is expected to:

- register institution users through gRPC
- configure privacy minters for the token
- configure public minter allowances

## Full Example Flow

For a brand new local environment, a complete operator session looks like this:

```bash
# terminal 1: start the local chain and services
cd /Users/hamsa/dev/ucl-bedrock
./start.sh

# terminal 2: review the single active config
cd /Users/hamsa/dev/ucl-contract
sed -n '1,220p' ops/config/current.js

# terminal 2: deploy and bootstrap contracts
npm install
npm run ops:init

# optional: inspect outputs
cat ops/outputs/current/infra.json
cat ops/outputs/current/bootstrap.json
cat ops/outputs/current/deployment.json

# optional: run a scenario
npm run ops:scenario:mint
```

## How To Switch Targets

There is no environment selector in the command line anymore.

If you want to point deploy/bootstrap at a different chain or different proving
services, edit:

- [ops/config/current.js](/Users/hamsa/dev/ucl-contract/ops/config/current.js)

The commands stay the same:

```bash
npm run ops:deploy
npm run ops:bootstrap
npm run ops:init
npm run ops:scenario:mint
```

## File Guide

Main operator files:

- [ops/README.md](/Users/hamsa/dev/ucl-contract/ops/README.md)
- [ops/deploy/run.js](/Users/hamsa/dev/ucl-contract/ops/deploy/run.js)
- [ops/bootstrap/run.js](/Users/hamsa/dev/ucl-contract/ops/bootstrap/run.js)
- [ops/scenarios/mint.js](/Users/hamsa/dev/ucl-contract/ops/scenarios/mint.js)
- [hardhat.config.js](/Users/hamsa/dev/ucl-contract/hardhat.config.js)
- [package.json](/Users/hamsa/dev/ucl-contract/package.json)

Generated outputs:

- [ops/outputs/current/infra.json](/Users/hamsa/dev/ucl-contract/ops/outputs/current/infra.json)
- [ops/outputs/current/bootstrap.json](/Users/hamsa/dev/ucl-contract/ops/outputs/current/bootstrap.json)
- [ops/outputs/current/deployment.json](/Users/hamsa/dev/ucl-contract/ops/outputs/current/deployment.json)

## Current Scope And Remaining Work

Completed:

- clean `ops/` deployment structure
- local Bedrock deploy flow
- local Bedrock bootstrap flow
- artifact output under `ops/outputs/<env>/`
- single active config center under `ops/config/current.js`
- single target Hardhat network `ucl_target`

Not finished yet:

- real mint scenario implementation
- transfer and burn scenarios
- automatic discovery of Bedrock gRPC endpoints from Bedrock outputs
- full proof-service integration
