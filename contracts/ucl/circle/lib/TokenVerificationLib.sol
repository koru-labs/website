// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../base/InstitutionRegistration.sol";
import "../model/TokenModel.sol";
import "../nova/sol/fr.sol";
import "../nova/sol/verifier.sol";
import "../model/TokenModel.sol";
import "../lib/TokenGrumpkinLib.sol";


library TokenVerificationLib {

    function verify(bytes calldata proofData) public view returns (uint, Fr[] memory, Fr[] memory) {
        ZKProof memory proof;
        proof.data = proofData;
        return ZkVerifier.verify(proof);
    }


    //this validation has problem. we need to check that reservedAmounts is bound to Zn
    // how many tokens we have for a split
    function verifyTokenSplit(TokenModel.Account storage ownerAccount, TokenModel.ParentTokens memory parentTokens,
        TokenModel.AmountInfo[] memory reservedAmounts, bytes calldata proof) public returns (bool, uint, uint256[] memory) {
//
//        address owner = ownerAccount.addr;
//        (uint result, Fr[] memory z0, Fr[] memory zn) = verify(proof);
//
//        uint256[] memory znValues = new uint256[](4);
//        znValues[0] = Fr.unwrap(zn[0]);
//        znValues[1] = Fr.unwrap(zn[1]);
//        znValues[2] = Fr.unwrap(zn[2]);
//        znValues[3] = Fr.unwrap(zn[3]);
//
//        (uint256 sum_clx,uint256 sum_cly,uint256 sum_crx,uint256 sum_cry) = TokenGrumpkinLib.sumTokenAmountsLogic(ownerAccount, parentTokens.parentIds);
//        require((parentTokens.parentTotal.cl_x == sum_clx && parentTokens.parentTotal.cl_y == sum_cly &&
//        parentTokens.parentTotal.cr_x == sum_crx && parentTokens.parentTotal.cr_y == sum_cry), "invalid parentTokenUpdate amount");
//
//        require(verifySplitInputsAgainstZ0(parentTokens.parentTotal, z0), "verifyParentToken error");
//
//        uint256 rollbackTokenId;
//        uint256 receiverTokenId;
//        uint256 changeTokenId;
//
//        for (uint256 i = 0; i < reservedAmounts.length; i++) {
//            if (reservedAmounts[i].rollbackTokenId != 0) {
//                rollbackTokenId = reservedAmounts[i].rollbackTokenId;
//                receiverTokenId = reservedAmounts[i].id;
//                continue;
//            }
//        }
//
//        require(rollbackTokenId!=0, "rollbackToken not found");
//        require(receiverTokenId!=0, "receiverToken not found");
//
//
//        for (uint256 i = 0; i < reservedAmounts.length; i++) {
//            if (reservedAmounts[i].id != rollbackTokenId && reservedAmounts[i].id!= receiverTokenId) {
//                changeTokenId = reservedAmounts[i].id;
//            }
//        }
//        require(changeTokenId!=0, "changeToken not found");
//
//        TokenModel.TokenEntity memory rollbackTokenEntity = ownerAccount.tokens[rollbackTokenId];
//        require(verifySplitRollbackToken(zn, rollbackTokenEntity), "verifyDVPRollbackToken error");
//
//        TokenModel.TokenEntity memory receiverTokenEntity = ownerAccount.tokens[receiverTokenId];
//        require(verifySplitReceiverToken(zn, receiverTokenEntity), "verifyDVPReceiverToken error");
//
//        TokenModel.TokenEntity memory changeTokenEntity = ownerAccount.tokens[changeTokenId];
//        require(verifySplitChangeToken(zn, changeTokenEntity), "verifyDVPChangeToken error");
//        return (true, result, znValues);
        return (true, 0, new uint256[](0));
    }


    function verifySplitRollbackToken(Fr[] memory zn, TokenModel.TokenEntity memory rollbackToken) public pure returns (bool) {
        return rollbackToken.amount.cl_x == Fr.unwrap(zn[8]) &&
        rollbackToken.amount.cl_y == Fr.unwrap(zn[9]) &&
        rollbackToken.amount.cr_x == Fr.unwrap(zn[10]) &&
        rollbackToken.amount.cr_y == Fr.unwrap(zn[11]);
    }

    function verifySplitChangeToken(Fr[] memory zn, TokenModel.TokenEntity memory changeToken) public pure returns (bool) {
        return changeToken.amount.cl_x == Fr.unwrap(zn[4]) &&
        changeToken.amount.cl_y == Fr.unwrap(zn[5]) &&
        changeToken.amount.cr_x == Fr.unwrap(zn[6]) &&
        changeToken.amount.cr_y == Fr.unwrap(zn[7]);
    }

    function verifySplitReceiverToken(Fr[] memory zn, TokenModel.TokenEntity memory token) public pure returns (bool) {
        return token.amount.cl_x == Fr.unwrap(zn[0]) &&
        token.amount.cl_y == Fr.unwrap(zn[1]) &&
        token.amount.cr_x == Fr.unwrap(zn[2]) &&
        token.amount.cr_y == Fr.unwrap(zn[3]);
    }


    function verifySplitInputsAgainstZ0(TokenModel.ElGamal memory splitInputsTotal, Fr[] memory z0)
    public view returns (bool) {
        // Verify parent token
        if (!(splitInputsTotal.cl_x == Fr.unwrap(z0[0]) && splitInputsTotal.cl_y == Fr.unwrap(z0[1]) &&
        splitInputsTotal.cr_x == Fr.unwrap(z0[2]) && splitInputsTotal.cr_y == Fr.unwrap(z0[3]))) {
            return false;
        }
        return true;
    }

    function verifyTokenMint(TokenModel.VerifyTokenMintParams calldata params) public view returns (bool, uint, uint256[] memory) {
        (uint result, Fr[] memory z0, Fr[] memory zn) = verify(params.proof);

        // z0 verify
        uint256[] memory z0Values = new uint256[](10);
        z0Values[0] = Fr.unwrap(z0[0]);
        z0Values[1] = Fr.unwrap(z0[1]);
        z0Values[2] = Fr.unwrap(z0[2]);
        z0Values[3] = Fr.unwrap(z0[3]);
        z0Values[4] = Fr.unwrap(z0[4]);
        z0Values[5] = Fr.unwrap(z0[5]);
        z0Values[6] = Fr.unwrap(z0[6]);
        z0Values[7] = Fr.unwrap(z0[7]);
        z0Values[8] = Fr.unwrap(z0[8]);
        z0Values[9] = Fr.unwrap(z0[9]);

        // verify initialMinterAllowed
        TokenModel.ElGamal memory initialMinterAllowed = params.initialMinterAllowed;
        require(initialMinterAllowed.cl_x == z0Values[0] && initialMinterAllowed.cl_y == z0Values[1] && initialMinterAllowed.cr_x == z0Values[2] && initialMinterAllowed.cr_y == z0Values[3], "initialMinterAllowance not match");

        InstitutionRegistration institutionRegistration = params.institutionRegistration;
        // verify minter pk 4-5
        TokenModel.GrumpkinPublicKey memory minter = institutionRegistration.getInstitutionGrumpkinPublicKey(params.minter);
        require(minter.x == z0Values[4] && minter.y == z0Values[5], "minter public key not match");

        // verify to pk 6-7
        TokenModel.GrumpkinPublicKey memory to = institutionRegistration.getInstitutionGrumpkinPublicKey(params.to);
        require(to.x == z0Values[6] && to.y == z0Values[7], "receiver public key not match");

        // verify scOwner pk 8-9
        TokenModel.GrumpkinPublicKey memory scOwner = institutionRegistration.getInstitutionGrumpkinPublicKey(params.scOwner);
        require(scOwner.x == z0Values[8] && scOwner.y == z0Values[9], "scOwner public key not match");

        // zn verify
        uint256[] memory znValues = new uint256[](12);
        znValues[0] = Fr.unwrap(zn[0]);
        znValues[1] = Fr.unwrap(zn[1]);
        znValues[2] = Fr.unwrap(zn[2]);
        znValues[3] = Fr.unwrap(zn[3]);
        znValues[4] = Fr.unwrap(zn[4]);
        znValues[5] = Fr.unwrap(zn[5]);
        znValues[6] = Fr.unwrap(zn[6]);
        znValues[7] = Fr.unwrap(zn[7]);
        znValues[8] = Fr.unwrap(zn[8]);
        znValues[9] = Fr.unwrap(zn[9]);
        znValues[10] = Fr.unwrap(zn[10]);
        znValues[11] = Fr.unwrap(zn[11]);

        // verify mint amount 0-3
        TokenModel.ElGamal memory currentMintAmount = params.currentMintAmount;
        require(currentMintAmount.cl_x == znValues[0] && currentMintAmount.cl_y == znValues[1] && currentMintAmount.cr_x == znValues[2] && currentMintAmount.cr_y == znValues[3], "currentMintAmount not match");

        // verify supplyIncrease 8-11
        TokenModel.ElGamal memory supplyIncrease = params.supplyIncrease;
        require(supplyIncrease.cl_x == znValues[8] && supplyIncrease.cl_y == znValues[9] && supplyIncrease.cr_x == znValues[10] && supplyIncrease.cr_y == znValues[11], "supplyIncrease not match");

        return (true, result, znValues);
    }



}