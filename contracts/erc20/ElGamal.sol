// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

library Crypto {
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

    function amount(Allowance memory allowance) internal pure returns (ElGamal memory) {
        return ElGamal({cl_x: allowance.cl_x, cl_y: allowance.cl_y, cr_x: allowance.cr1_x, cr_y: allowance.cr1_y});
    }

    function backup(Allowance memory allowance) internal pure returns (ElGamal memory) {
        return ElGamal({cl_x: allowance.cl_x, cl_y: allowance.cl_y, cr_x: allowance.cr2_x, cr_y: allowance.cr2_y});
    } 
}

