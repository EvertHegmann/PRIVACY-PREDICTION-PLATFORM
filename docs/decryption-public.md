# Public Decrypt Single Value

Demonstrates public decryption patterns where authorized parties can decrypt encrypted data through oracle mechanisms.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

## Overview

Public decryption allows authorized parties to decrypt data through oracle callbacks or predefined mechanisms, enabling transparent reveals while maintaining privacy during the commitment phase.

## Key Concepts

### 1. Public vs User Decryption

```solidity
// User Decryption: Only data owner can decrypt
function requestUserDecryption(uint256 _dataId) external view returns (bytes32) {
  require(msg.sender == dataOwner[_dataId], "Only owner can decrypt");
  return encryptedData[_dataId];
}

// Public Decryption: Authorized parties can decrypt
function requestPublicDecryption(uint256 _dataId) external view returns (bytes32) {
  require(isAuthorized[_dataId][msg.sender], "Not authorized");
  return encryptedData[_dataId];
}
```

### 2. Decryption Process

```
┌─────────────────────────────────────┐
│ 1. User requests public decryption  │
│    from contract                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 2. Contract verifies authorization │
│    or oracle permission             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 3. Return encrypted value           │
│    (or trigger oracle callback)     │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 4. Oracle decrypts and returns      │
│    plaintext result                 │
└─────────────────────────────────────┘
```

### 3. Authorization Models

```solidity
// Model 1: Direct Authorization
mapping(uint256 => mapping(address => bool)) public canDecrypt;

// Model 2: Role-Based
mapping(address => bytes32) public userRole;
mapping(bytes32 => bool) public roleCanDecrypt;

// Model 3: Time-Based
mapping(uint256 => uint256) public unlockTime;
require(block.timestamp >= unlockTime[_dataId], "Not yet unlocked");

// Model 4: Condition-Based
mapping(uint256 => bool) public conditionMet;
require(conditionMet[_dataId], "Condition not satisfied");
```

## Implementation

{% tabs %}

{% tab title="DecryptionExample.sol (Public)" %}

