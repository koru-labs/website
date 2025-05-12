pragma solidity ^0.8.0;

import "./TokenModel.sol";

interface ITokenScBase {
    function splitToken(TokenModel.TokenValueUpdate calldata parentTokenUpdate, TokenModel.NewToken[] calldata childTokens, bytes calldata proof) external;
    
    function mergeTokens(uint256[] calldata childTokens, TokenModel.TokenValueUpdate calldata parentTokenUpdate) external;
    
    function mintToken(TokenModel.NewToken calldata token, bytes memory proof) external;
    
    function removeToken(address owner, uint256 tokenId) external;

    function transferToken(uint256 tokenId, address toManager, address to) external;

    function delegateTransferToken(TokenModel.TokenValueUpdate calldata parentTokenUpdate, TokenModel.NewToken[] calldata childTokens, bytes calldata proof) external;

    function splitTokenForDVP(address spender, TokenModel.TokenValueUpdate calldata parentTokenUpdate, TokenModel.NewToken[] calldata childTokens, bytes calldata proof) external;

    function splitTokenForBatchDVP(address spender, TokenModel.TokenValueUpdate calldata parentTokenUpdate, TokenModel.NewBatchToken[] calldata childTokens, bytes calldata proof) external;

    function mergeAndSplitTokenForDVP(address spender, TokenModel.TokenMergeAndUpdate calldata parentTokenUpdate, TokenModel.NewToken[] calldata childTokens, bytes calldata proof) external;


    function validateDVP(uint256 tokenId, address from, address toManager, address to) external returns (bool);
    function commitDVP(uint256 tokenId, address from, address toManager, address to) external;
    function rollbackDVP(address owner, uint256 tokenId) external;

    function cancelDvpReservation(uint256 tokenId) external;
}
