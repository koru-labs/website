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
        InstitutionUserRegistry institutionRegistration,
        string memory tokenName,
        string memory tokenSymbol,
        uint8 tokenDecimals
    ) public virtual {
        require(!_initialized, "FiatToken: contract is already initialized");

        _initialized = true;
        _l2Event = l2Event;
        _institutionRegistration = institutionRegistration;
        initializePermission(institutionRegistration);
        TokenEventLib.triggerTokenSCCreatedEvent(_l2Event, address(this), msg.sender, tokenSCType, tokenName, tokenSymbol, tokenDecimals);
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

    function configurePrivacyMinter(address minter, TokenModel.ElGamalToken calldata privateAllowedAmount)
        external whenNotPaused onlyMasterMinter virtual returns (bool)
    {
        minters[minter] = true;
        _privateMinterAllowed[minter] = privateAllowedAmount;
        TokenEventLib.triggerMinterAllowedSetEvent(_l2Event, address(this), minter, msg.sender, privateAllowedAmount);
        TokenModel.GrumpkinPublicKey memory minterPk = _institutionRegistration.getUserInstGrumpkinPubKey(minter);
        TokenEventLib.triggerRollupForMintAllowedSet(_l2Event, address(this), msg.sender, minter,minterPk, privateAllowedAmount);
        return true;
    }
    
    function removePrivacyMinter(address minter) external onlyMasterMinter virtual returns (bool) {
        _privateMinterAllowed[minter] = TokenModel.ElGamalToken({
            id: 0,
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
        TokenModel.TokenEntity memory entity,
        TokenModel.ElGamalToken memory newAllowed,
        TokenModel.ElGamalToken memory supplyIncrease,
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
            newMinterAllowed: newAllowed,
            currentMintAmount: entity.amount,
            supplyIncrease: supplyIncrease,
            proof: proof,
            publicInputs: publicInputs
        });
        TokenVerificationLib.verifyTokenMint(params);
        TokenModel.ElGamalToken memory initialMinterAllowed = _privateMinterAllowed[msg.sender];
        TokenEventLib.triggerTokenMintAllowedUpdatedEvent(_l2Event, address(this), msg.sender, msg.sender, _privateMinterAllowed[msg.sender], newAllowed);
        _privateMinterAllowed[msg.sender] = newAllowed;

        TokenModel.ElGamal memory oldTotalSupply = _privateTotalSupply;

        (_privateTotalSupply, _numberOfTotalSupplyChanges) = TokenUtilsLib.addSupply(_privateTotalSupply, _numberOfTotalSupplyChanges, TokenModel.ElGamal(supplyIncrease.cl_x,supplyIncrease.cl_y,supplyIncrease.cr_x,supplyIncrease.cr_y));

        TokenEventLib.triggerTokenSupplyUpdatedEvent(_l2Event, address(this), msg.sender, oldTotalSupply, TokenModel.ElGamal(supplyIncrease.cl_x,supplyIncrease.cl_y,supplyIncrease.cr_x,supplyIncrease.cr_y), TokenModel.ElGamal(0,0,0,0), _privateTotalSupply, _numberOfTotalSupplyChanges);

        TokenUtilsLib.addToken(_accounts, to, entity);
        TokenEventLib.triggerTokenMintedEvent(_l2Event, address(this), to, entity.id, msg.sender);
        TokenEventLib.triggerTokenActionCompletedEvent(_l2Event, address(this), msg.sender, entity.id);
        TokenEventLib.triggerRollupForMint(_l2Event, address(this), entity, publicInputs, proof, initialMinterAllowed.id, newAllowed.id, supplyIncrease.id);

        emit PrivateMint(to, entity.amount);
        return true;
    }

    function privateBurn(uint256 tokenId) external onlyAllowedBank nonReentrant virtual {
        require(tokenId != 0, "tokenId is zero");
        require(_accounts[msg.sender].assets[tokenId].id != 0, "token not exists");
        TokenModel.TokenEntity memory entity = _accounts[msg.sender].assets[tokenId];
        TokenModel.TokenEntity memory backupEntity = _accounts[msg.sender].assets[entity.rollbackTokenId];
        require(entity.id != 0, "invalid token");

        require(entity.tokenType == TokenModel.TokenType.burned, "This token cannot be used for other purposes");

        TokenModel.ElGamal memory supplyDecrease = _accounts[msg.sender].assets[tokenId].amount;
        TokenModel.ElGamal memory oldTotalSupply = _privateTotalSupply;

        (_privateTotalSupply, _numberOfTotalSupplyChanges) = TokenUtilsLib.subSupply(_privateTotalSupply, _numberOfTotalSupplyChanges, supplyDecrease);

        uint256[] memory tokenIds = new uint256[](1);
        tokenIds[0] = tokenId;
        TokenUtilsLib.removeTokens(_accounts, msg.sender, tokenIds);

        uint256[] memory rollbackTokenIds = new uint256[](1);
        rollbackTokenIds[0] = entity.rollbackTokenId;
        TokenUtilsLib.removeTokens(_accounts, msg.sender, rollbackTokenIds);

        TokenEventLib.triggerTokenSupplyUpdatedEvent(_l2Event, address(this), msg.sender, oldTotalSupply, TokenModel.ElGamal(0,0,0,0), supplyDecrease, _privateTotalSupply, _numberOfTotalSupplyChanges);
        TokenEventLib.triggerTokenBurnedEvent(_l2Event, address(this), msg.sender, tokenId);

        TokenModel.GrumpkinPublicKey memory backupPk = _institutionRegistration.getUserInstGrumpkinPubKey(msg.sender);
        TokenModel.GrumpkinPublicKey memory toPk = _institutionRegistration.getUserInstGrumpkinPubKey(entity.to);
        RollupBurnEvent memory e = RollupBurnEvent({
            fromAddress: backupEntity.owner,
            toAddress: entity.to,
            toPk: toPk,
            backupPk: backupPk,
            toTokenId: tokenId,
            backupTokenId: backupEntity.id
        });
        TokenEventLib.triggerRollupForBurn(_l2Event, address(this),  e);
        emit PrivateBurn(msg.sender, supplyDecrease);
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
        TokenModel.TokenEntity[] memory consumedTokens = new TokenModel.TokenEntity[](consumedTokenIds.length);
        for (uint256 i = 0; i < consumedTokenIds.length; i++) {
            consumedTokens[i] = _accounts[from].assets[consumedTokenIds[i]];
        }

        TokenUtilsLib.removeTokens(_accounts, from, consumedTokenIds);

        changeToken.status = TokenModel.TokenStatus.active;
        TokenUtilsLib.addToken(_accounts, from, changeToken);

        TokenEventLib.triggerTokenDeletedEvent(_l2Event, address(this), from, consumedTokenIds, changeToken.id);

        transferToken.rollbackTokenId = rollBackToken.id;
        TokenUtilsLib.addToken(_accounts, from, transferToken);
        TokenUtilsLib.addToken(_accounts, from, rollBackToken);
        TokenEventLib.triggerRollupForSplit(_l2Event, address(this),  consumedTokens, newTokens, publicInputs, proof);
    }

    function privateTransfer(
        uint256 tokenId
    )
    external
    whenNotPaused
    notBlacklisted(msg.sender)
    onlyAllowedBank
    nonReentrant
    virtual
    returns (bool)
    {
        require(tokenId != 0, "PrivateERCToken: tokenId is zero");
        require(_accounts[msg.sender].assets[tokenId].id != 0, "invalid token");
        TokenModel.TokenEntity memory tokenEntity = _accounts[msg.sender].assets[tokenId];
        TokenModel.TokenEntity memory backupEntity = _accounts[msg.sender].assets[tokenEntity.rollbackTokenId];
        address to = tokenEntity.to;
        require(tokenEntity.tokenType == TokenModel.TokenType.transferred, "This token cannot be used for other purposes");

        delete _accounts[msg.sender].assets[tokenEntity.rollbackTokenId];

        uint256[] memory consumedTokens = new uint256[](2);
        consumedTokens[0] = tokenEntity.id;
        consumedTokens[1] = tokenEntity.rollbackTokenId;

        delete _accounts[msg.sender].assets[tokenEntity.id];
        TokenEventLib.triggerTokenDeletedEvent(_l2Event, address(this), msg.sender, consumedTokens, 0);

        tokenEntity.rollbackTokenId = 0;
        tokenEntity.owner = to;
        tokenEntity.status = TokenModel.TokenStatus.active;
        _accounts[tokenEntity.to].assets[tokenEntity.id] = tokenEntity;

        TokenEventLib.triggerTokenReceivedEvent(_l2Event, address(this), to, tokenEntity.id, address(this), tokenEntity.status, tokenEntity.amount);

        TokenEventLib.triggerTokenActionCompletedEvent(_l2Event, address(this), msg.sender, consumedTokens[1]);

        TokenModel.GrumpkinPublicKey memory backupPk = _institutionRegistration.getUserInstGrumpkinPubKey(msg.sender);
        TokenEventLib.triggerRollupForTransfer(_l2Event, address(this), msg.sender,to, backupPk,backupEntity.id);

        emit PrivateTransfer(msg.sender, to, tokenEntity.amount);

        return true;

    }

    function privateTransfers(
        uint256[] calldata tokenIds
    )
    external
    whenNotPaused
    notBlacklisted(msg.sender)
    onlyAllowedBank
    nonReentrant
    virtual
    returns (bool)
    {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(tokenIds[i] != 0, "PrivateERCToken: tokenId is zero");
            require(_accounts[msg.sender].assets[tokenIds[i]].id != 0, "invalid token");

            TokenModel.TokenEntity memory tokenEntity = _accounts[msg.sender].assets[tokenIds[i]];
            TokenModel.TokenEntity memory backupEntity = _accounts[msg.sender].assets[tokenEntity.rollbackTokenId];
            require(tokenEntity.tokenType == TokenModel.TokenType.transferred, "This token cannot be used for other purposes");

            delete _accounts[msg.sender].assets[tokenEntity.rollbackTokenId];

            uint256[] memory consumedTokens = new uint256[](2);
            consumedTokens[0] = tokenEntity.id;
            consumedTokens[1] = tokenEntity.rollbackTokenId;

            delete _accounts[msg.sender].assets[tokenEntity.id];
            TokenEventLib.triggerTokenDeletedEvent(_l2Event, address(this), msg.sender, consumedTokens, 0);

            tokenEntity.rollbackTokenId = 0;
            tokenEntity.owner = tokenEntity.to;
            tokenEntity.status = TokenModel.TokenStatus.active;

            _accounts[tokenEntity.to].assets[tokenEntity.id] = tokenEntity;
            TokenEventLib.triggerTokenReceivedEvent(_l2Event, address(this), tokenEntity.to, tokenEntity.id, address(this), tokenEntity.status, tokenEntity.amount);
            TokenEventLib.triggerTokenActionCompletedEvent(_l2Event, address(this), msg.sender, consumedTokens[1]);

            TokenModel.GrumpkinPublicKey memory backupPk = _institutionRegistration.getUserInstGrumpkinPubKey(msg.sender);
            TokenEventLib.triggerRollupForTransfer(_l2Event, address(this), msg.sender, tokenEntity.to, backupPk, backupEntity.id);

            emit PrivateTransfer(msg.sender, tokenEntity.to, tokenEntity.amount);
        }

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

        TokenModel.GrumpkinPublicKey memory toPk = _institutionRegistration.getUserInstGrumpkinPubKey(transferToken.to);

        TokenModel.TokenEntity storage rollbackToken = _accounts[msg.sender].assets[transferToken.rollbackTokenId];
        require(rollbackToken.id != 0, "PrivateERCToken: invalid rollback token");
        require(rollbackToken.owner == msg.sender, "PrivateERCToken: caller is not the rollback token owner");
        rollbackToken.status = TokenModel.TokenStatus.active;

        uint256[] memory transferTokens = new uint256[](1);
        transferTokens[0] = tokenId;
        TokenUtilsLib.removeTokens(_accounts, transferToken.owner, transferTokens);
        TokenEventLib.triggerTokenCanceledEvent(_l2Event, address(this), transferToken.owner, tokenId);

        TokenEventLib.triggerRollupForCancel(_l2Event, address(this), transferToken.owner,transferToken.to, toPk,tokenId);
        return true;
    }
}