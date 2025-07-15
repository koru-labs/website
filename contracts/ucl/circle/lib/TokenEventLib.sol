// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../model/TokenModel.sol";
import "../event/IL2Event.sol";
import "../event/L2EventDefinitions.sol";

library TokenEventLib {

    function triggerTokenSCCreatedEvent(
        IL2Event _l2Event,
        address tokenSCAddress,
        address deployer,
        TokenModel.TokenSCTypeEnum TokenSCType
    ) public {

        TokenSCCreatedEvent memory e = TokenSCCreatedEvent({
            TokenSCAddress : tokenSCAddress,
            TokenSCType : TokenSCType,
            Deployer : deployer
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(tokenSCAddress, deployer, "TokenSCCreated", body);
    }

    function triggerTokenSupplyUpdatedEvent(
        IL2Event _l2Event, 
        address eventSource,
        address msgSender,
        TokenModel.ElGamal memory oldSupply,
        TokenModel.ElGamal memory increaseAmount,
        TokenModel.ElGamal memory decreaseAmount,
        TokenModel.ElGamal memory newSupply,
        uint256 _numberOfTotalSupplyChanges
    ) public {
        if (_numberOfTotalSupplyChanges %5 !=0) {
            return;
        }

        TokenSupplyUpdatedEvent memory eventData = TokenSupplyUpdatedEvent({
            oldSupply: oldSupply,
            increaseAmount: increaseAmount,
            decreaseAmount: decreaseAmount,
            newSupply: newSupply
        });
        bytes memory eventBody = abi.encode(eventData);
        _l2Event.sendEvent(eventSource, msgSender, "TokenSupplyUpdated", eventBody);
    }

    function triggerTokenMintAllowedUpdatedEvent(
        IL2Event _l2Event,
        address eventSource,
        address msgSender,
        address institution,
        TokenModel.ElGamal memory oldAmount,
        TokenModel.ElGamal memory newAmount
    ) public {
        TokenMintAllowedUpdatedEvent memory eventData = TokenMintAllowedUpdatedEvent({
            institution: institution,
            oldAmount: oldAmount,
            newAmount: newAmount
        });
        bytes memory eventBody = abi.encode(eventData);
        _l2Event.sendEvent(eventSource, msgSender, "TokenMintAllowedUpdated", eventBody);
    }

    function triggerTokenMintedEvent(
        IL2Event _l2Event,
        address eventSource,
        address to,
        TokenModel.ElGamal memory amount,
        address minter
    ) public {
        TokenMintedEvent memory eventData = TokenMintedEvent({
            to : to,
            amount : amount,
            minter : minter
        });
        bytes memory eventBody = abi.encode(eventData);
        _l2Event.sendEvent(eventSource, to, "TokenMinted", eventBody);
    }


    function triggerInstitutionRegisteredEvent(
        IL2Event _l2Event,
        address eventSource,
        address owner,
        address institutionAddress,
        string memory name,
        TokenModel.GrumpkinPublicKey memory publicKey,
        string memory nodeUrl,
        string memory httpUrl
    ) public {
        InstitutionRegisteredEvent memory e = InstitutionRegisteredEvent({
            institutionAddress: institutionAddress,
            name: name,
            publicKey: publicKey,
            nodeUrl: nodeUrl,
            httpUrl: httpUrl
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(eventSource, owner, "InstitutionRegistered", body);
    }

    function triggerInstitutionUpdatedEvent(
        IL2Event _l2Event,
        address eventSource,
        address owner,
        address institutionAddress,
        string memory name,
        string memory nodeUrl,
        string memory httpUrl
    ) public {
        InstitutionUpdatedEvent memory e = InstitutionUpdatedEvent({
        institutionAddress: institutionAddress,
        name: name,
        nodeUrl: nodeUrl,
        httpUrl: httpUrl
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(eventSource, owner, "InstitutionUpdated", body);
    }


    function triggerUserRegisteredEvent(
        IL2Event _l2Event,
        address eventSource,
        address owner,
        address userAddress,
        address managerAddress
    ) public {
        UserRegisteredEvent memory e = UserRegisteredEvent({
            userAddress: userAddress,
            managerAddress: managerAddress
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(eventSource, owner, "UserRegistered", body);
    }

    function triggerUserRemovedEvent(
        IL2Event _l2Event,
        address eventSource,
        address owner,
        address userAddress,
        address managerAddress
    ) public {
        UserRemovedEvent memory e = UserRemovedEvent({
            userAddress: userAddress,
            managerAddress: managerAddress
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(eventSource, owner, "UserRemoved", body);
    }

    function triggerTokenDeletedEvent(
        IL2Event _l2Event,
        address eventSource,
        address eventAccount,
        uint256[] memory consumedTokens,
        uint256 changeTokenId
    ) public {
        TokenDeletedEvent memory e = TokenDeletedEvent({
            consumedTokens : consumedTokens,
            changeTokenId : changeTokenId
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(eventSource, eventAccount, "TokenDeleted", body);
    }

    function triggerTokenCanceledEvent(
        IL2Event _l2Event,
        address eventSource,
        address eventAccount,
        uint256 transferTokenId
    ) public {
        TokenCanceledEvent memory e = TokenCanceledEvent({
            transferTokenId : transferTokenId
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(eventSource, eventAccount, "TokenCanceled", body);
    }



    //triggerTokenReceivedEvent
//    function triggerTokenReceivedEvent(
//        IL2Event _l2Event,
//        address eventSource,
//        address eventAccount,
//        TokenModel.ElGamal memory amount,
//        address from
//    ) public {
//        TokenReceivedEvent memory e = TokenReceivedEvent({
//        amount : amount,
//        from : from
//        });
//        bytes memory body = abi.encode(e);
//        _l2Event.sendEvent(eventSource, eventAccount, "TokenReceived", body);
//    }

    function triggerTokenReceivedEvent(
        IL2Event _l2Event,
        address eventSource,
        address eventAccount,
        uint256 tokenId,
        address tokenScAddress,
        TokenModel.TokenStatus status,
        TokenModel.ElGamal memory amount
    ) public {
        TokenReceivedEvent memory e = TokenReceivedEvent({
            id : tokenId,
            tokenSCAddress : tokenScAddress,
            owner : eventAccount,
            status : status,
            amount : amount
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(eventSource, eventAccount, "TokenReceived", body);
    }

    // triggerTokenBurnedEvent
    function triggerTokenBurnedEvent(
        IL2Event _l2Event,
        address eventSource,
        address eventAccount,
        uint256 tokenId
    )public{
        TokenBurnedEvent memory e = TokenBurnedEvent({
            tokenId: tokenId
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(eventSource, eventAccount, "TokenBurned", body);
    }

    // triggerAllowanceUpdatedEvent
    function triggerAllowanceUpdatedEvent(
        IL2Event _l2Event,
        address eventSource,
        address eventAccount,
        TokenModel.Allowance memory oldAllowance,
        TokenModel.ElGamal memory increaseAmount,
        TokenModel.ElGamal memory decreaseAmount,
        TokenModel.Allowance memory newAllowance,
        address msgSender
    )public{
        AllowanceUpdatedEvent memory e = AllowanceUpdatedEvent({
            oldAllowance: oldAllowance,
            increaseAmount: increaseAmount,
            decreaseAmount: decreaseAmount,
            newAllowance: newAllowance,
            msgSender: msgSender
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(eventSource, eventAccount, "AllowanceUpdated", body);
    }

    // triggerAllowanceReceivedEvent
    function triggerAllowanceCreatedEvent(
        IL2Event _l2Event,
        address eventSource,
        address eventAccount,
        address spender,
        TokenModel.Allowance memory allowance,
        TokenModel.Allowance memory oldAllowance,
        TokenModel.Allowance memory newAllowance
    ) public{
        AllowanceCreatedEvent memory e = AllowanceCreatedEvent({
            spender: spender,
            allowance: allowance,
            oldAllowance: oldAllowance,
            newAllowance: newAllowance
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(eventSource, eventAccount, "AllowanceCreated", body);
    }

    function triggerAllowanceReceivedEvent(
        IL2Event _l2Event,
        address eventSource,
        address eventAccount,
        address owner,
        TokenModel.Allowance memory allowance
    ) public{
        AllowanceReceivedEvent memory e = AllowanceReceivedEvent({
            tokenType: 0,
            owner: owner,
            spender: eventAccount,
            allowance: allowance
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(eventSource, eventAccount, "AllowanceReceived", body);
    }

    function triggerMinterAllowedSetEvent(IL2Event _l2Event, address eventSource, address eventAccount,
        address setter, TokenModel.ElGamal memory limit) internal {

        MinterAllowedSetEvent memory e = MinterAllowedSetEvent({
            setter: setter,
            account: eventAccount,
            limit: limit
        });

        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(eventSource, eventAccount, "MinterAllowedSet", body);
    }

    function triggerTokenActionCompletedEvent(
        IL2Event _l2Event,
        address eventSource,
        address eventAccount,
        uint256 rollbackTokenId
    ) public {
        TokenActionCompletedEvent memory e = TokenActionCompletedEvent({
            rollbackTokenId : rollbackTokenId
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(eventSource, eventAccount, "TokenActionCompleted", body);
    }
} 