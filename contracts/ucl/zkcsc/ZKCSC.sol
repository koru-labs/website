// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../circle/base/IPrivateERCToken.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";


contract ZKCSC is ReentrancyGuard {
    using ECDSA for bytes32;

    event DVPExecuted(
        bytes32 indexed bundleHash,
        address indexed relayer,
        uint256 totalTransfers
    );

    event TransferFailed(
        bytes32 indexed bundleHash,
        address indexed token,
        uint256 indexed tokenId,
        address from,
        address to,
        string reason
    );

    mapping(bytes32 => bool) public bundleExecuted;

    function executeDVP(
        bytes32 bundleHash,
        bytes32[] calldata chunkHashes,
        address[] calldata froms,
        address[] calldata tos,
        address[] calldata tokenAddresses,
        uint256[] calldata tokenIds,
        bytes[] calldata signatures
    ) external nonReentrant {
        uint256 n = chunkHashes.length;
        require(n > 0, "DVP: No transfers provided");
        require(
            n == froms.length &&
            n == tos.length &&
            n == tokenAddresses.length &&
            n == tokenIds.length &&
            n == signatures.length,
            "DVP: Array length mismatch"
        );

        require(!bundleExecuted[bundleHash], "DVP: Bundle already executed");
        bundleExecuted[bundleHash] = true;

        bytes32 computedChunkHash;
        address signer;

        for (uint256 i = 0; i < n; i++) {
            computedChunkHash = _hashChunk(bundleHash, froms[i], tos[i], tokenAddresses[i], tokenIds[i]);
            require(computedChunkHash == chunkHashes[i], "DVP: Invalid chunkHash");

            try this.recoverSigner(chunkHashes[i], signatures[i]) returns (address recovered) {
                signer = recovered;
            } catch {
                emit TransferFailed(bundleHash, tokenAddresses[i], tokenIds[i], froms[i], tos[i], "Signature recovery failed");
                revert("DVP: Invalid signature");
            }

            require(signer == froms[i], "DVP: Signature not from 'from' address");

            try IPrivateERCToken(tokenAddresses[i]).privateTransferFrom(
                tokenIds[i],
                froms[i],
                tos[i]
            ) returns (bool success) {
                if (!success) {
                    emit TransferFailed(bundleHash, tokenAddresses[i], tokenIds[i], froms[i], tos[i], "privateTransferFrom returned false");
                    IPrivateERCToken(tokenAddresses[i]).privateRevokeApprovalFrom(froms[i], tokenIds[i]);
                    revert("DVP: Transfer failed");
                }
            } catch Error(string memory reason) {
                emit TransferFailed(bundleHash, tokenAddresses[i], tokenIds[i], froms[i], tos[i], string(abi.encodePacked("Transfer reverted: ", reason)));
                IPrivateERCToken(tokenAddresses[i]).privateRevokeApprovalFrom(froms[i], tokenIds[i]);
                revert("DVP: Transfer failed");
            } catch (bytes memory /*lowLevelData*/) {
                emit TransferFailed(bundleHash, tokenAddresses[i], tokenIds[i], froms[i], tos[i], "Unknown low-level transfer error");
                IPrivateERCToken(tokenAddresses[i]).privateRevokeApprovalFrom(froms[i], tokenIds[i]);
                revert("DVP: Transfer failed");
            }
        }

        emit DVPExecuted(bundleHash, msg.sender, n);
    }

    function recoverSigner(bytes32 chunkHash, bytes calldata signature) external pure returns (address) {
        return chunkHash.toEthSignedMessageHash().recover(signature);
    }

    function _hashChunk(
        bytes32 bundleHash,
        address from,
        address to,
        address tokenAddress,
        uint256 tokenId
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            bundleHash,
            from,
            to,
            tokenAddress,
            tokenId
        ));
    }

    function hasBundleExecuted(bytes32 bundleHash) external view returns (bool) {
        return bundleExecuted[bundleHash];
    }
}