# Verification Guide - ACP × Rule Parser × zkML (Demo/Testnet)

This guide provides reproducible steps to test the ACP × Rule Parser × zkML demo/testnet setup. It focuses on commands and evidence rather than marketing language.

## What Is Real vs. What Is Not

### ✅ Real (Independently Verifiable)

| Component | Status | Verification Method |
|-----------|--------|---------------------|
| Rule Parser (OpenAI optional) | Real when configured | Check logs for model name and usage |
| Authorization Logic | Real | Deterministic 5-check evaluation (see golden tests) |
| JOLT-Atlas Binary | Real | Binary exists at path, executes with real proofs |
| On-Chain Verification | Real | Transaction hashes on Base Sepolia explorer |
| Stripe Payments | Real | PaymentIntent IDs visible in Stripe Dashboard |
| Blockchain Contracts | Real | Verified source on Basescan |

### ⚠️ Simplified for Demo

| Component | Note |
|-----------|------|
| Groth16 Circuit | Simplified 2-parameter circuit (decision + confidence) instead of full 14-parameter LLM model |
| Test Environment | Using Stripe test mode, testnet blockchains |
| ONNX Model | Not currently integrated in main flow (JOLT binary used instead) |

### ❌ Not Implemented

| Feature | Status |
|---------|--------|
| Webhook Signature Verification | Not implemented |
| Idempotency Keys | Not implemented |
| Full 14-parameter zkML Circuit | Simplified to 2 parameters for demo |

---

## Verification Steps

### 1. Verify Rule Parser Integration

**Claim**: Uses a local rule parser service that can optionally call the OpenAI API for natural language parsing.

**Verification**:
```bash
cd /home/hshadab/agentkit/acp

# Start rule parser service
node services/gpt5-rule-parser.js > logs/gpt5-parser.log 2>&1 &

# Test parsing endpoint
curl -X POST http://localhost:9005/parse-rules \
  -H "Content-Type: application/json" \
  -d '{"text": "I trust Amazon and want to spend max $1000/month on books"}' | jq

# Check logs for model name and usage (if OpenAI configured)
tail -f logs/gpt5-parser.log
```

**Expected Evidence**:
- Response contains a `model` field (OpenAI) or `pattern-matching` fallback
- Logs show `"✅ Rules parsed in Xms"`

---

### 2. Verify Deterministic Authorization Logic

**Claim**: Authorization uses deterministic rule evaluation, not random numbers.

**Verification**:
```bash
# Run golden proof tests
cd /home/hshadab/agentkit/acp
npm test

# Manually verify authorization logic
node -e "
const { evaluateAuthorization } = require('./services/proof-service.js');
const result = evaluateAuthorization({
  budget_remaining: 500,
  merchant_trust: 0.95,
  amount: 45,
  category_score: 0.8,
  velocity: 2
});
console.log(JSON.stringify(result, null, 2));
"
```

**Expected Output**:
```json
{
  "authorized": true,
  "confidence": 0.85,
  "checks": {
    "budget": true,
    "trust": true,
    "amount": true,
    "category": true,
    "velocity": true
  }
}
```

**Golden Test Corpus**: See `tests/golden/` directory for input/output pairs.

---

### 3. Verify JOLT-Atlas Binary Execution

**Claim**: Real Rust binary generates cryptographic proofs.

**Verification**:
```bash
# Check binary exists
ls -lh /home/hshadab/agentkit/jolt-atlas/target/release/llm_prover
# Expected: ~5.1 MB binary

# Run binary manually
/home/hshadab/agentkit/jolt-atlas/target/release/llm_prover --help

# Test proof generation
cd /home/hshadab/agentkit/acp
node services/proof-service.js > logs/proof-service.log 2>&1 &

# Generate proof via API
curl -X POST http://localhost:9001/generate-proof \
  -H "Content-Type: application/json" \
  -d '{
    "budget_remaining": 500,
    "merchant_trust": 0.95,
    "amount": 45
  }' | jq

# Check logs for binary execution
grep "REAL JOLT" logs/proof-service.log
```

**Expected Evidence**:
- Log shows: `"🚀 Executing REAL JOLT-Atlas binary"`
- Proof generation takes ~500ms
- Returns 64-character hex proof hash

---

### 4. Verify On-Chain Verification

**Claim**: Proofs verified on Base Sepolia (testnet) with on-chain records.

**Verification**:
```bash
# Start Groth16 verifier service
node api/groth16-jolt-backend-real.js > logs/groth16.log 2>&1 &

# Verify proof on-chain
curl -X POST http://localhost:3004/verify-proof-onchain \
  -H "Content-Type: application/json" \
  -d '{
    "proof": {
      "a": ["0", "0"],
      "b": [["0", "0"], ["0", "0"]],
      "c": ["0", "0"]
    },
    "publicSignals": ["1", "8500"]
  }' | jq

# Check response for transaction hash
# Visit: https://sepolia.basescan.org/tx/<TRANSACTION_HASH>
```

**Expected Evidence**:
- Response contains `transactionHash` starting with `0x`
- Gas used: ~350k
- Cost: ~0.0005 ETH
- Transaction visible on Base Sepolia explorer

**Contract Address**: `0xDCBbFCDE276cBEf449D8Fc35FFe5f51cf7dD9944`
**Explorer**: https://sepolia.basescan.org/address/0xDCBbFCDE276cBEf449D8Fc35FFe5f51cf7dD9944

---

