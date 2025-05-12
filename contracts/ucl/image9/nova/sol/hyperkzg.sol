// SPDX-License-Identifier: license.pdf
pragma solidity >=0.8.25;

import "./fq.sol";
import "./fr.sol";
import "./curve.sol";
import "./transcript.sol";
import "./library.sol";


struct HyperKZGVerifierKey {
    G1 G;
    G2 H;
    G2 tauH;
}

struct HyperKZGEvaluationArgument {
    G1[] com;
    G1[] w;
    Fr[][] v;
}


library HyperKZG {

    function verify(
        HyperKZGVerifierKey memory vk,
        Transcript memory transcript,
        G1 memory C,
        Fr[] memory x,
        Fr y,
        HyperKZGEvaluationArgument memory pi
    ) internal view {
        uint ell = x.length;

        Fr r = computeChallenge(pi.com, transcript);
        if (FrOps.iszero(r) || G1Ops.isidentity(C))
            revert Err(NovaError.ProofVerifyError);

        G1[] memory com = new G1[](pi.com.length + 1);
        com[0] = C;
        for (uint i = 1; i <= pi.com.length; i++) {
            com[i] = pi.com[i - 1];
        }

        Fr[] memory u = new Fr[](3);
        u[0] = r;
        u[1] = FrOps.negate(r);
        u[2] = FrOps.mul(r, r);
        
        Fr[][] memory v = pi.v;
        if (v.length != 3)
            revert Err(NovaError.ProofVerifyError);
        if (v[0].length != ell || v[1].length != ell || v[2].length != ell)
            revert Err(NovaError.ProofVerifyError);

        Fr[] memory ypos = v[0];
        Fr[] memory yneg = v[1];
        Fr[] memory Y = v[2];

        for (uint i = 0; i < ell; i++) {
            if (i == ell - 1) {
                if (FrOps.neq(
                    FrOps.mul(FrOps.mul(Fr.wrap(2), r), y),
                    FrOps.add(
                        FrOps.mul(
                            FrOps.mul(r, FrOps.sub(FrOps.one, x[0])),
                            FrOps.add(ypos[i], yneg[i])
                        ),
                        FrOps.mul(x[0], FrOps.sub(ypos[i], yneg[i]))
                    )
                )) {
                    revert Err(NovaError.ProofVerifyError);
                }
            } else if (FrOps.neq(
                FrOps.mul(FrOps.mul(Fr.wrap(2), r), Y[i + 1]),
                FrOps.add(
                    FrOps.mul(
                        FrOps.mul(r, FrOps.sub(FrOps.one, x[ell - i - 1])),
                        FrOps.add(ypos[i], yneg[i])
                    ),
                    FrOps.mul(x[ell - i - 1], FrOps.sub(ypos[i], yneg[i]))
                )
            )) {
                revert Err(NovaError.ProofVerifyError);
            }
        }

        if (!kzgVerifyBatch(vk, com, pi.w, u, pi.v, transcript))
            revert Err(NovaError.ProofVerifyError);
    }

    function computeChallenge(G1[] memory com, Transcript memory transcript) private pure returns (Fr) {
        transcript.absorb(bytes("c"));
        for (uint i = 0; i < com.length; i++) {
            com[i].absorb_in_transcript(transcript);
        }

        return transcript.squeezeFr("c");
    }

    function kzgVerifyBatch(
        HyperKZGVerifierKey memory vk,
        G1[] memory C,
        G1[] memory W,
        Fr[] memory u,
        Fr[][] memory v,
        Transcript memory transcript
    ) private view returns (bool) {
        if (u.length != 3 || W.length != 3)
            revert Err(NovaError.InvalidInputLength);

        Fr q = getBatchChallenge(v, transcript);
        Fr[] memory q_powers = batchChallengePowers(q, C.length);

        // Compute the commitment to the batched polynomial B(X)
        G1 memory C_B = C[0];
        for (uint i = 1; i < C.length; i++) {
            C_B = BN256.add(C_B, BN256.mul(C[i], q_powers[i]));
        }

        // Compute the batched openings
        Fr[] memory B_u = new Fr[](v.length);
        for (uint i = 0; i < v.length; i++) {
            B_u[i] = dotProduct(q_powers, v[i]);
        }

        Fr d_0 = verifierSecondChallenge(W, transcript);
        Fr d_1 = FrOps.mul(d_0, d_0);

        //let L = C_B * (Fr::one() + d[0] + d[1]) 
        //        - vk.G * (B_u[0] + d[0]*B_u[1] + d[1]*B_u[2]) 
        //        + W[0]*u[0] + W[1]*(u[1]*d[0]) + W[2]*(u[2]*d[1]);
        G1 memory L_part1 = BN256.add(
            BN256.mul(
                C_B,
                FrOps.add(FrOps.add(FrOps.one, d_0), d_1)
            ),
            G1Ops.negate(
                BN256.mul(
                    vk.G, 
                    FrOps.add(
                        FrOps.add(
                            B_u[0],
                            FrOps.mul(d_0, B_u[1])
                        ), 
                        FrOps.mul(d_1, B_u[2])
                    )
                )
            )
        );
        G1 memory L_part2 = BN256.add(
            BN256.mul(W[0], u[0]),
            BN256.add(
                BN256.mul(W[1], FrOps.mul(u[1], d_0)),
                BN256.mul(W[2], FrOps.mul(u[2], d_1))
            )
        );
        G1 memory L = BN256.add(L_part1, L_part2);

        G1 memory R = BN256.add(
            BN256.add(
                G1Ops.negate(W[0]),
                BN256.mul(G1Ops.negate(W[1]), d_0)
            ),
            BN256.mul(G1Ops.negate(W[2]), d_1)
        );

        return BN256.pairing(L, vk.H, R, vk.tauH);
    }

    function dotProduct(Fr[] memory u, Fr[] memory v) private pure returns (Fr result) {
        if (u.length != v.length)
            revert Err(NovaError.OddInputLength);
        for (uint i = 0; i < u.length; i++) {
            result = FrOps.add(result, FrOps.mul(u[i], v[i]));
        }
    }
    
    function getBatchChallenge(
        Fr[][] memory v,
        Transcript memory transcript
    ) private pure returns (Fr) {
        transcript.absorb(bytes("v"));
        for (uint i = 0; i < v.length; i++) {
            for (uint j = 0; j < v[i].length; j++) {
                v[i][j].absorb_in_transcript(transcript);
            }
        }

        return transcript.squeezeFr("r");
    }

    function batchChallengePowers(Fr q, uint k) private pure returns (Fr[] memory qPowers) {
        qPowers = new Fr[](k);
        qPowers[0] = FrOps.one;
        for (uint i = 1; i < k; i++) {
            qPowers[i] = FrOps.mul(qPowers[i - 1], q);
        }
    }

    function verifierSecondChallenge(
        G1[] memory W,
        Transcript memory transcript
    ) private pure returns (Fr) {
        transcript.absorb(bytes("W"));
        for (uint i = 0; i < W.length; i++) {
            W[i].absorb_in_transcript(transcript);
        }

        return transcript.squeezeFr("d");
    }
}


