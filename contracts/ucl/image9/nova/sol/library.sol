// SPDX-License-Identifier: license.pdf
pragma solidity >=0.8.25;
/*
    This file gives general functions that spreads in multiple files
*/

import "./fr.sol";
import "./fq.sol";
import "./error.sol";

uint constant BN_N_LIMBS = 4;
uint constant BN_LIMB_WIDTH = 64;
uint constant BN_LIMB_WIDTH_MASK = 0xffffffffffffffff; // limb width = 256/BN_N_LIMBS

event DebugUint(uint);

function ilog2(uint x) pure returns (uint y) {
    require(x != 0, "BUGILOG0");
    assembly("memory-safe"){
        for {
            y := 0
            x := shr(1, x)
        } gt(x, 0) {
            y := add(y, 1)
            x := shr(1, x)
        } { }
    }
}

function log2_ceil(uint x) pure returns (uint y) {
    require(x != 0, "BUGLOG0");
    assembly("memory-safe"){
        y := 1
        if iszero(and(x, sub(x, 1))) { // x is a power of two
            y := 0
        }
        for {
            x := shr(1, x)
        } gt(x, 0) {
            y := add(y, 1)
            x := shr(1, x)
        } { }
    }
}

function deserialize_uint8(uint256 ptr) pure returns (uint256 data, uint256 newptr) {
    assembly("memory-safe"){
        data := shr(248, calldataload(ptr))
        newptr := add(ptr, 1)
    }
}

function deserialize_uint64(uint256 ptr) pure returns (uint256 data, uint256 newptr) {
    assembly("memory-safe"){
        data := shr(192, calldataload(ptr))
        newptr := add(ptr, 8)
    }
}

function deserialize_uint256(uint256 ptr) pure returns (uint256 data, uint256 newptr) {
    assembly("memory-safe"){
        data := calldataload(ptr)
        newptr := add(ptr, 0x20)
    }
}

function powers(Fr s, uint n) pure returns (Fr[] memory result) {
    if (n == 0)
        revert Err(NovaError.InvalidInputLength);
    result = new Fr[](n);
    result[0] = FrOps.one;
    for (uint i = 1; i < n; i++) {
        result[i] = FrOps.mul(result[i - 1], s);
    }
}
function powers(Fq s, uint n) pure returns (Fq[] memory result) {
    if (n == 0)
        revert Err(NovaError.InvalidInputLength);
    result = new Fq[](n);
    result[0] = FqOps.one;
    for (uint i = 1; i < n; i++) {
        result[i] = FqOps.mul(result[i - 1], s);
    }
}

contract testLibrary {

    function run() public pure returns (bool) {
        require(ilog2(8) == 3, "test1");
        require(ilog2(2) == 1, "test2");
        require(ilog2(1) == 0, "test3");
        require(ilog2(13) == 3, "test4");
        require(log2_ceil(8) == 3, "test5");
        require(log2_ceil(2) == 1, "test6");
        require(log2_ceil(1) == 0, "test7");
        require(log2_ceil(13) == 4, "test8");
        return true;
    }

}