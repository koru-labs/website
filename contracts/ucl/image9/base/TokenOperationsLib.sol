pragma solidity ^0.8.0;

import "../../../ucl/curves/blocks/grumpkin/Grumpkin.sol" as GrumpkinAlgorithmLib;
import "../event/IL2Event.sol";
import "../event/L2EventDefinitions.sol";
import "./TokenModel.sol";

library TokenOperationsLib {
    using TokenModel for TokenModel.TokenEntity;

    function mintTokenLogic(
        mapping(address => mapping(uint256 => TokenModel.TokenEntity)) storage userTokenMap,
        TokenModel.NewToken calldata token
    ) public {
        address owner = token.owner;
        require(owner != address(0), "invalid token owner address");
        require(token.manager != address(0), "invalid token without manager address");

        require(userTokenMap[owner][token.id].cl_x == 0 && userTokenMap[owner][token.id].cl_y == 0
        && userTokenMap[owner][token.id].cr_x == 0 && userTokenMap[owner][token.id].cr_y == 0, "token already exists");
        require(token.status != TokenModel.TokenStatus.deleted, "new token can't have dead status");

        TokenModel.TokenEntity memory entity = TokenModel.TokenEntity({
            id: token.id,
            tokenType: token.tokenType,
            owner: token.owner,
            manager: token.manager,
            cl_x: token.cl_x,
            cl_y: token.cl_y,
            cr_x: token.cr_x,
            cr_y: token.cr_y,
            status: token.status,
            parentId: 0,
            encryptedAmount: token.encryptedAmount,
            approvedSpender: address(0),
            rollbackTokenId: 0
        });

        userTokenMap[owner][token.id] = entity;
        
        return;
    }

    function splitTokenLogic(
        mapping(address => mapping(uint256 => TokenModel.TokenEntity)) storage userTokenMap,
        TokenModel.TokenValueUpdate calldata parentTokenUpdate,
        TokenModel.NewToken[] calldata childTokens
    ) public {
        address owner = parentTokenUpdate.owner;
        TokenModel.TokenEntity storage parent = userTokenMap[owner][parentTokenUpdate.id];

        for (uint256 i = 0; i < childTokens.length; i++) {
            TokenModel.NewToken memory child = childTokens[i];
            require(child.status != TokenModel.TokenStatus.deleted, "child token status should not be dead");
            require(
                userTokenMap[owner][child.id].cl_x == 0 && userTokenMap[owner][child.id].cl_y == 0
                && userTokenMap[owner][child.id].cr_x == 0 && userTokenMap[owner][child.id].cr_y == 0
            , "child token already exists");

            TokenModel.TokenEntity memory childEntity = TokenModel.TokenEntity({
                id: child.id,
                tokenType: parent.tokenType,
                owner: owner,
                manager: child.manager,
                cl_x: child.cl_x,
                cl_y: child.cl_y,
                cr_x: child.cr_x,
                cr_y: child.cr_y,
                status: child.status,
                parentId: parentTokenUpdate.id,
                approvedSpender: address(0),
                rollbackTokenId: 0,
                encryptedAmount: child.encryptedAmount
            });

            userTokenMap[owner][child.id] = childEntity;
        }

        delete userTokenMap[owner][parentTokenUpdate.id];
    }

    function mergeTokensLogic(
        mapping(address => mapping(uint256 => TokenModel.TokenEntity)) storage userTokenMap,
        uint256[] calldata childTokens,
        TokenModel.TokenValueUpdate calldata mergeTokenUpdate
    ) public {
        address owner = mergeTokenUpdate.owner;
        require(owner != address(0), "invalid token owner");

        GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint memory sum_cl = GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(0, 0);
        GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint memory sum_cr = GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(0, 0);

        for (uint256 i = 0; i < childTokens.length; i++) {
            uint256 childId = childTokens[i];
            TokenModel.TokenEntity storage child = userTokenMap[owner][childId];

            require(child.status != TokenModel.TokenStatus.deleted, "dead tokens can't be merged");
            require(owner == child.owner, "invalid child token owner");

            GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint memory current_cl = GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(child.cl_x, child.cl_y);
            GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint memory current_cr = GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(child.cr_x, child.cr_y);

            sum_cl = GrumpkinAlgorithmLib.Grumpkin.add(sum_cl, current_cl);
            sum_cr = GrumpkinAlgorithmLib.Grumpkin.add(sum_cr, current_cr);

            child.status = TokenModel.TokenStatus.deleted;
        }

        TokenModel.TokenEntity storage firstChild = userTokenMap[owner][childTokens[0]];
        TokenModel.TokenEntity memory entity = TokenModel.TokenEntity({
            id: mergeTokenUpdate.id,
            tokenType: firstChild.tokenType,
            owner: mergeTokenUpdate.owner,
            manager: firstChild.manager,
            cl_x: sum_cl.x,
            cl_y: sum_cl.y,
            cr_x: sum_cr.x,
            cr_y: sum_cr.y,
            status: TokenModel.TokenStatus.active,
            encryptedAmount: firstChild.encryptedAmount,
            parentId: 0,
            approvedSpender: address(0),
            rollbackTokenId: 0
        });
        userTokenMap[owner][mergeTokenUpdate.id] = entity;
    }

   function sumTokenAmountsLogic(
        mapping(address => mapping(uint256 => TokenModel.TokenEntity)) storage userTokenMap,
        uint256[] calldata childTokens,
        address owner
    ) public returns (uint256, uint256, uint256, uint256) {
        // 检查所有者地址是否有效
        require(owner != address(0), "invalid token owner");

        GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint memory sum_cl = GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(0, 0);
        GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint memory sum_cr = GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(0, 0);

        // 遍历子代币 ID 数组
        for (uint256 i = 0; i < childTokens.length; i++) {
            uint256 childId = childTokens[i];
            TokenModel.TokenEntity storage child = userTokenMap[owner][childId];

            require(child.status != TokenModel.TokenStatus.deleted, "dead tokens can't be merged");
            require(owner == child.owner, "invalid child token owner");

            sum_cl = GrumpkinAlgorithmLib.Grumpkin.add(sum_cl, GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(child.cl_x, child.cl_y));
            sum_cr = GrumpkinAlgorithmLib.Grumpkin.add(sum_cr, GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(child.cr_x, child.cr_y));
        }

        return (sum_cl.x, sum_cl.y, sum_cr.x, sum_cr.y);
    }


    function transferTokenLogic(
        mapping(address => mapping(uint256 => TokenModel.TokenEntity)) storage userTokenMap,
        uint256 tokenId,
        address owner,
        address toManager,
        address to
    ) public {
        require(userTokenMap[owner][tokenId].status != TokenModel.TokenStatus.deleted, "invalid token");

        TokenModel.TokenEntity memory token = userTokenMap[owner][tokenId];
        delete userTokenMap[owner][tokenId];

        token.manager = toManager;
        token.owner = to;
        userTokenMap[to][tokenId] = token;
    }

    function delegateTransferTokenLogic(
        mapping(address => mapping(uint256 => TokenModel.TokenEntity)) storage userTokenMap,
        TokenModel.TokenValueUpdate calldata parentTokenUpdate,
        TokenModel.NewToken[] calldata childTokens
    ) public {
        address owner = parentTokenUpdate.owner;
        TokenModel.TokenEntity storage parent = userTokenMap[owner][parentTokenUpdate.id];

        for (uint256 i = 0; i < childTokens.length; i++) {
            TokenModel.NewToken memory child = childTokens[i];
            require(child.status != TokenModel.TokenStatus.deleted, "child token status should not be dead");
            require(
                userTokenMap[owner][child.id].cl_x == 0 && userTokenMap[owner][child.id].cl_y == 0
                && userTokenMap[owner][child.id].cr_x == 0 && userTokenMap[owner][child.id].cr_y == 0
            , "child token already exists");

            TokenModel.TokenEntity memory childEntity = TokenModel.TokenEntity({
                id: child.id,
                tokenType: parent.tokenType,
                owner: parentTokenUpdate.owner,
                manager: child.manager,
                cl_x: child.cl_x,
                cl_y: child.cl_y,
                cr_x: child.cr_x,
                cr_y: child.cr_y,
                status: child.status,
                parentId: parentTokenUpdate.id,
                encryptedAmount: child.encryptedAmount,
                approvedSpender: address(0),
                rollbackTokenId: 0
            });

            userTokenMap[owner][child.id] = childEntity;
        }

        delete userTokenMap[owner][parentTokenUpdate.id];
    }

    function burnTokenLogic(
        mapping(address => mapping(uint256 => TokenModel.TokenEntity)) storage userTokenMap,
        address owner,
        uint256 tokenId
    ) public {
        require(userTokenMap[owner][tokenId].status != TokenModel.TokenStatus.deleted, "invalid token");

        TokenModel.TokenEntity storage token = userTokenMap[owner][tokenId];
        token.status = TokenModel.TokenStatus.deleted;
        return;
    }

    function removeTokenLogic(
        mapping(address => mapping(uint256 => TokenModel.TokenEntity)) storage userTokenMap,
        address owner,
        uint256 tokenId
    ) public {
        require(userTokenMap[owner][tokenId].status == TokenModel.TokenStatus.deleted, "only deleted token can be removed");
        delete userTokenMap[owner][tokenId];
    }

    function convertPlainToPrivateTokenLogic(
        mapping(address => mapping(uint256 => TokenModel.TokenEntity)) storage userTokenMap,
        mapping(address => mapping(uint256 => uint256)) storage ercBalancenMap,
        address owner,
        address manager,
        uint256 tokenType,
        uint256 amount,
        uint256 tokenId
    ) public {
        require(owner != address(0), "invalid owner address");
        require(manager != address(0), "invalid manager address");
        require(ercBalancenMap[owner][tokenId] >= amount, "insufficient balance");

        // Check if token ID already exists
        require(userTokenMap[owner][tokenId].cl_x == 0 &&
                userTokenMap[owner][tokenId].cl_y == 0 &&
                userTokenMap[owner][tokenId].cr_x == 0 &&
                userTokenMap[owner][tokenId].cr_y == 0, "token already exists");

        // Ensure amount doesn't exceed 2^32 - 1
        require(amount < 4294967296, "Amount too large");// 2^32 = 4294967296

        // Decrease plaintext balance
        ercBalancenMap[owner][tokenId] -= amount;

        // Create fixed base point
        GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint memory basePoint = GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint({
            x: uint256(1),
            y: uint256(17631683881184975370165255887551781615748388533673675138860)
        });

        // Calculate cr = amount * G using Grumpkin library's scalarMul method
        GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint memory cr = GrumpkinAlgorithmLib.Grumpkin.scalarMul(basePoint, amount);

        // Create new token entity
        TokenModel.TokenEntity memory entity = TokenModel.TokenEntity({
            id: tokenId,
            tokenType: tokenType,
            owner: owner,
            manager: manager,
            cl_x: 0,  // Generate encrypted parameters, Set cl to zero point (0,0)
            cl_y: 0,
            cr_x: cr.x,
            cr_y: cr.y,
            status: TokenModel.TokenStatus.active,
            encryptedAmount: new bytes(0),
            parentId: 0,
            approvedSpender: address(0),
            rollbackTokenId: 0
        });

        // Save token
        userTokenMap[owner][tokenId] = entity;
        return;
    }
} 