// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./base/PrivateERCToken.sol";
import "../../usdc/v2/FiatTokenV2.sol";
import "./base/TokenConverterBase.sol";
import {TokenUtilsLib} from "./lib/TokenUtilsLib.sol";


/**
 * @title PrivateUSDC
 * @dev Implementation of the private USDC token with conversion functionality
 */
contract PrivateUSDC is PrivateERCToken, FiatTokenV2, TokenConverterBase {
    
    /**
     * @dev Initializes the PrivateUSDC contract
     */
    function initialize(
        string memory tokenName,
        string memory tokenSymbol,
        string memory tokenCurrency,
        uint8 tokenDecimals,
        address newMasterMinter,
        address newPauser,
        address newBlacklister,
        address newOwner,
        IL2Event l2Event,
        InstitutionUserRegistry institutionRegistration
    ) external {
        initialize(tokenName, tokenSymbol, tokenCurrency, tokenDecimals, newMasterMinter, newPauser, newBlacklister, newOwner);
        initialize_hamsa(TokenModel.TokenSCTypeEnum.ERC20, l2Event, institutionRegistration);
    }
    
    /**
     * @dev Convert USDC to private USDC
     * @param account The address that will receive the private USDC
     * @param amount The amount of USDC to convert
     * @param elAmount The ElGamal encrypted private USDC amount
     * @param publicInputs The public inputs for the proof
     * @param proof The zero knowledge proof
     * @return True if the operation was successful
     */
    function convert2pUSDC(
        address account, 
        uint256 amount, 
        TokenModel.ElGamal calldata elAmount, 
        uint256[7] calldata publicInputs,
        uint256[8] calldata proof
    )
    external
    override
    whenNotPaused
    notBlacklisted(msg.sender)
    notBlacklisted(account)
    returns (bool)
    {
        require(account != address(0), "PrivateUSDC: convert to the zero address");
        require(amount > 0, "PrivateUSDC: convert amount not greater than 0");
        //require(msg.sender != account, "PrivateUSDC: convert to the same address");

        TokenModel.VerifyTokenConvert2pUSDCParams memory params = TokenModel.VerifyTokenConvert2pUSDCParams({
            institutionRegistration: _institutionRegistration,
            owner: account,
            amount: amount,
            encryptedAmount: elAmount,
            proof: proof,
            publicInputs: publicInputs
        });
        
        TokenVerificationLib.verifyConvert2pUSDC(params);

        // Create TokenEntity
        TokenModel.TokenEntity memory entity = TokenModel.TokenEntity({
            id: TokenUtilsLib.hashElgamal(elAmount),
            owner: account,
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
        TokenUtilsLib.addTokenWithBalance(accounts, account, entity);
        
        // Use received token event
        TokenEventLib.triggerTokenReceivedEvent(
            _l2Event, 
            address(this), 
            account, 
            entity.id, 
            address(this), 
            entity.status, 
            entity.amount
        );
        
        return true;
    }
    
    /**
     * @dev Convert private USDC back to USDC
     * @param account The address that will receive the USDC
     * @param tokenId The token ID of the private USDC to burn
     * @param amount The amount of USDC to convert to
     * @param publicInputs The public inputs for the proof
     * @param proof The zero knowledge proof
     * @return True if the operation was successful
     */
    function convert2USDC(
        address account, 
        uint256 tokenId, 
        uint256 amount, 
        uint256[7] calldata publicInputs,
        uint256[8] calldata proof
    )
    external
    override
    whenNotPaused
    notBlacklisted(msg.sender)
    notBlacklisted(account)
    returns (bool)
    {
        require(tokenId != 0, "PrivateUSDC: tokenId is zero");
        require(account != address(0), "PrivateUSDC: convert to the zero address");
        
        TokenModel.TokenEntity memory entity = accounts[msg.sender].assets[tokenId];
        require(entity.id != 0, "invalid token");
        require(entity.status == TokenModel.TokenStatus.active, "token is not active");
        require(entity.owner == account, "PrivateUSDC: only owner can convert");

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
        TokenUtilsLib.removeTokensWithBalance(accounts, msg.sender, tokenIds);
        
        // direct call the _setBalance method in the inherited FiatTokenV1.sol
        totalSupply_ += amount;
        _setBalance(account, _balanceOf(account) + amount);

        emit Transfer(address(0), account, amount);

        // Use burned token event instead of deleted event
        TokenEventLib.triggerTokenBurnedEvent(
            _l2Event, 
            address(this), 
            msg.sender, 
            tokenId
        );
        
        return true;
    }
}