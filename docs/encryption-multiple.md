# Encrypt Multiple Values

Shows batch encryption patterns for multiple values with different data types.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

## Overview

Batch encryption allows efficient processing of multiple values in a single operation, reducing gas costs and simplifying workflows.

## Key Concepts

### 1. Why Batch Encryption?

**Single Operation (Inefficient):**
```solidity
// Encrypt one value at a time
encryptValue(value1, proof1);  // Transaction 1
encryptValue(value2, proof2);  // Transaction 2
encryptValue(value3, proof3);  // Transaction 3
// 3 transactions, high cost
```

**Batch Operation (Efficient):**
```solidity
// Encrypt all values at once
encryptMultiple([value1, value2, value3], [proof1, proof2, proof3]);
// 1 transaction, lower cost
```

### 2. Batch Validation

All proofs must be validated:
```solidity
for (uint i = 0; i < values.length; i++) {
  require(proofs[i].length > 0, "Missing proof");
  // Encrypt and store each value
}
```

### 3. Array Length Matching

Ensure arrays match:
```solidity
require(values.length == proofs.length, "Length mismatch");
require(values.length > 0, "Empty array");
require(values.length <= MAX_BATCH, "Too many values");
```

## Implementation

{% tabs %}

{% tab title="EncryptionExample.sol (Batch)" %}

```solidity
/**
 * @notice Encrypt and store multiple values at once
 * @param _values Array of plaintext values
 * @param _inputProofs Array of corresponding input proofs
 */
function encryptMultipleValues(
  uint32[] calldata _values,
  bytes[] calldata _inputProofs
) external {
  // Step 1: Validate arrays
  require(_values.length == _inputProofs.length, "Length mismatch");
  require(_values.length > 0, "Empty array");
  require(_values.length <= 10, "Max 10 values per batch");

  // Step 2: Clear previous values
  delete multipleEncryptedValues;

  // Step 3: Encrypt each value with its proof
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
 * @notice User encrypts multiple data points
 * @param _values Array of plaintext values
 * @param _inputProofs Array of input proofs
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
 * @notice Encrypt different sized integers
 * @param _value8 8-bit unsigned integer
 * @param _value16 16-bit unsigned integer
 * @param _value32 32-bit unsigned integer
 * @param _value64 64-bit unsigned integer
 * @param _inputProof Input proof for all values
 * @return Four encrypted values
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
 * @notice Get all encrypted values
 * @return Array of encrypted values
 */
function getAllEncryptedValues() external view returns (bytes32[] memory) {
  return multipleEncryptedValues;
}

/**
 * @notice Get user's encrypted data count
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
```

{% endtab %}

{% tab title="Tests" %}

