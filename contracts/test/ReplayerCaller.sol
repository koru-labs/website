// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IZKCSC {
    function executeDVP(
        bytes32 bundleHash,
        bytes32[] calldata chunkHashes,
        address[] calldata froms,
        address[] calldata tos,
        address[] calldata tokenAddresses,
        uint256[] calldata tokenIds,
        bytes[] calldata signatures
    ) external;

    function cancelDVP(
        bytes32 bundleHash,
        bytes32[] calldata chunkHashes,
        address[] calldata froms,
        address[] calldata tos,
        address[] calldata tokenAddresses,
        uint256[] calldata tokenIds,
        bytes[] calldata signatures
    ) external;
}

contract RelayerCaller {
    address public owner;
    IZKCSC public zkcsc;

    event CalledExecute(address caller, bytes32 bundleHash);
    event CalledCancel(address caller, bytes32 bundleHash);

    constructor(address _zkcsc) {
        owner = msg.sender;
        zkcsc = IZKCSC(_zkcsc);
    }

    // forward call to ZKCSC.executeDVP
    function callExecuteDVP(
        bytes32 bundleHash,
        bytes32[] calldata chunkHashes,
        address[] calldata froms,
        address[] calldata tos,
        address[] calldata tokenAddresses,
        uint256[] calldata tokenIds,
        bytes[] calldata signatures
    ) external {
        zkcsc.executeDVP(bundleHash, chunkHashes, froms, tos, tokenAddresses, tokenIds, signatures);
        emit CalledExecute(msg.sender, bundleHash);
    }

    // forward call to ZKCSC.cancelDVP
    function callCancelDVP(
        bytes32 bundleHash,
        bytes32[] calldata chunkHashes,
        address[] calldata froms,
        address[] calldata tos,
        address[] calldata tokenAddresses,
        uint256[] calldata tokenIds,
        bytes[] calldata signatures
    ) external {
        zkcsc.cancelDVP(bundleHash, chunkHashes, froms, tos, tokenAddresses, tokenIds, signatures);
        emit CalledCancel(msg.sender, bundleHash);
    }
}
