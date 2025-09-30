# 🚀 Usage Guide - ACP × GPT-5 × zkML

## Quick Start (3 Steps)

### Step 1: Start Services (30 seconds)

```bash
cd /home/hshadab/agentkit/acp

# Start GPT-5 Parser
node services/gpt4-rule-parser.js > logs/gpt5-parser.log 2>&1 &

# Start ACP OpenAI Server
node services/acp-openai-server.js > logs/acp-openai.log 2>&1 &

# Start Proof Service
node services/proof-service.js > logs/proof-service.log 2>&1 &

# Verify all running
curl http://localhost:9005/health  # GPT-5 Parser
curl http://localhost:9006/health  # ACP Server
curl http://localhost:9001/health  # Proof Service
```

### Step 2: Open UI (5 seconds)

```bash
# Open in browser
http://localhost:8000/acp/static/index.html
```

### Step 3: Try It! (2 minutes)

See sample prompts below 👇

---

## 📝 Sample Natural Language Prompts

### ✅ Example 1: Simple Budget (WILL AUTHORIZE)

**Prompt**:
```
I trust Amazon and want to spend max $1000/month on books
```

**What happens**:
- GPT-5 parses: `{monthly_limit: 1000, trusted_merchants: {amazon: 0.95}, allowed_categories: ["books"]}`
- AI checks: Budget ✅ (plenty remaining), Trust ✅ (95%), Amount ✅ ($45 < $500/day), Category ✅ (books allowed)
- Result: **AUTHORIZED** at 80% confidence
- Card element appears for payment

**Transaction**: $45.00 to Amazon for AI Textbook

---

### ✅ Example 2: Weekly Limit (WILL AUTHORIZE)

**Prompt**:
```
Spend max $500/week on groceries from trusted stores, no more than $100 per transaction. I trust Whole Foods and Trader Joe's
```

**What happens**:
- GPT-5 parses: `{weekly_limit: 500, per_transaction_max: 100, trusted_merchants: {whole_foods: 0.95, trader_joes: 0.95}}`
- AI converts: $500/week = ~$71/day
- Result: **AUTHORIZED** if amount < $71

**Transaction**: $45.00 to Whole Foods

---

### ❌ Example 3: Restrictive Rules (WILL DENY)

**Prompt**:
```
No entertainment spending, and ask me before buying anything over $200
```

**What happens**:
- GPT-5 parses: `{blocked_categories: ["entertainment"], require_approval_above: 200}`
- AI checks: Category ❌ (entertainment blocked), Amount ✅
- Result: **DENIED** at 40% confidence
- No payment processed

**Transaction**: $45.00 for movie tickets (denied)

---

### ✅ Example 4: Coffee Shop Daily (WILL AUTHORIZE)

**Prompt**:
```
Max $50/day on coffee shops, no more than 5 transactions per hour
```

**What happens**:
- GPT-5 parses: `{daily_limit: 50, velocity_limit: 5}`
- AI checks: Budget ✅, Velocity ✅ (first transaction today)
- Result: **AUTHORIZED** at 80% confidence

**Transaction**: $5.00 at Starbucks

---

### ✅ Example 5: Multiple Merchants (WILL AUTHORIZE)

**Prompt**:
```
I trust Etsy sellers, max $2000/month on crafts and home goods
```

**What happens**:
- GPT-5 parses: `{monthly_limit: 2000, trusted_merchants: {etsy: 0.95}, allowed_categories: ["crafts", "home-goods"]}`
- AI converts: $2000/month = ~$66/day
- Result: **AUTHORIZED** if amount < $66

**Transaction**: $45.00 on Etsy for handmade pottery

---

### ❌ Example 6: Too Many Transactions (WILL DENY)

**Prompt**:
```
Max 3 transactions per day, $100 daily budget
```

**What happens**:
- GPT-5 parses: `{daily_limit: 100, velocity_limit: 3}`
- AI checks: Velocity ❌ (already 4 transactions today)
- Result: **DENIED** at 60% confidence

