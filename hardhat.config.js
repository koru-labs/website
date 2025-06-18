require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: '0.8.25',
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
                details: {
                    yulDetails: {
                        optimizerSteps: 'u',
                    },
                },
            },
            viaIR: true,
        },
    },
    mocha: {
        reporter: 'mocha-multi-reporters',
        reporterOptions: {
            configFile: 'mocha-report-config.json'
        }
    },
    ignition: {
        requiredConfirmations: 1,
    },
    allowUnlimitedContractSize: true,
    networks: {

        serverBesu: {
            url: 'http://18.144.171.202:8545',
            accounts: [
                "8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63",//0xfe3b557e8fb62b89f4916b721be55ceb828dbd73
                "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3",//0x627306090abaB3A6e1400e9345bC60c78a8BEf57
                "35c285cae6a13a0e13ef7db25776e60b02745922da3b39513b94114c2c5d9add",//0xf17f52151EbEF6C7334FAD080c5704D77216b732
            ]
        },

        ucl_L2: {
            // url: "http://54.219.188.82:8545", //gpu,ucl-node2,v2
            url: "http://sb-ucl-l2.hamsa-ucl.com:8545", //k8s,ucl-node2,v2
            accounts: [
                "555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787", // owner 0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB
                "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f", //masterMint 0xf17f52151EbEF6C7334FAD080c5704D77216b732 //// node3 manager address (circle manager, master minter, blackList)
                "32ef95df4ea8de4f6b5518106e97dbb3e5b97cdbb4a33adfeaa9f14e729f51eb", //from 0xfAdb253d9AD9b2d6D37471fA80F398f76D8347B8
                "8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63",//approve 0xfe3b557e8fb62b89f4916b721be55ceb828dbd73
                "35c285cae6a13a0e13ef7db25776e60b02745922da3b39513b94114c2c5d9add", //to 57829d5E80730D06B1364A2b05342F44bFB70E8f
                "e047c057b8b11153322c91f2d5474b73d691fa4351d053148582f07462ad1ae1", //b3C711A69B3DeAC4441904932Ca98E09e9068284
                "a8ee6be3949318b57fbdfefdc86cd3a9033b8946789cb33db209e0c623c45cb5", //8c8af239FfB9A6e93AC4b434C71a135572A1021C
                "2b42ed39b2d9c3d576320af626b90a62ce726ee0f25764061947891415dbe782", //4312488937D47A007De24d48aB82940C809EEb2b

                "f951e1bd9ef0359e6886ae77e5fd30d566ef098d099c78fd3fb68588657618cc", //0x2c44c4B96AE5f9c9dbf32cF3AA743Cd0277F3127  // node1 manager address
                "d9597e2d88463e47d1b6c2431879f06d440a6ff980a51a1f8c830623b112f329", //0x03d68e57f1f9939d3FDcf97B5e7a1d0Be995Ec67  // node2 manager address
                "81690fb141b4ae5682ad1fd73b29ae1bcc67891e93de73c6f636402deac21171", //0x93d2Ce0461C2612F847e074434d9951c32e44327  // node4 manager address
                "360b3f569579a0e824fab18c21d6e583b060e2339142c6833c899029fc8e428d", //5a3288A7400B2cd5e0568728E8216D9392094892    // node 1 user
                "1bf1fbfb91c484e78cb8adb55ff3fee99825b49af57ba0eb0b79f82b3ffb563f", //F8041E1185C7106121952bA9914ff904A4A01c80    // node 2 user
                "f083c679bb978f6e2eb8611de27319b2e3a329d307eb5fd1d532a1cd6b63fff9", //bA268f776F70caDB087e73020dfE41c7298363Ed    // node 4 user
                "518eb784dd768d8c0cdf9218d44ae8f498d0cadf7ecf98f5ecf27c6b793986ca", //4568E35F2c4590Bde059be615015AaB6cc873004
                "5ce8c4aea462de54d0a8ecbfe5cc8c8ac18926979c66a66e5a463ba8506401c0", //fE5acd71116FB8a03510FF171222F01164609c97，admin,do not use business processes
            ],
        },
        ucl_node3: {
            url: "qa-node3-rpc.hamsa-ucl.com:50051", //node3 url
            accounts: [
                "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3", //
            ],
        },
        ucl_node4: {
            url: "qa-node4-rpc.hamsa-ucl.com:50051", //node4 url
            accounts: [
                "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3", //
            ],
        },
    },

};
