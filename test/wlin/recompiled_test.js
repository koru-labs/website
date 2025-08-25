const {ethers} = require("hardhat");

const simpleTokenAddress = "0xC18CBB980CFe3Ce0b17abcd85c22D33B41a91Fe4";



async function deploySimpleToken() {
    const CurveBabyJubJub = await ethers.getContractFactory("CurveBabyJubJub");
    const curveBabyJubJub = await CurveBabyJubJub.deploy();
    await curveBabyJubJub.waitForDeployment();
    console.log("CurveBabyJubJub is deployed at :", curveBabyJubJub.target);

    const CurveBabyJubJubHelper = await ethers.getContractFactory("CurveBabyJubJubHelper", {
        libraries: {
            CurveBabyJubJub:curveBabyJubJub.target
        }
    })
    const curveBabyJubJubHelper = await CurveBabyJubJubHelper.deploy();
    await curveBabyJubJubHelper.waitForDeployment();
    console.log("CurveBabyJubJubHelper is deployed at :", curveBabyJubJubHelper.target);

    const SimpleToken = await ethers.getContractFactory("SimpleToken", {
        libraries: {
        "CurveBabyJubJubHelper": curveBabyJubJubHelper.target
    }});
    const simpleToken = await SimpleToken.deploy("simple", "$S");
    await simpleToken.waitForDeployment();

    console.log("SimpleToken is deployed at: ", simpleToken.target);
}


async function testCallingPrecompiledAdd() {
    const simpleToken = await ethers.getContractAt("SimpleToken", simpleTokenAddress);

    let amount1 = {
        leftX: "0x33c2cdbaf39c3d0e2365f5aeb88da4e42920ba09e25727682296af384f8466e",
        leftY: "0x28754b48dbdaef74f569bd85396099fdd713a709fdb077dac7aa30aeeae270d0",
        rightX: "0x71a5643599dc438a24ffec07da69542f7579a4c487ad2c9711b06507a0ee8f3",
        rightY: "0x8732062779187ffe5767f6025b47ef41ea9251dfd01d2ef019eb0675e82e734"
    }
    let amount2 = {
        leftX: "0xe0f2064d7dcbe663b28fa96dbe902c251d851670780861bd8385a13bc20d29e",
        leftY: "0x25ed5ebf7e085efc66d7dc4178ed77cd3ee2dfb3c8f019bcd7cc79ebb94ce195",
        rightX: "0x994f722394794acba71235a624a7eada3e971882d2dd74d253d471c439ecf3",
        rightY: "0x6a4bb175d31b7772d39674bcb3206ed2a689f4ca6ca12e367095238d20d1c54"
    }

    let tx = await simpleToken.callPrecompiledAdd(amount1.leftX, amount1.leftY, amount1.rightX, amount1.rightY,
        amount2.leftX, amount2.leftY, amount2.rightX, amount2.rightY);
}



async function testCallingSoliditySdkAdd() {
    const simpleToken = await ethers.getContractAt("SimpleToken", simpleTokenAddress);

    let amount1 = {
        leftX: "0x33c2cdbaf39c3d0e2365f5aeb88da4e42920ba09e25727682296af384f8466e",
        leftY: "0x28754b48dbdaef74f569bd85396099fdd713a709fdb077dac7aa30aeeae270d0",
        rightX: "0x71a5643599dc438a24ffec07da69542f7579a4c487ad2c9711b06507a0ee8f3",
        rightY: "0x8732062779187ffe5767f6025b47ef41ea9251dfd01d2ef019eb0675e82e734"
    }
    let amount2 = {
        leftX: "0xe0f2064d7dcbe663b28fa96dbe902c251d851670780861bd8385a13bc20d29e",
        leftY: "0x25ed5ebf7e085efc66d7dc4178ed77cd3ee2dfb3c8f019bcd7cc79ebb94ce195",
        rightX: "0x994f722394794acba71235a624a7eada3e971882d2dd74d253d471c439ecf3",
        rightY: "0x6a4bb175d31b7772d39674bcb3206ed2a689f4ca6ca12e367095238d20d1c54"
    }

    let tx = await simpleToken.callSoliditySdkAdd(amount1.leftX, amount1.leftY, amount1.rightX, amount1.rightY,
        amount2.leftX, amount2.leftY, amount2.rightX, amount2.rightY);
}




