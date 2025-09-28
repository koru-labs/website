module.exports = {
    "ADDRESSES":
        {
            "TOKEN_EVENT_LIB": "",
            "HAMSAL2EVENT": "0x803a5E06dE333B2Ad7C7F3C4bE71CDC9d7c341a8",
            "L1_VERIFY_ADDRESS": "0xb4B46bdAA835F8E4b4d8e208B6559cD267851051",
            "L1_BLOB_COMMITMENT_VERIFY": "0x8535783fFb4dADB97FCE36471289EacA644cbD6D",
            "INSTITUTION_REGISTRATION": "0x224DC2b4973A43b2ed6a8180f97EF85D559614f9",
            "PROXY_ADDRESS": "0x28e48d8Dc5e2b88d23477E3383a8FB1731D16A8a"
        },
    institutions: [
        {
            address: "0xf17f52151EbEF6C7334FAD080c5704D77216b732",
            ethPrivateKey: "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f",
            name: "Node3",
            rpcUrl: "dev-node3-rpc.hamsa-ucl.com:50051",
            nodeUrl: "https://dev-node3-proxy.hamsa-ucl.com:8443",
            httpUrl: "http://dev-node3-http.hamsa-ucl.com:8080",
            publicKey: {
                x: "14867489045451479287215256054831019265497990299815167173241037631264676460349",
                y: "9519187890267549073736999464396081731503319602421352094119155053337094535674",
            },
            privateKey: "2607683766450702001126943055270332377994929386369594371567962723856157825017",
            users: [
                {address: "0xe46fe251dd1d9ffc247bc0ddb6d61e4ee4416ecb", role:"minter"},
                {address: "0xf17f52151EbEF6C7334FAD080c5704D77216b732", role:"admin"},
                {address: "0xf0b6C36D47f82Fc13eFEE4CC8223Dc19E6c0D766", role:"normal"},
                {address: "0x8c8af239FfB9A6e93AC4b434C71a135572A1021C", role:"normal"},
                {address: "0x4312488937D47A007De24d48aB82940C809EEb2b", role:"normal"},
                {address: "0x57829d5E80730D06B1364A2b05342F44bFB70E8f", role:"normal"},
                {address: "0xF50F25915126d936C64A194b2C1DAa1EA45392c4", role:"minter"},
                {address: "0x4568E35F2c4590Bde059be615015AaB6cc873004", role:"minter"},
                {address: "0x983b4bA7e42E664dDBfe4ed3E0Ea07D90EFCc13B", role:"minter"},
                {address: "0x46946c52eb91cd2c8ed347b0a7758d9b22cee383", role:"normal"}  //this is account in wlin meta-mask
            ]
        },
        {
            address: "0x93d2Ce0461C2612F847e074434d9951c32e44327",
            ethPrivateKey: "81690fb141b4ae5682ad1fd73b29ae1bcc67891e93de73c6f636402deac21171",
            name: "Node4",
            rpcUrl: "dev-node4-rpc.hamsa-ucl.com:50051",
            nodeUrl: "https://dev-node4-proxy.hamsa-ucl.com:8443",
            httpUrl: "http://dev-node4-http.hamsa-ucl.com:8080",
            publicKey: {
                x: "8574390421936722920607030428754779428069226223915541137170517779677810934009",
                y: "3128266901887868401076427103054188770721597970324357252676559377941490258192",
            },
            privateKey: "1225488842017272744135636207705567620992992264873252888631714276279179716352",
            users: [
                {address: "0xbA268f776F70caDB087e73020dfE41c7298363Ed", role: "minter"},
            ]
        }
    ]
}