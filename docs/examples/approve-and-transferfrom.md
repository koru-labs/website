---
title: Approve and TransferFrom
---

# Approve and TransferFrom

This example demonstrates how to approve a third party to spend your tokens, and how that third party can use the approval.

## How It Differs from ERC20

### ERC20
```javascript
// Approve
await token.approve(spender, 100);

// Spender transfers
await token.transferFrom(owner, recipient, 50);
```

### UCL
```javascript
// Owner: Approve specific token IDs
const tokenId = await approveTokens(owner, spender);

// Spender: Transfer the approved token
await transferFrom(owner, spender, recipient, tokenId);
```

## The Code

### Owner: Approve Tokens

```javascript
const { ethers } = require('hardhat');
const { createAuthMetadata, callPrivateTransfers, sleep } = require('./script/helpers');
const { createClient } = require('./test/qa/token_grpc');

/**
 * Step 1: Owner approves tokens for a spender
 */
async function approveTokensForSpender(numTokens) {
    const config = {
        grpcUrl: 'your-grpc-url:50051',
        l1RpcUrl: 'your-l1-rpc-url',
        tokenAddress: '0x...',
        ownerPrivateKey: '0x...',
        spenderAddress: '0x...',
    };

    const client = createClient(config.grpcUrl);
    const provider = new ethers.JsonRpcProvider(config.l1RpcUrl);
    const wallet = new ethers.Wallet(config.ownerPrivateKey, provider);

    console.log('=== Owner: Approving Tokens ===');
    console.log('Owner:', wallet.address);
    console.log('Spender:', config.spenderAddress);
    console.log('Tokens to approve:', numTokens);

    // Generate approval request
    const approveRequest = {
        sc_address: config.tokenAddress,
        token_type: '0',
        from_address: wallet.address,
        spender_address: config.spenderAddress,
        to_address: config.spenderAddress,  // Tokens go to spender
        amount: numTokens,
    };

    const metadata = await createAuthMetadata(config.ownerPrivateKey);

    console.log('\n[1/2] Generating approval proof...');
    const approveResponse = await client.generateApproveProof(approveRequest, metadata);

    await client.waitForActionCompletion(
        client.getTokenActionStatus,
        approveResponse.request_id,
        metadata
    );

    console.log('Approval proof generated!');
    console.log('Approved Token ID:', approveResponse.transfer_token_id);

    // Execute the approval
    console.log('\n[2/2] Executing approval on-chain...');

    const approvedTokenId = ethers.toBigInt(approveResponse.transfer_token_id);
    const tokenIds = Array.from(
        { length: numTokens },
        (_, i) => approvedTokenId + BigInt(i)
    );

    const receipt = await callPrivateTransfers(
        wallet,
        config.tokenAddress,
        tokenIds
    );

    console.log('\n✅ Approval successful!');
    console.log('Approved Token IDs:', tokenIds.map(id => ethers.toHexString(id)));
    console.log('Transaction Hash:', receipt.hash);

    return tokenIds;
}
```

### Spender: Use Approval (TransferFrom)

```javascript
/**
 * Step 2: Spender transfers approved tokens
 */
async function spendApprovedTokens(approvedTokenIds) {
    const config = {
        l1RpcUrl: 'your-l1-rpc-url',
        tokenAddress: '0x...',
        spenderPrivateKey: '0x...',
        ownerAddress: '0x...',  // Who approved the tokens
        recipientAddress: '0x...',
    };

    const provider = new ethers.JsonRpcProvider(config.l1RpcUrl);
    const spenderWallet = new ethers.Wallet(config.spenderPrivateKey, provider);

    console.log('\n=== Spender: Using Approval ===');
    console.log('Spender:', spenderWallet.address);
    console.log('From (Owner):', config.ownerAddress);
    console.log('To (Recipient):', config.recipientAddress);

    console.log('\n[1/1] Executing TransferFrom...');

    const receipt = await callPrivateTransferFroms(
        spenderWallet,
        config.tokenAddress,
        config.ownerAddress,           // Tokens belong to owner
        config.recipientAddress,      // Send to recipient
        approvedTokenIds              // Use approved tokens
    );

    console.log('\n✅ TransferFrom successful!');
    console.log('Tokens transferred:', approvedTokenIds.length);
    console.log('Transaction Hash:', receipt.hash);
}
```

### Complete Flow

```javascript
/**
 * Complete Approval + TransferFrom Flow
 */
async function completeApprovalFlow() {
    // Step 1: Owner approves 3 tokens
    const approvedTokenIds = await approveTokensForSpender(3);

    // Wait for chain confirmation
    await sleep(5000);

    // Step 2: Spender uses the approval
    await spendApprovedTokens(approvedTokenIds);
}

completeApprovalFlow()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Error:', error.message);
        process.exit(1);
    });
```

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  Approval Flow                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Owner (0xABC)                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 1. generateApproveProof()                            │   │
│  │    - Specifies spender address                       │   │
│  │    - Specifies token amount                          │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  gRPC Server                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 2. Generate approval proof                           │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                    │
│                         ▼                                    │
│  Blockchain                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 3. privateTransfers() → spender gets tokens        │   │
│  │    Token now belongs to spender                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 TransferFrom Flow                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Spender (now owns the tokens)                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 4. privateTransferFroms()                            │   │
│  │    - from: owner                                    │   │
│  │    - to: recipient                                  │   │
│  │    - tokenIds: approved IDs                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Query Approved Tokens

```javascript
const { getApproveTokenList } = require('./script/helpers');

// Check which tokens have been approved to a spender
const approvedTokens = await getApproveTokenList(
    client,
    ownerAddress,
    tokenContractAddress,
    spenderAddress,
    metadata
);

console.log('Approved tokens:', approvedTokens);
```

## Expected Output

```
=== Owner: Approving Tokens ===
Owner: 0xABC...
Spender: 0xDEF...
Tokens to approve: 3

[1/2] Generating approval proof...
Approval proof generated!
Approved Token ID: 0x200

[2/2] Executing approval on-chain...

✅ Approval successful!
Approved Token IDs: ['0x200', '0x201', '0x202']
Transaction Hash: 0x111...

=== Spender: Using Approval ===
Spender: 0xDEF...
From (Owner): 0xABC...
To (Recipient): 0x789...

[1/1] Executing TransferFrom...

✅ TransferFrom successful!
Tokens transferred: 3
Transaction Hash: 0x222...
```

## Next Steps

- [API Reference](/docs/api/grpc-api) - Full API details
- [Burn Tokens](/docs/how-tos/burn) - Burn approved tokens
