# ACP Endpoints Documentation

Complete API reference for the ACP (Agentic Commerce Protocol) OpenAI Server implementation.

## Base URL

```
http://localhost:9006
```

## Authentication

Currently no authentication required (development mode). Production should use Bearer tokens.

---

## Checkout Session State Machine

```
┌─────────────────────┐
│   not_ready_for_    │  ← Initial state after creation
│      payment        │     (waiting for authorization proof)
└──────────┬──────────┘
           │
           │ POST /checkout_sessions/:id/authorize
           │ (with authorization_proof)
           ↓
┌─────────────────────┐
│  ready_for_payment  │  ← Authorization approved
└──────────┬──────────┘
           │
           │ POST /checkout_sessions/:id/complete
           │ (with payment_method)
           ↓
┌─────────────────────┐     POST /checkout_sessions/:id/expire
│     completed       │  ←─────────────────────────────┐
└─────────────────────┘                                │
                                                       │
┌─────────────────────┐                                │
│      canceled       │  ←──────────────────────────────┤
└─────────────────────┘                                │
                              POST /checkout_sessions/:id/cancel
┌─────────────────────┐                                │
│      expired        │  ←──────────────────────────────┘
└─────────────────────┘
```

---

## Endpoints

### 1. Health Check

**GET** `/health`

Check service status.

**Response** (200 OK):
```json
{
  "status": "healthy",
  "service": "acp-openai-server",
  "stripe_configured": true,
  "proof_service_url": "http://localhost:9001",
  "uptime": 123.45
}
```

---

### 2. Create Checkout Session

**POST** `/checkout_sessions`

Create a new checkout session with optional natural language spending rules.

**Request Body**:
```json
{
  "merchant_id": "amazon",
  "amount": 45.00,
  "currency": "usd",
  "natural_language_rules": "I trust Amazon and want to spend max $1000/month on books",
  "line_items": [
    {
      "name": "AI Textbook",
      "price": 45.00,
      "quantity": 1
    }
  ],
  "customer": {
    "email": "user@example.com",
    "name": "John Doe"
  },
  "success_url": "https://example.com/success",
  "cancel_url": "https://example.com/cancel"
}
```

**Response** (200 OK):
```json
{
  "id": "cs_1a2b3c4d5e6f",
  "object": "checkout_session",
  "state": "not_ready_for_payment",
  "merchant_id": "amazon",
  "amount": 45.00,
  "currency": "usd",
  "line_items": [...],
  "customer": {...},
  "authorization_proof": {
    "decision": true,
    "confidence": 0.85,
    "proof_hash": "f0d69b4a8e3c2d1b...",
    "model_hash": "llm_decision_v1",
    "proof_type": "jolt-atlas",
    "generated_at": "2025-09-30T12:34:56.789Z"
  },
  "metadata": {
    "gpt5_parsed_rules": true, // legacy flag name for rule parser usage
    "rules_parsing_time_ms": 5234
  },
  "success_url": "https://example.com/success",
  "cancel_url": "https://example.com/cancel",
  "created": 1696078496,
  "expires_at": 1696082096
}
```

**Rule Parser Extension**: If `natural_language_rules` provided:
- Calls the local rule parser on port 9005 (optional OpenAI)
- Parses natural language → structured rules
- Includes parsed rules in metadata

**zkML Extension**: Automatically generates authorization proof:
- Calls proof service on port 9001
- Returns proof in `authorization_proof` field (ACP extension)
- Proof includes decision, confidence, hash

**Timing**:
- Rule parsing: varies (OpenAI or patterns)
- Proof generation: ~500ms
- Total: ~6-8 seconds

---

### 3. Get Checkout Session

**GET** `/checkout_sessions/:id`

Retrieve checkout session details.

