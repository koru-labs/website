// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./InstitutionRegistration.sol";
import "../event/IL2Event.sol";
import "../model/TokenModel.sol";
import "../lib/TokenEventLib.sol";
import "./IPrivateERCToken.sol";
import "../lib/TokenVerificationLib.sol";
import {TokenOperationsLib} from "../lib/TokenOperationsLib.sol";


import { Pausable } from "../../../usdc/v1/Pausable.sol";
import { Blacklistable } from "../../../usdc/v1/Blacklistable.sol";
import { Ownable } from "../../../usdc/v1/Ownable.sol";
import { Mintable } from "../../../usdc/v1/Mintable.sol";

//TODO read me then delete me.
// This contract is very big and have too many functions in the same place. (bad code quality)
// Why do we need 2 different representations of the token id, one with bytes32 and other with uint256? This duallity is requiring a bunch of code duplication (bad code quality)
// Please never name a function as something and something2 !! Functions names have a purpose, they are meant to give the reader a clear idea of what the function does. readability is key for good code quality.
// Please adopt standards and be consistent. Some state variables names are starting with _ and others are not. Pick one and be consistent.
// Please before creating a new function, check if it already exists and if it does, try to reuse it. Code duplication is bad code quality.
// Please avoid using magic numbers. Use constants instead.
// please avoid creating variables that are not used, that lowers readability and is a sign of bad code quality.
// I suggest using VSCode plugin "Prettier - Code Formatter" to automatically format the code in a consistent way.
// I suggest using VSCode plugin "Todo Tree" to manage TODOs.
abstract contract PrivateERCToken is IPrivateERCToken, Ownable, Pausable, Blacklistable, Mintable {
    // FiatTokenV1 compatible fields
    bool private initialized;

    InstitutionRegistration private _institutionRegistration;
    IL2Event _l2Event;
    mapping(address=>TokenModel.Account) accounts;
    mapping(address => TokenModel.ElGamal) public privateMinterAllowed;

    TokenModel.ElGamal _privateTotalSupply;
    uint256 _publicTotalSupply;
    uint256 _numberOfTotalSupplyChanges;

    event PrivateMint(address indexed from, TokenModel.ElGamal value);
    event PrivateBurn(address indexed from, TokenModel.ElGamal value);
    event PrivateTransfer(address indexed from, address indexed to, TokenModel.ElGamal value);
    event PrivateApproval(address indexed owner, address indexed spender, TokenModel.Allowance value);

    // Compatible with FiatTokenV1 contracts
    function initialize_hamsa(
        TokenModel.TokenSCTypeEnum tokenSCType,
        IL2Event l2Event,
        InstitutionRegistration institutionRegistration
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
        bytes calldata proof
    )
    external
    whenNotPaused
    onlyMinters
    notBlacklisted(msg.sender)
    notBlacklisted(to)
    returns (bool)
    {
        require(to != address(0), "PrivateERCToken: mint to the zero address");

        TokenModel.VerifyTokenMintParams memory params = TokenModel.VerifyTokenMintParams({
            institutionRegistration: _institutionRegistration,
            minter: msg.sender,
            to: to,
            initialMinterAllowed: privateMinterAllowed[msg.sender],
            currentMintAmount: amount,
            supplyIncrease : supplyIncrease,
            proof:  proof
        });
        (bool isValid, uint result, uint256[] memory znValues) = TokenVerificationLib.verifyTokenMint(params); // TODO please read https://docs.soliditylang.org/en/latest/control-structures.html#assignment and avoid unused variables.
        require(isValid, "PrivateERCToken: invalid proof");

        TokenModel.ElGamal memory newAllowed = TokenModel.ElGamal({
            cl_x: znValues[4], //TODO MAGIC NUMBERS
            cl_y: znValues[5], //TODO MAGIC NUMBERS
            cr_x: znValues[6], //TODO MAGIC NUMBERS
            cr_y: znValues[7] //TODO MAGIC NUMBERS
        });
        privateMinterAllowed[msg.sender] = newAllowed;
        TokenEventLib.triggerTokenMintAllowedUpdatedEvent(_l2Event, address(this), msg.sender, msg.sender, privateMinterAllowed[msg.sender], newAllowed);

        TokenModel.ElGamal memory oldTotalSupply = _privateTotalSupply;
        addSupply(supplyIncrease);
        TokenEventLib.triggerTokenSupplyUpdatedEvent(_l2Event, address(this), msg.sender, oldTotalSupply, supplyIncrease, TokenModel.ElGamal(0,0,0,0), _privateTotalSupply,_numberOfTotalSupplyChanges);

        TokenModel.TokenEntity memory entity = TokenModel.TokenEntity({
            id: hashElgamal2(amount),
             owner:to,
            status: TokenModel.TokenStatus.active,
             amount:  amount,
             to:  address(0),
             rollbackTokenId:0
        });
        addTokenWithBalance2(to, entity);
        TokenEventLib.triggerTokenMintedEvent(_l2Event, address(this), to, amount);

        emit PrivateMint(to, amount);
        return true;
    }


    function privateReserveToken(uint256[] memory consumedAmount, address from, address to, TokenModel.TokenEntity[] calldata newTokens, bytes calldata proof) external
        whenNotPaused notBlacklisted(msg.sender) notBlacklisted(to) {

        require(_institutionRegistration.getInstitution(msg.sender).managerAddress != address (0), "only institution manager is allowed to execute reservation");

        TokenModel.ElGamal memory onChainConsumedAmount = sumTokens2(msg.sender, consumedAmount);
        TokenModel.TokenEntity memory changeToken = newTokens[0];
        TokenModel.TokenEntity memory transferToken = newTokens[1]; //TODO MAGIC NUMBERS
        TokenModel.TokenEntity memory rollBackToken = newTokens[2]; //TODO MAGIC NUMBERS

        TokenModel.VerifyTokenSplitParams memory params =  TokenModel.VerifyTokenSplitParams({
            institutionRegistration: _institutionRegistration,
            from: from,
            to: to,
            consumedAmount: onChainConsumedAmount,
            amount: transferToken.amount,
            remainingAmount: changeToken.amount,
            rollbackAmount: rollBackToken.amount,
            proof: proof
        });
        (bool isValid, uint result, uint256[] memory znValues) = TokenVerificationLib.verifyTokenSplit(params); // TODO please read https://docs.soliditylang.org/en/latest/control-structures.html#assignment and avoid unused variables.
        require(isValid, "failed to validate generated tokens");

        removeTokensWoChangeBalance2(from, consumedAmount);

        changeToken.status = TokenModel.TokenStatus.active;
        addToken2(from, changeToken);

        TokenEventLib.triggerTokenDeletedEvent2(_l2Event, address(this), from, consumedAmount, changeToken.id);

        transferToken.rollbackTokenId = rollBackToken.id;
        addToken2(from, transferToken);

        addToken2(from, rollBackToken);
    }

    /**
     * @dev Burns private fiat tokens from an address and updates the total supply.
     * @param tokenId The tokenId to burn.
     */
    function privateBurn(
       uint256 tokenId
    ) external {
        require(tokenId != 0, "PrivateERCToken: tokenId is zero");
        require(accounts[msg.sender].reservations[tokenId].id != 0, "invalid token");

        TokenModel.ElGamal memory supplyDecrease = accounts[msg.sender].reservations[tokenId].amount;
        TokenModel.ElGamal memory oldTotalSupply = _privateTotalSupply;

        subSupply( supplyDecrease);
        removeTokenWithBalance(msg.sender, tokenId);

        TokenEventLib.triggerTokenSupplyUpdatedEvent(_l2Event, address(this), msg.sender, oldTotalSupply, TokenModel.ElGamal(0,0,0,0), supplyDecrease, _privateTotalSupply,_numberOfTotalSupplyChanges);
        TokenEventLib.triggerTokenBurnedEvent(_l2Event, address(this), msg.sender, tokenId);

        emit PrivateBurn(msg.sender, supplyDecrease);
    }

    // for debug
    //TODO debug functions should be inside testing code base, not inside the main code base. By the way, this function could be replaced by the tokenExists function below with the same functionality. That function can stay inside the main code base, because it makes sense.
    function getAccountToken(
        address account,
        TokenModel.ElGamal memory amount
    ) external view returns (TokenModel.ElGamal memory) {
        bytes32 tokenId = hashElgamal(amount);
        TokenModel.Account storage account2 = accounts[account];
        return account2.assets[tokenId];
    }

    function getAccountTokenById(
        address account,
        uint256 tokenId
    ) external view returns (TokenModel.TokenEntity memory) {
        TokenModel.Account storage account2 = accounts[account];
        return account2.reservations[tokenId];
    }

    //TODO use this function in your tests, instead of the function above.
    function tokenExists(address account, TokenModel.ElGamal memory amount) external view returns (bool) {
        TokenModel.ElGamal memory token = accounts[account].assets[hashElgamal(amount)];
        return isEqualElGamal(token, amount);
    }

    // for debug
    //TODO debug functions should be inside testing code base, not inside the main code base. We have a proper function that does exactly the same thing, its name is privateAllowance.
    //TODO remove this function and use privateAllowance in your tests!
    function getAccountAllowance(address account, address spender) external view returns (TokenModel.Allowance memory) {
        TokenModel.Account storage account2 = accounts[account];
        return account2.allowances[spender];
    }

    /**
     * @notice Adds a supply to the total supply.
     * @param supplyIncrease The amount of tokens to add to the total supply.
     */
    function addSupply(TokenModel.ElGamal memory supplyIncrease) internal {
        _privateTotalSupply = TokenGrumpkinLib.addElGamal(_privateTotalSupply, supplyIncrease);
        _numberOfTotalSupplyChanges++;
    }

    function subSupply(TokenModel.ElGamal memory supplyDecrease) internal {
        _privateTotalSupply = TokenGrumpkinLib.subElGamal(_privateTotalSupply, supplyDecrease);
        _numberOfTotalSupplyChanges++;
    }

    function hashElgamal(TokenModel.ElGamal memory elgamal) internal pure returns (bytes32) {
        return keccak256(abi.encode(elgamal));
    }

    function hashElgamal2(TokenModel.ElGamal memory elgamal) internal pure returns (uint256) {
        return uint256(keccak256(abi.encode(elgamal)));
    }

    function privateBalanceOf(address owner) external view returns (TokenModel.ElGamal memory) {
        return accounts[owner].balance;
    }



    /**
     * @dev Approves a private `value` amount of tokens to be spent by `spender` from the caller's account.
     *
     * Emits a {PrivateApproval} event.
     * @param consumedTokens The tokens that will be consumed.
     * @param spender The address that will be approved to spend the tokens.
     * @param allowance The allowance to be approved.
     * @param consumedTokensRemainingAmount The remaining amount from the tokens that will be consumed.
     * @param proof The proof.
     */
    function privateApprove(
        bytes32[] memory consumedTokens,
        address spender,
        TokenModel.Allowance memory allowance,
        TokenModel.ElGamal memory consumedTokensRemainingAmount,
        bytes calldata proof
    ) external {
        require(consumedTokens.length > 0, "PrivateERCToken: consumedTokens is empty");
        require(isNotZeroElGamal(consumedTokensRemainingAmount),"PrivateERCToken: consumedTokensRemainingAmount is zero");
        require(isNotZeroAllowance(allowance),  "PrivateERCToken: allowance is zero");
        require(existsAll(msg.sender, consumedTokens),  "PrivateERCToken: consumedTokens does not exist");
        TokenModel.ElGamal memory consumedAmount = sumTokens(msg.sender, consumedTokens);

        TokenModel.VerifyTokenApproveParams memory params = TokenModel.VerifyTokenApproveParams({
            institutionRegistration: _institutionRegistration,
            owner: msg.sender,
            spender: spender,
            consumedAmount: consumedAmount,
            allowance: allowance,
            remainingAmount: consumedTokensRemainingAmount,
            proof:  proof
        });
        (bool isValid, uint result, uint256[] memory znValues) = TokenVerificationLib.verifyTokenApprove(params);
        require(isValid, "PrivateERCToken: invalid proof");

        TokenModel.Allowance memory oldAllowance = getAllowance(msg.sender,spender);

        removeTokensWoChangeBalance(msg.sender, consumedTokens);
        returnUnspentAllowance(msg.sender, spender);
        addToken(msg.sender, consumedTokensRemainingAmount);
        addAllowance(msg.sender,spender, allowance);

        TokenModel.Allowance memory newAllowance = getAllowance(msg.sender,spender);

        TokenEventLib.triggerTokenDeletedEvent(_l2Event, address(this), msg.sender, consumedTokens, consumedTokensRemainingAmount);
        TokenEventLib.triggerAllowanceCreatedEvent(_l2Event, address(this), msg.sender,spender, allowance, oldAllowance, newAllowance);
        TokenEventLib.triggerAllowanceReceivedEvent(_l2Event, address(this), spender, msg.sender, allowance);

        emit PrivateApproval(msg.sender, spender, allowance);
    }
    // TODO review this function
    // Dear powerfull programmer, if an allowance is not not zero, so it is zero, and we can return instead of a new recently created zero allowance.
    // There is a function named privateAllowance that can be used instead of this function.
    // this is a duplicated code.
    function getAllowance(address accountAddress, address spender) internal view returns (TokenModel.Allowance memory) {
        TokenModel.Account storage account = accounts[accountAddress];
        TokenModel.Allowance memory allowance = account.allowances[spender];
        if (!isNotZeroAllowance(allowance)) {
            return TokenModel.Allowance(0, 0, 0, 0, 0, 0);
        }
        return allowance;
    }

    function addAllowance(address accountAddress,address spender, TokenModel.Allowance memory allowance) internal {
        TokenModel.Account storage account = accounts[accountAddress];
        account.allowances[spender] = allowance;
    }

    /**
     * @dev Moves a private `value` amount of tokens from `from` to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.

     to do:  need to consider the scenario that the owner and spender belong to two banks.
      // whenever allowance is spent, we need to update allowance and rollback at both side

     *
     *
     *
     * Emits a {PrivateTransferFrom} event.
     * @param from The address that will transfer the tokens.
     * @param newAllowance The allowance after the transfer.
     * @param to The address that will receive the transferred tokens.
     * @param value The amount of tokens to transfer.
     * @param proof The proof.
     * @return True if the operation was successful.
     */
    function privateTransferFrom(
        address from,
        TokenModel.Allowance memory newAllowance,
        address to,
        TokenModel.ElGamal memory value,
        bytes calldata proof
    ) external returns (bool) {
        require(from != address(0), "PrivateERCToken: transfer from the zero address");
        require(to != address(0), "PrivateERCToken: transfer to the zero address");
        require(isNotZeroElGamal(value), "PrivateERCToken: transfer zero value");
        require(existsAllowance(from, msg.sender), "PrivateERCToken: allowance does not exist");

        TokenModel.Allowance memory oldAllowance = getAllowance(from,msg.sender);
        require(isNotZeroAllowance(oldAllowance), "PrivateERCToken: zero allowance");

        TokenModel.VerifyTokenTransferFromParams memory params = TokenModel.VerifyTokenTransferFromParams({
            institutionRegistration: _institutionRegistration,
            owner: from,
            spender: msg.sender,
            receiver: to,
            oldAllowance: oldAllowance,
            newAllowance: newAllowance,
            amount: value,
            proof: proof
        });

        (bool isValid, uint result, uint256[] memory znValues) = TokenVerificationLib.verifyTokenTransferFrom(params); // TODO please read https://docs.soliditylang.org/en/latest/control-structures.html#assignment and avoid unused variables.
        require(isValid, "PrivateERCToken: invalid proof");

        addBalance(to, value);

        TokenModel.ElGamal memory oldRollbackAmount = backupAmount(oldAllowance);
        TokenModel.ElGamal memory newRollbackAmount = backupAmount(newAllowance);
        TokenModel.ElGamal memory spentAmount = TokenGrumpkinLib.subElGamal(oldRollbackAmount, newRollbackAmount);
        removeBalance(from, spentAmount);

        accounts[from].allowances[msg.sender] = newAllowance;

        TokenEventLib.triggerAllowanceUpdatedEvent(
            _l2Event,
            address(this),
            from,
            oldAllowance,
            TokenModel.ElGamal(0, 0, 0, 0),
            spentAmount,
            newAllowance,
            msg.sender
        );
        TokenEventLib.triggerTokenReceivedEvent(_l2Event, address(this), to, value, msg.sender);

        emit PrivateTransfer(from, to, value);
        return true;
    }

    function removeBalance(address to, TokenModel.ElGamal memory amount) internal {
        accounts[to].balance = TokenGrumpkinLib.subElGamal(accounts[to].balance, amount);
        delete accounts[to].assets[hashElgamal(amount)];
    }

    function backupAmount(TokenModel.Allowance memory allowance) internal pure returns (TokenModel.ElGamal memory) {
        return TokenModel.ElGamal({cl_x: allowance.cl_x, cl_y: allowance.cl_y, cr_x: allowance.cr2_x, cr_y: allowance.cr2_y});
    }

    function addBalance(address to, TokenModel.ElGamal memory amount) internal {
        accounts[to].balance = TokenGrumpkinLib.addElGamal(accounts[to].balance, amount);
        accounts[to].assets[hashElgamal(amount)] = amount;
    }

    function returnUnspentAllowance(address accountAddress,  address spender) internal {
        TokenModel.Account storage account = accounts[accountAddress];
        TokenModel.Allowance memory allowance = account.allowances[spender];
        if(isNotZeroAllowance(allowance)){
            TokenModel.ElGamal memory token = TokenModel.ElGamal({
                cl_x: allowance.cl_x,
                cl_y: allowance.cl_y,
                cr_x: allowance.cr2_x,
                cr_y: allowance.cr2_y
            });
            addTokenWithBalance(accountAddress, token);
            delete account.allowances[spender];
        }
    }

    function privateAllowance(address owner, address spender) external view returns (TokenModel.Allowance memory) {
        return accounts[owner].allowances[spender];
    }

    /**
    * MARK: Decrease Allowance

    * @dev Decreases the allowance of the spender by the given amount.
     *
     * Emits a {PrivateApproval} event.
     * @param spender The address that will be approved to spend the tokens.
     * @param newAllowance The new decreased allowance.
     * @param proof The proof.
     * @return True if the operation was successful.
     */
    function privateDecreaseAllowance(
        address spender,
        TokenModel.ElGamal memory decreaseAmount,
        TokenModel.Allowance memory newAllowance,
        bytes calldata proof
    ) external returns (bool) {
        require(isNotZeroAllowance(newAllowance), "PrivateERCToken: zero allowance");
        require(isNotZeroElGamal(decreaseAmount), "PrivateERCToken: zero decrease amount");
        require(spender != address(0), "PrivateERCToken: spender is the zero address");
        require(existsAllowance(msg.sender, spender), "PrivateERCToken: allowance does not exist");

        //TODO uncomment code below and build the verifyUpdateAllowance related functions
        // TokenModel.Allowance memory oldAllowance = accounts[msg.sender].allowances[spender];
        // TokenModel.VerifyUpdateAllowanceParams memory params = TokenModel.VerifyUpdateAllowanceParams({
        //     institutionRegistration: _institutionRegistration, //I realy don't know why are we using institutionRegistration here!
        //     owner: msg.sender,
        //     spender: spender,
        //     decreaseAmount: decreaseAmount,
        //     oldAllowance: oldAllowance,
        //     newAllowance: newAllowance,
        //     proof: proof
        // });
        // (bool isValid, , ) = TokenVerificationLib.verifyDecreaseAllowance(params);
        // require(isValid, "PrivateERCToken: invalid proof");
        _privateApprove(msg.sender, spender, newAllowance);
        addToken(msg.sender, decreaseAmount);
        return true;
    }

    /**
     * @dev Increases the allowance of the spender by the given amount.
     *
     * Emits a {PrivateApproval} event.
     * @param spender The address approved to spend the tokens.
     * @param newAllowance The new allowance.
     * @param consumedTokens The tokens that will be consumed to increase the allowance.
     * @param consumedTokensRemainingAmount The remaining amount from the consumed tokens.
     * @param proof The proof.
     * @return True if the operation was successful.
     */
    function privateIncreaseAllowance(
        address spender,
        TokenModel.Allowance memory newAllowance,
        bytes32[] memory consumedTokens,
        TokenModel.ElGamal memory consumedTokensRemainingAmount,
        bytes calldata proof
    ) external returns (bool) {
        require(isNotZeroAllowance(newAllowance), "PrivateERCToken: zero allowance");
        require(isNotZeroElGamal(consumedTokensRemainingAmount), "PrivateERCToken: zero decrease amount");
        require(spender != address(0), "PrivateERCToken: spender is the zero address");
        require(existsAllowance(msg.sender, spender), "PrivateERCToken: allowance does not exist");
        require(existsAll(msg.sender, consumedTokens), "PrivateERCToken: consumedTokens does not exist");

        //TODO uncomment code below and build the verifyUpdateAllowance related functions
        // TokenModel.Allowance memory oldAllowance = accounts[msg.sender].allowances[spender];
        // TokenModel.VerifyTokenIncreaseAllowanceParams memory params = TokenModel.VerifyTokenIncreaseAllowanceParams({
        //     institutionRegistration: _institutionRegistration,
        //     owner: msg.sender,
        //     spender: spender,
        //     newAllowance: newAllowance,
        //     oldAllowance: oldAllowance,
        //     consumedTokens: consumedTokens,
        //     consumedTokensRemainingAmount: consumedTokensRemainingAmount,
        //     proof: proof
        // });
        // (bool isValid, , ) = TokenVerificationLib.verifyTokenIncreaseAllowance(params);
        // require(isValid, "PrivateERCToken: invalid proof");

        _privateApprove(msg.sender, spender, newAllowance);
        removeTokensWithBalance(msg.sender, consumedTokens);
        addToken(msg.sender, consumedTokensRemainingAmount);
        return true;
    }

    function privateDirectTransfer(
        address from,
        uint256[] memory consumedTokens,
        address to,
        TokenModel.ElGamal memory amount,
        TokenModel.ElGamal memory consumedTokensRemainingAmount,
        bytes calldata proof
    )
    external
    whenNotPaused
    notBlacklisted(msg.sender)
    notBlacklisted(to)
    returns (bool)
    {
        require(consumedTokens.length > 0, "PrivateERCToken: consumedTokens is empty");
        require(isNotZeroElGamal(consumedTokensRemainingAmount),"PrivateERCToken: consumedTokensRemainingAmount is zero");
        require(isNotZeroElGamal(amount),  "PrivateERCToken: amount is zero");
        require(existsAll2(from, consumedTokens),  "PrivateERCToken: consumedTokens does not exist");
        TokenModel.ElGamal memory consumedAmount = sumTokens2(from, consumedTokens);
        TokenModel.VerifyTokenTransferParams memory params = TokenModel.VerifyTokenTransferParams({
            institutionRegistration: _institutionRegistration,
            from: from,
            to: to,
            consumedAmount: consumedAmount,
            amount: amount,
            remainingAmount: consumedTokensRemainingAmount,
            proof: proof
        });
        (bool isValid, uint result, uint256[] memory znValues) = TokenVerificationLib.verifyTokenTransfer(params); // TODO please read https://docs.soliditylang.org/en/latest/control-structures.html#assignment and avoid unused variables.
        require(isValid, "PrivateERCToken: invalid proof");

        removeTokensWithBalance2(from, consumedTokens);

        uint256 changeTokenId = hashElgamal2(consumedTokensRemainingAmount);
        TokenModel.TokenEntity memory changeTokenEntity =
            TokenModel.TokenEntity(changeTokenId, from, TokenModel.TokenStatus.active, consumedTokensRemainingAmount, address(0), 0 );
        addTokenWithBalance2(from, changeTokenEntity);

//        addTokenWithBalance(from, consumedTokensRemainingAmount);
//        addTokenWithBalance(to, amount);

        uint256 transferTokenId = hashElgamal2(amount);
        TokenModel.TokenEntity memory transferTokenEntity =
        TokenModel.TokenEntity(transferTokenId, to, TokenModel.TokenStatus.active, amount, address(0), 0);
        addTokenWithBalance2(to, transferTokenEntity);

        TokenEventLib.triggerTokenDeletedEvent2(_l2Event, address(this), from, consumedTokens, changeTokenId);
        TokenEventLib.triggerTokenReceivedEvent(_l2Event, address(this), to, amount, from);
        emit PrivateTransfer(from, to, amount);
        return true;
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
        TokenModel.TokenEntity memory tokenEntity =  accounts[msg.sender].reservations[tokenId];
        require(tokenEntity.to == to, "PrivateERCToken: tokenId is not matched");

        removeTokenWithBalance(msg.sender, tokenId);
        addTokenWithBalance2(tokenEntity.to, tokenEntity);

        uint256[] memory consumedTokens = new uint256[](1);
        consumedTokens[0] = tokenEntity.rollbackTokenId;

        TokenEventLib.triggerTokenDeletedEvent2(_l2Event, address(this), msg.sender, consumedTokens, 0);
        TokenEventLib.triggerTokenReceivedEvent2(_l2Event, address(this), to, tokenId, msg.sender);
        emit PrivateTransfer(msg.sender, to, tokenEntity.amount);
        return true;
    }

    function configurePrivacyMinter(address minter, TokenModel.ElGamal calldata privateAllowedAmount)
    external whenNotPaused onlyMasterMinter returns (bool) {
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

    function privateTotalSupply() external view returns (TokenModel.ElGamal memory) {
        TokenModel.ElGamal memory consolidatedSupply = _privateTotalSupply;
        return consolidatedSupply;
    }

    function publicTotalSupply() external view returns (uint256, bool) {
        return (_publicTotalSupply, _numberOfTotalSupplyChanges == 0);
    }

    /**
      need to add proof logic
    **/
    function revealTotalSupply(uint256 publicTotalSupply, bytes calldata proof) external {
        //TODO add proof logic
        _publicTotalSupply = publicTotalSupply;
    }

    function addTokenWithBalance(address to, TokenModel.ElGamal memory amount) internal {
        TokenModel.Account storage toAccount = accounts[to];
        bytes32 tokenId = hashElgamal(amount);

        toAccount.balance = TokenGrumpkinLib.addElGamal(toAccount.balance, amount);
        toAccount.assets[tokenId] = amount;
    }

    function addTokenWithBalance2(address to, TokenModel.TokenEntity memory entity) internal {
        TokenModel.Account storage toAccount = accounts[to];

        toAccount.balance = TokenGrumpkinLib.addElGamal(toAccount.balance, entity.amount);
        toAccount.reservations[entity.id] = entity;
    }

    function addToken(address to, TokenModel.ElGamal memory amount) internal {
        TokenModel.Account storage toAccount = accounts[to];
        bytes32 tokenId = hashElgamal(amount);
        toAccount.assets[tokenId] = amount;
    }

    function addToken2(address to, TokenModel.TokenEntity memory token) internal {
        TokenModel.Account storage toAccount = accounts[to];
        toAccount.reservations[token.id] = token;
    }

    function addReservation(address to, TokenModel.TokenEntity memory entity) internal {
        TokenModel.Account storage toAccount = accounts[to];
        toAccount.reservations[entity.id] = entity;
    }

    function removeTokenWithBalance(address to, TokenModel.ElGamal memory amount) internal {
        bytes32 tokenId = hashElgamal(amount);
        require(isNotZeroElGamal(accounts[to].assets[tokenId]), "PrivateERCToken: token does not exist");
        accounts[to].balance = TokenGrumpkinLib.subElGamal(accounts[to].balance, amount);
        delete accounts[to].assets[tokenId];
    }

    function removeTokensWithBalance(address to, bytes32[] memory amount) internal {
        TokenModel.Account storage toAccount = accounts[to];

        for (uint256 i = 0; i < amount.length; i++) {
            toAccount.balance = TokenGrumpkinLib.subElGamal(toAccount.balance, toAccount.assets[amount[i]]);
            delete toAccount.assets[amount[i]];
        }
    }

    function removeTokenWithBalance(address to, uint256 tokenId) internal {
        TokenModel.Account storage toAccount = accounts[to];

        toAccount.balance = TokenGrumpkinLib.subElGamal(toAccount.balance, toAccount.reservations[tokenId].amount);
        delete toAccount.reservations[tokenId];
    }

    function removeTokensWithBalance2(address to, uint256[] memory tokenIds) internal {
        TokenModel.Account storage toAccount = accounts[to];

        for (uint256 i = 0; i < tokenIds.length; i++) {
            toAccount.balance = TokenGrumpkinLib.subElGamal(toAccount.balance, toAccount.reservations[tokenIds[i]].amount);
            delete toAccount.reservations[tokenIds[i]];
        }
    }


    function subTokens(TokenModel.ElGamal memory amount,TokenModel.ElGamal memory amount1) external view returns (TokenModel.ElGamal memory) {
        return TokenGrumpkinLib.subElGamal(amount, amount1);
    }

    function addTokens(TokenModel.ElGamal memory amount,TokenModel.ElGamal memory amount1) external view returns (TokenModel.ElGamal memory) {
        return TokenGrumpkinLib.addElGamal(amount, amount1);
    }


    function removeTokensWoChangeBalance(address to, bytes32[] memory amount) internal {
        TokenModel.Account storage toAccount = accounts[to];

        for (uint256 i = 0; i < amount.length; i++) {
            delete toAccount.assets[amount[i]];
        }
    }

    function removeTokensWoChangeBalance2(address to, uint256[] memory tokenIds) internal {
        TokenModel.Account storage toAccount = accounts[to];

        for (uint256 i = 0; i < tokenIds.length; i++) {
            delete toAccount.reservations[tokenIds[i]];
        }
    }

    function sumTokens(address account, bytes32[] memory tokens) internal view returns (TokenModel.ElGamal memory) {
        TokenModel.ElGamal memory sum = TokenModel.ElGamal(0, 0, 0, 0);
        for (uint256 i = 0; i < tokens.length; i++) {
            sum = TokenGrumpkinLib.addElGamal(sum, accounts[account].assets[tokens[i]]);
        }
        return sum;
    }

    // TODO please, could you rename this function to sumTokensReservations.
    // you can rename the function above to sumTokensAssets either.
    function sumTokens2(address account, uint256[] memory tokens) internal view returns (TokenModel.ElGamal memory) {
        TokenModel.ElGamal memory sum = TokenModel.ElGamal(0, 0, 0, 0);
        for (uint256 i = 0; i < tokens.length; i++) {
            sum = TokenGrumpkinLib.addElGamal(sum, accounts[account].reservations[tokens[i]].amount);
        }
        return sum;
    }

    function existsAll(address account, bytes32[] memory tokens) internal view returns (bool) {
        for (uint256 i = 0; i < tokens.length; i++) {
            if (isZero(accounts[account].assets[tokens[i]])) {
                return false;
            }
        }
        return true;
    }

    // TODO please, rename this function to existsAllReservations, at least.
    // you can rename the funciton above to existsAllAssets either.
    function existsAll2(address account, uint256[] memory tokens) internal view returns (bool) {
        for (uint256 i = 0; i < tokens.length; i++) {
            if (isZero(accounts[account].reservations[tokens[i]].amount)) {
                return false;
            }
        }
        return true;
    }

    function isZero(TokenModel.ElGamal memory elgamal) internal pure returns (bool) {
        //TODO look at this code, and fix the function isNotZeroElGamal
        // from basic boolean logi classes, the oposite of a && b is !a || !b
        return elgamal.cl_x == 0 && elgamal.cl_y == 0 && elgamal.cr_x == 0 && elgamal.cr_y == 0;
    }

    function isEqualElGamal(TokenModel.ElGamal memory a, TokenModel.ElGamal memory b) internal pure returns (bool) {
        return a.cl_x == b.cl_x && a.cl_y == b.cl_y && a.cr_x == b.cr_x && a.cr_y == b.cr_y;
    }

    function isNotZeroElGamal(TokenModel.ElGamal memory elgamal) internal pure returns (bool) {
        // TODO fix this.
        // In Twisted ElGamal using the Grumpkin curve, it is mathematically valid for C1 or C2 to have 0 in any of their coordinate.
        // However, in your implementation, a valid twisted elgamal point like (0, (17**-2)*(modq)) will be considere invalid/null or zero.
        return elgamal.cl_x != 0 && elgamal.cl_y != 0 && elgamal.cr_x != 0 && elgamal.cr_y != 0;
    }

    function isNotZeroAllowance(TokenModel.Allowance memory allowance) internal pure returns (bool) {
        return allowance.cl_x != 0 && allowance.cl_y != 0 && allowance.cr1_x != 0 && allowance.cr1_y != 0 && allowance.cr2_x != 0 && allowance.cr2_y != 0;
    }

    /**
     * @notice Checks if an allowance exists for a given owner and spender.
     * @param owner The address of the owner.
     * @param spender The address of the spender.
     * @return True if the allowance exists, false otherwise.
     */
    function existsAllowance(address owner, address spender) internal view returns (bool) {
        return isNotZeroAllowance(accounts[owner].allowances[spender]);
    }

    /**
     * @dev THIS FUNCTION SHOULD BELONG TO AN ELGAMAL LIBRARY
     */
    function isEqualAllowance(TokenModel.Allowance memory a, TokenModel.Allowance memory b) internal pure returns (bool) {
        return a.cl_x == b.cl_x && a.cl_y == b.cl_y && a.cr1_x == b.cr1_x && a.cr1_y == b.cr1_y && a.cr2_x == b.cr2_x && a.cr2_y == b.cr2_y;
    }

    function _privateApprove(address owner, address spender, TokenModel.Allowance memory newAllowance) internal {
        TokenModel.Allowance memory oldAllowance = accounts[owner].allowances[spender];
        if (isNotZeroAllowance(oldAllowance)) {
            removeTokenWithBalance(owner, backupAmount(oldAllowance));
        }
        addToken(owner, backupAmount(newAllowance));
        accounts[owner].allowances[spender] = newAllowance;
        emit PrivateApproval(owner, spender, newAllowance);
    }
}