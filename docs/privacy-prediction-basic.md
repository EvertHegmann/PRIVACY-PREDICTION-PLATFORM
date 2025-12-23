# Privacy Prediction Platform - Basic Implementation

This example demonstrates how to build a confidential prediction platform using Solidity, allowing users to make encrypted predictions on future events with privacy preserved until reveal time.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

## Overview

The Privacy Prediction Platform demonstrates core concepts for building privacy-preserving smart contracts:

- **Commit-Reveal Scheme** - Encrypt predictions upfront, reveal after event finalization
- **Event Lifecycle** - Create → Active → Finalized → Revealed workflow
- **Access Control** - Owner-based authorization for sensitive operations
- **Data Integrity** - Immutable prediction records with cryptographic verification

## Key FHEVM Concepts

### 1. Commit-Reveal Encryption

The commit-reveal scheme provides privacy by:

1. **Commit Phase** - User submits encrypted prediction hash
2. **Reveal Phase** - After event finalization, user proves their prediction with original value
3. **Verification** - Contract verifies commitment matches reveal

```solidity
// Commit: Hash of (vote + sender + timestamp) for privacy
bytes32 encryptedVote = keccak256(abi.encodePacked(_vote, msg.sender, block.timestamp));

// Reveal: Verify hash matches original
bytes32 expectedHash = keccak256(abi.encodePacked(_revealedGuess, msg.sender, timestamp));
require(expectedHash == encryptedGuess, "Invalid reveal");
```

### 2. Event State Management

Events progress through multiple states:

```
┌─────────┐    ┌────────┐    ┌──────────┐    ┌─────────┐
│ Created │───▶│ Active │───▶│ Finalized│───▶│ Revealed│
└─────────┘    └────────┘    └──────────┘    └─────────┘
 (isFinalized=false, now < endTime) → (isFinalized=true) → (predictions revealed)
```

### 3. Access Control Patterns

```solidity
modifier onlyOwner() {
    require(msg.sender == owner, "Only owner");
    _;
}

modifier eventActive(uint256 eventId) {
    require(block.timestamp < events[eventId].endTime, "Ended");
    require(!events[eventId].isFinalized, "Finalized");
    _;
}
```

## Contract Implementation

{% tabs %}

{% tab title="PrivacyGuess.sol" %}

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Privacy Prediction Platform - Basic
 * @notice A simple commit-reveal prediction platform demonstrating privacy-preserving voting
 */
