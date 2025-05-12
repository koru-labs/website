pragma solidity ^0.8.0;

import "./TokenModel.sol";
import "../event/IL2Event.sol";
import "../event/L2EventDefinitions.sol";

library TokenEventLib {
    function triggerTokenSCCreatedEvent(
        IL2Event _l2Event,
        address tokenSCAddress,
        address deployer,
        TokenSCTypeEnum TokenSCType
    ) public {
        TokenSCCreatedEvent memory e = TokenSCCreatedEvent({
            TokenSCAddress: tokenSCAddress,
            TokenSCType: TokenSCType,
            Deployer: deployer
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(tokenSCAddress, address(0), "TokenSCCreated", body);
    }

    function triggerTokenMintedEvent(
        IL2Event _l2Event,
        address eventSource,
        address bankAdmin,
        TokenModel.TokenEntity memory token
    ) public {
        TokenDetailBody memory eventData = TokenDetailBody({
            id: token.id,
            tokenSCAddress: eventSource,
            tokenType: token.tokenType,
            owner: token.owner,
            manager: token.manager,
            cl_x: token.cl_x,
            cl_y: token.cl_y,
            cr_x: token.cr_x,
            cr_y: token.cr_y,
            status: token.status,
            amount: uint256(0),
            encryptedAmount: new bytes(0),
            parentId: token.parentId
        });
        bytes memory eventBody = abi.encode(eventData);
        _l2Event.sendEvent(eventSource, bankAdmin, "TokenMinted", eventBody);
    }

    function triggerTokenSplitEvent(
        IL2Event _l2Event,
        address eventSource,
        address bankAdmin,
        TokenModel.TokenEntity memory token
    ) public {
        TokenDetailBody memory eventData = TokenDetailBody({
            id: token.id,
            tokenSCAddress: eventSource,
            tokenType: token.tokenType,
            owner: token.owner,
            manager: token.manager,
            cl_x: token.cl_x,
            cl_y: token.cl_y,
            cr_x: token.cr_x,
            cr_y: token.cr_y,
            amount: uint256(0),
            encryptedAmount: token.encryptedAmount,
            status: token.status,
            parentId: token.parentId
        });
        bytes memory eventBody = abi.encode(eventData);
        _l2Event.sendEvent(eventSource, bankAdmin, "TokenSplit", eventBody);
    }

    function triggerTokenMergeEvent(
        IL2Event _l2Event,
        address eventSource,
        address bankAdmin,
        TokenModel.TokenEntity memory token
    ) public {
        TokenDetailBody memory eventData = TokenDetailBody({
            id: token.id,
            tokenSCAddress: eventSource,
            tokenType: token.tokenType,
            owner: token.owner,
            manager: token.manager,
            cl_x: token.cl_x,
            cl_y: token.cl_y,
            cr_x: token.cr_x,
            cr_y: token.cr_y,
            status: token.status,
            amount: uint256(0),
            encryptedAmount: new bytes(0),
            parentId: token.parentId
        });
        bytes memory eventBody = abi.encode(eventData);
        _l2Event.sendEvent(eventSource, bankAdmin, "TokenMerged", eventBody);
    }

    function triggerTokenReceivedEvent(
        IL2Event _l2Event,
        address eventSource,
        address bankAdmin,
        TokenModel.TokenEntity memory token
    ) public {
        TokenDetailBody memory eventData = TokenDetailBody({
            id: token.id,
            tokenSCAddress: eventSource,
            tokenType: token.tokenType,
            owner: token.owner,
            manager: token.manager,
            cl_x: token.cl_x,
            cl_y: token.cl_y,
            cr_x: token.cr_x,
            cr_y: token.cr_y,
            amount: uint256(0),
            encryptedAmount: token.encryptedAmount,
            status: token.status,
            parentId: token.parentId
        });
        bytes memory eventBody = abi.encode(eventData);
        _l2Event.sendEvent(eventSource, bankAdmin, "TokenReceived", eventBody);
    }

    function triggerTokenTransferredEvent(
        IL2Event _l2Event,
        address eventSource,
        address bankAdmin,
        TokenModel.TokenEntity memory token
    ) public {
        TokenMetaBody memory eventData = TokenMetaBody({
            id: token.id,
            tokenSCAddress: eventSource,
            tokenType: token.tokenType,
            owner: token.owner,
            manager: token.manager,
            status: token.status,
            parentId: token.parentId
        });
        bytes memory eventBody = abi.encode(eventData);
        _l2Event.sendEvent(eventSource, bankAdmin, "TokenTransferred", eventBody);
    }

    function triggerTokenBurnedEvent(
        IL2Event _l2Event,
        address eventSource,
        address bankAdmin,
        TokenModel.TokenEntity memory token
    ) public {
        TokenMetaBody memory eventData = TokenMetaBody({
            id: token.id,
            tokenSCAddress: eventSource,
            tokenType: token.tokenType,
            owner: token.owner,
            manager: token.manager,
            status: token.status,
            parentId: token.parentId
        });
        bytes memory eventBody = abi.encode(eventData);
        _l2Event.sendEvent(eventSource, bankAdmin, "TokenBurned", eventBody);
    }

    function triggerTokenRemovedEvent(
        IL2Event _l2Event,
        address eventSource,
        address bankAdmin,
        address owner,
        uint256 tokenId
    ) public {
        TokenRemovedEvent memory eventData = TokenRemovedEvent({
            owner: owner,
            tokenId: tokenId
        });
        bytes memory eventBody = abi.encode(eventData);
        _l2Event.sendEvent(eventSource, bankAdmin, "TokenRemoved", eventBody);
    }

    function triggerTokenExchangedEvent(
        IL2Event _l2Event,
        address eventSource,
        address bankAdmin,
        uint256 tokenId,
        address owner,
        address newOwner
    ) public {
        TokenExchangedEvent memory eventData = TokenExchangedEvent({
            tokenId: tokenId,
            owner: owner,
            newOwner: newOwner
        });
        bytes memory eventBody = abi.encode(eventData);
        _l2Event.sendEvent(eventSource, bankAdmin, "TokenExchanged", eventBody);
    }

    function triggerTokenConvertedEvent(
        IL2Event _l2Event,
        address eventSource,
        address bankAdmin,
        TokenModel.TokenEntity memory token,
        uint256 plainAmount
    ) public {
        TokenDetailBody memory eventData = TokenDetailBody({
            id: token.id,
            tokenSCAddress: eventSource,
            tokenType: token.tokenType,
            owner: token.owner,
            manager: token.manager,
            cl_x: token.cl_x,
            cl_y: token.cl_y,
            cr_x: token.cr_x,
            cr_y: token.cr_y,
            amount: plainAmount,
            encryptedAmount: token.encryptedAmount,
            status: token.status,
            parentId: token.parentId
        });
        bytes memory eventBody = abi.encode(eventData);
        _l2Event.sendEvent(eventSource, bankAdmin, "TokenConverted", eventBody);
    }
} 