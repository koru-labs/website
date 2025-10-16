// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./HamsaL2EventDataTemplate.sol";

/**
 * @dev Upgradeable proxy for HamsaL2Event supporting A/B rollout similar to InstPercentRouterProxy.
 */
contract HamsaL2EventProxy is HamsaL2EventDataTemplate {
    constructor(address _implementationA) {
        require(_implementationA != address(0), "Invalid implementation");
        admin = msg.sender;
        implementationA = _implementationA;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    function setImplementationA(address _implementationA) external onlyAdmin {
        require(_implementationA != address(0), "Invalid implementation");
        implementationA = _implementationA;
    }

    function setImplementationB(address _implementationB, uint8 _percentageToB) external onlyAdmin {
        require(_percentageToB <= 100, "Invalid percentage");
        require(_implementationB != address(0), "Invalid implementation");
        implementationB = _implementationB;
        percentageToB = _percentageToB;
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Zero admin");
        admin = newAdmin;
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
        address decision = address(0);

        if (percentageToB == 100) {
            decision = implementationB;
        } else if (percentageToB == 0) {
            decision = implementationA;
        } else {
            uint256 rand = uint256(keccak256(abi.encodePacked(block.prevrandao, msg.sender, gasleft(), block.timestamp))) % 100;
            decision = rand < percentageToB ? implementationB : implementationA;
        }

        if (decision != address(0)) {
            return decision;
        }
        if (implementationA != address(0)) {
            return implementationA;
        }
        if (implementationB != address(0)) {
            return implementationB;
        }

        revert("Implementation is unavailable");
    }
}
