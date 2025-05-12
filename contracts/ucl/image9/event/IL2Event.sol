pragma solidity ^0.8.0;

interface IL2Event {
    function sendEvent(address sourceAddress, address bankAdmin, string memory topic, bytes memory eventBody) external ;
}