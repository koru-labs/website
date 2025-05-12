pragma solidity ^0.8.0;

import "./TokenModel.sol";

    struct TokenSCCreatedEvent {
        address TokenSCAddress;
        TokenModel2.TokenSCTypeEnum TokenSCType;
        address Deployer;
    }

    struct TokenDetailBody {
        uint256 id;
        address tokenSCAddress;
        uint256 tokenType;
        address owner;
        address manager;
        uint256 cl_x;
        uint256 cl_y;
        uint256 cr_x;
        uint256 cr_y;
        TokenModel2.TokenStatus status;
        uint256 parentId;
    }

    struct TokenMetaBody {
        uint256 id;
        address tokenSCAddress;
        uint256 tokenType;
        address owner;
        address manager;
        TokenModel2.TokenStatus status;
        uint256 parentId;
    }

    struct TokenMintBurnBody {
        uint256 id;
        address tokenSCAddress;
        uint256 tokenType;
        address owner;
        address manager;
        TokenModel2.TokenStatus status;
        bytes issuerEncryptedAmount;
    }

    struct TokenRemovedEvent {
        address owner;
        uint256 tokenId;
    }

    struct TokenExchangedEvent {
        uint256 tokenId;
        address owner;
        address newOwner;
    }

    struct TokenProofRequestEvent {
        address tokenScAddress;
        uint256 tokenType;
        uint256 amount;
        address ownerAddress;
    }

    struct TokenProofDeliverEvent {
        string tokenId;
        address tokenScAddress;
        uint256 tokenType;
        uint256 amount;
        address ownerAddress;
    }