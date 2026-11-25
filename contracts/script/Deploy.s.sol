// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IAtlasOracle} from "../src/interfaces/IAtlasOracle.sol";
import {MockAtlasOracle} from "../src/MockAtlasOracle.sol";
import {MockRWA} from "../src/MockRWA.sol";
import {CoreProtocolVault} from "../src/CoreProtocolVault.sol";

/// forge script script/Deploy.s.sol --rpc-url bsc_testnet --broadcast --private-key $PRIVATE_KEY
/// Set ATLAS_ORACLE to use the canonical feed; otherwise a MockAtlasOracle is deployed.
contract Deploy is Script {
    int256 constant INITIAL_PRICE = 2_000e8;

    function run() external {
        vm.startBroadcast();
        address atlas = vm.envOr("ATLAS_ORACLE", address(0));
        if (atlas == address(0)) atlas = address(new MockAtlasOracle(INITIAL_PRICE));
        MockRWA rwa = new MockRWA();
        CoreProtocolVault vault = new CoreProtocolVault(IAtlasOracle(atlas));
        vm.stopBroadcast();

        console.log("Atlas oracle:", atlas);
        console.log("MockRWA:", address(rwa));
        console.log("Vault:", address(vault));
    }
}
