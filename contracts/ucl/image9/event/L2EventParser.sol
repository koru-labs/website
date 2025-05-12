pragma solidity ^0.8.0;

import "./L2EventDefinitions.sol";

contract L2EventParser {
    function parseTokenSCCreated(TokenSCCreatedEvent memory e) public view {}
    function parseTokenDetail(TokenDetailBody memory e) public view {}
    function parseTokenMeta(TokenMetaBody memory e) public view { }
    function parseTokenRemovedEvent(TokenRemovedEvent memory e) public view { }
}