pragma solidity ^0.8.0;


import "./InstUserDataTemplate.sol";

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

    function registerInstitution(address institutionAddress, string memory name, TokenModel.GrumpkinPublicKey memory publicKey, string memory rpcUrl,
        string memory nodeUrl, string memory httpUrl) external onlyOwner {

        require(institutionAddress != address(0), "Invalid address");
        require(! isEmptyString(name), "institution name can't be empty");
        require(! isEmptyString(rpcUrl), "institution rpcUrl can't be empty");
        require(! isEmptyString(nodeUrl), "institution nodeUrl can't be empty");
        require(! isEmptyString(httpUrl), "institution httpUrl can't be empty");

        require(publicKey.x != 0, "invalid public key");
        require(isEmptyString(institutions[institutionAddress].name), "institution already registered. Call updateInstitution to update");


        Institution memory institution = Institution({
        name : name,
        managerAddress : institutionAddress,
        publicKey : publicKey,
        rpcUrl : rpcUrl,
        nodeUrl : nodeUrl,
        httpUrl : httpUrl
        });

        institutions[institutionAddress]  = institution;
        userToManager[institutionAddress] = institutionAddress;
        if (!institutionAddressTracked[institutionAddress]) {
            institutionAddresses.push(institutionAddress);
            institutionAddressTracked[institutionAddress] = true;
        }
        address[] memory defaultCallers = new address[](1);
        defaultCallers[0] = institutionAddress;
        _replaceInstitutionCallers(institutionAddress, defaultCallers);

        TokenEventLib.triggerInstitutionRegisteredEvent(
            l2Event,
            address(this),
            owner,
            institutionAddress,
            name,
            publicKey,
            rpcUrl,
            nodeUrl,
            httpUrl
        );
    }

    function registerInstitutionToken(address institutionManager) external {
        require(institutionManager != address(0), "Invalid institution manager");

        address currentInstitution = tokenToManagerAddress[msg.sender];
        require(currentInstitution == address(0) || currentInstitution == institutionManager, "Token already linked");

        tokenToManagerAddress[msg.sender] = institutionManager;
    }

    function updateInstitution(address institutionAddress, string memory name, string memory rpcUrl, string memory nodeUrl, string memory httpUrl) external onlyOwner {
        require(institutionAddress != address(0), "Invalid address");

        Institution storage institution = institutions[institutionAddress];
        require(institution.managerAddress != address(0), "Institution is still not registered yet");


        if (! isEmptyString(name)) {
            institution.name = name;
        }

        if (! isEmptyString(rpcUrl)) {
            institution.rpcUrl = rpcUrl;
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
            institution.rpcUrl,
            institution.nodeUrl,
            institution.httpUrl
        );
    }

    function replaceInstitutionCallers(address institutionAddress, address[] calldata newCallers) external onlyOwner {
        require(institutionAddress != address(0), "Invalid address");

        Institution storage institution = institutions[institutionAddress];
        require(institution.managerAddress != address(0), "Institution is still not registered yet");

        _replaceInstitutionCallers(institutionAddress, newCallers);
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
        return tokenToManagerAddress[tokenAddress];
    }

    function getTokenInstitution(address tokenAddress) public view returns (Institution memory) {
        return institutions[tokenToManagerAddress[tokenAddress]];
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
                institutionAddresses.push(managerAddress);
                institutionAddressTracked[managerAddress] = true;
            }
        }
    }

    function getAllInstitutions() external view returns (Institution[] memory) {
        uint256 totalInstitutions = institutionAddresses.length;
        Institution[] memory result = new Institution[](totalInstitutions);

        for (uint256 i = 0; i < totalInstitutions; i++) {
            address managerAddress = institutionAddresses[i];
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
