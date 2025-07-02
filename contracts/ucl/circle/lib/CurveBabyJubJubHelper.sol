pragma solidity ^0.8.0;

import "./CurveBabyJubJub.sol";
import "../model/TokenModel.sol";

library CurveBabyJubJubHelper {

    uint256 constant negateF = 15527681003928902128179717624703512672403908117992798440346960750464748824729;
    uint256 constant negateFInv = 1911982854305225074381251344103329931637610209014896889891168275855466657090;
    uint256 constant modulus = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    function reducedXToTwistedX (uint256 reducedX) public pure returns (uint256 twistedX){
        twistedX = mulmod(reducedX, negateFInv, modulus);
        return twistedX;
    }

    function twistedXToReducedX (uint256 twistedX) public pure returns (uint256 reducedX){
        reducedX = mulmod(twistedX, negateF, modulus);
        return reducedX;
    }

    function pointAdd(uint256 _x1, uint256 _y1, uint256 _x2, uint256 _y2) public view returns (uint256 x3Reduced, uint256 y3) {
        uint256 tX1 = reducedXToTwistedX(_x1);
        uint256 tX2 = reducedXToTwistedX(_x2);
        uint256 x3 = 0;
        (x3, y3) = CurveBabyJubJub.pointAdd(tX1, _y1, tX2, _y2);
        x3Reduced = twistedXToReducedX(x3);
        return (x3Reduced, y3);
    }

    function pointMul(uint256 _x1, uint256 _y1, uint256 _d) public view returns (uint256 x2Reduced, uint256 y2) {
        uint256 tX1 = reducedXToTwistedX(_x1);
        uint256 x2 = 0;
        (x2, y2) = CurveBabyJubJub.pointMul(tX1, _y1, _d);
        x2Reduced = twistedXToReducedX(x2);
        return (x2Reduced, y2);

    }

    function pointDouble(uint256 _x1, uint256 _y1) public view returns (uint256 x2Reduced, uint256 y2) {
        uint256 tX1 = reducedXToTwistedX(_x1);
        uint256 x2 = 0;
        (x2, y2) = CurveBabyJubJub.pointDouble(tX1, _y1);
        x2Reduced = twistedXToReducedX(x2);
        return (x2Reduced, y2);
    }

    function tokenAdd(uint256 _token1LeftX, uint256 _token1LeftY, uint256 _token1RightX, uint256 _token1RightY,uint256 _token2LeftX, uint256 _token2LeftY, uint256 _token2RightX, uint256 _token2RightY) internal view returns (uint256 tokenSumLeftX, uint256 tokenSumLeftY, uint256 tokenSumRightX, uint256 tokenSumRightY){
        (tokenSumLeftX,tokenSumLeftY) = pointAdd(_token1LeftX,_token1LeftY,_token2LeftX,_token2LeftY);
        (tokenSumRightX,tokenSumRightY) = pointAdd(_token1RightX,_token1RightY,_token2RightX,_token2RightY);
    }

    function tokenSub(uint256 _token1LeftX, uint256 _token1LeftY, uint256 _token1RightX, uint256 _token1RightY,uint256 _token2LeftX, uint256 _token2LeftY, uint256 _token2RightX, uint256 _token2RightY) internal view returns (uint256 tokenSubLeftX, uint256 tokenSubLeftY, uint256 tokenSubRightX, uint256 tokenSubRightY){
        uint256 _negToken2LeftX = submod(modulus, _token2LeftX, modulus);
        uint256 _negToken2RightX = submod(modulus, _token2RightX, modulus);
        (tokenSubLeftX,tokenSubLeftY) = pointAdd(_token1LeftX,_token1LeftY,_negToken2LeftX,_token2LeftY);
        (tokenSubRightX,tokenSubRightY) = pointAdd(_token1RightX,_token1RightY,_negToken2RightX,_token2RightY);
    }

    function submod(uint256 _a, uint256 _b, uint256 _mod) internal pure returns (uint256) {
        uint256 aNN = _a;

        if (_a <= _b) {
            aNN += _mod;
        }

        return addmod(aNN - _b, 0, _mod);
    }

    function addElGamal(TokenModel.ElGamal memory _token1, TokenModel.ElGamal memory _token2) public view returns (TokenModel.ElGamal memory){
        uint256 tokenSumLeftX;
        uint256 tokenSumLeftY;
        uint256 tokenSumRightX;
        uint256 tokenSumRightY;

        (tokenSumLeftX,tokenSumLeftY,tokenSumRightX,tokenSumRightY) = tokenAdd(_token1.cl_x,_token1.cl_y,_token1.cr_x,_token1.cr_y,_token2.cl_x,_token2.cl_y,_token2.cr_x,_token2.cr_y);

        return TokenModel.ElGamal({
            cl_x: tokenSumLeftX,
            cl_y: tokenSumLeftY,
            cr_x: tokenSumRightX,
            cr_y: tokenSumRightY
        });
    }

    function subElGamal(TokenModel.ElGamal memory _token1, TokenModel.ElGamal memory _token2) public view returns (TokenModel.ElGamal memory){
        uint256 tokenSubLeftX;
        uint256 tokenSubLeftY;
        uint256 tokenSubRightX;
        uint256 tokenSubRightY;

        (tokenSubLeftX,tokenSubLeftY,tokenSubRightX,tokenSubRightY) = tokenSub(_token1.cl_x,_token1.cl_y,_token1.cr_x,_token1.cr_y,_token2.cl_x,_token2.cl_y,_token2.cr_x,_token2.cr_y);

        return TokenModel.ElGamal({
            cl_x: tokenSubLeftX,
            cl_y: tokenSubLeftY,
            cr_x: tokenSubRightX,
            cr_y: tokenSubRightY
        });
    }

}
