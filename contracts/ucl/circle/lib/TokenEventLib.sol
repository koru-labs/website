// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../model/TokenModel.sol";
import "../event/IL2Event.sol";
import "../event/L2EventDefinitions.sol";
import "../event/RollupEvent.sol";

library TokenEventLib {

    function triggerTokenSCCreatedEvent(
        IL2Event _l2Event,
        address tokenSCAddress,
        address deployer,
        TokenModel.TokenSCTypeEnum TokenSCType,
        string memory tokenName,
        string memory tokenSymbol,
        uint8 tokenDecimals
    ) public {

        TokenSCCreatedEvent memory e = TokenSCCreatedEvent({
            TokenSCAddress: tokenSCAddress,
            TokenSCType: TokenSCType,
            Deployer: deployer,
            TokenName: tokenName,
            TokenSymbol: tokenSymbol,
            TokenDecimals: tokenDecimals
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
        TokenModel.ElGamalToken memory oldAmount,
        TokenModel.ElGamalToken memory newAmount
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
        TokenModel.TokenEntity memory entity,
        address minter
    ) public {
        TokenMintedEvent memory eventData = TokenMintedEvent({
            to : to,
            token : entity,
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
        string memory rpcUrl,
        string memory nodeUrl,
        string memory httpUrl
    ) public {
        InstitutionRegisteredEvent memory e = InstitutionRegisteredEvent({
            institutionAddress: institutionAddress,
            name: name,
            publicKey: publicKey,
            rpcUrl: rpcUrl,
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
        string memory rpcUrl,
        string memory nodeUrl,
        string memory httpUrl
    ) public {
        InstitutionUpdatedEvent memory e = InstitutionUpdatedEvent({
        institutionAddress: institutionAddress,
        name: name,
        rpcUrl: rpcUrl,
        nodeUrl: nodeUrl,
        httpUrl: httpUrl
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(eventSource, owner, "InstitutionUpdated", body);
    }

    function triggerReplaceInstCallersEvent(
        IL2Event _l2Event,
        address eventSource,
        address owner,
        address institutionAddress,
        address[] memory callers
    ) public {
        ReplaceInstCallersEvent memory e = ReplaceInstCallersEvent({
            institutionAddress: institutionAddress,
            callers: callers
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(eventSource, owner, "ReplaceInstCallers", body);
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

    function triggerInstitutionManagerBlacklistUpdatedEvent(
        IL2Event _l2Event,
        address eventSource,
        address owner,
        address managerAddress,
        bool blacklisted
    ) public {
        InstitutionManagerBlacklistUpdatedEvent memory e = InstitutionManagerBlacklistUpdatedEvent({
            managerAddress: managerAddress,
            blacklisted: blacklisted
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(eventSource, owner, "InstitutionManagerBlacklistUpdated", body);
    }

    function triggerBankPermissionUpdatedEvent(
        IL2Event _l2Event,
        address eventSource,
        address msgSender,
        address bankAddress,
        bool blocked
    ) public {
        BankPermissionUpdatedEvent memory e = BankPermissionUpdatedEvent({
            bankAddress: bankAddress,
            blocked: blocked
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(eventSource, msgSender, "BankPermissionUpdated", body);
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
        address setter, TokenModel.ElGamalToken memory limit) internal {

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

    function triggerRollupForMintAllowedSet( IL2Event _l2Event, address eventSource,address owner, address minter, TokenModel.GrumpkinPublicKey memory minterPk, TokenModel.ElGamalToken memory tokenAmount) public {
        RollupMintAllowedSetEvent memory e = RollupMintAllowedSetEvent({
            ownerAddress: owner,
            minterAddress: minter,
            minterPk: minterPk,
            token: tokenAmount
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendRollupEvent(eventSource, "RollupMintAllowedSet", body);
    }


    function triggerRollupForMint( IL2Event _l2Event, address eventSource,
        TokenModel.TokenEntity memory entity, uint256[22] calldata publicInputs, uint256[8] calldata proof, uint256 initialAllowId, uint256 newAllowId, uint256 backupId) public {

        RollupMintEvent memory e = RollupMintEvent({
            token: entity,
            publicInputs: publicInputs,
            proof: proof,
            initialAllowId: initialAllowId,
            newAllowId:newAllowId,
            backupId: backupId
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendRollupEvent(eventSource, "RollupMint", body);
    }

    function triggerRollupForBurn(IL2Event _l2Event, address eventSource, RollupBurnEvent memory e) public {
        bytes memory body = abi.encode(e);
        _l2Event.sendRollupEvent(eventSource, "RollupBurn", body);
    }

    function triggerRollupForSplit(IL2Event _l2Event, address eventSource,  TokenModel.TokenEntity[] memory consumedTokens,
        TokenModel.TokenEntity[] calldata newTokens,  uint256[20] calldata publicInputs ,uint256[8] calldata proof) public {
        RollupSplitEvent memory e = RollupSplitEvent({
            consumedTokens: consumedTokens,
            newTokens: newTokens,
            publicInputs: publicInputs,
            proof: proof
        });

        bytes memory body = abi.encode(e);
        _l2Event.sendRollupEvent(eventSource, "RollupSplit", body);
    }

    function triggerRollupForTransfer( IL2Event _l2Event, address eventSource, address from, address to, TokenModel.GrumpkinPublicKey memory pk, uint256 tokenId) public {
        RollupTransferEvent memory e = RollupTransferEvent({
            fromAddress: from,
            toAddress: to,
            pk: pk,
            tokenId: tokenId
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendRollupEvent(eventSource, "RollupTransfer", body);
    }

    function triggerRollupForCancel( IL2Event _l2Event, address eventSource, address from, address to, TokenModel.GrumpkinPublicKey memory pk, uint256 tokenId) public {
        RollupTransferEvent memory e = RollupTransferEvent({
            fromAddress: from,
            toAddress: to,
            pk: pk,
            tokenId: tokenId
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendRollupEvent(eventSource, "RollupCancel", body);
    }

    function triggerRollupForConversionMint( IL2Event _l2Event, address eventSource, TokenModel.TokenEntity memory token,  uint256[8] calldata proof,
            uint256[9] calldata publicInputs) public {
        RollupConversionMintEvent memory e = RollupConversionMintEvent({
            token: token,
            proof: proof,
            publicInputs:publicInputs
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendRollupEvent(eventSource, "RollupConvertMint", body);
    }

    function triggerRollupForConversionBurn( IL2Event _l2Event, address eventSource, TokenModel.TokenEntity memory token,  uint256[8] calldata proof,
        uint256[8] calldata publicInputs) public {
        RollupConversionBurnEvent memory e = RollupConversionBurnEvent({
            token: token,
            proof: proof,
            publicInputs:publicInputs
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendRollupEvent(eventSource, "RollupConvertBurn", body);
    }

    function triggerRollupForApproval(IL2Event _l2Event, address eventSource,  TokenModel.TokenEntity[] memory consumedTokens,
        TokenModel.TokenEntity[] calldata newTokens,  uint256[20] calldata publicInputs ,uint256[8] calldata proof) public {
        RollupApprovalEvent memory e = RollupApprovalEvent({
            consumedTokens: consumedTokens,
            newTokens: newTokens,
            publicInputs: publicInputs,
            proof: proof
        });

        bytes memory body = abi.encode(e);
        _l2Event.sendRollupEvent(eventSource, "RollupApproval", body);
    }

    function triggerRollupForTransferFrom( IL2Event _l2Event, address eventSource, address from, address to, TokenModel.GrumpkinPublicKey memory pk, uint256 tokenId) public {
        RollupTransferEvent memory e = RollupTransferEvent({
            fromAddress: from,
            toAddress: to,
            pk: pk,
            tokenId: tokenId
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendRollupEvent(eventSource, "RollupTransferFrom", body);
    }

    function triggerRollupForRevokeApproval( IL2Event _l2Event, address eventSource, address from, address to, TokenModel.GrumpkinPublicKey memory pk, uint256 tokenId) public {
        RollupTransferEvent memory e = RollupTransferEvent({
            fromAddress: from,
            toAddress: to,
            pk: pk,
            tokenId: tokenId
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendRollupEvent(eventSource, "RollupRevokeApproval", body);
    }

    function triggerPrivateTotalSupplyRecordedEvent(
        IL2Event _l2Event,
        address eventSource,
        address msgSender,
        uint256 blockNumber,
        TokenModel.ElGamal memory privateTotalSupply
    ) public {
        PrivateTotalSupplyRecordedEvent memory e = PrivateTotalSupplyRecordedEvent({
            blockNumber: blockNumber,
            privateTotalSupply: privateTotalSupply
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(eventSource, msgSender, "PrivateTotalSupplyRecorded", body);
    }

    function triggerPrivateTotalSupplyRevealedEvent(
        IL2Event _l2Event,
        address eventSource,
        address msgSender,
        uint256 blockNumber,
        uint256 publicTotalSupply,
        TokenModel.ElGamal memory privateTotalSupply
    ) public {
        PrivateTotalSupplyRevealedEvent memory e = PrivateTotalSupplyRevealedEvent({
            blockNumber: blockNumber,
            publicTotalSupply: publicTotalSupply,
            privateTotalSupply: privateTotalSupply
        });
        bytes memory body = abi.encode(e);
        _l2Event.sendEvent(eventSource, msgSender, "PrivateTotalSupplyRevealed", body);
    }
}
