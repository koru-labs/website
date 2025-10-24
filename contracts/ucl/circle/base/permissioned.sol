pragma solidity ^0.8.0;

import { Ownable } from "../../../usdc/v1/Ownable.sol";
import "../inst_user_registry/InstitutionUserRegistry.sol";

abstract contract Permissioned is Ownable {
    mapping(address=>bool) public allowedBanks;
    InstitutionUserRegistry internal _instRegistry;

    function initializePermission(InstitutionUserRegistry instRegistry)  internal {
        _instRegistry = instRegistry;
    }

    function updatePermissionRegistry(InstitutionUserRegistry newInstRegistry) external onlyOwner {
        require(address(newInstRegistry) != address(0), "Invalid registry address");
        require(address(newInstRegistry) != address(_instRegistry), "Same registry");
        _instRegistry = newInstRegistry;
    }

    function getPermissionRegistry() external view returns (InstitutionUserRegistry) {
        return _instRegistry;
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
        if (! isContract(userAddress)) {
            address managerAddress = _instRegistry.getUserManager(userAddress);
            require(managerAddress != address(0), "bank/user is not registered");
            require(allowedBanks[managerAddress] , "bank is not allowed in this token smart contract");
        }
        _;
    }

    function isContract(address account) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(account)
        }
        return size > 0;
    }
}