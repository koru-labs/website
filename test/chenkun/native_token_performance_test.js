const {ethers, network}=require("hardhat");
const {networks} = require("../../hardhat.config");
const {ether} = require("@openzeppelin/test-helpers");
const {createClient} = require('../qa/token_grpc');
const accounts = require('./../../deployments/account.json');
const grpc = require("@grpc/grpc-js");
const {parseEventsFromReceipt} = require("../sun/native_token_event_test");

const abi = "[\t{\t\t\"inputs\":[\t\t\t{\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\"name\":\"tokenId\",\t\t\t\t\"type\":\"uint256\"\t\t\t}\t\t],\t\t\"name\":\"burn\",\t\t\"outputs\":[\t\t\t{\t\t\t\t\"internalType\":\"bool\",\t\t\t\t\"name\":\"\",\t\t\t\t\"type\":\"bool\"\t\t\t}\t\t],\t\t\"stateMutability\":\"nonpayable\",\t\t\"type\":\"function\"\t},\t{\t\t\"inputs\":[\t\t\t{\t\t\t\t\"internalType\":\"address\",\t\t\t\t\"name\":\"owner\",\t\t\t\t\"type\":\"address\"\t\t\t},\t\t\t{\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\"name\":\"tokenId\",\t\t\t\t\"type\":\"uint256\"\t\t\t}\t\t],\t\t\"name\":\"getToken\",\t\t\"outputs\":[\t\t\t{\t\t\t\t\"components\":[\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\"name\":\"id\",\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"address\",\t\t\t\t\t\t\"name\":\"owner\",\t\t\t\t\t\t\"type\":\"address\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"enum TokenModel.TokenStatus\",\t\t\t\t\t\t\"name\":\"status\",\t\t\t\t\t\t\"type\":\"uint8\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"components\":[\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cl_x\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cl_y\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cr_x\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cr_y\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t}\t\t\t\t\t\t],\t\t\t\t\t\t\"internalType\":\"struct TokenModel.ElGamal\",\t\t\t\t\t\t\"name\":\"amount\",\t\t\t\t\t\t\"type\":\"tuple\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"address\",\t\t\t\t\t\t\"name\":\"to\",\t\t\t\t\t\t\"type\":\"address\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\"name\":\"rollbackTokenId\",\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t}\t\t\t\t],\t\t\t\t\"internalType\":\"struct TokenModel.TokenEntity\",\t\t\t\t\"name\":\"\",\t\t\t\t\"type\":\"tuple\"\t\t\t}\t\t],\t\t\"stateMutability\":\"view\",\t\t\"type\":\"function\"\t},\t{\t\t\"inputs\":[\t\t\t{\t\t\t\t\"internalType\":\"address[]\",\t\t\t\t\"name\":\"recipients\",\t\t\t\t\"type\":\"address[]\"\t\t\t},\t\t\t{\t\t\t\t\"components\":[\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\"name\":\"id\",\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"address\",\t\t\t\t\t\t\"name\":\"owner\",\t\t\t\t\t\t\"type\":\"address\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"enum TokenModel.TokenStatus\",\t\t\t\t\t\t\"name\":\"status\",\t\t\t\t\t\t\"type\":\"uint8\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"components\":[\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cl_x\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cl_y\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cr_x\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cr_y\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t}\t\t\t\t\t\t],\t\t\t\t\t\t\"internalType\":\"struct TokenModel.ElGamal\",\t\t\t\t\t\t\"name\":\"amount\",\t\t\t\t\t\t\"type\":\"tuple\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"address\",\t\t\t\t\t\t\"name\":\"to\",\t\t\t\t\t\t\"type\":\"address\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\"name\":\"rollbackTokenId\",\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t}\t\t\t\t],\t\t\t\t\"internalType\":\"struct TokenModel.TokenEntity[]\",\t\t\t\t\"name\":\"tokens\",\t\t\t\t\"type\":\"tuple[]\"\t\t\t},\t\t\t{\t\t\t\t\"components\":[\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\"name\":\"id\",\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"components\":[\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cl_x\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cl_y\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cr_x\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cr_y\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t}\t\t\t\t\t\t],\t\t\t\t\t\t\"internalType\":\"struct TokenModel.ElGamal\",\t\t\t\t\t\t\"name\":\"value\",\t\t\t\t\t\t\"type\":\"tuple\"\t\t\t\t\t}\t\t\t\t],\t\t\t\t\"internalType\":\"struct TokenModel.ElGamalToken\",\t\t\t\t\"name\":\"newAllowed\",\t\t\t\t\"type\":\"tuple\"\t\t\t},\t\t\t{\t\t\t\t\"internalType\":\"uint256[8]\",\t\t\t\t\"name\":\"proof\",\t\t\t\t\"type\":\"uint256[8]\"\t\t\t},\t\t\t{\t\t\t\t\"internalType\":\"uint256[]\",\t\t\t\t\"name\":\"publicInputs\",\t\t\t\t\"type\":\"uint256[]\"\t\t\t},\t\t\t{\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\"name\":\"paddingNum\",\t\t\t\t\"type\":\"uint256\"\t\t\t}\t\t],\t\t\"name\":\"mint\",\t\t\"outputs\":[\t\t\t{\t\t\t\t\"internalType\":\"bool\",\t\t\t\t\"name\":\"\",\t\t\t\t\"type\":\"bool\"\t\t\t}\t\t],\t\t\"stateMutability\":\"nonpayable\",\t\t\"type\":\"function\"\t},\t{\t\t\"inputs\":[\t\t\t{\t\t\t\t\"internalType\":\"address\",\t\t\t\t\"name\":\"minter\",\t\t\t\t\"type\":\"address\"\t\t\t},\t\t\t{\t\t\t\t\"components\":[\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\"name\":\"id\",\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"components\":[\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cl_x\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cl_y\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cr_x\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cr_y\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t}\t\t\t\t\t\t],\t\t\t\t\t\t\"internalType\":\"struct TokenModel.ElGamal\",\t\t\t\t\t\t\"name\":\"value\",\t\t\t\t\t\t\"type\":\"tuple\"\t\t\t\t\t}\t\t\t\t],\t\t\t\t\"internalType\":\"struct TokenModel.ElGamalToken\",\t\t\t\t\"name\":\"allowed\",\t\t\t\t\"type\":\"tuple\"\t\t\t}\t\t],\t\t\"name\":\"setMintAllowed\",\t\t\"outputs\":[],\t\t\"stateMutability\":\"nonpayable\",\t\t\"type\":\"function\"\t},\t{\t\t\"inputs\":[\t\t\t{\t\t\t\t\"internalType\":\"address\",\t\t\t\t\"name\":\"from\",\t\t\t\t\"type\":\"address\"\t\t\t},\t\t\t{\t\t\t\t\"internalType\":\"address[]\",\t\t\t\t\"name\":\"recipients\",\t\t\t\t\"type\":\"address[]\"\t\t\t},\t\t\t{\t\t\t\t\"internalType\":\"uint256[]\",\t\t\t\t\"name\":\"consumedIds\",\t\t\t\t\"type\":\"uint256[]\"\t\t\t},\t\t\t{\t\t\t\t\"components\":[\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\"name\":\"id\",\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"address\",\t\t\t\t\t\t\"name\":\"owner\",\t\t\t\t\t\t\"type\":\"address\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"enum TokenModel.TokenStatus\",\t\t\t\t\t\t\"name\":\"status\",\t\t\t\t\t\t\"type\":\"uint8\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"components\":[\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cl_x\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cl_y\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cr_x\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cr_y\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t}\t\t\t\t\t\t],\t\t\t\t\t\t\"internalType\":\"struct TokenModel.ElGamal\",\t\t\t\t\t\t\"name\":\"amount\",\t\t\t\t\t\t\"type\":\"tuple\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"address\",\t\t\t\t\t\t\"name\":\"to\",\t\t\t\t\t\t\"type\":\"address\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\"name\":\"rollbackTokenId\",\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t}\t\t\t\t],\t\t\t\t\"internalType\":\"struct TokenModel.TokenEntity[]\",\t\t\t\t\"name\":\"newTokens\",\t\t\t\t\"type\":\"tuple[]\"\t\t\t},\t\t\t{\t\t\t\t\"internalType\":\"uint256[8]\",\t\t\t\t\"name\":\"proof\",\t\t\t\t\"type\":\"uint256[8]\"\t\t\t},\t\t\t{\t\t\t\t\"internalType\":\"uint256[]\",\t\t\t\t\"name\":\"publicInputs\",\t\t\t\t\"type\":\"uint256[]\"\t\t\t},\t\t\t{\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\"name\":\"paddingNum\",\t\t\t\t\"type\":\"uint256\"\t\t\t}\t\t],\t\t\"name\":\"split\",\t\t\"outputs\":[\t\t\t{\t\t\t\t\"internalType\":\"bool\",\t\t\t\t\"name\":\"\",\t\t\t\t\"type\":\"bool\"\t\t\t}\t\t],\t\t\"stateMutability\":\"nonpayable\",\t\t\"type\":\"function\"\t},\t{\t\t\"inputs\":[\t\t\t{\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\"name\":\"tokenId\",\t\t\t\t\"type\":\"uint256\"\t\t\t},\t\t\t{\t\t\t\t\"internalType\":\"string\",\t\t\t\t\"name\":\"memo\",\t\t\t\t\"type\":\"string\"\t\t\t}\t\t],\t\t\"name\":\"transfer\",\t\t\"outputs\":[\t\t\t{\t\t\t\t\"internalType\":\"bool\",\t\t\t\t\"name\":\"\",\t\t\t\t\"type\":\"bool\"\t\t\t}\t\t],\t\t\"stateMutability\":\"nonpayable\",\t\t\"type\":\"function\"\t}]"
// const abi = "[{\"inputs\":[{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"tokenId\",\"type\":\"uint256\"}],\"name\":\"getToken\",\"outputs\":[{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address[]\",\"name\":\"recipients\",\"type\":\"address[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity[]\",\"name\":\"tokens\",\"type\":\"tuple[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"value\",\"type\":\"tuple\"}],\"internalType\":\"struct TokenModel.ElGamalToken\",\"name\":\"newAllowed\",\"type\":\"tuple\"},{\"internalType\":\"uint256[8]\",\"name\":\"proof\",\"type\":\"uint256[8]\"},{\"internalType\":\"uint256[]\",\"name\":\"publicInputs\",\"type\":\"uint256[]\"},{\"internalType\":\"uint256\",\"name\":\"PaddingNum\",\"type\":\"uint256\"}],\"name\":\"mint\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"minter\",\"type\":\"address\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"value\",\"type\":\"tuple\"}],\"internalType\":\"struct TokenModel.ElGamalToken\",\"name\":\"allowed\",\"type\":\"tuple\"}],\"name\":\"setMintAllowed\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"from\",\"type\":\"address\"},{\"internalType\":\"address[]\",\"name\":\"recipients\",\"type\":\"address[]\"},{\"internalType\":\"uint256[]\",\"name\":\"consumedIds\",\"type\":\"uint256[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity[]\",\"name\":\"newTokens\",\"type\":\"tuple[]\"},{\"internalType\":\"uint256[8]\",\"name\":\"proof\",\"type\":\"uint256[8]\"},{\"internalType\":\"uint256[]\",\"name\":\"publicInputs\",\"type\":\"uint256[]\"},{\"internalType\":\"uint256\",\"name\":\"PaddingNum\",\"type\":\"uint256\"}],\"name\":\"split\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"tokenId\",\"type\":\"uint256\"},{\"internalType\":\"string\",\"name\":\"memo\",\"type\":\"string\"}],\"name\":\"transfer\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]"
const native_token_address = "0x132c6272B49B475eA882a2ad4887D317570c2547";

