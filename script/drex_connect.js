const hre = require("hardhat");
const { ethers } = hre;
const p = require('poseidon-lite');
const crypto = require("crypto");
const { copyFileSync } = require("fs");

const customNetwork = {
    name: "UCL",
    chainId: 1001
};

const options = {
    batchMaxCount: 1,
    staticNetwork: true
};


const centralBankRpcUrl = "http://18.183.58.228:8123";
const bank1RpcUrl = "http://18.183.58.228:8124";
const bank2RpcUrl = "http://18.183.58.228:8125";
const centralBankProvider = new ethers.JsonRpcProvider(centralBankRpcUrl, customNetwork, options);
const bank1Provider = new ethers.JsonRpcProvider(bank1RpcUrl, customNetwork, options);
const bank2Provider = new ethers.JsonRpcProvider(bank2RpcUrl, customNetwork, options);

const centralBankEscrotingAddress = "0x993120Ffa250CF1879880D440cff0176752c17C2";
const bank1EscrotingAddress = "0x993120Ffa250CF1879880D440cff0176752c17C2";
const bank2EscrotingAddress = "0x993120Ffa250CF1879880D440cff0176752c17C2";

class BankInfo {
    constructor (address, privateKey, cnpj8, provider, dvpEscrotingAddress) {
        this.address = address;
        this.privateKey = privateKey;
        this.cnpj8 = cnpj8;
        this.provider = provider;
        this.dvpEscrotingAddress = dvpEscrotingAddress;
    }
}

const selicInfo = new BankInfo("0x9E46a01F1A486095A073BFeB4B3c9e106dfB0e7E", "0x6741001f80a9194d8d65f04d8b420940e83babc1a1dea5afa8775c395ed14ae8", 12345678, centralBankProvider, centralBankEscrotingAddress);
const centralBankInfo = new BankInfo("0x9E46a01F1A486095A073BFeB4B3c9e106dfB0e7E", "0x6741001f80a9194d8d65f04d8b420940e83babc1a1dea5afa8775c395ed14ae8", 12345678, centralBankProvider, centralBankEscrotingAddress);
const bank1Info = new BankInfo("0xa1608Fc30958cD232de765b003D4f3A4995049b6", "0x0740d6df0c4fb2cc880f14a72ac7118ede6d0613417ef35a92a73d9344ad0d0b", 77765432, bank1Provider, bank1EscrotingAddress);
const bank2Info = new BankInfo("0xe46Fe251dd1d9FfC247bc0DDb6D61e4EE4416ecB", "0x555332672ce947d150d23a36bf3847078291f89bda7073829bb718c77d626787", 23578902, bank2Provider, bank2EscrotingAddress);


class ClientInfo {
    constructor (taxId, bankNumber, account, branch, wallet, registered, owner, privateKey) {
        this.taxId = taxId;
        this.bankNumber = bankNumber;
        this.account = account;
        this.branch = branch;
        this.wallet = wallet;
        this.registered = registered;
        this.owner = owner;
        this.privateKey = privateKey;
    }
}

const client1Address = "0x23eabdd1584Cc04E5962524F48B9c6f4d1Ef98cD";
const client1PrivateKey = "0x5f990426b4495f3d4f089ce948dca5365bf00d72b52c4e0f59bfdba1bd4593e0";

const client2Address = "0x977954402132612Cc1d144E57e16eaf0E4cbcfcB";
const client2PrivateKey = "0xc5446fda20f0b6ae6c24ababad898faa1251cc524783fabf4d84a673c41b74ef";

const client3Address = "0xf837a5d778a146CEDa51179c1744F6160735E2D5";
const client3PrivateKey = "e639ad85e461349045fd6b4b4d920e1cfd81bb36c6c5d049395587c4f8c4938d";

const client1 = new ClientInfo(15355016212, 121, 15355016212, 121, client1Address, true, bank1Info.address, client1PrivateKey);
const client2 = new ClientInfo(15355016213, 122, 15355016213, 122, client2Address, true, bank2Info.address, client2PrivateKey);
const client3 = new ClientInfo(15355016214, 121, 15355016214, 121, client3Address, true, bank1Info.address, client3PrivateKey);


