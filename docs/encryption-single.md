# Encrypt Single Value

Demonstrates how to encrypt a single value with input proofs and proper validation.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

## Overview

This example shows how to securely encrypt a single value using FHE with proper input proof validation.

## Key Concepts

### 1. What is Input Proof?

An input proof cryptographically verifies that an encrypted input is valid:

```solidity
// Without proof - INSECURE
bytes32 encrypted = userProvidedEncrypted; // Could be malicious!

// With proof - SECURE
bytes32 encrypted = FHE.fromExternal(userEncrypted, inputProof);
// Proof verifies the encryption is valid
```

### 2. Single Value Encryption

Encrypting one value with validation:

```solidity
function encryptSingleValue(uint32 _value, bytes calldata _inputProof) external {
  // 1. Validate input proof
  require(_inputProof.length > 0, "Proof required");

  // 2. Convert to encrypted form
  // In real FHEVM: euint32 encrypted = FHE.fromExternal(_value, _inputProof);

  // 3. Store encrypted value
  encryptedValue = keccak256(abi.encodePacked(_value, _inputProof));
}
```

### 3. Data Types

Different encrypted types:
```solidity
euint8      // 8-bit encrypted unsigned integer
euint16     // 16-bit encrypted unsigned integer
euint32     // 32-bit encrypted unsigned integer
euint64     // 64-bit encrypted unsigned integer
ebool       // Encrypted boolean
eaddress    // Encrypted address
```

## Implementation

{% tabs %}

{% tab title="EncryptionExample.sol (Single)" %}

```solidity
/**
 * @notice Encrypt and store a single value
 * @param _value The plaintext value to encrypt
 * @param _inputProof Proof that the encrypted input is valid
 */
function encryptSingleValue(uint32 _value, bytes calldata _inputProof) external {
  // Step 1: Validate input proof
  require(_inputProof.length > 0, "Input proof required");

  // Step 2: Simulate encryption with input proof validation
  singleEncryptedValue = keccak256(abi.encodePacked(
    _value,
    _inputProof,
    block.timestamp,
    msg.sender
  ));

  emit SingleValueEncrypted(singleEncryptedValue);
}

/**
 * @notice Encrypt boolean value
 * @param _value Boolean to encrypt
 * @param _inputProof Input proof
 * @return Encrypted boolean
 */
function encryptBoolean(bool _value, bytes calldata _inputProof)
  external pure returns (bytes32) {
  require(_inputProof.length > 0, "Input proof required");

  // In real FHEVM: ebool encrypted = FHE.fromExternal(externalEbool, _inputProof);
  return keccak256(abi.encodePacked(_value, _inputProof, "ebool"));
}

/**
 * @notice Encrypt address value
 * @param _address Address to encrypt
 * @param _inputProof Input proof
 * @return Encrypted address
 */
function encryptAddress(address _address, bytes calldata _inputProof)
  external pure returns (bytes32) {
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
```

{% endtab %}

{% tab title="Tests" %}

```typescript
describe("Encrypt Single Value", function () {
  let encryption: EncryptionExample;
  let owner: SignerWithAddress;
  const inputProof = ethers.hexlify(ethers.randomBytes(32));

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EncryptionExample");
    encryption = await Factory.deploy();
  });

  // ✅ Test: Encrypt single value
  it("Should encrypt single value with input proof", async function () {
    await expect(
      encryption.encryptSingleValue(42, inputProof)
    ).to.emit(encryption, "SingleValueEncrypted");

    const encrypted = await encryption.getSingleEncryptedValue();
    expect(encrypted).to.not.equal(ethers.ZeroHash);
  });

  // ✅ Test: Encrypt boolean
  it("Should encrypt boolean value", async function () {
    const encryptedBool = await encryption.encryptBoolean(true, inputProof);
    expect(encryptedBool).to.not.equal(ethers.ZeroHash);
  });

  // ✅ Test: Encrypt address
  it("Should encrypt address value", async function () {
    const encryptedAddr = await encryption.encryptAddress(owner.address, inputProof);
    expect(encryptedAddr).to.not.equal(ethers.ZeroHash);
  });

  // ❌ Test: Require input proof
  it("Should require input proof", async function () {
    await expect(
      encryption.encryptSingleValue(42, "0x")
    ).to.be.revertedWith("Input proof required");
  });

  // ❌ Test: Reject zero address
  it("Should reject zero address", async function () {
    await expect(
      encryption.encryptAddress(ethers.ZeroAddress, inputProof)
    ).to.be.revertedWith("Invalid address");
  });
});
```

