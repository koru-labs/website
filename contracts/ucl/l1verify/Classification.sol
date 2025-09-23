// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

library Classification {

    uint256 public constant MERGE_COUNT = 5;
    uint256 public constant STEPS = 2;

    uint256 public constant EXPECTED_LENGTH = (20 + MERGE_COUNT) * STEPS + 1;

    struct ArrayPosition {
        uint256 start;
        uint256 end;
    }

    function classify(uint256[] memory input) public pure returns (ArrayPosition[] memory positions) {
        require(input.length == EXPECTED_LENGTH, "Invalid input length");
        positions = new ArrayPosition[](18);

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

        // ConvertSpenderPkArray (7)
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

        // ConvertReceiverPkArray (13)
        positions[13] = ArrayPosition(offset, offset + 2 * STEPS);
        offset += 2 * STEPS;

        return positions;
    }
}