pragma solidity ^0.8.0;

import "./IL1TMSC.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "./ucl_base.sol";

contract L1TMSC is UCLBase, IL1TMSC, ERC1155Holder {
    struct BankLedger {
        mapping(address => mapping(uint256 => uint256)) ledger;
    }

    enum TokenStandard { ERC20, ERC1155 }
    mapping(address=> TokenStandard) _tokenScType;

    mapping(address => BankLedger)  _ledgers;
    address _bridge;
    address _admin;
    mapping(address => bool) _bankAdmins;

    uint256  tokenTypeCreated=0;
    mapping (uint256 => uint256) public tokenTypeCreatedMap;

    modifier onlyBridge() {
        require(msg.sender == _bridge, "only bridge address is allowed for this action");
        _;
    }

    modifier onlyBankAdmin() {
        require(_bankAdmins[msg.sender] == true, "only bank admins are allowed for this action");
        _;
    }

    constructor (address admin_address)
    validAddress(admin_address, "invalid L1-TMSC admin address") {
        _admin = admin_address;
    }

    function updateBankAdmin(address bank_admin, bool status)
    onlyAdmin(_admin) validAddress(bank_admin, "invalid bank admin address") public returns (bool) {

        _bankAdmins[bank_admin] = status;
        return _bankAdmins[bank_admin];
    }

    //The bridge contract has transferred tokens to tmsc. This contract is only used for accounting.
    function depositErc20From(address sender, IERC20 token_address, address bank_admin,
        address recipient, uint256 amount) onlyBridge() validAddress(sender, "invalid sender address")
    validAddress(address(token_address), "invalid token address") validAddress(bank_admin, "invalid bank admin address")
    validAddress(recipient, "invalid recipient address") public returns (bool) {

        _ledgers[bank_admin].ledger[address(token_address)][uint256(0)] += amount;
        _tokenScType[address(token_address)] = TokenStandard.ERC20;

        return true;
    }
    //The bridge contract has transferred tokens to tmsc. This contract is only used for accounting.
    function depositErc1155From(address sender, IERC1155 token_address, uint256 token_type,
        address bank_admin, address recipient, uint256 amount) onlyBridge() validAddress(sender, "invalid sender address")
    validAddress(address(token_address), "invalid token address") validAddress(bank_admin, "invalid bank admin address")
    validAddress(recipient, "invalid recipient address") public returns (bool) {

        _ledgers[bank_admin].ledger[address(token_address)][token_type] += amount;
        _tokenScType[address(token_address)] = TokenStandard.ERC1155;

        return true;
    }

    function settle(address bank_admin_to, address token_address, uint256 token_type,
        uint256 amount, uint256[] calldata bundleHashes, uint256[] calldata amounts) onlyBankAdmin() validAddress(token_address, "invalid token address")
    validAddress(bank_admin_to, "invalid 'to bank admin' address") public returns (bool) {

        address bank_admin_from = msg.sender;

        uint256 balance = _ledgers[bank_admin_from].ledger[address(token_address)][token_type];
        require(balance >= amount, "insufficient funds");
        require(bundleHashes.length == amounts.length, "bundle hashes and amounts length mismatch");
        
        // Verify that the sum of amounts equals the total amount
        uint256 totalAmountFromDetails = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmountFromDetails += amounts[i];
        }
        require(totalAmountFromDetails == amount, "sum of amounts does not match total amount");

        _ledgers[bank_admin_from].ledger[address(token_address)][token_type] -= amount;
        _ledgers[bank_admin_to].ledger[address(token_address)][token_type] += amount;
        
        // Emit an event with the settlement details
        emit Settlement(bank_admin_from, bank_admin_to, token_address, token_type, amount, bundleHashes, amounts);
        
        return true;
    }

    function balanceOfBank(address bank_admin, address token_address, uint256 token_type) public view returns (uint256) {
        return _ledgers[bank_admin].ledger[token_address][token_type];
    }

    function updateBridge(address newBridge) public onlyAdmin(_admin) {
        require(newBridge != address(0), "new bridge address cannot be the zero address");
        _bridge = newBridge;
    }

    function createTmscTokenType(uint256 random) external  {
        tokenTypeCreated ++ ;
        tokenTypeCreatedMap[random] = tokenTypeCreated;
    }

    function getCreatedTmscTokenType(uint256 random) external view returns (uint256) {
        return tokenTypeCreatedMap[random];
    }
}