// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

library Classification {

    uint256 public constant MERGE_COUNT = 5;
    uint256 public constant STEPS = 2;

    uint256 public constant EXPECTED_LENGTH = (18 + MERGE_COUNT) * STEPS + 1;

    struct ArrayPosition {
        uint256 start;
        uint256 end;
    }

//     数据示例
//    type RollupBetaInputs struct {
//        G twistededwards.Point `gnark:",public"`
//        H twistededwards.Point `gnark:",public"`
//        //split and mint allowance
//        //merge sum equals to SpentToken
//        //padding with zerotoken to make sure merge token count is 5
//        MergeTokenIDArray    [Steps][MergeCount]frontend.Variable    `gnark:",public"`
//        ChangeTokenIDArray   [Steps]frontend.Variable                `gnark:",public"`
//        TransTokenIDArray    [Steps]frontend.Variable                `gnark:",public"`
//        RollbackTokenIDArray [Steps]frontend.Variable                `gnark:",public"`
//        //temporarily Spender and Backup pk must be equal
//        SpenderPkArray  [Steps]twistededwards.Point `gnark:",public"`
//        ReceiverPkArray [Steps]twistededwards.Point `gnark:",public"`
//        BackupPkArray   [Steps]twistededwards.Point `gnark:",public"`
//
//
//        //padding with zero amount, zero token to make sure merge token count is 5
//        ConvertPkArray              [Steps]twistededwards.Point `gnark:",public"`
//        AmountSpendArray            [Steps]frontend.Variable    `gnark:",public"`
//        AmountReceivedArray         [Steps]frontend.Variable    `gnark:",public"`
//        ConvertTokenReceivedIDArray [Steps]frontend.Variable    `gnark:",public"`
//        ConvertTokenSpendIDArray    [Steps]frontend.Variable    `gnark:",public"`
//
//
//        // hashchain
//        HashChainStepArray [Steps + 1]frontend.Variable `gnark:",public"`
//    }


    // 分类
    function classify(uint256[] memory input) public pure returns (ArrayPosition[] memory positions) {
        require(input.length == EXPECTED_LENGTH, "Invalid input length");
        positions = new ArrayPosition[](18);

        // 计算每个数组的偏移量
        uint256 offset = 4;

        // MergeTokenID (0)
        positions[0] = ArrayPosition(offset, offset + MERGE_COUNT * STEPS);
        offset += MERGE_COUNT * STEPS;

        // ChangeTokenID (1)
        positions[1] = ArrayPosition(offset, offset + STEPS);
        offset += STEPS;

        // TransTokenIDArray (2)
        positions[2] = ArrayPosition(offset, offset + STEPS);
        offset += STEPS;

        // RollbackTokenIDArray (3)
        positions[3] = ArrayPosition(offset, offset + STEPS);
        offset += STEPS;

        // SpenderPkArray (4)
        positions[4] = ArrayPosition(offset, offset + 2 * STEPS);
        offset += 2 * STEPS;

        // ReceiverPkArray (5)
        positions[5] = ArrayPosition(offset, offset + 2 * STEPS);
        offset += 2 * STEPS;

        // BackupPkArray (6)
        positions[6] = ArrayPosition(offset, offset + 2 * STEPS);
        offset += 2 * STEPS;

        // ConvertPkArray (7)
        positions[7] = ArrayPosition(offset, offset + 2 * STEPS);
        offset += 2 * STEPS;

        // AmountSpendArray (8)
        positions[8] = ArrayPosition(offset, offset + STEPS);
        offset += STEPS;

        // AmountReceivedArray (9)
        positions[9] = ArrayPosition(offset, offset + STEPS);
        offset += STEPS;

        // ConvertTokenReceivedIDArray (10)
        positions[10] = ArrayPosition(offset, offset + STEPS);
        offset += STEPS;

        // ConvertTokenSpendIDArray (11)
        positions[11] = ArrayPosition(offset, offset + STEPS);
        offset += STEPS;

        // HashChainStepArray (12)
        positions[12] = ArrayPosition(offset, offset + 1 + STEPS);
        offset += 1 + STEPS;

        return positions;
    }
}