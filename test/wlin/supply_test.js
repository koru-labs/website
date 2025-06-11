
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
    let result = await getPublicTotalSupply(config.contracts.PrivateERCToken);
    console.log("the total supply is: ", result)
}

testTotalSupply().then();