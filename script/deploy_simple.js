const hre = require("hardhat");
const {ignition, ethers} = hre;

const simpleModule=require("../ignition/modules/simple")

async  function main() {

    const {simple} = await  ignition.deploy(simpleModule);
    console.log("simple address",await simple.getAddress())

    await simple.setBrand("hello");
    console.log("brand", await simple.brand());
}

main().then()