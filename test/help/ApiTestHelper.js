const axios = require('axios');

class ApiClient {
    constructor(baseURL, headers) {
        this.client = axios.create({ baseURL });
        this.headers = headers;
        this.queryAssets = this.queryAssets.bind(this);
        this.generateMintProof = this.generateMintProof.bind(this);
        this.generateSplitProof = this.generateSplitProof.bind(this);
        this.queryAccount = this.queryAccount.bind(this);
        this.updateAccountStatus = this.updateAccountStatus.bind(this);
        this.queryAccountActionStatus = this.queryAccountActionStatus.bind(this);
        this.regesterAccount = this.regesterAccount.bind(this);
        this.updateAccount = this.updateAccount.bind(this);
        this.generateApproveProof = this.generateApproveProof.bind(this);
        this.queryApproveTokens = this.queryApproveTokens.bind(this);
        this.queryBalance = this.queryBalance.bind(this);
        this.queryMintAllowance = this.queryMintAllowance.bind(this);
        this.querySplitTokens = this.querySplitTokens.bind(this);
        this.queryTokenAmount = this.queryTokenAmount.bind(this);
        this.queryTokenStatus = this.queryTokenStatus.bind(this);
        this.updateSmartContractStatus = this.updateSmartContractStatus.bind(this);
        this.queryBankManagers = this.queryBankManagers.bind(this);
        this.queryBankProfile = this.queryBankProfile.bind(this);
        this.usdcConvert = this.usdcConvert.bind(this);
        this.pusdcConvert = this.pusdcConvert.bind(this);
        this.amountEncode = this.amountEncode.bind(this);
        this.amountDecode = this.amountDecode(this)
    }

