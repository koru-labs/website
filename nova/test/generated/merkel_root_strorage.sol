// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;
import "../../sol/verifier.sol";
import "hardhat/console.sol";
contract RootStorage {

    mapping(uint256 => HistoryRoots) private addressMapping;
    struct HistoryRoots {
        mapping (uint256 => uint256) transactionHistory;
        mapping (uint256 => uint256) balanceHistory;
    }

    uint256 public txRoot;
    uint256 public balanceRoot;
    uint256 public balanceRootOfRoots;

    mapping(uint256 => uint256) public latestBalanceRoots;

    function verify(bytes calldata data, uint256 contractAddr, string memory bic) public returns (Fr[] memory){
        ZKProof memory proof;
        proof.data = data;
        (uint steps, Fr[] memory z0, Fr[] memory zn) = ZkVerifier.verify(proof);
        // Create a new array to hold the concatenated result of z0 and zn[2]
        Fr[] memory concatenatedArray = new Fr[](z0.length + 1);

        // Copy z0 elements into concatenatedArray
        for (uint i = 0; i < z0.length; i++) {
            concatenatedArray[i] = z0[i];
        }
        concatenatedArray[z0.length] = zn[2];

        storeRoots(concatenatedArray, contractAddr, bic);

        return z0;
    }

    // Function to store roots with the caller's address
    function storeRoots(Fr[] memory roots, uint256 contractAddr, string memory bic) internal {
        uint256 addresskey = computeAddressKey(contractAddr, bic);

        require(roots.length == 4, "root length must equal to 4");
        //if (latestBalanceRoots[addresskey]!=0) {
        //    require(uint256(Fr.unwrap(roots[2]))==latestBalanceRoots[addresskey]);
        //}
        balanceRoot = uint256(Fr.unwrap(roots[3]));
        latestBalanceRoots[addresskey] = balanceRoot;
        txRoot  = uint256(Fr.unwrap(roots[0]));
        console.log("txRoot: ", txRoot);
        HistoryRoots storage thisRoots = addressMapping[addresskey];
        thisRoots.transactionHistory[txRoot] = addresskey;
        balanceRootOfRoots = uint256(Fr.unwrap(roots[1]));
        thisRoots.balanceHistory[balanceRootOfRoots] = addresskey;
        console.log("balanceRootOfRoots: ", balanceRootOfRoots);
    }

    // Function to query the contract address for a given root
    function queryTxRootExist(uint256 addr,uint256 root, string memory bic) public view returns (uint256) {
        uint256 addresskey = computeAddressKey(addr, bic);
        return addressMapping[addresskey].transactionHistory[root];
    }

    function queryBalanceRootOfRootsExist(uint256 addr,uint256 txRoot, uint256 balanceRoot, string memory bic) public view returns (uint256) {
        uint256 addresskey = computeAddressKey(addr, bic);
        if (addressMapping[addresskey].transactionHistory[txRoot] == 0) {
            return 0;
        }
        return addressMapping[addresskey].balanceHistory[balanceRoot];
    }

    function queryLatestBalanceRoot(uint256 addr, string memory bic) public view returns (uint256) {
        uint256 addresskey = computeAddressKey(addr, bic);
        return latestBalanceRoots[addresskey];
    }

    function computeAddressKey(uint256 contractAddr, string memory bic) public pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(contractAddr, bic)));
    }
}
