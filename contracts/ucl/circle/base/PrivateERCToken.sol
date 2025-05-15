// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./BankRegistration.sol";
import "../event/IL2Event.sol";
import "../model/TokenModel.sol";
import "../lib/TokenEventLib.sol";
import "./IPrivateERCToken.sol";
import "../lib/TokenVerificationLib.sol";
import {TokenOperationsLib} from "../lib/TokenOperationsLib.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract PrivateERCToken is IPrivateERCToken, Pausable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant BANK_ROLE = keccak256("BANK_ROLE");

    BankRegistration private _bankRegistration;
    IL2Event _l2Event;
    address scOwner;
    mapping(address=>TokenModel.Account) accountTokens;
    uint256 public privateTotalSupply;
    mapping(address => bool) public isBankAccount;
    mapping(address => bool) public blacklisted;
    
    mapping(address => TokenModel.ElGamal) public privateMinterAllowed;

    constructor(TokenModel.TokenSCTypeEnum tokenSCType,IL2Event l2Event,BankRegistration bankRegistration) {
        scOwner = msg.sender;
        _l2Event = l2Event;
        _bankRegistration = bankRegistration;

        TokenEventLib.triggerTokenSCCreatedEvent(_l2Event, address(this), msg.sender, tokenSCType);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(BANK_ROLE, msg.sender);
    }
    
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    function addToBlacklist(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        blacklisted[account] = true;
    }
    
    function removeFromBlacklist(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        blacklisted[account] = false;
    }
    
    function addBankAccount(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        isBankAccount[account] = true;
        _grantRole(BANK_ROLE, account);
    }

    function removeBankAccount(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        isBankAccount[account] = false;
        _revokeRole(BANK_ROLE, account);
    }
    
  
    function setBankAllowance(address bank, TokenModel.ElGamal calldata allowanceAmount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(isBankAccount[bank], "PrivateERCToken: address is not a bank account");
        privateMinterAllowed[bank] = allowanceAmount;
    }
    
    function removeBankAllowance(address bank) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(isBankAccount[bank], "PrivateERCToken: address is not a bank account");
        delete privateMinterAllowed[bank];
    }
    
    modifier notBlacklisted(address account) {
        require(!blacklisted[account], "PrivateERCToken: account is blacklisted");
        _;
    }
    
    modifier onlyBankAccount() {
        require(hasRole(BANK_ROLE, msg.sender), "PrivateERCToken: caller is not a bank account");
        _;
    }
    
    modifier onlySCOwner() {
        require(msg.sender == scOwner, "PrivateERCToken: caller is not the owner");
        _;
    }

    function privateReserveAmount(address owner, TokenModel.ParentTokens memory parentTokens, TokenModel.AmountInfo[] memory reservedAmounts,
        bytes calldata proof) external {

        TokenModel.Account storage ownerAccount = accountTokens[owner];

        (bool isValid, uint result, uint256[] memory znValues) = TokenVerificationLib.verifyTokenSplit(ownerAccount, parentTokens, reservedAmounts, proof);
        require(isValid, "PrivateERCToken: invalid proof");

        // create all child tokens
        for (uint256 i = 0; i < reservedAmounts.length; i++) {
            TokenModel.AmountInfo memory child = reservedAmounts[i];

            TokenModel.TokenEntity memory childEntity = TokenModel.TokenEntity({
            id : child.id,
            tokenType : child.token_type,
            owner : child.owner,
            manager : child.manager,
            status : child.status,

            amount : child.amount,
            issuerEncryptedAmount : child.issuerEncryptedAmount,

            approvedSpender : address(0),
            rollbackTokenId : 0
            });

            ownerAccount.tokens[child.id] = childEntity;
            TokenEventLib.triggerTokenSplitEvent(_l2Event, address(this), childEntity);
        }

        //delete all parent tokens
        for (uint i = 0; i < parentTokens.parentIds.length; i++) {
            uint256 pid = parentTokens.parentIds[i];
            TokenModel.TokenEntity memory parentEntity = ownerAccount.tokens[pid];

            TokenEventLib.triggerTokenRemovedEvent(_l2Event, address(this), parentEntity);
            delete ownerAccount.tokens[pid];
        }
    }

    function deleteTokenInBox(TokenModel.Account storage ownerAccount, TokenModel.TokenBox box, uint256 tokenId) internal {
//        if (box == TokenModel.TokenBox.InBox) {
//            delete ownerAccount.inBox[tokenId];
//        } else if (box ==  TokenModel.TokenBox.OutBox) {
//            delete  ownerAccount.outBox[tokenId];
//        } else if (box ==  TokenModel.TokenBox.ApvBox) {
//            delete  ownerAccount.apvBox[tokenId];
//        }
    }

//    function findTokenById(TokenModel.Account storage ownerAccount,  uint256 tokenId) internal
//        returns (TokenModel.TokenEntity memory) {
//
//        TokenModel.TokenEntity memory entity = ownerAccount.inBox[tokenId];
//        if (entity.id !=0) {
//            return entity;
//        }
//
//        entity= ownerAccount.outBox[tokenId];
//        if (entity.id != 0) {
//            return entity;
//        }
//
//        return ownerAccount.apvBox[tokenId];
//    }

