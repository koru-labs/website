const hre = require("hardhat");
const {ethers} = hre;
const p = require('poseidon-lite');
const crypto = require("crypto");
const hardhatConfig = require('../hardhat.config');

// 配置网络和账户
const L1_RPC = hardhatConfig.networks.server_aws_L1_besu.url;
const L2_BANK_A_RPC = hardhatConfig.networks.server_aws_L2_3.url;
const L2_BANK_B_RPC = hardhatConfig.networks.server_aws_L2_4.url;

// 使用配置文件中的账户
const adminAccount = hardhatConfig.networks.server_aws_L1_besu.accounts[0];
// Bank A的账户
const bankAAdminAccount = hardhatConfig.networks.server_aws_L2_3.accounts[0];
const bankAUserAccount = hardhatConfig.networks.server_aws_L2_3.accounts[1];
const bankAUserBccount = hardhatConfig.networks.server_aws_L2_3.accounts[2];
// Bank B的账户
const bankBAdminAccount = hardhatConfig.networks.server_aws_L2_4.accounts[0];
const bankBUserAccount = hardhatConfig.networks.server_aws_L2_4.accounts[1];

// 配置Provider
const L1Provider = new ethers.JsonRpcProvider(L1_RPC, {
    name: "besu",
    chainId: 1337
});

const L2BankAProvider = new ethers.JsonRpcProvider(L2_BANK_A_RPC, {
    name: "UCL",
    chainId: 1001
});

const L2BankBProvider = new ethers.JsonRpcProvider(L2_BANK_B_RPC, {
    name: "UCL",
    chainId: 1001
});

// 创建钱包
const adminWallet = new ethers.Wallet(adminAccount, L1Provider);
// Bank A的钱包
const bankAAdminWallet = new ethers.Wallet(bankAAdminAccount, L2BankAProvider);
const bankAUserWallet = new ethers.Wallet(bankAUserAccount, L2BankAProvider);
const bankAUserBWallet = new ethers.Wallet(bankAUserBccount, L2BankAProvider);
// Bank B的钱包
const bankBAdminWallet = new ethers.Wallet(bankBAdminAccount, L2BankBProvider);
const bankBUserWallet = new ethers.Wallet(bankBUserAccount, L2BankBProvider);

// 配置已部署的合约地址
const DVP_ESCROW_ADDRESS = "0x993120Ffa250CF1879880D440cff0176752c17C2";
const L2TMSC_ADDRESS = "0x9AE96DC1196647A260Aa381c4c8697B5cDc8238a";
const L1ERC20ADDRESS = "0x0E3A70Be317A3f137d11FabC41Ce21EF86Bd3a2A";

const tokenType = 0;

// 添加一个函数来打印测试前的账户余额
async function checkBalances() {
    console.log("检查余额...");
    const L2TMSCFactory = await ethers.getContractFactory("L2TMSC");

    // 获取合约实例
    const l2tmscA = L2TMSCFactory.attach(L2TMSC_ADDRESS).connect(bankAUserWallet);
    const l2tmscB = L2TMSCFactory.attach(L2TMSC_ADDRESS).connect(bankBUserWallet);
    const l2tmscAAdmin = L2TMSCFactory.attach(L2TMSC_ADDRESS).connect(bankAAdminWallet);
    const l2tmscBAdmin = L2TMSCFactory.attach(L2TMSC_ADDRESS).connect(bankBAdminWallet);

    // 获取初始余额
    const balanceAUser = await l2tmscA.balanceOf(
        bankAUserWallet.address,
        L1ERC20ADDRESS,
        tokenType
    );
    const balanceAUserB = await l2tmscA.balanceOf(
        bankAUserBWallet.address,
        L1ERC20ADDRESS,
        tokenType
    );
    const balanceBUser = await l2tmscB.balanceOf(
        bankBUserWallet.address,
        L1ERC20ADDRESS,
        tokenType
    );
    const balanceAAdmin = await l2tmscAAdmin.balanceOf(
        bankAAdminWallet.address,
        L1ERC20ADDRESS,
        tokenType
    );
    const balanceBAdmin = await l2tmscBAdmin.balanceOf(
        bankBAdminWallet.address,
        L1ERC20ADDRESS,
        tokenType
    );

    console.log(`测试前 Bank A用户余额: ${balanceAUser}`);
    console.log(`测试前 Bank A用户B余额: ${balanceAUserB}`);
    console.log(`测试前 Bank B用户余额: ${balanceBUser}`);

    console.log(`测试前 Bank A管理员余额: ${balanceAAdmin}`);
    console.log(`测试前 Bank B管理员余额: ${balanceBAdmin}`);
}

