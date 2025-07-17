// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '../model/TokenModel.sol';

abstract contract TokenConverterBase {
    // Convert USDC to private USDC
    function convert2pUSDC(
        address account,
        uint256 amount,
        TokenModel.ElGamal calldata encryptedAmount,
        uint256[7] calldata publicInputs,
        uint256[8] calldata proof
    ) external virtual returns (bool);
    
    // Convert private USDC back to USDC
    function convert2USDC(
        address account, 
        uint256 tokenId, 
        uint256 amount, 
        uint256[7] calldata publicInputs, 
        uint256[8] calldata proof
    ) external virtual returns (bool);
}