```solidity
/**
 * @notice Enable public decryption for data
 * @param _dataId ID of encrypted data
 */
function enablePublicDecryption(uint256 _dataId) external {
  require(_dataId < nextDataId, "Invalid data ID");
  EncryptedData memory data = encryptedDataStore[_dataId];

  // Only owner can enable public decryption
  require(msg.sender == data.owner, "Only owner can enable");

  // Mark data as publicly decryptable
  encryptedDataStore[_dataId].isPubliclyDecryptable = true;

  emit PublicDecryptionEnabled(_dataId);
}

/**
 * @notice Request public decryption of data
 * @param _dataId ID of encrypted data
 * @return Encrypted value for oracle decryption
 */
function requestPublicDecryption(uint256 _dataId)
  external view returns (bytes32) {
  require(_dataId < nextDataId, "Invalid data ID");
  EncryptedData memory data = encryptedDataStore[_dataId];

  // Must be publicly decryptable
  require(data.isPubliclyDecryptable, "Not available for public decryption");

  return data.encryptedValue;
}

/**
 * @notice Grant decryption permission to specific address
 * @param _dataId ID of encrypted data
 * @param _recipient Address to grant permission
 */
function grantDecryptionPermission(uint256 _dataId, address _recipient)
  external {
  require(_dataId < nextDataId, "Invalid data ID");
  EncryptedData memory data = encryptedDataStore[_dataId];

  // Only owner can grant permissions
  require(msg.sender == data.owner, "Only owner can grant permissions");

  decryptionPermissions[_dataId][_recipient] = true;

  emit DecryptionPermissionGranted(_dataId, _recipient);
}

/**
 * @notice Request decryption with permission
 * @param _dataId ID of encrypted data
 * @return Encrypted value for authorized decryption
 */
function requestAuthorizedDecryption(uint256 _dataId)
  external view returns (bytes32) {
  require(_dataId < nextDataId, "Invalid data ID");

  // Check if caller has permission
  require(decryptionPermissions[_dataId][msg.sender], "Not authorized to decrypt");

  return encryptedDataStore[_dataId].encryptedValue;
}

/**
 * @notice Reveal decrypted data (called by oracle)
 * @param _dataId ID of encrypted data
 * @param _plaintextValue The decrypted value
 */
function revealDecryptedData(uint256 _dataId, uint256 _plaintextValue)
  external onlyOracle {
  require(_dataId < nextDataId, "Invalid data ID");
  require(!decryptionReveals[_dataId].revealed, "Already revealed");

  decryptionReveals[_dataId] = DecryptionReveal({
    plaintextValue: _plaintextValue,
    revealed: true,
    revealTimestamp: block.timestamp,
    revealedBy: msg.sender
  });

  emit DataDecrypted(_dataId, _plaintextValue);
}

/**
 * @notice Get decrypted value (if already revealed)
 * @param _dataId ID of encrypted data
 * @return The plaintext value (if revealed)
 */
function getRevealedValue(uint256 _dataId) external view returns (uint256) {
  require(_dataId < nextDataId, "Invalid data ID");
  require(decryptionReveals[_dataId].revealed, "Not yet revealed");

  return decryptionReveals[_dataId].plaintextValue;
}

/**
 * @notice Check if data is publicly decryptable
 * @param _dataId ID of data
 * @return True if publicly decryptable
 */
function isPubliclyDecryptable(uint256 _dataId) external view returns (bool) {
  if (_dataId >= nextDataId) return false;
  return encryptedDataStore[_dataId].isPubliclyDecryptable;
}

/**
 * @notice Check if user has decryption permission
 * @param _dataId ID of data
 * @param _user User address
 * @return True if user can decrypt
 */
function hasDecryptionPermission(uint256 _dataId, address _user)
  external view returns (bool) {
  if (_dataId >= nextDataId) return false;
  return decryptionPermissions[_dataId][_user];
}

/**
 * @notice Check if data has been revealed
 * @param _dataId ID of data
 * @return True if data has been decrypted and revealed
 */
function isRevealed(uint256 _dataId) external view returns (bool) {
  if (_dataId >= nextDataId) return false;
  return decryptionReveals[_dataId].revealed;
}
```

{% endtab %}

{% tab title="Tests" %}

