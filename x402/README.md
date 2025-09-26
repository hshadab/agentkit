# x402 Agent Authorization System with zkML

## Overview
Production implementation of the [Coinbase x402 Payment Protocol](https://github.com/coinbase/x402) with **Agent Authorization** via zkML. This system enables autonomous AI agents to prove they're authorized to spend USDC according to predefined spending rules, using cryptographic proofs and the EIP-3009 `transferWithAuthorization` standard.

### Key Features
- ✅ **Agent Authorization Model**: AI agents prove they can spend based on rules
- ✅ **Production x402 Protocol**: Full EIP-3009 `transferWithAuthorization` support
- ✅ **zkML Spending Rules**: Verifies budget, risk, categories via JOLT-Atlas
- ✅ **On-chain Verification**: Groth16 proof-of-proof creates audit trail
- ✅ **MetaMask Integration**: EIP-712 signing for gasless USDC transfers
- ✅ **Real USDC Transfers**: Live on Base Sepolia with transaction links

## Architecture

### Services

- **AI Authorization Service** (port 8009):
  - `POST /zkml/onnx/authorize` → Real neural network inference
  - 5-layer neural network model (ONNX format)
  - Evaluates payment context in ~1ms
  - Returns decision with confidence and reasoning

- **zkML Backend** (port 8002):
  - `POST /zkml/prove` → Orchestrates AI + proof generation
  - Calls AI service when `useAI: true` flag is set
  - Generates JOLT-Atlas cryptographic proof (~500ms)
  - Proves the AI model actually ran

- **Proof-Gate Server** (port 8610):
  - `POST /attest` → Issues zkML-verified attestation tokens
  - `POST /x402/pay` → Production x402 endpoint with attestation requirement
  - `POST /ui/payment/prepare` → MetaMask typed data preparation
  - `POST /ui/pay-auto` → Server-side demo payment
  - `POST /ui/pay-metamask` → Client-signed payment execution

### Agent Authorization Flow (5 Steps)
```
1. AI Inference → Neural network evaluates payment request
2. zkML Proof → Generate proof that AI model ran correctly
3. x402 Attestation → Bind AI decision to payment intent
4. Chain Verification → Verify proof on Base Sepolia (Groth16)
5. Payment Execution → Execute USDC transfer via transferWithAuthorization
```

### How the AI Makes Decisions

The system uses a **real neural network** (ONNX format) that evaluates 5 key features:

1. **Budget Remaining**: Percentage of daily budget available (0-100%)
2. **Merchant Trust Score**: Based on risk assessment (0-100)
3. **Transaction Amount**: Normalized to daily limit (0-100)
4. **Category Score**: Whether merchant category is approved
5. **Velocity Score**: Transaction rate vs hourly limits

**User Request**: "Pay $1.00 to API merchant for monthly subscription"  
**Agent Evaluation**: "Can I execute this payment within my authorization rules?"

**AI Decision Process**:
- Neural network processes all 5 features simultaneously
- Outputs authorization decision with confidence score
- zkML proves this specific AI model made the decision
- Cannot be forged or manipulated

## Installation

### Prerequisites
```bash
# Required packages
npm install x402 x402-express viem ethers

# Rust for zkML binary (if not built)
cd jolt-atlas && cargo build --release --bin llm_prover
```

### Configuration (.env)
```bash
# Network Configuration
BASE_RPC_URL=https://sepolia.base.org
CHAIN_ID=84532
EXPLORER_BASE_URL=https://sepolia.basescan.org

# Wallet (needs USDC on Base Sepolia)
BASE_PRIVATE_KEY=0x... # Your funded wallet private key
X402_ATTEST_SIGNER=0x... # Same wallet address

# x402 Configuration
X402_NETWORK=base-sepolia
X402_ASSET=0x036CbD53842c5426634e7929541eC2318f3dCF7e  # USDC on Base Sepolia
X402_PAYTO=0x2e408ad62e30146404F4ED8A61253212f3f9A490  # Payment recipient
X402_PRICE=$0.01
X402_ZKML_PORT=8610

# zkML Configuration
X402_ZKML_VERIFY_ETH=true
X402_ETH_VERIFY_MODE=backend
X402_ATTEST_EIP712=true
ZKML_VERIFIER_ADDRESS=0x6121Fd93594C316B78e74B91B89A06d3Bb682a8F

# Optional: LLM Prover Binary Path
LLM_PROVER_BIN=/path/to/jolt-atlas/target/release/llm_prover
```

## Running the System

### Quick Start
```bash
# Option 1: Use the restart script
./scripts/restart-x402.sh

# Option 2: Start services manually
node api/zkml-llm-decision-backend.js  # Port 8002
node x402/proof-gate-server.js         # Port 8610
cargo run                               # Port 8001 (main backend)
```

### Testing the Agent Authorization Demo
1. Open demo page: http://127.0.0.1:8000/static/x402-demo.html
2. Click "Start Demo" to see the 5-step authorization flow:
   - **Step 1**: AI neural network evaluates payment request
   - **Step 2**: zkML generates proof of AI inference
   - **Step 3**: x402 attestation binds AI decision to payment
   - **Step 4**: On-chain verification creates audit trail (Base Sepolia)
   - **Step 5**: USDC transfer executes with "Pay with USDC" button
3. Real transactions with explorer links (e.g., [0xcb0f2abf...](https://sepolia.basescan.org/tx/0xcb0f2abf65efb852a93413da261688d223856f1854546ba329542263033f1787))

## Agent Authorization Model

### Concept
Instead of traditional fraud detection (blocking bad actors), the agent authorization model **proves agents are allowed to spend** based on predefined rules. This enables:
- **Autonomous Commerce**: Agents operate without human approval
- **Verifiable Compliance**: Every payment has cryptographic proof
- **Programmable Trust**: Users set rules, agents prove they follow them

### Example Agent Rules
```javascript
{
  daily_budget_limit: 100.00,      // Max $100/day
  merchant_risk_threshold: 0.30,   // Block if risk > 30%
  allowed_categories: ["api", "saas", "hosting"],
  max_transaction_amount: 10.00,   // Max $10 per transaction
  velocity_limit: 10                // Max 10 transactions/hour
}
```

### zkML Parameters (14 total)
The agent proves compliance across 14 parameters:
- **Spending Policy** (5): budget, risk, amount, categories, agent_id
- **Authorization Checks** (5): budget_ok, risk_ok, category_ok, velocity_ok, reasoning
- **Output Validation** (4): auth_valid, compliance, audit_trail, authorized

## Production Payment Handler

The system includes `production-payment-handler.js` which implements:

### EIP-3009 Authorization Creation
```javascript
async function createAuthorization({
  from,        // Payer address
  to,          // Payee address  
  value,       // USDC amount in base units
  asset,       // USDC contract address
  chainId,     // Network chain ID
  validityWindow // Authorization validity period
})
```

### EIP-712 Signature
```javascript
async function signAuthorization({
  wallet,       // Signer wallet
  authorization,// Transfer authorization
  asset,        // USDC contract
  chainId       // Network chain ID
})
```

### On-chain Execution
```javascript
async function executeAuthorization({
  provider,      // Blockchain provider
  executorWallet,// Wallet to pay gas
  asset,         // USDC contract
  authorization, // Signed authorization
  signature      // EIP-712 signature
})
```

## MetaMask Integration

### Setup Helper
Open http://127.0.0.1:8001/static/add-metamask-network.html to:
- Add Base Sepolia network
- Check wallet connection
- Import test wallet (optional)

### Client-Side Flow
1. MetaMask connects to Base Sepolia
2. User signs EIP-712 typed data (no transaction)
3. Signature creates gasless authorization
4. Server executes with gas payment

### Test Wallet (Funded)
```
Address: 0x2e408ad62e30146404F4ED8A61253212f3f9A490
Private Key: 0xe04571b0c9adb6b75c63296fda1de67ab76e163530056c646a590a9cb07d31e5
Balance: 9.98 USDC, 0.05 ETH (Base Sepolia)
```

## API Endpoints

### Attestation
```bash
POST /attest
Body: {
  "agentId": "agent-demo-1",
  "modelId": "risk_analysis_v1",
  "proof": { /* zkML proof */ },
  "cart": { /* commerce data */ },
  "intent": { /* x402 intent */ }
}
Response: {
  "ok": true,
  "token": "eyJ...", # Attestation token
  "onChain": true,    # Verification status
  "anchor": { /* anchor data */ }
}
```

### x402 Payment
```bash
POST /x402/pay
Headers: 
  X-ZKML-Attestation: <token>
  X-PAYMENT: <payment_header> # Optional for preflight
Body: {
  "intent": "demo",
  "cart": { "items": [...] }
}
Response (Preflight/402): {
  "x402Version": 1,
  "error": "X-PAYMENT header is required",
  "accepts": [{ /* payment requirements */ }]
}
Response (Paid): {
  "ok": true,
  "message": "Payment accepted"
}
```

## Security Considerations

### Production Deployment
- ⚠️ Never expose private keys in code
- ⚠️ Use environment variables or key management service
- ⚠️ Implement rate limiting and monitoring
- ⚠️ Audit circuits before mainnet deployment

### Attestation Binding
- Attestations bind to specific intents via hashing
- Commerce data (cart, merchant, client) is cryptographically bound
- Replay protection via nonces and timestamps
- On-chain verification creates permanent audit trail

## Troubleshooting

### MetaMask "Invalid input" Error (Fixed)
- **Issue**: x402 library's `preparePaymentHeader` returns payment data, not EIP-712 typed data
- **Solution**: Server now converts payment data to proper EIP-712 format for MetaMask
- **Implementation**: See `proof-gate-server.js` lines 441-478 for conversion logic
- Ensure Base Sepolia network is selected
- Check wallet has USDC balance

### Payment Reverts
- Check USDC balance: need at least 0.01 USDC
- Verify ETH for gas: need ~0.001 ETH
- Ensure correct network (Base Sepolia, chainId: 84532)

### Connection Errors
- Verify all services running (ports 8001, 8002, 8610)
- Check RPC endpoint connectivity
- Review logs: `logs-proof-gate-8602.log`

## Compliance with x402 Specification

This implementation follows the official [x402 specification](https://github.com/coinbase/x402):

✅ **EIP-3009 Support**: Full `transferWithAuthorization` implementation
✅ **EIP-712 Signing**: Proper typed data for MetaMask
✅ **Gasless for Users**: Server executes and pays gas
✅ **Chain Agnostic**: Works on any EVM chain with USDC
✅ **Trust Minimized**: Client controls authorization signing

## Additional Resources

- [x402 Protocol Specification](https://github.com/coinbase/x402)
- [EIP-3009: Transfer With Authorization](https://eips.ethereum.org/EIPS/eip-3009)
- [EIP-712: Typed Data Signing](https://eips.ethereum.org/EIPS/eip-712)
- [JOLT-Atlas zkML Framework](../jolt-atlas/README.md)
- [Circle USDC Documentation](https://developers.circle.com/stablecoins/docs)

## License
MIT - See LICENSE file for details