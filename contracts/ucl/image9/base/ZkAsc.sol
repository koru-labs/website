// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./TokenModel.sol";
import "./ITokenScBase.sol";
import "../event/IL2Event.sol";
import "../event/L2EventDefinitions.sol";


struct DVPCommitData {
    address tokenContract;
    address from;
    uint256 tokenId;
    address toManager;
    address to;
}

contract ZkAsc {
    function commitDVP(DVPCommitData[] memory data) public {
        bool  needsRollBack;
        bool[] memory tokenNeedsRollBackMapping = new bool[](data.length);

        for (uint i = 0; i < data.length; i++) {
            if ( ! ITokenScBase(data[i].tokenContract).validateDVP(data[i].tokenId, data[i].from, data[i].toManager, data[i].to)) {
                tokenNeedsRollBackMapping[i] =true;
                needsRollBack=true;
            }
        }

        if (needsRollBack) {
            for(uint i=0;i < tokenNeedsRollBackMapping.length; i++) {
                if (tokenNeedsRollBackMapping[i]) {
                    ITokenScBase(data[i].tokenContract).rollbackDVP(data[i].from, data[i].tokenId);
                }
            }
        } else {
            for (uint i = 0; i < data.length; i++) {
                ITokenScBase(data[i].tokenContract).commitDVP(data[i].tokenId, data[i].from, data[i].toManager, data[i].to);
            }
        }
    }
}
