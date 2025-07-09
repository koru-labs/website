pragma solidity ^0.8.0;

import "../model/InstUserModel.sol";
import "./Ownable.sol";
import "./IInstUsrData.sol";

contract InstitutionUserData is Ownable , IInstUser {
    mapping(address => InstUserModel.Institution) private _institutions;
    mapping(address => address) private _userToManager;
    mapping(address => bool) private _allowedCallers;

    modifier onlyAllowedCaller() {
        require(_allowedCallers[msg.sender] == true || msg.sender == _owner, "caller is not allowed" );
        _;
    }

    function setAllowedCaller(address caller, bool allowed)  external onlyOwner  {
        require(caller!=address(0), "invalid address");
        _allowedCallers[caller] = allowed;
    }

    function getInstByManager(address managerAddress) external view override onlyAllowedCaller returns (InstUserModel.Institution memory) {
        return _institutions[managerAddress];
    }

    function saveInstByManager(address managerAddress, InstUserModel.Institution memory inst) override external  onlyAllowedCaller  {
         _institutions[managerAddress] = inst;
    }


    function getUserManager(address userAddress) external view override onlyAllowedCaller returns (address) {
        return _userToManager[userAddress];
    }

    function saveUserManager(address userAddress, address managerAddress) external override  onlyAllowedCaller {
        _userToManager[userAddress] = managerAddress;
    }
    function removeUser(address userAddress) external override {
        delete _userToManager[userAddress];
    }
}

