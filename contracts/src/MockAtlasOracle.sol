// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAtlasOracle} from "./interfaces/IAtlasOracle.sol";

/// @notice Atlas-compatible feed for testnet when no canonical feed address is available.
/// Anyone can push a price so the demo can simulate divergence.
contract MockAtlasOracle is IAtlasOracle {
    uint8 public constant decimals = 8;
    int256 public latestAnswer;
    uint256 public updatedAt;

    constructor(int256 initialPrice) {
        _set(initialPrice);
    }

    function setPrice(int256 price) external {
        _set(price);
    }

    function getPrice(bytes32) external view returns (uint256, uint256) {
        return (uint256(latestAnswer), updatedAt);
    }

    function _set(int256 price) private {
        require(price > 0, "bad price");
        latestAnswer = price;
        updatedAt = block.timestamp;
    }
}
