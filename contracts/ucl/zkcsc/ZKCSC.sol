// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../circle/base/IPrivateERCToken.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract ZKCSC is ReentrancyGuard {
    using ECDSA for bytes32;

    struct PrivateTransferFromRequest {
        address from;
        address to;
        address tokenAddress;
        uint256 tokenId;
        bytes signature;
    }

    struct PrivateBurnRequest {
        address from;
        address tokenAddress;
        uint256 tokenId;
        bytes signature;
    }

    event DVPExecuted(bytes32 indexed bundleHash, address indexed relayer, uint256 totalTransfers);
    event DVPCanceled(bytes32 indexed bundleHash, address indexed relayer, uint256 totalTransfers);
    event ApprovalRevoked(bytes32 indexed bundleHash, address indexed from, address indexed tokenAddress, uint256 tokenId, bool success);

    mapping(bytes32 => bool) public bundleExecuted;

    function executeDVP(
        bytes32 bundleHash,
        PrivateTransferFromRequest[] calldata transferFromRequests,
        PrivateBurnRequest[] calldata burnRequests
    ) external nonReentrant {
        uint256 totalTransferFroms = transferFromRequests.length;
        uint256 totalBurns = burnRequests.length;
        uint256 totalOps = totalTransferFroms + totalBurns;
        
        require(totalOps > 0, "DVP: No operations provided");
        require(!bundleExecuted[bundleHash], "DVP: Bundle already executed");
        bundleExecuted[bundleHash] = true;

        address signer;

        // Process transferFrom requests
        for (uint256 i = 0; i < totalTransferFroms; i++) {
            PrivateTransferFromRequest calldata req = transferFromRequests[i];

            // Verify signature
            bytes32 chunkHash = _hashTransferFrom(bundleHash, req);
            try this.recoverSigner(chunkHash, req.signature) returns (address recovered) {
                signer = recovered;
            } catch {
                revert("DVP: Invalid signature for transferFrom");
            }

            require(signer == req.from, "DVP: Signature not from 'from' address for transferFrom");

            // Execute transferFrom using batch interface with single token
            uint256[] memory tokenIds = new uint256[](1);
            tokenIds[0] = req.tokenId;
            IPrivateERCToken(req.tokenAddress).privateTransferFromBatch(tokenIds, req.from, req.to);
        }

        // Process burn requests
        for (uint256 i = 0; i < totalBurns; i++) {
            PrivateBurnRequest calldata req = burnRequests[i];
            
            // Verify signature
            bytes32 chunkHash = _hashBurn(bundleHash, req);
            try this.recoverSigner(chunkHash, req.signature) returns (address recovered) {
                signer = recovered;
            } catch {
                revert("DVP: Invalid signature for burn");
            }
            
            require(signer == req.from, "DVP: Signature not from 'from' address for burn");

            // Execute burn from (burn on behalf of the token owner)
            uint256[] memory tokenIds = new uint256[](1);
            tokenIds[0] = req.tokenId;
            IPrivateERCToken(req.tokenAddress).privateBurnFromBatch(req.from, tokenIds);
        }

        emit DVPExecuted(bundleHash, msg.sender, totalOps);
    }

    function cancelDVP(
        bytes32 bundleHash,
        PrivateTransferFromRequest[] calldata transferFromRequests,
        PrivateBurnRequest[] calldata burnRequests
    ) external nonReentrant {
        uint256 totalTransferFroms = transferFromRequests.length;
        uint256 totalBurns = burnRequests.length;
        uint256 totalOps = totalTransferFroms + totalBurns;
        
        require(totalOps > 0, "DVP: No operations provided");
        require(!bundleExecuted[bundleHash], "DVP: Bundle already executed");
        bundleExecuted[bundleHash] = true;

        address signer;

        for (uint256 i = 0; i < totalTransferFroms; i++) {
            PrivateTransferFromRequest calldata req = transferFromRequests[i];
            
            // Verify signature
            bytes32 chunkHash = _hashTransferFrom(bundleHash, req);
            try this.recoverSigner(chunkHash, req.signature) returns (address recovered) {
                signer = recovered;
            } catch {
                revert("DVP: Invalid signature for transferFrom");
            }
            
            require(signer == req.from, "DVP: Signature not from 'from' address for transferFrom");
            
            // Revoke approval
            bool success = _revokeApproval(req.tokenAddress, req.from, req.tokenId);
            emit ApprovalRevoked(bundleHash, req.from, req.tokenAddress, req.tokenId, success);
        }

        for (uint256 i = 0; i < totalBurns; i++) {
            PrivateBurnRequest calldata req = burnRequests[i];
            
            // Verify signature
            bytes32 chunkHash = _hashBurn(bundleHash, req);
            try this.recoverSigner(chunkHash, req.signature) returns (address recovered) {
                signer = recovered;
            } catch {
                revert("DVP: Invalid signature for burn");
            }
            
            require(signer == req.from, "DVP: Signature not from 'from' address for burn");
        }

        emit DVPCanceled(bundleHash, msg.sender, totalOps);
    }

    function _revokeApproval(address tokenAddress, address from, uint256 tokenId) internal returns (bool) {
        try IPrivateERCToken(tokenAddress).privateRevokeApprovalFrom(from, tokenId) {
            return true;
        } catch {
            return false;
        }
    }

    function recoverSigner(bytes32 chunkHash, bytes calldata signature) external pure returns (address) {
        return chunkHash.toEthSignedMessageHash().recover(signature);
    }

    function _hashTransferFrom(bytes32 bundleHash, PrivateTransferFromRequest calldata req) internal pure returns (bytes32) {
        return keccak256(abi.encode(bundleHash, req.from, req.to, req.tokenAddress, req.tokenId));
    }

    function _hashBurn(bytes32 bundleHash, PrivateBurnRequest calldata req) internal pure returns (bytes32) {
        return keccak256(abi.encode(bundleHash, req.from, req.tokenAddress, req.tokenId));
    }

    function hasBundleExecuted(bytes32 bundleHash) external view returns (bool) {
        return bundleExecuted[bundleHash];
    }
}
