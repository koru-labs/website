// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../ucl/zkcsc/ZKCSC.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "../ucl/circle/base/IPrivateERCToken.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title TPFtDVP - TPFt与PrivateERC20的DVP交换合约
 * @dev 扩展ZKCSC合约以支持ERC1155和PrivateERC20之间的DVP交换
 */
contract TPFtDVP is ReentrancyGuard {
    using ECDSA for bytes32;

    // 引用ZKCSC合约
    ZKCSC public zkcsc;

    // 事件定义
    event TPFtDVPExecuted(
        bytes32 indexed bundleHash,
        address indexed erc1155Token,
        address indexed privateERC20Token,
        uint256 erc1155TokenId,
        uint256 erc1155Amount,
        uint256 privateTokenId,
        address party1,
        address party2
    );

    event TPFtDVPCanceled(
        bytes32 indexed bundleHash,
        address indexed erc1155Token,
        address indexed privateERC20Token,
        uint256 erc1155TokenId,
        uint256 privateTokenId,
        address party1,
        address party2
    );

    event TPFtApprovalRevoked(
        bytes32 indexed bundleHash,
        address indexed tokenAddress,
        address from,
        uint256 tokenId,
        bool isERC1155
    );

    constructor(address _zkcscAddress) {
        zkcsc = ZKCSC(_zkcscAddress);
    }

    /**
     * @dev 执行TPFt (ERC1155) 和 PrivateERC20 之间的DVP交换
     * @param bundleHash DVP捆绑哈希
     * @param erc1155Token ERC1155代币地址
     * @param privateERC20Token PrivateERC20代币地址
     * @param erc1155TokenId ERC1155代币ID
     * @param erc1155Amount ERC1155代币数量
     * @param privateTokenId PrivateERC20代币ID
     * @param party1 ERC1155持有者
     * @param party2 PrivateERC20持有者
     * @param party1Signature Party1对交换的签名
     * @param party2Signature Party2对交换的签名
     */
    function executeTPFtDVP(
        bytes32 bundleHash,
        address erc1155Token,
        address privateERC20Token,
        uint256 erc1155TokenId,
        uint256 erc1155Amount,
        uint256 privateTokenId,
        address party1, // ERC1155持有者
        address party2, // PrivateERC20持有者
        bytes memory party1Signature,
        bytes memory party2Signature
    ) external nonReentrant {
        // 构造ZKCSC所需的参数
        bytes32[] memory chunkHashes = new bytes32[](2);
        address[] memory froms = new address[](2);
        address[] memory tos = new address[](2);
        address[] memory tokenAddresses = new address[](2);
        uint256[] memory tokenIds = new uint256[](2);
        bytes[] memory signatures = new bytes[](2);

        // Party1 (ERC1155持有者) 转移ERC1155给Party2
        chunkHashes[0] = _hashTPFtChunk(bundleHash, party1, party2, erc1155Token, erc1155TokenId, erc1155Amount);
        froms[0] = party1;
        tos[0] = party2;
        tokenAddresses[0] = erc1155Token;
        tokenIds[0] = erc1155TokenId;
        signatures[0] = party1Signature;

        // Party2 (PrivateERC20持有者) 转移PrivateERC20给Party1
        chunkHashes[1] = _hashChunk(bundleHash, party2, party1, privateERC20Token, privateTokenId);
        froms[1] = party2;
        tos[1] = party1;
        tokenAddresses[1] = privateERC20Token;
        tokenIds[1] = privateTokenId;
        signatures[1] = party2Signature;

        // 调用ZKCSC执行DVP
        zkcsc.executeDVP(bundleHash, chunkHashes, froms, tos, tokenAddresses, tokenIds, signatures);

        // 发出TPFt特定事件
        emit TPFtDVPExecuted(
            bundleHash,
            erc1155Token,
            privateERC20Token,
            erc1155TokenId,
            erc1155Amount,
            privateTokenId,
            party1,
            party2
        );
    }

    /**
     * @dev 取消TPFt DVP交易
     * @param bundleHash DVP捆绑哈希
     * @param erc1155Token ERC1155代币地址
     * @param privateERC20Token PrivateERC20代币地址
     * @param erc1155TokenId ERC1155代币ID
     * @param erc1155Amount ERC1155代币数量
     * @param privateTokenId PrivateERC20代币ID
     * @param party1 ERC1155持有者
     * @param party2 PrivateERC20持有者
     * @param party1Signature Party1对取消的签名
     * @param party2Signature Party2对取消的签名
     */
    function cancelTPFtDVP(
        bytes32 bundleHash,
        address erc1155Token,
        address privateERC20Token,
        uint256 erc1155TokenId,
        uint256 erc1155Amount,
        uint256 privateTokenId,
        address party1,
        address party2,
        bytes memory party1Signature,
        bytes memory party2Signature
    ) external nonReentrant {
        // 构造ZKCSC所需的参数
        bytes32[] memory chunkHashes = new bytes32[](2);
        address[] memory froms = new address[](2);
        address[] memory tos = new address[](2);
        address[] memory tokenAddresses = new address[](2);
        uint256[] memory tokenIds = new uint256[](2);
        bytes[] memory signatures = new bytes[](2);

        // Party1取消ERC1155转移
        chunkHashes[0] = _hashTPFtChunk(bundleHash, party1, party2, erc1155Token, erc1155TokenId, erc1155Amount);
        froms[0] = party1;
        tos[0] = party2;
        tokenAddresses[0] = erc1155Token;
        tokenIds[0] = erc1155TokenId;
        signatures[0] = party1Signature;

        // Party2取消PrivateERC20转移
        chunkHashes[1] = _hashChunk(bundleHash, party2, party1, privateERC20Token, privateTokenId);
        froms[1] = party2;
        tos[1] = party1;
        tokenAddresses[1] = privateERC20Token;
        tokenIds[1] = privateTokenId;
        signatures[1] = party2Signature;

        // 调用ZKCSC取消DVP
        zkcsc.cancelDVP(bundleHash, chunkHashes, froms, tos, tokenAddresses, tokenIds, signatures);

        // 发出TPFt特定事件
        emit TPFtDVPCanceled(
            bundleHash,
            erc1155Token,
            privateERC20Token,
            erc1155TokenId,
            privateTokenId,
            party1,
            party2
        );
    }

    /**
     * @dev 撤销ERC1155的授权
     * @param tokenAddress ERC1155代币地址
     * @param from 授权者地址
     * @param tokenId ERC1155代币ID
     * @return bool 撤销是否成功
     */
    function revokeERC1155Approval(
        address tokenAddress,
        address from,
        uint256 tokenId
    ) external returns (bool) {
        // ERC1155通常不需要显式撤销授权，但我们可以实现一个模拟方法
        // 这里只是一个示例，实际实现取决于ERC1155合约的具体逻辑
        try IERC1155(tokenAddress).setApprovalForAll(address(this), false) {
            emit TPFtApprovalRevoked(keccak256("ERC1155_APPROVAL"), tokenAddress, from, tokenId, true);
            return true;
        } catch {
            emit TPFtApprovalRevoked(keccak256("ERC1155_APPROVAL"), tokenAddress, from, tokenId, false);
            return false;
        }
    }

    /**
     * @dev 撤销PrivateERC20的授权（通过ZKCSC）
     * @param tokenAddress PrivateERC20代币地址
     * @param from 授权者地址
     * @param tokenId PrivateERC20代币ID
     * @return bool 撤销是否成功
     */
    function revokePrivateERC20Approval(
        address tokenAddress,
        address from,
        uint256 tokenId
    ) external returns (bool) {
        bool success = _revokePrivateApproval(tokenAddress, from, tokenId);
        emit TPFtApprovalRevoked(keccak256("PRIVATE_ERC20_APPROVAL"), tokenAddress, from, tokenId, false);
        return success;
    }

    /**
     * @dev 撤销PrivateERC20的授权内部方法
     */
    function _revokePrivateApproval(address tokenAddress, address from, uint256 tokenId) internal returns (bool) {
        try IPrivateERCToken(tokenAddress).privateRevokeApprovalFrom(from, tokenId) {
            return true;
        } catch {
            return false;
        }
    }

    /**
     * @dev 计算ERC1155的chunk hash
     */
    function _hashTPFtChunk(
        bytes32 bundleHash,
        address from,
        address to,
        address tokenAddress,
        uint256 tokenId,
        uint256 amount
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(bundleHash, from, to, tokenAddress, tokenId, amount));
    }

    /**
     * @dev 计算PrivateERC20的chunk hash（复用ZKCSC的方法）
     */
    function _hashChunk(
        bytes32 bundleHash,
        address from,
        address to,
        address tokenAddress,
        uint256 tokenId
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(bundleHash, from, to, tokenAddress, tokenId));
    }

    /**
     * @dev 验证签名
     */
    function recoverSigner(bytes32 chunkHash, bytes memory signature) public pure returns (address) {
        return chunkHash.toEthSignedMessageHash().recover(signature);
    }

    /**
     * @dev 检查bundle是否已执行
     */
    function hasBundleExecuted(bytes32 bundleHash) external view returns (bool) {
        return zkcsc.hasBundleExecuted(bundleHash);
    }
}
