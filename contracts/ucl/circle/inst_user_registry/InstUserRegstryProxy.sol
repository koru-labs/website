pragma solidity ^0.8.0;

import "./InstUserDataTemplate.sol";

contract PercentRouterProxy is InstUserDataTemplate {
    address public admin;
    address public implementationA;
    address public implementationB;

    // Percent of traffic routed to implementationA (0 - 100)
    uint8 public percentageToB;



    constructor(address _implA) {
        require(_implA != address(0), "Invalid address");

        admin = msg.sender;
        implementationA = _implA;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Not admin");
        _;
    }

    function setImplementationA(
        address _implA
    ) external onlyAdmin {
        implementationA = _implA;
    }

    function setImplementationB(
        address _implB,
        uint8 _percentToB
    ) external onlyAdmin {
        require(_percentToB <= 100, "Invalid percentage");
        require(_implB != address(0), "Invalid address");

        implementationB = _implB;
        percentageToB = _percentToB;
    }

    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Zero address");
        admin = newAdmin;
    }

    fallback() external payable {
        address target = _pickImplementationByPolicy();
        require(target!=address(0), "no implemented");

        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), target, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }

    receive() external payable {}

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
         if (implementationA!=address(0)) {
             return implementationA;
         }
        if (implementationB!=address(0)) {
            return implementationB;
        }

       revert("Implementation is unavailable");
    }

}