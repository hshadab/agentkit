# Trustless Agentic Commerce (Demo)
## Zero-knowledge proofs for verifiable agents (testnet + simulations)

This directory contains a demo integration that combines the Agentic Commerce Protocol (ACP) with zkML to explore cryptographically verifiable payment authorization for agents. It mixes real testnet components with simulated logic. Do not use in production. Each section below notes whether a component is real (testnet) or simulated/experimental.

### ⚡ Implementation Status (Updated 2025-10-01)

Components overview (Demo/Testnet):
- ONNX Neural Network — Small demo model for authorization decisions (real inference in some flows)
- JOLT‑Atlas zkML proofs — Real Rust binary execution when available; performance varies by host
- Groth16 Verifier Contract — Deployed to Base Sepolia (testnet): `0x3c4323fdBd592aaCF37C33dbF90e492CEe249599`
- VerificationRegistry Contract — Deployed to Base Sepolia (testnet): `0xf967B83385300E95484ae8e1885FF7836Cc34ce1`
- On‑Chain Verification — Testnet transactions with gas costs (varies)
- Stripe Payments — Test mode only (Stripe test cards)
- Rule Parser Service — Local service that can call OpenAI for parsing (not “GPT‑5”)
- Base Sepolia Wallet — Testnet wallet (do not reuse for production)

---

## 🏪 Why zkML Matters: The Agent Trust Bottleneck (Concept)

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
Public testnet records on Base Sepolia for authorization decisions.

---

## 🔄 How zkML Enhances ACP (Demo)

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

## Without zkML vs With zkML (Concept)

### ❌ Without zkML
- 🔒 Only trust OpenAI/Anthropic agents
- 🚫 Can't use specialized agents
- 🤷 "Trust us" model
- 📝 No audit trail
- ⚠️ Limited innovation

### ✅ With zkML
- 🏪 Choose from 100+ specialized agents
- 🔐 Cryptographic proof of compliance
- 📜 On-chain audit trail (testnet)
- 🚀 Open agent marketplace
- ✅ Zero trust model

---

## Architecture (Demo/Testnet)

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
   ├─ Parse natural language rules (OpenAI or regex; experimental)
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
   ├─ Execute JOLT‑Atlas binary (when available)
   ├─ Generate cryptographic proof (timing varies by host/build)
   ├─ Proof output includes hashed commitments
   └─ Proof hash: 4a4f4c54016400...
   │
   ↓
Step 4: On-Chain Verification
   │
   ├─ Submit proof to VerificationRegistry (testnet)
   ├─ Network: Base Sepolia (testnet)
   ├─ Gas cost: varies (testnet)
   ├─ Creates testnet chain record
   └─ Returns transaction hash
   │
   ↓
Step 5: Complete Transaction
   │
   ├─ Display verification result
   ├─ Show transaction links (testnet explorers)
   │    • Verification TX on Basescan
   │    • Verifier contract source code
   └─ Authorized ✅ or Denied ❌
