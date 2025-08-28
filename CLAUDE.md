# Claude Assistant Guide - AgentKit v2.0

## Project Overview
AgentKit is a production-ready verifiable AI agent system that combines:
- **zkML (Zero-Knowledge Machine Learning)** using JOLT-Atlas framework
- **On-chain proof verification** via Nova SNARK verifier  
- **Circle Gateway integration** for programmatic multi-chain USDC transfers

**Latest Update**: 2025-08-27 - Full zkML implementation with real on-chain verification and Circle Gateway attestations.

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

### 2. On-Chain Verifier (Nova SNARK)
- **Backend Port**: 3003 
- **Network**: Ethereum Sepolia
- **Contract**: `0x70928d56Ee88CA586cBE2Ee4cF97Ae2fcc2cA944`
- **Gas Cost**: ~145,000 (optimized)
- **File**: `api/zkml-verifier-backend.js`
- **Real TX Example**: [0x991f5ead5bc34cbb...](https://sepolia.etherscan.io/tx/0x991f5ead5bc34cbb3b5b9c88e95f88f3b8abb9411c4c5b4badcefb01419fc6d6)

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
- **Balance**: 14.78 USDC in Gateway (can run 3 workflows at 4.00 USDC each)

## How to Start Services

```bash
# 1. Start LLM Decision Proof backend (JOLT-Atlas)
node api/zkml-llm-decision-backend.js

# 2. Start LLM verifier backend  
node api/zkml-llm-verifier-backend.js

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

#### Step 2: On-Chain Verification
```javascript
// Proof verified on Ethereum Sepolia
{
    proof: [123, 456, 789, ...], // 9 elements
    publicInputs: [3, 10, 1, 5], // [agentType, amount%, operation, risk]
    useRealChain: true
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
- **Total Gateway Balance**: 14.779987 USDC
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
├── zkml-backend.js           # Port 8002 - 14-param zkML
├── zkml-verifier-backend.js  # Port 3003 - On-chain verifier
└── unified-backend.js        # Combined service (optional)
```

### UI Components
```
static/
├── index-clean.html           # Main UI (SES-safe, use this)
├── js/
│   └── gateway-zkml-working.js # Gateway workflow implementation
└── test-*.html                # Various test pages
```

### Documentation
```
docs/
├── CIRCLE_GATEWAY_ATTESTATION.md  # Attestation explanation
├── MIGRATION_TO_CLEAN_UI.md       # Migration guide
└── REAL_IMPLEMENTATION_STATUS.md  # Verification of real components
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

# Check verifier
curl http://localhost:3003/health

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
On-Chain Verifier (Port 3003)
    - Nova SNARK verification
    - Ethereum Sepolia
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

## Recent Updates (2025-08-27)
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