pragma solidity >=0.8.25;

import "../../sol/verifier.sol";
import "hardhat/console.sol";


contract SimpleVerifier {
    function verify(bytes calldata data) public view returns (uint, Fr[] memory, Fr[] memory){
        ZKProof memory proof;
        proof.data = data;
        return ZkVerifier.verify(proof);
    }
}
