// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./InstitutionRegistration.sol";
import "../event/IL2Event.sol";
import "../model/TokenModel.sol";
import "../lib/TokenEventLib.sol";
import "./IPrivateERCToken.sol";
import "../lib/TokenVerificationLib.sol";
import {TokenOperationsLib} from "../lib/TokenOperationsLib.sol";

import { Ownable } from "./Ownable.sol";
import { Pausable } from "./Pausable.sol";
import { Blacklistable } from "./Blacklistable.sol";

contract PrivateERCToken is IPrivateERCToken, Ownable, Pausable, Blacklistable{
    // FiatTokenV1 compatible fields
    string public name;
    string public symbol;
    uint8 public decimals;
    string public currency;
    address public masterMinter;
    bool internal initialized;

    InstitutionRegistration private _institutionRegistration;
    IL2Event _l2Event;

    mapping(address=>TokenModel.Account) accounts;
    mapping(address => TokenModel.ElGamal) public privateMinterAllowed;
    TokenModel.ElGamal _privateTotalSupply;

    uint256 _numberOfTotalSupplyChanges;// TODO: What is the purpose of this variable?
    uint256 public decryptedTotalSupply;

    mapping(address => bool) internal minters;

    event PrivateMint(address indexed from, TokenModel.ElGamal value);
    event PrivateBurn(address indexed from, TokenModel.ElGamal value);
    event PrivateTransfer(address indexed from, address indexed to, TokenModel.ElGamal value);
    event PrivateApproval(address indexed owner, address indexed spender, TokenModel.Allowance value);

    // Compatible with FiatTokenV1 contracts
    function initialize(
        string memory tokenName,
        string memory tokenSymbol,
        string memory tokenCurrency,
        uint8 tokenDecimals,
        address newMasterMinter,
        address newPauser,
        address newBlacklister,
        address newOwner,
        TokenModel.TokenSCTypeEnum tokenSCType,
        IL2Event l2Event,
        InstitutionRegistration institutionRegistration
    ) public {
        require(!initialized, "FiatToken: contract is already initialized");
        require(
            newMasterMinter != address(0),
            "FiatToken: new masterMinter is the zero address"
        );
        require(
            newPauser != address(0),
            "FiatToken: new pauser is the zero address"
        );
        require(
            newBlacklister != address(0),
            "FiatToken: new blacklister is the zero address"
        );
        require(
            newOwner != address(0),
            "FiatToken: new owner is the zero address"
        );

        name = tokenName;
        symbol = tokenSymbol;
        currency = tokenCurrency;
        decimals = tokenDecimals;
        masterMinter = newMasterMinter;
        pauser = newPauser;
        blacklister = newBlacklister;
        setOwner(newOwner);
        initialized = true;

        _l2Event = l2Event;
        _institutionRegistration = institutionRegistration;

        TokenEventLib.triggerTokenSCCreatedEvent(_l2Event, address(this), msg.sender, tokenSCType);
    }

    // Compatible with FiatTokenV1 contracts
    modifier onlyMinters() {
        require(minters[msg.sender], "FiatToken: caller is not a minter");
        _;
    }

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
        (bool isValid, uint result, uint256[] memory znValues) = TokenVerificationLib.verifyTokenMint(params);
        require(isValid, "PrivateERCToken: invalid proof");

        TokenModel.ElGamal memory newAllowed = TokenModel.ElGamal({
            cl_x: znValues[4],
            cl_y: znValues[5],
            cr_x: znValues[6],
            cr_y: znValues[7]
        });
        privateMinterAllowed[msg.sender] = newAllowed;
        TokenEventLib.triggerTokenMintAllowedUpdatedEvent(_l2Event, address(this), msg.sender, msg.sender, privateMinterAllowed[msg.sender], newAllowed);

        TokenModel.ElGamal memory oldTotalSupply = _privateTotalSupply;
        addSupply(supplyIncrease);
        TokenEventLib.triggerTokenSupplyUpdatedEvent(_l2Event, address(this), msg.sender, oldTotalSupply, supplyIncrease, TokenModel.ElGamal(0,0,0,0), _privateTotalSupply);

        addTokenWithBalance(to, amount);
        TokenEventLib.triggerTokenMintedEvent(_l2Event, address(this), to, amount);

        emit PrivateMint(to, amount);
        return true;
    }

    function privateBurn(bytes32[] memory consumedTokens,
        TokenModel.ElGamal memory amount,
        TokenModel.ElGamal memory consumedTokensRemainingAmount,
        TokenModel.ElGamal memory supplyDecrease,
        bytes calldata proof) external {
        require(consumedTokens.length > 0, "PrivateERCToken: consumedTokens is empty");
        require(isNotZeroElGamal(consumedTokensRemainingAmount),"PrivateERCToken: consumedTokensRemainingAmount is zero");
        require(isNotZeroElGamal(amount),  "PrivateERCToken: amount is zero");
        require(existsAll(msg.sender, consumedTokens),  "PrivateERCToken: consumedTokens does not exist");

        TokenModel.ElGamal memory consumedAmount = sumTokens(msg.sender, consumedTokens);
        TokenModel.VerifyTokenBurnParams memory params = TokenModel.VerifyTokenBurnParams({
            institutionRegistration: _institutionRegistration,
            from:msg.sender,
            consumedAmount: consumedAmount,
            amount: amount,
            remainingAmount: consumedTokensRemainingAmount,
            supplyDecrease: supplyDecrease,
//            owner: owner,
            proof: proof
        });
        (bool isValid, uint result, uint256[] memory znValues) = TokenVerificationLib.verifyTokenBurn(params);
        require(isValid, "PrivateERCToken: invalid proof");

        removeTokensWithBalance(msg.sender, consumedTokens);
        addTokenWithBalance(msg.sender, consumedTokensRemainingAmount);

        TokenModel.ElGamal memory oldTotalSupply = _privateTotalSupply;
        subSupply( supplyDecrease);

        TokenEventLib.triggerTokenSupplyUpdatedEvent(_l2Event, address(this), msg.sender, oldTotalSupply, TokenModel.ElGamal(0,0,0,0), supplyDecrease, _privateTotalSupply);
        TokenEventLib.triggerTokenBurnedEvent(_l2Event, address(this), msg.sender, consumedTokens, amount, consumedTokensRemainingAmount);

        emit PrivateBurn(msg.sender, amount);
    }

    // for debug
    function getAccountToken(address account,  TokenModel.ElGamal memory amount) external view returns (TokenModel.ElGamal memory) {
        bytes32 tokenId = hashElgamal(amount);
        TokenModel.Account storage account2 = accounts[account];
        return account2.tokens[tokenId];
    }

    // for debug
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

    function privateBalanceOf(address owner) external view returns (TokenModel.ElGamal memory) {
        return accounts[owner].balance;
    }


    function privateApprove(bytes32[] memory consumedTokens,
        address spender,
        TokenModel.Allowance memory allowance,
        TokenModel.ElGamal memory consumedTokensRemainingAmount,
        bytes calldata proof) external {
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
        TokenEventLib.triggerAllowanceReceivedEvent(_l2Event, address(this), msg.sender,spender, allowance, oldAllowance, newAllowance);

        emit PrivateApproval(msg.sender, spender, allowance);
    }

    function getAllowance(address accountAddress,address spender) internal returns (TokenModel.Allowance memory) {
        TokenModel.Account storage account = accounts[accountAddress];
        return account.allowances[spender];
    }

    function addAllowance(address accountAddress,address spender, TokenModel.Allowance memory allowance) internal {
        TokenModel.Account storage account = accounts[accountAddress];
        account.allowances[spender] = allowance;
    }

    function privateTransferFrom(
        address from,
        TokenModel.Allowance memory oldAllowance,
        TokenModel.Allowance memory newAllowance,
        address to,
        TokenModel.ElGamal memory value,
        bytes calldata proof
    ) external returns (bool) {
        require(from != address(0), "PrivateERCToken: transfer from the zero address");
        require(to != address(0), "PrivateERCToken: transfer to the zero address");
        require(isNotZeroElGamal(value), "PrivateERCToken: transfer zero value");
        require(isNotZeroAllowance(oldAllowance), "PrivateERCToken: zero allowance");
        require(existsAllowance( from,msg.sender, oldAllowance), "PrivateERCToken: allowance does not exist");
        
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
        
        (bool isValid, uint result, uint256[] memory znValues) = TokenVerificationLib.verifyTokenTransferFrom(params);
        require(isValid, "PrivateERCToken: invalid proof");

        addBalance(to, value);

        TokenModel.ElGamal memory oldRollbackAmount = backupAmount(oldAllowance);
        TokenModel.ElGamal memory newRollbackAmount = backupAmount(newAllowance);
        TokenModel.ElGamal memory spentAmount = TokenGrumpkinLib.subElGamal(oldRollbackAmount, newRollbackAmount);
        removeBalance(from, spentAmount);

        accounts[from].allowances[msg.sender] = newAllowance;

        TokenEventLib.triggerAllowanceUpdatedEvent(_l2Event, address(this), from, oldAllowance, TokenModel.ElGamal(0,0,0,0), spentAmount, newAllowance, msg.sender);
        TokenEventLib.triggerTokenReceivedEvent(_l2Event, address(this), to, value, msg.sender);

        emit PrivateTransfer(from, to, value);
        return true;
    }

    function removeBalance(address to, TokenModel.ElGamal memory amount) internal {
        accounts[to].balance = TokenGrumpkinLib.subElGamal(accounts[to].balance, amount);
        delete accounts[to].tokens[hashElgamal(amount)];
    }

    function backupAmount(TokenModel.Allowance memory allowance) internal pure returns (TokenModel.ElGamal memory) {
        return TokenModel.ElGamal({cl_x: allowance.cl_x, cl_y: allowance.cl_y, cr_x: allowance.cr2_x, cr_y: allowance.cr2_y});
    }

    function addBalance(address to, TokenModel.ElGamal memory amount) internal {
        accounts[to].balance = TokenGrumpkinLib.addElGamal(accounts[to].balance, amount);
        accounts[to].tokens[hashElgamal(amount)] = amount;
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

    function privateAllowance(address owner, address spender) external returns (TokenModel.ElGamal memory) {
        return TokenModel.ElGamal( {
        cl_x: 0,
        cl_y: 0,
        cr_x: 0,
        cr_y: 0
        });
    }

    function privateTransfer(bytes32[] memory consumedTokens,
        address to,
        TokenModel.ElGamal memory amount,
        TokenModel.ElGamal memory consumedTokensRemainingAmount,
        bytes calldata proof)
        external
        whenNotPaused
        notBlacklisted(msg.sender)
        notBlacklisted(to)
    {
        require(consumedTokens.length > 0, "PrivateERCToken: consumedTokens is empty");
        require(isNotZeroElGamal(consumedTokensRemainingAmount),"PrivateERCToken: consumedTokensRemainingAmount is zero");
        require(isNotZeroElGamal(amount),  "PrivateERCToken: amount is zero");
        require(existsAll(msg.sender, consumedTokens),  "PrivateERCToken: consumedTokens does not exist");
        TokenModel.ElGamal memory consumedAmount = sumTokens(msg.sender, consumedTokens);
        TokenModel.VerifyTokenTransferParams memory params = TokenModel.VerifyTokenTransferParams({
            institutionRegistration: _institutionRegistration,
            from:msg.sender,
            to: to,
            consumedAmount: consumedAmount,
            amount: amount,
            remainingAmount: consumedTokensRemainingAmount,
            proof: proof
        });
        (bool isValid, uint result, uint256[] memory znValues) = TokenVerificationLib.verifyTokenTransfer(params);
        require(isValid, "PrivateERCToken: invalid proof");

        removeTokensWithBalance(msg.sender, consumedTokens);
        addTokenWithBalance(msg.sender, consumedTokensRemainingAmount);
        addTokenWithBalance(to, amount);

        TokenEventLib.triggerTokenDeletedEvent(_l2Event, address(this), msg.sender, consumedTokens, consumedTokensRemainingAmount);
        TokenEventLib.triggerTokenReceivedEvent(_l2Event, address(this), to, amount, msg.sender);
        emit PrivateTransfer(msg.sender, to, amount);
    }

    function addTokenWithBalance(address to, TokenModel.ElGamal memory amount) internal {
        TokenModel.Account storage toAccount = accounts[to];
        bytes32 tokenId = hashElgamal(amount);

        toAccount.balance = TokenGrumpkinLib.addElGamal(toAccount.balance, amount);
        toAccount.tokens[tokenId] = amount;
    }

    function addToken(address to, TokenModel.ElGamal memory amount) internal {
        TokenModel.Account storage toAccount = accounts[to];
        bytes32 tokenId = hashElgamal(amount);
        toAccount.tokens[tokenId] = amount;
    }

    function removeTokensWithBalance(address to, bytes32[] memory amount) internal {
        TokenModel.Account storage toAccount = accounts[to];

        for (uint256 i = 0; i < amount.length; i++) {
            toAccount.balance = TokenGrumpkinLib.subElGamal(toAccount.balance, toAccount.tokens[amount[i]]);
            delete toAccount.tokens[amount[i]];
        }
    }

    function removeTokensWoChangeBalance(address to, bytes32[] memory amount) internal {
        TokenModel.Account storage toAccount = accounts[to];

        for (uint256 i = 0; i < amount.length; i++) {
            delete toAccount.tokens[amount[i]];
        }
    }

    function sumTokens(address account, bytes32[] memory tokens) internal view returns (TokenModel.ElGamal memory) {
        TokenModel.ElGamal memory sum = TokenModel.ElGamal(0, 0, 0, 0);
        for (uint256 i = 0; i < tokens.length; i++) {
            sum = TokenGrumpkinLib.addElGamal(sum, accounts[account].tokens[tokens[i]]);
        }
        return sum;
    }

    function existsAll(address account, bytes32[] memory tokens) internal view returns (bool) {
        for (uint256 i = 0; i < tokens.length; i++) {
            if (isZero(accounts[account].tokens[tokens[i]])) {
                return false;
            }
        }
        return true;
    }

    function isZero(TokenModel.ElGamal memory elgamal) internal pure returns (bool) {
        return elgamal.cl_x == 0 && elgamal.cl_y == 0 && elgamal.cr_x == 0 && elgamal.cr_y == 0;
    }

    function isNotZeroElGamal(TokenModel.ElGamal memory elgamal) internal pure returns (bool) {
        return elgamal.cl_x != 0 && elgamal.cl_y != 0 && elgamal.cr_x != 0 && elgamal.cr_y != 0;
    }

    function isNotZeroAllowance(TokenModel.Allowance memory allowance) internal pure returns (bool) {
        return allowance.cl_x != 0 && allowance.cl_y != 0 && allowance.cr1_x != 0 && allowance.cr1_y != 0 && allowance.cr2_x != 0 && allowance.cr2_y != 0;
    }

    function existsAllowance(address owner, address spender, TokenModel.Allowance memory allowance) internal view returns (bool) {
        return isEqualAllowance(accounts[owner].allowances[spender], allowance);
    }

    /**
 * @dev THIS FUNCTION SHOULD BELONG TO AN ELGAMAL LIBRARY
   */
    function isEqualAllowance(TokenModel.Allowance memory a, TokenModel.Allowance memory b) internal pure returns (bool) {
        return a.cl_x == b.cl_x && a.cl_y == b.cl_y && a.cr1_x == b.cr1_x && a.cr1_y == b.cr1_y && a.cr2_x == b.cr2_x && a.cr2_y == b.cr2_y;
    }

    // Compatible with FiatTokenV1 contracts
    modifier onlyMasterMinter() {
        require(
            msg.sender == masterMinter,
            "FiatToken: caller is not the masterMinter"
        );
        _;
    }

    // Compatible with FiatTokenV1 contracts
    function isMinter(address account) external view returns (bool) {
        return minters[account];
    }

    // Compatible with FiatTokenV1 contracts
    function configureMinter(address minter, TokenModel.ElGamal memory minterAllowedAmount)
    external
    whenNotPaused
    onlyMasterMinter
    returns (bool)
    {
        minters[minter] = true;
        privateMinterAllowed[minter] = minterAllowedAmount;
        return true;
    }

    // Compatible with FiatTokenV1 contracts
    function removeMinter(address minter)
    external
    onlyMasterMinter
    returns (bool)
    {
        minters[minter] = false;
        privateMinterAllowed[minter] = TokenModel.ElGamal(0, 0, 0, 0);
        return true;
    }

    // Compatible with FiatTokenV1 contracts
    function _blacklist(address _account) internal override {
        _setBlacklistState(_account, true);
    }

    // Compatible with FiatTokenV1 contracts
    function _unBlacklist(address _account) internal override {
        _setBlacklistState(_account, false);
    }

    // Compatible with FiatTokenV1 contracts
    function _setBlacklistState(address _account, bool _shouldBlacklist)
    internal
    virtual
    {
        _deprecatedBlacklisted[_account] = _shouldBlacklist;
    }

    // Compatible with FiatTokenV1 contracts
    function _isBlacklisted(address _account)
    internal
    virtual
    override
    view
    returns (bool)
    {
        return _deprecatedBlacklisted[_account];
    }
}