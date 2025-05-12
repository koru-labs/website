const hre = require("hardhat");
const {ethers} = hre;

const {buildModule} = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("zkValidiumn", (m) => {


    const polTokenName = "Pol Token";
    const polTokenSymbol = "POL";
    const polTokenInitialBalance = ethers.parseEther("20000000");
    const ERC20PermitMock = m.contract("ERC20PermitMock", [polTokenName,polTokenSymbol,"0xfe3b557e8fb62b89f4916b721be55ceb828dbd73",polTokenInitialBalance]);
    const polygonZkEVMBridge = m.contract("PolygonZkEVMBridgeV1", []);
    const polygonZkEVMBridge2 = m.contract("PolygonZkEVMBridgeV2", []);
    const fflonkVerifier = m.contract("FflonkVerifier2", []);
    const globalExitV2 = m.contract("PolygonZkEVMGlobalExitRootV2", [ethers.ZeroAddress, ethers.ZeroAddress]);
    const rollupManager = m.contract("PolygonRollupManager", [globalExitV2, ERC20PermitMock, polygonZkEVMBridge]);

    const validiumEtrog = m.contract("PolygonValidiumEtrog", [
        globalExitV2, ERC20PermitMock,polygonZkEVMBridge2, rollupManager],);

    return {validiumEtrog, globalExitV2, rollupManager, fflonkVerifier,polygonZkEVMBridge2,ERC20PermitMock};


});



