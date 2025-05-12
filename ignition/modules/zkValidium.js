const hre = require("hardhat");
const {ethers} = hre;

const {buildModule} = require("@nomicfoundation/hardhat-ignition/modules");


module.exports = buildModule("zkValidiumn",  (m) =>  {

    const globalExitV2 =  m.contract("PolygonZkEVMGlobalExitRootV2Mock", [ ethers.ZeroAddress, ethers.ZeroAddress]);
    const rollupMgrMocker =  m.contract("PolygonRollupManagerMock", [ globalExitV2, ethers.ZeroAddress, ethers.ZeroAddress]);

    const validiumEtorg = m.contract("PolygonValidiumEtrog", [
        ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress, rollupMgrMocker],);

    return {validiumEtorg, globalExitV2, rollupMgrMocker};


});



