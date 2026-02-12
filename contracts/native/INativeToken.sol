// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title INativeToken - Native Token Interface
interface INativeToken {
    struct EncryptedAmount {
        uint256 cl_x;
        uint256 cl_y;
        uint256 cr_x;
        uint256 cr_y;
    }

    struct ElGamalToken {
        uint256 id;
        EncryptedAmount value;
    }

    enum TokenStatus {
        Deleted,    // 0
        Inactive,   // 1
        Active,     // 2
        Locked      // 3
    }

    struct TokenEntity {
        uint256 id;
        address owner;
        TokenStatus status;
        EncryptedAmount amount;
        address to;
        uint256 rollbackTokenId;
    }
    function setMintAllowed(address minter, ElGamalToken calldata allowed) external;
    function transfer(uint256 tokenId, string calldata memo) external returns (bool success);
    function burn(uint256 tokenId) external returns (bool success);
    function getToken(address owner, uint256 tokenId) external view returns (TokenEntity memory entity);
    function checkTokenIds(address owner, uint256[] calldata tokenIds) external view returns (uint256[] memory);
    function split(
        address from,
        address[] calldata recipients,
        uint256[] calldata consumedIds,
        TokenEntity[] calldata newTokens,
        uint256[8] calldata proof,
        uint256[] calldata publicInputs,
        uint256 paddingNum
    ) external returns (bool success);

    function mint(
        address[] calldata recipients,
        TokenEntity[] calldata tokens,
        ElGamalToken calldata newAllowed,
        uint256[8] calldata proof,
        uint256[] calldata publicInputs,
        uint256 paddingNum
    ) external returns (bool success);
}