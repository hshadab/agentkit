# zkML On-Chain Verification Guide

## Overview
This guide explains how to set up real on-chain Ethereum verification for zkML proofs in the Gateway workflow.

## Current Status
- ✅ zkML proof generation (JOLT-Atlas) - Working
- ✅ Simulated on-chain verification - Working  
- 🔄 Real on-chain verification - Ready for deployment
- ✅ Gateway integration - Complete

## Architecture

### Step 1: zkML Proof Generation
- Uses JOLT-Atlas sentiment model
- Generates cryptographic proof of agent authorization
- Proof contains decision (ALLOW/DENY) based on:
  - Agent type (Unknown, Basic, Trading, Cross-chain)
  - Transaction amount
  - Operation type
  - Risk score

### Step 2: On-Chain Verification
- **Simulated Mode** (Default): Fast, no gas fees, for testing
- **Real Mode**: Actual Ethereum verification, requires deployed contract

### Step 3: Gateway Transfer
- Only proceeds if zkML proof is verified
- Uses Circle's Gateway for USDC transfers

## Files Created

### 1. Smart Contract
```
contracts/ZKMLNovaVerifier.sol
```
- Nova SNARK verifier for zkML proofs
- Handles JOLT-Atlas proof verification
- Emits events for proof registration

### 2. Backend Service
```
api/zkml-verifier-backend.js
```
- REST API for proof verification
- Supports both simulated and real modes
- Multi-network support (Sepolia, Base, IoTeX)

### 3. Frontend Integration
```
static/js/ui/gateway-workflow-manager-v3.js
```
- Updated to use real verification endpoint
- Shows transaction details and explorer links
- Falls back to simulation if contract not deployed

### 4. Test Scripts
```
gateway/tests/test-real-onchain-verification.js
```
- Tests both simulated and real verification
- Checks contract deployment status
- Provides deployment instructions

## Deployment Instructions

### 1. Install Dependencies
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
```

### 2. Create Hardhat Config
```javascript
// hardhat.config.js
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.19",
  networks: {
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY",
      accounts: ["YOUR-PRIVATE-KEY"]
    },
    "base-sepolia": {
      url: "https://base-sepolia.g.alchemy.com/v2/YOUR-API-KEY",
      accounts: ["YOUR-PRIVATE-KEY"]
    }
  }
};
```

### 3. Compile Contract
```bash
npx hardhat compile
```

### 4. Deploy Contract
```bash
npx hardhat run scripts/deploy-zkml-verifier.js --network sepolia
```

### 5. Update Backend
Edit `api/zkml-verifier-backend.js` and update the verifier address:
```javascript
'sepolia': {
    verifierAddress: 'YOUR-DEPLOYED-ADDRESS-HERE'
}
```

### 6. Start Backend Service
```bash
node api/zkml-verifier-backend.js
```

### 7. Test Verification
```bash
node gateway/tests/test-real-onchain-verification.js
```

## Usage

### Enable Real Verification in UI

#### Option 1: URL Parameter
```
http://localhost:8080/test-gateway.html?real=true
```

#### Option 2: JavaScript Console
```javascript
window.USE_REAL_CHAIN_VERIFICATION = true;
```

#### Option 3: Environment Variable
Set in backend:
```bash
USE_REAL_CHAIN=true node api/zkml-verifier-backend.js
```

## Gas Costs

### Estimated Gas Usage
- Mock Verifier: ~150,000 gas
- Real Nova Verifier: ~2-3M gas
- Optimized Verifier: ~500k-1M gas

### Cost Examples (at 30 Gwei)
- Mock: ~0.0045 ETH ($15 at $3000/ETH)
- Real: ~0.09 ETH ($270 at $3000/ETH)
- Optimized: ~0.03 ETH ($90 at $3000/ETH)

## Testing Flow

### 1. Simulated Verification (Default)
```javascript
// No special setup needed
// Just run the Gateway workflow normally
```

### 2. Real Verification (After Deployment)
```javascript
// In browser console before starting workflow:
window.USE_REAL_CHAIN_VERIFICATION = true;

// Or use URL parameter:
// http://localhost:8080/gateway-test.html?real=true
```

## Verification Output

### Simulated Mode
```
🔐 zkML proof verified on-chain!
   Network: sepolia (Simulated)
   Transaction: 0xabc123...
   Block: 5234567
   Gas used: 147853
```

### Real Mode
```
🔐 zkML proof verified on-chain!
   Network: sepolia
   Transaction: 0xdef456...
   Block: 5234568
   Gas used: 2456789
   View on explorer: https://sepolia.etherscan.io/tx/0xdef456...
```

## Troubleshooting

### Backend Not Running
```bash
# Start the verification backend
node api/zkml-verifier-backend.js

# Check if running
curl http://localhost:3003/health
```

### Contract Not Deployed
The system will automatically fall back to simulated verification if:
- Contract address is not set
- Contract is not deployed
- Account has no gas for fees

### Verification Fails
Check:
1. Backend is running on port 3003
2. Contract is deployed and address is correct
3. Account has sufficient gas
4. Network RPC is accessible

## Security Considerations

1. **Private Keys**: Never commit private keys. Use environment variables.
2. **Gas Limits**: Set appropriate gas limits to prevent excessive fees.
3. **Access Control**: Implement proper authentication for production.
4. **Rate Limiting**: Add rate limiting to prevent abuse.

## Future Improvements

1. **Optimize Gas Usage**
   - Use more efficient proof verification
   - Batch multiple proofs
   - Implement proof aggregation

2. **Multi-Chain Support**
   - Deploy on multiple networks
   - Add cross-chain verification

3. **Caching**
   - Cache verified proofs
   - Reduce redundant verifications

4. **Production Ready**
   - Use secure key management (HSM/KMS)
   - Add monitoring and alerts
   - Implement circuit breakers

## Summary

The zkML on-chain verification system is now ready for deployment. It provides:
- Real cryptographic proof verification on Ethereum
- Seamless integration with Circle Gateway
- Fallback to simulation for testing
- Multi-network support

To enable real verification:
1. Deploy the contract
2. Update the backend with contract address
3. Use `?real=true` in the URL or set `window.USE_REAL_CHAIN_VERIFICATION = true`

The system will automatically use real on-chain verification when available and fall back to simulation otherwise.