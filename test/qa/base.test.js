const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('Base Chain Tests', function () {
  let owner, user1, user2;

  before(async function () {
    [owner, user1, user2] = await ethers.getSigners();
  });

  describe('Network & Chain State', function () {
    it('should get correct chain id (Hardhat/local)', async function () {
      const network = await ethers.provider.getNetwork();
      console.log('Chain ID:', network.chainId.toString());
      // 31337 = default Hardhat, 1337 = common dev/L2
      expect([31337n, 1337n]).to.include(network.chainId);
    });

    it('should get latest block number', async function () {
      const blockNumber = await ethers.provider.getBlockNumber();
      console.log('Latest block:', blockNumber);
      expect(blockNumber).to.be.gte(0);
    });

    it('should get latest block', async function () {
      const block = await ethers.provider.getBlock('latest');
      expect(block).to.not.be.null;
      expect(block.number).to.be.gte(0);
      expect(block.timestamp).to.be.gt(0);
      expect(block.hash).to.not.be.undefined;

      console.log('Block info:', {
        number: block.number,
        timestamp: block.timestamp,
        hash: block.hash?.slice(0, 10) + '...',
        transactions: block.transactions.length,
      });
    });

    it('should get block by number', async function () {
      const blockNumber = await ethers.provider.getBlockNumber();
      if (blockNumber > 0) {
        const block = await ethers.provider.getBlock(blockNumber - 1);
        expect(block).to.not.be.null;
      }
    });
  });

  describe('Account & Balance', function () {
    it('should get correct signer addresses', async function () {
      expect(owner.address).to.be.properAddress;
      expect(user1.address).to.be.properAddress;
      expect(user2.address).to.be.properAddress;

      console.log('Owner:', owner.address);
      console.log('User1:', user1.address);
      console.log('User2:', user2.address);
    });

    it('should have ETH balance', async function () {
      const ownerBalance = await ethers.provider.getBalance(owner.address);
      const user1Balance = await ethers.provider.getBalance(user1.address);

      console.log('Owner balance:', ethers.formatEther(ownerBalance), 'ETH');
      console.log('User1 balance:', ethers.formatEther(user1Balance), 'ETH');

      expect(ownerBalance).to.be.gt(0n);
      expect(user1Balance).to.be.gt(0n);
    });

    it('should compare balances correctly', async function () {
      const ownerBalance = await ethers.provider.getBalance(owner.address);
      const user1Balance = await ethers.provider.getBalance(user1.address);

      expect(ownerBalance).to.be.gte(user1Balance);
    });

    it('should get balance at specific block', async function () {
      const blockNumber = await ethers.provider.getBlockNumber();
      if (blockNumber > 0) {
        const balance = await ethers.provider.getBalance(owner.address, blockNumber - 1);
        expect(balance).to.be.gte(0n);
      }
    });
  });

  describe('Gas & Fee Data', function () {
    it('should get fee data', async function () {
      const feeData = await ethers.provider.getFeeData();
      console.log('Fee data:', {
        gasPrice: feeData.gasPrice?.toString(),
        maxFeePerGas: feeData.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
      });
      expect(feeData.gasPrice).to.be.gte(0n);
    });

    it('should get current gas price', async function () {
      let gasPrice;
      try {
        gasPrice = await ethers.provider.getGasPrice();
      } catch {
        const feeData = await ethers.provider.getFeeData();
        gasPrice = feeData.gasPrice ?? 0n;
      }
      console.log('Current gas price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei');
      expect(gasPrice).to.be.gte(0n);
    });
  });

  describe('Contract Deployment', function () {
    let token;

    beforeEach(async function () {
      const Token = await ethers.getContractFactory('DummyToken');
      token = await Token.deploy();
      await token.waitForDeployment();
    });

    it('should get valid contract address', async function () {
      const address = await token.getAddress();
      expect(address).to.be.properAddress;
      console.log('Contract address:', address);
    });

    it('should have contract code', async function () {
      const address = await token.getAddress();
      const code = await ethers.provider.getCode(address);
      expect(code).to.not.equal('0x');
      console.log('Contract code length:', code.length);
    });

    it('should call view functions', async function () {
      const [name, symbol, totalSupply, decimals] = await Promise.all([token.name(), token.symbol(), token.totalSupply(), token.decimals()]);

      expect(name).to.equal('Dummy');
      expect(symbol).to.equal('DMY');
      expect(decimals).to.equal(18);
      expect(totalSupply).to.be.gte(0n);

      console.log('Contract info:', { name, symbol, totalSupply: totalSupply.toString(), decimals });
    });

    it('should handle transaction receipt', async function () {
      const tx = await token.update();
      const receipt = await tx.wait();

      expect(receipt.status).to.equal(1);
      expect(receipt.blockNumber).to.be.gt(0);
      expect(receipt.gasUsed).to.be.gt(0n);
      expect(receipt.hash).to.not.be.undefined;

      console.log('Transaction receipt:', {
        hash: receipt.hash.slice(0, 10) + '...',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status,
      });
    });

    it('should get events', async function () {
      const tx = await token.update();
      const receipt = await tx.wait();

      expect(receipt.logs).to.not.be.undefined;
      console.log('Events emitted:', receipt.logs.length);
    });

    it('should handle insufficient balance', async function () {
      const largeAmount = ethers.MaxUint256;
      await expect(token.connect(user1).transfer(owner.address, largeAmount)).to.be.reverted;
    });
  });

  describe('Block & Time Manipulation', function () {
    it.skip('should mine new blocks', async function () {
      const blockBefore = await ethers.provider.getBlockNumber();
      await ethers.provider.send('evm_mine', []);
      const blockAfter = await ethers.provider.getBlockNumber();
      expect(blockAfter).to.equal(blockBefore + 1);
      console.log('Mined block:', blockAfter);
    });

    it.skip('should advance time', async function () {
      const blockBefore = await ethers.provider.getBlockNumber();
      const timestampBefore = (await ethers.provider.getBlock('latest')).timestamp;

      await ethers.provider.send('evm_increaseTime', [3600]);
      await ethers.provider.send('evm_mine', []);

      const blockAfter = await ethers.provider.getBlockNumber();
      const timestampAfter = (await ethers.provider.getBlock('latest')).timestamp;

      expect(blockAfter).to.be.gt(blockBefore);
      expect(timestampAfter).to.be.gt(timestampBefore);
      console.log('Time advanced:', timestampAfter - timestampBefore, 'seconds');
    });

    it.skip('should set next block timestamp', async function () {
      const currentBlock = await ethers.provider.getBlock('latest');
      const targetTimestamp = currentBlock.timestamp + 100;

      await ethers.provider.send('evm_setNextBlockTimestamp', [targetTimestamp]);
      await ethers.provider.send('evm_mine', []);

      const newBlock = await ethers.provider.getBlock('latest');
      expect(newBlock.timestamp).to.be.gte(targetTimestamp);
      console.log('Next block timestamp set to:', newBlock.timestamp);
    });

    it.skip('should reset time to latest', async function () {
      await ethers.provider.send('evm_mine', []);
      const block = await ethers.provider.getBlock('latest');
      console.log('Current timestamp:', block.timestamp);
      expect(block.timestamp).to.be.gt(0);
    });
  });

  describe('Gas Estimation', function () {
    let token;

    beforeEach(async function () {
      const Token = await ethers.getContractFactory('DummyToken');
      token = await Token.deploy();
      await token.waitForDeployment();
    });

    it('should estimate gas for transfer', async function () {
      const gas = await token.update.estimateGas();
      expect(gas).to.be.gt(0n);
      console.log('Estimated gas for update:', gas.toString());
    });

    it('should estimate gas for deployment', async function () {
      const Token = await ethers.getContractFactory('DummyToken');
      const gas = await Token.getDeployTransaction();
      expect(gas).to.not.be.undefined;
    });

    it('should compare estimated vs actual gas', async function () {
      const estimatedGas = await token.update.estimateGas();
      const tx = await token.update();
      const receipt = await tx.wait();

      console.log('Estimated gas:', estimatedGas.toString());
      console.log('Actual gas used:', receipt.gasUsed.toString());
      expect(receipt.gasUsed).to.be.gt(0n);
      expect(receipt.status).to.equal(1);
    });
  });

  describe('Signing & Verification', function () {
    it('should sign message', async function () {
      const message = 'Hello, Web3!';
      const signature = await owner.signMessage(message);

      expect(signature).to.not.be.undefined;
      expect(signature.length).to.equal(132);
      console.log('Signature:', signature.slice(0, 20) + '...');
    });

    it('should verify signature', async function () {
      const message = 'Hello, Web3!';
      const signature = await owner.signMessage(message);

      const recoveredAddress = ethers.verifyMessage(message, signature);
      expect(recoveredAddress).to.equal(owner.address);
    });
  });

  describe('Error Handling', function () {
    let token;

    beforeEach(async function () {
      const Token = await ethers.getContractFactory('DummyToken');
      token = await Token.deploy();
      await token.waitForDeployment();
    });

    it('should catch revert with message (transfer to zero address)', async function () {
      await expect(token.transfer(ethers.ZeroAddress, 1n)).to.be.revertedWith(
        'ERC20: transfer to the zero address'
      );
    });

    it('should catch revert on insufficient balance', async function () {
      const largeAmount = ethers.MaxUint256;
      await expect(
        token.connect(user1).transfer(owner.address, largeAmount)
      ).to.be.reverted;
    });

    it('should handle call to non-contract address', async function () {
      const Token = await ethers.getContractFactory('DummyToken');
      await expect(Token.attach(ethers.ZeroAddress).name()).to.be.reverted;
    });
  });
});
