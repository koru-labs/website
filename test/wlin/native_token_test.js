const {ethers, network}=require("hardhat");
const {networks} = require("../../hardhat.config");
const {ether} = require("@openzeppelin/test-helpers");

const native_token_address = "0x2E66bec28349b70961d2bea744F8B26705DeBDfA";

const abi= "[\n" +
    "    {\n" +
    "      \"inputs\": [\n" +
    "        {\n" +
    "          \"internalType\": \"uint256\",\n" +
    "          \"name\": \"tokenId\",\n" +
    "          \"type\": \"uint256\"\n" +
    "        }\n" +
    "      ],\n" +
    "      \"name\": \"burn\",\n" +
    "      \"outputs\": [\n" +
    "        {\n" +
    "          \"internalType\": \"bool\",\n" +
    "          \"name\": \"\",\n" +
    "          \"type\": \"bool\"\n" +
    "        }\n" +
    "      ],\n" +
    "      \"stateMutability\": \"nonpayable\",\n" +
    "      \"type\": \"function\"\n" +
    "    },\n" +
    "    {\n" +
    "      \"inputs\": [\n" +
    "        {\n" +
    "          \"internalType\": \"address\",\n" +
    "          \"name\": \"owner\",\n" +
    "          \"type\": \"address\"\n" +
    "        },\n" +
    "        {\n" +
    "          \"internalType\": \"uint256\",\n" +
    "          \"name\": \"tokenId\",\n" +
    "          \"type\": \"uint256\"\n" +
    "        }\n" +
    "      ],\n" +
    "      \"name\": \"getToken\",\n" +
    "      \"outputs\": [\n" +
    "        {\n" +
    "          \"components\": [\n" +
    "            {\n" +
    "              \"internalType\": \"uint256\",\n" +
    "              \"name\": \"id\",\n" +
    "              \"type\": \"uint256\"\n" +
    "            },\n" +
    "            {\n" +
    "              \"internalType\": \"address\",\n" +
    "              \"name\": \"owner\",\n" +
    "              \"type\": \"address\"\n" +
    "            },\n" +
    "            {\n" +
    "              \"internalType\": \"enum TokenModel.TokenStatus\",\n" +
    "              \"name\": \"status\",\n" +
    "              \"type\": \"uint8\"\n" +
    "            },\n" +
    "            {\n" +
    "              \"components\": [\n" +
    "                {\n" +
    "                  \"internalType\": \"uint256\",\n" +
    "                  \"name\": \"cl_x\",\n" +
    "                  \"type\": \"uint256\"\n" +
    "                },\n" +
    "                {\n" +
    "                  \"internalType\": \"uint256\",\n" +
    "                  \"name\": \"cl_y\",\n" +
    "                  \"type\": \"uint256\"\n" +
    "                },\n" +
    "                {\n" +
    "                  \"internalType\": \"uint256\",\n" +
    "                  \"name\": \"cr_x\",\n" +
    "                  \"type\": \"uint256\"\n" +
    "                },\n" +
    "                {\n" +
    "                  \"internalType\": \"uint256\",\n" +
    "                  \"name\": \"cr_y\",\n" +
    "                  \"type\": \"uint256\"\n" +
    "                }\n" +
    "              ],\n" +
    "              \"internalType\": \"struct TokenModel.ElGamal\",\n" +
    "              \"name\": \"amount\",\n" +
    "              \"type\": \"tuple\"\n" +
    "            },\n" +
    "            {\n" +
    "              \"internalType\": \"address\",\n" +
    "              \"name\": \"to\",\n" +
    "              \"type\": \"address\"\n" +
    "            },\n" +
    "            {\n" +
    "              \"internalType\": \"uint256\",\n" +
    "              \"name\": \"rollbackTokenId\",\n" +
    "              \"type\": \"uint256\"\n" +
    "            }\n" +
    "          ],\n" +
    "          \"internalType\": \"struct TokenModel.TokenEntity\",\n" +
    "          \"name\": \"\",\n" +
    "          \"type\": \"tuple\"\n" +
    "        }\n" +
    "      ],\n" +
    "      \"stateMutability\": \"view\",\n" +
    "      \"type\": \"function\"\n" +
    "    },\n" +
    "    {\n" +
    "      \"inputs\": [\n" +
    "        {\n" +
    "          \"internalType\": \"address[]\",\n" +
    "          \"name\": \"recipients\",\n" +
    "          \"type\": \"address[]\"\n" +
    "        },\n" +
    "        {\n" +
    "          \"components\": [\n" +
    "            {\n" +
    "              \"internalType\": \"uint256\",\n" +
    "              \"name\": \"id\",\n" +
    "              \"type\": \"uint256\"\n" +
    "            },\n" +
    "            {\n" +
    "              \"internalType\": \"address\",\n" +
    "              \"name\": \"owner\",\n" +
    "              \"type\": \"address\"\n" +
    "            },\n" +
    "            {\n" +
    "              \"internalType\": \"enum TokenModel.TokenStatus\",\n" +
    "              \"name\": \"status\",\n" +
    "              \"type\": \"uint8\"\n" +
    "            },\n" +
    "            {\n" +
    "              \"components\": [\n" +
    "                {\n" +
    "                  \"internalType\": \"uint256\",\n" +
    "                  \"name\": \"cl_x\",\n" +
    "                  \"type\": \"uint256\"\n" +
    "                },\n" +
    "                {\n" +
    "                  \"internalType\": \"uint256\",\n" +
    "                  \"name\": \"cl_y\",\n" +
    "                  \"type\": \"uint256\"\n" +
    "                },\n" +
    "                {\n" +
    "                  \"internalType\": \"uint256\",\n" +
    "                  \"name\": \"cr_x\",\n" +
    "                  \"type\": \"uint256\"\n" +
    "                },\n" +
    "                {\n" +
    "                  \"internalType\": \"uint256\",\n" +
    "                  \"name\": \"cr_y\",\n" +
    "                  \"type\": \"uint256\"\n" +
    "                }\n" +
    "              ],\n" +
    "              \"internalType\": \"struct TokenModel.ElGamal\",\n" +
    "              \"name\": \"amount\",\n" +
    "              \"type\": \"tuple\"\n" +
    "            },\n" +
    "            {\n" +
    "              \"internalType\": \"address\",\n" +
    "              \"name\": \"to\",\n" +
    "              \"type\": \"address\"\n" +
    "            },\n" +
    "            {\n" +
    "              \"internalType\": \"uint256\",\n" +
    "              \"name\": \"rollbackTokenId\",\n" +
    "              \"type\": \"uint256\"\n" +
    "            }\n" +
    "          ],\n" +
    "          \"internalType\": \"struct TokenModel.TokenEntity[]\",\n" +
    "          \"name\": \"tokens\",\n" +
    "          \"type\": \"tuple[]\"\n" +
    "        },\n" +
    "        {\n" +
    "          \"components\": [\n" +
    "            {\n" +
    "              \"internalType\": \"uint256\",\n" +
    "              \"name\": \"id\",\n" +
    "              \"type\": \"uint256\"\n" +
    "            },\n" +
    "            {\n" +
    "              \"components\": [\n" +
    "                {\n" +
    "                  \"internalType\": \"uint256\",\n" +
    "                  \"name\": \"cl_x\",\n" +
    "                  \"type\": \"uint256\"\n" +
    "                },\n" +
    "                {\n" +
    "                  \"internalType\": \"uint256\",\n" +
    "                  \"name\": \"cl_y\",\n" +
    "                  \"type\": \"uint256\"\n" +
    "                },\n" +
    "                {\n" +
    "                  \"internalType\": \"uint256\",\n" +
    "                  \"name\": \"cr_x\",\n" +
    "                  \"type\": \"uint256\"\n" +
    "                },\n" +
    "                {\n" +
    "                  \"internalType\": \"uint256\",\n" +
    "                  \"name\": \"cr_y\",\n" +
    "                  \"type\": \"uint256\"\n" +
    "                }\n" +
    "              ],\n" +
    "              \"internalType\": \"struct TokenModel.ElGamal\",\n" +
    "              \"name\": \"value\",\n" +
    "              \"type\": \"tuple\"\n" +
    "            }\n" +
    "          ],\n" +
    "          \"internalType\": \"struct TokenModel.ElGamalToken\",\n" +
    "          \"name\": \"newAllowed\",\n" +
    "          \"type\": \"tuple\"\n" +
    "        },\n" +
    "        {\n" +
    "          \"internalType\": \"uint256[8]\",\n" +
    "          \"name\": \"proof\",\n" +
    "          \"type\": \"uint256[8]\"\n" +
    "        },\n" +
    "        {\n" +
    "          \"internalType\": \"uint256[]\",\n" +
    "          \"name\": \"publicInputs\",\n" +
    "          \"type\": \"uint256[]\"\n" +
    "        },\n" +
    "        {\n" +
    "          \"internalType\": \"uint256\",\n" +
    "          \"name\": \"paddingNum\",\n" +
    "          \"type\": \"uint256\"\n" +
    "        }\n" +
    "      ],\n" +
    "      \"name\": \"mint\",\n" +
    "      \"outputs\": [\n" +
    "        {\n" +
    "          \"internalType\": \"bool\",\n" +
    "          \"name\": \"\",\n" +
    "          \"type\": \"bool\"\n" +
    "        }\n" +
    "      ],\n" +
    "      \"stateMutability\": \"nonpayable\",\n" +
    "      \"type\": \"function\"\n" +
    "    },\n" +
    "    {\n" +
    "      \"inputs\": [\n" +
    "        {\n" +
    "          \"internalType\": \"address\",\n" +
    "          \"name\": \"minter\",\n" +
    "          \"type\": \"address\"\n" +
    "        },\n" +
    "        {\n" +
    "          \"components\": [\n" +
    "            {\n" +
    "              \"internalType\": \"uint256\",\n" +
    "              \"name\": \"id\",\n" +
    "              \"type\": \"uint256\"\n" +
    "            },\n" +
    "            {\n" +
    "              \"components\": [\n" +
    "                {\n" +
    "                  \"internalType\": \"uint256\",\n" +
    "                  \"name\": \"cl_x\",\n" +
    "                  \"type\": \"uint256\"\n" +
    "                },\n" +
    "                {\n" +
    "                  \"internalType\": \"uint256\",\n" +
    "                  \"name\": \"cl_y\",\n" +
    "                  \"type\": \"uint256\"\n" +
    "                },\n" +
    "                {\n" +
    "                  \"internalType\": \"uint256\",\n" +
    "                  \"name\": \"cr_x\",\n" +
    "                  \"type\": \"uint256\"\n" +
    "                },\n" +
    "                {\n" +
    "                  \"internalType\": \"uint256\",\n" +
    "                  \"name\": \"cr_y\",\n" +
    "                  \"type\": \"uint256\"\n" +
    "                }\n" +
    "              ],\n" +
    "              \"internalType\": \"struct TokenModel.ElGamal\",\n" +
    "              \"name\": \"value\",\n" +
    "              \"type\": \"tuple\"\n" +
    "            }\n" +
    "          ],\n" +
    "          \"internalType\": \"struct TokenModel.ElGamalToken\",\n" +
    "          \"name\": \"allowed\",\n" +
    "          \"type\": \"tuple\"\n" +
    "        }\n" +
    "      ],\n" +
    "      \"name\": \"setMintAllowed\",\n" +
    "      \"outputs\": [],\n" +
    "      \"stateMutability\": \"nonpayable\",\n" +
    "      \"type\": \"function\"\n" +
    "    },\n" +
    "    {\n" +
    "      \"inputs\": [\n" +
    "        {\n" +
    "          \"internalType\": \"address\",\n" +
    "          \"name\": \"from\",\n" +
    "          \"type\": \"address\"\n" +
    "        },\n" +
    "        {\n" +
    "          \"internalType\": \"address[]\",\n" +
    "          \"name\": \"recipients\",\n" +
    "          \"type\": \"address[]\"\n" +
    "        },\n" +
    "        {\n" +
    "          \"internalType\": \"uint256[]\",\n" +
    "          \"name\": \"consumedIds\",\n" +
    "          \"type\": \"uint256[]\"\n" +
    "        },\n" +
    "        {\n" +
    "          \"components\": [\n" +
    "            {\n" +
    "              \"internalType\": \"uint256\",\n" +
    "              \"name\": \"id\",\n" +
    "              \"type\": \"uint256\"\n" +
    "            },\n" +
    "            {\n" +
    "              \"internalType\": \"address\",\n" +
    "              \"name\": \"owner\",\n" +
    "              \"type\": \"address\"\n" +
    "            },\n" +
    "            {\n" +
    "              \"internalType\": \"enum TokenModel.TokenStatus\",\n" +
    "              \"name\": \"status\",\n" +
    "              \"type\": \"uint8\"\n" +
    "            },\n" +
    "            {\n" +
    "              \"components\": [\n" +
    "                {\n" +
    "                  \"internalType\": \"uint256\",\n" +
    "                  \"name\": \"cl_x\",\n" +
    "                  \"type\": \"uint256\"\n" +
    "                },\n" +
    "                {\n" +
    "                  \"internalType\": \"uint256\",\n" +
    "                  \"name\": \"cl_y\",\n" +
    "                  \"type\": \"uint256\"\n" +
    "                },\n" +
    "                {\n" +
    "                  \"internalType\": \"uint256\",\n" +
    "                  \"name\": \"cr_x\",\n" +
    "                  \"type\": \"uint256\"\n" +
    "                },\n" +
    "                {\n" +
    "                  \"internalType\": \"uint256\",\n" +
    "                  \"name\": \"cr_y\",\n" +
    "                  \"type\": \"uint256\"\n" +
    "                }\n" +
    "              ],\n" +
    "              \"internalType\": \"struct TokenModel.ElGamal\",\n" +
    "              \"name\": \"amount\",\n" +
    "              \"type\": \"tuple\"\n" +
    "            },\n" +
    "            {\n" +
    "              \"internalType\": \"address\",\n" +
    "              \"name\": \"to\",\n" +
    "              \"type\": \"address\"\n" +
    "            },\n" +
    "            {\n" +
    "              \"internalType\": \"uint256\",\n" +
    "              \"name\": \"rollbackTokenId\",\n" +
    "              \"type\": \"uint256\"\n" +
    "            }\n" +
    "          ],\n" +
    "          \"internalType\": \"struct TokenModel.TokenEntity[]\",\n" +
    "          \"name\": \"newTokens\",\n" +
    "          \"type\": \"tuple[]\"\n" +
    "        },\n" +
    "        {\n" +
    "          \"internalType\": \"uint256[8]\",\n" +
    "          \"name\": \"proof\",\n" +
    "          \"type\": \"uint256[8]\"\n" +
    "        },\n" +
    "        {\n" +
    "          \"internalType\": \"uint256[]\",\n" +
    "          \"name\": \"publicInputs\",\n" +
    "          \"type\": \"uint256[]\"\n" +
    "        },\n" +
    "        {\n" +
    "          \"internalType\": \"uint256\",\n" +
    "          \"name\": \"paddingNum\",\n" +
    "          \"type\": \"uint256\"\n" +
    "        }\n" +
    "      ],\n" +
    "      \"name\": \"split\",\n" +
    "      \"outputs\": [\n" +
    "        {\n" +
    "          \"internalType\": \"bool\",\n" +
    "          \"name\": \"\",\n" +
    "          \"type\": \"bool\"\n" +
    "        }\n" +
    "      ],\n" +
    "      \"stateMutability\": \"nonpayable\",\n" +
    "      \"type\": \"function\"\n" +
    "    },\n" +
    "    {\n" +
    "      \"inputs\": [\n" +
    "        {\n" +
    "          \"internalType\": \"uint256\",\n" +
    "          \"name\": \"tokenId\",\n" +
    "          \"type\": \"uint256\"\n" +
    "        },\n" +
    "        {\n" +
    "          \"internalType\": \"string\",\n" +
    "          \"name\": \"memo\",\n" +
    "          \"type\": \"string\"\n" +
    "        }\n" +
    "      ],\n" +
    "      \"name\": \"transfer\",\n" +
    "      \"outputs\": [\n" +
    "        {\n" +
    "          \"internalType\": \"bool\",\n" +
    "          \"name\": \"\",\n" +
    "          \"type\": \"bool\"\n" +
    "        }\n" +
    "      ],\n" +
    "      \"stateMutability\": \"nonpayable\",\n" +
    "      \"type\": \"function\"\n" +
    "    }\n" +
    "  ]"

