// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title A Simple Counter Contract
 * @notice Basic counter for comparison with FHE version
 * @dev Demonstrates simple state management without encryption
 */
contract Counter {
  uint32 private _count;

  /// @notice Returns the current count
  function getCount() external view returns (uint32) {
    return _count;
  }

  /// @notice Increments the counter by a specific value
  /// @param value The amount to increment
  function increment(uint32 value) external {
    _count += value;
  }

  /// @notice Decrements the counter by a specific value
  /// @param value The amount to decrement
  function decrement(uint32 value) external {
    require(_count >= value, "Counter: cannot decrement below zero");
    _count -= value;
  }

  /// @notice Reset counter to zero
  function reset() external {
    _count = 0;
  }
}
