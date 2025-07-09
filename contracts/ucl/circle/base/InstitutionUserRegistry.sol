pragma solidity ^0.8.0;

import "../model/TokenModel.sol";
import "../model/InstUserModel.sol";
import "../lib/TokenEventLib.sol";
import "../event/IL2Event.sol";
import "./IInstUsrData.sol";

contract InstitutionUserRegistry {
    address public owner;
    IL2Event public l2Event;
    IInstUser private instUserData;

    constructor(address _l2Event, IInstUser _data) {
        owner = msg.sender;
        l2Event = IL2Event(_l2Event);
        instUserData = _data;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyInstitutionManager() {
        require(instUserData.getInstByManager(msg.sender).managerAddress != address(0), "Only institution manager can call this function");
        _;
    }

    function registerInstitution(address institutionAddress, string memory name, TokenModel.GrumpkinPublicKey memory publicKey,
        string memory nodeUrl, string memory httpUrl) external onlyOwner {

        require(institutionAddress != address(0), "Invalid address");
        require(! isEmptyString(name), "institution name can't be empty");
        require(! isEmptyString(nodeUrl), "institution nodeUrl can't be empty");
        require(! isEmptyString(httpUrl), "institution httpUrl can't be empty");

        require(publicKey.x != 0, "invalid public key");
        require(isEmptyString(instUserData.getInstByManager(institutionAddress).name), "institution already registered. Call updateInstitution to update");


        InstUserModel.Institution memory institution = InstUserModel.Institution({
        name : name,
        managerAddress : institutionAddress,
        publicKey : publicKey,
        nodeUrl : nodeUrl,
        httpUrl : httpUrl
        });

        instUserData.saveInstByManager(institutionAddress, institution);
        instUserData.saveUserManager(institutionAddress, institutionAddress);

        TokenEventLib.triggerInstitutionRegisteredEvent(
            l2Event,
            address(this),
            owner,
            institutionAddress,
            name,
            publicKey,
            nodeUrl,
            httpUrl
        );
    }

    function updateInstitution(address institutionAddress, string memory name, string memory nodeUrl, string memory httpUrl) external onlyOwner {
        require(institutionAddress != address(0), "Invalid address");

        InstUserModel.Institution memory institution = instUserData.getInstByManager(institutionAddress);
        require(institution.managerAddress != address(0), "Institution is still not registered yet");


        if (! isEmptyString(name)) {
            institution.name = name;
        }

        if (! isEmptyString(nodeUrl)) {
            institution.nodeUrl = nodeUrl;
        }

        if (! isEmptyString(httpUrl)) {
            institution.httpUrl = httpUrl;
        }
        instUserData.saveInstByManager(institutionAddress, institution);

        TokenEventLib.triggerInstitutionUpdatedEvent(
            l2Event,
            address(this),
            owner,
            institutionAddress,
            institution.name,
            institution.nodeUrl,
            institution.httpUrl
        );
    }

    function registerUser(address userAddress) external onlyInstitutionManager {
        require(userAddress != address(0), "Invalid user address");
        address existingManager= instUserData.getUserManager(userAddress);
        require(existingManager == address(0) || existingManager == msg.sender, "User already registered");

        instUserData.saveUserManager(userAddress, msg.sender);
        TokenEventLib.triggerUserRegisteredEvent(
            l2Event,
            address(this),
            owner,
            userAddress,
            msg.sender
        );
    }

    function removeUser(address userAddress) external onlyInstitutionManager {
        require(userAddress != address(0), "Invalid user address");
        require(instUserData.getUserManager(userAddress) == msg.sender, "User not managed by this institution");

        instUserData.removeUser(userAddress);
        TokenEventLib.triggerUserRemovedEvent(
            l2Event,
            address(this),
            owner,
            userAddress,
            msg.sender
        );
    }
    
    function getUserManager(address userAddress) public view returns (address) {
        return instUserData.getUserManager(userAddress);
    }

    function getInstitution(address managerAddress) public view returns (InstUserModel.Institution memory) {
        return instUserData.getInstByManager(managerAddress);
    }

    function isInstitutionManager(address managerAddress) public view returns (bool) {
        return instUserData.getInstByManager(managerAddress).managerAddress != address(0);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner address");
        owner = newOwner;
    }

    function getUserInstGrumpkinPubKey(address userAddress) public view returns (TokenModel.GrumpkinPublicKey memory) {
        address institutionAddress = instUserData.getUserManager(userAddress);
        return instUserData.getInstByManager(institutionAddress).publicKey;
    }

    function isEmptyString(string memory str) public pure returns (bool) {
        return bytes(str).length == 0;
    }
}