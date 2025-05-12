// SPDX-License-Identifier: license.pdf
pragma solidity >=0.8.25;

import "./fr.sol";
import "./fq.sol";


library PowPolynomial {

    // for Fr
    function coordinates(Fr t, uint ell) internal pure returns (Fr[] memory) {
        Fr[] memory t_pow = new Fr[](ell);
        t_pow[0] = t;
        for (uint i = 1; i < ell; i++) {
            t_pow[i] = FrOps.mul(t_pow[i - 1], t_pow[i - 1]);
        }
        return t_pow;
    }

    // for Fq
    function coordinates(Fq t, uint ell) internal pure returns (Fq[] memory) {
        Fq[] memory t_pow = new Fq[](ell);
        t_pow[0] = t;
        for (uint i = 1; i < ell; i++) {
            t_pow[i] = FqOps.mul(t_pow[i - 1], t_pow[i - 1]);
        }
        return t_pow;
    }

}


library EqPolynomial {

    // evaluations for Fr
    function evaluate(Fr[] memory r, Fr[] memory rx) internal pure returns (Fr result) {
        if (r.length != rx.length)
            revert Err(NovaError.OddInputLength);
        result = FrOps.one;
        for (uint i = 0; i < rx.length; i++) {
            result = FrOps.mul(
                result,
                FrOps.add(
                    FrOps.mul(rx[i], r[i]),
                    FrOps.mul(
                        FrOps.sub(FrOps.one, rx[i]),
                        FrOps.sub(FrOps.one, r[i])
                    )
                )
            );
        }
    }
    function evals_from_points(Fr[] memory r, uint r_begin, uint r_length) internal pure returns (Fr[] memory result) {
        // We use r[r_begin, r_begin + r_length)
        // The caller must garantee the validness of this range of r[]
        result = new Fr[](1 << r_length);
        uint size = 1;
        result[0] = FrOps.one;

        for (uint i = 0; i < r_length; ++i) {
            uint evals_left_begin = 0;
            //uint evals_left_end = size;
            uint evals_right_begin = size;
            //uint evals_right_end = size + size;
            for (uint j = 0; j < size; j++) {
                result[evals_right_begin + j] = FrOps.mul(result[evals_left_begin + j], r[r_begin + r_length - i - 1]);
                result[evals_left_begin + j] = FrOps.sub(result[evals_left_begin + j], result[evals_right_begin + j]);
            }

            size <<= 1;
        }
    }

    // evaluations for Fq
    function evaluate(Fq[] memory r, Fq[] memory rx) internal pure returns (Fq result) {
        if (r.length != rx.length)
            revert Err(NovaError.OddInputLength);
        result = FqOps.one;
        for (uint i = 0; i < rx.length; i++) {
            result = FqOps.mul(
                result,
                FqOps.add(
                    FqOps.mul(rx[i], r[i]),
                    FqOps.mul(
                        FqOps.sub(FqOps.one, rx[i]),
                        FqOps.sub(FqOps.one, r[i])
                    )
                )
            );
        }
    }
    function evaluate(Fq[] memory r, uint r_length, Fq[] memory rx, uint rx_begin, uint rx_length) internal pure returns (Fq result) {
        // r[0, rlength) & rx[rx_begin, rx_begin + rx_length)
        // The caller must garantee the validness of this range of r[] and rx[]
        if (r_length != rx_length)
            revert Err(NovaError.OddInputLength);
        result = FqOps.one;
        for (uint i = 0; i < r_length; i++) {
            result = FqOps.mul(
                result,
                FqOps.add(
                    FqOps.mul(rx[i + rx_begin], r[i]),
                    FqOps.mul(
                        FqOps.sub(FqOps.one, rx[i + rx_begin]),
                        FqOps.sub(FqOps.one, r[i])
                    )
                )
            );
        }
    }
    function evaluate(Fq[] memory r, Fq[] memory rx, uint rx_begin) internal pure returns (Fq result) {
        // rx[rx_begin, ..) is vaild
        // The caller must garantee the validness of this range of r[] and rx[]
        if (r.length != rx.length - rx_begin)
            revert Err(NovaError.OddInputLength);
        result = FqOps.one;
        for (uint i = 0; i < r.length; i++) {
            result = FqOps.mul(
                result,
                FqOps.add(
                    FqOps.mul(rx[i + rx_begin], r[i]),
                    FqOps.mul(
                        FqOps.sub(FqOps.one, rx[i + rx_begin]),
                        FqOps.sub(FqOps.one, r[i])
                    )
                )
            );
        }
    }
    function evals_from_points(Fq[] memory r, uint r_begin, uint r_length) internal pure returns (Fq[] memory result) {
        // We use r[r_begin, r_begin + r_length)
        // The caller must garantee the validness of this range of r[]
        result = new Fq[](1 << r_length);
        uint size = 1;
        result[0] = FqOps.one;

        for (uint i = 0; i < r_length; ++i) {
            uint evals_left_begin = 0;
            //uint evals_left_end = size;
            uint evals_right_begin = size;
            //uint evals_right_end = size + size;
            for (uint j = 0; j < size; j++) {
                result[evals_right_begin + j] = FqOps.mul(result[evals_left_begin + j], r[r_begin + r_length - i - 1]);
                result[evals_left_begin + j] = FqOps.sub(result[evals_left_begin + j], result[evals_right_begin + j]);
            }

            size <<= 1;
        }
    }
}


