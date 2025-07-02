pragma solidity ^0.8.0;

import { Ownable } from "../../../usdc/v1/Ownable.sol";
import "./InstitutionUserRegistry.sol";

abstract contract Permissioned is Ownable {
    mapping(address=>bool) allowedBanks;
    InstitutionUserRegistry internal _instRegistry;

    function initializePermission(InstitutionUserRegistry instRegistry)  internal {
        _instRegistry = instRegistry;
    }

    function updateAllowedBank(address bankAddress, bool allowed)  external onlyOwner {
        if (! allowed) {
            delete allowedBanks[bankAddress];
        } else {
            allowedBanks[bankAddress] =true ;
        }
    }

    modifier onlyAllowedBank() {
        address userAddress = msg.sender;
        address managerAddress = _instRegistry.getUserManager(userAddress);
        require(managerAddress != address(0), "bank/user is not registered");
        require(allowedBanks[managerAddress] , "bank is not allowed in this token smart contract");
        _;
    }
}