```

### Key Components

1. **ONNX Authorization Model** (`models/authorization_model.onnx`)
   - Demo PyTorch neural network (5→16→8→2 architecture)
   - Inputs: [budget_remaining, merchant_trust, amount, category_score, velocity]
   - Outputs: [authorized (0-1), confidence (0-1)]
   - Training: Initialized with authorization logic, sigmoid outputs

2. **JOLT‑Atlas Proof Service** (`services/proof-service.js`, Port 9001)
   - Executes `/home/hshadab/agentkit/jolt-atlas/target/release/llm_prover` when present
   - Real Rust binary for zkML proof generation (timing varies)
   - Output includes proof and commitments

3. **Rule Parser Service** (`services/gpt5-rule-parser.js`, Port 9005)
   - Converts natural language to structured spending rules
   - Uses OpenAI when available; otherwise regex fallbacks
   - Extracts: budgets, categories, merchants, velocity limits

4. **ACP OpenAI Server** (`services/acp-openai-server.js`, Port 9006)
   - Enhanced ACP with authorization_proof field
   - Stripe integration with real PaymentIntent creation
   - Session management with zkML proof binding

5. **On‑Chain Verification Service** (`services/onchain-verification-service.js`, Port 9004)
   - Calls deployed Groth16 verifier contract (testnet)
   - Submits verification to VerificationRegistry (testnet)
   - Returns verification TX hash and status

## Smart Contracts (Base Sepolia testnet)

### Groth16Verifier
- **Address:** `0x3c4323fdBd592aaCF37C33dbF90e492CEe249599`
- **Purpose:** Cryptographic verification of zkML proofs
- **Explorer:** https://sepolia.basescan.org/address/0x3c4323fdBd592aaCF37C33dbF90e492CEe249599#code

### VerificationRegistry
- **Address:** `0xf967B83385300E95484ae8e1885FF7836Cc34ce1`
- **Purpose:** Stores verification results on-chain (testnet audit trail)
- **Features:**
  - Calls verifier contract for proof verification
  - Stores verification ID, timestamp, authorized status, proof hash
  - Emits ProofVerified events for indexing
  - Returns unique verification ID for each proof

## Quick Start (Demo/Testnet)

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

4. **Verify On‑Chain (testnet)**
   - Submit to VerificationRegistry on Base Sepolia
   - Gas cost: varies (testnet)
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

### Gas Costs (Testnet)

- Verification transaction: varies on Base Sepolia
- Block confirmation: varies
- Testnet on‑chain record: public, subject to testnet retention policies

## Project Structure

```
acp/
├── README.md                     # This file
├── VERIFICATION.md               # Independent verification guide
├── package.json                  # Dependencies
├── docker-compose.yml            # Docker setup
├── start-all-services.sh         # Service launcher
├── stop-all-services.sh          # Service stopper
│
├── docs/                         # Documentation
│   ├── architecture/             # System design docs (3 files)
│   ├── integration/              # Integration guide (1 file)
│   ├── deployment/               # Deployment docs (2 files)
│   ├── api/                      # API reference (1 file)
│   └── guides/                   # Usage guide (1 file)
│
├── scripts/                      # Utilities
│   ├── deployment/               # Contract deployment
│   ├── testing/                  # Test scripts
│   └── utils/                    # Helper scripts
│
├── services/                     # Backend services
│   ├── proof-service.js          # Port 9001 - JOLT-Atlas
│   ├── acp-openai-server.js      # Port 9006 - ACP + Stripe
│   ├── gpt5-rule-parser.js       # Port 9005 - Rule parser
│   └── onchain-verification-service.js  # Port 9004 - Blockchain
│
├── contracts/                    # Smart contracts
│   ├── Groth16Verifier.sol       # Deployed verifier
│   ├── VerificationRegistry.sol  # Deployed registry
│   └── deployments.json          # Contract addresses
│
├── models/                       # ML models
│   └── authorization_model.onnx  # Neural network (1.8KB)
│
├── static/                       # Frontend
│   └── index.html                # Demo UI (http://localhost:9000)
│
├── circuits/                     # Circom circuits
├── tests/                        # Test suites
└── logs/                         # Runtime logs (gitignored)
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

## Deployments (Testnet)

### Base Sepolia (testnet)
- **Groth16Verifier:** `0x3c4323fdBd592aaCF37C33dbF90e492CEe249599`
- **VerificationRegistry:** `0xf967B83385300E95484ae8e1885FF7836Cc34ce1`
- **Chain ID:** 84532
- **Explorer:** https://sepolia.basescan.org

### Recent Transactions
- Verification TX: [0xae35dc...](https://sepolia.basescan.org/tx/0xae35dc1576ec82d138a2d383d68ccc0e970e1fb1a34d15f7b170144c88faba76)
- Verification TX: [0x2d2522...](https://sepolia.basescan.org/tx/0x2d252282ee86003d89ae5339b0b2dd0af889750c8acf61affdee244dcabb0b2e)

## Security Notes

⚠️ Demo/Testnet only
- Private keys must not be committed; use environment variables
- Never expose keys client‑side
- No audits; do not deploy to mainnet based on this demo

## Additional Documentation

### Core Documentation
- [VERIFICATION.md](VERIFICATION.md) - Independent verification guide (no marketing, just commands)

### Architecture & Design
- [docs/architecture/HOW_IT_WORKS.md](docs/architecture/HOW_IT_WORKS.md) - Detailed workflow explanation
- [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) - System architecture
- [docs/architecture/AGENT_AGNOSTIC.md](docs/architecture/AGENT_AGNOSTIC.md) - Agent marketplace concept

### Integration
- [docs/integration/ACP_INTEGRATION_COMPLETE.md](docs/integration/ACP_INTEGRATION_COMPLETE.md) - Complete integration guide

### Deployment
- [docs/deployment/DOCKER.md](docs/deployment/DOCKER.md) - Docker deployment
- [docs/deployment/QUICKSTART.md](docs/deployment/QUICKSTART.md) - Quick start guide

### API & Usage
- [docs/api/ACP_ENDPOINTS.md](docs/api/ACP_ENDPOINTS.md) - Complete API reference
- [docs/guides/USAGE_GUIDE.md](docs/guides/USAGE_GUIDE.md) - Usage examples

### Scripts
- [scripts/deployment/](scripts/deployment/) - Contract deployment scripts
- [scripts/testing/](scripts/testing/) - Test and verification scripts
- [scripts/utils/](scripts/utils/) - Utility scripts

## Support

- GitHub: https://github.com/hshadab/agentkit
- Issues: Check browser console first
- Logs: Check `logs/` directory for service logs

---

**Last Updated:** 2025-10-01
**Version:** 2.0.0
**Status:** Demo/Testnet only
