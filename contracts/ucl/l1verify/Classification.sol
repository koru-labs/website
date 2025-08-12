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
        for (uint256 i = 0; i < 18; i++) {
            positions[i] = getArrayPositionsByStep(input, i);
        }
        return positions;
    }

    // 根据arrayIndex和steps确定数组的位置
    function getArrayPositionsByStep(uint256[] memory input, uint256 arrayIndex) internal pure returns (ArrayPosition memory position) {
        require(input.length == EXPECTED_LENGTH, "Invalid input length");
        
        // 根据arrayIndex确定不同数组的步长
        uint256 stepSize;
        if (arrayIndex < 2) {
            // MergeToken数组: 2 * 2 * MERGE_COUNT
            stepSize = 4 * MERGE_COUNT;
        } else if (arrayIndex < 10) {
            // 非convert数组: 2
            stepSize = 2;
        } else if (arrayIndex < 12) {
            // Amount数组: 1
            stepSize = 1;
        } else {
            // Convert相关数组: 2
            stepSize = 2;
        }
        
        // 计算起始位置
        position.start = arrayIndex * STEPS * stepSize;
        position.end = position.start + STEPS * stepSize;
        
        return position;
    }
}