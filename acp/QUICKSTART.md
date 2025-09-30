# ACP × GPT-5 × zkML - Quick Start Guide

## 🚀 5-Minute Demo

### Step 1: Start All Services

```bash
cd /home/hshadab/agentkit/acp

# Start GPT-5 rule parser (Port 9005)
node services/gpt5-rule-parser.js > logs/gpt5-parser.log 2>&1 &

# Start ACP OpenAI server (Port 9006)
node services/acp-openai-server.js > logs/acp-openai.log 2>&1 &

# Verify services are running
curl http://localhost:9005/health
curl http://localhost:9006/health
```

### Step 2: Open UI

Open in browser: **http://localhost:8000/acp/static/index.html**

### Step 3: Try Natural Language Input

Enter in the GPT-5 text box:
```
I trust Amazon and want to spend max $1000/month on books
```

Click **"🚀 Generate Proof & Process Payment"**

### Step 4: Watch the Workflow ✨

5 animated steps will execute:

1. **Input Collection** - GPT-5 mode activated
2. **AI Authorization** - Rules parsed → Neural network decides
3. **zkML Proof** - JOLT-Atlas generates cryptographic proof
4. **Stripe Payment** - Payment processed (if authorized)
5. **Verification** - Final status + blockchain links

## 📝 Example Natural Language Rules

### Basic
```
I trust Amazon and want to spend max $1000/month on books
```

### Complex
```
Spend max $500/week on groceries from trusted stores, no more than $100 per transaction. I trust Whole Foods and Trader Joe's
```

### Restrictive
```
No entertainment spending, and ask me before buying anything over $200
```

### Velocity Control
```
Max $50/day on coffee shops, no more than 5 transactions per hour
```

## 🔍 API Testing

### Test GPT-5 Rule Parsing

```bash
curl -X POST http://localhost:9005/parse-rules \
  -H "Content-Type: application/json" \
  -d '{"text": "I trust Amazon and want to spend max $1000/month on books"}'
```

**Response**: GPT-5 parsed rules in ~5 seconds

### Create ACP Checkout Session

```bash
curl -X POST http://localhost:9006/checkout_sessions \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_id": "amazon",
    "amount": 45.00,
    "natural_language_rules": "I trust Amazon and want to spend max $1000/month on books",
    "line_items": [{"name": "AI Textbook", "price": 45.00}],
    "customer": {"email": "demo@agentkit.ai"}
  }'
```

### All 5 ACP Endpoints

```bash
# 1. Create session
POST http://localhost:9006/checkout_sessions

# 2. Retrieve session
GET http://localhost:9006/checkout_sessions/{id}

# 3. Update session
POST http://localhost:9006/checkout_sessions/{id}

# 4. Complete session
POST http://localhost:9006/checkout_sessions/{id}/complete

# 5. Cancel session
POST http://localhost:9006/checkout_sessions/{id}/cancel
```

## 📊 Service Health Checks

```bash
curl http://localhost:9005/health  # GPT-5 parser
curl http://localhost:9006/health  # ACP server
curl http://localhost:9001/health  # Proof service
```

## 🔧 Troubleshooting

### Services Not Starting

```bash
# Check ports
lsof -i :9005 :9006 :9001

# Kill if needed
pkill -f gpt5-rule-parser
pkill -f acp-openai-server

# Restart
cd /home/hshadab/agentkit/acp
node services/gpt5-rule-parser.js > logs/gpt5-parser.log 2>&1 &
node services/acp-openai-server.js > logs/acp-openai.log 2>&1 &
```

### Check Logs

```bash
tail -f /home/hshadab/agentkit/acp/logs/gpt5-parser.log
tail -f /home/hshadab/agentkit/acp/logs/acp-openai.log
```

### Verify GPT-5 Access

```bash
node /home/hshadab/agentkit/acp/test-openai-models.js
```

## 📈 Performance

| Operation | Time |
|-----------|------|
| GPT-5 Parse | 4-5s |
| ONNX Inference | 1-2ms |
| zkML Proof | ~500ms |
| On-Chain Verify | ~2s |
| **Total** | **8-10s** |

## 🎯 Key Features

✅ Natural language spending rules (GPT-5)
✅ Cryptographic authorization proofs (zkML)
✅ Full ACP specification compliance (5 endpoints)
✅ Stripe payment integration
✅ Base Sepolia verification
✅ Real-time animated UI

## 🔗 Important Links

- **UI**: http://localhost:8000/acp/static/index.html
- **ACP API**: http://localhost:9006
- **GPT-5 Parser**: http://localhost:9005
- **Verifier**: https://sepolia.basescan.org/address/0xDCBbFCDE276cBEf449D8Fc35FFe5f51cf7dD9944
- **ACP Spec**: https://github.com/agentic-commerce-protocol/agentic-commerce-protocol

## 📚 Next Steps

1. Read `ACP_INTEGRATION_COMPLETE.md` for full documentation
2. Try different natural language rules
3. Explore all 5 ACP endpoints
4. Check blockchain verifier contract

---

**Built with**: OpenAI GPT-5 • JOLT-Atlas • ACP • Stripe • Base Sepolia