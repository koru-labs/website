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


    struct TokenRollupEvent {
        uint256 tokenId;
        address tokenSCAddress;
        uint256 tokenType;
        address owner;
        address manager;
        TokenModel.TokenStatus status;
        RollupEventTypeEnum eventType;

        uint256 cl_x;
        uint256 cl_y;
        uint256 cr_x;
        uint256 cr_y;
    }

    struct RollupEvent {
        uint256[8] proof;
    }

    struct RollupMintEvent {
        uint256[8] proof;
    }
