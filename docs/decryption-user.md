# User Decrypt Single Value

Demonstrates user-only decryption patterns where only the data owner can decrypt their encrypted data.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

## Overview

User decryption allows only specific authorized users to decrypt their encrypted data, maintaining privacy from other users and even the contract owner.

## Key Concepts

### 1. User-Only Access

```solidity
// Only data owner can decrypt
function requestUserDecryption(uint256 _dataId) external view returns (bytes32) {
  require(msg.sender == dataOwner[_dataId], "Only owner can decrypt");
  return encryptedData[_dataId];
}
```

### 2. Decryption Process

```
┌─────────────────────────────────────┐
│ 1. User requests encrypted data     │
│    from contract                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 2. Contract verifies user is owner │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 3. Return encrypted value to user  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 4. User decrypts on client side    │
│    with their private key           │
└─────────────────────────────────────┘
```

### 3. Permission Model

```solidity
// Three levels of access
- msg.sender == owner       → Can decrypt
- msg.sender == contract    → Can store
- msg.sender == other       → Cannot access
```

## Implementation

{% tabs %}

{% tab title="DecryptionExample.sol (User)" %}

```solidity
/**
 * @notice Store encrypted data for user-only decryption
 * @param _encryptedValue The encrypted value
 * @return dataId The ID of stored data
 */
function storeUserDecryptableData(bytes32 _encryptedValue)
  external returns (uint256) {
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
 * @notice User requests to decrypt their own data
 * @param _dataId ID of encrypted data
 * @return Encrypted value for client-side decryption
 */
function requestUserDecryption(uint256 _dataId)
  external view returns (bytes32) {
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
 */
function requestBatchUserDecryption(uint256[] calldata _dataIds)
  external view returns (bytes32[] memory) {
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
 * @notice Check if user can decrypt specific data
 * @param _dataId ID of data
 * @return True if caller can decrypt
 */
function canUserDecrypt(uint256 _dataId) external view returns (bool) {
  if (_dataId >= nextDataId) return false;
  return encryptedDataStore[_dataId].owner == msg.sender;
}

/**
 * @notice Get encrypted data info
 * @param _dataId ID of data
 * @return Data structure with metadata
 */
function getDataInfo(uint256 _dataId)
  external view returns (EncryptedData memory) {
  require(_dataId < nextDataId, "Invalid data ID");
  return encryptedDataStore[_dataId];
}
```

{% endtab %}

{% tab title="Tests" %}

