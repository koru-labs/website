// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {PoseidonHasher} from "../util/PoseidonHasher.sol";

library HashChain {
    function verifyReceipt(bytes32 state, bytes32[] memory proofs) public pure{
        require(proofs.length > 1, "HashChain: invalid proof length");
        require((proofs.length - 1) % 2 == 0, "HashChain: invalid proof");

        bytes32 target = proofs[0];
        for (uint i = 1; i < proofs.length; i += 2) {
            bytes32 _hash = PoseidonHasher.hash2(proofs[i], proofs[i+1]);
            target = PoseidonHasher.hash2(target, _hash);
        }

        require(target == state, "HashChain: verify failed");
    }
}