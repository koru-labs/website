pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "../ucl/circle/lib/CurveBabyJubJubHelper.sol";
import "../ucl/circle/model/TokenModel.sol";

contract SimpleToken is ERC20 {
    uint256 public leftX;
    uint256 public leftY;
    uint256 public rightX;
    uint256 public rightY;

    TokenModel.ElGamal public sumToken;

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 9999999999);
    }

    function callPrecompiledAdd(uint256 p1LeftX, uint256 p1LeftY, uint256 p1RightX, uint256 p1RightY,
        uint256 p2LeftX, uint256 p2LeftY, uint256 p2RightX, uint256 p2RightY) public {
        bytes memory input = abi.encode(p1LeftX, p1LeftY, p1RightX, p1RightY, p2LeftX, p2LeftY, p2RightX, p2RightY);
        (bool success, bytes memory data) = address(0x2040).call(input);
        require(success == true, "call precompiled failed");

        (leftX, leftY, rightX, rightY) = abi.decode(data, (uint256, uint256, uint256, uint256));
    }

    function callSoliditySdkAdd(uint256 p1LeftX, uint256 p1LeftY, uint256 p1RightX, uint256 p1RightY,
        uint256 p2LeftX, uint256 p2LeftY, uint256 p2RightX, uint256 p2RightY) public {
        TokenModel.ElGamal memory token1 = TokenModel.ElGamal({
            cl_x: p1LeftX,
            cl_y: p1LeftY,
            cr_x: p1RightX,
            cr_y: p1RightY
        });
        TokenModel.ElGamal memory token2 = TokenModel.ElGamal({
            cl_x: p2LeftX,
            cl_y: p2LeftY,
            cr_x: p2RightX,
            cr_y: p2RightY
        });

        sumToken = CurveBabyJubJubHelper.addElGamal(token1, token2);
    }

    function callPrecompiledSub(uint256 p1LeftX, uint256 p1LeftY, uint256 p1RightX, uint256 p1RightY,
        uint256 p2LeftX, uint256 p2LeftY, uint256 p2RightX, uint256 p2RightY) public {
        bytes memory input = abi.encode(p1LeftX, p1LeftY, p1RightX, p1RightY, p2LeftX, p2LeftY, p2RightX, p2RightY);
        (bool success, bytes memory data) = address(0x2050).call(input);
        require(success == true, "call precompiled failed");

        (leftX, leftY, rightX, rightY) = abi.decode(data, (uint256, uint256, uint256, uint256));
    }

    function callSoliditySdkSub(uint256 p1LeftX, uint256 p1LeftY, uint256 p1RightX, uint256 p1RightY,
        uint256 p2LeftX, uint256 p2LeftY, uint256 p2RightX, uint256 p2RightY) public  {
        TokenModel.ElGamal memory token1 = TokenModel.ElGamal({
            cl_x: p1LeftX,
            cl_y: p1LeftY,
            cr_x: p1RightX,
            cr_y: p1RightY
        });
        TokenModel.ElGamal memory token2 = TokenModel.ElGamal({
            cl_x: p2LeftX,
            cl_y: p2LeftY,
            cr_x: p2RightX,
            cr_y: p2RightY
        });

        sumToken = CurveBabyJubJubHelper.subElGamal(token1, token2);
    }

    function precompiledAddMultipleElGamal(
        TokenModel.ElGamal[] memory tokens
    ) public view returns (TokenModel.ElGamal memory result) {
        uint256 inputSize = tokens.length * 128;
        bytes memory input = new bytes(inputSize);
        for (uint i = 0; i < tokens.length; i++) {
            uint256 offset = i * 128;
            TokenModel.ElGamal memory token = tokens[i];
            assembly {
                mstore(add(add(input, 32), offset), mload(add(token, 0)))   // cl_x
                mstore(add(add(input, 32), add(offset, 32)), mload(add(token, 32))) // cl_y
                mstore(add(add(input, 32), add(offset, 64)), mload(add(token, 64))) // cr_x
                mstore(add(add(input, 32), add(offset, 96)), mload(add(token, 96))) // cr_y
            }
        }
        (bool success, bytes memory data) = address(0x2041).staticcall(input);
        require(success, "Precompiled multiple addition failed");
        require(data.length == 128, "Invalid response length");
        (uint256 leftX, uint256 leftY, uint256 rightX, uint256 rightY) = abi.decode(data, (uint256, uint256, uint256, uint256));

        result = TokenModel.ElGamal({
            cl_x: leftX,
            cl_y: leftY,
            cr_x: rightX,
            cr_y: rightY
        });
    }
}
