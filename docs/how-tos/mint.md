---
title: Mint Tokens
---

# Mint Tokens

Minting creates new tokens and adds them to circulation. This is typically a privileged operation.

## Before You Mint

Mint requires deployment and role setup to be completed first.

- `PrivateERCToken` must be deployed and reachable on your target network
- The minter account must be configured during token deployment (`setMinterAllowed`)
- gRPC endpoint must be online for proof generation

If you have not completed deployment yet, follow [Deployment Overview](/docs/deployment/overview) and [Phase 2: Token](/docs/deployment/token) first.

## Two-Step Process

```
gRPC: generateMintProof() → Contract: privateMint()
```

## Step 1: Generate Mint Proof (gRPC)

```javascript
const { createAuthMetadata } = require('./script/helpers');

const generateRequest = {
    sc_address: tokenContractAddress,  // Token contract address
    token_type: '0',                   // Token type (0 for standard)
    from_address: minterAddress,       // Who is minting
    to_address: receiverAddress,       // Who receives the tokens
    amount: 100,                       // How many tokens to mint
};

const metadata = await createAuthMetadata(minterPrivateKey);
const grpcResponse = await client.generateMintProof(generateRequest, metadata);

console.log('Mint Proof Response:', grpcResponse);
// Returns: { proof, input, token, mint_allowed, supply_amount }
```

## Step 2: Execute Mint (Contract)

```javascript
const { callPrivateMint } = require('./script/helpers');

const receipt = await callPrivateMint(
    tokenContractAddress,
    grpcResponse,
    minterWallet
);

console.log('Mint Transaction:', receipt.hash);
```

## Complete Example

```javascript
const { ethers } = require('hardhat');
const { createAuthMetadata, callPrivateMint } = require('./script/helpers');
const { createClient } = require('./test/qa/token_grpc');

async function mintTokens() {
    // Setup
    const rpcUrl = 'your-grpc-url:50051';
    const L1Url = 'your-l1-rpc-url';
    const tokenAddress = '0x...';

    const client = createClient(rpcUrl);
    const provider = new ethers.JsonRpcProvider(L1Url);
    const wallet = new ethers.Wallet(minterPrivateKey, provider);

    // Step 1: Generate mint proof
    const request = {
        sc_address: tokenAddress,
        token_type: '0',
        from_address: wallet.address,
        to_address: receiverAddress,
        amount: 100,
    };

    const metadata = await createAuthMetadata(minterPrivateKey);
    const response = await client.generateMintProof(request, metadata);

    // Step 2: Execute mint
    const receipt = await callPrivateMint(tokenAddress, response, wallet);

    console.log(`Minted 100 tokens. Transaction: ${receipt.hash}`);
}

mintTokens();
```

## Parameters Reference

| Parameter | Type | Description |
|-----------|------|-------------|
| `sc_address` | string | Token contract address |
| `token_type` | string | Token type ('0' for standard) |
| `from_address` | string | Minter address |
| `to_address` | string | Receiver address |
| `amount` | number | Number of tokens to mint |

## Error Handling

```javascript
try {
    const response = await client.generateMintProof(request, metadata);
    const receipt = await callPrivateMint(tokenAddress, response, wallet);
    console.log('Success:', receipt.hash);
} catch (error) {
    console.error('Mint failed:', error.message);
}
```

## Next Steps

- [Transfer Tokens](/docs/how-tos/transfer) - Send minted tokens
- [Batch Operations](/docs/how-tos/batch-operations) - Handle multiple operations
