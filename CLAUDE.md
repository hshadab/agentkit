# Claude Assistant Guide - AgentKit v3.0 (Demo/Testnet)

## Project Overview
AgentKit is a demo/testnet project exploring verifiable AI agents with cryptographic proofs across blockchains. The v3.0 release features ACP‑compatible endpoints and JOLT‑Atlas zkML proofs integrated into example flows. Some components are real on testnets; others are simulated.

**Latest Update**: 2025-10-05 - zkML ONNX Verifier (demo). Groth16 zkSNARK proofs using snarkjs and local verification paths. Intended for testing on local/dev environments. Location: `zkml-verifier/` | UI: http://localhost:9101

## ⚠️ Implementation Policy: Show, Don't Tell
**Verification Over Marketing**: Strive to include commands and references; consider claims illustrative unless linked to reproducible artifacts.

- ✅ Rule parser service (optional OpenAI) → See logs for model/usage when enabled
- ✅ Real JOLT-Atlas binary → Binary exists, executes, generates proofs
- ✅ Real Stripe payments → PaymentIntent IDs in Stripe Dashboard
- ✅ Real on-chain verification → Transaction hashes on Basescan
- ✅ Deterministic authorization → Golden test corpus with byte-for-byte matching
- 📝 **Verification Guide**: `acp/VERIFICATION.md` - No marketing, just commands

## 🎯 Core Technologies Stack

### 0. ACP × zkML Agent Marketplace (v3.0) — Demo/Testnet
- **Location**: `acp/` directory
- **Purpose**: The Agent Marketplace - Use ANY Agent Safely with zkML
- **Concept**: Enable untrusted agents from marketplace to spend with cryptographic proof
- **Demo**: http://localhost:9000/index.html (5-step workflow)

**Core Components**:
1. **ONNX Authorization Model** - Real PyTorch neural network
   - File: `acp/models/authorization_model.onnx` (1.8KB)
   - Architecture: 5 inputs → 16 hidden → 8 hidden → 2 outputs
   - Inputs: [budget_remaining, merchant_trust, amount, category_score, velocity]
   - Outputs: [authorized (0-1), confidence (0-1)]
   - Created: `acp/scripts/create-authorization-model.py`

2. **JOLT-Atlas Proof Service** (Port 9001)
   - Binary: `/home/hshadab/agentkit/jolt-atlas/target/debug/llm_prover`
   - Real Rust execution: 550-600ms per proof
   - Proof size: 524 bytes
   - File: `acp/services/proof-service.js`

3. **Rule Parser Service** (Port 9005)
   - Natural language → structured spending rules
   - Fallback: Regex pattern matching (when OpenAI unavailable)
   - File: `acp/services/gpt5-rule-parser.js`

4. **ACP OpenAI Server** (Port 9006)
   - Full ACP specification + zkML extensions
   - Real Stripe integration (test mode)
   - File: `acp/services/acp-openai-server.js`

5. **Groth16 Verifier Contract** - DEPLOYED
   - Network: Base Sepolia (Chain ID: 84532)
   - Address: `0xf752509cb5af017f465B42053d41B730991c6624`
   - Type: JOLT Decision Verifier (Groth16 zkSNARK)
   - Deployment TX: `0xcadc18929ba483bbde2df7ae9b9209a4447485f3fa596a963a08527ca842bd06`
   - Explorer: https://sepolia.basescan.org/address/0xf752509cb5af017f465B42053d41B730991c6624
   - Script: `acp/contracts/deploy-jolt-verifier.js`

6. **On-Chain Verification Service** (Port 9004)
   - Calls deployed Groth16 verifier contract
   - View function: no gas cost for verification
   - File: `acp/services/onchain-verification-service.js`

**5-Step Workflow**:
1. **Agent Chosen** - Select unverified agent from marketplace dropdown
2. **AI Agent Inference** - ONNX neural network runs authorization (5 inputs → decision + confidence)
3. **zkML Inference Proof** - JOLT-Atlas generates cryptographic proof (~600ms)
4. **On-Chain Proof Verification** - Groth16 verifier contract on Base Sepolia (testnet record)
5. **ACP Payment** - Real Stripe PaymentIntent only executes after verification succeeds