```typescript
describe("Public Decrypt Single Value", function () {
  let decryption: DecryptionExample;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let oracle: SignerWithAddress;

  const encryptedValue = ethers.zeroPadValue("0xabcdef", 32);

  beforeEach(async function () {
    [owner, user1, user2, oracle] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DecryptionExample");
    decryption = await Factory.deploy();

    // Set oracle
    await decryption.setOracle(oracle.address);
  });

  // ✅ Test: Store publicly decryptable data
  it("Should store data and enable public decryption", async function () {
    await decryption.connect(user1).storeUserDecryptableData(encryptedValue);
    await decryption.connect(user1).enablePublicDecryption(0);

    expect(await decryption.isPubliclyDecryptable(0)).to.be.true;
  });

  // ✅ Test: Request public decryption
  it("Should allow anyone to request public decryption", async function () {
    await decryption.connect(user1).storeUserDecryptableData(encryptedValue);
    await decryption.connect(user1).enablePublicDecryption(0);

    const encrypted = await decryption.connect(user2).requestPublicDecryption(0);
    expect(encrypted).to.equal(encryptedValue);
  });

  // ❌ Test: Cannot request private decryption as public
  it("Others cannot request public decryption if disabled", async function () {
    await decryption.connect(user1).storeUserDecryptableData(encryptedValue);

    // Don't enable public decryption
    await expect(
      decryption.connect(user2).requestPublicDecryption(0)
    ).to.be.revertedWith("Not available for public decryption");
  });

  // ✅ Test: Grant decryption permission
  it("Owner should grant decryption permission", async function () {
    await decryption.connect(user1).storeUserDecryptableData(encryptedValue);

    await expect(
      decryption.connect(user1).grantDecryptionPermission(0, user2.address)
    ).to.emit(decryption, "DecryptionPermissionGranted");

    expect(await decryption.hasDecryptionPermission(0, user2.address)).to.be.true;
  });

  // ✅ Test: Request authorized decryption
  it("Authorized user should decrypt data", async function () {
    await decryption.connect(user1).storeUserDecryptableData(encryptedValue);
    await decryption.connect(user1).grantDecryptionPermission(0, user2.address);

    const encrypted = await decryption.connect(user2).requestAuthorizedDecryption(0);
    expect(encrypted).to.equal(encryptedValue);
  });

  // ❌ Test: Unauthorized user cannot decrypt
  it("Unauthorized user should not decrypt", async function () {
    await decryption.connect(user1).storeUserDecryptableData(encryptedValue);
    await decryption.connect(user1).grantDecryptionPermission(0, user2.address);

    await expect(
      decryption.connect(user1).requestAuthorizedDecryption(0)
    ).to.be.revertedWith("Not authorized to decrypt");
  });

  // ✅ Test: Oracle reveals decrypted data
  it("Oracle should reveal decrypted data", async function () {
    await decryption.connect(user1).storeUserDecryptableData(encryptedValue);

    const plaintextValue = 12345;
    await expect(
      decryption.connect(oracle).revealDecryptedData(0, plaintextValue)
    ).to.emit(decryption, "DataDecrypted").withArgs(0, plaintextValue);
  });

  // ✅ Test: Get revealed value
  it("Should retrieve revealed value", async function () {
    await decryption.connect(user1).storeUserDecryptableData(encryptedValue);

    const plaintextValue = 67890;
    await decryption.connect(oracle).revealDecryptedData(0, plaintextValue);

    expect(await decryption.getRevealedValue(0)).to.equal(plaintextValue);
  });

  // ❌ Test: Non-oracle cannot reveal
  it("Non-oracle should not reveal data", async function () {
    await decryption.connect(user1).storeUserDecryptableData(encryptedValue);

    await expect(
      decryption.connect(user2).revealDecryptedData(0, 12345)
    ).to.be.revertedWith("Only oracle can call");
  });

  // ❌ Test: Cannot reveal twice
  it("Should not allow double reveal", async function () {
    await decryption.connect(user1).storeUserDecryptableData(encryptedValue);

    await decryption.connect(oracle).revealDecryptedData(0, 12345);

    await expect(
      decryption.connect(oracle).revealDecryptedData(0, 99999)
    ).to.be.revertedWith("Already revealed");
  });

  // ❌ Test: Cannot get unrevealed value
  it("Should not return unrevealed value", async function () {
    await decryption.connect(user1).storeUserDecryptableData(encryptedValue);

    await expect(
      decryption.getRevealedValue(0)
    ).to.be.revertedWith("Not yet revealed");
  });

  // ✅ Test: Multiple users with permissions
  it("Multiple users can have different permissions", async function () {
    await decryption.connect(user1).storeUserDecryptableData(encryptedValue);

    await decryption.connect(user1).grantDecryptionPermission(0, user2.address);
    expect(await decryption.hasDecryptionPermission(0, user2.address)).to.be.true;
    expect(await decryption.hasDecryptionPermission(0, owner.address)).to.be.false;

    // Grant to another user
    await decryption.connect(user1).grantDecryptionPermission(0, owner.address);
    expect(await decryption.hasDecryptionPermission(0, owner.address)).to.be.true;
  });

  // ❌ Test: Non-owner cannot enable public decryption
  it("Non-owner should not enable public decryption", async function () {
    await decryption.connect(user1).storeUserDecryptableData(encryptedValue);

    await expect(
      decryption.connect(user2).enablePublicDecryption(0)
    ).to.be.revertedWith("Only owner can enable");
  });

  // ❌ Test: Non-owner cannot grant permission
  it("Non-owner should not grant permission", async function () {
    await decryption.connect(user1).storeUserDecryptableData(encryptedValue);

    await expect(
      decryption.connect(user2).grantDecryptionPermission(0, user1.address)
    ).to.be.revertedWith("Only owner can grant permissions");
  });

  // ✅ Test: Invalid data ID checks
  it("Should reject invalid data ID", async function () {
    await expect(
      decryption.requestPublicDecryption(999)
    ).to.be.revertedWith("Invalid data ID");
  });

  // ✅ Test: Reveal metadata
  it("Should track reveal metadata", async function () {
    await decryption.connect(user1).storeUserDecryptableData(encryptedValue);

    const blockNumber = await ethers.provider.getBlockNumber();
    await decryption.connect(oracle).revealDecryptedData(0, 12345);

    expect(await decryption.isRevealed(0)).to.be.true;
  });

  // ✅ Test: Mixed public and private
  it("User can decrypt private, others need public or permission", async function () {
    await decryption.connect(user1).storeUserDecryptableData(encryptedValue);
    await decryption.connect(user1).enablePublicDecryption(0);

    // User1 can always decrypt (owner)
    const userDecrypt = await decryption.connect(user1).requestUserDecryption(0);
    expect(userDecrypt).to.equal(encryptedValue);

    // User2 can request public
    const publicDecrypt = await decryption.connect(user2).requestPublicDecryption(0);
    expect(publicDecrypt).to.equal(encryptedValue);
  });
});
```

