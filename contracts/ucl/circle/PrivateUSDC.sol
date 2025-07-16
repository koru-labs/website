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
        
        // 使用TokenVerificationLib验证
        // TokenModel.VerifyTokenConvert2pUSDCParams memory params = TokenModel.VerifyTokenConvert2pUSDCParams({
        //     from: msg.sender,
        //     to: account,
        //     amount: amount,
        //     encryptedAmount: elAmount,
        //     proof: proof,
        //     publicInputs: publicInputs
        // });
        TokenModel.VerifyTokenConvert2pUSDCParams memory params = TokenModel.VerifyTokenConvert2pUSDCParams({
            from: msg.sender,
            to: account,
            amount: amount,
            encryptedAmount: elAmount,
            proof: [
                4253586709368050279911655994655261813933910144101166728349146212566991085507, 
                3624230677558240185134364293426744728068310431390197364739092107236741700969, 
                19657994287283202533561102961091871071591070835597955787608966466140612044012, 
                16764342992919011815540382178419399673792379524790635375591601033865397699908, 
                13071148531874889169122043162087858681270108769944909441807768645291530350492, 
                12584443554499185287229776189532921628052488455345635002278157610749918145966, 
                2200052705512443661097998768657640577220475763301780867100037955971884174223, 
                19028000178721072415950684982212299711927224128076361524600662547614941834785
            ],

            publicInputs: [
                9110195795834256749834325857294556710933216128560630139315452502928549190459, 
                10399448168241846983915852774721267829029794545882598909172187031009066819820, 
                7864167786632000407000581592302633740834144670995005538167977204085621328516, 
                7318124320389771021418443381934529404794999197683133795404485014163207955096, 
                1000000000, 
                17455444765574577244194367997385880800133052839061083987750774302427002517871, 
                10124644825111195007984381638554016374545271386660771456018965808739230248684
            ]
        });
        
        TokenVerificationLib.verifyConvert2pUSDC(params);
        
        // publicInputs[0] & publicInputs[1] is cl; publicInputs[2] & publicInputs[3] is cr
        require(elAmount.cl_x == publicInputs[0] && elAmount.cl_y == publicInputs[1] && elAmount.cr_x == publicInputs[2] && elAmount.cr_y == publicInputs[3], "PrivateUSDC: elAmount is not equal");
        // publicInputs[4] == amount
        require(publicInputs[4] == amount, "PrivateUSDC: amount is not equal");
        // publicInputs[5] & publicInputs[6] is owner pk skip check

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

        // 使用TokenVerificationLib验证
        TokenModel.VerifyTokenConvert2USDCParams memory params = TokenModel.VerifyTokenConvert2USDCParams({
            from: msg.sender,
            to: account,
            amount: amount,
            consumedAmount: entity.amount,
            proof: proof,
            publicInputs: publicInputs
        });
        
        TokenVerificationLib.verifyConvert2USDC(params);
        
        // owner check
        require(entity.owner == account, "PrivateUSDC: only owner can convert");
        // amount elgamal check
        require(entity.amount.cl_x == publicInputs[0] && entity.amount.cl_y == publicInputs[1] && entity.amount.cr_x == publicInputs[2] && entity.amount.cr_y == publicInputs[3], "PrivateUSDC: elAmount is not equal");
        // publicInputs[4] == amount, check
        require(publicInputs[4] == amount, "PrivateUSDC: amount is not equal");
        // publicInputs[5] and publicInputs[6] is owner pk skip check
        
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