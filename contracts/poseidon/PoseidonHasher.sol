// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PoseidonNeptuneU2bn256.sol";

library PoseidonU2bn256Hasher {
    uint256 constant modulus = 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001;

    function hash2(bytes32 input0, bytes32 input1) public pure returns (bytes32) {
        PoseidonU2bn256.HashInputs3 memory state = PoseidonU2bn256.HashInputs3(3, uint256(input0), uint256(input1));
        return bytes32(PoseidonU2bn256.hash(state, modulus));
    }

    function hash3(bytes32 input0, bytes32 input1, bytes32 input2) external pure returns (bytes32) {
        PoseidonU2bn256.HashInputs3 memory state = PoseidonU2bn256.HashInputs3(0, uint256(input0), uint256(input1));

        state.t1 = PoseidonU2bn256.hash(state, modulus);

        state.t0 = 0;
        state.t2 = uint256(input2);
        state.t1 = PoseidonU2bn256.hash(state, modulus);

        return bytes32(state.t1);
    }

    function hash4(bytes32 input0, bytes32 input1, bytes32 input2, bytes32 input3) external pure returns (bytes32) {
        PoseidonU2bn256.HashInputs3 memory state = PoseidonU2bn256.HashInputs3(0, uint256(input0), uint256(input1));

        state.t1 = PoseidonU2bn256.hash(state, modulus);

        state.t0 = 0;
        state.t2 = uint256(input2);
        state.t1 = PoseidonU2bn256.hash(state, modulus);

        state.t0 = 0;
        state.t2 = uint256(input3);
        state.t1 = PoseidonU2bn256.hash(state, modulus);

        return bytes32(state.t1);
    }


    // accumulate hash a list of bytes32
    function hasha(uint256[] memory inputs) public pure returns (uint256) {
        require(inputs.length > 1, "PoseidonHasher: invalid input count");
        PoseidonU2bn256.HashInputs3 memory state;
        state.t1 = inputs[0];
        for (uint i = 1; i < inputs.length; i ++) {
            state.t0 = 3;
            state.t2 = inputs[i];
            state.t1 = PoseidonU2bn256.hash(state, modulus);
        }
        
        return state.t1;
    }

    function hash2a(uint256 input0, uint256 input1) public pure returns (uint256) {
        PoseidonU2bn256.HashInputs3 memory state = PoseidonU2bn256.HashInputs3(3, input0, input1);
        return PoseidonU2bn256.hash(state, modulus);
    }
}
