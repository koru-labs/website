pragma solidity ^0.8.0;

import "../../image9/nova/sol/fr.sol";
import "../../image9/nova/sol/verifier.sol";
import "../model/TokenModel.sol";


library TokenVerificationLib2 {

    function verify(bytes calldata proofData) public view returns (uint, Fr[] memory, Fr[] memory) {
        ZKProof memory proof;
        proof.data = proofData;
        return ZkVerifier.verify(proof);
    }


    function verifyTokenSplit(TokenModel2.ParentTokens memory parentTokens, TokenModel2.AmountInfo[] memory reservedAmounts, bytes calldata proof)
        public view returns (bool, uint, uint256[] memory) {
        (uint result, Fr[] memory z0, Fr[] memory zn) = verify(proof);

//        if (!(parentTokenUpdate.cl_x == Fr.unwrap(z0[0]) && parentTokenUpdate.cl_y == Fr.unwrap(z0[1]) &&
//            parentTokenUpdate.cr_x == Fr.unwrap(z0[2]) && parentTokenUpdate.cr_y == Fr.unwrap(z0[3]))) {
//            return (false, result, new uint256[](0));
//        }
//
//        uint256 receiverChildTokenIndex = 0;
//        uint256 transferOutChildTokenIndex = 1;
//
        uint256[] memory znValues = new uint256[](8);
//        znValues[0] = Fr.unwrap(zn[0]);
//        znValues[1] = Fr.unwrap(zn[1]);
//        znValues[2] = Fr.unwrap(zn[2]);
//        znValues[3] = Fr.unwrap(zn[3]);
//        znValues[4] = Fr.unwrap(zn[4]);
//        znValues[5] = Fr.unwrap(zn[5]);
//        znValues[6] = Fr.unwrap(zn[6]);
//        znValues[7] = Fr.unwrap(zn[7]);
//
//        if (!(childTokens[transferOutChildTokenIndex].cl_x == Fr.unwrap(zn[0]) &&
//            childTokens[transferOutChildTokenIndex].cl_y == Fr.unwrap(zn[1]) &&
//            childTokens[transferOutChildTokenIndex].cr_x == Fr.unwrap(zn[2]) &&
//            childTokens[transferOutChildTokenIndex].cr_y == Fr.unwrap(zn[3]))) {
//            return (false, result, znValues);
//        }
//
//        if (!(childTokens[receiverChildTokenIndex].cl_x == Fr.unwrap(zn[4]) &&
//            childTokens[receiverChildTokenIndex].cl_y == Fr.unwrap(zn[5]) &&
//            childTokens[receiverChildTokenIndex].cr_x == Fr.unwrap(zn[6]) &&
//            childTokens[receiverChildTokenIndex].cr_y == Fr.unwrap(zn[7]))) {
//            return (false, result, znValues);
//        }

        return (true, result, znValues);
    }
} 