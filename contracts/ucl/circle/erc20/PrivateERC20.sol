// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {IPrivateERC20} from "./IPrivateERC20.sol";
import {FiatTokenV2_2} from "../../../usdc/v2/FiatTokenV2_2.sol";
import "./ElGamal.sol";

contract PrivateERC20 is IPrivateERC20, FiatTokenV2_2 {
    ElGamal _totalSupply;
    ElGamal[] _suplyInBox;
    address _supplyAuthority;
    mapping(address => Account) private _accounts;

    function privateTotalSupply() external view returns (ElGamal memory) {
        uint256 totalSupply = _totalSupply;
        for (uint256 i = 0; i < _suplyInBox.length; i++) {
            totalSupply += _suplyInBox[i];
        }
        return totalSupply;
    }

    function privateBalanceOf(
        address account
    ) external view returns (ElGamal memory) {
        uint256 accountBalance = _accounts[account].balance;
        for (uint256 i = 0; i < _accounts[account].inBox.length; i++) {
            accountbalance += _accounts[account].inBox[i];
        }
        return accountbalance;
    }

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
        require(verifyMintProof(to, amount, _supplyAuthority, supply, proof));
        _suplyInBox.push(supply);
        _accounts[to].inBox.push(amount);
        emit PrivateTransfer(address(0), to, amount);
        return true;
    }

    function privateTransfer(
        address to,
        ElGamal memory oldBalance,
        ElGamal memory newBalance,
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
        require(checkBalance(msg.sender, oldBalance));
        consolidateBalance(msg.sender, oldBalance);
        updateBalance(msg.sender, oldBalance, newBalance);
        addToInbox(to, value);
        emit PrivateTransfer(msg.sender, to, value);
        return true;
    }

    function privateAllowance(
        address owner,
        address spender
    ) external view returns (ElGamal memory) {
        return _accounts[owner].outBox[spender].amount;
    }

    function privateApprove(
        address spender,
        ElGamal memory oldBalance,
        ElGamal memory newBalance,
        Allowance allowance,
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
        require(checkBalance(msg.sender, oldBalance));
        consolidateBalance(msg.sender, oldBalance);
        updateBalance(msg.sender, oldBalance, newBalance);
        _accounts[msg.sender].outBox[spender] += allowance;
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
        ElGamal memory amount,
        bytes calldata proof
    ) external whenNotPaused onlyMinters notBlacklisted(msg.sender) {
        require(verifyBurnProof(msg.sender, oldBalance, newBalance, amount, supply, proof));
        consolidateSupply();
        decrementSupply(supply);
        emit PrivateBurn(msg.sender, amount);
    }
}
