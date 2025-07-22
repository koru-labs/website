// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PrivateTokenData.sol";
import "../model/TokenModel.sol";
import "../lib/TokenEventLib.sol";
import "../lib/TokenVerificationLib.sol";
import "../lib/TokenUtilsLib.sol";
import { Pausable } from "../../../usdc/v1/Pausable.sol";
import { Blacklistable } from "../../../usdc/v1/Blacklistable.sol";
import { Permissioned } from "./permissioned.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title PrivateTokenConverter
 * @dev Abstract contract providing token conversion functionality between public and private tokens
 */
abstract contract PrivateTokenConverter is 
    PrivateTokenData, 
    Pausable, 
    Blacklistable, 
    Permissioned, 
    ReentrancyGuard 
{
    /**
     * @dev Convert public token to private token
     * @param amount The amount of public token to convert
     * @param elAmount The ElGamal encrypted private token amount
     * @param publicInputs The public inputs for the proof
     * @param proof The zero knowledge proof
     * @return True if the operation was successful
     */
    function convert2pUSDC(
        uint256 amount,
        TokenModel.ElGamal calldata elAmount,
        uint256[7] calldata publicInputs,
        uint256[8] calldata proof
    )
    external
    whenNotPaused
    notBlacklisted(msg.sender)
    virtual
    returns (bool)
    {
        require(amount > 0, "PrivateTokenConverter: convert amount not greater than 0");

        TokenModel.VerifyTokenConvert2pUSDCParams memory params = TokenModel.VerifyTokenConvert2pUSDCParams({
            institutionRegistration: _institutionRegistration,
            owner: msg.sender,
            amount: amount,
            encryptedAmount: elAmount,
            proof: proof,
            publicInputs: publicInputs
        });

        TokenVerificationLib.verifyConvert2pUSDC(params);

        // Create TokenEntity
        TokenModel.TokenEntity memory entity = TokenModel.TokenEntity({
            id: TokenUtilsLib.hashElgamal(elAmount),
            owner: msg.sender,
            status: TokenModel.TokenStatus.active,
            amount: elAmount,
            to: address(0),
            rollbackTokenId: 0
        });

        // Increase private total supply
        TokenModel.ElGamal memory oldTotalSupply = _privateTotalSupply;
        (_privateTotalSupply, _numberOfTotalSupplyChanges) = TokenUtilsLib.addSupply(_privateTotalSupply, _numberOfTotalSupplyChanges, elAmount);
        TokenEventLib.triggerTokenSupplyUpdatedEvent(
            _l2Event,
            address(this),
            msg.sender,
            oldTotalSupply,
            elAmount,
            TokenModel.ElGamal(0,0,0,0),
            _privateTotalSupply,
            _numberOfTotalSupplyChanges
        );

        // Add token and update balance
        TokenUtilsLib.addTokenWithBalance(_accounts, msg.sender, entity);

        // Use received token event
        TokenEventLib.triggerTokenReceivedEvent(
            _l2Event,
            address(this),
            msg.sender,
            entity.id,
            address(this),
            entity.status,
            entity.amount
        );

        // Call hook for public token balance update
        _updatePublicTokenBalance(msg.sender, amount, true);

        return true;
    }

    /**
     * @dev Convert private token back to public token
     * @param tokenId The token ID of the private token to burn
     * @param amount The amount of public token to convert to
     * @param publicInputs The public inputs for the proof
     * @param proof The zero knowledge proof
     * @return True if the operation was successful
     */
    function convert2USDC(
        uint256 tokenId,
        uint256 amount,
        uint256[7] calldata publicInputs,
        uint256[8] calldata proof
    )
    external
    whenNotPaused
    notBlacklisted(msg.sender)
    virtual
    returns (bool)
    {
        require(tokenId != 0, "PrivateTokenConverter: tokenId is zero");

        TokenModel.TokenEntity memory entity = _accounts[msg.sender].assets[tokenId];
        require(entity.id != 0, "invalid token");
        require(entity.status == TokenModel.TokenStatus.active || entity.status == TokenModel.TokenStatus.inactive, "token is invalid");
        require(entity.owner == msg.sender, "PrivateTokenConverter: only owner can convert");

        TokenModel.VerifyTokenConvert2USDCParams memory params = TokenModel.VerifyTokenConvert2USDCParams({
            institutionRegistration: _institutionRegistration,
            owner: entity.owner,
            amount: amount,
            encryptedAmount: entity.amount,
            proof: proof,
            publicInputs: publicInputs
        });

        TokenVerificationLib.verifyConvert2USDC(params);

        // Decrease private total supply
        TokenModel.ElGamal memory oldTotalSupply = _privateTotalSupply;
        (_privateTotalSupply, _numberOfTotalSupplyChanges) = TokenUtilsLib.subSupply(_privateTotalSupply, _numberOfTotalSupplyChanges, entity.amount);
        TokenEventLib.triggerTokenSupplyUpdatedEvent(
            _l2Event,
            address(this),
            msg.sender,
            oldTotalSupply,
            TokenModel.ElGamal(0,0,0,0),
            entity.amount,
            _privateTotalSupply,
            _numberOfTotalSupplyChanges
        );

        // Prepare token IDs for deletion
        uint256[] memory tokenIds = new uint256[](1);
        tokenIds[0] = tokenId;
        // Remove token and update balance
        TokenUtilsLib.removeTokensWithBalance(_accounts, msg.sender, tokenIds);

        // Remove rollback token
        uint256[] memory rollbackTokenIds = new uint256[](1);
        rollbackTokenIds[0] = entity.rollbackTokenId;
        TokenUtilsLib.removeTokens(_accounts, msg.sender, rollbackTokenIds);

        // Call hook for public token balance update
        _updatePublicTokenBalance(msg.sender, amount, false);

        // Use burned token event instead of deleted event
        TokenEventLib.triggerTokenBurnedEvent(
            _l2Event,
            address(this),
            msg.sender,
            tokenId
        );

        return true;
    }

    /**
     * @dev Hook for updating public token balance - must be implemented by derived contracts
     * @param account The account to update
     * @param amount The amount to update
     * @param isConvertToPrivate True if converting to private, false if converting to public
     */
    function _updatePublicTokenBalance(address account, uint256 amount, bool isConvertToPrivate) internal virtual;
}
