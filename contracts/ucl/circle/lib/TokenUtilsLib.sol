// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../model/TokenModel.sol";
import "./CurveBabyJubJubHelper.sol";

library TokenUtilsLib {

    function addSupply(
        TokenModel.ElGamal memory privateTotalSupply,
        uint256 numberOfTotalSupplyChanges,
        TokenModel.ElGamal memory supplyIncrease
    ) external view returns (
        TokenModel.ElGamal memory newTotalSupply,
        uint256 newChangeCount
    ) {
        newTotalSupply = CurveBabyJubJubHelper.addElGamal(privateTotalSupply, supplyIncrease);
        newChangeCount = numberOfTotalSupplyChanges + 1;
    }

    function subSupply(
        TokenModel.ElGamal memory privateTotalSupply,
        uint256 numberOfTotalSupplyChanges,
        TokenModel.ElGamal memory supplyDecrease
    ) external view returns (
        TokenModel.ElGamal memory newTotalSupply,
        uint256 newChangeCount
    ) {
        newTotalSupply = CurveBabyJubJubHelper.subElGamal(privateTotalSupply, supplyDecrease);
        newChangeCount = numberOfTotalSupplyChanges + 1;
    }

    function hashElgamal(TokenModel.ElGamal memory elgamal) external pure returns (uint256) {
        return uint256(keccak256(abi.encode(elgamal)));
    }

    function sumTokenAmounts(
        TokenModel.ElGamal[] memory tokenAmounts
    ) external view returns (TokenModel.ElGamal memory sum) {
        sum = TokenModel.ElGamal(0, 0, 0, 0);
        for (uint256 i = 0; i < tokenAmounts.length; i++) {
            sum = CurveBabyJubJubHelper.addElGamal(sum, tokenAmounts[i]);
        }
    }

    function addToBalance(
        TokenModel.ElGamal memory currentBalance,
        TokenModel.ElGamal memory tokenAmount
    ) external view returns (TokenModel.ElGamal memory newBalance) {
        newBalance = CurveBabyJubJubHelper.addElGamal(currentBalance, tokenAmount);
    }

    function subFromBalance(
        TokenModel.ElGamal memory currentBalance,
        TokenModel.ElGamal memory tokenAmount
    ) external view returns (TokenModel.ElGamal memory newBalance) {
        newBalance = CurveBabyJubJubHelper.subElGamal(currentBalance, tokenAmount);
    }

    function calculateTotalSubtraction(
        TokenModel.ElGamal[] memory tokenAmounts
    ) external view returns (TokenModel.ElGamal memory totalAmount) {
        totalAmount = TokenModel.ElGamal(0, 0, 0, 0);
        for (uint256 i = 0; i < tokenAmounts.length; i++) {
            totalAmount = CurveBabyJubJubHelper.addElGamal(totalAmount, tokenAmounts[i]);
        }
    }

    function calculateAddTokenBalance(
        TokenModel.ElGamal memory currentBalance,
        TokenModel.ElGamal memory tokenAmount
    ) external view returns (TokenModel.ElGamal memory newBalance) {
        newBalance = CurveBabyJubJubHelper.addElGamal(currentBalance, tokenAmount);
    }

    function calculateRemoveTokensBalance(
        TokenModel.ElGamal memory currentBalance,
        TokenModel.ElGamal[] memory tokenAmounts
    ) external view returns (TokenModel.ElGamal memory newBalance) {
        TokenModel.ElGamal memory totalSubtraction = TokenModel.ElGamal(0, 0, 0, 0);
        for (uint256 i = 0; i < tokenAmounts.length; i++) {
            totalSubtraction = CurveBabyJubJubHelper.addElGamal(totalSubtraction, tokenAmounts[i]);
        }
        newBalance = CurveBabyJubJubHelper.subElGamal(currentBalance, totalSubtraction);
    }

    function extractTokenAmounts(
        TokenModel.TokenEntity[] memory tokens
    ) external pure returns (TokenModel.ElGamal[] memory amounts) {
        amounts = new TokenModel.ElGamal[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            amounts[i] = tokens[i].amount;
        }
    }

    function validateTokenIds(
        uint256[] memory tokenIds
    ) external pure returns (bool isValid) {
        isValid = true;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (tokenIds[i] == 0) {
                isValid = false;
                break;
            }
        }
    }

    function addTokenWithBalance(
        mapping(address => TokenModel.Account) storage accounts,
        address to,
        TokenModel.TokenEntity memory entity
    ) external {
        TokenModel.Account storage toAccount = accounts[to];
        toAccount.balance = CurveBabyJubJubHelper.addElGamal(toAccount.balance, entity.amount);
        toAccount.assets[entity.id] = entity;
    }

    function addToken(
        mapping(address => TokenModel.Account) storage accounts,
        address to,
        TokenModel.TokenEntity memory token
    ) external {
        accounts[to].assets[token.id] = token;
    }

    function removeTokensWithBalance(
        mapping(address => TokenModel.Account) storage accounts,
        address to,
        uint256[] memory tokenIds
    ) external {
        TokenModel.Account storage toAccount = accounts[to];
        // Collect token amounts for batch calculation
        TokenModel.ElGamal[] memory tokenAmounts = new TokenModel.ElGamal[](tokenIds.length);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            tokenAmounts[i] = toAccount.assets[tokenIds[i]].amount;
        }
        // Calculate total subtraction
        TokenModel.ElGamal memory totalSubtraction = TokenModel.ElGamal(0, 0, 0, 0);
        for (uint256 i = 0; i < tokenAmounts.length; i++) {
            totalSubtraction = CurveBabyJubJubHelper.addElGamal(totalSubtraction, tokenAmounts[i]);
        }
        toAccount.balance = CurveBabyJubJubHelper.subElGamal(toAccount.balance, totalSubtraction);

        // Delete tokens
        for (uint256 i = 0; i < tokenIds.length; i++) {
            delete toAccount.assets[tokenIds[i]];
        }
    }

    function removeTokens(
        mapping(address => TokenModel.Account) storage accounts,
        address to,
        uint256[] memory tokenIds
    ) external {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            delete accounts[to].assets[tokenIds[i]];
        }
    }

    function sumTokenAmountsFromAccount(
        mapping(address => TokenModel.Account) storage accounts,
        address account,
        uint256[] memory tokens
    ) external view returns (TokenModel.ElGamal memory sum) {
        TokenModel.ElGamal[] memory tokenAmounts = new TokenModel.ElGamal[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            tokenAmounts[i] = accounts[account].assets[tokens[i]].amount;
        }
        sum = TokenModel.ElGamal(0, 0, 0, 0);
        for (uint256 i = 0; i < tokenAmounts.length; i++) {
            sum = CurveBabyJubJubHelper.addElGamal(sum, tokenAmounts[i]);
        }
    }

    function removeAllowanceRecord(
        mapping(address => TokenModel.Account) storage accounts,
        address owner,
        address spender
    ) external {
        delete accounts[owner].allowances[spender];
    }
}
