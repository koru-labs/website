const {ethers}=require("hardhat");
const axios = require("axios")

const simpleTokenAddress = "0x463C5c3Da0162bFCAd2D8e8F71bF9312247B6bCB";

async function deploySimpleToken(){
    const SimpleToken = await ethers.getContractFactory("SimpleToken");
    const simpleToken = await SimpleToken.deploy("simple", "$S");
    await simpleToken.waitForDeployment();

    console.log("SimpleToken is deployed at: ", simpleToken.target);
}


async function batchTransfer(){
    const privateKey = "555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787";
    const providerUrl = "http://qa-ucl-l2.hamsa-ucl.com:8545";
    const provider = new ethers.JsonRpcProvider(providerUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    const recipient = "0xfAdb253d9AD9b2d6D37471fA80F398f76D8347B8";
    const ERC20_ABI = ["function transfer(address to, uint256 amount) public returns (bool)"];
    const iface = new ethers.Interface(ERC20_ABI);

    const batchPayload = [];

    const from = wallet.address;
    let nonce = await provider.getTransactionCount(from, "latest");
    let chainId=ethers.provider.chainId


    for (let i = 0; i < 5000; i++) {
        const data = iface.encodeFunctionData("transfer", [
            recipient,
            1,
        ]);

        const tx = {
            to: simpleTokenAddress,
            data,
            nonce,
            gasLimit: 100_000,
            gasPrice:0,
            chainId: chainId,
            type: 0,
        };

        const signedTx = await wallet.signTransaction(tx);

        batchPayload.push({
            jsonrpc: "2.0",
            id: i + 1,
            method: "eth_sendRawTransaction",
            params: [signedTx],
        });
        nonce++;
    }
    console.log("batchPayload:", batchPayload)

    const response = await axios.post(providerUrl, batchPayload, {
        headers: { "Content-Type": "application/json" },
    });
    console.log("response:", response.data)

}

async function checkBalance(){
    const [signer] = await ethers.getSigners();
    const SimpleToken = await ethers.getContractFactory("SimpleToken");
    const simpleToken = await SimpleToken.attach(simpleTokenAddress);
    let balance = await simpleToken.balanceOf(signer.address);
    console.log("balance:", balance);
}

deploySimpleToken().then();
// checkBalance().then();
// batchTransfer().then();