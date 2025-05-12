// SPDX-License-Identifier: license.pdf
pragma solidity >=0.8.25;

import "./compressed.sol";

    struct ZKProof {
        bytes data;
    }

library ZkVerifier {
    function verify(ZKProof calldata proof) external view returns (uint, Fr[] memory, Fr[] memory) {
        // NOTE: We won't use `proof` directly, but we will use its data through pointer `ptr`
        CompressedSNARK memory snark;
        CompressedSNARKVerifierKey memory vk;
        uint num_steps;
        Fr[] memory z0;
        Fr[] memory zn;

        uint proof_length;
        uint ptr = 4 + 0x60;
        assembly("memory-safe"){
            proof_length := calldataload(add(4, 0x40))
        }
        ptr = snark.deserialize(ptr);
        ptr = vk.deserialize(ptr);
        (num_steps, ptr) = deserialize_uint64(ptr);

        uint length;
        (length, ptr) = deserialize_uint64(ptr);
        z0 = new Fr[](length);
        for (uint i = 0; i < length; i++) {
            (z0[i], ptr) = FrLib.deserialize(ptr);
        }

        (length, ptr) = deserialize_uint64(ptr);
        zn = new Fr[](length);
        for (uint i = 0; i < length; i++) {
            (zn[i], ptr) = FrLib.deserialize(ptr);
        }

        require(ptr == 4 + 0x60 + proof_length, "Serialized zk-Proof Invalid");

        snark.verify(vk, num_steps, z0, zn); // revert on verify failure

        return (num_steps, z0, zn);
    }

}
