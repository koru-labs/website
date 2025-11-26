module.exports = {
    "ADDRESSES":
        {
            // Hamsa L2 event implementation contract address (leave empty to deploy a new one)
            "HAMSAL2EVENT_IMPLEMENTATION": "0x13aE71DFF52636718A43F4421ECEC7e74b8e7a76",
            // Hamsa L2 event proxy address on target network
            "HAMSAL2EVENT_PROXY": "0x1DA57249f0bAbdD524f1B62CD7edc064212609B8",
            // Optional alternate implementation for A/B rollout
            "HAMSAL2EVENT_IMPLEMENTATION_B": "",
            // Percentage of traffic delegated to implementation B (0 - 100)
            "HAMSAL2EVENT_PERCENTAGE_TO_B": 0,
            // L1 verification contract address
            "L1_VERIFY_ADDRESS": "0x351B73EC619637bb2CdA2774B4ef8ea11ABd16fa",
            // L1 blob commitment verification contract address
            "L1_BLOB_COMMITMENT_VERIFY": "0x0F17F5D753A37a13CbE34b7978aD7f9249C32D88",
            // Institution registration contract address
            "INSTITUTION_REGISTRATION": "0x2F29924c9F072a7EA43fFf40Cadb2F31613d64d7",
            // Proxy contract address for institution user operations
            "PROXY_ADDRESS": "0x57526682408129D461413FfdC828e08B165e9af7"
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
            streetAddress: "123 Market St",
            suiteNo: "Suite 400",
            city: "San Francisco",
            state: "CA",
            zip: "94107",
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
                {
                    address: "0xe46fe251dd1d9ffc247bc0ddb6d61e4ee4416ecb",
                    role: "minter",
                    first_name: "Node3",
                    last_name: "Minter",
                    phone_number: "(666) 234-4567",
                    email: "node3.minter@example.com",
                },// Node3 minter user account address
                {
                    address: "0xf0b6C36D47f82Fc13eFEE4CC8223Dc19E6c0D766",
                    role: "normal",
                    first_name: "Node3",
                    last_name: "Normal",
                    phone_number: "(666) 234-4567",
                    email: "node3.normal1@example.com",
                },// Node3 normal user account address
                {
                    address: "0x8c8af239FfB9A6e93AC4b434C71a135572A1021C",
                    role: "normal",
                    first_name: "Node3",
                    last_name: "Normal",
                    phone_number: "(666) 234-4567",
                    email: "node3.normal2@example.com",
                },// Node3 normal user account address
                {
                    address: "0x4312488937D47A007De24d48aB82940C809EEb2b",
                    role: "normal",
                    first_name: "Node3",
                    last_name: "Normal",
                    phone_number: "(666) 234-4567",
                    email: "node3.normal3@example.com",
                },// Node3 normal user account address
                {
                    address: "0x57829d5E80730D06B1364A2b05342F44bFB70E8f",
                    role: "normal",
                    first_name: "Node3",
                    last_name: "Normal",
                    phone_number: "(666) 234-4567",
                    email: "node3.normal4@example.com",
                },// Node3 normal user account address
                {
                    address: "0xF50F25915126d936C64A194b2C1DAa1EA45392c4",
                    role: "minter",
                    first_name: "Node3",
                    last_name: "Minter",
                    phone_number: "(666) 234-4567",
                    email: "node3.minter2@example.com",
                },// Node3 minter user account address
                {
                    address: "0x4568E35F2c4590Bde059be615015AaB6cc873004",
                    role: "minter",
                    first_name: "Node3",
                    last_name: "Minter",
                    phone_number: "(666) 234-4567",
                    email: "node3.minter3@example.com",
                },// Node3 minter user account address
                {
                    address: "0x983b4bA7e42E664dDBfe4ed3E0Ea07D90EFCc13B",
                    role: "minter",
                    first_name: "Node3",
                    last_name: "Minter",
                    phone_number: "(666) 234-4567",
                    email: "node3.minter4@example.com",
                },// Node3 minter user account address
                {
                    address: "0x46946c52eb91cd2c8ed347b0a7758d9b22cee383",
                    role: "normal",
                    first_name: "Node3",
                    last_name: "Normal",
                    phone_number: "(666) 234-4567",
                    email: "node3.normal5@example.com",
                },// Node3 normal user account address
            ]
        },
        {
            // Ethereum address for Node4 institution on L2 network
            address: "0x93d2Ce0461C2612F847e074434d9951c32e44327",
            // Private key for Node4 institution on L2 network
            ethPrivateKey: "81690fb141b4ae5682ad1fd73b29ae1bcc67891e93de73c6f636402deac21171",
            // Institution name identifier
            name: "Node4",
            streetAddress: "123 Market St",
            suiteNo: "Suite 400",
            city: "San Francisco",
            state: "CA",
            zip: "94107",
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
                {
                    address: "0xbA268f776F70caDB087e73020dfE41c7298363Ed",
                    role: "minter",
                    first_name: "Node4",
                    last_name: "Minter",
                    phone_number: "(666) 234-4567",
                    email: "node4.minter@example.com",
                },// Node4 minter user account address
            ]
        },
        {
            // Ethereum address for Node3 institution on L2 network
            address: "0x73494abc9681D133d7Fb4241f1760B314205994c",
            // Private key for Node3 institution on L2 network
            ethPrivateKey: "59b08ece967520c64b642fcdc5d2a9aa82b55474f1c1f03419d504d96c8221e5",
            // Institution name identifier
            name: "demo_bank",
            streetAddress: "123 Market St",
            suiteNo: "Suite 400",
            city: "San Francisco",
            state: "CA",
            zip: "94107",
            // Access address of the newly deployed node; update according to your actual deployment.
            rpcUrl: "demo-node3-rpc.hamsa-ucl.com:50051",// node rpc url, if needed to replace the external gRPC service, please update this value
            // HTTPS proxy endpoint for Node3
            nodeUrl: "https://demo-node3-proxy.hamsa-ucl.com:8443",
            // HTTP endpoint for Node3 services
            httpUrl: "http://demo-node3-http.hamsa-ucl.com:8080",// curve public key coordinates for Node4 institution on L2 network
            // Generate ElGamal key pair using the L2NodeKeyGen tool, then replace the placeholder publicKey and privateKey with the generated values.
            publicKey: {
                x: "11257825812231698187313853746328416655159338794577562839602577286185930542457",
                y: "2875382375793102349705196160931603328412588408892071657613985125195044230032",
            },
            privateKey: "1994615739482146458699760580478287864526144865878289253343117160425639577643",
        }
    ]
}