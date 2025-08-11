// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title TPFt - Tokenized Private Financial Instrument
 * @dev 基于ERC1155标准实现的金融票据代币化合约
 */
contract simpleTPFt is ERC1155, Ownable, Pausable {
    // 票据信息结构体
    struct TokenInfo {
        string name;
        string symbol;
        uint8 decimals;
        bool exists;
    }

    // 存储每个tokenId对应的票据信息
    mapping(uint256 => TokenInfo) public tokenInfos;

    // tokenId计数器
    uint256 private _tokenCounter;

    // 事件定义
    event TokenCreated(uint256 indexed tokenId, string name, string symbol, uint8 decimals);
    event TokenMinted(address indexed to, uint256 indexed tokenId, uint256 amount, string purpose);
    event TokenBurned(address indexed from, uint256 indexed tokenId, uint256 amount, string reason);

    /**
     * @dev 构造函数 - 不需要URI参数
     */
    constructor() ERC1155("") {
        _tokenCounter = 0;
    }

    /**
     * @dev 创建新的票据类型
     * @param name 票据名称
     * @param symbol 票据符号
     * @param decimals 票据精度
     * @return tokenId 新创建的票据ID
     */
    function createToken(
        string memory name,
        string memory symbol,
        uint8 decimals
    ) public onlyOwner returns (uint256 tokenId) {
        tokenId = ++_tokenCounter;

        tokenInfos[tokenId] = TokenInfo({
            name: name,
            symbol: symbol,
            decimals: decimals,
            exists: true
        });

        emit TokenCreated(tokenId, name, symbol, decimals);
    }

    /**
     * @dev 铸造票据
     * @param to 接收者地址
     * @param tokenId 票据ID
     * @param amount 铸造数量
     * @param purpose 铸造目的
     * @param data 附加数据
     */
    function mint(
        address to,
        uint256 tokenId,
        uint256 amount,
        string memory purpose,
        bytes memory data
    ) public onlyOwner whenNotPaused {
        require(tokenInfos[tokenId].exists, "TPFt: Token does not exist");
        _mint(to, tokenId, amount, data);
        emit TokenMinted(to, tokenId, amount, purpose);
    }

    /**
     * @dev 批量铸造票据
     * @param to 接收者地址
     * @param tokenIds 票据ID数组
     * @param amounts 铸造数量数组
     * @param purpose 铸造目的
     * @param data 附加数据
     */
    function mintBatch(
        address to,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        string memory purpose,
        bytes memory data
    ) public onlyOwner whenNotPaused {
        require(tokenIds.length == amounts.length, "TPFt: Arrays length mismatch");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(tokenInfos[tokenIds[i]].exists, "TPFt: Token does not exist");
        }

        _mintBatch(to, tokenIds, amounts, data);

        // 由于ERC1155没有批量mint事件，我们为每个token发出事件
        for (uint256 i = 0; i < tokenIds.length; i++) {
            emit TokenMinted(to, tokenIds[i], amounts[i], purpose);
        }
    }

    /**
     * @dev 销毁票据
     * @param from 持有者地址
     * @param tokenId 票据ID
     * @param amount 销毁数量
     * @param reason 销毁原因
     */
    function burn(
        address from,
        uint256 tokenId,
        uint256 amount,
        string memory reason
    ) public whenNotPaused {
        require(tokenInfos[tokenId].exists, "TPFt: Token does not exist");
        _burn(from, tokenId, amount);
        emit TokenBurned(from, tokenId, amount, reason);
    }

    /**
     * @dev 批量销毁票据
     * @param from 持有者地址
     * @param tokenIds 票据ID数组
     * @param amounts 销毁数量数组
     * @param reason 销毁原因
     */
    function burnBatch(
        address from,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        string memory reason
    ) public whenNotPaused {
        require(tokenIds.length == amounts.length, "TPFt: Arrays length mismatch");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(tokenInfos[tokenIds[i]].exists, "TPFt: Token does not exist");
        }

        _burnBatch(from, tokenIds, amounts);

        // 为每个token发出销毁事件
        for (uint256 i = 0; i < tokenIds.length; i++) {
            emit TokenBurned(from, tokenIds[i], amounts[i], reason);
        }
    }

    /**
     * @dev 获取票据信息
     * @param tokenId 票据ID
     * @return name 票据名称
     * @return symbol 票据符号
     * @return decimals 票据精度
     */
    function getTokenInfo(uint256 tokenId) public view returns (string memory name, string memory symbol, uint8 decimals) {
        require(tokenInfos[tokenId].exists, "TPFt: Token does not exist");
        TokenInfo memory info = tokenInfos[tokenId];
        return (info.name, info.symbol, info.decimals);
    }

    /**
     * @dev 暂停合约
     */
    function pause() public onlyOwner {
        _pause();
    }

    /**
     * @dev 恢复合约
     */
    function unpause() public onlyOwner {
        _unpause();
    }

    /**
     * @dev 检查合约是否暂停
     * @return bool 暂停状态
     */
    function isPaused() public view returns (bool) {
        return paused();
    }

    /**
     * @dev 检查票据是否存在
     * @param tokenId 票据ID
     * @return bool 是否存在
     */
    function tokenExists(uint256 tokenId) public view returns (bool) {
        return tokenInfos[tokenId].exists;
    }

    /**
     * @dev 获取当前tokenId计数器
     * @return uint256 当前tokenId计数
     */
    function getTokenCounter() public view returns (uint256) {
        return _tokenCounter;
    }
}
