// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

//  Genesis block pre-deployment: Deploy NativeTokenRegistry to address 0x2041
//  Add to the "alloc" field in genesis.json:
//  {
//      "alloc": {
//          "0x0000000000000000000000000000000000002041": {
//              "balance": "0x0",
//              "code": "0x<Copy complete deployedBytecode from bytecode.txt>",
//              "storage": {
//                  "0x0000000000000000000000000000000000000000000000000000000000000001": "0x0000000000000000000000000000000000000000000000000000000000000000",
//                  "0x0000000000000000000000000000000000000000000000000000000000000002": "0x0000000000000000000000000000000000000000000000000000000000000000"
//              }
//          }
//      }
//  }
// Note:
//  * ✅ Address permanently fixed at 0x2041
//  * ✅ Automatically ready when node starts
//  * ⚠️  Only takes effect on first startup (restart will not redeploy)
/**
 * @title TokenRegistry
 * @notice Registry for all native tokens (deployed at 0x2041)
 * @dev This contract manages registration and metadata for all native private tokens
 */
contract TokenRegistryTemplate {
    mapping(address => TokenMetadata) private _tokens;      // Slot 0: token address => TokenMetadata
    address[] private _token_addresses;// Slot 1
    uint256 private _count;// Slot 2

    struct TokenMetadata {
        address tokenAddress;    // Token contract address
        string name;             // Token name
        string symbol;           // Token symbol
        uint8 decimals;          // Token decimals
        bool disabled;
    }

    /// @notice Emitted when a new token is registered
    event NativeTokenRegistered(address indexed sender, address indexed tokenAddress);

    /// @notice Emitted when a token is enabled or disabled
    event NativeTokenStatusChanged(address indexed tokenAddress, bool disabled);

    /**
     * @notice Initialize and register a new native token
     * @param name_ Token name
     * @param symbol_ Token symbol
     * @param decimals_ Token decimals
     * @return tokenAddress The newly created token contract address
     */
    function createNativeToken(
        string calldata name_,
        string calldata symbol_,
        uint8 decimals_
    ) external returns (address tokenAddress) {
        require(bytes(name_).length > 0, "Empty name");
        require(bytes(symbol_).length > 0, "Empty symbol");

        // Calculate deterministic token address (CREATE2 style)
        bytes32 salt = keccak256(abi.encodePacked(name_, msg.sender, _count));
        tokenAddress = address(uint160(uint256(salt)));
        
        // Check for collision
        require(_tokens[tokenAddress].tokenAddress == address(0), "Token already registered");
        
        // Store metadata
        _tokens[tokenAddress] = TokenMetadata({
            tokenAddress: tokenAddress,
            name: name_,
            symbol: symbol_,
            decimals: decimals_,
            disabled: false
        });
        
        // Store reverse mapping
        _token_addresses.push(tokenAddress);


        unchecked {
            ++_count;// ~5 gas
        }

        emit NativeTokenRegistered(msg.sender, tokenAddress);
        return tokenAddress;
    }

    /**
     * @notice Enable or disable a native token
     * @param tokenAddress Token address to update
     * @param disabled True to disable, false to enable
     */
    function enableOrDisableNativeToken(address tokenAddress, bool disabled) external {
        require(_tokens[tokenAddress].tokenAddress != address(0), "Token not registered");
        require(_tokens[tokenAddress].disabled != disabled, "Status unchanged");

        _tokens[tokenAddress].disabled = disabled;

        emit NativeTokenStatusChanged(tokenAddress, disabled);
    }

    /**
     * @notice Get all registered token addresses
     * @return Array of all token addresses
     */
    function getAllTokenAddresses() external view returns (address[] memory) {
        return _token_addresses;
    }

    /**
     * @notice Get total number of registered tokens
     * @return Total count
     */
    function getTokenCount() external view returns (uint256) {
        return _count;
    }

    /**
     * @notice Get token metadata by address
     * @param tokenAddress Token address to query
     * @return metadata Token metadata
     */
    function getTokenMetadata(address tokenAddress) external view returns (TokenMetadata memory metadata) {
        require(_tokens[tokenAddress].tokenAddress != address(0), "Token not registered");
        return _tokens[tokenAddress];
    }

    /**
     * @notice Check if a token is registered
     * @param tokenAddress Token address to check
     * @return True if registered
     */
    function isTokenRegistered(address tokenAddress) external view returns (bool) {
        return _tokens[tokenAddress].tokenAddress != address(0);
    }
}