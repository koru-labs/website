pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../model/TokenModel.sol";
import "../lib/TokenEventLib.sol";
import "../event/IL2Event.sol";
import "./InstUserDataTemplate.sol";

contract InstitutionUserRegistryB is InstUserDataTemplate {

    function getEventAddress() public view returns (address) {
        return address(0);
    }
}