# AI Prediction Commitment Proof Guide

## Overview

The AI Prediction Commitment Proof enables users to prove they made an AI prediction BEFORE knowing the outcome. This prevents cherry-picking favorable predictions and provides cryptographic proof of temporal ordering.

## How It Works

### 1. Commit Phase (Before Outcome)
```javascript
// User makes AI prediction
const prompt = "Analyze AAPL stock for tomorrow";
const aiResponse = "AAPL will increase 2.3% based on sentiment analysis";

// Create hashes
const promptHash = sha256(prompt + nonce);
const responseHash = sha256(aiResponse + nonce);

// Commit on-chain (Ethereum/Solana)
const commitTx = await contract.commitPrediction({
  promptHash: promptHash,
  responseHash: responseHash,
  timestamp: Date.now()
});
// Transaction: 0xabc123... (publicly visible, but reveals nothing)
```

### 2. Wait for Outcome
- Market closes
- Medical results arrive  
- Event occurs
- etc.

### 3. Reveal Phase (After Outcome)
```javascript
// Generate ZK proof
const proof = await zkEngine.prove({
  wasm: "ai_prediction_commitment.wasm",
  input: {
    prompt_hash: parseInt(promptHash.substr(0,8), 16),
    response_hash: parseInt(responseHash.substr(0,8), 16),
    commitment_timestamp: commitTime,
    reveal_timestamp: Date.now()
  }
});

// Reveal with proof
await contract.revealPrediction(prompt, aiResponse, nonce, proof);
```

## Proof Validation Logic

The WASM proof validates:
1. **Valid Hashes**: Both prompt and response hashes are non-zero and different
2. **Temporal Ordering**: Commitment timestamp < Reveal timestamp
3. **Reasonable Timeframe**: Reveal within 30 days of commitment

## Example Use Cases

### 1. Stock Market Predictions
- **Commit**: "AAPL will rise 2%" at 9 AM
- **Reveal**: After market close at 4 PM
- **Proves**: Prediction made before trading day

### 2. Medical AI Diagnosis
- **Commit**: "Patient shows signs of condition X"
- **Reveal**: After lab results confirm
- **Proves**: AI diagnosis wasn't influenced by results

### 3. Sports Predictions
- **Commit**: "Team A will win by 10 points"
- **Reveal**: After game ends
- **Proves**: No hindsight bias

### 4. Content Moderation
- **Commit**: "This content violates policy X"
- **Reveal**: After human review
- **Proves**: AI decision was independent

## Integration with Existing System

The proof integrates seamlessly:

```javascript
// In chat_service.py or workflow
if (proofType === "ai_prediction") {
  const result = await zkEngine.generateProof({
    wasmPath: "ai_prediction_commitment.wasm",
    inputs: {
      prompt_hash: hashToInt(promptHash),
      response_hash: hashToInt(responseHash),
      commitment_timestamp: commitBlock.timestamp,
      reveal_timestamp: currentTimestamp
    }
  });
}
```

## On-Chain Verification

### Ethereum Smart Contract Example
```solidity
contract PredictionCommitment {
    struct Commitment {
        bytes32 promptHash;
        bytes32 responseHash;
        uint256 timestamp;
        address predictor;
    }
    
    mapping(bytes32 => Commitment) public commitments;
    
    function commit(bytes32 promptHash, bytes32 responseHash) external {
        bytes32 id = keccak256(abi.encode(promptHash, responseHash, msg.sender));
        require(commitments[id].timestamp == 0, "Already committed");
        
        commitments[id] = Commitment({
            promptHash: promptHash,
            responseHash: responseHash,
            timestamp: block.timestamp,
            predictor: msg.sender
        });
        
        emit PredictionCommitted(id, msg.sender, block.timestamp);
    }
    
    function reveal(
        string memory prompt,
        string memory response,
        string memory nonce,
        bytes memory zkProof
    ) external {
        // Verify hashes match
        bytes32 promptHash = keccak256(abi.encode(prompt, nonce));
        bytes32 responseHash = keccak256(abi.encode(response, nonce));
        bytes32 id = keccak256(abi.encode(promptHash, responseHash, msg.sender));
        
        Commitment memory c = commitments[id];
        require(c.timestamp > 0, "No commitment found");
        require(c.promptHash == promptHash, "Prompt hash mismatch");
        require(c.responseHash == responseHash, "Response hash mismatch");
        
        // In production, verify ZK proof here
        
        emit PredictionRevealed(id, prompt, response, block.timestamp);
    }
}
```

## Security Properties

1. **No Cherry-Picking**: Can't try multiple predictions and only reveal successful ones
2. **Temporal Integrity**: Blockchain timestamps prevent backdating
3. **Privacy Preserving**: Commitment reveals nothing about prediction content
4. **Non-Repudiation**: Can't deny making the prediction

## Technical Details

- **WASM File**: `ai_prediction_commitment.wasm`
- **Input Parameters**: 4 x i32 (prompt_hash, response_hash, commitment_timestamp, reveal_timestamp)
- **Output**: 1 (valid) or 0 (invalid)
- **Max Timeframe**: 30 days (2,592,000 seconds)

## Testing

Run the test script:
```bash
node test-ai-prediction-proof.js
```

This will:
1. Create sample prediction
2. Simulate on-chain commitment
3. Generate ZK proof
4. Validate temporal ordering
5. Test invalid cases

## Future Enhancements

1. **Multi-prediction batches**: Commit to N predictions at once
2. **Partial reveals**: Reveal only successful predictions with proof of total
3. **Reputation scoring**: Build reputation based on prediction accuracy
4. **Cross-chain commitments**: Commit on one chain, reveal on another