import { expect } from "chai";
import { ethers } from "hardhat";
import {
  AccessControlExample,
  EncryptionExample,
  DecryptionExample,
  AntiPatterns
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Comprehensive test suite for FHE examples
 *
 * Tests:
 * - AccessControlExample: Permission management patterns
 * - EncryptionExample: Single and multiple value encryption
 * - DecryptionExample: User and public decryption patterns
 * - AntiPatterns: Common mistakes and correct alternatives
 */

describe("FHE Examples Test Suite", function () {
  let accessControl: AccessControlExample;
  let encryption: EncryptionExample;
  let decryption: DecryptionExample;
  let antiPatterns: AntiPatterns;

  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy all contracts
    const AccessControlFactory = await ethers.getContractFactory("AccessControlExample");
    accessControl = await AccessControlFactory.deploy();
    await accessControl.waitForDeployment();

    const EncryptionFactory = await ethers.getContractFactory("EncryptionExample");
    encryption = await EncryptionFactory.deploy();
    await encryption.waitForDeployment();

    const DecryptionFactory = await ethers.getContractFactory("DecryptionExample");
    decryption = await DecryptionFactory.deploy();
    await decryption.waitForDeployment();

    const AntiPatternsFactory = await ethers.getContractFactory("AntiPatterns");
    antiPatterns = await AntiPatternsFactory.deploy();
    await antiPatterns.waitForDeployment();
  });

  describe("Access Control Example", function () {
    const encryptedBalance = ethers.zeroPadValue("0x1234567890", 32);

    // ✅ Test: Set encrypted balance
    it("Should allow user to set encrypted balance", async function () {
      await expect(
        accessControl.connect(user1).setBalance(encryptedBalance)
      ).to.emit(accessControl, "BalanceSet").withArgs(user1.address, encryptedBalance);
    });

    // ✅ Test: Grant access to another user
    it("Should allow user to grant access to others", async function () {
      await accessControl.connect(user1).setBalance(encryptedBalance);

      await expect(
        accessControl.connect(user1).grantAccess(user2.address)
      ).to.emit(accessControl, "PermissionGranted");
    });

    // ✅ Test: Check permissions
    it("Should correctly check permissions", async function () {
      await accessControl.connect(user1).setBalance(encryptedBalance);
      await accessControl.connect(user1).grantAccess(user2.address);

      expect(await accessControl.hasPermission(user1.address, user2.address)).to.be.true;
      expect(await accessControl.hasPermission(user1.address, user3.address)).to.be.false;
    });

    // ✅ Test: Owner always has permission
    it("Owner should always have access", async function () {
      await accessControl.connect(user1).setBalance(encryptedBalance);

      expect(await accessControl.hasPermission(user1.address, owner.address)).to.be.true;
    });

    // ✅ Test: User can access own balance
    it("User should access own encrypted balance", async function () {
      await accessControl.connect(user1).setBalance(encryptedBalance);

      const balance = await accessControl.connect(user1).getBalance(user1.address);
      expect(balance).to.equal(encryptedBalance);
    });

    // ❌ Test: Cannot access without permission
    it("Should deny access without permission", async function () {
      await accessControl.connect(user1).setBalance(encryptedBalance);

      await expect(
        accessControl.connect(user2).getBalance(user1.address)
      ).to.be.revertedWith("Access denied");
    });

    // ✅ Test: Batch grant access
    it("Should batch grant access to multiple users", async function () {
      await accessControl.connect(user1).setBalance(encryptedBalance);

      await accessControl.connect(user1).batchGrantAccess([user2.address, user3.address]);

      expect(await accessControl.hasPermission(user1.address, user2.address)).to.be.true;
      expect(await accessControl.hasPermission(user1.address, user3.address)).to.be.true;
    });

    // ✅ Test: Revoke access
    it("Should revoke access from user", async function () {
      await accessControl.connect(user1).setBalance(encryptedBalance);
      await accessControl.connect(user1).grantAccess(user2.address);

      await expect(
        accessControl.connect(user1).revokeAccess(user2.address)
      ).to.emit(accessControl, "PermissionRevoked");
    });

    // ✅ Test: Transfer with permissions
    it("Should transfer encrypted balance", async function () {
      await accessControl.connect(user1).setBalance(encryptedBalance);

      const encryptedAmount = ethers.zeroPadValue("0x0500", 32);
      await expect(
        accessControl.connect(user1).transfer(user2.address, encryptedAmount)
      ).to.not.be.reverted;
    });

    // ❌ Test: Cannot grant to zero address
    it("Should prevent granting access to zero address", async function () {
      await accessControl.connect(user1).setBalance(encryptedBalance);

      await expect(
        accessControl.connect(user1).grantAccess(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid recipient");
    });
  });

  describe("Encryption Example", function () {
    const inputProof = ethers.hexlify(ethers.randomBytes(32));

    // ✅ Test: Encrypt single value
    it("Should encrypt single value with input proof", async function () {
      await expect(
        encryption.encryptSingleValue(42, inputProof)
      ).to.emit(encryption, "SingleValueEncrypted");

      const encrypted = await encryption.getSingleEncryptedValue();
      expect(encrypted).to.not.equal(ethers.ZeroHash);
    });

    // ✅ Test: Encrypt multiple values
    it("Should encrypt multiple values with proofs", async function () {
      const values = [10, 20, 30, 40];
      const proofs = values.map(() => ethers.hexlify(ethers.randomBytes(32)));

      await expect(
        encryption.encryptMultipleValues(values, proofs)
      ).to.emit(encryption, "MultipleValuesEncrypted").withArgs(4);

      const allEncrypted = await encryption.getAllEncryptedValues();
      expect(allEncrypted.length).to.equal(4);
    });

    // ❌ Test: Require input proof
    it("Should require input proof for encryption", async function () {
      await expect(
        encryption.encryptSingleValue(42, "0x")
      ).to.be.revertedWith("Input proof required");
    });

    // ❌ Test: Mismatched array lengths
    it("Should reject mismatched value/proof arrays", async function () {
      const values = [10, 20, 30];
      const proofs = [inputProof, inputProof]; // Wrong length

      await expect(
        encryption.encryptMultipleValues(values, proofs)
      ).to.be.revertedWith("Length mismatch");
    });

    // ✅ Test: User encrypt personal data
    it("Should encrypt user's personal data", async function () {
      await expect(
        encryption.connect(user1).encryptUserData(100, inputProof)
      ).to.emit(encryption, "UserDataEncrypted");

      const userData = await encryption.getUserEncryptedData(user1.address);
      expect(userData).to.not.equal(ethers.ZeroHash);
    });

    // ✅ Test: User encrypt multiple data points
    it("Should encrypt user's multiple data points", async function () {
      const values = [1, 2, 3, 4, 5];
      const proofs = values.map(() => ethers.hexlify(ethers.randomBytes(32)));

      await encryption.connect(user1).encryptUserMultipleData(values, proofs);

      const count = await encryption.getUserDataCount(user1.address);
      expect(count).to.equal(5);
    });

    // ✅ Test: Encrypt different types
    it("Should encrypt different integer sizes", async function () {
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
    });

    // ✅ Test: Encrypt boolean
    it("Should encrypt boolean value", async function () {
      const encryptedBool = await encryption.encryptBoolean(true, inputProof);
      expect(encryptedBool).to.not.equal(ethers.ZeroHash);
    });

    // ✅ Test: Encrypt address
    it("Should encrypt address value", async function () {
      const encryptedAddr = await encryption.encryptAddress(user1.address, inputProof);
      expect(encryptedAddr).to.not.equal(ethers.ZeroHash);
    });

    // ❌ Test: Cannot encrypt zero address
    it("Should reject zero address encryption", async function () {
      await expect(
        encryption.encryptAddress(ethers.ZeroAddress, inputProof)
      ).to.be.revertedWith("Invalid address");
    });

    // ✅ Test: Correct encryption pattern
    it("Should follow correct encryption pattern", async function () {
      const encrypted = await encryption.correctEncryptionPattern(42, inputProof);
      expect(encrypted).to.not.equal(ethers.ZeroHash);
    });
  });

  describe("Decryption Example", function () {
    const encryptedValue = ethers.zeroPadValue("0xabcdef", 32);

    // ✅ Test: Store user-decryptable data
    it("Should store user-decryptable data", async function () {
      await expect(
        decryption.connect(user1).storeUserDecryptableData(encryptedValue)
      ).to.emit(decryption, "DataEncrypted");
    });

    // ✅ Test: Store public-decryptable data
    it("Should store public-decryptable data", async function () {
      await expect(
        decryption.connect(user1).storePublicDecryptableData(encryptedValue)
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

    // ✅ Test: Enable public decryption
    it("Owner should enable public decryption", async function () {
      await decryption.connect(user1).storePublicDecryptableData(encryptedValue);

      await expect(
        decryption.connect(user1).enablePublicDecryption(0)
      ).to.emit(decryption, "PublicDecryptionEnabled");
    });

    // ✅ Test: Request public decryption after enabled
    it("Anyone can request public decryption after enabled", async function () {
      await decryption.connect(user1).storePublicDecryptableData(encryptedValue);
      await decryption.connect(user1).enablePublicDecryption(0);

      const result = await decryption.connect(user2).requestPublicDecryption(0);
      expect(result).to.equal(encryptedValue);
    });

    // ❌ Test: Cannot request public decryption before enabled
    it("Cannot request public decryption before enabled", async function () {
      await decryption.connect(user1).storePublicDecryptableData(encryptedValue);

      await expect(
        decryption.connect(user2).requestPublicDecryption(0)
      ).to.be.revertedWith("Public decryption not enabled");
    });

    // ✅ Test: Batch user decryption
    it("Should batch decrypt user data", async function () {
      await decryption.connect(user1).storeUserDecryptableData(encryptedValue);
      await decryption.connect(user1).storeUserDecryptableData(ethers.zeroPadValue("0x0111", 32));
      await decryption.connect(user1).storeUserDecryptableData(ethers.zeroPadValue("0x0222", 32));

      const results = await decryption.connect(user1).requestBatchUserDecryption([0, 1, 2]);
      expect(results.length).to.equal(3);
    });

    // ✅ Test: Batch public decryption
    it("Should batch decrypt public data", async function () {
      await decryption.connect(user1).storePublicDecryptableData(encryptedValue);
      await decryption.connect(user1).storePublicDecryptableData(ethers.zeroPadValue("0x0333", 32));

      await decryption.connect(user1).enablePublicDecryption(0);
      await decryption.connect(user1).enablePublicDecryption(1);

      const results = await decryption.requestBatchPublicDecryption([0, 1]);
      expect(results.length).to.equal(2);
    });

    // ✅ Test: Check decryption permissions
    it("Should check if user can decrypt", async function () {
      await decryption.connect(user1).storeUserDecryptableData(encryptedValue);

      expect(await decryption.connect(user1).canUserDecrypt(0)).to.be.true;
      expect(await decryption.connect(user2).canUserDecrypt(0)).to.be.false;
    });

    // ✅ Test: Check if publicly decryptable
    it("Should check if data is publicly decryptable", async function () {
      await decryption.connect(user1).storePublicDecryptableData(encryptedValue);

      expect(await decryption.isPubliclyDecryptable(0)).to.be.false;

      await decryption.connect(user1).enablePublicDecryption(0);

      expect(await decryption.isPubliclyDecryptable(0)).to.be.true;
    });

    // ✅ Test: Conditional public reveal
    it("Should conditionally reveal based on condition", async function () {
      await decryption.connect(user1).storePublicDecryptableData(encryptedValue);

      await expect(
        decryption.connect(user1).conditionalPublicReveal(0, true)
      ).to.emit(decryption, "PublicDecryptionEnabled");
    });

    // ❌ Test: Conditional reveal fails without condition
    it("Should fail conditional reveal when condition not met", async function () {
      await decryption.connect(user1).storePublicDecryptableData(encryptedValue);

      await expect(
        decryption.connect(user1).conditionalPublicReveal(0, false)
      ).to.be.revertedWith("Condition not met");
    });
  });

  describe("Anti-Patterns", function () {
    const encryptedA = ethers.zeroPadValue("0x0aaa", 32);
    const encryptedB = ethers.zeroPadValue("0x0bbb", 32);
    const inputProof = ethers.hexlify(ethers.randomBytes(32));

    // ✅ Test: Demonstrate anti-pattern vs correct pattern
    it("Anti-pattern: View function fails (simulated)", async function () {
      // This would fail in real FHEVM
      const result = await antiPatterns.antiPattern1_ViewFunctionWithEncryption(encryptedA, encryptedB);
      expect(result).to.not.equal(ethers.ZeroHash);
    });

    // ✅ Test: Correct pattern works
    it("Correct pattern: Stateful operation succeeds", async function () {
      const result = await antiPatterns.correctPattern1_StatefulFHEOperation(encryptedA, encryptedB);
      expect(result).to.not.equal(ethers.ZeroHash);
    });

    // ✅ Test: Anti-pattern without allowThis
    it("Anti-pattern: Missing allowThis (simulated)", async function () {
      await antiPatterns.antiPattern2_MissingAllowThis(encryptedA);
      const value = await antiPatterns.encryptedValue();
      expect(value).to.equal(encryptedA);
    });

    // ✅ Test: Correct pattern with allowThis
    it("Correct pattern: With allowThis", async function () {
      await antiPatterns.correctPattern2_WithAllowThis(encryptedA);
      const value = await antiPatterns.encryptedValue();
      expect(value).to.equal(encryptedA);
    });

    // ✅ Test: Efficient operations
    it("Should demonstrate efficient pattern", async function () {
      const encryptedC = ethers.zeroPadValue("0x0ccc", 32);
      const result = await antiPatterns.correctPattern5_EfficientOperations(encryptedA, encryptedB, encryptedC);
      expect(result).to.not.equal(ethers.ZeroHash);
    });

    // ✅ Test: Correct handle lifecycle
    it("Should manage handle lifecycle correctly", async function () {
      await antiPatterns.correctPattern6_CorrectHandleLifecycle(encryptedA);
      const value = await antiPatterns.encryptedValue();
      expect(value).to.not.equal(ethers.ZeroHash);
    });

    // ✅ Test: Keep encrypted on-chain
    it("Should keep values encrypted on-chain", async function () {
      await antiPatterns.correctPattern7_KeepEncrypted(encryptedA);
      const value = await antiPatterns.encryptedValue();
      expect(value).to.equal(encryptedA);
    });

    // ✅ Test: Input proof validation
    it("Should validate input proofs", async function () {
      const result = await antiPatterns.correctPattern8_WithInputProofValidation(42, inputProof);
      expect(result).to.not.equal(ethers.ZeroHash);
    });

    // ✅ Test: Use FHE.select pattern
    it("Should use select for conditional logic", async function () {
      const ifTrue = ethers.zeroPadValue("0x0111", 32);
      const ifFalse = ethers.zeroPadValue("0x0222", 32);

      const result = await antiPatterns.correctPattern9_UseSelect(encryptedA, encryptedB, ifTrue, ifFalse);
      expect(result).to.not.equal(ethers.ZeroHash);
    });

    // ✅ Test: Efficient batch operations
    it("Should use efficient batch operations", async function () {
      const values = [encryptedA, encryptedB, ethers.zeroPadValue("0x0ccc", 32)];

      const count = await antiPatterns.correctPattern10_EfficientBatch.staticCall(values);
      expect(count).to.equal(3);
    });

    // ✅ Test: Best practices summary
    it("Should provide best practices summary", async function () {
      const summary = await antiPatterns.bestPracticesSummary();
      expect(summary).to.include("FHE Best Practices");
      expect(summary).to.include("allowThis");
      expect(summary).to.include("FHE.allow");
    });
  });

  describe("Integration: Combined Examples", function () {
    // ✅ Integration: Encrypt, store with access control, then decrypt
    it("Should demonstrate full encryption lifecycle", async function () {
      const inputProof = ethers.hexlify(ethers.randomBytes(32));

      // 1. Encrypt value
      await encryption.connect(user1).encryptUserData(100, inputProof);
      const encrypted = await encryption.getUserEncryptedData(user1.address);

      // 2. Store with access control
      await accessControl.connect(user1).setBalance(encrypted);

      // 3. Grant permission to user2
      await accessControl.connect(user1).grantAccess(user2.address);

      // 4. User2 can now access
      const balance = await accessControl.connect(user2).getBalance(user1.address);
      expect(balance).to.equal(encrypted);

      // 5. Store for decryption
      await decryption.connect(user1).storeUserDecryptableData(encrypted);

      // 6. User1 can decrypt
      const decrypted = await decryption.connect(user1).requestUserDecryption(0);
      expect(decrypted).to.equal(encrypted);
    });
  });
});