const fromAddress = accounts.Minter;
const rpcUrl = "localhost:50051";
// const rpcUrl = "dev2-node3-rpc.hamsa-ucl.com:50051";
// const rpcUrl = "dev2-node1-rpc.hamsa-ucl.com:50051"
const client = createClient(rpcUrl);

async function createAuthMetadata(privateKey, messagePrefix = "login") {
    const wallet = new ethers.Wallet(privateKey);
    const timestamp = Math.floor(Date.now() / 1000);
    const message = `${messagePrefix}_${timestamp}`;
    const signature = await wallet.signMessage(message);

    const metadata = new grpc.Metadata();
    metadata.set('address', wallet.address.toLowerCase());
    metadata.set('signature', signature);
    metadata.set('message', message);

    return metadata;
}

async function testMint() {
    const [signer,minter] = await ethers.getSigners();
    const native = new ethers.Contract(
        native_token_address,
        abi,
        minter
    );
    const metadata = await createAuthMetadata(accounts.MinterKey);

    const to_accounts = [
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
        // { address: accounts.Minter,amount: 10000 },
    ]
    const generateRequest = {
        sc_address: native_token_address,
        token_type: '0',
        from_address:accounts.Minter,
        to_accounts: to_accounts,
    };

    console.log("Starting to generate mint proof...");
    let response = await client.generateBatchMintProof(generateRequest, metadata);
    console.log("response", response);
    // 5 recipients
    const recipients = [];
    // 5 tokens (TokenEntity[])
    const newTokens = [];
    var fromAddress = response.from_address;
    response.to_accounts.forEach((account, index) => {
        newTokens.push( {
            id: account.token.token_id,
            owner: account.address,
            status: 2,
            amount: {
                cl_x: account.token.cl_x,
                cl_y: account.token.cl_y,
                cr_x: account.token.cr_x,
                cr_y: account.token.cr_y,
            },
            to: account.address,
            rollbackTokenId: 0
        });
        recipients.push(account.address);
    });
    // newAllowed (ElGamalToken[]) - mint_allowed
    const newAllowed =
        {
            id: response.mint_allowed.token_id,
            value: {
                cl_x: response.mint_allowed.cl_x,
                cl_y: response.mint_allowed.cl_y,
                cr_x: response.mint_allowed.cr_x,
                cr_y: response.mint_allowed.cr_y,
            }
        };
    const proof = response.proof.map(p => ethers.toBigInt(p));
    const publicInputs = response.input.map(i => ethers.toBigInt(i));
    const bathcedSize = response.batched_size
    console.log("bathcedSize", bathcedSize);
    let tx = await native.mint(recipients, newTokens, newAllowed, proof, publicInputs, bathcedSize - to_accounts.length);
    console.log(tx);
    console.log("wait for response of tx");
    let rc = await tx.wait();
    console.log(rc);
}

