---
title: Token Converter
---

# Token Converter

Token Converter supports bidirectional conversion between public USDC and private pUSDC.

## Actual Contract Methods

```solidity
convert2pUSDC(
    uint256 amount,
    TokenModel.TokenEntity entity,
    uint256[9] publicInputs,
    uint256[8] proof
)

convert2USDC(
    uint256 tokenId,
    uint256 amount,
    uint256[8] publicInputs,
    uint256[8] proof
)
```

## Prerequisites

- `PrivateUSDC` is deployed
- gRPC proof service is reachable (for example Node3)
- caller satisfies on-chain permission checks (`onlyAllowedBank`, not blacklisted, contract not paused)
- caller has enough public USDC before `convert2pUSDC`
- caller owns the target private token before `convert2USDC`

## End-to-End Runnable Example

This example performs:

1. `USDC -> pUSDC` (`convertToPUSDC` + `convert2pUSDC`)
2. `pUSDC -> USDC` (`convertToUSDC` + `convert2USDC`)

> Save this script as `test/sun/convert_e2e_example.js`, then run with Hardhat.

```javascript
const { ethers } = require('hardhat');
const accounts = require('../../deployments/account.json');
const { createClient } = require('../qa/token_grpc');
const { createAuthMetadata } = require('../help/testHelp');
const { getEnvironmentConfig, getImage9EnvironmentData } = require('../../script/deploy_help');

async function main() {
    const env = getEnvironmentConfig();
    const deployed = getImage9EnvironmentData();

    const node3 = env.institutions.find((i) => i.name === 'Node3');
    if (!node3) {
        throw new Error('Node3 institution not found in environment config');
    }

    const grpcUrl = node3.rpcUrl || 'localhost:50051';
    const client = createClient(grpcUrl);

    const wallet = new ethers.Wallet(accounts.MinterKey, ethers.provider);
    const contract = await ethers.getContractAt('PrivateUSDC', deployed.contracts.PrivateERCToken, wallet);
    const metadata = await createAuthMetadata(accounts.MinterKey);

    // 1 USDC when decimals = 6
    const amount = 1_000_000n;

    // Optional: ensure enough public USDC for convert2pUSDC
    const publicBalance = await contract.balanceOf(wallet.address);
    if (publicBalance < amount) {
        console.log('Public balance is insufficient, minting for test...');
        const mintTx = await contract.mint(wallet.address, amount);
        await mintTx.wait();
    }

    // ---------------------------
    // Step A: USDC -> pUSDC
    // ---------------------------
    const toPrivateProof = await client.convertToPUSDC(
        {
            amount: amount.toString(),
            sc_address: deployed.contracts.PrivateERCToken,
        },
        metadata
    );

    const encryptedAmount = {
        cl_x: ethers.toBigInt(toPrivateProof.elgamal.cl_x),
        cl_y: ethers.toBigInt(toPrivateProof.elgamal.cl_y),
        cr_x: ethers.toBigInt(toPrivateProof.elgamal.cr_x),
        cr_y: ethers.toBigInt(toPrivateProof.elgamal.cr_y),
    };

    // TokenModel.TokenStatus.active = 2
    // TokenModel.TokenType.converted = 4
    const tokenEntity = {
        id: ethers.toBigInt(toPrivateProof.token_id),
        owner: wallet.address,
        status: 2,
        amount: encryptedAmount,
        to: wallet.address,
        rollbackTokenId: 0n,
        tokenType: 4,
    };

    const proof1 = toPrivateProof.proof.map((x) => ethers.toBigInt(x));
    const publicInputs1 = toPrivateProof.input.map((x) => ethers.toBigInt(x));

    if (proof1.length !== 8) {
        throw new Error(`convert2pUSDC proof length must be 8, got ${proof1.length}`);
    }
    if (publicInputs1.length !== 9) {
        throw new Error(`convert2pUSDC publicInputs length must be 9, got ${publicInputs1.length}`);
    }

    const tx1 = await contract.convert2pUSDC(amount, tokenEntity, publicInputs1, proof1);
    await tx1.wait();
    console.log(`convert2pUSDC success: ${tx1.hash}`);

    // ---------------------------
    // Step B: pUSDC -> USDC
    // ---------------------------
    const toPublicProof = await client.convertToUSDC(
        {
            token_id: toPrivateProof.token_id,
            sc_address: deployed.contracts.PrivateERCToken,
        },
        metadata
    );

    const proof2 = toPublicProof.proof.map((x) => ethers.toBigInt(x));
    const publicInputs2 = toPublicProof.input.map((x) => ethers.toBigInt(x));

    if (proof2.length !== 8) {
        throw new Error(`convert2USDC proof length must be 8, got ${proof2.length}`);
    }
    if (publicInputs2.length !== 8) {
        throw new Error(`convert2USDC publicInputs length must be 8, got ${publicInputs2.length}`);
    }

    const tx2 = await contract.convert2USDC(
        ethers.toBigInt(toPrivateProof.token_id),
        ethers.toBigInt(toPublicProof.amount),
        publicInputs2,
        proof2
    );
    await tx2.wait();
    console.log(`convert2USDC success: ${tx2.hash}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
```

## Run

```bash
npx hardhat run test/sun/convert_e2e_example.js --network <your-network>
```

## Notes

- gRPC methods are `convertToPUSDC` and `convertToUSDC`.
- gRPC response fields are `proof` and `input` (not `publicInputs`).
- `convert2pUSDC` requires a full `TokenEntity` object; build it from gRPC response + caller address.
- If the caller does not meet permission checks, conversion will revert.

## Next Steps

- [pToken](/docs/core-concepts/ptoken)
- [Mint Tutorial](/docs/how-tos/mint)
- [Transfer Tutorial](/docs/how-tos/transfer)
