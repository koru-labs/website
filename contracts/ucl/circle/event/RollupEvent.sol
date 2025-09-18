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


    struct RollupMintEvent {
        TokenModel.TokenEntity token;
        uint256[22] publicInputs;
        uint256[8] proof;
        uint256 initialAllowId;
        uint256 newAllowId;
        uint256 backupId;
    }

    struct RollupSplitEvent {
        TokenModel.TokenEntity[] consumedTokens;
        TokenModel.TokenEntity[] newTokens;
        uint256[20] publicInputs;
        uint256[8] proof;
    }

    struct RollupTransferEvent {
        address fromAddress;
        address toAddress;
        TokenModel.GrumpkinPublicKey pk;
        uint256 tokenId;
    }

    struct RollupBurnEvent {
        address fromAddress;
        address toAddress;
        TokenModel.GrumpkinPublicKey toPk;
        TokenModel.GrumpkinPublicKey backupPk;
        uint256 toTokenId;
        uint256 backupTokenId;
    }

    struct RollupMintAllowedSetEvent {
        address ownerAddress;
        address minterAddress;
        TokenModel.GrumpkinPublicKey minterPk;
        TokenModel.ElGamalToken token;
    }

    struct RollupConversionMintEvent {
        TokenModel.TokenEntity token;
        uint256[8]  proof;
        uint256[8]  publicInputs;
    }

    struct RollupConversionBurnEvent {
        TokenModel.TokenEntity token;
        uint256[8]  proof;
        uint256[7]  publicInputs;
    }

    struct RollupApproveEvent {
        TokenModel.TokenEntity[] consumedTokens;
        TokenModel.TokenEntity[] newTokens;
        uint256[20] publicInputs;
        uint256[8] proof;
    }