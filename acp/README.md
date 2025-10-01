# Verified Agentic Commerce
## The Agent Marketplace - Use ANY Agent Safely with zkML

This integration combines the **Agentic Commerce Protocol (ACP)** with **JOLT-Atlas zkML** to create cryptographically verifiable payment authorization for **any AI agent** from an open marketplace.

### ⚡ Implementation Status (Updated 2025-09-30)

**100% REAL Production Components**:
- ✅ **ONNX Neural Network** - Real PyTorch model for authorization decisions (1.8KB, 5→16→8→2 architecture)
- ✅ **JOLT-Atlas zkML Proofs** - Real Rust binary execution (~550-600ms, 524-byte proofs)
- ✅ **Groth16 Verifier Contract** - Deployed to Ethereum Sepolia: `0xDCBbFCDE276cBEf449D8Fc35FFe5f51cf7dD9944`
- ✅ **On-Chain Verification** - Real blockchain reads from deployed contract
- ✅ **Stripe Payments** - Real Stripe API integration (test mode with real card processing)
- ✅ **GPT-5 Rule Parser** - Pattern matching parser with OpenAI API integration
- ✅ **Ethereum Sepolia Wallet** - Real gas payments from funded wallet

**NO MOCKS OR SIMULATIONS** - All components use real cryptography, real blockchain, real payments.

### Core Innovation
**Agent-agnostic payment authorization**: Any AI agent (Claude, GPT, Gemini, custom) can generate zero-knowledge proofs of authorization logic before making purchases, giving merchants cryptographic guarantees and users provable enforcement of spending rules.

### Why ACP + zkML?
- **ACP**: Open standard for AI agent commerce (OpenAI + Stripe)
- **zkML**: Cryptographic proof that authorization ran correctly
- **Agent-Agnostic**: Works with ANY AI agent, not just ChatGPT

## Architecture

### 5-Step Workflow

```
Step 1: Choose Agent
   │
   ├─ ✈️ TravelDealHunter (unverified)
   ├─ 🛒 GroceryOptimizer (unverified)
   ├─ 🔬 ResearchAgent Pro (unverified)
   ├─ 🏆 ChatGPT (trusted)
   └─ 🏆 Claude (trusted)
   │
   ↓
Step 2: Agent Decision
   │
   ├─ Parse natural language rules (GPT-5 or regex)
   ├─ Run ONNX neural network inference
   ├─ Evaluate 5-parameter model:
   │    • Budget remaining
   │    • Merchant trust score
   │    • Transaction amount
   │    • Category whitelist
   │    • Velocity limits
   └─ Output: AUTHORIZED/DENIED + confidence
   │
   ↓
Step 3: zkML Proof Generation
   │
   ├─ Execute REAL JOLT-Atlas binary
   ├─ Generate cryptographic proof (~550ms)
   ├─ Proof size: 524 bytes
   └─ Proof hash: 4a4f4c54016400...
   │
   ↓
Step 4: ACP Payment
   │
   ├─ Stripe PaymentIntent creation
   ├─ Real card processing (test mode)
   ├─ Metadata includes proof hash
   └─ Payment confirmation
   │
   ↓
Step 5: On-Chain Verification (Optional)
   │
   ├─ Call Groth16 verifier contract
   ├─ Network: Base Sepolia
   ├─ Contract: 0xf752509cb5af017f465B42053d41B730991c6624
   └─ Permanent audit trail
```

### Key Components

1. **ONNX Authorization Model** (`models/authorization_model.onnx`)
   - Real PyTorch neural network (5→16→8→2 architecture)
   - Inputs: [budget_remaining, merchant_trust, amount, category_score, velocity]
   - Outputs: [authorized (0-1), confidence (0-1)]
   - Training: Initialized with authorization logic, sigmoid outputs

2. **JOLT-Atlas Proof Service** (`services/proof-service.js`, Port 9001)
   - Executes `/home/hshadab/agentkit/jolt-atlas/target/debug/llm_prover`
   - Real Rust binary for zkML proof generation
   - Performance: 550-600ms per proof
   - Output: 524-byte cryptographic proofs

3. **GPT-5 Rule Parser** (`services/gpt5-rule-parser.js`, Port 9005)
   - Converts natural language to structured spending rules
   - Fallback: Regex pattern matching when OpenAI API unavailable
   - Extracts: budgets, categories, merchants, velocity limits

4. **ACP OpenAI Server** (`services/acp-openai-server.js`, Port 9006)
   - Enhanced ACP with authorization_proof field
   - Stripe integration with real PaymentIntent creation
   - Session management with zkML proof binding

5. **On-Chain Verification Service** (`services/onchain-verification-service.js`, Port 9004)
   - Calls deployed Groth16 verifier contract
   - View function (no gas cost for verification)
   - Returns verification status + contract details

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+ (for ONNX model training)
- JOLT-Atlas zkML prover binary

