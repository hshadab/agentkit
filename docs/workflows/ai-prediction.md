# AI Prediction Commitment Proofs

## Overview

The AI Prediction Commitment Proof system provides cryptographic evidence that AI-generated content existed at a specific point in time. This system uses a commit-reveal pattern with blockchain timestamps to ensure temporal integrity and prevent post-hoc modifications of AI predictions.

## How It Works

### 1. Commitment Phase
When an AI generates a prediction or response:
- The system creates cryptographic hashes of the prompt and response
- These hashes are committed to the Base blockchain (Sepolia testnet)
- A unique commitment ID and timestamp are recorded on-chain

### 2. Proof Generation
- A zero-knowledge proof is generated using WebAssembly (WASM)
- The proof demonstrates that the commitment happened before the reveal
- Proof IDs follow the format: `proof_ai_prediction_[timestamp]`

### 3. Verification
- Local verification checks the temporal ordering
- On-chain verification confirms the commitment exists on Base blockchain
- Users can view the commitment transaction on Base Sepolia explorer

## Technical Architecture

### Smart Contract
- **Contract Address**: `0xae7d069d0A45a8Ecd969ABbb2705bA96472D36FC`
- **Network**: Base Sepolia (Chain ID: 84532)
- **Key Functions**:
  - `commitPrediction(bytes32 promptHash, bytes32 responseHash)`: Creates on-chain commitment
  - `getCommitment(bytes32 commitmentId)`: Retrieves commitment details
  - `verifyTemporalOrdering(bytes32 commitmentId)`: Verifies timing constraints

### WASM Proof Module
- **File**: `zkengine/example_wasms/ai_prediction_commitment.wat`
- **Function**: `prove_ai_content`
- **Inputs**:
  - Prompt hash (32-bit integer)
  - Response hash (32-bit integer)
  - Commitment timestamp
  - Reveal timestamp
- **Output**: 1 if valid (reveal after commitment), 0 otherwise

### Frontend Integration
- **Handler**: `static/js/ai-prediction-handler-real.js`
- **Features**:
  - Automatic MetaMask integration
  - Gas price optimization for testnet
  - Real-time commitment status updates
  - Clean single-line UI display

## Usage

### Creating an AI Prediction Proof

1. **Via UI**: Type "Prove AI prediction commitment" in the chat interface
2. **Via API**: Send a WebSocket message:
   ```json
   {
     "type": "chat",
     "message": "Prove AI prediction commitment"
   }
   ```

### Workflow
1. System generates AI prediction data
2. Creates blockchain commitment (requires MetaMask approval)
3. Generates zero-knowledge proof
4. Displays proof card with blockchain link

### UI Display
The proof card shows:
- Proof ID: `proof_ai_prediction_[timestamp]`
- Status: Single line with hyperlink and timestamp
- Format: "View AI prediction commitment on Base blockchain | [Timestamp]"

## Configuration

### Environment Variables
```bash
# Base blockchain configuration
BASE_RPC_URL=https://sepolia.base.org
BASE_CHAIN_ID=84532

# Contract deployment info
AI_COMMITMENT_CONTRACT=0xae7d069d0A45a8Ecd969ABbb2705bA96472D36FC
```

### Gas Optimization
- Gas price capped at 0.1 gwei for testnet transactions
- Automatic gas estimation with reasonable limits
- User-friendly transaction prompts

## Security Considerations

1. **Temporal Integrity**: Blockchain timestamps prevent backdating
2. **Hash Security**: Uses Keccak256 for cryptographic hashing
3. **Nonce Generation**: Random nonces prevent hash collision attacks
4. **Zero-Knowledge**: Proofs don't reveal actual content

## Troubleshooting

### Common Issues

1. **MetaMask Not Prompting**
   - Ensure MetaMask is unlocked
   - Check you're on Base Sepolia network
   - Verify sufficient testnet ETH balance

2. **Proof Generation Fails**
   - Check WASM file exists: `ai_prediction_commitment.wasm`
   - Verify zkEngine service is running
   - Check WebSocket connection status

3. **Blockchain Link Not Showing**
   - Wait for transaction confirmation
   - Check browser console for errors
   - Verify commitment data storage

### Debug Commands
```bash
# Check contract deployment
cat static/deployment-ai-commitment-base.json

# Verify WASM compilation
wat2wasm zkengine/example_wasms/ai_prediction_commitment.wat

# Test proof generation
python3 tests/unit/test_ai_content_proof.py
```

## Integration with Workflow System

The AI prediction proof integrates seamlessly with the AgentKit workflow system:

1. **Parser Recognition**: OpenAI parser identifies "AI prediction" as a proof type
2. **Single-Step Workflow**: Generates only one step (no extra AI processing)
3. **Proof Card Display**: Shows as standalone proof, not workflow card
4. **Blockchain Integration**: Automatic commitment creation during proof generation

## Future Enhancements

1. **Mainnet Deployment**: Deploy contracts to Base mainnet
2. **IPFS Integration**: Store full content on IPFS with on-chain hash
3. **Batch Commitments**: Commit multiple predictions in one transaction
4. **Cross-Chain Support**: Extend to other EVM-compatible chains
5. **API Enhancements**: RESTful API for programmatic access