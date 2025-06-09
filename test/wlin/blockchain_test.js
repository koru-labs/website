const {ethers} = require('hardhat');
const hardhatConfig = require('../../hardhat.config');

const l1CustomNetwork = {
    name: "BESU",
    chainId: 1337
};
const options = {
    batchMaxCount: 1,
    staticNetwork: true
};


const L1Url = hardhatConfig.networks.ucl_L2.url;
const l1Provider = new ethers.JsonRpcProvider(L1Url, l1CustomNetwork, options);

async function testGasless() {
    const account = ethers.Wallet.createRandom();
    let wallet = new ethers.Wallet(account.privateKey, l1Provider);
    console.log("the test account is : ", account.address)

    const SignatureChecker = await ethers.getContractFactory("SignatureChecker", wallet)
    const signatureChecker = await SignatureChecker.deploy();
    await signatureChecker.waitForDeployment()
    let CircleV2 = await ethers.getContractFactory("FiatTokenV2",  {
        signer: wallet,
        libraries: {
            "SignatureChecker": signatureChecker.target
        }
    });
    let circleV2 = await CircleV2.deploy();
    let receipt = await circleV2.waitForDeployment();
    console.log("deployment receipt: ", receipt)
    console.log("FiatTokenV2 is deployed successfully at: ", await receipt.getAddress())

}

testGasless().then();