```typescript
describe("User Decrypt Single Value", function () {
  let decryption: DecryptionExample;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const encryptedValue = ethers.zeroPadValue("0xabcdef", 32);

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DecryptionExample");
    decryption = await Factory.deploy();
  });

  // ✅ Test: Store user-decryptable data
  it("Should store user-decryptable data", async function () {
    await expect(
      decryption.connect(user1).storeUserDecryptableData(encryptedValue)
    ).to.emit(decryption, "DataEncrypted");
  });

  // ✅ Test: User can decrypt own data
  it("User should decrypt own data", async function () {
    const tx = await decryption.connect(user1).storeUserDecryptableData(encryptedValue);
    await tx.wait();

    const decrypted = await decryption.connect(user1).requestUserDecryption(0);
    expect(decrypted).to.equal(encryptedValue);
  });

  // ❌ Test: Others cannot decrypt user data
  it("Others cannot decrypt user's data", async function () {
    await decryption.connect(user1).storeUserDecryptableData(encryptedValue);

    await expect(
      decryption.connect(user2).requestUserDecryption(0)
    ).to.be.revertedWith("Only owner can decrypt");
  });

  // ✅ Test: Batch user decryption
  it("Should batch decrypt user data", async function () {
    await decryption.connect(user1).storeUserDecryptableData(encryptedValue);
    await decryption.connect(user1).storeUserDecryptableData(
      ethers.zeroPadValue("0x111", 32)
    );
    await decryption.connect(user1).storeUserDecryptableData(
      ethers.zeroPadValue("0x222", 32)
    );

    const results = await decryption.connect(user1).requestBatchUserDecryption([0, 1, 2]);
    expect(results.length).to.equal(3);
    expect(results[0]).to.equal(encryptedValue);
  });

  // ✅ Test: Check decryption permissions
  it("Should check if user can decrypt", async function () {
    await decryption.connect(user1).storeUserDecryptableData(encryptedValue);

    expect(await decryption.connect(user1).canUserDecrypt(0)).to.be.true;
    expect(await decryption.connect(user2).canUserDecrypt(0)).to.be.false;
  });

  // ✅ Test: Get data info
  it("Should get encrypted data info", async function () {
    await decryption.connect(user1).storeUserDecryptableData(encryptedValue);

    const info = await decryption.getDataInfo(0);
    expect(info.owner).to.equal(user1.address);
    expect(info.encryptedValue).to.equal(encryptedValue);
    expect(info.isPubliclyDecryptable).to.be.false;
  });

  // ❌ Test: Invalid data ID
  it("Should reject invalid data ID", async function () {
    await expect(
      decryption.connect(user1).requestUserDecryption(999)
    ).to.be.revertedWith("Invalid data ID");
  });

  // ❌ Test: Batch with invalid ID
  it("Should reject batch with invalid ID", async function () {
    await decryption.connect(user1).storeUserDecryptableData(encryptedValue);

    await expect(
      decryption.connect(user1).requestBatchUserDecryption([0, 999])
    ).to.be.revertedWith("Invalid data ID");
  });

  // ❌ Test: Batch with unauthorized data
  it("Should reject batch if user doesn't own all data", async function () {
    await decryption.connect(user1).storeUserDecryptableData(encryptedValue);
    await decryption.connect(user2).storeUserDecryptableData(
      ethers.zeroPadValue("0x999", 32)
    );

    // user1 tries to decrypt their data + user2's data
    await expect(
      decryption.connect(user1).requestBatchUserDecryption([0, 1])
    ).to.be.revertedWith("Only owner can decrypt");
  });

  // ✅ Test: Multiple users, separate data
  it("Multiple users should have separate encrypted data", async function () {
    await decryption.connect(user1).storeUserDecryptableData(encryptedValue);
    const encrypted2 = ethers.zeroPadValue("0x999", 32);
    await decryption.connect(user2).storeUserDecryptableData(encrypted2);

    // user1 can decrypt their data
    const data1 = await decryption.connect(user1).requestUserDecryption(0);
    expect(data1).to.equal(encryptedValue);

    // user2 can decrypt their data
    const data2 = await decryption.connect(user2).requestUserDecryption(1);
    expect(data2).to.equal(encrypted2);

    // user1 cannot decrypt user2's data
    await expect(
      decryption.connect(user1).requestUserDecryption(1)
    ).to.be.revertedWith("Only owner can decrypt");
  });
});
```

{% endtab %}

{% endtabs %}

## Best Practices

### ✅ DO

- ✅ Verify caller is data owner
- ✅ Return encrypted value for client-side decryption
- ✅ Implement batch decryption for efficiency
- ✅ Provide permission check functions
- ✅ Include metadata (owner, timestamp)
- ✅ Document decryption requirements
- ✅ Use view functions (no gas cost)

### ❌ DON'T

- ❌ Return plaintext on-chain
- ❌ Allow anyone to decrypt
- ❌ Skip ownership verification
- ❌ Decrypt on contract side
- ❌ Expose decrypted values in events
- ❌ Mix user data between accounts
- ❌ Store decryption keys on-chain

## Decryption Workflow

### Client-Side Decryption

```typescript
// Step 1: Request encrypted data from contract
const encryptedValue = await contract.requestUserDecryption(dataId);

// Step 2: Decrypt on client side with user's private key
const plaintext = await fhevm.decrypt(encryptedValue, userPrivateKey);

// Step 3: Use plaintext locally (never send back to chain)
console.log("Decrypted value:", plaintext);
```

### Batch Decryption