/**
 *  function mint(
 *         address[] calldata recipients,
 *         TokenEntity[] memory tokens,
 *         ElGamalToken[] memory newAllowed,
 *         uint256[8] calldata proof,
 *         uint256[] calldata publicInputs
 *     )
 *
 *
 * @returns {Promise<void>}
 */

async function testMint() {
    const [signer] = await ethers.getSigners();

    const native = new ethers.Contract(
        native_token_address,
        abi,
        signer
    );

    let token =  {
        id: 1,
        owner: signer.address,
        status: 2,
        amount: {
            cl_x: "9110195795834256749834325857294556710933216128560630139315452502928549190459",
            cl_y: "10399448168241846983915852774721267829029794545882598909172187031009066819820",
            cr_x: "7864167786632000407000581592302633740834144670995005538167977204085621328516",
            cr_y: "7318124320389771021418443381934529404794999197683133795404485014163207955096"
        },
        to: signer.address,
        rollbackTokenId:2,
        tokenType: 2
    }

    let elgamalToken = {
        id: 3,
        value: {
            cl_x: "9110195795834256749834325857294556710933216128560630139315452502928549190459",
            cl_y: "10399448168241846983915852774721267829029794545882598909172187031009066819820",
            cr_x: "7864167786632000407000581592302633740834144670995005538167977204085621328516",
            cr_y: "7318124320389771021418443381934529404794999197683133795404485014163207955096"
        }
    }

    let tx = await native.mint([signer.address], [token], [elgamalToken], [1,2,3,4,5,6,7,8], [9,10,11]);
    console.log(tx);
    console.log("wait for response of tx");
    let rc = await tx.wait();
    console.log(rc);
}

