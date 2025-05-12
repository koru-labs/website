// SPDX-License-Identifier: license.pdf
pragma solidity >=0.8.25;

import "./r1cs.sol";
import "./nifs.sol";
import "./snark_sm.sol";


struct CompressedSNARKVerifierKey {
    uint F_arity;
    Fr pp_digest;
    G1 dk;
    BatchedRelaxedR1CSSNARKVerifierKey vk; // verifier key of the augmented circuit
    // vk_ec: VerifierKeyForSM<E2>, // verifier key of the EC circuit; Commented out as nothing real inside.
    Fr default_comm; // default commitment for the r_EC circuit
    Fr digest;
}

using CompressedSNARKVerifierKeyLib for CompressedSNARKVerifierKey global;

library CompressedSNARKVerifierKeyLib {

    function deserialize(CompressedSNARKVerifierKey memory self, uint ptr) internal pure returns (uint) {
        (self.F_arity, ptr) = deserialize_uint64(ptr);
        (self.pp_digest, ptr) = FrLib.deserialize(ptr);
        ptr = self.dk.deserialize(ptr);
        ptr = self.vk.deserialize(ptr);
        (self.default_comm, ptr) = FrLib.deserialize(ptr);
        (self.digest, ptr) = FrLib.deserialize(ptr);
        return ptr;
    }

}


struct CompressedSNARK {
    R1CSInstance l_u;
    RelaxedR1CSInstance r_U;
    NIFS nifs;

    Fr s_prev;
    RelaxedR1CSInstance blind_u;
    NIFSRelaxed nifs_blind;

    Fr blind_W;
    Fr blind_E;
    
    // The following three fields are necessary (Some instead of None)
    // only if we are in the non-base case (num_steps > 1)
    RelaxedR1CSInstanceWithMCCompressed r_U_EC; // Option
    RelaxedR1CSSNARKForSM r_W_EC_snark; // Option
    G1 comm_W_MC; // Option

    BatchedRelaxedR1CSSNARK f_W_MC_snark;
}

using CompressedSNARKLib for CompressedSNARK global;

