// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PrivateTokenData.sol";
import "../model/TokenModel.sol";
import "../lib/TokenEventLib.sol";
import "../lib/TokenVerificationLib.sol";
import "../lib/TokenUtilsLib.sol";
import { Pausable } from "../../../usdc/v1/Pausable.sol";
import { Blacklistable } from "../../../usdc/v1/Blacklistable.sol";
import { Mintable } from "../../../usdc/v1/Mintable.sol";
import { Permissioned } from "./permissioned.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

abstract contract PrivateTokenCore is
    PrivateTokenData,
    Pausable,
    Blacklistable,
    Mintable,
    Permissioned,
    ReentrancyGuard
{
    event PrivateMint(address indexed from, TokenModel.ElGamal value);
    event PrivateBurn(address indexed from, TokenModel.ElGamal value);
    event PrivateTransfer(address indexed from, address indexed to, TokenModel.ElGamal value);
    function initialize_hamsa(
        TokenModel.TokenSCTypeEnum tokenSCType,
        IL2Event l2Event,
        InstitutionUserRegistry institutionRegistration
    ) public virtual {
        require(!_initialized, "FiatToken: contract is already initialized");
        
        _initialized = true;
        _l2Event = l2Event;
        _institutionRegistration = institutionRegistration;
        initializePermission(institutionRegistration);
        TokenEventLib.triggerTokenSCCreatedEvent(_l2Event, address(this), msg.sender, tokenSCType);
    }

    function privateBalanceOf(address owner) external view virtual returns (TokenModel.ElGamal memory) {
        return _accounts[owner].balance;
    }
    
    function privateTotalSupply() external view virtual returns (TokenModel.ElGamal memory) {
        return _privateTotalSupply;
    }
    
    function publicTotalSupply() external view virtual returns (uint256, bool) {
        return (_publicTotalSupply, _numberOfTotalSupplyChanges == 0);
    }
    
    function getAccountTokenById(
        address account,
        uint256 tokenId
    ) external view virtual returns (TokenModel.TokenEntity memory) {
        return _accounts[account].assets[tokenId];
    }

    function configurePrivacyMinter(address minter, TokenModel.ElGamal calldata privateAllowedAmount)
        external whenNotPaused onlyMasterMinter virtual returns (bool)
    {
        minters[minter] = true;
        _privateMinterAllowed[minter] = privateAllowedAmount;
        TokenEventLib.triggerMinterAllowedSetEvent(_l2Event, address(this), minter, msg.sender, privateAllowedAmount);
        return true;
    }
    
    function removePrivacyMinter(address minter) external onlyMasterMinter virtual returns (bool) {
        _privateMinterAllowed[minter] = TokenModel.ElGamal({
            cl_x: 0,
            cl_y: 0,
            cr_x: 0,
            cr_y: 0
        });
        return true;
    }
    
    function revealTotalSupply(uint256 publicTotalSupply, bytes calldata proof)
        external nonReentrant virtual
    {
        _publicTotalSupply = publicTotalSupply;
    }
    function privateMint(
        address to,
        TokenModel.ElGamal memory amount,
        TokenModel.ElGamal memory supplyIncrease,
        uint256[8] calldata proof,
        uint256[22] calldata publicInputs
    )
    external
    whenNotPaused
    onlyMinters
    notBlacklisted(msg.sender)
    notBlacklisted(to)
    onlyAllowedBank
    nonReentrant
    virtual
    returns (bool)
    {
        require(to != address(0), "PrivateERCToken: mint to the zero address");

        TokenModel.VerifyTokenMintParams memory params = TokenModel.VerifyTokenMintParams({
            institutionRegistration: _institutionRegistration,
            minter: msg.sender,
            to: to,
            initialMinterAllowed: _privateMinterAllowed[msg.sender],
            currentMintAmount: amount,
            supplyIncrease: supplyIncrease,
            proof: proof,
            publicInputs: publicInputs
        });
        TokenVerificationLib.verifyTokenMint(params);

        TokenModel.ElGamal memory newAllowed = TokenModel.ElGamal({
            cl_x: publicInputs[4],
            cl_y: publicInputs[5],
            cr_x: publicInputs[6],
            cr_y: publicInputs[7]
        });

        TokenEventLib.triggerTokenMintAllowedUpdatedEvent(_l2Event, address(this), msg.sender, msg.sender, _privateMinterAllowed[msg.sender], newAllowed);
        _privateMinterAllowed[msg.sender] = newAllowed;

        TokenModel.ElGamal memory oldTotalSupply = _privateTotalSupply;
        (_privateTotalSupply, _numberOfTotalSupplyChanges) = TokenUtilsLib.addSupply(_privateTotalSupply, _numberOfTotalSupplyChanges, supplyIncrease);
        TokenEventLib.triggerTokenSupplyUpdatedEvent(_l2Event, address(this), msg.sender, oldTotalSupply, supplyIncrease, TokenModel.ElGamal(0,0,0,0), _privateTotalSupply, _numberOfTotalSupplyChanges);

        TokenModel.TokenEntity memory entity = TokenModel.TokenEntity({
            id: TokenUtilsLib.hashElgamal(amount),
            owner: to,
            status: TokenModel.TokenStatus.active,
            amount: amount,
            to: address(0),
            rollbackTokenId: 0
        });
        TokenUtilsLib.addTokenWithBalance(_accounts, to, entity);
        TokenEventLib.triggerTokenMintedEvent(_l2Event, address(this), to, amount, msg.sender);
        TokenEventLib.triggerTokenActionCompletedEvent(_l2Event, address(this), msg.sender, entity.id);
        TokenEventLib.triggerRollupForMint(_l2Event, address(this), entity, proof, publicInputs);

        emit PrivateMint(to, amount);
        return true;
    }

    function privateBurn(uint256 tokenId) external onlyAllowedBank nonReentrant virtual {
        require(tokenId != 0, "PrivateERCToken: tokenId is zero");
        TokenModel.TokenEntity memory entity = _accounts[msg.sender].assets[tokenId];
        require(entity.id != 0, "invalid token");

        TokenModel.ElGamal memory supplyDecrease = _accounts[msg.sender].assets[tokenId].amount;
        TokenModel.ElGamal memory oldTotalSupply = _privateTotalSupply;

        (_privateTotalSupply, _numberOfTotalSupplyChanges) = TokenUtilsLib.subSupply(_privateTotalSupply, _numberOfTotalSupplyChanges, supplyDecrease);

        uint256[] memory tokenIds = new uint256[](1);
        tokenIds[0] = tokenId;
        TokenUtilsLib.removeTokensWithBalance(_accounts, msg.sender, tokenIds);

        uint256[] memory rollbackTokenIds = new uint256[](1);
        rollbackTokenIds[0] = entity.rollbackTokenId;
        TokenUtilsLib.removeTokens(_accounts, msg.sender, rollbackTokenIds);

        TokenEventLib.triggerTokenSupplyUpdatedEvent(_l2Event, address(this), msg.sender, oldTotalSupply, TokenModel.ElGamal(0,0,0,0), supplyDecrease, _privateTotalSupply, _numberOfTotalSupplyChanges);
        TokenEventLib.triggerTokenBurnedEvent(_l2Event, address(this), msg.sender, tokenId);

        emit PrivateBurn(msg.sender, supplyDecrease);
        TokenEventLib.triggerRollupForBurn(_l2Event, address(this),  entity);
    }

    function privateSplitToken(
        uint256[] memory consumedTokenIds,
        address from,
        address to,
        TokenModel.TokenEntity[] calldata newTokens,
        uint256[8] calldata proof,
        uint256[20] calldata publicInputs
    ) external whenNotPaused notBlacklisted(msg.sender) notBlacklisted(to) onlyAllowedBank nonReentrant virtual {

        require(_institutionRegistration.isInstitutionManager(msg.sender), "only institution manager is allowed to execute reservation");

        TokenModel.ElGamal memory onChainConsumedAmount = TokenUtilsLib.sumTokenAmountsFromAccount(_accounts, from, consumedTokenIds);
        TokenModel.TokenEntity memory changeToken = newTokens[0];
        TokenModel.TokenEntity memory transferToken = newTokens[1];
        TokenModel.TokenEntity memory rollBackToken = newTokens[2];

        TokenModel.VerifyTokenSplitParams memory params = TokenModel.VerifyTokenSplitParams({
            institutionRegistration: _institutionRegistration,
            from: from,
            to: to,
            consumedAmount: onChainConsumedAmount,
            amount: transferToken.amount,
            remainingAmount: changeToken.amount,
            rollbackAmount: rollBackToken.amount,
            proof: proof,
            publicInputs: publicInputs
        });
        TokenVerificationLib.verifyTokenSplit(params);

        TokenUtilsLib.removeTokens(_accounts, from, consumedTokenIds);

        changeToken.status = TokenModel.TokenStatus.active;
        TokenUtilsLib.addToken(_accounts, from, changeToken);

        TokenEventLib.triggerTokenDeletedEvent(_l2Event, address(this), from, consumedTokenIds, changeToken.id);

        transferToken.rollbackTokenId = rollBackToken.id;
        TokenUtilsLib.addToken(_accounts, from, transferToken);
        TokenUtilsLib.addToken(_accounts, from, rollBackToken);
        TokenEventLib.triggerRollupForSplit(_l2Event, address(this),  consumedTokenIds,changeToken, transferToken, rollBackToken);
    }

    function privateTransfer(
        uint256 tokenId,
        address to
    )
    external
    whenNotPaused
    notBlacklisted(msg.sender)
    notBlacklisted(to)
    onlyAllowedBank
    nonReentrant
    virtual
    returns (bool)
    {
        require(tokenId != 0, "PrivateERCToken: tokenId is zero");
        require(to != address(0), "PrivateERCToken: to is the zero address");
        TokenModel.TokenEntity memory tokenEntity = _accounts[msg.sender].assets[tokenId];
        require(tokenEntity.to == to, "PrivateERCToken: tokenId is not matched");

        uint256[] memory rollbackTokens = new uint256[](1);
        rollbackTokens[0] = tokenEntity.rollbackTokenId;
        TokenUtilsLib.removeTokensWithBalance(_accounts, msg.sender, rollbackTokens);

        uint256[] memory consumedTokens = new uint256[](2);
        consumedTokens[0] = tokenEntity.id;
        consumedTokens[1] = tokenEntity.rollbackTokenId;

        uint256[] memory oldTokens = new uint256[](1);
        oldTokens[0] = tokenEntity.id;
        TokenUtilsLib.removeTokens(_accounts, msg.sender, oldTokens);

        TokenEventLib.triggerTokenDeletedEvent(_l2Event, address(this), msg.sender, consumedTokens, 0);

        tokenEntity.rollbackTokenId = 0;
        tokenEntity.owner = to;
        tokenEntity.status = TokenModel.TokenStatus.active;

        TokenUtilsLib.addTokenWithBalance(_accounts, tokenEntity.to, tokenEntity);
        TokenEventLib.triggerTokenReceivedEvent(_l2Event, address(this), to, tokenEntity.id, address(this), tokenEntity.status, tokenEntity.amount);

        TokenEventLib.triggerTokenActionCompletedEvent(_l2Event, address(this), msg.sender, consumedTokens[1]);
        TokenEventLib.triggerRollupForTransfer(_l2Event, address(this),  tokenEntity);
        emit PrivateTransfer(msg.sender, to, tokenEntity.amount);
        return true;
    }

    function privateCancelToken(uint256 tokenId) external
    whenNotPaused notBlacklisted(msg.sender) onlyAllowedBank nonReentrant virtual returns (bool) {
        require(tokenId != 0, "PrivateERCToken: tokenId is zero");

        TokenModel.TokenEntity memory transferToken = _accounts[msg.sender].assets[tokenId];
        require(transferToken.id != 0, "PrivateERCToken: token does not exist");
        require(transferToken.owner == msg.sender, "PrivateERCToken: caller is not the token owner");
        require(transferToken.status == TokenModel.TokenStatus.inactive, "PrivateERCToken: token is not in inactive status");
        require(transferToken.rollbackTokenId != 0, "PrivateERCToken: rollback token does not exist");

        TokenModel.TokenEntity storage rollbackToken = _accounts[msg.sender].assets[transferToken.rollbackTokenId];
        require(rollbackToken.id != 0, "PrivateERCToken: invalid rollback token");
        require(rollbackToken.owner == msg.sender, "PrivateERCToken: caller is not the rollback token owner");
        rollbackToken.status = TokenModel.TokenStatus.active;

        uint256[] memory transferTokens = new uint256[](1);
        transferTokens[0] = tokenId;
        TokenUtilsLib.removeTokens(_accounts, transferToken.owner, transferTokens);
        TokenEventLib.triggerTokenCanceledEvent(_l2Event, address(this), transferToken.owner, tokenId);
        TokenEventLib.triggerRollupForCancel(_l2Event, address(this), transferToken, rollbackToken);
        return true;
    }
}
