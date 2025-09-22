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
        string nodeUrl;
        string httpUrl;
    }

    struct InstitutionUpdatedEvent {
        address institutionAddress;
        string name;
        string nodeUrl;
        string httpUrl;
    }

    struct UserRegisteredEvent {
        address userAddress;
        address managerAddress;
    }

    struct UserRemovedEvent {
        address userAddress;
        address managerAddress;
    }

    struct TokenSCCreatedEvent {
        address TokenSCAddress;
        TokenModel.TokenSCTypeEnum TokenSCType;
        address Deployer;
        string TokenName;
        string TokenSymbol;
        uint8 TokenDecimals;
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
        TokenModel.ElGamalToken oldAmount;
        TokenModel.ElGamalToken newAmount;
    }

    struct TokenSupplyUpdatedEvent {
        TokenModel.ElGamal oldSupply;   
        TokenModel.ElGamal increaseAmount; 
        TokenModel.ElGamal decreaseAmount;
        TokenModel.ElGamal newSupply;
    }

    struct TokenMintedEvent {
        address to;
        uint256 tokenId;
        address minter;
    }


    struct TokenDeletedEvent{
        uint256[] consumedTokens;
        uint256 changeTokenId;
    }


    struct TokenCanceledEvent {
        uint256 transferTokenId;
    }

    struct TokenActionCompletedEvent {
        uint256 rollbackTokenId;
    }

    struct TokenReceivedEvent {
        uint256 id;
        address tokenSCAddress;
        address owner;
        TokenModel.TokenStatus status;
        TokenModel.ElGamal amount;
    }

    struct TokenReceivedEvent2 {
        TokenModel.TokenEntity token;
        address from;
    }

    struct TokenBurnedEvent{
        uint256 tokenId;
    }

    struct AllowanceUpdatedEvent {
        TokenModel.Allowance oldAllowance;
        TokenModel.ElGamal increaseAmount;
        TokenModel.ElGamal decreaseAmount;
        TokenModel.Allowance newAllowance;
        address msgSender;
    }

    struct AllowanceCreatedEvent {
        address spender;
        TokenModel.Allowance allowance;
        TokenModel.Allowance oldAllowance;
        TokenModel.Allowance newAllowance;
    }

    struct AllowanceReceivedEvent {
        uint256 tokenType;
        address owner;
        address spender;
        TokenModel.Allowance allowance;
    }

    struct MinterAllowedSetEvent  {
        address setter;
        address account;
        TokenModel.ElGamalToken limit;
    }