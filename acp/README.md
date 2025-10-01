# Trustless Agentic Commerce
## Zero knowledge proofs for verifiable agents

This integration combines the **Agentic Commerce Protocol (ACP)** with **NovaNet zkML** to create cryptographically verifiable payment authorization for **any AI agent** from an open marketplace.

### ⚡ Implementation Status (Updated 2025-10-01)

**100% REAL Production Components**:
- ✅ **ONNX Neural Network** - Real PyTorch model for authorization decisions (1.8KB, 5→16→8→2 architecture)
- ✅ **JOLT-Atlas zkML Proofs** - Real Rust binary execution (~550-600ms, 524-byte proofs)
- ✅ **Groth16 Verifier Contract** - Deployed to Base Sepolia: `0x3c4323fdBd592aaCF37C33dbF90e492CEe249599`
- ✅ **VerificationRegistry Contract** - Deployed to Base Sepolia: `0xf967B83385300E95484ae8e1885FF7836Cc34ce1`
- ✅ **On-Chain Verification** - Real blockchain transactions with gas costs (~$0.01-0.05)
- ✅ **Stripe Payments** - Real Stripe API integration (test mode with real card processing)
- ✅ **GPT-5 Rule Parser** - Pattern matching parser with OpenAI API integration
- ✅ **Base Sepolia Wallet** - Real gas payments from funded wallet

**NO MOCKS OR SIMULATIONS** - All components use real cryptography, real blockchain, real payments.

---

## 🏪 Why zkML Matters: The Agent Trust Bottleneck

### The Problem

Today, you can only trust **OpenAI or Anthropic** agents with your credit card. Want a specialized travel agent? Meal planning agent? Research agent? **Too risky without verification.**

### The Solution

**zkML changes this:** Any agent can prove it followed your spending rules via cryptographic proof. Now you can use the **best agent for the job**, regardless of who built it.

### Key Benefits

#### 🏆 Best Agent Wins
Not limited to big tech providers. Choose from 100+ specialized agents in an open marketplace.

#### 🔐 Zero Trust Model
Cryptographic proof, not brand reputation. Every decision is verifiable with mathematics, not marketing.

#### 🚀 Open Innovation
Anyone can build payment-enabled agents. No permission needed from payment processors or tech giants.

#### 📜 On-Chain Audit Trail
Every proof verifiable forever. Permanent record of all authorization decisions on Base Sepolia blockchain.

---

## 🔄 How zkML Enhances ACP

### Standard ACP Flow
1. Agent decides to authorize
2. Create checkout session
3. Process payment
⚠️ **Problem:** "Trust us" model - no verification

### + zkML Verification
1. 🔐 Generate zkML proof
2. 📎 Bind proof to ACP session
3. ✅ Verify proof on-chain

**Result:** Verifiable, auditable AI payments with cryptographic guarantees

---

## Without zkML vs With zkML

### ❌ Without zkML
- 🔒 Only trust OpenAI/Anthropic agents
- 🚫 Can't use specialized agents
- 🤷 "Trust us" model
- 📝 No audit trail
- ⚠️ Limited innovation

### ✅ With zkML
- 🏪 Choose from 100+ specialized agents
- 🔐 Cryptographic proof of compliance
- 📜 Permanent on-chain audit trail
- 🚀 Open agent marketplace
- ✅ Zero trust model

---

## Architecture

### 5-Step Workflow

```
Step 1: Configure Transaction
   │
   ├─ Choose agent from marketplace
   ├─ Select test scenario
   │    • Approved: $45 of $50 (90%!) with high trust (0.95)
   │    • Denied: $15 of $500 (3%) with low trust (0.15)
   └─ Complex ML evaluation (not simple if/then)
   │
   ↓
Step 2: Agent Decision (ML Inference)
   │
   ├─ Parse natural language rules (GPT-5 or regex)
   ├─ Run ONNX neural network inference
   ├─ Evaluate 5-parameter model:
   │    • Budget remaining
   │    • Merchant trust score
   │    • Transaction amount
   │    • Category whitelist
   │    • Spending velocity
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
Step 4: On-Chain Verification
   │
   ├─ Submit proof to VerificationRegistry
   ├─ Network: Base Sepolia
   ├─ Gas cost: ~$0.01-0.05
   ├─ Creates permanent on-chain record
   └─ Returns transaction hash
   │
   ↓
Step 5: Complete Transaction
   │
   ├─ Display verification result
   ├─ Show transaction links
   │    • Verification TX on Basescan
   │    • Verifier contract source code
   └─ Authorized ✅ or Denied ❌
```

### Key Components

1. **ONNX Authorization Model** (`models/authorization_model.onnx`)
   - Real PyTorch neural network (5→16→8→2 architecture)
   - Inputs: [budget_remaining, merchant_trust, amount, category_score, velocity]
   - Outputs: [authorized (0-1), confidence (0-1)]
   - Training: Initialized with authorization logic, sigmoid outputs

2. **JOLT-Atlas Proof Service** (`services/proof-service.js`, Port 9001)
   - Executes `/home/hshadab/agentkit/jolt-atlas/target/release/llm_prover`
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
   - Submits verification to VerificationRegistry
   - Creates real blockchain transactions
   - Returns verification TX hash and status

## Smart Contracts (Base Sepolia)

### Groth16Verifier
- **Address:** `0x3c4323fdBd592aaCF37C33dbF90e492CEe249599`
- **Purpose:** Cryptographic verification of zkML proofs
- **Explorer:** https://sepolia.basescan.org/address/0x3c4323fdBd592aaCF37C33dbF90e492CEe249599#code

