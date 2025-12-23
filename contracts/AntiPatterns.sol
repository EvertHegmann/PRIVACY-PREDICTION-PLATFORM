// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title FHE Anti-Patterns
 * @notice Demonstrates common mistakes and how to avoid them
 * @dev Educational contract showing what NOT to do with FHE
 *
 * This contract intentionally contains anti-patterns for educational purposes.
 * DO NOT use these patterns in production!
 *
 * Common Mistakes Covered:
 * 1. View functions with encrypted values (not allowed)
 * 2. Missing FHE.allowThis() permissions
 * 3. Incorrect handle lifecycle management
 * 4. Improper access control
 * 5. Gas inefficiencies
 */
contract AntiPatterns {
  bytes32 public encryptedValue;
  mapping(address => bytes32) public userValues;

  /**
   * @notice ANTI-PATTERN #1: View function returning encrypted value for computation
   * @dev ❌ WRONG: Cannot perform FHE operations in view functions
   *
   * Why it's wrong:
   * - View functions cannot modify state or perform FHE operations
   * - FHE operations require transaction context
   * - This will always fail in real FHEVM
   */
  function antiPattern1_ViewFunctionWithEncryption(
    bytes32 _encryptedA,
    bytes32 _encryptedB
  ) external pure returns (bytes32) {
    // ❌ WRONG: Attempting FHE operation in view function
    // In real FHEVM: euint32 result = FHE.add(_encryptedA, _encryptedB);
    // This will FAIL because view functions cannot perform FHE operations
    return keccak256(abi.encodePacked(_encryptedA, _encryptedB));
  }

  /**
   * @notice CORRECT PATTERN: State-changing function for FHE operations
   * @dev ✅ CORRECT: Use regular function, not view
   */
  function correctPattern1_StatefulFHEOperation(
    bytes32 _encryptedA,
    bytes32 _encryptedB
  ) external returns (bytes32) {
    // ✅ CORRECT: FHE operations in state-changing function
    bytes32 result = keccak256(abi.encodePacked(_encryptedA, _encryptedB, "add"));
    encryptedValue = result;
    return result;
  }

  /**
   * @notice ANTI-PATTERN #2: Missing FHE.allowThis() permission
   * @dev ❌ WRONG: Contract needs permission to use encrypted values
   *
   * Why it's wrong:
   * - Contract must be granted permission via FHE.allowThis()
   * - Without permission, cannot perform operations on encrypted data
   * - Will fail with "permission denied" error
   */
  function antiPattern2_MissingAllowThis(bytes32 _encrypted) external {
    // ❌ WRONG: No FHE.allowThis() call
    // In real FHEVM, this will fail:
    // euint32 value = _encrypted;
    // euint32 result = FHE.add(value, FHE.asEuint32(1)); // FAILS!

    encryptedValue = _encrypted; // Will fail in real FHEVM
  }

  /**
   * @notice CORRECT PATTERN: Proper permission management
   * @dev ✅ CORRECT: Always call FHE.allowThis() before operations
   */
  function correctPattern2_WithAllowThis(bytes32 _encrypted) external {
    // ✅ CORRECT: Grant contract permission first
    // In real FHEVM: FHE.allowThis(_encrypted);

    // Now contract can use the encrypted value
    encryptedValue = _encrypted;
  }

  /**
   * @notice ANTI-PATTERN #3: Not granting permission to users
   * @dev ❌ WRONG: Users need permission to decrypt their data
   *
   * Why it's wrong:
   * - After FHE operations, new handles are created
   * - Users cannot decrypt new handles without explicit permission
   * - Must call FHE.allow(result, user) to grant access
   */
  function antiPattern3_NoUserPermission(address _user) external {
    // ❌ WRONG: Missing FHE.allow(_user, encryptedValue)
    // User cannot decrypt this value!

    bytes32 newValue = keccak256(abi.encodePacked(encryptedValue, "operation"));
    userValues[_user] = newValue;
    // User has no way to decrypt newValue!
  }

  /**
   * @notice CORRECT PATTERN: Grant user permission after operations
   * @dev ✅ CORRECT: Always use FHE.allow() for user access
   */
  function correctPattern3_WithUserPermission(address _user) external {
    bytes32 newValue = keccak256(abi.encodePacked(encryptedValue, "operation"));
    userValues[_user] = newValue;

    // ✅ CORRECT: Grant user permission to decrypt
    // In real FHEVM: FHE.allow(newValue, _user);
  }

  /**
   * @notice ANTI-PATTERN #4: Exposing encrypted values without access control
   * @dev ❌ WRONG: Anyone can read encrypted values
   *
   * Why it's wrong:
   * - Even encrypted values should have access control
   * - Prevents unauthorized decryption attempts
   * - Protects user privacy
   */
  function antiPattern4_NoAccessControl(address _user) external view returns (bytes32) {
    // ❌ WRONG: No check if caller should access this data
    return userValues[_user];
  }

  /**
   * @notice CORRECT PATTERN: Access control on encrypted data
   * @dev ✅ CORRECT: Verify caller permissions
   */
  function correctPattern4_WithAccessControl(address _user) external view returns (bytes32) {
    // ✅ CORRECT: Check permissions
    require(
      msg.sender == _user || msg.sender == address(this),
      "Access denied"
    );
    return userValues[_user];
  }

  /**
   * @notice ANTI-PATTERN #5: Inefficient multiple operations
   * @dev ❌ WRONG: Unnecessary intermediate variables and operations
   *
   * Why it's wrong:
   * - Each FHE operation is expensive
   * - Should minimize number of operations
   * - Combine operations when possible
   */
  function antiPattern5_InefficientOperations(
    bytes32 _a,
    bytes32 _b,
    bytes32 _c
  ) external pure returns (bytes32) {
    // ❌ WRONG: Multiple unnecessary operations
    bytes32 temp1 = keccak256(abi.encodePacked(_a, _b));
    bytes32 temp2 = keccak256(abi.encodePacked(temp1, "add"));
    bytes32 temp3 = keccak256(abi.encodePacked(temp2, _c));
    bytes32 result = keccak256(abi.encodePacked(temp3, "final"));
    return result;
  }

  /**
   * @notice CORRECT PATTERN: Efficient combined operations
   * @dev ✅ CORRECT: Minimize FHE operations
   */
  function correctPattern5_EfficientOperations(
    bytes32 _a,
    bytes32 _b,
    bytes32 _c
  ) external pure returns (bytes32) {
    // ✅ CORRECT: Combine operations to reduce gas
    return keccak256(abi.encodePacked(_a, _b, _c, "combined"));
  }

  /**
   * @notice ANTI-PATTERN #6: Incorrect handle lifecycle
   * @dev ❌ WRONG: Not understanding handle creation and expiration
   *
   * Why it's wrong:
   * - Each FHE operation creates new handle
   * - Old handles become invalid after operations
   * - Must track and update handle references
   */
  function antiPattern6_IncorrectHandleLifecycle(bytes32 _encrypted) external {
    // ❌ WRONG: Reusing old handle after operation
    bytes32 oldHandle = _encrypted;

    // Perform operation (creates NEW handle)
    bytes32 newHandle = keccak256(abi.encodePacked(oldHandle, "add"));

    // ❌ WRONG: Still referencing oldHandle somewhere
    // In real FHEVM, oldHandle is now invalid for further operations
    encryptedValue = oldHandle; // Should use newHandle!
  }

  /**
   * @notice CORRECT PATTERN: Proper handle lifecycle management
   * @dev ✅ CORRECT: Always use the latest handle
   */
  function correctPattern6_CorrectHandleLifecycle(bytes32 _encrypted) external {
    // ✅ CORRECT: Track handle updates
    bytes32 currentHandle = _encrypted;

    // Operation creates new handle
    currentHandle = keccak256(abi.encodePacked(currentHandle, "add"));

    // ✅ CORRECT: Use updated handle
    encryptedValue = currentHandle;
  }

  /**
   * @notice ANTI-PATTERN #7: Decrypting in contract storage
   * @dev ❌ WRONG: Storing decrypted values defeats FHE purpose
   *
   * Why it's wrong:
   * - Decrypted values are public on blockchain
   * - Defeats entire purpose of FHE
   * - Privacy is lost permanently
   */
  uint256 public decryptedValue; // ❌ WRONG: Public decrypted value!

  function antiPattern7_StoringDecryptedValue(uint256 _plaintext) external {
    // ❌ WRONG: Storing plaintext on-chain
    decryptedValue = _plaintext;
    // Now everyone can see the value!
  }

  /**
   * @notice CORRECT PATTERN: Keep values encrypted on-chain
   * @dev ✅ CORRECT: Only decrypt off-chain or when explicitly needed
   */
  function correctPattern7_KeepEncrypted(bytes32 _encrypted) external {
    // ✅ CORRECT: Store encrypted, decrypt off-chain
    encryptedValue = _encrypted;
    // Value remains private!
  }

  /**
   * @notice ANTI-PATTERN #8: Missing input proof validation
   * @dev ❌ WRONG: Not validating encrypted inputs
   *
   * Why it's wrong:
   * - Input proofs ensure data integrity
   * - Without validation, malicious inputs possible
   * - Security vulnerability
   */
  function antiPattern8_NoInputProofValidation(bytes32 _encrypted) external {
    // ❌ WRONG: No input proof check
    // In real FHEVM: Must use FHE.fromExternal(external, proof)
    encryptedValue = _encrypted;
  }

  /**
   * @notice CORRECT PATTERN: Validate input proofs
   * @dev ✅ CORRECT: Always validate encrypted inputs
   */
  function correctPattern8_WithInputProofValidation(
    uint32 _value,
    bytes calldata _inputProof
  ) external {
    // ✅ CORRECT: Validate input proof
    require(_inputProof.length > 0, "Input proof required");

    // In real FHEVM: euint32 encrypted = FHE.fromExternal(external, _inputProof);
    encryptedValue = keccak256(abi.encodePacked(_value, _inputProof));
  }

  /**
   * @notice ANTI-PATTERN #9: Comparison result as boolean
   * @dev ❌ WRONG: FHE comparisons return encrypted booleans
   *
   * Why it's wrong:
   * - FHE.eq() returns ebool, not bool
   * - Cannot use in if statements directly
   * - Must use FHE.select() for conditional logic
   */
  function antiPattern9_DirectBooleanComparison(
    bytes32 _a,
    bytes32 _b
  ) external pure returns (bool) {
    // ❌ WRONG: Trying to get plaintext boolean from FHE comparison
    // In real FHEVM: This will not compile or will fail
    bytes32 encryptedResult = keccak256(abi.encodePacked(_a, _b, "eq"));
    // Cannot convert to bool!
    return uint256(encryptedResult) > 0; // Meaningless!
  }

  /**
   * @notice CORRECT PATTERN: Use FHE.select for conditional logic
   * @dev ✅ CORRECT: Work with encrypted booleans properly
   */
  function correctPattern9_UseSelect(
    bytes32 _a,
    bytes32 _b,
    bytes32 _ifTrue,
    bytes32 _ifFalse
  ) external pure returns (bytes32) {
    // ✅ CORRECT: Use FHE.select for conditional
    bytes32 condition = keccak256(abi.encodePacked(_a, _b, "eq"));

    // In real FHEVM: result = FHE.select(condition, _ifTrue, _ifFalse);
    return keccak256(abi.encodePacked(condition, _ifTrue, _ifFalse, "select"));
  }

  /**
   * @notice ANTI-PATTERN #10: Gas inefficient batch operations
   * @dev ❌ WRONG: Processing array items one by one
   *
   * Why it's wrong:
   * - FHE operations are expensive
   * - Should batch when possible
   * - Optimize for gas efficiency
   */
  function antiPattern10_InefficientBatch(
    bytes32[] calldata _values
  ) external returns (uint256) {
    uint256 count = 0;
    for (uint256 i = 0; i < _values.length; i++) {
      // ❌ WRONG: Separate storage write for each
      userValues[msg.sender] = _values[i];
      count++;
    }
    return count;
  }

  /**
   * @notice CORRECT PATTERN: Efficient batch processing
   * @dev ✅ CORRECT: Optimize batch operations
   */
  function correctPattern10_EfficientBatch(
    bytes32[] calldata _values
  ) external returns (uint256) {
    // ✅ CORRECT: Single combined operation
    require(_values.length > 0, "Empty array");

    bytes32 combined = keccak256(abi.encodePacked(_values));
    userValues[msg.sender] = combined;

    return _values.length;
  }

  /**
   * @notice Summary of best practices
   * @dev Reference function listing all correct patterns
   */
  function bestPracticesSummary() external pure returns (string memory) {
    return
      "FHE Best Practices:\n"
      "1. Never use view functions for FHE operations\n"
      "2. Always call FHE.allowThis() before using encrypted values\n"
      "3. Grant users permission with FHE.allow() after operations\n"
      "4. Implement access control even for encrypted data\n"
      "5. Minimize number of FHE operations for gas efficiency\n"
      "6. Track handle updates after each operation\n"
      "7. Keep values encrypted on-chain\n"
      "8. Always validate input proofs\n"
      "9. Use FHE.select() for conditional logic\n"
      "10. Optimize batch operations";
  }
}
