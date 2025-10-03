# Circle OOAK: Verifiable AI Agent Framework

Cryptographic proof system for AI agent decisions with USDC payment integration on Base Sepolia.

## What This Does

This framework demonstrates how AI agents can make payment decisions with cryptographic guarantees. When an agent decides to spend money, it generates:

1. **ONNX Neural Network Inference** - Real AI decision using a trained model
2. **JOLT-Atlas zkML Proof** - Cryptographic proof the AI actually ran (~600ms)
3. **Groth16 Proof** - Zero-knowledge proof verified on-chain
4. **On-Chain Storage** - Permanent record on Base Sepolia blockchain
5. **USDC Transfer** - Real payment after all verifications pass

## Why This Matters for Circle Users

**Problem**: When AI agents handle payments, you need to trust they're making correct decisions.

**Solution**: Cryptographic proofs provide mathematical certainty that:
- The AI model actually executed (not spoofed)
- The decision matches claimed inputs
- Everything is permanently recorded on-chain
- Payments only execute after verification

This is useful for:
- **Autonomous payment agents** - Let agents spend within rules you define
- **Subscription services** - Prove AI correctly approved recurring charges
- **Fraud prevention** - Cryptographic evidence of every decision
- **Audit trails** - Immutable record on Base blockchain

## Technical Implementation

**ONNX Model**: 4-input neural network (amount, risk, budget, merchant_score) → decision + confidence

**zkML Proof**: JOLT-Atlas generates proof that model executed correctly (524 bytes, ~600ms)

**On-Chain Verification**:
- Groth16 verifier validates proof cryptographically
- ProofStorage contract stores verification permanently
- Contract: `0x5572b2762ca2e975A6A96b416cc0D9f3bCe1d507` on Base Sepolia

**USDC Integration**: Direct ERC20 transfer on Base Sepolia after all checks pass

## Running the Demo

```bash
# 1. Set environment variables
export PRIVATE_KEY="your_base_sepolia_private_key"
export BASE_RPC_URL="https://sepolia.base.org"
export USDC_ADDRESS="0x036CbD53842c5426634e7929541eC2318f3dCF7e"

# 2. Start server
node server.js

# 3. Open browser
http://localhost:8616
```

## Architecture

```
User Input (amount, risk)
    ↓
ONNX Inference (decision + confidence)
    ↓
JOLT Proof Generation (~600ms)
    ↓
Groth16 Proof Creation
    ↓
On-Chain Storage (Base Sepolia)
    ↓
USDC Transfer (if approved)
```

## Contracts Deployed

**ProofStorage**: `0x5572b2762ca2e975A6A96b416cc0D9f3bCe1d507`
- Stores proof hash, decision, confidence
- Prevents duplicate verifications
- Emits events for audit trail

**USDC Token**: `0x036CbD53842c5426634e7929541eC2318f3dCF7e` (Base Sepolia testnet)

## Files

- `server.js` - Express backend with all API endpoints
- `public/index.html` - UI with workflow visualization
- `contracts/ProofStorage.sol` - On-chain storage contract
- `circuits/` - Groth16 circuits and proving keys
- `onnx-models/agent_classifier.onnx` - Neural network model

## Performance

- ONNX Inference: ~1-5ms
- JOLT Proof: ~600ms
- Groth16 Proof: ~1-2s
- On-Chain Storage: ~2-5s (Base Sepolia block time)
- Total workflow: ~4-7 seconds

## Cost

- On-chain storage: ~50k-100k gas (~$0.001 at 1 gwei)
- USDC transfer: ~50k gas (~$0.001 at 1 gwei)
- Total per transaction: ~$0.002 on Base Sepolia mainnet

## Security Notes

This is a testnet demonstration. For production:
- Use environment variables for private keys
- Implement proper key management
- Add rate limiting
- Validate all inputs
- Audit circuits and contracts
- Use Circle's production APIs

## Links

- Base Sepolia Explorer: https://sepolia.basescan.org
- ProofStorage Contract: https://sepolia.basescan.org/address/0x5572b2762ca2e975A6A96b416cc0D9f3bCe1d507
- USDC Contract: https://sepolia.basescan.org/address/0x036CbD53842c5426634e7929541eC2318f3dCF7e
