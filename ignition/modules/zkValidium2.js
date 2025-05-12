const hre = require("hardhat");
const {ethers} = hre;

const {buildModule} = require("@nomicfoundation/hardhat-ignition/modules");


module.exports = buildModule("zkValidiumn", (m) => {
    const fflonkVerifier = m.contract("FflonkVerifier2", []);
    const globalExitV2 = m.contract("PolygonZkEVMGlobalExitRootV2", [ethers.ZeroAddress, ethers.ZeroAddress]);
    const rollupManager = m.contract("PolygonRollupManager", [globalExitV2, ethers.ZeroAddress, ethers.ZeroAddress]);

    const validiumEtrog = m.contract("PolygonValidiumEtrog", [
        ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress, rollupManager],);

    return {validiumEtrog, globalExitV2, rollupManager, fflonkVerifier};


});



