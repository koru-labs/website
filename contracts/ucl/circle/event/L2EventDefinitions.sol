// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../model/TokenModel.sol";



    enum TokenSCTypeEnum {
        ERC20,
        ERC1155
    }

    struct InstitutionRegisteredEvent {
        address institutionAddress;
        string name;
        TokenModel.GrumpkinPublicKey publicKey;
    }

    struct UserRegisteredEvent {
        address userAddress;
        address managerAddress;
    }

    struct TokenSCCreatedEvent {
        address TokenSCAddress;
        TokenModel.TokenSCTypeEnum TokenSCType;
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
        TokenModel.ElGamal amount;
        bytes encryptedAmount;
        TokenModel.TokenStatus status;
        uint256 parentId;
    }

    struct TokenMetaBody {
        uint256 id;
        address tokenSCAddress;
        uint256 tokenType;
        address owner;
        address manager;
        TokenModel.TokenStatus status;
        uint256 parentId;
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

    struct TokenMintBurnBody {
        uint256 id;
        address tokenSCAddress;
        uint256 tokenType;
        address owner;
        address msgSender;
        TokenModel.TokenStatus status;
        bytes issuerEncryptedAmount;
    }

    struct TokenMintAllowedUpdatedEvent {
        address institution;          
        TokenModel.ElGamal oldAmount; 
        TokenModel.ElGamal newAmount;
    }

    struct TokenSupplyUpdatedEvent {
        TokenModel.ElGamal oldSupply;   
        TokenModel.ElGamal increaseAmount; 
        TokenModel.ElGamal decreaseAmount;
        TokenModel.ElGamal newSupply;
    }

    struct TokenMintedEvent {
        address to;                    
        TokenModel.ElGamal amount;     
        address minter;             
    }