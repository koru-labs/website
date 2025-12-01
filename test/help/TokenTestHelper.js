const { ethers } = require('hardhat');
const accounts = require('../../deployments/account.json');
const {
    callPrivateMint,
    callPrivateTransfer,
    callPrivateBurn,
    callPrivateBurns,
    callPrivateTransferFrom,
    callPrivateTransferFroms,
    callPrivateRevoke,
    callPrivateCancel,
    callPrivateTransfers,
    getAddressBalance,
    getSplitTokenList,
    getApproveTokenList,
    isAllowanceExists,
    getMinterAllowed,
    getTotalSupplyNode3,
    createAuthMetadata
} = require('../help/testHelp');
const {createClient} = require("../qa/token_grpc");

const TokenType = Object.freeze({ PRIVATE: '0' });
const CommentType = Object.freeze({
    TRANSFER: 'transfer',
    BURN: 'burn',
    CONVERT: 'convert',
    APPROVE: 'ApproveTransfer'
});

class TokenTestHelper {
    constructor(testConfig) {
        this.config = testConfig;
        console.log("========== test helper ==========")
        this.ethersProvider = ethers.provider;
        this.institutions = this.config.institutions;
        this.contractAddress = this.config.contractAddress;
        // console.log(this.contractAddress)
        this.wallets = this._initializeWallets();
    }

    _initializeWallets() {
        return {
            admin: new ethers.Wallet(this.institutions.node3.ethPrivateKey, this.ethersProvider),
            node4Admin: new ethers.Wallet(this.institutions.node4.ethPrivateKey, this.ethersProvider),
            minter: new ethers.Wallet(accounts.MinterKey, this.ethersProvider),
            spender: new ethers.Wallet(accounts.Spender1Key, this.ethersProvider),
            to1: new ethers.Wallet(accounts.To1PrivateKey, this.ethersProvider),
            to2: new ethers.Wallet(accounts.To2PrivateKey, this.ethersProvider),
        };
    }

    async createMetadata(privateKey) {
        return createAuthMetadata(privateKey);
    }

    // ==================== 核心操作 ====================
    async mint(toAddress, amount, minterWallet = this.wallets.minter) {
        const metadata = await this.createMetadata(minterWallet.privateKey);
        const request = {
            sc_address: this.contractAddress,
            token_type: TokenType.PRIVATE,
            from_address: minterWallet.address,
            to_address: toAddress,
            amount: String(amount)
        };

        const proof = await this.institutions.node3.client.generateMintProof(request, metadata);
        const receipt = await callPrivateMint(this.contractAddress, proof, minterWallet);
        await this.waitForCompletion(proof.request_id, metadata);
        await sleep(1000);
        return receipt;
    }

    async transfer(fromWallet, toAddress, amount, metadata) {
        const proof = await this.generateSplitProof(
            fromWallet.address,
            toAddress,
            amount,
            CommentType.TRANSFER,
            metadata
        );

        const tokenId = ethers.toBigInt(proof.transfer_token_id);
        return callPrivateTransfer(fromWallet, this.contractAddress, tokenId);
    }

    async transfers(fromWallet, toAddress, amount, count, metadata) {
        const tokenIds = [];
        for (let i = 0; i < count; i++) {
            const proof = await this.generateSplitProof(
                fromWallet.address,
                toAddress,
                amount,
                CommentType.TRANSFER,
                metadata
            );
            tokenIds.push(ethers.toBigInt(proof.transfer_token_id));
        }
        return callPrivateTransfers(fromWallet, this.contractAddress, tokenIds);
    }

    async burn(fromWallet, amount, metadata) {
        const proof = await this.generateSplitProof(
            fromWallet.address,
            null,
            amount,
            CommentType.BURN,
            metadata
        );

        const tokenId = ethers.toBigInt(proof.transfer_token_id);
        return callPrivateBurn(this.contractAddress, fromWallet, tokenId);
    }

    async burns(fromWallet, amount,count, metadata) {
        const tokenIds = [];
        for (let i = 0; i < count; i++) {
            console.log(`generateSplitProof for ${i} time`)
            const proof = await this.generateSplitProof(
                fromWallet.address,
                null,
                amount,
                CommentType.BURN,
                metadata
            );
            await sleep(1000)
            tokenIds.push(ethers.toBigInt(proof.transfer_token_id));
        }
        console.log("tokenIds", tokenIds)
        return callPrivateBurns(this.contractAddress, fromWallet, tokenIds);
    }

