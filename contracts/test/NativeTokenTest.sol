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

    struct TokenEntity {
        uint256 id;
        address owner;
        uint8 status;  // 0=inactive, 1=active, 2=frozen
        EncryptedAmount amount;
        address to;
        uint256 rollbackTokenId;
    }

    function transfer(uint256 tokenId, bytes calldata data) external returns (bool success);
    function burn(uint256 tokenId) external returns (bool success);
    function getToken(address owner, uint256 tokenId) external view returns (TokenEntity memory entity);
    function split(uint256 tokenId, EncryptedAmount[] calldata amounts, bytes calldata proof) external returns (bool success);

    function mint(
        address[] calldata recipients,
        TokenEntity[] calldata tokens,
        ElGamalToken calldata newAllowed,
        uint256[8] calldata proof,
        uint256[] calldata publicInputs,
        uint256 paddingNum
    ) external returns (bool success);

    function setMintAllowed(address minter, ElGamalToken calldata allowed) external;

    function getMintAllowed(address minter) external view returns (ElGamalToken memory allowed);
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
