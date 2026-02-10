// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

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

// /**
//  * @title IL2Event
//  * @dev Interface for L2Event contract events
//  */
// interface IL2Event {
//     // Generic event container for token events
//     event EventReceived(
//         string eventId,
//         address eventSource,
//         address eventAccount,
//         string topic,
//         bytes eventBody
//     );

//     // Generic event container for rollup events
//     event RollupEventReceived(
//         string eventId,
//         address eventSource,
//         string topic,
//         bytes eventBody
//     );
// }

/**
 * @title INativeToken
 * @dev Interface for native token operations - used for ABI generation
 * 
 * Events emitted via L2Event contract:
 * - Mint: TokenMintAllowedUpdated (EventReceived), TokenMinted (EventReceived)
 * - Split: TokenDeleted (EventReceived), RollupSplit (RollupEventReceived)
 * - Transfer: RollupTransfer (RollupEventReceived)
 */
interface INativeToken {
    /**
     * @dev Mint new tokens with ZKP proof
     * @param recipients List of recipient addresses
     * @param tokens New token entities to create
     * @param newAllowed Updated ElGamal authorization info
     * @param proof ZKP proof (8 elements)
     * @param publicInputs Public inputs for proof verification
     * @param paddingNum Number of dummy values to pad in publicInputs
     */
    function mint(
        address[] calldata recipients,
        TokenModel.TokenEntity[] memory tokens,
        TokenModel.ElGamalToken memory newAllowed,
        uint256[8] calldata proof,
        uint256[] calldata publicInputs,
        uint256 paddingNum
    ) external returns (bool);

    /**
     * @dev Split tokens into new tokens
     * @param from Source address
     * @param recipients List of recipient addresses
     * @param consumedIds Token IDs to consume
     * @param newTokens New token entities to create
     * @param proof ZKP proof (8 elements)
     * @param publicInputs Public inputs for proof verification
     * @param paddingNum Number of dummy values to pad in publicInputs
     */
    function split(
        address from,
        address[] calldata recipients,
        uint256[] memory consumedIds,
        TokenModel.TokenEntity[] calldata newTokens,
        uint256[8] calldata proof,
        uint256[] calldata publicInputs,
        uint256 paddingNum
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

    /**
     * @dev Get a token by owner and token ID
     * @param owner Owner address
     * @param tokenId Token ID
     */
    function getToken(
        address owner,
        uint256 tokenId
    ) external view returns (TokenModel.TokenEntity memory);

    /**
     * @dev Set mint allowed for a minter
     * @param minter Minter address
     * @param allowed ElGamal token representing the allowed mint amount
     */
    function setMintAllowed(
        address minter,
        TokenModel.ElGamalToken memory allowed
    ) external;

    function burn(uint256 tokenId) external returns (bool);
}
