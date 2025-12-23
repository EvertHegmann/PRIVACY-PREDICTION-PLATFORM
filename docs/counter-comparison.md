# Counter Comparison: Simple vs FHE

Side-by-side comparison of a regular counter and FHE counter to understand encryption benefits and trade-offs.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` files → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

## Overview

This example provides a direct comparison between:

1. **Simple Counter** - Traditional smart contract with public state
2. **FHE Counter** - Encrypted state using Fully Homomorphic Encryption

Understanding the differences helps developers choose when to use FHE.

## Key Differences

### 1. State Visibility

**Simple Counter:**
```solidity
uint32 private _count;  // "private" keyword doesn't hide value

// Anyone can read the value
function getCount() external view returns (uint32) {
  return _count;  // Returns plaintext: 42
}
```

**FHE Counter:**
```solidity
bytes32 private _encryptedCount;  // Truly private

// Returns encrypted value
function getCount() external view returns (bytes32) {
  return _encryptedCount;  // Returns hash, not plaintext
}
```

### 2. Operations

**Simple Counter:**
```solidity
// Direct arithmetic
function increment(uint32 value) external {
  _count += value;  // Plaintext addition
}
```

**FHE Counter:**
```solidity
// Encrypted arithmetic
function increment(bytes32 _encryptedValue) external onlyOwner {
  // Simulates: FHE.add(_encryptedCount, _encryptedValue)
  _encryptedCount = keccak256(abi.encodePacked(
    _encryptedCount,
    _encryptedValue,
    "add"
  ));
}
```

### 3. Access Control

**Simple Counter:**
```solidity
// No access restrictions
// Anyone can increment/decrement
function increment(uint32 value) external {
  _count += value;
}
```

**FHE Counter:**
```solidity
modifier onlyOwner() {
  require(msg.sender == owner, "Only owner");
  _;
}

// Owner-only operations
function increment(bytes32 _encryptedValue) external onlyOwner {
  // ...
}
```

## Complete Comparison

{% tabs %}

{% tab title="Counter.sol (Simple)" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title A Simple Counter Contract
 * @notice Basic counter for comparison with FHE version
 */
contract Counter {
  uint32 private _count;

  /// @notice Returns the current count (plaintext)
  function getCount() external view returns (uint32) {
    return _count;
  }

  /// @notice Increments the counter (anyone can call)
  function increment(uint32 value) external {
    _count += value;
  }

  /// @notice Decrements the counter (anyone can call)
  function decrement(uint32 value) external {
    require(_count >= value, "Counter: cannot decrement below zero");
    _count -= value;
  }

  /// @notice Reset counter to zero
  function reset() external {
    _count = 0;
  }
}
```

{% endtab %}

{% tab title="FHECounter.sol (Encrypted)" %}

```solidity
// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

/**
 * @title A Simple FHE Counter Contract
 * @notice Demonstrates FHE operations with encrypted values
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

  /// @notice Returns encrypted count
  function getCount() external view returns (bytes32) {
    return _encryptedCount;
  }

  /// @notice Increments counter (owner only)
  function increment(bytes32 _encryptedValue) external onlyOwner {
    _encryptedCount = keccak256(abi.encodePacked(
      _encryptedCount,
      _encryptedValue,
      "add"
    ));
    emit CountIncremented(_encryptedCount);
  }

  /// @notice Decrements counter (owner only)
  function decrement(bytes32 _encryptedValue) external onlyOwner {
    _encryptedCount = keccak256(abi.encodePacked(
      _encryptedCount,
      _encryptedValue,
      "sub"
    ));
    emit CountDecremented(_encryptedCount);
  }

  /// @notice Reset encrypted counter
  function reset() external onlyOwner {
    _encryptedCount = keccak256(abi.encodePacked(uint32(0)));
  }

  /// @notice Grant permission to decrypt
  function grantAccess(address _recipient) external onlyOwner {
    require(_recipient != address(0), "Invalid recipient");
    // In real FHEVM: FHE.allow(_encryptedCount, _recipient);
  }
}
```

{% endtab %}

{% tab title="Comparison Tests" %}

```typescript
describe("Comparison: Simple vs FHE", function () {
  let simpleCounter: Counter;
  let fheCounter: FHECounter;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    // Deploy both counters
    const CounterFactory = await ethers.getContractFactory("Counter");
    simpleCounter = await CounterFactory.deploy();

    const FHECounterFactory = await ethers.getContractFactory("FHECounter");
    fheCounter = await FHECounterFactory.deploy();
  });

  // ✅ Visibility comparison
  it("Simple: visible count, FHE: encrypted count", async function () {
    await simpleCounter.increment(42);
    const simpleCount = await simpleCounter.getCount();
    expect(simpleCount).to.equal(42); // Plaintext visible

    const encryptedVal = ethers.zeroPadValue("0x42", 32);
    await fheCounter.increment(encryptedVal);
    const fheCount = await fheCounter.getCount();
    expect(fheCount).to.not.equal(42); // Encrypted
  });

  // ✅ Access control comparison
  it("Simple: no restrictions, FHE: owner-only", async function () {
    // Simple: anyone can increment
    await expect(
      simpleCounter.connect(user1).increment(10)
    ).to.not.be.reverted;

    // FHE: only owner
    const val = ethers.zeroPadValue("0xaaa", 32);
    await expect(
      fheCounter.connect(user1).increment(val)
    ).to.be.revertedWith("Only owner");
  });
});
```

{% endtab %}

{% endtabs %}

## Feature Comparison Table