async function testMintWithKafka() {
    const [signer,minter] = await ethers.getSigners();
    const native = new ethers.Contract(
        native_token_address,
        abi,
        minter
    );
    const metadata = await createAuthMetadata(accounts.MinterKey);

    const to_accounts = [
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
        { address: accounts.Minter,amount: 10000 },
    ]
    const generateRequest = {
        sc_address: native_token_address,
        token_type: '0',
        from_address:accounts.Minter,
        to_accounts: to_accounts,
    };

    console.log("Starting to generate mint proof...");
    let response = await client.generateBatchMintProof(generateRequest, metadata);
    console.log("response", response);
    await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);

    const request = {
        request_id : response.request_id,
    }
    response = await client.getBatchMintProof(request,metadata)

    console.log("response:",response)
    // 5 recipients
    const recipients = [];
    // 5 tokens (TokenEntity[])
    const newTokens = [];
    var fromAddress = response.from_address;
    response.to_accounts.forEach((account, index) => {
        newTokens.push( {
            id: account.token.token_id,
            owner: account.address,
            status: 2,
            amount: {
                cl_x: account.token.cl_x,
                cl_y: account.token.cl_y,
                cr_x: account.token.cr_x,
                cr_y: account.token.cr_y,
            },
            to: account.address,
            rollbackTokenId: 0
        });
        recipients.push(account.address);
    });
    // newAllowed (ElGamalToken[]) - mint_allowed
    const newAllowed =
        {
            id: response.mint_allowed.token_id,
            value: {
                cl_x: response.mint_allowed.cl_x,
                cl_y: response.mint_allowed.cl_y,
                cr_x: response.mint_allowed.cr_x,
                cr_y: response.mint_allowed.cr_y,
            }
        };
    const proof = response.proof.map(p => ethers.toBigInt(p));
    const publicInputs = response.input.map(i => ethers.toBigInt(i));
    const bathcedSize = response.batched_size
    console.log("bathcedSize", bathcedSize);
    let tx = await native.mint(recipients, newTokens, newAllowed, proof, publicInputs, bathcedSize - to_accounts.length);
    console.log(tx);
    console.log("wait for response of tx");
    let rc = await tx.wait();
    console.log(rc);
}

