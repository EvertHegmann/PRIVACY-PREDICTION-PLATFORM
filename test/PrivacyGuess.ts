import { expect } from "chai";
import { ethers } from "hardhat";
import { PrivacyGuess } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Test suite for Privacy Prediction Platform (Basic Implementation)
 *
 * This test demonstrates:
 * - Creating prediction events
 * - Making encrypted predictions
 * - Finalizing events with actual outcomes
 * - Revealing predictions and verifying correctness
 * - Access control and edge cases
 */

describe("Privacy Prediction Platform - Basic", function () {
  let contract: PrivacyGuess;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  // ✅ Setup: Deploy contract before each test
  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    const PrivacyGuess = await ethers.getContractFactory("PrivacyGuess");
    contract = await PrivacyGuess.deploy();
    await contract.waitForDeployment();
  });

  describe("Event Creation", function () {
    // ✅ Test: Owner can create events
    it("Should create a new prediction event", async function () {
      const title = "Will Bitcoin reach $100k in 2026?";
      const description = "Predict Bitcoin's milestone achievement";
      const duration = 30 * 24 * 60 * 60; // 30 days

      const tx = await contract.createEvent(title, description, duration);
      const receipt = await tx.wait();

      expect(await contract.getTotalEvents()).to.equal(1);

      const eventData = await contract.getEvent(0);
      expect(eventData.title).to.equal(title);
      expect(eventData.description).to.equal(description);
      expect(eventData.isFinalized).to.equal(false);
    });

    // ✅ Test: Multiple events can be created
    it("Should create multiple events with sequential IDs", async function () {
      await contract.createEvent("Event 1", "Description 1", 100);
      await contract.createEvent("Event 2", "Description 2", 200);
      await contract.createEvent("Event 3", "Description 3", 300);

      expect(await contract.getTotalEvents()).to.equal(3);

      const event0 = await contract.getEvent(0);
      const event1 = await contract.getEvent(1);
      const event2 = await contract.getEvent(2);

      expect(event0.title).to.equal("Event 1");
      expect(event1.title).to.equal("Event 2");
      expect(event2.title).to.equal("Event 3");
    });

    // ❌ Test: Cannot retrieve non-existent event
    it("Should revert when accessing non-existent event", async function () {
      await expect(
        contract.getEvent(999)
      ).to.be.revertedWith("Event does not exist");
    });
  });

  describe("Prediction Making", function () {
    // Setup: Create an event before these tests
    beforeEach(async function () {
      const duration = 30 * 24 * 60 * 60; // 30 days
      await contract.createEvent(
        "Test Event",
        "Test Description",
        duration
      );
    });

    // ✅ Test: User can make a prediction
    it("Should allow user to make a prediction", async function () {
      await expect(
        contract.connect(user1).makePrediction(0, true)
      ).to.emit(contract, "PredictionMade").withArgs(0, user1.address);

      const [hasPrediction] = await contract.getUserPrediction(0, user1.address);
      expect(hasPrediction).to.equal(true);
    });

    // ✅ Test: Multiple users can predict on same event
    it("Should allow multiple users to predict on same event", async function () {
      await contract.connect(user1).makePrediction(0, true);
      await contract.connect(user2).makePrediction(0, false);
      await contract.connect(user3).makePrediction(0, true);

      const predictors = await contract.getEventPredictors(0);
      expect(predictors.length).to.equal(3);
      expect(predictors).to.include(user1.address);
      expect(predictors).to.include(user2.address);
      expect(predictors).to.include(user3.address);
    });

    // ❌ Test: User cannot make duplicate prediction
    it("Should prevent user from making duplicate prediction", async function () {
      await contract.connect(user1).makePrediction(0, true);

      await expect(
        contract.connect(user1).makePrediction(0, false)
      ).to.be.revertedWith("Already made prediction");
    });

    // ❌ Test: Cannot predict on non-existent event
    it("Should revert when predicting on non-existent event", async function () {
      await expect(
        contract.connect(user1).makePrediction(999, true)
      ).to.be.revertedWith("Event does not exist");
    });

    // ❌ Test: Cannot predict on finalized event
    it("Should prevent prediction on finalized event", async function () {
      // Make a prediction first
      await contract.connect(user1).makePrediction(0, true);

      // Fast forward time past event end
      await ethers.provider.send("hardhat_mine", ["0x" + (30 * 24 * 60 * 60 + 10).toString(16)]);

      // Finalize event
      await contract.finalizeEvent(0, true);

      // Try to make another prediction
      await expect(
        contract.connect(user2).makePrediction(0, false)
      ).to.be.revertedWith("Event has ended");
    });
  });

  describe("Event Finalization", function () {
    // Setup
    beforeEach(async function () {
      const duration = 30 * 24 * 60 * 60; // 30 days
      await contract.createEvent("Test Event", "Description", duration);
      await contract.connect(user1).makePrediction(0, true);
      await contract.connect(user2).makePrediction(0, false);
    });

    // ✅ Test: Owner can finalize event
    it("Should allow owner to finalize event after deadline", async function () {
      // Fast forward time past event end
      await ethers.provider.send("hardhat_mine", ["0x" + (30 * 24 * 60 * 60 + 10).toString(16)]);

      await expect(
        contract.finalizeEvent(0, true)
      ).to.emit(contract, "EventFinalized").withArgs(0, true);

      const eventData = await contract.getEvent(0);
      expect(eventData.isFinalized).to.equal(true);
      expect(eventData.actualOutcome).to.equal(true);
    });

    // ❌ Test: Cannot finalize before event ends
    it("Should prevent finalization before event deadline", async function () {
      await expect(
        contract.finalizeEvent(0, true)
      ).to.be.revertedWith("Event has not ended yet");
    });

    // ❌ Test: Cannot finalize already finalized event
    it("Should prevent double finalization", async function () {
      // Fast forward time
      await ethers.provider.send("hardhat_mine", ["0x" + (30 * 24 * 60 * 60 + 10).toString(16)]);

      await contract.finalizeEvent(0, true);

      await expect(
        contract.finalizeEvent(0, false)
      ).to.be.revertedWith("Event already finalized");
    });

    // ❌ Test: Non-owner cannot finalize
    it("Should prevent non-owner from finalizing event", async function () {
      // Fast forward time
      await ethers.provider.send("hardhat_mine", ["0x" + (30 * 24 * 60 * 60 + 10).toString(16)]);

      await expect(
        contract.connect(user1).finalizeEvent(0, true)
      ).to.be.revertedWith("Only owner can call this function");
    });
  });

  describe("Prediction Reveal & Verification", function () {
    // Setup
    beforeEach(async function () {
      const duration = 30 * 24 * 60 * 60; // 30 days
      await contract.createEvent("Test Event", "Description", duration);

      // User 1: predicts true
      // User 2: predicts false
      await contract.connect(user1).makePrediction(0, true);
      await contract.connect(user2).makePrediction(0, false);

      // Fast forward and finalize with true outcome
      await ethers.provider.send("hardhat_mine", ["0x" + (30 * 24 * 60 * 60 + 10).toString(16)]);
      await contract.finalizeEvent(0, true);
    });

    // ✅ Test: User can reveal correct prediction
    it("Should allow user to reveal correct prediction", async function () {
      await expect(
        contract.connect(user1).revealPrediction(0, true)
      ).to.emit(contract, "ResultRevealed").withArgs(0, user1.address, true, true);

      const [, , isRevealed, actualResult] = await contract.getUserPrediction(0, user1.address);
      expect(isRevealed).to.equal(true);
      expect(actualResult).to.equal(true);
    });

    // ✅ Test: User can reveal incorrect prediction
    it("Should allow user to reveal incorrect prediction", async function () {
      await expect(
        contract.connect(user2).revealPrediction(0, false)
      ).to.emit(contract, "ResultRevealed").withArgs(0, user2.address, false, false);

      const [, , isRevealed, actualResult] = await contract.getUserPrediction(0, user2.address);
      expect(isRevealed).to.equal(true);
      expect(actualResult).to.equal(false);
    });

    // ❌ Test: Cannot reveal before event finalization
    it("Should prevent revelation before event finalization", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.createEvent("Event 2", "Description", duration);
      await contract.connect(user1).makePrediction(1, true);

      await expect(
        contract.connect(user1).revealPrediction(1, true)
      ).to.be.revertedWith("Event not finalized yet");
    });

    // ❌ Test: Cannot double reveal
    it("Should prevent double revelation", async function () {
      await contract.connect(user1).revealPrediction(0, true);

      await expect(
        contract.connect(user1).revealPrediction(0, true)
      ).to.be.revertedWith("Already revealed");
    });

    // ❌ Test: Cannot reveal with mismatched value (commit-reveal scheme)
    it("Should reject reveal with wrong value (commit-reveal scheme)", async function () {
      // User1 predicted true, but tries to reveal as false
      await expect(
        contract.connect(user1).revealPrediction(0, false)
      ).to.be.revertedWith("Invalid reveal - guess doesn't match commitment");
    });

    // ❌ Test: User without prediction cannot reveal
    it("Should prevent reveal from user without prediction", async function () {
      await expect(
        contract.connect(user3).revealPrediction(0, true)
      ).to.be.revertedWith("No prediction found");
    });
  });

  describe("Data Integrity", function () {
    // ✅ Test: Event data is stored correctly
    it("Should store and retrieve complete event data", async function () {
      const title = "Bitcoin Milestone";
      const description = "Will it reach $100k?";
      const duration = 45 * 24 * 60 * 60;

      await contract.createEvent(title, description, duration);

      const event = await contract.getEvent(0);
      expect(event.title).to.equal(title);
      expect(event.description).to.equal(description);
      expect(event.totalPredictions).to.equal(0);
      expect(event.isFinalized).to.equal(false);
    });

    // ✅ Test: Prediction count is tracked correctly
    it("Should track prediction count accurately", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.createEvent("Event", "Description", duration);

      await contract.connect(user1).makePrediction(0, true);
      let event = await contract.getEvent(0);
      expect(event.totalPredictions).to.equal(1);

      await contract.connect(user2).makePrediction(0, false);
      event = await contract.getEvent(0);
      expect(event.totalPredictions).to.equal(2);

      await contract.connect(user3).makePrediction(0, true);
      event = await contract.getEvent(0);
      expect(event.totalPredictions).to.equal(3);
    });
  });

  describe("Access Control", function () {
    // ✅ Test: Verify ownership
    it("Should have correct owner", async function () {
      const contractOwner = await contract.owner();
      expect(contractOwner).to.equal(owner.address);
    });

    // ✅ Test: Only owner can finalize
    it("Should restrict finalization to owner", async function () {
      const duration = 1; // 1 second
      await contract.createEvent("Quick Event", "Fast", duration);

      // Fast forward time
      await ethers.provider.send("hardhat_mine", ["0x2"]);

      await expect(
        contract.connect(user1).finalizeEvent(0, true)
      ).to.be.revertedWith("Only owner can call this function");

      // Owner should be able to finalize
      await expect(
        contract.finalizeEvent(0, true)
      ).to.not.be.reverted;
    });
  });

  describe("Edge Cases", function () {
    // ✅ Test: Empty event predictions can be finalized
    it("Should handle event with no predictions", async function () {
      const duration = 1;
      await contract.createEvent("Empty Event", "No predictions", duration);

      // Fast forward
      await ethers.provider.send("hardhat_mine", ["0x2"]);

      // Should not revert
      await expect(
        contract.finalizeEvent(0, true)
      ).to.not.be.reverted;

      const predictors = await contract.getEventPredictors(0);
      expect(predictors.length).to.equal(0);
    });

    // ✅ Test: Get predictors list
    it("Should retrieve complete list of predictors", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.createEvent("Event", "Description", duration);

      await contract.connect(user1).makePrediction(0, true);
      await contract.connect(user2).makePrediction(0, false);
      await contract.connect(user3).makePrediction(0, true);

      const predictors = await contract.getEventPredictors(0);
      expect(predictors).to.have.lengthOf(3);
      expect(predictors).to.include(user1.address);
      expect(predictors).to.include(user2.address);
      expect(predictors).to.include(user3.address);
    });

    // ✅ Test: Very long event title and description
    it("Should handle long event titles and descriptions", async function () {
      const longTitle = "A".repeat(500);
      const longDescription = "B".repeat(1000);
      const duration = 30 * 24 * 60 * 60;

      await expect(
        contract.createEvent(longTitle, longDescription, duration)
      ).to.not.be.reverted;

      const event = await contract.getEvent(0);
      expect(event.title).to.equal(longTitle);
      expect(event.description).to.equal(longDescription);
    });

    // ✅ Test: Very short duration
    it("Should handle very short event duration", async function () {
      const duration = 1; // 1 second

      await expect(
        contract.createEvent("Quick Event", "Fast event", duration)
      ).to.not.be.reverted;

      const event = await contract.getEvent(0);
      expect(event.endTime).to.be.greaterThan(0);
    });

    // ✅ Test: Maximum predictors per event
    it("Should handle many predictors on single event", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.createEvent("Popular Event", "Many predictors", duration);

      const signers = await ethers.getSigners();
      const predictorCount = 10;

      for (let i = 0; i < predictorCount; i++) {
        await contract.connect(signers[i]).makePrediction(0, i % 2 === 0);
      }

      const predictors = await contract.getEventPredictors(0);
      expect(predictors.length).to.equal(predictorCount);

      const event = await contract.getEvent(0);
      expect(event.totalPredictions).to.equal(predictorCount);
    });

    // ✅ Test: Event ID boundary
    it("Should handle event ID zero correctly", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.createEvent("First Event", "Event zero", duration);

      const event = await contract.getEvent(0);
      expect(event.title).to.equal("First Event");
      expect(await contract.getTotalEvents()).to.equal(1);
    });

    // ✅ Test: Sequential event creation
    it("Should create sequential event IDs", async function () {
      const duration = 30 * 24 * 60 * 60;

      await contract.createEvent("Event 0", "First", duration);
      await contract.createEvent("Event 1", "Second", duration);
      await contract.createEvent("Event 2", "Third", duration);

      expect(await contract.getTotalEvents()).to.equal(3);

      const event0 = await contract.getEvent(0);
      const event1 = await contract.getEvent(1);
      const event2 = await contract.getEvent(2);

      expect(event0.title).to.equal("Event 0");
      expect(event1.title).to.equal("Event 1");
      expect(event2.title).to.equal("Event 2");
    });
  });

  describe("State Transitions", function () {
    // ✅ Test: Complete event lifecycle
    it("Should handle complete event lifecycle", async function () {
      const duration = 30 * 24 * 60 * 60;

      // Create event
      await contract.createEvent("Lifecycle Event", "Complete flow", duration);
      let event = await contract.getEvent(0);
      expect(event.isFinalized).to.equal(false);

      // Make predictions
      await contract.connect(user1).makePrediction(0, true);
      await contract.connect(user2).makePrediction(0, false);
      event = await contract.getEvent(0);
      expect(event.totalPredictions).to.equal(2);

      // Fast forward time
      await ethers.provider.send("hardhat_mine", ["0x" + (duration + 10).toString(16)]);

      // Finalize
      await contract.finalizeEvent(0, true);
      event = await contract.getEvent(0);
      expect(event.isFinalized).to.equal(true);
      expect(event.actualOutcome).to.equal(true);

      // Reveal predictions
      await contract.connect(user1).revealPrediction(0, true);
      const [, , isRevealed1, result1] = await contract.getUserPrediction(0, user1.address);
      expect(isRevealed1).to.equal(true);
      expect(result1).to.equal(true);

      await contract.connect(user2).revealPrediction(0, false);
      const [, , isRevealed2, result2] = await contract.getUserPrediction(0, user2.address);
      expect(isRevealed2).to.equal(true);
      expect(result2).to.equal(false);
    });

    // ✅ Test: Prediction states
    it("Should track prediction states correctly", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.createEvent("State Event", "Track states", duration);

      // Before prediction
      let [hasPrediction] = await contract.getUserPrediction(0, user1.address);
      expect(hasPrediction).to.equal(false);

      // After prediction
      await contract.connect(user1).makePrediction(0, true);
      [hasPrediction] = await contract.getUserPrediction(0, user1.address);
      expect(hasPrediction).to.equal(true);

      // After finalization
      await ethers.provider.send("hardhat_mine", ["0x" + (duration + 10).toString(16)]);
      await contract.finalizeEvent(0, true);

      // After reveal
      await contract.connect(user1).revealPrediction(0, true);
      const [, , isRevealed] = await contract.getUserPrediction(0, user1.address);
      expect(isRevealed).to.equal(true);
    });

    // ✅ Test: Multiple events independent states
    it("Should maintain independent states for multiple events", async function () {
      const duration = 30 * 24 * 60 * 60;

      // Create multiple events
      await contract.createEvent("Event 0", "First", duration);
      await contract.createEvent("Event 1", "Second", duration);

      // Make predictions on both
      await contract.connect(user1).makePrediction(0, true);
      await contract.connect(user1).makePrediction(1, false);

      // Verify independent states
      const [has0] = await contract.getUserPrediction(0, user1.address);
      const [has1] = await contract.getUserPrediction(1, user1.address);
      expect(has0).to.equal(true);
      expect(has1).to.equal(true);

      // Finalize only first event
      await ethers.provider.send("hardhat_mine", ["0x" + (duration + 10).toString(16)]);
      await contract.finalizeEvent(0, true);

      const event0 = await contract.getEvent(0);
      const event1 = await contract.getEvent(1);
      expect(event0.isFinalized).to.equal(true);
      expect(event1.isFinalized).to.equal(false);
    });
  });

  describe("Time-Based Behavior", function () {
    // ✅ Test: Cannot predict after event ends
    it("Should reject predictions after event deadline", async function () {
      const duration = 100; // 100 seconds
      await contract.createEvent("Timed Event", "Test timing", duration);

      // Fast forward past deadline
      await ethers.provider.send("hardhat_mine", ["0x" + (duration + 10).toString(16)]);

      // Should fail
      await expect(
        contract.connect(user1).makePrediction(0, true)
      ).to.be.revertedWith("Event has ended");
    });

    // ✅ Test: Can predict just before deadline
    it("Should allow prediction just before deadline", async function () {
      const duration = 1000;
      await contract.createEvent("Close Call", "Near deadline", duration);

      // Fast forward to just before deadline
      await ethers.provider.send("hardhat_mine", ["0x" + (duration - 5).toString(16)]);

      // Should succeed
      await expect(
        contract.connect(user1).makePrediction(0, true)
      ).to.not.be.reverted;
    });

    // ✅ Test: Event endTime is accurate
    it("Should set accurate event end time", async function () {
      const duration = 7 * 24 * 60 * 60; // 7 days
      const tx = await contract.createEvent("Week Event", "Seven days", duration);
      const receipt = await tx.wait();

      const blockNum = receipt!.blockNumber;
      const block = await ethers.provider.getBlock(blockNum);
      const creationTime = block!.timestamp;

      const event = await contract.getEvent(0);
      const expectedEndTime = BigInt(creationTime) + BigInt(duration);

      expect(event.endTime).to.equal(expectedEndTime);
    });

    // ✅ Test: Multiple events with different durations
    it("Should handle multiple events with different durations", async function () {
      await contract.createEvent("Short", "1 day", 1 * 24 * 60 * 60);
      await contract.createEvent("Medium", "7 days", 7 * 24 * 60 * 60);
      await contract.createEvent("Long", "30 days", 30 * 24 * 60 * 60);

      const event0 = await contract.getEvent(0);
      const event1 = await contract.getEvent(1);
      const event2 = await contract.getEvent(2);

      expect(event0.endTime).to.be.lessThan(event1.endTime);
      expect(event1.endTime).to.be.lessThan(event2.endTime);
    });
  });

  describe("Prediction Correctness Validation", function () {
    beforeEach(async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.createEvent("Test Event", "Correctness test", duration);
    });

    // ✅ Test: All correct predictions
    it("Should mark all predictions as correct when outcome matches", async function () {
      await contract.connect(user1).makePrediction(0, true);
      await contract.connect(user2).makePrediction(0, true);
      await contract.connect(user3).makePrediction(0, true);

      await ethers.provider.send("hardhat_mine", ["0x" + (30 * 24 * 60 * 60 + 10).toString(16)]);
      await contract.finalizeEvent(0, true);

      await contract.connect(user1).revealPrediction(0, true);
      await contract.connect(user2).revealPrediction(0, true);
      await contract.connect(user3).revealPrediction(0, true);

      const [, , , result1] = await contract.getUserPrediction(0, user1.address);
      const [, , , result2] = await contract.getUserPrediction(0, user2.address);
      const [, , , result3] = await contract.getUserPrediction(0, user3.address);

      expect(result1).to.equal(true);
      expect(result2).to.equal(true);
      expect(result3).to.equal(true);
    });

    // ✅ Test: All incorrect predictions
    it("Should mark all predictions as incorrect when outcome doesn't match", async function () {
      await contract.connect(user1).makePrediction(0, false);
      await contract.connect(user2).makePrediction(0, false);

      await ethers.provider.send("hardhat_mine", ["0x" + (30 * 24 * 60 * 60 + 10).toString(16)]);
      await contract.finalizeEvent(0, true);

      await contract.connect(user1).revealPrediction(0, false);
      await contract.connect(user2).revealPrediction(0, false);

      const [, , , result1] = await contract.getUserPrediction(0, user1.address);
      const [, , , result2] = await contract.getUserPrediction(0, user2.address);

      expect(result1).to.equal(false);
      expect(result2).to.equal(false);
    });

    // ✅ Test: Mixed correct and incorrect
    it("Should handle mixed correct and incorrect predictions", async function () {
      await contract.connect(user1).makePrediction(0, true);  // Correct
      await contract.connect(user2).makePrediction(0, false); // Incorrect
      await contract.connect(user3).makePrediction(0, true);  // Correct

      await ethers.provider.send("hardhat_mine", ["0x" + (30 * 24 * 60 * 60 + 10).toString(16)]);
      await contract.finalizeEvent(0, true);

      await contract.connect(user1).revealPrediction(0, true);
      await contract.connect(user2).revealPrediction(0, false);
      await contract.connect(user3).revealPrediction(0, true);

      const [, , , result1] = await contract.getUserPrediction(0, user1.address);
      const [, , , result2] = await contract.getUserPrediction(0, user2.address);
      const [, , , result3] = await contract.getUserPrediction(0, user3.address);

      expect(result1).to.equal(true);
      expect(result2).to.equal(false);
      expect(result3).to.equal(true);
    });
  });

  describe("Event Queries and Views", function () {
    // ✅ Test: Query multiple events
    it("Should query multiple events correctly", async function () {
      const duration = 30 * 24 * 60 * 60;

      for (let i = 0; i < 5; i++) {
        await contract.createEvent(`Event ${i}`, `Description ${i}`, duration);
      }

      expect(await contract.getTotalEvents()).to.equal(5);

      for (let i = 0; i < 5; i++) {
        const event = await contract.getEvent(i);
        expect(event.title).to.equal(`Event ${i}`);
        expect(event.description).to.equal(`Description ${i}`);
      }
    });

    // ✅ Test: Get predictors for event with no predictions
    it("Should return empty array for event with no predictions", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.createEvent("Empty", "No predictions", duration);

      const predictors = await contract.getEventPredictors(0);
      expect(predictors).to.be.an('array');
      expect(predictors.length).to.equal(0);
    });

    // ✅ Test: Get user prediction for non-participant
    it("Should return false for non-participant user", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.createEvent("Event", "Test", duration);

      const [hasPrediction, timestamp, isRevealed, result] =
        await contract.getUserPrediction(0, user1.address);

      expect(hasPrediction).to.equal(false);
      expect(timestamp).to.equal(0);
      expect(isRevealed).to.equal(false);
      expect(result).to.equal(false);
    });

    // ✅ Test: Event data immutability after creation
    it("Should keep event data immutable after creation", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.createEvent("Immutable", "Test immutability", duration);

      const eventBefore = await contract.getEvent(0);
      const titleBefore = eventBefore.title;
      const descriptionBefore = eventBefore.description;

      // Make predictions
      await contract.connect(user1).makePrediction(0, true);
      await contract.connect(user2).makePrediction(0, false);

      const eventAfter = await contract.getEvent(0);
      expect(eventAfter.title).to.equal(titleBefore);
      expect(eventAfter.description).to.equal(descriptionBefore);
    });
  });

  describe("Gas Optimization Tests", function () {
    // ✅ Test: Gas usage for event creation
    it("Should use reasonable gas for event creation", async function () {
      const duration = 30 * 24 * 60 * 60;
      const tx = await contract.createEvent("Gas Test", "Measure gas", duration);
      const receipt = await tx.wait();

      // Event creation should use less than 150k gas
      expect(receipt!.gasUsed).to.be.lessThan(150000);
    });

    // ✅ Test: Gas usage for prediction
    it("Should use reasonable gas for making prediction", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.createEvent("Gas Event", "Test", duration);

      const tx = await contract.connect(user1).makePrediction(0, true);
      const receipt = await tx.wait();

      // Prediction should use less than 120k gas
      expect(receipt!.gasUsed).to.be.lessThan(120000);
    });

    // ✅ Test: Gas usage comparison
    it("Should have predictable gas costs", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.createEvent("Gas Compare", "Compare", duration);

      const tx1 = await contract.connect(user1).makePrediction(0, true);
      const receipt1 = await tx1.wait();
      const gas1 = receipt1!.gasUsed;

      const tx2 = await contract.connect(user2).makePrediction(0, false);
      const receipt2 = await tx2.wait();
      const gas2 = receipt2!.gasUsed;

      // Gas should be similar (within 10%)
      const difference = gas1 > gas2 ? gas1 - gas2 : gas2 - gas1;
      const percentDiff = Number((difference * BigInt(100)) / gas1);
      expect(percentDiff).to.be.lessThan(10);
    });
  });

  describe("Security and Commit-Reveal Integrity", function () {
    // ✅ Test: Encrypted prediction uniqueness
    it("Should create unique encrypted predictions for different users", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.createEvent("Unique Test", "Test uniqueness", duration);

      await contract.connect(user1).makePrediction(0, true);
      await contract.connect(user2).makePrediction(0, true);

      // Even though both predict true, encrypted values should differ
      // (because they include msg.sender and timestamp)
      // We can't directly check the encrypted values, but we can verify
      // that both predictions were accepted independently
      const event = await contract.getEvent(0);
      expect(event.totalPredictions).to.equal(2);
    });

    // ✅ Test: Timestamp integrity
    it("Should record prediction timestamps correctly", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.createEvent("Timestamp Test", "Test timestamps", duration);

      const tx = await contract.connect(user1).makePrediction(0, true);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt!.blockNumber);

      const [, timestamp] = await contract.getUserPrediction(0, user1.address);
      expect(timestamp).to.equal(block!.timestamp);
    });

    // ✅ Test: Reveal must match commitment
    it("Should enforce commit-reveal integrity strictly", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.createEvent("Integrity Test", "Test commit-reveal", duration);

      // User predicts true
      await contract.connect(user1).makePrediction(0, true);

      // Finalize
      await ethers.provider.send("hardhat_mine", ["0x" + (duration + 10).toString(16)]);
      await contract.finalizeEvent(0, true);

      // Try to reveal false (should fail)
      await expect(
        contract.connect(user1).revealPrediction(0, false)
      ).to.be.revertedWith("Invalid reveal - guess doesn't match commitment");

      // Reveal true (should succeed)
      await expect(
        contract.connect(user1).revealPrediction(0, true)
      ).to.not.be.reverted;
    });
  });
});
