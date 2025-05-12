// SPDX-License-Identifier: license.pdf
pragma solidity >=0.8.25;

import "./transcript.sol";
import "./error.sol";


struct UniPolyFr {
    Fr[] coeffs;
}

using UniPolyFrLib for UniPolyFr global;

library UniPolyFrLib {

    function evaluate(UniPolyFr memory self, Fr r) internal pure returns(Fr eval) {
        eval = self.coeffs[0];
        Fr power = r;
        for (uint i = 1; i < self.coeffs.length; i++) {
            eval = FrOps.add(eval, FrOps.mul(power, self.coeffs[i]));
            power = FrOps.mul(power, r);
        }
    }

    function absorb_in_transcript(UniPolyFr memory self, Transcript memory transcript) internal pure {
        self.coeffs[0].absorb_in_transcript(transcript);
        for (uint i = 2; i < self.coeffs.length; i++) {
            self.coeffs[i].absorb_in_transcript(transcript);
        }
    }

}


struct CompressedUniPolyFr {
    Fr[] coeffsExceptLinearTerm;
}

using CompressedUniPolyFrLib for CompressedUniPolyFr;

library CompressedUniPolyFrLib {

    function decompress(CompressedUniPolyFr memory self, Fr hint) internal pure returns (UniPolyFr memory result) {
        Fr linearTerm = FrOps.sub(FrOps.sub(hint, self.coeffsExceptLinearTerm[0]), self.coeffsExceptLinearTerm[0]);
        for (uint i = 1; i < self.coeffsExceptLinearTerm.length; i++) {
            linearTerm = FrOps.sub(linearTerm, self.coeffsExceptLinearTerm[i]);
        }
        result.coeffs = new Fr[](self.coeffsExceptLinearTerm.length + 1);
        result.coeffs[0] = self.coeffsExceptLinearTerm[0];
        result.coeffs[1] = linearTerm;
        for (uint i = 1; i < self.coeffsExceptLinearTerm.length; i++) {
            result.coeffs[i + 1] = self.coeffsExceptLinearTerm[i];
        }
    }

    function deserialize(CompressedUniPolyFr memory self, uint ptr) internal pure returns (uint) {
        uint length;
        (length, ptr) = deserialize_uint64(ptr);
        self.coeffsExceptLinearTerm = new Fr[](length);
        for (uint i = 0; i < length; i++) {
            (self.coeffsExceptLinearTerm[i], ptr) = FrLib.deserialize(ptr);
        }
        return ptr;
    }

}

struct SumcheckProofFr {
    CompressedUniPolyFr[] compressedPolys;
}

using SumcheckProofFrLib for SumcheckProofFr global;

library SumcheckProofFrLib {

    function verify(
        SumcheckProofFr memory self,
        Fr claim,
        uint numRounds,
        uint degreeBound,
        Transcript memory transcript
    ) internal pure returns (Fr e, Fr[] memory r) {
        // verify that there is a univariate polynomial for each round
        if (self.compressedPolys.length != numRounds)
            revert Err(NovaError.InvalidSumcheckProof);
        
        e = claim;
        r = new Fr[](numRounds);
        
        for (uint i = 0; i < numRounds; i++) {
            UniPolyFr memory poly = self.compressedPolys[i].decompress(e);
            if (poly.coeffs.length - 1 != degreeBound) {
                revert Err(NovaError.InvalidSumcheckProof);
            }

            transcript.absorb(bytes("p"));
            poly.absorb_in_transcript(transcript);

            Fr ri = transcript.squeezeFr("c");
            r[i] = ri;
            e = poly.evaluate(ri);
        }
    }

    function verify_batch(
        SumcheckProofFr memory self,
        Fr[] memory claims,
        uint[] memory num_rounds,
        Fr[] memory coeffs,
        uint degree_bound,
        Transcript memory transcript
    ) internal pure returns (Fr, Fr[] memory) {
        uint num_instances = claims.length;
        if (num_rounds.length != num_instances || coeffs.length != num_instances)
            revert Err(NovaError.OddInputLength);

        // n = maxᵢ{nᵢ}
        uint num_rounds_max;
        for (uint i = 0; i < num_instances; ++i) {
            if (num_rounds[i] > num_rounds_max)
                num_rounds_max = num_rounds[i];
        }

        // Random linear combination of claims,
        // where each claim is scaled by 2^{n-nᵢ} to account for the padding.
        //
        // claim = ∑ᵢ coeffᵢ⋅2^{n-nᵢ}⋅cᵢ
        Fr claim = FrOps.zero;
        for (uint i = 0; i < num_instances; ++i) {
            Fr scaled_claim = FrOps.mul(
                FrOps.from(1 << (num_rounds_max - num_rounds[i])),
                claims[i]
            );
            claim = FrOps.add(
                claim,
                FrOps.mul(scaled_claim, coeffs[i])
            );
        }

        return self.verify(claim, num_rounds_max, degree_bound, transcript);
    }

    function deserialize(SumcheckProofFr memory self, uint ptr) internal pure returns (uint) {
        uint length;
        (length, ptr) = deserialize_uint64(ptr);
        self.compressedPolys = new CompressedUniPolyFr[](length);
        for (uint i = 0; i < length; i++) {
            ptr = self.compressedPolys[i].deserialize(ptr);
        }

        return ptr;
    }

}