async function testBatchedSplit() {
    try {
        const metadata = await createAuthMetadata(accounts.MinterKey);
        const to_accounts = [
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},{address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"}, {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},{address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"}, {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},{address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"}, {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},{address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},{address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},{address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"}, {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},{address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"}, {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},{address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"}, {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},{address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},{address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},{address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"}, {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},{address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"}, {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},{address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"}, {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},{address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
            // {address: accounts.To1,amount: 1,comment:"1"},
        ]
        const splitRequest = {
            sc_address:  native_token_address,
            token_type: '0',
            from_address: accounts.Minter,
            to_accounts: to_accounts,
        };

        let response = await client.generateBatchSplitToken(splitRequest, metadata);
        console.log("response", response);
        // await client.waitForActionCompletion(client.getTokenActionStatus, response.request_id, metadata);
        await testSplit(response.request_id, accounts.Minter);

        // await testBatchSplitPerformance([response.request_id], accounts.Minter);
        return response;

    } catch (error) {
        console.error(`failed: ${error.message}`);
        throw error;
    }
}

async function getTokenById(tokens){
    const [signer, minter] = await ethers.getSigners();
    const native = new ethers.Contract(
        native_token_address,
        abi,
        signer
    );
    console.log("signerAddress", minter.address);



    const results = {
        success: [],
        failed: []
    };

    console.log(`开始处理 ${tokens.length} 个 tokenId...`);

    // 使用 for...of 循环代替 forEach，以便更好地控制异步操作和错误处理
    for (const tokenId of tokens) {
        try {
            let response = await native.getToken(accounts.Minter, tokenId);
            console.log(`token ${tokenId} 查询成功，response: ${response.id}`);
            results.success.push({ tokenId, response });
        } catch (error) {
            console.error(`token ${tokenId} 查询失败，错误: ${error.message}`);
            results.failed.push({ tokenId, error: error.message });
        }
    }

    // 输出汇总结果
    console.log(`\n=== 查询结果汇总 ===`);
    console.log(`总查询数: ${tokens.length}`);
    console.log(`成功数: ${results.success.length}`);
    console.log(`失败数: ${results.failed.length}`);

    if (results.failed.length > 0) {
        console.log(`\n失败的 tokenId 列表:`);
        results.failed.forEach(item => {
            console.log(`- ${item.tokenId}: ${item.error}`);
        });
    }

    return results;
}
async function testSplit(requestId,fromAddress) {
    const [signer,minter] = await ethers.getSigners();

    const native = new ethers.Contract(
        native_token_address,
        abi,
        minter
    );
    const metadata = await createAuthMetadata(accounts.MinterKey);
    const splitRequest = {
        request_id: requestId
    };
    let response = await client.getBatchSplitTokenDetail(splitRequest,metadata);
    // Recipients (5 addresses for 5 transfer pairs)
    const recipients = response.to_addresses;
    console.log(recipients)
    // Consumed token IDs
    const consumedIds = [];
    response.consumedIds.forEach((ids) => {
        consumedIds.push(ids.token_id);
    });

    // NewTokens: [changeToken, transferToken1, rollbackToken1, transferToken2, rollbackToken2, ...]
    // Total 11 tokens: 1 change + 5 pairs (transfer + rollback)
    var newTokens = [];
    response.newTokens.forEach((account, index) => {
        var toAddress = index % 2 === 0 ? fromAddress : recipients[(index - 1) / 2];
        var rollbackTokenId = index % 2 === 0 ? 0 : response.newTokens[index+1].token_id;
        newTokens.push( {
            id: account.token_id,
            owner: fromAddress,
            status: 2,
            amount: {
                cl_x: account.cl_x,
                cl_y: account.cl_y,
                cr_x: account.cr_x,
                cr_y: account.cr_y,
            },
            to: toAddress,
            rollbackTokenId: rollbackTokenId
        });
    });

    const proof = response.proof.map(p => ethers.toBigInt(p));
    const publicInputs = response.public_input.map(i => ethers.toBigInt(i));
    let tx = await native.split(fromAddress, recipients, consumedIds, newTokens, proof, publicInputs, response.batched_size- recipients.length );
    console.log(tx);
    console.log("wait for response of tx");
    let rc = await tx.wait();
    console.log(rc);
    await parseEventsFromReceipt(rc, native_token_address);
}

