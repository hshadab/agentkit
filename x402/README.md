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

Deep integration (Step 3):
- The x402 attestation includes a `proofHash` (commitment to the zkML proof), an `intentHash` (method + path + body hash), and an `acceptsHash` (server’s configured price/network/asset/payTo). This binds the AI decision to the exact payment intent and server policy, end‑to‑end.
- With `X402_AUTOPAY=anchor_confirmed`, payment is executed only after the on‑chain anchor (Step 4) confirms.

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
- Node.js 18.17+ (recommended 18 or 20)

### Setup
```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and set at least:
# - BASE_RPC_URL, CHAIN_ID
# - BASE_PRIVATE_KEY (funded on Base Sepolia)
# - X402_PAYTO (recipient address)
```

## Running the System

### Quick Start
```bash
# Start proof-gate (port 8610)
npm run start:proof-gate

# Optional: start Groth16 verifier service (for on-chain anchoring)
# Requires: X402_ZKML_VERIFY_ETH=true, BASE_PRIVATE_KEY funded
npm run start:verifier

# If you’re using the 5‑step browser UI served by the Rust backend
# (it proxies to proof‑gate and serves static/x402-demo.html):
cargo run   # starts on :8001
```

### Browser UI (5‑Step)
- Open `http://127.0.0.1:8001/static/x402-demo.html` (served by the Rust backend).
- The UI runs Steps 1–5 and talks to proof‑gate on :8610 via the Rust proxy routes.
- On-chain anchoring (Step 4) is optional and controlled by env.

### Test the Flow (API)
```bash
# 1) Get an attestation (use simple demo proof/publicInputs)
curl -s http://127.0.0.1:8610/attest \
  -H 'content-type: application/json' \
  -d '{
    "agentId":"agent-demo-1",
    "clientId":"demo-client",
    "merchantId":"acme-merchant",
    "modelId":"risk_analysis_v1",
    "proof": {"public_signals":["1","95"]},
    "publicInputs": [3,5,1,12],
    "cart": {"items":[{"sku":"api-pro-month","qty":1}], "totalCents":100},
    "intent": {"method":"POST","path":"/x402/pay","body":{"intent":"demo"}}
  }' | tee /tmp/attn.json

# Extract token
TOKEN=$(jq -r '.token' /tmp/attn.json)

# 2) Preflight x402 (accepts requirements)
curl -s http://127.0.0.1:8610/x402/pay \
  -H 'content-type: application/json' \
  -H "X-ZKML-Attestation: $TOKEN" \
  -d '{"intent":"demo"}' | jq .

# 3) Server-side demo payment (uses server wallet in .env)
curl -s http://127.0.0.1:8610/ui/pay-auto \
  -H 'content-type: application/json' \
  -d "{\"token\":\"$TOKEN\"}" | jq .
```

For MetaMask signing, use `POST /ui/payment/prepare` to get typed data, sign it in the browser, then submit via `POST /ui/pay-metamask`.

## Automatic Payments (No MetaMask)

There are two ways to run fully compliant x402 payments without any wallet UI prompts:

- Client-triggered auto pay (no button): Your UI calls `POST /ui/pay-auto` with the attestation token.
- Server auto pay (no client call): The server auto‑runs payment after attestation or after on‑chain anchor confirmation.

### Recommended: Server Auto‑Pay After Anchor Confirmation

Set these env vars (testnet only):
```bash
X402_AGENT_PRIVATE_KEY=0x...      # Payer key with Base Sepolia USDC
BASE_PRIVATE_KEY=0x...            # Executor key with Base Sepolia ETH
X402_PAYTO=0x...                  # Recipient (usually executor address)
X402_AUTOPAY=anchor_confirmed     # Wait for Step 4 on-chain confirmation, then pay

# Optional on-chain anchoring for Step 4
X402_ZKML_VERIFY_ETH=true         # Requires BASE_PRIVATE_KEY funded for gas
```

Behavior:
- UI runs Steps 1–3; server anchors zkML proof (Step 4).
- Once the anchor tx confirms, server builds an EIP‑3009 authorization (signed by the agent key) and executes `transferWithAuthorization` on-chain (Step 5). No MetaMask involved.
- Check result with `GET /ui/last-redemption`. Logs include `[autopay]` lines.

Alternative:
- `X402_AUTOPAY=attest` — pay immediately after attestation (does not wait for on-chain anchor).
- Leave `X402_AUTOPAY` empty to disable server auto‑pay. Your UI can still call `POST /ui/pay-auto` programmatically after Step 4.

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
  "proofHash": "da099d...", # Commitment to zkML proof
  "intentHash": "262957...", # method + path + body hash
  "acceptsHash": "922a61...", # server-configured Accepts binding
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
- Attestations bind the zkML proof to the payment via `proofHash`
- Attestations bind to specific intents via `intentHash` (method + path + body hash)
- Commerce data (cart, merchant, client) is cryptographically bound
- Server policy is bound via `acceptsHash` (price/network/asset/payTo)
- Replay protection via nonces and timestamps
- On-chain verification creates permanent audit trail

## Troubleshooting

### MetaMask "Invalid input" Error (Fixed)
- **Issue**: x402 library's `preparePaymentHeader` returns payment data, not EIP-712 typed data
- **Solution**: Server now converts payment data to proper EIP-712 format for MetaMask
- **Implementation**: See typed-data conversion in `proof-gate-server.js` (`/ui/payment/prepare`)
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
- JOLT-Atlas zkML framework (external)
- [Circle USDC Documentation](https://developers.circle.com/stablecoins/docs)

## License
MIT
