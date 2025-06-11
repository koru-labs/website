// token_http.js

const axios = require('axios');
const sleep = require('util').promisify(setTimeout);

class TokenHttpClient {
    constructor(baseURL) {
        this.client = axios.create({ baseURL });

        // 自动绑定 this 到所有方法
        this.generateMintProof = this.generateMintProof.bind(this);
        this.getMintProof = this.getMintProof.bind(this);
        this.generateDirectMint = this.generateDirectMint.bind(this);
        this.generateDirectTransfer = this.generateDirectTransfer.bind(this);
        this.generateDirectBurn = this.generateDirectBurn.bind(this);
        this.getTokenActionStatus = this.getTokenActionStatus.bind(this);
        this.getAddressBalance = this.getAddressBalance.bind(this);
        this.encodeElgamalAmount = this.encodeElgamalAmount.bind(this);
        this.decodeElgamalAmount = this.decodeElgamalAmount.bind(this);
        this.getSplitTokenList = this.getSplitTokenList.bind(this);
        this.getSplitTokenDetail = this.getSplitTokenDetail.bind(this);
        this.generateSplitToken = this.generateSplitToken.bind(this);
        this.getSplitToken = this.getSplitToken.bind(this);
    }

    async generateMintProof(request) {
        const res = await this.client.post('/v1/proof/mint', request);
        return res.data;
    }

    async getMintProof(requestId) {
        const res = await this.client.post('/v1/query/proof/mint', { request_id: requestId });
        return res.data;
    }

    async generateDirectMint(request) {
        const res = await this.client.post('/v1/direct/mint', request);
        return res.data;
    }

    async generateDirectTransfer(request) {
        const res = await this.client.post('/v1/direct/transfer', request);
        return res.data;
    }

    async generateDirectBurn(request) {
        const res = await this.client.post('/v1/direct/burn', request);
        return res.data;
    }

    async getTokenActionStatus(requestId) {
        const res = await this.client.post('/v1/query/token/status', { requestId: requestId });
        return res.data;
    }

    async getAddressBalance(scAddress, ownerAddress) {
        const res = await this.client.post('/v1/query/balance', {
            sc_address: scAddress,
            owner_address: ownerAddress
        });
        return res.data;
    }

    async encodeElgamalAmount(amount) {
        const res = await this.client.post('/v1/elgamal/encode', { amount });
        return res.data;
    }

    async decodeElgamalAmount(balance) {
        const res = await this.client.post('/v1/elgamal/decode', { balance });
        return res.data;
    }

    async getSplitTokenList(owner_address, sc_address) {
        const res = await this.client.post('/v1/query/split/tokens', {
            owner_address,
            sc_address
        });
        return res.data;
    }

    async getSplitTokenDetail(token_id) {
        const res = await this.client.post('/v1/query/split/tokens/detail', {
            token_id
        });
        return res.data;
    }

    async generateSplitToken(request) {
        const res = await this.client.post('/v1/split/token', request);
        return res.data;
    }

    async getSplitToken(requestId) {
        const res = await this.client.post('/v1/query/split/token', { request_id: requestId });
        return res.data;
    }

    // 等待异步任务完成（如 mint、split）
    async waitForProofCompletion(fetchFn, requestId, interval = 4000) {
        return new Promise(async (resolve, reject) => {
            while (true) {
                try {
                    const result = await fetchFn(requestId);
                    if (result.proof !== "") {
                        resolve(result);
                        return;
                    } else {
                        console.log("Waiting for proof. Status:", result.status);
                    }
                    await sleep(interval);
                } catch (error) {
                    console.error("Failed to query request status", error);
                    reject(error);
                    return;
                }
            }
        });
    }

    // 等待直接调用完成（如 direct mint/transfer/burn）
    async waitForActionCompletion(fetchFn, requestId, interval = 2000) {
        return new Promise(async (resolve, reject) => {
            while (true) {
                try {
                    const result = await fetchFn(requestId);
                    if (result.status === "TOKEN_ACTION_STATUS_SUC") {
                        resolve(result);
                        return;
                    } else if (result.status === "TOKEN_ACTION_STATUS_FAIL") {
                        reject(new Error("Action failed"));
                        return;
                    } else {
                        console.log("Waiting for action completion. Status:", result.status);
                    }
                    await sleep(interval);
                } catch (err) {
                    console.error("Error fetching action status", err);
                    reject(err);
                    return;
                }
            }
        });
    }
}

function createClient(url) {
    return new TokenHttpClient(url);
}

module.exports = {
    createClient
};