async function testTransfer() {
    const [signer, minter] = await ethers.getSigners();

    const native = new ethers.Contract(
        native_token_address,
        abi,
        minter
    );

    let tx = await native.transfer('14835377400954059016902638591674512473253826824605355655988147055811208088773',  "hello word");
    console.log(tx);
    console.log("wait for response of tx");
    let rc = await tx.wait();
    console.log(rc);
    await parseEventsFromReceipt(rc);
}

async function testBurn(id) {
    const [signer, minter] = await ethers.getSigners();

    const native = new ethers.Contract(
        native_token_address,
        abi,
        minter
    );

    let tx = await native.burn(id);
    console.log(tx);
    console.log("wait for response of tx");
    let rc = await tx.wait();
    console.log(rc);
    await parseEventsFromReceipt(rc);
}

async function testSetMintAllowed() {
    const [signer, minter] = await ethers.getSigners();

    const native = new ethers.Contract(
        native_token_address,
        abi,
        signer
    );
    const metadata = await createAuthMetadata(accounts.OwnerKey);

    let response = await client.encodeElgamalAmount(100000000, metadata);
    const tokenId = ethers.toBigInt(response.token_id);
    const clx = ethers.toBigInt(response.amount.cl_x);
    const cly = ethers.toBigInt(response.amount.cl_y);
    const crx = ethers.toBigInt(response.amount.cr_x);
    const cry = ethers.toBigInt(response.amount.cr_y);
    let allowed = {
        id: tokenId,
        value: {
            cl_x: clx,
            cl_y: cly,
            cr_x: crx,
            cr_y: cry
        }
    }
    let tx = await native.setMintAllowed(accounts.Minter,  allowed);
    console.log(tx);
    console.log("wait for response of tx");
    let rc = await tx.wait();
    console.log(rc);
}


// 新增的批量性能测试函数
async function testBatchSplitPerformance(requestIds, fromAddress) {
    const [signer, minter] = await ethers.getSigners();
    const native = new ethers.Contract(native_token_address, abi, minter);
    const metadata = await createAuthMetadata(accounts.MinterKey);

    // 获取当前nonce
    let nonce = await minter.getNonce();
    console.log(`Starting with nonce: ${nonce}`);

    // 准备所有交易数据
    const transactions = [];
    let x = 1;
    let len= requestIds.length;
    for (const requestId of requestIds) {
        console.log(`Preparing transaction ${x}/${len} for requestId: ${requestId}`);
        x++;
        // 获取split token详细信息
        const splitRequest = { request_id: requestId };
        const response = await client.getBatchSplitTokenDetail(splitRequest, metadata);

        // 组装交易参数
        const recipients = response.to_addresses;
        const bathcedSize = response.batched_size;
        const consumedIds = [];
        response.consumedIds.forEach((ids) => {
            consumedIds.push(ids.token_id);
        });
        const nonFromAddressTokenIds = [];
        const newTokens = [];
        response.newTokens.forEach((account, index) => {
            const toAddress = index % 2 === 0 ? fromAddress : recipients[(index - 1) / 2];
            const rollbackTokenId = index % 2 === 0 ? 0 : response.newTokens[index+1].token_id;
            if (toAddress !== fromAddress) {
                nonFromAddressTokenIds.push(account.token_id);
            }
            newTokens.push({
                id: account.token_id,
                owner: fromAddress,
                status: 2,
                amount: {
                    cl_x: account.cl_x,
                    cl_y: account.cl_y,
                    cr_x: account.cr_x,
                    cr_y: account.cr_y,
                },
                to: toAddress,
                rollbackTokenId: rollbackTokenId
            });
        });
        console.log(`Non-fromAddress Token IDs: ${nonFromAddressTokenIds}`);

        const proof = response.proof.map(p => ethers.toBigInt(p));
        const publicInputs = response.public_input.map(p => ethers.toBigInt(p));

        // 添加到交易列表
        transactions.push({
            fromAddress,
            recipients,
            consumedIds,
            newTokens,
            proof,
            publicInputs,
            bathcedSize,
            nonce: nonce++
        });
    }

    console.log(`Prepared ${transactions.length} transactions`);

    // 批量发送交易
    const startTime = Date.now();
    const txPromises = transactions.map(async (txData) => {
        try {
            console.log(`Sending transaction with nonce: ${txData.nonce}`);
            const tx = await native.split(
                txData.fromAddress,
                txData.recipients,
                txData.consumedIds,
                txData.newTokens,
                txData.proof,
                txData.publicInputs,
                txData.bathcedSize - txData.recipients.length,
                { nonce: txData.nonce } // 使用指定的nonce
            );
            return { tx, nonce: txData.nonce, success: true };
        } catch (error) {
            console.error(`Error sending transaction with nonce ${txData.nonce}:`, error.message);
            return { error: error.message, nonce: txData.nonce, success: false };
        }
    });

    // 等待所有交易发送完成
    const txResults = await Promise.all(txPromises);
    const endTime = Date.now();

    console.log(`\n=== Performance Test Results ===`);
    console.log(`Total transactions: ${transactions.length}`);
    console.log(`Total time to send all transactions: ${endTime - startTime} ms`);
    console.log(`Average time per transaction: ${(endTime - startTime) / transactions.length} ms`);

    // 统计成功和失败的交易
    const successfulTx = txResults.filter(r => r.success);
    const failedTx = txResults.filter(r => !r.success);

    console.log(`\n=== Transaction Results ===`);
    console.log(`Successful transactions: ${successfulTx.length}`);
    console.log(`Failed transactions: ${failedTx.length}`);

    // 输出成功的交易哈希
    if (successfulTx.length > 0) {
        console.log(`\nSuccessful transaction hashes:`);
        successfulTx.forEach(result => {
            console.log(`Nonce ${result.nonce}: ${result.tx.hash}`);
        });
    }

    // 输出失败的交易信息
    if (failedTx.length > 0) {
        console.log(`\nFailed transactions:`);
        failedTx.forEach(result => {
            console.log(`Nonce ${result.nonce}: ${result.error}`);
        });
    }

    // 等待成功交易的确认
    if (successfulTx.length > 0) {
        console.log(`\nWaiting for transaction confirmations...`);
        const confirmPromises = successfulTx.map(async (result) => {
            try {
                const receipt = await result.tx.wait();
                return { nonce: result.nonce, receipt, success: true };
            } catch (error) {
                return { nonce: result.nonce, error: error.message, success: false };
            }
        });

        const confirmResults = await Promise.all(confirmPromises);
        const confirmedTx = confirmResults.filter(r => r.success);

        console.log(`\n=== Confirmation Results ===`);
        console.log(`Confirmed transactions: ${confirmedTx.length}`);
    }

    return {
        totalTransactions: transactions.length,
        successfulTransactions: successfulTx.length,
        failedTransactions: failedTx.length,
        totalTime: endTime - startTime,
        averageTimePerTx: (endTime - startTime) / transactions.length
    };
}

