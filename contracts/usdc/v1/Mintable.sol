pragma solidity ^0.8.0;

abstract contract Mintable {
    address public masterMinter;
    mapping(address => bool) internal minters;
    mapping(address => uint256) internal minterAllowed;

    modifier onlyMinters() {
        require(minters[msg.sender], "FiatToken: caller is not a minter");
        _;
    }

    modifier onlyMasterMinter() {
        require(
            msg.sender == masterMinter,
            "FiatToken: caller is not the masterMinter"
        );
        _;
    }


}