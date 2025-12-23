# Anti-Patterns and Best Practices

Educational examples showing common mistakes with FHE and the correct alternatives for each pattern.

{% hint style="warning" %}
This contract intentionally contains anti-patterns for educational purposes.
**DO NOT use these patterns in production!**
{% endhint %}

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

## Overview

This guide demonstrates **10 common mistakes** when working with FHE and provides the correct alternative for each. Learning from these anti-patterns will save you debugging time and prevent security issues.

## Anti-Pattern #1: View Functions with FHE Operations

### ❌ WRONG

```solidity
function antiPattern1_ViewFunctionWithEncryption(
  bytes32 _encryptedA,
  bytes32 _encryptedB
) external pure returns (bytes32) {
  // ❌ Attempting FHE operation in view/pure function
  // In real FHEVM: euint32 result = FHE.add(_encryptedA, _encryptedB);
  // This will FAIL because view functions cannot perform FHE operations
  return keccak256(abi.encodePacked(_encryptedA, _encryptedB));
}
```

**Why it's wrong:**
- View functions cannot modify state or perform FHE operations
- FHE operations require transaction context
- Will always fail in real FHEVM

### ✅ CORRECT

```solidity
function correctPattern1_StatefulFHEOperation(
  bytes32 _encryptedA,
  bytes32 _encryptedB
) external returns (bytes32) {
  // ✅ FHE operations in state-changing function
  bytes32 result = keccak256(abi.encodePacked(_encryptedA, _encryptedB, "add"));
  encryptedValue = result;
  return result;
}
```

**Key Lesson:** Always use regular (state-changing) functions for FHE operations, never `view` or `pure`.

---

## Anti-Pattern #2: Missing FHE.allowThis()

### ❌ WRONG

```solidity
function antiPattern2_MissingAllowThis(bytes32 _encrypted) external {
  // ❌ No FHE.allowThis() call
  // In real FHEVM, this will fail:
  // euint32 value = _encrypted;
  // euint32 result = FHE.add(value, FHE.asEuint32(1)); // FAILS!

  encryptedValue = _encrypted; // Will fail in real FHEVM
}
```

**Why it's wrong:**
- Contract must be granted permission via `FHE.allowThis()`
- Without permission, cannot perform operations on encrypted data
- Will fail with "permission denied" error

### ✅ CORRECT

```solidity
function correctPattern2_WithAllowThis(bytes32 _encrypted) external {
  // ✅ Grant contract permission first
  // In real FHEVM: FHE.allowThis(_encrypted);

  // Now contract can use the encrypted value
  encryptedValue = _encrypted;
}
```

**Key Lesson:** Always call `FHE.allowThis()` before operating on any encrypted value.

---

## Anti-Pattern #3: Not Granting User Permissions

### ❌ WRONG

```solidity
function antiPattern3_NoUserPermission(address _user) external {
  // ❌ Missing FHE.allow(_user, encryptedValue)
  // User cannot decrypt this value!

  bytes32 newValue = keccak256(abi.encodePacked(encryptedValue, "operation"));
  userValues[_user] = newValue;
  // User has no way to decrypt newValue!
}
```

**Why it's wrong:**
- After FHE operations, new handles are created
- Users cannot decrypt new handles without explicit permission
- Must call `FHE.allow(result, user)` to grant access

### ✅ CORRECT

```solidity
function correctPattern3_WithUserPermission(address _user) external {
  bytes32 newValue = keccak256(abi.encodePacked(encryptedValue, "operation"));
  userValues[_user] = newValue;

  // ✅ Grant user permission to decrypt
  // In real FHEVM: FHE.allow(newValue, _user);
}
```

**Key Lesson:** After creating new encrypted values, grant permissions to users who need them.

---

## Anti-Pattern #4: No Access Control on Encrypted Data

### ❌ WRONG

```solidity
function antiPattern4_NoAccessControl(address _user) external view returns (bytes32) {
  // ❌ No check if caller should access this data
  return userValues[_user];
}
```

