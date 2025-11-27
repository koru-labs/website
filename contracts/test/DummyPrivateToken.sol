
import "../ucl/circle/base/PrivateTokenData.sol";
import "../ucl/circle/model/TokenModel.sol";

contract DummyPrivateToken is PrivateTokenData {

    function setAccountToken(address owner, TokenModel.TokenEntity memory token) public {
        _accounts[owner].assets[token.id] = token;
    }

    function getAccountToken2(address owner, uint256 tokenId) public view returns (TokenModel.TokenEntity memory) {
        return _accounts[owner].assets[tokenId];
    }

    function privateTransfers(uint256[] calldata tokenIds) external returns (bool) {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId= tokenIds[i];
            TokenModel.TokenEntity memory tokenEntity = _accounts[msg.sender].assets[tokenId];

            uint256 rollBackId = tokenEntity.rollbackTokenId;
            delete _accounts[msg.sender].assets[rollBackId];
            delete _accounts[msg.sender].assets[tokenId];

            _accounts[tokenEntity.to].assets[tokenId] = tokenEntity;
        }
        return true;
    }

    function update() public   {

    }
}