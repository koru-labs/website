// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '../model/TokenModel.sol';

interface TokenConverterBase {
    // Convert USDC to private USDC
    function convert2pUSDC(
        address account, 
        uint256 amount, 
        TokenModel.ElGamal calldata value, 
        uint256[] calldata publicInputs, 
        uint256[8] calldata proof
    ) external returns (bool);
    
    // Convert private USDC back to USDC
    function convert2USDC(
        address account, 
        uint256 tokenId, 
        uint256 amount, 
        uint256[] calldata publicInputs, 
        uint256[8] calldata proof
    ) external returns (bool);
}