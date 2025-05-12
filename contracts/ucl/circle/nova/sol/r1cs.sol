// SPDX-License-Identifier: license.pdf
pragma solidity >=0.8.25;

import "./sumcheck.sol";
import "./hyperkzg.sol";
import "./transcript.sol";
import "./library.sol";
import "./polynomial.sol";


struct R1CSInstance {
    G1 comm_W;
    Fr[] X;
}

using R1CSInstanceLib for R1CSInstance global;

library R1CSInstanceLib {

    function absorb_in_transcript(R1CSInstance memory self, Transcript memory transcript) internal pure {
        self.comm_W.absorb_in_transcript(transcript);
        for (uint i = 0; i < self.X.length; i++) {
            self.X[i].absorb_in_transcript(transcript);
        }
    }

    function deserialize(R1CSInstance memory self, uint ptr) internal pure returns (uint) {
        ptr = self.comm_W.deserialize(ptr);

        uint length;
        (length, ptr) = deserialize_uint64(ptr);
        self.X = new Fr[](length);
        for (uint i = 0; i < length; i++) {
            (self.X[i], ptr) = FrLib.deserialize(ptr);
        }

        return ptr;
    }

}


struct RelaxedR1CSInstance {
    G1 comm_W;
    G1 comm_E;
    Fr[] X;
    Fr u;
}

using RelaxedR1CSInstanceLib for RelaxedR1CSInstance global;

library RelaxedR1CSInstanceLib {

    function fold(
        RelaxedR1CSInstance memory self,
        R1CSInstance memory U2,
        G1 memory comm_T,
        Fr r
    ) internal view returns (RelaxedR1CSInstance memory result) {
        result.X = new Fr[](self.X.length);
        for (uint i = 0; i < self.X.length; i++) {
            result.X[i] = FrOps.add(
                self.X[i],
                FrOps.mul(r, U2.X[i])
            );
        }

        result.comm_W = BN256.add(self.comm_W, BN256.mul(U2.comm_W, r));

        result.comm_E = BN256.add(self.comm_E, BN256.mul(comm_T, r));

        result.u = FrOps.add(self.u, r);
    }

    function fold_relaxed(
        RelaxedR1CSInstance memory self,
        RelaxedR1CSInstance memory U2,
        G1 memory comm_T,
        Fr r
    ) internal view returns (RelaxedR1CSInstance memory result) {
        result.X = new Fr[](self.X.length);
        for (uint i = 0; i < self.X.length; i++) {
            result.X[i] = FrOps.add(
                self.X[i],
                FrOps.mul(r, U2.X[i])
            );
        }

        result.comm_W = BN256.add(self.comm_W, BN256.mul(U2.comm_W, r));

        result.comm_E = BN256.add(
            BN256.add(
                self.comm_E,
                BN256.mul(comm_T, r)
            ),
            BN256.mul(U2.comm_E, FrOps.mul(r, r))
        );

        result.u = FrOps.add(self.u, FrOps.mul(r, U2.u));
    }

    function derandomize(
        RelaxedR1CSInstance memory self,
        G1 memory dk,
        Fr r_W,
        Fr r_E
    ) internal view returns (RelaxedR1CSInstance memory result) {
        result.comm_W = BN256.add(self.comm_W, BN256.mul(dk, r_W.negate()));
        result.comm_E = BN256.add(self.comm_E, BN256.mul(dk, r_E.negate()));

        result.u = self.u;
        result.X = self.X;
    }

    function fingerprint(
        RelaxedR1CSInstance memory self,
        Fr acc,
        Fr c,
        Fr c_i,
        Fr[] memory v,
        uint v_offset
    ) internal pure returns (Fr, Fr, uint) {
        (acc, c_i, v_offset) = self.comm_W.fingerprint(acc, c, c_i, v, v_offset);
        (acc, c_i, v_offset) = self.comm_E.fingerprint(acc, c, c_i, v, v_offset);
        
        acc = FrOps.add(acc, FrOps.mul(c_i, self.u));
        c_i = FrOps.mul(c_i, c);
        v[v_offset++] = self.u;

        for (uint i = 0; i < self.X.length; i++) {
            acc = FrOps.add(acc, FrOps.mul(c_i, self.X[i]));
            c_i = FrOps.mul(c_i, c);
            v[v_offset++] = self.X[i];
        }

        return (acc, c_i, v_offset);
    }

    function absorb_in_transcript(RelaxedR1CSInstance memory self, Transcript memory transcript) internal pure {
        self.comm_W.absorb_in_transcript(transcript);
        self.comm_E.absorb_in_transcript(transcript);
        self.u.absorb_in_transcript(transcript);
        for (uint i = 0; i < self.X.length; i++) {
            self.X[i].absorb_in_transcript(transcript);
        }
    }

    function deserialize(RelaxedR1CSInstance memory self, uint ptr) internal pure returns (uint) {
        ptr = self.comm_W.deserialize(ptr);
        ptr = self.comm_E.deserialize(ptr);

        uint length;
        (length, ptr) = deserialize_uint64(ptr);
        self.X = new Fr[](length);
        for (uint i = 0; i < length; i++) {
            (self.X[i], ptr) = FrLib.deserialize(ptr);
        }

        (self.u, ptr) = FrLib.deserialize(ptr);

        return ptr;
    }

}

struct RelaxedR1CSInstanceGrumpkin {
    Grumpkin comm_W;
    Grumpkin comm_E;
    Fq[] X;
    Fq u;
}

using RelaxedR1CSInstanceGrumpkinLib for RelaxedR1CSInstanceGrumpkin global;

library RelaxedR1CSInstanceGrumpkinLib {

    function deserialize(RelaxedR1CSInstanceGrumpkin memory self, uint ptr) internal pure returns (uint) {
        ptr = self.comm_W.deserialize(ptr);
        ptr = self.comm_E.deserialize(ptr);

        uint length;
        (length, ptr) = deserialize_uint64(ptr);
        self.X = new Fq[](length);
        for (uint i = 0; i < length; i++) {
            (self.X[i], ptr) = FqLib.deserialize(ptr);
        }

        (self.u, ptr) = FqLib.deserialize(ptr);

        return ptr;
    }

}

struct RelaxedR1CSInstanceWithMCCompressed {
    Fr comm;
    Fq u;
    Fq[] X;
}

using RelaxedR1CSInstanceWithMCCompressedLib for RelaxedR1CSInstanceWithMCCompressed global;

