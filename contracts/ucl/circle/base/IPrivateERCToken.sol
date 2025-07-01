// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '../model/TokenModel.sol';

interface IPrivateERCToken {
    // hamsa-ucl public functions

    //circle- v1

    // ERC: function mint(address _to, uint256 _amount) external;
    //  doc: function privateMint(TokenModel.AmountInfo calldata amountInfo,uint256[8] calldata proof, uint256[22] calldata publicInputs) external;
    function privateMint(address to, TokenModel.ElGamal memory amount, TokenModel.ElGamal memory supply,uint256[8] calldata proof, uint256[22] calldata publicInputs) external returns (bool);

    function privateBurn(uint256 tokenId) external;

    // ERC: function balanceOf(address account) external view returns (uint256);
    function privateBalanceOf(address owner) external returns (TokenModel.ElGamal memory);

    function privateTransfer(uint256 tokenId, address to) external returns (bool);

    function privateTotalSupply() external view returns (TokenModel.ElGamal memory);

    function configurePrivacyMinter(address minter, TokenModel.ElGamal calldata privateAllowedAmount) external returns (bool);

    function removePrivacyMinter(address minter) external returns (bool);
}
