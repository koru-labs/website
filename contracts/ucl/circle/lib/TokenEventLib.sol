pragma solidity ^0.8.0;

import "../model/TokenModel.sol";
import "../event/IL2Event.sol";
import "../model/L2EventDefinitions.sol";

library TokenEventLib2 {

    function triggerTokenSCCreatedEvent(
        IL2Event _l2Event,
        address tokenSCAddress,
        address deployer,
        TokenModel2.TokenSCTypeEnum TokenSCType
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
        TokenModel2.TokenEntity memory token
    ) public {
        TokenMintBurnBody memory eventData = TokenMintBurnBody({
        id: token.id,
        tokenSCAddress: eventSource,
        tokenType: token.tokenType,
        owner: token.owner,
        manager: token.manager,
        status: token.status,
        issuerEncryptedAmount: token.issuerEncryptedAmount
        });
        bytes memory eventBody = abi.encode(eventData);
        _l2Event.sendEvent(eventSource, token.manager, "TokenMinted", eventBody);
    }


    function triggerTokenBurnedEvent(
        IL2Event _l2Event,
        address eventSource,
        TokenModel2.TokenEntity memory token
    ) public {
        TokenMintBurnBody memory eventData = TokenMintBurnBody({
        id: token.id,
        tokenSCAddress: eventSource,
        tokenType: token.tokenType,
        owner: token.owner,
        manager: token.manager,
        status: token.status,
        issuerEncryptedAmount: token.issuerEncryptedAmount
        });
        bytes memory eventBody = abi.encode(eventData);
        _l2Event.sendEvent(eventSource, token.manager, "TokenBurned", eventBody);
    }


    function triggerTokenSplitEvent(
        IL2Event _l2Event,
        address eventSource,
        TokenModel2.TokenEntity memory token
    ) public {
        TokenDetailBody memory eventData = TokenDetailBody({
        id: token.id,
        tokenSCAddress: eventSource,
        tokenType: token.tokenType,
        owner: token.owner,
        manager: token.manager,
        cl_x: token.amount.cl_x,
        cl_y: token.amount.cl_y,
        cr_x: token.amount.cr_x,
        cr_y: token.amount.cr_y,
        status: token.status,
        parentId: 0
        });
        bytes memory eventBody = abi.encode(eventData);
        _l2Event.sendEvent(eventSource, token.manager, "TokenSplit", eventBody);
    }

    function triggerTokenRemovedEvent(
        IL2Event _l2Event,
        address eventSource,
        TokenModel2.TokenEntity memory token
    ) public {
        TokenRemovedEvent memory eventData = TokenRemovedEvent({
        owner:  token.owner,
        tokenId: token.id
        });
        bytes memory eventBody = abi.encode(eventData);
        _l2Event.sendEvent(eventSource,  token.manager, "TokenRemoved", eventBody);
    }
} 