library RelaxedR1CSInstanceWithMCCompressedLib {

    function deserialize(RelaxedR1CSInstanceWithMCCompressed memory self, uint ptr) internal pure returns (uint) {
        (self.comm, ptr) = FrLib.deserialize(ptr);
        (self.u, ptr) = FqLib.deserialize(ptr);

        uint length;
        (length, ptr) = deserialize_uint64(ptr);
        self.X = new Fq[](length);
        for (uint i = 0; i < length; i++) {
            (self.X[i], ptr) = FqLib.deserialize(ptr);
        }

        return ptr;
    }

    function fingerprint(
        RelaxedR1CSInstanceWithMCCompressed memory self,
        Fr acc,
        Fr c,
        Fr c_i,
        Fr[] memory v,
        uint v_offset
    ) internal pure returns (Fr, Fr, uint) {
        acc = FrOps.add(acc, FrOps.mul(c_i, self.comm));
        c_i = FrOps.mul(c_i, c);
        v[v_offset++] = self.comm;
        
        Fr tmp_u = FrOps.from(Fq.unwrap(self.u));
        acc = FrOps.add(acc, FrOps.mul(c_i, tmp_u));
        c_i = FrOps.mul(c_i, c);
        v[v_offset++] = tmp_u;

        for (uint i = 0; i < 7; i++) {
            uint temp = Fq.unwrap(self.X[i]);
            for (uint j = 0; j < BN_N_LIMBS; j++) {
                Fr limb = Fr.wrap(temp & BN_LIMB_WIDTH_MASK);
                acc = FrOps.add(acc, FrOps.mul(c_i, limb));
                c_i = FrOps.mul(c_i, c);
                v[v_offset++] = limb;
                temp = temp >> BN_LIMB_WIDTH;
            }
        }
        for (uint i = 0; i < 3; i++) {
            Fr temp = FrOps.from(Fq.unwrap(self.X[7 + i]));
            acc = FrOps.add(acc, FrOps.mul(c_i, temp));
            c_i = FrOps.mul(c_i, c);
            v[v_offset++] = temp;
        }

        return (acc, c_i, v_offset);
    }
}

struct PolyEvalInstanceFr {
    G1 c;
    Fr[] x;
    Fr e;
}

library PolyEvalInstanceFrLib {

    function batch(
        G1[] memory c_vec,
        Fr[] memory x,
        Fr[] memory e_vec,
        Fr s
    ) internal view returns (PolyEvalInstanceFr memory result) {
        Fr[] memory powers_of_s = powers(s, c_vec.length);
        Fr e = FrOps.zero;
        for (uint i = 0; i < e_vec.length && i < powers_of_s.length; i++) {
            e = FrOps.add(
                e,
                FrOps.mul(e_vec[i], powers_of_s[i])
            );
        }
        G1 memory c = G1Ops.identity();
        for (uint i = 0; i < c_vec.length; i++) {
            c = BN256.add(
                c,
                BN256.mul(c_vec[i], powers_of_s[i])
            );
        }

        result.c = c;
        result.x = x;
        result.e = e;
    }

    function batch_diff_size(
        G1[] memory c_vec,
        Fr[] memory e_vec,
        uint[] memory num_vars,
        Fr[] memory x,
        Fr s
    ) internal view returns (PolyEvalInstanceFr memory result) {
        uint num_instances = num_vars.length;
        if (c_vec.length != num_instances || e_vec.length != num_instances)
            revert Err(NovaError.OddInputLength);

        uint num_vars_max = x.length;
        Fr[] memory s_powers = powers(s, num_instances);
        // Rescale evaluations by the first Lagrange polynomial,
        // so that we can check its evaluation against x
        Fr[] memory evals_scaled = new Fr[](num_instances);
        for (uint i = 0; i < num_instances; i++) {
            Fr lagrange_eval = FrOps.one;
            for (uint j = 0; j < num_vars_max - num_vars[i]; j++) {
                lagrange_eval = lagrange_eval.mul(FrOps.one.sub(x[j]));
            }
            evals_scaled[i] = lagrange_eval.mul(e_vec[i]);
        }

        // C = ∑ᵢ γⁱ⋅Cᵢ
        G1 memory comm_joint = c_vec[0]; // function powers has required that num_instances>=1 && powers[0]=1
        for (uint i = 1; i < num_instances; i++) {
            comm_joint = BN256.add(comm_joint, BN256.mul(c_vec[i], s_powers[i]));
        }

        // v = ∑ᵢ γⁱ⋅vᵢ
        Fr eval_joint = evals_scaled[0]; // function powers has required that num_instances>=1 && powers[0]=1
        for (uint i = 1; i < num_instances; i++) {
            eval_joint = eval_joint.add(evals_scaled[i].mul(s_powers[i]));
        }

        result.c = comm_joint;
        result.x = x;
        result.e = eval_joint;
    }
}

struct R1CSShapeSparkCommitment {
    uint N; // size of each vector

    // commitments to the dense representation
    G1 comm_row;
    G1 comm_col;
    G1 comm_val_A;
    G1 comm_val_B;
    G1 comm_val_C;

    // commitments to the timestamp polynomials
    G1 comm_ts_row;
    G1 comm_ts_col;
}

using R1CSShapeSparkCommitmentLib for R1CSShapeSparkCommitment global;

library R1CSShapeSparkCommitmentLib {

    function absorb_in_transcript(R1CSShapeSparkCommitment memory self, Transcript memory transcript) internal pure {
        self.comm_row.absorb_in_transcript(transcript);
        self.comm_col.absorb_in_transcript(transcript);
        self.comm_val_A.absorb_in_transcript(transcript);
        self.comm_val_B.absorb_in_transcript(transcript);
        self.comm_val_C.absorb_in_transcript(transcript);
        self.comm_ts_row.absorb_in_transcript(transcript);
        self.comm_ts_col.absorb_in_transcript(transcript);
    }

    function deserialize(R1CSShapeSparkCommitment memory self, uint ptr) internal pure returns (uint) {
        (self.N, ptr) = deserialize_uint64(ptr);
        ptr = self.comm_row.deserialize(ptr);
        ptr = self.comm_col.deserialize(ptr);
        ptr = self.comm_val_A.deserialize(ptr);
        ptr = self.comm_val_B.deserialize(ptr);
        ptr = self.comm_val_C.deserialize(ptr);
        ptr = self.comm_ts_row.deserialize(ptr);
        ptr = self.comm_ts_col.deserialize(ptr);
        return ptr;
    }

}


struct RelaxedR1CSSNARKVerifierKey {
    uint num_cons;
    uint num_vars;
    HyperKZGVerifierKey vk_ee;
    R1CSShapeSparkCommitment S_comm;
}

using RelaxedR1CSSNARKVerifierKeyLib for RelaxedR1CSSNARKVerifierKey global;

