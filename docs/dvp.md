---
title: DvP (Delivery versus Payment)
---

# DvP (Delivery versus Payment)

This chapter explains how to implement **DvP** with your existing `pToken` and `ZKCSC` contracts.

## What DvP Means Here

In this project, DvP means bundling token delivery and settlement actions into one on-chain transaction through `ZKCSC`, so either the whole bundle is accepted or the transaction reverts.

The implementation supports:

- `transferFrom` legs (cross-delivery between parties)
- optional `burnFrom` legs (for settlement, cancellation, or supply reduction scenarios)

## Contracts and Methods

### ZKCSC entrypoints

`contracts/ucl/zkcsc/ZKCSC.sol`:

```solidity
function executeDVP(
    bytes32 bundleHash,
    PrivateTransferFromRequest[] calldata transferFromRequests,
    PrivateBurnRequest[] calldata burnRequests
) external;

function cancelDVP(
    bytes32 bundleHash,
    PrivateTransferFromRequest[] calldata transferFromRequests,
    PrivateBurnRequest[] calldata burnRequests
) external;
```

### pToken methods used by ZKCSC

`contracts/ucl/circle/base/IPrivateTokenApproval.sol`:

```solidity
function privateTransferFroms(uint256[] calldata tokenIds, address from, address to) external returns (bool);
function privateBurnFroms(address from, uint256[] calldata allowanceTokenIds) external;
function privateRevokeApprovalFrom(address owner, uint256 allowanceTokenId) external;
```

## End-to-End DvP Flow

This matches the sequence in `test/mc/test_zkcsc.js`.

### 1. Prepare tokens

Mint tokens to each participant account (example helper: `mintForStart(...)`).

### 2. Approve allowance tokens for ZKCSC

Each side generates approval proof through gRPC and sets:

- `spender_address = ZKCSC.target`
- `to_address = counterparty` for transfer legs
- `to_address = self` for burn leg tests

Example pattern used in test script:

```javascript
const user1TokenId = await approveTokens(tokenAddress1, user1Wallet, accounts.To1, ZKCSC.target, accounts.To2)
const user2TokenId = await approveTokens(tokenAddress2, user2Wallet, accounts.To2, ZKCSC.target, accounts.To1)
```

### 3. Agree a `bundleHash` off-chain

All participants and relayer use the same bundle id:

```javascript
const bundleHash = ethers.keccak256(ethers.toUtf8Bytes('DVP-BUNDLE-WITH-BURN'))
```

### 4. Sign each operation hash

For transfer leg:

```text
keccak256(abi.encode(bundleHash, from, to, tokenAddress, tokenId))
```

For burn leg:

```text
keccak256(abi.encode(bundleHash, from, tokenAddress, tokenId))
```

In test code this is signed with:

```javascript
await wallet.signMessage(ethers.getBytes(chunkHash))
```

`ZKCSC` verifies with:

```solidity
chunkHash.toEthSignedMessageHash().recover(signature)
```

### 5. Relayer submits one `executeDVP(...)`

`ZKCSC` verifies all signatures and executes:

- `privateTransferFroms([tokenId], from, to)` for transfer requests
- `privateBurnFroms(from, [tokenId])` for burn requests

If any inner call reverts, the whole transaction reverts.

### 6. Observe execution event

Successful execution emits:

```solidity
event DVPExecuted(bytes32 indexed bundleHash, address indexed relayer, uint256 totalTransfers);
```

`totalTransfers` is total operations (`transferFromRequests.length + burnRequests.length`).

## Cancel Flow

`cancelDVP(...)` is used when the bundle should not be settled.

For each transfer request, ZKCSC tries:

```solidity
privateRevokeApprovalFrom(from, tokenId)
```

and emits:

```solidity
event ApprovalRevoked(bytes32 indexed bundleHash, address indexed from, address indexed tokenAddress, uint256 tokenId, bool success);
```

Then emits:

```solidity
event DVPCanceled(bytes32 indexed bundleHash, address indexed relayer, uint256 totalTransfers);
```

## Important Constraints

- Bundle can be used once only: `bundleExecuted[bundleHash]` is set in both `executeDVP` and `cancelDVP`.
- `req.from` must be the actual signer for each request.
- At least one operation is required (`No operations provided` if empty).
- `tokenId` must be a valid allowance token in pToken.
- Token contract pause/blacklist rules still apply.

## Run the Example

The reference script is:

- `test/mc/test_zkcsc.js`

Typical run command:

```bash
npx hardhat run test/mc/test_zkcsc.js --network ucl_L2_dev
```

The script includes:

- normal DvP flow
- mixed `transferFrom + burn` flow
- cancel flow
- failure cases (invalid signature, re-execute bundle, etc.)

## Related Docs

- [Transfer Tokens](/docs/how-tos/transfer)
- [Approve Tokens](/docs/how-tos/approve)
- [Burn Tokens](/docs/how-tos/burn)
- [Contract Methods](/docs/api/contract-methods)
