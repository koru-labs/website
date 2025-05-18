// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../model/TokenModel.sol";
import "../event/IL2Event.sol";
import "../event/L2EventDefinitions.sol";
import "../../curves/blocks/grumpkin/Grumpkin.sol" as GrumpkinAlgorithmLib;

library TokenGrumpkinLib {
    function sumTokenAmountsLogic(TokenModel.Account storage account, uint256[] memory childTokens)
    public returns (uint256, uint256, uint256, uint256) {
//        address owner = account.addr;
//
//        GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint memory sum_cl = GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(0, 0);
//        GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint memory sum_cr = GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(0, 0);
//
//        for (uint256 i = 0; i < childTokens.length; i++) {
//            uint256 childId = childTokens[i];
//            TokenModel.TokenEntity memory child = account.tokens[childId];
//
//            require(child.status != TokenModel.TokenStatus.deleted, "dead tokens can't be merged");
//            require(owner == child.owner, "invalid child token owner");
//
//            sum_cl = GrumpkinAlgorithmLib.Grumpkin.add(sum_cl, GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(child.amount.cl_x, child.amount.cl_y));
//            sum_cr = GrumpkinAlgorithmLib.Grumpkin.add(sum_cr, GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(child.amount.cr_x, child.amount.cr_y));
//        }
//
//        return (sum_cl.x, sum_cl.y, sum_cr.x, sum_cr.y);
        return (0, 0, 0, 0);
    }

    function addElGamal(TokenModel.ElGamal memory a, TokenModel.ElGamal memory b) public view returns (TokenModel.ElGamal memory) {
        // Add the two ElGamal ciphertexts using Grumpkin curve point addition
        GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint memory cl_sum = GrumpkinAlgorithmLib.Grumpkin.add(
            GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(a.cl_x, a.cl_y),
            GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(b.cl_x, b.cl_y)
        );

        GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint memory cr_sum = GrumpkinAlgorithmLib.Grumpkin.add(
            GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(a.cr_x, a.cr_y),
            GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(b.cr_x, b.cr_y)
        );

        return TokenModel.ElGamal({
            cl_x: cl_sum.x,
            cl_y: cl_sum.y,
            cr_x: cr_sum.x,
            cr_y: cr_sum.y
        });
    }

    function subElGamal(TokenModel.ElGamal memory a, TokenModel.ElGamal memory b) public view returns (TokenModel.ElGamal memory) {
        // Subtract the two ElGamal ciphertexts using Grumpkin curve point subtraction
        GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint memory cl_diff = GrumpkinAlgorithmLib.Grumpkin.sub(
            GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(a.cl_x,a.cl_y),
            GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(b.cl_x,b.cl_y)
        );
        GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint memory cr_diff = GrumpkinAlgorithmLib.Grumpkin.sub(
            GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(a.cr_x,a.cr_y),
            GrumpkinAlgorithmLib.Grumpkin.GrumpkinAffinePoint(b.cr_x,b.cr_y)
        );
        return TokenModel.ElGamal({
            cl_x: cl_diff.x,
            cl_y: cl_diff.y,
            cr_x: cr_diff.x,
            cr_y: cr_diff.y
        });
    }
}
