// SPDX-License-Identifier: license.pdf
pragma solidity >=0.8.25;

import "./fr.sol";
import "./fq.sol";

bytes4 constant PERSONA_TAG = "NoTR";
bytes4 constant DOM_SEP_TAG = "NoDS";
bytes1 constant PREFIX_CHALLENGE_HI = bytes1(uint8(1));

struct Transcript {
    uint16 round;
    bytes32[2] state; // this is a uint512 in big endian
    bytes transcript;
    uint length;
}

using {Keccak256Transcript.computeUpdatedState} for Transcript;

library Keccak256Transcript {

    bytes1 constant private PREFIX_CHALLENGE_LO = bytes1(uint8(0));
    // Initial capacity of transcript buffer, must be multiple of 32
    uint constant private TRANSCRIPT_INIT_CAP = 2048;
    // sizeof DOM_SEP_TAG + round + state + max_size_of(PREFIX_CHALLENGE_LO/HI)
    uint constant private TRANSCRIPT_INIT_LENGTH = 71;


    function new_transcript(bytes memory label) internal pure returns (Transcript memory self) {
        self.transcript = new bytes(TRANSCRIPT_INIT_CAP);
        self.length = 0; 
        self.computeUpdatedState(abi.encodePacked(PERSONA_TAG, label, PREFIX_CHALLENGE_HI));
        self.length = 0; 
    }

    function new_transcript(bytes memory label, uint capacity) internal pure returns (Transcript memory self) {
        uint init_capacity = capacity + TRANSCRIPT_INIT_LENGTH + 32;
        // Warning: this extra 32 bytes is to keep vital extra dummy memory space
        //  when function `absorb` is absorbing data unaligned to 32 bytes
        //  into the end of buffer `self.transcript`.
        //  Without this extra 32 bytes, memory of at most 31 bytes behind the buffer may be polluted.
        if ((init_capacity & 0x1f) > 0) {
            init_capacity >>= 5;
            init_capacity++;
            init_capacity <<= 5;
        }
        self.transcript = new bytes(init_capacity);
        self.length = 0; 
        self.computeUpdatedState(abi.encodePacked(PERSONA_TAG, label, PREFIX_CHALLENGE_HI));
        self.length = 0; 
    }
    
    function computeUpdatedState(Transcript memory self, bytes memory label) internal pure {
        bytes32 hi;
        self.absorb(label);
        uint length = self.length;
        bytes memory transcript = self.transcript;
        assembly("memory-safe") {
            hi := keccak256(add(transcript, 0x20), length)
        }
        bytes32 lo;
        self.transcript[self.length - 1] = PREFIX_CHALLENGE_LO;
        assembly("memory-safe") {
            lo := keccak256(add(transcript, 0x20), length)
        }
        self.state[0] = hi;
        self.state[1] = lo;
    }
}

using TranscriptLib for Transcript global;

library TranscriptLib {

    function squeezeFr(Transcript memory self, bytes memory label) internal pure returns (Fr) {
        bytes memory suffix = abi.encodePacked(DOM_SEP_TAG, self.round, self.state, label, PREFIX_CHALLENGE_HI);
        self.computeUpdatedState(suffix);
        self.round++;
        self.length = 0;
        return FrOps.fromUniform(
            self.state[0],
            self.state[1]
        );
    }

    function squeezeFq(Transcript memory self, bytes memory label) internal pure returns (Fq) {
        bytes memory suffix = abi.encodePacked(DOM_SEP_TAG, self.round, self.state, label, PREFIX_CHALLENGE_HI);
        self.computeUpdatedState(suffix);
        self.round++;
        self.length = 0;
        return FqOps.fromUniform(
            self.state[0],
            self.state[1]
        );
    }

    function absorb(Transcript memory self, bytes memory data) internal pure {
        uint length = self.length;
        bytes memory transcript = self.transcript;
        assembly("memory-safe") {
            let mc := add(transcript, add(0x20, length))
            let end := add(mc, mload(data))
            for {
                let cc := add(data, 0x20)
            } lt(mc, end) {
                mc := add(mc, 0x20)
                cc := add(cc, 0x20)
            } {
                mstore(mc, mload(cc))
            }
        }
        self.length += data.length;
    }

    function absorb(Transcript memory self, bytes32 data) internal pure {
        uint length = self.length;
        bytes memory transcript = self.transcript;
        assembly("memory-safe") {
            let mc := add(transcript, add(0x20, length))
            mstore(mc, data)
        }
        self.length += 32;
    }
}