library RelaxedR1CSSNARKVerifierKeyLib {

    function deserialize(RelaxedR1CSSNARKVerifierKey memory self, uint ptr) internal pure returns (uint) {
        (self.num_cons, ptr) = deserialize_uint64(ptr);
        (self.num_vars, ptr) = deserialize_uint64(ptr);
        ptr = self.vk_ee.deserialize(ptr);
        ptr = self.S_comm.deserialize(ptr);
        return ptr;
    }

}


struct RelaxedR1CSSNARK {
    // commitment to oracles: the first three are for Az, Bz, Cz,
    // and the last two are for memory reads
    G1 comm_Az;
    G1 comm_Bz;
    G1 comm_Cz;
    G1 comm_L_row;
    G1 comm_L_col;

    // commitments to aid the memory checks
    G1 comm_t_plus_r_inv_row;
    G1 comm_w_plus_r_inv_row;
    G1 comm_t_plus_r_inv_col;
    G1 comm_w_plus_r_inv_col;

    // claims about Az, Bz, and Cz polynomials
    Fr eval_Az_at_tau;
    Fr eval_Bz_at_tau;
    Fr eval_Cz_at_tau;

    // sum-check
    SumcheckProofFr sc;

    // claims from the end of the sum-check
    Fr eval_Az;
    Fr eval_Bz;
    Fr eval_Cz;
    Fr eval_E;
    Fr eval_L_row;
    Fr eval_L_col;
    Fr eval_val_A;
    Fr eval_val_B;
    Fr eval_val_C;

    Fr eval_W;

    Fr eval_t_plus_r_inv_row;
    Fr eval_row; // address
    Fr eval_w_plus_r_inv_row;
    Fr eval_ts_row;

    Fr eval_t_plus_r_inv_col;
    Fr eval_col; // address
    Fr eval_w_plus_r_inv_col;
    Fr eval_ts_col;

    // a PCS evaluation argument
    HyperKZGEvaluationArgument eval_arg;
}

using RelaxedR1CSSNARKLib for RelaxedR1CSSNARK global;

