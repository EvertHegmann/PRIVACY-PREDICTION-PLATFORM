# Access Control Patterns for FHE

Demonstrates FHE.allow and FHE.allowThis patterns for managing permissions on encrypted data.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

## Overview

Access control in FHE is fundamentally different from traditional smart contracts:

- **FHE.allowThis()** - Grants contract permission to use encrypted values
- **FHE.allow()** - Shares encrypted data with specific addresses
- **FHE.allowTransient()** - Temporary single-transaction permissions

## Key Concepts

### 1. The Permission Model

In traditional Solidity:
```solidity
// "private" keyword prevents external access
uint256 private _value;

// But data is still visible on blockchain
```

In FHE:
```solidity
// Data is encrypted - truly private
bytes32 private _encryptedValue;

// Explicit permissions required for any operation
// FHE.allowThis(_encryptedValue)     → Contract can use
// FHE.allow(_encryptedValue, address) → User can decrypt
```

### 2. Handle Lifecycle

Each FHE operation creates a new handle:

```solidity
euint32 input = FHE.fromExternal(userInput, proof);
// Handle 1: user input

euint32 result = FHE.add(input, FHE.asEuint32(10));
// Handle 2: new result handle

FHE.allowThis(result);      // Contract can use Handle 2
FHE.allow(result, user);    // User can decrypt Handle 2
```

### 3. Permission Requirements

**For Contract:**
```solidity
// Without permission: FAILS
bytes32 value = userEncryptedData;
bytes32 result = FHE.add(value, otherValue);  // ❌ No permission!

// With permission: SUCCESS
FHE.allowThis(userEncryptedData);
bytes32 result = FHE.add(userEncryptedData, otherValue);  // ✅ OK
```

**For Users:**
```solidity
// User cannot decrypt without permission
bytes32 result = performFHEOperation(...);
// User has no way to decrypt result!

// Grant permission for decryption
FHE.allow(result, userAddress);
// User can now decrypt result
```

## Contract Implementation

{% tabs %}

