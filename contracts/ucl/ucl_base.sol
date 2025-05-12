pragma solidity ^0.8.0;


contract UCLBase {
    modifier onlyAdmin(address _admin) {
        require(msg.sender == _admin, "only admin account is allowed for this action");
        _;
    }

    modifier validAddress(address _address, string memory message) {
        require(_address != address(0), message);
        _;
    }
}