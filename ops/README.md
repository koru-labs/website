# ops

This directory contains the new operator-facing contract workflow.

Use it when you want a clean, configuration-driven flow for:

- deployment
- bootstrap
- scenario execution

Do not treat the legacy `script/` tree as the primary operator interface.

## Command Overview

- `npm run ops:deploy`
- `npm run ops:bootstrap`
- `npm run ops:init`
- `npm run ops:scenario:mint`

All commands use the single active configuration in:

- [config/current.js](/Users/hamsa/dev/ucl-contract/ops/config/current.js)

## Execution Model

The new flow is intentionally split into stages.

### `deploy`

Responsibilities:

- deploy verifier and helper libraries
- deploy shared infra contracts
- write `infra.json`
- write `runtime.json`

This stage does not deploy the token.

### `bootstrap`

Responsibilities:

- register institutions in the registry
- deploy and initialize the token
- optionally register users through gRPC
- optionally configure minters through gRPC
- write `bootstrap.json`
- write `deployment.json`

The token is deployed here, not in `deploy`, because `PrivateUSDC.initialize()`
binds the token to the institution registry.

### `scenario`

Responsibilities:

- run explicit business flows
- consume artifacts produced by `deploy` and `bootstrap`

Scenarios are intentionally separate from deploy/bootstrap.

## Directory Layout

- `config`: single active configuration
- `deploy`: infra deployment phases and entrypoint
- `bootstrap`: registry, token, and initialization entrypoint
- `scenarios`: business-flow entrypoints
- `shared`: environment loading, artifact I/O, auth metadata, gRPC helpers
- `outputs`: generated artifacts

## Current Config

The checked-in default points to local Bedrock:

- network name: `ucl_target`
- RPC URL: `http://127.0.0.1:18545`
- chain id: `100`

These defaults are defined in:

- [config/current.js](/Users/hamsa/dev/ucl-contract/ops/config/current.js)
- [hardhat.config.js](/Users/hamsa/dev/ucl-contract/hardhat.config.js)

To switch deployment targets, edit only `config/current.js`.
The commands do not change.

## Example Flow

```bash
cd /Users/hamsa/dev/ucl-contract
npm install
npm run ops:deploy
npm run ops:bootstrap
npm run ops:scenario:mint
```

Or:

```bash
cd /Users/hamsa/dev/ucl-contract
npm install
npm run ops:init
```

## gRPC-Backed Bootstrap

By default, local bootstrap is tolerant:

- institutions are registered on-chain
- token deployment still happens
- user registration is skipped if no gRPC endpoint is configured
- minter initialization is skipped if no gRPC endpoint is configured

This is useful while the proof-service stack is still being integrated.

If you do have working gRPC endpoints, set them before bootstrap:

```bash
export BEDROCK_NODE3_GRPC_URL=127.0.0.1:50051
export BEDROCK_NODE4_GRPC_URL=127.0.0.1:50052
```

Additional optional overrides:

- `BEDROCK_NODE3_REGISTRY_RPC_URL`
- `BEDROCK_NODE4_REGISTRY_RPC_URL`
- `BEDROCK_NODE3_NODE_URL`
- `BEDROCK_NODE4_NODE_URL`
- `BEDROCK_NODE3_HTTP_URL`
- `BEDROCK_NODE4_HTTP_URL`
- `BEDROCK_NODE3_PUBLIC_KEY_X`
- `BEDROCK_NODE3_PUBLIC_KEY_Y`
- `BEDROCK_NODE4_PUBLIC_KEY_X`
- `BEDROCK_NODE4_PUBLIC_KEY_Y`

## Artifacts

All outputs are written under:

- `ops/outputs/current/`

Main files:

- `infra.json`
- `runtime.json`
- `bootstrap.json`
- `deployment.json`

The most important artifact for downstream scripts is `deployment.json`.

## Main Files

- [deploy/run.js](/Users/hamsa/dev/ucl-contract/ops/deploy/run.js)
- [bootstrap/run.js](/Users/hamsa/dev/ucl-contract/ops/bootstrap/run.js)
- [scenarios/mint.js](/Users/hamsa/dev/ucl-contract/ops/scenarios/mint.js)
- [shared/env.js](/Users/hamsa/dev/ucl-contract/ops/shared/env.js)
- [shared/artifacts.js](/Users/hamsa/dev/ucl-contract/ops/shared/artifacts.js)

## Status

Completed:

- clean deploy/bootstrap separation
- single active config center
- fixed operator commands
- local Bedrock deploy flow
- local Bedrock bootstrap flow
- output artifacts under `ops/outputs/current/`

Remaining:

- real mint scenario implementation
- transfer and burn scenarios
- automatic Bedrock gRPC endpoint discovery
