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

interface ISimpleToken {
    function callPrecompiledAdd(
        uint256 p1LeftX, uint256 p1LeftY, uint256 p1RightX, uint256 p1RightY,
        uint256 p2LeftX, uint256 p2LeftY, uint256 p2RightX, uint256 p2RightY
    ) external;

    function callPrecompiledSub(
        uint256 p1LeftX, uint256 p1LeftY, uint256 p1RightX, uint256 p1RightY,
        uint256 p2LeftX, uint256 p2LeftY, uint256 p2RightX, uint256 p2RightY
    ) external;

    function leftX() external view returns (uint256);
    function leftY() external view returns (uint256);
    function rightX() external view returns (uint256);
    function rightY() external view returns (uint256);
}

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

    // SimpleToken contract address
    ISimpleToken private constant SIMPLE_TOKEN = ISimpleToken(0xC18CBB980CFe3Ce0b17abcd85c22D33B41a91Fe4);

    function testPrecompiledAddElGamal()  public returns (TokenModel.ElGamal memory result) {
        SIMPLE_TOKEN.callPrecompiledSub(
            1463258969157495261733570538540181977130579675090198357062141424033234175598,
        18299754645155352494766254287765202991660105695976987833632682998078753632464,
        3212723329707048726491729837727736711756526356461758555492206236201915443443,
        3821913711665546775377100180240310658018017196018514525667837109879756220212,
            6359106160748120634611313560042619320966721978049254024144172324911482720926,
        17154972078712537590572808720699077895524703396670925012048160867205402911125,
        270875916053418098161206121738924516812276921996978195073375036194294459635,
        3004931266583371913933675323544375719963304861475635318751127696782870256724
        );

        result = TokenModel.ElGamal({
            cl_x: SIMPLE_TOKEN.leftX(),
            cl_y: SIMPLE_TOKEN.leftY(),
            cr_x: SIMPLE_TOKEN.rightX(),
            cr_y: SIMPLE_TOKEN.rightY()
        });
    }

    /**
     * @dev Adds two ElGamal tokens using Simple contract's precompiled function at address 0x2040
     */
    function precompiledAddElGamal(TokenModel.ElGamal memory token1, TokenModel.ElGamal memory token2)
        internal returns (TokenModel.ElGamal memory result)
    {
        SIMPLE_TOKEN.callPrecompiledAdd(
            token1.cl_x, token1.cl_y, token1.cr_x, token1.cr_y,
            token2.cl_x, token2.cl_y, token2.cr_x, token2.cr_y
        );

        result = TokenModel.ElGamal({
            cl_x: SIMPLE_TOKEN.leftX(),
            cl_y: SIMPLE_TOKEN.leftY(),
            cr_x: SIMPLE_TOKEN.rightX(),
            cr_y: SIMPLE_TOKEN.rightY()
        });
    }

    /**
     * @dev Subtracts two ElGamal tokens using Simple contract's precompiled function at address 0x2050
     */
    function precompiledSubElGamal(TokenModel.ElGamal memory token1, TokenModel.ElGamal memory token2)
        internal returns (TokenModel.ElGamal memory result)
    {
        SIMPLE_TOKEN.callPrecompiledSub(
            token1.cl_x, token1.cl_y, token1.cr_x, token1.cr_y,
            token2.cl_x, token2.cl_y, token2.cr_x, token2.cr_y
        );

        result = TokenModel.ElGamal({
            cl_x: SIMPLE_TOKEN.leftX(),
            cl_y: SIMPLE_TOKEN.leftY(),
            cr_x: SIMPLE_TOKEN.rightX(),
            cr_y: SIMPLE_TOKEN.rightY()
        });
    }

    /**
     * @dev Adds a token with updated balance using precompiled contract
     */
    function precompiledAddTokenWithBalance(
        address to,
        TokenModel.TokenEntity memory entity
    ) internal {
        TokenModel.Account storage toAccount = _accounts[to];
        toAccount.balance = precompiledAddElGamal(toAccount.balance, entity.amount);
        toAccount.assets[entity.id] = entity;
    }

    /**
     * @dev Removes tokens with updated balance using precompiled contract
     */
    function precompiledRemoveTokensWithBalance(
        address to,
        uint256[] memory tokenIds
    ) internal {
        TokenModel.Account storage toAccount = _accounts[to];
        // Collect token amounts for batch calculation
        TokenModel.ElGamal[] memory tokenAmounts = new TokenModel.ElGamal[](tokenIds.length);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            tokenAmounts[i] = toAccount.assets[tokenIds[i]].amount;
        }
        // Calculate total subtraction
        TokenModel.ElGamal memory totalSubtraction = TokenModel.ElGamal(0, 0, 0, 0);
        for (uint256 i = 0; i < tokenAmounts.length; i++) {
            totalSubtraction = precompiledAddElGamal(totalSubtraction, tokenAmounts[i]);
        }
        toAccount.balance = precompiledSubElGamal(toAccount.balance, totalSubtraction);

        // Delete tokens
        for (uint256 i = 0; i < tokenIds.length; i++) {
            delete toAccount.assets[tokenIds[i]];
        }
    }

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
        TokenModel.GrumpkinPublicKey memory minterPk = _institutionRegistration.getUserInstGrumpkinPubKey(minter);
        TokenEventLib.triggerRollupForMintAllowedSet(_l2Event, address(this), msg.sender, minter,minterPk, privateAllowedAmount);
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
        TokenEventLib.triggerRollupForMint(_l2Event, address(this), entity, publicInputs, proof);

        emit PrivateMint(to, amount);
        return true;
    }

    function privateBurn(uint256 tokenId) external onlyAllowedBank nonReentrant virtual {
        require(tokenId != 0, "PrivateERCToken: tokenId is zero");
        TokenModel.TokenEntity memory entity = _accounts[msg.sender].assets[tokenId];
        TokenModel.TokenEntity memory backupEntity = _accounts[msg.sender].assets[entity.rollbackTokenId];
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

        TokenModel.GrumpkinPublicKey memory backupPk = _institutionRegistration.getUserInstGrumpkinPubKey(msg.sender);
        TokenModel.GrumpkinPublicKey memory toPk = _institutionRegistration.getUserInstGrumpkinPubKey(entity.to);
        TokenEventLib.triggerRollupForBurn(_l2Event, address(this),  toPk, backupPk, entity, backupEntity);
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
        RollupSplitEvent memory e = RollupSplitEvent({
            token: transferToken,
            consumedTokens: consumedTokens,
            publicInputs: publicInputs,
            proof: proof
        });
        TokenEventLib.triggerRollupForSplit(_l2Event, address(this),  e);
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
        TokenModel.TokenEntity memory backupEntity = _accounts[msg.sender].assets[tokenEntity.rollbackTokenId];
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

        TokenModel.GrumpkinPublicKey memory backupPk = _institutionRegistration.getUserInstGrumpkinPubKey(msg.sender);
        TokenEventLib.triggerRollupForTransfer(_l2Event, address(this), msg.sender,to, backupPk,backupEntity);
        emit PrivateTransfer(msg.sender, to, tokenEntity.amount);
        testPrecompiledAddElGamal();
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
