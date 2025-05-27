// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '../model/TokenModel.sol';

interface IPrivateERCToken {
    // hamsa-ucl public functions

    //circle- v1

    // ERC: function mint(address _to, uint256 _amount) external;
    //  doc: function privateMint(TokenModel.AmountInfo calldata amountInfo, bytes calldata proof) external;
    function privateMint(address to, TokenModel.ElGamal memory amount, TokenModel.ElGamal memory supply, bytes calldata proof) external returns (bool);

    // ERC: function balanceOf(address account) external view returns (uint256);
    function privateBalanceOf(address owner) external returns (TokenModel.ElGamal memory);

    // ERC: function approve(address spender, uint256 value) external;
    function privateApprove(bytes32[] memory consumedTokens,
        address spender,
        TokenModel.Allowance memory allowance,
        TokenModel.ElGamal memory consumedTokensRemainingAmount,
        bytes calldata proof) external; // first split which will put amount in out-box. call this function to move from out-box to apv-box

    function privateTransferFrom(      address from,
        TokenModel.Allowance memory newAllowance,
        address to,
        TokenModel.ElGamal memory value,
        bytes calldata proof
    ) external returns (bool);

    // ERC: function allowance(owner, spender) external view returns(uint256);
    function privateAllowance(address owner, address spender) external returns (TokenModel.ElGamal memory);

    // ERC: function transfer(address to, uint256 value) external returns (bool);
    function privateTransfer(bytes32[] memory consumedTokens,
        address to,
        TokenModel.ElGamal memory amount,
        TokenModel.ElGamal memory consumedTokensRemainingAmount,
        bytes calldata proof) external returns (bool);

    // ERC: function burn(uint256 amount) external;
    function privateBurn(bytes32[] memory consumedTokens,
        TokenModel.ElGamal memory amount,
        TokenModel.ElGamal memory consumedTokensRemainingAmount,
        TokenModel.ElGamal memory supplyDecrease,
        bytes calldata proof) external;

    //circle-v2
    //    function increaseAllowance(address spender, uint256 increment) external;
    //
    //    function decreaseAllowance(address spender, uint256 decrement) external;
    //
    //    function permit(
    //        address owner,
    //        address spender,
    //        uint256 value,
    //        uint256 deadline,
    //        uint8 v,
    //        bytes32 r,
    //        bytes32 s
    //    ) external;
    //
    //    function transferWithAuthorization(
    //        address from,
    //        address to,
    //        uint256 value,
    //        uint256 validAfter,
    //        uint256 validBefore,
    //        bytes32 nonce,
    //        uint8 v,
    //        bytes32 r,
    //        bytes32 s
    //    ) external;
    //
    //    function receiveWithAuthorization(
    //        address from,
    //        address to,
    //        uint256 value,
    //        uint256 validAfter,
    //        uint256 validBefore,
    //        bytes32 nonce,
    //        uint8 v,
    //        bytes32 r,
    //        bytes32 s
    //    ) external;
    //
    //    function cancelAuthorization(
    //        address authorizer,
    //        bytes32 nonce,
    //        uint8 v,
    //        bytes32 r,
    //        bytes32 s
    //    ) external;
    //
    //    function transferWithAuthorization(
    //        address from,
    //        address to,
    //        uint256 value,
    //        uint256 validAfter,
    //        uint256 validBefore,
    //        bytes32 nonce,
    //        bytes memory signature
    //    ) external;
    //
    //    function receiveWithAuthorization(
    //        address from,
    //        address to,
    //        uint256 value,
    //        uint256 validAfter,
    //        uint256 validBefore,
    //        bytes32 nonce,
    //        bytes memory signature
    //    ) external;
}