library RelaxedR1CSSNARKLib {

    function verify(
        RelaxedR1CSSNARK memory self,
        RelaxedR1CSSNARKVerifierKey memory vk,
        RelaxedR1CSInstance memory U,
        Transcript memory transcript
    ) internal view {
        G1 memory comm_Az = self.comm_Az;
        G1 memory comm_Bz = self.comm_Bz;
        G1 memory comm_Cz = self.comm_Cz;
        G1 memory comm_L_row = self.comm_L_row;
        G1 memory comm_L_col = self.comm_L_col;
        G1 memory comm_t_plus_r_inv_row = self.comm_t_plus_r_inv_row;
        G1 memory comm_w_plus_r_inv_row = self.comm_w_plus_r_inv_row;
        G1 memory comm_t_plus_r_inv_col = self.comm_t_plus_r_inv_col;
        G1 memory comm_w_plus_r_inv_col = self.comm_w_plus_r_inv_col;

        transcript.absorb(bytes("c"));
        comm_Az.absorb_in_transcript(transcript);
        comm_Bz.absorb_in_transcript(transcript);
        comm_Cz.absorb_in_transcript(transcript);

        uint num_rounds_sc = log2_ceil(vk.S_comm.N);
        Fr tau = transcript.squeezeFr("t");

        // add claims about Az, Bz, and Cz to be checked later
        // since all the three polynomials are opened at tau,
        // we can combine them into a single polynomial opened at tau
        transcript.absorb(bytes("e"));
        self.eval_Az_at_tau.absorb_in_transcript(transcript);
        self.eval_Bz_at_tau.absorb_in_transcript(transcript);
        self.eval_Cz_at_tau.absorb_in_transcript(transcript);
        
        transcript.absorb(bytes("e"));
        self.comm_L_row.absorb_in_transcript(transcript);
        self.comm_L_col.absorb_in_transcript(transcript);

        Fr c = transcript.squeezeFr("c");

        Fr claim = self.eval_Cz_at_tau.mul(c).add(self.eval_Bz_at_tau).mul(c).add(self.eval_Az_at_tau);
        
        Fr gamma = transcript.squeezeFr("g");
        
        Fr r = transcript.squeezeFr("r");

        transcript.absorb(bytes("l"));
        comm_t_plus_r_inv_row.absorb_in_transcript(transcript);
        comm_w_plus_r_inv_row.absorb_in_transcript(transcript);
        comm_t_plus_r_inv_col.absorb_in_transcript(transcript);
        comm_w_plus_r_inv_col.absorb_in_transcript(transcript);

        Fr rho = transcript.squeezeFr("r");

        uint num_claims = 10;
        Fr s = transcript.squeezeFr("r");
        Fr[] memory coeffs = powers(s, num_claims);
        claim = FrOps.mul(FrOps.add(coeffs[7], coeffs[8]), claim); // rest are zeros

        // verify sc
        Fr claim_sc_final;
        Fr[] memory rand_sc;
        (claim_sc_final, rand_sc) = self.sc.verify(claim, num_rounds_sc, 3, transcript);

        // verify claim_sc_final
        Fr claim_sc_final_expected;
        {
            Fr rand_eq_bound_rand_sc = EqPolynomial.evaluate(PowPolynomial.coordinates(rho, num_rounds_sc), rand_sc);
            Fr[] memory taus_coords = PowPolynomial.coordinates(tau, num_rounds_sc);

            Fr taus_bound_rand_sc = EqPolynomial.evaluate(taus_coords, rand_sc);
            Fr taus_masked_bound_rand_sc = MaskedEqPolynomial.evaluate(taus_coords, log2_ceil(vk.num_vars), rand_sc);
            
            Fr eval_t_plus_r_row;
            {
                Fr eval_addr_row = IdentityPolynomial.evaluate(num_rounds_sc, rand_sc);
                Fr eval_val_row = taus_bound_rand_sc;
                Fr eval_t = FrOps.add(eval_addr_row, FrOps.mul(gamma, eval_val_row));
                eval_t_plus_r_row = FrOps.add(eval_t, r);
            }
            
            Fr eval_w_plus_r_row;
            {
                Fr eval_addr_row = self.eval_row;
                Fr eval_val_row = self.eval_L_row;
                Fr eval_w = FrOps.add(eval_addr_row, FrOps.mul(gamma, eval_val_row));
                eval_w_plus_r_row = FrOps.add(eval_w, r);
            }

            Fr eval_t_plus_r_col;
            {
                Fr eval_addr_col = IdentityPolynomial.evaluate(num_rounds_sc, rand_sc);
                
                // memory contents is z, so we compute eval_Z from eval_W and eval_X
                Fr eval_val_col;
                {
                    // rand_sc was padded, so we now remove the padding
                    uint l = log2_ceil(vk.S_comm.N) - log2_ceil(2 * vk.num_vars);
                    // In the following code we assume rand_sc.length > l
                    if (rand_sc.length <= l)
                        revert Err(NovaError.InvalidSumcheckProof);

                    Fr factor = FrOps.one;
                    for (uint i = 0; i < l; i++) {
                        factor = FrOps.mul(
                            factor,
                            FrOps.sub(FrOps.one, rand_sc[i])
                        );
                    }

                    Fr[] memory X = new Fr[](U.X.length + 1);
                    X[0] = U.u;
                    for (uint i = 0; i < U.X.length; i++)
                        X[i + 1] = U.X[i];
                    Fr eval_X = SparsePolynomial.evaluate(rand_sc.length - l - 1, X, rand_sc, l + 1);

                    eval_val_col = FrOps.add(self.eval_W, FrOps.mul(FrOps.mul(factor, rand_sc[l]), eval_X));
                }
                Fr eval_t = FrOps.add(eval_addr_col, FrOps.mul(gamma, eval_val_col));
                eval_t_plus_r_col = FrOps.add(eval_t, r);
            }

            Fr eval_w_plus_r_col;
            {
                Fr eval_addr_col = self.eval_col;
                Fr eval_val_col = self.eval_L_col;
                Fr eval_w = FrOps.add(eval_addr_col, FrOps.mul(gamma, eval_val_col));
                eval_w_plus_r_col = FrOps.add(eval_w, r);
            }

            Fr claim_mem_final_expected = FrOps.add(
                FrOps.add(
                    FrOps.add(
                        FrOps.add(
                            FrOps.add(
                                FrOps.mul(coeffs[0], FrOps.sub(self.eval_t_plus_r_inv_row, self.eval_w_plus_r_inv_row)),
                                FrOps.mul(coeffs[1], FrOps.sub(self.eval_t_plus_r_inv_col, self.eval_w_plus_r_inv_col))
                            ),
                            FrOps.mul(coeffs[2], FrOps.mul(rand_eq_bound_rand_sc, FrOps.sub(FrOps.mul(self.eval_t_plus_r_inv_row, eval_t_plus_r_row), self.eval_ts_row)))
                        ),
                        FrOps.mul(coeffs[3], FrOps.mul(rand_eq_bound_rand_sc, FrOps.sub(FrOps.mul(self.eval_w_plus_r_inv_row, eval_w_plus_r_row), FrOps.one)))
                    ),
                    FrOps.mul(coeffs[4], FrOps.mul(rand_eq_bound_rand_sc, FrOps.sub(FrOps.mul(self.eval_t_plus_r_inv_col, eval_t_plus_r_col), self.eval_ts_col)))
                ),
                FrOps.mul(coeffs[5], FrOps.mul(rand_eq_bound_rand_sc, FrOps.sub(FrOps.mul(self.eval_w_plus_r_inv_col, eval_w_plus_r_col), FrOps.one)))
            );

            Fr claim_outer_final_expected = FrOps.add(
                FrOps.mul(
                    FrOps.mul(coeffs[6], taus_bound_rand_sc),
                    FrOps.sub(FrOps.sub(FrOps.mul(self.eval_Az, self.eval_Bz), FrOps.mul(U.u, self.eval_Cz)), self.eval_E)
                ),
                FrOps.mul(
                    FrOps.mul(coeffs[7], taus_bound_rand_sc),
                    FrOps.add(FrOps.add(self.eval_Az, FrOps.mul(c, self.eval_Bz)), FrOps.mul(FrOps.mul(c, c), self.eval_Cz))
                )
            );

            Fr claim_inner_final_expected = FrOps.mul(
                FrOps.mul(FrOps.mul(coeffs[8], self.eval_L_row), self.eval_L_col),
                FrOps.add(FrOps.add(self.eval_val_A, FrOps.mul(c, self.eval_val_B)), FrOps.mul(FrOps.mul(c, c), self.eval_val_C))
            );

            Fr claim_witness_final_expected = FrOps.mul(FrOps.mul(coeffs[9], taus_masked_bound_rand_sc), self.eval_W);

            claim_sc_final_expected = FrOps.add(FrOps.add(FrOps.add(claim_mem_final_expected, claim_outer_final_expected), claim_inner_final_expected), claim_witness_final_expected);
        }
        
        if (FrOps.neq(claim_sc_final_expected, claim_sc_final)) {
            revert Err(NovaError.InvalidSumcheckProof);
        }

        Fr[] memory eval_vec = new Fr[](18);
        (
            eval_vec[0], eval_vec[1], eval_vec[2], eval_vec[3], eval_vec[4], eval_vec[5], eval_vec[6], eval_vec[7], eval_vec[8],
            eval_vec[9], eval_vec[10], eval_vec[11], eval_vec[12], eval_vec[13], eval_vec[14], eval_vec[15], eval_vec[16], eval_vec[17]
        ) = (
            self.eval_W,
            self.eval_Az,
            self.eval_Bz,
            self.eval_Cz,
            self.eval_E,
            self.eval_L_row,
            self.eval_L_col,
            self.eval_val_A,
            self.eval_val_B,
            self.eval_val_C,
            self.eval_t_plus_r_inv_row,
            self.eval_row,
            self.eval_w_plus_r_inv_row,
            self.eval_ts_row,
            self.eval_t_plus_r_inv_col,
            self.eval_col,
            self.eval_w_plus_r_inv_col,
            self.eval_ts_col
        );
        G1[] memory comm_vec = new G1[](18);
        (
            comm_vec[0], comm_vec[1], comm_vec[2], comm_vec[3], comm_vec[4], comm_vec[5], comm_vec[6], comm_vec[7], comm_vec[8],
            comm_vec[9], comm_vec[10], comm_vec[11], comm_vec[12], comm_vec[13], comm_vec[14], comm_vec[15], comm_vec[16], comm_vec[17]
        ) = (
            U.comm_W,
            comm_Az,
            comm_Bz,
            comm_Cz,
            U.comm_E,
            comm_L_row,
            comm_L_col,
            vk.S_comm.comm_val_A,
            vk.S_comm.comm_val_B,
            vk.S_comm.comm_val_C,
            comm_t_plus_r_inv_row,
            vk.S_comm.comm_row,
            comm_w_plus_r_inv_row,
            vk.S_comm.comm_ts_row,
            comm_t_plus_r_inv_col,
            vk.S_comm.comm_col,
            comm_w_plus_r_inv_col,
            vk.S_comm.comm_ts_col
        );
        transcript.absorb(bytes("e"));
        for (uint i = 0; i < eval_vec.length; i++)
            eval_vec[i].absorb_in_transcript(transcript); // comm_vec is already in the transcript
        Fr cc = transcript.squeezeFr("c");
        PolyEvalInstanceFr memory u = PolyEvalInstanceFrLib.batch(comm_vec, rand_sc, eval_vec, cc);

        // verify and revert on failure
        HyperKZG.verify(
            vk.vk_ee,
            transcript,
            u.c,//C
            rand_sc,//x
            u.e,//y
            self.eval_arg//pi
        );
    }

    function deserialize(RelaxedR1CSSNARK memory self, uint ptr) internal pure returns (uint) {
        // commitment to oracles: the first three are for Az, Bz, Cz,
        // and the last two are for memory reads
        ptr = self.comm_Az.deserialize(ptr);
        ptr = self.comm_Bz.deserialize(ptr);
        ptr = self.comm_Cz.deserialize(ptr);
        ptr = self.comm_L_row.deserialize(ptr);
        ptr = self.comm_L_col.deserialize(ptr);
        // commitments to aid the memory checks
        ptr = self.comm_t_plus_r_inv_row.deserialize(ptr);
        ptr = self.comm_w_plus_r_inv_row.deserialize(ptr);
        ptr = self.comm_t_plus_r_inv_col.deserialize(ptr);
        ptr = self.comm_w_plus_r_inv_col.deserialize(ptr);
        // claims about Az, Bz, and Cz polynomials
        (self.eval_Az_at_tau, ptr) = FrLib.deserialize(ptr);
        (self.eval_Bz_at_tau, ptr) = FrLib.deserialize(ptr);
        (self.eval_Cz_at_tau, ptr) = FrLib.deserialize(ptr);
        // sum-check
        ptr = self.sc.deserialize(ptr);

        // claims from the end of the sum-check
        (self.eval_Az, ptr) = FrLib.deserialize(ptr);
        (self.eval_Bz, ptr) = FrLib.deserialize(ptr);
        (self.eval_Cz, ptr) = FrLib.deserialize(ptr);
        (self.eval_E, ptr) = FrLib.deserialize(ptr);
        (self.eval_L_row, ptr) = FrLib.deserialize(ptr);
        (self.eval_L_col, ptr) = FrLib.deserialize(ptr);
        (self.eval_val_A, ptr) = FrLib.deserialize(ptr);
        (self.eval_val_B, ptr) = FrLib.deserialize(ptr);
        (self.eval_val_C, ptr) = FrLib.deserialize(ptr);

        (self.eval_W, ptr) = FrLib.deserialize(ptr);

        (self.eval_t_plus_r_inv_row, ptr) = FrLib.deserialize(ptr);
        (self.eval_row, ptr) = FrLib.deserialize(ptr); // address
        (self.eval_w_plus_r_inv_row, ptr) = FrLib.deserialize(ptr);
        (self.eval_ts_row, ptr) = FrLib.deserialize(ptr);

        (self.eval_t_plus_r_inv_col, ptr) = FrLib.deserialize(ptr);
        (self.eval_col, ptr) = FrLib.deserialize(ptr); // address
        (self.eval_w_plus_r_inv_col, ptr) = FrLib.deserialize(ptr);
        (self.eval_ts_col, ptr) = FrLib.deserialize(ptr);

        ptr = self.eval_arg.deserialize(ptr);

        return ptr;
    }

}


