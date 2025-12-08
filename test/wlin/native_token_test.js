const {ethers, network}=require("hardhat");
const {networks} = require("../../hardhat.config");
const {ether} = require("@openzeppelin/test-helpers");

const native_token_address = "0x2E66bec28349b70961d2bea744F8B26705DeBDfA";

const abi="[\n	{\n		\"inputs\": [\n			{\"internalType\": \"address[]\", \"name\": \"recipients\", \"type\": \"address[]\"},\n			{\n				\"components\": [\n					{\"internalType\": \"uint256\", \"name\": \"id\", \"type\": \"uint256\"},\n					{\"internalType\": \"address\", \"name\": \"owner\", \"type\": \"address\"},\n					{\"internalType\": \"uint8\", \"name\": \"status\", \"type\": \"uint8\"},\n					{\n						\"components\": [\n							{\"internalType\": \"uint256\", \"name\": \"cl_x\", \"type\": \"uint256\"},\n							{\"internalType\": \"uint256\", \"name\": \"cl_y\", \"type\": \"uint256\"},\n							{\"internalType\": \"uint256\", \"name\": \"cr_x\", \"type\": \"uint256\"},\n							{\"internalType\": \"uint256\", \"name\": \"cr_y\", \"type\": \"uint256\"}\n						],\n						\"internalType\": \"struct TokenModel.ElGamal\",\n						\"name\": \"amount\",\n						\"type\": \"tuple\"\n					},\n					{\"internalType\": \"address\", \"name\": \"to\", \"type\": \"address\"},\n					{\"internalType\": \"uint256\", \"name\": \"rollbackTokenId\", \"type\": \"uint256\"}\n				],\n				\"internalType\": \"struct TokenModel.TokenEntity[]\",\n				\"name\": \"tokens\",\n				\"type\": \"tuple[]\"\n			},\n			{\n				\"components\": [\n					{\"internalType\": \"uint256\", \"name\": \"id\", \"type\": \"uint256\"},\n					{\n						\"components\": [\n							{\"internalType\": \"uint256\", \"name\": \"cl_x\", \"type\": \"uint256\"},\n							{\"internalType\": \"uint256\", \"name\": \"cl_y\", \"type\": \"uint256\"},\n							{\"internalType\": \"uint256\", \"name\": \"cr_x\", \"type\": \"uint256\"},\n							{\"internalType\": \"uint256\", \"name\": \"cr_y\", \"type\": \"uint256\"}\n						],\n						\"internalType\": \"struct TokenModel.ElGamal\",\n						\"name\": \"value\",\n						\"type\": \"tuple\"\n					}\n				],\n				\"internalType\": \"struct TokenModel.ElGamalToken[]\",\n				\"name\": \"newAllowed\",\n				\"type\": \"tuple[]\"\n			},\n			{\"internalType\": \"uint256[8]\", \"name\": \"proof\", \"type\": \"uint256[8]\"},\n			{\"internalType\": \"uint256[]\", \"name\": \"publicInputs\", \"type\": \"uint256[]\"}\n		],\n		\"name\": \"mint\",\n		\"outputs\": [{\"internalType\": \"bool\", \"name\": \"\", \"type\": \"bool\"}],\n		\"stateMutability\": \"nonpayable\",\n		\"type\": \"function\"\n	},\n	{\n		\"inputs\": [\n			{\"internalType\": \"address\", \"name\": \"from\", \"type\": \"address\"},\n			{\"internalType\": \"address[]\", \"name\": \"recipients\", \"type\": \"address[]\"},\n			{\"internalType\": \"uint256[]\", \"name\": \"consumedIds\", \"type\": \"uint256[]\"},\n			{\n				\"components\": [\n					{\"internalType\": \"uint256\", \"name\": \"id\", \"type\": \"uint256\"},\n					{\"internalType\": \"address\", \"name\": \"owner\", \"type\": \"address\"},\n					{\"internalType\": \"uint8\", \"name\": \"status\", \"type\": \"uint8\"},\n					{\n						\"components\": [\n							{\"internalType\": \"uint256\", \"name\": \"cl_x\", \"type\": \"uint256\"},\n							{\"internalType\": \"uint256\", \"name\": \"cl_y\", \"type\": \"uint256\"},\n							{\"internalType\": \"uint256\", \"name\": \"cr_x\", \"type\": \"uint256\"},\n							{\"internalType\": \"uint256\", \"name\": \"cr_y\", \"type\": \"uint256\"}\n						],\n						\"internalType\": \"struct TokenModel.ElGamal\",\n						\"name\": \"amount\",\n						\"type\": \"tuple\"\n					},\n					{\"internalType\": \"address\", \"name\": \"to\", \"type\": \"address\"},\n					{\"internalType\": \"uint256\", \"name\": \"rollbackTokenId\", \"type\": \"uint256\"}\n				],\n				\"internalType\": \"struct TokenModel.TokenEntity[]\",\n				\"name\": \"newTokens\",\n				\"type\": \"tuple[]\"\n			},\n			{\"internalType\": \"uint256[8]\", \"name\": \"proof\", \"type\": \"uint256[8]\"},\n			{\"internalType\": \"uint256[]\", \"name\": \"publicInputs\", \"type\": \"uint256[]\"}\n		],\n		\"name\": \"split\",\n		\"outputs\": [{\"internalType\": \"bool\", \"name\": \"\", \"type\": \"bool\"}],\n		\"stateMutability\": \"nonpayable\",\n		\"type\": \"function\"\n	},\n	{\n		\"inputs\": [\n			{\"internalType\": \"uint256\", \"name\": \"tokenId\", \"type\": \"uint256\"},\n			{\"internalType\": \"string\", \"name\": \"memo\", \"type\": \"string\"}\n		],\n		\"name\": \"transfer\",\n		\"outputs\": [{\"internalType\": \"bool\", \"name\": \"\", \"type\": \"bool\"}],\n		\"stateMutability\": \"nonpayable\",\n		\"type\": \"function\"\n	}\n]";


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

// testMint().then();
// testTransfer().then();
// testSplit().then();
getTokenById().then();
