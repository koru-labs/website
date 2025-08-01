// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PrivateTokenData.sol";
import "../model/TokenModel.sol";
import "../lib/TokenEventLib.sol";
import "../lib/TokenVerificationLib.sol";
import "../lib/TokenUtilsLib.sol";
import { Pausable } from "../../../usdc/v1/Pausable.sol";
import { Blacklistable } from "../../../usdc/v1/Blacklistable.sol";
import { Permissioned } from "./permissioned.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

abstract contract PrivateTokenApproval is 
    PrivateTokenData, 
    Pausable, 
    Blacklistable, 
    Permissioned, 
    ReentrancyGuard 
{
    event PrivateApproval(address indexed owner, address indexed spender, TokenModel.Allowance value);
    event PrivateApprovalToken(address indexed owner, address indexed spender, uint256 indexed tokenId);
    event PrivateTransferFrom(address indexed spender, address indexed from, address indexed to, uint256 tokenId);
    event PrivateApprovalRevoked(address indexed owner, address indexed spender, uint256 indexed tokenId);
    
    function privateApprove(
        uint256[] memory consumedTokenIds,
        address spender,
        address to,
        TokenModel.TokenEntity[] memory newTokens,
        uint256[8] calldata proof,
        uint256[20] calldata publicInputs
    ) external whenNotPaused notBlacklisted(msg.sender) notBlacklisted(spender)
     notBlacklisted(to) onlyAllowedBank nonReentrant virtual {
        require(spender != address(0), "PrivateERCToken: approve to the zero address");
        require(newTokens.length == 3, "PrivateERCToken: invalid newTokens length");

        TokenModel.ElGamal memory onChainConsumedAmount = TokenUtilsLib.sumTokenAmountsFromAccount(_accounts, msg.sender, consumedTokenIds);
        TokenModel.TokenEntity memory changeToken = newTokens[0];
        TokenModel.TokenEntity memory allowanceToken = newTokens[1];
        TokenModel.TokenEntity memory rollbackToken = newTokens[2];

        TokenModel.VerifyTokenSplitParams memory params = TokenModel.VerifyTokenSplitParams({
            institutionRegistration: _institutionRegistration,
            from: msg.sender,
            to: to,
            consumedAmount: onChainConsumedAmount,
            amount: allowanceToken.amount,
            remainingAmount: changeToken.amount,
            rollbackAmount: rollbackToken.amount,
            proof: proof,
            publicInputs: publicInputs
        });
        TokenVerificationLib.verifyTokenSplit(params);

        TokenUtilsLib.removeTokens(_accounts, msg.sender, consumedTokenIds);

        changeToken.status = TokenModel.TokenStatus.active;
        TokenUtilsLib.addToken(_accounts, msg.sender, changeToken);

        TokenEventLib.triggerTokenDeletedEvent(_l2Event, address(this), msg.sender, consumedTokenIds, changeToken.id);

        allowanceToken.rollbackTokenId = rollbackToken.id;
        allowanceToken.to = to;
        TokenUtilsLib.addToken(_accounts, msg.sender, allowanceToken);

        _accounts[msg.sender].allowances[spender] = allowanceToken.id;

        TokenUtilsLib.addToken(_accounts, msg.sender, rollbackToken);

        TokenEventLib.triggerTokenActionCompletedEvent(_l2Event, address(this), msg.sender, allowanceToken.id);

        emit PrivateApprovalToken(msg.sender, spender, allowanceToken.id);
    }

    function privateTransferFrom(
        uint256 tokenId,
        address from,
        address to
    ) external whenNotPaused notBlacklisted(msg.sender) notBlacklisted(from)
    notBlacklisted(to) onlyAllowedBank nonReentrant virtual returns (bool) {
        require(tokenId != 0, "PrivateERCToken: tokenId is zero");
        require(to != address(0), "PrivateERCToken: to is the zero address");
        require(from != address(0), "PrivateERCToken: from is the zero address");

        TokenModel.TokenEntity memory allowanceToken = _accounts[from].assets[tokenId];
        require(allowanceToken.id != 0, "PrivateERCToken: invalid allowance token");
        require(allowanceToken.to == to, "PrivateERCToken: tokenId is not matched");

        uint256 allowanceTokenId = _accounts[from].allowances[msg.sender];
        require(allowanceTokenId == tokenId, "PrivateERCToken: invalid allowance tokenId");

        uint256[] memory rollbackTokens = new uint256[](1);
        rollbackTokens[0] = allowanceToken.rollbackTokenId;
        TokenUtilsLib.removeTokensWithBalance(_accounts, from, rollbackTokens);

        uint256[] memory consumedTokens = new uint256[](2);
        consumedTokens[0] = allowanceToken.id;
        consumedTokens[1] = allowanceToken.rollbackTokenId;

        uint256[] memory oldTokens = new uint256[](1);
        oldTokens[0] = allowanceToken.id;
        TokenUtilsLib.removeTokens(_accounts, from, oldTokens);

        TokenEventLib.triggerTokenDeletedEvent(_l2Event, address(this), from, consumedTokens, 0);

        allowanceToken.rollbackTokenId = 0;
        allowanceToken.owner = to;
        allowanceToken.status = TokenModel.TokenStatus.active;

        TokenUtilsLib.addTokenWithBalance(_accounts, allowanceToken.to, allowanceToken);
        TokenEventLib.triggerTokenReceivedEvent(_l2Event, address(this), to, allowanceToken.id, address(this), allowanceToken.status, allowanceToken.amount);

        TokenUtilsLib.removeAllowanceRecord(_accounts, from, msg.sender);

        TokenEventLib.triggerTokenActionCompletedEvent(_l2Event, address(this), from, rollbackTokens[0]);

        emit PrivateTransferFrom(msg.sender, from, to, tokenId);
        return true;
    }

    function privateRevokeApproval(address spender, uint256 allowanceTokenId) external whenNotPaused
    notBlacklisted(msg.sender) onlyAllowedBank nonReentrant virtual {
        require(spender != address(0), "PrivateERCToken: spender is the zero address");
        require(allowanceTokenId != 0, "PrivateERCToken: allowanceTokenId is zero");

        uint256 onChainAllowanceTokenId = _accounts[msg.sender].allowances[spender];
        require(onChainAllowanceTokenId != 0, "PrivateERCToken: no allowance exists for this spender");
        require(allowanceTokenId == onChainAllowanceTokenId, "PrivateERCToken: allowance tokenId mismatch");

        TokenModel.TokenEntity memory allowanceToken = _accounts[msg.sender].assets[onChainAllowanceTokenId];
        require(allowanceToken.id != 0, "PrivateERCToken: allowance token not found in assets");
        require(allowanceToken.owner == msg.sender, "PrivateERCToken: caller is not the token owner");
        require(allowanceToken.rollbackTokenId != 0, "PrivateERCToken: rollback token not found");

        TokenModel.TokenEntity storage rollbackToken = _accounts[msg.sender].assets[allowanceToken.rollbackTokenId];
        require(rollbackToken.id != 0, "PrivateERCToken: invalid rollback token");
        rollbackToken.status = TokenModel.TokenStatus.active;

        uint256[] memory allowanceTokenIds = new uint256[](1);
        allowanceTokenIds[0] = allowanceTokenId;
        TokenUtilsLib.removeTokens(_accounts, allowanceToken.owner, allowanceTokenIds);
        TokenEventLib.triggerTokenCanceledEvent(_l2Event, address(this), allowanceToken.owner, allowanceTokenId);

        TokenUtilsLib.removeAllowanceRecord(_accounts, msg.sender, spender);

        emit PrivateApprovalRevoked(msg.sender, spender, allowanceTokenId);
    }

    function privateRevokeApprovalFrom(address owner, uint256 allowanceTokenId) external whenNotPaused
    notBlacklisted(msg.sender) notBlacklisted(owner) onlyAllowedBank nonReentrant virtual {
        require(owner != address(0), "PrivateERCToken: owner is the zero address");
        require(allowanceTokenId != 0, "PrivateERCToken: allowanceTokenId is zero");

        uint256 onChainAllowanceTokenId = _accounts[owner].allowances[msg.sender];
        require(onChainAllowanceTokenId != 0, "PrivateERCToken: no allowance exists for this spender");
        require(allowanceTokenId == onChainAllowanceTokenId, "PrivateERCToken: allowance tokenId mismatch");

        TokenModel.TokenEntity memory allowanceToken = _accounts[owner].assets[onChainAllowanceTokenId];
        require(allowanceToken.id != 0, "PrivateERCToken: allowance token not found in assets");
        require(allowanceToken.owner == owner, "PrivateERCToken: owner is not the token owner");
        require(allowanceToken.rollbackTokenId != 0, "PrivateERCToken: rollback token not found");

        TokenModel.TokenEntity storage rollbackToken = _accounts[owner].assets[allowanceToken.rollbackTokenId];
        require(rollbackToken.id != 0, "PrivateERCToken: invalid rollback token");
        rollbackToken.status = TokenModel.TokenStatus.active;

        uint256[] memory allowanceTokenIds = new uint256[](1);
        allowanceTokenIds[0] = allowanceTokenId;
        TokenUtilsLib.removeTokens(_accounts, owner, allowanceTokenIds);
        TokenEventLib.triggerTokenCanceledEvent(_l2Event, address(this), owner, allowanceTokenId);

        TokenUtilsLib.removeAllowanceRecord(_accounts, owner, msg.sender);

        emit PrivateApprovalRevoked(owner, msg.sender, allowanceTokenId);
    }

    function getAllowanceTokens(address spender) external view virtual returns (uint256) {
        return _accounts[msg.sender].allowances[spender];
    }

    function getAllowanceTokensFrom(address owner) external view virtual returns (uint256) {
        return _accounts[owner].allowances[msg.sender];
    }
}