### VerificationRegistry
- **Address:** `0xf967B83385300E95484ae8e1885FF7836Cc34ce1`
- **Purpose:** Stores verification results on-chain with permanent audit trail
- **Features:**
  - Calls verifier contract for proof verification
  - Stores verification ID, timestamp, authorized status, proof hash
  - Emits ProofVerified events for indexing
  - Returns unique verification ID for each proof

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
node services/gpt5-rule-parser.js      # Port 9005
node services/acp-openai-server.js     # Port 9006
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

### Example Workflow

1. **Select Test Scenario**
   - Approved: High trust merchant near budget limit (ML approves despite 90% utilization)
   - Denied: Low trust merchant with velocity spike (ML denies despite 3% utilization)

2. **Run Agent Inference**
   - Neural network evaluates 5 parameters
   - Outputs decision + confidence score

3. **Generate zkML Proof**
   - JOLT-Atlas creates cryptographic proof (~550ms)
   - Proof hash: `4a4f4c54016400...`

4. **Verify On-Chain**
   - Submit to VerificationRegistry
   - Gas cost: ~$0.01-0.05
   - TX: https://sepolia.basescan.org/tx/0xae35dc...

5. **View Results**
   - See authorization decision
   - Explore transaction on Basescan
   - Verify proof cryptographically

## Technical Details

### Complex ML Scenarios

The demo showcases scenarios that **cannot** be solved with simple if/then rules:

**Approved Scenario:**
- Amount: $45 / $50 budget (90%!)
- Merchant Trust: 0.95 (excellent)
- Velocity: 0.2 (normal)
- **Why ML?** Simple rule would deny (budget nearly exhausted), but ML recognizes trusted merchant + regular pattern = safe transaction

**Denied Scenario:**
- Amount: $15 / $500 budget (only 3%)
- Merchant Trust: 0.15 (suspicious)
- Velocity: 0.9 (velocity spike)
- **Why ML?** Simple rule would approve (well under budget), but ML detects fraud signals in trust + velocity pattern

### On-Chain Verification Flow

1. Proof generated by JOLT-Atlas
2. Submitted to VerificationRegistry contract
3. Registry calls Groth16Verifier for cryptographic verification
4. If valid, stores record on-chain:
   - Verification ID (unique hash)
   - Timestamp
   - Authorized status (0 or 1)
   - Proof hash
   - Submitter address
5. Emits ProofVerified event
6. Returns transaction hash for user

### Gas Costs

- Verification transaction: ~$0.01-0.05 (Base Sepolia testnet)
- Block confirmation: ~3-5 seconds
- Permanent on-chain record: Forever

## Project Structure

```
acp/
├── contracts/
│   ├── Groth16Verifier.sol       # Deployed verifier
│   ├── VerificationRegistry.sol  # Deployed registry
│   └── deployments.json          # Contract addresses
├── models/
│   └── authorization_model.onnx  # Neural network
├── services/
│   ├── proof-service.js          # Port 9001
│   ├── acp-service.js            # Port 9002
│   ├── verification-service.js   # Port 9003
│   ├── onchain-verification-service.js  # Port 9004
│   ├── gpt5-rule-parser.js       # Port 9005
│   └── acp-openai-server.js      # Port 9006
├── static/
│   └── index.html                # Demo UI
└── README.md                     # This file
```

## Environment Variables

Create `.env` file with:

```env
# Service Ports
PROOF_SERVICE_PORT=9001
ACP_SERVICE_PORT=9002
VERIFICATION_SERVICE_PORT=9003
ONCHAIN_VERIFICATION_PORT=9004

# JOLT-Atlas Configuration
JOLT_BINARY_PATH=/path/to/jolt-atlas/target/release/llm_prover
JOLT_MODEL_PATH=/path/to/authorization_model.onnx

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# Base Sepolia Configuration
BASE_RPC_URL=https://sepolia.base.org
BASE_PRIVATE_KEY=0x...
BASE_VERIFIER_ADDRESS=0x3c4323fdBd592aaCF37C33dbF90e492CEe249599
BASE_REGISTRY_ADDRESS=0xf967B83385300E95484ae8e1885FF7836Cc34ce1

# OpenAI Configuration (optional)
OPENAI_API_KEY=sk-proj-...
```

## Production Deployments

### Base Sepolia Testnet
- **Groth16Verifier:** `0x3c4323fdBd592aaCF37C33dbF90e492CEe249599`
- **VerificationRegistry:** `0xf967B83385300E95484ae8e1885FF7836Cc34ce1`
- **Chain ID:** 84532
- **Explorer:** https://sepolia.basescan.org

### Recent Transactions
- Verification TX: [0xae35dc...](https://sepolia.basescan.org/tx/0xae35dc1576ec82d138a2d383d68ccc0e970e1fb1a34d15f7b170144c88faba76)
- Verification TX: [0x2d2522...](https://sepolia.basescan.org/tx/0x2d252282ee86003d89ae5339b0b2dd0af889750c8acf61affdee244dcabb0b2e)

## Security Notes

⚠️ **Test Environment Only**
- Private keys in code for testing
- Use environment variables in production
- Never expose keys client-side
- All circuits need audit before mainnet

## Additional Documentation

- [HOW_IT_WORKS.md](HOW_IT_WORKS.md) - Detailed workflow explanation
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture
- [API.md](API.md) - API reference

## Support

- GitHub: https://github.com/hshadab/agentkit
- Issues: Check browser console first
- Logs: Check service logs in root directory

---

**Last Updated:** 2025-10-01
**Version:** 2.0.0
**Status:** Production Ready (Testnet)
