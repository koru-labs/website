const hre = require("hardhat");
const {ethers} = hre;

async function deployMatch() {
    const [deployer] = await ethers.getSigners()
    const PoseidonHash = await ethers.getContractFactory("PoseidonHasher");
    const hash= await PoseidonHash.deploy();
    await hash.waitForDeployment();
    console.log("PoseidonHasher is deployed at ", hash.target);

    const PoseidonT4 = await ethers.getContractFactory("PoseidonT4");
    const poseidonT4= await PoseidonT4.deploy();
    await poseidonT4.waitForDeployment();
    console.log("poseidonT4 is deployed at ", poseidonT4.target);

    const DvpMatch = await ethers.getContractFactory("DvpMatch", {
        signer: deployer[0],
        libraries: {
            PoseidonHasher:  hash.target,
            PoseidonT4: poseidonT4.target
        },
    });
    const match = await DvpMatch.deploy();
    await match.waitForDeployment()
    // console.log("dvp match is deployed to:", match.target);
    console.log("L1MatchScAddress:", match.target);
    // console.log("math", await match.hash("0x10644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001", "0x20644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001"));
}


deployMatch().then();


