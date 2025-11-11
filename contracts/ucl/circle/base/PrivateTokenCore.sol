// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PrivateTotalSupplyManager.sol";
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
    PrivateTotalSupplyManager,
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
        uint8 tokenDecimals,
        address newOwner
    ) public virtual {
        require(!_initialized, "FiatToken: contract is already initialized");

        _initialized = true;
        _l2Event = l2Event;
        _institutionRegistration = institutionRegistration;
        initializePermission(institutionRegistration);

        // Initialize step length to 300 blocks by default
        _stepLength = 300;
        _lastProcessedBlockNumber = block.number;

        TokenEventLib.triggerTokenSCCreatedEvent(_l2Event, address(this), newOwner, tokenSCType, tokenName, tokenSymbol, tokenDecimals);
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

    function configureStepLength(uint256 stepLength) external onlyOwner {
        require(stepLength > 0, "PrivateTokenCore: step length must be greater than 0");
        _stepLength = stepLength;
    }

    function revealPrivateTotalSupply(
        uint256 blockNumber,
        uint256 revealedAmount,
        TokenModel.ElGamal memory privateTotalSupply,
        uint256[8] calldata proof,
        uint256[11] calldata publicInputs
    ) external whenNotPaused onlyOwner nonReentrant {
        TokenModel.ElGamal memory recordedPrivateTotalSupply = _privateTotalSupplyHistory[blockNumber];
        require(
            recordedPrivateTotalSupply.cl_x != 0 ||
            recordedPrivateTotalSupply.cl_y != 0 ||
            recordedPrivateTotalSupply.cr_x != 0 ||
            recordedPrivateTotalSupply.cr_y != 0,
            "PrivateTokenCore: no snapshot exists for this block number"
        );

        require(
            recordedPrivateTotalSupply.cl_x == privateTotalSupply.cl_x &&
            recordedPrivateTotalSupply.cl_y == privateTotalSupply.cl_y &&
            recordedPrivateTotalSupply.cr_x == privateTotalSupply.cr_x &&
            recordedPrivateTotalSupply.cr_y == privateTotalSupply.cr_y,
            "PrivateTokenCore: provided private total supply does not match recorded snapshot"
        );

        require(proof.length > 0, "PrivateTokenCore: proof is required");
        TokenModel.GrumpkinPublicKey memory ownerPk = _institutionRegistration.getUserInstGrumpkinPubKey(msg.sender);
        TokenModel.VerifyRevealPrivateTotalSupplyParams memory params = TokenModel.VerifyRevealPrivateTotalSupplyParams({
            revealedAmount: revealedAmount,
            privateTotalSupply: privateTotalSupply,
            ownerPk:ownerPk,
            proof: proof,
            publicInputs: publicInputs
        });
        TokenVerificationLib.verifyRevealPrivateTotalSupply(params);

        _lastRevealedPublicTotalSupply = revealedAmount;
        _lastRevealedBlockNumber = blockNumber;

        _publicTotalSupply = revealedAmount;

        emit PrivateTotalSupplyRevealed(blockNumber, revealedAmount);

        TokenEventLib.triggerPrivateTotalSupplyRevealedEvent(
            _l2Event,
            address(this),
            msg.sender,
            blockNumber,
            revealedAmount,
            privateTotalSupply
        );
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

        TokenModel.ElGamal memory supplyDelta = TokenModel.ElGamal(
            supplyIncrease.cl_x,
            supplyIncrease.cl_y,
            supplyIncrease.cr_x,
            supplyIncrease.cr_y
        );
        TokenModel.ElGamal memory oldTotalSupply = _increasePrivateTotalSupply(supplyDelta);

        TokenEventLib.triggerTokenSupplyUpdatedEvent(_l2Event, address(this), msg.sender, oldTotalSupply, supplyDelta, TokenModel.ElGamal(0,0,0,0), _privateTotalSupply, _numberOfTotalSupplyChanges);

        TokenUtilsLib.addToken(_accounts, to, entity);
        TokenEventLib.triggerTokenMintedEvent(_l2Event, address(this), to, entity, msg.sender);
        TokenEventLib.triggerTokenActionCompletedEvent(_l2Event, address(this), msg.sender, entity.id);
        TokenEventLib.triggerRollupForMint(_l2Event, address(this), entity, publicInputs, proof, initialMinterAllowed.id, newAllowed.id, supplyIncrease.id);

        emit PrivateMint(to, entity.amount);
        return true;
    }

    function privateBurnBatch(uint256[] calldata tokenIds) external onlyAllowedBank nonReentrant virtual {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _privateBurn(msg.sender, tokenIds[i]);
        }
    }

    function _privateBurn(address account, uint256 tokenId) internal {
        require(tokenId != 0, "tokenId is zero");
        require(_accounts[account].assets[tokenId].id != 0, "token not exists");
        TokenModel.TokenEntity memory entity = _accounts[account].assets[tokenId];
        TokenModel.TokenEntity memory backupEntity = _accounts[account].assets[entity.rollbackTokenId];
        require(entity.id != 0, "invalid token");
        require(entity.tokenType == TokenModel.TokenType.burned, "This token cannot be used for other purposes");

        TokenModel.ElGamal memory supplyDecrease = _accounts[account].assets[tokenId].amount;
        TokenModel.ElGamal memory oldTotalSupply = _decreasePrivateTotalSupply(supplyDecrease);

        uint256[] memory tokenIds = new uint256[](1);
        tokenIds[0] = tokenId;
        TokenUtilsLib.removeTokens(_accounts, account, tokenIds);

        uint256[] memory rollbackTokenIds = new uint256[](1);
        rollbackTokenIds[0] = entity.rollbackTokenId;
        TokenUtilsLib.removeTokens(_accounts, account, rollbackTokenIds);

        TokenEventLib.triggerTokenSupplyUpdatedEvent(
            _l2Event,
            address(this),
            account,
            oldTotalSupply,
            TokenModel.ElGamal(0, 0, 0, 0),
            supplyDecrease,
            _privateTotalSupply,
            _numberOfTotalSupplyChanges
        );
        TokenEventLib.triggerTokenBurnedEvent(_l2Event, address(this), account, tokenId);

        TokenModel.GrumpkinPublicKey memory backupPk = _institutionRegistration.getUserInstGrumpkinPubKey(account);
        TokenModel.GrumpkinPublicKey memory toPk = _institutionRegistration.getUserInstGrumpkinPubKey(entity.to);
        RollupBurnEvent memory e = RollupBurnEvent({
            fromAddress: backupEntity.owner,
            toAddress: entity.to,
            toPk: toPk,
            backupPk: backupPk,
            toTokenId: tokenId,
            backupTokenId: backupEntity.id
        });
        TokenEventLib.triggerRollupForBurn(_l2Event, address(this), e);
        emit PrivateBurn(account, supplyDecrease);
    }

    function privateSplitToken(
        uint256[] memory consumedTokenIds,
        address from,
        address to,
        TokenModel.TokenEntity[] calldata newTokens,
        uint256[8] calldata proof,
        uint256[20] calldata publicInputs
    ) external onlyAllowedBank whenNotPaused notBlacklisted(msg.sender) notBlacklisted(to) nonReentrant virtual {

        address institutionAddress = _institutionRegistration.getUserManager(from);
        require(institutionAddress != address(0), "institution is not registered for user");
        require(_institutionRegistration.isInstitutionCaller(institutionAddress, msg.sender), "caller is not allowed for this institution");

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
        address sender = msg.sender;
        mapping(uint256 => TokenModel.TokenEntity) storage senderAssets = _accounts[sender].assets;
        TokenModel.GrumpkinPublicKey memory backupPk = _institutionRegistration.getUserInstGrumpkinPubKey(sender);
        uint256 length = tokenIds.length;

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            require(tokenId != 0, "PrivateERCToken: tokenId is zero");
            TokenModel.TokenEntity memory tokenEntity = senderAssets[tokenId];
            require(tokenEntity.id != 0, "invalid token");
            require(tokenEntity.tokenType == TokenModel.TokenType.transferred, "This token cannot be used for other purposes");

            uint256 rollbackTokenId = tokenEntity.rollbackTokenId;
            TokenModel.TokenEntity memory backupEntity = senderAssets[rollbackTokenId];

            delete senderAssets[rollbackTokenId];
            delete senderAssets[tokenId];

            uint256[] memory consumedTokens = new uint256[](2);
            consumedTokens[0] = tokenId;
            consumedTokens[1] = rollbackTokenId;

            TokenEventLib.triggerTokenDeletedEvent(_l2Event, address(this), sender, consumedTokens, 0);

            tokenEntity.rollbackTokenId = 0;
            tokenEntity.owner = tokenEntity.to;
            tokenEntity.status = TokenModel.TokenStatus.active;

            address recipient = tokenEntity.to;
            _accounts[recipient].assets[tokenId] = tokenEntity;

            TokenEventLib.triggerTokenReceivedEvent(_l2Event, address(this), recipient, tokenId, address(this), tokenEntity.status, tokenEntity.amount);
            TokenEventLib.triggerTokenActionCompletedEvent(_l2Event, address(this), sender, rollbackTokenId);
            TokenEventLib.triggerRollupForTransfer(_l2Event, address(this), sender, recipient, backupPk, backupEntity.id);

            emit PrivateTransfer(sender, recipient, tokenEntity.amount);
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
