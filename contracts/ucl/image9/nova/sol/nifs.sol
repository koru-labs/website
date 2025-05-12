// SPDX-License-Identifier: license.pdf
pragma solidity >=0.8.25;

import "./curve.sol";
import "./transcript.sol";
import "./r1cs.sol";

struct NIFS {
    G1 comm_T;
}

using NIFSLib for NIFS global;

library NIFSLib {

    function verify(
        NIFS memory self,
        RelaxedR1CSInstance memory U1,
        R1CSInstance memory U2,
        Transcript memory transcript
    ) internal view returns (RelaxedR1CSInstance memory) {
        // append U1 and U2 to transcript
        // We do not need to absorb U1 as the hash of U1 is contained in the public IO of U2.
        transcript.absorb(bytes("U2"));
        U2.absorb_in_transcript(transcript);

        // append `comm_T` to the transcript
        transcript.absorb(bytes("T"));
        self.comm_T.absorb_in_transcript(transcript);
        
        // obtain a challenge
        Fr r = transcript.squeezeFr("r");

        // fold the instance using `r` and `comm_T`
        RelaxedR1CSInstance memory U = U1.fold(U2, self.comm_T, r);

        // return the folded instance
        return U;
    }

    function deserialize(NIFS memory self, uint ptr) internal pure returns (uint) {
        ptr = self.comm_T.deserialize(ptr);
        return ptr;
    }

}


struct NIFSRelaxed {
    G1 comm_T;
}

using NIFSRelaxedLib for NIFSRelaxed global;

library NIFSRelaxedLib {

    function verify(
        NIFSRelaxed memory self,
        RelaxedR1CSInstance memory U1,
        RelaxedR1CSInstance memory U2,
        Transcript memory transcript
    ) internal view returns (RelaxedR1CSInstance memory) {
        // append U1 and U2 to transcript
        // We do not need to absorb U1 as the hash of U1 is contained in the public IO of U2.
        transcript.absorb(bytes("U2"));
        U2.absorb_in_transcript(transcript);

        // append `comm_T` to the transcript
        transcript.absorb(bytes("T"));
        self.comm_T.absorb_in_transcript(transcript);
        
        // obtain a challenge
        Fr r = transcript.squeezeFr("r");

        // fold the instance using `r` and `comm_T`
        RelaxedR1CSInstance memory U = U1.fold_relaxed(U2, self.comm_T, r);

        // return the folded instance
        return U;
    }

    function deserialize(NIFSRelaxed memory self, uint ptr) internal pure returns (uint) {
        ptr = self.comm_T.deserialize(ptr);
        return ptr;
    }

}