```typescript
describe("Encrypt Multiple Values", function () {
  let encryption: EncryptionExample;
  let user1: SignerWithAddress;

  beforeEach(async function () {
    [, user1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EncryptionExample");
    encryption = await Factory.deploy();
  });

  // ✅ Test: Batch encrypt multiple values
  it("Should encrypt multiple values with proofs", async function () {
    const values = [10, 20, 30, 40];
    const proofs = values.map(() => ethers.hexlify(ethers.randomBytes(32)));

    await expect(
      encryption.encryptMultipleValues(values, proofs)
    ).to.emit(encryption, "MultipleValuesEncrypted").withArgs(4);

    const allEncrypted = await encryption.getAllEncryptedValues();
    expect(allEncrypted.length).to.equal(4);
  });

  // ✅ Test: Each value uniquely encrypted
  it("Each value should be uniquely encrypted", async function () {
    const values = [100, 100, 100]; // Same values
    const proofs = values.map(() => ethers.hexlify(ethers.randomBytes(32)));

    await encryption.encryptMultipleValues(values, proofs);
    const allEncrypted = await encryption.getAllEncryptedValues();

    // Even with same values, encrypted forms differ (due to index)
    expect(allEncrypted[0]).to.not.equal(allEncrypted[1]);
    expect(allEncrypted[1]).to.not.equal(allEncrypted[2]);
  });

  // ✅ Test: User batch encrypt
  it("User should encrypt multiple data points", async function () {
    const values = [1, 2, 3, 4, 5];
    const proofs = values.map(() => ethers.hexlify(ethers.randomBytes(32)));

    await encryption.connect(user1).encryptUserMultipleData(values, proofs);

    const count = await encryption.getUserDataCount(user1.address);
    expect(count).to.equal(5);

    const userData = await encryption.getUserAllData(user1.address);
    expect(userData.length).to.equal(5);
  });

  // ✅ Test: Different types encryption
  it("Should encrypt different integer sizes", async function () {
    const inputProof = ethers.hexlify(ethers.randomBytes(32));

    const [enc8, enc16, enc32, enc64] = await encryption.encryptDifferentTypes(
      255,     // uint8
      65535,   // uint16
      4294967295, // uint32
      BigInt("18446744073709551615"), // uint64
      inputProof
    );

    expect(enc8).to.not.equal(ethers.ZeroHash);
    expect(enc16).to.not.equal(ethers.ZeroHash);
    expect(enc32).to.not.equal(ethers.ZeroHash);
    expect(enc64).to.not.equal(ethers.ZeroHash);

    // All encrypted values should be different
    expect(enc8).to.not.equal(enc16);
    expect(enc16).to.not.equal(enc32);
    expect(enc32).to.not.equal(enc64);
  });

  // ❌ Test: Reject mismatched arrays
  it("Should reject mismatched value/proof arrays", async function () {
    const values = [10, 20, 30];
    const proofs = [
      ethers.hexlify(ethers.randomBytes(32)),
      ethers.hexlify(ethers.randomBytes(32))
    ]; // Only 2 proofs for 3 values

    await expect(
      encryption.encryptMultipleValues(values, proofs)
    ).to.be.revertedWith("Length mismatch");
  });

  // ❌ Test: Reject empty arrays
  it("Should reject empty arrays", async function () {
    await expect(
      encryption.encryptMultipleValues([], [])
    ).to.be.revertedWith("Empty array");
  });

  // ❌ Test: Reject missing proofs
  it("Should reject if any proof is missing", async function () {
    const values = [10, 20, 30];
    const proofs = [
      ethers.hexlify(ethers.randomBytes(32)),
      "0x", // Empty proof
      ethers.hexlify(ethers.randomBytes(32))
    ];

    await expect(
      encryption.encryptMultipleValues(values, proofs)
    ).to.be.revertedWith("Input proof required");
  });

  // ✅ Test: Large batch (within limit)
  it("Should handle maximum batch size", async function () {
    const values = new Array(10).fill(0).map((_, i) => i + 1);
    const proofs = values.map(() => ethers.hexlify(ethers.randomBytes(32)));

    await expect(
      encryption.encryptMultipleValues(values, proofs)
    ).to.not.be.reverted;
  });

  // ❌ Test: Reject oversized batch
  it("Should reject batch exceeding maximum", async function () {
    const values = new Array(11).fill(0).map((_, i) => i + 1);
    const proofs = values.map(() => ethers.hexlify(ethers.randomBytes(32)));

    await expect(
      encryption.encryptMultipleValues(values, proofs)
    ).to.be.revertedWith("Max 10 values per batch");
  });

  // ✅ Test: Clear previous values
  it("Should clear previous batch when encrypting new one", async function () {
    const values1 = [1, 2, 3];
    const proofs1 = values1.map(() => ethers.hexlify(ethers.randomBytes(32)));

    await encryption.encryptMultipleValues(values1, proofs1);
    let all = await encryption.getAllEncryptedValues();
    expect(all.length).to.equal(3);

    const values2 = [4, 5];
    const proofs2 = values2.map(() => ethers.hexlify(ethers.randomBytes(32)));

    await encryption.encryptMultipleValues(values2, proofs2);
    all = await encryption.getAllEncryptedValues();
    expect(all.length).to.equal(2); // Previous cleared
  });
});
```

