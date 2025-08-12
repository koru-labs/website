// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "./Classification.sol";

contract Verify {
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

    // 验证
    function verify(uint256[] memory input) public pure returns (bool) {
        // 我们需要用到的数组
    // MergeTokenCLArray(0) 和 ConvertTokenReceivedCRArray(15)

        Classification.ArrayPosition[] memory positions = Classification.classify(input);
        Classification.ArrayPosition memory mergeTokenCLArrayPosition = positions[0];
        Classification.ArrayPosition memory convertTokenReceivedCRArrayPosition = positions[15];

        for (uint256 i = 0; i < Classification.STEPS; i++) {
            // 检查是否为{0,1}组合
            if (input[mergeTokenCLArrayPosition.start + 0 + i*MERGE_COUNT*2] == 0 && input[mergeTokenCLArrayPosition.start + 1 + i*MERGE_COUNT*2] == 1) {
                //如果是，说明是一个convert交易，不用解析上半部分的“5拆3逻辑”（进入第2步）
                if(convertTokenReceivedCRArrayPosition.start == CONVERT_ZERO_X && input[convertTokenReceivedCRArrayPosition.start + 1] == CONVERT_ZERO_Y) {
                   //如果是，说明是private token转成amount的交易，应该处理
                }else{
                    //如果不是，说明是amount 转成private token的交易，应该处理
                }
            }else{
                //如果不是，则解析“5拆3”的token，忽略converts（continue）
            }
        }
        return true;
    }



}