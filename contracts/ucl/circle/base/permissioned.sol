pragma solidity ^0.8.0;

import { Ownable } from "../../../usdc/v1/Ownable.sol";
import "../inst_user_registry/InstitutionUserRegistry.sol";
import "../lib/TokenEventLib.sol";
import "../event/IL2Event.sol";

abstract contract Permissioned is Ownable {
    mapping(address=>bool) public blockedBanks;
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

    function updateBlockedBank(address bankAddress, bool blocked)  external onlyOwner {
        if (!blocked) {
            delete blockedBanks[bankAddress];
        } else {
            blockedBanks[bankAddress] = true;
        }

        address l2EventAddress = address(0);
        if (address(_instRegistry) != address(0)) {
            l2EventAddress = _instRegistry.getEventAddress();
        }
        if (l2EventAddress != address(0)) {
            TokenEventLib.triggerBankPermissionUpdatedEvent(
                IL2Event(l2EventAddress),
                address(this),
                msg.sender,
                bankAddress,
                blocked
            );
        }
    }

    modifier onlyAllowedBank() {
        address userAddress = msg.sender;
        if (! isContract(userAddress)) {
            address managerAddress = _instRegistry.getValidatedInstitutionManager(userAddress);
            require(!_instRegistry.isInstitutionManagerBlacklisted(managerAddress), "institution manager blacklisted");
            require(!blockedBanks[managerAddress] , "bank is blocked in this token smart contract");
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
