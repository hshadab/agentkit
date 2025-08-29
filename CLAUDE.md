# Claude Assistant Guide - AgentKit v2.0

## Project Overview
AgentKit is a production-ready verifiable AI agent system that combines:
- **zkML (Zero-Knowledge Machine Learning)** using JOLT-Atlas framework
- **On-chain proof verification** via Nova SNARK verifier  
- **Circle Gateway integration** for programmatic multi-chain USDC transfers

**Latest Update**: 2025-08-29 - Groth16 proof-of-proof integration complete with real on-chain verification links.

## 🎯 Key Technical Components

### 1. zkML System (JOLT-Atlas)
- **Model**: LLM Decision Proof Model (14 parameters)
  - 5 Input verification params (prompt hash, rules, temperature, etc.)
  - 5 Decision process params (confidence scores, attention weights)
  - 4 Output validation params (format, amount, recipient, decision)
- **Framework**: JOLT-Atlas with recursive SNARKs and lookup tables
- **Backend Port**: 8002
- **Proof Time**: 10-15 seconds
- **Purpose**: Proves LLM agent correctly authorized USDC spending
- **Endpoints**:
  - POST `/zkml/prove` - Generate LLM Decision Proof
  - GET `/zkml/status/:sessionId` - Check proof status
- **File**: `api/zkml-llm-decision-backend.js`

