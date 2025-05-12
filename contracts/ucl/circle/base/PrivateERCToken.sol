pragma solidity ^0.8.0;

import "../../image9/event/IL2Event.sol";
import "../model/TokenModel.sol";
import "../lib/TokenEventLib.sol";
import "./IPrivateERCToken.sol";
import "../lib/TokenVerificationLib.sol";

contract PrivateERCToken is IPrivateERCToken {
    IL2Event _l2Event;
    address scOwner;
    mapping(address=>TokenModel2.Account) accountTokens;
    uint256 public privateTotalSupply;

    constructor(IL2Event l2Event) {
        scOwner = msg.sender;
        _l2Event = l2Event;
        TokenEventLib2.triggerTokenSCCreatedEvent(_l2Event, address(this), msg.sender, TokenModel2.TokenSCTypeEnum.ERC20);
    }

    function privateReserveAmount(TokenModel2.ParentTokens memory parentTokens, TokenModel2.AmountInfo[] memory reservedAmounts,
        bytes calldata proof) external {

        (bool isValid, uint result, uint256[] memory znValues) = TokenVerificationLib2.verifyTokenSplit(parentTokens, reservedAmounts, proof);
        require(isValid, "invalid proof");

        address owner= msg.sender;
        TokenModel2.Account storage ownerAccount = accountTokens[owner];

        // create all child tokens
        for (uint256 i = 0; i < reservedAmounts.length; i++) {
            TokenModel2.AmountInfo memory child = reservedAmounts[i];

            TokenModel2.TokenEntity memory childEntity = TokenModel2.TokenEntity({
            id : child.id,
            tokenType : child.token_type,
            owner : child.owner,
            manager : child.manager,
            status : child.status,

            amount: child.amount,
            issuerEncryptedAmount: child.issuerEncryptedAmount,

            approvedSpender : address(0),
            rollbackTokenId : 0
            });

            saveTokenInBox(ownerAccount, child.location, childEntity);
            TokenEventLib2.triggerTokenSplitEvent(_l2Event, address(this), childEntity);
        }

        //delete all parent tokens
        for(uint i=0;i<parentTokens.parentIds.length;i++) {
            uint256 pid = parentTokens.parentIds[i];
            TokenModel2.TokenEntity memory parentEntity = ownerAccount.inBox[pid];

            deleteTokenInBox(ownerAccount, TokenModel2.TokenBox.InBox, pid);
            TokenEventLib2.triggerTokenRemovedEvent(_l2Event, address(this), parentEntity);
        }
    }

    function deleteTokenInBox(TokenModel2.Account storage ownerAccount, TokenModel2.TokenBox box, uint256 tokenId) internal {
        if (box == TokenModel2.TokenBox.InBox) {
            delete ownerAccount.inBox[tokenId];
        } else if (box ==  TokenModel2.TokenBox.OutBox) {
            delete  ownerAccount.outBox[tokenId];
        } else if (box ==  TokenModel2.TokenBox.ApvBox) {
            delete  ownerAccount.apvBox[tokenId];
        }
    }

    function findTokenById(TokenModel2.Account storage ownerAccount,  uint256 tokenId) internal
        returns (TokenModel2.TokenEntity memory) {

        TokenModel2.TokenEntity memory entity = ownerAccount.inBox[tokenId];
        if (entity.id !=0) {
            return entity;
        }

        entity= ownerAccount.outBox[tokenId];
        if (entity.id != 0) {
            return entity;
        }

        return ownerAccount.apvBox[tokenId];
    }

    function saveTokenInBox(TokenModel2.Account storage ownerAccount, TokenModel2.TokenBox box, TokenModel2.TokenEntity memory entity) internal {
        uint256 tokenId = entity.id;

        if (box == TokenModel2.TokenBox.InBox) {
            ownerAccount.inBox[tokenId] = entity;

        } else if (box ==  TokenModel2.TokenBox.OutBox) {
            ownerAccount.outBox[tokenId] = entity;

        } else if (box ==  TokenModel2.TokenBox.ApvBox) {
            ownerAccount.apvBox[tokenId] = entity;
        }
    }


    function privateSplitApproval(address owner, TokenModel2.AmountInfo memory approvedAmount,
        TokenModel2.AmountInfo[] memory splitAmounts, bytes calldata proof) external {

    }

    function privateRollbackAmount(uint256 amountId) external {

    }

    function privateMint(address to, address to_manager, TokenModel2.AmountInfo calldata amountInfo, bytes calldata proof) external {

    }

//    function privateTotalSupply() external view returns (TokenModel2.ElGamal memory) {
//        return TokenModel2.ElGamal( {
//            cl_x: 0,
//            cl_y: 0,
//            cr_x: 0,
//            cr_y: 0
//        });
//    }

    function privateSetTotalSupply(uint256 totalSupply) external {
        totalSupply = totalSupply;
    }

    function privateBalanceOf(address owner, uint256 token_type) external returns (TokenModel2.ElGamal memory) {
        return TokenModel2.ElGamal( {
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

    function privateAllowance(address owner, address spender) external returns (TokenModel2.ElGamal memory) {
        return TokenModel2.ElGamal( {
        cl_x: 0,
        cl_y: 0,
        cr_x: 0,
        cr_y: 0
        });
    }


    function privateTransfer(address to, uint256[] memory amountIds) external {

    }

    function privateBurn(uint256 amountId) external {
        address owner = msg.sender;
        TokenModel2.Account storage ownerAccount = accountTokens[owner];
        TokenModel2.TokenEntity memory entity = findTokenById(ownerAccount, amountId);

        if (entity.id == 0) {
            return;
        }

        deleteTokenInBox(ownerAccount, TokenModel2.TokenBox.InBox, amountId);
        deleteTokenInBox(ownerAccount, TokenModel2.TokenBox.OutBox, amountId);
        deleteTokenInBox(ownerAccount, TokenModel2.TokenBox.ApvBox, amountId);
        TokenEventLib2.triggerTokenBurnedEvent(_l2Event, address(this), entity);
    }
}