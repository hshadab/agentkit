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

### 2. zkML System (JOLT-Atlas)
- **Model**: LLM Decision Proof Model (14 parameters)
- **Framework**: JOLT-Atlas with recursive SNARKs
- **Backend Port**: 8002
- **Proof Time**: 10-15 seconds
- **File**: `api/zkml-llm-decision-backend.js`
- **Endpoints**:
  - POST `/zkml/prove` - Generate LLM Decision Proof
  - GET `/zkml/status/:sessionId` - Check proof status

### 3. Groth16 Proof-of-Proof Verifier
- **Backend Port**: 3004
- **Contract**: `0xE2506E6871EAe022608B97d92D5e051210DF684E` on Ethereum Sepolia
- **Purpose**: Proves zkML proofs are valid (meta-verification)
- **File**: `api/groth16-verifier-backend.js`
- **Note**: Uses view function (no gas for queries)

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
node api/zkml-llm-decision-backend.js    # Port 8002
node api/groth16-verifier-backend.js     # Port 3004
python3 scripts/utils/serve-no-cache.py  # Port 8000
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
| zkML (JOLT-Atlas) | 10-15s | 2s | All EVM |
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

---

*This guide is for developers working on AgentKit. For general documentation, see README.md*