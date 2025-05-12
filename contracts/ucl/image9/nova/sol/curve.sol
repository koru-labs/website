// SPDX-License-Identifier: license.pdf
pragma solidity >=0.8.25;

import "./fq.sol";
import "./fr.sol";
import "./transcript.sol";
import "./library.sol";
import "./error.sol";

// NOTE: In Solidity verifier, we need only use the affine coordinates of a BN256 point.
//       In the corresponding Rust prover's code, `G1` states to the projective coordinates,
//       while `G1Affine` states to what we have here in Solidity.
struct G1 {
    Fq x;
    Fq y;
}

using G1Lib for G1 global;

library G1Lib {

    function absorb_in_transcript(G1 memory self, Transcript memory transcript) internal pure {
        self.x.absorb_in_transcript(transcript);
        self.y.absorb_in_transcript(transcript);
    }

    function deserialize(G1 memory self, uint ptr) internal pure returns (uint newptr) {
        (self.x, ptr) = FqLib.deserialize(ptr);
        (self.y, newptr) = FqLib.deserialize(ptr);
    }

    function copy(G1 memory self, G1 memory input) internal pure {
        self.x = input.x;
        self.y = input.y;
    }

    function fingerprint(G1 memory self, Fr acc, Fr c, Fr c_i, Fr[] memory v, uint v_offset) internal pure returns (Fr, Fr, uint) {
        uint temp = Fq.unwrap(self.x);
        for (uint i = 0; i < BN_N_LIMBS; i++) {
            Fr limb = Fr.wrap(temp & BN_LIMB_WIDTH_MASK);
            acc = FrOps.add(acc, FrOps.mul(c_i, limb));
            c_i = FrOps.mul(c_i, c);
            v[v_offset++] = limb;
            temp = temp >> BN_LIMB_WIDTH;
        }

        temp = Fq.unwrap(self.y);
        for (uint i = 0; i < BN_N_LIMBS; i++) {
            Fr limb = Fr.wrap(temp & BN_LIMB_WIDTH_MASK);
            acc = FrOps.add(acc, FrOps.mul(c_i, limb));
            c_i = FrOps.mul(c_i, c);
            v[v_offset++] = limb;
            temp = temp >> BN_LIMB_WIDTH;
        }

        Fr s;
        if (G1Ops.isidentity(self)) {
            s = FrOps.one;
        } else {
            s = FrOps.zero;
        }
        acc = FrOps.add(acc, FrOps.mul(c_i, s));
        c_i = FrOps.mul(c_i, c);
        v[v_offset++] = s;

        return (acc, c_i, v_offset);
    }

}


struct G2 {
    uint256[2] x;
    uint256[2] y;
}

using G2Lib for G2 global;

library G2Lib {

    function deserialize(G2 memory self, uint ptr) internal pure returns (uint newptr) {
        (self.x[1], ptr) = deserialize_uint256(ptr);
        (self.x[0], ptr) = deserialize_uint256(ptr);
        (self.y[1], ptr) = deserialize_uint256(ptr);
        (self.y[0], newptr) = deserialize_uint256(ptr);
    }

}

struct Grumpkin {
    Fr x;
    Fr y;
}

using GrumpkinLib for Grumpkin global;

library GrumpkinLib {

    function deserialize(Grumpkin memory self, uint ptr) internal pure returns (uint newptr) {
        (self.x, ptr) = FrLib.deserialize(ptr);
        (self.y, newptr) = FrLib.deserialize(ptr);
    }

    function fingerprint(Grumpkin memory self, Fr acc, Fr c, Fr c_i, Fr[] memory v, uint v_offset) internal pure returns (Fr, Fr, uint) {
        acc = FrOps.add(acc, FrOps.mul(c_i, self.x));
        c_i = FrOps.mul(c_i, c);
        v[v_offset++] = self.x;
        
        acc = FrOps.add(acc, FrOps.mul(c_i, self.y));
        c_i = FrOps.mul(c_i, c);
        v[v_offset++] = self.y;

        Fr s;
        if (GrumpkinOps.isidentity(self)) {
            s = FrOps.one;
        } else {
            s = FrOps.zero;
        }
        acc = FrOps.add(acc, FrOps.mul(c_i, s));
        c_i = FrOps.mul(c_i, c);
        v[v_offset++] = s;

        return (acc, c_i, v_offset);
    }
}


library G1Ops {

    function negate(G1 memory input) internal pure returns (G1 memory output) {
        if (isidentity(input)) {
            output.x = FqOps.zero;
            output.y = FqOps.zero;
        } else {
            output.x = input.x;
            output.y = FqOps.negate(input.y);
        }
    }
    
    function isidentity(G1 memory input) internal pure returns (bool) {
        return FqOps.iszero(input.x) && FqOps.iszero(input.y);
    }

    function identity() internal pure returns (G1 memory result) {
        result.x = FqOps.zero;
        result.y = FqOps.zero;
    }

}

library GrumpkinOps {

    function isidentity(Grumpkin memory input) internal pure returns (bool) {
        return FrOps.iszero(input.x) && FrOps.iszero(input.y);
    }

}

