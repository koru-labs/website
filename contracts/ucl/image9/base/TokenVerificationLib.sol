pragma solidity ^0.8.0;

import "../nova/sol/fr.sol";
import "../nova/sol/verifier.sol";
import "./TokenModel.sol";
import "../../../poseidon/PoseidonHasher.sol";

library TokenVerificationLib {

    function verify(bytes calldata proofData) public view returns (uint, Fr[] memory, Fr[] memory) {
        ZKProof memory proof;
        proof.data = proofData;
        return ZkVerifier.verify(proof);
    }

    function verifyTokenMint(TokenModel.NewToken calldata token, bytes calldata proof) public view returns (bool, uint, uint256[] memory) {
        (uint result, Fr[] memory z0, Fr[] memory zn) = verify(proof);

        // 准备zn值用于debug事件
        uint256[] memory znValues = new uint256[](4);
        znValues[0] = Fr.unwrap(zn[0]);
        znValues[1] = Fr.unwrap(zn[1]);
        znValues[2] = Fr.unwrap(zn[2]);
        znValues[3] = Fr.unwrap(zn[3]);

        if (token.cl_x != Fr.unwrap(zn[0]) || token.cl_y != Fr.unwrap(zn[1]) ||
            token.cr_x != Fr.unwrap(zn[2]) || token.cr_y != Fr.unwrap(zn[3])) {
            return (false, result, znValues);
        }

        return (true, result, znValues);
    }

    function verifyTokenSplit(TokenModel.TokenValueUpdate memory parentTokenUpdate, TokenModel.NewToken[] memory childTokens, bytes calldata proof) 
        public view returns (bool, uint, uint256[] memory) {
        (uint result, Fr[] memory z0, Fr[] memory zn) = verify(proof);

        // Verify parent token
        if (!(parentTokenUpdate.cl_x == Fr.unwrap(z0[0]) && parentTokenUpdate.cl_y == Fr.unwrap(z0[1]) &&
            parentTokenUpdate.cr_x == Fr.unwrap(z0[2]) && parentTokenUpdate.cr_y == Fr.unwrap(z0[3]))) {
            return (false, result, new uint256[](0));
        }

        uint256 receiverChildTokenIndex = 0;
        uint256 transferOutChildTokenIndex = 1;

        uint256[] memory znValues = new uint256[](8);
        znValues[0] = Fr.unwrap(zn[0]);
        znValues[1] = Fr.unwrap(zn[1]);
        znValues[2] = Fr.unwrap(zn[2]);
        znValues[3] = Fr.unwrap(zn[3]);
        znValues[4] = Fr.unwrap(zn[4]);
        znValues[5] = Fr.unwrap(zn[5]);
        znValues[6] = Fr.unwrap(zn[6]);
        znValues[7] = Fr.unwrap(zn[7]);

        // Verify the transferOut token
        if (!(childTokens[transferOutChildTokenIndex].cl_x == Fr.unwrap(zn[0]) && 
            childTokens[transferOutChildTokenIndex].cl_y == Fr.unwrap(zn[1]) &&
            childTokens[transferOutChildTokenIndex].cr_x == Fr.unwrap(zn[2]) && 
            childTokens[transferOutChildTokenIndex].cr_y == Fr.unwrap(zn[3]))) {
            return (false, result, znValues);
        }

        // Verify the reserved token
        if (!(childTokens[receiverChildTokenIndex].cl_x == Fr.unwrap(zn[4]) && 
            childTokens[receiverChildTokenIndex].cl_y == Fr.unwrap(zn[5]) &&
            childTokens[receiverChildTokenIndex].cr_x == Fr.unwrap(zn[6]) && 
            childTokens[receiverChildTokenIndex].cr_y == Fr.unwrap(zn[7]))) {
            return (false, result, znValues);
        }

        return (true, result, znValues);
    }

    function verifyTokenMerge(address owner, uint256[] calldata childTokens, TokenModel.TokenValueUpdate calldata parentTokenUpdate, bytes calldata proof) public pure returns (bool) {
        // TODO: 实现合并验证逻辑
        return true;
    }

    function verifyDVPRollbackToken(Fr[] memory zn, TokenModel.TokenEntity memory rollbackToken) public pure returns (bool) {
        return rollbackToken.cl_x == Fr.unwrap(zn[8]) &&
               rollbackToken.cl_y == Fr.unwrap(zn[9]) &&
               rollbackToken.cr_x == Fr.unwrap(zn[10]) &&
               rollbackToken.cr_y == Fr.unwrap(zn[11]);
    }

    function verifyDVPChangeToken(Fr[] memory zn, TokenModel.TokenEntity memory changeToken) public pure returns (bool) {
        return changeToken.cl_x == Fr.unwrap(zn[4]) &&
               changeToken.cl_y == Fr.unwrap(zn[5]) &&
               changeToken.cr_x == Fr.unwrap(zn[6]) &&
               changeToken.cr_y == Fr.unwrap(zn[7]);
    }

    function verifyDVPReceiverToken(Fr[] memory zn, TokenModel.TokenEntity memory token) public pure returns (bool) {
        return token.cl_x == Fr.unwrap(zn[0]) &&
               token.cl_y == Fr.unwrap(zn[1]) &&
               token.cr_x == Fr.unwrap(zn[2]) &&
               token.cr_y == Fr.unwrap(zn[3]);
    }

    function verifyParentToken(TokenModel.TokenMergeAndUpdate memory parentTokenUpdate, Fr[] memory z0)
    public view returns (bool) {
        // Verify parent token
        if (!(parentTokenUpdate.cl_x == Fr.unwrap(z0[0]) && parentTokenUpdate.cl_y == Fr.unwrap(z0[1]) &&
        parentTokenUpdate.cr_x == Fr.unwrap(z0[2]) && parentTokenUpdate.cr_y == Fr.unwrap(z0[3]))) {
            return false;
        }
        return true;
    }

    function verifyBatchTokenSplit(TokenModel.TokenValueUpdate memory parentTokenUpdate, TokenModel.NewBatchToken[] calldata childTokens, bytes calldata proof)
    public view returns (bool) {
        (uint result, Fr[] memory z0, Fr[] memory zn) = verify(proof);

        // Verify parent token
        if (!(parentTokenUpdate.cl_x == Fr.unwrap(z0[0]) && parentTokenUpdate.cl_y == Fr.unwrap(z0[1]) &&
        parentTokenUpdate.cr_x == Fr.unwrap(z0[2]) && parentTokenUpdate.cr_y == Fr.unwrap(z0[3]))) {
            return false;
        }

        uint256 hash = 0;

        for (uint256 i = 0; i < childTokens.length; i++) {
            uint256[] memory hashInputs = new uint256[](11);
            hashInputs[0] = hash;
            hashInputs[5] =  childTokens[i].receiverPkX;
            hashInputs[6] = childTokens[i].receiverPkY;
            hashInputs[9] = childTokens[i].rollbackPkX;
            hashInputs[10] = childTokens[i].rollbackPkY;

            uint256 rollbackTokenId = 0;
            TokenModel.NewBatchToken memory childBatchToken = childTokens[i];
            TokenModel.NewToken[] memory child = childBatchToken.token;
            for (uint256 j = 0; j < child.length; j++) {
                if (child[j].rollbackTokenId != 0) {
                    rollbackTokenId = child[j].rollbackTokenId;
                    break;
                }
            }
            for (uint256 j = 0; j < child.length; j++) {
                if (child[j].id != rollbackTokenId) {
                    if (child[j].rollbackTokenId > 0) {
                        hashInputs[1] = child[j].cl_x;
                        hashInputs[2] = child[j].cl_y;
                        hashInputs[3] = child[j].cr_x;
                        hashInputs[4] = child[j].cr_y;
                    }
                } else {
                    hashInputs[7] = child[j].cr_x;
                    hashInputs[8] = child[j].cr_y;
                }
            }
            hash = PoseidonU2bn256Hasher.hasha(hashInputs);
        }
        if (hash!= Fr.unwrap(zn[6])) {
            return false;
        }
        return true;
    }
} 