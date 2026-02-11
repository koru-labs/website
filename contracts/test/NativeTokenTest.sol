// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title INativeToken - Native Token Interface
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
        Deleted,    // 0
        Inactive,   // 1
        Active,     // 2
        Locked      // 3
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
    function getToken(address owner, uint256 tokenId) external view returns (TokenEntity memory entity);
    function checkTokenIds(address owner, uint256[] calldata tokenIds) external view returns (uint256[] memory);
    function split(
        address from,
        address[] calldata recipients,
        uint256[] calldata consumedIds,
        TokenEntity[] calldata newTokens,
        uint256[8] calldata proof,
        uint256[] calldata publicInputs,
        uint256 paddingNum
    ) external returns (bool success);

    function mint(
        address[] calldata recipients,
        TokenEntity[] calldata tokens,
        ElGamalToken calldata newAllowed,
        uint256[8] calldata proof,
        uint256[] calldata publicInputs,
        uint256 paddingNum
    ) external returns (bool success);
}

/// @title NativeTokenTest - Test contract for Native Token integration
contract NativeTokenTest {
    address public nativeTokenContract;
    
    event TestResult(string testName, bool success, string message);

    constructor(address _nativeTokenContract) {
        nativeTokenContract = _nativeTokenContract;
    }

    /// @notice Test: Set mint allowance for a minter
    function privateSetMintAllowed(
        address minter,
        INativeToken.ElGamalToken calldata allowed
    ) external returns (bool) {
        INativeToken token = INativeToken(nativeTokenContract);
        
        token.setMintAllowed(minter, allowed);
        emit TestResult("privateSetMintAllowed", true, "SetMintAllowed successful");
        return true;
    }

    /// @notice Test: Mint tokens
    function privateMint(
        address[] calldata recipients,
        INativeToken.TokenEntity[] calldata tokens,
        INativeToken.ElGamalToken calldata newAllowed,
        uint256[8] calldata proof,
        uint256[] calldata publicInputs,
        uint256 paddingNum
    ) external returns (bool) {
        INativeToken token = INativeToken(nativeTokenContract);
        
        try token.mint(recipients, tokens, newAllowed, proof, publicInputs, paddingNum) returns (bool success) {
            if (success) {
                emit TestResult("privateMint", true, "Mint successful");
            } else {
                emit TestResult("privateMint", false, "Mint returned false");
            }
            return success;
        } catch Error(string memory reason) {
            emit TestResult("privateMint", false, reason);
            return false;
        } catch {
            emit TestResult("privateMint", false, "Unknown error");
            return false;
        }
    }
}
