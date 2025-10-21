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
            address: "0xDE65AD4328eD9702967596f851A74F27120Ed280",
            // Private key for Node3 institution on L2 network
            ethPrivateKey: "8e13e4d4470867d808b5eabad5c39207262dedcd600c15adf20307ff4b0c2720",
            // Institution name identifier
            name: "Node3",
            // gRPC endpoint for Node3 RPC services
            rpcUrl: "demo-node3-rpc.hamsa-ucl.com:50051",
            // HTTPS proxy endpoint for Node3
            nodeUrl: "https://demo-node3-proxy.hamsa-ucl.com:8443",
            // HTTP endpoint for Node3 services
            httpUrl: "http://demo-node3-http.hamsa-ucl.com:8080",
            // curve public key coordinates for Node3 institution on L2 network
            publicKey: {
                x: "8961266057079077123319470703248735072115827785433220893254626692900397982739",
                y: "5396183500247196396405767290333635828886468882623979993202523836471479877350",
            },
            // Elliptic curve integer private key for Node3 institution on L2 network
            privateKey: "977361285194729869577973464040298253676221475078960155654572268707790766409",
            // User accounts associated with Node3 institution on L2 network
            users: [
                {address: "0xf03b090da2BCD2BDEF187a9b02b09a040A58b210", role: "minter"}
            ]
        }
    ]
}