const {ethers, network}=require("hardhat");
const {networks} = require("../../hardhat.config");
const {ether} = require("@openzeppelin/test-helpers");
const {createClient} = require('../qa/token_grpc');
const accounts = require('./../../deployments/account.json');
const grpc = require("@grpc/grpc-js");
const {parseEventsFromReceipt} = require("../sun/native_token_event_test");

const abi = "[\t{\t\t\"inputs\":[\t\t\t{\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\"name\":\"tokenId\",\t\t\t\t\"type\":\"uint256\"\t\t\t}\t\t],\t\t\"name\":\"burn\",\t\t\"outputs\":[\t\t\t{\t\t\t\t\"internalType\":\"bool\",\t\t\t\t\"name\":\"\",\t\t\t\t\"type\":\"bool\"\t\t\t}\t\t],\t\t\"stateMutability\":\"nonpayable\",\t\t\"type\":\"function\"\t},\t{\t\t\"inputs\":[\t\t\t{\t\t\t\t\"internalType\":\"address\",\t\t\t\t\"name\":\"owner\",\t\t\t\t\"type\":\"address\"\t\t\t},\t\t\t{\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\"name\":\"tokenId\",\t\t\t\t\"type\":\"uint256\"\t\t\t}\t\t],\t\t\"name\":\"getToken\",\t\t\"outputs\":[\t\t\t{\t\t\t\t\"components\":[\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\"name\":\"id\",\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"address\",\t\t\t\t\t\t\"name\":\"owner\",\t\t\t\t\t\t\"type\":\"address\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"enum TokenModel.TokenStatus\",\t\t\t\t\t\t\"name\":\"status\",\t\t\t\t\t\t\"type\":\"uint8\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"components\":[\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cl_x\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cl_y\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cr_x\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cr_y\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t}\t\t\t\t\t\t],\t\t\t\t\t\t\"internalType\":\"struct TokenModel.ElGamal\",\t\t\t\t\t\t\"name\":\"amount\",\t\t\t\t\t\t\"type\":\"tuple\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"address\",\t\t\t\t\t\t\"name\":\"to\",\t\t\t\t\t\t\"type\":\"address\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\"name\":\"rollbackTokenId\",\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t}\t\t\t\t],\t\t\t\t\"internalType\":\"struct TokenModel.TokenEntity\",\t\t\t\t\"name\":\"\",\t\t\t\t\"type\":\"tuple\"\t\t\t}\t\t],\t\t\"stateMutability\":\"view\",\t\t\"type\":\"function\"\t},\t{\t\t\"inputs\":[\t\t\t{\t\t\t\t\"internalType\":\"address[]\",\t\t\t\t\"name\":\"recipients\",\t\t\t\t\"type\":\"address[]\"\t\t\t},\t\t\t{\t\t\t\t\"components\":[\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\"name\":\"id\",\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"address\",\t\t\t\t\t\t\"name\":\"owner\",\t\t\t\t\t\t\"type\":\"address\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"enum TokenModel.TokenStatus\",\t\t\t\t\t\t\"name\":\"status\",\t\t\t\t\t\t\"type\":\"uint8\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"components\":[\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cl_x\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cl_y\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cr_x\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cr_y\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t}\t\t\t\t\t\t],\t\t\t\t\t\t\"internalType\":\"struct TokenModel.ElGamal\",\t\t\t\t\t\t\"name\":\"amount\",\t\t\t\t\t\t\"type\":\"tuple\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"address\",\t\t\t\t\t\t\"name\":\"to\",\t\t\t\t\t\t\"type\":\"address\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\"name\":\"rollbackTokenId\",\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t}\t\t\t\t],\t\t\t\t\"internalType\":\"struct TokenModel.TokenEntity[]\",\t\t\t\t\"name\":\"tokens\",\t\t\t\t\"type\":\"tuple[]\"\t\t\t},\t\t\t{\t\t\t\t\"components\":[\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\"name\":\"id\",\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"components\":[\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cl_x\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cl_y\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cr_x\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cr_y\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t}\t\t\t\t\t\t],\t\t\t\t\t\t\"internalType\":\"struct TokenModel.ElGamal\",\t\t\t\t\t\t\"name\":\"value\",\t\t\t\t\t\t\"type\":\"tuple\"\t\t\t\t\t}\t\t\t\t],\t\t\t\t\"internalType\":\"struct TokenModel.ElGamalToken\",\t\t\t\t\"name\":\"newAllowed\",\t\t\t\t\"type\":\"tuple\"\t\t\t},\t\t\t{\t\t\t\t\"internalType\":\"uint256[8]\",\t\t\t\t\"name\":\"proof\",\t\t\t\t\"type\":\"uint256[8]\"\t\t\t},\t\t\t{\t\t\t\t\"internalType\":\"uint256[]\",\t\t\t\t\"name\":\"publicInputs\",\t\t\t\t\"type\":\"uint256[]\"\t\t\t},\t\t\t{\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\"name\":\"paddingNum\",\t\t\t\t\"type\":\"uint256\"\t\t\t}\t\t],\t\t\"name\":\"mint\",\t\t\"outputs\":[\t\t\t{\t\t\t\t\"internalType\":\"bool\",\t\t\t\t\"name\":\"\",\t\t\t\t\"type\":\"bool\"\t\t\t}\t\t],\t\t\"stateMutability\":\"nonpayable\",\t\t\"type\":\"function\"\t},\t{\t\t\"inputs\":[\t\t\t{\t\t\t\t\"internalType\":\"address\",\t\t\t\t\"name\":\"minter\",\t\t\t\t\"type\":\"address\"\t\t\t},\t\t\t{\t\t\t\t\"components\":[\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\"name\":\"id\",\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"components\":[\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cl_x\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cl_y\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cr_x\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cr_y\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t}\t\t\t\t\t\t],\t\t\t\t\t\t\"internalType\":\"struct TokenModel.ElGamal\",\t\t\t\t\t\t\"name\":\"value\",\t\t\t\t\t\t\"type\":\"tuple\"\t\t\t\t\t}\t\t\t\t],\t\t\t\t\"internalType\":\"struct TokenModel.ElGamalToken\",\t\t\t\t\"name\":\"allowed\",\t\t\t\t\"type\":\"tuple\"\t\t\t}\t\t],\t\t\"name\":\"setMintAllowed\",\t\t\"outputs\":[],\t\t\"stateMutability\":\"nonpayable\",\t\t\"type\":\"function\"\t},\t{\t\t\"inputs\":[\t\t\t{\t\t\t\t\"internalType\":\"address\",\t\t\t\t\"name\":\"from\",\t\t\t\t\"type\":\"address\"\t\t\t},\t\t\t{\t\t\t\t\"internalType\":\"address[]\",\t\t\t\t\"name\":\"recipients\",\t\t\t\t\"type\":\"address[]\"\t\t\t},\t\t\t{\t\t\t\t\"internalType\":\"uint256[]\",\t\t\t\t\"name\":\"consumedIds\",\t\t\t\t\"type\":\"uint256[]\"\t\t\t},\t\t\t{\t\t\t\t\"components\":[\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\"name\":\"id\",\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"address\",\t\t\t\t\t\t\"name\":\"owner\",\t\t\t\t\t\t\"type\":\"address\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"enum TokenModel.TokenStatus\",\t\t\t\t\t\t\"name\":\"status\",\t\t\t\t\t\t\"type\":\"uint8\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"components\":[\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cl_x\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cl_y\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cr_x\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t},\t\t\t\t\t\t\t{\t\t\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\t\t\"name\":\"cr_y\",\t\t\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t\t\t}\t\t\t\t\t\t],\t\t\t\t\t\t\"internalType\":\"struct TokenModel.ElGamal\",\t\t\t\t\t\t\"name\":\"amount\",\t\t\t\t\t\t\"type\":\"tuple\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"address\",\t\t\t\t\t\t\"name\":\"to\",\t\t\t\t\t\t\"type\":\"address\"\t\t\t\t\t},\t\t\t\t\t{\t\t\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\t\t\"name\":\"rollbackTokenId\",\t\t\t\t\t\t\"type\":\"uint256\"\t\t\t\t\t}\t\t\t\t],\t\t\t\t\"internalType\":\"struct TokenModel.TokenEntity[]\",\t\t\t\t\"name\":\"newTokens\",\t\t\t\t\"type\":\"tuple[]\"\t\t\t},\t\t\t{\t\t\t\t\"internalType\":\"uint256[8]\",\t\t\t\t\"name\":\"proof\",\t\t\t\t\"type\":\"uint256[8]\"\t\t\t},\t\t\t{\t\t\t\t\"internalType\":\"uint256[]\",\t\t\t\t\"name\":\"publicInputs\",\t\t\t\t\"type\":\"uint256[]\"\t\t\t},\t\t\t{\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\"name\":\"paddingNum\",\t\t\t\t\"type\":\"uint256\"\t\t\t}\t\t],\t\t\"name\":\"split\",\t\t\"outputs\":[\t\t\t{\t\t\t\t\"internalType\":\"bool\",\t\t\t\t\"name\":\"\",\t\t\t\t\"type\":\"bool\"\t\t\t}\t\t],\t\t\"stateMutability\":\"nonpayable\",\t\t\"type\":\"function\"\t},\t{\t\t\"inputs\":[\t\t\t{\t\t\t\t\"internalType\":\"uint256\",\t\t\t\t\"name\":\"tokenId\",\t\t\t\t\"type\":\"uint256\"\t\t\t},\t\t\t{\t\t\t\t\"internalType\":\"string\",\t\t\t\t\"name\":\"memo\",\t\t\t\t\"type\":\"string\"\t\t\t}\t\t],\t\t\"name\":\"transfer\",\t\t\"outputs\":[\t\t\t{\t\t\t\t\"internalType\":\"bool\",\t\t\t\t\"name\":\"\",\t\t\t\t\"type\":\"bool\"\t\t\t}\t\t],\t\t\"stateMutability\":\"nonpayable\",\t\t\"type\":\"function\"\t}]"
// const abi = "[{\"inputs\":[{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"tokenId\",\"type\":\"uint256\"}],\"name\":\"getToken\",\"outputs\":[{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity\",\"name\":\"\",\"type\":\"tuple\"}],\"stateMutability\":\"view\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address[]\",\"name\":\"recipients\",\"type\":\"address[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity[]\",\"name\":\"tokens\",\"type\":\"tuple[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"value\",\"type\":\"tuple\"}],\"internalType\":\"struct TokenModel.ElGamalToken\",\"name\":\"newAllowed\",\"type\":\"tuple\"},{\"internalType\":\"uint256[8]\",\"name\":\"proof\",\"type\":\"uint256[8]\"},{\"internalType\":\"uint256[]\",\"name\":\"publicInputs\",\"type\":\"uint256[]\"},{\"internalType\":\"uint256\",\"name\":\"PaddingNum\",\"type\":\"uint256\"}],\"name\":\"mint\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"minter\",\"type\":\"address\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"value\",\"type\":\"tuple\"}],\"internalType\":\"struct TokenModel.ElGamalToken\",\"name\":\"allowed\",\"type\":\"tuple\"}],\"name\":\"setMintAllowed\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"address\",\"name\":\"from\",\"type\":\"address\"},{\"internalType\":\"address[]\",\"name\":\"recipients\",\"type\":\"address[]\"},{\"internalType\":\"uint256[]\",\"name\":\"consumedIds\",\"type\":\"uint256[]\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"id\",\"type\":\"uint256\"},{\"internalType\":\"address\",\"name\":\"owner\",\"type\":\"address\"},{\"internalType\":\"enum TokenModel.TokenStatus\",\"name\":\"status\",\"type\":\"uint8\"},{\"components\":[{\"internalType\":\"uint256\",\"name\":\"cl_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cl_y\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_x\",\"type\":\"uint256\"},{\"internalType\":\"uint256\",\"name\":\"cr_y\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.ElGamal\",\"name\":\"amount\",\"type\":\"tuple\"},{\"internalType\":\"address\",\"name\":\"to\",\"type\":\"address\"},{\"internalType\":\"uint256\",\"name\":\"rollbackTokenId\",\"type\":\"uint256\"}],\"internalType\":\"struct TokenModel.TokenEntity[]\",\"name\":\"newTokens\",\"type\":\"tuple[]\"},{\"internalType\":\"uint256[8]\",\"name\":\"proof\",\"type\":\"uint256[8]\"},{\"internalType\":\"uint256[]\",\"name\":\"publicInputs\",\"type\":\"uint256[]\"},{\"internalType\":\"uint256\",\"name\":\"PaddingNum\",\"type\":\"uint256\"}],\"name\":\"split\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"inputs\":[{\"internalType\":\"uint256\",\"name\":\"tokenId\",\"type\":\"uint256\"},{\"internalType\":\"string\",\"name\":\"memo\",\"type\":\"string\"}],\"name\":\"transfer\",\"outputs\":[{\"internalType\":\"bool\",\"name\":\"\",\"type\":\"bool\"}],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]"
const native_token_address = "0x4dA51d6A39687ffCf9f5fc163C102aE8b23a123d";