{% endtab %}

{% endtabs %}

## Best Practices

### ✅ DO

- ✅ Require owner approval before enabling public decryption
- ✅ Implement granular permission models (role-based, time-based, condition-based)
- ✅ Use oracle pattern for transparent reveals
- ✅ Track decryption metadata (who, when, what)
- ✅ Prevent double reveals or conflicting states
- ✅ Emit events for all decryption activities
- ✅ Validate authorization before returning data
- ✅ Implement time locks for delayed reveals

### ❌ DON'T

- ❌ Automatically make all data publicly decryptable
- ❌ Allow anyone to enable public decryption
- ❌ Skip authorization checks
- ❌ Allow oracle to reveal arbitrary values
- ❌ Reveal before all conditions met
- ❌ Create orphaned encrypted data
- ❌ Expose decryption keys on-chain
- ❌ Skip permission validation

## Authorization Patterns

### Pattern 1: Role-Based Public Decryption

```solidity
enum Role { NONE, AUDITOR, ORACLE, ADMIN }

mapping(address => Role) public userRole;
mapping(Role => bool) public canDecrypt;

function requestDecryptionByRole(uint256 _dataId) external view returns (bytes32) {
  require(canDecrypt[userRole[msg.sender]], "Role cannot decrypt");
  return encryptedDataStore[_dataId].encryptedValue;
}
```

### Pattern 2: Time-Locked Public Decryption

```solidity
mapping(uint256 => uint256) public revealTime;

function enableTimeLockedDecryption(uint256 _dataId, uint256 _unlockTime)
  external {
  require(msg.sender == dataOwner[_dataId], "Only owner");
  revealTime[_dataId] = _unlockTime;
}

function requestTimeLocked(uint256 _dataId) external view returns (bytes32) {
  require(block.timestamp >= revealTime[_dataId], "Not yet revealed");
  return encryptedDataStore[_dataId].encryptedValue;
}
```

### Pattern 3: Conditional Public Decryption

