// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title A Simple FHE Counter Contract
 * @notice Demonstrates FHE operations (add, subtract) with encrypted values
 * @dev Uses simulated FHE for Sepolia compatibility
 *
 * Concepts demonstrated:
 * - Encrypted value storage
 * - FHE arithmetic operations (add/sub simulation)
 * - Access control with encryption
 * - Permission management
 */
contract FHECounter {
  /// @notice Simulated encrypted uint32
  bytes32 private _encryptedCount;

  /// @notice Owner of the contract
  address public owner;

  event CountIncremented(bytes32 newEncryptedValue);
  event CountDecremented(bytes32 newEncryptedValue);

  modifier onlyOwner() {
    require(msg.sender == owner, "Only owner");
    _;
  }

  constructor() {
    owner = msg.sender;
    _encryptedCount = keccak256(abi.encodePacked(uint32(0)));
  }

  /**
   * @notice Get the encrypted count
   * @return The encrypted count value
   */
  function getCount() external view returns (bytes32) {
    return _encryptedCount;
  }

  /**
   * @notice Increment counter by encrypted value
   * @param _encryptedValue The encrypted value to add
   * @dev Simulates FHE.add operation
   */
  function increment(bytes32 _encryptedValue) external onlyOwner {
    // Simulate FHE addition: hash represents operation on encrypted values
    _encryptedCount = keccak256(abi.encodePacked(
      _encryptedCount,
      _encryptedValue,
      "add"
    ));

    emit CountIncremented(_encryptedCount);
  }

  /**
   * @notice Decrement counter by encrypted value
   * @param _encryptedValue The encrypted value to subtract
   * @dev Simulates FHE.sub operation
   */
  function decrement(bytes32 _encryptedValue) external onlyOwner {
    // Simulate FHE subtraction: hash represents operation on encrypted values
    _encryptedCount = keccak256(abi.encodePacked(
      _encryptedCount,
      _encryptedValue,
      "sub"
    ));

    emit CountDecremented(_encryptedCount);
  }

  /**
   * @notice Perform encrypted comparison
   * @param _encryptedValue Value to compare against
   * @return Encrypted boolean result (true if equal)
   * @dev Simulates FHE.eq operation
   */
  function isEqual(bytes32 _encryptedValue) external view returns (bytes32) {
    // Simulate FHE equality check
    return keccak256(abi.encodePacked(
      _encryptedCount,
      _encryptedValue,
      "eq"
    ));
  }

  /**
   * @notice Reset counter (encrypted)
   * @dev Simulates FHE state reset
   */
  function reset() external onlyOwner {
    _encryptedCount = keccak256(abi.encodePacked(uint32(0)));
  }

  /**
   * @notice Demonstrate permission setting on encrypted value
   * @param _recipient Address to grant access
   * @dev Simulates FHE.allow operation
   */
  function grantAccess(address _recipient) external onlyOwner {
    require(_recipient != address(0), "Invalid recipient");
    // In real FHEVM: FHE.allow(_encryptedCount, _recipient);
    // This is implicit in our simulated version
  }
}
