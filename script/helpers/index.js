/**
 * 测试辅助函数统一导出模块
 *
 * 使用方式:
 * const helpers = require('./script/helpers');
 * helpers.callPrivateMint(...)
 * helpers.getAddressBalance(...)
 *
 * 或按需导入:
 * const { callPrivateMint, sleep } = require('./script/helpers');
 */

// 工具函数模块
const utils = require('./utils');
const token = require('./token');
const balance = require('./balance');
const account = require('./account');
const blacklist = require('./blacklist');
const events = require('./events');
const config = require('./config');

// 重新导出所有函数
module.exports = {
  // 工具函数
  ...utils,
  // 代币操作
  ...token,
  // 余额查询
  ...balance,
  // 账户操作
  ...account,
  // 黑名单操作
  ...blacklist,
  // 事件查询
  ...events,
  // 配置相关
  ...config,

  // 额外导出: assertEventsContain (从 chai 导入)
  assertEventsContain: (events, expectedEventNames) => {
    const { expect } = require('chai');
    const actualEventNames = events
      .filter((event) => event && event.args && event.args.length > 3)
      .map((event) => event.args[3]);

    expectedEventNames.forEach((eventName) => {
      expect(actualEventNames).to.include(eventName);
    });
  },
};