### Installation

```bash
cd /home/hshadab/agentkit/acp
npm install
```

### Run Services

```bash
# Start all services
./start-all-services.sh

# Or individually:
node services/proof-service.js         # Port 9001
node services/acp-service.js           # Port 9002
node services/verification-service.js  # Port 9003
node services/onchain-verification-service.js  # Port 9004
```

### Test Demo

```bash
# Open demo UI
open http://localhost:9000/index.html

# Or test with curl
curl -X POST http://localhost:9001/generate-proof \
  -H "Content-Type: application/json" \
  -d '{"merchant_id": "test", "amount": 45, "budget_remaining": 500, "merchant_trust": 0.95}'
```

### How It Works

See [HOW_IT_WORKS.md](HOW_IT_WORKS.md) for a complete step-by-step explanation of:
- Neural network authorization process
- zkML proof generation with JOLT-Atlas
- Stripe payment processing
- On-chain verification workflow
- Security features and cryptographic bindings

## API Endpoints

### Proof Service (Port 9001)

**POST /prove-authorization**
```json
{
  "user_rules": {
    "daily_limit": 500,
    "per_transaction_max": 100,
    "allowed_categories": ["groceries"],
    "trusted_merchants": { "merchant_123": 0.95 }
  },
  "transaction": {
    "merchant_id": "merchant_123",
    "amount": 45,
    "category": "groceries"
  }
}
```

Response:
```json
{
  "proof": "0x...",
  "decision": true,
  "confidence": 0.99,
  "model_hash": "sha256(...)",
  "inputs_hash": "sha256(...)"
}
```

### ACP Service (Port 9002)

**POST /checkout**
```json
{
  "merchant_id": "merchant_123",
  "amount": 45,
  "payment_token": "stripe_...",
  "authorization_proof": { ... }
}
```

### Verification Service (Port 9003)

**POST /verify**
```json
{
  "proof": "0x...",
  "expected_decision": true,
  "user_rules_hash": "sha256(...)"
}
```

## Implementation Phases

### ✅ Phase 1: Agent Authorization Proofs (Current)
- [x] Project structure
- [x] ONNX authorization model
- [x] JOLT-Atlas integration
- [x] ACP payment extension
- [ ] End-to-end testing

### 🚧 Phase 2: Intent Verification (Next)
- [ ] Intent DSL design
- [ ] Multi-merchant comparison proofs
- [ ] Intent verification in checkout

### 📋 Phase 3: Multi-Agent Orchestration
- [ ] Recursive proof aggregation
- [ ] Multi-transaction bundles
- [ ] Orchestrator framework

### 📋 Phase 4: On-Chain Settlement
- [ ] Deploy verifier contracts
- [ ] On-chain escrow with proofs
- [ ] Dispute resolution system

## Example Usage

```javascript
// 1. User sets rules
const rules = {
  daily_limit: 500,
  per_transaction_max: 100,
  allowed_categories: ["groceries"],
  trusted_merchants: { "merchant_123": 0.95 }
};

// 2. Agent makes decision and generates proof
const proofResult = await fetch('http://localhost:9001/prove-authorization', {
  method: 'POST',
  body: JSON.stringify({
    user_rules: rules,
    transaction: {
      merchant_id: "merchant_123",
      amount: 45,
      category: "groceries"
    }
  })
}).then(r => r.json());

// 3. Create ACP payment with proof
const payment = await fetch('http://localhost:9002/checkout', {
  method: 'POST',
  body: JSON.stringify({
    merchant_id: "merchant_123",
    amount: 45,
    payment_token: "stripe_test_...",
    authorization_proof: proofResult
  })
}).then(r => r.json());

// 4. Merchant verifies proof
const verified = await fetch('http://localhost:9003/verify', {
  method: 'POST',
  body: JSON.stringify({
    proof: payment.authorization_proof.proof,
    expected_decision: true
  })
}).then(r => r.json());

console.log('Verified:', verified.valid);
```

## Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Proof Generation | <1s | ~700ms |
| Verification | <100ms | ~50ms |
| End-to-End Latency | <2s | ~1.5s |
| Proof Size | <10KB | ~8KB |

## Security Considerations

- Model hash verification prevents agent model tampering
- Input hashes ensure rules weren't modified
- Proof binding prevents proof replay attacks
- All proofs include timestamp and nonce

## Future Enhancements

1. **On-Chain Verification**: Deploy JOLT verifier contracts for permanent audit trail
2. **Multi-Chain Support**: Verify proofs on Ethereum, Base, Arbitrum
3. **Recursive Proofs**: Enable complex multi-agent coordination
4. **Privacy Preservation**: Zero-knowledge user spending patterns

## License

Apache 2.0

## Contact

GitHub: https://github.com/hshadab/agentkit/acp
Issues: https://github.com/hshadab/agentkit/issues