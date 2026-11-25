// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CoreProtocolVault} from "../src/CoreProtocolVault.sol";
import {MockAtlasOracle} from "../src/MockAtlasOracle.sol";

contract CoreProtocolVaultTest is Test {
    event RiskActionExecuted(address indexed operator, uint8 actionType, uint256 triggerPrice, uint256 timestamp);

    bytes32 constant FEED = keccak256("XAU/USD");
    int256 constant PRICE = 2_000e8;

    MockAtlasOracle oracle;
    CoreProtocolVault vault;
    address alice = makeAddr("alice");

    function setUp() public {
        vm.warp(1_000_000);
        oracle = new MockAtlasOracle(PRICE);
        vault = new CoreProtocolVault(oracle);
        vm.deal(alice, 10 ether);
    }

    function test_depositMintsSharesOneToOne() public {
        vm.prank(alice);
        vault.deposit{value: 1 ether}();
        assertEq(vault.shares(alice), 1 ether);
        assertEq(vault.totalShares(), 1 ether);
    }

    function test_withdrawReturnsFunds() public {
        vm.startPrank(alice);
        vault.deposit{value: 1 ether}();
        vault.withdraw(0.4 ether);
        vm.stopPrank();
        assertEq(vault.shares(alice), 0.6 ether);
        assertEq(alice.balance, 9.4 ether);
    }

    function test_withdrawRevertsOnExcess() public {
        vm.prank(alice);
        vm.expectRevert(CoreProtocolVault.InsufficientShares.selector);
        vault.withdraw(1);
    }

    function test_oraclePriceReadsAtlas() public {
        skip(120);
        (uint256 price, uint256 age) = vault.oraclePrice(FEED);
        assertEq(price, uint256(PRICE));
        assertEq(age, 120);
    }

    function test_circuitBreakOnDeviation() public {
        uint256 expected = uint256(PRICE) * 10_350 / 10_000; // reference +3.5%
        vm.expectEmit(true, false, false, true);
        emit RiskActionExecuted(address(this), 2, uint256(PRICE), block.timestamp);
        vault.executeRiskAction(FEED, 2, expected);
        assertEq(uint8(vault.status()), 2);
    }

    function test_defensiveOnSmallerDeviation() public {
        vault.executeRiskAction(FEED, 1, uint256(PRICE) * 10_200 / 10_000);
        assertEq(uint8(vault.status()), 1);
    }

    function test_revertsWhenDeviationTooLow() public {
        vm.expectRevert(abi.encodeWithSelector(CoreProtocolVault.DeviationTooLow.selector, 99, 300));
        vault.executeRiskAction(FEED, 2, uint256(PRICE) * 10_100 / 10_000);
    }

    function test_staleFeedAllowsAction() public {
        skip(2 hours);
        vault.executeRiskAction(FEED, 2, uint256(PRICE));
        assertEq(uint8(vault.status()), 2);
    }

    function test_rejectsInvalidActionAndZeroExpected() public {
        vm.expectRevert(CoreProtocolVault.InvalidAction.selector);
        vault.executeRiskAction(FEED, 0, 1);
        vm.expectRevert(CoreProtocolVault.InvalidAction.selector);
        vault.executeRiskAction(FEED, 3, 1);
        vm.expectRevert(CoreProtocolVault.InvalidExpectedPrice.selector);
        vault.executeRiskAction(FEED, 1, 0);
    }

    function test_circuitBlocksDepositButNotWithdraw() public {
        vm.prank(alice);
        vault.deposit{value: 1 ether}();
        vault.setEmergencyPause(true);

        vm.startPrank(alice);
        vm.expectRevert(CoreProtocolVault.CircuitBroken.selector);
        vault.deposit{value: 1 ether}();
        vault.withdraw(1 ether);
        vm.stopPrank();
    }

    function test_onlyOwnerCanPauseAndReset() public {
        vm.prank(alice);
        vm.expectRevert(CoreProtocolVault.NotOwner.selector);
        vault.setEmergencyPause(true);

        vault.setEmergencyPause(true);
        vault.setEmergencyPause(false);
        assertEq(uint8(vault.status()), 0);
    }
}
