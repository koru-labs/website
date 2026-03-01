// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface INativeToken {
    struct EncryptedAmount {
        uint256 cl_x;
        uint256 cl_y;
        uint256 cr_x;
        uint256 cr_y;
    }

    struct ElGamalToken {
        uint256 id;
        EncryptedAmount value;
    }

    enum TokenStatus {
        Deleted,
        Inactive,
        Active,
        Locked
    }

    struct TokenEntity {
        uint256 id;
        address owner;
        TokenStatus status;
        EncryptedAmount amount;
        address to;
        uint256 rollbackTokenId;
    }

    function setMintAllowed(address minter, ElGamalToken calldata allowed) external;
    function transfer(uint256 tokenId, string calldata memo) external returns (bool success);
    function burn(uint256 tokenId) external returns (bool success);
    function checkTokenIds(address owner, uint256[] calldata tokenIds) external view returns (uint256[] memory);
    function mint(
        address[] calldata recipients,
        TokenEntity[] calldata tokens,
        ElGamalToken calldata newAllowed,
        uint256[8] calldata proof,
        uint256[] calldata publicInputs,
        uint256 paddingNum
    ) external returns (bool success);
    function split(
        address from,
        address[] calldata recipients,
        uint256[] calldata consumedIds,
        TokenEntity[] calldata newTokens,
        uint256[8] calldata proof,
        uint256[] calldata publicInputs,
        uint256 paddingNum
    ) external returns (bool success);
}

contract NativeTokenQA {
    address public nativeTokenContract;
    
    event TestResult(string testName, bool success, string message);

    constructor(address _nativeTokenContract) {
        nativeTokenContract = _nativeTokenContract;
    }

    function privateSetMintAllowed(
        address minter,
        INativeToken.ElGamalToken calldata allowed
    ) external returns (bool) {
        INativeToken(nativeTokenContract).setMintAllowed(minter, allowed);
        emit TestResult("privateSetMintAllowed", true, "success");
        return true;
    }

    function privateMints(
        address[] calldata recipients,
        INativeToken.TokenEntity[] calldata tokens,
        INativeToken.ElGamalToken calldata newAllowed,
        uint256[8] calldata proof,
        uint256[] calldata publicInputs,
        uint256 paddingNum
    ) external returns (bool) {
        (bool success,) = nativeTokenContract.call(
            abi.encodeWithSignature(
                "mint(address[],(uint256,address,uint8,(uint256,uint256,uint256,uint256),address,uint256)[],(uint256,(uint256,uint256,uint256,uint256)),uint256[8],uint256[],uint256)",
                recipients, tokens, newAllowed, proof, publicInputs, paddingNum
            )
        );
        emit TestResult("privateMints", success, success ? "success" : "failed");
        return success;
    }

    function privateSplit(
        address from,
        address[] calldata recipients,
        uint256[] calldata consumedIds,
        INativeToken.TokenEntity[] calldata newTokens,
        uint256[8] calldata proof,
        uint256[] calldata publicInputs,
        uint256 paddingNum
    ) external returns (bool) {
        (bool success,) = nativeTokenContract.call(
            abi.encodeWithSignature(
                "split(address,address[],uint256[],(uint256,address,uint8,(uint256,uint256,uint256,uint256),address,uint256)[],uint256[8],uint256[],uint256)",
                from, recipients, consumedIds, newTokens, proof, publicInputs, paddingNum
            )
        );
        emit TestResult("privateSplit", success, success ? "success" : "failed");
        return success;
    }

    function privateTransfer(
        uint256[] calldata tokenIds,
        string[] calldata memos
    ) external returns (bool) {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            (bool success,) = nativeTokenContract.call(
                abi.encodeWithSignature("transfer(uint256,string)", tokenIds[i], memos[i])
            );
            if (!success) {
                emit TestResult("privateTransfer", false, "transfer failed");
                return false;
            }
        }
        emit TestResult("privateTransfer", true, "success");
        return true;
    }

    function privateBurn(
        uint256[] calldata tokenIds
    ) external returns (bool) {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            (bool success,) = nativeTokenContract.call(
                abi.encodeWithSignature("burn(uint256)", tokenIds[i])
            );
            if (!success) {
                emit TestResult("privateBurn", false, "burn failed");
                return false;
            }
        }
        emit TestResult("privateBurn", true, "success");
        return true;
    }

    function checkTokenIds(
        address owner,
        uint256[] calldata tokenIds
    ) external view returns (uint256[] memory) {
        (bool success, bytes memory result) = nativeTokenContract.staticcall(
            abi.encodeWithSignature("checkTokenIds(address,uint256[])", owner, tokenIds)
        );
        require(success, "checkTokenIds failed");
        return abi.decode(result, (uint256[]));
    }
}
