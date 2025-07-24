// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../model/TokenModel.sol";
import "../inst_user_registry/InstitutionUserRegistry.sol";
import "../event/IL2Event.sol";
import { Ownable } from "../../../usdc/v1/Ownable.sol";

abstract contract PrivateTokenData is Ownable {
    bool internal _initialized;
    
    InstitutionUserRegistry internal _institutionRegistration;
    IL2Event internal _l2Event;
    
    mapping(address => TokenModel.Account) internal _accounts;
    mapping(address => TokenModel.ElGamal) internal _privateMinterAllowed;
    
    TokenModel.ElGamal internal _privateTotalSupply;
    uint256 internal _numberOfTotalSupplyChanges;
    uint256 internal _publicTotalSupply;
    
    mapping(address => bool) internal _authorizedContracts;
    mapping(uint256 => bool) internal _usedElGamalHashes;

    modifier onlyAuthorized() {
        require(_authorizedContracts[msg.sender] || msg.sender == this.owner(), "PrivateTokenData: unauthorized access");
        _;
    }
    
    function authorizeContract(address contractAddress) external onlyOwner {
        _authorizedContracts[contractAddress] = true;
    }
    
    function revokeContract(address contractAddress) external onlyOwner {
        _authorizedContracts[contractAddress] = false;
    }
    
    function isInitialized() external view returns (bool) {
        return _initialized;
    }
    
    function setInitialized(bool initialized) external onlyAuthorized {
        _initialized = initialized;
    }
    
    function getInstitutionRegistration() external view returns (InstitutionUserRegistry) {
        return _institutionRegistration;
    }
    
    function setInstitutionRegistration(InstitutionUserRegistry institutionRegistration) external onlyAuthorized {
        _institutionRegistration = institutionRegistration;
    }
    
    function getL2Event() external view returns (IL2Event) {
        return _l2Event;
    }
    
    function setL2Event(IL2Event l2Event) external onlyAuthorized {
        _l2Event = l2Event;
    }
    
    function getAccountBalance(address account) external view returns (TokenModel.ElGamal memory) {
        return _accounts[account].balance;
    }
    
    function setAccountBalance(address account, TokenModel.ElGamal memory balance) external onlyAuthorized {
        _accounts[account].balance = balance;
    }
    
    function getAccountToken(address account, uint256 tokenId) external view returns (TokenModel.TokenEntity memory) {
        return _accounts[account].assets[tokenId];
    }
    
    function setAccountToken(address account, uint256 tokenId, TokenModel.TokenEntity memory token) external onlyAuthorized {
        _accounts[account].assets[tokenId] = token;
    }
    
    function deleteAccountToken(address account, uint256 tokenId) external onlyAuthorized {
        delete _accounts[account].assets[tokenId];
    }
    
    function getAccountAllowance(address account, address spender) external view returns (uint256) {
        return _accounts[account].allowances[spender];
    }
    
    function setAccountAllowance(address account, address spender, uint256 tokenId) external onlyAuthorized {
        _accounts[account].allowances[spender] = tokenId;
    }
    
    function deleteAccountAllowance(address account, address spender) external onlyAuthorized {
        delete _accounts[account].allowances[spender];
    }
    
    function getPrivateMinterAllowed(address minter) external view returns (TokenModel.ElGamal memory) {
        return _privateMinterAllowed[minter];
    }
    
    function setPrivateMinterAllowed(address minter, TokenModel.ElGamal memory allowed) external onlyAuthorized {
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
