# Trustless USDC Agents

**Extending Object Oriented Agent Kit with zkML**

Cryptographic proof system that removes trust requirements from AI agent payments, enabling safe use of agents from untrusted marketplaces.

## The Trust Model Problem

**Circle OOAK alone**: Provides secure hooks and structured workflows for agent payments, but requires trusting:
- The agent runtime (OpenAI SDK, LangChain, etc.)
- The agent code itself
- The environment executing the agent

**Circle OOAK + zkML**: Removes trust requirements entirely through cryptographic proofs—agents from untrusted marketplaces can execute payments with mathematical guarantees.

## What This Framework Does

When an agent decides to spend USDC, the system cryptographically proves every step:

1. **ONNX Neural Network Inference** - Real AI decision using a trained authorization model
2. **JOLT-Atlas zkML Proof** - Cryptographic proof the AI model actually executed (~600ms)
3. **Groth16 Proof** - Zero-knowledge proof with public verification
4. **On-Chain Verification** - Permanent record on Base Sepolia blockchain
5. **USDC Transfer** - Payment executes only after all proofs verify

## Why This Matters

**The Agent Marketplace Problem**: You want to use third-party agents for payments, but can't trust unknown code with your funds.

**The zkML Solution**: Mathematical proof that:
- The authorization model actually executed (not spoofed)
- The decision matches the claimed inputs
- Everything is permanently recorded on-chain
- Payments only execute after cryptographic verification

**Use Cases**:
- **Agent Marketplaces** - Safely use untrusted agents with USDC spending limits
- **Autonomous Subscriptions** - Prove AI correctly authorized recurring payments
- **Cross-Platform Agents** - Any agent SDK (not just OpenAI) can be made trustless
- **Compliance & Audit** - Immutable cryptographic proof trail on Base blockchain

## Positioning: General-Purpose Trustless Agent Framework

This extends Circle's OOAK from **secure** (trust-based) to **trustless** (cryptographically proven), enabling Circle's core mission: safe, verifiable USDC transfers via autonomous agents across any platform.

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
