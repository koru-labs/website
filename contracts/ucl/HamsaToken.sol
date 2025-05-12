// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract HamsaToken is ERC20Burnable {

    using SafeMath for uint256;

    // Events
    event HamsaTransferMade(address indexed from, address indexed to, uint256 value,  uint256 fromBalance, uint256 toBalance);
    event HamsaMintMade(address indexed account, address indexed minter, uint256 value, uint256 fromBalance, uint256 toBalance);
    event HamsaBurnMade(address indexed burner, address indexed account, uint256 value, uint256 fromBalance, uint256 toBalance);

    // admin account
    address public admin;
    // deposit
    struct Deposit {
        address account;
        uint256 value;
    }
    mapping(address => Deposit) public allDeposit;

    // frozen made,include account,message,value
    struct Frozen {
        address account;
        uint256 value;
    }
    mapping(address => Frozen) public frozen;

    constructor() ERC20("HamsaToken", "HMT") {
        admin = msg.sender;
        _mint(msg.sender, 100000000000);
    }

    // Example methods that trigger the events
    function transfer(address to, uint256 amount) public override returns (bool) {
        (uint256 fromBalance, uint256 toBalance)=getFromAndToBalance(msg.sender, to);
        _transfer(msg.sender, to, amount);
        emit HamsaTransferMade(msg.sender, to, amount,fromBalance,toBalance);
        return true;
    }

    function approve(address spender,uint256 amount) public virtual override returns (bool) {
        (uint256 fromBalance, uint256 toBalance)=getFromAndToBalance(msg.sender, spender);
        _approve(msg.sender, spender, amount);
        return true;
    }

    function mint(address account, uint256 amount) public virtual {
        uint256 balance=balanceOf(account);
        _mint(account, amount);
        emit HamsaMintMade(address(0) ,account, amount, 0, balance);
    }

    function burn(uint256 amount) public virtual override {
        uint256 balance=balanceOf(msg.sender);
        super.burn(amount);
        emit HamsaBurnMade(msg.sender, address(0) ,amount, balance, 0);
    }

    function deposit(address depositor,address account,uint256 amount) public virtual {
        (uint256 fromBalance, uint256 toBalance)=getFromAndToBalance(depositor,account);
        _transfer(depositor, account, amount);
    }

    function withdraw(address withdrawer, address account,uint256 amount) public virtual  {
        (uint256 fromBalance, uint256 toBalance)=getFromAndToBalance(msg.sender,address(0));
        _transfer(account, withdrawer, amount);
    }

    function freezeAccount(address  account, address freezer, uint256 amount) public virtual {
        (uint256 fromBalance, uint256 toBalance) =getFromAndToBalance(account, freezer);
        frozen[freezer] = Frozen(freezer, amount);
    }

    function unfreezeAccount(address  account, address  unfreezer,uint256 amount) public virtual onlyAdmin{
        (uint256 fromBalance, uint256 toBalance)=getFromAndToBalance(account,unfreezer);
        frozen[unfreezer] = Frozen(unfreezer, frozen[unfreezer].value.sub(amount));
    }

    function getFromAndToBalance(address from, address to) public view returns (uint256,uint256) {
        if (to == address(0)) {
            return (balanceOf(from), 0);
        }
        return (balanceOf(from), balanceOf(to));
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
}
