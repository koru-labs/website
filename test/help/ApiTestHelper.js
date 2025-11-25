const axios = require('axios');

class ApiClient {
    constructor(baseURL, headers) {
        this.client = axios.create({ baseURL });
        this.headers = headers;
        this.queryAccount = this.queryAccount.bind(this);
        this.updateAccountStatus = this.updateAccountStatus.bind(this);
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
        const url = `/v1/account-register`;
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

}

module.exports = { createApiClient: ApiClient.create };