library MaskedEqPolynomial {

    function evaluate(Fr[] memory r, uint num_masked_vars, Fr[] memory rx) internal pure returns (Fr result) {
        if (r.length != rx.length)
            revert Err(NovaError.OddInputLength);
        uint split_idx = r.length - num_masked_vars;

        Fr eq_lo = FrOps.one;
        Fr mask_lo = FrOps.one;
        for (uint i = 0; i < split_idx; i++) {
            Fr temp = FrOps.mul(FrOps.sub(FrOps.one, r[i]), FrOps.sub(FrOps.one, rx[i]));
            eq_lo = FrOps.mul(
                eq_lo,
                FrOps.add(
                    FrOps.mul(r[i], rx[i]),
                    temp
                )
            );
            mask_lo = FrOps.mul(
                mask_lo,
                temp
            );
        }

        Fr eq_hi = FrOps.one;
        for (uint i = split_idx; i < r.length; i++) {
            eq_hi = FrOps.mul(
                eq_hi,
                FrOps.add(
                    FrOps.mul(r[i], rx[i]),
                    FrOps.mul(FrOps.sub(FrOps.one, r[i]), FrOps.sub(FrOps.one, rx[i]))
                )
            );
        }

        return FrOps.mul(FrOps.sub(eq_lo, mask_lo), eq_hi);
    }

}


library SparsePolynomial {

    // evaluations for Fr
    function evaluate(uint num_vars, Fr[] memory Z, Fr[] memory r) internal pure returns (Fr) {
        if (r.length != num_vars)
            revert Err(NovaError.InvalidInputLength);
        uint tmp = num_vars - 1 - log2_ceil(Z.length);
        Fr[] memory chis = EqPolynomial.evals_from_points(r, tmp, r.length - tmp);
        Fr eval_partial = FrOps.zero;
        for (uint i = 0; i < Z.length && i < chis.length; i++) {
            eval_partial = FrOps.add(
                eval_partial,
                FrOps.mul(Z[i], chis[i])
            );
        }
        for (uint i = 0; i < tmp; i++) {
            eval_partial = FrOps.mul(
                eval_partial,
                FrOps.sub(FrOps.one, r[i])
            );
        }
        
        return eval_partial;
    }
    function evaluate(uint num_vars, Fr[] memory Z, Fr[] memory r, uint r_begin) internal pure returns (Fr) {
        // r[r_begin, ..) is vaild
        if (r.length - r_begin != num_vars)
            revert Err(NovaError.InvalidInputLength);
        uint tmp = num_vars - 1 - log2_ceil(Z.length);
        Fr[] memory chis = EqPolynomial.evals_from_points(r, r_begin + tmp, r.length - (r_begin + tmp));
        Fr eval_partial = FrOps.zero;
        for (uint i = 0; i < Z.length && i < chis.length; i++) {
            eval_partial = FrOps.add(
                eval_partial,
                FrOps.mul(Z[i], chis[i])
            );
        }
        for (uint i = 0; i < tmp; i++) {
            eval_partial = FrOps.mul(
                eval_partial,
                FrOps.sub(FrOps.one, r[r_begin + i])
            );
        }
        
        return eval_partial;
    }

    // evaluations for Fq
    function evaluate(uint num_vars, Fq[] memory Z, Fq[] memory r) internal pure returns (Fq) {
        if (r.length != num_vars)
            revert Err(NovaError.InvalidInputLength);
        uint tmp = num_vars - 1 - log2_ceil(Z.length);
        Fq[] memory chis = EqPolynomial.evals_from_points(r, tmp, r.length - tmp);
        Fq eval_partial = FqOps.zero;
        for (uint i = 0; i < Z.length && i < chis.length; i++) {
            eval_partial = FqOps.add(
                eval_partial,
                FqOps.mul(Z[i], chis[i])
            );
        }
        for (uint i = 0; i < tmp; i++) {
            eval_partial = FqOps.mul(
                eval_partial,
                FqOps.sub(FqOps.one, r[i])
            );
        }
        
        return eval_partial;
    }
    function evaluate(uint num_vars, Fq[] memory Z, Fq[] memory r, uint r_begin) internal pure returns (Fq) {
        // r[r_begin, ..) is vaild
        if (r.length - r_begin != num_vars)
            revert Err(NovaError.InvalidInputLength);
        uint tmp = num_vars - 1 - log2_ceil(Z.length);
        Fq[] memory chis = EqPolynomial.evals_from_points(r, r_begin + tmp, r.length - (r_begin + tmp));
        Fq eval_partial = FqOps.zero;
        for (uint i = 0; i < Z.length && i < chis.length; i++) {
            eval_partial = FqOps.add(
                eval_partial,
                FqOps.mul(Z[i], chis[i])
            );
        }
        for (uint i = 0; i < tmp; i++) {
            eval_partial = FqOps.mul(
                eval_partial,
                FqOps.sub(FqOps.one, r[r_begin + i])
            );
        }
        
        return eval_partial;
    }

}

library IdentityPolynomial {

    function evaluate(uint ell, Fr[] memory r) internal pure returns (Fr result) {
        if (r.length != ell)
            revert Err(NovaError.InvalidInputLength);
        result = FrOps.zero;
        for (uint i = 0; i < ell; i++) {
            result = FrOps.add(
                result,
                FrOps.mul(
                    FrOps.from(1 << (ell - i - 1)),
                    r[i]
                )
            );
        }

    }

}