const { createAuthMetadata, sleep } = require('./utils');

/**
 * 账户操作模块
 * 包含用户注册、账户更新、状态更新等功能
 */

/**
 * 注册用户
 * @param {string} privateKey - 私钥
 * @param {object} client - gRPC 客户端
 * @param {string} userAddress - 用户地址
 * @param {string} role - 角色
 */
async function registerUser(privateKey, client, userAddress, role) {
  const metadata = await createAuthMetadata(privateKey);
  const request = {
    account_address: userAddress,
    account_roles: role, // minter, admin, normal
    first_name: 'jh',
    last_name: 'test',
    email: 'jhtest@hamsapay.com',
    phone_number: '234-56789',
  };

  try {
    const response = await client.registerAccount(request, metadata);
    console.log('registerAccount response:', response);
    await sleep(3000);
    if (response.status !== 'ASYNC_ACTION_STATUS_FAIL') {
      const actionRequest = {
        request_id: response.request_id,
      };
      const actionResponse = await client.getAsyncAction(actionRequest, metadata);
      console.log('action response:', actionResponse);
      return actionResponse;
    }
  } catch (error) {
    console.error('gRPC call failed:', error);
    return error;
  }
}

/**
 * 更新账户状态
 * @param {string} privateKey - 私钥
 * @param {object} client - gRPC 客户端
 * @param {string} userAddress - 用户地址
 * @param {number} status - 状态
 */
async function updateAccountStatus(privateKey, client, userAddress, status) {
  try {
    const metadata = await createAuthMetadata(privateKey);

    const request = {
      account_address: userAddress,
      account_status: status, // 0: inactive, 2: active
    };
    const response = await client.updateAccountStatus(request, metadata);
    console.log('Success:', response);
    if (response.status !== 'ASYNC_ACTION_STATUS_FAIL') {
      await sleep(3000);
      const actionRequest = {
        request_id: response.request_id,
      };
      const actionResponse = await client.getAsyncAction(actionRequest, metadata);
      console.log('action response:', actionResponse);
      return actionResponse;
    }
    if (response.status === 'ASYNC_ACTION_STATUS_FAIL') {
      const error = new Error('Server responded with failure');
      error.details = response.message;
      throw error;
    }
  } catch (error) {
    console.error('gRPC call failed:', error);
    return error;
  }
}

/**
 * 更新账户
 * @param {string} privateKey - 私钥
 * @param {object} client - gRPC 客户端
 * @param {object} actionRequest - 操作请求
 */
async function updateAccount(privateKey, client, actionRequest) {
  try {
    const metadata = await createAuthMetadata(privateKey);
    const actionResponse = await client.updateAccount(actionRequest, metadata);
    await sleep(3000);
    console.log('action response:', actionResponse);
    return actionResponse;
  } catch (error) {
    console.error('gRPC call failed:', error);
    return error;
  }
}

/**
 * 获取账户信息
 * @param {string} privateKey - 私钥
 * @param {object} client - gRPC 客户端
 * @param {string} userAddress - 用户地址
 */
async function getAccount(privateKey, client, userAddress) {
  const metadata = await createAuthMetadata(privateKey);
  const actionRequest = {
    account_address: userAddress,
  };
  const actionResponse = await client.getAccount(actionRequest, metadata);
  console.log('action response:', actionResponse);
  return actionResponse;
}

/**
 * 检查账户是否存在
 * @param {string} privateKey - 私钥
 * @param {object} client - gRPC 客户端
 * @param {string} address - 地址
 */
async function checkAccountExists(privateKey, client, address) {
  try {
    await getAccount(privateKey, client, address);
    return true;
  } catch (error) {
    return error.details?.includes('failed to get current account') ? false : null;
  }
}

module.exports = {
  registerUser,
  updateAccount,
  updateAccountStatus,
  getAccount,
  checkAccountExists,
};