//    function saveTokenInBox(TokenModel.Account storage ownerAccount, TokenModel.TokenBox box, TokenModel.TokenEntity memory entity) internal {
//        uint256 tokenId = entity.id;
//
//        if (box == TokenModel.TokenBox.InBox) {
//            ownerAccount.inBox[tokenId] = entity;
//
//        } else if (box ==  TokenModel.TokenBox.OutBox) {
//            ownerAccount.outBox[tokenId] = entity;
//
//        } else if (box ==  TokenModel.TokenBox.ApvBox) {
//            ownerAccount.apvBox[tokenId] = entity;
//        }
//    }


    function privateSplitApproval(address owner, TokenModel.AmountInfo memory approvedAmount,
        TokenModel.AmountInfo[] memory splitAmounts, bytes calldata proof) external {

    }

    function privateRollbackAmount(uint256 amountId) external {

    }

    function privateMint(TokenModel.AmountInfo calldata amountInfo, bytes calldata proof) 
        external 
        whenNotPaused
        onlyRole(MINTER_ROLE)
        notBlacklisted(msg.sender)
        notBlacklisted(amountInfo.owner) 
        onlyBankAccount
    {
        require(amountInfo.owner != address(0), "PrivateERCToken: mint to the zero address");

        TokenModel.VerifyTokenMintParams memory params = TokenModel.VerifyTokenMintParams({
            bankRegistration: _bankRegistration,
            minter: msg.sender,
            initialMinterAllowance: privateMinterAllowed[msg.sender],
            currentMintAmount: amountInfo.amount,
            amountInfo: amountInfo,
            proof : proof
        });

        (bool isValid, uint result, uint256[] memory znValues) = TokenVerificationLib.verifyTokenMint(params);
        require(isValid, "PrivateERCToken: invalid proof");

        TokenModel.ElGamal memory newAllowance = TokenModel.ElGamal({
            cl_x: znValues[4],
            cl_y: znValues[5],
            cr_x: znValues[6],
            cr_y: znValues[7]
        });

        privateMinterAllowed[msg.sender] = newAllowance;

        accountTokens[amountInfo.owner].addr = amountInfo.owner;
        TokenOperationsLib.mintTokenLogic(accountTokens[amountInfo.owner].tokens, amountInfo.owner, amountInfo.manager, amountInfo);


        // Trigger event
        TokenModel.TokenEntity memory entity = accountTokens[amountInfo.owner].tokens[amountInfo.id];
        TokenEventLib.triggerTokenMintedEvent(_l2Event, address(this), entity);
    }

//    function privateTotalSupply() external view returns (TokenModel.ElGamal memory) {
//        return TokenModel.ElGamal( {
//            cl_x: 0,
//            cl_y: 0,
//            cr_x: 0,
//            cr_y: 0
//        });
//    }

    function privateSetTotalSupply(uint256 totalSupply) onlySCOwner external {
        privateTotalSupply = totalSupply;
    }

    function privateBalanceOf(address owner, uint256 token_type) external returns (TokenModel.ElGamal memory) {
        return TokenModel.ElGamal( {
            cl_x: 0,
            cl_y: 0,
            cr_x: 0,
            cr_y: 0
        });
    }

    function privateApprove(address spender, uint256[] memory amountIds) external {

    }

    function privateTransferFrom(address from, address to, uint256[] memory amountIds) external {

    }

    function privateAllowance(address owner, address spender) external returns (TokenModel.ElGamal memory) {
        return TokenModel.ElGamal( {
        cl_x: 0,
        cl_y: 0,
        cr_x: 0,
        cr_y: 0
        });
    }
    
    function getBankAllowance(address bank) external view returns (TokenModel.ElGamal memory) {
        require(isBankAccount[bank], "PrivateERCToken: address is not a bank account");
        return privateMinterAllowed[bank];
    }

    function getAccountTokenEntity(address owner, uint256 tokenId) external view returns (TokenModel.TokenEntity memory) {
        return accountTokens[owner].tokens[tokenId];
    }

    function privateTransfer(address to, uint256[] memory amountIds) external {

    }

    function privateBurn(uint256 amountId) external {
//        address owner = msg.sender;
//        TokenModel.Account storage ownerAccount = accountTokens[owner];
//        TokenModel.TokenEntity memory entity = findTokenById(ownerAccount, amountId);
//
//        if (entity.id == 0) {
//            return;
//        }
//
//        deleteTokenInBox(ownerAccount, TokenModel.TokenBox.InBox, amountId);
//        deleteTokenInBox(ownerAccount, TokenModel.TokenBox.OutBox, amountId);
//        deleteTokenInBox(ownerAccount, TokenModel.TokenBox.ApvBox, amountId);
//        TokenEventLib.triggerTokenBurnedEvent(_l2Event, address(this), entity);
    }
}