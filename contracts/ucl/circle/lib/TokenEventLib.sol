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
            TokenSCAddress: tokenSCAddress,
            TokenSCType: TokenSCType,
            Deployer: deployer
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
        TokenModel.ElGamal memory amount
    ) public {
        TokenMintedEvent memory eventData = TokenMintedEvent({
            to: to,
            amount: amount
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
        TokenModel.GrumpkinPublicKey memory publicKey
    ) public {
        InstitutionRegisteredEvent memory e = InstitutionRegisteredEvent({
            institutionAddress: institutionAddress,
            name: name,
            publicKey: publicKey
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(eventSource, owner, "InstitutionRegistered", body);
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

    //triggerTokenDeletedEvent
    function triggerTokenDeletedEvent(
        IL2Event _l2Event,
        address eventSource,
        address eventAccount,
        bytes32[] memory consumedTokens,
        TokenModel.ElGamal memory consumedTokensRemainingAmount
    )public{
        TokenDeletedEvent memory e = TokenDeletedEvent({
            consumedTokensRemainingAmount: consumedTokensRemainingAmount,
            consumedTokens: consumedTokens
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(eventSource, eventAccount, "TokenDeleted", body);
    }

    function triggerTokenDeletedEvent2(
        IL2Event _l2Event,
        address eventSource,
        address eventAccount,
        uint256[] memory consumedTokens,
        uint256 changeTokenId
    )public{
        TokenDeletedEvent2 memory e = TokenDeletedEvent2({
            consumedTokens: consumedTokens,
            changeTokenId: changeTokenId
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(eventSource, eventAccount, "TokenDeleted", body);
    }

    //triggerTokenReceivedEvent
    function triggerTokenReceivedEvent(
        IL2Event _l2Event,
        address eventSource,
        address eventAccount,
        TokenModel.ElGamal memory amount,
        address from
    )public{
        TokenReceivedEvent memory e = TokenReceivedEvent({
            amount: amount,
            from: from
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(eventSource, eventAccount, "TokenReceived", body);
    }

    function triggerTokenReceivedEvent2(
        IL2Event _l2Event,
        address eventSource,
        address eventAccount,
        uint256 tokenId,
        address from
    )public{
        TokenReceivedEvent2 memory e = TokenReceivedEvent2({
            tokenId: tokenId,
            from: from
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
} 