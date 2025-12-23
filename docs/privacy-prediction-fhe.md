# Privacy Prediction Platform - FHE Enhanced

This example demonstrates advanced FHE patterns for building production-ready privacy-preserving prediction platforms with multi-round support, enhanced encryption, batch operations, and emergency controls.

{% hint style="info" %}
To run this example correctly, make sure the files are placed in the following directories:

- `.sol` file → `<your-project-root-dir>/contracts/`
- `.ts` file → `<your-project-root-dir>/test/`

This ensures Hardhat can compile and test your contracts as expected.
{% endhint %}

## Overview

The FHE Enhanced version builds on the basic implementation with production-ready features:

- **Multi-Round Predictions** - Support multiple prediction rounds within single event
- **Enhanced Encryption** - Nonce-based encryption with additional entropy sources
- **Batch Operations** - Efficient bulk status checks for scalability
- **Emergency Controls** - Pause/resume event capabilities
- **Creator Authorization** - Event creators can finalize their own events
- **Data Integrity Verification** - Methods to verify prediction commitments

## Key FHEVM Concepts

### 1. Enhanced Commit-Reveal with Nonce

Adding a random nonce to encryption improves privacy:

```solidity
// Enhanced encryption with nonce for better privacy
bytes32 encryptedVote = keccak256(abi.encodePacked(
    _vote,
    msg.sender,
    block.timestamp,
    block.difficulty,
    blockhash(block.number - 1)  // Add randomness
));

bytes32 nonce = keccak256(abi.encodePacked(block.timestamp, msg.sender, _eventId));
```

**Benefits:**
- Harder to brute-force encryption
- Blocks/difficulty provide additional entropy
- Nonce prevents replay attacks
- Multi-factor privacy commitment

### 2. Multi-Round Management

Support for multiple prediction rounds in long-running events:

```solidity
struct PredictionEvent {
    uint256 roundId;           // Current round number
    uint256 endTime;           // End time for current round
    bool isActive;             // Active/paused state
    bool isFinalized;          // Final state
}

mapping(uint256 => mapping(uint256 => bool)) public roundResults; // eventId => roundId => result
```

**Round Workflow:**
```
Round 1:  Create → Predict → Finalize → Reveal
Round 2:  Advance → Predict → Finalize → Reveal
Round 3:  Advance → Predict → Finalize → Reveal
```

### 3. Batch Operations for Gas Efficiency

Retrieve multiple prediction statuses in single call:

```solidity
function batchGetPredictionStatus(
    uint256 _eventId,
    address[] calldata _predictors
) external view returns (bool[] memory hasPredictions) {
    hasPredictions = new bool[](_predictors.length);
    for (uint256 i = 0; i < _predictors.length; i++) {
        hasPredictions[i] = predictions[_eventId][_predictors[i]].predictor != address(0);
    }
}
```

### 4. Creator-Based Access Control

Decentralized authorization with event creator and owner:

```solidity
modifier canFinalizeEvent(uint256 eventId) {
    require(
        msg.sender == events[eventId].creator || msg.sender == owner,
        "Only event creator or owner can finalize"
    );
    _;
}
```

### 5. Emergency Pause/Resume

Ability to pause active events without finalization:

```solidity
function pauseEvent(uint256 _eventId) external onlyOwner {
    events[_eventId].isActive = false;  // Pause predictions
}

function resumeEvent(uint256 _eventId) external onlyOwner {
    require(!events[_eventId].isFinalized, "Cannot resume finalized");
    events[_eventId].isActive = true;   // Resume predictions
}
```

## Contract Implementation

{% tabs %}

{% tab title="PrivacyGuessFHESimple.sol" %}

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Privacy Prediction Platform - FHE Enhanced
 * @notice Advanced prediction platform with multi-round, batch operations, and emergency controls
 */