**Response** (200 OK):
```json
{
  "id": "cs_1a2b3c4d5e6f",
  "object": "checkout_session",
  "state": "ready_for_payment",
  "merchant_id": "amazon",
  "amount": 45.00,
  "currency": "usd",
  "line_items": [...],
  "customer": {...},
  "authorization_proof": {...},
  "payment_method": "pm_1x2y3z4a5b6c",
  "payment_intent": null,
  "success_url": "https://example.com/success",
  "cancel_url": "https://example.com/cancel",
  "created": 1696078496,
  "expires_at": 1696082096
}
```

**Error** (404 Not Found):
```json
{
  "error": {
    "type": "invalid_request_error",
    "message": "No such checkout session: cs_invalid"
  }
}
```

---

### 4. Authorize Checkout Session

**POST** `/checkout_sessions/:id/authorize`

Manually authorize a checkout session (alternative to automatic authorization during creation).

**Request Body**:
```json
{
  "authorization_proof": {
    "decision": true,
    "confidence": 0.85,
    "proof_hash": "f0d69b4a8e3c2d1b..."
  }
}
```

**Response** (200 OK):
```json
{
  "id": "cs_1a2b3c4d5e6f",
  "state": "ready_for_payment",
  "authorization_proof": {...}
}
```

**State Transition**: `not_ready_for_payment` → `ready_for_payment`

---

### 5. Complete Checkout Session

**POST** `/checkout_sessions/:id/complete`

Complete checkout with payment method and process payment.

**Request Body**:
```json
{
  "payment_method": "pm_1x2y3z4a5b6c"
}
```

**Response** (200 OK):
```json
{
  "id": "cs_1a2b3c4d5e6f",
  "object": "checkout_session",
  "state": "completed",
  "payment_status": "paid",
  "payment_intent": "pi_3a4b5c6d7e8f9g0h",
  "amount_total": 45.00,
  "currency": "usd",
  "customer": {...},
  "metadata": {
    "has_zkml_proof": true,
    "proof_hash": "f0d69b4a8e3c2d1b...",
    "proof_confidence": 0.85
  }
}
```

**Error** (400 Bad Request):
```json
{
  "error": {
    "type": "invalid_request_error",
    "message": "Session cannot be completed. Current state: canceled"
  }
}
```

**State Transition**: `ready_for_payment` → `completed`

**Stripe Integration**:
- Creates real PaymentIntent with provided payment_method
- Confirms payment immediately
- Includes zkML proof metadata
- Returns Stripe PaymentIntent ID

**Timing**: ~2-3 seconds for Stripe API

---

### 6. Cancel Checkout Session

**POST** `/checkout_sessions/:id/cancel`

Cancel a checkout session.

**Response** (200 OK):
```json
{
  "id": "cs_1a2b3c4d5e6f",
  "state": "canceled",
  "canceled_at": 1696078896
}
```

**State Transition**: Any state → `canceled`

---

### 7. Expire Checkout Session

**POST** `/checkout_sessions/:id/expire`

Mark a checkout session as expired (usually called by automated cleanup).

**Response** (200 OK):
```json
{
  "id": "cs_1a2b3c4d5e6f",
  "state": "expired",
  "expired_at": 1696082096
}
```

**State Transition**: `not_ready_for_payment` or `ready_for_payment` → `expired`

**Auto-Expiry**: Sessions expire 1 hour after creation (not currently implemented)

---

## ACP Extensions

This implementation extends the base ACP specification with:

### 1. zkML Authorization Proofs

Added to checkout session:
```json
{
  "authorization_proof": {
    "decision": true,           // Authorization decision
    "confidence": 0.85,          // Confidence score (0-1)
    "proof_hash": "abc123...",   // JOLT-Atlas proof hash
    "model_hash": "llm_v1",      // Model identifier
    "proof_type": "jolt-atlas",  // Proof system
    "generated_at": "ISO8601"    // Timestamp
  }
}
```

### 2. Natural Language Rule Parsing