    async approveTransferFrom(ownerWallet, spenderWallet, toAddress, amount, ownerMetadata) {
        const request = {
            sc_address: this.contractAddress,
            token_type: TokenType.PRIVATE,
            from_address: ownerWallet.address,
            spender_address: spenderWallet.address,
            to_address: toAddress,
            amount: String(amount),
            comment: CommentType.APPROVE
        };

        const proof = await this.institutions.node3.client.generateApproveProof(request, ownerMetadata);
        await this.waitForCompletion(proof.request_id, ownerMetadata);

        const tokenId = ethers.toBigInt(proof.transfer_token_id);
        return callPrivateTransferFroms(spenderWallet, this.contractAddress, ownerWallet.address, toAddress, [tokenId]);
    }

    async approveTransferFroms(ownerWallet, spenderWallet, toAddress, amount,count, ownerMetadata) {
        let tokenIds = [];
        for (let i = 0; i < count; i++){
            const request = {
                sc_address: this.contractAddress,
                token_type: TokenType.PRIVATE,
                from_address: ownerWallet.address,
                spender_address: spenderWallet.address,
                to_address: toAddress,
                amount: String(amount),
                comment: CommentType.APPROVE
            };
            const proof = await this.institutions.node3.client.generateApproveProof(request, ownerMetadata);
            await this.waitForCompletion(proof.request_id, ownerMetadata);
            tokenIds.push(ethers.toBigInt(proof.transfer_token_id));
        }
        return callPrivateTransferFroms(spenderWallet, this.contractAddress, ownerWallet.address, toAddress, tokenIds);
    }

    async generateApproveProof(ownerAddress, toAddress, amount, ownerMetadata) {
        const request = {
            sc_address: this.contractAddress,
            token_type: TokenType.PRIVATE,
            from_address: ownerAddress,
            spender_address: this.wallets.spender.address,
            to_address: toAddress,
            amount: String(amount),
            comment: CommentType.APPROVE
        };

        const response = await this.institutions.node3.client.generateApproveProof(request, ownerMetadata);
        await this.waitForCompletion(response.request_id, ownerMetadata);
        return response;
    }

    async generateSplitProof(fromAddress, toAddress, amount, comment, metadata) {
        const request = {
            sc_address: this.contractAddress,
            token_type: TokenType.PRIVATE,
            from_address: fromAddress,
            to_address: toAddress,
            amount: String(amount),
            comment
        };

        const response = await this.institutions.node3.client.generateSplitToken(request, metadata);
        await this.waitForCompletion(response.request_id, metadata);
        return response;
    }

    async waitForCompletion(requestId, metadata) {
        return this.institutions.node3.client.waitForActionCompletion(
            this.institutions.node3.client.getTokenActionStatus,
            requestId,
            metadata
        );
    }

    // ==================== 查询操作 ====================
    async getPrivateBalance(address, institution = 'node3') {
        const metadata = await this.createMetadata(this.institutions[institution].ethPrivateKey);
        return getAddressBalance(
            this.institutions[institution].client,
            this.contractAddress,
            address,
            metadata
        );
    }

    async getPublicBalance(address) {
        const contract = await ethers.getContractAt("PrivateUSDC", this.contractAddress);
        return Number(await contract.balanceOf(address));
    }

    async getTotalSupply() {
        const metadata = await this.createMetadata(this.institutions.node3.ethPrivateKey);
        return getTotalSupplyNode3(
            this.institutions.node3.client,
            this.contractAddress,
            metadata,
            this.wallets.admin
        );
    }

    async getMinterAllowance(metadata) {
        return getMinterAllowed(this.institutions.node3.client, metadata);
    }

    // ==================== 清理操作 ====================
    async cancelAllSplitTokens(ownerWallet) {
        const metadata = await this.createMetadata(ownerWallet.privateKey);
        const result = await getSplitTokenList(
            this.institutions.node3.client,
            ownerWallet.address,
            this.contractAddress,
            metadata
        );

        for (const token of result.split_tokens || []) {
            const tokenId = ethers.toBigInt(token.token_id);
            await callPrivateCancel(this.contractAddress, ownerWallet, tokenId);
        }
        await sleep(3000);
    }