// 添加timeout辅助函数
const withTimeout = (promise, timeoutMs, nonce) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Transaction with nonce ${nonce} timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        })
    ]);
};

async function testBatchedSplitForPerformance() {
    try {
        const metadata = await createAuthMetadata(accounts.MinterKey);
        const requestIds = [];
        let count = 100;
        // 调用5次generateBatchSplitToken
        for (let i = 0; i < count; i++) {
            console.log(`Generating batch split token request ${i + 1}/ ${count} ...`);

            // 为每次请求生成不同的to_accounts，使用不同的amount值
            const to_accounts = [
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
                {address: accounts.To1,amount: 1,comment:"1"},
            ];

            const splitRequest = {
                sc_address:  native_token_address,
                token_type: '0',
                from_address: accounts.Minter,
                to_accounts: to_accounts,
            };

            let response = await client.generateBatchSplitToken(splitRequest, metadata);
            console.log(`Response for request ${i + 1}:`, response);

            // 收集request_id
            requestIds.push(response.request_id);
        }

        console.log("All generateBatchSplitToken requests completed.");
        console.log("Collected requestIds:", requestIds);

        // 调用性能测试函数，传递所有request_id
        await testBatchSplitPerformance(requestIds, accounts.Minter);

        return requestIds;

    } catch (error) {
        console.error(`Direct burn test failed: ${error.message}`);
        throw error;
    }
}

async function testBatched() {
    try {
        var requestIds = [
            'dd643983bd418f9e32daf2dfb881d99d9e6dfe3088aec3f997ff6d477290b65',
            '7097b7124d4ef7f13fd41c867c444987920688362d9e8fbe4212a2344b0ea2ad',
        ];

        // 调用性能测试函数，传递所有request_id
        await testBatchSplitPerformance(requestIds, accounts.Minter);

        return requestIds;

    } catch (error) {
        console.error(`Direct burn test failed: ${error.message}`);
        throw error;
    }
}
async function testGetSplitToken() {
    const metadata = await createAuthMetadata(accounts.MinterKey);
    let tokens = await client.getSplitTokenList(accounts.Minter, native_token_address,metadata);
    console.log("Get split token list response:", tokens);
    console.log("Get split token list response:", tokens.split_tokens.length);
}