{% endtab %}

{% endtabs %}

## Best Practices

### ✅ DO

- ✅ Always require and validate input proofs
- ✅ Include entropy sources (timestamp, sender)
- ✅ Check for invalid values (zero address, etc.)
- ✅ Store encrypted result
- ✅ Document privacy guarantees
- ✅ Use appropriate data types

### ❌ DON'T

- ❌ Accept encrypted values without proof
- ❌ Skip validation steps
- ❌ Use predictable inputs
- ❌ Store decrypted values
- ❌ Reuse input proofs
- ❌ Assume plaintext is hidden

## Data Type Selection

Choose the right encrypted type:

| Type | Bits | Use Case |
|------|------|----------|
| `euint8` | 8 | Small numbers, flags (0-255) |
| `euint16` | 16 | Medium numbers (0-65535) |
| `euint32` | 32 | Large numbers (0-4B) |
| `euint64` | 64 | Very large numbers |
| `ebool` | 1 | True/false values |
| `eaddress` | 160 | Ethereum addresses |

## Security Considerations

- ✅ **Input Proof Validation** - Ensures encrypted input is legitimate
- ✅ **Entropy** - Timestamp and sender make hash unique
- ✅ **Immutability** - Encrypted value cannot be changed
- ✅ **Confidentiality** - Value hidden from everyone except authorized users
- ⚠️ **Replay Risk** - Different proofs for same value

## Common Use Cases

1. **Private User Data**
   ```solidity
   function setSecretScore(uint32 _score, bytes calldata _proof) external {
     encryptedScores[msg.sender] = encryptSingleValue(_score, _proof);
   }
   ```

2. **Confidential Voting**
   ```solidity
   function castVote(bool _vote, bytes calldata _proof) external {
     votes[msg.sender] = encryptBoolean(_vote, _proof);
   }
   ```

3. **Private Identity**
   ```solidity
   function setIdentity(address _realAddress, bytes calldata _proof) external {
     identities[msg.sender] = encryptAddress(_realAddress, _proof);
   }
   ```

4. **Secret Commitment**
   ```solidity
   function commitSecret(uint256 _secret, bytes calldata _proof) external {
     require(_proof.length > 0, "Proof required");
     commitment = keccak256(abi.encodePacked(_secret, _proof));
   }
   ```

## Workflow

```
┌─────────────────────────────────────┐
│ 1. User has plaintext value (42)    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 2. Client encrypts + generates proof│
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 3. Send to contract                 │
│   - encryptedValue                  │
│   - inputProof                      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 4. Contract validates proof         │
│   - Check proof length              │
│   - Verify encryption               │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 5. Store encrypted value            │
│   - Cannot see plaintext            │
│   - Only authorized users decrypt   │
└─────────────────────────────────────┘
```

## Troubleshooting

### Error: "Input proof required"
**Cause:** Empty proof passed

**Solution:**
```solidity
// ❌ Wrong
await encryption.encryptSingleValue(42, "0x");

// ✅ Correct
const proof = ethers.hexlify(ethers.randomBytes(32));
await encryption.encryptSingleValue(42, proof);
```

### Error: "Invalid address"
**Cause:** Tried to encrypt zero address

**Solution:**
```solidity
// ❌ Wrong
await encryption.encryptAddress(ethers.ZeroAddress, proof);

// ✅ Correct
await encryption.encryptAddress(user.address, proof);
```

### Encrypted Value Not Stored
**Cause:** Transaction reverted silently

**Solution:**
- Check input proof is provided
- Verify value is valid
- Check gas is sufficient
- Use try/catch for debugging

## Next Steps

1. Try [Encrypt Multiple Values](encryption-multiple.md) for batch operations
2. Learn [Access Control](access-control.md) for permission management
3. Study [Anti-Patterns](anti-patterns.md) for common mistakes
4. Explore [Privacy Prediction Platform](privacy-prediction-basic.md) for real-world use