const fromAddress = accounts.Minter;
// const rpcUrl = "localhost:50051";
const rpcUrl = "dev2-node3-rpc.hamsa-ucl.com:50051";
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

async function testBatchedSplit() {
    try {
        const metadata = await createAuthMetadata(accounts.MinterKey);
        const to_accounts = [
            {address: '',amount: 2,comment:"2"},
            {address: '',amount: 3,comment:"3"},
            {address: '',amount: 4,comment:"4"},
            {address: '',amount: 5,comment:"5"},
            {address: '',amount: 6,comment:"6"},
            {address: accounts.To1,amount: 1,comment:"1"},
        ]
        const splitRequest = {
            sc_address:  native_token_address,
            token_type: '0',
            from_address: accounts.Minter,
            to_accounts: to_accounts,
        };

        let response = await client.generateBatchSplitToken(splitRequest, metadata);
        console.log("response", response);
        // await testSplit(response.request_id, accounts.Minter);

        await testBatchSplitPerformance([response.request_id], accounts.Minter);
        return response;

    } catch (error) {
        console.error(`Direct burn test failed: ${error.message}`);
        throw error;
    }
}

async function getTokenById(){
    const [signer, minter] = await ethers.getSigners();
    const native = new ethers.Contract(
        native_token_address,
        abi,
        signer
    );
    console.log("signerAddress", minter.address);

    let tokens = [
        '21874367850472603830956612634266321865299967403352196894717301333950456834520',
        '20733447670283116854222731307658614787174484515533733901945797665000281170445',
        '21671927841327136299433019576064568660278992560971219347022721725025834658470',
        '4904156794874586464313960803265303601803513072388566612635605847929169684818',
        '15131217639310241158890917003046250575696970682251825214522635411799644211992',
        '9733246618418561057679183834346330468973958076110242868293415697404861033890',

    ];

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
            console.log(response)
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
    console.log("batched Split:", response);
    // Recipients (5 addresses for 5 transfer pairs)
    const recipients = response.to_addresses;

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
    console.log(fromAddress, recipients, consumedIds, newTokens, proof, publicInputs);
    let tx = await native.split(fromAddress, recipients, consumedIds, newTokens, proof, publicInputs);
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
        let count = 96;
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
        '17616547779506773998158437204466826408622186966294046724164720563283054134132',
        '19873986372674885729533599370127161902014949228513941673449919386997669538077',
        '16146513216898211499997041569663017611957840008026136146461014599817870660196',
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
// testMint().then();
// testMintSequential().then();
// testBatchedSplit().then();
testBurn('16614054352643310873897746527375656187281471852502765764326770479228319182453').then();
// getTokenById().then();
// testSplit('2e907f3f4092af579be595bb4b04e0ff898c647f1ba2f6aad332556839ed771',accounts.Minter).then()
// testTransfer().then();
// testNonce().then();
// testGetSplitToken().then()
// testBatched().then()
// testBatchedSplitForPerformance().then()
// testTransfers().then()