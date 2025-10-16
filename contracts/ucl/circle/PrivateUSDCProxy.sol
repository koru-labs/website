// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./base/PrivateTokenData.sol";

/**
 * @dev Upgradeable proxy for PrivateUSDC featuring A/B routing without relying on StorageSlot.
 *      Shares storage layout with the implementation via PrivateTokenData.
 */
contract PrivateUSDCProxy is PrivateTokenData {
    event ProxyAdminTransferred(address indexed previousAdmin, address indexed newAdmin);
    event ImplementationAUpdated(address indexed newImplementation);
    event ImplementationBUpdated(address indexed newImplementation, uint8 percentageToB);

    constructor(address implementationA_) {
        require(implementationA_ != address(0), "Invalid implementation");
        _proxyAdmin = msg.sender;
        _implementationA = implementationA_;
        emit ProxyAdminTransferred(address(0), msg.sender);
        emit ImplementationAUpdated(implementationA_);
    }

    modifier onlyAdmin() {
        require(msg.sender == _proxyAdmin, "Not admin");
        _;
    }

    function proxyAdmin() external view returns (address) {
        return _proxyAdmin;
    }

    function implementationA() public view returns (address) {
        return _implementationA;
    }

    function implementationB() public view returns (address) {
        return _implementationB;
    }

    function percentageToB() public view returns (uint8) {
        return _percentageToB;
    }

    function setImplementationA(address implementationA_) external onlyAdmin {
        require(implementationA_ != address(0), "Invalid implementation");
        _implementationA = implementationA_;
        emit ImplementationAUpdated(implementationA_);
    }

    function setImplementationB(address implementationB_, uint8 percentageToB_) external onlyAdmin {
        require(percentageToB_ <= 100, "Invalid percentage");
        if (percentageToB_ > 0) {
            require(implementationB_ != address(0), "Implementation B required");
        }
        _implementationB = implementationB_;
        _percentageToB = percentageToB_;
        emit ImplementationBUpdated(implementationB_, percentageToB_);
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Zero admin");
        emit ProxyAdminTransferred(_proxyAdmin, newAdmin);
        _proxyAdmin = newAdmin;
    }

    fallback() external payable {
        _delegate(_pickImplementationByPolicy());
    }

    receive() external payable {
        _delegate(_pickImplementationByPolicy());
    }

    function _delegate(address target) internal {
        require(target != address(0), "Implementation missing");

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), target, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }

    function _pickImplementationByPolicy() internal view returns (address) {
        if (_percentageToB == 0 || _implementationB == address(0)) {
            return _implementationA;
        }
        if (_percentageToB >= 100) {
            return _implementationB;
        }
        if (_implementationA == address(0)) {
            return _implementationB;
        }

        uint256 rand = uint256(
            keccak256(abi.encodePacked(block.prevrandao, msg.sender, gasleft(), block.timestamp))
        ) % 100;
        return rand < _percentageToB ? _implementationB : _implementationA;
    }
}