async function main() {
    // 检查初始余额
    await checkBalances();

    // 1. 获取合约实例
    console.log("连接合约...");
    const L2TMSCFactory = await ethers.getContractFactory("L2TMSC");
    const DvpEscrowFactory = await ethers.getContractFactory("DvpEscrow");

    const dvpEscrowA = DvpEscrowFactory.attach(DVP_ESCROW_ADDRESS).connect(bankAUserWallet);
    const dvpEscrowB = DvpEscrowFactory.attach(DVP_ESCROW_ADDRESS).connect(bankBUserWallet);
    const l2tmsc = L2TMSCFactory.attach(L2TMSC_ADDRESS);

    // 2. 管理员给用户铸造代币
    console.log("管理员给用户铸造代币...");
    const mintAmount = 1000;


    // Bank A管理员给用户铸造代币
    const mintTxA = await l2tmsc.connect(bankAAdminWallet).mint(
        bankAUserWallet.address,
        L1ERC20ADDRESS,
        tokenType,
        mintAmount
    );

    // Bank B管理员给用户铸造代币
    const mintTxB = await l2tmsc.connect(bankBAdminWallet).mint(
        bankBUserWallet.address,
        L1ERC20ADDRESS,
        tokenType,
        mintAmount
    );

    await mintTxA.wait();
    await mintTxB.wait();

    // 3. 生成交易哈希
    const chunkHash1 = "0x" + crypto.randomBytes(32).toString("hex");
    const chunkHash2 = "0x" + crypto.randomBytes(32).toString("hex");
    let hash= p.poseidon3([chunkHash1, chunkHash2, 0]);
    const bundleHash= "0x" + hash.toString(16).padStart(64,"0")
    console.log("bundleHash", bundleHash);

    // 4. 用户进行跨行转账和转移测试
    const amount = 10;
    const expireTime = Math.floor(Date.now() / 1000) + 3600; // 1小时后过期

    // 用户授权
    console.log("用户为L2TMSC合约授权其在托管合约中l1中的代币...");
    const approveA = await l2tmsc.connect(bankAUserWallet).approve(
        DVP_ESCROW_ADDRESS,
        L1ERC20ADDRESS,
        tokenType,
        amount + 5
    );
    const approveB = await l2tmsc.connect(bankBUserWallet).approve(
        DVP_ESCROW_ADDRESS,
        L1ERC20ADDRESS,
        tokenType,
        amount
    );

    await approveA.wait();
    await approveB.wait();

    // 5. 执行scheduleBurnMintAndGenerate
    console.log("执行Bank A用户的scheduleBurnMintAndGenerate...");
    // Bank A的请求 - 只包含burn请求
    const scheduleRequestA = {
        index: 0,
        chunkHash: chunkHash1,
        bundleHash: bundleHash,
        expireTime: expireTime,
        burnRequests: [],
        mintRequests: [],
        burnSettleRequests: [{
            tokenScAddress: L1ERC20ADDRESS,
            tokenType: tokenType,
            account: bankAUserWallet.address,
            amount: amount,
            toBankAddress: bankBAdminWallet.address
        }],
        transferRequests: [
            {
                tokenScAddress: L1ERC20ADDRESS,
                tokenType: tokenType,
                from: bankAUserWallet.address,
                to: bankAUserBWallet.address,
                amount: 5  // 设置转账金额为5
            }
        ]
    };

    await dvpEscrowA.scheduleBurnMintAndGenerate(scheduleRequestA);

    console.log("执行Bank B用户的scheduleBurnMintAndGenerate，包含mint和transfer请求...");
    // Bank B的请求 - 包含mint请求和transfer请求
    const scheduleRequestB = {
        index: 1,
        chunkHash: chunkHash2,  // 使用不同的chunkHash
        bundleHash: bundleHash,
        expireTime: expireTime,
        burnRequests: [],
        mintRequests: [{
            tokenScAddress: L1ERC20ADDRESS,
            tokenType: tokenType,
            account: bankBUserWallet.address,
            amount: amount
        }],
        burnSettleRequests: [],
        transferRequests: []
    };

    await dvpEscrowB.scheduleBurnMintAndGenerate(scheduleRequestB);

    console.log("脚本执行完成");

    // 验证转账结果
    await checkBalances();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });