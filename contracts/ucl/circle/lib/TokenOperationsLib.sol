// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../../ucl/curves/blocks/grumpkin/Grumpkin.sol" as GrumpkinAlgorithmLib;
import "../event/IL2Event.sol";
import "../event/L2EventDefinitions.sol";
import "../model/TokenModel.sol";

library TokenOperationsLib {
    using TokenModel for TokenModel.TokenEntity;

    function mintTokenLogic(
        mapping(address => mapping(uint256 => TokenModel.TokenEntity)) storage userTokenMap,
        address to,
        address toManager,
        TokenModel.AmountInfo calldata amountInfo
    ) public {
        address owner = to;
        require(owner != address(0), "invalid token owner address");
        require(toManager != address(0), "invalid token without manager address");

        require(userTokenMap[owner][amountInfo.id].amount.cl_x == 0 && userTokenMap[owner][amountInfo.id].amount.cl_y == 0
        && userTokenMap[owner][amountInfo.id].amount.cr_x == 0 && userTokenMap[owner][amountInfo.id].amount.cr_y == 0, "token already exists");
        require(amountInfo.status != TokenModel.TokenStatus.deleted, "new token can't have dead status");

        TokenModel.TokenEntity memory entity = TokenModel.TokenEntity({
            id: amountInfo.id,
            tokenType: amountInfo.token_type,
            owner: to,
            manager: toManager,
            status: amountInfo.status,
            amount: amountInfo.amount,
            issuerEncryptedAmount: amountInfo.issuerEncryptedAmount,
            approvedSpender: address(0),
            rollbackTokenId: 0
        });

        userTokenMap[owner][amountInfo.id] = entity;
        
        return;
    }
} 