    async revokeAllApprovedTokens(ownerWallet) {
        const metadata = await this.createMetadata(ownerWallet.privateKey);
        const spenderAddress = this.wallets.spender.address;

        const result = await getApproveTokenList(
            this.institutions.node3.client,
            ownerWallet.address,
            this.contractAddress,
            spenderAddress,
            metadata
        );

        for (const token of result.split_tokens || []) {
            const tokenId = ethers.toBigInt(token.token_id);
            await callPrivateRevoke(this.contractAddress, ownerWallet, spenderAddress, tokenId);
        }
        await sleep(3000);
    }

    async checkAllowanceExists(owner, response) {
        const tokenId = ethers.toBigInt(response.transfer_token_id);
        return isAllowanceExists(
            this.contractAddress,
            owner,
            this.wallets.spender.address,
            tokenId
        );
    }

    // ==================== 转换操作 ====================
    async convertToUSDC(wallet, splitProof, metadata) {
        const tokenId = ethers.toBigInt(splitProof.transfer_token_id);
        const convertRequest = {
            token_id: splitProof.transfer_token_id,
            sc_address: this.contractAddress
        };

        const proofResult = await this.institutions.node3.client.convertToUSDC(convertRequest, metadata);
        const contract = await ethers.getContractAt("PrivateERCToken", this.contractAddress, wallet);

        const proof = proofResult.proof.map(p => ethers.toBigInt(p));
        const input = proofResult.input.map(i => ethers.toBigInt(i));

        const tx = await contract.convert2USDC(tokenId, proofResult.amount, input, proof);
        return tx.wait();
    }

    async convertToPUSDC(wallet, amount, metadata) {
        const convertRequest = {
            amount: String(amount),
            sc_address: this.contractAddress
        };

        const proofResult = await this.institutions.node3.client.convertToPUSDC(convertRequest, metadata);
        const contract = await ethers.getContractAt("PrivateERCToken", this.contractAddress, wallet);

        const elAmount = {
            cl_x: ethers.toBigInt(proofResult.elgamal.cl_x),
            cl_y: ethers.toBigInt(proofResult.elgamal.cl_y),
            cr_x: ethers.toBigInt(proofResult.elgamal.cr_x),
            cr_y: ethers.toBigInt(proofResult.elgamal.cr_y)
        };

        const token = {
            id: ethers.toBigInt(proofResult.token_id),
            owner: wallet.address,
            status: 2,
            amount: elAmount,
            to: wallet.address,
            rollbackTokenId: 0n,
            tokenType: 4,
        };

        const proof = proofResult.proof.map(p => ethers.toBigInt(p));
        const input = proofResult.input.map(i => ethers.toBigInt(i));

        const tx = await contract.convert2pUSDC(amount, token, input, proof);
        return tx.wait();
    }

    async transferFromNode4(fromWallet, toAddress, amount) {
        const metadata = await this.createMetadata(fromWallet.privateKey);
        const request = {
            sc_address: this.contractAddress,
            token_type: TokenType.PRIVATE,
            from_address: fromWallet.address,
            to_address: toAddress,
            amount: String(amount),
            comment: CommentType.TRANSFER,
        };

        const response = await this.institutions.node4.client.generateSplitToken(request, metadata);
        const requestId = response.request_id
        await this.institutions.node4.client.waitForActionCompletion(
            this.institutions.node4.client.getTokenActionStatus,
            requestId,
            metadata
        );
        const tokenId =  ethers.toBigInt(response.transfer_token_id);
        await callPrivateTransfer(fromWallet,this.contractAddress,tokenId)

    }
    async burnFromNode4(fromWallet, amount) {
        const metadata = await this.createMetadata(fromWallet.privateKey);
        const request = {
            sc_address: this.contractAddress,
            token_type: TokenType.PRIVATE,
            from_address: fromWallet.address,
            to_address: null,
            amount: String(amount),
            comment: CommentType.BURN,
        };

        const response = await this.institutions.node4.client.generateSplitToken(request, metadata);
        const requestId = response.request_id
        await this.institutions.node4.client.waitForActionCompletion(
            this.institutions.node4.client.getTokenActionStatus,
            requestId,
            metadata
        );
        const tokenId =  ethers.toBigInt(response.transfer_token_id);
        await callPrivateBurn(this.contractAddress,fromWallet,tokenId)
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { TokenTestHelper,TokenType,CommentType };