### 2. Groth16 Proof-of-Proof Verifier
- **Backend Port**: 3004
- **Network**: Ethereum Sepolia
- **Contract**: `0xE2506E6871EAe022608B97d92D5e051210DF684E` ([View on Etherscan](https://sepolia.etherscan.io/address/0xE2506E6871EAe022608B97d92D5e051210DF684E))
- **Purpose**: Proves the zkML proof itself is valid (proof-of-proof)
- **File**: `api/groth16-verifier-backend.js`
- **Function**: `verifyProof(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[5] signals)` - View function (no tx created)
- **Verification Example**: [Block #9085599](https://sepolia.etherscan.io/block/9085599)
- **Note**: Uses view function so no transaction is created, verification shown via block number

### 3. Circle Gateway Integration
- **Purpose**: Multi-chain USDC transfers with zkML authorization
- **Minimum Transfer**: 2.00 USDC per chain (4.00 total for 2 chains)
- **Supported Cross-Chain Transfers**:
  - Ethereum → Base Sepolia (Domain 0 → 6)
  - Ethereum → Avalanche Fuji (Domain 0 → 1)
  - **Note**: Same-domain transfers not allowed (e.g., Ethereum → Ethereum)
- **Implementation**: EIP-712 programmatic signing
- **Gateway Wallet**: `0x0077777d7EBA4688BDeF3E311b846F25870A19B9`
- **Transfer Status Polling**:
  - Polls every 5 minutes for pending transfers
  - Stores transfers in localStorage key: `gateway_pending_transfers`
  - Maximum 24 polling attempts (2 hours)
  - Updates UI with real tx hash when settlement completes

### 4. Web Interface
- **Port**: 8000
- **Main Page**: http://localhost:8000/index-clean.html (SES-safe)
- **Balance**: 18.80 USDC in Gateway (can run 4 workflows at 4.00 USDC each)

## How to Start Services

```bash
# 1. Start LLM Decision Proof backend (JOLT-Atlas)
node api/zkml-llm-decision-backend.js

# 2. Start Groth16 proof-of-proof backend
node api/groth16-verifier-backend.js

# 3. Start web server (with no-cache)
python3 serve-no-cache.py
```

## Gateway zkML Workflow - Technical Details

### Trigger Requirements
User must say both keywords: **"gateway"** AND **"zkml"**

### Three-Step Execution Flow

#### Step 1: zkML Proof Generation
```javascript
// 14-parameter input for sentiment analysis
{
    is_financial_agent: 1,
    amount: 100,
    is_gateway_op: 1,
    risk_score: 20,
    confidence_score: 95,
    authorization_level: 3,
    compliance_check: 1,
    fraud_detection_score: 10,
    transaction_velocity: 5,
    account_reputation: 85,
    geo_risk_factor: 15,
    time_risk_factor: 10,
    pattern_match_score: 90,
    ml_confidence_score: 92
}
```

#### Step 2: Groth16 Proof-of-Proof Verification
```javascript
// Groth16 proof verified on Ethereum Sepolia
{
    proof: {
        a: [BigNumber, BigNumber],
        b: [[BigNumber, BigNumber], [BigNumber, BigNumber]],
        c: [BigNumber, BigNumber]
    },
    publicSignals: [1, 152399025, 1, 95, 1], // 5 signals
    verificationBlock: 9085599 // View function returns boolean, no tx
}
```

#### Step 3: Gateway Transfers (EIP-712)
```javascript
// Programmatic signing for Circle Gateway
const burnIntent = {
    maxBlockHeight: MAX_UINT256,
    maxFee: "2000001",
    spec: {
        sourceDomain: 0,
        destinationDomain: chain.domain,
        value: "2000001", // 2.000001 USDC minimum
        // ... other fields
    }
}
const signature = await wallet._signTypedData(domain, types, burnIntent);
```

## Important Technical Notes

### Circle Gateway Attestations
- Gateway returns **attestations**, not immediate tx hashes
- Format: 498-character hex proof
- Settlement: Batched, occurs 15-30 minutes later
- This is by design for gas optimization

### Balance Requirements
- **Total Gateway Balance**: 18.799988 USDC
- **Minimum per transfer**: 2.000001 USDC
- **Workflow cost**: 6.000003 USDC (3 chains)
- **Available workflows**: 2 complete runs

### Real vs Demo
- ✅ zkML proofs are REAL (JOLT-Atlas)
- ✅ On-chain verification is REAL (Ethereum Sepolia)
- ✅ Gateway attestations are REAL (Circle API)
- ❌ NO fake transaction hashes shown
- ❌ NO demo links if something fails

## Files Structure

### Core Services
```
api/
├── zkml-llm-decision-backend.js  # Port 8002 - LLM Decision Proof (JOLT-Atlas)
├── groth16-verifier-backend.js   # Port 3004 - Groth16 proof-of-proof verifier
├── zkml-llm-verifier-backend.js  # Port 3003 - Nova verifier (deprecated)
└── unified-backend.js             # Combined service (optional)
```

### Circle Gateway Integration
```
circle-gateway/
├── api/                   # Gateway-specific APIs
├── scripts/              # Deposit and transfer scripts
├── tests/                # Gateway test files
└── docs/                 # Gateway documentation
```

### UI Components
```
static/
├── index-clean.html      # Main UI (SES-safe, use this)
├── js/
│   └── gateway-zkml-polling.js  # Gateway workflow with polling
└── css/                  # Stylesheets
```

### Smart Contracts
```
contracts/
├── RealZKMLNovaVerifier.sol      # Nova verifier (deprecated)
└── ZKMLProofVerifier.sol         # Groth16 proof-of-proof verifier

deployments/
├── sepolia-real-verifier.json    # Nova deployment (deprecated)
└── groth16-verifier.json         # Groth16 verifier deployment
```

### Testing
```
tests/
├── scripts/              # Shell test scripts
├── integration/          # JavaScript integration tests
└── ui/                   # HTML test pages
```

## Testing Commands

### Quick Tests
```bash
# Test 14-parameter model
./test-14param.sh

# Test complete UI workflow
./test-ui-workflow.sh

# Direct API test
curl -X POST http://localhost:8002/zkml/prove \
  -H "Content-Type: application/json" \
  -d '{"input": {...14 parameters...}}'
```

### Verify Services
```bash
# Check zkML backend
curl http://localhost:8002/health

# Check Groth16 verifier
curl http://localhost:3004/health

# Check Gateway balance
curl -X POST https://gateway-api-testnet.circle.com/v1/balances \
  -H "Authorization: Bearer SAND_API_KEY:..." \
  -d '{"token": "USDC", "sources": [...]}'
```

## Common Issues & Solutions

### "Insufficient balance" errors
- Minimum is 2.000001 USDC, not 0.01
- Check Gateway balance, not wallet balance
- Use http://localhost:8000/test-usdc-balance.html

### No transaction links in Step 3
- This is correct! Circle batches transfers
- Look for attestation instead
- Real txs appear 15-30 min later

### SES/MetaMask errors
- Use index-clean.html, not index.html
- All string concatenation removed
- 100% SES-safe implementation

## Architecture Overview

```
User Input (Natural Language)
        ↓
zkML Backend (Port 8002)
    - 14-param model
    - JOLT-Atlas proof
        ↓
Groth16 Verifier (Port 3004)
    - Proof-of-proof verification
    - Ethereum Sepolia
    - View function (no tx)
        ↓
Circle Gateway API
    - EIP-712 signing
    - Multi-chain transfers
    - Returns attestations
```

## For Developers

### Adding New zkML Models
1. Extend `api/zkml-backend.js`
2. Add parameters to model
3. Deploy new verifier contract
4. Update verification logic

### Integrating New Chains
1. Check Circle Gateway support
2. Add domain mapping
3. Update destination token addresses
4. Test with minimum amounts

### Performance Optimization
- zkML proof: 10-15s (optimized with lookup tables)
- On-chain: 145k gas (vs 500k traditional)
- Gateway: <30s for acceptance

## Security Notes
⚠️ **Private key in code for testing only**
- Production should use MetaMask or backend service
- Never expose private keys client-side
- Use environment variables for API keys

## Recent Updates

### 2025-08-29 - Groth16 Integration
- ✅ Replaced Nova verifier with Groth16 proof-of-proof
- ✅ Fixed RPC connection issues with stable endpoints
- ✅ Added clickable verification block links
- ✅ Removed fake transaction hashes (view functions don't create txs)
- ✅ Updated UI to show real block numbers
- ✅ Gateway balance increased to 18.80 USDC

### 2025-08-27 - Initial zkML Implementation
- ✅ Fixed on-chain verification to use real blockchain
- ✅ Implemented programmatic EIP-712 signing
- ✅ Updated to show real attestations only
- ✅ Fixed balance display and calculations
- ✅ Removed all fake/demo transaction hashes
- ✅ Updated to real minimum amounts (2.000001 USDC)
- ✅ **NEW: Transfer Status Polling System**
  - Polls Circle Gateway every 5 minutes for transfer status
  - Stores pending transfers in localStorage
  - Updates UI with real tx hashes when transfers complete
  - Maximum 2-hour polling window per transfer

## Contact & Support
- GitHub: https://github.com/hshadab/agentkit
- Issues: Check browser console for errors
- Testing: Use standalone pages if main UI has issues