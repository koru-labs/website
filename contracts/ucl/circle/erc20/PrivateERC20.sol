// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {IPrivateERC20} from "./IPrivateERC20.sol";
import {FiatTokenV2_2} from "../../../usdc/v2/FiatTokenV2_2.sol";
import "./ElGamal.sol";

contract PrivateERC20 is IPrivateERC20, FiatTokenV2_2 {
    uint256 _publicTotalSupply;
    ElGamal _privateTotalSupply;
    ElGamal[] _supllyCredits;
    ElGamal[] _supllyDebits;

    address _supplyAuthority;
    mapping(address => Account) private _accounts;

    /**
     * @dev Returns the cyphered value of tokens in existence.
     */
    function privateTotalSupply() external view returns (ElGamal memory) {
        uint256 consolidatedSupply = _privateTotalSupply;
        for (uint256 i = 0; i < _supllyCredits.length; i++) {
            consolidatedSupply = addElGamal(
                consolidatedSupply,
                _supllyCredits[i]
            );
        }
        for (uint256 i = 0; i < _supllyDebits.length; i++) {
            consolidatedSupply = subtractElGamal(
                consolidatedSupply,
                _supllyDebits[i]
            );
        }
        return consolidatedSupply;
    }

    function publicTotalSupply() external view returns (uint256) {
        if (_supllyCredits.length == 0 && _supllyDebits.length == 0) {
            return _publicTotalSupply;            
        } else {
            emit TotalSupplyOutDated(_publicTotalSupply);
            return 0;
        }
    }

    function revealTotalSupply(
        ElGamal memory privateTotalSupply,
        uint256 publicTotalSupply,
        bytes calldata proof
    ) external {
        require(_supllyCredits.length + _supllyDebits.length > 2);
        require(
            verifyRevealTotalSupply(
                msg.sender,
                privateTotalSupply,
                publicTotalSupply,
                proof
            )
        );
        ElGamal memory consolidadtedSuply = _privateTotalSupply;
        // consolidate all credits
        for (uint256 i = 0; i < _supllyCredits.length; i++) {
            consolidadtedSuply = addElGamal(
                consolidadtedSuply,
                _supllyCredits[i]
            );
        }
        // consolidate all debits
        for (uint256 i = 0; i < _supllyDebits.length; i++) {
            consolidadtedSuply = subtractElGamal(
                consolidadtedSuply,
                _supllyDebits[i]
            );
        }
        // check if the consolidated supply is equal to the informed private supply
        require(isEqualElGamal(consolidadtedSuply, privateTotalSupply));
        // update supply
        _privateTotalSupply = consolidadtedSuply;
        _publicTotalSupply = publicTotalSupply;
        // clean up debits and credits
        _supllyCredits = new ElGamal[](0);
        _supllyDebits = new ElGamal[](0);
    }

    /**
     * @dev Returns the cyphered value of tokens owned by `account`.
     */
    function privateBalanceOf(
        address account
    ) external view returns (ElGamal memory) {
        uint256 accountBalance = _accounts[account].balance;
        for (uint256 i = 0; i < _accounts[account].inBox.length; i++) {
            accountbalance += _accounts[account].inBox[i];
        }
        return accountbalance;
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
    function privateMint(
        address to,
        ElGamal memory amount,
        ElGamal memory supply,
        bytes calldata proof
    )
        external
        whenNotPaused
        onlyMinters
        notBlacklisted(msg.sender)
        notBlacklisted(_to)
        returns (bool)
    {
        require(verifyMintProof(to, amount, _supplyAuthority, supply, proof)); //TODO check the minterAllowance
        _supllyCredits.push(supply);
        _accounts[to].inBox.push(amount);
        emit PrivateMint(to, amount);
        return true;
    }

    function privateTransfer(
        ElGamal memory oldBalance,
        ElGamal memory newBalance,
        address to,
        ElGamal memory value,
        bytes calldata proof
    ) external returns (bool) {
        require(
            verifyTransferProof(
                msg.sender,
                oldBalance,
                newBalance,
                to,
                value,
                proof
            )
        );
        require(updateBalance(msg.sender, oldBalance, newBalance));
        addToInbox(to, value);
        emit PrivateTransfer(msg.sender, to, value);
        return true;
    }

    function privateAllowance(
        address owner,
        address spender
    ) external view returns (Allowance memory) {
        return _accounts[owner].outBox[spender];
    }

    function privateApprove(
        address spender,
        ElGamal memory oldBalance,
        ElGamal memory newBalance,
        Allowance memory allowance,
        bytes calldata proof
    ) external returns (bool) {
        require(
            verifyAllowanceProof(
                msg.sender,
                oldBalance,
                newBalance,
                spender,
                allowance,
                proof
            )
        );
        require(updateBalance(msg.sender, oldBalance, newBalance));
        _accounts[msg.sender].outBox[spender] = allowance;
        emit PrivateApproval(msg.sender, spender, allowance);
        return true;
    }

    function privateTransferFrom(
        address from,
        Allowance oldAllowance,
        Allowance newAllowance,
        address to,
        ElGamal memory value,
        bytes calldata proof
    ) external returns (bool) {
        require(
            verifyTransferFromProof(
                msg.sender,
                from,
                oldAllowance,
                newAllowance,
                to,
                value,
                proof
            )
        );
        require(checkAllowance(msg.sender, from, oldAllowance));
        updateAllowance(msg.sender, from, oldAllowance, newAllowance);
        addToInbox(to, value);
        emit PrivateTransfer(from, to, value);
        return true;
    }

    function burn(
        ElGamal memory oldBalance,
        ElGamal memory newBalance,
        ElGamal memory supply,
        ElGamal memory supplyAmount,
        bytes calldata proof
    ) external whenNotPaused notBlacklisted(msg.sender) {
        // verify burn proof
        require(
            verifyBurnProof(
                msg.sender,
                oldBalance,
                newBalance,
                amount,
                _supplyAuthority,
                supplyAmount,
                proof
            )
        );
        // remove from balance
        require(updateBalance(msg.sender, oldBalance, newBalance));
        // remove from supply
        _supllyDebits.push(supplyAmount);
        emit PrivateBurn(msg.sender, amount);
    }

    // function decrementSupply(ElGamal memory amount) internal{
    //     // consolidate supply
    //     for (uint256 i = 0; i < _supllyCredits.length; i++) {
    //         _totalSupply = addElGamal(_totalSupply, _supllyCredits[i]);
    //     }
    //     _supllyCredits = new ElGamal[](0);
    //     _totalSupply = substractElGamal(_totalSupply, amount);
    // }

    function updateBalance(
        address account,
        ElGamal memory oldBalance,
        ElGamal memory newBalance
    ) internal returns (bool) {
        //update balance, do not touch the inbox
        if (_accounts[account].balance == oldBalance) {
            _accounts[account].balance = newBalance;
            return true;
        }

        // consolidate inbox, then update balance
        ElGamal balance = _accounts[account].balance;
        for (uint256 i = 0; i < _accounts[account].inBox.length; i++) {
            balance += _accounts[account].inBox[i];
            if (balance == oldBalance) {
                _accounts[account].inBox = shiftLeft(
                    _accounts[account].inBox,
                    i
                );
                _accounts[account].balance = newBalance;
                return true;
            }
        }
        // not possible to update balance
        return false;
    }

    function addAllowance(
        Allowance memory a,
        Allowance memory b
    ) internal pure returns (Allowance memory) {
        //TODO add the two allowances and returns the result (a+b)
    }

    function addElGamal(
        ElGamal memory a,
        ElGamal memory b
    ) internal pure returns (Elgmal memory) {
        //TODO add the two elgamal and returns the result (a+b)
    }

    function substractElGamal(
        ElGamal memory a,
        ElGamal memory b
    ) internal pure returns (Elgmal memory) {
        //TODO substract b from a and returns the result (a-b)
    }

    function isEqualElGamal(
        ElGamal memory a,
        ElGamal memory b
    ) internal pure returns (bool) {
        //TODO returns true if a == b
    }

    function shiftLeft(
        ElGamal[] memory oldArray,
        uint256 shift
    ) internal returns (ElGamal[] memory) {
        require(shift < oldArray.length);
        ElGamal[] memory newArray = new ElGamal[](array.length - shift);
        for (uint256 i = 0; i < newArray.length; i++) {
            newArray[i] = oldArray[i + shift];
        }
        return newArray;
    }
}
