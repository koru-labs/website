// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./HamsL1Event.sol";
import "./IL1TMSC.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

contract L1Bridge is ERC1155Holder{
    IL1TMSC private _l1TMSC;
    IHamsL1Event private _l1EVENT;
    address private _admin;
    uint256 private eventCounter = 0;

    struct BankInfo {
        string rsaPk;
        string bankName;
        string bic;
        address bankAdmin;
    }
    mapping(address => BankInfo) private _bankInfo;
    mapping(string => BankInfo) private _bankNameInfo;

    modifier onlyAdmin() {
        require(msg.sender == _admin, "Only admin can perform this action");
        _;
    }
    modifier bankInfoExists(address bankAdmin) {
        require(bytes(_bankInfo[bankAdmin].rsaPk).length > 0, "Bank info not set. Please call registerBankInfo first.");
        _;
    }
    constructor(address l1TMSCAddress, address l1EVENTAddress, address adminAddress) {
        _l1TMSC = IL1TMSC(l1TMSCAddress);
        _l1EVENT = IHamsL1Event(l1EVENTAddress);
        _admin = adminAddress;
    }

    function registerBankInfo(address bankAdmin, string memory rsaPk, string memory bankName, string memory bic) public onlyAdmin {
        _bankInfo[bankAdmin] = BankInfo(rsaPk, bankName,bic,bankAdmin);
        _bankNameInfo[bic] = BankInfo(rsaPk, bankName,bic,bankAdmin);
        string memory eventBody = string(abi.encodePacked('{"bankName":"', bankName, '", "bic":"', bic, '", "rsaPk":"', rsaPk, '"}'));
        sendEvent(bankAdmin, "registerBankInfo", eventBody);
    }

    function getBankInfo(string memory bic) public view returns (string memory rsaPk, string memory bankName,address bankAdmin) {
        require(bytes(_bankNameInfo[bic].rsaPk).length > 0, "Bank info not found. Please call setBankInfo first.");
        rsaPk = _bankNameInfo[bic].rsaPk;
        bankName = _bankNameInfo[bic].bankName;
        bankAdmin = _bankNameInfo[bic].bankAdmin;
        return (rsaPk, bankName, bankAdmin);
    }

    function depositErc20(address sender, IERC20 token, address bankAdmin, address recipient, uint256 amount, string memory encryptedContent) public  bankInfoExists(bankAdmin) returns (bool) {
        token.transferFrom(sender, address(_l1TMSC),amount);
        bool success = _l1TMSC.depositErc20From(sender, token,bankAdmin, recipient, amount);
        if (success) {
            sendEvent(bankAdmin, "depositErc20", encryptedContent);
        }
        return success;
    }

    function depositErc1155(address sender, IERC1155 token, uint256 tokenType, address bankAdmin, address recipient, uint256 amount, string memory encryptedContent) public  bankInfoExists(bankAdmin) returns (bool) {
        token.safeTransferFrom(sender, address(_l1TMSC), tokenType, amount, "0x");
        bool success = _l1TMSC.depositErc1155From(sender, token,tokenType, bankAdmin, recipient, amount);
        if (success) {
            sendEvent(bankAdmin, "depositErc1155", encryptedContent);
        }
        return success;
    }

    function sendEvent(address bankAdmin, string memory eventType, string memory body) internal {
        string memory eventReqStr = string(abi.encodePacked('{"eventId":"', generateEventId(), '","eventType":"', eventType, '", "bankAdmin":"', Strings.toHexString(bankAdmin), '"}'));
        _l1EVENT.sendEvent(eventReqStr, body);
    }

    function generateEventId() internal returns (string memory) {
        eventCounter++;
        return Strings.toString(eventCounter);
    }

    function bytesToString(bytes memory data) internal pure returns (string memory) {
        return string(data);
    }

    function updateAdmin(address newAdmin) external onlyAdmin {
        _admin = newAdmin;
    }

    receive() external payable {}
}