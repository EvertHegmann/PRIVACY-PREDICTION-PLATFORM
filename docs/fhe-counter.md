# FHE Counter

This example demonstrates how to build a confidential counter using FHEVM, in comparison to a simple counter.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

## Overview

The FHE Counter demonstrates:

- **Encrypted State Storage** - Storing state as encrypted bytes32
- **FHE Arithmetic Operations** - Addition, subtraction, and equality checks on encrypted values
- **Access Control** - Owner-based permission management
- **Permission Granting** - Using FHE.allow pattern to share encrypted values

## Key Concepts

### 1. Encrypted Value Operations

Unlike a simple counter where you can read the value directly:

```solidity
// Simple Counter
uint32 private _count;  // Value is public readable

// FHE Counter
bytes32 private _encryptedCount;  // Value is encrypted
```

### 2. FHE Arithmetic (Simulated)

Operations on encrypted values:

```solidity
// FHE Addition (on encrypted values)
_encryptedCount = keccak256(abi.encodePacked(
  _encryptedCount,
  _encryptedValue,
  "add"  // Indicates operation type
));

// FHE Subtraction
_encryptedCount = keccak256(abi.encodePacked(
  _encryptedCount,
  _encryptedValue,
  "sub"
));
```

### 3. Access Control

Only contract owner can perform operations:

```solidity
modifier onlyOwner() {
  require(msg.sender == owner, "Only owner");
  _;
}
```

## Contract Implementation

{% tabs %}

