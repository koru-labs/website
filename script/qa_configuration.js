module.exports = {
    "ADDRESSES":
        {
            // Hamsa L2 event implementation contract address (leave empty to deploy a new one)
            "HAMSAL2EVENT_IMPLEMENTATION": "0xd1078b39AB002806ACC19fD2E25d2179cF13b242",
            // Hamsa L2 event proxy address on target network
            "HAMSAL2EVENT_PROXY": "0x33739D11412101cF029987cBCefC298293230D65",
            // Optional alternate implementation for A/B rollout
            "HAMSAL2EVENT_IMPLEMENTATION_B": "",
            // Percentage of traffic delegated to implementation B (0 - 100)
            "HAMSAL2EVENT_PERCENTAGE_TO_B": 0,
            // L1 verification contract address
            "L1_VERIFY_ADDRESS": "0xb4B46bdAA835F8E4b4d8e208B6559cD267851051",
            // L1 blob commitment verification contract address
            "L1_BLOB_COMMITMENT_VERIFY": "0x8535783fFb4dADB97FCE36471289EacA644cbD6D",
            // Institution registration contract address
            "INSTITUTION_REGISTRATION": "0xD1CD4EE986fBbE55A61cb015677fC1Bf0A75FB8b",
            // Proxy contract address for institution user operations
            "PROXY_ADDRESS": "0xdB17395eC234AA0605207e61A55888c5482006D4"
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
                {address: "0xe46fe251dd1d9ffc247bc0ddb6d61e4ee4416ecb", role: "minter"},// Node3 minter user account address
                {address: "0xf0b6C36D47f82Fc13eFEE4CC8223Dc19E6c0D766", role: "normal"},// Node3 normal user account address
                {address: "0x8c8af239FfB9A6e93AC4b434C71a135572A1021C", role: "normal"},// Node3 normal user account address
                {address: "0x4312488937D47A007De24d48aB82940C809EEb2b", role: "normal"},// Node3 normal user account address
                {address: "0x57829d5E80730D06B1364A2b05342F44bFB70E8f", role: "normal"},// Node3 normal user account address
                {address: "0xF50F25915126d936C64A194b2C1DAa1EA45392c4", role: "minter"},// Node3 minter user account address
                {address: "0x4568E35F2c4590Bde059be615015AaB6cc873004", role: "minter"},// Node3 minter user account address
                {address: "0x983b4bA7e42E664dDBfe4ed3E0Ea07D90EFCc13B", role: "minter"},// Node3 minter user account address
                {address: "0x46946c52eb91cd2c8ed347b0a7758d9b22cee383", role: "normal"}// Node3 normal user account address
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
        ,
        {
            // Ethereum address for demo institution on L2 network
            address: "0xbE1C966E5D7250610AA2725cE286ECC3e1617070",
            // Private key for demo institution on L2 network
            ethPrivateKey: "e7890d94662aa12a6f6079595e4fc9ebf161eca609a48154c49e2c6030c5cd9b",
            // Institution name identifier
            name: "demo_bank",
            streetAddress: "123 Market St",
            suiteNo: "Suite 400",
            city: "San Francisco",
            state: "CA",
            zip: "94107",
            // gRPC endpoint for Node3 RPC services
            rpcUrl: "demo-node3-rpc.hamsa-ucl.com:50051",
            // HTTPS proxy endpoint for Node3
            nodeUrl: "https://demo-node3-proxy.hamsa-ucl.com:8443",
            // HTTP endpoint for Node3 services
            httpUrl: "http://demo-node3-http.hamsa-ucl.com:8080",// curve public key coordinates for Node4 institution on L2 network
            publicKey: {
                x: "1065104639605578406571142978208666127086022795323606631858996834770305910120",
                y: "20307667678556747341624423268708230461812237974991336745572481331911333635246",
            },
            // Elliptic curve integer private key for Node4 institution on L2 network
            privateKey: "2312760227391842286208215149331263073895356067007141634667233984892059663704",
            // User accounts associated with Node4 institution on L2 network
            users: [
                {
                    "address": "0xC2BE674C4C5fD6b2BE89218A059FeA6a0CE1F88f",
                    "privateKey": "9ce3dd1d1ad467bd95216b2de2b10a5c89dbca9192a661116ec60d4e2483ba74",
                    "role": "normal"
                },
                {
                    "address": "0xBaF3913ae798CfA107Af80312B6dfBEa5B9871a1",
                    "privateKey": "9bf603f8f1ab8ad535279242ff875d8a248a67b751149a730198b5aa95c2d33c",
                    "role": "normal"
                }
            ]
        }
    ]
}