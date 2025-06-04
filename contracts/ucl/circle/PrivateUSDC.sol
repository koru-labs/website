pragma solidity ^0.8.0;

import "./base/PrivateERCToken.sol";
import "../../usdc/v2/FiatTokenV2.sol";

contract PrivateUSDC is PrivateERCToken, FiatTokenV2 {

    function initialize(
        string memory tokenName,
        string memory tokenSymbol,
        string memory tokenCurrency,
        uint8 tokenDecimals,
        address newMasterMinter,
        address newPauser,
        address newBlacklister,
        address newOwner,
        IL2Event l2Event,
        InstitutionUserRegistry institutionRegistration) external {

        initialize(tokenName, tokenSymbol, tokenCurrency, tokenDecimals, newMasterMinter, newPauser, newBlacklister, newOwner);
        initialize_hamsa(TokenModel.TokenSCTypeEnum.ERC20, l2Event, institutionRegistration);
    }
}