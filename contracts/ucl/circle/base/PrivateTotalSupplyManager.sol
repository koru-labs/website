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
        _updatePrivateTotalSupply();

        oldTotalSupply = _privateTotalSupply;
        (_privateTotalSupply, _numberOfTotalSupplyChanges) = TokenUtilsLib.addSupply(
            _privateTotalSupply,
            _numberOfTotalSupplyChanges,
            amount
        );
    }

    function _decreasePrivateTotalSupply(
        TokenModel.ElGamal memory amount
    ) internal returns (TokenModel.ElGamal memory oldTotalSupply) {
        _updatePrivateTotalSupply();

        oldTotalSupply = _privateTotalSupply;
        (_privateTotalSupply, _numberOfTotalSupplyChanges) = TokenUtilsLib.subSupply(
            _privateTotalSupply,
            _numberOfTotalSupplyChanges,
            amount
        );
    }

    function _updatePrivateTotalSupply() internal {
        uint256 currentBlockNumber = block.number;

        // When entering a new block, save the snapshot of the previous block
        // At this point, _privateTotalSupply contains the final state of the previous block
        if (currentBlockNumber != _previousBlockNumber && _previousBlockNumber != 0) {
            // Save the snapshot for the previous block
            _previousBlockTotalSupply = _privateTotalSupply;

            // Check if we need to record the snapshot for the previous block
            // Record snapshot when: previousBlock - lastProcessedBlock >= stepLength
            if (_previousBlockNumber >= (_stepLength + _lastProcessedBlockNumber)) {
                _recordPrivateTotalSupplySnapshot(_previousBlockNumber, _previousBlockTotalSupply);
                _lastProcessedBlockNumber = _previousBlockNumber;
            }
        }

        // Update the previous block number to current
        if (currentBlockNumber != _previousBlockNumber) {
            _previousBlockNumber = currentBlockNumber;
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
