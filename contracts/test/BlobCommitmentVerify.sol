// SPDX-License-Identifier: MIT
// EVM VERSION: cancun
// Enable optimization: 2000000
pragma solidity ^0.8.24;

contract BlobCommitmentVerify {
    address private constant POINT_EVALUATION_PRECOMPILE_ADDRESS = 0x000000000000000000000000000000000000000A;
    uint256 private constant BLS_MODULUS = 52435875175126190479447740508185965837690552500527637822603658699938581184513;
    uint256 private constant HASH_OPCODE_BYTE = 0x49;

    event ProofVerificationSuccess(bytes32 indexed versionedHash, uint256 indexed point, bytes32 indexed claim);
    event ProofVerificationFailure(bytes32 indexed versionedHash, uint256 indexed point, bytes32 indexed claim);

    function verifyProofAndEmitEvent(
        bytes32 claim,
        bytes memory commitment,
        bytes memory proof
    ) external {
        require(commitment.length == 48, "Commitment must be 48 bytes");
        require(proof.length == 48, "Proof must be 48 bytes");

        bytes32 versionedHash = blobhash(0);

        // Compute random challenge point.
        uint256 point = uint256(keccak256(abi.encodePacked(versionedHash))) % BLS_MODULUS;

        bytes memory pointEvaluationCalldata = abi.encodePacked(
            versionedHash,
            point,
            claim,
            commitment,
            proof
        );

        (bool success,) = POINT_EVALUATION_PRECOMPILE_ADDRESS.staticcall(pointEvaluationCalldata);

        if (success) {
            emit ProofVerificationSuccess(versionedHash, point, claim);
        } else {
            emit ProofVerificationFailure(versionedHash, point, claim);
        }
    }
}