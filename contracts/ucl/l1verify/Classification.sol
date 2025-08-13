// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

library Classification {

    uint256 public constant MERGE_COUNT = 5;
    uint256 public constant STEPS = 2;

    uint256 public constant EXPECTED_LENGTH = (31 + 4*MERGE_COUNT) * STEPS + 1;

    struct ArrayPosition {
        uint256 start;
        uint256 end;
    }

//     数据示例
//    //2 * mergeCount * steps
//    MergeTokenCLArray    [Steps][MergeCount]twistededwards.Point `gnark:",public"`
//    //2 * mergeCount * steps
//    MergeTokenCRArray    [Steps][MergeCount]twistededwards.Point `gnark:",public"`
//    //2 * steps
//    ChangeTokenCLArray   [Steps]twistededwards.Point             `gnark:",public"`
//    //2 * steps
//    ChangeTokenCRArray   [Steps]twistededwards.Point             `gnark:",public"`
//    //2 * steps
//    TransTokenCLArray    [Steps]twistededwards.Point             `gnark:",public"`
//    //2 * steps
//    TransTokenCRArray    [Steps]twistededwards.Point             `gnark:",public"`
//    //2 * steps
//    RollbackTokenCLArray [Steps]twistededwards.Point             `gnark:",public"`
//    //2 * steps
//    RollbackTokenCRArray [Steps]twistededwards.Point             `gnark:",public"`
//    //temporarily Spender and Backup pk must be equal
//    //2 * steps
//    SpenderPkArray  [Steps]twistededwards.Point `gnark:",public"`
//    //2 * steps
//    ReceiverPkArray [Steps]twistededwards.Point `gnark:",public"`
//    //2 * steps
//    BackupPkArray   [Steps]twistededwards.Point `gnark:",public"`
//
//
//    //convert
//    //padding with zero amount, zero token to make sure merge token count is 5
//    //2 * steps
//    ConvertPkArray              [Steps]twistededwards.Point `gnark:",public"`
//    //1 * steps
//    AmountSpendArray            [Steps]frontend.Variable    `gnark:",public"`
//    //1 * steps
//    AmountReceivedArray         [Steps]frontend.Variable    `gnark:",public"`
//    //2 * steps
//    ConvertTokenReceivedCLArray [Steps]twistededwards.Point `gnark:",public"`
//    //2 * steps
//    ConvertTokenReceivedCRArray [Steps]twistededwards.Point `gnark:",public"`
//    //2 * steps
//    ConvertTokenSpendCLArray    [Steps]twistededwards.Point `gnark:",public"`
//    //2 * steps
//    ConvertTokenSpendCRArray    [Steps]twistededwards.Point `gnark:",public"`

    // 分类
    function classify(uint256[] memory input) public pure returns (ArrayPosition[] memory positions) {
        require(input.length == EXPECTED_LENGTH, "Invalid input length");
        positions = new ArrayPosition[](18);

        // 计算每个数组的偏移量
        uint256 offset = 0;

        // MergeTokenCLArray (0)
        positions[0] = ArrayPosition(offset, offset + 2 * MERGE_COUNT * STEPS);
        offset += 2 * MERGE_COUNT * STEPS;

        // MergeTokenCRArray (1)
        positions[1] = ArrayPosition(offset, offset + 2 * MERGE_COUNT * STEPS);
        offset += 2 * MERGE_COUNT * STEPS;

        // ChangeTokenCLArray (2)
        positions[2] = ArrayPosition(offset, offset + 2 * STEPS);
        offset += 2 * STEPS;

        // ChangeTokenCRArray (3)
        positions[3] = ArrayPosition(offset, offset + 2 * STEPS);
        offset += 2 * STEPS;

        // TransTokenCLArray (4)
        positions[4] = ArrayPosition(offset, offset + 2 * STEPS);
        offset += 2 * STEPS;

        // TransTokenCRArray (5)
        positions[5] = ArrayPosition(offset, offset + 2 * STEPS);
        offset += 2 * STEPS;

        // RollbackTokenCLArray (6)
        positions[6] = ArrayPosition(offset, offset + 2 * STEPS);
        offset += 2 * STEPS;

        // RollbackTokenCRArray (7)
        positions[7] = ArrayPosition(offset, offset + 2 * STEPS);
        offset += 2 * STEPS;

        // SpenderPkArray (8)
        positions[8] = ArrayPosition(offset, offset + 2 * STEPS);
        offset += 2 * STEPS;

        // ReceiverPkArray (9)
        positions[9] = ArrayPosition(offset, offset + 2 * STEPS);
        offset += 2 * STEPS;

        // BackupPkArray (10)
        positions[10] = ArrayPosition(offset, offset + 2 * STEPS);
        offset += 2 * STEPS;

        // ConvertPkArray (11)
        positions[11] = ArrayPosition(offset, offset + 2 * STEPS);
        offset += 2 * STEPS;

        // AmountSpendArray (12)
        positions[12] = ArrayPosition(offset, offset + 1 * STEPS);
        offset += 1 * STEPS;

        // AmountReceivedArray (13)
        positions[13] = ArrayPosition(offset, offset + 1 * STEPS);
        offset += 1 * STEPS;

        // ConvertTokenReceivedCLArray (14)
        positions[14] = ArrayPosition(offset, offset + 2 * STEPS);
        offset += 2 * STEPS;

        // ConvertTokenReceivedCRArray (15)
        positions[15] = ArrayPosition(offset, offset + 2 * STEPS);
        offset += 2 * STEPS;

        // ConvertTokenSpendCLArray (16)
        positions[16] = ArrayPosition(offset, offset + 2 * STEPS);
        offset += 2 * STEPS;

        // ConvertTokenSpendCRArray (17)
        positions[17] = ArrayPosition(offset, offset + 2 * STEPS);

        return positions;
    }
}