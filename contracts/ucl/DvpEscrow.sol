pragma solidity ^0.8.0;

import "./IDvpERC.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "./IDvpEscrow.sol";
import "./IL2TMSC.sol";


// I did not split ERC20 and ERC1155 escrow account, because ucl-executor can handle them both without changing code
contract DvpEscrow is IERC1155Receiver, IDvpEscrow {
    address public Admin;
    mapping(uint256 => EscortingTx) public Transactions;
    enum EscortingType{Transfer, Burn, Mint}
    enum TokenStandard{ERC20, ERC1155}
    mapping(address => uint256) private ERC20Balances;
    mapping(address => mapping(uint256 => uint256)) private ERC1155Balances;

    IL2TMSC constant private _l2TMSC = IL2TMSC(0x9AE96DC1196647A260Aa381c4c8697B5cDc8238a);
    mapping(uint256 => TmscTx) public _tmsScheduleTxs;

    // Events
    event EscrowScheduleTransfer(address indexed from, address indexed to, address tokenAddress, uint256 value, uint256 fromBalance, uint256 toBalance);
    event EscrowScheduleBurn(address indexed burner, address indexed account, address tokenAddress, uint256 value, uint256 fromBalance, uint256 toBalance);
    event EscrowScheduleMint(address indexed minter, address indexed account, address tokenAddress, uint256 value, uint256 fromBalance, uint256 toBalance);
    event EscrowTransfer(address indexed from, address indexed to, address tokenAddress, uint256 value, uint256 fromBalance, uint256 toBalance);
    event EscrowBurn(address indexed burner, address indexed account, address tokenAddress, uint256 value, uint256 fromBalance, uint256 toBalance);
    event EscrowMint(address indexed minter, address indexed account, address tokenAddress, uint256 value, uint256 fromBalance, uint256 toBalance);
    event EscrowReturn(address indexed escrow, address indexed account, address tokenAddress, uint256 value, uint256 fromBalance, uint256 toBalance);
    // Events
    event EscrowScheduleTransfer1155(address indexed from, address indexed to, address tokenAddress, uint256 tokenType, uint256 value, uint256 fromBalance, uint256 toBalance);
    event EscrowScheduleBurn1155(address indexed burner, address indexed account, address tokenAddress, uint256 tokenType, uint256 value, uint256 fromBalance, uint256 toBalance);
    event EscrowScheduleMint1155(address indexed minter, address indexed account, address tokenAddress, uint256 TokenType, uint256 value, uint256 fromBalance, uint256 toBalance);
    event EscrowTransfer1155(address indexed from, address indexed to, address tokenAddress, uint256 tokenType, uint256 value, uint256 fromBalance, uint256 toBalance);
    event EscrowBurn1155(address indexed burner, address indexed account, address tokenAddress, uint256 tokenType, uint256 value, uint256 fromBalance, uint256 toBalance);
    event EscrowMint1155(address indexed minter, address indexed account, address tokenAddress, uint256 tokenType, uint256 value, uint256 fromBalance, uint256 toBalance);
    event EscrowReturn1155(address indexed escrow, address indexed account, address tokenAddress, uint256 tokenType, uint256 value, uint256 fromBalance, uint256 toBalance);

    struct EscortingTx {
        address tokenAddress;
        uint256 index;
        uint256 chunkHash;
        uint256 bundleHash;
        EscortingType txType;
        address to;
        address from;
        TokenStandard tokenStandard;
        uint256 tokenType;
        uint256 amount;
        uint256 expireTime;
        bool pending;
    }

    struct TmscTx {
        uint256 index;
        uint256 chunkHash;
        uint256 bundleHash;
        uint256 expireTime;
        bool    pending;

        BurnRequest[] burnRequests;
        MintRequest[] mintRequests;
        TransferRequest[] transferRequests;
    }

    modifier validAddress(address _address, string memory message) {
        require(_address != address(0), message);
        _;
    }
    modifier notZeroAmount(uint256 amount, string memory message) {
        require(amount > 0, message);
        _;
    }
    modifier validBundleHash(uint256 bundleHash, string memory message) {
        require(bundleHash != 0, message);
        _;
    }

    // this smart contract is seeded. constructor will never be called
    constructor() {

    }

    function scheduleTransfer(ScheduleRequest memory request)
    validAddress(address(request.tokenAddress), "invalid tokenAddress is provided")
    notZeroAmount(request.amount, "amount must be greater than 0")
    validBundleHash(request.bundleHash, "bundle hash can't be 0")
    public returns (bool)
    {

        EscortingTx memory transaction = Transactions[request.bundleHash];
        require(transaction.amount == 0, "transaction with the same bundleHash already exists");

        if (request.sender == address(0)) {
            request.sender = msg.sender;
        }
        require(request.sender != request.to, "cannot transfer to self");

        ITransfer(request.tokenAddress).transferFrom(request.sender, address(this), request.amount);
        saveTransactionForRequest(TokenStandard.ERC20, EscortingType.Transfer, request);
        uint256 balance = getBalance(address(request.tokenAddress));
        emit EscrowScheduleTransfer(request.sender, address(this), request.tokenAddress, request.amount, 0, balance);
        deposit(address(request.tokenAddress), request.amount);
        return true;
    }

    function scheduleBurn(ScheduleRequest memory request)
    validAddress(request.tokenAddress, "invalid tokenAddress is provided")
    notZeroAmount(request.amount, "amount must be greater than 0")
    validBundleHash(request.bundleHash, "bundle hash can't be 0") public returns (bool) {
        EscortingTx memory transaction = Transactions[request.bundleHash];
        require(transaction.amount == 0, "transaction with the same bundleHash already exists");

        if (request.sender == address(0)) {
            request.sender = msg.sender;
        }

        ITransfer(request.tokenAddress).transferFrom(request.sender, address(this), request.amount);
        saveTransactionForRequest(TokenStandard.ERC20, EscortingType.Burn, request);
        uint256 balance = getBalance(address(request.tokenAddress));
        emit EscrowScheduleTransfer(request.sender, address(this), request.tokenAddress, request.amount, 0, balance);
        deposit(address(request.tokenAddress), request.amount);
        return true;
    }
    // deposit here is a workaround to simplify circuit implementation
    function scheduleMint(ScheduleRequest memory request)
    validAddress(request.tokenAddress, "invalid tokenAddress is provided")
    notZeroAmount(request.amount, "amount must be greater than 0")
    validBundleHash(request.bundleHash, "bundle hash can't be 0") public returns (bool) {
        EscortingTx memory transaction = Transactions[request.bundleHash];
        require(transaction.amount == 0, "transaction with the same bundleHash already exists");

        if (request.sender == address(0)) {
            request.sender = msg.sender;
        }

        saveTransactionForRequest(TokenStandard.ERC20, EscortingType.Mint, request);
        uint256 balance = getBalance(address(request.tokenAddress));
        emit EscrowScheduleMint(request.sender, address(this), request.tokenAddress, request.amount, 0, balance);
        deposit(address(request.tokenAddress), request.amount);
        return true;
    }

    function saveTransactionForRequest(TokenStandard standard, EscortingType txTpe, ScheduleRequest memory request) internal {
        EscortingTx storage transaction = Transactions[request.bundleHash];
        transaction.tokenAddress = request.tokenAddress;
        transaction.bundleHash = request.bundleHash;
        transaction.chunkHash = request.chunkHash;
        transaction.txType = txTpe;
        transaction.from = request.sender;
        transaction.to = request.to;
        transaction.index = request.index;
        transaction.tokenStandard = standard;
        transaction.tokenType = request.tokenType;
        transaction.amount = request.amount;
        transaction.pending = true;
        transaction.expireTime = request.expireTime;
    }

    function scheduleTransfer1155(ScheduleRequest memory request)
    validAddress(address(request.tokenAddress), "invalid tokenAddress is provided")
    notZeroAmount(request.amount, "amount must be greater than 0")
    validBundleHash(request.bundleHash, "bundle hash can't be 0")
    public returns (bool)
    {
        EscortingTx memory transaction = Transactions[request.bundleHash];
        require(transaction.amount == 0, "transaction with the same bundleHash already exists");

        if (request.sender == address(0)) {
            request.sender = msg.sender;
        }
        require(request.sender != request.to, "cannot transfer to self");

        ITransfer(request.tokenAddress).transferFrom1155(request.sender, address(this), request.tokenType, request.amount);
        saveTransactionForRequest(TokenStandard.ERC1155, EscortingType.Transfer, request);
        uint256 balance = getBalance1155(address(request.tokenAddress), request.tokenType);
        emit EscrowScheduleTransfer1155(request.sender, address(this), request.tokenAddress, request.tokenType, request.amount, 0, balance);
        deposit1155(address(request.tokenAddress), request.tokenType, request.amount);
        return true;
    }

    function scheduleBurn1155(ScheduleRequest memory request)
    validAddress(request.tokenAddress, "invalid tokenAddress is provided")
    notZeroAmount(request.amount, "amount must be greater than 0")
    validBundleHash(request.bundleHash, "bundle hash can't be 0") public returns (bool) {
        EscortingTx memory transaction = Transactions[request.bundleHash];
        require(transaction.amount == 0, "transaction with the same bundleHash already exists");

        if (request.sender == address(0)) {
            request.sender = msg.sender;
        }

        ITransfer(request.tokenAddress).transferFrom1155(request.sender, address(this), request.tokenType, request.amount);
        saveTransactionForRequest(TokenStandard.ERC1155, EscortingType.Burn, request);
        uint256 balance = getBalance1155(address(request.tokenAddress), request.tokenType);
        emit EscrowScheduleTransfer1155(request.sender, address(this), request.tokenAddress, request.tokenType, request.amount, 0, balance);
        deposit1155(address(request.tokenAddress), request.tokenType, request.amount);
        return true;
    }
    // deposit here is a workaround to simplify circuit implementation
    function scheduleMint1155(ScheduleRequest memory request)
    validAddress(request.tokenAddress, "invalid tokenAddress is provided")
    notZeroAmount(request.amount, "amount must be greater than 0")
    validBundleHash(request.bundleHash, "bundle hash can't be 0") public returns (bool) {
        EscortingTx memory transaction = Transactions[request.bundleHash];
        require(transaction.amount == 0, "transaction with the same bundleHash already exists");

        if (request.sender == address(0)) {
            request.sender = msg.sender;
        }

        saveTransactionForRequest(TokenStandard.ERC1155, EscortingType.Mint, request);
        uint256 balance = getBalance1155(address(request.tokenAddress), request.tokenType);
        emit EscrowScheduleMint1155(request.sender, address(this), request.tokenAddress, request.tokenType, request.amount, 0, balance);
        deposit1155(address(request.tokenAddress), request.tokenType, request.amount);
        return true;
    }
    // return silently when transaction.pending==false
    // this is needed for compensation implementation
    // don't check expiration here. Only dvp-match should check expiration.
    // this function is only triggered by L1 event.
    function execute(uint256 bundleHash) public {
        TmscTx memory tmsTx = _tmsScheduleTxs[bundleHash];
        if (tmsTx.pending) {
            executeTmsc(bundleHash);
            return;
        }


        EscortingTx memory transaction = Transactions[bundleHash];
        if (transaction.pending == false) {
            return;
        }
        if (transaction.tokenStandard == TokenStandard.ERC20) {
            executeERC20(bundleHash);
        }
        if (transaction.tokenStandard == TokenStandard.ERC1155) {
            executeERC1155(bundleHash);
        }
    }

    function executeERC20(uint256 bundleHash) public {
        EscortingTx storage transaction = Transactions[bundleHash];

        if (transaction.txType == EscortingType.Transfer) {
            executeTransfer(transaction);
            transaction.pending = false;
        } else if (transaction.txType == EscortingType.Burn) {
            executeBurn(transaction);
            transaction.pending = false;
        } else if (transaction.txType == EscortingType.Mint) {
            executeMint(transaction);
            transaction.pending = false;
        }
    }
    // return silently when transaction.pending==false
    // this is needed for compensation implementation
    // this function is triggered only when timeout happens  in L1
    //
    function cancel(uint256 bundleHash) public {
        TmscTx memory tmsTx = _tmsScheduleTxs[bundleHash];
        if (tmsTx.pending) {
            cancelTmsc(bundleHash);
            return;
        }


        EscortingTx memory transaction = Transactions[bundleHash];
        if (transaction.pending == false) {
            return;
        }
        if (transaction.tokenStandard == TokenStandard.ERC20) {
            cancelERC20(bundleHash);
        }
        if (transaction.tokenStandard == TokenStandard.ERC1155) {
            cancelERC1155(bundleHash);
        }
    }

    function cancelERC20(uint256 bundleHash) public {
        EscortingTx storage transaction = Transactions[bundleHash];
        if (transaction.pending == false) {
            return;
        }
        if (transaction.txType == EscortingType.Transfer || transaction.txType == EscortingType.Burn) {
            returnFunding(transaction);
            transaction.pending = false;
        } else if (transaction.txType == EscortingType.Mint) {
            transaction.pending = false;
        }
    }

    function executeTransfer(EscortingTx memory transaction) private {
        ITransfer token = ITransfer(transaction.tokenAddress);
        token.transfer(transaction.to, transaction.amount);
        uint256 balance = getBalance(address(transaction.tokenAddress));
        emit EscrowTransfer(address(this), transaction.to, transaction.tokenAddress, transaction.amount, balance, 0);
        withdraw(address(transaction.tokenAddress), transaction.amount);
    }

    function executeBurn(EscortingTx memory transaction) private {
        IBurn token = IBurn(transaction.tokenAddress);
        token.burn(transaction.amount);
        uint256 balance = getBalance(transaction.tokenAddress);
        emit EscrowBurn(address(this), address(0), transaction.tokenAddress, transaction.amount, balance, 0);
        withdraw(address(transaction.tokenAddress), transaction.amount);
    }

    function executeMint(EscortingTx memory transaction) private {
        IMint token = IMint(transaction.tokenAddress);
        token.mint(transaction.to, transaction.amount);
        emit EscrowMint(address(this), transaction.to, transaction.tokenAddress, transaction.amount, getBalance(transaction.tokenAddress), 0);
        withdraw(address(transaction.tokenAddress), transaction.amount);
    }

    function returnFunding(EscortingTx memory transaction) private {
        ITransfer token = ITransfer(transaction.tokenAddress);
        token.transfer(transaction.from, transaction.amount);
        uint256 balance = getBalance(address(transaction.tokenAddress));
        emit EscrowReturn(address(this), transaction.from, transaction.tokenAddress, transaction.amount, balance, 0);
        withdraw(address(transaction.tokenAddress), transaction.amount);
    }

    function executeERC1155(uint256 bundleHash) public {
        EscortingTx storage transaction = Transactions[bundleHash];
        if (transaction.txType == EscortingType.Transfer) {
            executeTransfer1155(transaction);
            transaction.pending = false;
        } else if (transaction.txType == EscortingType.Burn) {
            executeBurn1155(transaction);
            transaction.pending = false;
        } else if (transaction.txType == EscortingType.Mint) {
            executeMint1155(transaction);
            transaction.pending = false;
        }
    }

    function executeTransfer1155(EscortingTx memory transaction) private {
        ITransfer token = ITransfer(transaction.tokenAddress);
        token.transfer1155(transaction.to,  transaction.tokenType, transaction.amount);
        uint256 balance = getBalance1155(address(transaction.tokenAddress), transaction.tokenType);
        emit EscrowTransfer1155(address(this), transaction.to, transaction.tokenAddress, transaction.tokenType, transaction.amount, balance, 0);
        withdraw1155(address(transaction.tokenAddress), transaction.tokenType, transaction.amount);
    }

    function executeBurn1155(EscortingTx memory transaction) private {
        IBurn token = IBurn(transaction.tokenAddress);
        token.burn1155(transaction.tokenType, transaction.amount);
        uint256 balance = getBalance1155(transaction.tokenAddress, transaction.tokenType);
        emit EscrowBurn1155(address(this), address(0), transaction.tokenAddress, transaction.tokenType, transaction.amount, balance, 0);
        withdraw1155(address(transaction.tokenAddress), transaction.tokenType, transaction.amount);
    }

    function executeMint1155(EscortingTx memory transaction) private {
        IMint token = IMint(transaction.tokenAddress);
        token.mint1155(transaction.to, transaction.tokenType, transaction.amount);
        uint256 balance = getBalance1155(transaction.tokenAddress, transaction.tokenType);
        emit EscrowMint1155(address(this), transaction.to, transaction.tokenAddress, transaction.tokenType, transaction.amount, balance, 0);
        withdraw1155(address(transaction.tokenAddress), transaction.tokenType, transaction.amount);
    }

    function cancelERC1155(uint256 bundleHash) public {
        EscortingTx storage transaction = Transactions[bundleHash];
        if (transaction.txType == EscortingType.Transfer || transaction.txType == EscortingType.Burn) {
            returnFunding1155(transaction);
            transaction.pending = false;
        } else if (transaction.txType == EscortingType.Mint) {
            transaction.pending = false;
        }
    }

    function deposit(address account, uint256 amount) public {
        require(amount >= 0, "Must send some amount");
        ERC20Balances[account] += amount;
    }

    function withdraw(address account, uint256 amount) public {
        require(amount >= 0, "Must send some amount");
        require(ERC20Balances[account] >= amount, "Insufficient balance");
        ERC20Balances[account] -= amount;
    }

    function getBalance(address account) public view returns (uint256) {
        return ERC20Balances[account];
    }

    function deposit1155(address account, uint256 tokenType, uint256 amount) internal {
        require(amount >= 0, "Must send some amount");
        ERC1155Balances[account][tokenType] += amount;
    }

    function withdraw1155(address account, uint256 tokenType, uint256 amount) internal {
        require(amount >= 0, "Must send some amount");
        require(ERC1155Balances[account][tokenType] >= amount, "Insufficient balance");
        ERC1155Balances[account][tokenType] -= amount;
    }

    function returnFunding1155(EscortingTx memory transaction) private {
        ITransfer token = ITransfer(transaction.tokenAddress);
        token.transfer1155(transaction.from, transaction.tokenType, transaction.amount);
        uint256 balance = getBalance1155(address(transaction.tokenAddress), transaction.tokenType);
        emit EscrowReturn1155(address(this), transaction.from, transaction.tokenAddress, transaction.tokenType, transaction.amount, balance, 0);
        withdraw1155(address(transaction.tokenAddress), transaction.tokenType, transaction.amount);
    }

    function getBalance1155(address account, uint256 tokenType) public view returns (uint256) {
        return ERC1155Balances[account][tokenType];
    }

    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes memory data
    ) external virtual override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) external virtual override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }


    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId;
    }

    // schedule a new dvp request
    // After the executor retrieves the settlement parameters from BurnSettleRequest/MintSettleRequest and saves them,
    // the smart contract will convert BurnSettleRequest/MintSettleRequest into BurnRequest/MintRequest for continued processing.
    function scheduleBurnMintAndGenerate(ScheduleRequest2 memory request) external returns (bool)  {
        TmscTx storage tms = _tmsScheduleTxs[request.bundleHash];
        require(tms.expireTime == 0 && ! tms.pending, "an dvp transaction already exists");

        tms.index = request.index;
        tms.chunkHash = request.chunkHash;
        tms.bundleHash = request.bundleHash;
        tms.expireTime = request.expireTime;
        tms.pending = true;

        for (uint i = 0; i < request.burnRequests.length; i++) {
            BurnRequest memory b = request.burnRequests[i];
            scheduleTmsBurn(b.tokenScAddress, b.tokenType, b.account, b.amount);
            tms.burnRequests.push(b);
        }

        for (uint i = 0; i < request.mintRequests.length; i++) {
            MintRequest memory m = request.mintRequests[i];
            scheduleTmsMint(m.tokenScAddress, m.tokenType, m.account, m.amount);
            tms.mintRequests.push(m);
        }

        for (uint i = 0; i < request.burnSettleRequests.length; i++) {
            BurnSettleRequest memory bs = request.burnSettleRequests[i];
            scheduleTmsBurn(bs.tokenScAddress, bs.tokenType, bs.account, bs.amount);
            BurnRequest memory burnRequest = BurnRequest({
                tokenScAddress: bs.tokenScAddress,
                tokenType: bs.tokenType,
                account: bs.account,
                amount: bs.amount
            });
            tms.burnRequests.push(burnRequest);
        }

        for (uint i = 0; i < request.transferRequests.length; i++) {
            TransferRequest memory t = request.transferRequests[i];
            scheduleTmsTransfer(t.tokenScAddress, t.tokenType, t.from, t.to, t.amount);
            tms.transferRequests.push(t);
        }

        return true;
    }

    function scheduleTmsBurn(address tokenScAddress, uint256 tokenType, address account, uint256 amount) internal {
        _l2TMSC.transferFrom(account, tokenScAddress, tokenType, address(this), amount);

        uint256 balance = getBalance1155(tokenScAddress, tokenType);
        emit EscrowScheduleTransfer1155(account, address(this), tokenScAddress, tokenType, amount, 0, balance);
        deposit1155(tokenScAddress, tokenType, amount);
    }

    function scheduleTmsTransfer(address tokenScAddress, uint256 tokenType, address from, address to, uint256 amount) internal {
        _l2TMSC.transferFrom(from, tokenScAddress, tokenType, address(this), amount);

        uint256 balance = getBalance1155(tokenScAddress, tokenType);
        emit EscrowScheduleTransfer1155(from, address(this), tokenScAddress, tokenType, amount, 0, balance);
        deposit1155(tokenScAddress, tokenType, amount);
    }

    // do nothing at the schedule step
    function scheduleTmsMint(address tokenScAddress, uint256 tokenType, address account, uint256 amount) internal {
        uint256 balance = getBalance1155(tokenScAddress, tokenType);
        emit EscrowScheduleMint1155(address(0), address(this), tokenScAddress, tokenType, amount, 0, balance);

        deposit1155(tokenScAddress, tokenType, amount);
    }

    // execute: pending must be true

    function executeTmsc(uint256 bundleHash) internal {
        TmscTx storage tx = _tmsScheduleTxs[bundleHash];
        if (tx.pending == false) {
            return;
        }

        for (uint i = 0; i < tx.mintRequests.length; i++) {
            MintRequest memory m = tx.mintRequests[i];
            executeTmscMint(m.tokenScAddress, m.tokenType, m.account, m.amount);
        }

        for (uint i = 0; i < tx.burnRequests.length; i++) {
            BurnRequest memory b = tx.burnRequests[i];
            executeTmscBurn(b.tokenScAddress, b.tokenType, b.account, b.amount);
        }

        for (uint i = 0; i < tx.transferRequests.length; i++) {
            TransferRequest memory t = tx.transferRequests[i];
            executeTmscTransfer(t.tokenScAddress, t.tokenType, t.from, t.to, t.amount);
        }
        
        tx.pending = false;
    }


    function executeTmscBurn(address tokenScAddress, uint256 tokenType, address account, uint256 amount) internal {
        _l2TMSC.burn(address(this), tokenScAddress, tokenType, amount);

        uint256 balance = getBalance1155(tokenScAddress, tokenType);
        emit EscrowBurn1155(address(this), address(0), tokenScAddress, tokenType, amount, balance, 0);

        withdraw1155(tokenScAddress, tokenType, amount);
    }

    function executeTmscTransfer(address tokenScAddress, uint256 tokenType, address from, address to, uint256 amount) internal {
        _l2TMSC.transfer(to, tokenScAddress, tokenType, amount);

        uint256 balance = getBalance1155(tokenScAddress, tokenType);
        emit EscrowTransfer1155(address(this), to, tokenScAddress, tokenType, amount, balance, 0);

        withdraw1155(tokenScAddress, tokenType, amount);
    }

    //
    function executeTmscMint(address tokenScAddress, uint256 tokenType, address account, uint256 amount) internal {
        _l2TMSC.mint(account, tokenScAddress, tokenType, amount);

        uint256 balance = getBalance1155(tokenScAddress, tokenType);
        emit EscrowMint1155(address(this), account, tokenScAddress, tokenType, amount, balance, 0);

        withdraw1155(tokenScAddress, tokenType, amount);
    }


    // cancel a dvp request. pending must be true
    function cancelTmsc(uint256 bundleHash) internal {
        TmscTx storage tx = _tmsScheduleTxs[bundleHash];
        if (tx.pending == false) {
            return;
        }

        for (uint i = 0; i < tx.burnRequests.length; i++) {
            BurnRequest memory burnRequest = tx.burnRequests[i];
            cancelTmscBurn(burnRequest.tokenScAddress, burnRequest.tokenType, burnRequest.account, burnRequest.amount);
        }

        for (uint i = 0; i < tx.mintRequests.length; i++) {
            MintRequest memory mintRequest = tx.mintRequests[i];
            cancelTmscMint(mintRequest.tokenScAddress, mintRequest.tokenType, mintRequest.account, mintRequest.amount);
        }

        for (uint i = 0; i < tx.transferRequests.length; i++) {
            TransferRequest memory transferRequest = tx.transferRequests[i];
            cancelTmscTransfer(transferRequest.tokenScAddress, transferRequest.tokenType, transferRequest.from, transferRequest.to, transferRequest.amount);
        }

        tx.pending = false;
    }

    function cancelTmscBurn(address tokenScAddress, uint256 tokenType, address account, uint256 amount) internal {
        _l2TMSC.transfer(account, tokenScAddress, tokenType, amount);

        uint256 balance = getBalance1155(tokenScAddress, tokenType);
        emit EscrowReturn1155(address(this), account, tokenScAddress, tokenType, amount, balance, 0);

        withdraw1155(tokenScAddress, tokenType, amount);
    }

    function cancelTmscTransfer(address tokenScAddress, uint256 tokenType, address from, address to, uint256 amount) internal {
        _l2TMSC.transfer(from, tokenScAddress, tokenType, amount);

        uint256 balance = getBalance1155(tokenScAddress, tokenType);
        emit EscrowReturn1155(address(this), from, tokenScAddress, tokenType, amount, balance, 0);

        withdraw1155(tokenScAddress, tokenType, amount);
    }

    // do nothing
    function cancelTmscMint(address tokenScAddress, uint256 tokenType, address account, uint256 amount) internal {

    }
}