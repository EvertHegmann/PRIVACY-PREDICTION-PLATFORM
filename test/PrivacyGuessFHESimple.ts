import { expect } from "chai";
import { ethers } from "hardhat";
import { PrivacyGuessFHESimple } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Test suite for Privacy Prediction Platform (FHE Enhanced Implementation)
 *
 * This test demonstrates:
 * - Creating multi-round prediction events
 * - Making encrypted predictions with FHE
 * - Managing prediction rounds
 * - Advanced privacy features
 * - Event pause/resume functionality
 * - Batch operations
 */

describe("Privacy Prediction Platform - FHE Enhanced", function () {
  let contract: PrivacyGuessFHESimple;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;
  let creator: SignerWithAddress;

  // ✅ Setup: Deploy contract before each test
  beforeEach(async function () {
    [owner, user1, user2, user3, creator] = await ethers.getSigners();

    const PrivacyGuessFHESimple = await ethers.getContractFactory("PrivacyGuessFHESimple");
    contract = await PrivacyGuessFHESimple.deploy();
    await contract.waitForDeployment();
  });

  describe("Event Creation", function () {
    // ✅ Test: Anyone can create events
    it("Should allow any user to create a prediction event", async function () {
      const title = "Will Bitcoin reach $100k?";
      const description = "Predict Bitcoin's price milestone in 2026";
      const duration = 30 * 24 * 60 * 60; // 30 days

      const tx = await contract.connect(creator).createEvent(title, description, duration);
      await tx.wait();

      expect(await contract.getTotalEvents()).to.equal(1);

      const eventData = await contract.getEvent(0);
      expect(eventData.title).to.equal(title);
      expect(eventData.creator).to.equal(creator.address);
      expect(eventData.isActive).to.equal(true);
    });

    // ❌ Test: Validation of event parameters
    it("Should reject event with empty title", async function () {
      const duration = 30 * 24 * 60 * 60;

      await expect(
        contract.createEvent("", "Description", duration)
      ).to.be.revertedWith("Title cannot be empty");
    });

    // ❌ Test: Validation of description
    it("Should reject event with empty description", async function () {
      const duration = 30 * 24 * 60 * 60;

      await expect(
        contract.createEvent("Title", "", duration)
      ).to.be.revertedWith("Description cannot be empty");
    });

    // ❌ Test: Validation of duration
    it("Should reject invalid duration", async function () {
      await expect(
        contract.createEvent("Title", "Description", 0)
      ).to.be.revertedWith("Invalid duration");

      const maxDuration = 365 * 24 * 60 * 60;
      await expect(
        contract.createEvent("Title", "Description", maxDuration + 1)
      ).to.be.revertedWith("Invalid duration");
    });

    // ✅ Test: Events start in round 1
    it("Should initialize new events in round 1", async function () {
      await contract.connect(creator).createEvent(
        "Event",
        "Description",
        30 * 24 * 60 * 60
      );

      const [roundId] = await contract.getCurrentRoundInfo(0);
      expect(roundId).to.equal(1);
    });
  });

  describe("FHE Prediction Making", function () {
    // Setup
    beforeEach(async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(creator).createEvent("Test Event", "Description", duration);
    });

    // ✅ Test: User can submit encrypted guess
    it("Should allow user to submit encrypted prediction", async function () {
      const encryptedGuess = ethers.id("my_secret_guess");
      const nonce = ethers.id("random_nonce");

      await expect(
        contract.connect(user1).submitGuess(0, encryptedGuess, nonce)
      ).to.emit(contract, "FHEPredictionMade");

      const [hasPrediction] = await contract.getUserPrediction(0, user1.address);
      expect(hasPrediction).to.equal(true);
    });

    // ✅ Test: Legacy makePrediction function works
    it("Should support legacy makePrediction function", async function () {
      await expect(
        contract.connect(user1).makePrediction(0, true)
      ).to.emit(contract, "FHEPredictionMade");

      const [hasPrediction] = await contract.getUserPrediction(0, user1.address);
      expect(hasPrediction).to.equal(true);
    });

    // ❌ Test: Prevent duplicate predictions per event
    it("Should prevent duplicate predictions", async function () {
      await contract.connect(user1).makePrediction(0, true);

      await expect(
        contract.connect(user1).makePrediction(0, false)
      ).to.be.revertedWith("Already made prediction for this event");
    });

    // ✅ Test: Multiple users can predict
    it("Should allow multiple users to predict", async function () {
      await contract.connect(user1).makePrediction(0, true);
      await contract.connect(user2).makePrediction(0, false);
      await contract.connect(user3).makePrediction(0, true);

      const predictors = await contract.getEventPredictors(0);
      expect(predictors).to.have.lengthOf(3);
    });

    // ❌ Test: Cannot predict on inactive event
    it("Should prevent prediction on paused event", async function () {
      await contract.connect(owner).pauseEvent(0);

      await expect(
        contract.connect(user1).makePrediction(0, true)
      ).to.be.revertedWith("Event is not active");
    });

    // ✅ Test: Retrieve encrypted prediction
    it("Should allow user to retrieve their encrypted prediction", async function () {
      const encryptedGuess = ethers.id("secret_guess");
      const nonce = ethers.id("random");

      await contract.connect(user1).submitGuess(0, encryptedGuess, nonce);

      const retrieved = await contract.connect(user1).getMyEncryptedPrediction(0);
      expect(retrieved).to.equal(encryptedGuess);
    });
  });

  describe("Multi-Round Management", function () {
    // Setup
    beforeEach(async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(creator).createEvent("Event", "Description", duration);
    });

    // ✅ Test: Get current round information
    it("Should return correct round information", async function () {
      const [roundId, isActive, timeRemaining] = await contract.getCurrentRoundInfo(0);

      expect(roundId).to.equal(1);
      expect(isActive).to.equal(true);
      expect(timeRemaining).to.be.greaterThan(0);
    });

    // ✅ Test: Creator can advance round
    it("Should allow event creator to advance round", async function () {
      await expect(
        contract.connect(creator).advanceRound(0)
      ).to.emit(contract, "RoundAdvanced").withArgs(0, 2);

      const [roundId] = await contract.getCurrentRoundInfo(0);
      expect(roundId).to.equal(2);
    });

    // ❌ Test: Non-creator cannot advance round
    it("Should prevent non-creator from advancing round", async function () {
      await expect(
        contract.connect(user1).advanceRound(0)
      ).to.be.revertedWith("Only event creator or owner can finalize");
    });

    // ❌ Test: Cannot advance finalized event
    it("Should prevent round advancement after finalization", async function () {
      // Fast forward and finalize
      await ethers.provider.send("hardhat_mine", ["0x" + (30 * 24 * 60 * 60 + 10).toString(16)]);
      await contract.connect(creator).finalizeEvent(0, true);

      await expect(
        contract.connect(creator).advanceRound(0)
      ).to.be.revertedWith("Event is finalized");
    });
  });

  describe("Event Finalization", function () {
    // Setup
    beforeEach(async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(creator).createEvent("Event", "Description", duration);
      await contract.connect(user1).makePrediction(0, true);
      await contract.connect(user2).makePrediction(0, false);
    });

    // ✅ Test: Creator can finalize
    it("Should allow event creator to finalize event", async function () {
      await ethers.provider.send("hardhat_mine", ["0x" + (30 * 24 * 60 * 60 + 10).toString(16)]);

      await expect(
        contract.connect(creator).finalizeEvent(0, true)
      ).to.emit(contract, "EventFinalized").withArgs(0, true, 1);

      const event = await contract.getEvent(0);
      expect(event.isFinalized).to.equal(true);
      expect(event.actualOutcome).to.equal(true);
      expect(event.isActive).to.equal(false);
    });

    // ✅ Test: Owner can finalize
    it("Should allow owner to finalize event", async function () {
      await ethers.provider.send("hardhat_mine", ["0x" + (30 * 24 * 60 * 60 + 10).toString(16)]);

      await expect(
        contract.connect(owner).finalizeEvent(0, false)
      ).to.not.be.reverted;
    });

    // ❌ Test: Cannot finalize before deadline
    it("Should prevent finalization before event deadline", async function () {
      await expect(
        contract.connect(creator).finalizeEvent(0, true)
      ).to.be.revertedWith("Event has not ended yet");
    });

    // ❌ Test: Cannot double finalize
    it("Should prevent double finalization", async function () {
      await ethers.provider.send("hardhat_mine", ["0x" + (30 * 24 * 60 * 60 + 10).toString(16)]);

      await contract.connect(creator).finalizeEvent(0, true);

      await expect(
        contract.connect(creator).finalizeEvent(0, false)
      ).to.be.revertedWith("Event already finalized");
    });

    // ❌ Test: Unauthorized finalization
    it("Should prevent non-creator/non-owner finalization", async function () {
      await ethers.provider.send("hardhat_mine", ["0x" + (30 * 24 * 60 * 60 + 10).toString(16)]);

      await expect(
        contract.connect(user1).finalizeEvent(0, true)
      ).to.be.revertedWith("Only event creator or owner can finalize");
    });
  });

  describe("Prediction Reveal & Verification", function () {
    // Setup
    beforeEach(async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(creator).createEvent("Event", "Description", duration);

      await contract.connect(user1).makePrediction(0, true);
      await contract.connect(user2).makePrediction(0, false);

      await ethers.provider.send("hardhat_mine", ["0x" + (30 * 24 * 60 * 60 + 10).toString(16)]);
      await contract.connect(creator).finalizeEvent(0, true);
    });

    // ✅ Test: User can reveal prediction
    it("Should allow user to reveal prediction", async function () {
      await expect(
        contract.connect(user1).revealPrediction(0, true)
      ).to.emit(contract, "ResultRevealed").withArgs(0, user1.address, true, true);

      const [, , isRevealed, actualResult] = await contract.getUserPrediction(0, user1.address);
      expect(isRevealed).to.equal(true);
      expect(actualResult).to.equal(true);
    });

    // ✅ Test: Verify prediction integrity
    it("Should verify prediction integrity", async function () {
      const [hasValid, predHash] = await contract.verifyPredictionIntegrity(0, user1.address);

      expect(hasValid).to.equal(true);
      expect(predHash).to.not.equal(ethers.ZeroHash);
    });

    // ❌ Test: Cannot reveal before finalization
    it("Should prevent reveal before finalization", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(creator).createEvent("Event2", "Desc", duration);
      await contract.connect(user1).makePrediction(1, true);

      await expect(
        contract.connect(user1).revealPrediction(1, true)
      ).to.be.revertedWith("Event not finalized yet");
    });

    // ❌ Test: Cannot reveal with wrong value
    it("Should reject reveal with wrong value", async function () {
      await expect(
        contract.connect(user1).revealPrediction(0, false)
      ).to.be.revertedWith("Invalid reveal - guess doesn't match commitment");
    });

    // ❌ Test: Cannot double reveal
    it("Should prevent double reveal", async function () {
      await contract.connect(user1).revealPrediction(0, true);

      await expect(
        contract.connect(user1).revealPrediction(0, true)
      ).to.be.revertedWith("Already revealed");
    });
  });

  describe("Event Pause & Resume", function () {
    // Setup
    beforeEach(async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(creator).createEvent("Event", "Description", duration);
    });

    // ✅ Test: Owner can pause event
    it("Should allow owner to pause event", async function () {
      await contract.connect(owner).pauseEvent(0);

      const [, isActive] = await contract.getCurrentRoundInfo(0);
      expect(isActive).to.equal(false);
    });

    // ✅ Test: Owner can resume event
    it("Should allow owner to resume event", async function () {
      await contract.connect(owner).pauseEvent(0);
      await contract.connect(owner).resumeEvent(0);

      const [, isActive] = await contract.getCurrentRoundInfo(0);
      expect(isActive).to.equal(true);
    });

    // ❌ Test: Cannot resume finalized event
    it("Should prevent resume of finalized event", async function () {
      await ethers.provider.send("hardhat_mine", ["0x" + (30 * 24 * 60 * 60 + 10).toString(16)]);
      await contract.connect(creator).finalizeEvent(0, true);

      await expect(
        contract.connect(owner).resumeEvent(0)
      ).to.be.revertedWith("Cannot resume finalized event");
    });

    // ❌ Test: Non-owner cannot pause
    it("Should prevent non-owner from pausing", async function () {
      await expect(
        contract.connect(user1).pauseEvent(0)
      ).to.be.revertedWith("Only owner can call this function");
    });
  });

  describe("Batch Operations", function () {
    // Setup
    beforeEach(async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(creator).createEvent("Event", "Description", duration);
      await contract.connect(user1).makePrediction(0, true);
      await contract.connect(user2).makePrediction(0, false);
    });

    // ✅ Test: Batch prediction status check
    it("Should check batch prediction status", async function () {
      const predictors = [user1.address, user2.address, user3.address];
      const statuses = await contract.batchGetPredictionStatus(0, predictors);

      expect(statuses[0]).to.equal(true); // user1 has prediction
      expect(statuses[1]).to.equal(true); // user2 has prediction
      expect(statuses[2]).to.equal(false); // user3 has no prediction
    });

    // ✅ Test: Get prediction stats
    it("Should return accurate prediction statistics", async function () {
      const [total, finalized, active] = await contract.getPredictionStats(0);

      expect(total).to.equal(2);
      expect(finalized).to.equal(false);
      expect(active).to.equal(true);
    });
  });

  describe("Access Control", function () {
    // ✅ Test: Ownership transfer
    it("Should allow owner to transfer ownership", async function () {
      await contract.connect(owner).transferOwnership(user1.address);

      // Try owner-only operation with new owner
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(user1).createEvent("Event", "Desc", duration);

      // Old owner should not be able to do owner operations
      await expect(
        contract.connect(owner).pauseEvent(0)
      ).to.be.revertedWith("Only owner can call this function");
    });

    // ❌ Test: Invalid ownership transfer
    it("Should reject transfer to zero address", async function () {
      await expect(
        contract.connect(owner).transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("New owner cannot be zero address");
    });

    // ❌ Test: Non-owner cannot transfer ownership
    it("Should prevent non-owner from transferring ownership", async function () {
      await expect(
        contract.connect(user1).transferOwnership(user2.address)
      ).to.be.revertedWith("Only owner can call this function");
    });
  });

  describe("Edge Cases & Data Integrity", function () {
    // ✅ Test: Get creator of event
    it("Should return correct event creator", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(creator).createEvent("Event", "Desc", duration);

      const eventCreator = await contract.getEventCreator(0);
      expect(eventCreator).to.equal(creator.address);
    });

    // ✅ Test: Check guess time active status
    it("Should correctly report guess time active status", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(creator).createEvent("Event", "Desc", duration);

      let isActive = await contract.isGuessTimeActive(0);
      expect(isActive).to.equal(true);

      // Fast forward past event end
      await ethers.provider.send("hardhat_mine", ["0x" + (30 * 24 * 60 * 60 + 10).toString(16)]);

      isActive = await contract.isGuessTimeActive(0);
      expect(isActive).to.equal(false);
    });

    // ✅ Test: Handle events with no predictions
    it("Should handle event with no predictions", async function () {
      const duration = 1;
      await contract.connect(creator).createEvent("Empty", "Empty", duration);

      await ethers.provider.send("hardhat_mine", ["0x2"]);

      await expect(
        contract.connect(creator).finalizeEvent(0, true)
      ).to.not.be.reverted;

      const predictors = await contract.getEventPredictors(0);
      expect(predictors.length).to.equal(0);
    });

    // ✅ Test: Very long strings handling
    it("Should handle very long event strings", async function () {
      const longTitle = "T".repeat(1000);
      const longDesc = "D".repeat(2000);
      const duration = 30 * 24 * 60 * 60;

      await expect(
        contract.connect(creator).createEvent(longTitle, longDesc, duration)
      ).to.not.be.reverted;

      const event = await contract.getEvent(0);
      expect(event.title.length).to.equal(1000);
      expect(event.description.length).to.equal(2000);
    });

    // ✅ Test: Multiple rounds per event
    it("Should track round progression correctly", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(creator).createEvent("Multi-Round", "Test rounds", duration);

      const [initialRound] = await contract.getCurrentRoundInfo(0);
      expect(initialRound).to.equal(1);

      await contract.connect(creator).advanceRound(0);
      const [round2] = await contract.getCurrentRoundInfo(0);
      expect(round2).to.equal(2);

      await contract.connect(creator).advanceRound(0);
      const [round3] = await contract.getCurrentRoundInfo(0);
      expect(round3).to.equal(3);
    });

    // ✅ Test: Maximum duration boundary
    it("Should respect maximum event duration", async function () {
      const maxDuration = 365 * 24 * 60 * 60;

      // At max should work
      await expect(
        contract.connect(creator).createEvent("Max Duration", "365 days", maxDuration)
      ).to.not.be.reverted;

      // Above max should fail
      await expect(
        contract.connect(creator).createEvent("Too Long", "Over 365", maxDuration + 1)
      ).to.be.revertedWith("Invalid duration");
    });

    // ✅ Test: Minimum duration boundary
    it("Should reject zero duration", async function () {
      await expect(
        contract.connect(creator).createEvent("Zero Duration", "Invalid", 0)
      ).to.be.revertedWith("Invalid duration");
    });
  });

  describe("Comprehensive Integration Tests", function () {
    // ✅ Test: Full lifecycle with multiple users and rounds
    it("Should handle complete multi-round lifecycle", async function () {
      const duration = 30 * 24 * 60 * 60;

      // Create event
      await contract.connect(creator).createEvent("Complex Event", "Multi-round test", duration);

      // Round 1: Users make predictions
      await contract.connect(user1).makePrediction(0, true);
      await contract.connect(user2).makePrediction(0, false);

      const [round1] = await contract.getCurrentRoundInfo(0);
      expect(round1).to.equal(1);

      // Advance to round 2
      await contract.connect(creator).advanceRound(0);
      const [round2] = await contract.getCurrentRoundInfo(0);
      expect(round2).to.equal(2);

      // More predictions in round 2 (should fail - already predicted)
      await expect(
        contract.connect(user1).makePrediction(0, false)
      ).to.be.revertedWith("Already made prediction for this event");

      // Fast forward and finalize
      await ethers.provider.send("hardhat_mine", ["0x" + (duration + 10).toString(16)]);
      await contract.connect(creator).finalizeEvent(0, true);

      // Verify finalization
      const event = await contract.getEvent(0);
      expect(event.isFinalized).to.equal(true);
      expect(event.roundId).to.equal(2);

      // Reveal predictions
      await contract.connect(user1).revealPrediction(0, true);
      await contract.connect(user2).revealPrediction(0, false);

      const [, , , result1] = await contract.getUserPrediction(0, user1.address);
      const [, , , result2] = await contract.getUserPrediction(0, user2.address);

      expect(result1).to.equal(true);  // Correct
      expect(result2).to.equal(false); // Incorrect
    });

    // ✅ Test: Multiple simultaneous events
    it("Should manage multiple concurrent events independently", async function () {
      const duration = 30 * 24 * 60 * 60;

      // Create 3 events
      await contract.connect(creator).createEvent("Event A", "First event", duration);
      await contract.connect(user1).createEvent("Event B", "Second event", duration);
      await contract.connect(user2).createEvent("Event C", "Third event", duration);

      expect(await contract.getTotalEvents()).to.equal(3);

      // Different users predict on different events
      await contract.connect(user1).makePrediction(0, true);
      await contract.connect(user1).makePrediction(1, false);
      await contract.connect(user2).makePrediction(0, false);
      await contract.connect(user2).makePrediction(2, true);

      // Verify independent states
      const [total0] = await contract.getPredictionStats(0);
      const [total1] = await contract.getPredictionStats(1);
      const [total2] = await contract.getPredictionStats(2);

      expect(total0).to.equal(2);
      expect(total1).to.equal(1);
      expect(total2).to.equal(1);

      // Different creators can finalize their own events
      await ethers.provider.send("hardhat_mine", ["0x" + (duration + 10).toString(16)]);

      await contract.connect(creator).finalizeEvent(0, true);
      await contract.connect(user1).finalizeEvent(1, false);
      await contract.connect(user2).finalizeEvent(2, true);

      // Verify all finalized correctly
      const event0 = await contract.getEvent(0);
      const event1 = await contract.getEvent(1);
      const event2 = await contract.getEvent(2);

      expect(event0.isFinalized).to.equal(true);
      expect(event1.isFinalized).to.equal(true);
      expect(event2.isFinalized).to.equal(true);

      expect(event0.actualOutcome).to.equal(true);
      expect(event1.actualOutcome).to.equal(false);
      expect(event2.actualOutcome).to.equal(true);
    });

    // ✅ Test: Pause, predict, resume workflow
    it("Should handle pause/resume workflow correctly", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(creator).createEvent("Pausable Event", "Test pause", duration);

      // Normal prediction works
      await contract.connect(user1).makePrediction(0, true);

      // Pause event
      await contract.connect(owner).pauseEvent(0);

      // Prediction should fail when paused
      await expect(
        contract.connect(user2).makePrediction(0, false)
      ).to.be.revertedWith("Event is not active");

      // Resume event
      await contract.connect(owner).resumeEvent(0);

      // Prediction should work again
      await expect(
        contract.connect(user2).makePrediction(0, false)
      ).to.not.be.reverted;

      const event = await contract.getEvent(0);
      expect(event.totalPredictions).to.equal(2);
    });
  });

  describe("Advanced State Management", function () {
    // ✅ Test: State consistency after operations
    it("Should maintain state consistency across operations", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(creator).createEvent("State Test", "Consistency", duration);

      // Check initial state
      const [round1, active1, time1] = await contract.getCurrentRoundInfo(0);
      expect(round1).to.equal(1);
      expect(active1).to.equal(true);
      expect(time1).to.be.greaterThan(0);

      // Make prediction
      await contract.connect(user1).makePrediction(0, true);

      // State should remain consistent
      const [round2, active2, time2] = await contract.getCurrentRoundInfo(0);
      expect(round2).to.equal(1);
      expect(active2).to.equal(true);
      expect(time2).to.be.greaterThan(0);

      // Advance round
      await contract.connect(creator).advanceRound(0);

      // Round should increment
      const [round3, active3] = await contract.getCurrentRoundInfo(0);
      expect(round3).to.equal(2);
      expect(active3).to.equal(true);
    });

    // ✅ Test: Batch operation consistency
    it("Should return consistent batch operation results", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(creator).createEvent("Batch Test", "Test batch", duration);

      // Make predictions
      await contract.connect(user1).makePrediction(0, true);
      await contract.connect(user3).makePrediction(0, false);

      // Batch check should be accurate
      const addresses = [user1.address, user2.address, user3.address];
      const statuses = await contract.batchGetPredictionStatus(0, addresses);

      expect(statuses[0]).to.equal(true);  // user1 has prediction
      expect(statuses[1]).to.equal(false); // user2 no prediction
      expect(statuses[2]).to.equal(true);  // user3 has prediction
    });

    // ✅ Test: Encrypted prediction integrity
    it("Should maintain encrypted prediction integrity", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(creator).createEvent("Encryption Test", "Test encryption", duration);

      // Submit encrypted guess
      const encryptedGuess = ethers.id("super_secret_prediction");
      const nonce = ethers.id("random_nonce_value");

      await contract.connect(user1).submitGuess(0, encryptedGuess, nonce);

      // Verify prediction was recorded
      const [hasValid, predHash] = await contract.verifyPredictionIntegrity(0, user1.address);
      expect(hasValid).to.equal(true);
      expect(predHash).to.equal(encryptedGuess);
    });
  });

  describe("Gas Optimization and Performance", function () {
    // ✅ Test: Event creation gas cost
    it("Should create events with reasonable gas", async function () {
      const duration = 30 * 24 * 60 * 60;
      const tx = await contract.connect(creator).createEvent("Gas Test", "Measure gas", duration);
      const receipt = await tx.wait();

      // Should use less than 200k gas for enhanced version
      expect(receipt!.gasUsed).to.be.lessThan(200000);
    });

    // ✅ Test: Prediction gas cost
    it("Should make predictions with reasonable gas", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(creator).createEvent("Gas Event", "Test", duration);

      const tx = await contract.connect(user1).makePrediction(0, true);
      const receipt = await tx.wait();

      // Should use less than 150k gas
      expect(receipt!.gasUsed).to.be.lessThan(150000);
    });

    // ✅ Test: Batch operation efficiency
    it("Should perform batch operations efficiently", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(creator).createEvent("Batch Gas", "Test batch", duration);

      // Make multiple predictions
      const signers = await ethers.getSigners();
      for (let i = 0; i < 5; i++) {
        await contract.connect(signers[i]).makePrediction(0, i % 2 === 0);
      }

      // Batch operation should be more efficient than individual queries
      const addresses = signers.slice(0, 5).map(s => s.address);
      const tx = await contract.batchGetPredictionStatus(0, addresses);

      // Gas for batch should be reasonable
      // (actual execution doesn't consume gas for view functions, but we test it compiles)
      expect(tx).to.be.an('array');
      expect(tx.length).to.equal(5);
    });

    // ✅ Test: Round advancement gas
    it("Should advance rounds with reasonable gas", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(creator).createEvent("Round Gas", "Test rounds", duration);

      const tx = await contract.connect(creator).advanceRound(0);
      const receipt = await tx.wait();

      // Round advancement should be cheap
      expect(receipt!.gasUsed).to.be.lessThan(50000);
    });
  });

  describe("Authorization and Permission Edge Cases", function () {
    // ✅ Test: Non-owner cannot pause
    it("Should prevent non-owner from pausing event", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(creator).createEvent("Auth Test", "Test auth", duration);

      await expect(
        contract.connect(user1).pauseEvent(0)
      ).to.be.revertedWith("Only owner can call this function");
    });

    // ✅ Test: Only creator or owner can finalize
    it("Should allow only creator or owner to finalize", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(creator).createEvent("Finalize Test", "Auth test", duration);

      await ethers.provider.send("hardhat_mine", ["0x" + (duration + 10).toString(16)]);

      // Random user cannot finalize
      await expect(
        contract.connect(user3).finalizeEvent(0, true)
      ).to.be.revertedWith("Only event creator or owner can finalize");

      // Creator can finalize
      await expect(
        contract.connect(creator).finalizeEvent(0, true)
      ).to.not.be.reverted;
    });

    // ✅ Test: Owner override for finalization
    it("Should allow owner to finalize any event", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(user1).createEvent("Owner Override", "Test override", duration);

      await ethers.provider.send("hardhat_mine", ["0x" + (duration + 10).toString(16)]);

      // Owner can finalize even though not creator
      await expect(
        contract.connect(owner).finalizeEvent(0, true)
      ).to.not.be.reverted;
    });

    // ✅ Test: Non-owner/creator cannot advance round
    it("Should prevent unauthorized round advancement", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(creator).createEvent("Round Auth", "Test round auth", duration);

      await expect(
        contract.connect(user2).advanceRound(0)
      ).to.be.revertedWith("Only event creator or owner can finalize");
    });
  });

  describe("Prediction Revelation Edge Cases", function () {
    beforeEach(async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(creator).createEvent("Reveal Test", "Test reveal", duration);
      await contract.connect(user1).makePrediction(0, true);
      await ethers.provider.send("hardhat_mine", ["0x" + (duration + 10).toString(16)]);
      await contract.connect(creator).finalizeEvent(0, true);
    });

    // ✅ Test: Successful reveal returns correct value
    it("Should return revealed prediction value", async function () {
      const tx = await contract.connect(user1).revealPrediction(0, true);
      await tx.wait();

      const [, , isRevealed, result] = await contract.getUserPrediction(0, user1.address);
      expect(isRevealed).to.equal(true);
      expect(result).to.equal(true);
    });

    // ✅ Test: Cannot reveal twice
    it("Should prevent double revelation", async function () {
      await contract.connect(user1).revealPrediction(0, true);

      await expect(
        contract.connect(user1).revealPrediction(0, true)
      ).to.be.revertedWith("Already revealed");
    });

    // ✅ Test: Reveal updates state immediately
    it("Should update state immediately upon reveal", async function () {
      // Before reveal
      const [, , before] = await contract.getUserPrediction(0, user1.address);
      expect(before).to.equal(false);

      // Reveal
      await contract.connect(user1).revealPrediction(0, true);

      // After reveal
      const [, , after] = await contract.getUserPrediction(0, user1.address);
      expect(after).to.equal(true);
    });
  });

  describe("Complex Scenario Testing", function () {
    // ✅ Test: Large-scale event with many predictors
    it("Should handle event with many predictors", async function () {
      const duration = 30 * 24 * 60 * 60;
      await contract.connect(creator).createEvent("Large Event", "Many users", duration);

      const signers = await ethers.getSigners();
      const count = Math.min(15, signers.length);

      // Many users make predictions
      for (let i = 0; i < count; i++) {
        await contract.connect(signers[i]).makePrediction(0, i % 2 === 0);
      }

      const event = await contract.getEvent(0);
      expect(event.totalPredictions).to.equal(count);

      const predictors = await contract.getEventPredictors(0);
      expect(predictors.length).to.equal(count);
    });

    // ✅ Test: Sequential event processing
    it("Should process multiple events sequentially", async function () {
      const duration = 1000;

      // Create and finalize multiple events in sequence
      for (let i = 0; i < 3; i++) {
        await contract.connect(creator).createEvent(`Event ${i}`, `Desc ${i}`, duration);
        await contract.connect(user1).makePrediction(i, true);

        await ethers.provider.send("hardhat_mine", ["0x" + (duration + 10).toString(16)]);
        await contract.connect(creator).finalizeEvent(i, i % 2 === 0);
      }

      expect(await contract.getTotalEvents()).to.equal(3);

      // Verify all events finalized correctly
      for (let i = 0; i < 3; i++) {
        const event = await contract.getEvent(i);
        expect(event.isFinalized).to.equal(true);
        expect(event.actualOutcome).to.equal(i % 2 === 0);
      }
    });

    // ✅ Test: Interleaved operations on multiple events
    it("Should handle interleaved operations correctly", async function () {
      const duration = 30 * 24 * 60 * 60;

      // Create multiple events
      await contract.connect(creator).createEvent("Event 0", "First", duration);
      await contract.connect(creator).createEvent("Event 1", "Second", duration);

      // Interleave predictions
      await contract.connect(user1).makePrediction(0, true);
      await contract.connect(user1).makePrediction(1, false);
      await contract.connect(user2).makePrediction(0, false);
      await contract.connect(user2).makePrediction(1, true);

      // Interleave finalizations
      await ethers.provider.send("hardhat_mine", ["0x" + (duration + 10).toString(16)]);
      await contract.connect(creator).finalizeEvent(0, true);
      await contract.connect(creator).finalizeEvent(1, false);

      // Interleave reveals
      await contract.connect(user1).revealPrediction(0, true);
      await contract.connect(user2).revealPrediction(1, true);

      // Verify correct outcomes
      const [, , , result1_0] = await contract.getUserPrediction(0, user1.address);
      const [, , , result2_1] = await contract.getUserPrediction(1, user2.address);

      expect(result1_0).to.equal(true);  // user1 correct on event 0
      expect(result2_1).to.equal(true);  // user2 correct on event 1
    });
  });
});