async function testTransfer() {
    const [signer] = await ethers.getSigners();

    const native = new ethers.Contract(
        native_token_address,
        abi,
        signer
    );

    let tx = await native.transfer(1,  "hello word");
    console.log(tx);
    console.log("wait for response of tx");
    let rc = await tx.wait();
    console.log(rc);
}

async function testSplit() {
    const [signer] = await ethers.getSigners();

    const native = new ethers.Contract(
        native_token_address,
        abi,
        signer
    );

    let newToken =  {
        id: 1,
        owner: signer.address,
        status: 2,
        amount: {
            cl_x: "9110195795834256749834325857294556710933216128560630139315452502928549190459",
            cl_y: "10399448168241846983915852774721267829029794545882598909172187031009066819820",
            cr_x: "7864167786632000407000581592302633740834144670995005538167977204085621328516",
            cr_y: "7318124320389771021418443381934529404794999197683133795404485014163207955096"
        },
        to: signer.address,
        rollbackTokenId:2
    }

    let tx = await native.split(signer.address, [signer.address], [1, 2, 3], [newToken], [1,2,3,4,5,6,7,8], [9,10,11] );
    console.log(tx);
    console.log("wait for response of tx");
    let rc = await tx.wait();
    console.log(rc);
}

async function getTokenById(){
    const [signer] = await ethers.getSigners();

    const native = await ethers.getContractAt("INativeToken", native_token_address);
    console.log("signerAddress", signer.address);
    let response = await native.getToken(signer.address, 2)
    console.log("response", response);
}

async function encodeBurn() {
    const iface = new ethers.Interface(["function burn(uint256 tokenId) external returns (bool)"]);
    const data = iface.encodeFunctionData("burn", [100]);
    console.log(data);
}


async function testBurn() {
    const [signer] = await ethers.getSigners();

    const native = new ethers.Contract(
        native_token_address,
        abi,
        signer
    );
    let tx = await native.burn(100);
    let r= tx.wait();
    console.log("receipt: ", r);
}


// testMint().then();
// testTransfer().then();
// testSplit().then();
// getTokenById().then();
// encodeBurn().then();
testBurn().then();
