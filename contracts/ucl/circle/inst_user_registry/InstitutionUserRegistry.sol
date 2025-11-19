pragma solidity ^0.8.0;


import "./InstUserDataTemplate.sol";
import "../event/L2EventDefinitions.sol";

contract InstitutionUserRegistry is InstUserDataTemplate {

    modifier onlyOwner() {
        require(msg.sender == owner || owner == address(0), "Only owner can call this function");
        _;
    }

    function initialize(address _owner, address _l2Event) external onlyOwner {
        require(_owner != address(0), "owner is empty");
        require(_l2Event != address(0), "event is null");

        owner = _owner;
        l2Event = IL2Event(_l2Event);
    }

    modifier onlyInstitutionManager() {
        require(institutions[msg.sender].managerAddress != address(0), "Only institution manager can call this function");
        _;
    }

    function registerInstitution(RegisterInstitutionParams calldata params) external onlyOwner {

        require(params.managerAddress != address(0), "Invalid address");
        require(! isEmptyString(params.name), "institution name can't be empty");
        require(! isEmptyString(params.rpcUrl), "institution rpcUrl can't be empty");
        require(! isEmptyString(params.nodeUrl), "institution nodeUrl can't be empty");
        require(! isEmptyString(params.httpUrl), "institution httpUrl can't be empty");

        require(params.publicKey.x != 0, "invalid public key");
        require(isEmptyString(institutions[params.managerAddress].name), "institution already registered. Call updateInstitution to update");


        Institution memory institution = Institution({
        name : params.name,
        streetAddress: params.streetAddress,
        suiteNo: params.suiteNo,
        city: params.city,
        state: params.state,
        zip: params.zip,
        managerAddress : params.managerAddress,
        publicKey : params.publicKey,
        rpcUrl : params.rpcUrl,
        nodeUrl : params.nodeUrl,
        httpUrl : params.httpUrl,
        isDisabled : false
        });

        institutions[params.managerAddress]  = institution;
        userToManager[params.managerAddress] = params.managerAddress;
        if (!institutionAddressTracked[params.managerAddress]) {
            institutionManagerAddresses.push(params.managerAddress);
            institutionAddressTracked[params.managerAddress] = true;
        }

        InstitutionRegisteredEvent memory eventData = InstitutionRegisteredEvent({
            institutionAddress: params.managerAddress,
            name: params.name,
            streetAddress: params.streetAddress,
            suiteNo: params.suiteNo,
            city: params.city,
            state: params.state,
            zip: params.zip,
            publicKey: params.publicKey,
            rpcUrl: params.rpcUrl,
            nodeUrl: params.nodeUrl,
            httpUrl: params.httpUrl
        });

        TokenEventLib.triggerInstitutionRegisteredEvent(
            l2Event,
            address(this),
            owner,
            eventData
        );
    }

    function registerInstitutionToken(address institutionManager) external {
        require(institutionManager != address(0), "Invalid institution manager");

        Institution storage institution = institutions[institutionManager];
        require(institution.managerAddress != address(0), "Institution not registered");

        address currentInstitution = tokenToInstitutionManagerAddress[msg.sender];
        require(currentInstitution == address(0) || currentInstitution == institutionManager, "Token already linked");

        tokenToInstitutionManagerAddress[msg.sender] = institutionManager;
    }

    function updateInstitution(UpdateInstitutionParams calldata params) external onlyOwner {
        require(params.managerAddress != address(0), "Invalid address");

        Institution storage institution = institutions[params.managerAddress];
        require(institution.managerAddress != address(0), "Institution is still not registered yet");


        if (! isEmptyString(params.name)) {
            institution.name = params.name;
        }

        if (! isEmptyString(params.streetAddress)) {
            institution.streetAddress = params.streetAddress;
        }

        if (! isEmptyString(params.suiteNo)) {
            institution.suiteNo = params.suiteNo;
        }

        if (! isEmptyString(params.city)) {
            institution.city = params.city;
        }

        if (! isEmptyString(params.state)) {
            institution.state = params.state;
        }

        if (! isEmptyString(params.zip)) {
            institution.zip = params.zip;
        }

        if (! isEmptyString(params.rpcUrl)) {
            institution.rpcUrl = params.rpcUrl;
        }

        if (! isEmptyString(params.nodeUrl)) {
            institution.nodeUrl = params.nodeUrl;
        }

        if (! isEmptyString(params.httpUrl)) {
            institution.httpUrl = params.httpUrl;
        }

        institution.managerAddress = params.managerAddress;

        InstitutionUpdatedEvent memory eventData = InstitutionUpdatedEvent({
            institutionAddress: params.managerAddress,
            name: institution.name,
            streetAddress: institution.streetAddress,
            suiteNo: institution.suiteNo,
            city: institution.city,
            state: institution.state,
            zip: institution.zip,
            rpcUrl: institution.rpcUrl,
            nodeUrl: institution.nodeUrl,
            httpUrl: institution.httpUrl
        });

        TokenEventLib.triggerInstitutionUpdatedEvent(
            l2Event,
            address(this),
            owner,
            eventData
        );
    }

    function replaceInstitutionCallers(address institutionAddress, address[] calldata newCallers) external onlyOwner {
        require(institutionAddress != address(0), "Invalid address");

        Institution storage institution = institutions[institutionAddress];
        require(institution.managerAddress != address(0), "Institution is still not registered yet");

        _replaceInstitutionCallers(institutionAddress, newCallers);
        TokenEventLib.triggerReplaceInstCallersEvent(
            l2Event,
            address(this),
            owner,
            institutionAddress,
            newCallers
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

    function getTokenInstitutionManager(address tokenAddress) public view returns (address) {
        return tokenToInstitutionManagerAddress[tokenAddress];
    }

    function getTokenInstitution(address tokenAddress) public view returns (Institution memory) {
        return institutions[tokenToInstitutionManagerAddress[tokenAddress]];
    }

    function getUserInstitution(address userAddress) public view returns (Institution memory) {
        return institutions[getUserManager(userAddress)];
    }

    function isInstitutionManager(address managerAddress) public view returns (bool) {
        return institutions[managerAddress].managerAddress != address(0);
    }

    function isInstitutionCaller(address institutionAddress, address caller) public view returns (bool) {
        return institutionToCallers[institutionAddress][caller];
    }

    function getInstitutionCallers(address institutionAddress) external view returns (address[] memory) {
        address[] storage callers = institutionCallerList[institutionAddress];
        address[] memory result = new address[](callers.length);
        for (uint256 i = 0; i < callers.length; i++) {
            result[i] = callers[i];
        }
        return result;
    }

    function setInstitutionManagerBlacklist(address managerAddress, bool blacklisted) external onlyOwner {
        require(managerAddress != address(0), "Invalid manager address");

        Institution storage institution = institutions[managerAddress];
        require(institution.managerAddress != address(0), "Institution not registered");

        institutionManagerBlacklist[managerAddress] = blacklisted;
        institution.isDisabled = blacklisted;

        TokenEventLib.triggerInstitutionManagerBlacklistUpdatedEvent(
            l2Event,
            address(this),
            owner,
            managerAddress,
            blacklisted
        );
    }

    function isInstitutionManagerBlacklisted(address managerAddress) public view returns (bool) {
        return institutionManagerBlacklist[managerAddress];
    }

    function getValidatedInstitutionManager(address userAddress) external view returns (address) {
        address managerAddress = userToManager[userAddress];
        require(managerAddress != address(0), "User not registered");
        require(institutionAddressTracked[managerAddress], "Institution manager not tracked");
        return managerAddress;
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

    function getEventAddress() public view returns (address) {
        return address(l2Event);
    }

    function backfillInstitutionAddresses(address[] calldata managers) external onlyOwner {
        for (uint256 i = 0; i < managers.length; i++) {
            address managerAddress = managers[i];
            require(managerAddress != address(0), "Invalid manager address");

            Institution storage institution = institutions[managerAddress];
            require(institution.managerAddress != address(0), "Institution not registered");

            if (!institutionAddressTracked[managerAddress]) {
                institutionManagerAddresses.push(managerAddress);
                institutionAddressTracked[managerAddress] = true;
            }
        }
    }

    function getAllInstitutions() external view returns (Institution[] memory) {
        uint256 totalInstitutions = institutionManagerAddresses.length;
        Institution[] memory result = new Institution[](totalInstitutions);

        for (uint256 i = 0; i < totalInstitutions; i++) {
            address managerAddress = institutionManagerAddresses[i];
            result[i] = institutions[managerAddress];
        }

        return result;
    }

    function _replaceInstitutionCallers(address institutionAddress, address[] memory newCallers) internal {
        address[] storage existingCallers = institutionCallerList[institutionAddress];
        for (uint256 i = 0; i < existingCallers.length; i++) {
            address existingCaller = existingCallers[i];
            if (institutionToCallers[institutionAddress][existingCaller]) {
                delete institutionToCallers[institutionAddress][existingCaller];
            }
        }

        delete institutionCallerList[institutionAddress];

        bool managerIncluded = false;

        for (uint256 i = 0; i < newCallers.length; i++) {
            address caller = newCallers[i];
            require(caller != address(0), "caller is empty");
            require(!institutionToCallers[institutionAddress][caller], "caller duplicated");

            institutionToCallers[institutionAddress][caller] = true;
            institutionCallerList[institutionAddress].push(caller);

            if (caller == institutionAddress) {
                managerIncluded = true;
            }
        }

        if (!managerIncluded) {
            institutionToCallers[institutionAddress][institutionAddress] = true;
            institutionCallerList[institutionAddress].push(institutionAddress);
        }
    }
}
