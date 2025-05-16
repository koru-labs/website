// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {IPrivateERC20} from './IPrivateERC20.sol';
import {FiatTokenV2_2} from '../usdc/v2/FiatTokenV2_2.sol';
import {Crypto} from './ElGamal.sol';

////////////////////////////////
// THIS CONTRACT IS A GUIDANCE
// FOR THE UCL PRIVATE DEV
// PROJECT, IT IS NOT FINAL YET.
////////////////////////////////

/**
 * @title PrivateERC20
 * @author Aldenio
 * @notice This contract implements a private ERC20 token.
 */
contract PrivateERC20 is IPrivateERC20 {
  struct Account {
    Crypto.ElGamal balance;
    mapping(bytes32 => Crypto.ElGamal) tokens;
    mapping(address => Crypto.Allowance) allowances;
  }

  // suplly related fields
  address _supplyAuthority;
  uint256 _publicTotalSupply;
  Crypto.ElGamal _privateTotalSupply;
  uint256 _numberOfTotalSupplyChanges;

  // private accounts
  mapping(address => Account) private _accounts;

  /**
   * @dev Returns the cyphered value of tokens in existence.
   */
  function privateTotalSupply() external view returns (Crypto.ElGamal memory) {
    Crypto.ElGamal memory consolidatedSupply = _privateTotalSupply;
    return consolidatedSupply;
  }

  function publicTotalSupply() external view returns (uint256, bool) {
    return (_publicTotalSupply, _numberOfTotalSupplyChanges == 0);
  }

  function revealTotalSupply(uint256 publicTotalSupply, bytes calldata proof) external {
    // this check is required to guarantee minters' and burners' privacy
    require(_numberOfTotalSupplyChanges > 2);
    require(verifyRevealTotalSupply(msg.sender, _privateTotalSupply, publicTotalSupply, proof));
    // update supply
    _publicTotalSupply = publicTotalSupply;
    // reset number of changes
    _numberOfTotalSupplyChanges = 0;
    // emit event
    emit TotalSupplyRevealed(publicTotalSupply);
  }

  /**
   * @dev Returns the cyphered value of tokens owned by `account`.
   */
  function privateBalanceOf(address account) external view returns (Crypto.ElGamal memory) {
    return _accounts[account].balance;
  }

  /**
   * @dev THIS FUNCTION IS HERE JUST TO DOCUMENT THE CHECKS THAT THE ZK CIRCUIT SHOULD PERFORM.
   * @dev The zk circuit should verify this:
   * @dev verify if "oldBalance" elgamal is a valid elgamal
   * @dev verify if "newBalance" elgamal is a valid elgamal
   * @dev verify if the "newBalance"'s Elgamal cyphered value plus the "amount"'s Elgamal cyphered value equals the "oldBalance"'s Elgamal cyphered value
   * @dev verify if the "from" address is the address of the public key inside "oldBalance" elgamal
   * @dev verify if the "from" address is the address of the public key inside "newBalance" elgamal
   * @dev verify if the "to" address is the address of the public key inside "amount" elgamal
   */
  function verifyRevealTotalSupply(
    address from,
    Crypto.ElGamal memory privateTotalSupply,
    uint256 publicTotalSupply,
    bytes calldata proof
  ) internal view returns (bool) {
    //THIS FUNCTION WILL NOT EXIST IN THE FINAL CONTRACT
    //TODO remove this function and use the zk circuit verifier contract instead.
    return true;
  }

  /**
   * @notice Mints private fiat tokens to an address and updates the total supply.
   * @param to The address that will receive the minted tokens.
   * @param amount The amount of tokens to mint. Must be less than or equal
   * to the minterAllowance of the caller.
   * @param supply The amount of tokens to increment in total suplly.
   * @param proof The proof.
   * @return True if the operation was successful.
   */
  function privateMint(address to, Crypto.ElGamal memory amount, Crypto.ElGamal memory supply, bytes calldata proof) external returns (bool) {
    require(verifyMintProof(to, amount, _supplyAuthority, supply, proof)); //TODO check the minterAllowance
    addSupply(supply);
    addBalance(to, amount);
    emit PrivateMint(to, amount);
    return true;
  }

  /**
   * @notice Adds a balance to an address.
   * @param to The address that will receive the balance.
   * @param amount The amount to add to the balance.
   */
  function addBalance(address to, Crypto.ElGamal memory amount) internal {
    _accounts[to].balance = addElGamal(_accounts[to].balance, amount);
    _accounts[to].tokens[hashElgamal(amount)] = amount;
  }

  function removeBalance(address to, Crypto.ElGamal memory amount) internal {
    _accounts[to].balance = substractElGamal(_accounts[to].balance, amount);
    delete _accounts[to].tokens[hashElgamal(amount)];
  }

  /**
   * @notice Adds a supply to the total supply.
   * @param supply The amount of tokens to add to the total supply.
   */
  function addSupply(Crypto.ElGamal memory supply) internal {
    _privateTotalSupply = addElGamal(_privateTotalSupply, supply);
    _numberOfTotalSupplyChanges++;
  }

  /**
   * @dev THIS FUNCTION IS HERE JUST TO DOCUMENT THE CHECKS THAT THE ZK CIRCUIT SHOULD PERFORM.
   * @dev The zk circuit should verify this:
   * @dev verify that supply elgamal is a valid elgamal
   * @dev verify that amount elgamal is a valid elgamal
   * @dev verify that the amount and the supply elgamals have the same value
   * @dev verify that the "_supplyAuthority" address is the address of the public key inside supply elgamal
   * @dev verify that the "to" address is the address of the public key inside amount elgamal
   */
  function verifyMintProof(
    address to,
    Crypto.ElGamal memory amount,
    address minter,
    Crypto.ElGamal memory supply,
    bytes calldata proof
  ) internal view returns (bool) {
    //THIS FUNCTION WILL NOT EXIST IN THE FINAL CONTRACT
    //TODO remove this function and use the zk circuit verifier contract instead.
    return true;
  }

  function privateTransfer(
    bytes32[] memory consumedTokens,
    address to,
    Crypto.ElGamal memory amount,
    Crypto.ElGamal memory consumedTokensRemainingAmount,
    bytes calldata proof
  ) external returns (bool) {
    require(consumedTokens.length > 0);
    require(isNotZero(consumedTokensRemainingAmount));
    require(isNotZero(amount));
    require(existsAll(msg.sender, consumedTokens));
    Crypto.ElGamal memory consumedAmount = sumTokens(msg.sender, consumedTokens);
    require(verifyTransferProof(msg.sender, consumedAmount, consumedTokensRemainingAmount, to, amount, proof));
    removeBalance(msg.sender, consumedAmount);
    addBalance(to, amount);
    emit PrivateTransfer(msg.sender, to, amount);
    return true;
  }

  function existsAll(address account, bytes32[] memory tokens) internal view returns (bool) {
    for (uint256 i = 0; i < tokens.length; i++) {
      if (isZero(_accounts[account].tokens[tokens[i]])) {
        return false;
      }
    }
    return true;
  }

  function sumTokens(address account, bytes32[] memory tokens) internal view returns (Crypto.ElGamal memory) {
    Crypto.ElGamal memory sum = Crypto.ElGamal(0, 0, 0, 0);
    for (uint256 i = 0; i < tokens.length; i++) {
      sum = addElGamal(sum, _accounts[account].tokens[tokens[i]]);
    }
    return sum;
  }

  /**
   * @dev THIS FUNCTION IS HERE JUST TO DOCUMENT THE CHECKS THAT THE ZK CIRCUIT SHOULD PERFORM.
   * @dev The zk circuit should verify this:
   * @dev verify if "oldBalance" elgamal is a valid elgamal
   * @dev verify if "newBalance" elgamal is a valid elgamal
   * @dev verify if the "newBalance"'s Elgamal cyphered value plus the "amount"'s Elgamal cyphered value equals the "oldBalance"'s Elgamal cyphered value
   * @dev verify if the "from" address is the address of the public key inside "oldBalance" elgamal
   * @dev verify if the "from" address is the address of the public key inside "newBalance" elgamal
   * @dev verify if the "to" address is the address of the public key inside "amount" elgamal
   */
  function verifyTransferProof(
    address from,
    Crypto.ElGamal memory oldBalance,
    Crypto.ElGamal memory newBalance,
    address to,
    Crypto.ElGamal memory amount,
    bytes calldata proof
  ) internal view returns (bool) {
    //THIS FUNCTION WILL NOT EXIST IN THE FINAL CONTRACT
    //TODO remove this function and use the zk circuit verifier contract instead.
    return true;
  }

  function privateAllowance(address owner, address spender) external view returns (Crypto.Allowance memory) {
    return _accounts[owner].allowances[spender];
  }

  function privateApprove(
    bytes32[] memory consumedTokens,
    Crypto.ElGamal memory consumedTokensRemainingAmount,
    address spender,
    Crypto.Allowance memory allowance,
    bytes calldata proof
  ) external returns (bool) {
    require(consumedTokens.length > 0);
    require(isNotZero(consumedTokensRemainingAmount));
    require(isNotZero(allowance));
    require(existsAll(msg.sender, consumedTokens));
    require(spender != address(0));
    Crypto.ElGamal memory consumedAmount = sumTokens(msg.sender, consumedTokens);
    require(verifyAllowanceProof(msg.sender, consumedAmount, consumedTokensRemainingAmount, spender, allowance, proof));
    _accounts[msg.sender].allowances[spender] = allowance;
    emit PrivateApproval(msg.sender, spender, allowance);
    return true;
  }

  /**
   * @dev THIS FUNCTION IS HERE JUST TO DOCUMENT THE CHECKS THAT THE ZK CIRCUIT SHOULD PERFORM.
   * @dev The zk circuit should verify this:
   * @dev verify if "consumedAmount" elgamal is a valid elgamal
   * @dev verify if "consumedTokensRemainingAmount" elgamal is a valid elgamal
   * @dev verify if the "consumedTokensRemainingAmount"'s Elgamal cyphered value plus the "allowance"'s Elgamal cyphered value equals the "consumedAmount"'s Elgamal cyphered value
   * @dev verify if the "from" address is the address of the public key inside "consumedAmount" elgamal
   * @dev verify if the "from" address is the address of the public key inside "consumedTokensRemainingAmount" elgamal
   * @dev verify if the "spender" address is the address of the public key inside "allowance" elgamal
   */
  function verifyAllowanceProof(
    address from,
    Crypto.ElGamal memory consumedAmount,
    Crypto.ElGamal memory consumedTokensRemainingAmount,
    address spender,
    Crypto.Allowance memory allowance,
    bytes calldata proof
  ) internal view returns (bool) {
    //THIS FUNCTION WILL NOT EXIST IN THE FINAL CONTRACT
    //TODO remove this function and use the zk circuit verifier contract instead.
    return true;
  }

  function privateTransferFrom(
    address from,
    Crypto.Allowance memory oldAllowance,
    Crypto.Allowance memory newAllowance,
    address to,
    Crypto.ElGamal memory value,
    bytes calldata proof
  ) external returns (bool) {
    require(from != address(0));
    require(to != address(0));
    require(isNotZero(value));
    require(isNotZero(oldAllowance));
    require(verifyTransferFromProof(from, msg.sender, oldAllowance, newAllowance, to, value, proof));
    require(existsAllowance(msg.sender, from, oldAllowance));
    addBalance(to, value);
    Crypto.ElGamal memory valueExpended = substractElGamal(Crypto.amount(oldAllowance), Crypto.amount(newAllowance));
    removeBalance(from, valueExpended);
    _accounts[from].allowances[msg.sender] = newAllowance;

    emit PrivateTransfer(from, to, value);
    return true;
  }

  /**
   * @dev THIS FUNCTION IS HERE JUST TO DOCUMENT THE CHECKS THAT THE ZK CIRCUIT SHOULD PERFORM.
   * @dev The zk circuit should verify this:
   * @dev verify if "newAllowance" is a valid allowance
   * @dev verify if "newAllowance.amount" belongs to "to"
   * @dev verify if "newAllowance.backup" belongs to "from"
   * @dev verify if "newAllowance.amount" cyphered value equals the "oldAllowance.backup" cyphered value
   * @dev verify if "value" is a valid ElGamal
   * @dev verify if the "to" address is the address of the public key inside "value" elgamal
   * @dev verify if the "newAllowance"'s Elgamal cyphered value plus the "value"'s Elgamal cyphered value equals the "oldAllowance"'s Elgamal cyphered value
   */
  function verifyTransferFromProof(
    address from,
    address spender,
    Crypto.Allowance memory oldAllowance,
    Crypto.Allowance memory newAllowance,
    address to,
    Crypto.ElGamal memory value,
    bytes calldata proof
  ) internal view returns (bool) {
    //THIS FUNCTION WILL NOT EXIST IN THE FINAL CONTRACT
    //TODO remove this function and use the zk circuit verifier contract instead.
    return true;
  }


  function burn(
    Crypto.ElGamal memory oldBalance,
    Crypto.ElGamal memory newBalance,
    Crypto.ElGamal memory amount,
    Crypto.ElGamal memory supplyAmount,
    bytes calldata proof
  ) external {
    require(verifyBurnProof(msg.sender, oldBalance, newBalance, amount, _supplyAuthority, supplyAmount, proof));
    _privateTotalSupply = substractElGamal(_privateTotalSupply, supplyAmount);
    emit PrivateBurn(msg.sender, amount);
  }

  /**
   * @dev THIS FUNCTION IS HERE JUST TO DOCUMENT THE CHECKS THAT THE ZK CIRCUIT SHOULD PERFORM.
   * @dev The zk circuit should verify this:
   * @dev verify if "oldBalance" elgamal is a valid elgamal
   * @dev verify if "newBalance" elgamal is a valid elgamal
   * @dev verify if "amount" elgamal is a valid elgamal
   * @dev verify if "supplyAmount" elgamal is a valid elgamal
   * @dev verify if the "from" address is the address of the public key inside "oldBalance" elgamal
   * @dev verify if the "from" address is the address of the public key inside "newBalance" elgamal
   * @dev verify if the "from" address is the address of the public key inside "amount" elgamal
   * @dev verify if the "supplyAuthority" address is the address of the public key inside "supplyAmount" elgamal
   * @dev verify if the "supplyAmount"'s Elgamal cyphered value equals the "amount"'s Elgamal cyphered value
   * @dev verify if the "newBalance"'s Elgamal cyphered value plus the "amount"'s Elgamal cyphered value equals the "oldBalance"'s Elgamal cyphered value
   */
  function verifyBurnProof(
    address from,
    Crypto.ElGamal memory oldBalance,
    Crypto.ElGamal memory newBalance,
    Crypto.ElGamal memory amount,
    address supplyAuthority,
    Crypto.ElGamal memory supplyAmount,
    bytes calldata proof
  ) internal view returns (bool) {
    //THIS FUNCTION WILL NOT EXIST IN THE FINAL CONTRACT
    //TODO remove this function and use the zk circuit verifier contract instead.
    return true;
  }
  /**
   * @dev THIS FUNCTION SHOULD BELONG TO AN ELGAMAL LIBRARY
   */
  function isZero(Crypto.ElGamal memory elgamal) internal pure returns (bool) {
    return elgamal.cl_x == 0 && elgamal.cl_y == 0 && elgamal.cr_x == 0 && elgamal.cr_y == 0;
  }

  /**
   * @dev THIS FUNCTION SHOULD BELONG TO AN ELGAMAL LIBRARY
   */
  function isNotZero(Crypto.ElGamal memory elgamal) internal pure returns (bool) {
    return elgamal.cl_x != 0 || elgamal.cl_y != 0 || elgamal.cr_x != 0 || elgamal.cr_y != 0;
  }
  /**
   * @dev THIS FUNCTION SHOULD BELONG TO AN ELGAMAL LIBRARY
   */
  function isNotZero(Crypto.Allowance memory allowance) internal pure returns (bool) {
    return allowance.cl_x != 0 || allowance.cl_y != 0 || allowance.cr1_x != 0 || allowance.cr1_y != 0 || allowance.cr2_x != 0 || allowance.cr2_y != 0;
  }

  /**
   * @dev THIS FUNCTION SHOULD BELONG TO AN ELGAMAL LIBRARY
   */
  function isEqualAllowance(Crypto.Allowance memory a, Crypto.Allowance memory b) internal pure returns (bool) {
    return a.cl_x == b.cl_x && a.cl_y == b.cl_y && a.cr1_x == b.cr1_x && a.cr1_y == b.cr1_y && a.cr2_x == b.cr2_x && a.cr2_y == b.cr2_y;
  }

  /**
   * @dev THIS FUNCTION SHOULD BELONG TO AN ELGAMAL LIBRARY
   */
  function addAllowance(Crypto.Allowance memory a, Crypto.Allowance memory b) internal pure returns (Crypto.Allowance memory) {
    //TODO add the two allowances and returns the result (a+b)
  }

  function existsAllowance(address owner, address spender, Crypto.Allowance memory allowance) internal view returns (bool) {
    return isEqualAllowance(_accounts[owner].allowances[spender], allowance);
  }

  /**
   * @dev THIS FUNCTION SHOULD BELONG TO AN ELGAMAL LIBRARY
   */
  function hashElgamal(Crypto.ElGamal memory elgamal) internal pure returns (bytes32) {
    //return the keccak256 of the elgamal
  }

  /**
   * @dev THIS FUNCTION SHOULD BELONG TO AN ELGAMAL LIBRARY
   */
  function addElGamal(Crypto.ElGamal memory a, Crypto.ElGamal memory b) internal pure returns (Crypto.ElGamal memory) {
    //TODO add the two elgamal and returns the result (a+b)
  }

  /**
   * @dev THIS FUNCTION SHOULD BELONG TO AN ELGAMAL LIBRARY
   */
  function substractElGamal(Crypto.ElGamal memory a, Crypto.ElGamal memory b) internal pure returns (Crypto.ElGamal memory) {
    //TODO substract b from a and returns the result (a-b)
  }

  /**
   * @dev THIS FUNCTION SHOULD BELONG TO AN ELGAMAL LIBRARY
   */
  function isEqualElGamal(Crypto.ElGamal memory a, Crypto.ElGamal memory b) internal pure returns (bool) {
    return a.cl_x == b.cl_x && a.cl_y == b.cl_y && a.cr_x == b.cr_x && a.cr_y == b.cr_y;
  }

  /**
   * @dev THIS FUNCTION may or may not BELONG TO AN ELGAMAL LIBRARY, this is a style decision.
   */
  function shiftLeft(Crypto.ElGamal[] memory oldArray, uint256 shift) internal returns (Crypto.ElGamal[] memory) {
    require(shift < oldArray.length);
    Crypto.ElGamal[] memory newArray = new Crypto.ElGamal[](oldArray.length - shift);
    for (uint256 i = 0; i < newArray.length; i++) {
      newArray[i] = oldArray[i + shift];
    }
    return newArray;
  }
}
