// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PrivateTotalSupplyManager.sol";
import "../model/TokenModel.sol";
import "../lib/TokenEventLib.sol";
import "../lib/TokenVerificationLib.sol";
import "../lib/TokenUtilsLib.sol";
import { Pausable } from "../../../usdc/v1/Pausable.sol";
import { Blacklistable } from "../../../usdc/v1/Blacklistable.sol";
import { Permissioned } from "./permissioned.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

abstract contract PrivateTokenApproval is 
    PrivateTotalSupplyManager, 
    Pausable, 
    Blacklistable, 
    Permissioned, 
    ReentrancyGuard 
{
    event PrivateApproval(address indexed owner, address indexed spender, TokenModel.Allowance value);
    event PrivateApprovalToken(address indexed owner, address indexed spender, uint256 indexed tokenId);
    event PrivateTransferFrom(address indexed spender, address indexed from, address indexed to, uint256 tokenId);
    event PrivateApprovalRevoked(address indexed owner, address indexed spender, uint256 indexed tokenId);
    event PrivateBurnFrom(address indexed spender, address indexed from, uint256 indexed tokenId);
    
    function privateApprove(
        uint256[] memory consumedTokenIds,
        address spender,
        address to,
        TokenModel.TokenEntity[] memory newTokens,
        uint256[8] calldata proof,
        uint256[20] calldata publicInputs
    ) external whenNotPaused notBlacklisted(msg.sender) notBlacklisted(spender)
     notBlacklisted(to) onlyAllowedBank nonReentrant virtual {
        require(spender != address(0), "PrivateERCToken: approve to the zero address");
        require(newTokens.length == 3, "PrivateERCToken: invalid newTokens length");

        TokenModel.ElGamal memory onChainConsumedAmount = TokenUtilsLib.sumTokenAmountsFromAccount(_accounts, msg.sender, consumedTokenIds);
        TokenModel.TokenEntity memory changeToken = newTokens[0];
        TokenModel.TokenEntity memory allowanceToken = newTokens[1];
        TokenModel.TokenEntity memory rollbackToken = newTokens[2];

        TokenModel.VerifyTokenSplitParams memory params = TokenModel.VerifyTokenSplitParams({
            institutionRegistration: _institutionRegistration,
            from: msg.sender,
            to: to,
            consumedAmount: onChainConsumedAmount,
            amount: allowanceToken.amount,
            remainingAmount: changeToken.amount,
            rollbackAmount: rollbackToken.amount,
            proof: proof,
            publicInputs: publicInputs
        });
        TokenVerificationLib.verifyTokenSplit(params);

        TokenModel.TokenEntity[] memory consumedTokens = new TokenModel.TokenEntity[](consumedTokenIds.length);
        for (uint256 i = 0; i < consumedTokenIds.length; i++) {
            consumedTokens[i] = _accounts[msg.sender].assets[consumedTokenIds[i]];
        }

        TokenUtilsLib.removeTokens(_accounts, msg.sender, consumedTokenIds);

        changeToken.status = TokenModel.TokenStatus.active;
        TokenUtilsLib.addToken(_accounts, msg.sender, changeToken);

        TokenEventLib.triggerTokenDeletedEvent(_l2Event, address(this), msg.sender, consumedTokenIds, changeToken.id);

        allowanceToken.rollbackTokenId = rollbackToken.id;
        allowanceToken.to = to;
        TokenUtilsLib.addToken(_accounts, msg.sender, allowanceToken);

        TokenUtilsLib.addAllowanceRecord(_accounts, msg.sender, spender, allowanceToken.id);

        TokenUtilsLib.addToken(_accounts, msg.sender, rollbackToken);

        TokenEventLib.triggerTokenActionCompletedEvent(_l2Event, address(this), msg.sender, allowanceToken.id);


        TokenEventLib.triggerRollupForApproval(_l2Event, address(this),  consumedTokens, newTokens, publicInputs, proof);

        emit PrivateApprovalToken(msg.sender, spender, allowanceToken.id);
    }

    function privateTransferFroms(
        uint256[] calldata tokenIds,
        address from,
        address to
    ) external whenNotPaused notBlacklisted(msg.sender) notBlacklisted(from)
    notBlacklisted(to) onlyAllowedBank nonReentrant virtual returns (bool) {
        require(to != address(0), "PrivateERCToken: to is the zero address");
        require(from != address(0), "PrivateERCToken: from is the zero address");

        TokenModel.GrumpkinPublicKey memory spenderPk = _institutionRegistration.getUserInstGrumpkinPubKey(msg.sender);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            _processTransferFrom(msg.sender, from, to, tokenIds[i], spenderPk);
        }

        return true;
    }

    function _processTransferFrom(
        address spender,
        address from,
        address to,
        uint256 tokenId,
        TokenModel.GrumpkinPublicKey memory spenderPk
    ) internal {
        require(tokenId != 0, "PrivateERCToken: tokenId is zero");

        mapping(uint256 => TokenModel.TokenEntity) storage fromAssets = _accounts[from].assets;
        mapping(uint256 => TokenModel.TokenEntity) storage toAssets = _accounts[to].assets;

        TokenModel.TokenEntity memory allowanceToken = fromAssets[tokenId];
        require(allowanceToken.id != 0, "PrivateERCToken: invalid allowance token");
        require(allowanceToken.to == to, "PrivateERCToken: tokenId is not matched");
        require(TokenUtilsLib.isAllowanceExists(_accounts, from, spender, tokenId), "PrivateERCToken: invalid allowance tokenId");

        uint256 rollbackTokenId = allowanceToken.rollbackTokenId;

        delete fromAssets[rollbackTokenId];
        delete fromAssets[tokenId];

        uint256[] memory consumedTokens = new uint256[](2);
        consumedTokens[0] = tokenId;
        consumedTokens[1] = rollbackTokenId;

        TokenEventLib.triggerTokenDeletedEvent(_l2Event, address(this), from, consumedTokens, 0);

        allowanceToken.rollbackTokenId = 0;
        allowanceToken.owner = to;
        allowanceToken.status = TokenModel.TokenStatus.active;

        toAssets[tokenId] = allowanceToken;
        TokenEventLib.triggerTokenReceivedEvent(_l2Event, address(this), to, tokenId, address(this), allowanceToken.status, allowanceToken.amount);

        TokenUtilsLib.removeAllowanceRecord(_accounts, from, spender, tokenId);

        TokenEventLib.triggerTokenActionCompletedEvent(_l2Event, address(this), from, rollbackTokenId);
        TokenEventLib.triggerRollupForTransferFrom(_l2Event, address(this), spender, to, spenderPk, tokenId);

        emit PrivateTransferFrom(spender, from, to, tokenId);
    }

    function privateRevokeApproval(address spender, uint256 allowanceTokenId) external whenNotPaused
    notBlacklisted(msg.sender) onlyAllowedBank nonReentrant virtual {
        require(spender != address(0), "PrivateERCToken: spender is the zero address");
        require(allowanceTokenId != 0, "PrivateERCToken: allowanceTokenId is zero");

        require(TokenUtilsLib.isAllowanceExists(_accounts, msg.sender, spender, allowanceTokenId), "PrivateERCToken: allowance tokenId not found for this spender");

        TokenModel.TokenEntity memory allowanceToken = _accounts[msg.sender].assets[allowanceTokenId];
        require(allowanceToken.id != 0, "PrivateERCToken: allowance token not found in assets");
        require(allowanceToken.owner == msg.sender, "PrivateERCToken: caller is not the token owner");
        require(allowanceToken.rollbackTokenId != 0, "PrivateERCToken: rollback token not found");
        TokenModel.GrumpkinPublicKey memory toPk = _institutionRegistration.getUserInstGrumpkinPubKey(allowanceToken.to);

        TokenModel.TokenEntity storage rollbackToken = _accounts[msg.sender].assets[allowanceToken.rollbackTokenId];
        require(rollbackToken.id != 0, "PrivateERCToken: invalid rollback token");
        rollbackToken.status = TokenModel.TokenStatus.active;

        uint256[] memory allowanceTokenIds = new uint256[](1);
        allowanceTokenIds[0] = allowanceTokenId;
        TokenUtilsLib.removeTokens(_accounts, allowanceToken.owner, allowanceTokenIds);
        TokenEventLib.triggerTokenCanceledEvent(_l2Event, address(this), allowanceToken.owner, allowanceTokenId);

        TokenUtilsLib.removeAllowanceRecord(_accounts, msg.sender, spender, allowanceTokenId);
        TokenEventLib.triggerRollupForRevokeApproval(_l2Event, address(this), msg.sender,allowanceToken.to, toPk,allowanceTokenId);

        emit PrivateApprovalRevoked(msg.sender, spender, allowanceTokenId);
    }

    function privateRevokeApprovalFrom(address owner, uint256 allowanceTokenId) external whenNotPaused
    notBlacklisted(msg.sender) notBlacklisted(owner) onlyAllowedBank nonReentrant virtual {
        require(owner != address(0), "PrivateERCToken: owner is the zero address");
        require(allowanceTokenId != 0, "PrivateERCToken: allowanceTokenId is zero");

        require(TokenUtilsLib.isAllowanceExists(_accounts, owner, msg.sender, allowanceTokenId), "PrivateERCToken: no allowance exists for this spender");

        TokenModel.TokenEntity memory allowanceToken = _accounts[owner].assets[allowanceTokenId];
        require(allowanceToken.id != 0, "PrivateERCToken: allowance token not found in assets");
        require(allowanceToken.owner == owner, "PrivateERCToken: owner is not the token owner");
        require(allowanceToken.rollbackTokenId != 0, "PrivateERCToken: rollback token not found");

        TokenModel.GrumpkinPublicKey memory toPk = _institutionRegistration.getUserInstGrumpkinPubKey(allowanceToken.to);

        TokenModel.TokenEntity storage rollbackToken = _accounts[owner].assets[allowanceToken.rollbackTokenId];
        require(rollbackToken.id != 0, "PrivateERCToken: invalid rollback token");
        rollbackToken.status = TokenModel.TokenStatus.active;

        uint256[] memory allowanceTokenIds = new uint256[](1);
        allowanceTokenIds[0] = allowanceTokenId;
        TokenUtilsLib.removeTokens(_accounts, owner, allowanceTokenIds);
        TokenEventLib.triggerTokenCanceledEvent(_l2Event, address(this), owner, allowanceTokenId);

        TokenUtilsLib.removeAllowanceRecord(_accounts, owner, msg.sender, allowanceTokenId);

        TokenEventLib.triggerRollupForRevokeApproval(_l2Event, address(this), owner,allowanceToken.to, toPk,allowanceTokenId);

        emit PrivateApprovalRevoked(owner, msg.sender, allowanceTokenId);
    }

    function isAllowanceExists(address owner,address spender, uint256 tokenId) external view returns (bool) {
        return TokenUtilsLib.isAllowanceExists(_accounts, owner, spender, tokenId);
    }

    function privateBurnFroms(address from, uint256[] calldata allowanceTokenIds) external whenNotPaused notBlacklisted(msg.sender) notBlacklisted(from) onlyAllowedBank nonReentrant {
         _updatePrivateTotalSupply();
        
        for (uint256 i = 0; i < allowanceTokenIds.length; i++) {
            _privateBurnFrom(msg.sender, from, allowanceTokenIds[i]);
        }
    }

    function _privateBurnFrom(address spender, address from, uint256 allowanceTokenId) internal {
        require(from != address(0), "PrivateERCToken: from is the zero address");
        require(allowanceTokenId != 0, "PrivateERCToken: allowanceTokenId is zero");

        require(TokenUtilsLib.isAllowanceExists(_accounts, from, spender, allowanceTokenId), "PrivateERCToken: no allowance exists for this spender");

        TokenModel.TokenEntity storage entityStorage = _accounts[from].assets[allowanceTokenId];
        require(entityStorage.id != 0, "PrivateERCToken: allowance token not found in assets");
        require(entityStorage.owner == from, "PrivateERCToken: from is not the token owner");

        TokenModel.TokenEntity memory entity = entityStorage;
        TokenModel.TokenEntity memory backupEntity = _accounts[from].assets[entity.rollbackTokenId];

        TokenModel.ElGamal memory supplyDecrease = entityStorage.amount;
        TokenModel.ElGamal memory oldTotalSupply = _decreasePrivateTotalSupply(supplyDecrease);

        delete _accounts[from].assets[allowanceTokenId];

        uint256 rollbackTokenId = entity.rollbackTokenId;
        delete _accounts[from].assets[rollbackTokenId];

        TokenUtilsLib.removeAllowanceRecord(_accounts, from, spender, allowanceTokenId);

        TokenEventLib.triggerTokenSupplyUpdatedEvent(
            _l2Event,
            address(this),
            from,
            oldTotalSupply,
            TokenModel.ElGamal(0, 0, 0, 0),
            supplyDecrease,
            _privateTotalSupply,
            _numberOfTotalSupplyChanges
        );
        TokenEventLib.triggerTokenBurnedEvent(_l2Event, address(this), from, allowanceTokenId);

        TokenModel.GrumpkinPublicKey memory backupPk = _institutionRegistration.getUserInstGrumpkinPubKey(from);
        TokenModel.GrumpkinPublicKey memory toPk = _institutionRegistration.getUserInstGrumpkinPubKey(entity.to);
        RollupBurnEvent memory e = RollupBurnEvent({
            fromAddress: from,
            toAddress: entity.to,
            toPk: toPk,
            backupPk: backupPk,
            toTokenId: allowanceTokenId,
            backupTokenId: backupEntity.id
        });
        TokenEventLib.triggerRollupForBurn(_l2Event, address(this), e);
        emit PrivateBurnFrom(spender, from, allowanceTokenId);
    }
}
