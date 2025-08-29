# Claude Assistant Guide - AgentKit v2.0

## Project Overview
AgentKit is a **universal verifiable AI agent framework** that enables trustless AI operations across multiple blockchains with cryptographic proof of correct execution. The system combines zkEngine (Rust-based universal proof generation), zkML (JOLT-Atlas), multi-chain verification, and Circle integration for cross-chain asset management.

**Latest Update**: 2025-08-29 - Repository reorganization, broader multi-chain scope, Groth16 integration complete.

## 🎯 Core Technologies Stack

### 1. zkEngine - Universal Proof Generation
- **Language**: Rust compiled to WASM
- **Location**: `zkengine/` and `zkengine_binary/`
- **Proof Types**: 14+ including KYC, location, IoT, medical, trading
- **Performance**: Sub-second generation for most proofs
- **Key Files**:
  - `zkengine_binary/zkEngine` - Main binary
  - `zkengine/src/` - Rust source code
  - `zkengine/wasm/` - WASM compilation

### 2. zkML System (JOLT-Atlas) - 100% REAL
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

### 3. On-Chain JOLT Verifier (REAL)
- **Backend Port**: 3004
- **Contract**: `0xDCBbFCDE276cBEf449D8Fc35FFe5f51cf7dD9944` on Ethereum Sepolia
- **Purpose**: PERMANENT on-chain verification with audit trail
- **Circuit**: Simplified (2 params: decision, confidence) for demo
- **File**: `api/groth16-jolt-backend-real.js`
- **Cost**: ~0.0005 ETH per verification (creates permanent record)
- **Features**: 
  - Stores verification on-chain permanently
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
node api/zkml-llm-decision-backend.js      # Port 8002 - zkML proof generation
node api/groth16-jolt-backend-real.js     # Port 3004 - REAL on-chain verification (costs gas)
python3 scripts/utils/serve-no-cache.py    # Port 8000 - Web UI
```

### Chain-Specific Services
```bash
# Avalanche medical records
node api/avalanche-medical-backend.js

# IoTeX device verification
node api/iotex-device-backend.js

# Solana high-speed verification
node api/solana-game-backend.js
```

## 🏥 Use Case Examples

### Avalanche - Medical Records
```javascript
// Verify medical record without exposing patient data
const proof = await zkEngine.generateMedicalRecordProof({
    patientId: "hash(SSN)",
    diagnosis: "encrypted",
    timestamp: Date.now()
});
// Contract: contracts/MedicalRecordsIntegrity_Avalanche.sol
```

### IoTeX - IoT Device Proximity
```javascript
// Prove device location without revealing coordinates
const proof = await zkEngine.generateProximityProof({
    deviceId: "0xDEVICE",
    distance: "<100m",
    timestamp: Date.now()
});
// Contract: contracts/IoTeXProximityVerifier.sol
```

### Base - DeFi Trading
```javascript
// Prove trading compliance without revealing strategy
const proof = await zkEngine.generateTradingProof({
    strategy: "market_neutral",
    riskLimit: 0.02,
    leverage: 3
});
// Uses Groth16 verifier for Base
```

## 🔄 Gateway zkML Workflow

### Three-Step Process

#### Step 1: JOLT-Atlas zkML
- Generate proof that AI made correct decision
- 14 parameters validated
- ~10 second generation

#### Step 2: Ethereum On-Chain Verification
- Groth16 proof-of-proof verification
- View function (no gas cost)
- Block-level verification

#### Step 3: Circle Gateway Spending
- Programmatic EIP-712 signing
- Multi-chain USDC transfers
- Returns attestations (not tx hashes)

### Trigger
User must say: **"gateway"** AND **"zkml"**

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

### RPC Connection Issues
- Primary: `https://eth-sepolia.public.blastapi.io`
- Fallbacks configured in each backend

### Balance Issues
- Minimum: 2.00 USDC per transfer
- Check Gateway balance, not wallet

### Verification Failures
- Ensure all services running
- Check contract addresses match deployment

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