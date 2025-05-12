// SPDX-License-Identifier: license.pdf
pragma solidity >=0.8.25;

enum NovaError {
    ///0 returned if the supplied row or col in (row,col,val) tuple is out of range
    InvalidIndex,
    ///1 returned if the supplied input is not even-sized
    OddInputLength,
    ///2 returned if the supplied input is not of the right length
    InvalidInputLength,
    ///3 returned if the supplied witness is not of the right length
    InvalidWitnessLength,
    ///4 returned if the supplied witness is not a satisfying witness to a given shape and instance
    UnSat,
    ///5 returned when the supplied compressed commitment cannot be decompressed
    DecompressionError,
    ///6 returned if proof verification fails
    ProofVerifyError,
    ///7 returned if the provided number of steps is zero
    InvalidNumSteps,
    ///8 returned when an invalid inner product argument is provided
    InvalidIPA,
    ///9 returned when an invalid sum-check proof is provided
    InvalidSumcheckProof,
    ///10 returned when the initial input to an incremental computation differs from a previously declared arity
    InvalidInitialInputLength,
    ///11 returned when the step execution produces an output whose length differs from a previously declared arity
    InvalidStepOutputLength,
    ///12 returned when the transcript engine encounters an overflow of the round number
    InternalTranscriptError,
    ///13 returned when the multiset check fails
    InvalidMultisetProof,
    ///14 returned when the product proof check fails
    InvalidProductProof,
    ///15 returned when the consistency with public IO and assignment used fails
    IncorrectWitness
}

error Err(NovaError);