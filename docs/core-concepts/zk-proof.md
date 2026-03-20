---
title: Zero-Knowledge Proofs
---

# Zero-Knowledge Proofs

UCL uses **Zero-Knowledge Proofs (ZKP)** to ensure transaction privacy while maintaining verifiability.

## What is ZKP?

Zero-Knowledge Proofs allow one party (the prover) to prove to another party (the verifier) that a statement is true, without revealing any information beyond the validity of the statement itself.

### Simple Analogy

**The Alibaba Cave Example:**

> Imagine a circular cave with a door inside. Alice knows the secret phrase to open the door. She wants to prove to Bob she knows the phrase without revealing it.

> Alice walks into the cave and comes out from the other side. Bob never sees the phrase, but is convinced Alice knows it.

## How UCL Uses ZKP

### Transaction Privacy

When you transfer tokens:

1. **Generate Proof**: gRPC server generates a ZKP that proves:
   - You own the tokens
   - The transaction is valid
   - No double-spending occurs

2. **On-Chain Verification**: The contract verifies the proof without knowing:
   - Who sent the tokens
   - Who received the tokens
   - How many tokens (in aggregate)

### What is Public vs Private

| Information | Public? | Private? |
|------------|---------|---------|
| Transaction exists | ✓ | |
| Token ID | | ✓ |
| Owner address | | ✓ |
| Amount | | ✓ |
| Transaction history | | ✓ |

## Workflow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Client     │────▶│  gRPC Server │────▶│  Blockchain  │
│              │     │              │     │              │
│ - Create     │     │ - Generate  │     │ - Verify     │
│   Request    │     │   ZK Proof   │     │   Proof      │
│              │     │              │     │ - Execute    │
└──────────────┘     └──────────────┘     └──────────────┘
```

## Benefits

1. **Privacy**: Transaction details are hidden
2. **Security**: Mathematical proof of validity
3. **Scalability**: Proof verification is efficient
4. **Compliance**: Can be audited without revealing data

## Technical Details

UCL uses zkSNARKs (Zero-Knowledge Succinct Non-Interactive Arguments of Knowledge):

- **Non-interactive**: No back-and-forth communication
- **Succinct**: Proofs are small and fast to verify
- **Soundness**: Cannot prove false statements
- **Zero-knowledge**: Reveals nothing beyond validity

## Next Steps

- [pToken](/docs/core-concepts/ptoken) - Our token implementation
- [Setup Guide](/docs/how-tos/setup) - Start building