async function testMintSequential() {
    for (let i = 0; i < 10; i++) {
        console.log(`开始第 ${i + 1} 次调用 testMint`);
        await testMint();
        // 等待一段时间，例如1秒
        await new Promise(resolve => setTimeout(resolve, 5000));
        console.log(`完成第 ${i + 1} 次调用 testMint`);
    }
}
async function testTransferConcurrent(tokenIds) {
    try {
        const [signer, minter] = await ethers.getSigners();
        const native = new ethers.Contract(
            native_token_address,
            abi,
            minter
        );

        console.log(`开始并发执行 ${tokenIds.length} 个transfer操作`);
        const startTime = Date.now();

        // 获取账户当前nonce，用于显式管理nonce
        const startingNonce = await minter.getNonce();
        console.log(`起始nonce: ${startingNonce}`);

        // 创建并发的transfer操作数组
        const transferPromises = tokenIds.map((tokenId, index) => {
            return new Promise(async (resolve, reject) => {
                try {
                    console.log(`开始执行第 ${index + 1} 个transfer操作，tokenId: ${tokenId}`);

                    // 为每个交易分配一个唯一的nonce
                    const nonce = startingNonce + index;
                    console.log(`第 ${index + 1} 个交易使用nonce: ${nonce}`);

                    // 显式指定nonce发送交易
                    let tx = await native.transfer(
                        tokenId,
                        `hello word ${index + 1}`,
                        { nonce: nonce } // 显式指定nonce
                    );

                    console.log(`第 ${index + 1} 个transfer操作已发送，tx hash: ${tx.hash}, nonce: ${nonce}`);
                    let rc = await tx.wait();
                    console.log(`第 ${index + 1} 个transfer操作已完成，receipt nonce: ${rc.nonce}`);
                    resolve({ success: true, tokenId, txHash: tx.hash, nonce: nonce, receipt: rc });
                } catch (error) {
                    console.error(`第 ${index + 1} 个transfer操作失败，tokenId: ${tokenId}，错误: ${error.message}`);
                    resolve({ success: false, tokenId, error: error.message });
                }
            });
        });

        // 并发执行所有transfer操作
        const results = await Promise.all(transferPromises);

        const endTime = Date.now();
        const totalTime = endTime - startTime;

        // 统计结果
        const successfulTransfers = results.filter(result => result.success).length;
        const failedTransfers = results.filter(result => !result.success).length;

        console.log(`\n=== 并发transfer操作结果统计 ===`);
        console.log(`总操作数: ${tokenIds.length}`);
        console.log(`成功操作数: ${successfulTransfers}`);
        console.log(`失败操作数: ${failedTransfers}`);
        console.log(`总耗时: ${totalTime} 毫秒`);
        console.log(`平均耗时: ${Math.round(totalTime / tokenIds.length)} 毫秒/操作`);

        return results;
    } catch (error) {
        console.error(`并发transfer操作执行失败: ${error.message}`);
        throw error;
    }
}

