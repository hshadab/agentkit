# Stripe Auto-Fill Fix

## Problem

User requested automatic test card filling, but Stripe.js blocks passing raw card data client-side:

```javascript
// ❌ This throws error: "Please use Stripe Elements"
const {paymentMethod} = await stripe.createPaymentMethod({
    type: 'card',
    card: {
        number: '4242424242424242',
        exp_month: 12,
        exp_year: 2025,
        cvc: '123',
    },
});
```

**Root Cause**: Stripe.js enforces PCI compliance by preventing raw card data on client-side (publishable key). This security measure protects against credential theft.

## Solution

Create PaymentMethod **server-side** where Stripe allows raw card data (secret key environment).

### Backend Changes (`services/acp-openai-server.js`)

Added `use_test_card` parameter to session update endpoint:

```javascript
// Update fields
const {
  customer,
  payment_method,
  use_test_card,  // NEW: Flag for automatic test card
  shipping_address,
  metadata
} = req.body;

// Handle test card auto-fill (server-side PaymentMethod creation)
if (use_test_card) {
  try {
    console.log('🧪 Creating test PaymentMethod server-side...');
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: '4242424242424242',
        exp_month: 12,
        exp_year: 2025,
        cvc: '123',
      },
    });
    session.payment_method = paymentMethod.id;
    console.log(`✅ Test PaymentMethod created: ${paymentMethod.id}`);
  } catch (pmError) {
    console.error('❌ Failed to create test PaymentMethod:', pmError.message);
    throw pmError;
  }
}
```

### Frontend Changes (`static/index.html`)

Removed client-side PaymentMethod creation, replaced with session update call:

```javascript
// Before: Tried to create PaymentMethod client-side (FAILED)
const {paymentMethod, error} = await stripe.createPaymentMethod({
    type: 'card',
    card: { number: '4242...', ... }
});

// After: Request server-side test card creation (WORKS)
const updateResponse = await fetch(`${ACP_OPENAI_SERVICE}/checkout_sessions/${checkoutSession.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        use_test_card: true  // Backend creates PaymentMethod server-side
    })
});
```

## How It Works

### New Workflow

1. **Frontend**: User clicks "Start Workflow"
2. **Frontend → Backend**: `POST /checkout_sessions/:id` with `use_test_card: true`
3. **Backend**: Creates PaymentMethod using Stripe secret key (allowed server-side)
4. **Backend**: Saves `payment_method` ID to session
5. **Backend → Frontend**: Returns updated session with `payment_method: "pm_xxxxx"`
6. **Frontend → Backend**: `POST /checkout_sessions/:id/complete` (no payment_method needed)
7. **Backend**: Uses saved `payment_method` to process Stripe payment
8. **Backend → Stripe**: Creates PaymentIntent with `confirm: true`
9. **Stripe → Backend**: Returns payment confirmation
10. **Backend → Frontend**: Returns completed session

### Security Considerations

**Why This Is Safe**:
- Test card only works in Stripe test mode
- Server validates all requests
- PaymentMethod IDs are single-use tokens
- Backend has proper Stripe key isolation

**Production Usage**:
- Replace `use_test_card: true` with real Stripe Elements flow
- Never pass `use_test_card` in production
- Environment variable check: `if (process.env.NODE_ENV !== 'production')`

## Testing

### Manual Test
```bash
# 1. Start services
node services/acp-openai-server.js  # Port 9006
node services/gpt5-rule-parser.js   # Port 9005
node services/proof-service.js      # Port 9001

# 2. Open UI
python3 -m http.server 8000
# Navigate to: http://localhost:8000/static/index.html

# 3. Click "Start Workflow"
# Payment should auto-fill and complete without manual card entry
```

### Expected Behavior
- ✅ No "Please use Stripe Elements" error
- ✅ Test card automatically used for payment
- ✅ Stripe PaymentIntent created successfully
- ✅ Payment appears in Stripe Dashboard
- ✅ UI shows "✅ Paid" status with Stripe link

### Logs to Check
```bash
# Backend logs should show:
🧪 Creating test PaymentMethod server-side...
✅ Test PaymentMethod created: pm_xxxxxxxxxxxxx
💳 Processing Stripe payment: 1.00
✅ Payment processed successfully
```

## Files Modified

1. **Backend**: `/home/hshadab/agentkit/acp/services/acp-openai-server.js`
   - Lines 275-314: Added `use_test_card` handling

2. **Frontend**: `/home/hshadab/agentkit/acp/static/index.html`
   - Lines 845-874: Replaced client-side PaymentMethod creation with server-side request

## References

- [Stripe.js Security](https://stripe.com/docs/security)
- [PaymentMethods API](https://stripe.com/docs/api/payment_methods)
- [Test Card Numbers](https://stripe.com/docs/testing)
- [PCI Compliance](https://stripe.com/docs/security/guide)

---

**Date**: 2025-09-30
**Issue**: Stripe "Please use Stripe Elements" error
**Status**: ✅ Fixed
**Commit**: Ready to push