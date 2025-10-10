// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @dev Shares storage layout between the proxy and the HamsaL2Event logic contract.
 *      Follows the pattern already used for InstitutionUserRegistry so the proxy keeps
 *      ownership/implementation data alongside the event counters.
 */
abstract contract HamsaL2EventDataTemplate {
    // Proxy administration (kept in the same layout across logic and proxy contracts)
    address public admin;
    address public implementationA;
    address public implementationB;
    uint8 public percentageToB;

    // Event counters preserved across upgrades
    uint256 internal eventCont;
    uint256 internal rollupEventCont;
}
