// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../model/TokenModel.sol";
import "../inst_user_registry/InstitutionUserRegistry.sol";
import "../event/IL2Event.sol";

interface IPrivateTokenData {
    function authorizeContract(address contractAddress) external;
    function revokeContract(address contractAddress) external;
    
    function isInitialized() external view returns (bool);
    function setInitialized(bool initialized) external;
    
    function getInstitutionRegistration() external view returns (InstitutionUserRegistry);
    function setInstitutionRegistration(InstitutionUserRegistry institutionRegistration) external;
    function getL2Event() external view returns (IL2Event);
    function setL2Event(IL2Event l2Event) external;
    
    function getAccountBalance(address account) external view returns (TokenModel.ElGamal memory);
    function setAccountBalance(address account, TokenModel.ElGamal memory balance) external;
    function getAccountToken(address account, uint256 tokenId) external view returns (TokenModel.TokenEntity memory);
    function setAccountToken(address account, uint256 tokenId, TokenModel.TokenEntity memory token) external;
    function deleteAccountToken(address account, uint256 tokenId) external;
    
    function getPrivateMinterAllowed(address minter) external view returns (TokenModel.ElGamal memory);
    function setPrivateMinterAllowed(address minter, TokenModel.ElGamal memory allowed) external;
    
    function getPrivateTotalSupply() external view returns (TokenModel.ElGamal memory);
    function setPrivateTotalSupply(TokenModel.ElGamal memory totalSupply) external;
    function getNumberOfTotalSupplyChanges() external view returns (uint256);
    function setNumberOfTotalSupplyChanges(uint256 changes) external;
    function getPublicTotalSupply() external view returns (uint256);
    function setPublicTotalSupply(uint256 totalSupply) external;
}
