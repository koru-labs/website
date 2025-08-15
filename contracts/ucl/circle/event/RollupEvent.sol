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
    }

    struct RollupSplitEvent {
        TokenModel.TokenEntity token;
        TokenModel.TokenEntity[] consumedTokens;
        uint256[20] publicInputs;
    }

    struct RollupTransferEvent {
        address fromAddress;
        address toAddress;
        TokenModel.GrumpkinPublicKey pk;
        TokenModel.ElGamal tokenAmount;
    }

    struct RollupBurnEvent {
        address fromAddress;
        address toAddress;
        TokenModel.GrumpkinPublicKey toPk;
        TokenModel.GrumpkinPublicKey backupPk;
        TokenModel.ElGamal toAmount;
        TokenModel.ElGamal backupAmount;
    }

    struct RollupMintAllowedSetEvent {
        address ownerAddress;
        address minterAddress;
        TokenModel.GrumpkinPublicKey minterPk;
        TokenModel.ElGamal tokenAmount;
    }
