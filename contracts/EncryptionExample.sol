// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title Encryption Example
 * @notice Demonstrates encryption of single and multiple values with FHE
 * @dev Shows input proofs and encryption patterns
 *
 * Key Concepts:
 * - Input proofs: Cryptographic proof that encrypted input is valid
 * - Single value encryption: Basic encrypted storage
 * - Multiple value encryption: Batch encryption patterns
 * - Encryption types: euint8, euint16, euint32, euint64, ebool, eaddress
 */
contract EncryptionExample {
  /// @notice Single encrypted value storage
  bytes32 public singleEncryptedValue;

  /// @notice Multiple encrypted values storage
  bytes32[] public multipleEncryptedValues;

  /// @notice Mapping of user to their encrypted data
  mapping(address => bytes32) public userEncryptedData;

  /// @notice Mapping of user to array of encrypted values
  mapping(address => bytes32[]) public userMultipleData;

  event SingleValueEncrypted(bytes32 encryptedValue);
  event MultipleValuesEncrypted(uint256 count);
  event UserDataEncrypted(address indexed user, bytes32 encryptedValue);

  /**
   * @notice Encrypt and store a single value
   * @param _value The plaintext value to encrypt
   * @param _inputProof Proof that the encrypted input is valid
   * @dev Demonstrates basic encryption with input proof
   *
   * In real FHEVM:
   * function encryptSingleValue(externalEuint32 _value, bytes calldata _inputProof) {
   *   euint32 encrypted = FHE.fromExternal(_value, _inputProof);
   *   // Store and use encrypted value
   * }
   */
  function encryptSingleValue(uint32 _value, bytes calldata _inputProof) external {
    // Simulate encryption with input proof validation
    require(_inputProof.length > 0, "Input proof required");

    // In real FHEVM: euint32 encrypted = FHE.fromExternal(_value, _inputProof);
    singleEncryptedValue = keccak256(abi.encodePacked(
      _value,
      _inputProof,
      block.timestamp,
      msg.sender
    ));

    emit SingleValueEncrypted(singleEncryptedValue);
  }

  /**
   * @notice Encrypt and store multiple values at once
   * @param _values Array of plaintext values
   * @param _inputProofs Array of corresponding input proofs
   * @dev Demonstrates batch encryption pattern
   */
  function encryptMultipleValues(
    uint32[] calldata _values,
    bytes[] calldata _inputProofs
  ) external {
    require(_values.length == _inputProofs.length, "Length mismatch");
    require(_values.length > 0, "Empty array");

    delete multipleEncryptedValues; // Clear previous values

    for (uint256 i = 0; i < _values.length; i++) {
      require(_inputProofs[i].length > 0, "Input proof required");

      // Simulate encryption for each value
      bytes32 encrypted = keccak256(abi.encodePacked(
        _values[i],
        _inputProofs[i],
        block.timestamp,
        msg.sender,
        i // Include index for uniqueness
      ));

      multipleEncryptedValues.push(encrypted);
    }

    emit MultipleValuesEncrypted(_values.length);
  }

  /**
   * @notice User encrypts their personal data
   * @param _value User's plaintext value
   * @param _inputProof Input proof for encryption
   * @dev Shows per-user encrypted storage
   */
  function encryptUserData(uint32 _value, bytes calldata _inputProof) external {
    require(_inputProof.length > 0, "Input proof required");

    bytes32 encrypted = keccak256(abi.encodePacked(
      _value,
      _inputProof,
      block.timestamp,
      msg.sender
    ));

    userEncryptedData[msg.sender] = encrypted;

    emit UserDataEncrypted(msg.sender, encrypted);
  }

  /**
   * @notice User encrypts multiple data points
   * @param _values Array of plaintext values
   * @param _inputProofs Array of input proofs
   * @dev Batch encryption for single user
   */
  function encryptUserMultipleData(
    uint32[] calldata _values,
    bytes[] calldata _inputProofs
  ) external {
    require(_values.length == _inputProofs.length, "Length mismatch");
    require(_values.length > 0 && _values.length <= 10, "Invalid array length");

    delete userMultipleData[msg.sender];

    for (uint256 i = 0; i < _values.length; i++) {
      require(_inputProofs[i].length > 0, "Input proof required");

      bytes32 encrypted = keccak256(abi.encodePacked(
        _values[i],
        _inputProofs[i],
        block.timestamp,
        msg.sender,
        i
      ));

      userMultipleData[msg.sender].push(encrypted);
    }

    emit MultipleValuesEncrypted(_values.length);
  }

  /**
   * @notice Encrypt boolean value
   * @param _value Boolean to encrypt
   * @param _inputProof Input proof
   * @return Encrypted boolean
   * @dev Demonstrates ebool encryption
   */
  function encryptBoolean(bool _value, bytes calldata _inputProof) external pure returns (bytes32) {
    require(_inputProof.length > 0, "Input proof required");

    // In real FHEVM: ebool encrypted = FHE.fromExternal(externalEbool, _inputProof);
    return keccak256(abi.encodePacked(_value, _inputProof, "ebool"));
  }

  /**
   * @notice Encrypt different sized integers
   * @param _value8 8-bit unsigned integer
   * @param _value16 16-bit unsigned integer
   * @param _value32 32-bit unsigned integer
   * @param _value64 64-bit unsigned integer
   * @param _inputProof Input proof for all values
   * @return Four encrypted values
   * @dev Demonstrates different euint types
   */
  function encryptDifferentTypes(
    uint8 _value8,
    uint16 _value16,
    uint32 _value32,
    uint64 _value64,
    bytes calldata _inputProof
  ) external pure returns (bytes32, bytes32, bytes32, bytes32) {
    require(_inputProof.length > 0, "Input proof required");

    // In real FHEVM:
    // euint8 enc8 = FHE.fromExternal(externalEuint8, _inputProof);
    // euint16 enc16 = FHE.fromExternal(externalEuint16, _inputProof);
    // euint32 enc32 = FHE.fromExternal(externalEuint32, _inputProof);
    // euint64 enc64 = FHE.fromExternal(externalEuint64, _inputProof);

    return (
      keccak256(abi.encodePacked(_value8, _inputProof, "euint8")),
      keccak256(abi.encodePacked(_value16, _inputProof, "euint16")),
      keccak256(abi.encodePacked(_value32, _inputProof, "euint32")),
      keccak256(abi.encodePacked(_value64, _inputProof, "euint64"))
    );
  }

  /**
   * @notice Encrypt address value
   * @param _address Address to encrypt
   * @param _inputProof Input proof
   * @return Encrypted address
   * @dev Demonstrates eaddress encryption
   */
  function encryptAddress(address _address, bytes calldata _inputProof) external pure returns (bytes32) {
    require(_inputProof.length > 0, "Input proof required");
    require(_address != address(0), "Invalid address");

    // In real FHEVM: eaddress encrypted = FHE.fromExternal(externalEaddress, _inputProof);
    return keccak256(abi.encodePacked(_address, _inputProof, "eaddress"));
  }

  /**
   * @notice Get single encrypted value
   * @return The encrypted value
   */
  function getSingleEncryptedValue() external view returns (bytes32) {
    return singleEncryptedValue;
  }

  /**
   * @notice Get all encrypted values
   * @return Array of encrypted values
   */
  function getAllEncryptedValues() external view returns (bytes32[] memory) {
    return multipleEncryptedValues;
  }

  /**
   * @notice Get user's encrypted data
   * @param _user User address
   * @return User's encrypted value
   */
  function getUserEncryptedData(address _user) external view returns (bytes32) {
    return userEncryptedData[_user];
  }

  /**
   * @notice Get count of user's encrypted data points
   * @param _user User address
   * @return Count of encrypted values
   */
  function getUserDataCount(address _user) external view returns (uint256) {
    return userMultipleData[_user].length;
  }

  /**
   * @notice Get all of user's encrypted data
   * @param _user User address
   * @return Array of user's encrypted values
   */
  function getUserAllData(address _user) external view returns (bytes32[] memory) {
    return userMultipleData[_user];
  }

  /**
   * @notice ANTI-PATTERN: Encryption without input proof
   * @param _value Value to "encrypt"
   * @dev This is WRONG - always require input proof for security
   */
  function antiPatternNoInputProof(uint32 _value) external pure returns (bytes32) {
    // ❌ WRONG: No input proof validation
    // This is insecure and will fail in real FHEVM
    return keccak256(abi.encodePacked(_value));
  }

  /**
   * @notice ANTI-PATTERN: Reusing input proofs
   * @dev This is WRONG - each encryption needs unique input proof
   */
  function antiPatternReuseProof(
    uint32 _value1,
    uint32 _value2,
    bytes calldata _inputProof
  ) external pure returns (bytes32, bytes32) {
    // ❌ WRONG: Using same input proof for multiple values
    // Each value needs its own proof
    return (
      keccak256(abi.encodePacked(_value1, _inputProof)),
      keccak256(abi.encodePacked(_value2, _inputProof))
    );
  }

  /**
   * @notice CORRECT PATTERN: Proper encryption with validation
   * @param _value Value to encrypt
   * @param _inputProof Input proof
   * @return Encrypted value
   */
  function correctEncryptionPattern(
    uint32 _value,
    bytes calldata _inputProof
  ) external view returns (bytes32) {
    // ✅ CORRECT: Validate input proof
    require(_inputProof.length > 0, "Input proof required");

    // ✅ CORRECT: Include all necessary entropy
    return keccak256(abi.encodePacked(
      _value,
      _inputProof,
      block.timestamp,
      msg.sender
    ));
  }
}
