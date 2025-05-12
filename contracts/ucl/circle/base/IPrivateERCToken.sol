pragma solidity ^0.8.0;

import "../model/TokenModel.sol";

interface IPrivateERCToken {
    // hamsa-ucl public functions


    //doc: function privateReserveAmount(address owner, TokenModel2.ElGamal memory currentBalance, TokenModel2.ElGamal memory newBalance,
     //   TokenModel2.AmountInfo[] memory reservedAmounts, bytes calldata proof) external;
    function privateReserveAmount(TokenModel2.ParentTokens memory parentTokens, TokenModel2.AmountInfo[] memory reservedAmounts,
        bytes calldata proof) external;

    function privateSplitApproval(address owner, TokenModel2.AmountInfo memory approvedAmount,
        TokenModel2.AmountInfo[] memory splitAmounts, bytes calldata proof) external;

    function privateRollbackAmount(uint256 amountId) external;  //move amount from out-box/apv-box back into in-box



    //circle- v1

    // ERC: function mint(address _to, uint256 _amount) external;
    //  doc: function privateMint(address to, TokenModel2.AmountInfo calldata amountInfo, bytes calldata proof) external;
    function privateMint(address to, address to_manager, TokenModel2.AmountInfo calldata amountInfo, bytes calldata proof) external;

    // ERC: function totalSupply() external  view returns (uint256);
//    function privateTotalSupply() external view returns (TokenModel2.ElGamal memory);
    function privateSetTotalSupply(uint256 totalSupply) external;

    // ERC: function balanceOf(address account) external view returns (uint256);
    function privateBalanceOf(address owner, uint256 token_type) external returns (TokenModel2.ElGamal memory);


    // ERC: function approve(address spender, uint256 value) external;
    function privateApprove(address spender, uint256[] memory amountIds) external;  // first split which will put amount in out-box. call this function to move from out-box to apv-box

    // ERC: function transferFrom( address from, address to, uint256 value) external returns (bool);
    function privateTransferFrom(address from, address to, uint256[] memory amountIds) external;

    // ERC: function allowance(owner, spender) external view returns(uint256);
    function privateAllowance(address owner, address spender) external returns (TokenModel2.ElGamal memory);


    // ERC: function transfer(address to, uint256 value) external returns (bool);
    function privateTransfer(address to, uint256[] memory amountIds) external;

    // ERC: function burn(uint256 amount) external;
    function privateBurn(uint256 amountId) external;


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