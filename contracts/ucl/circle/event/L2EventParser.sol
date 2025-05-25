// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./L2EventDefinitions.sol";

contract L2EventParser {
    function parseTokenSCCreated(TokenSCCreatedEvent memory e) public view {}
    function parseTokenDetail(TokenDetailBody memory e) public view {}
    function parseInstitutionRegistered(InstitutionRegisteredEvent memory e) public view {}
    function parseUserRegistered(UserRegisteredEvent memory e) public view {}
    function parseTokenMinted(TokenMintedEvent memory e) public view {}
    function parseTokenDeleted(TokenDeletedEvent memory e) public view {}
    function parseTokenReceived(TokenReceivedEvent memory e) public view {}
    function parseTokenBurned(TokenBurnedEvent memory e) public view {}
    function parseAllowanceUpdated(AllowanceUpdatedEvent memory e) public view {}

    function parseAllowanceCreated(AllowanceCreatedEvent memory e) public view {}
    function parseAllowanceReceived(AllowanceReceivedEvent memory e) public view {}

    function parseTokenMeta(TokenMetaBody memory e) public view { }
    function parseTokenRemovedEvent(TokenRemovedEvent memory e) public view { }
    function parseMinterAllowedSet(MinterAllowedSetEvent memory e) public view {}
}