// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PrivateTokenCore.sol";
import "./PrivateTokenApproval.sol";
import "./IPrivateERCToken.sol";

abstract contract PrivateERCToken is PrivateTokenCore, PrivateTokenApproval {
}