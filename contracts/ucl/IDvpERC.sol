pragma solidity ^0.8.0;

interface ITransfer {
    function transfer(address to, uint256 value) external returns (bool);
    function transfer1155(address to,  uint256 tokenType, uint256 value) external returns (bool);

    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transferFrom1155(address from, address to, uint256 tokenType, uint256 amount) external returns (bool);
}

interface IBurn {
    function burn(uint256 amount) external;
    function burn1155(uint256 tokenType, uint256 amount) external;

}

interface IMint {
    function mint(address account, uint256 amount) external ;
    function mint1155(address account, uint256 tokenType,  uint256 amount) external ;

}