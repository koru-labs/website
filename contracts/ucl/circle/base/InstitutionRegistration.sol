pragma solidity ^0.8.0;

import "../model/TokenModel.sol";

contract InstitutionRegistration {
    address public owner;
    mapping(address => TokenModel.GrumpkinPublicKey) public institutionPublicKey;
    
    event InstitutionRegistered(address indexed institutionAddress, TokenModel.GrumpkinPublicKey indexed publicKey);
    
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
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner address");
        owner = newOwner;
    }

    function getInstitutionGrumpkinPublicKey(address institutionAddress) public view returns (TokenModel.GrumpkinPublicKey memory) {
        return institutionPublicKey[institutionAddress];
    }
}