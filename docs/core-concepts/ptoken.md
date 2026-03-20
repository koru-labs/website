---
title: pToken
---

# pToken (Privacy Token)

pToken is UCL's implementation of a privacy-preserving token. It's similar to ERC20 but with enhanced privacy features.

## Comparison with ERC20

| Feature | ERC20 | pToken |
|---------|-------|--------|
| Standard | ERC-20 | Custom (Privacy) |
| Transfer Model | Account-based | UTXO-based |
| Transfer Method | `transfer()` | Split + Transfer |
| Privacy | None | Zero-Knowledge Proofs |
| Token ID | No | Yes (unique) |
| Denomination | Any amount | 1 per Token ID |

## Token Properties

### Fungibility

While each pToken has a unique ID, they remain **fungible** because:
- All tokens have equal value (1 unit each)
- Any token can be exchanged for any other
- Privacy ensures tokens cannot be traced

### Privacy Features

1. **Sender Privacy**: Recipient address is hidden
2. **Recipient Privacy**: Sender cannot see balance
3. **Amount Privacy**: Transfer amounts are encrypted
4. **History Privacy**: Transaction history is unlinkable

## Token Lifecycle

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  Mint   │────▶│  Hold   │────▶│ Transfer │────▶│  Burn   │
└─────────┘     └─────────┘     └─────────┘     └─────────┘
                   │               │
                   │               ▼
                   │          ┌─────────┐
                   │          │ Approve │
                   │          └─────────┘
                   │               │
                   └───────────────┘
```

### Mint

New tokens are created by authorized minters:
```javascript
const response = await client.generateMintProof(request, metadata);
await contract.privateMint(..., response.proof);
```

### Transfer

Tokens are transferred using split mechanism:
```javascript
const response = await client.generateSplitToken(request, metadata);
await contract.privateTransfers(tokenIds);
```

### Approve

Authorization uses the same split mechanism:
```javascript
// Approving creates a transfer token that the spender can use
const response = await client.generateApproveProof(request, metadata);
await contract.privateTransfers([tokenId]);
```

### Burn

Tokens are permanently destroyed:
```javascript
await contract.privateBurns(tokenIds);
```

## Integration with Ethereum

pToken is deployed on the EVM and can interact with:

- **Other Smart Contracts**: DeFi integrations
- **Wallets**: MetaMask, hardware wallets
- **Explorers**: Transaction verification
- **Standards**: Metadata, URI support

## Next Steps

- [Setup Guide](/docs/how-tos/setup) - Configure your environment
- [Mint Tutorial](/docs/how-tos/mint) - Create your first tokens
- [Transfer Tutorial](/docs/how-tos/transfer) - Transfer tokens
