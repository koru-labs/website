pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DummyToken is ERC20 {
    constructor() ERC20("Dummy", "DMY") {}

    function echo(string memory input) public pure returns (string memory) {
        return input;
    }
}