// SPDX-License-Identifier: UNLICENSED 
pragma solidity ^0.8.0;

    struct ElGamal {
        uint256 cl_x;
        uint256 cl_y;
        uint256 cr_x;
        uint256 cr_y;
    }

    struct Allowance {
        ElGamal amount;
        ElGamal backup;
    }







