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
    ignition: {
        requiredConfirmations: 1,
    },
    allowUnlimitedContractSize: true,
    networks: {
        ganache: {
            url: 'http://127.0.0.1:7545',
            accounts: [
                "0x69f02a1055e74c611b6fdfb9f4f3d195ea0d694b2e9c0c25c17dd3bddff7c037"
            ],
            networkId: 5777
        },
        hamsaBesu: {
            url: 'https://test-hyperledger.hamsa.com/rpc/',
            accounts: [
                "8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63"
            ]
        },
        localBesu: {
            url: 'http://127.0.0.1:8545',
            // url: 'http://18.144.171.202:10002',// pylongdev
            // url: 'http://18.231.120.223:8545',//nginx
            // url: 'http://56.124.66.221:8545',//node1
            // url: 'http://18.228.219.164:8545',//node2
            // url: 'http://54.207.63.106:8545',//node3
            // url: 'http://18.228.119.106:8545',//node4
            // accounts: [
            //     "8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63",//0xfe3b557e8fb62b89f4916b721be55ceb828dbd73
            //     "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3",//0x627306090abaB3A6e1400e9345bC60c78a8BEf57
            //     "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f",//0xf17f52151EbEF6C7334FAD080c5704D77216b732
            // ]
            accounts: [
                "32ef95df4ea8de4f6b5518106e97dbb3e5b97cdbb4a33adfeaa9f14e729f51eb", //fAdb253d9AD9b2d6D37471fA80F398f76D8347B8
                "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3", //627306090abaB3A6e1400e9345bC60c78a8BEf57
                "32ef95df4ea8de4f6b5518106e97dbb3e5b97cdbb4a33adfeaa9f14e729f51eb", //fAdb253d9AD9b2d6D37471fA80F398f76D8347B8
                "e047c057b8b11153322c91f2d5474b73d691fa4351d053148582f07462ad1ae1", //b3C711A69B3DeAC4441904932Ca98E09e9068284
                "a8ee6be3949318b57fbdfefdc86cd3a9033b8946789cb33db209e0c623c45cb5", //8c8af239FfB9A6e93AC4b434C71a135572A1021C
                "2b42ed39b2d9c3d576320af626b90a62ce726ee0f25764061947891415dbe782", //4312488937D47A007De24d48aB82940C809EEb2b
                "35c285cae6a13a0e13ef7db25776e60b02745922da3b39513b94114c2c5d9add", //57829d5E80730D06B1364A2b05342F44bFB70E8f
                "f951e1bd9ef0359e6886ae77e5fd30d566ef098d099c78fd3fb68588657618cc", //2c44c4B96AE5f9c9dbf32cF3AA743Cd0277F3127
                "d9597e2d88463e47d1b6c2431879f06d440a6ff980a51a1f8c830623b112f329", //03d68e57f1f9939d3FDcf97B5e7a1d0Be995Ec67
                "81690fb141b4ae5682ad1fd73b29ae1bcc67891e93de73c6f636402deac21171", //93d2Ce0461C2612F847e074434d9951c32e44327
                "360b3f569579a0e824fab18c21d6e583b060e2339142c6833c899029fc8e428d", //5a3288A7400B2cd5e0568728E8216D9392094892
                "1bf1fbfb91c484e78cb8adb55ff3fee99825b49af57ba0eb0b79f82b3ffb563f", //F8041E1185C7106121952bA9914ff904A4A01c80
                "f083c679bb978f6e2eb8611de27319b2e3a329d307eb5fd1d532a1cd6b63fff9", //bA268f776F70caDB087e73020dfE41c7298363Ed
                "518eb784dd768d8c0cdf9218d44ae8f498d0cadf7ecf98f5ecf27c6b793986ca", //4568E35F2c4590Bde059be615015AaB6cc873004
                "5ce8c4aea462de54d0a8ecbfe5cc8c8ac18926979c66a66e5a463ba8506401c0", //fE5acd71116FB8a03510FF171222F01164609c97，admin,do not use business processes
            ],
        },
        localStress: {
            url: 'http://127.0.0.1:8545',
            accounts: [
                "f7a610afa00eac908941fe2c9f8cd57142408d2edf13aed4e4efa52fe7958ab1",
                "d915663750ce1e07105b7a2e111d8c335fdd7c2a4ae89eb28026a906150db7b4",
                "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3",//0x627306090abaB3A6e1400e9345bC60c78a8BEf57
                "f951e1bd9ef0359e6886ae77e5fd30d566ef098d099c78fd3fb68588657618cc",//0xf17f52151EbEF6C7334FAD080c5704D77216b732
            ]
        },
        localL2: {
            url: 'http://127.0.0.1:8123',
            // url: 'http://qa-node2-node.hamsa-ucl.com:8123',
            // url: 'http://hk-node1-node.hamsa-ucl.com:8123',
            // url: "http://18.144.171.202:8545", //external address,dev
            // url: "http://18.144.171.202:8545", //external address,dev
            accounts: [
                "f7a610afa00eac908941fe2c9f8cd57142408d2edf13aed4e4efa52fe7958ab1",
                "0xc5446fda20f0b6ae6c24ababad898faa1251cc524783fabf4d84a673c41b74ef",//0x977954402132612Cc1d144E57e16eaf0E4cbcfcB
                "0x0740d6df0c4fb2cc880f14a72ac7118ede6d0613417ef35a92a73d9344ad0d0b",//0xa1608Fc30958cD232de765b003D4f3A4995049b6
                "0x555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787",//0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB
                "0x6741001f80a9194d8d65f04d8b420940e83babc1a1dea5afa8775c395ed14ae8",//0x9E46a01F1A486095A073BFeB4B3c9e106dfB0e7E
                "0x5f990426b4495f3d4f089ce948dca5365bf00d72b52c4e0f59bfdba1bd4593e0",//0x23eabdd1584Cc04E5962524F48B9c6f4d1Ef98cD
            ]
        },
        server_dev_L1_besu: {
            // url: "http://18.144.171.202:10002", //external address,dev
            url: "http://18.144.171.202:8545", //external address,dev
            // url: 'http://192.168.54.105:8545',//Intranet address,dev
            // gasPrice: 0,
            accounts: [
                "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3", //627306090abaB3A6e1400e9345bC60c78a8BEf57
                "32ef95df4ea8de4f6b5518106e97dbb3e5b97cdbb4a33adfeaa9f14e729f51eb", //fAdb253d9AD9b2d6D37471fA80F398f76D8347B8
                "e047c057b8b11153322c91f2d5474b73d691fa4351d053148582f07462ad1ae1", //b3C711A69B3DeAC4441904932Ca98E09e9068284
                "a8ee6be3949318b57fbdfefdc86cd3a9033b8946789cb33db209e0c623c45cb5", //8c8af239FfB9A6e93AC4b434C71a135572A1021C
                "2b42ed39b2d9c3d576320af626b90a62ce726ee0f25764061947891415dbe782", //4312488937D47A007De24d48aB82940C809EEb2b
                "35c285cae6a13a0e13ef7db25776e60b02745922da3b39513b94114c2c5d9add", //57829d5E80730D06B1364A2b05342F44bFB70E8f
                "f951e1bd9ef0359e6886ae77e5fd30d566ef098d099c78fd3fb68588657618cc", //2c44c4B96AE5f9c9dbf32cF3AA743Cd0277F3127
                "d9597e2d88463e47d1b6c2431879f06d440a6ff980a51a1f8c830623b112f329", //03d68e57f1f9939d3FDcf97B5e7a1d0Be995Ec67
                "81690fb141b4ae5682ad1fd73b29ae1bcc67891e93de73c6f636402deac21171", //93d2Ce0461C2612F847e074434d9951c32e44327
                "360b3f569579a0e824fab18c21d6e583b060e2339142c6833c899029fc8e428d", //5a3288A7400B2cd5e0568728E8216D9392094892
                "1bf1fbfb91c484e78cb8adb55ff3fee99825b49af57ba0eb0b79f82b3ffb563f", //F8041E1185C7106121952bA9914ff904A4A01c80
                "f083c679bb978f6e2eb8611de27319b2e3a329d307eb5fd1d532a1cd6b63fff9", //bA268f776F70caDB087e73020dfE41c7298363Ed
                "518eb784dd768d8c0cdf9218d44ae8f498d0cadf7ecf98f5ecf27c6b793986ca", //4568E35F2c4590Bde059be615015AaB6cc873004
                "5ce8c4aea462de54d0a8ecbfe5cc8c8ac18926979c66a66e5a463ba8506401c0", //fE5acd71116FB8a03510FF171222F01164609c97，admin,do not use business processes
            ],
        },
        server_aws_L1_besu: {
            url: 'http://localhost:8545',
            // url: 'http://54.219.188.82:8545',  //gpu
            // url: "http://54.193.75.6:8545", //external address,qa
            // gasPrice: 0,
            accounts: [
                "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3", //
                "32ef95df4ea8de4f6b5518106e97dbb3e5b97cdbb4a33adfeaa9f14e729f51eb", //fAdb253d9AD9b2d6D37471fA80F398f76D8347B8
                "e047c057b8b11153322c91f2d5474b73d691fa4351d053148582f07462ad1ae1", //b3C711A69B3DeAC4441904932Ca98E09e9068284
                "a8ee6be3949318b57fbdfefdc86cd3a9033b8946789cb33db209e0c623c45cb5", //8c8af239FfB9A6e93AC4b434C71a135572A1021C
                "2b42ed39b2d9c3d576320af626b90a62ce726ee0f25764061947891415dbe782", //4312488937D47A007De24d48aB82940C809EEb2b
                "35c285cae6a13a0e13ef7db25776e60b02745922da3b39513b94114c2c5d9add", //57829d5E80730D06B1364A2b05342F44bFB70E8f
                "f951e1bd9ef0359e6886ae77e5fd30d566ef098d099c78fd3fb68588657618cc", //2c44c4B96AE5f9c9dbf32cF3AA743Cd0277F3127
                "d9597e2d88463e47d1b6c2431879f06d440a6ff980a51a1f8c830623b112f329", //03d68e57f1f9939d3FDcf97B5e7a1d0Be995Ec67
                "81690fb141b4ae5682ad1fd73b29ae1bcc67891e93de73c6f636402deac21171", //93d2Ce0461C2612F847e074434d9951c32e44327
                "360b3f569579a0e824fab18c21d6e583b060e2339142c6833c899029fc8e428d", //5a3288A7400B2cd5e0568728E8216D9392094892
                "1bf1fbfb91c484e78cb8adb55ff3fee99825b49af57ba0eb0b79f82b3ffb563f", //F8041E1185C7106121952bA9914ff904A4A01c80
                "f083c679bb978f6e2eb8611de27319b2e3a329d307eb5fd1d532a1cd6b63fff9", //bA268f776F70caDB087e73020dfE41c7298363Ed
                "518eb784dd768d8c0cdf9218d44ae8f498d0cadf7ecf98f5ecf27c6b793986ca", //4568E35F2c4590Bde059be615015AaB6cc873004
                "5ce8c4aea462de54d0a8ecbfe5cc8c8ac18926979c66a66e5a463ba8506401c0", //fE5acd71116FB8a03510FF171222F01164609c97，admin,do not use business processes
            ],
        },
        serverL2: {
            url: 'http://18.179.22.133:8123',
            accounts: [
                "0x5f990426b4495f3d4f089ce948dca5365bf00d72b52c4e0f59bfdba1bd4593e0",
                "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f",
                "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3"
            ]
        },
        serverBesu: {
            url: 'http://18.144.171.202:8545',
            accounts: [
                "8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63",//0xfe3b557e8fb62b89f4916b721be55ceb828dbd73
                "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3",//0x627306090abaB3A6e1400e9345bC60c78a8BEf57
                "35c285cae6a13a0e13ef7db25776e60b02745922da3b39513b94114c2c5d9add",//0xf17f52151EbEF6C7334FAD080c5704D77216b732
            ]
        },
        serverStableBesu: {
            url: 'http://18.228.157.117:8545',
            accounts: [
                "8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63",//0xfe3b557e8fb62b89f4916b721be55ceb828dbd73
                "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3",//0x627306090abaB3A6e1400e9345bC60c78a8BEf57
                "35c285cae6a13a0e13ef7db25776e60b02745922da3b39513b94114c2c5d9add",//0xf17f52151EbEF6C7334FAD080c5704D77216b732
            ]
        },

        qa_aws_L2_1: {
            url: 'http://qa-node1-node.hamsa-ucl.com:8123',
            gasPrice: 1000,
            accounts: [
                "555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787",//0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB
                "6741001f80a9194d8d65f04d8b420940e83babc1a1dea5afa8775c395ed14ae8",//0x9E46a01F1A486095A073BFeB4B3c9e106dfB0e7E
                "7497455fe2896814aeb6e93bd7089b994936b93d50f58188b55ae494f7f20843",//0x68DCDb518402a888085C33A33345B95Ea1a5ac68
                "0740d6df0c4fb2cc880f14a72ac7118ede6d0613417ef35a92a73d9344ad0d0b",//0xa1608Fc30958cD232de765b003D4f3A4995049b6
                "c5446fda20f0b6ae6c24ababad898faa1251cc524783fabf4d84a673c41b74ef",//0x977954402132612Cc1d144E57e16eaf0E4cbcfcB
                "cf50505c2714e54cbe7f0e49a47b595ebcbb87e8cfe4ad3b285d5f0930bbaf11",//0xDeb622aA41057fFf16610651c65315DBFD569B85
                "056c8f4f176e605c2a4487962bb98f3404787cc0dab3430b2fdcc11023c170c3",//0x9AE96DC1196647A260Aa381c4c8697B5cDc8238a
                "8e086ecf667c561e568706fe33ff7c2fe5cd1edcced8c5ec737b5f9298a5585f",//0x34dbe6826DCE09f026E8D78FfD08c440b0bbcbFC
                "888ecf46b06c795e074b49e8905f437c58f203f64a52f1f87c29f0821fb6ca39",//0xFcB5c277d049cCd0f61Cd8C4736eF4F238b4f003
                "cce34f0b0f42396c20048c21763fc5ff8096f57ecf2e6f940079cc75ca25501d",//0x3669af3d2Be494b340189C565275E747a52f2044
                "ae9508cab4c2ba615dc6cf1164f4f61e53ed16c5b44fd3ee18c3dbdf90a264d2",//0xDF079155EE082010B35d209Ce01865eca29BaFbc
                "6388775b2e1059c5050aa48226d05b1a7c8d0b558a3dd31b741302538aec3c3a",//0x3A720cD05Ccca6727131cD7Cc0f1A0EEa016f9E1
            ]
        },
        // server_aws_L2_1: {
        //     url: "http://a1652abc8185f4287baf8c10a6b44ff3-1357830181.us-west-1.elb.amazonaws.com:8123",
        //     gasPrice: 1000,
        //     accounts: [
        //       "555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787", //0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB
        //       "6741001f80a9194d8d65f04d8b420940e83babc1a1dea5afa8775c395ed14ae8", //0x9E46a01F1A486095A073BFeB4B3c9e106dfB0e7E
        //       "7497455fe2896814aeb6e93bd7089b994936b93d50f58188b55ae494f7f20843", //0x68DCDb518402a888085C33A33345B95Ea1a5ac68
        //       "0740d6df0c4fb2cc880f14a72ac7118ede6d0613417ef35a92a73d9344ad0d0b", //0xa1608Fc30958cD232de765b003D4f3A4995049b6
        //       "c5446fda20f0b6ae6c24ababad898faa1251cc524783fabf4d84a673c41b74ef", //0x977954402132612Cc1d144E57e16eaf0E4cbcfcB
        //       "cf50505c2714e54cbe7f0e49a47b595ebcbb87e8cfe4ad3b285d5f0930bbaf11", //0xDeb622aA41057fFf16610651c65315DBFD569B85
        //       "056c8f4f176e605c2a4487962bb98f3404787cc0dab3430b2fdcc11023c170c3", //0x9AE96DC1196647A260Aa381c4c8697B5cDc8238a
        //       "8e086ecf667c561e568706fe33ff7c2fe5cd1edcced8c5ec737b5f9298a5585f", //0x34dbe6826DCE09f026E8D78FfD08c440b0bbcbFC
        //       "888ecf46b06c795e074b49e8905f437c58f203f64a52f1f87c29f0821fb6ca39", //0xFcB5c277d049cCd0f61Cd8C4736eF4F238b4f003
        //       "cce34f0b0f42396c20048c21763fc5ff8096f57ecf2e6f940079cc75ca25501d", //0x3669af3d2Be494b340189C565275E747a52f2044
        //       "ae9508cab4c2ba615dc6cf1164f4f61e53ed16c5b44fd3ee18c3dbdf90a264d2", //0xDF079155EE082010B35d209Ce01865eca29BaFbc
        //       "6388775b2e1059c5050aa48226d05b1a7c8d0b558a3dd31b741302538aec3c3a", //0x3A720cD05Ccca6727131cD7Cc0f1A0EEa016f9E1
        //     ],
        //   },
        //   server_aws_L2_2: {
        //     url: "http://qa-node2-node.hamsa-ucl.com:8123",
        //     gasPrice: 1000,
        //     accounts: [
        //       "555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787", //0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB
        //       "6741001f80a9194d8d65f04d8b420940e83babc1a1dea5afa8775c395ed14ae8", //0x9E46a01F1A486095A073BFeB4B3c9e106dfB0e7E
        //       "7497455fe2896814aeb6e93bd7089b994936b93d50f58188b55ae494f7f20843", //0x68DCDb518402a888085C33A33345B95Ea1a5ac68
        //       "0740d6df0c4fb2cc880f14a72ac7118ede6d0613417ef35a92a73d9344ad0d0b", //0xa1608Fc30958cD232de765b003D4f3A4995049b6
        //       "c5446fda20f0b6ae6c24ababad898faa1251cc524783fabf4d84a673c41b74ef", //0x977954402132612Cc1d144E57e16eaf0E4cbcfcB
        //       "cf50505c2714e54cbe7f0e49a47b595ebcbb87e8cfe4ad3b285d5f0930bbaf11", //0xDeb622aA41057fFf16610651c65315DBFD569B85
        //       "056c8f4f176e605c2a4487962bb98f3404787cc0dab3430b2fdcc11023c170c3", //0x9AE96DC1196647A260Aa381c4c8697B5cDc8238a
        //       "8e086ecf667c561e568706fe33ff7c2fe5cd1edcced8c5ec737b5f9298a5585f", //0x34dbe6826DCE09f026E8D78FfD08c440b0bbcbFC
        //       "888ecf46b06c795e074b49e8905f437c58f203f64a52f1f87c29f0821fb6ca39", //0xFcB5c277d049cCd0f61Cd8C4736eF4F238b4f003
        //       "cce34f0b0f42396c20048c21763fc5ff8096f57ecf2e6f940079cc75ca25501d", //0x3669af3d2Be494b340189C565275E747a52f2044
        //       "ae9508cab4c2ba615dc6cf1164f4f61e53ed16c5b44fd3ee18c3dbdf90a264d2", //0xDF079155EE082010B35d209Ce01865eca29BaFbc
        //       "6388775b2e1059c5050aa48226d05b1a7c8d0b558a3dd31b741302538aec3c3a", //0x3A720cD05Ccca6727131cD7Cc0f1A0EEa016f9E1
        //     ],
        //   },
        server_aws_L2_3: {
            url: "http://qa-node3-node.hamsa-ucl.com:8123",
            gasPrice: 1000,
            accounts: [
                "555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787",// admin
                "4769fa5290a3c59df3f2a8800d97870cec2db5bc1eed04859dde2d57dd82f1e0",// user
                "7497455fe2896814aeb6e93bd7089b994936b93d50f58188b55ae494f7f20843", //0x68DCDb518402a888085C33A33345B95Ea1a5ac68
            ],
        },
        server_aws_L2_4: {
            url: "http://qa-node4-node.hamsa-ucl.com:8123",
            gasPrice: 1000,
            accounts: [
                "555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787",//admin
                "d34b9fb0bb921322f5262a41b5587a4e9e59901ac8ffa940170dc5acd564c322"//user
            ],
          },
          ucl_node2:{
            // url: "http://18.144.171.202:8545", // dev,ucl-node2,v1
            url: "http://54.219.188.82:8545", //gpu,ucl-node2,v2
            accounts: [
                // "35c285cae6a13a0e13ef7db25776e60b02745922da3b39513b94114c2c5d9add",//transfer
                // "8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63",//approve
                "ae6ae8e5ccbfb04590405997ee2d52d2b330726137b875053c36d94e974d162f",//mint 0xf17f52151EbEF6C7334FAD080c5704D77216b732
                "32ef95df4ea8de4f6b5518106e97dbb3e5b97cdbb4a33adfeaa9f14e729f51eb", //fAdb253d9AD9b2d6D37471fA80F398f76D8347B8
                "e047c057b8b11153322c91f2d5474b73d691fa4351d053148582f07462ad1ae1", //b3C711A69B3DeAC4441904932Ca98E09e9068284
                "a8ee6be3949318b57fbdfefdc86cd3a9033b8946789cb33db209e0c623c45cb5", //8c8af239FfB9A6e93AC4b434C71a135572A1021C
                "2b42ed39b2d9c3d576320af626b90a62ce726ee0f25764061947891415dbe782", //4312488937D47A007De24d48aB82940C809EEb2b
                "35c285cae6a13a0e13ef7db25776e60b02745922da3b39513b94114c2c5d9add", //57829d5E80730D06B1364A2b05342F44bFB70E8f
                "f951e1bd9ef0359e6886ae77e5fd30d566ef098d099c78fd3fb68588657618cc", //2c44c4B96AE5f9c9dbf32cF3AA743Cd0277F3127
                "d9597e2d88463e47d1b6c2431879f06d440a6ff980a51a1f8c830623b112f329", //03d68e57f1f9939d3FDcf97B5e7a1d0Be995Ec67
                "81690fb141b4ae5682ad1fd73b29ae1bcc67891e93de73c6f636402deac21171", //93d2Ce0461C2612F847e074434d9951c32e44327
                "360b3f569579a0e824fab18c21d6e583b060e2339142c6833c899029fc8e428d", //5a3288A7400B2cd5e0568728E8216D9392094892
                "1bf1fbfb91c484e78cb8adb55ff3fee99825b49af57ba0eb0b79f82b3ffb563f", //F8041E1185C7106121952bA9914ff904A4A01c80
                "f083c679bb978f6e2eb8611de27319b2e3a329d307eb5fd1d532a1cd6b63fff9", //bA268f776F70caDB087e73020dfE41c7298363Ed
                "518eb784dd768d8c0cdf9218d44ae8f498d0cadf7ecf98f5ecf27c6b793986ca", //4568E35F2c4590Bde059be615015AaB6cc873004  (used for ucl-accounting)
                "5ce8c4aea462de54d0a8ecbfe5cc8c8ac18926979c66a66e5a463ba8506401c0", //fE5acd71116FB8a03510FF171222F01164609c97，admin,do not use business processes
              ],
          },
        ucl_node3:{
            url: "ac7de8abe64c944a1b5644baa8eca908-910597978.us-west-1.elb.amazonaws.com:50051", //node3 url
            accounts: [
                "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3", //
                ],
        },
        ucl_node4:{
            url: "a0db4e54d842a4ab1adccbcd1a235fa9-2142411984.us-west-1.elb.amazonaws.com:50051", //node4 url
            accounts: [
                "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3", //
            ],
        },
        serverBesuProxy: {
            url: 'http://localhost:2000',
            accounts: [
                "8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63",//0xfe3b557e8fb62b89f4916b721be55ceb828dbd73
                "c87509a1c067bbde78beb793e6fa76530b6382a4c0241e5e4a9ec0a0f44dc0d3",//0x627306090abaB3A6e1400e9345bC60c78a8BEf57
                "35c285cae6a13a0e13ef7db25776e60b02745922da3b39513b94114c2c5d9add",//0xf17f52151EbEF6C7334FAD080c5704D77216b732
            ]
        },

    },

};