library CompressedSNARKLib {
    uint private constant NUM_FE_AUG_CIRCUIT_IO = 3;
    uint private constant NUM_FE_WITHOUT_IO_FOR_CRHF = 58;

    function verify(
        CompressedSNARK memory self,
        CompressedSNARKVerifierKey memory vk,
        uint num_steps,
        Fr[] memory z0,
        Fr[] memory zn
    ) internal view {
        // check if the (relaxed) R1CS instances have right number of public outputs
        if (num_steps == 0
            || z0.length != vk.F_arity
            || zn.length != vk.F_arity
            || self.l_u.X.length != NUM_FE_AUG_CIRCUIT_IO
            || self.r_U.X.length != NUM_FE_AUG_CIRCUIT_IO
        ) {
            revert Err(NovaError.ProofVerifyError);
        }

        if (num_steps == 1) {
            self.r_U_EC.comm = vk.default_comm;
            self.r_U_EC.u = FqOps.zero;
            self.r_U_EC.X = new Fq[](10);
            for (uint i = 0; i < 10; i++)
                self.r_U_EC.X[i] = FqOps.zero;
        }

        if (self.r_U_EC.X.length != 10) // this also checks that self.r_U_EC is Some
            revert Err(NovaError.ProofVerifyError);

        Fr c = self.l_u.X[1]; // we will verify if this is the right challenge below

        // compute a fingerprint of hash preimage
        Fr acc = FrOps.zero;
        Fr c_i = FrOps.one;
        Fr[] memory v = new Fr[](NUM_FE_WITHOUT_IO_FOR_CRHF + 2 * vk.F_arity + 1);
        
        v[0] = self.l_u.X[0]; // hash
        uint v_offset = 1;

        acc = FrOps.add(acc, FrOps.mul(c_i, vk.pp_digest));
        c_i = FrOps.mul(c_i, c);
        v[v_offset++] = vk.pp_digest;

        acc = FrOps.add(acc, FrOps.mul(c_i, FrOps.from(num_steps)));
        c_i = FrOps.mul(c_i, c);
        v[v_offset++] = FrOps.from(num_steps);

        for (uint i = 0; i < z0.length; i++) {
            acc = FrOps.add(acc, FrOps.mul(c_i, z0[i]));
            c_i = FrOps.mul(c_i, c);
            v[v_offset++] = z0[i];
        }

        for (uint i = 0; i < zn.length; i++) {
            acc = FrOps.add(acc, FrOps.mul(c_i, zn[i]));
            c_i = FrOps.mul(c_i, c);
            v[v_offset++] = zn[i];
        }

        (acc, c_i, v_offset) = self.r_U.fingerprint(acc, c, c_i, v, v_offset);
        (acc, c_i, v_offset) = self.r_U_EC.fingerprint(acc, c, c_i, v, v_offset);
        
        acc = FrOps.add(acc, FrOps.mul(c_i, self.s_prev));
        c_i = FrOps.mul(c_i, c);
        v[v_offset++] = self.s_prev;

        require(NUM_FE_WITHOUT_IO_FOR_CRHF + 2 * vk.F_arity + 1 == v_offset, "BUGCOM");

        // check if the fingerprint in l_u is correct
        if (FrOps.neq(self.l_u.X[2], acc)) {
            revert Err(NovaError.ProofVerifyError);
        }

        // check if the claimed challenge is correct
        Transcript memory te = Keccak256Transcript.new_transcript("C", 2 + 32 * v_offset);
        te.absorb(bytes("v"));
        for (uint i = 0; i < v_offset; i++) {
            v[i].absorb_in_transcript(te);
        }
        Fr c_prime = te.squeezeFr("c");
        if (FrOps.neq(c, c_prime)) {
            revert Err(NovaError.ProofVerifyError);
        }

        // Calculate transaction buffer capacity needed
        uint transcript_init_cap = (num_steps == 1) ? (3 + 18 * 32) : (3 + 36 * 32);
        {
            {
                uint temp = 2 + self.f_W_MC_snark.eval_arg.w.length * 64;
                if (transcript_init_cap < temp)
                    transcript_init_cap = temp;
            }
            {
                uint temp = 64 * (self.f_W_MC_snark.eval_arg.com.length) + 2;
                if (transcript_init_cap < temp)
                    transcript_init_cap = temp;
            }
            {
                uint temp = 2;
                for (uint i = 0; i < self.f_W_MC_snark.eval_arg.v.length; i++) {
                    temp += self.f_W_MC_snark.eval_arg.v[i].length * 32;
                }
                if (transcript_init_cap < temp) {
                    transcript_init_cap = temp;
                }
            }
            for (uint i = 0; i < self.f_W_MC_snark.sc.compressedPolys.length; i++) {
                uint temp = 2 + 32 * self.f_W_MC_snark.sc.compressedPolys[i].coeffsExceptLinearTerm.length;
                if (transcript_init_cap < temp)
                    transcript_init_cap = temp;
            }
        }

        Transcript memory transcript = Keccak256Transcript.new_transcript("C", transcript_init_cap);
        transcript.absorb(bytes("v"));
        vk.digest.absorb_in_transcript(transcript);

        // fold the running instance and last instance to get a folded instance
        RelaxedR1CSInstance memory f_U = self.nifs.verify(self.r_U, self.l_u, transcript);

        // fold the blinding instance and last instance to get a folded instance
        f_U = self.nifs_blind.verify(f_U, self.blind_u, transcript);

        f_U = f_U.derandomize(vk.dk, self.blind_W, self.blind_E);
        transcript.absorb(bytes("r"));
        self.blind_W.absorb_in_transcript(transcript);
        self.blind_E.absorb_in_transcript(transcript);

        if (num_steps > 1) {
            
            // get a challenge from the first transcript and add it to the second transcript below
            c = transcript.squeezeFr("c");

            transcript_init_cap = 2 + 4 * 32;
            {
                {
                    uint temp = 2 + self.r_W_EC_snark.evals_batch.length * 32;
                    if (transcript_init_cap < temp)
                        transcript_init_cap = temp;
                }
                for (uint i = 0; i < self.r_W_EC_snark.sc_proof_outer.compressedPolys.length; i++) {
                    uint temp = 2 + 32 * self.r_W_EC_snark.sc_proof_outer.compressedPolys[i].coeffsExceptLinearTerm.length;
                    if (transcript_init_cap < temp)
                        transcript_init_cap = temp;
                }
                for (uint i = 0; i < self.r_W_EC_snark.sc_proof_inner.compressedPolys.length; i++) {
                    uint temp = 2 + 32 * self.r_W_EC_snark.sc_proof_inner.compressedPolys[i].coeffsExceptLinearTerm.length;
                    if (transcript_init_cap < temp)
                        transcript_init_cap = temp;
                }
                for (uint i = 0; i < self.r_W_EC_snark.sc_proof_batch.compressedPolys.length; i++) {
                    uint temp = 2 + 32 * self.r_W_EC_snark.sc_proof_batch.compressedPolys[i].coeffsExceptLinearTerm.length;
                    if (transcript_init_cap < temp)
                        transcript_init_cap = temp;
                }
            }
            Transcript memory transcript_E2 = Keccak256Transcript.new_transcript("E", transcript_init_cap);
            transcript_E2.absorb(bytes("c"));
            FqOps.from(Fr.unwrap(c)).absorb_in_transcript(transcript_E2);
            (Fr comm, Fq[] memory r, Fq chal, Fq eval, Fq cc) = self.r_W_EC_snark.verify(self.r_U_EC, transcript_E2); // revert on verify failure or self.r_U_EC is none
            // Warning: Below we should not use `transcript_E2` as it does not contain effects from `self.r_W_EC_snark.verify`

            transcript.absorb(bytes("c"));
            FrOps.from(Fq.unwrap(cc)).absorb_in_transcript(transcript);
            
            // we only need to absorb the commitment to witness of the MC circuit; the public IO is already in the
            // transcript or challenges from earlier steps
            transcript.absorb(bytes("r"));
            self.comm_W_MC.absorb_in_transcript(transcript);

            // check the satisfiability of the folded instances using SNARKs proving the knowledge of their satisfying witnesses
            RelaxedR1CSInstance[] memory U = new RelaxedR1CSInstance[](2);
            U[0] = f_U;
            // Check the polyeval proof via a SNARK using polyeval circuit
            { // U[1] = r_U_MC
                U[1].comm_W = self.comm_W_MC;
                U[1].comm_E = G1Ops.identity();
                U[1].u = FrOps.one;
                
                Fr[] memory X = new Fr[](53);
                uint temp = Fq.unwrap(eval);
                for (uint i = 0; i < BN_N_LIMBS; i++) {
                    X[i] = Fr.wrap(temp & BN_LIMB_WIDTH_MASK);
                    temp >>= BN_LIMB_WIDTH;
                }
                temp = Fq.unwrap(chal);
                for (uint i = BN_N_LIMBS; i < 2 * BN_N_LIMBS; i++) {
                    X[i] = Fr.wrap(temp & BN_LIMB_WIDTH_MASK);
                    temp >>= BN_LIMB_WIDTH;
                }
                X[2 * BN_N_LIMBS] = comm;
                require (r.length == 11, "BUGRL");
                for (uint i = 0; i < r.length; i++) {
                    temp = Fq.unwrap(r[i]);
                    for (uint j = 2 * BN_N_LIMBS + 1; j < 3 * BN_N_LIMBS + 1; j++) {
                        X[j + i * BN_N_LIMBS] = Fr.wrap(temp & BN_LIMB_WIDTH_MASK);
                        temp >>= BN_LIMB_WIDTH;
                    }
                }

                U[1].X = X;
            }
            self.f_W_MC_snark.verify(vk.vk, U, transcript); // revert on verify failure
        } else {
            RelaxedR1CSInstance[] memory U = new RelaxedR1CSInstance[](1);
            U[0] = f_U;
            // Warning: vk below should be trimmed, but as long as we garantee that
            // everywhere f_W_MC_snark.verify has an iteration, it does not iterate by the length of vk's arrays,
            // we can ignore the trimming.
            self.f_W_MC_snark.verify(vk.vk, U, transcript); // revert on verify failure
        }
    }

    function deserialize(CompressedSNARK memory self, uint ptr) internal pure returns (uint) {
        ptr = self.l_u.deserialize(ptr);
        ptr = self.r_U.deserialize(ptr);
        ptr = self.nifs.deserialize(ptr);

        (self.s_prev, ptr) = FrLib.deserialize(ptr);
        ptr = self.blind_u.deserialize(ptr);
        ptr = self.nifs_blind.deserialize(ptr);

        (self.blind_W, ptr) = FrLib.deserialize(ptr);
        (self.blind_E, ptr) = FrLib.deserialize(ptr);

        uint is_some;
        (is_some, ptr) = deserialize_uint8(ptr);
        if (is_some != 0)
            ptr = self.r_U_EC.deserialize(ptr);
        
        (is_some, ptr) = deserialize_uint8(ptr);
        if (is_some != 0)
            ptr = self.r_W_EC_snark.deserialize(ptr);
        
        (is_some, ptr) = deserialize_uint8(ptr);
        if (is_some != 0)
            ptr = self.comm_W_MC.deserialize(ptr);

        ptr = self.f_W_MC_snark.deserialize(ptr);
        return ptr;
    }

}