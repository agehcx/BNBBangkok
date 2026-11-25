// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAtlasOracle} from "./interfaces/IAtlasOracle.sol";

/// @notice Native-BNB vault gated by an Atlas oracle risk hook.
/// Risk actions are permissionless but only succeed when the oracle price diverges from the
/// caller's expected (off-chain reference) price, or the feed is stale. Reset is owner-only.
contract CoreProtocolVault {
    enum Status { NORMAL, DEFENSIVE_REBALANCE, CIRCUIT_BROKEN }

    uint256 public constant BPS = 10_000;
    uint256 public constant DEFENSIVE_BPS = 150; // 1.5%
    uint256 public constant CIRCUIT_BPS = 300; // 3.0%
    uint256 public constant MAX_STALENESS = 1 hours;

    IAtlasOracle public immutable oracle;
    address public immutable owner;

    Status public status;
    uint256 public totalShares;
    mapping(address => uint256) public shares;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RiskActionExecuted(address indexed operator, uint8 actionType, uint256 triggerPrice, uint256 timestamp);

    error NotOwner();
    error CircuitBroken();
    error InvalidAction();
    error InvalidExpectedPrice();
    error DeviationTooLow(uint256 deviationBps, uint256 requiredBps);
    error InsufficientShares();
    error ZeroAmount();
    error TransferFailed();

    constructor(IAtlasOracle oracle_) {
        oracle = oracle_;
        owner = msg.sender;
    }

    /// @notice Shares are 1:1 with deposited BNB (wei).
    function deposit() external payable {
        if (status == Status.CIRCUIT_BROKEN) revert CircuitBroken();
        if (msg.value == 0) revert ZeroAmount();
        shares[msg.sender] += msg.value;
        totalShares += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /// @notice Withdrawals stay open even when the circuit is broken.
    function withdraw(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        if (shares[msg.sender] < amount) revert InsufficientShares();
        shares[msg.sender] -= amount;
        totalShares -= amount;
        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
        emit Withdrawn(msg.sender, amount);
    }

    /// @notice Current canonical Atlas price and its age in seconds.
    function oraclePrice(bytes32 feedId) public view returns (uint256 price, uint256 age) {
        (uint256 p, uint256 updatedAt) = oracle.getPrice(feedId);
        return (p, updatedAt > block.timestamp ? 0 : block.timestamp - updatedAt);
    }

    /// @param actionType 1 = DEFENSIVE_REBALANCE, 2 = CIRCUIT_BROKEN
    /// @param expectedPrice reference price (oracle decimals) the Atlas feed is compared against
    function executeRiskAction(bytes32 feedId, uint8 actionType, uint256 expectedPrice) external {
        if (actionType == 0 || actionType > uint8(Status.CIRCUIT_BROKEN)) revert InvalidAction();
        if (expectedPrice == 0) revert InvalidExpectedPrice();

        (uint256 price, uint256 age) = oraclePrice(feedId);
        bool stale = age > MAX_STALENESS;
        uint256 deviation = _deviationBps(price, expectedPrice);
        uint256 required = actionType == uint8(Status.CIRCUIT_BROKEN) ? CIRCUIT_BPS : DEFENSIVE_BPS;
        if (!stale && deviation < required) revert DeviationTooLow(deviation, required);

        status = Status(actionType);
        emit RiskActionExecuted(msg.sender, actionType, price, block.timestamp);
    }

    /// @notice Owner kill switch. `true` breaks the circuit; `false` restores NORMAL.
    function setEmergencyPause(bool paused) external {
        if (msg.sender != owner) revert NotOwner();
        status = paused ? Status.CIRCUIT_BROKEN : Status.NORMAL;
        emit RiskActionExecuted(msg.sender, uint8(status), 0, block.timestamp);
    }

    function _deviationBps(uint256 price, uint256 expected) private pure returns (uint256) {
        uint256 diff = price > expected ? price - expected : expected - price;
        return diff * BPS / expected;
    }
}