**UI Features** (http://localhost:9000/index.html):
- Unverified agent marketplace dropdown (TravelDealHunter, GroceryOptimizer, ResearchAgent Pro, Custom)
- Pre-configured test scenarios: ✅ Approved ($45/$50, 90% budget) vs ❌ Denied ($15/$500, fraud signals)
- Real-time workflow progress with animated cards
- Live contract links: deployed verifier + explorer
- Automatic test card integration (4242...)

**Status**: Demo/Testnet; some parts simulated or optional

### 0.5. zkML ONNX Verifier - Standalone Model Verification (NEW)
- **Location**: `zkml-verifier/` directory
- **Purpose**: Cryptographic proof that AI models work as documented
- **Business Value**: Regulatory compliance, model integrity verification, audit trails
- **UI**: http://localhost:9101 | **Backend**: http://localhost:9100

**What It Does**:
Provides cryptographic proof that ONNX machine learning models produce specific outputs for given inputs. No marketplace, no registry - just pure verification.

**Core Components**:
1. **Verification Service** (Port 9100)
   - File: `zkml-verifier/server.js`
   - Accepts ONNX models up to 50MB
   - Runs inference with test inputs
   - Generates JOLT-Atlas proofs (~600ms)
   - Returns verification ID and proof hash

2. **Web UI** (Port 9101)
   - File: `zkml-verifier/ui/index.html`
   - Three example models: Authorization (1.8KB), MNIST (26KB), MobileNetV2 (13.3MB)
   - Pre-built test scenarios (legitimate, fraud, mixed, edge cases)
   - Real-time inference results with proof generation
   - Shareable verification records

**Supported Model Types**:
- **2D Tensors**: Fraud detection, credit scoring, tabular data (e.g., `[1, 5]`)
- **4D Tensors**: Image classification, object detection (e.g., `[1, 3, 224, 224]`)
- **Auto-detection**: Infers tensor shape from input array length
  - 5 elements → `[1, 5]` (fraud detection)
  - 784 elements → `[1, 1, 28, 28]` (MNIST)
  - 150,528 elements → `[1, 3, 224, 224]` (MobileNetV2/ImageNet)

**Business Benefits**:
- ✅ **Regulatory Compliance**: AML/KYC proof with cryptographic audit trails
- ✅ **Model Integrity**: SHA-256 hashing detects model tampering
- ✅ **Third-Party Verification**: Independent validation via verification ID
- ✅ **Performance Guarantees**: Prove accuracy claims with test results
- ✅ **Risk Management**: Cryptographic proof of due diligence
- ✅ **Trust & Transparency**: Demonstrate model correctness to auditors

**Example Workflow**:
```bash
# Start services
cd zkml-verifier
node server.js          # Backend on port 9100
cd ui && node server.js # UI on port 9101

# Visit http://localhost:9101
# 1. Select "Authorization Model" (fraud detection)
# 2. Choose "Legitimate Transaction" scenario
# 3. Click "Generate zkML Proof"
# 4. Get verification ID: 0x7a3f... + proof hash: 0x8b2e...
# 5. Share verification ID for independent validation
```

**API Endpoints**:
- `POST /verify` - Upload ONNX model + test inputs → verification record
- `GET /verification/:id` - Retrieve verification details by ID
- `GET /health` - Service health check

**Output Format**:
```json
{
  "success": true,
  "verificationId": "0x7a3f...",
  "modelHash": "0x8b2e...",
  "proofHash": "0x1c4d...",
  "proofSystem": "JOLT-Atlas",
  "testCasesPassed": 5,
  "testResults": [...],
  "performance": {
    "inferenceTimeMs": 2,
    "proofGenerationMs": 600,
    "totalTimeMs": 602
  }
}
```

**Use Cases**:
- **Banks**: Prove fraud detection models meet regulatory standards
- **Fintechs**: Demonstrate credit scoring fairness to regulators
- **Healthcare**: Verify diagnostic AI models operate correctly
- **Insurance**: Validate risk assessment models for auditors
- **Trading**: Prove ML trading strategies execute as documented

**Local Verification** (NEW):
- ✅ **Real Groth16 zkSNARK proofs** - Using snarkjs for cryptographic proof generation
- ✅ **Download proof files** - Shareable JSON files with full cryptographic proofs
- ✅ **Local verification** - Verify proofs offline without blockchain (instant, free, private)
- ✅ **Zero blockchain dependency** - All verification happens locally using cryptography
- ✅ **Audit-ready** - Proof files can be shared with auditors for independent verification

**Complete Workflow**:
```
1. Generate Proof:
   Upload ONNX → Run Inference → Generate Groth16 Proof (~1-2s) → Download proof.json

2. Verify Proof (Offline):
   Upload proof.json → Local Groth16 Verification (~10ms) → ✅ Valid / ❌ Invalid
```

**Proof Download**:
- Format: JSON file with full Groth16 proof
- Size: ~2-5 KB per proof
- Contains: Proof data, model hash, test inputs/outputs, timestamp
- Verification: Works offline, no internet needed

**Local vs Blockchain**:
| Feature | Local Verification | Blockchain Verification |
|---------|-------------------|------------------------|
| Speed | ~10ms | ~15 seconds |
| Cost | Free | ~$0.50 gas |
| Privacy | 100% private | Public record |
| Offline | ✅ Yes | ❌ No |
| Audit Trail | Manual storage | On-chain (testnet) |

**Status**: Demo/Testnet; ONNX inference + Groth16 examples available

### 1. zkEngine - Universal Proof Generation
- **Language**: Rust compiled to WASM
- **Location**: `zkengine/` and `zkengine_binary/`
- **Proof Types**: 14+ including KYC, location, IoT, medical, trading
- **Performance**: Sub-second generation for most proofs
- **Key Files**:
  - `zkengine_binary/zkEngine` - Main binary
  - `zkengine/src/` - Rust source code
  - `zkengine/wasm/` - WASM compilation

### 2. zkML System (JOLT-Atlas) — Demo/Testnet
- **Model**: LLM Decision Proof Model (14 parameters)
- **Framework**: JOLT-Atlas with recursive SNARKs
- **Backend Port**: 8002
- **Proof Time**: ~500ms (REAL Rust binary execution)
- **Binary**: `jolt-atlas/target/release/llm_prover`
- **File**: `api/zkml-llm-decision-backend.js`
- **Endpoints**:
  - POST `/zkml/prove` - Generate LLM Decision Proof
  - GET `/zkml/status/:sessionId` - Check proof status
- **Performance**: 20x faster than previous implementation

### 3. On-Chain JOLT Verifier (Testnet)
- **Backend Port**: 3004
- **Contract**: `0xDCBbFCDE276cBEf449D8Fc35FFe5f51cf7dD9944` on Ethereum Sepolia
- **Purpose**: On-chain verification (testnet) with audit trail
- **Circuit**: Simplified (2 params: decision, confidence) for demo
- **File**: `api/groth16-jolt-backend-real.js`
- **Cost**: varies on testnet (creates a testnet record)
- **Features**: 
  - Stores verification on-chain (testnet)
  - Emits events for audit trail
  - Returns transaction hash as proof
  - Prevents double-verification
- **Future**: Can be expanded to validate all 14 LLM parameters

### 4. Multi-Chain Support
- **Ethereum & L2s**: Base, Arbitrum, Optimism
- **Avalanche**: Healthcare focus (medical records)
- **Solana**: High-frequency trading and gaming
- **IoTeX**: IoT device verification
- **Circle Integration**: Gateway and CCTP

## 📁 Project Structure

```
agentkit/
├── zkengine/                 # Rust zkEngine core
├── zkengine_binary/         # Compiled zkEngine binaries
├── circuits/                # Circom circuits for all proof types
├── contracts/               # Smart contracts for each chain
├── circle/                  # Circle integration
│   ├── gateway/            # Attestation-based transfers
│   └── cctp/              # Cross-chain transfer protocol
├── api/                    # Backend services
├── static/                 # Web UI
├── tests/                  # Test suites
│   ├── integration/       # Integration tests
│   ├── scripts/          # Shell scripts
│   └── ui/              # UI test pages
└── examples/              # Usage examples
```

## 🚀 Starting Services

### Complete Stack
```bash
# Start all services
./start-all-services.sh

# Or individually:
node api/zkml-llm-decision-backend.js              # Port 8002 - zkML proof generation
node api/groth16-jolt-backend-real.js             # Port 3004 - REAL on-chain verification (costs gas)
node api/avalanche-medical-groth16.js             # Port 8003 - Medical records with Groth16
node api/base-ai-prediction-groth16.js            # Port 8004 - AI commit-reveal predictions
node api/base-ai-prediction-zkengine-groth16.js   # Port 8005 - Hybrid zkEngine+Groth16
node api/iotex-proximity-zkengine.js              # Port 8006 - IoT proximity proofs
node api/gateway-balance-proxy.js                 # Port 8007 - Circle balance tracking
python3 scripts/utils/serve-no-cache.py           # Port 8000 - Web UI
```

### Chain-Specific Services
```bash
# Avalanche medical records with Groth16 (REAL)
node api/avalanche-medical-groth16.js

# Base AI predictions (NEW)
node api/base-ai-prediction-groth16.js          # Commit-reveal scheme
node api/base-ai-prediction-zkengine-groth16.js # Hybrid WASM+Groth16

# IoTeX device verification with zkEngine (NEW)
node api/iotex-proximity-zkengine.js

# Solana high-speed verification
node api/solana-game-backend.js

# Circle Gateway balance tracking (NEW)
node api/gateway-balance-proxy.js
```

## 🏥 Use Case Examples

### Avalanche - Medical Records (Demo/Testnet Groth16 Verification)
```javascript
// Three-step workflow with REAL Groth16 proof-of-proof verification
// Backend: api/avalanche-medical-groth16.js (Port 8003)

// Step 1: Create medical record on-chain (costs AVAX gas)
const record = await createMedicalRecord({
    patientId: 3,
    recordData: 549,  // Medical data encoded as number
    diagnosis: "encrypted",
    treatment: "encrypted"
});
// Real TX: 0x6ca214258f20dd4d9eb5a3c7194433d9b680e715825676e8955857bc3ad4dc9e

// Step 2: Generate Groth16 proof (1-2 seconds)
const proof = await snarkjs.groth16.fullProve(
    { patientId, recordData, recordHash },
    WASM_PATH,
    ZKEY_PATH
);
// Generates cryptographic Groth16 proof with public signals
// Public signal: computed hash (e.g., 301410)

// Step 3: Verify proof cryptographically on-chain (costs AVAX gas)
const verified = await verifierContract.verifyProof(
    proof.a, proof.b, proof.c, publicSignals
);
// Real TX: 0x9cc6aa7b74ab4e4bba1348ff69c3b8e7d9e279309a738a1abb6befc233f09951
// Groth16 Verifier: 0xe285dA4D9808DEabb0608Fb2f8F99256Bd80e0ea
// Records Contract: 0x1698ebB10e789EebE7A66bDb096F0a65ce49Dc68
// Full cryptographic verification using pairing checks
```

### IoTeX - IoT Device Proximity (REAL DEPLOYED CONTRACTS)
```javascript
// Backend: api/iotex-proximity-zkengine-real.js (Port 8007)
// REAL contracts deployed on IoTeX testnet - NO SIMULATIONS

// Deployed Contracts (REAL - Verifiable on IoTeX Explorer):
// ProximityGroth16Verifier (6-signal): 0x9948D8d9Cc8848653c062a5Fdcfea931535DF81A
// IoTeXProximitySystem: 0xC1BAa1a7A001aC7a476F60ECB5050f8fd6d211DE
// Explorer: https://testnet.iotexscan.io/address/0xC1BAa1a7A001aC7a476F60ECB5050f8fd6d211DE

// 5-Step Workflow with Real On-Chain Verification:
// Step 1: Register device on-chain (costs gas)
const deviceId = await systemContract.registerDevice(deviceSecret);

// Step 2: Generate zkEngine proof (using prove_location.wasm)
const zkProof = await zkEngine.generateProof(deviceX, deviceY);

// Step 3: Generate Groth16 proof-of-proof with ProximityVerification circuit
const groth16Proof = await snarkjs.groth16.fullProve(
    { deviceSecret, centerX, centerY, deviceIdHash, x, y, timestamp, nonce },
    "circuits/ProximityVerification.wasm",
    "api/proximity_0001.zkey"
);

// Step 4: Verify on IoTeX blockchain (REAL transaction)
const tx = await systemContract.verifyProximityAndReward(
    groth16Proof.a, groth16Proof.b, groth16Proof.c, publicSignals
);

// Step 5: Claim IOTX rewards
const claimTx = await systemContract.claimRewards();
// Gas cost: ~200k IOTX per verification
```

### Base - AI Predictions & DeFi Trading (NEW)
```javascript
// Backend: api/base-ai-prediction-groth16.js (Port 8004)
// Commit-reveal scheme for temporal proof of AI predictions

// Step 1: Commit prediction before outcome
const commitment = await aiContract.commitPrediction(
    promptHash,    // keccak256(prompt + nonce)
    responseHash   // keccak256(response + nonce)
);
// TX: 0xCommitTxHash on Base Sepolia

// Step 2: Generate Groth16 proof
const proof = await snarkjs.groth16.fullProve(
    { prompt, response, nonce },
    "circuits/AIPredictionSimple.wasm",
    "circuits/ai_simple_0000.zkey"
);

// Step 3: Reveal with proof after outcome
const revealed = await aiContract.revealPrediction(
    prompt,
    response,
    nonce,
    proof
);
// Verifier: 0x28F7de77C120f92ceB5E14Efab4fCA31c7ac212E
// Commitment: 0xae7d069d0A45a8Ecd969ABbb2705bA96472D36FC

// Alternative: zkEngine + Groth16 Hybrid (Port 8005)
// Combines WASM proof generation with on-chain Groth16 verification
```

## 🔄 x402 Agent Authorization Workflow

### Four-Step Process

#### Step 1: Agent Authorization Proof (zkML)
- Agent proves it can spend based on rules
- Budget remaining: $95.43
- Merchant risk: 0.12 (safe)
- ~500ms generation with JOLT-Atlas

#### Step 2: x402 Attestation
- Binds authorization proof to payment intent
- EIP-712 typed data for MetaMask
- Links AI decision to HTTP micropayment

#### Step 3: On-Chain Verification (Testnet)
- Groth16 proof-of-proof on Base Sepolia (testnet)
- Creates a testnet audit trail
- ~350k gas cost
- Example: [0xcb0f2abf...](https://sepolia.basescan.org/tx/0xcb0f2abf65efb852a93413da261688d223856f1854546ba329542263033f1787)

#### Step 4: USDC Transfer
- EIP-3009 transferWithAuthorization
- Gasless for users
- Real USDC on Base Sepolia
- $0.01 per demo transaction

### Notes
- **Agent Authorization Model**: Proves agents CAN spend, not blocking fraud
- Some flows may be simulated; on-chain examples use testnets
- Reference implementation for x402-like flows

## 📊 Performance Metrics

| Proof Type | Generation | Verification | Chains |
|------------|------------|--------------|--------|
| zkML (JOLT-Atlas) | ~500ms | ~365k gas (~0.0005 ETH) | All EVM |
| Medical Records | 3s | 200k gas | Avalanche |
| IoT Proximity | 1s | 150k gas | IoTeX |
| Trading Decision | 2s | 150k gas | Base |
| Game State | 500ms | 5k lamports | Solana |

## 💰 Current Balances

- **Circle Gateway**: 18.80 USDC
- **Available Workflows**: 4 complete runs
- **Cost per Workflow**: 4.00 USDC (2 chains)

## 🧪 Testing

### Quick Tests
```bash
# Test zkML workflow
./tests/scripts/test-14param.sh

# Test Groth16 verification
node tests/integration/test-groth16-verification.js

# Test medical records proof
node tests/integration/test-avalanche-medical.js

# Test IoT proximity
node tests/integration/test-iotex-proximity.js
```

### UI Testing
- Main UI: http://localhost:8000/index-clean.html
- Test pages in `tests/ui/`

## 🔧 Common Issues

### RPC Connection Issues (FIXED)
- **Problem**: Groth16 backend timeout on startup due to ethers network detection
- **Solution**: Implemented retry logic with multiple fallback RPCs
- **Fallback RPCs**:
  - `https://eth-sepolia.public.blastapi.io` (primary)
  - `https://ethereum-sepolia-rpc.publicnode.com`
  - `https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161`
  - `https://rpc.sepolia.org`
- **Fix**: Added staticNetwork mode and 5-second timeout per RPC attempt

### Balance Issues
- Minimum: 2.00 USDC per transfer + 2.001 USDC fee
- Total needed per workflow: 8.002 USDC (2 chains)
- Check Gateway balance via API, not wallet

### Verification Failures
- Ensure all services running (ports 8002, 3004, 8000)
- Check contract addresses match deployment
- Verify wallet has sufficient ETH for gas (~0.001 ETH)

## 🏗️ Development Guide

### Adding New Proof Types
1. Create circuit in `circuits/`
2. Add zkEngine function in `zkengine/src/`
3. Deploy verifier contract
4. Add backend endpoint

### Adding New Chains
1. Deploy verifier contract to chain
2. Update `contracts/` with deployment
3. Add chain config to backends
4. Test with examples

### Updating UI
- Main file: `static/js/gateway-zkml-polling.js`
- Styles: `static/css/`
- Keep SES-safe (no dynamic code generation)

## 📝 Recent Updates

### 2025-10-05 - zkML ONNX Verifier: LOCAL VERIFICATION with Real Groth16 Proofs
- ✅ **Real Groth16 zkSNARK proofs** - Replaced simulated proofs with snarkjs cryptographic proof generation
- ✅ **Proof file download** - Download full proofs as JSON files (~2-5 KB)
- ✅ **Local offline verification** - Verify proofs without blockchain (~10ms, zero cost, 100% private)
- ✅ **Circom circuit** - Created OnnxVerification.circom for model integrity verification
- ✅ **Upload & verify UI** - New section for uploading proof files and verifying them
- ✅ **Complete audit workflow** - Generate → Download → Share → Verify independently
- ✅ **Zero blockchain dependency** - All cryptography happens locally
- 📁 **Circuit files**: `zkml-verifier/circuits/OnnxVerification.{circom,wasm,zkey}`
- 🔗 **Endpoints**: `/download-proof/:id`, `/verify-proof`
- 📊 **Performance**: Proof gen ~1-2s, Verification ~10ms
- 💼 **Perfect for**: Internal compliance, client audits, confidential AI models

### 2025-10-04 - zkML ONNX Verifier: Standalone Model Verification Service
- ✅ **Standalone verification service** - No marketplace, no registry, just pure model verification
- ✅ **Smart tensor shape inference** - Auto-detects 2D (tabular) vs 4D (image) models from input length
- ✅ **Three example models** - Authorization (1.8KB), MNIST (26KB), MobileNetV2 (13.3MB)
- ✅ **Pre-built test scenarios** - Legitimate, fraud, mixed, edge case test sets
- ✅ **ONNX inference + JOLT proofs** - Real onnxruntime-node execution + cryptographic proofs
- ✅ **Verification records** - Shareable verification IDs with model hash, proof hash, test results
- ✅ **Business-focused documentation** - Clear regulatory compliance and audit trail benefits
- 📁 **Location**: `zkml-verifier/` directory
- 🔗 **UI**: http://localhost:9101 | **Backend**: http://localhost:9100
- 📊 **Performance**: ~600ms proof generation, supports models up to 50MB
- 💼 **Use Cases**: AML/KYC compliance, model integrity verification, regulatory audits

### 2025-10-03 - Circle OOAK: Real On-Chain Storage + USDC Payments
- ✅ **Deployed ProofStorage contract** - `0x5572b2762ca2e975A6A96b416cc0D9f3bCe1d507` on Base Sepolia
- ✅ **Real on-chain storage** - Permanent proof verification records on Base blockchain
- ✅ **USDC payment integration** - Direct ERC20 transfers on Base Sepolia (9.98 USDC balance)
- ✅ **Full workflow implementation** - ONNX → JOLT (~600ms) → Groth16 → Storage → USDC
- ✅ **Transaction links in UI** - Both verification and payment TXs shown with Base explorer links
- ✅ **Purple UI indication** - Visual feedback for verification flow status
- 📁 **Location**: `Circle-OOAK/node-ui/` directory
- 🔗 **Server**: http://localhost:8616
- 📊 **Performance**: ~4-7s total workflow, ~$0.002 per transaction

### 2025-09-30 - Agent Marketplace with Real ONNX + Deployed Verifier
- ✅ **Created real ONNX authorization model** - PyTorch neural network (5→16→8→2)
- ✅ **Deployed JOLT verifier to Base Sepolia** - Contract: `0xf752509cb5af017f465B42053d41B730991c6624`
- ✅ **5-step workflow UI** - Split agent decision from zkML proof generation
- ✅ **Agent marketplace concept** - Enable untrusted agents with cryptographic guarantees
- ✅ **Scenario-based testing** - ✅ Approved ($2.50/$500) vs ❌ Denied ($300/$50)
- ✅ **Contract links in UI** - Step 5 displays verifier contract + deployment TX
- ✅ **Real on-chain verification** - Calls deployed Groth16 verifier (view function)
- 📊 **Model tests**: Good tx → 1.000 authorized, Bad tx → 0.334 authorized
- 🔗 **Explorer**: https://sepolia.basescan.org/address/0xf752509cb5af017f465B42053d41B730991c6624
- 📁 **Files**: `acp/models/authorization_model.onnx`, `acp/contracts/deploy-jolt-verifier.js`

### 2025-09-26 - Real AI Neural Network for Payment Authorization
- ✅ **Integrated ONNX neural network** for real AI decision making
- ✅ **5-layer model** evaluating budget, trust, amount, category, velocity
- ✅ **5-step workflow**: AI inference → zkML proof → Attestation → Verification → Payment
- ✅ **Real-time inference** in ~1ms with 99% confidence scores
- ✅ **zkML proves AI ran** - cryptographic guarantee of neural network execution
- ✅ **UI shows AI details**: Prompt, model architecture, input features, decision reasoning
- ✅ **Service on port 8009**: `api/zkml-payment-auth-onnx.js`
- 🧠 Example: "Authorize $1 to API merchant?" → AI: "Yes (99% confidence)"

### 2025-09-26 - x402 Agent Authorization Implementation
- ✅ Transformed zkML from fraud detection to **agent authorization model**
- ✅ Agent proves it CAN spend based on budget, risk, categories
- ✅ Real Base Sepolia RPC via PublicNode (fixed timeout issues)
- ✅ Complete flow with real USDC transfers
- ✅ Production x402 with EIP-3009 transferWithAuthorization
- 🔗 Example verification: https://sepolia.basescan.org/tx/0xcb0f2abf65efb852a93413da261688d223856f1854546ba329542263033f1787

## 📝 Previous Updates

### 2025-09-08 - IoTeX Proximity Verification Demo/Testnet Implementation
- ✅ Created custom ProximityVerification.circom circuit outputting 6 signals
- ✅ Generated trusted setup and zkey file for Groth16 proofs
- ✅ Deployed ProximityGroth16Verifier: `0x9948D8d9Cc8848653c062a5Fdcfea931535DF81A`
- ✅ Deployed IoTeXProximitySystem: `0xC1BAa1a7A001aC7a476F60ECB5050f8fd6d211DE`
- ✅ Full 5-step workflow: device registration → zkEngine → Groth16 → on-chain → rewards
- ✅ Real IOTX transactions with gas costs (~200k per verification)
- ✅ Using prove_location.wasm for zkEngine proximity proofs
- ✅ Real snarkjs.groth16.fullProve() for proof generation
- ✅ Verifiable on IoTeX testnet explorer
- 🔗 Explorer: https://testnet.iotexscan.io/address/0xC1BAa1a7A001aC7a476F60ECB5050f8fd6d211DE

### 2025-09-05 - New Services and Implementations
- ✅ Base AI Prediction with Commit-Reveal scheme (Port 8004)
- ✅ Base AI Prediction zkEngine+Groth16 hybrid (Port 8005)
- ✅ IoTeX Proximity with zkEngine WASM proofs (Port 8006)
- ✅ Circle Gateway Balance Proxy service (Port 8007)
- ✅ AI Prediction circuits and verifiers deployed
- ✅ All services tested and running in production
- 📝 Commit-reveal provides temporal proof of AI predictions
- 📝 zkEngine integration enables browser-based proof generation

### 2025-09-03 - Avalanche Medical with REAL Groth16 Proof-of-Proof
- ✅ Upgraded from hash comparison to full Groth16 cryptographic verification
- ✅ Deployed Groth16 verifier contract: `0xe285dA4D9808DEabb0608Fb2f8F99256Bd80e0ea`
- ✅ Real Groth16 proof generation using snarkjs (1-2 seconds)
- ✅ On-chain cryptographic verification with pairing checks
- ✅ Same security level as zkML workflow - full zero-knowledge privacy
- ✅ Example verification TX: `0x9cc6aa7b74ab4e4bba1348ff69c3b8e7d9e279309a738a1abb6befc233f09951`
- ✅ Gas cost: ~148k for verification (includes pairing operations)
- 📝 Circuit: MedicalIntegritySimple.circom with 1 public input

### 2025-09-03 - Avalanche Medical Records with Real zkEngine + On-Chain
- ✅ Implemented complete 3-step medical records workflow on Avalanche
- ✅ Real zkEngine proof generation using factorial.wasm (24-30 seconds)
- ✅ Real on-chain transactions for record creation and verification
- ✅ All transactions verifiable on Snowtrace explorer
- ✅ Contract: 0x1698ebB10e789EebE7A66bDb096F0a65ce49Dc68 on Avalanche Fuji
- ✅ Gas source: Pre-funded test wallet with ~0.5 AVAX
- 📝 Patient IDs capped at 1-20 for reasonable computation time
- 🔗 Example TXs: Create: 0x6738b290..., Verify: 0x9b7bc607...

### 2025-09-02 - Groth16 Backend Fix & Circle Gateway Verification
- ✅ Fixed RPC timeout issues in Groth16 backend with retry logic
- ✅ Added multiple fallback RPC endpoints for resilience
- ✅ Implemented lazy provider initialization
- ✅ Verified Circle Gateway transfers working (balance: 18.80 → 10.80 USDC)
- ✅ Recent verification TX: [0x30775278f457979fcf71f51c8726168f8929db699884761b84183a73ec92875c](https://sepolia.etherscan.io/tx/0x30775278f457979fcf71f51c8726168f8929db699884761b84183a73ec92875c)
- ✅ All 3 workflow steps now complete successfully

### 2025-08-29 - Demo/Testnet Implementation Complete
- ✅ Real zkML proof generation with Rust binary (~500ms)
- ✅ Real on-chain verification with gas costs (~0.0005 ETH)
- ✅ Permanent blockchain records with transaction hashes
- ✅ Example TX: [0x5bd91b0146b1e67e8a1a182a8295b574f3313ec989128c04ab07b93d234bd59f](https://sepolia.etherscan.io/tx/0x5bd91b0146b1e67e8a1a182a8295b574f3313ec989128c04ab07b93d234bd59f)
- ✅ Where possible, real flows are used; some steps remain simulated for safety

### 2025-08-29 - On-Chain JOLT Verification
- ✅ Deployed simplified JOLT verifier to Sepolia (0x1279FEDc2A21Ae16dC6bfE2bE0B89175f98BD308)
- ✅ Created Circom circuit for zkML decision verification
- ✅ Integrated real on-chain verification into Step 2
- ✅ Reduced proof time from 10-15s to ~500ms with Rust binary
- 📝 Note: Using simplified 2-parameter circuit for demo (decision + confidence)
- 🔮 Future: Can expand to validate all 14 LLM parameters

### 2025-08-29 - Major Reorganization
- ✅ Cleaned root directory structure
- ✅ Reorganized Circle folders (gateway/cctp)
- ✅ Broadened README scope to all chains
- ✅ Updated UI text and spacing
- ✅ Fixed Groth16 RPC stability

### 2025-08-28 - Groth16 Integration
- ✅ Replaced Nova with Groth16 proof-of-proof
- ✅ Added clickable verification links
- ✅ Fixed view function handling

### 2025-08-27 - zkML Implementation
- ✅ Real on-chain verification
- ✅ EIP-712 signing implementation
- ✅ Real attestations from Circle

## 🔐 Security Notes

⚠️ **Test Environment Only**
- Private keys in code for testing
- Use environment variables in production
- Never expose keys client-side
- All circuits need audit before mainnet

## 📚 Additional Documentation

- [zkEngine Documentation](zkengine/README.md)
- [Circle Gateway Guide](circle/gateway/README.md)
- [Circle CCTP Guide](circle/cctp/README.md)
- [API Reference](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)

## 📞 Support

- GitHub: https://github.com/hshadab/agentkit
- Issues: Check browser console first
- Logs: Check service logs in root directory

## 🎨 UI Integration Plan (index.html → index-clean.html)

### Current State
- **index.html**: Full-featured with multiple proof types, zkEngine, code editor
- **index-clean.html**: Clean Gateway zkML demo, SES-safe, working Circle integration

### Integration Phases

#### Phase 1: Backend Consolidation (1 week)
- Create `api/unified-backend-v2.js` merging all proof endpoints
- Standardize proof response format across all types
- Add OpenAI integration for natural language routing
- Include zkEngine endpoints (KYC, Location, AI Content, Device)

#### Phase 2: Component Library (1 week)
```
static/js/components/
├── ProofCard.js        # Display any proof type
├── VerificationCard.js # Show verification status
├── WorkflowProgress.js # Multi-step progress
├── CodeDisplay.js      # C/WASM/Circom viewer
└── TransactionCard.js  # Blockchain transactions
```
- Maintain SES compliance (no eval/Function)
- Pre-compiled templates only

#### Phase 3: Feature Integration (2 weeks)
- **Proof Type Selector**: Dropdown for zkML, KYC, Location, AI, Device, Custom
- **zkEngine Workflows**: C → WASM compilation visualization
- **OpenAI Routing**: Natural language → proof type detection
- **History & Analytics**: localStorage-based proof/verification history

#### Phase 4: Advanced Features (2 weeks)
- **Multi-chain Support**: Chain selector with appropriate verifiers
- **File Handling**: Upload C code, paste functionality, export/import
- **Developer Tools**: Circuit viewer, WASM debugger, gas estimation

#### Phase 5: Polish & Optimization (1 week)
- Performance: Lazy loading, WASM caching, service workers
- UX: Guided tutorials, error recovery, keyboard shortcuts
- Accessibility: ARIA labels, keyboard navigation

### Migration Strategy
1. Keep `index-clean.html` working during development
2. Build in `index-next.html` for testing
3. Feature flag system for gradual rollout
4. A/B test with subset of users
5. Final swap when verified

### Priority Order
1. **Gateway zkML** - Keep as hero feature
2. **KYC Proofs** - Most requested
3. **Location Proofs** - IoT use cases
4. **AI Content** - Trending feature
5. **Custom Proofs** - Developer audience

### Technical Requirements
- Maintain SES compliance throughout
- Progressive enhancement (basic features work without all backends)
- Responsive design for mobile wallets
- Cross-browser compatibility
- Unit/integration/E2E testing

### Timeline: ~7 weeks total

---

## 🔄 Nova+JOLT Arecibo Integration Status

### Current Implementation (Simulated)
The Nova+JOLT system in `nova-jolt/` currently uses **simulated folding** for demonstration:
- ✅ Functional API and architecture
- ✅ Correct workflow and data flow
- ⚠️ Mock cryptographic operations (not real Nova)
- ⚠️ Random proof generation (not verifiable)

### Real Arecibo Integration (Planned)
Full integration plan available at: `nova-jolt/arecibo-integration/ARECIBO_INTEGRATION_PLAN.md`

**Key Differences**:
| Component | Current (Simulated) | Target (Real Arecibo) |
|-----------|--------------------|-----------------------|
| Proof Folding | SHA256 concatenation | Real recursive SNARKs |
| Verification | Parameter checking | Pairing-based verification |
| Gas Cost | Estimated | Actual ~300k per verification |
| Security | None (demo only) | 128-bit cryptographic |
| Timeline | Working now | 4-5 weeks to implement |

**To implement real Nova**:
1. Build Rust FFI bindings (`nova-jolt/arecibo-integration/rust-ffi/`)
2. Generate verifier contracts from Arecibo
3. Replace mock functions with real Nova calls
4. Deploy generated verifiers on-chain

**Resources needed**:
- 1 Rust developer familiar with zkSNARKs
- 1 Solidity developer for contract integration
- ~$50k budget for 5-week implementation

See `nova-jolt/arecibo-integration/` for complete implementation guide.

## 🔄 Circle Gateway Product Feedback

Based on building this zkML + Circle Gateway integration:

### Critical Issues for Developer Experience

1. **Minimum Transfer Amount Too High**
   - Current: 2.000001 USDC per transfer (testnet)
   - Suggested: 0.01 USDC for testing
   - Impact: At $4/workflow, developers burn through test funds quickly

2. **Attestation-Only Response Creates UX Confusion**
   - Issue: 498-char attestation returned immediately, tx hash after 15-30 min
   - Need: `pendingTransactionUrl` or estimated settlement time
   - Current workaround: Complex 5-minute polling for 2 hours

3. **No Same-Domain Transfers**
   - Can't transfer Ethereum → Ethereum
   - Forces unnecessary multi-chain flows
   - Limits consolidation use cases

### Positive Aspects
- EIP-712 signing implementation is clean
- Multi-chain L2 support is comprehensive
- API stability has been excellent
- Error messages are clear and actionable

### Feature Requests for AI Agents
- Batch operations API
- Conditional transfers ("if-then" logic)
- Webhook support for settlement notifications
- WebSocket endpoint for real-time updates

---

*This guide is for developers working on AgentKit. For general documentation, see README.md*
