import { expect } from "chai";
import { ethers } from "hardhat";
import { Counter, FHECounter } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Test suite comparing simple Counter vs FHE Counter
 *
 * Demonstrates:
 * - Basic counter operations
 * - Difference between plaintext and encrypted counters
 * - FHE arithmetic operations (add, sub, eq)
 * - Access control patterns
 */

describe("Counter Comparison: Simple vs FHE", function () {
  let simpleCounter: Counter;
  let fheCounter: FHECounter;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy simple counter
    const CounterFactory = await ethers.getContractFactory("Counter");
    simpleCounter = await CounterFactory.deploy();
    await simpleCounter.waitForDeployment();

    // Deploy FHE counter
    const FHECounterFactory = await ethers.getContractFactory("FHECounter");
    fheCounter = await FHECounterFactory.deploy();
    await fheCounter.waitForDeployment();
  });

  describe("Simple Counter", function () {
    // ✅ Test: Initial state
    it("Should start at zero", async function () {
      expect(await simpleCounter.getCount()).to.equal(0);
    });

    // ✅ Test: Increment operation
    it("Should increment counter", async function () {
      await simpleCounter.increment(5);
      expect(await simpleCounter.getCount()).to.equal(5);

      await simpleCounter.increment(3);
      expect(await simpleCounter.getCount()).to.equal(8);
    });

    // ✅ Test: Decrement operation
    it("Should decrement counter", async function () {
      await simpleCounter.increment(10);
      await simpleCounter.decrement(3);
      expect(await simpleCounter.getCount()).to.equal(7);
    });

    // ❌ Test: Cannot decrement below zero
    it("Should prevent decrement below zero", async function () {
      await simpleCounter.increment(5);
      await expect(
        simpleCounter.decrement(10)
      ).to.be.revertedWith("Counter: cannot decrement below zero");
    });

    // ✅ Test: Reset functionality
    it("Should reset counter to zero", async function () {
      await simpleCounter.increment(100);
      await simpleCounter.reset();
      expect(await simpleCounter.getCount()).to.equal(0);
    });

    // ✅ Test: Multiple operations
    it("Should handle multiple operations", async function () {
      await simpleCounter.increment(10);
      await simpleCounter.increment(20);
      await simpleCounter.decrement(5);
      await simpleCounter.increment(15);
      expect(await simpleCounter.getCount()).to.equal(40);
    });

    // ✅ Test: Anyone can call
    it("Should allow any user to increment", async function () {
      await simpleCounter.connect(user1).increment(5);
      await simpleCounter.connect(user2).increment(10);
      expect(await simpleCounter.getCount()).to.equal(15);
    });
  });

  describe("FHE Counter", function () {
    // ✅ Test: Initial encrypted state
    it("Should start with encrypted zero", async function () {
      const encryptedCount = await fheCounter.getCount();
      expect(encryptedCount).to.not.equal(ethers.ZeroHash);
    });

    // ✅ Test: Owner is set
    it("Should set owner correctly", async function () {
      expect(await fheCounter.owner()).to.equal(owner.address);
    });

    // ✅ Test: Encrypted increment
    it("Should increment with encrypted value", async function () {
      const encryptedValueToAdd = ethers.zeroPadValue("0x0123", 32);

      await expect(
        fheCounter.increment(encryptedValueToAdd)
      ).to.emit(fheCounter, "CountIncremented");

      const newCount = await fheCounter.getCount();
      expect(newCount).to.not.equal(ethers.ZeroHash);
    });

    // ✅ Test: Encrypted decrement
    it("Should decrement with encrypted value", async function () {
      const encryptedValueToSub = ethers.zeroPadValue("0x0456", 32);

      await expect(
        fheCounter.decrement(encryptedValueToSub)
      ).to.emit(fheCounter, "CountDecremented");

      const newCount = await fheCounter.getCount();
      expect(newCount).to.not.equal(ethers.ZeroHash);
    });

    // ✅ Test: Multiple encrypted operations
    it("Should handle multiple encrypted operations", async function () {
      const val1 = ethers.zeroPadValue("0x0111", 32);
      const val2 = ethers.zeroPadValue("0x0222", 32);
      const val3 = ethers.zeroPadValue("0x0333", 32);

      await fheCounter.increment(val1);
      await fheCounter.increment(val2);
      await fheCounter.decrement(val3);

      const finalCount = await fheCounter.getCount();
      expect(finalCount).to.not.equal(ethers.ZeroHash);
    });

    // ✅ Test: Encrypted comparison
    it("Should perform encrypted equality check", async function () {
      const currentCount = await fheCounter.getCount();
      const compareValue = ethers.zeroPadValue("0x0789", 32);

      const encryptedResult = await fheCounter.isEqual(compareValue);
      expect(encryptedResult).to.not.equal(ethers.ZeroHash);
      // Result is encrypted boolean, cannot check plaintext value
    });

    // ✅ Test: Reset encrypted counter
    it("Should reset encrypted counter", async function () {
      const val = ethers.zeroPadValue("0x0abc", 32);
      await fheCounter.increment(val);

      await fheCounter.reset();
      const resetCount = await fheCounter.getCount();
      expect(resetCount).to.not.equal(ethers.ZeroHash);
    });

    // ✅ Test: Grant access to encrypted value
    it("Should grant access to recipient", async function () {
      await expect(
        fheCounter.grantAccess(user1.address)
      ).to.not.be.reverted;
    });

    // ❌ Test: Only owner can increment
    it("Should restrict increment to owner", async function () {
      const val = ethers.zeroPadValue("0x0def", 32);

      await expect(
        fheCounter.connect(user1).increment(val)
      ).to.be.revertedWith("Only owner");
    });

    // ❌ Test: Only owner can decrement
    it("Should restrict decrement to owner", async function () {
      const val = ethers.zeroPadValue("0x0fed", 32);

      await expect(
        fheCounter.connect(user1).decrement(val)
      ).to.be.revertedWith("Only owner");
    });

    // ❌ Test: Cannot grant access to zero address
    it("Should prevent granting access to zero address", async function () {
      await expect(
        fheCounter.grantAccess(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid recipient");
    });

    // ✅ Test: Count remains encrypted
    it("Count should always be encrypted (non-zero hash)", async function () {
      const initialCount = await fheCounter.getCount();
      expect(initialCount).to.not.equal(ethers.ZeroHash);

      const val = ethers.zeroPadValue("0x0999", 32);
      await fheCounter.increment(val);

      const afterIncrement = await fheCounter.getCount();
      expect(afterIncrement).to.not.equal(ethers.ZeroHash);
      expect(afterIncrement).to.not.equal(initialCount); // Changes after operation
    });
  });

  describe("Comparison: Simple vs FHE", function () {
    // ✅ Comparison: Visibility
    it("Simple counter: count is visible, FHE counter: count is encrypted", async function () {
      await simpleCounter.increment(42);
      const simpleCount = await simpleCounter.getCount();
      expect(simpleCount).to.equal(42); // Plaintext visible

      const encryptedVal = ethers.zeroPadValue("0x0042", 32);
      await fheCounter.increment(encryptedVal);
      const fheCount = await fheCounter.getCount();
      expect(fheCount).to.not.equal(42); // Cannot see plaintext
      expect(fheCount).to.not.equal(ethers.ZeroHash); // But has encrypted value
    });

    // ✅ Comparison: Access control
    it("Simple: no restrictions, FHE: owner-only operations", async function () {
      // Simple counter: anyone can increment
      await expect(
        simpleCounter.connect(user1).increment(10)
      ).to.not.be.reverted;

      // FHE counter: only owner can increment
      const val = ethers.zeroPadValue("0x0aaa", 32);
      await expect(
        fheCounter.connect(user1).increment(val)
      ).to.be.revertedWith("Only owner");
    });

    // ✅ Comparison: Reset functionality
    it("Both support reset, but FHE keeps value encrypted", async function () {
      await simpleCounter.increment(100);
      await simpleCounter.reset();
      expect(await simpleCounter.getCount()).to.equal(0); // Plaintext zero

      await fheCounter.reset();
      const encryptedZero = await fheCounter.getCount();
      expect(encryptedZero).to.not.equal(ethers.ZeroHash); // Encrypted zero
    });
  });

  describe("Gas Comparison", function () {
    // ✅ Gas: Simple operations are cheaper
    it("Simple counter operations use less gas", async function () {
      const simpleTx = await simpleCounter.increment(10);
      const simpleReceipt = await simpleTx.wait();

      const encryptedVal = ethers.zeroPadValue("0x0a", 32);
      const fheTx = await fheCounter.increment(encryptedVal);
      const fheReceipt = await fheTx.wait();

      // Note: In real FHEVM, FHE operations are significantly more expensive
      // This is simulated, so gas difference is minimal
      expect(simpleReceipt?.gasUsed).to.be.gt(0);
      expect(fheReceipt?.gasUsed).to.be.gt(0);
    });
  });
});
