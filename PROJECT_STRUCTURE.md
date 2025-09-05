# AgentKit Project Structure

## 📁 Directory Organization

```
agentkit/
├── api/                          # Backend Services
│   ├── zkml-llm-decision-backend.js              # REAL zkML proof generation (port 8002)
│   ├── groth16-jolt-backend-real.js              # REAL on-chain verification (port 3004)
│   ├── avalanche-medical-groth16.js              # Medical records with Groth16 (port 8003)
│   ├── base-ai-prediction-groth16.js             # AI commit-reveal predictions (port 8004)
│   ├── base-ai-prediction-zkengine-groth16.js    # Hybrid zkEngine+Groth16 (port 8005)
│   ├── iotex-proximity-zkengine.js               # IoT proximity proofs (port 8006)
│   ├── gateway-balance-proxy.js                  # Circle balance tracking (port 8007)
│   ├── unified-backend.js                        # Unified endpoint for all proofs
│   └── [chain]-backend.js                        # Other chain-specific backends
│
├── circuits/                     # Circom Circuits
│   ├── jolt-verifier/           # JOLT decision verification circuits
│   │   ├── jolt_decision_simple.circom   # 2-param circuit (decision, confidence)
│   │   ├── JOLTDecisionSimpleVerifier.sol # Generated verifier contract
│   │   └── setup_simple_circuit.sh       # Circuit compilation script
│   ├── AIPredictionProof.circom          # AI prediction proof circuit
│   ├── AIPredictionSimple.circom         # Simplified AI prediction circuit
│   ├── AIPredictionProof_js/             # Generated JS files
│   ├── AIPredictionSimple_js/            # Generated JS files
│   ├── ai_prediction_0000.zkey           # Proving key for AI predictions
│   ├── ai_simple_0000.zkey               # Simplified proving key
│   └── [proof-type]/            # Other proof circuits
│
├── contracts/                    # Smart Contracts
│   ├── JOLTDecisionVerifierWithStorage.sol   # Storage verifier (permanent records)
│   ├── MedicalRecordsIntegrity_Avalanche.sol
│   ├── IoTeXProximityVerifier.sol
│   ├── AIPredictionGroth16Verifier.sol       # AI prediction verifier
│   ├── AIPredictionGroth16VerifierNew.sol    # Updated AI verifier
│   └── [chain]_[purpose].sol
│
├── deployments/                  # Contract Deployment Info
│   ├── jolt-storage-verifier-sepolia.json  # Main verifier (0xDCBbFCDE...)
│   ├── jolt-simple-verifier-sepolia.json   # Simple verifier
│   └── [contract]-[network].json
│
├── jolt-atlas/                   # REAL zkML Implementation
│   ├── src/                      # Rust source code
│   │   ├── llm_decision.rs      # 14-parameter LLM model
│   │   └── bin/llm_prover.rs    # CLI binary
│   └── target/release/llm_prover # Compiled binary (~500ms proofs)
│
├── zkengine/                     # Universal Proof Engine
│   ├── src/                      # Rust source
│   └── zkEngine_dev/wasm_file   # WASM binary
│
├── circle/                       # Circle Integration
│   ├── gateway/                 # Gateway attestations
│   └── cctp/                    # Cross-chain transfers
│
├── static/                       # Web UI
│   ├── index-clean.html         # Main UI with real verification
│   ├── js/
│   │   └── gateway-zkml-polling.js  # Updated with TX display
│   └── css/
│
├── tests/                        # Test Suites
│   ├── integration/
│   │   ├── test-real-workflow.js        # Real workflow with gas
│   │   └── test-complete-workflow.js    # Full 3-step test
│   └── scripts/
│
├── scripts/                      # Utility Scripts
│   ├── deploy-verifier-with-storage.js  # Deploy storage verifier
│   ├── deploy-simple-verifier.js        # Deploy simple verifier
│   └── start-all-services.sh            # Start all backends
│
├── docs/                         # Documentation
│   ├── VERIFICATION_MODES.md    # View vs State-changing explained
│   └── API.md                   # API reference
│
├── README.md                     # Main documentation (REAL implementation)
├── CLAUDE.md                     # Developer guide (100% real)
└── PROJECT_STRUCTURE.md         # This file
```

## 🔑 Key Files for Real Implementation

### zkML Proof Generation (REAL)
- **Binary**: `jolt-atlas/target/release/llm_prover`
- **Backend**: `api/zkml-llm-decision-backend.js`
- **Port**: 8002
- **Proof Time**: ~500ms

### On-Chain Verification (REAL)
- **Contract**: `0xDCBbFCDE276cBEf449D8Fc35FFe5f51cf7dD9944`
- **Backend**: `api/groth16-jolt-backend-real.js`
- **Port**: 3004
- **Gas Cost**: ~344k gas (~0.0005 ETH)

### UI Integration
- **Main UI**: `static/index-clean.html`
- **JS**: `static/js/gateway-zkml-polling.js`
- **Shows**: Transaction hash, gas costs, permanent record

## 🚀 Starting Services

```bash
# Start all services
./start-all-services.sh

# Or individually:
node api/zkml-llm-decision-backend.js              # Port 8002 - zkML proof generation
node api/groth16-jolt-backend-real.js             # Port 3004 - On-chain verification
node api/avalanche-medical-groth16.js             # Port 8003 - Medical records
node api/base-ai-prediction-groth16.js            # Port 8004 - AI predictions
node api/base-ai-prediction-zkengine-groth16.js   # Port 8005 - Hybrid proofs
node api/iotex-proximity-zkengine.js              # Port 8006 - IoT proximity
node api/gateway-balance-proxy.js                 # Port 8007 - Circle balance
python3 scripts/utils/serve-no-cache.py           # Port 8000 - Web UI
```

## ✅ Verification This is Real

1. **Check zkML Binary**: 
   ```bash
   ./jolt-atlas/target/release/llm_prover --help
   ```

2. **View Contract on Etherscan**:
   https://sepolia.etherscan.io/address/0xDCBbFCDE276cBEf449D8Fc35FFe5f51cf7dD9944

3. **Example Transaction**:
   https://sepolia.etherscan.io/tx/0x5bd91b0146b1e67e8a1a182a8295b574f3313ec989128c04ab07b93d234bd59f

## 📝 No Simulations

- ❌ NO setTimeout delays
- ❌ NO mock responses
- ❌ NO fake proofs
- ✅ REAL Rust binary
- ✅ REAL gas costs
- ✅ REAL blockchain records