# x402 Agent Authorization System with zkML (Demo/Testnet)

## Overview
Reference demo of the [Coinbase x402 Payment Protocol](https://github.com/coinbase/x402) with an experimental Agent Authorization (zkML) extension. It demonstrates AI authorization → zk proof → attestation → optional on‑chain anchor → payment using EIP‑3009 `transferWithAuthorization`.

Note: This is a reference demo/testnet, not a spec‑verified or security‑hardened implementation.

### Deep x402 + zkML Integration (PoP anchored)
- Real ONNX inference integrated into the flow (Step 1): proof‑gate calls your ONNX service for a decision+confidence before proving.
- Proof‑of‑Proof commitment: Jolt‑Atlas proof bytes are hashed and reduced mod BN254; the Groth16 circuit exposes `[decision, confidence, proofHash]` as public signals.
- On‑chain anchor (Step 4): the storage verifier on Base Sepolia (testnet) enforces the 3rd signal, anchoring the exact Jolt proof commitment.
- v2 circuit (5 signals): optionally includes `modelHash` (ONNX bytes) and `policyHash` (Accepts hash) as public signals alongside `[decision, confidence, proofHash]` for stronger binding on‑chain.
- Attestation binding (Step 3): attestation binds `proofHash`, `intentHash` (method+path+body), and `acceptsHash` (price/network/asset/payTo). This prevents TOCTOU and ties the AI decision to the precise x402 payment intent and server policy.
- Session‑bound verification: the anchor job uses the in‑memory SNARK proof and public signals from the same session that generated the Jolt commitment, eliminating file races.
- Strict gating: if AI denies, the flow halts (no proof, no attestation, no anchor, no payment). Auto‑pay runs only after the on‑chain anchor confirms.
- Production payment semantics: EIP‑3009 typed data (MetaMask optional) and server‑executed `transferWithAuthorization` with gas‑paying executor.

### Key Features
- ✅ **Agent Authorization Model**: AI agents prove they can spend based on rules
- ✅ **x402-Compatible Flow**: EIP-3009 `transferWithAuthorization` support
- ✅ **zkML Spending Rules**: Verifies budget, risk, categories via JOLT-Atlas
- ✅ **On-chain Verification**: Groth16 proof-of-proof creates a testnet audit trail
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

Extension binding (Step 3, experimental):
- The x402 attestation includes a `proofHash` (commitment to the zkML proof), an `intentHash` (method + path + body hash), and an `acceptsHash` (server’s configured price/network/asset/payTo). This binds the AI decision to the exact payment intent and server policy, end‑to‑end.
- With `X402_AUTOPAY=anchor_confirmed`, payment is executed only after the on‑chain anchor (Step 4) confirms.

This three‑hash binding is an experimental extension layered on top of x402; it is not part of the upstream protocol today.

### How the AI Makes Decisions

The system uses a REAL neural network (ONNX) that the proof‑gate calls before proving. It evaluates 5 key features:

1. **Budget Remaining**: Percentage of daily budget available (0-100%)
2. **Merchant Trust Score**: Based on risk assessment (0-100)
3. **Transaction Amount**: Normalized to daily limit (0-100)
4. **Category Score**: Whether merchant category is approved
5. **Velocity Score**: Transaction rate vs hourly limits

**User Request**: "Pay $1.00 to API merchant for monthly subscription"  
**Agent Evaluation**: "Can I execute this payment within my authorization rules?"

AI Decision Process (strict):
- Proof‑gate calls the ONNX service (`POST {X402_ONNX_URL}/zkml/onnx/authorize`) with the transaction context
- Neural network returns `decision` and `confidence`
- Jolt‑Atlas produces a proof artifact; proof‑gate commits to its bytes (`proofHash`)
- Groth16 circuit includes the commitment as the 3rd public signal; on‑chain verifies `[decision, confidence, proofHash]`

Verifier + Explorer Links
- Step 4 shows both the verification tx and the verifier contract address (Base Sepolia). See also `GET /verifier/info` for address/chain/ABI.

### UI Highlights (Demo‑friendly)
- Step cards glow while in progress; completed steps appear lighter and clearly “done”.
- Step 1 shows Decision, Confidence, and Inference time inline; a compact “Decision Explainer” renders normalized feature bars.
- Step 2 renders a mini timeline (ONNX/Jolt/Groth16) with sub‑ms handling; an inline summary appears under the card.
- Step 3 surfaces binding chips for `proofHash`/`modelHash`/`policyHash` (short hashes, copyable from logs).
- Step 4 shows “Verified: 0x…” plus a “Verifier” contract link and gas used below the card.
- Step 5 embeds a “View receipt” link that renders From/To balances, amount, and gas inline.

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

### One-Command Demo
```bash
# From x402/
npm run demo:up    # starts unified-backend (:8002) + proof-gate (:8610)
# Visit the 1→5 UI in your browser:
# http://localhost:8610/static/x402-demo.html
# Stop services:
npm run demo:down
```

### UI Test (1→5) End-to-End
- Prerequisites (testnet):
  - `BASE_RPC_URL`, `CHAIN_ID=84532`, `EXPLORER_BASE_URL`
  - `BASE_PRIVATE_KEY` (executor pays gas)
  - `X402_AGENT_PRIVATE_KEY` (payer with Base Sepolia USDC) if using server auto‑pay
  - Optional anchor: `X402_ZKML_VERIFY_ETH=true` (requires gas); set `X402_AUTOPAY=anchor_confirmed` to pay after confirmation
  - Or skip anchor with `X402_AUTOPAY=attest` for quick local testing
- Start services: `npm run demo:up`
- Open the UI: `http://localhost:8610/static/x402-demo.html`
- Click “Start Demo”. The UI drives:
  - Step 1: AI inference (calls `/ui/zkml/prove`)
  - Step 2: zkML proof (polls `/ui/zkml/status/:id`)
  - Step 3: Attestation (`/attest`) — shows attestation id
  - Step 4: On‑chain verification (if enabled) — shows a block/tx link on success
  - Step 5: Payment — server auto‑pay after Step 4 or immediately after Step 3 depending on `X402_AUTOPAY`

Tip: If Step 4 keeps “verifying…”, either fund the executor key with ETH and keep `X402_ZKML_VERIFY_ETH=true`, or set `X402_AUTOPAY=attest` to allow payment without on‑chain anchor.

### Real zkML (required for Step 2)
- The UI uses the real Groth16 proof generator in `/x402/generate-valid-proof.js`.
- Option B (proof-of-proof on-chain): generator supports a 3rd public signal carrying the Jolt proof commitment.
- Place the circuit assets before running. You can override paths via env:
  - `X402_GROTH_WASM_PATH=/abs/or/rel/path/to/your.wasm`
  - `X402_GROTH_ZKEY_PATH=/abs/or/rel/path/to/your.zkey`
  - Defaults: `circuits/jolt-verifier/jolt_decision_simple_js/jolt_decision_simple.wasm`, `circuits/jolt-verifier/jolt_decision_simple_final.zkey`
- If either file is missing or invalid, Step 2 fails immediately (no fallback), and the flow stops as designed.

Option B circuit expectations:
- Public signals: `[decision, confidence, proofHash]`
- `proofHash` is the BN254 field representation of the Jolt proof artifact SHA-256 (mod r).
- The server computes it from the binary proof artifact and passes it to the prover; on‑chain verification enforces it.

### ONNX Inference (Step 1)
- Environment:
  - `X402_REQUIRE_ONNX=true` (no fallback)
  - `X402_ONNX_URL=http://127.0.0.1:8009`
- Endpoint called by proof‑gate: `POST {X402_ONNX_URL}/zkml/onnx/authorize` with `transaction { ... }`
- If the ONNX service is unavailable or returns an invalid payload and `X402_REQUIRE_ONNX=true`, Step 1 fails and the flow stops.

Strictness Controls
- `X402_ENFORCE_AI=true` → If AI denies, stop the flow immediately (no proof/attestation/anchor/payment).
- `X402_REQUIRE_PROOFHASH_SIGNAL=true` → Groth16 must include commitment as 3rd public signal.
- `X402_AUTOPAY=anchor_confirmed` → Server executes payment only after anchor confirms.

### Build and Deploy (Option B)
- Build artifacts (wasm+zkey+verifier):
  - `circuits/option-b/decision_with_commitment.circom` defines the 3-signal circuit.
  - Run the builder (downloads circom + ptau, compiles, sets up Groth16):
    - `bash -lc "./bin/circom circuits/option-b/decision_with_commitment.circom --r1cs --wasm -o circuits/option-b/build && \
      npx snarkjs groth16 setup circuits/option-b/build/decision_with_commitment.r1cs circuits/ptau/powersOfTau28_hez_final_10.ptau circuits/option-b/build/decision_with_commitment_0000.zkey && \
      ( printf 'option-b\nrandom\n' | npx snarkjs zkey contribute circuits/option-b/build/decision_with_commitment_0000.zkey circuits/option-b/build/decision_with_commitment_final.zkey ) && \
      npx snarkjs zkey export solidityverifier circuits/option-b/build/decision_with_commitment_final.zkey circuits/option-b/build/OptionBVerifier.sol"`
- Deploy verifier (Base Sepolia):
  - `node scripts/deploy-verifier.js` (requires `BASE_PRIVATE_KEY` and `BASE_RPC_URL` in env)
  - Writes: `deployments/option-b-verifier-base-sepolia.json` with `{ address, abi }`
  - Set:
    - `ZKML_VERIFIER_ADDRESS=<deployed>`
    - `ZKML_VERIFIER_DEPLOYMENT=./x402/deployments/option-b-verifier-base-sepolia.json`

Check assets from the browser:
```
GET http://localhost:8610/ui/zkml/assets-check
```

### Verifier Info (Base Sepolia)
- Configure `ZKML_VERIFIER_ADDRESS` (and optionally `ZKML_VERIFIER_DEPLOYMENT` for ABI) in `x402/.env`.
- Inspect the deployed contract and ABI linkage:
```
GET http://localhost:8610/verifier/info
```
Returns: current address, chainId, whether bytecode is present, ABI loaded, and if `verifyAndStore` is available.

Option B requires a verifier matching the 3-signal circuit. Deploy that verifier and update `ZKML_VERIFIER_ADDRESS` and `ZKML_VERIFIER_DEPLOYMENT` accordingly.

### MetaMask Option (no auto‑pay)
- Leave `X402_AUTOPAY` empty
- Use the “Pay with MetaMask” flow in the UI (EIP‑712 typed‑data signing) to produce a gasless EIP‑3009 authorization that the server executes.

### Browser UI (5‑Step)
- Open `http://localhost:8610/static/x402-demo.html` (served by proof‑gate)
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

### Test Wallet Guidance
- Use your own test wallets funded on Base Sepolia.
- Never commit private keys. Put secrets in `.env` (see `.env.example`) and rotate any key that was ever committed.

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
 - On-chain verification creates a testnet audit trail

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

## Conformance + Extension
- Core x402 behavior aims to be compatible with the official spec (402 challenge → `accepts` → client `X-PAYMENT` → server settlement). The fallback route now returns HTTP 402 with structured `accepts[]` and processes `X-PAYMENT` when present.
- The `proofHash`/`intentHash`/`acceptsHash` binding is an experimental extension (“zk-binding:v1”), clearly labeled so implementers can opt in.

Quick check with the included harness:
```bash
npm run test:conformance
```
It verifies:
- `/attest` returns a signed token with intent/accepts bindings
- `/x402/pay` preflight responds with 402 and `accepts[]` including `quoteId` and `expiresAt`
- Missing attestation is rejected (402)

### Metrics and Logs
- Proof-gate JSON metrics: `GET http://127.0.0.1:8610/metrics`
- Unified backend metrics: `GET http://127.0.0.1:8002/metrics`
- Structured JSON logs are emitted for key events (attest_issued, preflight_402, anchor_confirmed, payment_accepted).

## What’s Mocked vs. Real
- Real: EIP‑3009 signing and on‑chain execution (Base Sepolia), optional Groth16 on‑chain verifier, attestation signing (HMAC/EIP‑712).
- Real: `402 → Accepts → X-PAYMENT` fallback path and `x402-express` integration when installed.
- Mocked/demo: Tiny AI model and zkML glue for authorization; not a production risk model.

## Additional Resources

- [x402 Protocol Specification](https://github.com/coinbase/x402)
- [EIP-3009: Transfer With Authorization](https://eips.ethereum.org/EIPS/eip-3009)
- [EIP-712: Typed Data Signing](https://eips.ethereum.org/EIPS/eip-712)
- JOLT-Atlas zkML framework (external)
- [Circle USDC Documentation](https://developers.circle.com/stablecoins/docs)

## License
MIT