```solidity
mapping(uint256 => bool) public conditionMet;

function enableConditionalDecryption(uint256 _dataId) external {
  require(msg.sender == dataOwner[_dataId], "Only owner");
  conditionMet[_dataId] = checkCondition(_dataId);
}

function requestConditional(uint256 _dataId) external view returns (bytes32) {
  require(conditionMet[_dataId], "Condition not met");
  return encryptedDataStore[_dataId].encryptedValue;
}
```

### Pattern 4: Oracle Callback Pattern

```solidity
function decryptionCallback(
  uint256 _dataId,
  bytes calldata _encryptedData,
  bytes calldata _decryptionProof
) external onlyOracle {
  // Oracle verifies proof and decrypts off-chain
  // Then calls back with result
  uint256 plaintext = oracleDecrypt(_encryptedData, _decryptionProof);

  decryptionReveals[_dataId].plaintextValue = plaintext;
  decryptionReveals[_dataId].revealed = true;
}
```

## Decryption Workflow

### Public Reveal Workflow

```typescript
// Step 1: Owner enables public decryption
await contract.connect(owner).enablePublicDecryption(dataId);

// Step 2: Anyone can request the encrypted data
const encrypted = await contract.requestPublicDecryption(dataId);

// Step 3: Oracle decrypts off-chain with private key
const plaintext = await oracleService.decrypt(encrypted);

// Step 4: Oracle calls contract to reveal
await contract.connect(oracle).revealDecryptedData(dataId, plaintext);

// Step 5: Anyone can retrieve the plaintext
const revealed = await contract.getRevealedValue(dataId);
```

### Permission-Based Workflow

```typescript
// Step 1: Owner grants permission
await contract.connect(owner).grantDecryptionPermission(dataId, user.address);

// Step 2: Authorized user requests decryption
const encrypted = await contract.connect(user).requestAuthorizedDecryption(dataId);

// Step 3: User decrypts with their key
const plaintext = await userService.decrypt(encrypted);

// Step 4: User has private access to plaintext
```

## Use Cases

### 1. Prediction Market Reveals

```solidity
// Users commit encrypted predictions
function commitPrediction(bytes32 _encrypted) external {
  predictions[msg.sender] = _encrypted;
}

// After deadline, predictions are revealed
function revealPredictions() external {
  require(block.timestamp >= revealDeadline, "Too early");
  // Oracle reveals all predictions
}
```

### 2. Auction With Privacy Phase

```solidity
// Private bidding phase
function submitBid(bytes32 _encryptedBid) external {
  bids[msg.sender] = _encryptedBid;
}

// Public reveal phase
function revealWinner() external onlyAuctioneer {
  uint256 winner = findHighestBid();
  enablePublicDecryption(winner);
}
```

### 3. Confidential Voting With Results

```solidity
// Secret voting
function castVote(bytes32 _encryptedVote) external {
  votes[msg.sender] = _encryptedVote;
}

// After voting closes, reveal results
function publishResults() external {
  enablePublicDecryption(resultsDataId);
}
```

### 4. Sealed Bid Contracts

```solidity
// Sealed commitment
function submitBid(uint256 _dataId) external {
  require(encrypted[_dataId].isPubliclyDecryptable == false, "Must be sealed");
}

// Unsealing phase
function unsealBid(uint256 _dataId) external {
  enablePublicDecryption(_dataId);
}
```

## Security Properties

- ✅ **Privacy Phase** - Data hidden during commitment
- ✅ **Transparent Reveal** - Everyone can verify decryption
- ✅ **Owner Control** - Only owner authorizes reveals
- ✅ **Oracle Trust** - Requires trusted oracle for accuracy
- ✅ **Immutable History** - All reveals recorded
- ⚠️ **Reveal Point** - Decryption becomes public knowledge
- ⚠️ **Oracle Risk** - Oracle could lie about plaintext
- ⚠️ **Front-Running** - Still vulnerable before reveal

## Performance Considerations

