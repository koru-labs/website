pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DummyToken is ERC20 {
    uint256 public value;
    uint256[100] public fixValues;  //6
    uint256[] public dynValues;
    uint256 private dynCount;

    struct Student {
        uint256 id;
        string name;
        uint256 score;
    }

    struct Class {
        uint256  id;
        mapping(uint256=> Student)  students;
    }

    mapping(address=> Student) public firstClass;
    mapping(address=> Class) public otherClasses;

    constructor() ERC20("Dummy", "DMY") {
        value = 1;
    }

    function update() public {
    }

    function addFixValue(uint256 value) public {
        fixValues[1] = value;
    }

    function addDynValue(uint256 value) public {
        dynValues[dynCount] = value;
        dynCount = dynCount +1;
    }
    function recentDynValue() public view returns(uint256) {
        if (dynCount ==0){
            return 0;
        } else {
            return dynValues[dynCount-1];
        }
    }
    function updateFirstClassStudent(Student memory s ) public {
        firstClass[msg.sender] = s;
    }

    function updateOtherClassStudent(uint256 id, Student memory s ) public {
        otherClasses[msg.sender].id = 100;
        otherClasses[msg.sender].students[id] = s;
    }

    function getOtherClassStudent(uint256 id) public view returns (Student memory) {
        return  otherClasses[msg.sender].students[id];
    }
}