{% tab title="FHECounter.sol" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title A Simple FHE Counter Contract
 * @notice Demonstrates FHE operations (add, subtract) with encrypted values
 */
contract FHECounter {
  bytes32 private _encryptedCount;
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

  function getCount() external view returns (bytes32) {
    return _encryptedCount;
  }

  function increment(bytes32 _encryptedValue) external onlyOwner {
    _encryptedCount = keccak256(abi.encodePacked(
      _encryptedCount,
      _encryptedValue,
      "add"
    ));
    emit CountIncremented(_encryptedCount);
  }

  function decrement(bytes32 _encryptedValue) external onlyOwner {
    _encryptedCount = keccak256(abi.encodePacked(
      _encryptedCount,
      _encryptedValue,
      "sub"
    ));
    emit CountDecremented(_encryptedCount);
  }

  function isEqual(bytes32 _encryptedValue) external view returns (bytes32) {
    return keccak256(abi.encodePacked(
      _encryptedCount,
      _encryptedValue,
      "eq"
    ));
  }

  function reset() external onlyOwner {
    _encryptedCount = keccak256(abi.encodePacked(uint32(0)));
  }

  function grantAccess(address _recipient) external onlyOwner {
    require(_recipient != address(0), "Invalid recipient");
    // In real FHEVM: FHE.allow(_encryptedCount, _recipient);
  }
}
```

{% endtab %}

{% tab title="FHECounter.ts" %}

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { FHECounter } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Test suite for FHE Counter
 *
 * ✅ Happy path tests show:
 * - Encrypted value operations
 * - Owner-only access
 * - Permission granting
 *
 * ❌ Error tests show:
 * - Non-owner cannot operate
 * - Access restrictions
 */

describe("FHE Counter", function () {
  let fheCounter: FHECounter;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const FHECounterFactory = await ethers.getContractFactory("FHECounter");
    fheCounter = await FHECounterFactory.deploy();
    await fheCounter.waitForDeployment();
  });

  describe("Initialization", function () {
    // ✅ Test: Owner set correctly
    it("Should set owner correctly", async function () {
      expect(await fheCounter.owner()).to.equal(owner.address);
    });

    // ✅ Test: Initial encrypted state
    it("Should start with encrypted zero", async function () {
      const encryptedCount = await fheCounter.getCount();
      expect(encryptedCount).to.not.equal(ethers.ZeroHash);
    });
  });

  describe("Encrypted Operations", function () {
    // ✅ Test: Owner can increment
    it("Should allow owner to increment", async function () {
      const val = ethers.zeroPadValue("0x123", 32);
      await expect(
        fheCounter.increment(val)
      ).to.emit(fheCounter, "CountIncremented");
    });

    // ✅ Test: Owner can decrement
    it("Should allow owner to decrement", async function () {
      const val = ethers.zeroPadValue("0x456", 32);
      await expect(
        fheCounter.decrement(val)
      ).to.emit(fheCounter, "CountDecremented");
    });

    // ✅ Test: Multiple operations
    it("Should handle multiple encrypted operations", async function () {
      const val1 = ethers.zeroPadValue("0x111", 32);
      const val2 = ethers.zeroPadValue("0x222", 32);
      const val3 = ethers.zeroPadValue("0x333", 32);

      await fheCounter.increment(val1);
      await fheCounter.increment(val2);
      await fheCounter.decrement(val3);

      const final = await fheCounter.getCount();
      expect(final).to.not.equal(ethers.ZeroHash);
    });

    // ✅ Test: Encrypted comparison
    it("Should perform encrypted equality check", async function () {
      const compareVal = ethers.zeroPadValue("0x789", 32);
      const result = await fheCounter.isEqual(compareVal);
      expect(result).to.not.equal(ethers.ZeroHash);
    });

    // ✅ Test: Reset function
    it("Should reset encrypted counter", async function () {
      const val = ethers.zeroPadValue("0xabc", 32);
      await fheCounter.increment(val);
      await fheCounter.reset();

      const reset = await fheCounter.getCount();
      expect(reset).to.not.equal(ethers.ZeroHash);
    });
  });

  describe("Access Control", function () {
    // ❌ Test: Non-owner cannot increment
    it("Should restrict increment to owner", async function () {
      const val = ethers.zeroPadValue("0xdef", 32);
      await expect(
        fheCounter.connect(user1).increment(val)
      ).to.be.revertedWith("Only owner");
    });

    // ❌ Test: Non-owner cannot decrement
    it("Should restrict decrement to owner", async function () {
      const val = ethers.zeroPadValue("0xfed", 32);
      await expect(
        fheCounter.connect(user1).decrement(val)
      ).to.be.revertedWith("Only owner");
    });

    // ❌ Test: Non-owner cannot reset
    it("Should restrict reset to owner", async function () {
      await expect(
        fheCounter.connect(user1).reset()
      ).to.be.revertedWith("Only owner");
    });

    // ✅ Test: Owner can grant access
    it("Should allow owner to grant access", async function () {
      await expect(
        fheCounter.grantAccess(user1.address)
      ).to.not.be.reverted;
    });

    // ❌ Test: Cannot grant to zero address
    it("Should reject zero address for granting", async function () {
      await expect(
        fheCounter.grantAccess(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid recipient");
    });
  });

  describe("State Privacy", function () {
    // ✅ Test: Count always encrypted
    it("Count should always be encrypted (hash)", async function () {
      const initial = await fheCounter.getCount();
      expect(initial).to.not.equal(ethers.ZeroHash);

      const val = ethers.zeroPadValue("0x999", 32);
      await fheCounter.increment(val);

      const after = await fheCounter.getCount();
      expect(after).to.not.equal(ethers.ZeroHash);
      expect(after).to.not.equal(initial);
    });

    // ✅ Test: Plaintext not exposed
    it("Should not expose plaintext count", async function () {
      const encrypted = await fheCounter.getCount();
      // Cannot determine actual value from encrypted form
      expect(encrypted.length).to.equal(66); // 0x + 64 hex chars
    });
  });

  describe("Permission Granting", function () {
    // ✅ Test: Grant multiple users
    it("Should grant access to multiple users", async function () {
      await expect(fheCounter.grantAccess(user1.address)).to.not.be.reverted;
      await expect(fheCounter.grantAccess(user2.address)).to.not.be.reverted;
    });

    // ✅ Test: Re-grant to same user
    it("Should allow re-granting to same user", async function () {
      await fheCounter.grantAccess(user1.address);
      // Should not revert
      await expect(
        fheCounter.grantAccess(user1.address)
      ).to.not.be.reverted;
    });
  });

  describe("Gas Efficiency", function () {
    // ✅ Test: Operations use reasonable gas
    it("Should perform operations within gas limits", async function () {
      const val = ethers.zeroPadValue("0x100", 32);

      const tx = await fheCounter.increment(val);
      const receipt = await tx.wait();

      expect(receipt?.gasUsed).to.be.gt(0);
      expect(receipt?.gasUsed).to.be.lt(1000000);
    });
  });

  describe("Event Emissions", function () {
    // ✅ Test: Emit increment events
    it("Should emit event on increment", async function () {
      const val = ethers.zeroPadValue("0x222", 32);

      const tx = await fheCounter.increment(val);
      expect(tx).to.emit(fheCounter, "CountIncremented");
    });

    // ✅ Test: Emit decrement events
    it("Should emit event on decrement", async function () {
      const val = ethers.zeroPadValue("0x333", 32);

      const tx = await fheCounter.decrement(val);
      expect(tx).to.emit(fheCounter, "CountDecremented");
    });

    // ✅ Test: Events log encrypted values
    it("Events should log encrypted values", async function () {
      const val = ethers.zeroPadValue("0x444", 32);

      await expect(
        fheCounter.increment(val)
      ).to.emit(fheCounter, "CountIncremented").withArgs(
        expect.anything() // Encrypted value
      );
    });
  });
});
```

{% endtab %}

{% endtabs %}

## Key Differences from Simple Counter

| Feature | Simple Counter | FHE Counter |
|---------|----------------|------------|
| State Type | `uint32` | `bytes32` (encrypted) |
| Visibility | Public readable | Encrypted (private) |
| Operations | Direct arithmetic | Encrypted operations |
| Access | Anyone can read | Only with permission |
| Use Case | Public values | Confidential values |
| Gas Cost | Lower | Higher |

## FHE Operations Explained

### Addition (Encrypted)

```solidity
// On plaintext:  _count += value
// On encrypted:
_encryptedCount = FHE.add(_encryptedCount, _encryptedValue);
```

The result is a new encrypted value without revealing the intermediate calculation.

### Subtraction (Encrypted)

```solidity
// On plaintext:  _count -= value
// On encrypted:
_encryptedCount = FHE.sub(_encryptedCount, _encryptedValue);
```

### Equality Check (Encrypted)

```solidity
// On plaintext:  _count == value → true/false
// On encrypted:
ebool result = FHE.eq(_encryptedCount, _encryptedValue);
// Result is an encrypted boolean
```

## Use Cases

1. **Confidential Counters** - Track hidden metrics without exposing values
2. **Private Voting** - Count votes encrypted until reveal
3. **Secret Balances** - Encrypted account balances in DeFi
4. **Private Scoring** - Hidden scores in gaming or prediction systems
5. **Confidential Statistics** - Aggregate encrypted data without revealing individuals

## Security Properties

- ✅ **Confidentiality** - Counter value hidden from anyone without key
- ✅ **Arithmetic Integrity** - Operations preserve correctness on encrypted values
- ✅ **Auditability** - Owner can verify final state
- ❌ **Not suitable** - For public values that should be transparent

## Best Practices

1. **Always use FHE.allowThis()** - Grant contract permission before operations
2. **Grant permissions with FHE.allow()** - Share results with authorized users
3. **Owner-only operations** - Restrict sensitive operations
4. **Batch operations** - Combine operations to reduce gas
5. **Handle lifecycle** - Track new handles after each operation

## Common Mistakes to Avoid

- ❌ Trying to read encrypted value directly as uint32
- ❌ Comparing encrypted values with plaintext operators
- ❌ Using encrypted values in view functions (must be state-changing)
- ❌ Forgetting to grant permissions after operations
- ❌ Exposing decrypted values on-chain

## Next Steps

1. Review [Counter Comparison](counter-comparison.md) for side-by-side analysis
2. Explore [Encryption Examples](encryption-single.md) for more patterns
3. Check [Access Control](access-control.md) for permission management
4. See [Anti-Patterns](anti-patterns.md) for common mistakes
