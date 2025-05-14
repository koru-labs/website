// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../nova/sol/fr.sol";
import "../nova/sol/verifier.sol";
import "../model/TokenModel.sol";
import "../../curves/blocks/grumpkin/Grumpkin.sol" as GrumpkinAlgorithmLib;


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

        address owner = ownerAccount.addr;
        (uint result, Fr[] memory z0, Fr[] memory zn) = verify(proof);

        uint256[] memory znValues = new uint256[](4);
        znValues[0] = Fr.unwrap(zn[0]);
        znValues[1] = Fr.unwrap(zn[1]);
        znValues[2] = Fr.unwrap(zn[2]);
        znValues[3] = Fr.unwrap(zn[3]);

        (uint256 sum_clx,uint256 sum_cly,uint256 sum_crx,uint256 sum_cry) = sumTokenAmountsLogic(ownerAccount, parentTokens.parentIds);
        require((parentTokens.parentTotal.cl_x == sum_clx && parentTokens.parentTotal.cl_y == sum_cly &&
        parentTokens.parentTotal.cr_x == sum_crx && parentTokens.parentTotal.cr_y == sum_cry), "invalid parentTokenUpdate amount");

        require(verifySplitInputsAgainstZ0(parentTokens.parentTotal, z0), "verifyParentToken error");

        uint256 rollbackTokenId;
        uint256 receiverTokenId;
        uint256 changeTokenId;

        for (uint256 i = 0; i < reservedAmounts.length; i++) {
            if (reservedAmounts[i].rollbackTokenId != 0) {
                rollbackTokenId = reservedAmounts[i].rollbackTokenId;
                receiverTokenId = reservedAmounts[i].id;
                continue;
            }
        }

        require(rollbackTokenId!=0, "rollbackToken not found");
        require(receiverTokenId!=0, "rollbackToken not found");


        for (uint256 i = 0; i < reservedAmounts.length; i++) {
            if (reservedAmounts[i].id != rollbackTokenId && reservedAmounts[i].id!= receiverTokenId) {
                rollbackTokenId = reservedAmounts[i].id;
            }
        }
        require(rollbackTokenId!=0, "rollbackToken not found");

        TokenModel.TokenEntity memory rollbackTokenEntity = ownerAccount.tokens[rollbackTokenId];
        require(verifySplitRollbackToken(zn, rollbackTokenEntity), "verifyDVPRollbackToken error");

        TokenModel.TokenEntity memory receiverTokenEntity = ownerAccount.tokens[receiverTokenId];
        require(verifySplitReceiverToken(zn, receiverTokenEntity), "verifyDVPReceiverToken error");

        TokenModel.TokenEntity memory changeTokenEntity = ownerAccount.tokens[changeTokenId];
        require(verifySplitChangeToken(zn, changeTokenEntity), "verifyDVPChangeToken error");
        return (true, result, znValues);
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


    function verifyTokenMint(TokenModel.ElGamal calldata encryptedData, bytes calldata proof) public view returns (bool, uint, uint256[] memory) {
        (uint result, Fr[] memory z0, Fr[] memory zn) = verify(proof);


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


        if (encryptedData.cl_x != znValues[0] || 
            encryptedData.cl_y != znValues[1] ||
            encryptedData.cr_x != znValues[2] || 
            encryptedData.cr_y != znValues[3]) {
            return (false, result, znValues);
        }

        return (true, result, znValues);
    }

    function sumTokenAmountsLogic(TokenModel.Account storage account, uint256[] memory childTokens)
    public returns (uint256, uint256, uint256, uint256) {
        address owner = account.addr;

        GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint memory sum_cl = GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(0, 0);
        GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint memory sum_cr = GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(0, 0);

        for (uint256 i = 0; i < childTokens.length; i++) {
            uint256 childId = childTokens[i];
            TokenModel.TokenEntity memory child = account.tokens[childId];

            require(child.status != TokenModel.TokenStatus.deleted, "dead tokens can't be merged");
            require(owner == child.owner, "invalid child token owner");

            sum_cl = GrumpkinAlgorithmLib.Grumpkin.add(sum_cl, GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(child.amount.cl_x, child.amount.cl_y));
            sum_cr = GrumpkinAlgorithmLib.Grumpkin.add(sum_cr, GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(child.amount.cr_x, child.amount.cr_y));
        }

        return (sum_cl.x, sum_cl.y, sum_cr.x, sum_cr.y);
    }

} 