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



    function calculateTotalSubtraction(
        TokenModel.ElGamal[] memory tokenAmounts
    ) external view returns (TokenModel.ElGamal memory totalAmount) {
        totalAmount = TokenModel.ElGamal(0, 0, 0, 0);
        for (uint256 i = 0; i < tokenAmounts.length; i++) {
            totalAmount = CurveBabyJubJubHelper.addElGamal(totalAmount, tokenAmounts[i]);
        }
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

    function addToken(
        mapping(address => TokenModel.Account) storage accounts,
        address to,
        TokenModel.TokenEntity memory token
    ) external {
        accounts[to].assets[token.id] = token;
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

    function addAllowanceRecord(
        mapping(address => TokenModel.Account) storage accounts,
        address owner,
        address spender,
        uint256 tokenId
    ) external {
        accounts[owner].allowances[spender][tokenId] = true;
    }
    
    function removeAllowanceRecord(
        mapping(address => TokenModel.Account) storage accounts,
        address owner,
        address spender,
        uint256 tokenId
    ) external returns (bool) {
        if (accounts[owner].allowances[spender][tokenId]) {
            delete accounts[owner].allowances[spender][tokenId];
            return true;
        }
        return false;
    }

    function isAllowanceExists(
        mapping(address => TokenModel.Account) storage accounts,
        address owner,
        address spender,
        uint256 tokenId
    ) external view returns (bool) {
        return accounts[owner].allowances[spender][tokenId];
    }

    function precompiledAddElGamal(
        TokenModel.ElGamal memory token1,
        TokenModel.ElGamal memory token2
    ) internal returns (TokenModel.ElGamal memory result) {
        bytes memory input = abi.encode(
            token1.cl_x, token1.cl_y, token1.cr_x, token1.cr_y,
            token2.cl_x, token2.cl_y, token2.cr_x, token2.cr_y
        );
        (bool success, bytes memory data) = address(0x2040).call(input);
        require(success, "Precompiled addition failed");

        (uint256 leftX, uint256 leftY, uint256 rightX, uint256 rightY) = abi.decode(data, (uint256, uint256, uint256, uint256));

        result = TokenModel.ElGamal({
            cl_x: leftX,
            cl_y: leftY,
            cr_x: rightX,
            cr_y: rightY
        });
    }

    function precompiledSubElGamal(
        TokenModel.ElGamal memory token1,
        TokenModel.ElGamal memory token2
    ) internal returns (TokenModel.ElGamal memory result) {
        bytes memory input = abi.encode(
            token1.cl_x, token1.cl_y, token1.cr_x, token1.cr_y,
            token2.cl_x, token2.cl_y, token2.cr_x, token2.cr_y
        );
        (bool success, bytes memory data) = address(0x2050).call(input);
        require(success, "Precompiled subtraction failed");

        (uint256 leftX, uint256 leftY, uint256 rightX, uint256 rightY) = abi.decode(data, (uint256, uint256, uint256, uint256));

        result = TokenModel.ElGamal({
            cl_x: leftX,
            cl_y: leftY,
            cr_x: rightX,
            cr_y: rightY
        });
    }
}