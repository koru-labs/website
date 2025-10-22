module.exports = {
    "ADDRESSES":
        {
            // Hamsa L2 event implementation contract address (leave empty to deploy a new one)
            "HAMSAL2EVENT_IMPLEMENTATION": "0x9e619efAaAaF6C31f05C9a035C6C29995a78DF1b",
            // Hamsa L2 event proxy address on target network
            "HAMSAL2EVENT_PROXY": "0x39bCD17C21157108496829ac3eb974de113efAf9",
            // Optional alternate implementation for A/B rollout
            "HAMSAL2EVENT_IMPLEMENTATION_B": "",
            // Percentage of traffic delegated to implementation B (0 - 100)
            "HAMSAL2EVENT_PERCENTAGE_TO_B": 0,
            // L1 verification contract address
            "L1_VERIFY_ADDRESS": "0x351B73EC619637bb2CdA2774B4ef8ea11ABd16fa",
            // L1 blob commitment verification contract address
            "L1_BLOB_COMMITMENT_VERIFY": "0x0F17F5D753A37a13CbE34b7978aD7f9249C32D88",
            // Institution registration contract address
            "INSTITUTION_REGISTRATION": "0x24bb8a25F8977f9Cc9A16D1da5b3Ff209Fa14F90",
            // Proxy contract address for institution user operations
            "PROXY_ADDRESS": "0x2ec9F3580993888C7529980E9c6E3041D62F021b"
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
            rpcUrl: "prod-node3-rpc.hamsa-ucl.com:50051",
            // HTTPS proxy endpoint for Node3
            nodeUrl: "https://prod-node3-proxy.hamsa-ucl.com:8443",
            // HTTP endpoint for Node3 services
            httpUrl: "http://prod-node3-http.hamsa-ucl.com:8080",
            // curve public key coordinates for Node3 institution on L2 network
            publicKey: {
                x: "14867489045451479287215256054831019265497990299815167173241037631264676460349",
                y: "9519187890267549073736999464396081731503319602421352094119155053337094535674",
            },
            // Elliptic curve integer private key for Node3 institution on L2 network
            privateKey: "2607683766450702001126943055270332377994929386369594371567962723856157825017",
            // User accounts associated with Node3 institution on L2 network
            users: [
                {address: "0xe46fe251dd1d9ffc247bc0ddb6d61e4ee4416ecb", role:"minter"},// Node3 minter user account address
                {address: "0xf0b6C36D47f82Fc13eFEE4CC8223Dc19E6c0D766", role:"normal"},// Node3 normal user account address
                {address: "0x8c8af239FfB9A6e93AC4b434C71a135572A1021C", role:"normal"},// Node3 normal user account address
                {address: "0x4312488937D47A007De24d48aB82940C809EEb2b", role:"normal"},// Node3 normal user account address
                {address: "0x57829d5E80730D06B1364A2b05342F44bFB70E8f", role:"normal"},// Node3 normal user account address
                {address: "0xF50F25915126d936C64A194b2C1DAa1EA45392c4", role:"minter"},// Node3 minter user account address
                {address: "0x4568E35F2c4590Bde059be615015AaB6cc873004", role:"minter"},// Node3 minter user account address
                {address: "0x983b4bA7e42E664dDBfe4ed3E0Ea07D90EFCc13B", role:"minter"},// Node3 minter user account address
                {address: "0x46946c52eb91cd2c8ed347b0a7758d9b22cee383", role:"normal"}// Node3 normal user account address
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
            rpcUrl: "prod-node4-rpc.hamsa-ucl.com:50051",
            // HTTPS proxy endpoint for Node4
            nodeUrl: "https://prod-node4-proxy.hamsa-ucl.com:8443",
            // HTTP endpoint for Node4 services
            httpUrl: "http://prod-node4-http.hamsa-ucl.com:8080",
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
        },
        {
            // Ethereum address for Node4 institution on L2 network
            address: "0x9105Ee9ec3549d21E14eddf37aa53f238F8bB688",
            // Private key for Node4 institution on L2 network
            ethPrivateKey: "5c231ce8344bac49d30d2c13db074ee7757c574caabfcb8349074b5486c08c7e",
            // Institution name identifier
            name: "demo_bank",
            // gRPC endpoint for Node4 RPC services
            rpcUrl: "ucl-nodeBank-rpc.hamsa-ucl.com:50051",// node rpc url, if needed to replace the external gRPC service, please update this value
            nodeUrl: "https://ucl-nodeBank-proxy.hamsa-ucl.com:8443",// node https url, if needed to replace the external http service, please update this value
            httpUrl: "http://ucl-nodeBank-http.hamsa-ucl.com:8080",// node http url, if needed to replace the external http service, please update this value
            // curve public key coordinates for Node4 institution on L2 network
            publicKey: {
                x: "1263079846181183589047881614918361220592349036643657901406926813309141071585",
                y: "9661166093242693427727959277256175027969009219246273472658449304422322754056",
            },
            // Elliptic curve integer private key for Node4 institution on L2 network
            privateKey: "1548713920852155049326738319927133338721390086502056721554918014934348349354",
            // User accounts associated with Node4 institution on L2 network
            users: [
                {
                    "address": "0xD486bd3B1Bb9d1980C5b624b5491325bF9628B43",
                    "privateKey": "e0baa6238c61addf4e4b05ea2c8ad50565a38ca0589505228b35806a33df5d5b",
                    "role": "normal"
                },
                {
                    "address": "0x93d2Ce0461C2612F847e074434d9951c32e44327",
                    "privateKey": "81690fb141b4ae5682ad1fd73b29ae1bcc67891e93de73c6f636402deac21171",
                    "role": "normal"
                },
                {
                    "address": "0x5a3288A7400B2cd5e0568728E8216D9392094892",
                    "privateKey": "360b3f569579a0e824fab18c21d6e583b060e2339142c6833c899029fc8e428d",
                    "role": "normal"
                }
            ]
        }
    ]
}