module.exports = {
    // Contract addresses configuration
    "ADDRESSES": {
        // Hamsa L2 event contract address on QA network
        "HAMSAL2EVENT": "0x1834237e16647f970A9D546a143002Bc76BB707C",
        // L1 verification contract address
        "L1_VERIFY_ADDRESS": "0x5B8B2cf32A63e3974e61A7c4D06BA2F4F5eb383F",
        // L1 blob commitment verification contract address
        "L1_BLOB_COMMITMENT_VERIFY": "0xB802f0099285447E0C4c945c808fEC53dF6dB800",
        // Institution registration contract address
        "INSTITUTION_REGISTRATION": "0x0B6fD31F5D644E8aD9Fd4629f2D25Bf810fBDcEf",
        // Proxy contract address for institution user operations
        "PROXY_ADDRESS": "0xF3B8Ee2b8273A62f697CA730d8aBAb120E6C70cc"
    },
    // Institution configurations
    institutions: [
        {
            // Ethereum address for Node3 institution on L2 network
            address: "0xf17f52151EbEF6C7334FAD080c5704D77216b732",
            // Private key for Node3 institution on L2 network
            ethPrivateKey: "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f",
            // Institution name identifier
            name: "Node3",
            // gRPC endpoint for Node3 RPC services
            rpcUrl: "qa-node3-rpc.hamsa-ucl.com:50051",
            // HTTPS proxy endpoint for Node3
            nodeUrl: "https://qa-node3-proxy.hamsa-ucl.com:8443",
            // HTTP endpoint for Node3 services
            httpUrl: "http://qa-node3-http.hamsa-ucl.com:8080",
            // curve public key coordinates for Node3 institution on L2 network
            publicKey: {
                x: "14867489045451479287215256054831019265497990299815167173241037631264676460349",
                y: "9519187890267549073736999464396081731503319602421352094119155053337094535674",
            },
            // Elliptic curve integer private key for Node3 institution on L2 network
            privateKey: "2607683766450702001126943055270332377994929386369594371567962723856157825017",
            // User accounts associated with Node3 institution on L2 network
            users: [
                {address: "0xe46fe251dd1d9ffc247bc0ddb6d61e4ee4416ecb", role:"minter"},// Node4 minter user account address
                {address: "0xf17f52151EbEF6C7334FAD080c5704D77216b732", role:"admin"},// Node4 admin user account address
                {address: "0xf0b6C36D47f82Fc13eFEE4CC8223Dc19E6c0D766", role:"normal"},// Node4 normal user account address
                {address: "0x8c8af239FfB9A6e93AC4b434C71a135572A1021C", role:"normal"},// Node4 normal user account address
                {address: "0x4312488937D47A007De24d48aB82940C809EEb2b", role:"normal"},// Node4 normal user account address
                {address: "0x57829d5E80730D06B1364A2b05342F44bFB70E8f", role:"normal"},// Node4 normal user account address
                {address: "0xF50F25915126d936C64A194b2C1DAa1EA45392c4", role:"minter"},// Node4 minter user account address
                {address: "0x4568E35F2c4590Bde059be615015AaB6cc873004", role:"minter"},// Node4 minter user account address
                {address: "0x983b4bA7e42E664dDBfe4ed3E0Ea07D90EFCc13B", role:"minter"},// Node4 minter user account address
                {address: "0x46946c52eb91cd2c8ed347b0a7758d9b22cee383", role:"normal"}// Node4 normal user account address
            ]
        },
        {
            // Ethereum address for Node4 institution on L2 network
            address: "0x93d2Ce0461C2612F847e074434d9951c32e44327",
            // Private key for Node4 institution on L2 network
            ethPrivateKey: "81690fb141b4ae5682ad1fd73b29ae1bcc67891e93de73c6f636402deac21171",
            // Institution name identifier
            name: "Node4",
            // gRPC endpoint for Node4 RPC services
            rpcUrl: "qa-node4-rpc.hamsa-ucl.com:50051",
            // HTTPS proxy endpoint for Node4
            nodeUrl: "https://qa-node4-proxy.hamsa-ucl.com:8443",
            // HTTP endpoint for Node4 services
            httpUrl: "http://qa-node4-http.hamsa-ucl.com:8080",
            // curve public key coordinates for Node4 institution on L2 network
            publicKey: {
                x: "8574390421936722920607030428754779428069226223915541137170517779677810934009",
                y: "3128266901887868401076427103054188770721597970324357252676559377941490258192",
            },
            // Elliptic curve integer private key for Node4 institution on L2 network
            privateKey: "1225488842017272744135636207705567620992992264873252888631714276279179716352",
            // User accounts associated with Node4 institution on L2 network
            users: [
                {address: "0xbA268f776F70caDB087e73020dfE41c7298363Ed", role: "minter"}, // Node4 minter user account address
            ]
        }
    ]
}