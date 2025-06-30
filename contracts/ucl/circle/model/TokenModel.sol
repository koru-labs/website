// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../base/InstitutionUserRegistry.sol";


library TokenModel {
    enum TokenSCTypeEnum {
        ERC20,
        ERC1155
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

    struct Allowance {
        uint256 cl_x;
        uint256 cl_y;
        uint256 cr1_x;
        uint256 cr1_y;
        uint256 cr2_x;
        uint256 cr2_y;
    }

    struct TokenEntity {
        uint256 id;
        address owner;
        TokenStatus status;
        ElGamal amount;
        address to;
        uint256 rollbackTokenId;
    }

    struct Account {
        ElGamal balance;
        mapping(uint256 => TokenEntity) assets;
        mapping(address => uint256[]) allowances;
    }

    struct VerifyTokenMintParams {
        InstitutionUserRegistry institutionRegistration;
        address minter;
        address to;
        ElGamal initialMinterAllowed;
        ElGamal currentMintAmount;
        ElGamal supplyIncrease;

        bytes proof;
    }

    struct VerifyTokenTransferParams {
        InstitutionUserRegistry institutionRegistration;
        address from;
        address to;
        ElGamal consumedAmount;
        ElGamal amount;
        ElGamal remainingAmount;
        bytes proof;
    }

    struct VerifyTokenSplitParams {
        InstitutionUserRegistry institutionRegistration;
        address from;
        address to;
        ElGamal consumedAmount;
        ElGamal amount;
        ElGamal remainingAmount;
        ElGamal rollbackAmount;
        bytes proof;
    }

    struct VerifyTokenBurnParams{
        InstitutionUserRegistry institutionRegistration;
        address from;
        ElGamal consumedAmount;
        ElGamal amount;
        ElGamal remainingAmount;
        ElGamal supplyDecrease;
//        address owner;
        bytes proof;
    }

    //VerifyApproveParams
    struct VerifyTokenApproveParams {
        InstitutionUserRegistry institutionRegistration;
        address owner;
        address spender;
        address to;
        ElGamal consumedAmount;
        Allowance allowance;
        ElGamal remainingAmount;
        bytes proof;
    }

    //VerifyTransferFromParams
    struct VerifyTokenTransferFromParams {
        InstitutionUserRegistry institutionRegistration;
        address owner;
        address spender;
        address receiver;
        Allowance oldAllowance;
        Allowance newAllowance;
        ElGamal amount;
        bytes proof;
    }

    struct GrumpkinPublicKey {
        uint256 x;
        uint256 y;
    }
}


