// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Crypto} from './ElGamal.sol';

interface IPrivateERC20 {
  /**
   * @dev Emitted when `value` tokens are moved from one account (`from`) to
   * another (`to`).
   *
   * Note that `value` may be zero.
   */
  event PrivateTransfer(address indexed from, address indexed to, Crypto.ElGamal value);
  /**
   * @dev Emitted when `value` tokens are moved from one account (`from`) to
   * another (`to`).
   *
   * Note that `value` may be zero.
   */
  event TotalSupplyOutdated(uint256 value);

  /**
   * @dev Emitted when `value` tokens are moved from one account (`from`) to
   * another (`to`).
   *
   * Note that `value` may be zero.
   */
  event PrivateMint(address indexed from, Crypto.ElGamal value);

  /**
   * @dev Emitted when `value` tokens are moved from one account (`from`) to
   * another (`to`).
   *
   * Note that `value` may be zero.
   */
  event PrivateBurn(address indexed from, Crypto.ElGamal value);

  /**
   * @dev Emitted when the allowance of a `spender` for an `owner` is set by
   * a call to {approve}. `value` is the new allowance.
   */
  event PrivateApproval(address indexed owner, address indexed spender, Crypto.Allowance value);

  /**
   * @dev Emitted when someone tries to read the total supply and it is outdated.
   */
  event TotalSupplyOutdated(Crypto.ElGamal value);

  /**
   * @dev Emitted when the total supply is revealed.
   */
  event TotalSupplyRevealed(uint256 value);

  /**
   * @dev Returns the cyphered value of tokens in existence.
   */
  function privateTotalSupply() external view returns (Crypto.ElGamal memory);

  /**
   * @dev Reveal the total supply.
   */
  function revealTotalSupply(uint256 publicTotalSupply, bytes calldata proof) external;

  /**
   * @dev Returns the cyphered value of tokens owned by `account`.
   */
  function privateBalanceOf(address account) external view returns (Crypto.ElGamal memory);

  /**
   * @notice Mints private fiat tokens to an address and updates the total supply.
   * @param to The address that will receive the minted tokens.
   * @param amount The amount of tokens to mint. Must be less than or equal
   * to the minterAllowance of the caller.
   * @param supply The amount of tokens to increment in total suplly.
   * @param proof The proof.
   * @return True if the operation was successful.
   */
  function privateMint(address to, Crypto.ElGamal memory amount, Crypto.ElGamal memory supply, bytes calldata proof) external returns (bool);

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
    Crypto.ElGamal memory amount,
    Crypto.ElGamal memory consumedTokensRemainingAmount,
    bytes calldata proof
  ) external returns (bool);

  /**
   * @dev Returns the remaining number of tokens that `spender` will be
   * allowed to spend on behalf of `owner` through {transferFrom}. This is
   * zero by default.
   *
   * This value changes when {privateApprove} or {privateTransferFrom} are called.
   */
  function privateAllowance(address owner, address spender) external view returns (Crypto.Allowance memory);

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
  function privateApprove(
    bytes32[] memory consumedTokens,
    Crypto.ElGamal memory consumedTokensRemainingAmount,
    address spender,
    Crypto.Allowance memory allowance,
    bytes calldata proof
  ) external returns (bool);

  /**
   * @dev Moves a private `value` amount of tokens from `from` to `to` using the private
   * allowance mechanism. `value` is then deducted from the caller's
   * allowance.
   *
   * Returns a boolean value indicating whether the operation succeeded.
   *
   * Emits a {PrivateTransfer} event.
   */
  function privateTransferFrom(
    address from,
    Crypto.Allowance memory oldAllowance,
    Crypto.Allowance memory newAllowance,
    address to,
    Crypto.ElGamal memory value,
    bytes calldata proof
  ) external returns (bool);
}