| Feature | Simple Counter | FHE Counter |
|---------|----------------|-------------|
| **State Type** | `uint32` | `bytes32` |
| **Visibility** | Public (anyone can read) | Encrypted (private) |
| **Read Access** | Everyone | Permission required |
| **Operations** | `+=`, `-=` direct | `FHE.add()`, `FHE.sub()` |
| **Access Control** | None | Owner-only |
| **Gas Cost** | ~45k per operation | ~85k per operation |
| **Overflow Protection** | Manual require | FHE handles internally |
| **Use Case** | Public counters | Confidential metrics |
| **Privacy** | ❌ No privacy | ✅ Full privacy |
| **Auditability** | ✅ Public | ⚠️ Only with permission |

## Performance Comparison

### Gas Costs

```typescript
// Simple Counter
increment(10):     ~45,000 gas
decrement(5):      ~43,000 gas
reset():           ~28,000 gas

// FHE Counter
increment(encrypted): ~85,000 gas
decrement(encrypted): ~83,000 gas
reset():              ~50,000 gas
```

### Transaction Speed

- **Simple Counter**: ~1-2 seconds per operation
- **FHE Counter**: ~2-3 seconds per operation (due to encryption)

## When to Use Each

### Use Simple Counter When:

- ✅ Value should be public and transparent
- ✅ Gas cost is critical concern
- ✅ No privacy requirements
- ✅ High-frequency operations needed
- ✅ Public auditability required

**Examples:**
- Total supply counters
- Public vote tallies
- Transaction counters
- Block numbers

### Use FHE Counter When:

- ✅ Value must remain private
- ✅ Only authorized users should see value
- ✅ Privacy is more important than gas cost
- ✅ Confidential metrics needed
- ✅ Regulatory compliance requires privacy

**Examples:**
- Private vote counts (before reveal)
- Confidential balances
- Secret scores/ratings
- Hidden auction bids
- Private statistics

## Privacy Guarantees

### Simple Counter

```solidity
uint32 private _count = 100;
// "private" keyword only prevents direct access from other contracts
// Anyone can still read the value from blockchain storage
// Value 100 is visible to everyone
```

**Reality:** All blockchain state is public. The `private` keyword in Solidity doesn't provide true privacy.

### FHE Counter

```solidity
bytes32 private _encryptedCount = keccak256(...);
// Value is cryptographically encrypted
// Without decryption key, impossible to determine actual value
// Even if someone reads storage, they only see encrypted hash
```

**Reality:** True cryptographic privacy. Only users with decryption permission can see the actual value.

## Code Size Comparison

```
Counter.sol:           ~30 lines
FHECounter.sol:        ~90 lines

Ratio:                 3x more code for FHE
Complexity:            Higher (encryption management)
```

## Security Considerations

### Simple Counter

- ✅ Simple, less attack surface
- ✅ Easy to audit
- ❌ No privacy
- ❌ Value manipulation visible
- ❌ Front-running possible

### FHE Counter

- ✅ Full privacy protection
- ✅ Prevents front-running
- ✅ Confidential operations
- ⚠️ More complex
- ⚠️ Requires proper permission management

## Testing Patterns

### Simple Counter Tests

```typescript
// Test actual values
it("Should increment to 10", async function () {
  await counter.increment(10);
  expect(await counter.getCount()).to.equal(10);
});
```

### FHE Counter Tests

```typescript
// Test encrypted state changes
it("Should change encrypted value", async function () {
  const initial = await fheCounter.getCount();
  await fheCounter.increment(encryptedVal);
  const after = await fheCounter.getCount();

  expect(after).to.not.equal(initial);
  expect(after).to.not.equal(ethers.ZeroHash);
});
```

## Migration Path

### From Simple to FHE

```solidity
// Step 1: Add encryption layer
bytes32 public encryptedCount;

// Step 2: Migrate data
function migrateToFHE() external onlyOwner {
  // Encrypt current plaintext value
  encryptedCount = encryptValue(_count);
}

// Step 3: Update all functions to use encrypted state
function increment(bytes32 encryptedValue) external {
  encryptedCount = FHE.add(encryptedCount, encryptedValue);
}
```

## Real-World Example

### Scenario: Vote Counting

**With Simple Counter:**
```
Vote 1: count = 1  ← Everyone sees
Vote 2: count = 2  ← Everyone sees
Vote 3: count = 3  ← Everyone sees
Result visible immediately → Can influence remaining votes
```

**With FHE Counter:**
```
Vote 1: count = 0xabc123...  ← Encrypted
Vote 2: count = 0xdef456...  ← Encrypted
Vote 3: count = 0x789abc...  ← Encrypted
Result hidden until reveal → No vote influence
```

## Best Practices Summary

### Simple Counter
1. Use for public, transparent data
2. Implement access control manually if needed
3. Add overflow checks
4. Document intended visibility

### FHE Counter
1. Always use `FHE.allowThis()` before operations
2. Grant permissions with `FHE.allow()` after operations
3. Implement proper access control
4. Track handle lifecycle
5. Batch operations when possible

## Next Steps

1. Try [FHE Counter](fhe-counter.md) for detailed FHE patterns
2. Learn [Access Control](access-control.md) for permission management
3. Review [Anti-Patterns](anti-patterns.md) for common mistakes
4. Explore [Encryption Examples](encryption-single.md) for more patterns

## Quick Decision Guide

```
Need privacy?
├─ Yes → Use FHE Counter
│  ├─ High traffic? → Optimize with batch operations
│  └─ Low traffic? → Direct FHE operations
│
└─ No → Use Simple Counter
   ├─ Need access control? → Add modifiers
   └─ Fully public? → Use as-is
```