async function testCallingPrecompiledSub() {
    const simpleToken = await ethers.getContractAt("SimpleToken", simpleTokenAddress);

    let amount1 = {
        leftX: "0x21addc38a1e582a6c543b6eee5f59884818b132f0a5ea7a232a824b6d66165bc",
        leftY: "0x2f5447e04368b9c9b2e17397758e764ba19e9ea1580e63a41edf9ce9748b55d3",
        rightX: "0x9fc3bd7c38689f5b8966d7bd08e58f30862e2905ce5c303fd66293f47b4f599",
        rightY: "0x2a1055077f5e5ca82f10b50d0e79b0252b30549fe75db83fb043f84fae379375"
    }
    let amount2 = {
        leftX: "0x33c2cdbaf39c3d0e2365f5aeb88da4e42920ba09e25727682296af384f8466e",
        leftY: "0x28754b48dbdaef74f569bd85396099fdd713a709fdb077dac7aa30aeeae270d0",
        rightX: "0x71a5643599dc438a24ffec07da69542f7579a4c487ad2c9711b06507a0ee8f3",
        rightY: "0x8732062779187ffe5767f6025b47ef41ea9251dfd01d2ef019eb0675e82e734"
    }

    let tx = await simpleToken.callPrecompiledSub(amount1.leftX, amount1.leftY, amount1.rightX, amount1.rightY,
        amount2.leftX, amount2.leftY, amount2.rightX, amount2.rightY);
}


async function testCallingSoliditySdkSub() {
    const simpleToken = await ethers.getContractAt("SimpleToken", simpleTokenAddress);

    let amount1 = {
        leftX: "0x21addc38a1e582a6c543b6eee5f59884818b132f0a5ea7a232a824b6d66165bc",
        leftY: "0x2f5447e04368b9c9b2e17397758e764ba19e9ea1580e63a41edf9ce9748b55d3",
        rightX: "0x9fc3bd7c38689f5b8966d7bd08e58f30862e2905ce5c303fd66293f47b4f599",
        rightY: "0x2a1055077f5e5ca82f10b50d0e79b0252b30549fe75db83fb043f84fae379375"
    }
    let amount2 = {
        leftX: "0x33c2cdbaf39c3d0e2365f5aeb88da4e42920ba09e25727682296af384f8466e",
        leftY: "0x28754b48dbdaef74f569bd85396099fdd713a709fdb077dac7aa30aeeae270d0",
        rightX: "0x71a5643599dc438a24ffec07da69542f7579a4c487ad2c9711b06507a0ee8f3",
        rightY: "0x8732062779187ffe5767f6025b47ef41ea9251dfd01d2ef019eb0675e82e734"
    }

    let tx = await simpleToken.callSoliditySdkSub(amount1.leftX, amount1.leftY, amount1.rightX, amount1.rightY,
        amount2.leftX, amount2.leftY, amount2.rightX, amount2.rightY);
}


async function testReadPrecompiledResults() {
    const simpleToken = await ethers.getContractAt("SimpleToken", simpleTokenAddress);

    let leftX = await simpleToken.leftX();
    let leftY = await simpleToken.leftY();
    console.log("leftX:", leftX.toString(16), "leftY:", leftY.toString(16));

    let rightX = await simpleToken.rightX();
    let rightY = await simpleToken.rightY();
    console.log("rightX:", rightX.toString(16), "rightY:", rightY.toString(16));
}

async function testReadSdkResults() {
    const simpleToken = await ethers.getContractAt("SimpleToken", simpleTokenAddress);
    let sum = await simpleToken.sumToken();
    console.log(sum[0].toString(16), sum[1].toString(16));
    console.log(sum[2].toString(16), sum[3].toString(16));
}

// deploySimpleToken().then();

// testCallingPrecompiledAdd().then();
// testReadPrecompiledResults().then();
// testCallingSoliditySdkAdd().then();
// testReadSdkResults().then();
//
testCallingPrecompiledSub().then();
// testReadPrecompiledResults().then();
// testCallingSoliditySdkSub().then();
// testReadSdkResults().then();