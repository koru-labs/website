pragma solidity ^0.8.0;

    struct BurnRequest {
        address tokenScAddress;
        uint256 tokenType;

        address account;
        uint256 amount;
    }

    struct MintRequest {
        address tokenScAddress;
        uint256 tokenType;

        address account;
        uint256 amount;
    }

//    struct GenerateRequest {
//        address tokenScAddress;
//
//        address account;
//        uint256 amount;
//    }

    struct TransferRequest {
        address tokenScAddress;
        uint256 tokenType;
        
        address from;
        address to;
        uint256 amount;
    }

    struct ScheduleRequest {
        address tokenAddress;
        address to;
        uint256 tokenType;
        uint256 amount;
        uint256 index;
        uint256 chunkHash;
        uint256 bundleHash;
        uint256 expireTime;
        address sender;
    }

    struct BurnSettleRequest {
        address tokenScAddress;
        uint256 tokenType;
        address account;
        uint256 amount;
        address toBankAddress;
    }

    struct ScheduleRequest2 {
        uint256 index;
        uint256 chunkHash;
        uint256 bundleHash;
        uint256 expireTime;

        BurnRequest[] burnRequests;
        MintRequest[] mintRequests;
        BurnSettleRequest[] burnSettleRequests;
        TransferRequest[] transferRequests;
    }


interface IDvpEscrow {
    function scheduleTransfer(ScheduleRequest memory request) external returns (bool);
    function scheduleBurn(ScheduleRequest memory request) external returns (bool);
    function scheduleMint(ScheduleRequest memory request) external returns (bool);


    function scheduleTransfer1155(ScheduleRequest memory request) external returns (bool);
    function scheduleBurn1155(ScheduleRequest memory request) external returns (bool);
    function scheduleMint1155(ScheduleRequest memory request) external returns (bool);

    function scheduleBurnMintAndGenerate(ScheduleRequest2 memory request) external returns(bool);
}

