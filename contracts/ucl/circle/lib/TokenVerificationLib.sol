// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../base/BankRegistration.sol";
import "../model/TokenModel.sol";
import "../nova/sol/fr.sol";
import "../nova/sol/verifier.sol";


library TokenVerificationLib {

    function verify(bytes calldata proofData) public view returns (uint, Fr[] memory, Fr[] memory) {
        ZKProof memory proof;
        proof.data = proofData;
        return ZkVerifier.verify(proof);
    }


    function verifyTokenSplit(TokenModel.ParentTokens memory parentTokens, TokenModel.AmountInfo[] memory reservedAmounts, bytes calldata proof)
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

    function verifyTokenMint(TokenModel.VerifyTokenMintParams calldata params) public view returns (bool, uint, uint256[] memory) {
        TokenModel.ElGamal memory encryptedData = params.amountInfo.amount;
        TokenModel.ElGamal memory initialMinterAllowance = params.initialMinterAllowance;
        (uint result, Fr[] memory z0, Fr[] memory zn) = verify(params.proof);

        // z0 verify
        uint256[] memory z0Values = new uint256[](4);
        z0Values[0] = Fr.unwrap(z0[0]);
        z0Values[1] = Fr.unwrap(z0[1]);
        z0Values[2] = Fr.unwrap(z0[2]);
        z0Values[3] = Fr.unwrap(z0[3]);
        require(initialMinterAllowance.cl_x == z0Values[0] && initialMinterAllowance.cl_y == z0Values[1] && initialMinterAllowance.cr_x == z0Values[2] && initialMinterAllowance.cr_y == z0Values[3], "initialMinterAllowance not match");

        BankRegistration bankRegistration = params.bankRegistration;
        TokenModel.GrumpkinPublicKey memory minter = bankRegistration.getBankGrumpkinPublicKey(params.minter);
        TokenModel.GrumpkinPublicKey memory to = bankRegistration.getBankGrumpkinPublicKey(params.amountInfo.manager);

        uint256[] memory znValues = new uint256[](12);

        // mint amount
        znValues[0] = Fr.unwrap(zn[0]);
        znValues[1] = Fr.unwrap(zn[1]);
        znValues[2] = Fr.unwrap(zn[2]);
        znValues[3] = Fr.unwrap(zn[3]);

        require(encryptedData.cl_x == znValues[0] && encryptedData.cl_y == znValues[1] && encryptedData.cr_x == znValues[2] && encryptedData.cr_y == znValues[3],  "mint amount not match" );

        // allownce
        znValues[4] = Fr.unwrap(zn[4]);
        znValues[5] = Fr.unwrap(zn[5]);
        znValues[6] = Fr.unwrap(zn[6]);
        znValues[7] = Fr.unwrap(zn[7]);

        // receiver public key
        require(minter.x == znValues[8] && minter.y == znValues[9], "minter public key not match");
        znValues[8] = Fr.unwrap(zn[8]);
        znValues[9] = Fr.unwrap(zn[9]);
        
        // minter  public key
        require(to.x == znValues[10] && to.y == znValues[11], "to public key not match");
        znValues[10] = Fr.unwrap(zn[10]);
        znValues[11] = Fr.unwrap(zn[11]);

        return (true, result, znValues);
    }
} 