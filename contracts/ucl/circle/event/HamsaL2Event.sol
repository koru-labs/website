// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Strings.sol";
import "./IL2Event.sol";

contract HamsaL2Event is IL2Event {
    uint256 eventCont;
    uint256 rollupEventCont;
    event EventReceived(string eventId, address eventSource, address eventAccount, string topic, bytes  eventBody);
    event RollupEventReceived(string eventId, address eventSource, string topic, bytes  eventBody);
    
    function sendEvent(address eventSource, address eventAccount, string memory topic, bytes memory eventBody)  public   {
        eventCont ++;
        string memory eventId=Strings.toString(eventCont);

        emit EventReceived(
            eventId,
            eventSource,
            eventAccount,
            topic,
            eventBody
        );
    }

    function sendRollupEvent(address eventSource, string memory topic, bytes memory eventBody) public {
        rollupEventCont ++;
        string memory eventId=Strings.toString(eventCont);

        emit RollupEventReceived(
            eventId,
            eventSource,
            topic,
            eventBody
        );
    }
}