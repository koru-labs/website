pragma solidity ^0.8.0;


library TokenModel2 {
    enum TokenSCTypeEnum {
        ERC20,
        ERC1155
    }

    enum TokenBox {
        InBox,
        OutBox,
        ApvBox
    }


    enum TokenStatus {
        deleted,
        inactive,
        active,
        locked
    }

    struct ElGamal {
        uint256 cl_x;
        uint256 cl_y;
        uint256 cr_x;
        uint256 cr_y;
    }

    struct AmountInfo {
        uint256 id;
        uint256 token_type; //ERC1155 token_type  (for ERC20 token, use 0)
        TokenStatus status;

        ElGamal amount;
        TokenBox location;   //we needs this field before one split will generate multiple tokens, each will be put in different box

        bytes issuerEncryptedAmount;
        address owner;
        address manager;
    }

    struct ParentTokens {
        uint256[] parentIds;
        ElGamal parentTotal;
    }

    struct TokenEntity {
        uint256 id;
        uint256 tokenType;
        address owner;
        address manager;
        TokenStatus status;

        ElGamal amount;

        bytes issuerEncryptedAmount;
        address approvedSpender;
        uint256 rollbackTokenId;
    }

    struct Account {
        address addr;
        mapping(uint256 => TokenEntity) inBox;
        mapping(uint256 => TokenEntity) outBox;
        mapping(uint256 => TokenEntity) apvBox;

        mapping(address=>ElGamal) allowance;
    }
}


