pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../model/TokenModel.sol";
import "../lib/TokenEventLib.sol";
import "../event/IL2Event.sol";


abstract contract InstUserDataTemplate {
     address public owner;
     IL2Event internal l2Event;

     struct Institution {
         string name;
         address managerAddress;
         TokenModel.GrumpkinPublicKey publicKey;
         string nodeUrl;
         string httpUrl;
     }
     mapping(address => Institution) public institutions;
     mapping(address => address) public userToManager;

 }