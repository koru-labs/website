pragma solidity ^0.8.0;

import "./TokenModel.sol";
import "../nova/sol/fr.sol";

library DVPLib {
    function splitTokenForDVPLogic(
        mapping(address => mapping(uint256 => TokenModel.TokenEntity)) storage userTokenMap,
        address spender,
        TokenModel.TokenValueUpdate calldata parentTokenUpdate,
        TokenModel.NewToken[] calldata childTokens,
        Fr[] memory z0,
        Fr[] memory zn
    ) public returns (uint256, uint256, uint256) {
        address owner = parentTokenUpdate.owner;
        TokenModel.TokenEntity memory parentTokenEntity = userTokenMap[owner][parentTokenUpdate.id];
        require(parentTokenEntity.status == TokenModel.TokenStatus.active, "parent not active");

        // burn the parent token
        delete userTokenMap[parentTokenEntity.owner][parentTokenUpdate.id];

        uint256 rollbackTokenId = 0;
        uint256 receiverTokenId = 0;
        uint256 changeTokenId = 0;

        for (uint256 i = 0; i < childTokens.length; i++) {
            if (childTokens[i].rollbackTokenId != 0) {
                rollbackTokenId = childTokens[i].rollbackTokenId;
                break;
            }
        }

        for (uint256 i = 0; i < childTokens.length; i++) {
            TokenModel.NewToken memory child = childTokens[i];
            require(child.status != TokenModel.TokenStatus.deleted, "child token status should not be dead");
            require(
                userTokenMap[parentTokenEntity.owner][child.id].cl_x == 0 && userTokenMap[parentTokenEntity.owner][child.id].cl_y == 0
                && userTokenMap[parentTokenEntity.owner][child.id].cr_x == 0 && userTokenMap[parentTokenEntity.owner][child.id].cr_y == 0
            , "child token already exists");

            TokenModel.TokenEntity memory childEntity = TokenModel.TokenEntity({
                id: child.id,
                tokenType: parentTokenEntity.tokenType,
                owner: child.owner,
                manager: parentTokenEntity.manager,
                cl_x: child.cl_x,
                cl_y: child.cl_y,
                cr_x: child.cr_x,
                cr_y: child.cr_y,
                status: child.status,
                parentId: parentTokenEntity.id,
                encryptedAmount: child.encryptedAmount,
                approvedSpender: spender,
                rollbackTokenId: child.rollbackTokenId
            });
            
            if (child.id != rollbackTokenId) {
                if (child.rollbackTokenId > 0) {
                    receiverTokenId = child.id;
                } else {
                    changeTokenId = child.id;
                }
            }
            userTokenMap[parentTokenEntity.owner][child.id] = childEntity;
        }

        TokenModel.TokenEntity memory rollbackTokenEntity = userTokenMap[parentTokenEntity.owner][rollbackTokenId];
        require(rollbackTokenEntity.owner == parentTokenEntity.owner, "rollback token owner mismatch");

        return (rollbackTokenId, receiverTokenId, changeTokenId);
    }

    function mergeAndSplitTokenForDVPLogic(
        mapping(address => mapping(uint256 => TokenModel.TokenEntity)) storage userTokenMap,
        address spender,
        TokenModel.TokenMergeAndUpdate calldata parentToken,
        TokenModel.NewToken[] calldata childTokens
    ) public returns (uint256, uint256, uint256) {
        address owner = parentToken.owner;
        for (uint256 i = 0; i < parentToken.id.length; i++) {
            TokenModel.TokenEntity memory parentTokenEntity = userTokenMap[owner][parentToken.id[i]];
            require(parentTokenEntity.status == TokenModel.TokenStatus.active, "parent not active");

            // burn the parent token
            delete userTokenMap[parentTokenEntity.owner][parentToken.id[i]];
        }

        uint256 rollbackTokenId = 0;
        uint256 receiverTokenId = 0;
        uint256 changeTokenId = 0;

        for (uint256 i = 0; i < childTokens.length; i++) {
            if (childTokens[i].rollbackTokenId != 0) {
                rollbackTokenId = childTokens[i].rollbackTokenId;
                break;
            }
        }

        for (uint256 i = 0; i < childTokens.length; i++) {
            TokenModel.NewToken memory child = childTokens[i];
            require(child.status != TokenModel.TokenStatus.deleted, "child token status should not be dead");
            require(
                userTokenMap[owner][child.id].cl_x == 0 && userTokenMap[owner][child.id].cl_y == 0
                && userTokenMap[owner][child.id].cr_x == 0 && userTokenMap[owner][child.id].cr_y == 0
                , "child token already exists");

            TokenModel.TokenEntity memory childEntity = TokenModel.TokenEntity({
                id: child.id,
                tokenType: child.tokenType,
                owner: child.owner,
                manager: child.manager,
                cl_x: child.cl_x,
                cl_y: child.cl_y,
                cr_x: child.cr_x,
                cr_y: child.cr_y,
                status: child.status,
                parentId: 0,
                encryptedAmount: child.encryptedAmount,
                approvedSpender: spender,
                rollbackTokenId: child.rollbackTokenId
            });

            if (child.id != rollbackTokenId) {
                if (child.rollbackTokenId > 0) {
                    receiverTokenId = child.id;
                } else {
                    changeTokenId = child.id;
                }
            }
            userTokenMap[owner][child.id] = childEntity;
        }

        TokenModel.TokenEntity memory rollbackTokenEntity = userTokenMap[owner][rollbackTokenId];
        require(rollbackTokenEntity.owner == owner, "rollback token owner mismatch");

        return (rollbackTokenId, receiverTokenId, changeTokenId);
    }


    function validateDVPLogic(
        mapping(address => mapping(uint256 => TokenModel.TokenEntity)) storage userTokenMap,
        uint256 tokenId,
        address from,
        address caller
    ) public view returns (bool) {
        TokenModel.TokenEntity memory token = userTokenMap[from][tokenId];
        
        if (token.owner != from) {
            return false;
        }
        if (token.approvedSpender != caller) {
            return false;
        }
        if (token.status == TokenModel.TokenStatus.deleted) {
            return false;
        }
        if (token.rollbackTokenId == 0) {
            return false;
        }

        return true;
    }

    function rollbackDVPLogic(
        mapping(address => mapping(uint256 => TokenModel.TokenEntity)) storage userTokenMap,
        address owner,
        uint256 tokenId
    ) public {
        TokenModel.TokenEntity memory receiverToken = userTokenMap[owner][tokenId];
        TokenModel.TokenEntity storage rollBackToken = userTokenMap[owner][receiverToken.rollbackTokenId];

        // Delete receiver token
        delete userTokenMap[owner][tokenId];

        // Activate rollback token
        rollBackToken.status = TokenModel.TokenStatus.active;
    }

    function cancelDvpReservationLogic(
        mapping(address => mapping(uint256 => TokenModel.TokenEntity)) storage userTokenMap,
        address owner,
        uint256 tokenId
    ) public {
        TokenModel.TokenEntity memory receiverToken = userTokenMap[owner][tokenId];
        require(receiverToken.status == TokenModel.TokenStatus.inactive, "token can't be canceled due to status");
        require(receiverToken.rollbackTokenId != 0, "token without rollBack can't be canceled");

        // Delete receiver token
        delete userTokenMap[owner][tokenId];

        // Activate rollback token
        TokenModel.TokenEntity storage rollBackToken = userTokenMap[owner][receiverToken.rollbackTokenId];
        rollBackToken.status = TokenModel.TokenStatus.active;
    }

    function splitBatchTokenForDVPLogic(
        mapping(address => mapping(uint256 => TokenModel.TokenEntity)) storage userTokenMap,
        address spender,
        TokenModel.TokenValueUpdate calldata parentTokenUpdate,
        TokenModel.NewBatchToken[] calldata childTokens
    ) public {
        address owner = parentTokenUpdate.owner;
        TokenModel.TokenEntity memory parentTokenEntity = userTokenMap[owner][parentTokenUpdate.id];
        require(parentTokenEntity.status == TokenModel.TokenStatus.active, "parent not active");

        uint256 parentTokenId = parentTokenEntity.id;

        uint256 hash = 0;

        for (uint256 i = 0; i < childTokens.length; i++) {
            // burn the parent token
            delete userTokenMap[owner][parentTokenId];

            uint256 rollbackTokenId = 0;
            uint256 receiverTokenId = 0;
            uint256 changeTokenId = 0;
            TokenModel.NewBatchToken memory childBatchToken = childTokens[i];
            TokenModel.NewToken[] memory child = childBatchToken.token;
            for (uint256 j = 0; j < child.length; j++) {
                if (child[j].rollbackTokenId != 0) {
                    rollbackTokenId = child[j].rollbackTokenId;
                    break;
                }
            }
            for (uint256 j = 0; j < child.length; j++) {
                require(child[j].status != TokenModel.TokenStatus.deleted, "child token status should not be dead");
                require(
                    userTokenMap[owner][child[j].id].cl_x == 0 && userTokenMap[owner][child[j].id].cl_y == 0
                    && userTokenMap[owner][child[j].id].cr_x == 0 && userTokenMap[owner][child[j].id].cr_y == 0
                    , "child token already exists");

                TokenModel.TokenEntity memory childEntity = TokenModel.TokenEntity({
                    id: child[j].id,
                    tokenType: parentTokenEntity.tokenType,
                    owner: child[j].owner,
                    manager: parentTokenEntity.manager,
                    cl_x: child[j].cl_x,
                    cl_y: child[j].cl_y,
                    cr_x: child[j].cr_x,
                    cr_y: child[j].cr_y,
                    status: child[j].status,
                    parentId: parentTokenId,
                    encryptedAmount: child[j].encryptedAmount,
                    approvedSpender: spender,
                    rollbackTokenId: child[j].rollbackTokenId
                });
                if (child[j].id != rollbackTokenId) {
                    if (child[j].rollbackTokenId > 0) {
                        receiverTokenId = child[j].id;
                    } else {
                        // ID for the next split
                        parentTokenId = child[j].id;
                        changeTokenId = child[j].id;
                    }
                }
                userTokenMap[owner][child[j].id] = childEntity;
            }
        }
    }
}