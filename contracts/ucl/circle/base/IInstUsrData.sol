
pragma solidity ^0.8.0;

import "../model/InstUserModel.sol";

interface IInstUser {
    function getInstByManager(address managerAddress) external view  returns (InstUserModel.Institution memory);
    function saveInstByManager(address managerAddress, InstUserModel.Institution memory inst) external;
    function getUserManager(address userAddress) external view   returns (address) ;
    function saveUserManager(address userAddress, address managerAddress) external;
    function removeUser(address userAddress) external;
}
