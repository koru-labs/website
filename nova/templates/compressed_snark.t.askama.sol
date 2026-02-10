// SPDX-License-Identifier: license.pdf
pragma solidity ^0.8.19;

/* Performance metrics:
{{ prove_verify_perf }}
*/

//import "../sol/verifier.sol";
//
//contract TestCompressedSNARK_{{ name_suffix }} {
//    event DebugUint(uint);
//
//    function testCompressedSNARK_{{ name_suffix }}() public {
//        ZKProof memory proof;
//        proof.data = bytes(xx
//            {{ proof_hex_str }}
//        );
//        require({{ proof_bytes_len }} == proof.data.length, "invaild compressed snark proof length");
//
//        uint gas_before;
//        uint gas_after;
//
//        gas_before = gasleft();
//        ZkVerifier.verify(proof);
//        gas_after = gasleft();
//
//        emit DebugUint(gas_before - gas_after);
//    }
//}