```typescript
// Request multiple encrypted values
const dataIds = [0, 1, 2, 3, 4];
const encryptedValues = await contract.requestBatchUserDecryption(dataIds);

// Decrypt all on client side
const plaintexts = await Promise.all(
  encryptedValues.map(encrypted =>
    fhevm.decrypt(encrypted, userPrivateKey)
  )
);

console.log("Decrypted values:", plaintexts);
```

## Use Cases

### 1. Private Health Records
```solidity
// Store medical data
uint256 dataId = storeUserDecryptableData(encryptedHealthData);

// Only patient can decrypt
bytes32 encrypted = requestUserDecryption(dataId);
```

### 2. Confidential Financial Data
```solidity
// Store portfolio balance
storeUserDecryptableData(encryptedBalance);

// Only account owner can see balance
```

### 3. Personal Identity
```solidity
// Store encrypted identity
storeUserDecryptableData(encryptedSSN);

// Only user can decrypt their identity
```

### 4. Private Messages
```solidity
// Store encrypted message
storeUserDecryptableData(encryptedMessage);

// Only recipient can decrypt
```

## Security Properties

- ✅ **Confidentiality** - Only owner can decrypt
- ✅ **Integrity** - Data cannot be tampered
- ✅ **Authentication** - Ownership verified on-chain
- ✅ **Non-repudiation** - Owner recorded permanently
- ❌ **Not anonymous** - Owner address is public
- ❌ **Not forward-secret** - If key compromised, all data exposed

## Performance Considerations

| Operation | Gas Cost | Speed |
|-----------|----------|-------|
| Store Data | ~80k | Fast |
| Request Single | ~25k (view) | Instant |
| Request Batch (10) | ~50k (view) | Instant |
| Client Decrypt | 0 gas | Depends on client |

## Common Patterns

### Pattern 1: Time-Locked Decryption
```solidity
function requestTimeLocked(uint256 _dataId) external view returns (bytes32) {
  EncryptedData memory data = encryptedDataStore[_dataId];
  require(msg.sender == data.owner, "Only owner");
  require(block.timestamp >= data.unlockTime, "Not yet unlocked");
  return data.encryptedValue;
}
```

### Pattern 2: Delegated Decryption
```solidity
mapping(uint256 => mapping(address => bool)) public delegates;

function requestDelegated(uint256 _dataId) external view returns (bytes32) {
  EncryptedData memory data = encryptedDataStore[_dataId];
  require(
    msg.sender == data.owner || delegates[_dataId][msg.sender],
    "Not authorized"
  );
  return data.encryptedValue;
}
```

### Pattern 3: Conditional Decryption
```solidity
function requestConditional(uint256 _dataId, bool _condition)
  external view returns (bytes32) {
  EncryptedData memory data = encryptedDataStore[_dataId];
  require(msg.sender == data.owner, "Only owner");
  require(_condition, "Condition not met");
  return data.encryptedValue;
}
```

## Troubleshooting

### Error: "Only owner can decrypt"
**Cause:** Caller is not data owner

**Solution:**
```typescript
// ❌ Wrong: user2 tries to decrypt user1's data
await contract.connect(user2).requestUserDecryption(user1DataId);

// ✅ Correct: user1 decrypts their own data
await contract.connect(user1).requestUserDecryption(user1DataId);
```

### Error: "Invalid data ID"
**Cause:** Data doesn't exist

**Solution:**
```typescript
// Check if data exists first
const canDecrypt = await contract.canUserDecrypt(dataId);
if (canDecrypt) {
  const encrypted = await contract.requestUserDecryption(dataId);
}
```

### Cannot Decrypt on Client
**Cause:** Wrong private key or corrupted data

**Solution:**
- Verify user has correct private key
- Check encrypted data hasn't been modified
- Ensure FHEVM library is properly initialized

## Next Steps

1. Learn [Public Decryption](decryption-public.md) for transparent reveals
2. Review [Access Control](access-control.md) for permission patterns
3. Check [Anti-Patterns](anti-patterns.md) for common mistakes
4. Explore [Privacy Prediction Platform](privacy-prediction-basic.md) for complete example
