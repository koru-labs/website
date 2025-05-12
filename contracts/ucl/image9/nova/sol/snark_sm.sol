// SPDX-License-Identifier: license.pdf
pragma solidity >=0.8.25;

import "./transcript.sol";
import "./sumcheck.sol";
import "./r1cs.sol";


struct RelaxedR1CSSNARKForSM {
    SumcheckProofFq sc_proof_outer;
    Fq[3] claims_outer;
    Fq eval_E;
    SumcheckProofFq sc_proof_inner;
    Fq eval_W;

    SumcheckProofFq sc_proof_batch;
    Fq[] evals_batch;
}

using RelaxedR1CSSNARKForSMLib for RelaxedR1CSSNARKForSM global;

library RelaxedR1CSSNARKForSMLib {

    uint private constant num_rounds_x = 11;
    uint private constant num_rounds_y = 12;
    uint private constant NUM_BITS_IN_R1 = 7;
    uint private constant NUM_BITS_IN_C1 = 8;

    /// Warning: As de declare this function as `external`,
    /// parameter `transcript` is "copied" from the caller's memory to the callee's here.
    /// Thus, the caller's transcript in his memory will not include the modifications
    /// by this function.
    /// Since `Transcript` type is usually large, instead of returning `transcript` and
    /// make memory copies again, we return only an `Fq` squeezed in the end.
    function verify(
        RelaxedR1CSSNARKForSM memory self,
        RelaxedR1CSInstanceWithMCCompressed memory U,
        Transcript memory transcript
    ) external pure returns (Fr, Fq[] memory, Fq, Fq, Fq) {
        // outer sum-check
        Fq tau = transcript.squeezeFq("t");
        Fq[] memory tau_coords = PowPolynomial.coordinates(tau, num_rounds_x);

        Fq claim_outer_final;
        Fq[] memory r_x;
        (claim_outer_final, r_x) = self.sc_proof_outer.verify(FqOps.zero, num_rounds_x, 3, transcript);

        // verify claim_outer_final
        Fq taus_bound_rx = EqPolynomial.evaluate(tau_coords, r_x);
        Fq claim_outer_final_expected = FqOps.mul(
            taus_bound_rx,
            FqOps.sub(
                FqOps.sub(
                    FqOps.mul(self.claims_outer[0], self.claims_outer[1]),
                    FqOps.mul(U.u, self.claims_outer[2])
                ),
                self.eval_E
            )
        );
        if (FqOps.neq(claim_outer_final, claim_outer_final_expected)) {
            revert Err(NovaError.InvalidSumcheckProof);
        }

        transcript.absorb(bytes("o"));
        self.claims_outer[0].absorb_in_transcript(transcript);
        self.claims_outer[1].absorb_in_transcript(transcript);
        self.claims_outer[2].absorb_in_transcript(transcript);
        self.eval_E.absorb_in_transcript(transcript);

        // inner sum-check
        Fq r = transcript.squeezeFq("r");
        Fq claim_inner_joint = FqOps.add(
            FqOps.add(
                self.claims_outer[0],
                FqOps.mul(r, self.claims_outer[1])
            ),
            FqOps.mul(FqOps.mul(r, r), self.claims_outer[2])
        );

        Fq claim_inner_final;
        Fq[] memory r_y;
        (claim_inner_final, r_y) = self.sc_proof_inner.verify(claim_inner_joint, num_rounds_y, 2, transcript);
        
        // compute evaluations of R1CS matrices
        Fq[] memory T_x2 = EqPolynomial.evals_from_points(r_x, NUM_BITS_IN_R1, r_x.length - NUM_BITS_IN_R1);
        Fq[] memory T_y1_tmp = EqPolynomial.evals_from_points(r_y, 1, NUM_BITS_IN_C1 - 1);
        Fq[] memory T_y2 = EqPolynomial.evals_from_points(r_y, NUM_BITS_IN_C1, r_y.length - NUM_BITS_IN_C1);

        // T_y1 is of size 256, but we only need entries up to index 128
        // so we compute 127 entries above and the entry 128 now
        Fq f = FqOps.sub(FqOps.one, r_y[0]);
        Fq T_y1_128 = FqOps.mul(T_y1_tmp[0], r_y[0]);
        Fq[] memory T_y1 = new Fq[](T_y1_tmp.length + 1);
        for (uint i = 0; i < T_y1_tmp.length; ++i) {
            T_y1[i] = FqOps.mul(f, T_y1_tmp[i]);
        }
        T_y1[T_y1_tmp.length] = T_y1_128;

        // simple sanity checks
        require(T_x2.length == (uint(1) << 4), "BUGTX2");
        require(T_y1.length == (uint(1) + (uint(1) << (NUM_BITS_IN_C1 - 1))), "BUGTY1");
        require(T_y2.length == (uint(1) << 4), "BUGTY2");

        // compute eval_A directly in a succinct manner
        // base case

        Fq eval_A_base = T_x2[0].mul(T_y2[4])
            .add(T_x2[1].mul(T_y2[2]))
            .add(T_x2[2].add(T_x2[3]).add(T_x2[4]).mul(T_y2[6]))
            .add(T_x2[5].add(T_x2[6]).add(T_x2[7]).mul(T_y2[9]))
            .add(T_x2[8].mul(T_y2[10].sub(T_y2[0])))
            .add(T_x2[9].mul(T_y2[11].sub(T_y2[1])));

        // non-base case (same row accesses)
        Fq eval_A_nonbase_same_row = T_x2[0].mul(T_y2[4])
            .add((T_x2[2].add(T_x2[3]).add(T_x2[4])).mul(T_y2[6]))
            .add((T_x2[5].add(T_x2[6]).add(T_x2[7])).mul(T_y2[9]))
            .add(T_x2[8].mul(T_y2[10]))
            .add(T_x2[9].mul(T_y2[11]));

        // non-base case (prior row accesses)
        Fq eval_A_nonbase_prior_row = T_x2[1].mul(T_y2[7]).sub(T_x2[8].mul(T_y2[12])).sub(T_x2[9].mul(T_y2[13]));

        // base case
        Fq eval_B_base = T_x2[0].mul(T_y2[4])
            .add(T_x2[1].mul(T_y2[2]))
            .add(Fq.wrap(2).mul(T_x2[2]).mul(T_y2[3]))
            .add(T_x2[3].mul(T_y2[6]))
            .add(T_x2[4].mul(T_y2[2].sub(T_y2[7])))
            .add(T_x2[5].mul(T_y2[7].sub(T_y2[0])))
            .add(T_x2[6].mul(T_y2[9]))
            .add(T_x2[7].mul(T_y2[0].sub(T_y2[10])))
            .add(T_x2[8].add(T_x2[9]).mul(T_y2[4]));

        Fq eval_B_nonbase_same_row = T_x2[0].add(T_x2[8]).add(T_x2[9]).mul(T_y2[4])
            .add(T_x2[3].mul(T_y2[6]))
            .add(T_x2[5].sub(T_x2[4]).mul(T_y2[7]))
            .add(T_x2[6].mul(T_y2[9]))
            .sub(T_x2[7].mul(T_y2[10]));

        Fq eval_B_nonbase_prior_row = Fq.wrap(2).mul(T_x2[2]).mul(T_y2[8])
            .add(T_x2[1].add(T_x2[4]).mul(T_y2[7]))
            .add(T_x2[7].sub(T_x2[5]).mul(T_y2[12]));

        Fq eval_C_base = T_x2[0].mul(T_y2[4])
            .add(T_x2[1].add(Fq.wrap(3).mul(T_x2[2])).mul(T_y2[5]))
            .add(T_x2[3].mul(Fq.wrap(2).mul(T_y2[2]).add(T_y2[7])))
            .add(T_x2[4].mul(T_y2[3].add(T_y2[8])))
            .add(T_x2[5].mul(T_y2[8].sub(T_y2[1])))
            .add(T_x2[6].mul(T_y2[0].add(T_y2[7]).add(T_y2[10])))
            .add(T_x2[7].mul(T_y2[1].add(T_y2[11])))
            .add(T_x2[8].mul(T_y2[12].sub(T_y2[0])))
            .add(T_x2[9].mul(T_y2[13].sub(T_y2[1])));

        Fq eval_C_nonbase_same_row = T_x2[0].mul(T_y2[4])
            .add(Fq.wrap(3).mul(T_x2[2]).add(T_x2[1]).mul(T_y2[5]))
            .add(T_x2[3].mul(T_y2[7]))
            .add(T_x2[4].add(T_x2[5]).mul(T_y2[8]))
            .add(T_x2[6].mul(T_y2[7].add(T_y2[10])))
            .add(T_x2[7].mul(T_y2[11]))
            .add(T_x2[8].mul(T_y2[12]))
            .add(T_x2[9].mul(T_y2[13]));

        Fq eval_C_nonbase_prior_row = Fq.wrap(2).mul(T_x2[3]).mul(T_y2[7])
            .add(T_x2[4].mul(T_y2[8]))
            .add(T_x2[6].sub(T_x2[8]).mul(T_y2[12]))
            .add(T_x2[7].sub(T_x2[9]).sub(T_x2[5]).mul(T_y2[13]));

        // outer evaluations
        
        // we compute T_x1[0], T_x1[124], T_x1[125], T_x1[126], T_x1[127] separately
        // bits of 0 = [0, 0, 0, 0, 0, 0, 0]
        // bits of 124 = [1, 1, 1, 1, 1, 0, 0]
        // bits of 125 = [1, 1, 1, 1, 1, 0, 1]
        // bits of 126 = [1, 1, 1, 1, 1, 1, 0]
        // bits of 127 = [1, 1, 1, 1, 1, 1, 1]
        Fq T_x1_0 = FqOps.one.sub(r_x[0]);
        for (uint i = 1; i < NUM_BITS_IN_R1; i++)
            T_x1_0 = T_x1_0.mul(FqOps.one.sub(r_x[i]));
        Fq common = r_x[0].mul(r_x[1]).mul(r_x[2]).mul(r_x[3]).mul(r_x[4]);
        Fq T_x1_124 = common.mul(FqOps.one.sub(r_x[5])).mul(FqOps.one.sub(r_x[6]));
        Fq T_x1_125 = common.mul(FqOps.one.sub(r_x[5])).mul(r_x[6]);
        Fq T_x1_126 = common.mul(r_x[5]).mul(FqOps.one.sub(r_x[6]));
        Fq T_x1_127 = common.mul(r_x[5]).mul(r_x[6]);

        Fq eval_outer_base = T_x1_0.mul(T_y1[0]);

        Fq eval_outer_same_row = EqPolynomial.evaluate(r_x, NUM_BITS_IN_R1, r_y, 1, NUM_BITS_IN_C1 - 1)
            .mul(FqOps.one.sub(r_y[0]))
            .sub(eval_outer_base)
            .sub(T_x1_124.mul(T_y1[124]))
            .sub(T_x1_125.mul(T_y1[125]))
            .sub(T_x1_126.mul(T_y1[126]))
            .sub(T_x1_127.mul(T_y1[127])); // evaluates this for (0..128) and subtracts uninvolved terms
        
        // This evaluates the unique multilinear polynomial next(x,y) = 1 if y = x + 1 for x in the range [0... 2^l-2].
        // it ignores the case where x is all 1s, outputting 0. x and y are provided in big-endian
        require(NUM_BITS_IN_C1 - 1 == NUM_BITS_IN_R1, "BUGSMV");
        Fq eval_outer_prior_row = FqOps.zero;
        // If y+1 = x, then the two bit vectors are of the following form.
        // Let k be the longest suffix of 1s in x.
        // In y, those k bits are 0.
        // Then, the next bit in x is 0 and the next bit in y is 1.
        // The remaining higher bits are the same in x and y.
        for (uint k = 0; k < NUM_BITS_IN_R1; k++) {
            Fq temp = FqOps.one.sub(r_y[NUM_BITS_IN_R1 - k]).mul(r_x[NUM_BITS_IN_R1 - 1 - k]);
            for (uint i = 0; i < k; i++)
                temp = temp.mul(
                    r_y[NUM_BITS_IN_R1 - i].mul(FqOps.one.sub(r_x[NUM_BITS_IN_R1 - 1 - i]))
                );
            for (uint i = k + 1; i < NUM_BITS_IN_R1; i++)
                temp = temp.mul(
                    r_y[NUM_BITS_IN_R1 - i].mul(r_x[NUM_BITS_IN_R1 - 1 - i])
                    .add(FqOps.one.sub(r_y[NUM_BITS_IN_R1 - i]).mul(FqOps.one.sub(r_x[NUM_BITS_IN_R1 - 1 - i])))
                );
            eval_outer_prior_row = eval_outer_prior_row.add(temp);
        }

        eval_outer_prior_row = eval_outer_prior_row.mul(FqOps.one.sub(r_y[0]))
            .sub(T_x1_124.mul(T_y1[123]))
            .sub(T_x1_125.mul(T_y1[124]))
            .sub(T_x1_126.mul(T_y1[125]))
            .sub(T_x1_127.mul(T_y1[126]));

        // uniform evaluations
        Fq eval_A_uniform = eval_A_base.mul(eval_outer_base)
            .add(eval_A_nonbase_same_row.mul(eval_outer_same_row))
            .add(eval_A_nonbase_prior_row.mul(eval_outer_prior_row));

        Fq eval_B_uniform = eval_B_base.mul(eval_outer_base)
            .add(eval_B_nonbase_same_row.mul(eval_outer_same_row))
            .add(eval_B_nonbase_prior_row.mul(eval_outer_prior_row));

        Fq eval_C_uniform = eval_C_base.mul(eval_outer_base)
            .add(eval_C_nonbase_same_row.mul(eval_outer_same_row))
            .add(eval_C_nonbase_prior_row.mul(eval_outer_prior_row));

        Fq eval_A_rest = T_x1_124.mul(
            T_y1[124].mul(
                T_x2[0].mul(T_y2[4])
                .add(T_x2[2].mul(T_y2[8]))
                .add(T_x2[5].mul(T_y2[9]))
                .add(T_x2[9].mul(T_y2[12]))
                .add(T_x2[10].mul(T_y2[10]))
                .add(T_x2[12].mul(T_y2[15]))
                .add(T_x2[13].sub(T_x2[11]).mul(T_y2[14]))
            )
            .add(
                T_y1[0].mul(
                    T_x2[3].add(T_x2[7]).add(T_x2[8]).mul(T_y2[0])
                    .sub(T_x2[3].mul(T_y2[2]))
                    .add(T_x2[4].add(T_x2[6]).mul(T_y2[1]))
                    .sub(T_x2[4].mul(T_y2[3]))
                )
            )
            .add(
                T_y1[128].mul(T_y2[0]).mul(
                    Fq.wrap(3).mul(T_x2[9])
                    .add(T_x2[11])
                    .add(T_x2[14])
                )
            )
            .add(
                T_y1[125].mul(
                    T_x2[15].mul(T_y2[1])
                    .sub(T_x2[14].mul(T_y2[0]))
                )
            )
        )
        .add(
            T_x1_125.mul(
                T_y1[123].mul(
                    T_x2[8].sub(T_x2[3]).mul(T_y2[12])
                    .add(T_x2[10].mul(T_y2[13]))
                )
                .add(
                    T_y1[124].mul(
                        Fq.wrap(3).mul(T_x2[15]).add(T_x2[3]).add(T_x2[7]).mul(T_y2[6])
                        .add(T_x2[9].mul(T_y2[7]))
                        .add(T_x2[11].sub(T_x2[1]).mul(T_y2[8]))
                        .add(T_x2[12].mul(T_y2[9]))
                    )
                )
                .add(
                    T_y1[125].mul(
                        T_x2[0].mul(T_y2[0])
                        .sub(T_x2[2].mul(T_y2[2]))
                        .add(T_x2[4].add(T_x2[5]).add(T_x2[6]).mul(T_y2[5]))
                        .sub(T_x2[7].mul(T_y2[6]))
                        .sub(T_x2[8].mul(T_y2[8]))
                        .sub(T_x2[9].mul(T_y2[7]))
                        .sub(T_x2[10].mul(T_y2[10]))
                        .sub(T_x2[12].mul(T_y2[12]))
                        .sub(T_x2[14].mul(T_y2[14]))
                    )
                )
                .add(
                    T_y1[128].mul(T_y2[0]).mul(
                        T_x2[1]
                        .add(T_x2[2])
                        .add(T_x2[3])
                        .add(Fq.wrap(2).mul(T_x2[13]))
                        .add(T_x2[14])
                    )
                )
            )
        )
        .add(
            T_x1_126.mul(
                T_x2[7].mul(T_y1[124]).mul(T_y2[8])
                .add(
                    T_y1[125].mul(
                        T_x2[0].mul(T_y2[15])
                        .sub(T_x2[8].mul(T_y2[9]))
                        .sub(T_x2[9].mul(T_y2[11]))
                        .sub(T_x2[10].mul(T_y2[13]))
                    )
                )
                .add(
                    T_y1[126].mul(
                        T_x2[1].add(T_x2[2]).mul(T_y2[1])
                        .add(T_x2[3].mul(T_y2[2]))
                        .add(T_x2[4].mul(T_y2[3]))
                        .add(T_x2[5].mul(T_y2[4]))
                        .add(T_x2[6].mul(T_y2[5]))
                        .add(T_x2[8].mul(T_y2[6]))
                        .add(T_x2[9].mul(T_y2[7]))
                        .add(T_x2[10].mul(T_y2[8]))
                    )
                )
                .add(
                    T_y1[128].mul(
                        T_x2[11].mul(T_y2[1])
                        .add(T_x2[12].mul(T_y2[2]))
                        .add(T_x2[13].mul(T_y2[3]))
                        .add(T_x2[14].mul(T_y2[4]))
                        .add(T_x2[15].mul(T_y2[5]))
                        .sub(T_x2[7].mul(T_y2[0]))
                    )
                )
            )
        )
        .add(
            T_x1_127.mul(T_y1[128]).mul(
                T_x2[0].mul(T_y2[6])
                .add(T_x2[1].mul(T_y2[7]))
                .add(T_x2[2].mul(T_y2[8]))
                .add(T_x2[3].mul(T_y2[9]))
                .add(T_x2[4].mul(T_y2[10]))
            )
        );

        Fq eval_B_rest = T_x1_124.mul(
            T_y1[0].mul(
                T_x2[6].mul(T_y2[1])
                .add(T_x2[7].mul(T_y2[0]))
            )
            .sub(
                T_y1[123].mul(
                    T_x2[12].add(T_x2[13]).mul(T_y2[12])
                    .add(T_x2[15].mul(T_y2[13]))
                )
            )
            .add(
                T_y1[124].mul(
                    T_x2[0].mul(T_y2[4])
                    .sub(T_x2[2].mul(T_y2[8]))
                    .sub(T_x2[5].add(T_x2[9]).add(T_x2[10]).mul(T_y2[9]))
                    .add(T_x2[8].mul(T_y2[11]))
                    .add(T_x2[11].mul(T_y2[14]))
                    .add(T_x2[12].add(T_x2[13]).mul(T_y2[6]))
                    .add(T_x2[15].mul(T_y2[7]))
                )
            )
            .add(
                T_y2[0].mul(
                    T_x2[14].mul(T_y1[125])
                    .add(
                        T_y1[128].mul(
                            T_x2[3]
                            .add(T_x2[4])
                            .add(T_x2[5])
                            .add(T_x2[9])
                            .add(T_x2[10])
                            .add(T_x2[2])
                        )
                    )
                )
            )
            
        )
        .add(
            T_x1_125.mul(
                T_y1[124].mul(
                    T_x2[0].add(T_x2[13]).mul(T_y2[7])
                    .sub(T_x2[2].mul(T_y2[14]))
                    .add(T_x2[6].add(T_x2[15]).mul(T_y2[6]))
                    .add(T_x2[7].sub(T_x2[1]).add(T_x2[9]).add(T_x2[11]).mul(T_y2[9]))
                    .add(T_x2[8].add(T_x2[10]).add(T_x2[12]).add(T_x2[14]).mul(T_y2[8]))
                )
                .add(
                    T_y1[125].mul(
                        T_x2[3].mul(T_y2[3])
                        .add(T_x2[4].mul(T_y2[4]))
                        .add(T_x2[5].mul(T_y2[5]))
                        .sub(T_x2[6].mul(T_y2[6]))
                    )
                )
                .add(T_x2[1].add(T_x2[2]).mul(T_y1[128]).mul(T_y2[0]))
                .sub(T_x2[0].mul(T_y1[123]).mul(T_y2[13]))
            )
        )
        .add(
            T_x1_126.mul(
                T_x2[0].add(T_x2[1]).mul(T_y1[126]).mul(T_y2[1])
                .add(T_x2[2].mul(T_y1[124].mul(T_y2[6]).sub(T_y1[126].mul(T_y2[2]))))
                .add(
                    T_y2[0].mul(
                        T_x2[5].add(T_x2[6]).add(T_x2[7]).mul(T_y1[125])
                        .add(
                            T_x2[3].add(T_x2[4])
                            .add(T_x2[11]).add(T_x2[12]).add(T_x2[13]).add(T_x2[14]).add(T_x2[15])
                            .mul(T_y1[128])
                        )
                    )
                )
                .add(
                    T_y1[124].mul(
                        T_x2[8].add(T_x2[9]).add(T_x2[10]).mul(T_y2[14])
                        .sub(T_x2[3].add(T_x2[4]).mul(T_y2[8]))
                    )
                )
            )
        )
        .add(
            T_x1_127.mul(T_y1[128]).mul(T_x2[0].add(T_x2[1]).add(T_x2[2]).add(T_x2[3]).add(T_x2[4])).mul(T_y2[0])
        );

        Fq eval_C_rest = T_x1_124.mul(T_x2[0]).mul(T_y1[124]).mul(T_y2[4]);
        Fq common2 = T_x1_124.mul(T_x2[1]).mul(T_y2[4]).mul(Fq.wrap(2));
        for (uint i = 0; i < 124; i++) {
            eval_C_rest = eval_C_rest.add(common2.mul(T_y1[i]));
            common2 = common2.add(common2);
        }

        eval_C_rest = eval_C_rest.add(
            T_x1_124.mul(
                T_y1[124].mul(
                    T_x2[1].mul(T_y2[4].sub(T_y2[5]))
                    .add(T_x2[6].mul(T_y2[10]))
                    .add(T_x2[7].mul(T_y2[11]))
                    .add(T_x2[8].mul(T_y2[12]))
                    .add(T_x2[9].add(T_x2[10]).mul(T_y2[13]))
                    .sub(T_x2[12].mul(T_y2[14]))
                )
                .add(
                    T_y2[0].mul(
                        T_y1[128].mul(T_x2[12].add(T_x2[15]))
                        .sub(T_x2[15].mul(T_y1[125]))
                    )
                )
            )
            .add(
                T_x1_125.mul(
                    T_y1[123].mul(
                        T_x2[4].mul(T_y2[13])
                        .add(T_x2[5].sub(T_x2[3]).mul(T_y2[12]))
                    )
                    .add(
                        T_y1[124].mul(
                            T_x2[3].add(T_x2[5]).mul(T_y2[6])
                            .add(T_x2[6].sub(T_x2[4]).mul(T_y2[7]))
                        )
                    )
                    .add(
                        T_y1[125].mul(
                            T_x2[3].mul(T_y2[4])
                            .sub(T_x2[1].mul(T_y2[2]))
                            .sub(T_x2[2].mul(T_y2[3]))
                            .add(T_x2[5].sub(T_x2[7]).mul(T_y2[6]))
                            .add(T_x2[6].sub(T_x2[9]).mul(T_y2[7]))
                            .add(T_x2[7].sub(T_x2[8]).mul(T_y2[8]))
                            .add(T_x2[8].mul(T_y2[9]))
                            .add(T_x2[9].sub(T_x2[10]).mul(T_y2[10]))
                            .add(T_x2[10].mul(T_y2[11]))
                            .add(T_x2[11].sub(T_x2[12]).mul(T_y2[12]))
                            .add(T_x2[12].mul(T_y2[13]))
                            .add(T_x2[13].sub(T_x2[14]).mul(T_y2[14]))
                            .add(T_x2[14].mul(T_y2[15]))
                        )
                    )
                    .add(
                        T_y2[0].mul(
                            T_x2[15].mul(T_y1[126])
                            .add(
                                T_y1[128].mul(T_x2[1].add(T_x2[2]))
                            )
                        )
                    )
                )
            )
            .add(
                T_x1_126.mul(
                    T_y1[0].mul(T_x2[14].mul(T_y2[0]).add(T_x2[15].mul(T_y2[1])))
                    .add(
                        T_y1[124].mul(
                            T_x2[2].add(T_x2[13]).mul(T_y2[7])
                            .add(Fq.wrap(2).mul(T_x2[1]).add(T_x2[12]).mul(T_y2[6]))
                            .add(T_x2[11].mul(T_y2[5]))
                        )
                    )
                    .sub(
                        T_y1[125].mul(
                            T_x2[8].mul(T_y2[9])
                            .add(T_x2[9].mul(T_y2[11]))
                            .add(T_x2[10].mul(T_y2[13]))
                        )
                    )
                    .add(
                        T_y1[126].mul(
                            T_x2[0].mul(T_y2[0])
                            .add(T_x2[1].mul(T_y2[2]))
                            .add(T_x2[2].mul(T_y2[3]))
                            .add(T_x2[3].mul(T_y2[4]))
                            .add(T_x2[4].mul(T_y2[5]))
                            .add(T_x2[5].mul(T_y2[6]))
                            .add(T_x2[6].mul(T_y2[7]))
                            .add(T_x2[7].mul(T_y2[8]))
                            .add(T_x2[8].mul(T_y2[9]))
                            .add(T_x2[9].mul(T_y2[10]))
                            .add(T_x2[10].mul(T_y2[11]))
                        )
                    )
                    .sub(
                        T_x2[7].mul(T_y1[128]).mul(T_y2[0])
                    )
                )
            )
            .add(
                T_x1_127.mul(
                    T_y1[124].mul(
                        T_x2[2].mul(T_y2[8])
                        .add(T_x2[3].mul(T_y2[9]))
                    )
                    .add(
                        T_y1[126].mul(
                            T_x2[0].mul(T_y2[9])
                            .add(T_x2[1].mul(T_y2[10]))
                            .add(T_x2[4].mul(T_y2[11]))
                        )
                    )
                )
            )
        );

        Fq eval_A = eval_A_uniform.add(eval_A_rest);
        Fq eval_B = eval_B_uniform.add(eval_B_rest);
        Fq eval_C = eval_C_uniform.add(eval_C_rest);

        
        // verify claim_inner_final
        Fq eval_Z;
        {
            Fq eval_X;
            {
                Fq[] memory X = new Fq[](U.X.length + 1);
                // constant term
                X[0] = U.u;
                //remaining inputs
                for (uint i = 0; i < U.X.length; i++)
                    X[i + 1] = U.X[i];
                
                eval_X = SparsePolynomial.evaluate(num_rounds_y - 1, X, r_y, 1);
            }
            eval_Z = FqOps.add(
                FqOps.mul(
                    FqOps.sub(FqOps.one, r_y[0]),
                    self.eval_W
                ),
                FqOps.mul(r_y[0], eval_X)
            );
        }

        Fq claim_inner_final_expected = eval_C.mul(r).add(eval_B).mul(r).add(eval_A).mul(eval_Z);
        if (FqOps.neq(claim_inner_final, claim_inner_final_expected)) {
            revert Err(NovaError.InvalidSumcheckProof);
        }

        // reduce two evaluations into one
        Fq rho = transcript.squeezeFq("r");
        Fq claim = self.eval_W.add(rho.mul(self.eval_E));
        Fq claim_batch_final;
        Fq[] memory r_z;
        (claim_batch_final, r_z) = self.sc_proof_batch.verify(claim, num_rounds_x, 2, transcript);

        Fq claim_batch_final_expected = EqPolynomial.evaluate(r_z, r_y, 1).mul(self.evals_batch[0])
            .add(rho.mul(EqPolynomial.evaluate(r_z, r_x)).mul(self.evals_batch[1]));

        if (FqOps.neq(claim_batch_final, claim_batch_final_expected)) {
            revert Err(NovaError.InvalidSumcheckProof);
        }

        transcript.absorb(bytes("l"));
        for (uint i = 0; i < self.evals_batch.length; i++) {
            self.evals_batch[i].absorb_in_transcript(transcript);
        }

        // we now combine evaluation claims at the same point r into one
        Fq chal = transcript.squeezeFq("c");
        Fq eval = self.evals_batch[0].add(chal.mul(self.evals_batch[1]));

        // return the claim to be checked:
        // we need to prove that the prover knows two commitments that when combined with challenge,
        // and if the underlying polynomial is evaluated at z, we get the eval
        Fq cc = transcript.squeezeFq("c");
        return (U.comm, r_z, chal, eval, cc);
    }

    function deserialize(
        RelaxedR1CSSNARKForSM memory self,
        uint ptr
    ) internal pure returns (uint) {
        ptr = self.sc_proof_outer.deserialize(ptr);
        (self.claims_outer[0], ptr) = FqLib.deserialize(ptr);
        (self.claims_outer[1], ptr) = FqLib.deserialize(ptr);
        (self.claims_outer[2], ptr) = FqLib.deserialize(ptr);
        (self.eval_E, ptr) = FqLib.deserialize(ptr);
        ptr = self.sc_proof_inner.deserialize(ptr);
        (self.eval_W, ptr) = FqLib.deserialize(ptr);
        ptr = self.sc_proof_batch.deserialize(ptr);
        uint length;
        (length, ptr) = deserialize_uint64(ptr);
        self.evals_batch = new Fq[](length);
        for (uint i = 0; i < length; i++) {
            (self.evals_batch[i], ptr) = FqLib.deserialize(ptr);
        }
        return ptr;
    }

}

