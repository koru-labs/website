pragma solidity ^0.8.0;
import {TokenModel} from "./TokenModel.sol";

library InstUserModel {

    struct Institution {
        string name;
        address managerAddress;
        TokenModel.GrumpkinPublicKey publicKey;
        string nodeUrl;
        string httpUrl;
    }
}