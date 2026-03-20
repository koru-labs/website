---
title: UTXO Model
---

# UTXO Model

Unlike traditional ERC20 tokens that use an **account-based model** (balance tracking), UCL uses the **UTXO (Unspent Transaction Output) model**.

## Account vs UTXO

### ERC20 (Account Model)

```solidity
// Traditional ERC20
mapping(address => uint256) public balanceOf;

function transfer(address to, uint256 amount) {
    balanceOf[msg.sender] -= amount;
    balanceOf[to] += amount;
}
```

- One address = one balance
- `balanceOf(address)` returns total amount
- Transfer is a simple number operation

### UCL (UTXO Model)

```
Token ID 1 ──→ Owner: Alice
Token ID 2 ──→ Owner: Alice
Token ID 3 ──→ Owner: Bob
```

- Each token is unique (like NFT)
- Each Token ID = 1 unit
- Transfer requires token ownership transfer

## Key Differences

| Feature | ERC20 | UCL Private Token |
|---------|-------|------------------|
| Token Model | Account-based | UTXO |
| Token ID | No (fungible) | Yes (unique) |
| Transfer | `transfer(amount)` | Split + Transfer |
| Amount | Any number | 1 per Token ID |
| Privacy | None | Zero-Knowledge Proofs |

## What This Means

### For Transfers

In ERC20:
```javascript
await token.transfer(recipient, 100);  // Transfer 100 tokens
```

In UCL:
```javascript
// Step 1: Split tokens (create transfer tokens)
const response = await client.generateSplitToken({
    from_address: sender,
    to_address: recipient,
    amount: 100,  // Split into 100 tokens
});

// Step 2: Execute transfer
await contract.privateTransfers(tokenIds);
```

### For Balances

In ERC20:
```javascript
const balance = await token.balanceOf(address);
```

In UCL:
```javascript
// Query total token count (not sum of amounts)
const balance = await getPrivateBalance(client, address, contractAddress);
```

## Advantages of UTXO

1. **Granular Control**: Each token can be tracked individually
2. **Better Privacy**: Zero-knowledge proofs per token
3. **Audit Trail**: Each token has a unique history
4. **Parallel Processing**: Multiple tokens can be processed independently

## Next Steps

- [Zero-Knowledge Proofs](/docs/core-concepts/zk-proof) - How privacy works
- [pToken](/docs/core-concepts/ptoken) - Our token implementation
