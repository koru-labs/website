// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../event/IL2Event.sol";
import "../model/TokenModel.sol";
import "../lib/TokenEventLib.sol";
import "./IPrivateERCToken.sol";
import "../lib/TokenVerificationLib.sol";
import {TokenOperationsLib} from "../lib/TokenOperationsLib.sol";

contract PrivateERCToken is IPrivateERCToken {
    IL2Event _l2Event;
    address scOwner;
    mapping(address=>TokenModel.Account) accountTokens;
    mapping(address => mapping(uint256 => TokenModel.TokenEntity)) public userTokenMap;
    uint256 public privateTotalSupply;

    constructor(IL2Event l2Event) {
        scOwner = msg.sender;
        _l2Event = l2Event;
        TokenEventLib.triggerTokenSCCreatedEvent(_l2Event, address(this), msg.sender, TokenModel.TokenSCTypeEnum.ERC20);
    }

    function privateReserveAmount(TokenModel.ParentTokens memory parentTokens, TokenModel.AmountInfo[] memory reservedAmounts,
        bytes calldata proof) external {

//        (bool isValid, uint result, uint256[] memory znValues) = TokenVerificationLib.verifyTokenSplit(parentTokens, reservedAmounts, proof);
//        require(isValid, "invalid proof");
//
//        address owner= msg.sender;
//        TokenModel.Account storage ownerAccount = accountTokens[owner];
//
//        // create all child tokens
//        for (uint256 i = 0; i < reservedAmounts.length; i++) {
//            TokenModel.AmountInfo memory child = reservedAmounts[i];
//
//            TokenModel.TokenEntity memory childEntity = TokenModel.TokenEntity({
//            id : child.id,
//            tokenType : child.token_type,
//            owner : child.owner,
//            manager : child.manager,
//            status : child.status,
//
//            amount: child.amount,
//            issuerEncryptedAmount: child.issuerEncryptedAmount,
//
//            approvedSpender : address(0),
//            rollbackTokenId : 0
//            });
//
//            saveTokenInBox(ownerAccount, child.location, childEntity);
//            TokenEventLib.triggerTokenSplitEvent(_l2Event, address(this), childEntity);
//        }
//
//        //delete all parent tokens
//        for(uint i=0;i<parentTokens.parentIds.length;i++) {
//            uint256 pid = parentTokens.parentIds[i];
//            TokenModel.TokenEntity memory parentEntity = ownerAccount.inBox[pid];
//
//            deleteTokenInBox(ownerAccount, TokenModel.TokenBox.InBox, pid);
//            TokenEventLib.triggerTokenRemovedEvent(_l2Event, address(this), parentEntity);
//        }
    }

    function deleteTokenInBox(TokenModel.Account storage ownerAccount, TokenModel.TokenBox box, uint256 tokenId) internal {
//        if (box == TokenModel.TokenBox.InBox) {
//            delete ownerAccount.inBox[tokenId];
//        } else if (box ==  TokenModel.TokenBox.OutBox) {
//            delete  ownerAccount.outBox[tokenId];
//        } else if (box ==  TokenModel.TokenBox.ApvBox) {
//            delete  ownerAccount.apvBox[tokenId];
//        }
    }

//    function findTokenById(TokenModel.Account storage ownerAccount,  uint256 tokenId) internal
//        returns (TokenModel.TokenEntity memory) {
//
//        TokenModel.TokenEntity memory entity = ownerAccount.inBox[tokenId];
//        if (entity.id !=0) {
//            return entity;
//        }
//
//        entity= ownerAccount.outBox[tokenId];
//        if (entity.id != 0) {
//            return entity;
//        }
//
//        return ownerAccount.apvBox[tokenId];
//    }

//    function saveTokenInBox(TokenModel.Account storage ownerAccount, TokenModel.TokenBox box, TokenModel.TokenEntity memory entity) internal {
//        uint256 tokenId = entity.id;
//
//        if (box == TokenModel.TokenBox.InBox) {
//            ownerAccount.inBox[tokenId] = entity;
//
//        } else if (box ==  TokenModel.TokenBox.OutBox) {
//            ownerAccount.outBox[tokenId] = entity;
//
//        } else if (box ==  TokenModel.TokenBox.ApvBox) {
//            ownerAccount.apvBox[tokenId] = entity;
//        }
//    }


    function privateSplitApproval(address owner, TokenModel.AmountInfo memory approvedAmount,
        TokenModel.AmountInfo[] memory splitAmounts, bytes calldata proof) external {

    }

    function privateRollbackAmount(uint256 amountId) external {

    }

    function privateMint(TokenModel.AmountInfo calldata amountInfo, bytes calldata proof) external {
        (bool isValid, uint result, uint256[] memory znValues) = TokenVerificationLib.verifyTokenMint(amountInfo.amount, proof);
        require(isValid, "invalid proof");

        TokenOperationsLib.mintTokenLogic(userTokenMap,amountInfo.owner,amountInfo.manager, amountInfo);

        TokenModel.TokenEntity memory entity = userTokenMap[amountInfo.owner][amountInfo.id];
        TokenEventLib.triggerTokenMintedEvent(_l2Event, address(this), entity);
    }

//    function privateTotalSupply() external view returns (TokenModel.ElGamal memory) {
//        return TokenModel.ElGamal( {
//            cl_x: 0,
//            cl_y: 0,
//            cr_x: 0,
//            cr_y: 0
//        });
//    }

    function privateSetTotalSupply(uint256 totalSupply) external {
        totalSupply = totalSupply;
    }

    function privateBalanceOf(address owner, uint256 token_type) external returns (TokenModel.ElGamal memory) {
        return TokenModel.ElGamal( {
            cl_x: 0,
            cl_y: 0,
            cr_x: 0,
            cr_y: 0
        });
    }

    function privateApprove(address spender, uint256[] memory amountIds) external {

    }

    function privateTransferFrom(address from, address to, uint256[] memory amountIds) external {

    }

    function privateAllowance(address owner, address spender) external returns (TokenModel.ElGamal memory) {
        return TokenModel.ElGamal( {
        cl_x: 0,
        cl_y: 0,
        cr_x: 0,
        cr_y: 0
        });
    }


    function privateTransfer(address to, uint256[] memory amountIds) external {

    }

    function privateBurn(uint256 amountId) external {
//        address owner = msg.sender;
//        TokenModel.Account storage ownerAccount = accountTokens[owner];
//        TokenModel.TokenEntity memory entity = findTokenById(ownerAccount, amountId);
//
//        if (entity.id == 0) {
//            return;
//        }
//
//        deleteTokenInBox(ownerAccount, TokenModel.TokenBox.InBox, amountId);
//        deleteTokenInBox(ownerAccount, TokenModel.TokenBox.OutBox, amountId);
//        deleteTokenInBox(ownerAccount, TokenModel.TokenBox.ApvBox, amountId);
//        TokenEventLib.triggerTokenBurnedEvent(_l2Event, address(this), entity);
    }
}