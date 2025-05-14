pragma solidity ^0.8.0;

import "../model/TokenModel.sol";

contract BankRegistration {

    address public owner;
    mapping(address => TokenModel.GrumpkinPublicKey) public bankPublicKey;
    
    event BankRegistered(address indexed bankAddress, TokenModel.GrumpkinPublicKey indexed publicKey);
    
    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    function register(address bankAddress, TokenModel.GrumpkinPublicKey memory publicKey) external onlyOwner {
        require(bankAddress != address(0), "Invalid address");

        bankPublicKey[bankAddress] = publicKey;
        
        emit BankRegistered(bankAddress, publicKey);
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner address");
        owner = newOwner;
    }

    function getBankGrumpkinPublicKey(address bankAddress) public view returns (TokenModel.GrumpkinPublicKey memory) {
        return bankPublicKey[bankAddress];
    }
}