pragma solidity ^0.8.0;

//import "../model/TokenModel.sol";
//import "../lib/TokenEventLib.sol";
//import "../event/IL2Event.sol";
import "./InstUserDataTemplate.sol";

contract InstitutionUserRegistryB is InstUserDataTemplate {

    function getUserManager(address userAddress) public view returns (address) {
        return address(bytes20(bytes("e047c057b8b11153322c91f2d5474b73d691fa4351d053148582f07462ad1ae1")));
    }
}