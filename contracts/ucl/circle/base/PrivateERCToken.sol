// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./InstitutionRegistration.sol";
import "../event/IL2Event.sol";
import "../model/TokenModel.sol";
import "../lib/TokenEventLib.sol";
import "./IPrivateERCToken.sol";
import "../lib/TokenVerificationLib.sol";
import {TokenOperationsLib} from "../lib/TokenOperationsLib.sol";

import {Pausable} from "../../../usdc/v1/Pausable.sol";
import {Blacklistable} from "../../../usdc/v1/Blacklistable.sol";
import {Ownable} from "../../../usdc/v1/Ownable.sol";
import {Mintable} from "../../../usdc/v1/Mintable.sol";

abstract contract PrivateERCToken is IPrivateERCToken, Ownable, Pausable, Blacklistable, Mintable {
    // FiatTokenV1 compatible fields
    bool private _initialized;

    InstitutionRegistration private _institutionRegistration; //TODO what is this?
    IL2Event _l2Event;
    mapping(address => TokenModel.Account) _accounts;
    mapping(address => TokenModel.ElGamal) _privateMinterAllowed;

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
        require(!_initialized, "FiatToken: contract is already initialized");
        _initialized = true;
        _l2Event = l2Event;
        _institutionRegistration = institutionRegistration;
        TokenEventLib.triggerTokenSCCreatedEvent(_l2Event, address(this), msg.sender, tokenSCType);
    }

    /*
     * MARK: READ-ONLY
     */
    function privateTotalSupply() external view returns (TokenModel.ElGamal memory) {
        return _privateTotalSupply;
    }

    function publicTotalSupply() external view returns (uint256, bool) {
        return (_publicTotalSupply, _numberOfTotalSupplyChanges == 0);
    }

    function privateAllowance(address owner, address spender) external view returns (TokenModel.Allowance memory) {
        return _accounts[owner].allowances[spender];
    }

    function privateBalanceOf(address owner) external view returns (TokenModel.ElGamal memory) {
        return _accounts[owner].balance;
    }

    /**
     * MARK: Mint
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
    ) external whenNotPaused onlyMinters notBlacklisted(msg.sender) notBlacklisted(to) returns (bool) {
        require(to != address(0), "PrivateERCToken: mint to the zero address");

        TokenModel.VerifyTokenMintParams memory params = TokenModel.VerifyTokenMintParams({
            institutionRegistration: _institutionRegistration,
            minter: msg.sender,
            to: to,
            initialMinterAllowed: _privateMinterAllowed[msg.sender],
            currentMintAmount: amount,
            supplyIncrease: supplyIncrease,
            proof: proof
        });
        (bool isValid, , ) = TokenVerificationLib.verifyTokenMint(params);
        require(isValid, "PrivateERCToken: invalid proof");
        TokenModel.ElGamal memory oldTotalSupply = _privateTotalSupply;

        TokenModel.ElGamal memory newAllowed = TokenGrumpkinLib.subElGamal(_privateMinterAllowed[msg.sender], amount); //TODO this is not good quality code :=> TokenModel.ElGamal({cl_x: znValues[4], cl_y: znValues[5], cr_x: znValues[6], cr_y: znValues[7]});
        _privateMinterAllowed[msg.sender] = newAllowed;
        addSupply(supplyIncrease);
        addToken(to, amount);

        //This events doesn't need to be triggered between steps of the function, functions are not preemptible in EVM.
        TokenEventLib.triggerTokenMintAllowedUpdatedEvent(
            _l2Event,
            address(this),
            msg.sender,
            msg.sender,
            _privateMinterAllowed[msg.sender],
            newAllowed
        );
        TokenEventLib.triggerTokenSupplyUpdatedEvent(
            _l2Event,
            address(this),
            msg.sender,
            oldTotalSupply,
            supplyIncrease,
            TokenModel.ElGamal(0, 0, 0, 0),
            _privateTotalSupply,
            _numberOfTotalSupplyChanges
        );
        TokenEventLib.triggerTokenMintedEvent(_l2Event, address(this), to, amount);

        emit PrivateMint(to, amount);
        return true;
    }

    /**
     * MARK: Burn
     * @dev Burns private fiat tokens from an address and updates the total supply.
     * @param consumedTokens The array of tokens to burn.
     * @param amount The amount of tokens to burn.
     * @param consumedTokensRemainingAmount The remaining amount of tokens to burn.
     * @param supplyDecrease The amount of tokens to decrement in total supply.
     * @param proof The proof.
     */
    function privateBurn(
        bytes32[] memory consumedTokens,
        TokenModel.ElGamal memory amount,
        TokenModel.ElGamal memory consumedTokensRemainingAmount,
        TokenModel.ElGamal memory supplyDecrease,
        bytes calldata proof
    ) external returns (bool) {
        require(consumedTokens.length > 0, "PrivateERCToken: consumedTokens is empty");
        require(
            isNotZeroElGamal(consumedTokensRemainingAmount),
            "PrivateERCToken: consumedTokensRemainingAmount is zero"
        );
        require(isNotZeroElGamal(amount), "PrivateERCToken: amount is zero");
        require(existsAll(msg.sender, consumedTokens), "PrivateERCToken: consumedTokens does not exist");

        TokenModel.ElGamal memory consumedAmount = sumTokens(msg.sender, consumedTokens);
        TokenModel.VerifyTokenBurnParams memory params = TokenModel.VerifyTokenBurnParams({
            institutionRegistration: _institutionRegistration,
            from: msg.sender,
            consumedAmount: consumedAmount,
            amount: amount,
            remainingAmount: consumedTokensRemainingAmount,
            supplyDecrease: supplyDecrease,
            proof: proof
        });
        (bool isValid, , ) = TokenVerificationLib.verifyTokenBurn(params);
        require(isValid, "PrivateERCToken: invalid proof");
        TokenModel.ElGamal memory oldTotalSupply = _privateTotalSupply;

        removeTokens(msg.sender, consumedTokens);
        addToken(msg.sender, consumedTokensRemainingAmount);
        subSupply(supplyDecrease);

        /////// this should be removed, as we have no true layer 2 rollup.
        TokenEventLib.triggerTokenSupplyUpdatedEvent(
            _l2Event,
            address(this),
            msg.sender,
            oldTotalSupply,
            TokenModel.ElGamal(0, 0, 0, 0),
            supplyDecrease,
            _privateTotalSupply,
            _numberOfTotalSupplyChanges
        );
        TokenEventLib.triggerTokenBurnedEvent(
            _l2Event,
            address(this),
            msg.sender,
            consumedTokens,
            amount,
            consumedTokensRemainingAmount
        );
        ///// up to here

        emit PrivateBurn(msg.sender, amount);
        return true;
    }

    /**
     * MARK: Approve
     */
    function privateApprove(
        bytes32[] memory consumedTokens,
        address spender,
        TokenModel.Allowance memory allowance,
        TokenModel.ElGamal memory consumedTokensRemainingAmount,
        bytes calldata proof
    ) external whenNotPaused notBlacklisted(msg.sender) notBlacklisted(spender) returns (bool) {
        require(consumedTokens.length > 0, "PrivateERCToken: consumedTokens is empty");
        require(
            isNotZeroElGamal(consumedTokensRemainingAmount),
            "PrivateERCToken: consumedTokensRemainingAmount is zero"
        );
        require(isNotZeroAllowance(allowance), "PrivateERCToken: allowance is zero");
        require(existsAll(msg.sender, consumedTokens), "PrivateERCToken: consumedTokens does not exist");

        TokenModel.ElGamal memory consumedAmount = sumTokens(msg.sender, consumedTokens);
        TokenModel.VerifyTokenApproveParams memory params = TokenModel.VerifyTokenApproveParams({
            institutionRegistration: _institutionRegistration,
            owner: msg.sender,
            spender: spender,
            consumedAmount: consumedAmount,
            allowance: allowance,
            remainingAmount: consumedTokensRemainingAmount,
            proof: proof
        });
        (bool isValid, , ) = TokenVerificationLib.verifyTokenApprove(params);
        require(isValid, "PrivateERCToken: invalid proof");

        TokenModel.Allowance memory oldAllowance = _accounts[msg.sender].allowances[spender];

        removeTokens(msg.sender, consumedTokens);
        addToken(msg.sender, consumedTokensRemainingAmount);
        _privateApprove(msg.sender, spender, allowance);

        //////// This code should be removed, as we have no true layer 2 rollup.
        TokenEventLib.triggerTokenDeletedEvent(
            _l2Event,
            address(this),
            msg.sender,
            consumedTokens,
            consumedTokensRemainingAmount
        );
        TokenEventLib.triggerAllowanceCreatedEvent(
            _l2Event,
            address(this),
            msg.sender,
            spender,
            allowance,
            oldAllowance,
            allowance
        );
        TokenEventLib.triggerAllowanceReceivedEvent(_l2Event, address(this), spender, msg.sender, allowance);
        ///// up to here

        return true;
    }

    /**
     * MARK: TransferFrom
     *
     * @dev Moves a private `value` amount of tokens from `from` to `to`.
     *
     * Returns a boolean value indicating wnewAllowancee operation succeeded.
     * to do:  need to consider the scenario that the owner and spender belong to two banks.
     * whenever allowance is spent, we need to update allowance and rollback at both side
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

        TokenModel.Allowance memory oldAllowance = _accounts[from].allowances[msg.sender];
        TokenModel.VerifyTokenTransferFromParams memory params = TokenModel.VerifyTokenTransferFromParams({
            institutionRegistration: _institutionRegistration,
            owner: from,
            spender: msg.sender,
            receiver: to,
            oldAllowance: _accounts[from].allowances[msg.sender],
            newAllowance: newAllowance,
            amount: value,
            proof: proof
        });
        (bool isValid, , ) = TokenVerificationLib.verifyTokenTransferFrom(params);
        require(isValid, "PrivateERCToken: invalid proof");

        addToken(to, value);
        _privateApprove(from, msg.sender, newAllowance);

        /////// this should be removed, as we have no true layer 2 rollup.
        TokenEventLib.triggerAllowanceUpdatedEvent(
            _l2Event,
            address(this),
            from,
            oldAllowance,
            TokenModel.ElGamal(0, 0, 0, 0),
            value,
            newAllowance,
            msg.sender
        );
        TokenEventLib.triggerTokenReceivedEvent(_l2Event, address(this), to, value, msg.sender);
        ///// up to here

        emit PrivateTransfer(from, to, value);
        return true;
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
        removeTokens(msg.sender, consumedTokens);
        addToken(msg.sender, consumedTokensRemainingAmount);
        return true;
    }

    /**
     * @dev Moves a private `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {PrivateTransfer} event.
     * @param consumedTokens The tokens that will be consumed.
     * @param to The address that will receive the transferred tokens.
     * @param amount The amount of tokens to transfer.
     * @param consumedTokensRemainingAmount The remaining amount from the tokens that will be consumed.
     * @param proof The proof.
     * @return True if the operation was successful.
     */
    function privateTransfer(
        bytes32[] memory consumedTokens,
        address to,
        TokenModel.ElGamal memory amount,
        TokenModel.ElGamal memory consumedTokensRemainingAmount,
        bytes calldata proof
    ) external whenNotPaused notBlacklisted(msg.sender) notBlacklisted(to) returns (bool) {
        require(consumedTokens.length > 0, "PrivateERCToken: consumedTokens is empty");
        require(
            isNotZeroElGamal(consumedTokensRemainingAmount),
            "PrivateERCToken: consumedTokensRemainingAmount is zero"
        );
        require(isNotZeroElGamal(amount), "PrivateERCToken: amount is zero");
        require(existsAll(msg.sender, consumedTokens), "PrivateERCToken: consumedTokens does not exist");
        TokenModel.ElGamal memory consumedAmount = sumTokens(msg.sender, consumedTokens);
        TokenModel.VerifyTokenTransferParams memory params = TokenModel.VerifyTokenTransferParams({
            institutionRegistration: _institutionRegistration,
            from: msg.sender,
            to: to,
            consumedAmount: consumedAmount,
            amount: amount,
            remainingAmount: consumedTokensRemainingAmount,
            proof: proof
        });
        (bool isValid, uint result, uint256[] memory znValues) = TokenVerificationLib.verifyTokenTransfer(params);
        require(isValid, "PrivateERCToken: invalid proof");

        removeTokens(msg.sender, consumedTokens);
        addToken(msg.sender, consumedTokensRemainingAmount);
        addToken(to, amount);

        /////// this should be removed, as we have no true layer 2 rollup.
        TokenEventLib.triggerTokenDeletedEvent(
            _l2Event,
            address(this),
            msg.sender,
            consumedTokens,
            consumedTokensRemainingAmount
        );
        TokenEventLib.triggerTokenReceivedEvent(_l2Event, address(this), to, amount, msg.sender);
        /////// up to here

        emit PrivateTransfer(msg.sender, to, amount);
        return true;
    }

    /**
     * MARK: Configure Privacy Minter
     * @dev Configures a privacy minter.
     * @param minter The address of the privacy minter to configure.
     * @param privateAllowedAmount The amount of tokens that the privacy minter is allowed to mint.
     * @return True if the operation was successful.
     */
    function configurePrivacyMinter(
        address minter,
        TokenModel.ElGamal calldata privateAllowedAmount
    ) external whenNotPaused onlyMasterMinter returns (bool) {
        minters[minter] = true;
        _privateMinterAllowed[minter] = privateAllowedAmount;

        TokenEventLib.triggerMinterAllowedSetEvent(_l2Event, address(this), minter, msg.sender, privateAllowedAmount);
        return true;
    }

    /**
     * MARK: Remove Privacy Minter
     * @dev Removes a privacy minter.
     * @param minter The address of the privacy minter to remove.
     * @return True if the operation was successful.
     */
    function removePrivacyMinter(address minter) external onlyMasterMinter returns (bool) {
        _privateMinterAllowed[minter] = TokenModel.ElGamal({cl_x: 0, cl_y: 0, cr_x: 0, cr_y: 0});
        return true;
    }

    /**
     * need to add proof logic
     **/
    function revealTotalSupply(uint256 publicTotalSupply, bytes calldata proof) external returns (bool) {
        //TODO the proof function will be something like this: require(verifyTotalSupply(_privateTotalSupply, _publicTotalSupply, proof));
        _publicTotalSupply = publicTotalSupply;
        _numberOfTotalSupplyChanges = 0;
        return true;
    }

    /**
     * MARK: INTERNALS
     */

    function _privateApprove(address owner, address spender, TokenModel.Allowance memory newAllowance) internal {
        TokenModel.Allowance memory oldAllowance = _accounts[owner].allowances[spender];
        if (isNotZeroAllowance(oldAllowance)) {
            removeToken(owner, backupAmount(oldAllowance));
        }
        addToken(owner, backupAmount(newAllowance));
        _accounts[owner].allowances[spender] = newAllowance;
        emit PrivateApproval(owner, spender, newAllowance);
    }

    function addToken(address to, TokenModel.ElGamal memory amount) internal {
        _accounts[to].balance = TokenGrumpkinLib.addElGamal(_accounts[to].balance, amount);
        bytes32 tokenId = hashElgamal(amount);
        _accounts[to].tokens[tokenId] = amount;
    }

    function removeTokens(address to, bytes32[] memory tokens) internal {
        for (uint256 i = 0; i < tokens.length; i++) {
            TokenModel.ElGamal memory amount = _accounts[to].tokens[tokens[i]];
            _accounts[to].balance = TokenGrumpkinLib.subElGamal(_accounts[to].balance, amount);
            delete _accounts[to].tokens[tokens[i]];
        }
    }

    function removeToken(address to, TokenModel.ElGamal memory amount) internal {
        bytes32 tokenId = hashElgamal(amount);
        require(isNotZeroElGamal(_accounts[to].tokens[tokenId]), "PrivateERCToken: token does not exist");
        _accounts[to].balance = TokenGrumpkinLib.subElGamal(_accounts[to].balance, amount);
        delete _accounts[to].tokens[tokenId];
    }

    function sumTokens(address account, bytes32[] memory tokens) internal view returns (TokenModel.ElGamal memory) {
        TokenModel.ElGamal memory sum = TokenModel.ElGamal(0, 0, 0, 0);
        for (uint256 i = 0; i < tokens.length; i++) {
            TokenModel.ElGamal memory token = _accounts[account].tokens[tokens[i]];
            sum = TokenGrumpkinLib.addElGamal(sum, token);
        }
        return sum;
    }

    function existsAll(address account, bytes32[] memory tokens) internal view returns (bool) {
        for (uint256 i = 0; i < tokens.length; i++) {
            if (isZero(_accounts[account].tokens[tokens[i]])) {
                return false;
            }
        }
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

    /**
     * @notice Subtracts a supply from the total supply.
     * @param supplyDecrease The amount of tokens to subtract from the total supply.
     */
    function subSupply(TokenModel.ElGamal memory supplyDecrease) internal {
        _privateTotalSupply = TokenGrumpkinLib.subElGamal(_privateTotalSupply, supplyDecrease);
        _numberOfTotalSupplyChanges++;
    }

    /**
     * @notice Checks if an allowance exists for a given owner and spender.
     * @param owner The address of the owner.
     * @param spender The address of the spender.
     * @return True if the allowance exists, false otherwise.
     */
    function existsAllowance(address owner, address spender) internal view returns (bool) {
        return isNotZeroAllowance(_accounts[owner].allowances[spender]);
    }

    /**
     * MARK: LIBRARY
     */

    /**
     * @dev THIS FUNCTION SHOULD BELONG TO A LIBRARY
     * TODO move this function to a library.
     */
    function hashElgamal(TokenModel.ElGamal memory elgamal) internal pure returns (bytes32) {
        return keccak256(abi.encode(elgamal));
    }

    /**
     * @dev THIS FUNCTION SHOULD BELONG TO A LIBRARY
     * TODO move this function to a library.
     */
    function isZero(TokenModel.ElGamal memory elgamal) internal pure returns (bool) {
        return elgamal.cl_x == 0 && elgamal.cl_y == 0 && elgamal.cr_x == 0 && elgamal.cr_y == 0;
    }

    /**
     * @dev THIS FUNCTION SHOULD BELONG TO A LIBRARY
     * TODO move this function to a library.
     */
    function isNotZeroElGamal(TokenModel.ElGamal memory elgamal) internal pure returns (bool) {
        return elgamal.cl_x != 0 || elgamal.cl_y != 0 || elgamal.cr_x != 0 || elgamal.cr_y != 0;
    }

    /**
     * @dev THIS FUNCTION SHOULD BELONG TO A LIBRARY
     * TODO move this function to a library.
     */
    function backupAmount(TokenModel.Allowance memory allowance) internal pure returns (TokenModel.ElGamal memory) {
        return
            TokenModel.ElGamal({
                cl_x: allowance.cl_x,
                cl_y: allowance.cl_y,
                cr_x: allowance.cr2_x,
                cr_y: allowance.cr2_y
            });
    }

    /**
     * @dev THIS FUNCTION SHOULD BELONG TO A LIBRARY
     * TODO move this function to a library.
     */
    function allowedAmount(TokenModel.Allowance memory allowance) internal pure returns (TokenModel.ElGamal memory) {
        return
            TokenModel.ElGamal({
                cl_x: allowance.cl_x,
                cl_y: allowance.cl_y,
                cr_x: allowance.cr1_x,
                cr_y: allowance.cr1_y
            });
    }

    /**
     * @dev THIS FUNCTION SHOULD BELONG TO A LIBRARY
     * TODO move this function to a library.
     */
    function isNotZeroAllowance(TokenModel.Allowance memory allowance) internal pure returns (bool) {
        return
            allowance.cl_x != 0 ||
            allowance.cl_y != 0 ||
            allowance.cr1_x != 0 ||
            allowance.cr1_y != 0 ||
            allowance.cr2_x != 0 ||
            allowance.cr2_y != 0;
    }

    /**
     * @dev THIS FUNCTION SHOULD BELONG TO A LIBRARY
     * TODO move this function to a library.
     */
    function isEqualAllowance(
        TokenModel.Allowance memory a,
        TokenModel.Allowance memory b
    ) internal pure returns (bool) {
        return
            a.cl_x == b.cl_x &&
            a.cl_y == b.cl_y &&
            a.cr1_x == b.cr1_x &&
            a.cr1_y == b.cr1_y &&
            a.cr2_x == b.cr2_x &&
            a.cr2_y == b.cr2_y;
    }
}