library BN256 {

    function add(G1 memory a, G1 memory b) internal view returns (G1 memory result) {
        uint256[4] memory input;
        uint256[2] memory output;
        input[0] = Fq.unwrap(a.x);
        input[1] = Fq.unwrap(a.y);
        input[2] = Fq.unwrap(b.x);
        input[3] = Fq.unwrap(b.y);
        assembly("memory-safe") {
            if iszero(staticcall(gas(), 0x06, input, 0x80, output, 0x40)) {
                revert(0, 0)
            }
        }
        result.x = Fq.wrap(output[0]);
        result.y = Fq.wrap(output[1]);
    }

    function mul(G1 memory p, Fr s) internal view returns (G1 memory result) {
        uint256[3] memory input;
        uint256[2] memory output;
        input[0] = Fq.unwrap(p.x);
        input[1] = Fq.unwrap(p.y);
        input[2] = Fr.unwrap(s);
        assembly("memory-safe") {
            if iszero(staticcall(gas(), 0x07, input, 0x60, output, 0x40)) {
                revert(0, 0)
            }
        }
        result.x = Fq.wrap(output[0]);
        result.y = Fq.wrap(output[1]);
    }

    function pairing(G1 memory a1, G2 memory a2, G1 memory b1, G2 memory b2) internal view returns (bool) {
        uint256[12] memory input;
        uint256[1] memory output;

        input[0] = Fq.unwrap(a1.x);
        input[1] = Fq.unwrap(a1.y);
        input[2] = a2.x[0];
        input[3] = a2.x[1];
        input[4] = a2.y[0];
        input[5] = a2.y[1];
        input[6] = Fq.unwrap(b1.x);
        input[7] = Fq.unwrap(b1.y);
        input[8] = b2.x[0];
        input[9] = b2.x[1];
        input[10] = b2.y[0];
        input[11] = b2.y[1];

        assembly("memory-safe") {
            if iszero(staticcall(gas(), 0x08, input, 0x180, output, 0x20)) {
                revert(0, 0)
            }
        }
        return output[0] == 0x1;
    }

}


contract testBN256 {

    function kzgVerify(
        G1 memory G,
        G2 memory H,
        G2 memory tauH,
        G1 memory commit,
        G1 memory proof,
        Fr index,
        Fr value
    ) internal view returns (bool result) {
        G1 memory Gv = BN256.mul(G, value);
        G1 memory negGv = G1Ops.negate(Gv);
        G1 memory commitMinusValue = BN256.add(commit, negGv);
        G1 memory negProof = G1Ops.negate(proof);
        G1 memory indexMulProof = BN256.mul(proof, index);
        G1 memory p1 = BN256.add(indexMulProof, commitMinusValue);
        result = BN256.pairing(
            p1,
            H,
            negProof,
            tauH
        );
    }

    function run() public view returns (bool result) {
        G1 memory G = G1({
            x: Fq.wrap(uint256(0x10ff4ab61e6109f64b103c45770a0c2ec238622df2dddbf4aee2683203a35b7f)),
            y: Fq.wrap(uint256(0x10ff352f0d2acf65fcd3a0517bb3dba40d462da489a9041ffd6e02a1f1ef6100))
        });

        G2 memory H = G2({
            x: [
                uint256(0x0c724e1809536ec488aaae8b9d889d17994312eff04a726f3f50d7c7c877e9c8),
                uint256(0x2aed435a016112962ed82d424afc495542043a4aec0edb793e83d014c7ebeb89)
            ],
            y: [
                uint256(0x026af33b14421f71dd26554f1913dfa9f75e0af4ef15218de9be7a5399d4f44d),
                uint256(0x20c3029a0004aa1762fd18ebcbb0c62d5812a2c4a2e93c91a08549a2b821cd7e)
            ]
        });

        G2 memory tauH = G2({
            x: [
                uint256(0x068aa54311120ae9e7b6e2e97a81e2965bfb3e094ec5ad7655fc3fe0b351cc6a),
                uint256(0x0eaeebc89285a17a92907fa9965b099f51b4cbd0b1d7c8a69690afc80611aca2)
            ],
            y: [
                uint256(0x070a598756aa16dfa0ae279ae26965b1c6fed951789b8d34b50b01e26847cf2e),
                uint256(0x01d54d82b6a6663b4859fc452f327509d6e2812789babae8c65f835e44cea576)
            ]
        });

        G1 memory C = G1({
            x: Fq.wrap(uint256(0x127a3e286b5b3f3fc8be58ca7d73295c1a8ccd8b6b90bd9f8f1bfe4f49db29af)),
            y: Fq.wrap(uint256(0x180b70d4c9e25866c22393104cb1e61285da0e09fd6b1070535022ed026bbab9))
        });

        Fr u = Fr.wrap(uint256(0x117cf3bf35d7d736209b41d4edbabd097c697491211e2590a004dbb59c0eccfd));

        Fr v = Fr.wrap(uint256(0x23b0aaabd7ede318eccb8f95809b43500fc3a702a27d3b853e6d7c28fd4027ff));

        G1 memory W = G1({
            x: Fq.wrap(uint256(0x120dde13fbb3836ac32d1eb2afd90da31f21e6a742a519a0a4b3708342f3103a)),
            y: Fq.wrap(uint256(0x0b7ce3ea00a2e27f7e7cbab72aaaa82c2b623a594e76af2e583d0fb088356f92))
        });

        result = kzgVerify(G, H, tauH, C, W, u, v);
        
        require(result, "BUGTKZG");
        
        return result;
    }
}