pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";


interface IL1TMSC {
    // Settlement event definition
    event Settlement(
        address indexed fromBankAdmin,
        address indexed toBankAdmin,
        address tokenAddress,
        uint256 tokenType,
        uint256 totalAmount,
        uint256[] bundleHashes,
        uint256[] amounts
    );

    function depositErc20From(address sender, IERC20 token_address, address bank_admin,
        address recipient, uint256 amount) external returns (bool);

    function depositErc1155From(address sender, IERC1155 token_address, uint256 token_type,
        address bank_admin, address recipient, uint256 amount) external returns (bool);

    function settle(address bank_admin_to, address token_address, uint256 token_type, uint256 amount, uint256[] calldata bundleHashes, uint256[] calldata amounts) external returns (bool);

    function balanceOfBank(address bank_admin, address token_address, uint256 token_type) external returns (uint256);

    function updateBridge(address newBridge) external;

    function createTmscTokenType(uint256 random) external ;
    function getCreatedTmscTokenType(uint256 random) external view returns (uint256);
}