const {ethers}=require("hardhat");

async function testChainId(){
    const network = await ethers.provider.getNetwork();
    const chainId = network.chainId;
    console.log("Chain ID:", chainId);
}

async function testBalance(){
    let [sender, to] = await ethers.getSigners();
    let account="0x00000000000000000000000000000000000000f6"
    const balance = await ethers.provider.getBalance(sender.address)
    console.log("balance:", balance)

    const tx = await sender.sendTransaction({
        to: to.address,
        value: 3, // 0.01 ETH
    });

    let rc = await tx.wait();
    console.log("tx receipt:", rc);
}

async function testBlockNumber() {
    let block = await ethers.provider.getBlock("latest" );
    console.log(block);

}

testChainId().then();
// testBalance().then();
// testBlockNumber().then();