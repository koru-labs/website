pragma solidity ^0.8.0;


interface IL2TMSC {
    function balanceOf(address account, address token_address, uint256 token_type) external view returns (uint256);
    function transfer(address to, address token_address, uint256 token_type, uint256 amount) external returns (bool);
    function transferFrom(address from, address token_address, uint256 token_type, address to, uint256 amount) external returns (bool);

    function allowance(address owner, address token_address, uint256 token_type, address spender) external view returns (uint256);
    function approve(address spender, address token_address, uint256 token_type, uint256 amount) external returns (bool);
    function mint(address account, address token_address, uint256 token_type, uint256 amount) external returns (bool);
    function burn(address account, address token_address, uint256 token_type, uint256 amount) external returns (bool);
}