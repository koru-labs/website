// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IHamsL1Event {
    function sendEvent(string memory eventHead, string memory eventBody) external;
}

contract HamsL1Event is IHamsL1Event {
    event EventReceived(string eventHead, string eventBody);

    struct EventHead {
        string eventHash;
        string eventType;
        string publicKey;
    }


    function sendEvent(string memory eventHead, string memory eventBody) external override {
        emit EventReceived(
            eventHead,
            eventBody
        );
    }


}