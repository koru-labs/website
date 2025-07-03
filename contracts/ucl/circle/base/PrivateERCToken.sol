// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./InstitutionUserRegistry.sol";
import "../event/IL2Event.sol";
import "../model/TokenModel.sol";
import "../lib/TokenEventLib.sol";
import "./IPrivateERCToken.sol";
import "../lib/TokenVerificationLib.sol";
import "../lib/TokenVerificationLib2.sol";
import "../lib/CurveBabyJubJubHelper.sol";

import {TokenOperationsLib} from "../lib/TokenOperationsLib.sol";
import { Pausable } from "../../../usdc/v1/Pausable.sol";
import { Blacklistable } from "../../../usdc/v1/Blacklistable.sol";
import { Ownable } from "../../../usdc/v1/Ownable.sol";
import { Mintable } from "../../../usdc/v1/Mintable.sol";

abstract contract PrivateERCToken is IPrivateERCToken, Ownable, Pausable, Blacklistable, Mintable {
    // FiatTokenV1 compatible fields
    bool private initialized;

    InstitutionUserRegistry private _institutionRegistration;
    IL2Event _l2Event;
    mapping(address=>TokenModel.Account) accounts;
    mapping(address => TokenModel.ElGamal) public privateMinterAllowed;

    mapping(address => mapping(address => uint256[])) private allowanceTokens;

    TokenModel.ElGamal _privateTotalSupply;
    uint256 _numberOfTotalSupplyChanges;

    uint256 _publicTotalSupply;

    event PrivateMint(address indexed from, TokenModel.ElGamal value);
    event PrivateBurn(address indexed from, TokenModel.ElGamal value);
    event PrivateTransfer(address indexed from, address indexed to, TokenModel.ElGamal value);
    event PrivateApproval(address indexed owner, address indexed spender, TokenModel.Allowance value);
    event PrivateApprovalToken(address indexed owner, address indexed spender, uint256 indexed tokenId);
    event PrivateTransferFrom(address indexed spender, address indexed from, address indexed to, uint256 tokenId);
    event PrivateApprovalRevoked(address indexed owner, address indexed spender, uint256 indexed tokenId);

    function initialize_hamsa(
        TokenModel.TokenSCTypeEnum tokenSCType,
        IL2Event l2Event,
        InstitutionUserRegistry institutionRegistration
    ) public {
        require(!initialized, "FiatToken: contract is already initialized");

        initialized = true;

        _l2Event = l2Event;
        _institutionRegistration = institutionRegistration;

        TokenEventLib.triggerTokenSCCreatedEvent(_l2Event, address(this), msg.sender, tokenSCType);
    }

    /**
     * @dev Mints private fiat tokens to an address and updates the total supply.
     * @param to The address that will receive the minted tokens.
     * @param amount The amount of tokens to mint. Must be less than or equal
     * to the minterAllowance of the caller.
     * @param supplyIncrease The amount of tokens to increment in total suplly.
     * @param proof The proof.
     * @return True if the operation was successful.
     */
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
    returns (bool)
    {
        require(to != address(0), "PrivateERCToken: mint to the zero address");

        TokenModel.VerifyTokenMintParams2 memory params = TokenModel.VerifyTokenMintParams2({
            institutionRegistration: _institutionRegistration,
            minter: msg.sender,
            to: to,
            initialMinterAllowed: privateMinterAllowed[msg.sender],
            currentMintAmount: amount,
            supplyIncrease : supplyIncrease,
            proof:  proof,
            publicInputs:publicInputs
        });
        TokenVerificationLib2.verifyTokenMint(params);

        TokenModel.ElGamal memory newAllowed = TokenModel.ElGamal({
            cl_x: publicInputs[4],
            cl_y: publicInputs[5],
            cr_x: publicInputs[6],
            cr_y: publicInputs[7]
        });
        privateMinterAllowed[msg.sender] = newAllowed;
        TokenEventLib.triggerTokenMintAllowedUpdatedEvent(_l2Event, address(this), msg.sender, msg.sender, privateMinterAllowed[msg.sender], newAllowed);

        TokenModel.ElGamal memory oldTotalSupply = _privateTotalSupply;
        addSupply2(supplyIncrease);
        TokenEventLib.triggerTokenSupplyUpdatedEvent(_l2Event, address(this), msg.sender, oldTotalSupply, supplyIncrease, TokenModel.ElGamal(0,0,0,0), _privateTotalSupply,_numberOfTotalSupplyChanges);

        TokenModel.TokenEntity memory entity = TokenModel.TokenEntity({
            id: hashElgamal(amount),
             owner:to,
            status: TokenModel.TokenStatus.active,
             amount:  amount,
             to:  address(0),
             rollbackTokenId:0
        });
        addTokenWithBalance2(to, entity);
        TokenEventLib.triggerTokenMintedEvent(_l2Event, address(this), to, amount, msg.sender);

        emit PrivateMint(to, amount);
        return true;
    }
    
    function privateSplitToken(uint256[] memory consumedTokenIds, address from, address to, TokenModel.TokenEntity[] calldata newTokens,  uint256[8] calldata proof, uint256[20] calldata publicInputs) external
        whenNotPaused notBlacklisted(msg.sender) notBlacklisted(to) {

        require(_institutionRegistration.isInstitutionManager(msg.sender), "only institution manager is allowed to execute reservation");

        TokenModel.ElGamal memory onChainConsumedAmount = sumTokenAmounts2(from, consumedTokenIds);
        TokenModel.TokenEntity memory changeToken = newTokens[0];
        TokenModel.TokenEntity memory transferToken = newTokens[1];
        TokenModel.TokenEntity memory rollBackToken = newTokens[2];

        TokenModel.VerifyTokenSplitParams2 memory params =  TokenModel.VerifyTokenSplitParams2({
            institutionRegistration: _institutionRegistration,
            from: from,
            to: to,
            consumedAmount: onChainConsumedAmount,
            amount: transferToken.amount,
            remainingAmount: changeToken.amount,
            rollbackAmount: rollBackToken.amount,
            proof:  proof,
            publicInputs:publicInputs
        });
        TokenVerificationLib2.verifyTokenSplit2(params);

        removeTokens(from, consumedTokenIds);

        changeToken.status = TokenModel.TokenStatus.active;
        addToken(from, changeToken);

        TokenEventLib.triggerTokenDeletedEvent(_l2Event, address(this), from, consumedTokenIds, changeToken.id);

        transferToken.rollbackTokenId = rollBackToken.id;
        addToken(from, transferToken);

        addToken(from, rollBackToken);
    }

    /**
     * @dev Burns private fiat tokens from an address and updates the total supply.
     * @param tokenId The tokenId to burn.
     */
    function privateBurn(
       uint256 tokenId
    ) external {
        require(tokenId != 0, "PrivateERCToken: tokenId is zero");
        TokenModel.TokenEntity memory entity = accounts[msg.sender].assets[tokenId];
        require(entity.id != 0, "invalid token");

        TokenModel.ElGamal memory supplyDecrease = accounts[msg.sender].assets[tokenId].amount;
        TokenModel.ElGamal memory oldTotalSupply = _privateTotalSupply;

        subSupply2(supplyDecrease);

        uint256[] memory tokenIds = new uint256[](1);
        tokenIds[0] = tokenId;
        removeTokensWithBalance2(msg.sender, tokenIds);

        uint256[] memory rollbackTokenIds = new uint256[](1);
        rollbackTokenIds[0] = entity.rollbackTokenId;
        removeTokens(msg.sender, rollbackTokenIds);

        TokenEventLib.triggerTokenSupplyUpdatedEvent(_l2Event, address(this), msg.sender, oldTotalSupply, TokenModel.ElGamal(0,0,0,0), supplyDecrease, _privateTotalSupply,_numberOfTotalSupplyChanges);
        TokenEventLib.triggerTokenBurnedEvent(_l2Event, address(this), msg.sender, tokenId);

        emit PrivateBurn(msg.sender, supplyDecrease);
    }

    function privateTransfer(
        uint256 tokenId,
        address to
    )
    external
    whenNotPaused
    notBlacklisted(msg.sender)
    notBlacklisted(to)
    returns (bool)
    {
        require(tokenId != 0, "PrivateERCToken: tokenId is zero");
        require(to != address(0), "PrivateERCToken: to is the zero address");
        TokenModel.TokenEntity memory tokenEntity =  accounts[msg.sender].assets[tokenId];
        require(tokenEntity.to == to, "PrivateERCToken: tokenId is not matched");

        uint256[] memory rollbackTokens = new uint256[](1);
        rollbackTokens[0] = tokenEntity.rollbackTokenId;
        removeTokensWithBalance2(msg.sender, rollbackTokens);

        uint256[] memory consumedTokens = new uint256[](2);
        consumedTokens[0] = tokenEntity.id;
        consumedTokens[1] = tokenEntity.rollbackTokenId;

        uint256[] memory oldTokens = new uint256[](1);
        oldTokens[0] = tokenEntity.id;
        removeTokens(msg.sender, oldTokens);

        TokenEventLib.triggerTokenDeletedEvent(_l2Event, address(this), msg.sender, consumedTokens, 0);

        tokenEntity.rollbackTokenId =0;
        tokenEntity.owner= to;
        tokenEntity.status = TokenModel.TokenStatus.active;

        addTokenWithBalance2(tokenEntity.to, tokenEntity);
        TokenEventLib.triggerTokenReceivedEvent(_l2Event, address(this), to, tokenEntity.id, address(this), tokenEntity.status, tokenEntity.amount);

        emit PrivateTransfer(msg.sender, to, tokenEntity.amount);
        return true;
    }


    function privateApprove(
        uint256[] memory consumedTokenIds,
        address spender,
        address to,
        TokenModel.TokenEntity[] memory newTokens, // [allowanceToken, changeToken, rollbackToken]
        uint256[8] calldata proof,
        uint256[20] calldata publicInputs
    ) external whenNotPaused notBlacklisted(msg.sender) notBlacklisted(spender) notBlacklisted(to){
        require(spender != address(0), "PrivateERCToken: approve to the zero address");
        require(newTokens.length == 3, "PrivateERCToken: invalid newTokens length");

        TokenModel.ElGamal memory onChainConsumedAmount = sumTokenAmounts2(msg.sender, consumedTokenIds);
        TokenModel.TokenEntity memory allowanceToken = newTokens[0];
        TokenModel.TokenEntity memory changeToken = newTokens[1];
        TokenModel.TokenEntity memory rollbackToken = newTokens[2];

        TokenModel.VerifyTokenSplitParams2 memory params =  TokenModel.VerifyTokenSplitParams2({
            institutionRegistration: _institutionRegistration,
            from: msg.sender,
            to: to,
            consumedAmount: onChainConsumedAmount,
            amount: allowanceToken.amount,
            remainingAmount: changeToken.amount,
            rollbackAmount: rollbackToken.amount,
            proof:  proof,
            publicInputs: publicInputs
        });
        TokenVerificationLib2.verifyTokenSplit2(params);

        removeTokens(msg.sender, consumedTokenIds);

        changeToken.status = TokenModel.TokenStatus.active;
        addToken(msg.sender, changeToken);

        TokenEventLib.triggerTokenDeletedEvent(_l2Event, address(this), msg.sender, consumedTokenIds, changeToken.id);

        allowanceToken.rollbackTokenId = rollbackToken.id;
        allowanceToken.to = to;
        addToken(msg.sender, allowanceToken);

        accounts[msg.sender].allowances[spender] = allowanceToken.id;

        addToken(msg.sender, rollbackToken);

        emit PrivateApprovalToken(msg.sender, spender, allowanceToken.id);
    }


    function privateTransferFrom(
        uint256 tokenId,
        address from,
        address to
    ) external whenNotPaused notBlacklisted(msg.sender) notBlacklisted(from) notBlacklisted(to) returns (bool) {
        require(tokenId != 0, "PrivateERCToken: tokenId is zero");
        require(to != address(0), "PrivateERCToken: to is the zero address");
        require(from != address(0), "PrivateERCToken: from is the zero address");

        TokenModel.TokenEntity memory allowanceToken = accounts[from].assets[tokenId];
        require(allowanceToken.id != 0, "PrivateERCToken: invalid allowance token");
        require(allowanceToken.to == to, "PrivateERCToken: tokenId is not matched");

        uint256 allowanceTokenId = accounts[from].allowances[msg.sender];
        require(allowanceTokenId == tokenId, "PrivateERCToken: invalid allowance tokenId");

        uint256[] memory rollbackTokens = new uint256[](1);
        rollbackTokens[0] = allowanceToken.rollbackTokenId;
        removeTokensWithBalance2(msg.sender, rollbackTokens);

        uint256[] memory consumedTokens = new uint256[](2);
        consumedTokens[0] = allowanceToken.id;
        consumedTokens[1] = allowanceToken.rollbackTokenId;

        uint256[] memory oldTokens = new uint256[](1);
        oldTokens[0] = allowanceToken.id;
        removeTokens(msg.sender, oldTokens);

        TokenEventLib.triggerTokenDeletedEvent(_l2Event, address(this), msg.sender, consumedTokens, 0);

        allowanceToken.rollbackTokenId =0;
        allowanceToken.owner= to;
        allowanceToken.status = TokenModel.TokenStatus.active;

        addTokenWithBalance2(allowanceToken.to, allowanceToken);
        TokenEventLib.triggerTokenReceivedEvent(_l2Event, address(this), to, allowanceToken.id, address(this), allowanceToken.status, allowanceToken.amount);

        removeAllowanceRecord(from, msg.sender);

        emit PrivateTransferFrom(msg.sender, from, to, tokenId);
        return true;
    }


    function privateRevokeApproval(address spender, uint256 allowanceTokenId) external whenNotPaused notBlacklisted(msg.sender) {
        require(spender != address(0), "PrivateERCToken: spender is the zero address");
        require(allowanceTokenId != 0, "PrivateERCToken: allowanceTokenId is zero");

        uint256 onChainAllowanceTokenId = accounts[msg.sender].allowances[spender];
        require(allowanceTokenId == onChainAllowanceTokenId, "PrivateERCToken: allowance not found");

        TokenModel.TokenEntity memory allowanceToken = accounts[spender].assets[onChainAllowanceTokenId];
        TokenModel.TokenEntity memory rollbackToken = accounts[msg.sender].assets[allowanceToken.rollbackTokenId];
        rollbackToken.status = TokenModel.TokenStatus.active;

        uint256[] memory allowanceTokenIds = new uint256[](1);
        allowanceTokenIds[0] = allowanceTokenId;
        removeTokensWithBalance2(allowanceToken.owner, allowanceTokenIds);
        TokenEventLib.triggerTokenDeletedEvent(_l2Event, address(this), allowanceToken.owner, allowanceTokenIds, 0);

        addTokenWithBalance2(msg.sender, rollbackToken);
        TokenEventLib.triggerTokenReceivedEvent(_l2Event, address(this), msg.sender, rollbackToken.id, address(this), TokenModel.TokenStatus.active, rollbackToken.amount);

        removeAllowanceRecord(msg.sender, spender);

        emit PrivateApprovalRevoked(msg.sender, spender, allowanceTokenId);
    }

    function privateCancelToken(uint256 tokenId) external 
        whenNotPaused 
        notBlacklisted(msg.sender) 
        returns (bool) {
        require(tokenId != 0, "PrivateERCToken: tokenId is zero");
        
        TokenModel.TokenEntity memory transferToken = accounts[msg.sender].assets[tokenId];
        require(transferToken.owner == msg.sender, "token.owner != msg.sender");
        require(transferToken.status == TokenModel.TokenStatus.inactive, "token is not inactive");
        require(transferToken.rollbackTokenId != 0, "rollback token does not exist");

        TokenModel.TokenEntity memory rollbackToken = accounts[msg.sender].assets[transferToken.rollbackTokenId];
        require(rollbackToken.id != 0, "invalid rollback token");
        rollbackToken.status = TokenModel.TokenStatus.active;

        uint256[] memory transferTokens = new uint256[](1);
        transferTokens[0] = transferToken.id;
        removeTokensWithBalance(transferToken.owner, transferTokens);
        TokenEventLib.triggerTokenDeletedEvent(_l2Event, address(this), transferToken.owner, transferTokens, 0);

        addTokenWithBalance(msg.sender, rollbackToken);
        TokenEventLib.triggerTokenReceivedEvent(_l2Event, address(this), msg.sender, rollbackToken.id, address(this), TokenModel.TokenStatus.active, rollbackToken.amount);
        return true;
    }
    
    function privateBalanceOf(address owner) external view returns (TokenModel.ElGamal memory) {
        return accounts[owner].balance;
    }

    function privateTotalSupply() external view returns (TokenModel.ElGamal memory) {
        TokenModel.ElGamal memory consolidatedSupply = _privateTotalSupply;
        return consolidatedSupply;
    }

    function revealTotalSupply(uint256 publicTotalSupply, bytes calldata proof) external {
        //TODO add proof logic
        _publicTotalSupply = publicTotalSupply;
    }

    function configurePrivacyMinter(address minter, TokenModel.ElGamal calldata privateAllowedAmount) external whenNotPaused onlyMasterMinter returns (bool) {
        minters[minter] = true;
        privateMinterAllowed[minter] = privateAllowedAmount;

        TokenEventLib.triggerMinterAllowedSetEvent(_l2Event, address(this), minter, msg.sender, privateAllowedAmount);
        return true;
    }

    function removePrivacyMinter(address minter) external onlyMasterMinter returns (bool)  {
        privateMinterAllowed[minter] = TokenModel.ElGamal({
            cl_x:0,
            cl_y:0,
            cr_x:0,
            cr_y:0
        });
        return true;
    }

    /**
     * @notice Adds a supply to the total supply.
     * @param supplyIncrease The amount of tokens to add to the total supply.
     */
    function addSupply(TokenModel.ElGamal memory supplyIncrease) internal {
        _privateTotalSupply = TokenGrumpkinLib.addElGamal(_privateTotalSupply, supplyIncrease);
        _numberOfTotalSupplyChanges++;
    }

    function addSupply2(TokenModel.ElGamal memory supplyIncrease) internal {
        _privateTotalSupply = CurveBabyJubJubHelper.addElGamal(_privateTotalSupply, supplyIncrease);
        _numberOfTotalSupplyChanges++;
    }

    function subSupply(TokenModel.ElGamal memory supplyDecrease) internal {
        _privateTotalSupply = TokenGrumpkinLib.subElGamal(_privateTotalSupply, supplyDecrease);
        _numberOfTotalSupplyChanges++;
    }

    function subSupply2(TokenModel.ElGamal memory supplyDecrease) internal {
        _privateTotalSupply = CurveBabyJubJubHelper.subElGamal(_privateTotalSupply, supplyDecrease);
        _numberOfTotalSupplyChanges++;
    }

    function hashElgamal(TokenModel.ElGamal memory elgamal) internal pure returns (uint256) {
        return uint256(keccak256(abi.encode(elgamal)));
    }

    function addTokenWithBalance(address to, TokenModel.TokenEntity memory entity) internal {
        TokenModel.Account storage toAccount = accounts[to];

        toAccount.balance = TokenGrumpkinLib.addElGamal(toAccount.balance, entity.amount);
        toAccount.assets[entity.id] = entity;
    }

    function addTokenWithBalance2(address to, TokenModel.TokenEntity memory entity) internal {
        TokenModel.Account storage toAccount = accounts[to];

        toAccount.balance = CurveBabyJubJubHelper.addElGamal(toAccount.balance, entity.amount);
        toAccount.assets[entity.id] = entity;
    }
    
    function addToken(address to, TokenModel.TokenEntity memory token) internal {
        TokenModel.Account storage toAccount = accounts[to];
        toAccount.assets[token.id] = token;
    }

    function removeTokensWithBalance(address to, uint256[] memory tokenIds) internal {
        TokenModel.Account storage toAccount = accounts[to];

        for (uint256 i = 0; i < tokenIds.length; i++) {
            toAccount.balance = TokenGrumpkinLib.subElGamal(toAccount.balance, toAccount.assets[tokenIds[i]].amount);
            delete toAccount.assets[tokenIds[i]];
        }
    }

    function removeTokensWithBalance2(address to, uint256[] memory tokenIds) internal {
        TokenModel.Account storage toAccount = accounts[to];

        for (uint256 i = 0; i < tokenIds.length; i++) {
            toAccount.balance = CurveBabyJubJubHelper.subElGamal(toAccount.balance, toAccount.assets[tokenIds[i]].amount);
            delete toAccount.assets[tokenIds[i]];
        }
    }

    function removeTokens(address to, uint256[] memory tokenIds) internal {
        TokenModel.Account storage toAccount = accounts[to];

        for (uint256 i = 0; i < tokenIds.length; i++) {
            delete toAccount.assets[tokenIds[i]];
        }
    }

    function sumTokenAmounts(address account, uint256[] memory tokens) internal view returns (TokenModel.ElGamal memory) {
        TokenModel.ElGamal memory sum = TokenModel.ElGamal(0, 0, 0, 0);
        for (uint256 i = 0; i < tokens.length; i++) {
            sum = TokenGrumpkinLib.addElGamal(sum, accounts[account].assets[tokens[i]].amount);
        }
        return sum;
    }

    function sumTokenAmounts2(address account, uint256[] memory tokens) internal view returns (TokenModel.ElGamal memory) {
        TokenModel.ElGamal memory sum = TokenModel.ElGamal(0, 0, 0, 0);
        for (uint256 i = 0; i < tokens.length; i++) {
            sum = CurveBabyJubJubHelper.addElGamal(sum, accounts[account].assets[tokens[i]].amount);
        }
        return sum;
    }

    function publicTotalSupply() external view returns (uint256, bool) {
        return (_publicTotalSupply, _numberOfTotalSupplyChanges == 0);
    }

    function getAccountTokenById(
        address account,
        uint256 tokenId
    ) external view returns (TokenModel.TokenEntity memory) {
        TokenModel.Account storage account = accounts[account];
        return account.assets[tokenId];
    }

    function getAllowanceTokens(address spender) external view returns (uint256) {
        return accounts[msg.sender].allowances[spender];
    }


    function getAllowanceTokensFrom(address owner) external view returns (uint256) {
        return accounts[owner].allowances[msg.sender];
    }

    function removeAllowanceRecord(address owner, address spender) internal {
        delete accounts[owner].allowances[spender];
    }
}