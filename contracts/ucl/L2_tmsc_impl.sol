pragma solidity ^0.8.0;

import "./IL2TMSC.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "./ucl_base.sol";


contract L2TMSC is UCLBase, IL2TMSC, ERC1155Holder {
    struct TokenLedger {
        mapping(uint256 => mapping(address => uint256)) typeLedgers;
        mapping(uint256 => mapping(address => mapping(address => uint256))) typeAllowances;
    }

    mapping(address => TokenLedger) _ledgers;
    mapping(address => bool) _admins;
    uint256 _adminCount=0;
    address constant private _escrowAddress = 0x993120Ffa250CF1879880D440cff0176752c17C2;

    modifier onlyAdminForSeeded() {
        if ( _adminCount != 0 && msg.sender != _escrowAddress) {
            require(_admins[msg.sender] == true, "only admin account is allowed for this action");
        }
        _;
    }

    // constructor is not called when this smart contract is seeded in L2
    constructor() {
        require(msg.sender != address(0), "invalid admin address");
        _admins[msg.sender] =true;
        _adminCount++;
    }

    function updateAdmin(address admin, bool flag) onlyAdminForSeeded external returns (bool) {
        if (_admins[admin] ==true) {
            if (flag == false) {
                _admins[admin] = false;
                _adminCount --;
            }

        } else if (_admins[admin] ==false ) {
            if (flag == true ) {
                _admins[admin] = true;
                _adminCount ++ ;
            }
        }
        return true;
    }

    function balanceOf(address account, address token_address, uint256 token_type)
    validAddress(token_address, "invalid token address") external view returns (uint256) {

        return _ledgers[token_address].typeLedgers[token_type][account];
    }


    function transfer(address to, address token_address, uint256 token_type, uint256 amount)
    validAddress(token_address, "invalid token address") validAddress(to, "invalid to address") external returns (bool) {

        _transfer(msg.sender, token_address, token_type, to, amount);
        return true;
    }

    function transferFrom(address from, address token_address, uint256 token_type, address to, uint256 amount)
    validAddress(from, "invalid from address") validAddress(token_address, "invalid token address")
    validAddress(to, "invalid to address") external returns (bool) {

        address spender = msg.sender;
        uint256 allowed = _ledgers[token_address].typeAllowances[token_type][from][spender];
        require(allowed >= amount, "insufficient allowed amount to spend");

        _transfer(from, token_address, token_type, to, amount);
        _ledgers[token_address].typeAllowances[token_type][from][spender] -= amount;
        return true;
    }


    function _transfer(address from, address token_address, uint256 token_type, address to, uint256 amount) internal {
        uint256 balance = _ledgers[token_address].typeLedgers[token_type][from];
        require(balance >= amount, "insufficient funds to transfer");

        _ledgers[token_address].typeLedgers[token_type][from] -= amount;
        _ledgers[token_address].typeLedgers[token_type][to] += amount;
    }

    function allowance(address owner, address token_address, uint256 token_type, address spender)
    validAddress(owner, "invalid owner address") validAddress(token_address, "invalid token address")
    validAddress(spender, "invalid spender address") external view returns (uint256) {

        uint256 amount = _ledgers[token_address].typeAllowances[token_type][owner][spender];
        return amount;
    }


    function approve(address spender, address token_address, uint256 token_type, uint256 amount)
    validAddress(spender, "invalid spender address") validAddress(token_address, "invalid token address") external returns (bool) {
        uint256 balance= _ledgers[token_address].typeLedgers[token_type][msg.sender];
        require(balance >= amount, "insufficient funds for approval");

        _ledgers[token_address].typeAllowances[token_type][msg.sender][spender] = amount;
        return true;
    }

    function mint(address account, address token_address, uint256 token_type, uint256 amount) onlyAdminForSeeded
    validAddress(token_address, "invalid token address") external returns (bool) {

        _ledgers[token_address].typeLedgers[token_type][account] += amount;
        return true;
    }

    function burn(address account, address token_address, uint256 token_type, uint256 amount)
    onlyAdminForSeeded() validAddress(account, "invalid account address")
    validAddress(token_address, "invalid token address") external returns (bool) {

        uint256 balance = _ledgers[token_address].typeLedgers[token_type][account];
        require(balance >= amount, "not enough funds to burn");

        _ledgers[token_address].typeLedgers[token_type][account] -= amount;
        return true;
    }
}