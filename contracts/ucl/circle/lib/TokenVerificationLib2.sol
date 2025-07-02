// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../base/InstitutionUserRegistry.sol";
import "../model/TokenModel.sol";
import "./verify/BurnTokenVerifier.sol";
import "./verify/MintAllowedTokenVerifier.sol";
import "./verify/SplitTokenVerifier.sol";

library TokenVerificationLib2 {

    function verifyTokenMint(TokenModel.VerifyTokenMintParams2 calldata params) public view {
        MintAllowedTokenVerifier.verifyProof(params.proof,params.publicInputs);

        uint256[22] memory publicInputs = params.publicInputs;

        // verify initialMinterAllowed 0-3
        TokenModel.ElGamal memory initialMinterAllowed = params.initialMinterAllowed;
        require(initialMinterAllowed.cl_x == publicInputs[0] && initialMinterAllowed.cl_y == publicInputs[1] && initialMinterAllowed.cr_x == publicInputs[2] && initialMinterAllowed.cr_y == publicInputs[3], "initialMinterAllowance not match");

        InstitutionUserRegistry institutionRegistration = params.institutionRegistration;
        // verify minter pk 20-21
        TokenModel.GrumpkinPublicKey memory minter = institutionRegistration.getUserInstGrumpkinPubKey(params.minter);
        require(minter.x == publicInputs[20] && minter.y == publicInputs[21], "minter public key not match");

        // verify to pk 18-19
        TokenModel.GrumpkinPublicKey memory to = institutionRegistration.getUserInstGrumpkinPubKey(params.to);
        require(to.x == publicInputs[18] && to.y == publicInputs[19], "receiver public key not match");

        // verify mint amount 8-11
        TokenModel.ElGamal memory currentMintAmount = params.currentMintAmount;
        require(currentMintAmount.cl_x == publicInputs[8] && currentMintAmount.cl_y == publicInputs[9] && currentMintAmount.cr_x == publicInputs[10] && currentMintAmount.cr_y == publicInputs[11], "currentMintAmount not match");

        // verify supplyIncrease 12-15
        TokenModel.ElGamal memory supplyIncrease = params.supplyIncrease;
        require(supplyIncrease.cl_x == publicInputs[12] && supplyIncrease.cl_y == publicInputs[13] && supplyIncrease.cr_x == publicInputs[14] && supplyIncrease.cr_y == publicInputs[15], "supplyIncrease not match");

        return;
    }

    function verifyTokenSplit2(TokenModel.VerifyTokenSplitParams2 calldata params) public view {
        InstitutionUserRegistry institutionRegistration = params.institutionRegistration;
        SplitTokenVerifier.verifyProof(params.proof,params.publicInputs);

        uint256[20] memory publicInputs = params.publicInputs;

        //  verify consumedAmount 0-3
        TokenModel.ElGamal memory consumedAmount = params.consumedAmount;
        require(consumedAmount.cl_x == publicInputs[0] && consumedAmount.cl_y == publicInputs[1] && consumedAmount.cr_x == publicInputs[2] && consumedAmount.cr_y == publicInputs[3], "consumedAmount not match");

        // verify from 4-5
        TokenModel.GrumpkinPublicKey memory from = institutionRegistration.getUserInstGrumpkinPubKey(params.from);
        require(from.x == publicInputs[4] && from.y == publicInputs[5], "from public key not match");

        // verify to 6-7
        TokenModel.GrumpkinPublicKey memory to = institutionRegistration.getUserInstGrumpkinPubKey(params.to);
        require(to.x == publicInputs[6] && to.y == publicInputs[7], "to public key not match");


        // verify amount 0-3
        TokenModel.ElGamal memory amount = params.amount;
        require(amount.cl_x == publicInputs[0] && amount.cl_y == publicInputs[1] && amount.cr_x == publicInputs[2] && amount.cr_y == publicInputs[3], "amount not match");

        // verify remainingAmount 4-7
        TokenModel.ElGamal memory remainingAmount = params.remainingAmount;
        require(remainingAmount.cl_x == publicInputs[4] && remainingAmount.cl_y == publicInputs[5] && remainingAmount.cr_x == publicInputs[6] && remainingAmount.cr_y == publicInputs[7], "remainingAmount not match");

        // verify rollbackAmount  8-11
        TokenModel.ElGamal memory rollbackAmount = params.rollbackAmount;
        require(rollbackAmount.cl_x == publicInputs[8] && rollbackAmount.cl_y == publicInputs[9] && rollbackAmount.cr_x == publicInputs[10] && rollbackAmount.cr_y == publicInputs[11], "rollbackAmount not match");

        return;
    }


}