**Transaction**: $10.00 (4th transaction of the day)

---

## 🎯 Understanding AI Authorization

The AI evaluates **5 checks** for every transaction:

| Check | Description | Weight |
|-------|-------------|--------|
| 1. Budget | Enough money remaining? | 25% |
| 2. Merchant Trust | Trusted merchant (>50%)? | 25% |
| 3. Amount | Reasonable amount (<50% budget)? | 20% |
| 4. Category | Allowed category? | 15% |
| 5. Velocity | Not too many transactions? | 15% |

**Confidence = % of checks passed**

Examples:
- 5/5 checks = 100% confidence → AUTHORIZED
- 4/5 checks = 80% confidence → AUTHORIZED
- 3/5 checks = 60% confidence → AUTHORIZED
- 2/5 checks = 40% confidence → DENIED
- 1/5 checks = 20% confidence → DENIED

---

## 💳 Test Card Information

When authorized, use these test cards:

### Success Card
```
Card Number: 4242 4242 4242 4242
Expiry: Any future date (e.g., 12/25)
CVC: Any 3 digits (e.g., 123)
```

### Other Test Cards

**Requires Authentication**:
```
Card: 4000 0025 0000 3155
Expiry: Any future date
CVC: Any 3 digits
```

**Insufficient Funds**:
```
Card: 4000 0000 0000 9995
Expiry: Any future date
CVC: Any 3 digits
```

**Card Declined**:
```
Card: 4000 0000 0000 0002
Expiry: Any future date
CVC: Any 3 digits
```

---

## 🔍 Monitoring the System

### Check Service Logs

```bash
# GPT-5 Parser
tail -f logs/gpt5-parser.log
# Shows: "✅ Rules parsed in 5141ms" with model name

# ACP Server
tail -f logs/acp-openai.log
# Shows: "🤖 Parsing rules with GPT-5..."
# Shows: "✅ zkML proof generated: AUTHORIZED (0.85)"

# Proof Service
tail -f logs/proof-service.log
# Shows: "🚀 Executing REAL JOLT-Atlas binary"
# Shows: "✅ REAL JOLT proof generated"
```

### Check Service Health

```bash
curl http://localhost:9005/health | jq
curl http://localhost:9006/health | jq
curl http://localhost:9001/health | jq
```

---

## 🧪 Advanced Testing

### Test 1: GPT-5 Parser Only

```bash
curl -X POST http://localhost:9005/parse-rules \
  -H "Content-Type: application/json" \
  -d '{"text": "I trust Amazon and want to spend max $1000/month on books"}' | jq
```

**Expected Output**:
```json
{
  "success": true,
  "rules": {
    "monthly_limit": 1000,
    "allowed_categories": ["books"],
    "trusted_merchants": {"amazon": 0.95}
  },
  "model": "gpt-5-2025-08-07",
  "tokens_used": 834
}
```

---

### Test 2: Create Checkout Session

```bash
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
```

**Expected Output**:
```json
{
  "id": "cs_abc123...",
  "state": "not_ready_for_payment",
  "authorization_proof": {
    "decision": true,
    "confidence": 0.85,
    "proof_hash": "f0d69b4..."
  },
  "metadata": {
    "gpt5_parsed_rules": true
  }
}
```

---

### Test 3: Complete with Payment

```bash
# First get a session ID from test 2, then:
curl -X POST http://localhost:9006/checkout_sessions/cs_abc123/complete \
  -H "Content-Type: application/json" \
  -d '{
    "payment_method": "pm_card_visa"
  }' | jq
```

---

## 📊 Expected Results

### Successful Authorization Flow

1. **Step 1: Input Collection** (< 1 second)
   - Shows: Amount, Budget, Trust score

2. **Step 2: AI Authorization** (5-7 seconds)
   - GPT-5 parses natural language
   - AI evaluates 5 checks
   - Shows: Decision, Confidence, Session ID

