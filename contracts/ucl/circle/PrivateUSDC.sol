// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./base/PrivateERCToken.sol";
import "../../usdc/v2/FiatTokenV2.sol";
import "./base/TokenConverterBase.sol";

/**
 * @title IZKProofVerifier
 * @dev Interface for zero knowledge proof verification
 */
interface IZKProofVerifier {
    function verify(uint256[8] memory proof, uint256[] memory publicInputs) external view returns (bool);
}

/**
 * @title PrivateUSDC
 * @dev Implementation of the private USDC token with conversion functionality
 */
contract PrivateUSDC is PrivateERCToken, FiatTokenV2, TokenConverterBase {
    
    // verifier type enum
    enum VerifierType {
        Convert2pUSDC,
        Convert2USDC
        // can add more verifier types here
    }
    
    // verifier address mapping
    mapping(VerifierType => address) internal _verifiers;
    
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
     * @param value The ElGamal encrypted private USDC amount
     * @param publicInputs The public inputs for the proof
     * @param proof The zero knowledge proof
     * @return True if the operation was successful
     */
    function convert2pUSDC(
        address account, 
        uint256 amount, 
        TokenModel.ElGamal calldata value, 
        uint256[] calldata publicInputs,
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
        
        // Verify the proof
        require(verifyProof(VerifierType.Convert2pUSDC, proof, publicInputs), "PrivateUSDC: invalid proof");
        
        // Create TokenEntity
        TokenModel.TokenEntity memory entity = TokenModel.TokenEntity({
            id: hashElgamal(value),
            owner: account,
            status: TokenModel.TokenStatus.active,
            amount: value,
            to: address(0),
            rollbackTokenId: 0
        });
        
        // Increase private total supply
        TokenModel.ElGamal memory oldTotalSupply = _privateTotalSupply;
        addSupply(value);
        TokenEventLib.triggerTokenSupplyUpdatedEvent(
            _l2Event, 
            address(this), 
            msg.sender, 
            oldTotalSupply, 
            value, 
            TokenModel.ElGamal(0,0,0,0), 
            _privateTotalSupply,
            _numberOfTotalSupplyChanges
        );
        
        // Add token and update balance
        addTokenWithBalance(account, entity);
        
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
        uint256[] calldata publicInputs,
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

        // Verify the proof
        require(verifyProof(VerifierType.Convert2USDC, proof, publicInputs), "PrivateUSDC: invalid proof");
        
        // Decrease private total supply
        TokenModel.ElGamal memory oldTotalSupply = _privateTotalSupply;
        subSupply(entity.amount);
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
        removeTokensWithBalance(msg.sender, tokenIds);
        
        // direct call the _setBalance method in the inherited FiatTokenV1.sol
        // totalSupply_ = totalSupply() + amount;
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

    function verifyProof(VerifierType verifierType, uint256[8] memory proof, uint256[] memory publicInputs) internal view returns (bool) {
        address verifier = _verifiers[verifierType];
        require(verifier != address(0), "PrivateUSDC: verifier not set");
        return IZKProofVerifier(verifier).verify(proof, publicInputs);
    }

    /**
     * @dev Sets a verifier contract address for a specific verifier type
     * @param verifierType The type of verifier to set
     * @param verifierAddress The address of the verifier contract
     */
    function setVerifier(VerifierType verifierType, address verifierAddress) external onlyOwner {
        require(verifierAddress != address(0), "PrivateUSDC: verifier cannot be zero address");
        _verifiers[verifierType] = verifierAddress;
        emit VerifierSet(verifierType, verifierAddress);
    }
    
    /**
     * @dev Gets the verifier address for a specific verifier type
     * @param verifierType The type of verifier to query
     * @return The address of the verifier contract
     */
    function getVerifier(VerifierType verifierType) external view returns (address) {
        return _verifiers[verifierType];
    }
    
    /**
     * @dev Emitted when a verifier is set
     * @param verifierType The type of verifier that was set
     * @param verifierAddress The address of the verifier contract
     */
    event VerifierSet(VerifierType indexed verifierType, address indexed verifierAddress);
}