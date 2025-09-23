// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.10;

import "./Classification.sol";
import "./lib/verify/Verifier.sol";
import "./model/TokenModel.sol";
import "./PrivateTokenData.sol";
import "./lib/TokenUtilsLib.sol";

contract Handle is PrivateTokenData{
    uint256 constant MERGE_COUNT = Classification.MERGE_COUNT;
    uint256 constant STEPS = Classification.STEPS;
    uint256 constant CONVERT_ZERO_ID = 1505316567199851152165060447902183125321829991706456652247881137933729532273;
    uint256 constant MERGE_ZERO_ID = 15037089479531276094807511187368919652296362232455374635334171080622055606564;

    struct ClassificationResult {
        bool isConvert;
        bool isPrivateToAmount;
        bool isAmountToPrivate;
    }

    // mint
    function mint(uint256 receiverPkX,uint256 tokenId) public {
        TokenUtilsLib.addToken(_accounts, receiverPkX, tokenId);
    }

    // burn
    function burn(uint256 spenderPkX,uint256 tokenId) public {
        TokenUtilsLib.removeToken(_accounts,spenderPkX, tokenId);
    }

    function handle(uint256[8] calldata proof, uint256[51] calldata inputs) public returns (bool) {
        Verifier.verifyProof(proof, inputs);

        uint256[] memory input = new uint256[](inputs.length);

        for (uint256 i = 0; i < inputs.length; i++) {
            input[i] = inputs[i];
        }

        Classification.ArrayPosition[] memory positions = Classification.classify(input);
        Classification.ArrayPosition memory MergeTokenIDPosition = positions[0];
        Classification.ArrayPosition memory ChangeTokenIDPosition = positions[1];
        Classification.ArrayPosition memory TransTokenIDArrayPosition = positions[2];
        Classification.ArrayPosition memory RollbackTokenIDArrayPosition = positions[3];
        Classification.ArrayPosition memory SpenderPkArrayPosition = positions[4];
        Classification.ArrayPosition memory ReceiverPkArrayPosition = positions[5];
        Classification.ArrayPosition memory BackupPkArrayPosition = positions[6];
        Classification.ArrayPosition memory ConvertSpenderPkArrayPosition = positions[7];
        Classification.ArrayPosition memory AmountSpendArrayPosition = positions[8];
        Classification.ArrayPosition memory AmountReceivedArrayPosition = positions[9];
        Classification.ArrayPosition memory ConvertTokenReceivedIDArrayPosition = positions[10];
        Classification.ArrayPosition memory ConvertTokenSpendIDArrayPosition = positions[11];
        Classification.ArrayPosition memory HashChainStepArrayPosition = positions[12];
        Classification.ArrayPosition memory ConvertReceiverPkArrayPosition = positions[13];

        for (uint256 i = 0; i < Classification.STEPS; i++) {
            // 检查是否为0
            if (input[MergeTokenIDPosition.start + MERGE_COUNT * i] == CONVERT_ZERO_ID) {
           //If yes, it means it is a convert transaction, and there is no need to analyze the "5 split 3 logic" in the upper part (enter step 2)
                uint256 convertTokenReceivedIDIndex = ConvertTokenReceivedIDArrayPosition.start + i;
                if(input[convertTokenReceivedIDIndex] == CONVERT_ZERO_ID) {
                   // If yes, it indicates that it is a transaction that private token to amount and should be processed.
                    uint256 convertTokenSpendIDIndex = ConvertTokenSpendIDArrayPosition.start + i;
                    require(input[convertTokenSpendIDIndex] == CONVERT_ZERO_ID, "all tokens are empty");

                    uint256[] memory convertTokenSpendIDArray = sliceArray(input, ConvertTokenSpendIDArrayPosition.start+i, ConvertTokenSpendIDArrayPosition.start+i+1);
                    uint256[] memory ConvertSpenderPkArray = sliceArray(input, ConvertSpenderPkArrayPosition.start+i*2, ConvertSpenderPkArrayPosition.start+i*2+2);
                    processPrivateToAmount(convertTokenSpendIDArray[0],transferPublicKeyToAddress(ConvertSpenderPkArray));
                }else{
                   // If not, it means that the transaction is converted from public to private token and should be processed.
                    uint256[] memory ConvertTokenReceivedIDArray = sliceArray(input, ConvertTokenReceivedIDArrayPosition.start+i, ConvertTokenReceivedIDArrayPosition.start+i+1);
                    uint256[] memory ConvertReceiverPkArray = sliceArray(input, ConvertReceiverPkArrayPosition.start+i*2, ConvertReceiverPkArrayPosition.start+i*2+2);
                    processAmountToPrivate(ConvertTokenReceivedIDArray[0],transferPublicKeyToAddress(ConvertReceiverPkArray));
                }
            }else{
               //If not, parse the token of "5 split 3" and ignore the converts(continue)
                uint256[] memory MergeTokenIDArray = sliceArray(input, MergeTokenIDPosition.start  + MERGE_COUNT * i, MergeTokenIDPosition.start  + MERGE_COUNT * i + 1);
                uint256[] memory changeTokenIDArray = sliceArray(input, ChangeTokenIDPosition.start+i, ChangeTokenIDPosition.start+i+1);
                uint256[] memory transferTokenIDArray = sliceArray(input, TransTokenIDArrayPosition.start+i, TransTokenIDArrayPosition.start+i+1);
                uint256[] memory rollbackTokenIDArray = sliceArray(input, RollbackTokenIDArrayPosition.start+i, RollbackTokenIDArrayPosition.start+i+1);
                uint256[] memory spenderPkArray = sliceArray(input, SpenderPkArrayPosition.start+i*2, SpenderPkArrayPosition.start+i*2+2);
                uint256[] memory receiverPkArray = sliceArray(input, ReceiverPkArrayPosition.start+i*2, ReceiverPkArrayPosition.start+i*2+2);
                uint256[] memory backupPkArray = sliceArray(input, BackupPkArrayPosition.start+i*2, BackupPkArrayPosition.start+i*2+2);
                processTokenSplit(MergeTokenIDArray,changeTokenIDArray[0],transferTokenIDArray[0],rollbackTokenIDArray[0],transferPublicKeyToAddress(spenderPkArray),transferPublicKeyToAddress(receiverPkArray),transferPublicKeyToAddress(backupPkArray));
            }
        }
        return true;
    }

    function sliceArray(uint256[] memory array, uint256 start, uint256 end) private  returns (uint256[] memory) {
        uint256 length = end - start;
        uint256[] memory result = new uint256[](length);
        for (uint256 i = 0; i < length; i++) {
            result[i] = array[start + i];
        }
        return result;
    }

    // processTokenSplit
    function processTokenSplit(uint256[] memory mergeTokenIDArray,uint256 changeTokenCLX,uint256 transferTokenCLX,uint256 rollbackTokenCLX,uint256 spenderPkX,uint256 receiverPkX,uint256 backupPkX) public  {

        TokenUtilsLib.removeTokens(_accounts, spenderPkX, mergeTokenIDArray);

        _rollBackTokens[transferTokenCLX] = rollbackTokenCLX;

        TokenUtilsLib.addToken(_accounts, receiverPkX, changeTokenCLX);
        TokenUtilsLib.addToken(_accounts, spenderPkX, transferTokenCLX);
        TokenUtilsLib.addToken(_accounts, backupPkX, rollbackTokenCLX);
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


    function transferPublicKeyToAddress(uint256[] memory publicKey) public view returns (uint256) {
        uint256 x = publicKey[0];
        uint256 y = publicKey[1];
        return (y % 2 == 0) ? x : x + (1 << 254);
    }
}