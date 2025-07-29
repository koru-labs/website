// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IL2Event {
    function sendEvent(address eventSource, address eventAccount, string memory topic, bytes memory eventBody) external ;
    function sendRollupEvent(address eventSource,  string memory topic, bytes memory eventBody) external ;
}