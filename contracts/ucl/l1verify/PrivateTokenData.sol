// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./model/TokenModel.sol";
import "../circle/base/Ownable.sol";

abstract contract PrivateTokenData is Ownable {
    bool internal _initialized;
    
    mapping(uint256 => TokenModel.Account) internal _accounts;
    mapping(uint256 => TokenModel.ElGamal) internal _privateMinterAllowed;

    mapping(uint256 => uint256) internal _rollBackTokens;
    
    TokenModel.ElGamal internal _privateTotalSupply;
    uint256 internal _numberOfTotalSupplyChanges;
    uint256 internal _publicTotalSupply;

    mapping(uint256 => bool) internal _usedElGamalHashes;
    
    modifier onlyAuthorized() {
        require(msg.sender == _owner, "PrivateTokenData: unauthorized access");
        _;
    }

    
    function isInitialized() external view returns (bool) {
        return _initialized;
    }
    
    function setInitialized(bool initialized) external onlyAuthorized {
        _initialized = initialized;
    }
    
    function getAccountBalance(uint256 account) external view returns (TokenModel.ElGamal memory) {
        return _accounts[account].balance;
    }
    
    function setAccountBalance(uint256 account, TokenModel.ElGamal memory balance) external onlyAuthorized {
        _accounts[account].balance = balance;
    }
    
    function getAccountToken(uint256 account, uint256 tokenId) external view returns (uint256) {
        return _accounts[account].assets[tokenId];
    }
    
    function deleteAccountToken(uint256 account, uint256 tokenId) external onlyAuthorized {
        delete _accounts[account].assets[tokenId];
    }
    
    function getAccountAllowance(uint256 account, uint256 spender) external view returns (uint256) {
        return _accounts[account].allowances[spender];
    }
    
    function deleteAccountAllowance(uint256 account, uint256 spender) external onlyAuthorized {
        delete _accounts[account].allowances[spender];
    }
    
    function getPrivateMinterAllowed(uint256 minter) external view returns (TokenModel.ElGamal memory) {
        return _privateMinterAllowed[minter];
    }
    
    function setPrivateMinterAllowed(uint256 minter, TokenModel.ElGamal memory allowed) external onlyAuthorized {
        _privateMinterAllowed[minter] = allowed;
    }
    
    function getPrivateTotalSupply() external view returns (TokenModel.ElGamal memory) {
        return _privateTotalSupply;
    }
    
    function setPrivateTotalSupply(TokenModel.ElGamal memory totalSupply) external onlyAuthorized {
        _privateTotalSupply = totalSupply;
    }
    
    function getNumberOfTotalSupplyChanges() external view returns (uint256) {
        return _numberOfTotalSupplyChanges;
    }
    
    function setNumberOfTotalSupplyChanges(uint256 changes) external onlyAuthorized {
        _numberOfTotalSupplyChanges = changes;
    }
    
    function getPublicTotalSupply() external view returns (uint256) {
        return _publicTotalSupply;
    }
    
    function setPublicTotalSupply(uint256 totalSupply) external onlyAuthorized {
        _publicTotalSupply = totalSupply;
    }
}