// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./L2EventDefinitions.sol";
import "./RollupEvent.sol";

contract L2EventParser {
    function parseTokenSCCreated(TokenSCCreatedEvent memory e) public view {}
    function parseTokenDetail(TokenDetailBody memory e) public view {}

    function parseInstitutionRegistered(InstitutionRegisteredEvent memory e) public view {}
    function parseInstitutionUpdated(InstitutionUpdatedEvent memory e) public view {}

    function parseUserRegistered(UserRegisteredEvent memory e) public view {}
    function parseTokenMinted(TokenMintedEvent memory e) public view {}

    function parseTokenDeleted(TokenDeletedEvent memory e) public view {}
    function parseTokenReceived(TokenReceivedEvent memory e) public view {}


    function parseTokenBurned(TokenBurnedEvent memory e) public view {}
    function parseAllowanceUpdated(AllowanceUpdatedEvent memory e) public view {}
    function parseTokenSupplyUpdated(TokenSupplyUpdatedEvent memory e) public view {}

    function parseAllowanceCreated(AllowanceCreatedEvent memory e) public view {}
    function parseAllowanceReceived(AllowanceReceivedEvent memory e) public view {}

    function parseTokenMeta(TokenMetaBody memory e) public view { }
    function parseTokenRemovedEvent(TokenRemovedEvent memory e) public view { }
    function parseMinterAllowedSet(MinterAllowedSetEvent memory e) public view {}
    function parseMinterAllowedUpdate(TokenMintAllowedUpdatedEvent memory e) public view {}

    function parseTokenActionCompleted(TokenActionCompletedEvent memory e) public view {}
    function parseTokenCanceled(TokenCanceledEvent memory e) public view {}

    function parseRollupMinted(RollupMintEvent memory e) public view {}
    function parseRollupSplit(RollupSplitEvent memory e) public view {}
    function parseRollupBurned(RollupBurnEvent memory e) public view {}
    function parseRollupTransferred(RollupTransferEvent memory e) public view {}
    function parseRollupMintAllowedSet(RollupMintAllowedSetEvent memory e) public view {}
    function parseRollupConversionMint(RollupConversionMintEvent memory e) public view {}
    function parseRollupConversionBurn(RollupConversionBurnEvent memory e) public view {}
    function parseRollupApproval(RollupApprovalEvent memory e) public view {}

    function parseInstitutionManagerBlacklistUpdated(InstitutionManagerBlacklistUpdatedEvent memory e) public view {}
    function parseBankPermissionUpdated(BankPermissionUpdatedEvent memory e) public view {}
}