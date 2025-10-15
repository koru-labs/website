// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PrivateUSDC.sol";

/**
 * @dev Extended implementation used for testing proxy routing.
 */
contract PrivateUSDCV2 is PrivateUSDC {
    function marker() external pure returns (string memory) {
        return "PrivateUSDCV2";
    }
}
