pragma solidity ^0.8.0;

import "../circle/base/Ownable.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

contract HamsaTransparentProxy is TransparentUpgradeableProxy {
    uint8   _implBPercent = 0;
    address _implAAddress;
    address _implBAddress;

    constructor(address implAddress) TransparentUpgradeableProxy(implAddress, msg.sender, new bytes(0)) {
        _implAAddress = implAddress;
    }

    function setImplementationA(address implAddress) external ifAdmin {
        require(implAddress!=address (0), "invalid implementation address");
        _implAAddress = implAddress;
    }

    function setImplementationB(address implAddress) external ifAdmin {
        require(implAddress!=address (0), "invalid implementation address");
        _implBAddress = implAddress;
    }

    function setImplBPercent(uint8 percent) external ifAdmin {
        require(percent<=100, "invalid percent, must be in the range [0, 100]");
        _implBPercent = percent;
    }

    function _implementation() internal view virtual override returns (address) {
        address picked = pickImplementationByABPolicy();

        if (picked != address(0)) {
            return picked;
        }

        if (_implAAddress!= address(0)){
            return _implAAddress;
        }
        if (_implBAddress!=address(0)) {
            return _implBAddress;
        }
        revert ("no valid implementation");
    }

    function pickImplementationByABPolicy() internal view returns (address) {
        if (_implBPercent == 0 ) {
            return _implAAddress;

        } else if (_implBPercent == 100) {
            return _implBAddress;
        }

        uint8 rnd = getRandom();
        if (rnd <= _implBPercent) {
            return _implBAddress;
        } else {
            return _implAAddress;
        }
    }

    function getRandom() internal view returns (uint8) {
        uint256 hash = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao, // use block.difficulty in <= 0.8.17
                    msg.sender
                )
            )
        );
        return uint8(hash % 101);
    }

}