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
    
    // Mint function
    function mint(
        address[] calldata recipients,
        TokenEntity[] calldata tokens,
        ElGamalToken calldata newAllowed,
        uint256[8] calldata proof,
        uint256[] calldata publicInputs,
        uint256 paddingNum
    ) external returns (bool success);
    
    // Set mint allowance (no return value)
    function setMintAllowed(address minter, ElGamalToken calldata allowed) external;
    
    // Get mint allowance
    function getMintAllowed(address minter) external view returns (ElGamalToken memory allowed);
}

/// @title NativeTokenTest - Test contract for Native Token integration
/// @notice This contract tests the Native Token Solidity integration
/// @dev Deploy this contract and call test functions to verify integration
contract NativeTokenTest {
    // Native Token contract address (should be set during deployment)
    address public nativeTokenContract;
    
    // Events for testing
    event TestResult(string testName, bool success, string message);
    event TokenInfo(uint256 tokenId, address owner, uint8 status);

    constructor(address _nativeTokenContract) {
        nativeTokenContract = _nativeTokenContract;
    }

    /// @notice Set the native token contract address
    function setNativeTokenContract(address _contract) external {
        nativeTokenContract = _contract;
    }

    /// @notice Test: Get token information
    /// @param owner Token owner address
    /// @param tokenId Token ID to query
    function testGetToken(address owner, uint256 tokenId) external returns (bool) {
        INativeToken token = INativeToken(nativeTokenContract);
        
        try token.getToken(owner, tokenId) returns (INativeToken.TokenEntity memory entity) {
            emit TokenInfo(entity.id, entity.owner, entity.status);
            emit TestResult("testGetToken", true, "Token retrieved successfully");
            return true;
        } catch Error(string memory reason) {
            emit TestResult("testGetToken", false, reason);
            return false;
        } catch {
            emit TestResult("testGetToken", false, "Unknown error");
            return false;
        }
    }

    /// @notice Test: Transfer a token
    /// @param tokenId Token ID to transfer
    /// @param data Transfer data
    function testTransfer(uint256 tokenId, bytes calldata data) external returns (bool) {
        INativeToken token = INativeToken(nativeTokenContract);
        
        try token.transfer(tokenId, data) returns (bool success) {
            if (success) {
                emit TestResult("testTransfer", true, "Transfer successful");
            } else {
                emit TestResult("testTransfer", false, "Transfer returned false");
            }
            return success;
        } catch Error(string memory reason) {
            emit TestResult("testTransfer", false, reason);
            return false;
        } catch {
            emit TestResult("testTransfer", false, "Unknown error");
            return false;
        }
    }

    /// @notice Test: Burn a token
    /// @param tokenId Token ID to burn
    function testBurn(uint256 tokenId) external returns (bool) {
        INativeToken token = INativeToken(nativeTokenContract);
        
        try token.burn(tokenId) returns (bool success) {
            if (success) {
                emit TestResult("testBurn", true, "Burn successful");
            } else {
                emit TestResult("testBurn", false, "Burn returned false");
            }
            return success;
        } catch Error(string memory reason) {
            emit TestResult("testBurn", false, reason);
            return false;
        } catch {
            emit TestResult("testBurn", false, "Unknown error");
            return false;
        }
    }

    /// @notice Integration test: Get token, verify, then burn
    /// @param tokenId Token ID for full flow test
    function testFullFlow(uint256 tokenId) external returns (bool) {
        INativeToken token = INativeToken(nativeTokenContract);
        
        // Step 1: Get token info
        INativeToken.TokenEntity memory entity;
        try token.getToken(msg.sender, tokenId) returns (INativeToken.TokenEntity memory e) {
            entity = e;
            emit TokenInfo(entity.id, entity.owner, entity.status);
        } catch {
            emit TestResult("testFullFlow", false, "Failed to get token");
            return false;
        }
        
        // Step 2: Verify token exists and is active
        if (entity.id == 0) {
            emit TestResult("testFullFlow", false, "Token does not exist");
            return false;
        }
        
        if (entity.status != 1) {
            emit TestResult("testFullFlow", false, "Token is not active");
            return false;
        }
        
        // Step 3: Burn the token
        try token.burn(tokenId) returns (bool success) {
            if (success) {
                emit TestResult("testFullFlow", true, "Full flow completed successfully");
                return true;
            } else {
                emit TestResult("testFullFlow", false, "Burn failed");
                return false;
            }
        } catch {
            emit TestResult("testFullFlow", false, "Burn threw exception");
            return false;
        }
    }

    /// @notice Low-level call test for debugging
    /// @param data Raw calldata to send to native token contract
    function testRawCall(bytes calldata data) external returns (bool success, bytes memory result) {
        (success, result) = nativeTokenContract.call(data);
        if (success) {
            emit TestResult("testRawCall", true, "Raw call succeeded");
        } else {
            emit TestResult("testRawCall", false, "Raw call failed");
        }
    }

    /// @notice Check if native token contract responds
    function testConnection() external returns (bool) {
        // Simple call to check if the native token contract is reachable
        (bool success,) = nativeTokenContract.call(abi.encodeWithSignature("getToken(address,uint256)", address(0), 0));
        emit TestResult("testConnection", success, success ? "Connection OK" : "Connection failed");
        return success;
    }

    /// @notice Test: Set mint allowance for a minter
    /// @param minter Minter address
    /// @param allowed Mint allowance amount
    function testSetMintAllowed(
        address minter,
        INativeToken.ElGamalToken calldata allowed
    ) external returns (bool) {
        INativeToken token = INativeToken(nativeTokenContract);
        
        token.setMintAllowed(minter, allowed);
        emit TestResult("testSetMintAllowed", true, "SetMintAllowed successful");
        return true;
    }

    /// @notice Test: Mint tokens
    /// @param recipients Array of recipient addresses
    /// @param tokens Array of token entities to mint
    /// @param newAllowed New mint allowance after minting
    /// @param proof ZK proof
    /// @param publicInputs Public inputs for proof verification
    /// @param paddingNum Padding number
    function testMint(
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
                emit TestResult("testMint", true, "Mint successful");
            } else {
                emit TestResult("testMint", false, "Mint returned false");
            }
            return success;
        } catch Error(string memory reason) {
            emit TestResult("testMint", false, reason);
            return false;
        } catch {
            emit TestResult("testMint", false, "Unknown error");
            return false;
        }
    }

    /// @notice Test: Get mint allowance
    /// @param minter Minter address
    function testGetMintAllowed(address minter) external returns (bool) {
        INativeToken token = INativeToken(nativeTokenContract);
        
        try token.getMintAllowed(minter) returns (INativeToken.ElGamalToken memory) {
            emit TestResult("testGetMintAllowed", true, "GetMintAllowed successful");
            return true;
        } catch Error(string memory reason) {
            emit TestResult("testGetMintAllowed", false, reason);
            return false;
        } catch {
            emit TestResult("testGetMintAllowed", false, "Unknown error");
            return false;
        }
    }
}
