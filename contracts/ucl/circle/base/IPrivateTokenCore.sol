// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '../model/TokenModel.sol';
import "../inst_user_registry/InstitutionUserRegistry.sol";
import "../event/IL2Event.sol";

interface IPrivateTokenCore {
    function initialize_hamsa(
        TokenModel.TokenSCTypeEnum tokenSCType,
        IL2Event l2Event,
        InstitutionUserRegistry institutionRegistration
    ) external;

    function privateTotalSupply() external view returns (TokenModel.ElGamal memory);
    function publicTotalSupply() external view returns (uint256, bool);
    function getAccountTokenById(address account, uint256 tokenId) external view returns (TokenModel.TokenEntity memory);

    function configurePrivacyMinter(address minter, TokenModel.ElGamal calldata privateAllowedAmount) external returns (bool);
    function removePrivacyMinter(address minter) external returns (bool);
    function revealTotalSupply(uint256 publicTotalSupply, bytes calldata proof) external;

    function configureStepLength(uint256 stepLength) external;
    function revealPrivateTotalSupply(
        uint256 blockNumber,
        uint256 revealedAmount,
        TokenModel.ElGamal memory encryptedSupply,
        bytes calldata proof,
        uint256[22] calldata publicInputs
    ) external;

    function privateMint(
        address to, 
        TokenModel.ElGamal memory amount, 
        TokenModel.ElGamal memory supply,
        uint256[8] calldata proof, 
        uint256[22] calldata publicInputs
    ) external returns (bool);

    function privateBurns(uint256[] calldata tokenIds) external;
    
    function privateSplitToken(
        uint256[] memory consumedTokenIds, 
        address from, 
        address to, 
        TokenModel.TokenEntity[] calldata newTokens,  
        uint256[8] calldata proof, 
        uint256[20] calldata publicInputs
    ) external;
    
    function privateCancelToken(uint256 tokenId) external returns (bool);

    function privateTransfers(
        uint256[] calldata tokenIds
    ) external;
}