**Why it's wrong:**
- Even encrypted values should have access control
- Prevents unauthorized decryption attempts
- Protects user privacy

### ✅ CORRECT

```solidity
function correctPattern4_WithAccessControl(address _user) external view returns (bytes32) {
  // ✅ Check permissions
  require(
    msg.sender == _user || msg.sender == address(this),
    "Access denied"
  );
  return userValues[_user];
}
```

**Key Lesson:** Implement access control even for encrypted data.

---

## Anti-Pattern #5: Inefficient Multiple Operations

### ❌ WRONG

```solidity
function antiPattern5_InefficientOperations(
  bytes32 _a,
  bytes32 _b,
  bytes32 _c
) external pure returns (bytes32) {
  // ❌ Multiple unnecessary operations
  bytes32 temp1 = keccak256(abi.encodePacked(_a, _b));
  bytes32 temp2 = keccak256(abi.encodePacked(temp1, "add"));
  bytes32 temp3 = keccak256(abi.encodePacked(temp2, _c));
  bytes32 result = keccak256(abi.encodePacked(temp3, "final"));
  return result;
}
```

**Why it's wrong:**
- Each FHE operation is expensive
- Should minimize number of operations
- Combine operations when possible

### ✅ CORRECT

```solidity
function correctPattern5_EfficientOperations(
  bytes32 _a,
  bytes32 _b,
  bytes32 _c
) external pure returns (bytes32) {
  // ✅ Combine operations to reduce gas
  return keccak256(abi.encodePacked(_a, _b, _c, "combined"));
}
```

**Key Lesson:** Minimize FHE operations by combining them when possible.

---

## Anti-Pattern #6: Incorrect Handle Lifecycle

### ❌ WRONG

```solidity
function antiPattern6_IncorrectHandleLifecycle(bytes32 _encrypted) external {
  // ❌ Reusing old handle after operation
  bytes32 oldHandle = _encrypted;

  // Perform operation (creates NEW handle)
  bytes32 newHandle = keccak256(abi.encodePacked(oldHandle, "add"));

  // ❌ Still referencing oldHandle
  // In real FHEVM, oldHandle is now invalid for further operations
  encryptedValue = oldHandle; // Should use newHandle!
}
```

**Why it's wrong:**
- Each FHE operation creates new handle
- Old handles become invalid after operations
- Must track and update handle references

### ✅ CORRECT

```solidity
function correctPattern6_CorrectHandleLifecycle(bytes32 _encrypted) external {
  // ✅ Track handle updates
  bytes32 currentHandle = _encrypted;

  // Operation creates new handle
  currentHandle = keccak256(abi.encodePacked(currentHandle, "add"));

  // ✅ Use updated handle
  encryptedValue = currentHandle;
}
```

**Key Lesson:** Always use the latest handle after each operation.

---

## Anti-Pattern #7: Storing Decrypted Values On-Chain

### ❌ WRONG

```solidity
uint256 public decryptedValue; // ❌ Public decrypted value!

function antiPattern7_StoringDecryptedValue(uint256 _plaintext) external {
  // ❌ Storing plaintext on-chain
  decryptedValue = _plaintext;
  // Now everyone can see the value!
}
```

**Why it's wrong:**
- Decrypted values are public on blockchain
- Defeats entire purpose of FHE
- Privacy is lost permanently

### ✅ CORRECT

```solidity
function correctPattern7_KeepEncrypted(bytes32 _encrypted) external {
  // ✅ Store encrypted, decrypt off-chain
  encryptedValue = _encrypted;
  // Value remains private!
}
```

**Key Lesson:** Keep values encrypted on-chain; decrypt only off-chain or when explicitly needed for public reveal.

---

## Anti-Pattern #8: Missing Input Proof Validation

### ❌ WRONG

```solidity
function antiPattern8_NoInputProofValidation(bytes32 _encrypted) external {
  // ❌ No input proof check
  // In real FHEVM: Must use FHE.fromExternal(external, proof)
  encryptedValue = _encrypted;
}
```