| Operation | Gas Cost | Speed |
|-----------|----------|-------|
| Enable Public | ~25k | Fast |
| Grant Permission | ~30k | Fast |
| Request Public | ~25k (view) | Instant |
| Request Authorized | ~25k (view) | Instant |
| Reveal Data | ~40k | Fast |
| Get Revealed | ~25k (view) | Instant |

## Common Patterns

### Pattern 1: Time-Delay Reveal

```solidity
function revealAfterDelay(uint256 _dataId, uint256 _delay) external {
  revealTime[_dataId] = block.timestamp + _delay;
}

function requestDelayedReveal(uint256 _dataId) external view returns (bytes32) {
  require(block.timestamp >= revealTime[_dataId], "Too early");
  return encryptedDataStore[_dataId].encryptedValue;
}
```

### Pattern 2: Threshold Reveal

```solidity
mapping(uint256 => uint256) public approvalCount;
mapping(uint256 => mapping(address => bool)) public approved;

function approveReveal(uint256 _dataId) external onlyAdmin {
  approved[_dataId][msg.sender] = true;
  approvalCount[_dataId]++;
}

function requestIfApproved(uint256 _dataId) external view returns (bytes32) {
  require(approvalCount[_dataId] >= 3, "Need 3 approvals");
  return encryptedDataStore[_dataId].encryptedValue;
}
```

### Pattern 3: Emergency Reveal

```solidity
mapping(uint256 => bool) public emergencyRevealed;
uint256 public emergencyDeadline;

function emergencyReveal(uint256 _dataId) external onlyOwner {
  require(block.timestamp > emergencyDeadline, "Not yet emergency");
  enablePublicDecryption(_dataId);
  emergencyRevealed[_dataId] = true;
}
```

## Troubleshooting

### Error: "Not available for public decryption"
**Cause:** Data owner hasn't enabled public decryption

**Solution:**
```typescript
// ❌ Wrong: Try to request without enabling
await contract.requestPublicDecryption(dataId);

// ✅ Correct: Owner must enable first
await contract.connect(owner).enablePublicDecryption(dataId);
await contract.requestPublicDecryption(dataId);
```

### Error: "Not authorized to decrypt"
**Cause:** You don't have permission

**Solution:**
```typescript
// ❌ Wrong: Unauthorized user
await contract.connect(user2).requestAuthorizedDecryption(dataId);

// ✅ Correct: Owner grants permission first
await contract.connect(owner).grantDecryptionPermission(dataId, user2.address);
await contract.connect(user2).requestAuthorizedDecryption(dataId);
```

### Error: "Already revealed"
**Cause:** Data already decrypted and revealed

**Solution:**
```typescript
// Check if already revealed
const isRevealed = await contract.isRevealed(dataId);
if (!isRevealed) {
  await contract.connect(oracle).revealDecryptedData(dataId, plaintext);
} else {
  const value = await contract.getRevealedValue(dataId);
}
```

### Cannot Decrypt on Client
**Cause:** Wrong authorization or data not revealed

**Solution:**
- Verify you have decryption permission
- Check if owner enabled public decryption
- Ensure data has been oracle-revealed
- Verify you have correct private key

## Comparison: User vs Public Decryption

| Aspect | User Decryption | Public Decryption |
|--------|-----------------|-------------------|
| **Who Decrypts** | Only owner | Authorized/Oracle |
| **Privacy** | Private to owner | Becomes transparent |
| **Use Case** | Personal data | Commitment reveals |
| **Trust Model** | Self-contained | Requires oracle |
| **Gas Cost** | Lower | Higher |
| **Complexity** | Simple | Medium |

## Next Steps

1. Learn [Access Control](access-control.md) for fine-grained permissions
2. Explore [Anti-Patterns](anti-patterns.md) for common mistakes
3. Study [Privacy Prediction Platform](privacy-prediction-basic.md) for real-world oracle usage
4. Review [Privacy Prediction - FHE Enhanced](privacy-prediction-fhe.md) for advanced patterns

