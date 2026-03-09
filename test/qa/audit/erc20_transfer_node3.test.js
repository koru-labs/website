/**
 * Audit: 在 Node3 上发送标准 ERC20 transfer
 *
 * 所有逻辑与配置仅在 audit 目录内，不依赖 native 用例。
 * 环境变量（可选）：
 *   AUDIT_NODE3_RPC - Node3 RPC URL，未设置时使用下方 NODE_CONFIGS[2].httpUrl
 *   AUDIT_NODE3_KEY - Node3 签名私钥，未设置时使用 account.json OwnerKey（Node3 admin）
 *   ERC20_TOKEN_ADDRESS - 已部署的 ERC20 地址，未设置时在 Node3 上部署 DummyERC20
 */

const { expect } = require('chai');
const { ethers } = require('hardhat');
const accounts = require('../../../deployments/account.json');

const l1CustomNetwork = { name: 'BESU', chainId: 1337 };
const providerOptions = { batchMaxCount: 10, staticNetwork: true };

const NODE_CONFIGS = [
  { name: 'Node 1', httpUrl: 'http://l2-node1-native.hamsa-ucl.com:8545' },
  { name: 'Node 2', httpUrl: 'http://l2-node2-native.hamsa-ucl.com:8545' },
  { name: 'Node 3', httpUrl: 'http://l2-node3-native.hamsa-ucl.com:8545', key: accounts.OwnerKey },
];

describe('Audit: ERC20 transfer on Node3', function () {
  this.timeout(120000);

  let node3Provider;
  let node3Wallet;
  let erc20Token;

  before(async function () {
    const node3Config = NODE_CONFIGS[2];
    const rpcUrl = process.env.AUDIT_NODE3_RPC || node3Config.httpUrl;
    const key = process.env.AUDIT_NODE3_KEY || node3Config.key;
    node3Provider = new ethers.JsonRpcProvider(rpcUrl, l1CustomNetwork, providerOptions);
    node3Wallet = new ethers.Wallet(key, node3Provider);

    const existingAddress = process.env.ERC20_TOKEN_ADDRESS;
    if (existingAddress) {
      const ERC20_ABI = [
        'function transfer(address to, uint256 amount) returns (bool)',
        'function balanceOf(address account) view returns (uint256)',
      ];
      erc20Token = new ethers.Contract(existingAddress, ERC20_ABI, node3Wallet);
      console.log('[Audit ERC20] Using existing token at', existingAddress);
    } else {
      const DummyERC20 = await ethers.getContractFactory('DummyERC20');
      const initialSupply = ethers.parseEther('1000000');
      erc20Token = await DummyERC20.connect(node3Wallet).deploy('DevL2Token', 'DL2', initialSupply);
      await erc20Token.waitForDeployment();
      console.log('[Audit ERC20] Deployed on Node3 at', await erc20Token.getAddress());
    }
  });

  it('should send ERC20 transfer from Node3 to recipient', async function () {
    const recipient = accounts.To1;
    const amount = ethers.parseEther('100');
    const balanceBefore = await erc20Token.balanceOf(recipient);

    const tx = await erc20Token.transfer(recipient, amount, { gasLimit: 100000 });
    const receipt = await tx.wait();

    expect(receipt.status).to.equal(1);
    const balanceAfter = await erc20Token.balanceOf(recipient);
    expect(balanceAfter - balanceBefore).to.equal(amount);
    console.log('[Audit ERC20] Transfer successful, tx:', tx.hash, 'recipient:', recipient);
  });
});
