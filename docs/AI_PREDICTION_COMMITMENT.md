# AI Prediction Commitment Proof

## Overview
The AI Prediction Commitment proof demonstrates how AI-generated predictions can be timestamped on blockchain BEFORE outcomes are known, proving temporal integrity without revealing prediction details.

## Current Implementation Status

### Demo Mode (Currently Active)
- Generates simulated commitment hashes for demonstration purposes
- Shows how the commit-reveal pattern would work in production
- No actual blockchain transactions are made (no gas fees required)
- Hash displayed in UI is deterministic but not on-chain

### Production Ready Contract
- Smart contract available at: `/contracts/AIPredictionCommitment_Base.sol`
- Designed for Base L2 (lower gas costs, faster confirmations)
- Implements full commit-reveal pattern with ZK proof support
- Not yet deployed to Base Sepolia

## How It Works

### 1. Commitment Phase
When an AI makes a prediction:
- Hash the prompt + nonce
- Hash the AI response + nonce
- Create commitment hash from both hashes
- In production: Submit to Base blockchain
- Currently: Generate simulated hash

### 2. Reveal Phase
After the outcome is known:
- Reveal prompt, response, and nonce
- ZK proof verifies the commitment without revealing details
- Blockchain timestamp proves prediction preceded outcome

## UI Behavior

### Proof Card Display
- Shows "Base Commitment (Demo)" header
- Displays simulated transaction hash
- Explains this is a demonstration
- In production would link to actual Base transaction

### Example Hash Format
```
0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

## To Deploy to Production

1. Deploy the contract to Base Sepolia:
   ```bash
   cd contracts
   # Configure deployment script with Base RPC
   # Deploy AIPredictionCommitment_Base.sol
   ```

2. Update `/static/js/ai-prediction-handler.js`:
   - Replace simulated hash with actual contract interaction
   - Add Web3 calls to commitPrediction function
   - Store actual transaction hash

3. Update proof card to show real Base explorer link

## Use Cases

- **AI Trading Predictions**: Prove predictions were made before market moves
- **AI Weather Forecasts**: Timestamp forecasts before weather occurs  
- **AI Sports Predictions**: Commit to predictions before games
- **AI Medical Prognosis**: Document predictions before outcomes
- **AI Content Detection**: Prove detection timing for audit trails

## Technical Details

### Commitment Structure
```solidity
struct Commitment {
    bytes32 promptHash;      // Hash of prompt + nonce
    bytes32 responseHash;    // Hash of response + nonce
    uint256 blockNumber;     // Base block number
    uint256 timestamp;       // Unix timestamp
    address predictor;       // Wallet that made prediction
    bool revealed;          // Whether revealed yet
}
```

### Privacy Features
- Original prompt/response never stored on-chain
- Only hashes are public until reveal
- ZK proof allows selective disclosure
- Nonce prevents rainbow table attacks

## Future Enhancements

1. **Actual Base Deployment**
   - Deploy contract to Base mainnet
   - Integrate MetaMask for commitment transactions
   - Store real tx hashes

2. **Enhanced ZK Proofs**
   - Prove properties without revealing content
   - Example: "Prediction confidence > 90%" without showing prediction

3. **Multi-chain Support**
   - Deploy to multiple L2s for redundancy
   - Cross-chain commitment verification

4. **Commitment Aggregation**
   - Batch multiple predictions in one transaction
   - Merkle tree for efficient storage