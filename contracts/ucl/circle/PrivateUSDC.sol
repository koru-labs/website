// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./base/PrivateERCToken.sol";
import "../../usdc/v2/FiatTokenV2.sol";


/**
 * @title PrivateUSDC
 * @dev Implementation of the private USDC token with conversion functionality
 */
contract PrivateUSDC is PrivateERCToken, FiatTokenV2 {
    
    /**
     * @dev Initializes the PrivateUSDC contract
     */
    function initialize(
        string memory tokenName,
        string memory tokenSymbol,
        string memory tokenCurrency,
        uint8 tokenDecimals,
        address newMasterMinter,
        address newPauser,
        address newBlacklister,
        address newOwner,
        IL2Event l2Event,
        InstitutionUserRegistry institutionRegistration
    ) external {
        initialize(tokenName, tokenSymbol, tokenCurrency, tokenDecimals, newMasterMinter, newPauser, newBlacklister, newOwner);
        initialize_hamsa(TokenModel.TokenSCTypeEnum.ERC20, l2Event, institutionRegistration, tokenName, tokenSymbol, tokenDecimals, newOwner);
        institutionRegistration.registerInstitutionToken(newOwner);
    }

    /**
     * @dev Hook implementation for updating public USDC token balance
     * @param account The account to update
     * @param amount The amount to update
     * @param isConvertToPrivate True if converting to private, false if converting to public
     */
    function _updatePublicTokenBalance(address account, uint256 amount, bool isConvertToPrivate) internal override {
        if (isConvertToPrivate) {
            // check balance
            require(amount <= _balanceOf(account), "Insufficient amount");

            // Converting to private: decrease public balance
            totalSupply_ -= amount;
            _setBalance(account, _balanceOf(account) - amount);
            emit Transfer(account, address(0), amount);
        } else {
            // Converting to public: increase public balance
            totalSupply_ += amount;
            _setBalance(account, _balanceOf(account) + amount);
            emit Transfer(address(0), account, amount);
        }
    }
}
