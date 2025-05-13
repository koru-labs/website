pragma solidity ^0.8.0;


import {IPrivateERC20}  from   "./IPrivateERC20.sol";
import {FiatTokenV2_2} from "../../../usdc/v2/FiatTokenV2_2.sol"; 

contract PrivateERC20 is IPrivateERC20, FiatTokenV2_2 {
   
    struct Account {
        ElGamal balance;
        ElGamal[] inBox;
        mapping(address => Allowance) outBox;
    }    
    struct Allowance {
        ElGamal amount;
        ElGamal backup;        
    }
    
    ElGamal _totalSupply;
    ElGamal[] _suplyInBox;
    address _supplyAuthority;
    mapping(address => Account) private _accounts;

    /**
     * @dev Returns the value of tokens in existence.
     */
    function privateTotalSupply() external view returns (ElGamal){ 
        uint256 totalSupply = _totalSupply;
        for (uint256 i = 0; i < _suplyInBox.length; i++) {
            totalSupply += _suplyInBox[i];  
        }
        return totalSupply;    
    }

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function privateBalanceOf(address account) external view returns (ElGamal){
        uint256 accountBalance = _accounts[account].balance;
        for (uint256 i = 0; i < _accounts[account].inBox.length; i++) {
            accountbalance += _accounts[account].inBox[i];  
        }
        return accountbalance;    
    }
    
    /**
     * @notice Mints fiat tokens to an address.
     * @param to The address that will receive the minted tokens.
     * @param amount The amount of tokens to mint. Must be less than or equal
     * to the minterAllowance of the caller.
     * @param supply The amount of tokens to increment in total suplly.
     * @param proof The proof.
     * @return True if the operation was successful.
     */
    function privateMint(address to, ElGamal amount, ElGamal supply, bytes calldata proof) 
        external
        whenNotPaused
        onlyMinters
        notBlacklisted(msg.sender)
        notBlacklisted(_to) 
        returns (bool) 
    {
        require(verifyMintProof(to, amount, _supplyAuthority, supply, proof));
        _suplyInBox.push(supply);
        _accounts[to].inBox.push(amount);
        return true;
    }

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {PrivateTransfer} event.
     */
    function privateTransfer(address to, ElGamal oldBalance, ElGamal newBalance, ElGamal value, bytes calldata proof)
        external 
        returns (bool)
    {
        require(verifyTransferProof(msg.sender, oldBalance, newBalance, to, value, proof));
        require(checkBalance(msg.sender, oldBalance));
        consolidateBalance(msg.sender, oldBalance);
        updateBalance(msg.sender, oldBalance, newBalance);
        addToInbox(to, value);
        return true;
    }

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (ElGamal){
        return _accounts[owner].outBox[spender].amount;
    }

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {PrivateApproval} event.
     */
    function approve(address spender, ElGamal oldBalance, ElGamal newBalance, Allowance allowance, bytes calldata proof) 
        external 
        returns (bool)
    {
        require(verifyAllowanceProof(msg.sender, oldBalance, newBalance, spender, allowance, proof));
        require(checkBalance(msg.sender, oldBalance));
        consolidateBalance(msg.sender, oldBalance);
        updateBalance(msg.sender, oldBalance, newBalance);
        _accounts[msg.sender].outBox[spender] += allowance;
        return true;
    }

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {PrivateTransfer} event.
     */
    function transferFrom(address from,  Allowance oldAllowance, Allowance newAllowance, address to, ElGamal value, bytes calldata proof) 
        external 
        returns (bool)
    {
        require(verifyTransferFromProof(msg.sender, from, oldAllowance, newAllowance, to, value, proof));
        require(checkAllowance(msg.sender, from, oldAllowance));
        updateAllowance(msg.sender, from, oldAllowance, newAllowance);
        addToInbox(to, value);
        return true;
    }
}