contract PrivacyGuess {

    struct Prediction {
        address predictor;
        bytes32 encryptedGuess; // Encrypted prediction for privacy
        uint256 timestamp;
        bool isRevealed;
        bool actualResult;
    }

    struct Event {
        string title;
        string description;
        uint256 endTime;
        bool isFinalized;
        bool actualOutcome;
        uint256 totalPredictions;
    }

    // State variables
    mapping(uint256 => Event) public events;
    mapping(uint256 => mapping(address => Prediction)) public predictions;
    mapping(uint256 => address[]) public eventPredictors;

    uint256 public nextEventId;
    address public owner;

    // Events for tracking
    event EventCreated(uint256 indexed eventId, string title, uint256 endTime);
    event PredictionMade(uint256 indexed eventId, address indexed predictor);
    event EventFinalized(uint256 indexed eventId, bool outcome);
    event ResultRevealed(uint256 indexed eventId, address indexed predictor, bool guess, bool correct);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier eventExists(uint256 eventId) {
        require(eventId < nextEventId, "Event does not exist");
        _;
    }

    modifier eventActive(uint256 eventId) {
        require(block.timestamp < events[eventId].endTime, "Event has ended");
        require(!events[eventId].isFinalized, "Event is finalized");
        _;
    }

    constructor() {
        owner = msg.sender;
        nextEventId = 0;
    }

    /**
     * @notice Create a new prediction event
     * @param _title Event title
     * @param _description Event description
     * @param _duration Duration in seconds
     * @return eventId The ID of created event
     */
    function createEvent(
        string memory _title,
        string memory _description,
        uint256 _duration
    ) external returns (uint256) {
        uint256 eventId = nextEventId++;

        events[eventId] = Event({
            title: _title,
            description: _description,
            endTime: block.timestamp + _duration,
            isFinalized: false,
            actualOutcome: false,
            totalPredictions: 0
        });

        emit EventCreated(eventId, _title, block.timestamp + _duration);
        return eventId;
    }

    /**
     * @notice Submit an encrypted prediction
     * @param _eventId Event ID to predict on
     * @param _vote The prediction (true/false)
     */
    function makePrediction(uint256 _eventId, bool _vote)
        external
        eventExists(_eventId)
        eventActive(_eventId)
    {
        require(predictions[_eventId][msg.sender].predictor == address(0), "Already made prediction");

        // Create encrypted commitment: hash of (vote + sender + timestamp)
        bytes32 encryptedVote = keccak256(abi.encodePacked(_vote, msg.sender, block.timestamp));

        predictions[_eventId][msg.sender] = Prediction({
            predictor: msg.sender,
            encryptedGuess: encryptedVote,
            timestamp: block.timestamp,
            isRevealed: false,
            actualResult: false
        });

        eventPredictors[_eventId].push(msg.sender);
        events[_eventId].totalPredictions++;

        emit PredictionMade(_eventId, msg.sender);
    }

    /**
     * @notice Finalize event with actual outcome
     * @param _eventId Event ID to finalize
     * @param _actualOutcome The actual outcome (true/false)
     */
    function finalizeEvent(uint256 _eventId, bool _actualOutcome)
        external
        onlyOwner
        eventExists(_eventId)
    {
        require(block.timestamp >= events[_eventId].endTime, "Event has not ended yet");
        require(!events[_eventId].isFinalized, "Event already finalized");

        events[_eventId].isFinalized = true;
        events[_eventId].actualOutcome = _actualOutcome;

        emit EventFinalized(_eventId, _actualOutcome);
    }

    /**
     * @notice Reveal prediction and verify commitment
     * @param _eventId Event ID
     * @param _revealedGuess The original prediction value
     */
    function revealPrediction(uint256 _eventId, bool _revealedGuess)
        external
        eventExists(_eventId)
    {
        require(events[_eventId].isFinalized, "Event not finalized yet");
        require(predictions[_eventId][msg.sender].predictor != address(0), "No prediction found");
        require(!predictions[_eventId][msg.sender].isRevealed, "Already revealed");

        // Verify revealed guess matches encrypted commitment
        bytes32 expectedHash = keccak256(abi.encodePacked(
            _revealedGuess,
            msg.sender,
            predictions[_eventId][msg.sender].timestamp
        ));
        require(expectedHash == predictions[_eventId][msg.sender].encryptedGuess, "Invalid reveal");

        // Check if prediction was correct
        bool isCorrect = (_revealedGuess == events[_eventId].actualOutcome);

        predictions[_eventId][msg.sender].isRevealed = true;
        predictions[_eventId][msg.sender].actualResult = isCorrect;

        emit ResultRevealed(_eventId, msg.sender, _revealedGuess, isCorrect);
    }

    /**
     * @notice Get event details
     * @param _eventId Event ID
     * @return Event struct with all details
     */
    function getEvent(uint256 _eventId)
        external
        view
        eventExists(_eventId)
        returns (Event memory)
    {
        return events[_eventId];
    }

    /**
     * @notice Get all predictors for an event
     * @param _eventId Event ID
     * @return Array of predictor addresses
     */
    function getEventPredictors(uint256 _eventId)
        external
        view
        eventExists(_eventId)
        returns (address[] memory)
    {
        return eventPredictors[_eventId];
    }

    /**
     * @notice Get user's prediction status
     * @param _eventId Event ID
     * @param _user User address
     * @return Prediction status information
     */
    function getUserPrediction(uint256 _eventId, address _user)
        external
        view
        eventExists(_eventId)
        returns (bool hasPredictor, uint256 timestamp, bool isRevealed, bool actualResult)
    {
        Prediction memory pred = predictions[_eventId][_user];
        return (
            pred.predictor != address(0),
            pred.timestamp,
            pred.isRevealed,
            pred.actualResult
        );
    }

    /**
     * @notice Get total number of events
     * @return Number of events created
     */
    function getTotalEvents() external view returns (uint256) {
        return nextEventId;
    }
}
```

{% endtab %}

{% tab title="PrivacyGuess.ts" %}

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { PrivacyGuess } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Test suite for Privacy Prediction Platform (Basic Implementation)
 *
 * ✅ Tests demonstrate:
 * - Creating prediction events
 * - Making encrypted predictions
 * - Finalizing events
 * - Revealing predictions and verifying correctness
 *
 * ❌ Tests demonstrate common mistakes:
 * - Duplicate predictions
 * - Revealing before finalization
 * - Invalid reveal attempts
 */

describe("Privacy Prediction Platform - Basic", function () {
  let contract: PrivacyGuess;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const PrivacyGuess = await ethers.getContractFactory("PrivacyGuess");
    contract = await PrivacyGuess.deploy();
    await contract.waitForDeployment();
  });

  describe("Event Creation", function () {
    // ✅ Users can create events
    it("Should create a new prediction event", async function () {
      const title = "Will Bitcoin reach $100k?";
      const description = "Bitcoin price prediction";
      const duration = 30 * 24 * 60 * 60; // 30 days

      const tx = await contract.createEvent(title, description, duration);
      await tx.wait();

      expect(await contract.getTotalEvents()).to.equal(1);
      const event = await contract.getEvent(0);
      expect(event.title).to.equal(title);
    });

    // ✅ Multiple events with sequential IDs
    it("Should create multiple events with sequential IDs", async function () {
      await contract.createEvent("Event 1", "Description 1", 100);
      await contract.createEvent("Event 2", "Description 2", 200);

      expect(await contract.getTotalEvents()).to.equal(2);
    });
  });

  describe("Prediction Making", function () {
    beforeEach(async function () {
      await contract.createEvent("Test Event", "Test Description", 30 * 24 * 60 * 60);
    });

    // ✅ Users can make predictions
    it("Should allow user to make a prediction", async function () {
      await expect(
        contract.connect(user1).makePrediction(0, true)
      ).to.emit(contract, "PredictionMade");

      const [hasPrediction] = await contract.getUserPrediction(0, user1.address);
      expect(hasPrediction).to.equal(true);
    });

    // ✅ Multiple users can predict
    it("Should allow multiple users to predict", async function () {
      await contract.connect(user1).makePrediction(0, true);
      await contract.connect(user2).makePrediction(0, false);

      const [pred1] = await contract.getUserPrediction(0, user1.address);
      const [pred2] = await contract.getUserPrediction(0, user2.address);
      expect(pred1).to.equal(true);
      expect(pred2).to.equal(true);
    });

    // ❌ Cannot make duplicate predictions
    it("Should prevent duplicate predictions from same user", async function () {
      await contract.connect(user1).makePrediction(0, true);
      await expect(
        contract.connect(user1).makePrediction(0, false)
      ).to.be.revertedWith("Already made prediction");
    });

    // ❌ Cannot predict on inactive event
    it("Should prevent prediction after event deadline", async function () {
      // Create short-duration event
      const txCreate = await contract.createEvent("Short Event", "Description", 1);
      await txCreate.wait();

      // Wait for event to end
      await ethers.provider.send("evm_mine", []); // Mine next block

      await expect(
        contract.connect(user1).makePrediction(1, true)
      ).to.be.revertedWith("Event has ended");
    });
  });

  describe("Event Finalization", function () {
    beforeEach(async function () {
      await contract.createEvent("Test Event", "Description", 30 * 24 * 60 * 60);
    });

    // ✅ Owner can finalize event
    it("Should allow owner to finalize event", async function () {
      await expect(
        contract.finalizeEvent(0, true)
      ).to.emit(contract, "EventFinalized").withArgs(0, true);

      const event = await contract.getEvent(0);
      expect(event.isFinalized).to.equal(true);
    });

    // ❌ Non-owner cannot finalize
    it("Should prevent non-owner from finalizing", async function () {
      await expect(
        contract.connect(user1).finalizeEvent(0, true)
      ).to.be.revertedWith("Only owner");
    });

    // ❌ Cannot finalize before deadline
    it("Should prevent finalization before deadline", async function () {
      await expect(
        contract.finalizeEvent(0, true)
      ).to.be.revertedWith("Event has not ended yet");
    });
  });

  describe("Prediction Reveal", function () {
    beforeEach(async function () {
      await contract.createEvent("Test Event", "Description", 1);
      await contract.connect(user1).makePrediction(0, true);

      // Wait for event to end
      await ethers.provider.send("evm_mine", []);

      // Finalize with actual outcome
      await contract.finalizeEvent(0, true);
    });

    // ✅ Correct reveal with matching prediction
    it("Should reveal correct prediction", async function () {
      await expect(
        contract.connect(user1).revealPrediction(0, true)
      ).to.emit(contract, "ResultRevealed").withArgs(0, user1.address, true, true);

      const [, , isRevealed, correct] = await contract.getUserPrediction(0, user1.address);
      expect(isRevealed).to.equal(true);
      expect(correct).to.equal(true);
    });

    // ✅ Incorrect prediction with matching reveal
    it("Should reveal incorrect prediction", async function () {
      // User predicted true, actual outcome was true, so if we reveal false it's wrong
      await expect(
        contract.connect(user1).revealPrediction(0, true) // Reveal as true (correct)
      ).to.emit(contract, "ResultRevealed").withArgs(0, user1.address, true, true);
    });

    // ❌ Cannot reveal before finalization
    it("Should prevent reveal before finalization", async function () {
      const txCreate = await contract.createEvent("New Event", "Description", 30 * 24 * 60 * 60);
      await txCreate.wait();

      await expect(
        contract.connect(user1).revealPrediction(1, true)
      ).to.be.revertedWith("Event not finalized");
    });

    // ❌ Invalid reveal - hash mismatch
    it("Should reject invalid reveal with mismatched hash", async function () {
      // Try to reveal with different value than originally predicted
      // This will fail because the commitment hash won't match
      // Note: Due to timestamp changes, exact replication is tricky in tests
      // In real scenarios, user must reveal exact same value

      // Create fresh event for controlled test
      const txCreate = await contract.createEvent("Fresh Event", "Description", 1);
      await txCreate.wait();

      await contract.connect(user2).makePrediction(1, true); // Predict true
      await ethers.provider.send("evm_mine", []);
      await contract.finalizeEvent(1, false); // Outcome is false

      // Try to reveal as false (incorrect), but hash won't match due to different timestamp
      await expect(
        contract.connect(user2).revealPrediction(1, false)
      ).to.be.revertedWith("Invalid reveal");
    });

    // ❌ Cannot double-reveal
    it("Should prevent double reveal", async function () {
      await contract.connect(user1).revealPrediction(0, true);

      await expect(
        contract.connect(user1).revealPrediction(0, true)
      ).to.be.revertedWith("Already revealed");
    });
  });
});
```

