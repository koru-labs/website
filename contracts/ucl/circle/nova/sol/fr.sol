// SPDX-License-Identifier: license.pdf
pragma solidity >=0.8.25;

import "./transcript.sol";
import "./library.sol";

type Fr is uint256;

using {
    FrOps.iszero, FrOps.neq, FrOps.negate, FrOps.add, FrOps.sub, FrOps.mul
} for Fr global;

library FrOps {
    // A value of type Fr must be garanteed to be less than r
    uint256 private constant r = 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001;
    // R = 2^256 mod r
    uint256 private constant R = 0xe0a77c19a07df2f666ea36f7879462e36fc76959f60cd29ac96341c4ffffffb;
    
    Fr constant zero = Fr.wrap(0);
    Fr constant one = Fr.wrap(1);

    function iszero(Fr x) internal pure returns (bool) {
        return Fr.unwrap(x) == 0;
    }

    function neq(Fr x, Fr y) internal pure returns (bool) {
        return Fr.unwrap(x) != Fr.unwrap(y);
    }

    function from(uint256 a) internal pure returns (Fr) {
        unchecked {
            return Fr.wrap(a % r);
        }
    }

    function negate(Fr a) internal pure returns (Fr) {
        unchecked {
            return Fr.wrap((r - Fr.unwrap(a)) % r);
        }
    }

    function add(Fr a, Fr b) internal pure returns (Fr) {
        unchecked {
            return Fr.wrap(addmod(Fr.unwrap(a), Fr.unwrap(b), r));
        }
    }

    function sub(Fr a, Fr b) internal pure returns (Fr) {
        unchecked {
            return Fr.wrap(addmod(Fr.unwrap(a), r - Fr.unwrap(b), r));
        }
    }

    function mul(Fr a, Fr b) internal pure returns (Fr) {
        unchecked {
            return Fr.wrap(mulmod(Fr.unwrap(a), Fr.unwrap(b), r));
        }
    }

    function fromUniform(bytes32 high, bytes32 low) internal pure returns (Fr) {
        unchecked {
            return Fr.wrap(addmod(uint(low), mulmod(uint(high), R, r), r));
        }
    }

}


using FrLib for Fr global;

library FrLib {

    function absorb_in_transcript(Fr self, Transcript memory transcript) internal pure {
        transcript.absorb(bytes32(Fr.unwrap(self)));
    }

    function deserialize(uint ptr) internal pure returns (Fr result, uint newptr) {
        uint256 temp;
        (temp, newptr) = deserialize_uint256(ptr);
        result = FrOps.from(temp);
    }

}