using HyperKZGVerifierKeyLib for HyperKZGVerifierKey global;

library HyperKZGVerifierKeyLib {

    function deserialize(HyperKZGVerifierKey memory self, uint ptr) internal pure returns (uint newptr) {
        ptr = self.G.deserialize(ptr);
        ptr = self.H.deserialize(ptr);
        newptr = self.tauH.deserialize(ptr);
    }

}


using HyperKZGEvaluationArgumentLib for HyperKZGEvaluationArgument global;

library HyperKZGEvaluationArgumentLib {

    function deserialize(HyperKZGEvaluationArgument memory self, uint ptr) internal pure returns (uint newptr) {
        uint length;
        // deserialize com
        (length, ptr) = deserialize_uint64(ptr);
        self.com = new G1[](length);
        
        for (uint i = 0; i < length; i++) {
            ptr = self.com[i].deserialize(ptr);
        }

        // deserialize w
        (length, ptr) = deserialize_uint64(ptr);
        self.w = new G1[](length);

        for (uint i = 0; i < length; i++) {
            ptr = self.w[i].deserialize(ptr);
        }

        // deserialize v
        (length, ptr) = deserialize_uint64(ptr);
        self.v = new Fr[][](length);

        for (uint i = 0; i < length; i++) {
            uint256 innerLength;
            (innerLength, ptr) = deserialize_uint64(ptr);
            self.v[i] = new Fr[](innerLength);
            for (uint j = 0; j < innerLength; j++) {
                (self.v[i][j], ptr) = FrLib.deserialize(ptr);
            }
        }
        
        newptr = ptr;
    }

}


library HyperKZGVerifierTestLib {

    function verify(bytes calldata /*proof*/) external {
        uint ptr = 4 + 0x40;

        HyperKZGVerifierKey memory vk;
        G1 memory C;
        Fr[] memory point;
        Fr eval;
        HyperKZGEvaluationArgument memory proof;

        // Deserialize
        ptr = vk.deserialize(ptr);
        ptr = C.deserialize(ptr);
        uint length;
        (length, ptr) = deserialize_uint64(ptr);
        point = new Fr[](length);
        for (uint i = 0; i < length; i++)
            (point[i], ptr) = FrLib.deserialize(ptr);
        (eval, ptr) = FrLib.deserialize(ptr);
        
        ptr = proof.deserialize(ptr);

        // Transcript
        uint transcript_init_cap = proof.w.length * 64 + 2;
        {
            uint temp = 64 * proof.com.length + 2;
            if (transcript_init_cap < temp)
                transcript_init_cap = temp;
        }
        {
            uint temp = 2;
            for (uint i = 0; i < proof.v.length; i++) {
                temp += proof.v[i].length * 32;
            }
            if (transcript_init_cap < temp) {
                transcript_init_cap = temp;
            }
        }
        Transcript memory verifer_tr =  Keccak256Transcript.new_transcript("TestEval", transcript_init_cap);

        uint gas_before;
        uint gas_after;
        
        {
            gas_before = gasleft();
            HyperKZG.verify(vk, verifer_tr, C, point, eval, proof);
            gas_after = gasleft();
        }
        
        emit DebugUint(gas_before - gas_after);
    }
}