**Why it's wrong:**
- Input proofs ensure data integrity
- Without validation, malicious inputs possible
- Security vulnerability

### ✅ CORRECT

```solidity
function correctPattern8_WithInputProofValidation(
  uint32 _value,
  bytes calldata _inputProof
) external {
  // ✅ Validate input proof
  require(_inputProof.length > 0, "Input proof required");

  // In real FHEVM: euint32 encrypted = FHE.fromExternal(external, _inputProof);
  encryptedValue = keccak256(abi.encodePacked(_value, _inputProof));
}
```

**Key Lesson:** Always validate input proofs for encrypted inputs.

---

## Anti-Pattern #9: Direct Boolean Comparison

### ❌ WRONG

```solidity
function antiPattern9_DirectBooleanComparison(
  bytes32 _a,
  bytes32 _b
) external pure returns (bool) {
  // ❌ Trying to get plaintext boolean from FHE comparison
  // In real FHEVM: This will not compile or will fail
  bytes32 encryptedResult = keccak256(abi.encodePacked(_a, _b, "eq"));
  // Cannot convert to bool!
  return uint256(encryptedResult) > 0; // Meaningless!
}
```

**Why it's wrong:**
- `FHE.eq()` returns `ebool`, not `bool`
- Cannot use in if statements directly
- Must use `FHE.select()` for conditional logic

### ✅ CORRECT

```solidity
function correctPattern9_UseSelect(
  bytes32 _a,
  bytes32 _b,
  bytes32 _ifTrue,
  bytes32 _ifFalse
) external pure returns (bytes32) {
  // ✅ Use FHE.select for conditional
  bytes32 condition = keccak256(abi.encodePacked(_a, _b, "eq"));

  // In real FHEVM: result = FHE.select(condition, _ifTrue, _ifFalse);
  return keccak256(abi.encodePacked(condition, _ifTrue, _ifFalse, "select"));
}
```

**Key Lesson:** Use `FHE.select()` for conditional logic with encrypted booleans.

---

## Anti-Pattern #10: Gas Inefficient Batch Operations

### ❌ WRONG

```solidity
function antiPattern10_InefficientBatch(
  bytes32[] calldata _values
) external returns (uint256) {
  uint256 count = 0;
  for (uint256 i = 0; i < _values.length; i++) {
    // ❌ Separate storage write for each
    userValues[msg.sender] = _values[i];
    count++;
  }
  return count;
}
```

**Why it's wrong:**
- FHE operations are expensive
- Should batch when possible
- Optimize for gas efficiency

### ✅ CORRECT

```solidity
function correctPattern10_EfficientBatch(
  bytes32[] calldata _values
) external returns (uint256) {
  // ✅ Single combined operation
  require(_values.length > 0, "Empty array");

  bytes32 combined = keccak256(abi.encodePacked(_values));
  userValues[msg.sender] = combined;

  return _values.length;
}
```

**Key Lesson:** Optimize batch operations to reduce gas costs.

---

## Summary of Best Practices

### ✅ DO

1. **Always use state-changing functions** for FHE operations
2. **Call FHE.allowThis()** before using encrypted values
3. **Grant users permission** with FHE.allow() after operations
4. **Implement access control** even for encrypted data
5. **Minimize FHE operations** for gas efficiency
6. **Track handle updates** after each operation
7. **Keep values encrypted** on-chain
8. **Validate input proofs** for security
9. **Use FHE.select()** for conditional logic
10. **Optimize batch operations** to reduce costs

### ❌ DON'T

1. Never use view/pure functions for FHE operations
2. Don't forget FHE.allowThis() (operations will fail)
3. Don't forget FHE.allow() (users cannot decrypt)
4. Don't expose encrypted values without access control
5. Don't perform unnecessary FHE operations
6. Don't reuse old handles after operations
7. Don't store decrypted values on-chain
8. Don't skip input proof validation
9. Don't convert encrypted booleans directly
10. Don't process arrays inefficiently

