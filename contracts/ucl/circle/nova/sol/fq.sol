// SPDX-License-Identifier: license.pdf
pragma solidity >=0.8.25;

import "./transcript.sol";
import "./library.sol";

type Fq is uint256;


using {
    FqOps.iszero, FqOps.neq, FqOps.negate, FqOps.add, FqOps.sub, FqOps.mul
} for Fq global;

library FqOps {
    // A value of type Fq must be garanteed to be less than q
    uint256 private constant q = 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47;
    // R = 2^256 mod q
    uint256 private constant R = 0x0e0a77c19a07df2f666ea36f7879462c0a78eb28f5c70b3dd35d438dc58f0d9d;

    Fq constant zero = Fq.wrap(0);
    Fq constant one = Fq.wrap(1);

    function iszero(Fq x) internal pure returns (bool) {
        return Fq.unwrap(x) == 0;
    }

    function neq(Fq x, Fq y) internal pure returns (bool) {
        return Fq.unwrap(x) != Fq.unwrap(y);
    }

    function from(uint256 a) internal pure returns (Fq) {
        unchecked {
            return Fq.wrap(a % q);
        }
    }

    function negate(Fq a) internal pure returns (Fq) {
        unchecked {
            return Fq.wrap((q - Fq.unwrap(a)) % q);
        }
    }

    function add(Fq a, Fq b) internal pure returns (Fq) {
        unchecked {
            return Fq.wrap(addmod(Fq.unwrap(a), Fq.unwrap(b), q));
        }
    }

    function sub(Fq a, Fq b) internal pure returns (Fq) {
        unchecked {
            return Fq.wrap(addmod(Fq.unwrap(a), q - Fq.unwrap(b), q));
        }
    }

    function mul(Fq a, Fq b) internal pure returns (Fq) {
        unchecked {
            return Fq.wrap(mulmod(Fq.unwrap(a), Fq.unwrap(b), q));
        }
    }

    function fromUniform(bytes32 high, bytes32 low) internal pure returns (Fq) {
        unchecked {
            return Fq.wrap(addmod(uint(low), mulmod(uint(high), R, q), q));
        }
    }
}


using FqLib for Fq global;

library FqLib {

    function absorb_in_transcript(Fq self, Transcript memory transcript) internal pure {
        transcript.absorb(bytes32(Fq.unwrap(self)));
    }

    function deserialize(uint ptr) internal pure returns (Fq result, uint newptr) {
        uint256 temp;
        (temp, newptr) = deserialize_uint256(ptr);
        result = FqOps.from(temp);
    }

}