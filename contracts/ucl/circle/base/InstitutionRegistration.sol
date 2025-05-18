pragma solidity ^0.8.0;

import "../model/TokenModel.sol";

contract InstitutionRegistration {
    address public owner;
    
    // institution:
    // name
    // managerAddress
    // publicKey
    struct Institution {
        string name;
        address managerAddress;
        TokenModel.GrumpkinPublicKey publicKey;
    }
    
    // user:
    // address
    // managerAddress
    struct User {
        address userAddress;
        address managerAddress;
    }
    
    mapping(address => TokenModel.GrumpkinPublicKey) public institutionPublicKey;
    mapping(address => Institution) public institutions;
    mapping(address => User) public users;
    mapping(address => address) public userToManager;
    mapping(address => address[]) public managerToUsers;
    
    event InstitutionRegistered(address indexed institutionAddress, TokenModel.GrumpkinPublicKey indexed publicKey);
    event UserRegistered(address indexed userAddress, address indexed managerAddress);
    
    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    function register(address institutionAddress, TokenModel.GrumpkinPublicKey memory publicKey) external onlyOwner {
        require(institutionAddress != address(0), "Invalid address");

        institutionPublicKey[institutionAddress] = publicKey;
        
        emit InstitutionRegistered(institutionAddress, publicKey);
    }
    
    function registerInstitution(address institutionAddress, string memory name, TokenModel.GrumpkinPublicKey memory publicKey) external onlyOwner {
        require(institutionAddress != address(0), "Invalid address");
        
        Institution memory institution = Institution({
            name: name,
            managerAddress: institutionAddress,
            publicKey: publicKey
        });
        
        institutions[institutionAddress] = institution;
        institutionPublicKey[institutionAddress] = publicKey;
        
        emit InstitutionRegistered(institutionAddress, publicKey);
    }
    
    function registerUser(address userAddress, address managerAddress) external onlyOwner {
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
        managerToUsers[managerAddress].push(userAddress);
        
        emit UserRegistered(userAddress, managerAddress);
    }
    
    function getUserManager(address userAddress) public view returns (address) {
        return userToManager[userAddress];
    }
    
    function getInstitution(address managerAddress) public view returns (Institution memory) {
        return institutions[managerAddress];
    }
    
    function getManagerUsers(address managerAddress) public view returns (address[] memory) {
        return managerToUsers[managerAddress];
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner address");
        owner = newOwner;
    }

    function getInstitutionGrumpkinPublicKey(address institutionAddress) public view returns (TokenModel.GrumpkinPublicKey memory) {
        return institutionPublicKey[institutionAddress];
    }
}