{% endtab %}

{% endtabs %}

## Best Practices

### ✅ DO

- ✅ Validate array lengths match
- ✅ Check for empty arrays
- ✅ Set maximum batch size
- ✅ Include index in encryption for uniqueness
- ✅ Clear previous data if needed
- ✅ Emit events with batch count
- ✅ Handle errors gracefully

### ❌ DON'T

- ❌ Process unlimited batch sizes
- ❌ Skip validation for any item
- ❌ Assume proofs are valid
- ❌ Forget to clear old data
- ❌ Reuse same proof for all values
- ❌ Ignore gas costs
- ❌ Mix up value/proof order

## Gas Optimization

### Inefficient (Multiple Transactions)
```solidity
// Cost: ~80k gas × 10 = 800k gas
for (uint i = 0; i < 10; i++) {
  await contract.encryptSingleValue(values[i], proofs[i]);
}
```

### Efficient (Single Batch)
```solidity
// Cost: ~200k gas total
await contract.encryptMultipleValues(values, proofs);
// Savings: ~600k gas (75% reduction)
```

## Batch Size Guidelines

| Batch Size | Gas Cost | Recommended Use |
|------------|----------|-----------------|
| 1-5 values | ~150k | Small datasets |
| 6-10 values | ~250k | Medium datasets |
| 11-20 values | ~400k | Large datasets |
| 20+ values | High | Split into multiple batches |

## Use Cases

### 1. Multi-Attribute Profiles
```solidity
// Encrypt all user attributes at once
function setUserProfile(
  uint32 age,
  uint32 score,
  uint32 level,
  bytes[] calldata proofs
) external {
  encryptMultipleValues([age, score, level], proofs);
}
```

### 2. Batch Voting
```solidity
// Submit multiple votes simultaneously
function batchVote(
  uint32[] calldata proposalIds,
  bool[] calldata votes,
  bytes[] calldata proofs
) external {
  // Encrypt all votes at once
}
```

### 3. Time Series Data
```solidity
// Store encrypted historical data
function recordHistory(
  uint32[] calldata measurements,
  bytes[] calldata proofs
) external {
  // Encrypt all measurements
}
```

### 4. Portfolio Management
```solidity
// Encrypt multiple asset amounts
function updatePortfolio(
  uint32[] calldata amounts,
  bytes[] calldata proofs
) external {
  // Encrypt all positions
}
```

## Error Handling

### Common Errors

1. **Length Mismatch**
   ```solidity
   // ❌ Wrong: Different lengths
   values = [1, 2, 3];
   proofs = [proof1, proof2]; // Only 2 proofs

   // ✅ Correct: Same lengths
   values = [1, 2, 3];
   proofs = [proof1, proof2, proof3];
   ```

2. **Empty Proof**
   ```solidity
   // ❌ Wrong: Empty proof in batch
   proofs = [proof1, "0x", proof3];

   // ✅ Correct: All proofs valid
   proofs = [proof1, proof2, proof3];
   ```

3. **Batch Too Large**
   ```solidity
   // ❌ Wrong: Exceeds limit
   values = new Array(100).fill(1);

   // ✅ Correct: Split into smaller batches
   batch1 = values.slice(0, 10);
   batch2 = values.slice(10, 20);
   ```

## Performance Tips

1. **Batch Similar Operations**
   - Group values by type
   - Process in single transaction
   - Reduce round trips

2. **Set Reasonable Limits**
   - Max 10-20 values per batch
   - Consider gas costs
   - Balance efficiency vs. size

3. **Use Events**
   - Emit batch count
   - Log success/failure
   - Track processed items

4. **Clear Old Data**
   - Delete previous arrays
   - Prevent storage bloat
   - Reduce gas costs

## Next Steps

1. Review [Encrypt Single Value](encryption-single.md) for basics
2. Learn [Decryption Patterns](decryption-user.md) for retrieving data
3. Check [Access Control](access-control.md) for permissions
4. Study [Anti-Patterns](anti-patterns.md) for common mistakes
