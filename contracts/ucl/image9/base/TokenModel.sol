pragma solidity ^0.8.0;

import "./ITokenScBase.sol";


library TokenModel {
    enum TokenStatus {
        deleted,
        inactive,
        active,
        locked
    }

    struct TokenEntity {
        uint256 id;
        uint256 tokenType;
        address owner;
        address manager;
        uint256 cl_x;
        uint256 cl_y;
        uint256 cr_x;
        uint256 cr_y;
        bytes encryptedAmount;
        TokenStatus status;
        uint256 parentId;
        address approvedSpender;
        uint256 rollbackTokenId;
    }

    struct NewToken {
        uint256 id;
        uint256 tokenType;
        address owner;
        address manager;
        uint256 cl_x;
        uint256 cl_y;
        uint256 cr_x;
        uint256 cr_y;
        TokenStatus status;
        bytes encryptedAmount;
        uint256 rollbackTokenId;
    }

    struct NewBatchToken {
        NewToken[] token;
        uint256 rollbackPkX;
        uint256 rollbackPkY;
        uint256 receiverPkX;
        uint256 receiverPkY;
    }

    struct TokenValueUpdate {
        uint256 id;
        address owner;
        uint256 cl_x;
        uint256 cl_y;
        uint256 cr_x;
        uint256 cr_y;
    }

    struct TokenMergeAndUpdate {
        uint256[] id;
        address owner;
        uint256 cl_x;
        uint256 cl_y;
        uint256 cr_x;
        uint256 cr_y;
    }

    struct TokenProofRequest {
        address tokenScAddress;
        uint256 tokenType;
        uint256 amount;
        address ownerAddress;
        bytes[] ownerSignature;
    }

    struct TokenProofResponse {
        string requestId;
        TokenProofStatusEnum status;
    }

    enum TokenProofStatusEnum {
        pending,
        completed,
        failed
    }

    struct TokenProof {
        string tokenId;
        address tokenScAddress;
        uint256 tokenType;
        uint256 amount;
        address ownerAddress;
    }

    struct TokenExchange {
        ITokenScBase tokenSc;
        uint256 tokenId;
        address owner;
        address newOwner;
    }
}


