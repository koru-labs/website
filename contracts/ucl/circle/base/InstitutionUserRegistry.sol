pragma solidity ^0.8.0;

import "../model/TokenModel.sol";
import "../lib/TokenEventLib.sol";
import "../event/IL2Event.sol";

contract InstitutionUserRegistry {
    address public owner;
    IL2Event public l2Event;

    struct Institution {
        string name;
        address managerAddress;
        TokenModel.GrumpkinPublicKey publicKey;
    }

    struct User {
        address userAddress;
        address managerAddress;
    }

    mapping(address => Institution) public institutions;
    mapping(address => User) public users;
    mapping(address => address) public userToManager;
    mapping(address => address[]) public managerToUsers;
    
    constructor(address _l2Event) {
        owner = msg.sender;
        l2Event = IL2Event(_l2Event);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    function registerInstitution(address institutionAddress, string memory name, TokenModel.GrumpkinPublicKey memory publicKey) external onlyOwner {
        require(institutionAddress != address(0), "Invalid address");
        
        Institution memory institution = Institution({
            name: name,
            managerAddress: institutionAddress,
            publicKey: publicKey
        });
        
        institutions[institutionAddress] = institution;
        
        TokenEventLib.triggerInstitutionRegisteredEvent(
            l2Event,
            address(this),
            owner,
            institutionAddress,
            name,
            publicKey
        );
    }
    
    function registerUserByOwner(address userAddress, address managerAddress) external onlyOwner {
        require(userAddress != address(0), "Invalid user address");
        require(managerAddress != address(0), "Invalid manager address");
        require(institutions[managerAddress].managerAddress != address(0), "Manager not registered");
        require(userToManager[userAddress] == address(0), "User already registered");
        
        User memory user = User({
            userAddress: userAddress,
            managerAddress: managerAddress
        });
        
        users[userAddress] = user;
        userToManager[userAddress] = managerAddress;
        
        TokenEventLib.triggerUserRegisteredEvent(
            l2Event,
            address(this),
            owner,
            userAddress,
            managerAddress
        );
    }
    
    function registerUser(address managerAddress) external {
        require(managerAddress != address(0), "Invalid manager address");
        require(institutions[managerAddress].managerAddress != address(0), "Manager not registered");
        require(userToManager[msg.sender] == address(0), "User already registered");
        
        User memory user = User({
            userAddress: msg.sender,
            managerAddress: managerAddress
        });
        
        users[msg.sender] = user;
        userToManager[msg.sender] = managerAddress;
        
        TokenEventLib.triggerUserRegisteredEvent(
            l2Event,
            address(this),
            owner,
            msg.sender,
            managerAddress
        );
    }
    
    function getUserManager(address userAddress) public view returns (address) {
        return userToManager[userAddress];
    }
    
    function getInstitution(address managerAddress) public view returns (Institution memory) {
        return institutions[managerAddress];
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner address");
        owner = newOwner;
    }

    function getUserInstGrumpkinPubKey(address userAddress) public view returns (TokenModel.GrumpkinPublicKey memory) {
        address institutionAddress = getUserManager(userAddress);
        return institutions[institutionAddress].publicKey;
    }

}