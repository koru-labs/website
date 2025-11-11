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
    mapping(address => TokenModel.ElGamalToken) internal _privateMinterAllowed;
    
    TokenModel.ElGamal internal _privateTotalSupply;
    uint256 internal _numberOfTotalSupplyChanges;
    uint256 internal _publicTotalSupply;

    mapping(uint256 => TokenModel.ElGamal) internal _privateTotalSupplyHistory; // blockNumber -> privateTotalSupply snapshot
    uint256 internal _lastRevealedPublicTotalSupply;
    uint256 internal _lastRevealedBlockNumber;
    uint256 internal _lastProcessedBlockNumber;// The event was sent but not reveal
    uint256 internal _stepLength;

    mapping(address => bool) internal _authorizedContracts;
    mapping(uint256 => bool) internal _usedElGamalHashes;

    // Proxy configuration (kept in data contract to share layout with proxy)
    address internal _proxyAdmin;
    address internal _implementationA;
    address internal _implementationB;
    uint8 internal _percentageToB;
    
    function authorizeContract(address contractAddress) external onlyOwner {
        _authorizedContracts[contractAddress] = true;
    }
    
    function revokeContract(address contractAddress) external onlyOwner {
        _authorizedContracts[contractAddress] = false;
    }
    
    function isInitialized() external view returns (bool) {
        return _initialized;
    }
    
    function setInitialized(bool initialized) external onlyOwner {
        _initialized = initialized;
    }
    
    function getInstitutionRegistration() external view returns (InstitutionUserRegistry) {
        return _institutionRegistration;
    }
    
    function setInstitutionRegistration(InstitutionUserRegistry institutionRegistration) external onlyOwner {
        _institutionRegistration = institutionRegistration;
    }
    
    function getL2Event() external view returns (IL2Event) {
        return _l2Event;
    }
    
    function setL2Event(IL2Event l2Event) external onlyOwner {
        _l2Event = l2Event;
    }
    
    function getAccountToken(address account, uint256 tokenId) external view returns (TokenModel.TokenEntity memory) {
        return _accounts[account].assets[tokenId];
    }
    
    function setAccountToken(address account, uint256 tokenId, TokenModel.TokenEntity memory token) external onlyOwner {
        _accounts[account].assets[tokenId] = token;
    }
    
    function deleteAccountToken(address account, uint256 tokenId) external onlyOwner {
        delete _accounts[account].assets[tokenId];
    }
    
    function getPrivateMinterAllowed(address minter) external view returns (TokenModel.ElGamalToken memory) {
        return _privateMinterAllowed[minter];
    }
    
    function setPrivateMinterAllowed(address minter, TokenModel.ElGamalToken memory allowed) external onlyOwner {
        _privateMinterAllowed[minter] = allowed;
    }
    
    function getPrivateTotalSupply() external view returns (TokenModel.ElGamal memory) {
        return _privateTotalSupply;
    }
    
    function setPrivateTotalSupply(TokenModel.ElGamal memory totalSupply) external onlyOwner {
        _privateTotalSupply = totalSupply;
    }
    
    function getNumberOfTotalSupplyChanges() external view returns (uint256) {
        return _numberOfTotalSupplyChanges;
    }
    
    function setNumberOfTotalSupplyChanges(uint256 changes) external onlyOwner {
        _numberOfTotalSupplyChanges = changes;
    }
    
    function getPublicTotalSupply() external view returns (uint256) {
        return _publicTotalSupply;
    }
    
    function setPublicTotalSupply(uint256 totalSupply) external onlyOwner {
        _publicTotalSupply = totalSupply;
    }

    function getPrivateTotalSupplyHistory(uint256 blockNumber) external view returns (TokenModel.ElGamal memory) {
        return _privateTotalSupplyHistory[blockNumber];
    }

    function getLastRevealedPublicTotalSupply() external view returns (uint256) {
        return _lastRevealedPublicTotalSupply;
    }

    function getLastRevealedBlockNumber() external view returns (uint256) {
        return _lastRevealedBlockNumber;
    }

    function getLastProcessedBlockNumber() external view returns (uint256) {
        return _lastProcessedBlockNumber;
    }

    function setLastProcessedBlockNumber(uint256 blockNumber) external onlyOwner {
        _lastProcessedBlockNumber = blockNumber;
    }

    function getStepLength() external view returns (uint256) {
        return _stepLength;
    }

    function setStepLength(uint256 stepLength) external onlyOwner {
        _stepLength = stepLength;
    }
}
