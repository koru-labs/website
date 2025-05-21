// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Strings.sol";
import "./IL2Event.sol";

contract HamsaL2Event is IL2Event {
    uint256 eventCont;
    event EventReceived(string eventId, address eventSource, address eventAccount, string topic, bytes  eventBody);

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
}