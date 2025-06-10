
const {ethers} = require('hardhat');

const account = ethers.Wallet.createRandom();

console.log("generate on ethereum account")
console.log("Private key: ",  account.privateKey)
console.log("address:     ", account.address)