---
title: Approve Tokens
---

# Approve Tokens

Approving allows a third party (spender) to transfer tokens on your behalf.

## How It Differs from ERC20

### ERC20
```solidity
function approve(address spender, uint256 amount) external;
```
- Approve an **amount**
- Spender can transfer up to that amount

### UCL
```javascript
// Approve specific token IDs
client.generateApproveProof(request, metadata);
```
- Approve specific **Token IDs**
- Each Token ID = 1 token unit

## Approval Process

Approval in UCL uses the **split mechanism** - you essentially "transfer" to the spender, creating an authorized token they can use.

```
gRPC: generateApproveProof() → Contract: privateTransfers()
```

## Step 1: Generate Approval Proof (gRPC)

```javascript
const { createAuthMetadata } = require('./script/helpers');

const approveRequest = {
    sc_address: tokenContractAddress,
    token_type: '0',
    from_address: ownerAddress,
    spender_address: spenderAddress,  // Who can use these tokens
    to_address: spenderAddress,        // Tokens go to spender
    amount: 1,                         // Number of tokens to approve
    comment: 'Approval for payment',
};

const metadata = await createAuthMetadata(ownerPrivateKey);
const grpcResponse = await client.generateApproveProof(approveRequest, metadata);

console.log('Approval Response:', grpcResponse);
// Returns: { request_id, transfer_token_id }

// Wait for processing
await client.waitForActionCompletion(
    client.getTokenActionStatus,
    grpcResponse.request_id,
    metadata
);
```

## Step 2: Execute Approval (Contract)

```javascript
const { callPrivateTransfers } = require('./script/helpers');

const approvedTokenId = ethers.toBigInt(grpcResponse.transfer_token_id);

const receipt = await callPrivateTransfers(
    ownerWallet,
    tokenContractAddress,
    [approvedTokenId]
);

console.log('Approval Transaction:', receipt.hash);
```

## Complete Example

```javascript
const { ethers } = require('hardhat');
const { createAuthMetadata, callPrivateTransfers } = require('./script/helpers');

async function approveSpender() {
    const provider = new ethers.JsonRpcProvider(L1Url);
    const ownerWallet = new ethers.Wallet(ownerPrivateKey, provider);
    const tokenAddress = '0x...';

    // Step 1: Generate approval proof
    const request = {
        sc_address: tokenAddress,
        token_type: '0',
        from_address: ownerWallet.address,
        spender_address: spenderAddress,
        to_address: spenderAddress,
        amount: 1,
    };

    const metadata = await createAuthMetadata(ownerPrivateKey);
    const response = await client.generateApproveProof(request, metadata);

    // Wait for processing
    await client.waitForActionCompletion(
        client.getTokenActionStatus,
        response.request_id,
        metadata
    );

    // Step 2: Execute approval
    const tokenId = ethers.toBigInt(response.transfer_token_id);
    const receipt = await callPrivateTransfers(ownerWallet, tokenAddress, [tokenId]);

    console.log(`Approved token for spender. Transaction: ${receipt.hash}`);
    console.log('Approved Token ID:', ethers.toHexString(tokenId));
}

approveSpender();
```

## Using the Approval (TransferFrom)

Once approved, the spender can transfer the tokens:

```javascript
const { callPrivateTransferFroms } = require('./script/helpers');

async function spendApprovedTokens() {
    const spenderWallet = new ethers.Wallet(spenderPrivateKey, provider);

    // Use the approved token ID
    const approvedTokenId = BigInt('0x...');

    const receipt = await callPrivateTransferFroms(
        spenderWallet,
        tokenContractAddress,
        ownerAddress,      // Token owner
        receiverAddress,   // Where to send
        [approvedTokenId]
    );

    console.log(`Transferred using approval. Transaction: ${receipt.hash}`);
}
```

## Query Approved Tokens

Check which tokens have been approved to a spender:

```javascript
const { getApproveTokenList } = require('./script/helpers');

const approvedTokens = await getApproveTokenList(
    client,
    ownerAddress,
    tokenContractAddress,
    spenderAddress,
    metadata
);

console.log('Approved tokens:', approvedTokens);
```

## Comparison with ERC20

| Feature | ERC20 | UCL |
|---------|-------|-----|
| Method | `approve(spender, amount)` | `generateApproveProof()` + `privateTransfers()` |
| Granularity | Amount | Token ID |
| Revocable | No (without special implementation) | Yes (using `privateRevokeApproval`) |

## Next Steps

- [TransferFrom](/docs/how-tos/transfer#using-the-approval) - Use approved tokens
- [Batch Operations](/docs/how-tos/batch-operations) - Handle multiple approvals