## Quick Reference Table

| Anti-Pattern | Why Wrong | Correct Pattern |
|--------------|-----------|-----------------|
| View functions | Cannot modify state | Use regular functions |
| Missing allowThis | Permission denied | FHE.allowThis() first |
| Missing allow | User cannot decrypt | FHE.allow(value, user) |
| No access control | Security risk | Check permissions |
| Multiple operations | High gas cost | Combine operations |
| Old handles | Handle expired | Track latest handle |
| Store decrypted | No privacy | Keep encrypted |
| No input proof | Security vulnerability | Validate proofs |
| Direct bool compare | Type mismatch | Use FHE.select() |
| Inefficient batch | High gas cost | Optimize batching |

## Complete Example

{% tabs %}

{% tab title="AntiPatterns.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title FHE Anti-Patterns
 * @notice Demonstrates common mistakes and how to avoid them
 * @dev Educational contract showing what NOT to do with FHE
 */
contract AntiPatterns {
  bytes32 public encryptedValue;
  mapping(address => bytes32) public userValues;
  uint256 public decryptedValue; // Anti-pattern example

  // [All 10 anti-patterns and correct patterns shown above]

  /**
   * @notice Summary of best practices
   * @return String with all best practices
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
```

{% endtab %}

{% tab title="AntiPatterns.ts" %}

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { AntiPatterns } from "../typechain-types";

describe("Anti-Patterns Examples", function () {
  let antiPatterns: AntiPatterns;
  const encryptedA = ethers.zeroPadValue("0xaaa", 32);
  const encryptedB = ethers.zeroPadValue("0xbbb", 32);

  beforeEach(async function () {
    const Factory = await ethers.getContractFactory("AntiPatterns");
    antiPatterns = await Factory.deploy();
  });

  // ✅ Each anti-pattern has corresponding test
  it("Anti-pattern #1: View function (simulated)", async function () {
    const result = await antiPatterns.antiPattern1_ViewFunctionWithEncryption(
      encryptedA,
      encryptedB
    );
    expect(result).to.not.equal(ethers.ZeroHash);
  });

  it("Correct pattern #1: Stateful operation", async function () {
    const result = await antiPatterns.correctPattern1_StatefulFHEOperation(
      encryptedA,
      encryptedB
    );
    expect(result).to.not.equal(ethers.ZeroHash);
  });

  // ... tests for all 10 patterns

  it("Should provide best practices summary", async function () {
    const summary = await antiPatterns.bestPracticesSummary();
    expect(summary).to.include("FHE Best Practices");
    expect(summary).to.include("allowThis");
    expect(summary).to.include("FHE.allow");
  });
});
```

{% endtab %}

{% endtabs %}

## Learning Path

1. **Start here** - Understand all 10 anti-patterns
2. Review [Access Control](access-control.md) for permission patterns
3. Study [FHE Counter](fhe-counter.md) for basic operations
4. Explore [Encryption Examples](encryption-single.md) for input handling
5. Build [Privacy Prediction Platform](privacy-prediction-basic.md) as practice

## Debugging Checklist

When FHE operations fail, check:

- [ ] Did you call `FHE.allowThis()` before operations?
- [ ] Did you use regular function (not view/pure)?
- [ ] Did you grant user permission with `FHE.allow()`?
- [ ] Are you using the latest handle (not old one)?
- [ ] Did you validate input proofs?
- [ ] Is access control properly implemented?
- [ ] Are you keeping values encrypted on-chain?
- [ ] Did you avoid direct boolean comparisons?
- [ ] Are batch operations optimized?
- [ ] Is the handle lifecycle tracked correctly?

## Next Steps

- Practice identifying anti-patterns in existing code
- Review your own contracts for these mistakes
- Use correct patterns in all new development
- Share this guide with your team
- Contribute more anti-patterns you discover
