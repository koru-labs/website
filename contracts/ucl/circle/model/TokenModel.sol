// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../inst_user_registry/InstitutionUserRegistry.sol";


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
        mapping(address => uint256) allowances;
    }

    struct VerifyTokenMintParams {
        InstitutionUserRegistry institutionRegistration;
        address minter;
        address to;
        ElGamal initialMinterAllowed;
        ElGamal currentMintAmount;
        ElGamal supplyIncrease;

        uint256[8] proof;
        uint256[22] publicInputs;
    }

    struct VerifyTokenSplitParams {
        InstitutionUserRegistry institutionRegistration;
        address from;
        address to;
        ElGamal consumedAmount;
        ElGamal amount;
        ElGamal remainingAmount;
        ElGamal rollbackAmount;
        uint256[8] proof;
        uint256[20] publicInputs;
    }

    struct VerifyTokenApproveParams {
        InstitutionUserRegistry institutionRegistration;
        address owner;
        address spender;
        address to;
        ElGamal consumedAmount;
        Allowance allowance;
        ElGamal remainingAmount;
        uint256[8] proof;
        uint256[22] publicInputs;
    }

    struct GrumpkinPublicKey {
        uint256 x;
        uint256 y;
    }
}


