pragma solidity ^0.8.0;

import "../model/TokenModel.sol";
import "../lib/TokenEventLib.sol";
import "../event/IL2Event.sol";

contract InstitutionUserRegistry {
    address public owner;
    IL2Event public l2Event;

    struct Institution {
        string name;
        address managerAddress;
        TokenModel.GrumpkinPublicKey publicKey;
        string nodeUrl;
        string httpUrl;
    }

    mapping(address => Institution) public institutions;
    mapping(address => address) public userToManager;

    constructor(address _l2Event) {
        owner = msg.sender;
        l2Event = IL2Event(_l2Event);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyInstitutionManager() {
        require(institutions[msg.sender].managerAddress != address(0), "Only institution manager can call this function");
        _;
    }

    function registerInstitution(address institutionAddress, string memory name, TokenModel.GrumpkinPublicKey memory publicKey,
        string memory nodeUrl, string memory httpUrl) external onlyOwner {

        require(institutionAddress != address(0), "Invalid address");
        require(! isEmptyString(name), "institution name can't be empty");
        require(! isEmptyString(nodeUrl), "institution nodeUrl can't be empty");
        require(! isEmptyString(httpUrl), "institution httpUrl can't be empty");

        require(publicKey.x != 0, "invalid public key");
        require(isEmptyString(institutions[institutionAddress].name), "institution already registered. Call updateInstitution to update");


        Institution memory institution = Institution({
        name : name,
        managerAddress : institutionAddress,
        publicKey : publicKey,
        nodeUrl : nodeUrl,
        httpUrl : httpUrl
        });

        institutions[institutionAddress]  = institution;
        userToManager[institutionAddress] = institutionAddress;

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

        Institution storage institution = institutions[institutionAddress];
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
        require(userToManager[userAddress] == address(0) || userToManager[userAddress] == msg.sender, "User already registered");

        userToManager[userAddress] = msg.sender;

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
        require(userToManager[userAddress] == msg.sender, "User not managed by this institution");

        delete userToManager[userAddress];

        TokenEventLib.triggerUserRemovedEvent(
            l2Event,
            address(this),
            owner,
            userAddress,
            msg.sender
        );
    }

    function getUserManager(address userAddress) public view returns (address) {
        return userToManager[userAddress];
    }

    function getInstitution(address managerAddress) public view returns (Institution memory) {
        return institutions[managerAddress];
    }

    function isInstitutionManager(address managerAddress) public view returns (bool) {
        return institutions[managerAddress].managerAddress != address(0);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner address");
        owner = newOwner;
    }

    function getUserInstGrumpkinPubKey(address userAddress) public view returns (TokenModel.GrumpkinPublicKey memory) {
        address institutionAddress = getUserManager(userAddress);
        return institutions[institutionAddress].publicKey;
    }

    function isEmptyString(string memory str) public pure returns (bool) {
        return bytes(str).length == 0;
    }

}