// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '../model/TokenModel.sol';

interface IPrivateTokenApproval {
    function privateApprove(
        uint256[] memory consumedTokenIds,
        address spender,
        address to,
        TokenModel.TokenEntity[] memory newTokens,
        uint256[8] calldata proof,
        uint256[20] calldata publicInputs
    ) external;

    function privateTransferFrom(
        uint256 tokenId,
        address from,
        address to
    ) external returns (bool);

    function privateRevokeApproval(address spender, uint256 allowanceTokenId) external;

    function privateRevokeApprovalFrom(address owner, uint256 allowanceTokenId) external;

    function isAllowanceExists(address owner, address spender, uint256 tokenId) external view virtual returns (bool);

    function privateBurnFrom(address from, uint256 allowanceTokenId) external;
}