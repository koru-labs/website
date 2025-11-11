// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PrivateTokenData.sol";
import "../model/TokenModel.sol";
import "../lib/TokenEventLib.sol";
import "../lib/TokenUtilsLib.sol";

/**
 * @title PrivateTotalSupplyManager
 * @dev Centralizes logic for managing encrypted private total supply snapshots.
 */
abstract contract PrivateTotalSupplyManager is PrivateTokenData {
    event PrivateTotalSupplyRecorded(uint256 indexed blockNumber, TokenModel.ElGamal privateTotalSupply);
    event PrivateTotalSupplyRevealed(uint256 indexed blockNumber, uint256 publicTotalSupply);

    function _increasePrivateTotalSupply(
        TokenModel.ElGamal memory amount
    ) internal returns (TokenModel.ElGamal memory oldTotalSupply) {
        oldTotalSupply = _privateTotalSupply;
        (_privateTotalSupply, _numberOfTotalSupplyChanges) = TokenUtilsLib.addSupply(
            _privateTotalSupply,
            _numberOfTotalSupplyChanges,
            amount
        );
        _updatePrivateTotalSupply();
    }

    function _decreasePrivateTotalSupply(
        TokenModel.ElGamal memory amount
    ) internal returns (TokenModel.ElGamal memory oldTotalSupply) {
        oldTotalSupply = _privateTotalSupply;
        (_privateTotalSupply, _numberOfTotalSupplyChanges) = TokenUtilsLib.subSupply(
            _privateTotalSupply,
            _numberOfTotalSupplyChanges,
            amount
        );
        _updatePrivateTotalSupply();
    }

    function _updatePrivateTotalSupply() internal {
        uint256 currentBlockNumber = block.number;

        if (currentBlockNumber - _lastProcessedBlockNumber >= _stepLength) {
            _recordPrivateTotalSupplySnapshot(currentBlockNumber, _privateTotalSupply);
            _lastProcessedBlockNumber = currentBlockNumber;
        }
    }

    function _recordPrivateTotalSupplySnapshot(
        uint256 blockNumber,
        TokenModel.ElGamal memory supplySnapshot
    ) internal {
        _privateTotalSupplyHistory[blockNumber] = supplySnapshot;

        emit PrivateTotalSupplyRecorded(blockNumber, supplySnapshot);

        TokenEventLib.triggerPrivateTotalSupplyRecordedEvent(
            _l2Event,
            address(this),
            msg.sender,
            blockNumber,
            supplySnapshot
        );
    }
}
