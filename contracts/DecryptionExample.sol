// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title Decryption Example
 * @notice Demonstrates user decryption and public decryption patterns
 * @dev Shows different decryption scenarios and access patterns
 *
 * Key Concepts:
 * - User Decryption: Only specific user can decrypt their data
 * - Public Decryption: Anyone can decrypt after event triggers
 * - Batch Decryption: Decrypt multiple values efficiently
 * - Conditional Decryption: Decrypt based on conditions
 */
contract DecryptionExample {
  struct EncryptedData {
    bytes32 encryptedValue;
    address owner;
    bool isPubliclyDecryptable;
    uint256 timestamp;
  }

  /// @notice Storage for encrypted data
  mapping(uint256 => EncryptedData) public encryptedDataStore;

  /// @notice Counter for data IDs
  uint256 public nextDataId;

  /// @notice Decryption requests for public decryption
  mapping(uint256 => bool) public decryptionRequested;

  event DataEncrypted(uint256 indexed dataId, address indexed owner);
  event UserDecryptionRequested(uint256 indexed dataId, address indexed user);
  event PublicDecryptionEnabled(uint256 indexed dataId);
  event DecryptionCompleted(uint256 indexed dataId, uint256 decryptedValue);

  /**
   * @notice Store encrypted data for user-only decryption
   * @param _encryptedValue The encrypted value
   * @return dataId The ID of stored data
   * @dev Only data owner can decrypt
   */
  function storeUserDecryptableData(bytes32 _encryptedValue) external returns (uint256) {
    uint256 dataId = nextDataId++;

    encryptedDataStore[dataId] = EncryptedData({
      encryptedValue: _encryptedValue,
      owner: msg.sender,
      isPubliclyDecryptable: false,
      timestamp: block.timestamp
    });

    emit DataEncrypted(dataId, msg.sender);
    return dataId;
  }

  /**
   * @notice Store encrypted data that will be publicly decryptable later
   * @param _encryptedValue The encrypted value
   * @return dataId The ID of stored data
   * @dev Can be made public by owner
   */
  function storePublicDecryptableData(bytes32 _encryptedValue) external returns (uint256) {
    uint256 dataId = nextDataId++;

    encryptedDataStore[dataId] = EncryptedData({
      encryptedValue: _encryptedValue,
      owner: msg.sender,
      isPubliclyDecryptable: true,
      timestamp: block.timestamp
    });

    emit DataEncrypted(dataId, msg.sender);
    return dataId;
  }

  /**
   * @notice User requests to decrypt their own data
   * @param _dataId ID of encrypted data
   * @return Simulated decrypted value
   * @dev Demonstrates user-only decryption
   *
   * In real FHEVM:
   * - Use FHE.decrypt(encryptedValue) on client side
   * - Or request decryption proof from oracle
   */
  function requestUserDecryption(uint256 _dataId) external view returns (bytes32) {
    require(_dataId < nextDataId, "Invalid data ID");
    EncryptedData memory data = encryptedDataStore[_dataId];

    // Only owner can decrypt their data
    require(msg.sender == data.owner, "Only owner can decrypt");

    // In real FHEVM: This would trigger client-side decryption
    // The encrypted value would be sent to user's client
    // User provides decryption key, gets plaintext
    return data.encryptedValue;
  }

  /**
   * @notice Request decryption of multiple user data points
   * @param _dataIds Array of data IDs to decrypt
   * @return Array of encrypted values for user decryption
   * @dev Batch user decryption pattern
   */
  function requestBatchUserDecryption(
    uint256[] calldata _dataIds
  ) external view returns (bytes32[] memory) {
    bytes32[] memory results = new bytes32[](_dataIds.length);

    for (uint256 i = 0; i < _dataIds.length; i++) {
      require(_dataIds[i] < nextDataId, "Invalid data ID");
      EncryptedData memory data = encryptedDataStore[_dataIds[i]];

      require(msg.sender == data.owner, "Only owner can decrypt");
      results[i] = data.encryptedValue;
    }

    return results;
  }

  /**
   * @notice Enable public decryption for a data point
   * @param _dataId ID of data to make publicly decryptable
   * @dev Owner can trigger public reveal
   */
  function enablePublicDecryption(uint256 _dataId) external {
    require(_dataId < nextDataId, "Invalid data ID");
    EncryptedData storage data = encryptedDataStore[_dataId];

    require(msg.sender == data.owner, "Only owner");
    require(data.isPubliclyDecryptable, "Not marked for public decryption");

    decryptionRequested[_dataId] = true;

    emit PublicDecryptionEnabled(_dataId);
  }

  /**
   * @notice Request public decryption (anyone can call after enabled)
   * @param _dataId ID of data to decrypt
   * @return Encrypted value (to be decrypted publicly)
   * @dev Demonstrates public decryption pattern
   *
   * In real FHEVM:
   * - This would trigger decryption oracle
   * - Oracle performs decryption and posts result on-chain
   * - Result becomes publicly visible
   */
  function requestPublicDecryption(uint256 _dataId) external view returns (bytes32) {
    require(_dataId < nextDataId, "Invalid data ID");
    require(decryptionRequested[_dataId], "Public decryption not enabled");

    EncryptedData memory data = encryptedDataStore[_dataId];
    return data.encryptedValue;
  }

  /**
   * @notice Simulate oracle callback with decrypted value
   * @param _dataId ID of data that was decrypted
   * @param _decryptedValue The decrypted plaintext value
   * @dev In real FHEVM, this would be called by decryption oracle
   */
  function oracleDecryptionCallback(
    uint256 _dataId,
    uint256 _decryptedValue
  ) external {
    require(_dataId < nextDataId, "Invalid data ID");
    require(decryptionRequested[_dataId], "Decryption not requested");

    // In real FHEVM: Verify oracle signature
    // require(msg.sender == ORACLE_ADDRESS, "Only oracle");

    emit DecryptionCompleted(_dataId, _decryptedValue);
  }

  /**
   * @notice Conditional decryption based on time
   * @param _dataId ID of data
   * @param _revealTime Timestamp when data can be decrypted
   * @return Whether decryption is allowed
   * @dev Time-locked decryption pattern
   */
  function canDecryptAfterTime(
    uint256 _dataId,
    uint256 _revealTime
  ) external view returns (bool) {
    require(_dataId < nextDataId, "Invalid data ID");
    return block.timestamp >= _revealTime;
  }

  /**
   * @notice Decrypt multiple values publicly (batch)
   * @param _dataIds Array of data IDs
   * @return Array of encrypted values for public decryption
   * @dev Efficient batch public decryption
   */
  function requestBatchPublicDecryption(
    uint256[] calldata _dataIds
  ) external view returns (bytes32[] memory) {
    bytes32[] memory results = new bytes32[](_dataIds.length);

    for (uint256 i = 0; i < _dataIds.length; i++) {
      require(_dataIds[i] < nextDataId, "Invalid data ID");
      require(decryptionRequested[_dataIds[i]], "Not enabled");

      results[i] = encryptedDataStore[_dataIds[i]].encryptedValue;
    }

    return results;
  }

  /**
   * @notice Get encrypted data info
   * @param _dataId ID of data
   * @return Data structure with metadata
   */
  function getDataInfo(uint256 _dataId) external view returns (EncryptedData memory) {
    require(_dataId < nextDataId, "Invalid data ID");
    return encryptedDataStore[_dataId];
  }

  /**
   * @notice Check if data is user-decryptable by caller
   * @param _dataId ID of data
   * @return True if caller can decrypt
   */
  function canUserDecrypt(uint256 _dataId) external view returns (bool) {
    if (_dataId >= nextDataId) return false;
    return encryptedDataStore[_dataId].owner == msg.sender;
  }

  /**
   * @notice Check if data is publicly decryptable
   * @param _dataId ID of data
   * @return True if anyone can request decryption
   */
  function isPubliclyDecryptable(uint256 _dataId) external view returns (bool) {
    if (_dataId >= nextDataId) return false;
    return decryptionRequested[_dataId];
  }

  /**
   * @notice ANTI-PATTERN: Attempting to decrypt in view function
   * @dev This is WRONG - decryption requires transaction
   */
  function antiPatternDecryptInView(uint256 _dataId) external view returns (uint256) {
    // ❌ WRONG: Cannot actually decrypt in view function
    // Decryption requires off-chain computation or oracle
    bytes32 encrypted = encryptedDataStore[_dataId].encryptedValue;
    return uint256(encrypted); // This returns encrypted, not plaintext!
  }

  /**
   * @notice ANTI-PATTERN: Exposing decrypted value on-chain without permission
   * @dev This is WRONG - violates privacy
   */
  function antiPatternPublicDecryptedStorage(
    uint256 _dataId,
    uint256 _decryptedValue
  ) external {
    // ❌ WRONG: Storing decrypted value on-chain makes it public
    // This defeats the purpose of FHE
    // Only store decrypted values if explicitly intended to be public
  }

  /**
   * @notice CORRECT PATTERN: Request decryption with proper access control
   * @param _dataId ID of data
   * @return Encrypted value for off-chain decryption
   */
  function correctDecryptionPattern(uint256 _dataId) external view returns (bytes32) {
    require(_dataId < nextDataId, "Invalid data ID");
    EncryptedData memory data = encryptedDataStore[_dataId];

    // ✅ CORRECT: Check permissions
    require(
      msg.sender == data.owner || decryptionRequested[_dataId],
      "Access denied"
    );

    // ✅ CORRECT: Return encrypted value for off-chain decryption
    // User will decrypt client-side with their key
    return data.encryptedValue;
  }

  /**
   * @notice Example: Conditional public reveal based on event
   * @param _dataId ID of data
   * @param _condition Boolean condition that must be true
   * @dev Shows conditional decryption pattern
   */
  function conditionalPublicReveal(
    uint256 _dataId,
    bool _condition
  ) external {
    require(_dataId < nextDataId, "Invalid data ID");
    EncryptedData storage data = encryptedDataStore[_dataId];

    require(msg.sender == data.owner, "Only owner");
    require(_condition, "Condition not met");
    require(data.isPubliclyDecryptable, "Not marked for public decryption");

    decryptionRequested[_dataId] = true;
    emit PublicDecryptionEnabled(_dataId);
  }
}
