// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../base/InstitutionUserRegistry.sol";
import "../model/TokenModel.sol";
import "./verify/BurnTokenVerifier.sol";
import "./verify/MintAllowedTokenVerifier.sol";

library TokenVerificationLib2 {

    function verifyTokenMint(TokenModel.VerifyTokenMintParams2 calldata params) public view {
        uint256[] memory input = new uint256[](22);
        MintAllowedTokenVerifier.verifyProof(params.proof,params.publicInputs);

        // verify initialMinterAllowed 0-3
        TokenModel.ElGamal memory initialMinterAllowed = params.initialMinterAllowed;
        require(initialMinterAllowed.cl_x == params.publicInputs[0] && initialMinterAllowed.cl_y == params.publicInputs[1] && initialMinterAllowed.cr_x == params.publicInputs[2] && initialMinterAllowed.cr_y == params.publicInputs[3], "initialMinterAllowance not match");

        InstitutionUserRegistry institutionRegistration = params.institutionRegistration;
        // verify minter pk 20-21
        TokenModel.GrumpkinPublicKey memory minter = institutionRegistration.getUserInstGrumpkinPubKey(params.minter);
        require(minter.x == params.publicInputs[20] && minter.y == params.publicInputs[21], "minter public key not match");

        // verify to pk 18-19
        TokenModel.GrumpkinPublicKey memory to = institutionRegistration.getUserInstGrumpkinPubKey(params.to);
        require(to.x == params.publicInputs[18] && to.y == params.publicInputs[19], "receiver public key not match");

        // verify mint amount 8-11
        TokenModel.ElGamal memory currentMintAmount = params.currentMintAmount;
        require(currentMintAmount.cl_x == params.publicInputs[8] && currentMintAmount.cl_y == params.publicInputs[9] && currentMintAmount.cr_x == params.publicInputs[10] && currentMintAmount.cr_y == params.publicInputs[11], "currentMintAmount not match");

        // verify supplyIncrease 12-15
        TokenModel.ElGamal memory supplyIncrease = params.supplyIncrease;
        require(supplyIncrease.cl_x == params.publicInputs[12] && supplyIncrease.cl_y == params.publicInputs[13] && supplyIncrease.cr_x == params.publicInputs[14] && supplyIncrease.cr_y == params.publicInputs[15], "supplyIncrease not match");

        return;
    }

}