// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "./Classification.sol";
import "./lib/verify/Verifier.sol";
import "./model/TokenModel.sol";
import "./PrivateTokenData.sol";
import "./lib/TokenUtilsLib.sol";

contract Handle is PrivateTokenData{
    // 常量定义
    uint256 constant MERGE_COUNT = Classification.MERGE_COUNT;
    uint256 constant STEPS = Classification.STEPS;
    uint256 constant CONVERT_ZERO_X = 11517643671679671626907878304956248754469067668720425530634666199183563961829;
    uint256 constant CONVERT_ZERO_Y = 15033760257813752716653332257111988440209700063181007723553372283340776078308;

    // 分类结果结构体
    struct ClassificationResult {
        bool isConvert;              // 是否为convert交易
        bool isPrivateToAmount;    // 是否为private token转amount的交易
        bool isAmountToPrivate;    // 是否为amount转private token的交易
    }

    struct Token {
        uint256 x;
        uint256 y;
    }

    // 验证
    function handle(uint256[8] calldata proof, uint256[103] calldata inputs) public returns (bool) {
        Verifier.verifyProof(proof, inputs);

        // 定长数组改为动态数组
        uint256[] memory input = new uint256[](inputs.length);

        // 将calldata数组复制到memory数组
        for (uint256 i = 0; i < inputs.length; i++) {
            input[i] = inputs[i];
        }

        Classification.ArrayPosition[] memory positions = Classification.classify(input);
        Classification.ArrayPosition memory mergeTokenCLArrayPosition = positions[0];
        Classification.ArrayPosition memory changeTokenCLArrayPosition = positions[2];
        Classification.ArrayPosition memory transTokenCLArrayPosition = positions[4];
        Classification.ArrayPosition memory rollbackTokenCLArrayPosition = positions[6];
        Classification.ArrayPosition memory SpenderPkArrayPosition = positions[8];
        Classification.ArrayPosition memory convertPkArrayPosition = positions[11];
        Classification.ArrayPosition memory convertTokenReceivedCLArrayPosition = positions[14];
        Classification.ArrayPosition memory convertTokenReceivedCRArrayPosition = positions[15];
        Classification.ArrayPosition memory convertTokenSpendCLArrayPosition = positions[16];

        for (uint256 i = 0; i < Classification.STEPS; i++) {
            // 检查是否为{0,1}组合
            uint256 mergeTokenCLXIndex = mergeTokenCLArrayPosition.start + 0 + i*MERGE_COUNT*2;
            uint256 mergeTokenCLYIndex = mergeTokenCLXIndex + 1;
            if (input[mergeTokenCLXIndex] == 0 && input[mergeTokenCLYIndex] == 1) {
                //如果是，说明是一个convert交易，不用解析上半部分的"5拆3逻辑"（进入第2步）
                uint256 convertTokenReceivedCRXIndex = convertTokenReceivedCRArrayPosition.start + i * 2;
                uint256 convertTokenReceivedCRYIndex = convertTokenReceivedCRArrayPosition.start + 1 + i * 2;
                if(input[convertTokenReceivedCRXIndex] == CONVERT_ZERO_X && input[convertTokenReceivedCRYIndex] == CONVERT_ZERO_Y) {
                    //如果是，说明是private token转成amount的交易，应该处理
                    Classification.ArrayPosition memory convertTokenSpendCRArrayPosition = positions[17];
                    uint256 convertTokenSpendCRXIndex = convertTokenSpendCRArrayPosition.start + i * 2;
                    uint256 convertTokenSpendCRYIndex = convertTokenSpendCRArrayPosition.start + 1 + i * 2;
                    require(input[convertTokenSpendCRXIndex] == CONVERT_ZERO_X && input[convertTokenSpendCRYIndex] == CONVERT_ZERO_Y, "all tokens are empty");

                    // 修复数组切片语法错误
                    uint256[] memory convertTokenSpendCLArray = sliceArray(input, convertTokenSpendCLArrayPosition.start+i*2, convertTokenSpendCLArrayPosition.start+i*2+2);
                    uint256[] memory convertPkArray = sliceArray(input, convertPkArrayPosition.start+i*2, convertPkArrayPosition.start+i*2+2);
                    processPrivateToAmount(convertTokenSpendCLArray[0],convertPkArray[0]);
                }else{
                    //如果不是，说明是amount 转成private token的交易，应该处理
                    uint256[] memory convertTokenReceivedCLArray = sliceArray(input, convertTokenReceivedCLArrayPosition.start+i*2, convertTokenReceivedCLArrayPosition.start+i*2+2);
                    uint256[] memory convertPkArray = sliceArray(input, convertPkArrayPosition.start+i*2, convertPkArrayPosition.start+i*2+2);
                    processAmountToPrivate(convertTokenReceivedCLArray[0],convertPkArray[0]);
                }
            }else{
                //如果不是，则解析"5拆3"的token，忽略converts（continue）
                uint256[] memory mergeTokenCLArray = sliceArray(input, mergeTokenCLXIndex, mergeTokenCLXIndex+10);
                uint256[] memory changeTokenCLArray = sliceArray(input, changeTokenCLArrayPosition.start+i*2, changeTokenCLArrayPosition.start+i*2+2);
                uint256[] memory transferTokenCLArray = sliceArray(input, transTokenCLArrayPosition.start+i*2, transTokenCLArrayPosition.start+i*2+2);
                uint256[] memory rollbackTokenCLArray = sliceArray(input, rollbackTokenCLArrayPosition.start+i*2, rollbackTokenCLArrayPosition.start+i*2+2);
                uint256[] memory spenderPkArray = sliceArray(input, SpenderPkArrayPosition.start+i*2, SpenderPkArrayPosition.start+i*2+2);
                processTokenSplit(mergeTokenCLArray,changeTokenCLArray[0],transferTokenCLArray[0],rollbackTokenCLArray[0],spenderPkArray[0]);
            }
        }
        return true;
    }

    // 实现数组切片功能
    function sliceArray(uint256[] memory array, uint256 start, uint256 end) private  returns (uint256[] memory) {
        uint256 length = end - start;
        uint256[] memory result = new uint256[](length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = array[start + i];
        }
        return result;
    }

    // processTokenSplit
    function processTokenSplit(uint256[] memory mergeTokenCLArray,uint256 changeTokenCLX,uint256 transferTokenCLX,uint256 rollbackTokenCLX,uint256 spenderPkX) public  {
        uint256[] memory mergeTokenCLXs = new uint256[](mergeTokenCLArray.length / 2);

        uint256 count = 0;
        for (uint256 i = 0; i < mergeTokenCLArray.length; i += 2) {
            if (mergeTokenCLArray[i] != 0) {
                // token x
                mergeTokenCLXs[count] = mergeTokenCLArray[i];
                count++;
            }
        }

        // 调整数组大小以匹配实际元素数量
        uint256[] memory actualMergeTokenCLXs = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            actualMergeTokenCLXs[i] = mergeTokenCLXs[i];
        }

        TokenUtilsLib.removeTokens(_accounts, spenderPkX, actualMergeTokenCLXs);

        _rollBackTokens[transferTokenCLX] = rollbackTokenCLX;
        TokenUtilsLib.addToken(_accounts, spenderPkX, changeTokenCLX);
        TokenUtilsLib.addToken(_accounts, spenderPkX, transferTokenCLX);
        TokenUtilsLib.addToken(_accounts, spenderPkX, rollbackTokenCLX);
    }

    // processPrivateToAmount
    function processPrivateToAmount(uint256 convertTokenSpendCLX,uint256 convertPkX) public  {
        // Prepare token IDs for deletion
        uint256[] memory tokenIds = new uint256[](1);
        tokenIds[0] = convertTokenSpendCLX;
        // Remove token and update balance
        TokenUtilsLib.removeTokens(_accounts, convertPkX, tokenIds);

        // Remove rollback token
        uint256[] memory rollbackTokenIds = new uint256[](1);
        rollbackTokenIds[0] = _rollBackTokens[convertTokenSpendCLX];
        TokenUtilsLib.removeTokens(_accounts, convertPkX, rollbackTokenIds);
    }

    // processAmountToPrivate
    function processAmountToPrivate(uint256 convertTokenReceivedCLX, uint256 convertPkX) public  {
        // Add token and update balance
        TokenUtilsLib.addToken(_accounts, convertPkX, convertTokenReceivedCLX);
    }
}