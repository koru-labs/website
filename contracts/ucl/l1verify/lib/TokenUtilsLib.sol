// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../model/TokenModel.sol";

library TokenUtilsLib {

    function hashElgamal(TokenModel.ElGamal memory elgamal) external pure returns (uint256) {
        return uint256(keccak256(abi.encode(elgamal)));
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
        mapping(uint256 => TokenModel.Account) storage accounts,
        uint256 to,
        uint256 token
    ) external {
        accounts[to].assets[token] = token;
    }

    function removeToken(
        mapping(uint256 => TokenModel.Account) storage accounts,
        uint256 to,
        uint256 tokenId
    ) external {
        delete accounts[to].assets[tokenId];
    }

    function removeTokens(
        mapping(uint256 => TokenModel.Account) storage accounts,
        uint256 to,
        uint256[] memory tokenIds
    ) external {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            delete accounts[to].assets[tokenIds[i]];
        }
    }

    function removeAllowanceRecord(
        mapping(uint256 => TokenModel.Account) storage accounts,
        uint256 owner,
        uint256 spender
    ) external {
        delete accounts[owner].allowances[spender];
    }
}
