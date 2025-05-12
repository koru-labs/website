// SPDX-License-Identifier: AGPL-3.0

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";


contract Simple is ERC20Burnable {
    string public brand ;

    constructor (string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 100000000000);
    }

    function setBrand(string memory _brand) public {
        brand=_brand;
    }

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }
}