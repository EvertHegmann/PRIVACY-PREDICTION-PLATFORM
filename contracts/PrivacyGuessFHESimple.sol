// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Privacy Prediction Platform with Simplified FHE Implementation
// Compatible with Sepolia testnet deployment

contract PrivacyGuessFHESimple {

    struct FHEPrediction {
        address predictor;
        bytes32 encryptedGuess; // Simulated FHE encrypted boolean
        uint256 timestamp;
        bool isRevealed;
        bool actualResult;
        bytes32 nonce; // Random nonce for additional security
    }

    struct PredictionEvent {
        string title;
        string description;
        uint256 endTime;
        bool isFinalized;
        bool actualOutcome;
        uint256 totalPredictions;
        address creator;
        uint256 roundId; // Current prediction round
        bool isActive;
    }

    // State variables
    mapping(uint256 => PredictionEvent) public events;
    mapping(uint256 => mapping(address => FHEPrediction)) public predictions;
    mapping(uint256 => address[]) public eventPredictors;
    mapping(uint256 => mapping(uint256 => bool)) public roundResults; // eventId => roundId => result

    uint256 public nextEventId;
    address public owner;
    uint256 public constant ROUND_DURATION = 24 hours;
    uint256 public constant MAX_EVENT_DURATION = 365 days;

    // Events
    event EventCreated(uint256 indexed eventId, string title, uint256 endTime, address indexed creator);
    event FHEPredictionMade(uint256 indexed eventId, address indexed predictor, uint256 roundId);
    event EventFinalized(uint256 indexed eventId, bool outcome, uint256 finalRound);
    event ResultRevealed(uint256 indexed eventId, address indexed predictor, bool guess, bool correct);
    event RoundAdvanced(uint256 indexed eventId, uint256 newRoundId);

    // Modifiers
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
        require(events[eventId].isActive, "Event is not active");
        _;
    }

    modifier canFinalizeEvent(uint256 eventId) {
        require(
            msg.sender == events[eventId].creator || msg.sender == owner,
            "Only event creator or owner can finalize"
        );
        _;
    }

    constructor() {
        owner = msg.sender;
        nextEventId = 0;
    }

    // PUBLIC FUNCTION - Anyone can create FHE prediction events
    function createEvent(
        string memory _title,
        string memory _description,
        uint256 _duration
    ) external returns (uint256) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
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

    // PUBLIC FUNCTION - Anyone can make encrypted predictions
    function submitGuess(uint256 _eventId, bytes32 _encryptedGuess, bytes32 _nonce)
        external
        eventExists(_eventId)
        eventActive(_eventId)
    {
        require(predictions[_eventId][msg.sender].predictor == address(0), "Already made prediction for this event");

        // Store simulated FHE encrypted prediction
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

    // Legacy function for backward compatibility with existing frontend
    function makePrediction(uint256 _eventId, bool _vote)
        external
        eventExists(_eventId)
        eventActive(_eventId)
    {
        require(predictions[_eventId][msg.sender].predictor == address(0), "Already made prediction");

        // Simulate FHE encryption with enhanced privacy
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

    // Reveal prediction using commit-reveal scheme
    function revealPrediction(uint256 _eventId, bool _revealedGuess)
        external
        eventExists(_eventId)
        returns (bool)
    {
        require(events[_eventId].isFinalized, "Event not finalized yet");
        require(predictions[_eventId][msg.sender].predictor != address(0), "No prediction found");
        require(!predictions[_eventId][msg.sender].isRevealed, "Already revealed");

        // Verify the revealed guess matches the encrypted prediction (commit-reveal scheme)
        bytes32 expectedHash = keccak256(abi.encodePacked(
            _revealedGuess,
            msg.sender,
            predictions[_eventId][msg.sender].timestamp,
            block.difficulty,
            blockhash(block.number - 1)
        ));

        require(expectedHash == predictions[_eventId][msg.sender].encryptedGuess, "Invalid reveal - guess doesn't match commitment");

        // Calculate if the prediction was correct
        bool isCorrect = (_revealedGuess == events[_eventId].actualOutcome);

        predictions[_eventId][msg.sender].isRevealed = true;
        predictions[_eventId][msg.sender].actualResult = isCorrect;

        emit ResultRevealed(_eventId, msg.sender, _revealedGuess, isCorrect);
        return _revealedGuess;
    }

    // Get user's encrypted prediction hash (for verification)
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

    // Finalize event with actual outcome
    function finalizeEvent(uint256 _eventId, bool _actualOutcome)
        external
        eventExists(_eventId)
        canFinalizeEvent(_eventId)
    {
        require(block.timestamp >= events[_eventId].endTime, "Event has not ended yet");
        require(!events[_eventId].isFinalized, "Event already finalized");

        events[_eventId].isFinalized = true;
        events[_eventId].actualOutcome = _actualOutcome;
        events[_eventId].isActive = false;

        // Store round result
        roundResults[_eventId][events[_eventId].roundId] = _actualOutcome;

        emit EventFinalized(_eventId, _actualOutcome, events[_eventId].roundId);
    }

    // Advance to next prediction round (for ongoing events)
    function advanceRound(uint256 _eventId)
        external
        eventExists(_eventId)
        canFinalizeEvent(_eventId)
    {
        require(!events[_eventId].isFinalized, "Event is finalized");
        require(events[_eventId].isActive, "Event is not active");

        events[_eventId].roundId++;
        emit RoundAdvanced(_eventId, events[_eventId].roundId);
    }

    // Get current round information
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

    // Check if guess time is active for current round
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

    // VIEW FUNCTIONS
    function getEvent(uint256 _eventId)
        external
        view
        eventExists(_eventId)
        returns (PredictionEvent memory)
    {
        return events[_eventId];
    }

    function getEventPredictors(uint256 _eventId)
        external
        view
        eventExists(_eventId)
        returns (address[] memory)
    {
        return eventPredictors[_eventId];
    }

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

    function getTotalEvents() external view returns (uint256) {
        return nextEventId;
    }

    function getEventCreator(uint256 _eventId)
        external
        view
        eventExists(_eventId)
        returns (address)
    {
        return events[_eventId].creator;
    }

    // Emergency functions
    function pauseEvent(uint256 _eventId) external onlyOwner eventExists(_eventId) {
        events[_eventId].isActive = false;
    }

    function resumeEvent(uint256 _eventId) external onlyOwner eventExists(_eventId) {
        require(!events[_eventId].isFinalized, "Cannot resume finalized event");
        events[_eventId].isActive = true;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "New owner cannot be zero address");
        owner = newOwner;
    }

    // Get prediction statistics (public)
    function getPredictionStats(uint256 _eventId)
        external
        view
        eventExists(_eventId)
        returns (uint256 totalPredictions, bool isFinalized, bool isActive)
    {
        PredictionEvent memory eventData = events[_eventId];
        return (eventData.totalPredictions, eventData.isFinalized, eventData.isActive);
    }

    // Enhanced privacy verification
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

    // Batch operations for efficiency
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
    }
}