struct BatchedRelaxedR1CSSNARKVerifierKey {
    HyperKZGVerifierKey vk_ee;
    R1CSShapeSparkCommitment[] S_comm;
    uint[] num_vars;
}

using BatchedRelaxedR1CSSNARKVerifierKeyLib for BatchedRelaxedR1CSSNARKVerifierKey global;

library BatchedRelaxedR1CSSNARKVerifierKeyLib {

    function deserialize(BatchedRelaxedR1CSSNARKVerifierKey memory self, uint ptr) internal pure returns (uint) {
        ptr = self.vk_ee.deserialize(ptr);

        uint length;
        (length, ptr) = deserialize_uint64(ptr);
        self.S_comm = new R1CSShapeSparkCommitment[](length);
        for (uint i = 0; i < length; i++)
            ptr = self.S_comm[i].deserialize(ptr);

        (length, ptr) = deserialize_uint64(ptr);
        self.num_vars = new uint[](length);
        for (uint i = 0; i < length; i++)
            (self.num_vars[i], ptr) = deserialize_uint64(ptr);

        return ptr;
    }

}


/// A succinct proof of knowledge of a witness to a relaxed R1CS instance
/// The proof is produced using Spartan's combination of the sum-check and
/// the commitment to a vector viewed as a polynomial commitment
struct BatchedRelaxedR1CSSNARK {
    // commitment to oracles: the first three are for Az, Bz, Cz,
    // and the last two are for memory reads
    G1[3][] comms_Az_Bz_Cz;
    G1[2][] comms_L_row_col;
    // commitments to aid the memory checks
    // [t_plus_r_inv_row, w_plus_r_inv_row, t_plus_r_inv_col, w_plus_r_inv_col]
    G1[4][] comms_mem_oracles;

    // claims about Az, Bz, and Cz polynomials
    Fr[3][] evals_Az_Bz_Cz_at_tau;

    // sum-check
    SumcheckProofFr sc;

    // claims from the end of sum-check
    Fr[5][] evals_Az_Bz_Cz_W_E;
    Fr[2][] evals_L_row_col;
    // [t_plus_r_inv_row, w_plus_r_inv_row, t_plus_r_inv_col, w_plus_r_inv_col]
    Fr[4][] evals_mem_oracle;
    // [val_A, val_B, val_C, row, col, ts_row, ts_col]
    Fr[7][] evals_mem_preprocessed;

    // a PCS evaluation argument
    HyperKZGEvaluationArgument eval_arg;
}

using BatchedRelaxedR1CSSNARKLib for BatchedRelaxedR1CSSNARK global;