Rule parser integration for parsing spending rules (optional OpenAI):
```json
{
  "natural_language_rules": "I trust Amazon, max $1000/month",
  "metadata": {
    "gpt5_parsed_rules": true,
    "parsed_rules": {
      "monthly_limit": 1000,
      "trusted_merchants": {
        "amazon": 0.95
      }
    },
    "rules_parsing_time_ms": 5234
  }
}
```

### 3. Deterministic Authorization

5-check evaluation system:
- Budget: 25% weight
- Merchant Trust: 25% weight
- Amount: 20% weight
- Category: 15% weight
- Velocity: 15% weight

Confidence = Sum of passed check weights / 100

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "type": "invalid_request_error",
    "message": "Descriptive error message",
    "param": "field_name",
    "code": "error_code"
  }
}
```

### Error Types

| Type | HTTP Code | Description |
|------|-----------|-------------|
| `invalid_request_error` | 400 | Invalid request parameters |
| `resource_not_found` | 404 | Checkout session not found |
| `api_error` | 500 | Internal server error |
| `stripe_error` | 502 | Stripe API error |

---

## Rate Limiting

Not currently implemented. Production should add:
- Per-IP rate limiting
- Per-merchant rate limiting
- Exponential backoff on errors

---

## Webhooks (Not Implemented)

ACP specification includes webhooks for:
- `checkout_session.completed`
- `checkout_session.canceled`
- `checkout_session.expired`

Future implementation should:
- POST to merchant webhook URL
- Include HMAC signature for verification
- Retry with exponential backoff

---

## Testing

### cURL Examples

**Create Session**:
```bash
curl -X POST http://localhost:9006/checkout_sessions \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_id": "test",
    "amount": 10.00,
    "currency": "usd",
    "natural_language_rules": "Max $100/day",
    "line_items": [{"name": "Test", "price": 10}],
    "customer": {"email": "test@example.com"}
  }'
```

**Get Session**:
```bash
curl http://localhost:9006/checkout_sessions/cs_abc123
```

**Complete Session**:
```bash
curl -X POST http://localhost:9006/checkout_sessions/cs_abc123/complete \
  -H "Content-Type: application/json" \
  -d '{"payment_method": "pm_card_visa"}'
```

---

## Dependencies

### Required Services

1. **Rule Parser Service** (Port 9005)
   - Parses natural language spending rules
   - Optional: Falls back to default rules if unavailable

2. **Proof Service** (Port 9001)
   - Generates zkML authorization proofs
   - Required for authorization decisions

3. **Stripe API**
   - Payment processing
   - Requires `STRIPE_SECRET_KEY` environment variable

### Service Health Checks

```bash
# Check all services
curl http://localhost:9006/health   # ACP Server
curl http://localhost:9005/health   # Rule Parser
curl http://localhost:9001/health   # Proof Service
```

---

## Configuration

### Environment Variables

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# OpenAI (optional, for rule parser)
OPENAI_API_KEY=sk-...

# Services
PROOF_SERVICE_URL=http://localhost:9001
GPT5_PARSER_URL=http://localhost:9005

# Server
PORT=9006
NODE_ENV=development
```

---

## Standards Compliance

### ACP Specification v1.0

This implementation follows the OpenAI/Stripe ACP specification with extensions:

**Required Endpoints**: ✅ All 5 implemented
- POST /checkout_sessions
- GET /checkout_sessions/:id
- POST /checkout_sessions/:id/authorize
- POST /checkout_sessions/:id/complete
- POST /checkout_sessions/:id/cancel

**State Machine**: ✅ Compliant
**Error Handling**: ✅ Compliant
**Webhooks**: ❌ Not implemented (optional)

### Extensions

- zkML authorization proofs (non-standard)
- Natural language rule parsing (non-standard)
- Deterministic authorization logic (non-standard)

---

**Version**: 3.0.0
**Last Updated**: 2025-09-30
**Specification**: OpenAI ACP v1.0 + zkML Extensions
