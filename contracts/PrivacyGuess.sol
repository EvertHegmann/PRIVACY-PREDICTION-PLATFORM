// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Privacy Prediction Platform with simulated FHE for Sepolia deployment
// In production, would use actual FHEVM libraries

contract PrivacyGuess {

    struct Prediction {
        address predictor;
        bytes32 encryptedGuess; // Simulated encrypted boolean for Sepolia
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

    mapping(uint256 => Event) public events;
    mapping(uint256 => mapping(address => Prediction)) public predictions;
    mapping(uint256 => address[]) public eventPredictors;

    uint256 public nextEventId;
    address public owner;

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

    function makePrediction(uint256 _eventId, bool _vote)
        external
        eventExists(_eventId)
        eventActive(_eventId)
    {
        require(predictions[_eventId][msg.sender].predictor == address(0), "Already made prediction");

        // Simulate FHE encryption: keccak256 hash of vote + sender + timestamp for privacy
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

    function revealPrediction(uint256 _eventId, bool _revealedGuess)
        external
        eventExists(_eventId)
    {
        require(events[_eventId].isFinalized, "Event not finalized yet");
        require(predictions[_eventId][msg.sender].predictor != address(0), "No prediction found");
        require(!predictions[_eventId][msg.sender].isRevealed, "Already revealed");

        // Verify the revealed guess matches the encrypted prediction (commit-reveal scheme)
        bytes32 expectedHash = keccak256(abi.encodePacked(_revealedGuess, msg.sender, predictions[_eventId][msg.sender].timestamp));
        require(expectedHash == predictions[_eventId][msg.sender].encryptedGuess, "Invalid reveal - guess doesn't match commitment");

        // Calculate if the prediction was correct
        bool isCorrect = (_revealedGuess == events[_eventId].actualOutcome);

        predictions[_eventId][msg.sender].isRevealed = true;
        predictions[_eventId][msg.sender].actualResult = isCorrect;

        emit ResultRevealed(_eventId, msg.sender, _revealedGuess, isCorrect);
    }

    function getEvent(uint256 _eventId)
        external
        view
        eventExists(_eventId)
        returns (Event memory)
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
        Prediction memory pred = predictions[_eventId][_user];
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
}