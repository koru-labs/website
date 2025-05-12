pragma solidity ^0.8.0;

import "./TokenModel.sol";

contract BankRegistration {

    address public owner;

    struct Point {
        uint256 x;
        uint256 y;
    }
    
    mapping(address => Point) public bankPoints;
    mapping(uint256 => mapping(uint256 => address)) public pointToBank;
    
    event BankRegistered(address indexed bankAddress, uint256 x,uint256 y);
    
    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    function register(address bankAddress, uint256 x, uint256 y) external onlyOwner {
        require(bankAddress != address(0), "Invalid address");
        
        address oldBank = pointToBank[x][y];
        if (oldBank != address(0) && oldBank != bankAddress) {
            delete bankPoints[oldBank];
        }
        
        bankPoints[bankAddress] = Point(x, y);
        pointToBank[x][y] = bankAddress;
        
        emit BankRegistered(bankAddress, x,y);
    }
    
    function getPoint(address bankAddress) external view returns (uint256,uint256) {
        return (bankPoints[bankAddress].x,bankPoints[bankAddress].y);
    }
    
    function getBankAddressByPoint(uint256 x, uint256 y) external view returns (address) {
        return pointToBank[x][y];
    }
    
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner address");
        owner = newOwner;
    }
} 