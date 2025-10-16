// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./HamsaL2Event.sol";

/**
 * @dev Extended version used for testing proxy A/B routing.
 *      Provides an additional marker function so tests can distinguish the implementation.
 */
contract HamsaL2EventV2 is HamsaL2Event {
    function marker() external pure returns (string memory) {
        return "HamsaL2EventV2";
    }
}
