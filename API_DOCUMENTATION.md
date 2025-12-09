# API Documentation

## Overview

The Privacy Prediction Platform provides comprehensive smart contract APIs for creating encrypted prediction events, managing user predictions, and revealing results through a secure commit-reveal scheme. This document details all functions, events, and data structures for both contract implementations.

## Table of Contents

1. [PrivacyGuess.sol API](#privacyguess-api)
2. [PrivacyGuessFHESimple.sol API](#privacyguesssfhesimple-api)
3. [Common Patterns](#common-patterns)
4. [Error Handling](#error-handling)
5. [Gas Considerations](#gas-considerations)
6. [Security Notes](#security-notes)

---

## PrivacyGuess API

### Core Concepts

The PrivacyGuess contract implements a basic privacy-preserving prediction platform with:
- Binary (yes/no) predictions
- Commit-reveal encryption scheme
- Owner-based event management
- Result verification through cryptographic hashing

### Data Structures

#### Event Struct

```solidity
struct Event {
    string title;           // Event title
    string description;     // Event description
    uint256 endTime;        // Event deadline (timestamp)
    bool isFinalized;       // Whether event is finalized
    bool actualOutcome;     // Actual event outcome (true/false)
    uint256 totalPredictions; // Count of predictions made
}
```

#### Prediction Struct

```solidity
struct Prediction {
    address predictor;      // Address of predictor
    bytes32 encryptedGuess; // Hashed encrypted prediction
    uint256 timestamp;      // Time prediction was made
    bool isRevealed;        // Whether prediction is revealed
    bool actualResult;      // Whether prediction was correct
}
```

### Functions

#### `createEvent(string _title, string _description, uint256 _duration) → uint256`

**Purpose:** Create a new prediction event

**Parameters:**
- `_title` (string) - Event title (non-empty)
- `_description` (string) - Event description (non-empty)
- `_duration` (uint256) - Event duration in seconds

**Returns:**
- `eventId` (uint256) - ID of created event (starts from 0)

**Access:** Public - Anyone can call

**Events Emitted:**
```solidity
EventCreated(uint256 indexed eventId, string title, uint256 endTime)
```

**Example:**
```solidity
// Create a 7-day event
uint256 eventId = contract.createEvent(
    "Bitcoin Price Prediction",
    "Will BTC reach $50,000 by end of month?",
    7 * 24 * 60 * 60  // 7 days in seconds
);
```

**Gas Cost:** ~90-110k gas (typical)

**Notes:**
- Event ID is automatically assigned (sequential from 0)
- endTime is calculated as block.timestamp + _duration
- Multiple events can be created and tracked independently

---

#### `makePrediction(uint256 _eventId, bool _vote) → void`

**Purpose:** Submit an encrypted prediction for an event

**Parameters:**
- `_eventId` (uint256) - ID of target event
- `_vote` (bool) - Prediction value (true or false)

**Access:** Public - Anyone can call (when event is active)

**Modifiers:**
- `eventExists(_eventId)` - Event must exist
- `eventActive(_eventId)` - Event deadline not passed, not finalized

**Events Emitted:**
```solidity
PredictionMade(uint256 indexed eventId, address indexed predictor)
```

**Reverts:**
- "Already made prediction" - Caller has already predicted on this event
- "Event does not exist" - Invalid eventId
- "Event has ended" - Current time >= event endTime
- "Event is finalized" - Event already finalized

**Example:**
```solidity
// Make a prediction (true = yes, false = no)
contract.makePrediction(0, true);  // Voting "yes"
contract.makePrediction(0, false); // Voting "no"
```

**Gas Cost:** ~50-80k gas (typical)

**Technical Details:**
- Prediction is encrypted using: `keccak256(abi.encodePacked(_vote, msg.sender, block.timestamp))`
- Encryption includes vote, predictor address, and timestamp for privacy
- One prediction per user per event enforced on-chain
- Encrypted value stored; plaintext vote not accessible until reveal

**Security Considerations:**
- Predictions are privacy-preserving; actual votes cannot be determined until finalized and revealed
- Timestamp-based encryption ensures unpredictability
- Cannot change prediction once made

---

#### `finalizeEvent(uint256 _eventId, bool _actualOutcome) → void`

**Purpose:** Lock the event and record the actual outcome

**Parameters:**
- `_eventId` (uint256) - ID of event to finalize
- `_actualOutcome` (bool) - Actual event outcome (true or false)

**Access:** Owner only

**Modifiers:**
- `onlyOwner()` - Caller must be contract owner
- `eventExists(_eventId)` - Event must exist

**Requirements:**
- `block.timestamp >= events[_eventId].endTime` - Event duration must have passed
- `!events[_eventId].isFinalized` - Event must not be already finalized

**Events Emitted:**
```solidity
EventFinalized(uint256 indexed eventId, bool outcome)
```

**Reverts:**
- "Only owner can call this function" - Caller is not owner
- "Event does not exist" - Invalid eventId
- "Event has not ended yet" - Called before deadline
- "Event already finalized" - Already finalized

**Example:**
```solidity
// After event deadline, owner finalizes with actual outcome
contract.finalizeEvent(0, true);  // Actual outcome was "yes"
```

**Gas Cost:** ~60-90k gas (typical)

**Notes:**
- Once finalized, new predictions cannot be made
- Outcome must be confirmed by contract owner
- Finalizing enables reveal phase for predictors

---

#### `revealPrediction(uint256 _eventId, bool _revealedGuess) → void`

**Purpose:** Reveal encrypted prediction and verify correctness

**Parameters:**
- `_eventId` (uint256) - ID of event
- `_revealedGuess` (bool) - The plaintext prediction value to reveal

**Access:** Public - Any predictor can call for their own prediction

**Modifiers:**
- `eventExists(_eventId)` - Event must exist

**Requirements:**
- `events[_eventId].isFinalized` - Event must be finalized
- `predictions[_eventId][msg.sender].predictor != address(0)` - Caller must have made a prediction
- `!predictions[_eventId][msg.sender].isRevealed` - Prediction must not be already revealed
- Hash verification: `keccak256(abi.encodePacked(_revealedGuess, msg.sender, timestamp)) == storedHash`

**Events Emitted:**
```solidity
ResultRevealed(uint256 indexed eventId, address indexed predictor, bool guess, bool correct)
```

**Reverts:**
- "Event does not exist" - Invalid eventId
- "Event not finalized yet" - Called before finalization
- "No prediction found" - Caller did not make a prediction
- "Already revealed" - Prediction already revealed
- "Invalid reveal - guess doesn't match commitment" - Plaintext doesn't match encrypted hash

**Example:**
```solidity
// After event is finalized, reveal the prediction
contract.revealPrediction(0, true);  // Reveal vote was "yes"

// Check if prediction was correct
(hasPredictor, timestamp, isRevealed, isCorrect) = contract.getUserPrediction(0, caller);
// isCorrect will be true if revealed guess matches actual outcome
```

**Gas Cost:** ~70-100k gas (typical)

**Commit-Reveal Verification:**
```solidity
// System verifies that revealed value matches encrypted commitment
expectedHash = keccak256(abi.encodePacked(
    revealedGuess,    // plaintext value being revealed
    msg.sender,       // predictor address
    storedTimestamp   // original prediction timestamp
));
require(expectedHash == storedEncryptedGuess);
```

**Security Model:**
- Cryptographic hash ensures revealed value matches original encrypted commitment
- Timestamp binding prevents reuse of hashes
- Address binding prevents prediction theft
- Cannot reveal before finalization (prevents leaking outcome early)

---

#### `getEvent(uint256 _eventId) → Event memory`

**Purpose:** Retrieve complete event information

**Parameters:**
- `_eventId` (uint256) - ID of event to retrieve

**Returns:**
```solidity
Event {
    string title,
    string description,
    uint256 endTime,
    bool isFinalized,
    bool actualOutcome,
    uint256 totalPredictions
}
```

**Access:** Public - Anyone can call

**Modifiers:**
- `eventExists(_eventId)` - Event must exist

**Example:**
```solidity
Event memory event = contract.getEvent(0);
// Access: event.title, event.endTime, event.isFinalized, etc.

if (!event.isFinalized) {
    console.log("Event ends in:", event.endTime - block.timestamp, "seconds");
}
```

**Gas Cost:** ~2-5k gas (view function, no state change)

---

#### `getEventPredictors(uint256 _eventId) → address[] memory`

**Purpose:** Get list of all predictors for an event

**Parameters:**
- `_eventId` (uint256) - ID of event

**Returns:**
- Array of predictor addresses

**Access:** Public - Anyone can call

**Modifiers:**
- `eventExists(_eventId)` - Event must exist

**Example:**
```solidity
address[] memory predictors = contract.getEventPredictors(0);
console.log("Total predictors:", predictors.length);

for (uint i = 0; i < predictors.length; i++) {
    console.log("Predictor", i, ":", predictors[i]);
}
```

**Gas Cost:** ~10-20k gas (depends on predictor count)

**Note:** Array size depends on number of predictions; may consume significant gas for large events

---

#### `getUserPrediction(uint256 _eventId, address _user) → (bool, uint256, bool, bool)`

**Purpose:** Get prediction details for a specific user on an event

**Parameters:**
- `_eventId` (uint256) - ID of event
- `_user` (address) - Address of predictor

**Returns:**
- `hasPredictor` (bool) - Whether user made a prediction
- `timestamp` (uint256) - When prediction was made
- `isRevealed` (bool) - Whether prediction is revealed
- `actualResult` (bool) - Whether prediction was correct (if revealed)

**Access:** Public - Anyone can call

**Modifiers:**
- `eventExists(_eventId)` - Event must exist

**Example:**
```solidity
address user = 0x1234...;
(hasPred, timestamp, isRevealed, isCorrect) = contract.getUserPrediction(0, user);

if (hasPred) {
    console.log("User made prediction at:", timestamp);
    if (isRevealed) {
        console.log("Prediction was", isCorrect ? "CORRECT" : "INCORRECT");
    }
}
```

**Gas Cost:** ~3-8k gas (view function)

---

#### `getTotalEvents() → uint256`

**Purpose:** Get total count of created events

**Returns:**
- `uint256` - Number of events ever created

**Access:** Public - Anyone can call

**Example:**
```solidity
uint256 totalEvents = contract.getTotalEvents();
console.log("Total events:", totalEvents);

// Iterate through all events
for (uint i = 0; i < totalEvents; i++) {
    Event memory evt = contract.getEvent(i);
    console.log("Event", i, ":", evt.title);
}
```

**Gas Cost:** ~2-3k gas (view function)

---

### Events

#### `EventCreated(uint256 indexed eventId, string title, uint256 endTime)`

Emitted when a new event is created.

**Example Log:**
```
EventCreated(eventId: 0, title: "Bitcoin Price", endTime: 1735689600)
```

---

#### `PredictionMade(uint256 indexed eventId, address indexed predictor)`

Emitted when a prediction is submitted.

**Example Log:**
```
PredictionMade(eventId: 0, predictor: 0x1234...)
```

---

#### `EventFinalized(uint256 indexed eventId, bool outcome)`

Emitted when an event is finalized with outcome.

**Example Log:**
```
EventFinalized(eventId: 0, outcome: true)
```

---

#### `ResultRevealed(uint256 indexed eventId, address indexed predictor, bool guess, bool correct)`

Emitted when a prediction is revealed and verified.

**Example Log:**
```
ResultRevealed(eventId: 0, predictor: 0x1234..., guess: true, correct: true)
```

---

## PrivacyGuessFHESimple API

### Core Concepts

PrivacyGuessFHESimple extends the basic contract with:
- Multi-round event support
- Creator-based permissions
- Enhanced encryption with nonce
- Batch operations for efficiency
- Event pause/resume functionality
- Ownership transfer

### Data Structures

#### PredictionEvent Struct

```solidity
struct PredictionEvent {
    string title;
    string description;
    uint256 endTime;
    bool isFinalized;
    bool actualOutcome;
    uint256 totalPredictions;
    address creator;         // Event creator address
    uint256 roundId;         // Current prediction round
    bool isActive;           // Whether event is currently active
}
```

#### FHEPrediction Struct

```solidity
struct FHEPrediction {
    address predictor;
    bytes32 encryptedGuess;
    uint256 timestamp;
    bool isRevealed;
    bool actualResult;
    bytes32 nonce;          // Random nonce for security
}
```

### Functions

#### `createEvent(string _title, string _description, uint256 _duration) → uint256`

**Purpose:** Create a new multi-round prediction event

**Parameters:**
- `_title` (string) - Event title (non-empty required)
- `_description` (string) - Event description (non-empty required)
- `_duration` (uint256) - Event duration in seconds

**Constraints:**
- Duration > 0
- Duration ≤ 365 days (31,536,000 seconds)
- Title length > 0
- Description length > 0

**Returns:**
- `eventId` (uint256) - ID of created event

**Access:** Public - Anyone can create events

**Events Emitted:**
```solidity
EventCreated(uint256 indexed eventId, string title, uint256 endTime, address indexed creator)
```

**Reverts:**
- "Title cannot be empty" - Title is empty string
- "Description cannot be empty" - Description is empty string
- "Invalid duration" - Duration is 0 or > 365 days

**Example:**
```solidity
// Create a 30-day event with validation
uint256 eventId = contract.createEvent(
    "Election Outcome",
    "Who will win the election?",
    30 * 24 * 60 * 60  // 30 days
);
```

**Gas Cost:** ~120-150k gas (typical)

**Creator Privileges:**
- Creator can finalize the event
- Creator can advance rounds
- Creator is stored in event data

---

#### `submitGuess(uint256 _eventId, bytes32 _encryptedGuess, bytes32 _nonce) → void`

**Purpose:** Submit a pre-encrypted prediction with nonce

**Parameters:**
- `_eventId` (uint256) - ID of event
- `_encryptedGuess` (bytes32) - Pre-encrypted prediction value
- `_nonce` (bytes32) - Random nonce for additional security

**Access:** Public - Anyone can call (when event is active)

**Modifiers:**
- `eventExists(_eventId)` - Event must exist
- `eventActive(_eventId)` - Event must be active and not ended

**Requirements:**
- Caller has not already made prediction for this event
- Event must be within duration
- Event must not be finalized

**Events Emitted:**
```solidity
FHEPredictionMade(uint256 indexed eventId, address indexed predictor, uint256 roundId)
```

**Reverts:**
- "Already made prediction for this event" - Caller already predicted
- "Event does not exist" - Invalid eventId
- "Event has ended" - Past deadline
- "Event is finalized" - Already finalized
- "Event is not active" - Event is paused

**Example:**
```solidity
// Generate encrypted prediction and nonce
bytes32 encrypted = keccak256(abi.encodePacked(vote, msg.sender, timestamp));
bytes32 nonce = keccak256(abi.encodePacked(timestamp, msg.sender, eventId));

contract.submitGuess(0, encrypted, nonce);
```

**Gas Cost:** ~100-130k gas (typical)

---

#### `makePrediction(uint256 _eventId, bool _vote) → void`

**Purpose:** Submit a boolean prediction (legacy interface for compatibility)

**Parameters:**
- `_eventId` (uint256) - ID of event
- `_vote` (bool) - Prediction value

**Access:** Public - Anyone can call (when event is active)

**Modifiers:**
- `eventExists(_eventId)` - Event must exist
- `eventActive(_eventId)` - Event must be active

**Reverts:**
- "Already made prediction" - Caller already predicted
- "Event does not exist" - Invalid eventId
- "Event has ended" - Past deadline
- "Event is finalized" - Already finalized
- "Event is not active" - Event is paused

**Example:**
```solidity
// Simple prediction interface
contract.makePrediction(0, true);  // Vote "yes"
```

**Gas Cost:** ~120-150k gas (typical)

**Technical Details:**
- Encrypts boolean vote using: `keccak256(abi.encodePacked(_vote, msg.sender, timestamp, blockhash, difficulty))`
- Enhanced encryption includes block information for additional entropy
- Nonce automatically generated from timestamp, sender, eventId

---

#### `revealPrediction(uint256 _eventId, bool _revealedGuess) → bool`

**Purpose:** Reveal and verify encrypted prediction

**Parameters:**
- `_eventId` (uint256) - ID of event
- `_revealedGuess` (bool) - Plaintext prediction to reveal

**Returns:**
- `bool` - The revealed guess value

**Access:** Public - Any predictor can call

**Modifiers:**
- `eventExists(_eventId)` - Event must exist

**Requirements:**
- Event must be finalized
- Caller must have made a prediction
- Prediction must not be already revealed
- Revealed value must match encrypted hash

**Events Emitted:**
```solidity
ResultRevealed(uint256 indexed eventId, address indexed predictor, bool guess, bool correct)
```

**Reverts:**
- "Event does not exist" - Invalid eventId
- "Event not finalized yet" - Called before finalization
- "No prediction found" - Caller has no prediction
- "Already revealed" - Already revealed
- "Invalid reveal - guess doesn't match commitment" - Invalid plaintext

**Example:**
```solidity
// Reveal the prediction
bool revealed = contract.revealPrediction(0, true);
console.log("Revealed guess:", revealed);
```

**Gas Cost:** ~90-120k gas (typical)

---

#### `finalizeEvent(uint256 _eventId, bool _actualOutcome) → void`

**Purpose:** Lock event and record actual outcome

**Parameters:**
- `_eventId` (uint256) - ID of event
- `_actualOutcome` (bool) - Actual outcome value

**Access:** Event creator or owner only

**Modifiers:**
- `eventExists(_eventId)` - Event must exist
- `canFinalizeEvent(_eventId)` - Caller is creator or owner

**Requirements:**
- `block.timestamp >= events[_eventId].endTime` - Deadline passed
- Event not already finalized

**Events Emitted:**
```solidity
EventFinalized(uint256 indexed eventId, bool outcome, uint256 finalRound)
```

**Reverts:**
- "Event does not exist" - Invalid eventId
- "Only event creator or owner can finalize" - Not authorized
- "Event has not ended yet" - Before deadline
- "Event already finalized" - Already finalized

**Example:**
```solidity
// Creator finalizes event after deadline
contract.finalizeEvent(0, true);  // Actual outcome: true
```

**Gas Cost:** ~80-120k gas (typical)

---

#### `advanceRound(uint256 _eventId) → void`

**Purpose:** Advance event to next prediction round

**Parameters:**
- `_eventId` (uint256) - ID of event

**Access:** Event creator or owner only

**Modifiers:**
- `eventExists(_eventId)` - Event must exist
- `canFinalizeEvent(_eventId)` - Caller is creator or owner

**Requirements:**
- Event not finalized
- Event must be active

**Events Emitted:**
```solidity
RoundAdvanced(uint256 indexed eventId, uint256 newRoundId)
```

**Reverts:**
- "Event does not exist" - Invalid eventId
- "Only event creator or owner can finalize" - Not authorized
- "Event is finalized" - Already finalized
- "Event is not active" - Event is paused

**Example:**
```solidity
// Advance to next round for multi-round event
contract.advanceRound(0);

// Check new round
(roundId, isActive, timeRemaining) = contract.getCurrentRoundInfo(0);
console.log("Now in round:", roundId);
```

**Gas Cost:** ~40-60k gas (typical)

---

#### `getCurrentRoundInfo(uint256 _eventId) → (uint256, bool, uint256)`

**Purpose:** Get current round status and time information

**Parameters:**
- `_eventId` (uint256) - ID of event

**Returns:**
- `roundId` (uint256) - Current round number (starts at 1)
- `isActive` (bool) - Whether event is active
- `timeRemaining` (uint256) - Seconds until deadline (0 if past)

**Access:** Public - Anyone can call

**Modifiers:**
- `eventExists(_eventId)` - Event must exist

**Example:**
```solidity
(roundId, isActive, timeRemaining) = contract.getCurrentRoundInfo(0);

if (isActive && timeRemaining > 0) {
    console.log("Round", roundId, "- Time remaining:", timeRemaining, "seconds");
}
```

**Gas Cost:** ~3-5k gas (view function)

---

#### `isGuessTimeActive(uint256 _eventId) → bool`

**Purpose:** Check if event is currently accepting predictions

**Parameters:**
- `_eventId` (uint256) - ID of event

**Returns:**
- `bool` - True if predictions can be made now

**Access:** Public - Anyone can call

**Conditions for True:**
- Event must exist
- Event must be active (`isActive == true`)
- Event must not be finalized
- Current time < deadline (`block.timestamp < endTime`)

**Example:**
```solidity
if (contract.isGuessTimeActive(0)) {
    contract.makePrediction(0, true);  // Can make prediction
}
```

**Gas Cost:** ~2-4k gas (view function)

---

#### `getMyEncryptedPrediction(uint256 _eventId) → bytes32`

**Purpose:** Get your own encrypted prediction hash

**Parameters:**
- `_eventId` (uint256) - ID of event

**Returns:**
- `bytes32` - Encrypted prediction hash

**Access:** Caller's own prediction or owner

**Requirements:**
- Caller has made a prediction OR caller is owner

**Reverts:**
- "Event does not exist" - Invalid eventId
- "Access denied" - Caller has no prediction and is not owner

**Example:**
```solidity
bytes32 myEncrypted = contract.getMyEncryptedPrediction(0);
console.log("My encrypted prediction hash:", myEncrypted);
```

**Gas Cost:** ~3-8k gas (view function)

---

#### `pauseEvent(uint256 _eventId) → void`

**Purpose:** Pause event and stop accepting predictions

**Parameters:**
- `_eventId` (uint256) - ID of event

**Access:** Owner only

**Modifiers:**
- `onlyOwner()` - Caller must be owner
- `eventExists(_eventId)` - Event must exist

**Effect:** Sets `event.isActive = false`

**Events Emitted:** None (state change only)

**Example:**
```solidity
contract.pauseEvent(0);  // Event is paused
// New predictions will be rejected
```

**Gas Cost:** ~30-50k gas (typical)

**Notes:**
- Paused events can be resumed
- Does not finalize the event
- Existing predictions remain locked

---

#### `resumeEvent(uint256 _eventId) → void`

**Purpose:** Resume paused event to accept predictions again

**Parameters:**
- `_eventId` (uint256) - ID of event

**Access:** Owner only

**Modifiers:**
- `onlyOwner()` - Caller must be owner
- `eventExists(_eventId)` - Event must exist

**Requirements:**
- Event must not be finalized

**Effect:** Sets `event.isActive = true`

**Events Emitted:** None (state change only)

**Reverts:**
- "Cannot resume finalized event" - Event is already finalized

**Example:**
```solidity
contract.resumeEvent(0);  // Event resumes
// Predictions can be made again
```

**Gas Cost:** ~30-50k gas (typical)

---

#### `transferOwnership(address newOwner) → void`

**Purpose:** Transfer contract ownership to new address

**Parameters:**
- `newOwner` (address) - Address of new owner

**Access:** Owner only

**Modifiers:**
- `onlyOwner()` - Caller must be current owner

**Requirements:**
- `newOwner != address(0)` - Cannot set zero address

**Effect:** Updates `owner` state variable

**Events Emitted:** None

**Reverts:**
- "New owner cannot be zero address" - Invalid zero address

**Example:**
```solidity
contract.transferOwnership(0x5678...);  // Transfer ownership
```

**Gas Cost:** ~30-50k gas (typical)

---

#### `getPredictionStats(uint256 _eventId) → (uint256, bool, bool)`

**Purpose:** Get event statistics

**Parameters:**
- `_eventId` (uint256) - ID of event

**Returns:**
- `totalPredictions` (uint256) - Number of predictions made
- `isFinalized` (bool) - Whether event is finalized
- `isActive` (bool) - Whether event is active

**Access:** Public - Anyone can call

**Modifiers:**
- `eventExists(_eventId)` - Event must exist

**Example:**
```solidity
(total, finalized, active) = contract.getPredictionStats(0);
console.log("Predictions made:", total);
console.log("Finalized:", finalized, "Active:", active);
```

**Gas Cost:** ~3-5k gas (view function)

---

#### `verifyPredictionIntegrity(uint256 _eventId, address _predictor) → (bool, bytes32)`

**Purpose:** Verify that a prediction exists and get its hash

**Parameters:**
- `_eventId` (uint256) - ID of event
- `_predictor` (address) - Address of predictor

**Returns:**
- `hasValidPrediction` (bool) - Whether prediction exists
- `predictionHash` (bytes32) - Encrypted prediction hash

**Access:** Public - Anyone can call

**Modifiers:**
- `eventExists(_eventId)` - Event must exist

**Example:**
```solidity
(exists, hash) = contract.verifyPredictionIntegrity(0, predictorAddr);
if (exists) {
    console.log("Prediction found, hash:", hash);
}
```

**Gas Cost:** ~3-8k gas (view function)

---

#### `batchGetPredictionStatus(uint256 _eventId, address[] _predictors) → bool[]`

**Purpose:** Check prediction status for multiple users (gas-efficient)

**Parameters:**
- `_eventId` (uint256) - ID of event
- `_predictors` (address[]) - Array of predictor addresses

**Returns:**
- `bool[]` - Array of boolean values (true if prediction exists)

**Access:** Public - Anyone can call

**Modifiers:**
- `eventExists(_eventId)` - Event must exist

**Example:**
```solidity
address[] memory users = new address[](3);
users[0] = 0x1111...;
users[1] = 0x2222...;
users[2] = 0x3333...;

bool[] memory hasPredictions = contract.batchGetPredictionStatus(0, users);

for (uint i = 0; i < hasPredictions.length; i++) {
    console.log("User", i, "predicted:", hasPredictions[i]);
}
```

**Gas Cost:** ~3k + (200 per user) gas

**Notes:**
- More efficient than multiple individual calls
- Recommended for checking many users at once
- Returns array matching input array order

---

#### `getEvent(uint256 _eventId) → PredictionEvent memory`

**Purpose:** Get complete event information

**Parameters:**
- `_eventId` (uint256) - ID of event

**Returns:**
```solidity
PredictionEvent {
    string title,
    string description,
    uint256 endTime,
    bool isFinalized,
    bool actualOutcome,
    uint256 totalPredictions,
    address creator,
    uint256 roundId,
    bool isActive
}
```

**Access:** Public - Anyone can call

**Modifiers:**
- `eventExists(_eventId)` - Event must exist

**Example:**
```solidity
PredictionEvent memory evt = contract.getEvent(0);
console.log("Event:", evt.title);
console.log("Creator:", evt.creator);
console.log("Round:", evt.roundId);
```

**Gas Cost:** ~2-5k gas (view function)

---

#### `getEventCreator(uint256 _eventId) → address`

**Purpose:** Get the creator address of an event

**Parameters:**
- `_eventId` (uint256) - ID of event

**Returns:**
- `address` - Creator's address

**Access:** Public - Anyone can call

**Modifiers:**
- `eventExists(_eventId)` - Event must exist

**Example:**
```solidity
address creator = contract.getEventCreator(0);
console.log("Event created by:", creator);
```

**Gas Cost:** ~2-3k gas (view function)

---

#### `getEventPredictors(uint256 _eventId) → address[] memory`

**Purpose:** Get list of all predictors for an event

**Parameters:**
- `_eventId` (uint256) - ID of event

**Returns:**
- Array of predictor addresses

**Access:** Public - Anyone can call

**Example:** (See PrivacyGuess API section)

**Gas Cost:** ~10-20k gas (depends on count)

---

#### `getUserPrediction(uint256 _eventId, address _user) → (bool, uint256, bool, bool)`

**Purpose:** Get user's prediction status

**Parameters:**
- `_eventId` (uint256) - ID of event
- `_user` (address) - User address

**Returns:** (See PrivacyGuess API section)

**Access:** Public - Anyone can call

**Example:** (See PrivacyGuess API section)

**Gas Cost:** ~3-8k gas (view function)

---

#### `getTotalEvents() → uint256`

**Purpose:** Get total event count

**Returns:**
- `uint256` - Number of events created

**Access:** Public - Anyone can call

**Example:** (See PrivacyGuess API section)

**Gas Cost:** ~2-3k gas (view function)

---

### Events

#### `EventCreated(uint256 indexed eventId, string title, uint256 endTime, address indexed creator)`

Emitted when a new event is created.

**Example:**
```
EventCreated(eventId: 0, title: "Bitcoin Price", endTime: 1735689600, creator: 0x1234...)
```

---

#### `FHEPredictionMade(uint256 indexed eventId, address indexed predictor, uint256 roundId)`

Emitted when a prediction is submitted.

**Example:**
```
FHEPredictionMade(eventId: 0, predictor: 0x1234..., roundId: 1)
```

---

#### `EventFinalized(uint256 indexed eventId, bool outcome, uint256 finalRound)`

Emitted when an event is finalized.

**Example:**
```
EventFinalized(eventId: 0, outcome: true, finalRound: 1)
```

---

#### `ResultRevealed(uint256 indexed eventId, address indexed predictor, bool guess, bool correct)`

Emitted when a prediction is revealed.

**Example:**
```
ResultRevealed(eventId: 0, predictor: 0x1234..., guess: true, correct: true)
```

---

#### `RoundAdvanced(uint256 indexed eventId, uint256 newRoundId)`

Emitted when moving to the next prediction round.

**Example:**
```
RoundAdvanced(eventId: 0, newRoundId: 2)
```

---

## Common Patterns

### Complete Prediction Workflow

#### PrivacyGuess Flow

```solidity
// 1. Owner creates event
uint256 eventId = contract.createEvent(
    "Will Team A Win?",
    "Championship game on Dec 25",
    7 * 24 * 60 * 60  // 7 days
);

// 2. Users make encrypted predictions (during 7 days)
contract.makePrediction(eventId, true);   // User 1: votes yes
contract.makePrediction(eventId, false);  // User 2: votes no

// 3. After deadline, owner finalizes with actual outcome
// (wait for endTime to pass first)
contract.finalizeEvent(eventId, true);    // Actual: yes

// 4. Users reveal and verify
contract.revealPrediction(eventId, true);   // User 1 was correct
contract.revealPrediction(eventId, false);  // User 2 was incorrect
```

#### PrivacyGuessFHESimple Multi-Round Flow

```solidity
// 1. Anyone creates event
uint256 eventId = contract.createEvent(
    "Stock Price Prediction",
    "Will ACME stock close above $50?",
    30 * 24 * 60 * 60  // 30 days
);

// 2. Round 1: Users make predictions
contract.makePrediction(eventId, true);   // Multiple users

// 3. Creator finalizes round 1
contract.finalizeEvent(eventId, true);    // Round 1 outcome
contract.revealPrediction(eventId, true); // Users reveal

// 4. Creator advances to Round 2
contract.advanceRound(eventId);

// 5. Repeat for additional rounds
contract.makePrediction(eventId, false);  // New predictions for round 2
// ... later ...
contract.finalizeEvent(eventId, false);   // Round 2 outcome
```

### Batch Checking Multiple Users

```solidity
// Efficient way to check status for many users
address[] memory users = new address[](10);
// ... populate users array ...

bool[] memory status = contract.batchGetPredictionStatus(eventId, users);

for (uint i = 0; i < status.length; i++) {
    if (!status[i]) {
        console.log("User", i, "hasn't predicted yet");
    }
}
```

---

## Error Handling

### Common Revert Messages

| Message | Cause | Solution |
|---------|-------|----------|
| "Only owner can call this function" | Caller is not owner | Use owner account |
| "Event does not exist" | Invalid eventId | Check eventId is < getTotalEvents() |
| "Event has ended" | Past deadline | Finalize event first |
| "Event is finalized" | Event already finalized | Create new event |
| "Already made prediction" | User already predicted on this event | Make prediction on different event |
| "Event not finalized yet" | Called reveal before finalization | Finalize event first |
| "No prediction found" | User has no prediction on event | Make prediction first |
| "Already revealed" | User already revealed on event | Prediction already revealed |
| "Invalid reveal - guess doesn't match commitment" | Plaintext doesn't match encrypted value | Ensure correct plaintext |
| "Title cannot be empty" | Empty title string | Provide non-empty title |
| "Invalid duration" | Duration out of range | Use duration > 0 and ≤ 365 days |

---

## Gas Considerations

### Approximate Gas Costs

| Operation | Min | Typical | Max |
|-----------|-----|---------|-----|
| createEvent (PrivacyGuess) | 80k | 90k | 110k |
| createEvent (PrivacyGuessFHESimple) | 100k | 120k | 150k |
| makePrediction | 50k | 80k | 120k |
| submitGuess | 80k | 100k | 130k |
| finalizeEvent | 60k | 80k | 120k |
| revealPrediction | 70k | 90k | 120k |
| advanceRound | 40k | 50k | 60k |
| pauseEvent/resumeEvent | 30k | 40k | 50k |
| getEvent (view) | 2k | 5k | 10k |
| getEventPredictors (view) | 10k | 15k | 20k*n |
| batchGetPredictionStatus (view) | 3k | 5k | 3k + 200n |

### Optimization Tips

- Use `batchGetPredictionStatus` instead of individual calls
- Call view functions for checking status before transactions
- Batch predictions in a single transaction when possible
- Plan event durations to fit use cases (don't exceed 365 days)

---

## Security Notes

### Commit-Reveal Scheme

The platform uses a cryptographic commit-reveal scheme for privacy:

1. **Commit Phase**: User submits prediction as encrypted hash
   - Hash includes vote, address, timestamp, and block data
   - Original vote value not recoverable from hash
   - Privacy maintained during guess phase

2. **Reveal Phase**: User reveals plaintext vote
   - System verifies reveal matches original hash
   - Tampering detected if hash doesn't match
   - Only possible after event finalized

### Address-Binding

- Predictions tied to `msg.sender` address
- Prevents prediction theft between accounts
- Timestamp-based uniqueness prevents hash reuse
- Block information adds entropy

### One Prediction Per Event Per User

- Enforced at contract level: `predictions[_eventId][msg.sender]`
- Cannot change vote once submitted
- Ensures fair representation

### Owner/Creator Controls

- **PrivacyGuess**: Owner-only finalization
- **PrivacyGuessFHESimple**: Creator or owner can finalize/advance
- Emergency pause capability for owner
- Ownership transfer available

### Immutability Guarantees

- Once revealed, prediction cannot be changed
- Encrypted predictions cannot be modified
- Event outcomes locked after finalization
- Round advancement irreversible

---

## Integration Examples

### Web3.js Integration

```javascript
const eventId = await contract.createEvent(
    "Prediction Question",
    "Description",
    7 * 24 * 60 * 60,
    { from: userAddress }
);

await contract.makePrediction(eventId, true, { from: userAddress });

const event = await contract.getEvent(eventId);
console.log("Deadline:", new Date(event.endTime * 1000));
```

### Ethers.js Integration

```typescript
const eventId = await contract.createEvent(
    "Prediction Question",
    "Description",
    7 * 24 * 60 * 60
);

const tx = await contract.makePrediction(eventId, true);
const receipt = await tx.wait();

const event = await contract.getEvent(eventId);
console.log("Active:", !event.isFinalized);
```

---

**Last Updated:** December 2025
**Smart Contracts Version:** 1.0.0
**Documentation Version:** 1.0.0
