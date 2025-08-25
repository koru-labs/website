module.exports = {
    "ADDRESSES":
        {
            "TOKEN_EVENT_LIB": "",
            "HAMSAL2EVENT": "0xB8401e69928E19Aae8B8d2a9446e81135E0f4B7A",
            "L1_HANDLE": "0x3286338a3271d41353B4B4cC4D353913B2FD094b",
            "L1_BLOB_COMMITMENT_VERIFY": "0x89a37F5cd42162B56DE8A48bDe38A6E97C965675",
            "INSTITUTION_REGISTRATION": "0x62f347D0060092954b6B5A37D79C9887e4250896",
            "PROXY_ADDRESS": "0xaA4eB20a565E624a80C7566ef1872aDF27dc507c"
        },
    institutions: [
        // {
        //     address: "0x2c44c4B96AE5f9c9dbf32cF3AA743Cd0277F3127",
        //     ethPrivateKey: "f951e1bd9ef0359e6886ae77e5fd30d566ef098d099c78fd3fb68588657618cc",
        //     name: "Node1",
        //     rpcUrl: "qa-node1-rpc.hamsa-ucl.com:50051",
        //     nodeUrl: "https://qa-node1-proxy.hamsa-ucl.com:8443",
        //     httpUrl: "http://qa-node1-http.hamsa-ucl.com:8080",
        //     publicKey: {
        //         x: "8870958234945531012140077554967107612834978073622531518187994135599594024004",
        //         y: "1602896076095556872064323498591590133311615038843128356451925530793022734414",
        //     },
        //     privateKey: "416573880578171335403689549793041749905608668623681787361470319903201766514",
        //     users: [
        //         {address: "0x5a3288A7400B2cd5e0568728E8216D9392094892", role:"normal"}
        //     ]
        // },
        // {
        //     address: "0x03d68e57f1f9939d3FDcf97B5e7a1d0Be995Ec67",
        //     ethPrivateKey: "d9597e2d88463e47d1b6c2431879f06d440a6ff980a51a1f8c830623b112f329",
        //     name: "Node2",
        //     rpcUrl: "qa-node2-rpc.hamsa-ucl.com:50051",
        //     nodeUrl: "https://qa-node2-proxy.hamsa-ucl.com:8443",
        //     httpUrl: "http://qa-node2-http.hamsa-ucl.com:8080",
        //     publicKey: {
        //         x: "5820367833026910549315409246395472618478921328059164198985819674997868240519",
        //         y: "16447690327536854731829234134374272913253014843200385847735869511531503932278",
        //     },
        //     privateKey: "2168409685083436357554395152062201983676872832460334205932174282094784521144",
        //     users: [
        //         {address: "0xF8041E1185C7106121952bA9914ff904A4A01c80", role:"normal"}
        //     ]
        // },
        {
            address: "0xf17f52151EbEF6C7334FAD080c5704D77216b732",
            ethPrivateKey: "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f",
            name: "Node3",
            rpcUrl: "qa-node3-rpc.hamsa-ucl.com:50051",
            nodeUrl: "https://qa-node3-proxy.hamsa-ucl.com:8443",
            httpUrl: "http://qa-node3-http.hamsa-ucl.com:8080",
            publicKey: {
                x: "14867489045451479287215256054831019265497990299815167173241037631264676460349",
                y: "9519187890267549073736999464396081731503319602421352094119155053337094535674",
            },
            privateKey: "2607683766450702001126943055270332377994929386369594371567962723856157825017",
            users: [
                {address: "0xe46fe251dd1d9ffc247bc0ddb6d61e4ee4416ecb", role:"minter"},
                {address: "0xf17f52151EbEF6C7334FAD080c5704D77216b732", role:"admin,minter"},
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
            rpcUrl: "qa-node4-rpc.hamsa-ucl.com:50051",
            nodeUrl: "https://qa-node4-proxy.hamsa-ucl.com:8443",
            httpUrl: "http://qa-node4-http.hamsa-ucl.com:8080",
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