struct PolyEvalInstanceFq {
    Grumpkin c;
    Fq[] x;
    Fq e;
}

library PolyEvalInstanceFqLib {
    function batch_eval_verify(
        PolyEvalInstanceFq[] memory u_vec,
        Transcript memory transcript,
        SumcheckProofFq memory sc_proof_batch,
        Fq[] memory evals_batch
    ) internal pure /*returns (PolyEvalInstanceFq memory)*/ {
        uint num_claims = u_vec.length;
        if (evals_batch.length != num_claims)
            revert Err(NovaError.InvalidInputLength);

        // generate a challenge
        Fq rho = transcript.squeezeFq("r");
        Fq[] memory powers_of_rho = powers(rho, num_claims);

        // Compute nᵢ and n = maxᵢ{nᵢ}
        uint num_rounds_max = 0;
        uint[] memory num_rounds = new uint[](u_vec.length);
        Fq[] memory claims = new Fq[](u_vec.length);
        for (uint i = 0; i < u_vec.length; ++i) {
            num_rounds[i] = u_vec[i].x.length;
            if (num_rounds_max < num_rounds[i]) {
                num_rounds_max = num_rounds[i];
            }
            claims[i] = u_vec[i].e;
        }

        Fq claim_batch_final;
        Fq[] memory r;
        (claim_batch_final, r) = sc_proof_batch.verify_batch(claims, num_rounds, powers_of_rho, 2, transcript);

        Fq claim_batch_final_expected = FqOps.zero;
        for (uint i = 0; i < u_vec.length; ++i) {
            Fq evals_r = FqOps.one;
            uint offset = num_rounds_max - u_vec[i].x.length;
            for (uint j = 0; j < u_vec[i].x.length; ++j) {
                evals_r = FqOps.mul(
                    evals_r,
                    FqOps.add(
                        FqOps.mul(u_vec[i].x[j], r[j + offset]),
                        FqOps.mul(
                            FqOps.sub(FqOps.one, u_vec[i].x[j]),
                            FqOps.sub(FqOps.one, r[j + offset])
                        )
                    )
                );
            }

            claim_batch_final_expected = FqOps.add(
                claim_batch_final_expected,
                FqOps.mul(FqOps.mul(evals_r, evals_batch[i]), powers_of_rho[i])
            );
        }

        if (FqOps.neq(claim_batch_final, claim_batch_final_expected)) {
            revert Err(NovaError.InvalidSumcheckProof);
        }

        /* Note: As return value of this function is ignored by RelaxedR1CSSNARKForSMLib.verify
         *       we comment out the following code,
         *       which is only related to the calculation of the return value.
        transcript.absorb("l");
        for (uint i = 0; i < evals_batch.length; ++i) {
            evals_batch[i].absorb_in_transcript(transcript);
        }

        // we now combine evaluation claims at the same point r into one
        Fq gamma = transcript.squeezeFq("g");

        Grumpkin[] memory comms = new Grumpkin[](u_vec.length);
        for (uint i = 0; i < u_vec.length; ++i)
            comms[i] = u_vec[i].c;

        return batch_diff_size(comms, evals_batch, num_rounds, r, gamma);
        */
    }

}