library BatchedRelaxedR1CSSNARKLib {

    uint private constant num_claims_per_instance = 10;
    function verify(
        BatchedRelaxedR1CSSNARK memory self,
        BatchedRelaxedR1CSSNARKVerifierKey memory vk,
        RelaxedR1CSInstance[] memory U,
        Transcript memory transcript
    ) external view {
        uint num_instances = U.length;
        
        // number of rounds of sum-check
        uint[] memory num_rounds = new uint[](num_instances);
        uint num_rounds_max = 0;
        for (uint i = 0; i < num_instances; i++) {
            num_rounds[i] = log2_ceil(vk.S_comm[i].N);
            if (num_rounds[i] > num_rounds_max)
                num_rounds_max = num_rounds[i];
        }

        // Decompress commitments
        G1[3][] memory comms_Az_Bz_Cz = self.comms_Az_Bz_Cz;
        G1[2][] memory comms_L_row_col = self.comms_L_row_col;
        G1[4][] memory comms_mem_oracles = self.comms_mem_oracles;

        // Add commitments [Az, Bz, Cz] to the transcript
        for (uint i = 0; i < num_instances; i++) {
            transcript.absorb(bytes("c"));
            comms_Az_Bz_Cz[i][0].absorb_in_transcript(transcript);
            comms_Az_Bz_Cz[i][1].absorb_in_transcript(transcript);
            comms_Az_Bz_Cz[i][2].absorb_in_transcript(transcript);
        }

        Fr tau = transcript.squeezeFr("t");

        // absorb the claimed evaluations into the transcript
        for (uint i = 0; i < num_instances; i++) {
            transcript.absorb(bytes("e"));
            self.evals_Az_Bz_Cz_at_tau[i][0].absorb_in_transcript(transcript);
            self.evals_Az_Bz_Cz_at_tau[i][1].absorb_in_transcript(transcript);
            self.evals_Az_Bz_Cz_at_tau[i][2].absorb_in_transcript(transcript);
        }

        // absorb commitments to L_row and L_col in the transcript
        for (uint i = 0; i < num_instances; i++) {
            transcript.absorb(bytes("e"));
            comms_L_row_col[i][0].absorb_in_transcript(transcript);
            comms_L_row_col[i][1].absorb_in_transcript(transcript);
        }

        // Batch at tau for each instance
        Fr c = transcript.squeezeFr("c");

        // Compute eval_Mz = eval_Az_at_tau + c * eval_Bz_at_tau + c^2 * eval_Cz_at_tau
        Fr[] memory evals_Mz = new Fr[](num_instances);
        for (uint i = 0; i < num_instances; i++) {
            evals_Mz[i] = c
                .mul(self.evals_Az_Bz_Cz_at_tau[i][2])
                .add(self.evals_Az_Bz_Cz_at_tau[i][1])
                .mul(c)
                .add(self.evals_Az_Bz_Cz_at_tau[i][0]);
        }

        Fr gamma = transcript.squeezeFr("g");
        Fr r = transcript.squeezeFr("r");

        for (uint i = 0; i < num_instances; i++) {
            transcript.absorb(bytes("l"));
            comms_mem_oracles[i][0].absorb_in_transcript(transcript);
            comms_mem_oracles[i][1].absorb_in_transcript(transcript);
            comms_mem_oracles[i][2].absorb_in_transcript(transcript);
            comms_mem_oracles[i][3].absorb_in_transcript(transcript);
        }

        Fr rho = transcript.squeezeFr("r");

        Fr s = transcript.squeezeFr("r");
        Fr[] memory s_powers = powers(s, num_instances * num_claims_per_instance);

        Fr claim_sc_final;
        Fr[] memory rand_sc;
        {
            // Gather all claims into a single vector
            Fr[] memory claims = new Fr[](num_instances * num_claims_per_instance);
            // Note: assume here that claims[] is initialized to zero
            for (uint i = 0; i < num_instances; i++) {
                claims[i * num_claims_per_instance + 7] = evals_Mz[i];
                claims[i * num_claims_per_instance + 8] = evals_Mz[i];
            }

            // Number of rounds for each claim
            uint[] memory num_rounds_by_claim = new uint[](num_instances * num_claims_per_instance);
            for (uint i = 0; i < num_instances; i++) {
                for (uint j = 0; j < num_claims_per_instance; j++) {
                    num_rounds_by_claim[i * num_claims_per_instance + j] = num_rounds[i];
                }
            }

            (claim_sc_final, rand_sc) = self.sc.verify_batch(claims, num_rounds_by_claim, s_powers, 3, transcript);
        }

        // Truncated sumcheck randomness for each instance
        Fr[][] memory rand_sc_i = new Fr[][](num_instances);
        for (uint i = 0; i < num_instances; i++) {
            uint begin = num_rounds_max - num_rounds[i];
            rand_sc_i[i] = new Fr[](rand_sc.length - begin);
            for (uint j = 0; j < rand_sc.length - begin; j++) {
                rand_sc_i[i][j] = rand_sc[j + begin];
            }
        }

        Fr claim_sc_final_expected = FrOps.zero;
        for (uint i = 0; i < num_instances; i++) {
            (Fr Az, Fr Bz, Fr Cz, Fr W, Fr E) = (
                self.evals_Az_Bz_Cz_W_E[i][0],
                self.evals_Az_Bz_Cz_W_E[i][1],
                self.evals_Az_Bz_Cz_W_E[i][2],
                self.evals_Az_Bz_Cz_W_E[i][3],
                self.evals_Az_Bz_Cz_W_E[i][4]
            );
            (Fr L_row, Fr L_col) = (self.evals_L_row_col[i][0], self.evals_L_row_col[i][1]);
            (Fr t_plus_r_inv_row, Fr w_plus_r_inv_row, Fr t_plus_r_inv_col, Fr w_plus_r_inv_col) = (
                self.evals_mem_oracle[i][0],
                self.evals_mem_oracle[i][1],
                self.evals_mem_oracle[i][2],
                self.evals_mem_oracle[i][3]
            );
            (Fr val_A, Fr val_B, Fr val_C, Fr row, Fr col, Fr ts_row, Fr ts_col) = (
                self.evals_mem_preprocessed[i][0],
                self.evals_mem_preprocessed[i][1],
                self.evals_mem_preprocessed[i][2],
                self.evals_mem_preprocessed[i][3],
                self.evals_mem_preprocessed[i][4],
                self.evals_mem_preprocessed[i][5],
                self.evals_mem_preprocessed[i][6]
            );
            Fr[] memory rand_sc = rand_sc_i[i];
            uint num_vars_log = log2_ceil(vk.num_vars[i]);
            uint num_rounds_i = rand_sc.length;
            
            Fr eq_rho = EqPolynomial.evaluate(PowPolynomial.coordinates(rho, num_rounds_i), rand_sc);
            
            Fr eq_tau; Fr eq_masked_tau;
            {
                Fr[] memory tau_coords = PowPolynomial.coordinates(tau, num_rounds_i);
                eq_tau = EqPolynomial.evaluate(tau_coords, rand_sc);
                eq_masked_tau = MaskedEqPolynomial.evaluate(tau_coords, num_vars_log, rand_sc);
            }

            // Evaluate identity polynomial
            Fr id = IdentityPolynomial.evaluate(num_rounds_i, rand_sc);

            Fr Z;
            {
                // rand_sc was padded, so we now remove the padding
                uint l = num_rounds_i - (num_vars_log + 1);
                Fr factor = FrOps.one;
                for (uint j = 0; j < l; j++) {
                    factor = factor.mul(FrOps.one.sub(rand_sc[j]));
                }

                Fr[] memory poly_X = new Fr[](1 + U[i].X.length);
                poly_X[0] = U[i].u;
                for (uint j = 1; j < poly_X.length; j++) {
                    poly_X[j] = U[i].X[j - 1];
                }
                Fr X = SparsePolynomial.evaluate(num_vars_log, poly_X, rand_sc, l + 1);

                // W was evaluated as if it was padded to logNi variables,
                // so we don't multiply it by (1-rand_sc_unpad[0])
                Z = W.add(factor.mul(rand_sc[l]).mul(X));
            }

            Fr t_plus_r_row = gamma.mul(eq_tau).add(id).add(r);

            Fr w_plus_r_row = gamma.mul(L_row).add(row).add(r);

            Fr t_plus_r_col = gamma.mul(Z).add(id).add(r);

            Fr w_plus_r_col = gamma.mul(L_col).add(col).add(r);

            claim_sc_final_expected = claim_sc_final_expected.add(
                s_powers[i * 10 + 0].mul(
                    t_plus_r_inv_row.sub(w_plus_r_inv_row)
                )
            );
            claim_sc_final_expected = claim_sc_final_expected.add(
                s_powers[i * 10 + 1].mul(
                    t_plus_r_inv_col.sub(w_plus_r_inv_col)
                )
            );
            claim_sc_final_expected = claim_sc_final_expected.add(
                s_powers[i * 10 + 2].mul(
                    eq_rho.mul(t_plus_r_inv_row.mul(t_plus_r_row).sub(ts_row))
                )
            );
            claim_sc_final_expected = claim_sc_final_expected.add(
                s_powers[i * 10 + 3].mul(
                    eq_rho.mul(w_plus_r_inv_row.mul(w_plus_r_row).sub(FrOps.one))
                )
            );
            claim_sc_final_expected = claim_sc_final_expected.add(
                s_powers[i * 10 + 4].mul(
                    eq_rho.mul(t_plus_r_inv_col.mul(t_plus_r_col).sub(ts_col))
                )
            );
            claim_sc_final_expected = claim_sc_final_expected.add(
                s_powers[i * 10 + 5].mul(
                    eq_rho.mul(w_plus_r_inv_col.mul(w_plus_r_col).sub(FrOps.one))
                )
            );
            claim_sc_final_expected = claim_sc_final_expected.add(
                s_powers[i * 10 + 6].mul(
                    eq_tau.mul(Az.mul(Bz).sub(U[i].u.mul(Cz)).sub(E))
                )
            );
            claim_sc_final_expected = claim_sc_final_expected.add(
                s_powers[i * 10 + 7].mul(
                    eq_tau.mul(Cz.mul(c).add(Bz).mul(c).add(Az))
                )
            );
            claim_sc_final_expected = claim_sc_final_expected.add(
                s_powers[i * 10 + 8].mul(
                    L_row.mul(L_col).mul(val_C.mul(c).add(val_B).mul(c).add(val_A))
                )
            );
            claim_sc_final_expected = claim_sc_final_expected.add(
                s_powers[i * 10 + 9].mul(
                    eq_masked_tau.mul(W)
                )
            );
        }

        if (claim_sc_final_expected.neq(claim_sc_final)) {
            revert Err(NovaError.InvalidSumcheckProof);
        }

        // Add all Sumcheck evaluations to the transcript
        for (uint i = 0; i < num_instances; i++) {
            transcript.absorb(bytes("e"));

            self.evals_Az_Bz_Cz_W_E[i][0].absorb_in_transcript(transcript);
            self.evals_Az_Bz_Cz_W_E[i][1].absorb_in_transcript(transcript);
            self.evals_Az_Bz_Cz_W_E[i][2].absorb_in_transcript(transcript);
            self.evals_Az_Bz_Cz_W_E[i][3].absorb_in_transcript(transcript);
            self.evals_Az_Bz_Cz_W_E[i][4].absorb_in_transcript(transcript);

            self.evals_L_row_col[i][0].absorb_in_transcript(transcript);
            self.evals_L_row_col[i][1].absorb_in_transcript(transcript);

            self.evals_mem_oracle[i][0].absorb_in_transcript(transcript);
            self.evals_mem_oracle[i][1].absorb_in_transcript(transcript);
            self.evals_mem_oracle[i][2].absorb_in_transcript(transcript);
            self.evals_mem_oracle[i][3].absorb_in_transcript(transcript);

            self.evals_mem_preprocessed[i][0].absorb_in_transcript(transcript);
            self.evals_mem_preprocessed[i][1].absorb_in_transcript(transcript);
            self.evals_mem_preprocessed[i][2].absorb_in_transcript(transcript);
            self.evals_mem_preprocessed[i][3].absorb_in_transcript(transcript);
            self.evals_mem_preprocessed[i][4].absorb_in_transcript(transcript);
            self.evals_mem_preprocessed[i][5].absorb_in_transcript(transcript);
            self.evals_mem_preprocessed[i][6].absorb_in_transcript(transcript);
        }

        c = transcript.squeezeFr("c");

        // Compute batched polynomial evaluation instance at rand_sc
        PolyEvalInstanceFr memory u;
        {
            Fr[] memory evals_vec = new Fr[](18 * num_instances);
            for (uint i = 0; i < num_instances; i++) {
                uint j = i * 18;
                evals_vec[j++] = self.evals_Az_Bz_Cz_W_E[i][0];
                evals_vec[j++] = self.evals_Az_Bz_Cz_W_E[i][1];
                evals_vec[j++] = self.evals_Az_Bz_Cz_W_E[i][2];
                evals_vec[j++] = self.evals_Az_Bz_Cz_W_E[i][3];
                evals_vec[j++] = self.evals_Az_Bz_Cz_W_E[i][4];

                evals_vec[j++] = self.evals_L_row_col[i][0];
                evals_vec[j++] = self.evals_L_row_col[i][1];

                evals_vec[j++] = self.evals_mem_oracle[i][0];
                evals_vec[j++] = self.evals_mem_oracle[i][1];
                evals_vec[j++] = self.evals_mem_oracle[i][2];
                evals_vec[j++] = self.evals_mem_oracle[i][3];

                evals_vec[j++] = self.evals_mem_preprocessed[i][0];
                evals_vec[j++] = self.evals_mem_preprocessed[i][1];
                evals_vec[j++] = self.evals_mem_preprocessed[i][2];
                evals_vec[j++] = self.evals_mem_preprocessed[i][3];
                evals_vec[j++] = self.evals_mem_preprocessed[i][4];
                evals_vec[j++] = self.evals_mem_preprocessed[i][5];
                evals_vec[j++] = self.evals_mem_preprocessed[i][6];
            }

            uint[] memory num_vars = new uint[](num_instances * 18);
            for (uint i = 0; i < num_instances; i++) {
                for (uint j = 0; j < 18; j++) {
                    num_vars[i * 18 + j] = num_rounds[i];
                }
            }

            G1[] memory comms_vec = new G1[](num_instances * 18);
            for (uint i = 0; i < num_instances; i++) {
                uint j = i * 18;
                comms_vec[j++] = comms_Az_Bz_Cz[i][0];
                comms_vec[j++] = comms_Az_Bz_Cz[i][1];
                comms_vec[j++] = comms_Az_Bz_Cz[i][2];

                comms_vec[j++] = U[i].comm_W;
                comms_vec[j++] = U[i].comm_E;

                comms_vec[j++] = comms_L_row_col[i][0];
                comms_vec[j++] = comms_L_row_col[i][1];

                comms_vec[j++] = comms_mem_oracles[i][0];
                comms_vec[j++] = comms_mem_oracles[i][1];
                comms_vec[j++] = comms_mem_oracles[i][2];
                comms_vec[j++] = comms_mem_oracles[i][3];

                comms_vec[j++] = vk.S_comm[i].comm_val_A;
                comms_vec[j++] = vk.S_comm[i].comm_val_B;
                comms_vec[j++] = vk.S_comm[i].comm_val_C;
                comms_vec[j++] = vk.S_comm[i].comm_row;
                comms_vec[j++] = vk.S_comm[i].comm_col;
                comms_vec[j++] = vk.S_comm[i].comm_ts_row;
                comms_vec[j++] = vk.S_comm[i].comm_ts_col;
            }

            u = PolyEvalInstanceFrLib.batch_diff_size(comms_vec, evals_vec, num_vars, rand_sc, c);
        }

        // verify
        HyperKZG.verify(vk.vk_ee, transcript, u.c, u.x, u.e, self.eval_arg);
    }

    function deserialize(BatchedRelaxedR1CSSNARK memory self, uint ptr) internal pure returns (uint) {
        uint length;
        (length, ptr) = deserialize_uint64(ptr);
        self.comms_Az_Bz_Cz = new G1[3][](length);
        for (uint i = 0; i < length; i++) {
            ptr = self.comms_Az_Bz_Cz[i][0].deserialize(ptr);
            ptr = self.comms_Az_Bz_Cz[i][1].deserialize(ptr);
            ptr = self.comms_Az_Bz_Cz[i][2].deserialize(ptr);
        }

        (length, ptr) = deserialize_uint64(ptr);
        self.comms_L_row_col = new G1[2][](length);
        for (uint i = 0; i < length; i++) {
            ptr = self.comms_L_row_col[i][0].deserialize(ptr);
            ptr = self.comms_L_row_col[i][1].deserialize(ptr);
        }

        (length, ptr) = deserialize_uint64(ptr);
        self.comms_mem_oracles = new G1[4][](length);
        for (uint i = 0; i < length; i++) {
            ptr = self.comms_mem_oracles[i][0].deserialize(ptr);
            ptr = self.comms_mem_oracles[i][1].deserialize(ptr);
            ptr = self.comms_mem_oracles[i][2].deserialize(ptr);
            ptr = self.comms_mem_oracles[i][3].deserialize(ptr);
        }

        (length, ptr) = deserialize_uint64(ptr);
        self.evals_Az_Bz_Cz_at_tau = new Fr[3][](length);
        for (uint i = 0; i < length; i++) {
            (self.evals_Az_Bz_Cz_at_tau[i][0], ptr) = FrLib.deserialize(ptr);
            (self.evals_Az_Bz_Cz_at_tau[i][1], ptr) = FrLib.deserialize(ptr);
            (self.evals_Az_Bz_Cz_at_tau[i][2], ptr) = FrLib.deserialize(ptr);
        }

        ptr = self.sc.deserialize(ptr);

        (length, ptr) = deserialize_uint64(ptr);
        self.evals_Az_Bz_Cz_W_E = new Fr[5][](length);
        for (uint i = 0; i < length; i++) {
            (self.evals_Az_Bz_Cz_W_E[i][0], ptr) = FrLib.deserialize(ptr);
            (self.evals_Az_Bz_Cz_W_E[i][1], ptr) = FrLib.deserialize(ptr);
            (self.evals_Az_Bz_Cz_W_E[i][2], ptr) = FrLib.deserialize(ptr);
            (self.evals_Az_Bz_Cz_W_E[i][3], ptr) = FrLib.deserialize(ptr);
            (self.evals_Az_Bz_Cz_W_E[i][4], ptr) = FrLib.deserialize(ptr);
        }

        (length, ptr) = deserialize_uint64(ptr);
        self.evals_L_row_col = new Fr[2][](length);
        for (uint i = 0; i < length; i++) {
            (self.evals_L_row_col[i][0], ptr) = FrLib.deserialize(ptr);
            (self.evals_L_row_col[i][1], ptr) = FrLib.deserialize(ptr);
        }

        (length, ptr) = deserialize_uint64(ptr);
        self.evals_mem_oracle = new Fr[4][](length);
        for (uint i = 0; i < length; i++) {
            (self.evals_mem_oracle[i][0], ptr) = FrLib.deserialize(ptr);
            (self.evals_mem_oracle[i][1], ptr) = FrLib.deserialize(ptr);
            (self.evals_mem_oracle[i][2], ptr) = FrLib.deserialize(ptr);
            (self.evals_mem_oracle[i][3], ptr) = FrLib.deserialize(ptr);
        }
        
        (length, ptr) = deserialize_uint64(ptr);
        self.evals_mem_preprocessed = new Fr[7][](length);
        for (uint i = 0; i < length; i++) {
            (self.evals_mem_preprocessed[i][0], ptr) = FrLib.deserialize(ptr);
            (self.evals_mem_preprocessed[i][1], ptr) = FrLib.deserialize(ptr);
            (self.evals_mem_preprocessed[i][2], ptr) = FrLib.deserialize(ptr);
            (self.evals_mem_preprocessed[i][3], ptr) = FrLib.deserialize(ptr);
            (self.evals_mem_preprocessed[i][4], ptr) = FrLib.deserialize(ptr);
            (self.evals_mem_preprocessed[i][5], ptr) = FrLib.deserialize(ptr);
            (self.evals_mem_preprocessed[i][6], ptr) = FrLib.deserialize(ptr);
        }

        ptr = self.eval_arg.deserialize(ptr);

        return ptr;
    }

}