    static async create(baseURL) {
        const tmp = axios.create({ baseURL });
        const { data } = await tmp.get('/v1/test/auth-with-coin');
        const headers = {
            accept: 'application/json',
            'Grpc-Metadata-Message': data.signatureAndMessage[0].message,
            'Grpc-Metadata-Signature': data.signatureAndMessage[0].signature,
            'content-type': 'application/json',
        };
        return new ApiClient(baseURL, headers);
    }
    async queryAccount(request) {
        const url = '/v1/account-query';
        // console.log(`[AXIOS] POST ${this.client.defaults.baseURL}${url}`);
        // console.log('[AXIOS] headers:', this.headers);
        // console.log('[AXIOS] body:', request);

        const { data } = await this.client.post(
            url,
            request,
            { headers: this.headers, timeout: 15000 }
        );
        return data;
    }
    async updateAccountStatus(request) {
        const url = '/v1/account-status-update';
        const { data } = await this.client.post(
            url,
            request,
            { headers: this.headers, timeout: 15000 }
        );
        return data;
    }
    async queryAccountActionStatus(requestId) {
        const url = `/v1/account-actions-async/${requestId}`;
        const { data } = await this.client.get(
            url,
            { headers: this.headers, timeout: 15000 }
        );
        return data;
    }
    async regesterAccount(request) {
        const url = '/v1/account-register';
        const { data } = await this.client.post(
            url,
            request,
            { headers: this.headers, timeout: 15000 }
        );
        return data;
    }
    async updateAccount(request) {
        const url = '/v1/account-update';
        const { data } = await this.client.post(
            url,
            request,
            { headers: this.headers, timeout: 15000 }
        );
        return data;
    }
    async generateMintProof(request) {
        const url = '/v1/mint-proof-generate';
        // Add detailed request logging
        // console.log(`[AXIOS] POST ${this.client.defaults.baseURL}${url}`);
        // console.log('[AXIOS] Request Headers:', JSON.stringify(this.headers, null, 2));
        // console.log('[AXIOS] Request Body:', JSON.stringify(request, null, 2));

        const { data } = await this.client.post(
            url,
            request,
            { headers: this.headers, timeout: 15000 }
        );
        // Optionally log response data
        // console.log('[AXIOS] Response Data:', JSON.stringify(data, null, 2));

        return data;
    }
    async generateSplitProof(request) {
        const url = '/v1/split-proof-generate';
        // Add detailed request logging
        // console.log(`[AXIOS] POST ${this.client.defaults.baseURL}${url}`);
        // console.log('[AXIOS] Request Headers:', JSON.stringify(this.headers, null, 2));
        // console.log('[AXIOS] Request Body:', JSON.stringify(request, null, 2));

        const { data } = await this.client.post(
            url,
            request,
            { headers: this.headers, timeout: 15000 }
        );
        // Optionally log response data
        // console.log('[AXIOS] Response Data:', JSON.stringify(data, null, 2));

        return data;
    }
    async generateApproveProof(request) {
        const url = '/v1/approve-proof-generate';
        const { data } = await this.client.post(
            url,
            request,
            { headers: this.headers, timeout: 15000 }
        );
        return data;
    }
    async queryApproveTokens(request) {
        const url = '/v1/approve-tokens-query';
        const { data } = await this.client.post(
            url,
            request,
            { headers: this.headers, timeout: 15000 }
        );
        return data;
    }
    async queryBalance(request) {
        const url = '/v1/balance-query';
        const { data } = await this.client.post(
            url,
            request,
            { headers: this.headers, timeout: 15000 }
        );
        return data;
    }
    async queryMintAllowance(request) {
        const url = '/v1/mint-allowance-query';
        const { data } = await this.client.post(
            url,
            request,
            { headers: this.headers, timeout: 15000 }
        );
        return data;
    }
    async querySplitTokens(request) {
        const url = '/v1/split-tokens-query';
        const { data } = await this.client.post(
            url,
            request,
            { headers: this.headers, timeout: 15000 }
        );
        return data;
    }
    async queryTokenAmount(request) {
        const url = '/v1/token-amount-query';
        const { data } = await this.client.post(
            url,
            request,
            { headers: this.headers, timeout: 15000 }
        );
        return data;
    }
    async queryTokenStatus(request) {
        const url = '/v1/token-status-query';
        const { data } = await this.client.post(
            url,
            request,
            { headers: this.headers, timeout: 15000 }
        );
        return data;
    }
    async updateSmartContractStatus(request) {
        const url = '/v1/smart-contract-status-update';
        const { data } = await this.client.post(
            url,
            request,
            { headers: this.headers, timeout: 15000 }
        );
        return data;
    }
    async queryAssets(request) {
        const url = '/v1/assets-query';
        const { data } = await this.client.post(
            url,
            request,
            { headers: this.headers, timeout: 15000 }
        );
        return data;
    }
    async queryBankManagers(request) {
        const url = '/v1/bank-managers-query';
        const { data } = await this.client.post(
            url,
            request,
            { headers: this.headers, timeout: 15000 }
        );
        return data;
    }
    async queryBankProfile(request) {
        const url = '/v1/bank-profile-query';
        const { data } = await this.client.post(
            url,
            request,
            { headers: this.headers, timeout: 15000 }
        );
        return data;
    }
    async usdcConvert(request) {
        const url = '/v1/usdc-convert';
        const { data } = await this.client.post(
            url,
            request,
            { headers: this.headers, timeout: 15000 }
        );
        return data;
    }
    async pusdcConvert(request) {
        const url = '/v1/pusdc-convert';
        const { data } = await this.client.post(
            url,
            request,
            { headers: this.headers, timeout: 15000 }
        );
        return data;
    }
    async amountDecode(request) {
        const url = '/v1/amount-decode';
        const { data } = await this.client.post(
            url,
            request,
            { headers: this.headers, timeout: 15000 }
        );
        return data;
    }
    async amountEncode(request) {
        const url = '/v1/amount-encode';
        const { data } = await this.client.post(
            url,
            request,
            { headers: this.headers, timeout: 15000 }
        );
        return data;
    }


}

module.exports = { createApiClient: ApiClient.create };