struct UniPolyFq {
    Fq[] coeffs;
}

using UniPolyFqLib for UniPolyFq global;

library UniPolyFqLib {

    function evaluate(UniPolyFq memory self, Fq r) internal pure returns(Fq eval) {
        eval = self.coeffs[0];
        Fq power = r;
        for (uint i = 1; i < self.coeffs.length; i++) {
            eval = FqOps.add(eval, FqOps.mul(power, self.coeffs[i]));
            power = FqOps.mul(power, r);
        }
    }

    function absorb_in_transcript(UniPolyFq memory self, Transcript memory transcript) internal pure {
        self.coeffs[0].absorb_in_transcript(transcript);
        for (uint i = 2; i < self.coeffs.length; i++) {
            self.coeffs[i].absorb_in_transcript(transcript);
        }
    }

}


struct CompressedUniPolyFq {
    Fq[] coeffsExceptLinearTerm;
}

using CompressedUniPolyFqLib for CompressedUniPolyFq;

library CompressedUniPolyFqLib {

    function decompress(CompressedUniPolyFq memory self, Fq hint) internal pure returns (UniPolyFq memory result) {
        Fq linearTerm = FqOps.sub(FqOps.sub(hint, self.coeffsExceptLinearTerm[0]), self.coeffsExceptLinearTerm[0]);
        for (uint i = 1; i < self.coeffsExceptLinearTerm.length; i++) {
            linearTerm = FqOps.sub(linearTerm, self.coeffsExceptLinearTerm[i]);
        }
        result.coeffs = new Fq[](self.coeffsExceptLinearTerm.length + 1);
        result.coeffs[0] = self.coeffsExceptLinearTerm[0];
        result.coeffs[1] = linearTerm;
        for (uint i = 1; i < self.coeffsExceptLinearTerm.length; i++) {
            result.coeffs[i + 1] = self.coeffsExceptLinearTerm[i];
        }
    }

    function deserialize(CompressedUniPolyFq memory self, uint ptr) internal pure returns (uint) {
        uint length;
        (length, ptr) = deserialize_uint64(ptr);
        self.coeffsExceptLinearTerm = new Fq[](length);
        for (uint i = 0; i < length; i++) {
            (self.coeffsExceptLinearTerm[i], ptr) = FqLib.deserialize(ptr);
        }
        return ptr;
    }

}

struct SumcheckProofFq {
    CompressedUniPolyFq[] compressedPolys;
}

using SumcheckProofFqLib for SumcheckProofFq global;

library SumcheckProofFqLib {

    function verify(
        SumcheckProofFq memory self,
        Fq claim,
        uint numRounds,
        uint degreeBound,
        Transcript memory transcript
    ) internal pure returns (Fq e, Fq[] memory r) {
        // verify that there is a univariate polynomial for each round
        if (self.compressedPolys.length != numRounds)
            revert Err(NovaError.InvalidSumcheckProof);
        
        e = claim;
        r = new Fq[](numRounds);
        
        for (uint i = 0; i < numRounds; i++) {
            UniPolyFq memory poly = self.compressedPolys[i].decompress(e);
            if (poly.coeffs.length - 1 != degreeBound) {
                revert Err(NovaError.InvalidSumcheckProof);
            }

            transcript.absorb(bytes("p"));
            poly.absorb_in_transcript(transcript);

            Fq ri = transcript.squeezeFq("c");
            r[i] = ri;
            e = poly.evaluate(ri);
        }
    }

    function verify_batch(
        SumcheckProofFq memory self,
        Fq[] memory claims,
        uint[] memory num_rounds,
        Fq[] memory coeffs,
        uint degree_bound,
        Transcript memory transcript
    ) internal pure returns (Fq, Fq[] memory) {
        uint num_instances = claims.length;
        if (num_rounds.length != num_instances || coeffs.length != num_instances)
            revert Err(NovaError.OddInputLength);

        // n = maxᵢ{nᵢ}
        uint num_rounds_max;
        for (uint i = 0; i < num_instances; ++i) {
            if (num_rounds[i] > num_rounds_max)
                num_rounds_max = num_rounds[i];
        }

        // Random linear combination of claims,
        // where each claim is scaled by 2^{n-nᵢ} to account for the padding.
        //
        // claim = ∑ᵢ coeffᵢ⋅2^{n-nᵢ}⋅cᵢ
        Fq claim = FqOps.zero;
        for (uint i = 0; i < num_instances; ++i) {
            Fq scaled_claim = FqOps.mul(
                FqOps.from(1 << (num_rounds_max - num_rounds[i])),
                claims[i]
            );
            claim = FqOps.add(
                claim,
                FqOps.mul(scaled_claim, coeffs[i])
            );
        }

        return self.verify(claim, num_rounds_max, degree_bound, transcript);
    }

    function deserialize(SumcheckProofFq memory self, uint ptr) internal pure returns (uint) {
        uint length;
        (length, ptr) = deserialize_uint64(ptr);
        self.compressedPolys = new CompressedUniPolyFq[](length);
        for (uint i = 0; i < length; i++) {
            ptr = self.compressedPolys[i].deserialize(ptr);
        }

        return ptr;
    }

}