### 5. Verify Stripe Payments

**Claim**: Real Stripe PaymentIntents created with proof metadata.

**Verification**:
```bash
# Start ACP server
node services/acp-openai-server.js > logs/acp-openai.log 2>&1 &

# Create checkout session with authorization
curl -X POST http://localhost:9006/checkout_sessions \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_id": "amazon",
    "amount": 45.00,
    "currency": "usd",
    "natural_language_rules": "I trust Amazon and want to spend max $1000/month on books",
    "line_items": [{"name": "AI Textbook", "price": 45.00}],
    "customer": {"email": "test@example.com"}
  }' | jq

# Check logs for Stripe API calls
grep "Stripe" logs/acp-openai.log
```

**Expected Evidence**:
- Log shows: `"💳 Processing Stripe payment: $45.00"`
- Response contains `payment_intent` starting with `pi_`
- Metadata includes `proof_hash`, `confidence`, `session_id`
- Payment visible in Stripe Dashboard (test mode)

**Stripe Test Card**: `4242 4242 4242 4242` (any future expiry, any CVC)

---

### 6. Verify Contract Deployment

**Claim**: Verifier contract deployed and verified on Base Sepolia.

**Verification**:
```bash
# View contract on explorer
open https://sepolia.basescan.org/address/0xDCBbFCDE276cBEf449D8Fc35FFe5f51cf7dD9944

# Verify contract source is published
# Click "Contract" → "Read Contract" → should see verifyProof function

# Deploy your own instance (optional)
cd /home/hshadab/agentkit/acp
./scripts/deploy-and-verify.sh
```

**Expected Evidence**:
- Contract shows "✓ Verified" badge on Basescan
- Source code visible and matches local files
- Contract has recent transactions

---

## Reproduce Complete Workflow

Run the entire flow in one command:

```bash
cd /home/hshadab/agentkit/acp

# 1. Start all services
node services/gpt5-rule-parser.js > logs/gpt5-parser.log 2>&1 &
node services/acp-openai-server.js > logs/acp-openai.log 2>&1 &
node services/proof-service.js > logs/proof-service.log 2>&1 &
node ../api/groth16-jolt-backend-real.js > logs/groth16.log 2>&1 &

# 2. Wait for services to start
sleep 5

# 3. Run integration test
npm run test:integration

# 4. Check logs for evidence
echo "=== Rule Parser ==="
grep "✅ Rules parsed" logs/gpt5-parser.log | tail -3

echo "=== JOLT Proofs ==="
grep "REAL JOLT" logs/proof-service.log | tail -3

echo "=== On-Chain Verification ==="
grep "transactionHash" logs/groth16.log | tail -3

echo "=== Stripe Payments ==="
grep "Payment successful" logs/acp-openai.log | tail -3
```

**Expected Runtime**: ~30 seconds
**Expected Cost**: OpenAI usage (if enabled) + testnet gas (varies)

---

## Golden Proof Test Corpus

Location: `/home/hshadab/agentkit/acp/tests/golden/`

Each test case includes:
- `input.json` - Authorization parameters
- `expected-decision.json` - Expected authorization result
- `expected-proof.txt` - Expected proof hash (deterministic)
- `verification.json` - On-chain verification result

Run golden tests:
```bash
cd /home/hshadab/agentkit/acp
npm run test:golden

# Output shows pass/fail for each test case
# All tests should pass with byte-for-byte proof matching
```

---

## Performance Metrics

Measured on Ubuntu 22.04, 16GB RAM, Intel i7:

| Operation | Average Time | Cost |
|-----------|-------------|------|
| Rule Parsing (OpenAI) | varies | varies |
| Authorization Evaluation | <1ms | Free |
| JOLT Proof Generation | ~500ms | Free |
| On-Chain Verification | ~3 seconds | ~0.0005 ETH |
| Stripe Payment | ~2 seconds | Free (test mode) |
| **Total Workflow** | **~15 seconds** | **~$0.011** |

---

## Common Verification Issues

### Issue: OpenAI model errors

**Cause**: OpenAI API model unavailable or misconfigured.

**Fix**: Set an available model (e.g., gpt-4o-mini) or rely on pattern matching:
```bash
export OPENAI_MODEL=gpt-4o-mini
```

### Issue: "JOLT binary not found"

**Cause**: Binary not compiled.

**Fix**:
```bash
cd /home/hshadab/agentkit/jolt-atlas
cargo build --release
```

### Issue: "RPC connection timeout"

**Cause**: Base Sepolia RPC overloaded.

**Fix**: Uses fallback RPCs automatically (see logs for retry attempts).

### Issue: "Proof hash mismatch in golden tests"

**Cause**: JOLT binary version changed or inputs modified.

**Fix**: Regenerate golden proofs:
```bash
npm run test:golden:update
```

---

## Third-Party Reproduction

To independently verify all claims:

1. Clone repo: `git clone https://github.com/hshadab/agentkit`
2. Install dependencies: `cd acp && npm install`
3. Set environment variables (see `.env.example`)
4. Run verification: `npm run verify:all`

**Time required**: ~15 minutes
**Cost**: OpenAI usage (if enabled) + testnet gas

---

## Report Issues

Found a discrepancy? Open an issue with:
1. Command you ran
2. Expected vs. actual output
3. Log files from `logs/` directory

**GitHub**: https://github.com/hshadab/agentkit/issues

---

**Last Updated**: 2025-09-30
**Verified By**: Independent third-party audit (pending)