async function testTransfers() {
    const tokenIds = [

        '2226150333906267640667247287935215123021703819356646928333419301329243694079',
        '17728360774541736502696826801042220223098571201686729771347356973941576995250',
        '2677881294205540089788918423071004002128171764542944077112960513206824873059',
        '11116138218985560788862198471595876885463137853872184701902816252395041040026',
        '6586915871317704875552956328133718036885032896292603764351241648863804590968',
        '10941524176623364645232152677218579014434285565387001509246724850300310283971',
        '919288993751966304876302915771984499212293772529299933939590730727871961028',
        '3218336782177757383722445403693011234832792316165941418005388324893308813389',
        '1376726355999157790088667798279579151993882115479950845091269026219846289899',
        '18653758756650786066640561307192625485787186996438574408789431589473641692207',
        '19338186571558810656802896688133637564732044060944462456137071458984915055118',
        '5318728787734991252772372465119155882121215837738623963059746261899265812407',
        '16030651978701986163553242553746300165027068082306417695084201021786294468793',
        '9144080693288561316747277513450122451299822471948463450650960980208832560405',
        '17705379536012217515877596095185599485899015732140404680075901940631764735460',
        '12786238100246315934707724660044819438574084653130732770073286203604502540707',
        '5331207065253467545882862293373134489245164536001954466670833935477394610318',
        '12267624573608508927541998576528800447324748805377243714356901919738089405867',
        '13917356792364782941280729656652189028138234349928807181274139271177088966356',
        '19966266880473787502233004109590670580613302429799645182544009955822597113800',
        '4968124151397074190964784705881931764767173880524085488947279433107173092488',
        '13726161267271816499148811390873863700432178565466875903964527172325108679048',
        '6921796414394932930207290052615191282636318749053848624572161923148322269835',
        '1742659010118868971262894246880507494041781204768269479699662423947038218913',
        '2298048863998733405279408242935981611332706274326348881659211962327227494112',
        '15575923431041869585122655587085304161544283263915026305038504697884955069158',
        '11773781544216730158841035134612190481239258039137290202623955553766798086312',
        '950557757831455932749692889161271625609532984528870382890899441112333589125',
        '543219964029293367459828623688555257194578349066290027718282554287899203581',
        '20756319680474439704372980041358837535297489995279126532990285714960354477040',
        '12783572870573243977426804748497102029977031652906141653054377275541118895373',
        '7870639924743819859207488718235343038998685438944354589926656490716298768416',
        '9466959338092325624523265029830653609872309804973594474777553150385555634382',
        '527438398376269450962111920921677254975641879549572661315989845578784291732',
        '20987515021468318888884855289794461520457030518763468063849232531274461524409',
        '18237316550050434809180963054417909326863113973373928495475219694742920684739',
        '58996023287272971717051810404007609478480926064441905299381787756809622600',
        '20571472838179798647617438267358457160214844113087227502783105719261808084865',
        '15066077987508597274221165384673401140109098578716181978738113400901911492069',
        '10422709033719819704921402694567517087528653749828156094666957794167622340524',
        '12122396328261745022182263781225513400351168353837012563782130059480558493288',
        '16326006618152261271183709838367430344654299863292803605676834184033940227165',
        '21487078559784361998592997351214451608662603627224004109622703010461888191007',
        '12770061981404672620624154632435817317146000908788466678283463057865096373198',
        '380471213383984947448520635322845312472774677297451475600318401113754351956',
        '20203032162473335956078818972162930215598239101474537355963636569574623300001',
        '6771507997305871205243843974545269435196208827673218805222874761916496685067',
        '183360156734207064791172625881981884212034102484086673764473369743461975928',
        '13726775705454487186971546078448139922657006619245131391230325130165911036348',
        '2536225730871940102571496541803900629543076126053016293540887933473010741046',
        '19890923840728862490936548481479517401539348607632456764680349359540330361398',
        '20447890787811605306178517778091531949648271070166088196763971263724369830060',
        '15001419811545592156670866742206939176474525699080287536036155775722609728461',
        '20332983818499991748621170489165338942622103327397194686690314825307871269612',
        '10041305418857231755580567343163460651465838603914041505283803913283654587329',
        '14896429651205076285132550951213447621551394734837540683964686159956025788630',
        '10330536819212819746866322532044035424081652133582079745100941060406872262021',
        '14358280448591765151257170029220657301923450305301488865666376728208847486278',
        '3593836764664570811257628712110900035042925790012306840810869927138544810991',
        '14051211998047484239689495770545478066189150536848910143468166658477698152428',
        '17996925976527775111395163455798945310072953341722360044103387700757319083580',
        '5904188698385994314445079378885920689849084461454530095286996751997508870138',
        '4505223148489962679150824821756500078905779300545071815319550579399907016779',
        '4192394626969913993592311886200676855187807918312002243715478211788107402275',
        '2442687562019034378626310863724684518765531321028603238549983167569524553991',
        '19921713185219793954790402708326086640653767433667427397107899820247848336967',
        '3640410915522050827653817364315529906247496878715451290833435819461372945356',
        '15457934083229309727005142347372192894552412303867207442015696873516963956376',
        '17196987422616854285722642839969347102290016521424665342440678771507351748472',
        '18669806590915424133453878999115397992386569408763572865323302822689202559357',
        '552046883187643370963190995529415268590209774407248927240999389141167397700',
        '20672880444274789766225970852992722447388086380656312183617083839884953342730',
        '5933251095490928284653326730987875929399452027404693413339483964894182438373',
        '12379518569002248984221943397417770419446536425940395638523972773636176288011',
        '5598464084295887303745945649869587512461218870692207983050210701886857038396',
        '21107836907125185182295166673199712790261794782173722753380335088952829089151',
        '2967868479954782510026684040745037589044786988397156788544896914290344047748',
        '1371130356588835114845616434070139106698761467633830435431059484070165807343',
        '12845829492094254669286284559226164974635870158772468053982096866307314856430',
        '15840767119872736742356471017458158165230392719049549340673110803954909412861',
        '10117795880199080110490590416712703277455271159068081016223720753009768291138',
        '16053192714304536404492548993362147784025473280561767268752152922844511624786',
        '2776976649138470573444566464930308870761546782465120733147602179363067141164',
        '20398795376789121120921664663233284324883416516310392000299553416490411543520',
        '4004584441352049660178554808130771759162209025035125440277879459314465245381',
        '3311179507458326409976173250353585250923726281234247588696309099483056330923',
        '10671963635780771952533618035566919487614748066218537795792473265819430229562',
        '2660054255113031898752057294487107457464088519607749782417083033223641546094',
        '10304900716428441616366579599175256262750764304938163220538539230014233403626',
        '5338382202362358815765761054165004457141062930254594195429659413945982779088',
        '7807569441421022621610985951670120913805007927727419088901917835417935511782',
        '8710783247471337761583907010797853699790969526948074590478041609952195007120',
        '4890427496218882974564106482078258328665933663169841532420094976103658074099',
        '15357441545399385885586106473308609829195900229785928756460956712140924591734',
        '19356453434075134935533252288641792750017430314883333453778734658076335691617',
        '692595003590537919813508435985489879637171592371081733601732816669120788788',
        '1516975167356866670091093349774113648654203265243049025678403908705078277501',
        '16199730005355767974481317602995351851765239096428967648471427520243202686568',
        '21844697057347751909694966932916491480165174773723153347684592347705728260255',
        '18767233069506627797013567593665377650364298476027505874654242539080288096009',
        '9455561132381424197734268564323938249937418363162315582277206724167047940698',
    ];
    testTransferConcurrent(tokenIds).then(results => {
        console.log('所有transfer操作执行完成');
        console.log('详细结果:', results);
    }).catch(error => {
        console.error('并发transfer操作失败:', error);
    });
}
async function testNonce() {
    const [signer, minter] = await ethers.getSigners();
    let nonce = await minter.getNonce();
    console.log("nonce", nonce);
}
// testSetMintAllowed().then();
testMint().then();
// testMintWithKafka().then()
// testMintSequential().then();
let tokens = []

testBatchedSplit().then();
// getTokenById(tokens).then();

// testBurn('16614054352643310873897746527375656187281471852502765764326770479228319182453').then();
// testSplit('2e907f3f4092af579be595bb4b04e0ff898c647f1ba2f6aad332556839ed771',accounts.Minter).then()
// testTransfer().then();
// testNonce().then();
// testGetSplitToken().then()
// testBatched().then()
// testBatchedSplitForPerformance().then()
// testTransfers().then()