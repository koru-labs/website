// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../event/IL2Event.sol";
import "../event/L2EventDefinitions.sol";
import "../model/TokenModel.sol";

library TokenOperationsLib {
    using TokenModel for TokenModel.TokenEntity;

    function mintTokenLogic(
        mapping(uint256 => TokenModel.TokenEntity) storage tokensMap,
        address to,
        address toManager,
        uint256 tokenId,
        TokenModel.ElGamal memory amount,
        bytes memory issuerEncryptedAmount
    ) public {
        address owner = to;
        require(owner != address(0), "invalid token owner address");
        require(toManager != address(0), "invalid token without manager address");

        require(tokensMap[tokenId].amount.cl_x == 0 && tokensMap[tokenId].amount.cl_y == 0
        && tokensMap[tokenId].amount.cr_x == 0 && tokensMap[tokenId].amount.cr_y == 0, "token already exists");

        TokenModel.TokenEntity memory entity = TokenModel.TokenEntity({
            id: tokenId,
            tokenType: 0,
            owner: to,
            manager: toManager,
            status: TokenModel.TokenStatus.active,
            amount: amount,
            issuerEncryptedAmount: issuerEncryptedAmount,
            approvedSpender: address(0),
            rollbackTokenId: 0
        });

        tokensMap[tokenId] = entity;
        
        return;
    }
} 