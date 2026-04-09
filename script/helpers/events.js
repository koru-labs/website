const { ethers } = require('hardhat');
const { config, l1Provider } = require('./utils');

/**
 * 事件查询模块
 * 包含获取合约事件的功能
 */

/**
 * 获取合约事件
 * @param {string} eventName - 事件名称
 * @param {number} startBlockOffset - 起始区块偏移量
 * @param {number} batchSize - 批次大小
 */
async function getEvents(eventName, startBlockOffset = 3000, batchSize = 1000) {
  try {
    const event_address = config.contracts.PrivateERCToken;
    const l1Bridge = await ethers.getContractAt('PrivateUSDC', event_address);

    const endBlock = await l1Provider.getBlockNumber();
    const startBlock = endBlock - startBlockOffset;

    for (let fromBlock = startBlock; fromBlock <= endBlock; fromBlock += batchSize) {
      const toBlock = Math.min(fromBlock + batchSize - 1, endBlock);

      console.log(`Fetching events  from block ${fromBlock} to ${toBlock}...`);
      console.log('eventName:', eventName);
      const events = await l1Bridge.queryFilter(eventName, fromBlock, toBlock);
      console.log('events:', events);
      if (events.length === 0) {
        console.log(`No events found from block ${fromBlock} to ${toBlock}`);
      }
      events.forEach((event) => {
        console.log('Event Name:', event.eventName);
        console.log('Event Data:', event.args);
        console.log('-----------------------------');
      });
    }
  } catch (err) {
    console.error('Error fetching events:', err);
  }
}

/**
 * 获取 Hamsa L2 事件
 * @param {number} blockRange - 区块范围
 */
async function getHamsaEvents(blockRange = 100) {
  try {
    const event_address = config.contracts.HamsaL2Event;
    const l1Bridge = await ethers.getContractAt('HamsaL2Event', event_address);

    const endBlock = await l1Provider.getBlockNumber();
    const startBlock = Math.max(0, endBlock - blockRange);

    console.log(`Fetching events from block ${startBlock} to ${endBlock}...`);

    const events = await l1Bridge.queryFilter('EventReceived', startBlock, endBlock);

    if (events.length === 0) {
      console.log(`No events found from block ${startBlock} to ${endBlock}`);
      return [];
    } else {
      console.log(`Found ${events.length} events from block ${startBlock} to ${endBlock}`);
      events.sort((a, b) => b.blockNumber - a.blockNumber);
      return events;
    }
  } catch (err) {
    console.error('Error fetching events:', err);
    return [];
  }
}

module.exports = {
  getEvents,
  getHamsaEvents,
};
