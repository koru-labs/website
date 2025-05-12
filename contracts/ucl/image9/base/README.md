## DVP TokenScBase contract desgin

### 1. Overview
- Try to record all the necessary information in the TokenEntity alone, no extra mapping storage needed.
- Simplify contract interactions. DVP participants will communicate and prepare ZK proofs offchain.

### 2. Components
- TokenScBase.sol
- ZkAsc.sol

### 3. Interface
#+begin_src solidity

// TokenScBase
// All offchain preparations can be uploaded here, and token entity will be organized accordingly.
    function splitTokenForDVP(address spender, TokenModel.TokenValueUpdate calldata parentTokenUpdate, TokenModel.NewToken[] calldata childTokens, bytes calldata proof) external;

// Rollback will be triggered automatically when any error occurs during calling commitDVP
    function rollbackForDVP(address walletOwner, uint256 tokenId) external;

    function exchangeForDVP(uint256 tokenId, address from, address toManager, address to) external returns (bool);

#+end_src

#+begin_src solidity
// ZkAsc
// DVP will be finalized after commitDVP
    function commitDVP(CommitDVPData[] memory) public;
#+end_src