{% tab title="AccessControlExample.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title Access Control Example for FHE
 * @notice Demonstrates FHE.allow and FHE.allowThis patterns
 */
contract AccessControlExample {
  mapping(address => bytes32) private _encryptedBalances;
  mapping(address => mapping(bytes32 => mapping(address => bool))) private _permissions;

  address public owner;

  event BalanceSet(address indexed user, bytes32 encryptedValue);
  event PermissionGranted(address indexed owner, bytes32 indexed value, address indexed grantee);

  modifier onlyOwner() {
    require(msg.sender == owner, "Only owner");
    _;
  }

  constructor() {
    owner = msg.sender;
  }

  /**
   * @notice Set encrypted balance (FHE.allowThis pattern)
   * @param _encryptedBalance The encrypted balance value
   */
  function setBalance(bytes32 _encryptedBalance) external {
    // In real FHEVM: FHE.allowThis(_encryptedBalance)
    // This grants contract permission to store and use the value

    _encryptedBalances[msg.sender] = _encryptedBalance;
    _permissions[msg.sender][_encryptedBalance][msg.sender] = true;

    emit BalanceSet(msg.sender, _encryptedBalance);
  }

  /**
   * @notice Grant permission to decrypt (FHE.allow pattern)
   * @param _recipient Address to grant permission to
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
   * @notice Get user's encrypted balance with permission check
   * @param _user Address of user
   * @return The encrypted balance (if caller has permission)
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
   * @param _accessor Address to check
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
   * @notice Batch grant access to multiple users (efficient)
   * @param _recipients Array of addresses to grant permission to
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
   * @notice Transfer encrypted balance to another user
   * @param _to Recipient address
   * @param _encryptedAmount Encrypted amount to transfer
   *
   * Demonstrates proper permission management in operations:
   * 1. FHE.allowThis() - Grant contract permission on inputs
   * 2. Perform FHE operations
   * 3. FHE.allow() - Grant users permission on results
   */
  function transfer(address _to, bytes32 _encryptedAmount) external {
    require(_to != address(0), "Invalid recipient");
    require(_encryptedBalances[msg.sender] != bytes32(0), "No balance");

    // Step 1: Contract needs permission on inputs
    // FHE.allowThis(_encryptedBalances[msg.sender]);
    // FHE.allowThis(_encryptedAmount);

    // Step 2: Perform operations
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

    // Step 3: Grant users permission on results
    // FHE.allow(newSenderBalance, msg.sender);
    _permissions[msg.sender][newSenderBalance][msg.sender] = true;

    // FHE.allow(newRecipientBalance, _to);
    _permissions[_to][newRecipientBalance][_to] = true;
  }
}
```

{% endtab %}

{% tab title="AccessControlExample.ts" %}

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { AccessControlExample } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Test suite for Access Control Patterns
 *
 * Demonstrates:
 * - FHE.allowThis() pattern
 * - FHE.allow() pattern
 * - Permission checking
 * - Batch operations
 */

describe("Access Control Example", function () {
  let accessControl: AccessControlExample;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  const encryptedBalance = ethers.zeroPadValue("0x1234567890", 32);

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AccessControlExample");
    accessControl = await Factory.deploy();
    await accessControl.waitForDeployment();
  });

  describe("FHE.allowThis() Pattern", function () {
    // ✅ Test: Store encrypted value (contract gets permission)
    it("Should allow user to set encrypted balance", async function () {
      await expect(
        accessControl.connect(user1).setBalance(encryptedBalance)
      ).to.emit(accessControl, "BalanceSet").withArgs(user1.address, encryptedBalance);
    });

    // ✅ Test: Contract can use the value afterward
    it("Contract should be able to use balance after setBalance", async function () {
      await accessControl.connect(user1).setBalance(encryptedBalance);
      // If FHE.allowThis() worked correctly, contract can now operate on it

      const encryptedAmount = ethers.zeroPadValue("0x500", 32);
      await expect(
        accessControl.connect(user1).transfer(user2.address, encryptedAmount)
      ).to.not.be.reverted;
    });
  });

  describe("FHE.allow() Pattern", function () {
    beforeEach(async function () {
      await accessControl.connect(user1).setBalance(encryptedBalance);
    });

    // ✅ Test: Grant permission to another user
    it("Should grant access to another user", async function () {
      await expect(
        accessControl.connect(user1).grantAccess(user2.address)
      ).to.emit(accessControl, "PermissionGranted");
    });

    // ✅ Test: User can only access with permission
    it("User without permission cannot access", async function () {
      await expect(
        accessControl.connect(user2).getBalance(user1.address)
      ).to.be.revertedWith("Access denied");
    });

    // ✅ Test: User with permission can access
    it("User with permission can access", async function () {
      await accessControl.connect(user1).grantAccess(user2.address);

      const balance = await accessControl.connect(user2).getBalance(user1.address);
      expect(balance).to.equal(encryptedBalance);
    });

    // ✅ Test: Owner always has permission
    it("Owner always has permission to access any balance", async function () {
      const balance = await accessControl.connect(owner).getBalance(user1.address);
      expect(balance).to.equal(encryptedBalance);
    });

    // ✅ Test: User can access own balance
    it("User can always access own balance", async function () {
      const balance = await accessControl.connect(user1).getBalance(user1.address);
      expect(balance).to.equal(encryptedBalance);
    });
  });

  describe("Permission Management", function () {
    beforeEach(async function () {
      await accessControl.connect(user1).setBalance(encryptedBalance);
    });

    // ✅ Test: Check permissions
    it("Should correctly report permission status", async function () {
      expect(
        await accessControl.hasPermission(user1.address, user1.address)
      ).to.be.true;

      expect(
        await accessControl.hasPermission(user1.address, user2.address)
      ).to.be.false;

      await accessControl.connect(user1).grantAccess(user2.address);

      expect(
        await accessControl.hasPermission(user1.address, user2.address)
      ).to.be.true;
    });

    // ✅ Test: Revoke permission
    it("Should track revoked permissions", async function () {
      await accessControl.connect(user1).grantAccess(user2.address);
      expect(
        await accessControl.hasPermission(user1.address, user2.address)
      ).to.be.true;
    });

    // ❌ Test: Cannot grant to zero address
    it("Should prevent granting permission to zero address", async function () {
      await expect(
        accessControl.connect(user1).grantAccess(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid recipient");
    });
  });

  describe("Batch Operations (Efficiency)", function () {
    beforeEach(async function () {
      await accessControl.connect(user1).setBalance(encryptedBalance);
    });

    // ✅ Test: Batch grant to multiple users
    it("Should batch grant access to multiple users", async function () {
      await accessControl.connect(user1).batchGrantAccess([
        user2.address,
        user3.address
      ]);

      expect(
        await accessControl.hasPermission(user1.address, user2.address)
      ).to.be.true;

      expect(
        await accessControl.hasPermission(user1.address, user3.address)
      ).to.be.true;
    });

    // ✅ Test: All users can access after batch grant
    it("All batch-granted users can access", async function () {
      await accessControl.connect(user1).batchGrantAccess([
        user2.address,
        user3.address
      ]);

      const balance2 = await accessControl.connect(user2).getBalance(user1.address);
      const balance3 = await accessControl.connect(user3).getBalance(user1.address);

      expect(balance2).to.equal(encryptedBalance);
      expect(balance3).to.equal(encryptedBalance);
    });

    // ✅ Test: Batch with large number of recipients
    it("Should handle large batch grants", async function () {
      const signers = await ethers.getSigners();
      const recipients = signers.slice(1, 6).map(s => s.address);

      await expect(
        accessControl.connect(user1).batchGrantAccess(recipients)
      ).to.not.be.reverted;
    });
  });

  describe("Transfer with Permission Management", function () {
    beforeEach(async function () {
      await accessControl.connect(user1).setBalance(encryptedBalance);
    });

    // ✅ Test: Transfer with permissions
    it("Should transfer and grant permissions", async function () {
      const encryptedAmount = ethers.zeroPadValue("0x500", 32);

      await expect(
        accessControl.connect(user1).transfer(user2.address, encryptedAmount)
      ).to.not.be.reverted;

      // Both users should now have permissions on their balances
      expect(
        await accessControl.hasPermission(user1.address, user1.address)
      ).to.be.true;

      expect(
        await accessControl.hasPermission(user2.address, user2.address)
      ).to.be.true;
    });

    // ✅ Test: Users can access their transferred balance
    it("Recipient can access transferred balance", async function () {
      const encryptedAmount = ethers.zeroPadValue("0x500", 32);

      await accessControl.connect(user1).transfer(user2.address, encryptedAmount);

      // user2 should have permission to read their new balance
      const balance = await accessControl.connect(user2).getBalance(user2.address);
      expect(balance).to.not.equal(ethers.ZeroHash);
    });
  });

  describe("Best Practices", function () {
    // ✅ Test: Permission chain
    it("Should demonstrate permission delegation", async function () {
      await accessControl.connect(user1).setBalance(encryptedBalance);

      // user1 grants to user2
      await accessControl.connect(user1).grantAccess(user2.address);

      // user2 can now access
      await expect(
        accessControl.connect(user2).getBalance(user1.address)
      ).to.not.be.reverted;

      // user3 cannot access (no permission)
      await expect(
        accessControl.connect(user3).getBalance(user1.address)
      ).to.be.revertedWith("Access denied");
    });

    // ✅ Test: Permission granularity
    it("Should enforce per-value permissions (not per-user)", async function () {
      await accessControl.connect(user1).setBalance(encryptedBalance);
      const balance2 = ethers.zeroPadValue("0x9999", 32);
      await accessControl.connect(user1).setBalance(balance2);

      // Grant permission to user2 for latest balance
      await accessControl.connect(user1).grantAccess(user2.address);

      // user2 should have access (to latest value)
      await expect(
        accessControl.connect(user2).getBalance(user1.address)
      ).to.not.be.reverted;
    });
  });
});
```

{% endtab %}

{% endtabs %}

## Pattern Breakdown

### Pattern 1: FHE.allowThis()

**What It Does:**
Grants the contract itself permission to operate on an encrypted value.

**When to Use:**
Before performing any FHE operation on a value (add, subtract, multiply, etc.)

**Code Pattern:**
```solidity
function processEncrypted(bytes32 _encrypted) external {
  // ✅ CORRECT: Grant contract permission
  FHE.allowThis(_encrypted);

  // Now contract can use _encrypted
  bytes32 result = FHE.add(_encrypted, FHE.asEuint32(10));
}
```

**Common Mistake:**
```solidity
function processEncrypted(bytes32 _encrypted) external {
  // ❌ WRONG: No FHE.allowThis()
  bytes32 result = FHE.add(_encrypted, FHE.asEuint32(10)); // FAILS!
}
```

### Pattern 2: FHE.allow()

**What It Does:**
Grants a specific user permission to decrypt a value.

**When to Use:**
After creating a new encrypted value that a user should be able to decrypt.

**Code Pattern:**
```solidity
function createSecretValue(uint256 _value) external returns (bytes32) {
  // Create encrypted value
  bytes32 encrypted = FHE.asEuint32(uint32(_value));

  // ✅ CORRECT: Grant user permission to decrypt
  FHE.allow(encrypted, msg.sender);

  return encrypted;
}
```

**Common Mistake:**
```solidity
function createSecretValue(uint256 _value) external returns (bytes32) {
  // ❌ WRONG: User cannot decrypt without permission
  bytes32 encrypted = FHE.asEuint32(uint32(_value));
  return encrypted; // User has no way to decrypt!
}
```

### Pattern 3: FHE.allowTransient() (Temporary Permissions)

**What It Does:**
Grants temporary, single-transaction permission.

**When to Use:**
For one-time decryption operations that should not persist.

**Code Pattern:**
```solidity
function temporaryDecrypt(bytes32 _encrypted) external view returns (bytes32) {
  // ✅ CORRECT: Temporary permission for this call only
  FHE.allowTransient(_encrypted, msg.sender);

  // Can decrypt in this transaction
  return _encrypted;
}
```

## Permission Hierarchy

```
┌─────────────────────────────────────┐
│      Contract Owner                 │
│  (Full access to all operations)    │
└──────────────────┬──────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
    Contract  User With    Regular
    (via      Explicit     Users
   FHE.      Permissions  (No access)
   allowThis) (FHE.allow)
```

## Common Workflows

### Workflow 1: Encrypt and Share

```solidity
function setPrivateData(bytes32 _encrypted) external {
  // 1. Store encrypted
  userEncryption[msg.sender] = _encrypted;

  // 2. Grant self permission (FHE.allowThis)
  FHE.allowThis(_encrypted);
}

function grantReadAccess(address _friend) external {
  // 3. Share with friend (FHE.allow)
  FHE.allow(userEncryption[msg.sender], _friend);
}
```

### Workflow 2: Compute on Encrypted Data

```solidity
function computeSum(bytes32 _a, bytes32 _b) external {
  // 1. Contract needs permission on inputs
  FHE.allowThis(_a);
  FHE.allowThis(_b);

  // 2. Perform computation
  bytes32 sum = FHE.add(_a, _b);

  // 3. Grant user permission on result
  FHE.allow(sum, msg.sender);

  // 4. Store result
  results[msg.sender] = sum;
}
```

### Workflow 3: Batch Operations

```solidity
function batchCompute(bytes32[] calldata _values) external {
  // 1. Grant permission on all inputs
  for (uint i = 0; i < _values.length; i++) {
    FHE.allowThis(_values[i]);
  }

  // 2. Perform batch operations
  bytes32 accumulator = FHE.asEuint32(0);
  for (uint i = 0; i < _values.length; i++) {
    accumulator = FHE.add(accumulator, _values[i]);
  }

  // 3. Grant permission on result
  FHE.allow(accumulator, msg.sender);
}
```

## Best Practices

### ✅ DO

- ✅ Always call `FHE.allowThis()` before operating on encrypted values
- ✅ Always call `FHE.allow()` after creating new encrypted values
- ✅ Implement permission checks in view functions
- ✅ Use batch grants for multiple users (gas efficient)
- ✅ Document which functions require permissions
- ✅ Track handle lifecycle (new handles after each operation)

### ❌ DON'T

- ❌ Forget to call `FHE.allowThis()` (operations will fail)
- ❌ Forget to call `FHE.allow()` (users cannot decrypt)
- ❌ Store decrypted values on-chain (defeats privacy)
- ❌ Mix permission patterns inconsistently
- ❌ Use encrypted values without checking permissions first
- ❌ Expose decrypted values in logs or events

## Gas Optimization

### Inefficient: Individual grants
```solidity
function grantManyAccess(address[] calldata _users) external {
  for (uint i = 0; i < _users.length; i++) {
    FHE.allow(myValue, _users[i]); // Multiple calls
  }
}
```

### Efficient: Batch grants
```solidity
function batchGrant(address[] calldata _users) external {
  // In real FHEVM: FHE.allowBatch(myValue, _users);
  // Single operation for all users
}
```

## Troubleshooting

### Error: "Permission Denied"

**Cause:** Used encrypted value without `FHE.allowThis()`

**Solution:**
```solidity
// ❌ Fails
result = FHE.add(encrypted, other);

// ✅ Works
FHE.allowThis(encrypted);
result = FHE.add(encrypted, other);
```

### Error: "Cannot Decrypt"

**Cause:** User doesn't have permission to decrypt

**Solution:**
```solidity
// After operation, grant user permission
bytes32 newValue = performOperation(...);
FHE.allow(newValue, userAddress);
```

### Error: "Handle Expired"

**Cause:** Using old handle after operation created new one

**Solution:**
```solidity
// ✅ Correct: Use result, not input
euint32 input = originalValue;
euint32 result = FHE.add(input, FHE.asEuint32(10));

// Use 'result' for further operations, not 'input'
return FHE.sub(result, FHE.asEuint32(5)); // Correct
```

## Next Steps

1. Review [Anti-Patterns](anti-patterns.md) for common mistakes
2. Check [Encryption Examples](encryption-single.md) for encryption patterns
3. See [FHE Counter](fhe-counter.md) for basic operations
4. Explore [Privacy Prediction Platform](privacy-prediction-basic.md) for real-world patterns
