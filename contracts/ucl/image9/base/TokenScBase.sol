pragma solidity ^0.8.0;

import "../event/IL2Event.sol";
import "../event/L2EventDefinitions.sol";
import "../nova/sol/fr.sol";
import "../nova/sol/verifier.sol";
import "./ITokenScBase.sol";
import "./TokenModel.sol";
import "./TokenVerificationLib.sol";
import "./TokenOperationsLib.sol";
import "./DVPLib.sol";
import "./TokenEventLib.sol";

contract TokenScBase is ITokenScBase {
    using TokenModel for TokenModel.TokenEntity;

    mapping(address => mapping(uint256 => TokenModel.TokenEntity)) public userTokenMap;
    mapping(address => mapping(uint256 => uint256)) public ercBalancenMap;
    mapping(address => bool) public isBankAccount;
    address public scOwner;
    IL2Event private _l2Event;

    constructor(TokenSCTypeEnum tokenSCType, IL2Event l2Event) {
        scOwner = msg.sender;
        _l2Event = l2Event;
        TokenEventLib.triggerTokenSCCreatedEvent(_l2Event, address(this), msg.sender, tokenSCType);
    }

    modifier onlySCOwner() {
        require(msg.sender == scOwner, "Only owner can call this function");
        _;
    }

    modifier onlyBankAccount() {
        require(isBankAccount[msg.sender], "Only bank account can call this function");
        _;
    }

    function addBankAccount(address account) external onlySCOwner {
        isBankAccount[account] = true;
    }

    function removeBankAccount(address account) external onlySCOwner {
        isBankAccount[account] = false;
    }

    modifier validParentToken(TokenModel.TokenValueUpdate memory parentToken) {
        uint256 id = parentToken.id;
        address owner = parentToken.owner;

        require(id != 0, "invalid parentTokenUpdate parentId");
        require(owner != address(0), "invalid parentTokenUpdate owner");

        TokenModel.TokenStatus parentStatus = userTokenMap[owner][id].status;
        require(parentStatus != TokenModel.TokenStatus.deleted, "specified parent token doesn't exists");

        _;
    }

    modifier validBatchParentToken(TokenModel.TokenMergeAndUpdate memory parentToken) {
        uint256[] memory id = parentToken.id;
        address owner = parentToken.owner;
        require(owner != address(0), "invalid parentTokenUpdate owner");

        for (uint256 i = 0; i < parentToken.id.length; i++) {
            uint256 id = parentToken.id[i];
            require(id != 0, "invalid parentTokenUpdate parentId");

            TokenModel.TokenStatus parentStatus = userTokenMap[owner][id].status;
            require(parentStatus != TokenModel.TokenStatus.deleted, "specified parent token doesn't exists");
        }

        _;
    }

    function splitToken(TokenModel.TokenValueUpdate calldata parentTokenUpdate, TokenModel.NewToken[] calldata childTokens, bytes calldata proof) 
        public override 
        validParentToken(parentTokenUpdate) 
        onlyBankAccount 
    {
        // 验证证明
        (bool isValid, uint result, uint256[] memory znValues) = TokenVerificationLib.verifyTokenSplit(parentTokenUpdate, childTokens, proof);
        require(isValid, "invalid proof");

        // 处理token拆分逻辑
        TokenOperationsLib.splitTokenLogic(userTokenMap, parentTokenUpdate, childTokens);

        // 触发拆分事件
        for (uint256 i = 0; i < childTokens.length; i++) {
            TokenModel.TokenEntity memory childEntity = userTokenMap[parentTokenUpdate.owner][childTokens[i].id];
            TokenEventLib.triggerTokenSplitEvent(_l2Event, address(this), childEntity.manager, childEntity);
        }

    }

    function mergeTokens(uint256[] calldata childTokens, TokenModel.TokenValueUpdate calldata mergeTokenUpdate) public override onlyBankAccount {
        // 合并处理逻辑
        TokenOperationsLib.mergeTokensLogic(userTokenMap, childTokens, mergeTokenUpdate);

        // 触发合并事件
        TokenModel.TokenEntity storage firstChild = userTokenMap[mergeTokenUpdate.owner][childTokens[0]];
        TokenModel.TokenEntity memory entity = userTokenMap[mergeTokenUpdate.owner][mergeTokenUpdate.id];

        TokenEventLib.triggerTokenMergeEvent(_l2Event, address(this), firstChild.manager, entity);
    }

    function mintToken(TokenModel.NewToken calldata token, bytes calldata proof) external onlyBankAccount {
        // 验证证明
        (bool isValid, uint result, uint256[] memory znValues) = TokenVerificationLib.verifyTokenMint(token, proof);
        require(isValid, "invalid proof");

        // 执行铸造逻辑
        TokenOperationsLib.mintTokenLogic(userTokenMap, token);

        // 触发铸造事件
        TokenModel.TokenEntity memory entity = userTokenMap[token.owner][token.id];
        TokenEventLib.triggerTokenMintedEvent(_l2Event, address(this), token.manager, entity);

    }

    function transferToken(uint256 tokenId, address toManager, address to) public override {
        address owner = msg.sender;
        TokenModel.TokenEntity memory beforeToken = userTokenMap[owner][tokenId];
        address beforeManager = beforeToken.manager;
        // 执行转移逻辑
        TokenOperationsLib.transferTokenLogic(userTokenMap, tokenId, owner, toManager, to);
        // 触发事件
        TokenModel.TokenEntity memory token = userTokenMap[to][tokenId];
        // 只有跨行的时候才需要发送TransferredEvent
        if (toManager!= beforeManager) {
            TokenEventLib.triggerTokenTransferredEvent(_l2Event, address(this), beforeManager, token);
        }
        TokenEventLib.triggerTokenReceivedEvent(_l2Event, address(this), token.manager, token);
    }

    function delegateTransferToken(TokenModel.TokenValueUpdate calldata parentTokenUpdate, TokenModel.NewToken[] calldata childTokens, bytes calldata proof) 
        public override 
        validParentToken(parentTokenUpdate) 
        onlyBankAccount 
    {
        // 验证证明
        (bool isValid, uint result, uint256[] memory znValues) = TokenVerificationLib.verifyTokenSplit(parentTokenUpdate, childTokens, proof);
        require(isValid, "invalid proof");

        // 执行委托转移逻辑
        TokenOperationsLib.delegateTransferTokenLogic(userTokenMap, parentTokenUpdate, childTokens);

        // 触发事件
        for (uint256 i = 0; i < childTokens.length; i++) {
            TokenModel.TokenEntity memory childEntity = userTokenMap[parentTokenUpdate.owner][childTokens[i].id];
            TokenEventLib.triggerTokenSplitEvent(_l2Event, address(this), childEntity.manager, childEntity);
            if (childTokens[i].owner != parentTokenUpdate.owner) {
                TokenEventLib.triggerTokenReceivedEvent(_l2Event, address(this), childEntity.manager, childEntity);
            }
        }
    }

    function burnToken(uint256 tokenId) external {
        address owner = msg.sender;
        
        // 执行销毁逻辑
        TokenOperationsLib.burnTokenLogic(userTokenMap, owner, tokenId);
        
        // 触发事件
        TokenModel.TokenEntity memory token = userTokenMap[owner][tokenId];
        TokenEventLib.triggerTokenBurnedEvent(_l2Event, address(this), token.manager, token);
    }

    function removeToken(address owner, uint256 tokenId) external override onlyBankAccount {
        // 先获取token信息
        address tokenManager = userTokenMap[owner][tokenId].manager;
        
        // 执行移除逻辑
        TokenOperationsLib.removeTokenLogic(userTokenMap, owner, tokenId);
        
        // 触发事件
        TokenEventLib.triggerTokenRemovedEvent(_l2Event, address(this), tokenManager, owner, tokenId);
    }

    function convertPlainToPrivateToken(
        address owner,
        address manager,
        uint256 tokenType,
        uint256 amount,
        uint256 tokenId
    ) external onlyBankAccount {
        // 执行转换逻辑
        TokenOperationsLib.convertPlainToPrivateTokenLogic(userTokenMap, ercBalancenMap, owner, manager, tokenType, amount, tokenId);
        
        // 触发事件
        TokenModel.TokenEntity memory entity = userTokenMap[owner][tokenId];
        TokenEventLib.triggerTokenConvertedEvent(_l2Event, address(this), manager, entity, amount);
    }

    function splitTokenForDVP(address spender, TokenModel.TokenValueUpdate calldata parentTokenUpdate, TokenModel.NewToken[] calldata childTokens, bytes calldata proof) 
        public override 
        validParentToken(parentTokenUpdate) 
        onlyBankAccount 
    {
        // 验证证明
        (uint result, Fr[] memory z0, Fr[] memory zn) = TokenVerificationLib.verify(proof);
        
        // 先获取父token的manager信息
        address parentTokenManager = userTokenMap[parentTokenUpdate.owner][parentTokenUpdate.id].manager;
        
        // 执行DVP拆分逻辑
        (uint256 rollbackTokenId, uint256 receiverTokenId, uint256 changeTokenId) = DVPLib.splitTokenForDVPLogic(
            userTokenMap, 
            spender, 
            parentTokenUpdate, 
            childTokens, 
            z0, 
            zn
        );
        
        // 触发事件
        TokenEventLib.triggerTokenRemovedEvent(_l2Event, address(this), parentTokenManager, parentTokenUpdate.owner, parentTokenUpdate.id);

        // 验证tokenID
        TokenModel.TokenEntity memory rollbackTokenEntity = userTokenMap[parentTokenUpdate.owner][rollbackTokenId];
        require(TokenVerificationLib.verifyDVPRollbackToken(zn, rollbackTokenEntity), "verifyDVPRollbackToken error");

        TokenModel.TokenEntity memory receiverTokenEntity = userTokenMap[parentTokenUpdate.owner][receiverTokenId];
        require(TokenVerificationLib.verifyDVPReceiverToken(zn, receiverTokenEntity), "verifyDVPReceiverToken error");

        TokenModel.TokenEntity memory changeTokenEntity = userTokenMap[parentTokenUpdate.owner][changeTokenId];
        require(TokenVerificationLib.verifyDVPChangeToken(zn, changeTokenEntity), "verifyDVPChangeToken error");
    }

    function mergeAndSplitTokenForDVP(address spender, TokenModel.TokenMergeAndUpdate calldata parentTokenUpdate, TokenModel.NewToken[] calldata childTokens, bytes calldata proof)
    public override
    validBatchParentToken(parentTokenUpdate)
    onlyBankAccount
    {
        // 验证证明
        (uint result, Fr[] memory z0, Fr[] memory zn) = TokenVerificationLib.verify(proof);
        address owner = parentTokenUpdate.owner;
        // 校验合并金额是否正确
        if (parentTokenUpdate.id.length > 1) {
            (uint256 sum_clx,uint256 sum_cly,uint256 sum_crx,uint256 sum_cry) = TokenOperationsLib.sumTokenAmountsLogic(userTokenMap, parentTokenUpdate.id, owner);
            require ((parentTokenUpdate.cl_x == sum_clx && parentTokenUpdate.cl_y == sum_cly &&
            parentTokenUpdate.cr_x == sum_crx && parentTokenUpdate.cr_y == sum_cry), "invalid parentTokenUpdate amount");
        }
        require(TokenVerificationLib.verifyParentToken(parentTokenUpdate, z0), "verifyParentToken error");
        // 触发事件
        for (uint256 i = 0; i < parentTokenUpdate.id.length; i++) {
            TokenModel.TokenEntity memory parentTokenEntity = userTokenMap[owner][parentTokenUpdate.id[i]];
            TokenEventLib.triggerTokenRemovedEvent(_l2Event, address(this), parentTokenEntity.manager, owner, parentTokenUpdate.id[i]);
        }
        // 执行DVP拆分逻辑
        (uint256 rollbackTokenId, uint256 receiverTokenId, uint256 changeTokenId) = DVPLib.mergeAndSplitTokenForDVPLogic(
            userTokenMap,
            spender,
            parentTokenUpdate,
            childTokens
        );

        // 验证tokenID
        TokenModel.TokenEntity memory rollbackTokenEntity = userTokenMap[owner][rollbackTokenId];
        require(TokenVerificationLib.verifyDVPRollbackToken(zn, rollbackTokenEntity), "verifyDVPRollbackToken error");

        TokenModel.TokenEntity memory receiverTokenEntity = userTokenMap[owner][receiverTokenId];
        require(TokenVerificationLib.verifyDVPReceiverToken(zn, receiverTokenEntity), "verifyDVPReceiverToken error");

        TokenModel.TokenEntity memory changeTokenEntity = userTokenMap[owner][changeTokenId];
        require(TokenVerificationLib.verifyDVPChangeToken(zn, changeTokenEntity), "verifyDVPChangeToken error");
    }

    function splitTokenForBatchDVP(address spender, TokenModel.TokenValueUpdate calldata parentTokenUpdate, TokenModel.NewBatchToken[] calldata childTokens, bytes calldata proof)
        public override
        validParentToken(parentTokenUpdate)
        onlyBankAccount {
        // 验证证明
        bool isValid = TokenVerificationLib.verifyBatchTokenSplit(parentTokenUpdate,childTokens, proof);
        require(isValid, "invalid proof");

        address parentTokenManager = userTokenMap[parentTokenUpdate.owner][parentTokenUpdate.id].manager;

        DVPLib.splitBatchTokenForDVPLogic(
            userTokenMap,
            spender,
            parentTokenUpdate,
            childTokens
        );
        // 触发事件
        TokenEventLib.triggerTokenRemovedEvent(_l2Event, address(this), parentTokenManager, parentTokenUpdate.owner, parentTokenUpdate.id);
    }


    function validateDVP(uint256 tokenId, address from, address toManager, address to) external override returns (bool) {
        return DVPLib.validateDVPLogic(userTokenMap, tokenId, from, msg.sender);
    }

    function commitDVP(uint256 tokenId, address from, address toManager, address to) public override {
        TokenModel.TokenEntity memory receiverToken = userTokenMap[from][tokenId];
        uint256 rollbackTokenId = receiverToken.rollbackTokenId;
        TokenModel.TokenEntity memory rollBackToken = userTokenMap[from][rollbackTokenId];

        //delete rollBackToken
        delete userTokenMap[from][rollbackTokenId];
        TokenEventLib.triggerTokenBurnedEvent(_l2Event,address(this), rollBackToken.manager, rollBackToken);

        // clean spender and rollback information
        receiverToken.approvedSpender = address(0);
        receiverToken.rollbackTokenId = 0;
        receiverToken.status = TokenModel.TokenStatus.active;

        if (toManager != receiverToken.manager) {
            TokenEventLib.triggerTokenTransferredEvent(_l2Event,address(this), receiverToken.manager, receiverToken);
        }

        receiverToken.owner = to;
        receiverToken.manager = toManager;

        delete userTokenMap[from][tokenId];
        userTokenMap[to][tokenId] = receiverToken;

        TokenEventLib.triggerTokenReceivedEvent(_l2Event,address(this), toManager, receiverToken);
    }

    function rollbackDVP(address owner, uint256 tokenId) public override {
        // 先获取token信息
        TokenModel.TokenEntity memory receiverToken = userTokenMap[owner][tokenId];
        address receiverManager = receiverToken.manager;
        uint256 rollbackTokenId = receiverToken.rollbackTokenId;
        
        // 执行DVP回滚逻辑
        DVPLib.rollbackDVPLogic(userTokenMap, owner, tokenId);
        
        // 触发事件
        TokenEventLib.triggerTokenBurnedEvent(_l2Event, address(this), receiverManager, receiverToken);
        
        TokenModel.TokenEntity memory rollBackToken = userTokenMap[owner][rollbackTokenId];
        TokenEventLib.triggerTokenReceivedEvent(_l2Event, address(this), rollBackToken.manager, rollBackToken);
    }

    function cancelDvpReservation(uint256 tokenId) public override {
        address owner = msg.sender;
        // 先获取token信息
        TokenModel.TokenEntity memory receiverToken = userTokenMap[owner][tokenId];
        address receiverManager = receiverToken.manager;
        uint256 rollbackTokenId = receiverToken.rollbackTokenId;
        
        // 执行DVP取消预约逻辑
        DVPLib.cancelDvpReservationLogic(userTokenMap, owner, tokenId);
        
        // 触发事件
        TokenEventLib.triggerTokenBurnedEvent(_l2Event, address(this), receiverManager, receiverToken);
        
        TokenModel.TokenEntity memory rollBackToken = userTokenMap[owner][rollbackTokenId];
        TokenEventLib.triggerTokenReceivedEvent(_l2Event, address(this), rollBackToken.manager, rollBackToken);
    }
}
