// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAtlasOracle {
    function getPrice(bytes32 feedId) external view returns (uint256 price, uint256 updatedAt);
    function latestAnswer() external view returns (int256);
    function decimals() external view returns (uint8);
}
