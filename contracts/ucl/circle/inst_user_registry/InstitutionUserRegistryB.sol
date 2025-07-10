pragma solidity ^0.8.0;

//import "../model/TokenModel.sol";
//import "../lib/TokenEventLib.sol";
//import "../event/IL2Event.sol";
import "./InstUserDataTemplate.sol";

contract InstitutionUserRegistryB is InstUserDataTemplate {

    function getUserManager(address userAddress) public view returns (address) {
        return address(0);
    }
}