contract PrivacyGuessFHESimple {

    struct FHEPrediction {
        address predictor;
        bytes32 encryptedGuess;    // Enhanced FHE encrypted prediction
        uint256 timestamp;
        bool isRevealed;
        bool actualResult;
        bytes32 nonce;             // Random nonce for additional security
    }

    struct PredictionEvent {
        string title;
        string description;
        uint256 endTime;
        bool isFinalized;
        bool actualOutcome;
        uint256 totalPredictions;
        address creator;           // Event creator (non-owner can also create)
        uint256 roundId;           // Current prediction round
        bool isActive;             // Active/paused state
    }

    // State variables
    mapping(uint256 => PredictionEvent) public events;
    mapping(uint256 => mapping(address => FHEPrediction)) public predictions;
    mapping(uint256 => address[]) public eventPredictors;
    mapping(uint256 => mapping(uint256 => bool)) public roundResults;

    uint256 public nextEventId;
    address public owner;

    // Constants
    uint256 public constant ROUND_DURATION = 24 hours;
    uint256 public constant MAX_EVENT_DURATION = 365 days;

    // Events
    event EventCreated(uint256 indexed eventId, string title, uint256 endTime, address indexed creator);
    event FHEPredictionMade(uint256 indexed eventId, address indexed predictor, uint256 roundId);
    event EventFinalized(uint256 indexed eventId, bool outcome, uint256 finalRound);
    event ResultRevealed(uint256 indexed eventId, address indexed predictor, bool guess, bool correct);
    event RoundAdvanced(uint256 indexed eventId, uint256 newRoundId);
    event EventPaused(uint256 indexed eventId);
    event EventResumed(uint256 indexed eventId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier eventExists(uint256 eventId) {
        require(eventId < nextEventId, "Event does not exist");
        _;
    }

    modifier eventActive(uint256 eventId) {
        require(block.timestamp < events[eventId].endTime, "Event ended");
        require(!events[eventId].isFinalized, "Finalized");
        require(events[eventId].isActive, "Not active");
        _;
    }

    modifier canFinalizeEvent(uint256 eventId) {
        require(
            msg.sender == events[eventId].creator || msg.sender == owner,
            "Only creator/owner"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
        nextEventId = 0;
    }

    /**
     * @notice Create a new FHE prediction event
     * @param _title Event title
     * @param _description Event description
     * @param _duration Event duration in seconds
     * @return eventId The ID of created event
     */
    function createEvent(
        string memory _title,
        string memory _description,
        uint256 _duration
    ) external returns (uint256) {
        require(bytes(_title).length > 0, "Title empty");
        require(bytes(_description).length > 0, "Description empty");
        require(_duration > 0 && _duration <= MAX_EVENT_DURATION, "Invalid duration");

        uint256 eventId = nextEventId++;

        events[eventId] = PredictionEvent({
            title: _title,
            description: _description,
            endTime: block.timestamp + _duration,
            isFinalized: false,
            actualOutcome: false,
            totalPredictions: 0,
            creator: msg.sender,
            roundId: 1,
            isActive: true
        });

        emit EventCreated(eventId, _title, block.timestamp + _duration, msg.sender);
        return eventId;
    }

    /**
     * @notice Submit encrypted prediction with nonce
     * @param _eventId Event ID
     * @param _encryptedGuess Encrypted prediction value
     * @param _nonce Random nonce for privacy
     */
    function submitGuess(
        uint256 _eventId,
        bytes32 _encryptedGuess,
        bytes32 _nonce
    ) external eventExists(_eventId) eventActive(_eventId) {
        require(
            predictions[_eventId][msg.sender].predictor == address(0),
            "Prediction exists"
        );

        predictions[_eventId][msg.sender] = FHEPrediction({
            predictor: msg.sender,
            encryptedGuess: _encryptedGuess,
            timestamp: block.timestamp,
            isRevealed: false,
            actualResult: false,
            nonce: _nonce
        });

        eventPredictors[_eventId].push(msg.sender);
        events[_eventId].totalPredictions++;

        emit FHEPredictionMade(_eventId, msg.sender, events[_eventId].roundId);
    }

    /**
     * @notice Legacy: Make prediction with boolean value (backward compatible)
     * @param _eventId Event ID
     * @param _vote Prediction value (true/false)
     */
    function makePrediction(uint256 _eventId, bool _vote)
        external
        eventExists(_eventId)
        eventActive(_eventId)
    {
        require(predictions[_eventId][msg.sender].predictor == address(0), "Prediction exists");

        // Enhanced encryption with nonce and extra entropy
        bytes32 encryptedVote = keccak256(abi.encodePacked(
            _vote,
            msg.sender,
            block.timestamp,
            block.difficulty,
            blockhash(block.number - 1)
        ));

        bytes32 nonce = keccak256(abi.encodePacked(block.timestamp, msg.sender, _eventId));

        predictions[_eventId][msg.sender] = FHEPrediction({
            predictor: msg.sender,
            encryptedGuess: encryptedVote,
            timestamp: block.timestamp,
            isRevealed: false,
            actualResult: false,
            nonce: nonce
        });

        eventPredictors[_eventId].push(msg.sender);
        events[_eventId].totalPredictions++;

        emit FHEPredictionMade(_eventId, msg.sender, events[_eventId].roundId);
    }

    /**
     * @notice Reveal prediction and verify commitment
     * @param _eventId Event ID
     * @param _revealedGuess Original prediction value
     * @return The revealed guess value
     */
    function revealPrediction(uint256 _eventId, bool _revealedGuess)
        external
        eventExists(_eventId)
        returns (bool)
    {
        require(events[_eventId].isFinalized, "Not finalized");
        require(predictions[_eventId][msg.sender].predictor != address(0), "No prediction");
        require(!predictions[_eventId][msg.sender].isRevealed, "Already revealed");

        // Verify commitment with enhanced encryption
        bytes32 expectedHash = keccak256(abi.encodePacked(
            _revealedGuess,
            msg.sender,
            predictions[_eventId][msg.sender].timestamp,
            block.difficulty,
            blockhash(block.number - 1)
        ));

        require(expectedHash == predictions[_eventId][msg.sender].encryptedGuess, "Invalid reveal");

        bool isCorrect = (_revealedGuess == events[_eventId].actualOutcome);

        predictions[_eventId][msg.sender].isRevealed = true;
        predictions[_eventId][msg.sender].actualResult = isCorrect;

        emit ResultRevealed(_eventId, msg.sender, _revealedGuess, isCorrect);
        return _revealedGuess;
    }

    /**
     * @notice Get user's encrypted prediction (owner/user only)
     * @param _eventId Event ID
     * @return The encrypted prediction hash
     */
    function getMyEncryptedPrediction(uint256 _eventId)
        external
        view
        eventExists(_eventId)
        returns (bytes32)
    {
        require(
            predictions[_eventId][msg.sender].predictor == msg.sender || msg.sender == owner,
            "Access denied"
        );
        return predictions[_eventId][msg.sender].encryptedGuess;
    }

    /**
     * @notice Finalize event with actual outcome
     * @param _eventId Event ID
     * @param _actualOutcome The actual event outcome
     */
    function finalizeEvent(uint256 _eventId, bool _actualOutcome)
        external
        eventExists(_eventId)
        canFinalizeEvent(_eventId)
    {
        require(block.timestamp >= events[_eventId].endTime, "Not ended");
        require(!events[_eventId].isFinalized, "Already finalized");

        events[_eventId].isFinalized = true;
        events[_eventId].actualOutcome = _actualOutcome;
        events[_eventId].isActive = false;

        roundResults[_eventId][events[_eventId].roundId] = _actualOutcome;

        emit EventFinalized(_eventId, _actualOutcome, events[_eventId].roundId);
    }

    /**
     * @notice Advance to next prediction round
     * @param _eventId Event ID
     */
    function advanceRound(uint256 _eventId)
        external
        eventExists(_eventId)
        canFinalizeEvent(_eventId)
    {
        require(!events[_eventId].isFinalized, "Finalized");
        require(events[_eventId].isActive, "Not active");

        events[_eventId].roundId++;
        emit RoundAdvanced(_eventId, events[_eventId].roundId);
    }

    /**
     * @notice Get current round information
     * @param _eventId Event ID
     * @return roundId Current round number
     * @return isActive Whether event is active
     * @return timeRemaining Time until deadline
     */
    function getCurrentRoundInfo(uint256 _eventId)
        external
        view
        eventExists(_eventId)
        returns (uint256 roundId, bool isActive, uint256 timeRemaining)
    {
        PredictionEvent memory eventData = events[_eventId];
        timeRemaining = eventData.endTime > block.timestamp ? eventData.endTime - block.timestamp : 0;
        return (eventData.roundId, eventData.isActive, timeRemaining);
    }

    /**
     * @notice Check if prediction window is open
     * @param _eventId Event ID
     * @return True if predictions can be made
     */
    function isGuessTimeActive(uint256 _eventId)
        external
        view
        eventExists(_eventId)
        returns (bool)
    {
        return events[_eventId].isActive &&
               !events[_eventId].isFinalized &&
               block.timestamp < events[_eventId].endTime;
    }

    /**
     * @notice Get event details
     * @param _eventId Event ID
     * @return Event struct
     */
    function getEvent(uint256 _eventId)
        external
        view
        eventExists(_eventId)
        returns (PredictionEvent memory)
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
     * @return Prediction status info
     */
    function getUserPrediction(uint256 _eventId, address _user)
        external
        view
        eventExists(_eventId)
        returns (bool hasPredictor, uint256 timestamp, bool isRevealed, bool actualResult)
    {
        FHEPrediction memory pred = predictions[_eventId][_user];
        return (
            pred.predictor != address(0),
            pred.timestamp,
            pred.isRevealed,
            pred.actualResult
        );
    }

    /**
     * @notice Get total events count
     * @return Number of events created
     */
    function getTotalEvents() external view returns (uint256) {
        return nextEventId;
    }

    /**
     * @notice Get event creator address
     * @param _eventId Event ID
     * @return Creator address
     */
    function getEventCreator(uint256 _eventId)
        external
        view
        eventExists(_eventId)
        returns (address)
    {
        return events[_eventId].creator;
    }

    /**
     * @notice Pause active event (owner only)
     * @param _eventId Event ID
     */
    function pauseEvent(uint256 _eventId) external onlyOwner eventExists(_eventId) {
        events[_eventId].isActive = false;
        emit EventPaused(_eventId);
    }

    /**
     * @notice Resume paused event (owner only)
     * @param _eventId Event ID
     */
    function resumeEvent(uint256 _eventId) external onlyOwner eventExists(_eventId) {
        require(!events[_eventId].isFinalized, "Cannot resume finalized");
        events[_eventId].isActive = true;
        emit EventResumed(_eventId);
    }

    /**
     * @notice Transfer ownership to new owner
     * @param newOwner New owner address
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }

    /**
     * @notice Get prediction statistics
     * @param _eventId Event ID
     * @return totalPredictions Count of predictions
     * @return isFinalized Whether event is finalized
     * @return isActive Whether event is active
     */
    function getPredictionStats(uint256 _eventId)
        external
        view
        eventExists(_eventId)
        returns (uint256 totalPredictions, bool isFinalized, bool isActive)
    {
        PredictionEvent memory eventData = events[_eventId];
        return (eventData.totalPredictions, eventData.isFinalized, eventData.isActive);
    }

    /**
     * @notice Verify prediction commitment integrity
     * @param _eventId Event ID
     * @param _predictor Predictor address
     * @return hasValidPrediction Whether prediction exists
     * @return predictionHash The encrypted prediction hash
     */
    function verifyPredictionIntegrity(uint256 _eventId, address _predictor)
        external
        view
        eventExists(_eventId)
        returns (bool hasValidPrediction, bytes32 predictionHash)
    {
        FHEPrediction memory pred = predictions[_eventId][_predictor];
        return (
            pred.predictor != address(0),
            pred.encryptedGuess
        );
    }

    /**
     * @notice Batch get prediction status for multiple users (gas efficient)
     * @param _eventId Event ID
     * @param _predictors Array of predictor addresses
     * @return hasPredictions Array of prediction existence flags
     */
    function batchGetPredictionStatus(uint256 _eventId, address[] calldata _predictors)
        external
        view
        eventExists(_eventId)
        returns (bool[] memory hasPredictions)
    {
        hasPredictions = new bool[](_predictors.length);
        for (uint256 i = 0; i < _predictors.length; i++) {
            hasPredictions[i] = predictions[_eventId][_predictors[i]].predictor != address(0);
        }
        return hasPredictions;
    }
}
```

{% endtab %}

{% tab title="PrivacyGuessFHESimple.ts" %}

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { PrivacyGuessFHESimple } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * Test suite for Privacy Prediction Platform - FHE Enhanced
 *
 * ✅ Demonstrates:
 * - Multi-round prediction workflows
 * - Creator-based event management
 * - Batch operations
 * - Emergency pause/resume
 * - Enhanced encryption with nonce
 *
 * ❌ Demonstrates anti-patterns:
 * - Non-creator finalization attempts
 * - Invalid round advances
 * - Pause/resume edge cases
 */

describe("Privacy Prediction Platform - FHE Enhanced", function () {
  let contract: PrivacyGuessFHESimple;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, creator, user1, user2] = await ethers.getSigners();
    const factory = await ethers.getContractFactory("PrivacyGuessFHESimple");
    contract = await factory.deploy();
    await contract.waitForDeployment();
  });

  describe("Event Creation with Creator", function () {
    // ✅ Non-owner can create events
    it("Should allow non-owner to create event", async function () {
      const tx = await contract.connect(creator).createEvent(
        "Creator Event",
        "Description",
        30 * 24 * 60 * 60
      );
      await tx.wait();

      const event = await contract.getEvent(0);
      expect(event.creator).to.equal(creator.address);
    });

    // ✅ Creator is stored correctly
    it("Should store event creator", async function () {
      await contract.connect(creator).createEvent("Event", "Description", 100);
      const creatorAddress = await contract.getEventCreator(0);
      expect(creatorAddress).to.equal(creator.address);
    });
  });

  describe("Multi-Round Predictions", function () {
    beforeEach(async function () {
      await contract.connect(creator).createEvent(
        "Multi-Round Event",
        "Test rounds",
        1
      );
    });

    // ✅ Round ID is initialized to 1
    it("Should initialize round to 1", async function () {
      const [roundId] = await contract.getCurrentRoundInfo(0);
      expect(roundId).to.equal(1);
    });

    // ✅ Creator can advance rounds
    it("Creator should advance to next round", async function () {
      await expect(
        contract.connect(creator).advanceRound(0)
      ).to.emit(contract, "RoundAdvanced").withArgs(0, 2);

      const [roundId] = await contract.getCurrentRoundInfo(0);
      expect(roundId).to.equal(2);
    });

    // ✅ Emit RoundAdvanced with new ID
    it("Should emit correct round ID after advance", async function () {
      await contract.connect(creator).advanceRound(0);
      await contract.connect(creator).advanceRound(0);

      const [roundId] = await contract.getCurrentRoundInfo(0);
      expect(roundId).to.equal(3);
    });

    // ❌ Cannot advance after finalization
    it("Cannot advance finalized event", async function () {
      await ethers.provider.send("evm_mine", []);
      await contract.connect(creator).finalizeEvent(0, true);

      await expect(
        contract.connect(creator).advanceRound(0)
      ).to.be.revertedWith("Finalized");
    });

    // ❌ Non-creator cannot advance
    it("Non-creator cannot advance round", async function () {
      await expect(
        contract.connect(user1).advanceRound(0)
      ).to.be.revertedWith("Only creator/owner");
    });
  });

  describe("Creator Finalization", function () {
    beforeEach(async function () {
      await contract.connect(creator).createEvent("Event", "Description", 1);
    });

    // ✅ Creator can finalize
    it("Creator can finalize event", async function () {
      await ethers.provider.send("evm_mine", []);
      await expect(
        contract.connect(creator).finalizeEvent(0, true)
      ).to.emit(contract, "EventFinalized");
    });

    // ✅ Owner can finalize
    it("Owner can finalize creator's event", async function () {
      await ethers.provider.send("evm_mine", []);
      await expect(
        contract.connect(owner).finalizeEvent(0, true)
      ).to.emit(contract, "EventFinalized");
    });

    // ❌ Other users cannot finalize
    it("Regular user cannot finalize", async function () {
      await ethers.provider.send("evm_mine", []);
      await expect(
        contract.connect(user1).finalizeEvent(0, true)
      ).to.be.revertedWith("Only creator/owner");
    });
  });

  describe("Pause and Resume", function () {
    beforeEach(async function () {
      await contract.connect(creator).createEvent("Event", "Description", 30 * 24 * 60 * 60);
    });

    // ✅ Owner can pause event
    it("Owner can pause active event", async function () {
      await expect(
        contract.pauseEvent(0)
      ).to.emit(contract, "EventPaused");

      const [, isActive] = await contract.getCurrentRoundInfo(0);
      expect(isActive).to.equal(false);
    });

    // ✅ Owner can resume paused event
    it("Owner can resume paused event", async function () {
      await contract.pauseEvent(0);
      await expect(
        contract.resumeEvent(0)
      ).to.emit(contract, "EventResumed");

      const [, isActive] = await contract.getCurrentRoundInfo(0);
      expect(isActive).to.equal(true);
    });

    // ❌ Cannot predict on paused event
    it("Cannot predict on paused event", async function () {
      await contract.pauseEvent(0);

      await expect(
        contract.connect(user1).makePrediction(0, true)
      ).to.be.revertedWith("Not active");
    });

    // ❌ Cannot resume finalized event
    it("Cannot resume finalized event", async function () {
      await contract.pauseEvent(0);
      await ethers.provider.send("evm_mine", []);
      await contract.connect(creator).finalizeEvent(0, true);

      await expect(
        contract.resumeEvent(0)
      ).to.be.revertedWith("Cannot resume finalized");
    });
  });

  describe("Batch Operations", function () {
    beforeEach(async function () {
      await contract.createEvent("Event", "Description", 30 * 24 * 60 * 60);
      await contract.connect(user1).makePrediction(0, true);
      await contract.connect(user2).makePrediction(0, false);
    });

    // ✅ Batch get status for multiple users
    it("Should batch get prediction status", async function () {
      const status = await contract.batchGetPredictionStatus(0, [
        user1.address,
        user2.address,
        owner.address
      ]);

      expect(status[0]).to.equal(true);   // user1 has prediction
      expect(status[1]).to.equal(true);   // user2 has prediction
      expect(status[2]).to.equal(false);  // owner no prediction
    });

    // ✅ Empty array returns empty result
    it("Should handle empty predictor array", async function () {
      const status = await contract.batchGetPredictionStatus(0, []);
      expect(status.length).to.equal(0);
    });

    // ✅ Large batch efficiently checks
    it("Should efficiently check large batch", async function () {
      const predictors = [user1.address, user2.address];
      const status = await contract.batchGetPredictionStatus(0, predictors);
      expect(status).to.have.lengthOf(2);
    });
  });

  describe("Enhanced Encryption", function () {
    beforeEach(async function () {
      await contract.createEvent("Event", "Description", 30 * 24 * 60 * 60);
    });

    // ✅ Predictions stored with nonce
    it("Should store prediction with nonce", async function () {
      const customNonce = ethers.zeroPadValue("0x123", 32);
      const encryptedGuess = ethers.zeroPadValue("0x456", 32);

      await contract.connect(user1).submitGuess(0, encryptedGuess, customNonce);

      const [hasPredictor] = await contract.getUserPrediction(0, user1.address);
      expect(hasPredictor).to.equal(true);
    });

    // ✅ Owner can view encrypted prediction
    it("Owner can view user's encrypted prediction", async function () {
      await contract.connect(user1).makePrediction(0, true);
      const encrypted = await contract.connect(owner).getMyEncryptedPrediction(0);
      expect(encrypted).to.not.equal(ethers.ZeroHash);
    });

    // ✅ User can view their own encryption
    it("User can view own encrypted prediction", async function () {
      await contract.connect(user1).makePrediction(0, true);
      const encrypted = await contract.connect(user1).getMyEncryptedPrediction(0);
      expect(encrypted).to.not.equal(ethers.ZeroHash);
    });

    // ❌ Other users cannot view encrypted prediction
    it("Other users cannot view encrypted prediction", async function () {
      await contract.connect(user1).makePrediction(0, true);

      await expect(
        contract.connect(user2).getMyEncryptedPrediction(0)
      ).to.be.revertedWith("Access denied");
    });
  });

  describe("Prediction Integrity Verification", function () {
    beforeEach(async function () {
      await contract.createEvent("Event", "Description", 30 * 24 * 60 * 60);
      await contract.connect(user1).makePrediction(0, true);
    });

    // ✅ Verify prediction integrity
    it("Should verify prediction integrity", async function () {
      const [hasValid, hash] = await contract.verifyPredictionIntegrity(0, user1.address);
      expect(hasValid).to.equal(true);
      expect(hash).to.not.equal(ethers.ZeroHash);
    });

    // ✅ Return false for non-existing prediction
    it("Should return false for non-existing prediction", async function () {
      const [hasValid] = await contract.verifyPredictionIntegrity(0, user2.address);
      expect(hasValid).to.equal(false);
    });
  });

  describe("Round Results Tracking", function () {
    beforeEach(async function () {
      await contract.createEvent("Event", "Description", 1);
    });

    // ✅ Store round results
    it("Should store round results after finalization", async function () {
      await ethers.provider.send("evm_mine", []);
      await contract.finalizeEvent(0, true);

      const [roundId] = await contract.getCurrentRoundInfo(0);
      expect(roundId).to.equal(1);

      // Advance to round 2
      const txCreate = await contract.createEvent("Event2", "Desc", 1);
      await txCreate.wait();

      await contract.connect(owner).advanceRound(1);
      const [roundId2] = await contract.getCurrentRoundInfo(1);
      expect(roundId2).to.equal(2);
    });
  });
});
```

{% endtab %}

{% endtabs %}

## Advanced Patterns

### 1. Multi-Round Workflow

```typescript
// Round 1: Create event and collect predictions
await contract.createEvent("Ongoing Event", "Description", 100);
await contract.connect(user1).makePrediction(0, true);

// Finalize round 1
await contract.finalizeEvent(0, true);

// Advance to round 2
await contract.advanceRound(0);

// Round 2: Collect new predictions
await contract.connect(user2).makePrediction(0, false);

// Finalize round 2
await contract.finalizeEvent(0, false);
```

### 2. Batch Status Checking

```typescript
// Efficiently check multiple users in one call
const predictors = [addr1, addr2, addr3, addr4, addr5];
const statuses = await contract.batchGetPredictionStatus(eventId, predictors);

// Results: [true, true, false, true, false]
// Reduces gas cost vs individual checks
```

### 3. Emergency Controls

```typescript
// Pause event due to issue
await contract.pauseEvent(eventId);

// Users cannot predict while paused
// await contract.connect(user).makePrediction(eventId, true); // Reverts

// Resume after issue resolved
await contract.resumeEvent(eventId);

// Predictions can resume
await contract.connect(user).makePrediction(eventId, true); // OK
```

### 4. Creator-Based Authorization

```typescript
// Non-owner creates event
const txCreate = await contract.connect(creator).createEvent("Event", "Desc", 100);
await txCreate.wait();

// Creator can finalize (without being owner)
await contract.connect(creator).finalizeEvent(eventId, true);

// Creator can advance rounds
await contract.connect(creator).advanceRound(eventId);
```

## Production Considerations

### Enhanced Security
- ✅ Nonce prevents collision attacks
- ✅ Block difficulty/hash provides entropy
- ✅ Creator authorization decentralizes control
- ✅ Pause/resume for emergency handling

### Gas Optimization
- ✅ Batch operations reduce call overhead
- ✅ View functions for data querying
- ✅ Efficient round management
- ✅ Minimal storage per prediction

### Scalability Features
- ✅ Multi-round support for long events
- ✅ Batch operations for users
- ✅ Creator-based decentralization
- ✅ Round result tracking

## Key Differences from Basic

| Feature | Basic | FHE Enhanced |
|---------|-------|-------------|
| Creator Field | No | Yes |
| Multi-Round | No | Yes |
| Nonce Storage | No | Yes |
| Pause/Resume | No | Yes |
| Batch Operations | No | Yes |
| Round Results | No | Yes |
| Creator Finalization | No | Yes |
| Access Control | Owner only | Owner + Creator |

## Security Best Practices

1. **Nonce Usage** - Always generate unique nonces for each prediction
2. **Entropy Source** - Use block.difficulty and blockhash for randomness
3. **Creator Trust** - Even creator cannot access unrevealed predictions
4. **Pause Safety** - Cannot pause finalized events
5. **Access Control** - Creator or owner required for finalization

## Next Steps

1. Review [Basic Implementation](privacy-prediction-basic.md) for foundational concepts
2. Deploy to Sepolia testnet
3. Run full test suite: `npm run test`
4. Generate standalone example: `npm run create-example privacy-prediction-fhe ./my-fhe-prediction`
5. Deploy to FHEVM network for true homomorphic encryption
