// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title TokenModel
 * @dev Token data structures for native token operations
 */
library TokenModel {
    enum TokenStatus {
        deleted,
        inactive,
        active,
        locked
    }

    struct ElGamal {
        uint256 cl_x;
        uint256 cl_y;
        uint256 cr_x;
        uint256 cr_y;
    }

    struct TokenEntity {
        uint256 id;
        address owner;
        TokenStatus status; 
        ElGamal amount;
        address to;
        uint256 rollbackTokenId;
    }

    struct ElGamalToken {
        uint256 id;
        ElGamal value;  // ElGamal value (composition)
    }
}

/**
 * @title INativeToken
 * @dev Interface for native token operations - used for ABI generation
 */
interface INativeToken {
    /**
     * @dev Mint new tokens with ZKP proof
     * @param recipients List of recipient addresses
     * @param tokens New token entities to create
     * @param newAllowed Updated ElGamal authorization info
     * @param proof ZKP proof (8 elements)
     * @param publicInputs Public inputs for proof verification
     */
    function mint(
        address[] calldata recipients,
        TokenModel.TokenEntity[] memory tokens,
        TokenModel.ElGamalToken memory newAllowed,
        uint256[8] calldata proof,
        uint256[] calldata publicInputs
    ) external returns (bool);

    /**
     * @dev Split tokens into new tokens
     * @param from Source address
     * @param recipients List of recipient addresses
     * @param consumedIds Token IDs to consume
     * @param newTokens New token entities to create
     * @param proof ZKP proof (8 elements)
     * @param publicInputs Public inputs for proof verification
     */
    function split(
        address from,
        address[] calldata recipients,
        uint256[] memory consumedIds,
        TokenModel.TokenEntity[] calldata newTokens,
        uint256[8] calldata proof,
        uint256[] calldata publicInputs
    ) external returns (bool);

    /**
     * @dev Transfer a token to another address
     * @param tokenId Token ID to transfer
     * @param memo Transfer memo/note
     */
    function transfer(
        uint256 tokenId,
        string calldata memo
    ) external returns (bool);

    function getToken(address owner, uint256 tokenId) external view returns (TokenModel.TokenEntity memory);
}
