
const config = require('./../../deployments/image9.json');

const {
    callPrivateMint,
    callPrivateTransfer,
    callPrivateBurn,
    callPrivateApprove,
    callPrivateTransferFrom,
    getAddressBalance,
    getPublicTotalSupply,
    checkAccountToken
} = require("../help/testHelp")

async function testTotalSupply(){
    let result = await getPublicTotalSupply("0x65580aEaF79a26aC0f61F7BA914bF900956eBA98");
    console.log("the total supply is: ", result)
}

testTotalSupply().then();