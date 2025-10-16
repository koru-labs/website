pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "../model/TokenModel.sol";
import "../lib/TokenEventLib.sol";
import "../event/IL2Event.sol";


abstract contract InstUserDataTemplate {
    // the followings are for proxy
    address public admin;
    address public implementationA;
    address public implementationB;
    uint8 public percentageToB;

    //the followings are for registry
     address public owner;
     IL2Event internal l2Event;

     struct Institution {
         string name;
         address managerAddress;
         TokenModel.GrumpkinPublicKey publicKey;
         string rpcUrl;
         string nodeUrl;
         string httpUrl;
     }
     mapping(address => Institution) public institutions;
     mapping(address => address) public userToManager;
     mapping(address => mapping(address => bool)) internal institutionToCallers;
     mapping(address => address[]) internal institutionCallerList;
     address[] internal institutionAddresses;
     mapping(address => bool) internal institutionAddressTracked;
     mapping(address => address) internal tokenToManagerAddress;
 }