3. **Step 3: zkML Proof** (< 1 second)
   - JOLT-Atlas generates SNARK
   - Shows: Proof hash, Model hash, Type

4. **Step 4: Stripe Payment** (Wait for user input)
   - Card element appears
   - Enter test card: 4242 4242 4242 4242
   - Click "Confirm Payment"
   - Shows: Payment successful

5. **Step 5: Verification** (Optional, 2-3 seconds)
   - On-chain verification on Base Sepolia
   - Shows: Transaction hash, Gas used

**Total Time**: ~10-15 seconds (including card entry)

---

## 🐛 Troubleshooting

### Issue: Services Won't Start

```bash
# Check if ports are in use
lsof -i :9005 :9006 :9001

# Kill existing processes
pkill -f gpt4-rule-parser
pkill -f acp-openai-server
pkill -f proof-service

# Restart
cd /home/hshadab/agentkit/acp
node services/gpt4-rule-parser.js > logs/gpt5-parser.log 2>&1 &
node services/acp-openai-server.js > logs/acp-openai.log 2>&1 &
node services/proof-service.js > logs/proof-service.log 2>&1 &
```

---

### Issue: GPT-5 Not Working

```bash
# Check API key is set
grep OPENAI_API_KEY .env

# Test OpenAI connection
node test-openai-models.js
```

---

### Issue: All Transactions Denied

**Reason**: Default test values don't match rules

**Fix**: Use manual inputs instead:
1. Leave natural language field **empty**
2. Set "Budget Remaining" to **$500**
3. Set "Merchant Trust" to **0.95**
4. Set "Amount" to **$45**
5. Click "Generate Proof"

This should **authorize** with 80-100% confidence.

---

### Issue: Card Element Not Showing

**Reason**: Transaction was denied (low confidence)

**Fix**: Make sure transaction is authorized:
- Check Step 2 shows "AUTHORIZED ✅"
- If denied, adjust rules to be more permissive
- Example: "Max $10000/month" (very high limit)

---

## 🎬 Demo Script (2 Minutes)

Perfect for showing to others:

```bash
# 1. Start services (30 seconds)
cd /home/hshadab/agentkit/acp
./start-all-services.sh

# 2. Open UI
open http://localhost:8000/acp/static/index.html

# 3. Enter prompt (10 seconds)
"I trust Amazon and want to spend max $1000/month on books"

# 4. Click button (5 seconds)
"🚀 Generate Proof & Process Payment"

# 5. Watch workflow (10 seconds)
# Step 1: ✅ Input collected
# Step 2: ✅ GPT-5 parsed + AI authorized (85%)
# Step 3: ✅ JOLT proof generated

# 6. Enter test card (20 seconds)
4242 4242 4242 4242
12/25
123

# 7. Confirm payment (5 seconds)
Click "💳 Confirm Payment"

# 8. Success! (5 seconds)
✅ Payment successful
View in Stripe Dashboard

Total: ~60 seconds
```

---

## 💡 Pro Tips

1. **Start with permissive rules**: "Max $10000/month" to test authorization
2. **Use test card immediately**: Have 4242... card info ready
3. **Check logs for debugging**: `tail -f logs/*.log`
4. **Test without natural language**: Leave field empty, use manual inputs
5. **Monitor GPT-5 tokens**: Each parse uses ~800 tokens (~$0.01)

---

## 📚 Next Steps

- **Customize UI**: Edit `static/index.html`
- **Add more rules**: Extend GPT-5 parser patterns
- **Deploy to production**: Use real Stripe keys
- **Add more merchants**: Update trust scores
- **Integrate with apps**: Use ACP API endpoints

---

## 🔗 Additional Resources

- **Full Documentation**: `ACP_INTEGRATION_COMPLETE.md`
- **Verification Guide**: `100_PERCENT_REAL.md`
- **Quick Start**: `QUICKSTART.md`
- **API Reference**: Check service files for endpoint docs

---

**Ready to build trustless AI commerce!** 🚀