let addressDiscoveryAddress = "0x4918A3b40Cd2581766e3AED39d19B6cd7952Ec83";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function ethBalance(provider, account) {
    const balance = await provider.getBalance(account);
    console.log("balance", balance);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * This function deploys a set of contracts on the central bank node. It includes the deployment of:
 * - AddressDiscovery.sol
 * - KeyDictionary.sol
 * - RealDigital.sol
 * - RealDigitalDefaultAccount.sol
 * - RealDigitalEnableAccount.sol
 * - STR.sol
 * - TPFt.sol
 *
 * After deployment, it updates the addresses of these contracts in the AddressDiscovery contract.
 */
async function deployOnCentralBankNode() {

    let centralBankWallet = new ethers.Wallet(centralBankInfo.privateKey, centralBankInfo.provider);

    // Deploy the AddressDiscovery contract, which is used to map contract names to their addresses.
    console.log("deploying AddressDiscovery");
    let addressDiscoveryFactory = await ethers.getContractFactory("AddressDiscovery", centralBankWallet);
    let addressDiscoveryContract = await addressDiscoveryFactory.deploy(centralBankInfo.address);
    await addressDiscoveryContract.waitForDeployment();
    console.log("AddressDiscovery address:", addressDiscoveryContract.target);
    addressDiscoveryAddress = addressDiscoveryContract.target;

    addressDiscoveryContract = await getAddressDiscovery();

    // Deploy the RealDigital contract, which represents a digital asset.
    console.log("deploying RealDigital");
    let realDigitalFactory = await ethers.getContractFactory("RealDigital", centralBankWallet);
    let realDigitalContract = await realDigitalFactory.deploy("BRL", "BRL", centralBankInfo.address);
    await realDigitalContract.waitForDeployment();
    console.log("RealDigital address:", realDigitalContract.target);

    // Deploy the KeyDictionary contract, which maps keys to customer data.
    console.log("deploying KeyDictionary");
    let keyDictionaryFactory = await ethers.getContractFactory("KeyDictionary", centralBankWallet);
    let keyDictionaryContract = await keyDictionaryFactory.deploy(realDigitalContract);
    await keyDictionaryContract.waitForDeployment();
    console.log("KeyDictionary address:", keyDictionaryContract.target);

    // Deploy the RealDigitalDefaultAccount contract, which handles default accounts for RealDigital assets.
    console.log("deploying RealDigitalDefaultAccount");
    let realDigitalDefaultAccountFactory = await ethers.getContractFactory("RealDigitalDefaultAccount", centralBankWallet);
    let realDigitalDefaultAccountContract = await realDigitalDefaultAccountFactory.deploy(realDigitalContract, centralBankInfo.address, centralBankInfo.address);
    await realDigitalDefaultAccountContract.waitForDeployment();
    console.log("RealDigitalDefaultAccount address:", realDigitalDefaultAccountContract.target);

    // Deploy the RealDigitalEnableAccount contract, which enables accounts for RealDigital assets.
    console.log("deploying RealDigitalEnableAccount");
    let realDigitalEnableAccountFactory = await ethers.getContractFactory("RealDigitalEnableAccount", centralBankWallet);
    let realDigitalEnableAccountContract = await realDigitalEnableAccountFactory.deploy(centralBankInfo.address);
    await realDigitalEnableAccountContract.waitForDeployment();
    console.log("RealDigitalEnableAccount address:", realDigitalEnableAccountContract.target);

    // Deploy the STR contract, which is used for some other purpose.
    console.log("deploying STR");
    let strFactory = await ethers.getContractFactory("STR", centralBankWallet);
    let strContract = await strFactory.deploy(realDigitalContract);
    await strContract.waitForDeployment();
    console.log("STR address:", strContract.target);

    // Deploy the TPFt contract, which is the main contract for token processing and management.
    console.log("deploying TPFt");
    let tpftFactory = await ethers.getContractFactory("TPFt", centralBankWallet);
    let tpftContract = await tpftFactory.deploy(realDigitalContract, addressDiscoveryContract);
    await tpftContract.waitForDeployment();
    console.log("TPFt address:", tpftContract.target);

    // Calculate the hash for RealDigital contract name and update its address in AddressDiscovery.
    console.log("updating RealDigital address in AddressDiscovery");
    const realDigitalHash = ethers.keccak256(ethers.toUtf8Bytes("RealDigital"));
    await addressDiscoveryContract.updateAddress(realDigitalHash, realDigitalContract.target);
    await sleep(3000);

    // Calculate the hash for KeyDictionary contract name and update its address in AddressDiscovery.
    console.log("updating KeyDictionary address in AddressDiscovery");
    const keyDictionaryHash = ethers.keccak256(ethers.toUtf8Bytes("KeyDictionary"));
    await addressDiscoveryContract.updateAddress(keyDictionaryHash, keyDictionaryContract.target);
    await sleep(3000);

    // Calculate the hash for RealDigitalDefaultAccount contract name and update its address in AddressDiscovery.
    console.log("updating RealDigitalDefaultAccount address in AddressDiscovery");
    const realDigitalDefaultAccountHash = ethers.keccak256(ethers.toUtf8Bytes("RealDigitalDefaultAccount"));
    await addressDiscoveryContract.updateAddress(realDigitalDefaultAccountHash, realDigitalDefaultAccountContract.target);
    await sleep(3000);

    // Calculate the hash for RealDigitalEnableAccount contract name and update its address in AddressDiscovery.
    console.log("updating RealDigitalEnableAccount address in AddressDiscovery");
    const realDigitalEnableAccountHash = ethers.keccak256(ethers.toUtf8Bytes("RealDigitalEnableAccount"));
    await addressDiscoveryContract.updateAddress(realDigitalEnableAccountHash, realDigitalEnableAccountContract.target);
    await sleep(3000);



    // Calculate the hash for STR contract name and update its address in AddressDiscovery.
    console.log("updating STR address in AddressDiscovery");
    const strHash = ethers.keccak256(ethers.toUtf8Bytes("STR"));
    await addressDiscoveryContract.updateAddress(strHash, strContract.target);
    await sleep(3000);

    // Calculate the hash for TPFt contract name and update its address in AddressDiscovery.
    console.log("updating TPFt address in AddressDiscovery");
    const tpftHash = ethers.keccak256(ethers.toUtf8Bytes("TPFt"));
    await addressDiscoveryContract.updateAddress(tpftHash, tpftContract.target);
    await sleep(3000);

    console.log("deployOnCentralBankNode done...");

    return addressDiscoveryContract.target;
}

/**
 * Deploys contracts on the bank node.
 * This function is responsible for deploying the necessary contracts on the bank node.
 * It includes the deployment of RealDigitalEnableAccount and RealTokenizado contracts.
 */
async function deployOnBankNode(bankInfo) {
    let bankWallet = new ethers.Wallet(bankInfo.privateKey, bankInfo.provider);

    // Deploy the RealDigitalEnableAccount contract, which enables accounts for RealDigital assets.
    console.log("deploying RealDigitalEnableAccount");
    let realDigitalEnableAccountFactory = await ethers.getContractFactory("RealDigitalEnableAccount", bankWallet);
    let realDigitalEnableAccountContract = await realDigitalEnableAccountFactory.deploy(bankInfo.address);
    await realDigitalEnableAccountContract.waitForDeployment();
    console.log("RealDigitalEnableAccount address:", realDigitalEnableAccountContract.target);

    // Deploy the RealTokenizado contract, which is used for tokenization.
    console.log("deploying RealTokenizado");
    let realTokenizadoFactory = await ethers.getContractFactory("RealTokenizado", bankWallet);
    let tokenName = "BRL@" + bankInfo.cnpj8;
    let realTokenizadoContract = await realTokenizadoFactory.deploy(tokenName, tokenName, bankInfo.address, bankInfo.address, bankInfo.cnpj8, bankInfo.address);
    await realTokenizadoContract.waitForDeployment();
    console.log("RealTokenizado address:", realTokenizadoContract.target);

    const addressDiscoveryContract = await getAddressDiscovery();

    // Calculate the hash for RealTokenizado contract name and update its address in AddressDiscovery.
    console.log("updating RealTokenizado address in AddressDiscovery");
    const realTokenizadoHash = ethers.keccak256(ethers.toUtf8Bytes("RealTokenizado@" + bankInfo.cnpj8));
    await addressDiscoveryContract.updateAddress(realTokenizadoHash, realTokenizadoContract.target);
    await sleep(3000);

    // Calculate the hash for RealDigitalEnableAccount contract name and update its address in AddressDiscovery.
    console.log("updating RealDigitalEnableAccount address in AddressDiscovery");
    const realDigitalEnableAccountHash = ethers.keccak256(ethers.toUtf8Bytes("RealDigitalEnableAccount@" + bankInfo.cnpj8));
    await addressDiscoveryContract.updateAddress(realDigitalEnableAccountHash, realDigitalEnableAccountContract.target);
    await sleep(3000);

    console.log("deployOnBankNode done...");
}

/**
 * Authorizes on the central bank node.
 * This function is responsible for authorizing the central bank node.
 * It includes the authorization of RealDigital and RealDigitalEnableAccount contracts.
 */
async function authorizeOnCentralBankNode() {
    // Initialize the central bank wallet and address discovery contract
    const centralBankWallet = new ethers.Wallet(centralBankInfo.privateKey, centralBankInfo.provider);

    const realDigital = (await getContract("RealDigital", "RealDigital")).connect(centralBankWallet);

    // Enable accounts for RealDigital assets
    console.log("Enabling accounts for RealDigital assets");
    await realDigital.enableAccount(bank1Info.address);
    await sleep(3000);
    await realDigital.enableAccount(bank2Info.address);
    await sleep(3000);

    // Grant MINTER_ROLE to STR
    console.log("Granting MINTER_ROLE to STR");
    const strAddress = (await getContract("STR", "STR")).target;
    await realDigital.grantRole(ethers.id("MINTER_ROLE"), strAddress);
    await sleep(3000);

    // Grant BURNER_ROLE to STR
    console.log("Granting BURNER_ROLE to STR");
    await realDigital.grantRole(ethers.id("BURNER_ROLE"), strAddress);
    await sleep(3000);

    // Grant MOVER_ROLE to bank1 and bank2
    console.log("Granting MOVER_ROLE to bank1 and bank2");
    await realDigital.grantRole(ethers.id("MOVER_ROLE"), bank1Info.address);
    await sleep(3000);
    await realDigital.grantRole(ethers.id("MOVER_ROLE"), bank2Info.address);
    await sleep(3000);

    const RealDigitalDefaultAccount = (await getContract("RealDigitalDefaultAccount", "RealDigitalDefaultAccount")).connect(centralBankWallet);
    // Add default accounts for bank1 and bank2
    console.log("Adding default accounts for bank1 and bank2");
    await RealDigitalDefaultAccount.addDefaultAccount(bank1Info.cnpj8, bank1Info.address);
    await sleep(3000);
    await RealDigitalDefaultAccount.addDefaultAccount(bank2Info.cnpj8, bank2Info.address);
    await sleep(3000);

    // Grant MINTER_ROLE to DvpEscrow
    console.log("Granting MINTER_ROLE to DvpEscrow");
    await realDigital.grantRole(ethers.id("MINTER_ROLE"), centralBankEscrotingAddress);
    await sleep(3000);

    // Grant BURNER_ROLE to DvpEscrow
    console.log("Granting BURNER_ROLE to DvpEscrow");
    await realDigital.grantRole(ethers.id("BURNER_ROLE"), centralBankEscrotingAddress);
    await sleep(3000);

    // Grant MOVER_ROLE to DvpEscrow
    console.log("Granting MOVER_ROLE to DvpEscrow");
    await realDigital.grantRole(ethers.id("MOVER_ROLE"), centralBankEscrotingAddress);
    await sleep(3000);

    // Enable account for DvpEscrow
    await realDigital.enableAccount(centralBankEscrotingAddress);
    await sleep(3000);

    // Grant MINTER_ROLE to TPFt
    console.log("TPFt granting MINTER_ROLE to bank");
    const TPFt = (await getContract("TPFt", "TPFt")).connect(centralBankWallet);
    await TPFt.grantRole(ethers.id("MINTER_ROLE"), centralBankInfo.address);
    await sleep(3000);

    console.log("authorizeOnCentralBankNode done...");
}

/**
 * Authorizes on the bank node.
 * This function is responsible for authorizing the bank node.
 * It includes the authorization of RealTokenizado and KeyDictionary contracts.
 */
async function authorizeOnBankNode(bankInfo, clientInfo) {
    const bankWallet = new ethers.Wallet(bankInfo.privateKey, bankInfo.provider);
    const keyDictionary = (await getContract("KeyDictionary", "KeyDictionary")).connect(bankWallet);

    const customerKey = ethers.id(clientInfo.taxId.toString());
    console.log("Adding account to KeyDictionary");
    await keyDictionary.addAccount(customerKey, clientInfo.taxId, clientInfo.bankNumber, clientInfo.account, clientInfo.branch, clientInfo.wallet);
    await sleep(3000);

    console.log("Enabling account on RealTokenizado");
    const realTokenizado = (await getContract("RealTokenizado@" + bankInfo.cnpj8, "RealTokenizado")).connect(bankWallet);
    await realTokenizado.enableAccount(clientInfo.wallet);
    await sleep(3000);

    console.log("Granting MOVER_ROLE to client");
    await realTokenizado.grantRole(ethers.id("MOVER_ROLE"), clientInfo.wallet);
    await sleep(3000);

    console.log("Granting MOVER_ROLE to DvpEscrow");
    await realTokenizado.grantRole(ethers.id("MOVER_ROLE"), bankInfo.dvpEscrotingAddress);
    await sleep(3000);

    console.log("Granting MINTER_ROLE to DvpEscrow");
    await realTokenizado.grantRole(ethers.id("MINTER_ROLE"), bankInfo.dvpEscrotingAddress);
    await sleep(3000);

    console.log("Granting BURNER_ROLE to DvpEscrow");
    await realTokenizado.grantRole(ethers.id("BURNER_ROLE"), bankInfo.dvpEscrotingAddress);
    await sleep(3000);

    console.log("Enabling account for DvpEscrow");
    await realTokenizado.enableAccount(bankInfo.dvpEscrotingAddress);
    await sleep(3000);

    console.log("Enabling account for Bank");
    await realTokenizado.enableAccount(bankInfo.address);
    await sleep(3000);

    console.log("authorizeOnBankNode done...");
}


/**
 * Mints CBDC for a given bank.
 * This function is responsible for minting a specified amount of CBDC for a bank.
 * It involves checking the balance before and after minting.
 *
 * @param {BankInfo} bankInfo - The information of the bank for which CBDC is to be minted.
 * @param {string} amount - The amount of CBDC to be minted.
 */
async function mintCbdc(bankInfo, amount) {
    // Creates a new wallet for the bank using its private key and the provider of the central bank.
    const bankWallet = new ethers.Wallet(bankInfo.privateKey, centralBankInfo.provider);
    // Connects to the RealDigital contract using the bank wallet.
    const realDigital = (await getContract("RealDigital", "RealDigital")).connect(bankWallet);

    // Checks the balance of the bank before minting.
    let balance = await realDigital.balanceOf(bankInfo.address);
    console.log("pre balance", balance);

    // Connects to the STR contract using the bank wallet.
    const str = (await getContract("STR", "STR")).connect(bankWallet);
    // Requests to mint the specified amount of CBDC.
    let tx = await str.requestToMint(amount);
    // Waits for the transaction to be mined.
    await tx.wait();

    // Checks the balance of the bank after minting.
    balance = await realDigital.balanceOf(bankInfo.address);
    console.log("post balance", balance);

    console.log("mintCbdc done...");
}

/**
 * Transfers CBDC from one bank to another.
 * This function is responsible for transferring a specified amount of CBDC from one bank to another.
 * It involves checking the balance before and after the transfer.
 *
 * @param {BankInfo} fromBankInfo - The information of the bank from which CBDC is to be transferred.
 * @param {BankInfo} toBankInfo - The information of the bank to which CBDC is to be transferred.
 * @param {string} amount - The amount of CBDC to be transferred.
 */
async function transferCbdc(fromBankInfo, toBankInfo, amount) {
    const bankWallet = new ethers.Wallet(fromBankInfo.privateKey, centralBankInfo.provider);
    const realDigital = (await getContract("RealDigital", "RealDigital")).connect(bankWallet);

    // Checks the balance of the bank before transfer.
    let balance = await realDigital.balanceOf(fromBankInfo.address);
    console.log("pre balance", balance);

    // Initiates the transfer of the specified amount of CBDC to the recipient bank.
    let tx = await realDigital.transfer(toBankInfo.address, amount);
    await tx.wait();

    // Checks the balance of the bank after transfer.
    balance = await realDigital.balanceOf(fromBankInfo.address);
    console.log("post balance", balance);

    console.log("transferCbdc done...");
}

/**
 * Burns CBDC from a bank.
 * This function is responsible for burning a specified amount of CBDC from a bank.
 * It involves checking the balance before and after burning.
 *
 * @param {BankInfo} bankInfo - The information of the bank from which CBDC is to be burned.
 * @param {string} amount - The amount of CBDC to be burned.
 */
async function burnCbdc(bankInfo, amount) {
    const bankWallet = new ethers.Wallet(bankInfo.privateKey, centralBankInfo.provider);
    const str = (await getContract("STR", "STR")).connect(bankWallet);
    const realDigital = (await getContract("RealDigital", "RealDigital")).connect(bankWallet);

    console.log("approving cbdc");
    let tx = await realDigital.approve(str.target, amount);
    await tx.wait();

    // Checks the balance of the bank before burn.
    let balance = await realDigital.balanceOf(bankInfo.address);
    console.log("pre balance", balance);

    tx = await str.requestToBurn(amount);
    await tx.wait();

    balance = await realDigital.balanceOf(bankInfo.address);
    console.log("post balance", balance);

    console.log("burnCbdc done...");
}

/**
 * Mints DVT (Digital Value Token) for a given client.
 * This function is responsible for minting a specified amount of DVT for a client.
 * It involves checking the balance before and after minting.
 *
 * @param {BankInfo} bankInfo - The information of the bank for which DVT is to be minted.
 * @param {ClientInfo} clientInfo - The information of the client for whom DVT is to be minted.
 * @param {string} amount - The amount of DVT to be minted.
 */
async function mintDvt(bankInfo, clientInfo, amount) {
    const bankWallet = new ethers.Wallet(bankInfo.privateKey, bankInfo.provider);
    const realTokenizado = (await getContract("RealTokenizado@" + bankInfo.cnpj8, "RealTokenizado")).connect(bankWallet);

    // Checks the balance of the client's wallet before minting.
    let balance = await realTokenizado.balanceOf(clientInfo.wallet);
    console.log("pre balance", balance);

    // Mints the specified amount of DVT to the client's wallet.
    let tx = await realTokenizado.mint(clientInfo.wallet, amount);
    await tx.wait();

    // Checks the balance of the client's wallet after minting.
    balance = await realTokenizado.balanceOf(clientInfo.wallet);
    console.log("post balance", balance);

    console.log("mintDvt done...");
}

/**
 * Transfers DVT from one client to another.
 * This function is responsible for transferring a specified amount of DVT from one client to another.
 * It involves checking the balance before and after the transfer.
 *
 * @param {BankInfo} bankInfo - The information of the bank for which DVT is to be transferred.
 * @param {ClientInfo} fromClientInfo - The information of the client from whom DVT is to be transferred.
 * @param {ClientInfo} toClientInfo - The information of the client to whom DVT is to be transferred.
 * @param {string} amount - The amount of DVT to be transferred.
 */
async function transferDvt(bankInfo, fromClientInfo, toClientInfo, amount) {
    // Creates a wallet for the client initiating the transfer.
    const clientWallet = new ethers.Wallet(fromClientInfo.privateKey, bankInfo.provider);
    // Connects to the RealTokenizado contract using the client's wallet.
    const realTokenizado = (await getContract("RealTokenizado@" + bankInfo.cnpj8, "RealTokenizado")).connect(clientWallet);

    // Checks the balance of the client's wallet before the transfer.
    let balance = await realTokenizado.balanceOf(fromClientInfo.wallet);
    console.log("pre balance", balance);

    console.log("transferDvt start...");
    // Initiates the transfer of DVT to the recipient client's wallet.
    let tx = await realTokenizado.transfer(toClientInfo.wallet, amount);
    await tx.wait();

    // Checks the balance of the client's wallet after the transfer.
    balance = await realTokenizado.balanceOf(fromClientInfo.wallet);
    console.log("post balance", balance);

    console.log("transferDvt done...");
}

/**
 * Burns DVT from a client.
 * This function is responsible for burning a specified amount of DVT from a client.
 * It involves checking the balance before and after burning.
 *
 * @param {BankInfo} bankInfo - The information of the bank for which DVT is to be burned.
 * @param {ClientInfo} clientInfo - The information of the client from whom DVT is to be burned.
 * @param {string} amount - The amount of DVT to be burned.
 */
async function burnDvt(bankInfo, clientInfo, amount) {
    // Creates a wallet for the bank and the client.
    const bankWallet = new ethers.Wallet(bankInfo.privateKey, bankInfo.provider);
    const clientWallet = new ethers.Wallet(clientInfo.privateKey, bankInfo.provider);

    console.log("approving DVT");
    let realTokenizado = (await getContract("RealTokenizado@" + bankInfo.cnpj8, "RealTokenizado")).connect(clientWallet);
    let tx = await realTokenizado.approve(bankWallet.address, amount);
    await tx.wait();

    // Fetches the client's balance before the burn operation.
    let balance = await realTokenizado.balanceOf(clientInfo.wallet);
    console.log("pre balance", balance);

    console.log("burning DVT");
    realTokenizado = (await getContract("RealTokenizado@" + bankInfo.cnpj8, "RealTokenizado")).connect(bankWallet);
    tx = await realTokenizado.burnFrom(clientInfo.wallet, amount);
    await tx.wait();

    // Fetches the client's balance after the burn operation.
    balance = await realTokenizado.balanceOf(clientInfo.wallet);
    console.log("post balance", balance);

    console.log("burnDvt done...");
}

async function crossBankDvpTransfer(fromBankInfo, toBankInfo, fromClientInfo, toClientInfo, amount) {

    const toBankWallet = new ethers.Wallet(toBankInfo.privateKey, toBankInfo.provider);
    const fromClientWallet = new ethers.Wallet(fromClientInfo.privateKey, fromBankInfo.provider);

    const chunkHash1 = "0x" + crypto.randomBytes(32).toString("hex");
    const chunkHash2 = "0x" + crypto.randomBytes(32).toString("hex");
    const bundleHash1 = "0x" + p.poseidon3([chunkHash1, chunkHash2, 0]).toString(16).padStart(64, "0")
    console.log("chunkHash1", chunkHash1)
    console.log("chunkHash2", chunkHash2)
    console.log("bundleHash1", bundleHash1)
    const expire = Math.floor(Date.now() / 1000) + 60 * 7;

    // client1 transfer dvt to bank1
    console.log("client1 transfer dvt to bank1");
    let senderRealTokenizado = (await getContract("RealTokenizado@" + fromBankInfo.cnpj8, "RealTokenizado")).connect(fromClientWallet);
    let balance = await senderRealTokenizado.balanceOf(fromClientInfo.wallet);
    console.log("client1 dvt pre balance", balance);
    let tx = await senderRealTokenizado.approve(fromBankInfo.dvpEscrotingAddress, amount);
    await tx.wait();

    let DvpEscortingFactory = await ethers.getContractFactory("DvpEscrow");
    let DvpEscorting = DvpEscortingFactory.attach(bank1EscrotingAddress).connect(fromClientWallet);
    let scheduleRequest = {
        tokenAddress: senderRealTokenizado.target,
        to: fromBankInfo.address,
        tokenType: 0,
        amount: amount,
        index: 0,
        chunkHash: chunkHash1,
        bundleHash: bundleHash1,
        expireTime: expire
    }
    tx = await DvpEscorting.scheduleTransfer(scheduleRequest);
    await tx.wait();

    // bank2 mint dvt to client2
    console.log("bank2 mint dvt to client2");
    let receiverRealTokenizado = (await getContract("RealTokenizado@" + toBankInfo.cnpj8, "RealTokenizado")).connect(toBankWallet);
    balance = await receiverRealTokenizado.balanceOf(toClientInfo.wallet);
    console.log("client2 dvt pre balance", balance);
    DvpEscortingFactory = await ethers.getContractFactory("DvpEscrow");
    DvpEscorting = DvpEscortingFactory.attach(toBankInfo.dvpEscrotingAddress).connect(toBankWallet);
    scheduleRequest = {
        tokenAddress: receiverRealTokenizado.target,
        to: toClientInfo.wallet,
        tokenType: 0,
        amount: amount,
        index: 1,
        chunkHash: chunkHash2,
        bundleHash: bundleHash1,
        expireTime: expire
    }
    tx = await DvpEscorting.scheduleMint(scheduleRequest);
    await tx.wait();

    // check bundle transaction
    console.log("check bundle transaction status");
    await checkBundleTransaction(fromBankInfo.provider, bundleHash1);
    await checkBundleTransaction(toBankInfo.provider, bundleHash1);

    // check post balance
    balance = await senderRealTokenizado.balanceOf(fromClientInfo.wallet);
    console.log("client1 dvt post balance", balance);
    balance = await receiverRealTokenizado.balanceOf(toClientInfo.wallet);
    console.log("client2 dvt post balance", balance);


    const chunkHash3 = "0x" + crypto.randomBytes(32).toString("hex");
    const chunkHash4 = "0x" + crypto.randomBytes(32).toString("hex");
    const bundleHash2 = "0x" + p.poseidon3([chunkHash3, chunkHash4, 0]).toString(16).padStart(64, "0")
    console.log("chunkHash3", chunkHash3)
    console.log("chunkHash4", chunkHash4)
    console.log("bundleHash2", bundleHash2)


    const fromBankWallet = new ethers.Wallet(fromBankInfo.privateKey, fromBankInfo.provider);
    // burn dvt from bank1
    console.log("burn dvt from bank1");
    senderRealTokenizado = (await getContract("RealTokenizado@" + fromBankInfo.cnpj8, "RealTokenizado")).connect(fromBankWallet);
    balance = await senderRealTokenizado.balanceOf(fromBankInfo.address);
    console.log("bank1 dvt pre balance", balance);
    tx = await senderRealTokenizado.approve(bank1EscrotingAddress, amount);
    await tx.wait();
    DvpEscortingFactory = await ethers.getContractFactory("DvpEscrow");
    DvpEscorting = DvpEscortingFactory.attach(bank1EscrotingAddress).connect(fromBankWallet);
    scheduleRequest = {
        tokenAddress: senderRealTokenizado.target,
        to: ZERO_ADDRESS,
        tokenType: 0,
        amount: amount,
        index: 0,
        chunkHash: chunkHash3,
        bundleHash: bundleHash2,
        expireTime: expire
    }
    tx = await DvpEscorting.scheduleBurn(scheduleRequest);
    await tx.wait();

    // bank1 transfer CBDC to bank2
    console.log("bank1 transfer CBDC to bank2");
    const fromCentralBankWallet = new ethers.Wallet(fromBankInfo.privateKey, centralBankInfo.provider);
    realDigital = (await getContract("RealDigital", "RealDigital")).connect(fromCentralBankWallet);
    balance = await realDigital.balanceOf(fromBankInfo.address);
    console.log("bank1 cbdc pre balance", balance);
    tx = await realDigital.approve(centralBankEscrotingAddress, amount);
    await tx.wait();

    DvpEscortingFactory = await ethers.getContractFactory("DvpEscrow");
    DvpEscorting = DvpEscortingFactory.attach(centralBankEscrotingAddress).connect(fromCentralBankWallet);
    scheduleRequest = {
        tokenAddress: realDigital.target,
        to: toBankInfo.address,
        tokenType: 0,
        amount: amount,
        index: 1,
        chunkHash: chunkHash4,
        bundleHash: bundleHash2,
        expireTime: expire
    }
    tx = await DvpEscorting.scheduleTransfer(scheduleRequest);
    await tx.wait();

    await checkBundleTransaction(fromBankInfo.provider, bundleHash2);
    await checkBundleTransaction(toBankInfo.provider, bundleHash2);

    balance = await senderRealTokenizado.balanceOf(fromBankInfo.address);
    console.log("bank1 dvt post balance", balance);
    balance = await realDigital.balanceOf(fromBankInfo.address);
    console.log("bank1 cbdc post balance", balance);
}

const acronym = "LTN";
const code = "1001";
const maturityDate = 1755734400;

async function createTpft() {
    let centralBankWallet = new ethers.Wallet(centralBankInfo.privateKey, centralBankInfo.provider);

    const tpft = (await getContract("TPFt", "TPFt")).connect(centralBankWallet);

    const tpftData = {
        acronym: acronym,
        code: code,
        maturityDate: maturityDate
    };
    await tpft.createTPFt(tpftData);
    await sleep(3000);

    const id = await tpft.getTPFtId(tpftData);
    console.log("id", id);
}

async function mintTpft(toBankInfo, amount) {
    let centralBankWallet = new ethers.Wallet(centralBankInfo.privateKey, centralBankInfo.provider);
    const tpft = (await getContract("TPFt", "TPFt")).connect(centralBankWallet);

    const tpftData = {
        acronym: acronym,
        code: code,
        maturityDate: maturityDate
    };
    const id = await tpft.getTPFtId(tpftData);
    await tpft.mint(toBankInfo.address, tpftData, amount);
    await sleep(3000);
    const balance = await tpft.balanceOf(toBankInfo.address, id);
    console.log("balance", balance);
}

async function mintTpftToClient(clientInfo, amount) {
    let centralBankWallet = new ethers.Wallet(centralBankInfo.privateKey, centralBankInfo.provider);
    const tpft = (await getContract("TPFt", "TPFt")).connect(centralBankWallet);

    const tpftData = {
        acronym: acronym,
        code: code,
        maturityDate: maturityDate
    };
    const id = await tpft.getTPFtId(tpftData);
    await tpft.mint(clientInfo.wallet, tpftData, amount);
    await sleep(3000);
    const balance = await tpft.balanceOf(clientInfo.wallet, id);
    console.log("post balance", balance);
}

async function bankBuyTpftFromOtherBank(buyerBankInfo, sellerBankInfo, amount) {
    const chunkHash1 = "0x" + crypto.randomBytes(32).toString("hex");
    const chunkHash2 = "0x" + crypto.randomBytes(32).toString("hex");
    const bundleHash = "0x" + p.poseidon3([chunkHash1, chunkHash2, 0]).toString(16).padStart(64, "0")
    console.log("chunkHash1", chunkHash1)
    console.log("chunkHash2", chunkHash2)
    console.log("bundleHash", bundleHash)
    const expire = Math.floor(Date.now() / 1000) + 60 * 7;

    // buyerBank transfer CBDC to sellerBank
    console.log("buyerBank transfer CBDC to sellerBank");
    const buyerBankWallet = new ethers.Wallet(buyerBankInfo.privateKey, centralBankProvider.provider);
    const realDigital = (await getContract("RealDigital", "RealDigital")).connect(buyerBankWallet);
    let balance = await realDigital.balanceOf(buyerBankInfo.address);
    console.log("buyerBank cbdc pre balance", balance);
    console.log("approve EscrotingAddress");
    let tx = await realDigital.approve(sellerBankInfo.dvpEscrotingAddress, amount);
    await tx.wait();
    let DvpEscortingFactory = await ethers.getContractFactory("DvpEscrow");
    let DvpEscorting = DvpEscortingFactory.attach(centralBankInfo.dvpEscrotingAddress).connect(buyerBankWallet);
    let scheduleRequest = {
        tokenAddress: realDigital.target,
        to: sellerBankInfo.address,
        tokenType: 0,
        amount: amount,
        index: 0,
        chunkHash: chunkHash1,
        bundleHash: bundleHash,
        expireTime: expire
    }
    tx = await DvpEscorting.scheduleTransfer(scheduleRequest);
    await tx.wait();

    // sellerBank transfer tpft to buyerBank
    console.log("sellerBank transfer tpft to buyerBank");
    const sellerBankWallet = new ethers.Wallet(sellerBankInfo.privateKey, selicInfo.provider);
    const tpft = (await getContract("TPFt", "TPFt")).connect(sellerBankWallet);
    tx = await tpft.setApprovalForAll(selicInfo.dvpEscrotingAddress, true);
    await tx.wait();
    const tpftData = {
        acronym: acronym,
        code: code,
        maturityDate: maturityDate
    };
    const id = await tpft.getTPFtId(tpftData);
    console.log("tpft id", id);
    balance = await tpft.balanceOf(sellerBankInfo.address, id);
    console.log("sellerBank tpft pre balance", balance);
    scheduleRequest = {
        tokenAddress: tpft.target,
        to: buyerBankInfo.address,
        tokenType: id,
        amount: amount,
        index: 1,
        chunkHash: chunkHash2,
        bundleHash: bundleHash,
        expireTime: expire
    }
    DvpEscorting = DvpEscortingFactory.attach(selicInfo.dvpEscrotingAddress).connect(sellerBankWallet);
    console.log("schedule transfer tpft");
    tx = await DvpEscorting.scheduleTransfer1155(scheduleRequest);
    await tx.wait();

    // check bundle transaction
    console.log("check bundle transaction status");
    await checkBundleTransaction(centralBankInfo.provider, bundleHash);
    await checkBundleTransaction(selicInfo.provider, bundleHash);

    // check balance
    balance = await realDigital.balanceOf(buyerBankInfo.address);
    console.log("buyerBank cbdc post balance", balance);
    balance = await tpft.balanceOf(sellerBankInfo.address, id);
    console.log("sellerBank tpft post balance", balance);
}

async function clientBuyFromInternalBank(bankInfo, clientInfo, amount) {
    const chunkHash1 = "0x" + crypto.randomBytes(32).toString("hex");
    const chunkHash2 = "0x" + crypto.randomBytes(32).toString("hex");
    const bundleHash = "0x" + p.poseidon3([chunkHash1, chunkHash2, 0]).toString(16).padStart(64, "0")
    console.log("chunkHash1", chunkHash1)
    console.log("chunkHash2", chunkHash2)
    console.log("bundleHash", bundleHash)
    const expire = Math.floor(Date.now() / 1000) + 60 * 7;

    // client transfer dvt to bank
    console.log("client transfer dvt to bank");
    const clientWallet = new ethers.Wallet(clientInfo.privateKey, bankInfo.provider);
    const realTokenizado = (await getContract("RealTokenizado@" + bankInfo.cnpj8, "RealTokenizado")).connect(clientWallet);
    let balance = await realTokenizado.balanceOf(clientInfo.wallet);
    console.log("client dvt pre balance", balance);
    console.log("approve EscrotingAddress");
    let tx = await realTokenizado.approve(bankInfo.dvpEscrotingAddress, amount);
    await tx.wait();
    let DvpEscortingFactory = await ethers.getContractFactory("DvpEscrow");
    let DvpEscorting = DvpEscortingFactory.attach(bankInfo.dvpEscrotingAddress).connect(clientWallet);
    let scheduleRequest = {
        tokenAddress: realTokenizado.target,
        to: bank1Info.address,
        tokenType: 0,
        amount: amount,
        index: 0,
        chunkHash: chunkHash1,
        bundleHash: bundleHash,
        expireTime: expire
    }
    console.log("schedule transfer dvt");
    tx = await DvpEscorting.scheduleTransfer(scheduleRequest);
    await tx.wait();

    // bank transfer tpft to client
    console.log("bank transfer tpft to client");
    const bankWallet = new ethers.Wallet(bankInfo.privateKey, centralBankInfo.provider);
    const tpft = (await getContract("TPFt", "TPFt")).connect(bankWallet);
    console.log("setApprovalForAll");
    tx = await tpft.setApprovalForAll(centralBankInfo.dvpEscrotingAddress, true);
    await tx.wait();
    const tpftData = {
        acronym: acronym,
        code: code,
        maturityDate: maturityDate
    };
    const id = await tpft.getTPFtId(tpftData);
    console.log("id", id);
    balance = await tpft.balanceOf(bankInfo.address, id);
    console.log("bank tpft pre balance", balance);
    scheduleRequest = {
        tokenAddress: tpft.target,
        to: clientInfo.wallet,
        tokenType: id,
        amount: amount,
        index: 1,
        chunkHash: chunkHash2,
        bundleHash: bundleHash,
        expireTime: expire
    }
    DvpEscorting = DvpEscortingFactory.attach(centralBankInfo.dvpEscrotingAddress).connect(bankWallet);
    console.log("schedule transfer tpft");
    tx = await DvpEscorting.scheduleTransfer1155(scheduleRequest);
    await tx.wait();

    // check bundle transaction
    console.log("check bundle transaction status");
    await checkBundleTransaction(bankInfo.provider, bundleHash);
    await checkBundleTransaction(centralBankInfo.provider, bundleHash);

    // check balance
    balance = await realTokenizado.balanceOf(clientInfo.wallet);
    console.log("client dvt post balance", balance);
    balance = await tpft.balanceOf(bankInfo.address, id);
    console.log("bank tpft post balance", balance);
}

async function clientBuyFromExternalBank(buyerClientInfo, buyerBankInfo, sellerBankInfo, amount) {
    const chunkHash1 = "0x" + crypto.randomBytes(32).toString("hex");
    const chunkHash2 = "0x" + crypto.randomBytes(32).toString("hex");
    const bundleHash = "0x" + p.poseidon3([chunkHash1, chunkHash2, 0]).toString(16).padStart(64, "0")
    console.log("chunkHash1", chunkHash1)
    console.log("chunkHash2", chunkHash2)
    console.log("bundleHash", bundleHash)
    const expire = Math.floor(Date.now() / 1000) + 60 * 7;

    // buyerclient transfer dvt to buyerBank
    console.log("buyerClient transfer dvt to buyerBank");
    const buyerClientWallet = new ethers.Wallet(buyerClientInfo.privateKey, buyerBankInfo.provider);
    const realTokenizado = (await getContract("RealTokenizado@" + buyerBankInfo.cnpj8, "RealTokenizado")).connect(buyerClientWallet);
    let balance = await realTokenizado.balanceOf(buyerClientInfo.wallet);
    console.log("buyerClient dvt pre balance", balance);
    console.log("approve bank2EscrotingAddress");
    let tx = await realTokenizado.approve(buyerBankInfo.dvpEscrotingAddress, amount);
    await tx.wait();
    let DvpEscortingFactory = await ethers.getContractFactory("DvpEscrow");
    let DvpEscorting = DvpEscortingFactory.attach(buyerBankInfo.dvpEscrotingAddress).connect(buyerClientWallet);
    let scheduleRequest = {
        tokenAddress: realTokenizado.target,
        to: buyerBankInfo.address,
        tokenType: 0,
        amount: amount,
        index: 0,
        chunkHash: chunkHash1,
        bundleHash: bundleHash,
        expireTime: expire
    }
    console.log("schedule transfer dvt");
    tx = await DvpEscorting.scheduleTransfer(scheduleRequest);
    await tx.wait();

    // sellerBank transfer tpft to buyerClient
    console.log("sellerBank transfer tpft to buyerClient");
    const sellerBankWallet = new ethers.Wallet(sellerBankInfo.privateKey, centralBankInfo.provider);
    const tpft = (await getContract("TPFt", "TPFt")).connect(sellerBankWallet);
    console.log("setApprovalForAll");
    tx = await tpft.setApprovalForAll(centralBankInfo.dvpEscrotingAddress, true);
    await tx.wait();
    const tpftData = {
        acronym: acronym,
        code: code,
        maturityDate: maturityDate
    };
    const id = await tpft.getTPFtId(tpftData);
    console.log("id", id);
    balance = await tpft.balanceOf(sellerBankInfo.address, id);
    console.log("sellerBank tpft pre balance", balance);
    scheduleRequest = {
        tokenAddress: tpft.target,
        to: buyerClientInfo.wallet,
        tokenType: id,
        amount: amount,
        index: 1,
        chunkHash: chunkHash2,
        bundleHash: bundleHash,
        expireTime: expire
    }
    DvpEscorting = DvpEscortingFactory.attach(centralBankInfo.dvpEscrotingAddress).connect(sellerBankWallet);
    console.log("schedule transfer tpft");
    tx = await DvpEscorting.scheduleTransfer1155(scheduleRequest);
    await tx.wait();

    // check bundle transaction status
    console.log("check bundle transaction status");
    await checkBundleTransaction(centralBankInfo.provider, bundleHash);
    await checkBundleTransaction(buyerBankInfo.provider, bundleHash);


    const chunkHash3 = "0x" + crypto.randomBytes(32).toString("hex");
    const chunkHash4 = "0x" + crypto.randomBytes(32).toString("hex");
    const bundleHash2 = "0x" + p.poseidon3([chunkHash3, chunkHash4, 0]).toString(16).padStart(64, "0")
    console.log("chunkHash3", chunkHash3)
    console.log("chunkHash4", chunkHash4)
    console.log("bundleHash2", bundleHash2)

    // buyerBank burn dvt
    console.log("buyerBank burn dvt");
    let buyerBankWallet = new ethers.Wallet(buyerBankInfo.privateKey, buyerBankInfo.provider);
    let buyerRealTokenizado = (await getContract("RealTokenizado@" + buyerBankInfo.cnpj8, "RealTokenizado")).connect(buyerBankWallet);
    balance = await buyerRealTokenizado.balanceOf(buyerBankInfo.address);
    console.log("buyerBank dvt pre balance", balance);
    tx = await buyerRealTokenizado.approve(buyerBankInfo.dvpEscrotingAddress, amount);
    await tx.wait();
    DvpEscortingFactory = await ethers.getContractFactory("DvpEscrow");
    DvpEscorting = DvpEscortingFactory.attach(buyerBankInfo.dvpEscrotingAddress).connect(buyerBankWallet);
    scheduleRequest = {
        tokenAddress: buyerRealTokenizado.target,
        to: ZERO_ADDRESS,
        tokenType: 0,
        amount: amount,
        index: 0,
        chunkHash: chunkHash3,
        bundleHash: bundleHash2,
        expireTime: expire
    }
    tx = await DvpEscorting.scheduleBurn(scheduleRequest);
    await tx.wait();

    // buyerBank transfer CBDC to sellerBank
    console.log("buyerBank transfer CBDC to sellerBank");
    buyerBankWallet = new ethers.Wallet(buyerBankInfo.privateKey, centralBankInfo.provider);
    realDigital = (await getContract("RealDigital", "RealDigital")).connect(buyerBankWallet);
    balance = await realDigital.balanceOf(buyerBankInfo.address);
    console.log("buyerBank cbdc pre balance", balance);
    tx = await realDigital.approve(centralBankInfo.dvpEscrotingAddress, amount);
    await tx.wait();
    DvpEscortingFactory = await ethers.getContractFactory("DvpEscrow");
    DvpEscorting = DvpEscortingFactory.attach(centralBankInfo.dvpEscrotingAddress).connect(buyerBankWallet);
    scheduleRequest = {
        tokenAddress: realDigital.target,
        to: sellerBankInfo.address,
        tokenType: 0,
        amount: amount,
        index: 1,
        chunkHash: chunkHash4,
        bundleHash: bundleHash2,
        expireTime: expire
    }
    tx = await DvpEscorting.scheduleTransfer(scheduleRequest);
    await tx.wait();

    // check bundle transaction status
    console.log("check bundle transaction status");
    await checkBundleTransaction(buyerBankInfo.provider, bundleHash2);
    await checkBundleTransaction(centralBankInfo.provider, bundleHash2);

    // check balance
    balance = await realTokenizado.balanceOf(buyerClientInfo.wallet);
    console.log("buyerClient dvt post balance", balance);
    balance = await tpft.balanceOf(sellerBankInfo.address, id);
    console.log("sellerBank tpft post balance", balance);
    balance = await realDigital.balanceOf(buyerBankInfo.address);
    console.log("buyerBank cbdc post balance", balance);
    balance = await buyerRealTokenizado.balanceOf(buyerBankInfo.address);
    console.log("buyerBank dvt post balance", balance);
}

async function clientBuyFromExternalClient(buyerClientInfo, buyerBankInfo, sellerClientInfo, sellerBankInfo, amount) {
    const chunkHash1 = "0x" + crypto.randomBytes(32).toString("hex");
    const chunkHash2 = "0x" + crypto.randomBytes(32).toString("hex");
    const chunkHash3 = "0x" + crypto.randomBytes(32).toString("hex");
    const bundleHash = "0x" + p.poseidon3([chunkHash1, chunkHash2, chunkHash3]).toString(16).padStart(64, "0")
    console.log("chunkHash1", chunkHash1)
    console.log("chunkHash2", chunkHash2)
    console.log("chunkHash3", chunkHash3)
    console.log("bundleHash", bundleHash)
    const expire = Math.floor(Date.now() / 1000) + 60 * 7;

    // buyerClient transfer dvt to buyerBank
    console.log("buyerClient transfer dvt to buyerBank");
    let buyerClientWallet = new ethers.Wallet(buyerClientInfo.privateKey, buyerBankInfo.provider);
    let buyerRealTokenizado = (await getContract("RealTokenizado@" + buyerBankInfo.cnpj8, "RealTokenizado")).connect(buyerClientWallet);
    let balance = await buyerRealTokenizado.balanceOf(buyerClientInfo.wallet);
    console.log("buyerClient dvt pre balance", balance);
    console.log("approve dvt to EscrotingAddress");
    let tx = await buyerRealTokenizado.approve(buyerBankInfo.dvpEscrotingAddress, amount);
    await tx.wait();
    let DvpEscortingFactory = await ethers.getContractFactory("DvpEscrow");
    let DvpEscorting = DvpEscortingFactory.attach(buyerBankInfo.dvpEscrotingAddress).connect(buyerClientWallet);
    let scheduleRequest = {
        tokenAddress: buyerRealTokenizado.target,
        to: buyerBankInfo.address,
        tokenType: 0,
        amount: amount,
        index: 0,
        chunkHash: chunkHash1,
        bundleHash: bundleHash,
        expireTime: expire
    }
    console.log("schedule transfer dvt");
    tx = await DvpEscorting.scheduleTransfer(scheduleRequest);
    await tx.wait();

    // sellerClient transfer tpft to buyerClient
    console.log("sellerClient transfer tpft to buyerClient");
    const sellerClientWallet = new ethers.Wallet(sellerClientInfo.privateKey, centralBankInfo.provider);
    const tpft = (await getContract("TPFt", "TPFt")).connect(sellerClientWallet);
    console.log("setApprovalForAll");
    tx = await tpft.setApprovalForAll(centralBankInfo.dvpEscrotingAddress, true);
    await tx.wait();
    const tpftData = {
        acronym: acronym,
        code: code,
        maturityDate: maturityDate
    };
    const id = await tpft.getTPFtId(tpftData);
    console.log("tpft id", id);
    balance = await tpft.balanceOf(sellerClientInfo.wallet, id);
    console.log("sellerClient tpft pre balance", balance);
    scheduleRequest = {
        tokenAddress: tpft.target,
        to: buyerClientInfo.wallet,
        tokenType: id,
        amount: amount,
        index: 1,
        chunkHash: chunkHash2,
        bundleHash: bundleHash,
        expireTime: expire
    }
    DvpEscorting = DvpEscortingFactory.attach(centralBankInfo.dvpEscrotingAddress).connect(sellerClientWallet);
    console.log("schedule transfer tpft");
    tx = await DvpEscorting.scheduleTransfer1155(scheduleRequest);
    await tx.wait();

    // sellerBank mint dvt to sellerClient
    console.log("sellerBank mint dvt to sellerClient");
    let sellerBankWallet = new ethers.Wallet(sellerBankInfo.privateKey, sellerBankInfo.provider);
    let sellerRealTokenizado = (await getContract("RealTokenizado@" + sellerBankInfo.cnpj8, "RealTokenizado")).connect(sellerBankWallet);
    balance = await sellerRealTokenizado.balanceOf(sellerClientInfo.wallet);
    console.log("sellerClient dvt pre balance", balance);
    DvpEscortingFactory = await ethers.getContractFactory("DvpEscrow");
    DvpEscorting = DvpEscortingFactory.attach(sellerBankInfo.dvpEscrotingAddress).connect(sellerBankWallet);
    scheduleRequest = {
        tokenAddress: sellerRealTokenizado.target,
        to: sellerClientInfo.wallet,
        tokenType: 0,
        amount: amount,
        index: 2,
        chunkHash: chunkHash3,
        bundleHash: bundleHash,
        expireTime: expire
    }
    tx = await DvpEscorting.scheduleMint(scheduleRequest);
    await tx.wait();

    // check bundle transaction status
    console.log("check bundle transaction status");
    await checkBundleTransaction(buyerBankInfo.provider, bundleHash);
    await checkBundleTransaction(centralBankInfo.provider, bundleHash);
    await checkBundleTransaction(sellerBankInfo.provider, bundleHash);

    const chunkHash4 = "0x" + crypto.randomBytes(32).toString("hex");
    const chunkHash5 = "0x" + crypto.randomBytes(32).toString("hex");
    const bundleHash2 = "0x" + p.poseidon3([chunkHash4, chunkHash5, 0]).toString(16).padStart(64, "0")
    console.log("chunkHash4", chunkHash4)
    console.log("chunkHash5", chunkHash5)
    console.log("bundleHash2", bundleHash2)

    // buyerBank burn dvt
    console.log("buyerBank burn dvt");
    let buyerBankWallet = new ethers.Wallet(buyerBankInfo.privateKey, buyerBankInfo.provider);
    buyerRealTokenizado = (await getContract("RealTokenizado@" + buyerBankInfo.cnpj8, "RealTokenizado")).connect(buyerBankWallet);
    balance = await buyerRealTokenizado.balanceOf(buyerBankInfo.address);
    console.log("buyerBank dvt pre balance", balance);
    tx = await buyerRealTokenizado.approve(buyerBankInfo.dvpEscrotingAddress, amount);
    await tx.wait();
    DvpEscortingFactory = await ethers.getContractFactory("DvpEscrow");
    DvpEscorting = DvpEscortingFactory.attach(buyerBankInfo.dvpEscrotingAddress).connect(buyerBankWallet);
    scheduleRequest = {
        tokenAddress: buyerRealTokenizado.target,
        to: ZERO_ADDRESS,
        tokenType: 0,
        amount: amount,
        index: 0,
        chunkHash: chunkHash4,
        bundleHash: bundleHash2,
        expireTime: expire
    }
    tx = await DvpEscorting.scheduleBurn(scheduleRequest);
    await tx.wait();

    // buyerBank transfer CBDC to sellerBank
    console.log("buyerBank transfer CBDC to sellerBank");
    buyerBankWallet = new ethers.Wallet(buyerBankInfo.privateKey, centralBankInfo.provider);
    realDigital = (await getContract("RealDigital", "RealDigital")).connect(buyerBankWallet);
    balance = await realDigital.balanceOf(buyerBankInfo.address);
    console.log("buyerBank cbdc pre balance", balance);
    tx = await realDigital.approve(centralBankInfo.dvpEscrotingAddress, amount);
    await tx.wait();
    DvpEscortingFactory = await ethers.getContractFactory("DvpEscrow");
    DvpEscorting = DvpEscortingFactory.attach(centralBankInfo.dvpEscrotingAddress).connect(buyerBankWallet);
    scheduleRequest = {
        tokenAddress: realDigital.target,
        to: sellerBankInfo.address,
        tokenType: 0,
        amount: amount,
        index: 1,
        chunkHash: chunkHash5,
        bundleHash: bundleHash2,
        expireTime: expire
    }
    tx = await DvpEscorting.scheduleTransfer(scheduleRequest);
    await tx.wait();

    // check bundle transaction status
    console.log("check bundle transaction status");
    await checkBundleTransaction(buyerBankInfo.provider, bundleHash2);
    await checkBundleTransaction(centralBankInfo.provider, bundleHash2);

    // check balance
    balance = await buyerRealTokenizado.balanceOf(buyerClientInfo.wallet);
    console.log("buyerClient dvt post balance", balance);
    balance = await tpft.balanceOf(sellerClientInfo.wallet, id);
    console.log("sellerClient tpft post balance", balance);
    balance = await sellerRealTokenizado.balanceOf(sellerClientInfo.wallet);
    console.log("sellerClient dvt post balance", balance);
    balance = await buyerRealTokenizado.balanceOf(buyerBankInfo.address);
    console.log("buyerBank dvt post balance", balance);
    balance = await realDigital.balanceOf(buyerBankInfo.address);
    console.log("buyerBank cbdc post balance", balance);
}

async function getAddressDiscovery() {
    const centralBankWallet = new ethers.Wallet(centralBankInfo.privateKey, centralBankInfo.provider);
    const addressDiscoveryFactory = await ethers.getContractFactory("AddressDiscovery");
    const addressDiscovery = addressDiscoveryFactory.attach(addressDiscoveryAddress).connect(centralBankWallet);
    return addressDiscovery;
}

async function getContract(addressDiscoveryKey, contractName) {
    const addressDiscovery = await getAddressDiscovery();
    const hash = ethers.keccak256(ethers.toUtf8Bytes(addressDiscoveryKey));
    const contractAddress = await addressDiscovery.addressDiscovery(hash);
    const contractFactory = await ethers.getContractFactory(contractName);
    const contract = contractFactory.attach(contractAddress);
    return contract;
}

async function executeDvp(bankInfo, bundleHash) {
    const bankWallet = new ethers.Wallet(bankInfo.privateKey, bankInfo.provider);
    DvpEscortingFactory = await ethers.getContractFactory("DvpEscrow");
    DvpEscorting = DvpEscortingFactory.attach(bank2EscrotingAddress).connect(bankWallet);
    const tx = await DvpEscorting.Transactions(bundleHash);
    console.log("tx", tx);
    let balance = await DvpEscorting.getBalance("0x932fE229dc287dD52d36A508090e1d16bFf5CB64");
    console.log("balance", balance);
    await DvpEscorting.execute(bundleHash);
    await sleep(3000);
}

async function checkBundleTransaction(bankInfo, bundleHash) {
    let BundleTransaction = await bankInfo.provider.send("eth_checkTransactionBundle", [bundleHash]);
    console.log("BundleTransaction", BundleTransaction);
    let status = BundleTransaction.Status;
    while (status !== 2) {
        console.log("bundle status is not 2, continue fetch status, current status is : ", status);
        await sleep(2000);
        BundleTransaction = await bankInfo.provider.send("eth_checkTransactionBundle", [bundleHash]);
        console.log("BundleTransaction", BundleTransaction);
        status = BundleTransaction.Status;
    }
}

// ethBalance(centralBankInfo.provider, "0x1a245eF2f03911Bf782FBdEAe379113ff068A311");
// checkBundleTransaction(bank2Info, "0x1e7917f1b94f0b3db35cbf7d0ba2715f94bf46c5ce1d6160a81556db8084bee8");

// deployOnCentralBankNode();
// deployOnBankNode(bank1Info);
// deployOnBankNode(bank2Info);

// authorizeOnCentralBankNode();
// authorizeOnBankNode(bank1Info, client1);
// authorizeOnBankNode(bank1Info, client3);
// authorizeOnBankNode(bank2Info, client2);

// Init Contracts and authorize
deployOnCentralBankNode().then(() => {
    deployOnBankNode(bank1Info).then(() => {
        deployOnBankNode(bank2Info).then(() => {
            authorizeOnCentralBankNode().then(() => {
                authorizeOnBankNode(bank1Info, client1).then(() => {
                    authorizeOnBankNode(bank2Info, client2);
                });
            });
        });
    });
});

// CBDC tests, inside central bank node
// mintCbdc(bank1Info, 10000);
// transferCbdc(bank1Info, bank2Info, 100);
// burnCbdc(bank1Info, 400);

// DVt tests, inside bank node
// mintDvt(bank2Info, client2, 10000);
// transferDvt(bank1Info, client1, client3, 100);
// burnDvt(bank1Info, client1, 100);

// Swap One Step test
/* mintCbdc(bank1Info, 10000).then(() => {
    mintDvt(bank1Info, client1, 10000).then(() => {
        crossBankDvpTransfer(bank1Info, bank2Info, client1, client2, 100);
    });
}); */

// TPFt tests
// createTpft();
// mintTpft(bank2Info, 1000);

// bankBuyTpftFromOtherBank(bank1Info, bank2Info, 20);

// client buy tpft from internal bank
/* mintTpft(bank1Info, 10000).then(() => {
    mintDvt(bank1Info, client1, 10000).then(() => {
        clientBuyFromInternalBank(bank1Info, client1, 10);
    });
}); */

// client buy tpft from external bank
/* mintTpft(bank2Info, 10000).then(() => {
    mintCbdc(bank1Info, 10000).then(() => {
        mintDvt(bank1Info, client1, 10000).then(() => {
            clientBuyFromExternalBank(client1, bank1Info, bank2Info, 100);
        });
    });
}); */

// client buy tpft from external client
/* mintTpftToClient(client2, 10000).then(() => {
    mintCbdc(bank1Info, 10000).then(() => {
        mintDvt(bank1Info, client1, 10000).then(() => {
            clientBuyFromExternalClient(client1, bank1Info, client2, bank2Info, 100);
        });
    });
}); */
