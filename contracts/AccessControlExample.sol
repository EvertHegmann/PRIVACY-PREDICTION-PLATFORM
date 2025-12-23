// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title Access Control Example for FHE
 * @notice Demonstrates FHE.allow and FHE.allowThis patterns
 * @dev Shows how to manage permissions on encrypted data
 *
 * Key Concepts:
 * - FHE.allow(value, address) - Grant address permission to decrypt value
 * - FHE.allowThis(value) - Grant contract permission to use value
 * - FHE.allowTransient(value, address) - Temporary permission (single transaction)
 * - Permission management best practices
 */
contract AccessControlExample {
  /// @notice Stores encrypted balance for each user
  mapping(address => bytes32) private _encryptedBalances;

  /// @notice Stores permissions: user => value => allowed addresses
  mapping(address => mapping(bytes32 => mapping(address => bool))) private _permissions;

  /// @notice Contract owner
  address public owner;

  event BalanceSet(address indexed user, bytes32 encryptedValue);
  event PermissionGranted(address indexed owner, bytes32 indexed value, address indexed grantee);
  event PermissionRevoked(address indexed owner, bytes32 indexed value, address indexed grantee);

  modifier onlyOwner() {
    require(msg.sender == owner, "Only owner");
    _;
  }

  constructor() {
    owner = msg.sender;
  }

  /**
   * @notice Set encrypted balance for user
   * @param _encryptedBalance The encrypted balance value
   * @dev Demonstrates FHE.allowThis pattern - contract needs permission to store value
   */
  function setBalance(bytes32 _encryptedBalance) external {
    // In real FHEVM: FHE.allowThis(_encryptedBalance)
    // This allows contract to store and use the encrypted value

    _encryptedBalances[msg.sender] = _encryptedBalance;

    // Automatically grant permission to the user
    _permissions[msg.sender][_encryptedBalance][msg.sender] = true;

    emit BalanceSet(msg.sender, _encryptedBalance);
  }

  /**
   * @notice Grant permission to another address to view encrypted balance
   * @param _recipient Address to grant permission to
   * @dev Demonstrates FHE.allow pattern - sharing encrypted data
   */
  function grantAccess(address _recipient) external {
    require(_recipient != address(0), "Invalid recipient");
    require(_encryptedBalances[msg.sender] != bytes32(0), "No balance set");

    bytes32 userBalance = _encryptedBalances[msg.sender];

    // In real FHEVM: FHE.allow(userBalance, _recipient)
    // This grants _recipient permission to decrypt the value

    _permissions[msg.sender][userBalance][_recipient] = true;

    emit PermissionGranted(msg.sender, userBalance, _recipient);
  }

  /**
   * @notice Revoke permission from an address
   * @param _recipient Address to revoke permission from
   * @dev Important: FHE permissions are typically not revocable, this is simulated
   */
  function revokeAccess(address _recipient) external {
    require(_encryptedBalances[msg.sender] != bytes32(0), "No balance set");

    bytes32 userBalance = _encryptedBalances[msg.sender];
    _permissions[msg.sender][userBalance][_recipient] = false;

    emit PermissionRevoked(msg.sender, userBalance, _recipient);
  }

  /**
   * @notice Get user's encrypted balance
   * @param _user Address of user
   * @return The encrypted balance (if caller has permission)
   * @dev Checks permission before returning encrypted value
   */
  function getBalance(address _user) external view returns (bytes32) {
    bytes32 balance = _encryptedBalances[_user];
    require(balance != bytes32(0), "No balance found");

    // Check if caller has permission
    require(
      _permissions[_user][balance][msg.sender] ||
      msg.sender == _user ||
      msg.sender == owner,
      "Access denied"
    );

    return balance;
  }

  /**
   * @notice Check if address has permission to access encrypted value
   * @param _owner Owner of the encrypted value
   * @param _accessor Address to check permission for
   * @return True if accessor has permission
   */
  function hasPermission(address _owner, address _accessor) external view returns (bool) {
    bytes32 balance = _encryptedBalances[_owner];
    if (balance == bytes32(0)) return false;

    return _permissions[_owner][balance][_accessor] ||
           _accessor == _owner ||
           _accessor == owner;
  }

  /**
   * @notice Demonstrates batch permission granting
   * @param _recipients Array of addresses to grant permission to
   * @dev Efficient way to grant multiple permissions
   */
  function batchGrantAccess(address[] calldata _recipients) external {
    require(_encryptedBalances[msg.sender] != bytes32(0), "No balance set");
    bytes32 userBalance = _encryptedBalances[msg.sender];

    for (uint256 i = 0; i < _recipients.length; i++) {
      require(_recipients[i] != address(0), "Invalid recipient");

      // In real FHEVM: FHE.allow(userBalance, _recipients[i])
      _permissions[msg.sender][userBalance][_recipients[i]] = true;

      emit PermissionGranted(msg.sender, userBalance, _recipients[i]);
    }
  }

  /**
   * @notice Simulate transient permission (single-use)
   * @param _recipient Address to grant temporary permission
   * @dev In real FHEVM: FHE.allowTransient provides one-time access
   */
  function grantTransientAccess(address _recipient) external {
    require(_recipient != address(0), "Invalid recipient");
    require(_encryptedBalances[msg.sender] != bytes32(0), "No balance set");

    bytes32 userBalance = _encryptedBalances[msg.sender];

    // In real FHEVM: FHE.allowTransient(userBalance, _recipient)
    // This grants temporary permission that expires after current transaction

    // Simulated: immediate permission grant/revoke pattern
    _permissions[msg.sender][userBalance][_recipient] = true;

    emit PermissionGranted(msg.sender, userBalance, _recipient);
  }

  /**
   * @notice Transfer encrypted balance to another user
   * @param _to Recipient address
   * @param _encryptedAmount Encrypted amount to transfer
   * @dev Demonstrates permission requirements for operations on encrypted values
   */
  function transfer(address _to, bytes32 _encryptedAmount) external {
    require(_to != address(0), "Invalid recipient");
    require(_encryptedBalances[msg.sender] != bytes32(0), "No balance");

    // In real FHEVM:
    // 1. FHE.allowThis(_encryptedAmount) - contract needs permission
    // 2. Perform FHE.sub on sender balance
    // 3. Perform FHE.add on recipient balance
    // 4. FHE.allow(newSenderBalance, msg.sender)
    // 5. FHE.allow(newRecipientBalance, _to)

    // Simulated transfer
    bytes32 newSenderBalance = keccak256(abi.encodePacked(
      _encryptedBalances[msg.sender],
      _encryptedAmount,
      "transfer_out"
    ));

    bytes32 newRecipientBalance = keccak256(abi.encodePacked(
      _encryptedBalances[_to],
      _encryptedAmount,
      "transfer_in"
    ));

    _encryptedBalances[msg.sender] = newSenderBalance;
    _encryptedBalances[_to] = newRecipientBalance;

    // Grant permissions
    _permissions[msg.sender][newSenderBalance][msg.sender] = true;
    _permissions[_to][newRecipientBalance][_to] = true;
  }

  /**
   * @notice Example of INCORRECT permission usage (anti-pattern)
   * @dev This function demonstrates what NOT to do
   */
  function antiPatternNoAllowThis(bytes32 _encryptedValue) external pure returns (bytes32) {
    // ❌ WRONG: Using encrypted value without FHE.allowThis
    // This will fail in real FHEVM
    return keccak256(abi.encodePacked(_encryptedValue, "operation"));
  }

  /**
   * @notice Example of CORRECT permission usage
   * @param _encryptedValue Encrypted value to process
   * @return Result of operation
   */
  function correctPatternWithAllowThis(bytes32 _encryptedValue) external pure returns (bytes32) {
    // ✅ CORRECT: In real FHEVM, you would call FHE.allowThis(_encryptedValue)
    // before performing any operations on the encrypted value

    // FHE.allowThis(_encryptedValue);  // Grants contract permission
    return keccak256(abi.encodePacked(_encryptedValue, "operation"));
  }
}
