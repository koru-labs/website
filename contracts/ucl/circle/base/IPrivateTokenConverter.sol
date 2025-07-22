// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../model/TokenModel.sol";

/**
 * @title IPrivateTokenConverter
 * @dev Interface for token conversion functionality between public and private tokens
 */
interface IPrivateTokenConverter {
    /**
     * @dev Convert public token to private token
     * @param amount The amount of public token to convert
     * @param elAmount The ElGamal encrypted private token amount
     * @param publicInputs The public inputs for the proof
     * @param proof The zero knowledge proof
     * @return True if the operation was successful
     */
    function convert2pUSDC(
        uint256 amount, 
        TokenModel.ElGamal calldata elAmount, 
        uint256[7] calldata publicInputs,
        uint256[8] calldata proof
    ) external returns (bool);
    
    /**
     * @dev Convert private token back to public token
     * @param tokenId The token ID of the private token to burn
     * @param amount The amount of public token to convert to
     * @param publicInputs The public inputs for the proof
     * @param proof The zero knowledge proof
     * @return True if the operation was successful
     */
    function convert2USDC(
        uint256 tokenId, 
        uint256 amount, 
        uint256[7] calldata publicInputs,
        uint256[8] calldata proof
    ) external returns (bool);
}
