// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./InstitutionRegistration.sol";
import "../event/IL2Event.sol";
import "../model/TokenModel.sol";
import "../lib/TokenEventLib.sol";
import "./IPrivateERCToken.sol";
import "../lib/TokenVerificationLib.sol";
import {TokenOperationsLib} from "../lib/TokenOperationsLib.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract PrivateERCToken is IPrivateERCToken, Pausable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant BANK_ROLE = keccak256("BANK_ROLE");

    InstitutionRegistration private _institutionRegistration;
    IL2Event _l2Event;
    address scOwner;// For example, it's circle
    mapping(address=>TokenModel.Account) accountTokens;
    mapping(address=>TokenModel.Account2) accounts;
    uint256 public privateTotalSupply;
    TokenModel.ElGamal _privateTotalSupply;
    uint256 _numberOfTotalSupplyChanges;

    mapping(address => bool) public isInstitutionAccount;
    mapping(address => bool) public blacklisted;
    
    mapping(address => TokenModel.ElGamal) public privateMinterAllowed;

    constructor(TokenModel.TokenSCTypeEnum tokenSCType,IL2Event l2Event, InstitutionRegistration institutionRegistration) {
        scOwner = msg.sender;
        _l2Event = l2Event;
        _institutionRegistration = institutionRegistration;

        TokenEventLib.triggerTokenSCCreatedEvent(_l2Event, address(this), msg.sender, tokenSCType);
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(BANK_ROLE, msg.sender);
    }
    
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    function addToBlacklist(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        blacklisted[account] = true;
    }
    
    function removeFromBlacklist(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        blacklisted[account] = false;
    }
    
    function addInstitutionAccount(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        isInstitutionAccount[account] = true;
        _grantRole(BANK_ROLE, account);
    }

    function removeInstitutionAccount(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        isInstitutionAccount[account] = false;
        _revokeRole(BANK_ROLE, account);
    }
    
  
    function setInstitutionAllowance(address institution, TokenModel.ElGamal calldata allowanceAmount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(isInstitutionAccount[institution], "PrivateERCToken: address is not a institution account");
        privateMinterAllowed[institution] = allowanceAmount;
    }
    
    function removeInstitutionAllowance(address institution) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(isInstitutionAccount[institution], "PrivateERCToken: address is not a institution account");
        delete privateMinterAllowed[institution];
    }
    
    modifier notBlacklisted(address account) {
        require(!blacklisted[account], "PrivateERCToken: account is blacklisted");
        _;
    }
    
    modifier onlyInstitutionAccount() {
        require(hasRole(BANK_ROLE, msg.sender), "PrivateERCToken: caller is not a institution account");
        _;
    }
    
    modifier onlySCOwner() {
        require(msg.sender == scOwner, "PrivateERCToken: caller is not the owner");
        _;
    }

    /**
     * @notice Mints private fiat tokens to an address and updates the total supply.
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
        onlyRole(MINTER_ROLE)
        notBlacklisted(msg.sender)
        notBlacklisted(to) 
        onlyInstitutionAccount
        returns (bool)
    {
        require(to != address(0), "PrivateERCToken: mint to the zero address");

        TokenModel.VerifyTokenMintParams memory params = TokenModel.VerifyTokenMintParams({
            institutionRegistration: _institutionRegistration,
            minter: msg.sender,
            to: to,
            scOwner: scOwner,
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

        addSupply(supplyIncrease);
        TokenEventLib.triggerTokenSupplyUpdatedEvent(_l2Event, address(this), msg.sender, _privateTotalSupply, supplyIncrease, TokenModel.ElGamal(0,0,0,0), TokenGrumpkinLib.addElGamal(_privateTotalSupply, supplyIncrease));

        addTokenWithBalance(to, amount);
        TokenEventLib.triggerTokenMintedEvent(_l2Event, address(this), to, amount, msg.sender);

        return true;
    }

    // for debug
    function getAccountToken(address account,  TokenModel.ElGamal memory amount) external view returns (TokenModel.ElGamal memory) {
        bytes32 tokenId = hashElgamal(amount);
        TokenModel.Account2 storage account2 = accounts[account];
        return account2.tokens[tokenId];
    }

    // for debug
    function getAccountAllowance(address account, address spender) external view returns (TokenModel.Allowance memory) {
        TokenModel.Account2 storage account2 = accounts[account];
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

    function hashElgamal(TokenModel.ElGamal memory elgamal) internal pure returns (bytes32) {
        return keccak256(abi.encode(elgamal));
    }


    function privateSetTotalSupply(uint256 totalSupply) onlySCOwner external {
        privateTotalSupply = totalSupply;
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

        removeTokensWoChangeBalance(msg.sender, consumedTokens);
        returnUnspentAllowance(msg.sender, spender);
        addToken(msg.sender, consumedTokensRemainingAmount);
        addAllowance(msg.sender,spender, allowance);

    }

    function addAllowance(address account,address spender, TokenModel.Allowance memory allowance) internal {
        TokenModel.Account2 storage account = accounts[account];
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

        // TODO:event
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
        TokenModel.Account2 storage account = accounts[accountAddress];
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
    
    function getInstitutionAllowance(address institution) external view returns (TokenModel.ElGamal memory) {
        require(isInstitutionAccount[institution], "PrivateERCToken: address is not a institution account");
        return privateMinterAllowed[institution];
    }

    function getAccountTokenEntity(address owner, uint256 tokenId) external view returns (TokenModel.TokenEntity memory) {
        return accountTokens[owner].tokens[tokenId];
    }

    function privateTransfer(bytes32[] memory consumedTokens,
        address to,
        TokenModel.ElGamal memory amount,
        TokenModel.ElGamal memory consumedTokensRemainingAmount,
        bytes calldata proof) external {
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
        // TODO: Event
    }

    function privateBurn(bytes32[] memory consumedTokens,
        TokenModel.ElGamal memory amount,
        TokenModel.ElGamal memory consumedTokensRemainingAmount,
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
            proof: proof
        });
        (bool isValid, uint result, uint256[] memory znValues) = TokenVerificationLib.verifyTokenBurn(params);
        require(isValid, "PrivateERCToken: invalid proof");

        removeTokensWithBalance(msg.sender, consumedTokens);
        addTokenWithBalance(msg.sender, consumedTokensRemainingAmount);
        // TODO: Event
    }


    function addTokenWithBalance(address to, TokenModel.ElGamal memory amount) internal {
        TokenModel.Account2 storage toAccount = accounts[to];
        bytes32 tokenId = hashElgamal(amount);

        toAccount.balance = TokenGrumpkinLib.addElGamal(toAccount.balance, amount);
        toAccount.tokens[tokenId] = amount;
    }

    function addToken(address to, TokenModel.ElGamal memory amount) internal {
        TokenModel.Account2 storage toAccount = accounts[to];
        bytes32 tokenId = hashElgamal(amount);
        toAccount.tokens[tokenId] = amount;
    }

    function removeTokensWithBalance(address to, bytes32[] memory amount) internal {
        TokenModel.Account2 storage toAccount = accounts[to];

        for (uint256 i = 0; i < amount.length; i++) {
            toAccount.balance = TokenGrumpkinLib.subElGamal(toAccount.balance, toAccount.tokens[amount[i]]);
            delete toAccount.tokens[amount[i]];
        }
    }

    function subTokens(TokenModel.ElGamal memory amount,TokenModel.ElGamal memory amount1) external view returns (TokenModel.ElGamal memory) {
        return TokenGrumpkinLib.subElGamal(amount, amount1);
    }

    function addTokens(TokenModel.ElGamal memory amount,TokenModel.ElGamal memory amount1) external view returns (TokenModel.ElGamal memory) {
        return TokenGrumpkinLib.addElGamal(amount, amount1);
    }


    function removeTokensWoChangeBalance(address to, bytes32[] memory amount) internal {
        TokenModel.Account2 storage toAccount = accounts[to];

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
}