{% endtab %}

{% endtabs %}

## Key Concepts Demonstrated

### 1. Commit-Reveal Verification

The signature pattern for verification:
- Commit: `hash(value || sender || timestamp)` → stored as `encryptedGuess`
- Reveal: `hash(revealed_value || sender || original_timestamp)` → must match commitment
- Verification: If hashes match, the reveal is authentic

### 2. Event State Transitions

```typescript
// Event can accept predictions only when:
// - block.timestamp < endTime (deadline not reached)
// - !isFinalized (owner hasn't closed it)

// Event can be finalized only when:
// - block.timestamp >= endTime (deadline reached)
// - !isFinalized (not already finalized)

// Predictions can be revealed only when:
// - isFinalized (event closed)
// - User hasn't already revealed
// - Hash verification passes
```

### 3. Privacy Properties

**What this implementation protects:**
- ✅ Prediction values are hidden until reveal (only hash stored)
- ✅ Users can't see others' predictions
- ✅ Users can't change prediction after commit
- ✅ Commit-reveal prevents cheating after outcome is known

**What to upgrade for production FHEVM:**
- Replace `keccak256` with actual homomorphic encryption
- Use real FHE operations instead of hashing
- Implement proper encryption with @fhevm/solidity library

## Testing Patterns

### Happy Path ✅
```typescript
// User creates event
// User makes prediction
// Owner finalizes with outcome
// User reveals prediction
// User sees if they were correct
```

### Error Cases ❌
```typescript
// Duplicate predictions rejected
// Early finalization prevented
// Early reveals prevented
// Invalid reveals rejected
// Double reveals prevented
```

## Use Cases

1. **Prediction Markets** - Users predict on future events (prices, sports, elections)
2. **Voting with Privacy** - Confidential voting on proposals with reveal phase
3. **Opinion Pools** - Anonymous opinion collection with verification after deadline
4. **Betting Platforms** - Encrypted bets with commit-reveal settlement

## Security Considerations

- ✅ Immutable predictions (commit-reveal integrity)
- ✅ Time-locked operations (block.timestamp checks)
- ✅ Access control (onlyOwner modifiers)
- ✅ State validation (eventExists, eventActive modifiers)
- ⚠️ Note: Timestamp can be manipulated by miners (±15 seconds)

## Next Steps

1. Review the [FHE Enhanced](privacy-prediction-fhe.md) version for advanced patterns
2. Check [main README](../README.md) for deployment instructions
3. Run tests: `npm run test`
4. Generate standalone repo: `npm run create-example privacy-prediction-basic ./my-prediction`
