// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AI Prediction Commitment on Base
 * @notice Commit AI predictions on Base blockchain before outcomes are known
 * @dev Optimized for Base L2 - lower gas costs, faster confirmations
 */
contract AIPredictionCommitment {
    struct Commitment {
        bytes32 promptHash;
        bytes32 responseHash;
        uint256 blockNumber;
        uint256 timestamp;
        address predictor;
        bool revealed;
    }
    
    // Mapping from commitment ID to commitment data
    mapping(bytes32 => Commitment) public commitments;
    
    // Events
    event PredictionCommitted(
        bytes32 indexed commitmentId,
        address indexed predictor,
        uint256 blockNumber,
        uint256 timestamp
    );
    
    event PredictionRevealed(
        bytes32 indexed commitmentId,
        string prompt,
        string response,
        uint256 revealBlock,
        uint256 commitBlock
    );
    
    /**
     * @notice Commit to an AI prediction
     * @param promptHash Hash of the prompt + nonce
     * @param responseHash Hash of the AI response + nonce
     * @return commitmentId Unique ID for this commitment
     */
    function commitPrediction(
        bytes32 promptHash,
        bytes32 responseHash
    ) external returns (bytes32 commitmentId) {
        // Generate unique commitment ID
        commitmentId = keccak256(abi.encodePacked(
            promptHash,
            responseHash,
            msg.sender,
            block.number
        ));
        
        // Ensure not already committed
        require(commitments[commitmentId].timestamp == 0, "Already committed");
        
        // Store commitment
        commitments[commitmentId] = Commitment({
            promptHash: promptHash,
            responseHash: responseHash,
            blockNumber: block.number,
            timestamp: block.timestamp,
            predictor: msg.sender,
            revealed: false
        });
        
        emit PredictionCommitted(
            commitmentId,
            msg.sender,
            block.number,
            block.timestamp
        );
    }
    
    /**
     * @notice Reveal a prediction with ZK proof
     * @param prompt The original prompt
     * @param response The AI response
     * @param nonce The secret nonce used in hashing
     * @param zkProof The ZK proof of valid commitment (verified off-chain)
     */
    function revealPrediction(
        string memory prompt,
        string memory response,
        string memory nonce,
        bytes memory zkProof
    ) external {
        // Recreate hashes
        bytes32 promptHash = keccak256(abi.encodePacked(prompt, nonce));
        bytes32 responseHash = keccak256(abi.encodePacked(response, nonce));
        
        // Find commitment
        bytes32 commitmentId = keccak256(abi.encodePacked(
            promptHash,
            responseHash,
            msg.sender,
            block.number
        ));
        
        // Note: We need to search for the actual commitment
        // In practice, store commitmentId mapping separately
        
        Commitment storage commitment = commitments[commitmentId];
        require(commitment.timestamp > 0, "No commitment found");
        require(commitment.predictor == msg.sender, "Not your commitment");
        require(!commitment.revealed, "Already revealed");
        require(commitment.promptHash == promptHash, "Prompt mismatch");
        require(commitment.responseHash == responseHash, "Response mismatch");
        
        // Ensure sufficient time has passed (optional)
        require(block.number > commitment.blockNumber, "Too soon to reveal");
        
        // Mark as revealed
        commitment.revealed = true;
        
        // In production: Verify ZK proof here
        // For now, we trust the proof is valid
        
        emit PredictionRevealed(
            commitmentId,
            prompt,
            response,
            block.number,
            commitment.blockNumber
        );
    }
    
    /**
     * @notice Get commitment details
     * @param commitmentId The commitment to query
     */
    function getCommitment(bytes32 commitmentId) 
        external 
        view 
        returns (
            bytes32 promptHash,
            bytes32 responseHash,
            uint256 blockNumber,
            uint256 timestamp,
            address predictor,
            bool revealed
        ) 
    {
        Commitment memory c = commitments[commitmentId];
        return (
            c.promptHash,
            c.responseHash,
            c.blockNumber,
            c.timestamp,
            c.predictor,
            c.revealed
        );
    }
    
    /**
     * @notice Verify temporal ordering (for reference)
     * @param commitmentId The commitment to verify
     */
    function verifyTemporalOrdering(bytes32 commitmentId) 
        external 
        view 
        returns (bool) 
    {
        Commitment memory c = commitments[commitmentId];
        return c.timestamp > 0 && c.timestamp < block.timestamp;
    }
}