// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library TokenModel {


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

    struct Account {
        ElGamal balance;
        mapping(uint256 => uint256) assets; //pk -> tokenId
        mapping(uint256 => uint256) allowances;
    }

    struct GrumpkinPublicKey {
        uint256 x;
        uint256 y;
    }
}


