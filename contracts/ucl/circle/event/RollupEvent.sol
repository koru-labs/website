pragma solidity ^0.8.0;

import "../model/TokenModel.sol";

    enum RollupEventTypeEnum {
        Minted,
        Burned,
        Split,
        Transferred,

        Received,
        Cancelled,

        Approved,
        TransferredFrom,
        Revoked,

        ConvertMinted,
        ConvertBurned
    }


//    struct RollupToken {
//        uint256 tokenId;
//        address tokenSCAddress;
//        uint256 tokenType;
//        address owner;
//        address manager;
//        TokenModel.TokenStatus status;
//        RollupEventTypeEnum eventType;
//
//        uint256 cl_x;
//        uint256 cl_y;
//        uint256 cr_x;
//        uint256 cr_y;
//    }

    struct RollupToken {
        uint256 tokenId;
        address owner;
        TokenModel.TokenStatus status;
        TokenModel.ElGamal amount;
        address to;
        uint256 rollbackTokenId;
    }

    struct RollupMintEvent {
        RollupToken token;
        uint256[22] publicInputs;
    }

    struct RollupBurnEvent {
        RollupToken token;
    }

    struct RollupSplitEvent {
        RollupToken token;
        uint256[] consumedTokenIds;
        uint256[20] publicInputs;
    }
