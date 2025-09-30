/**
 * ACP Payment Service with Authorization Proofs
 * Extended ACP checkout flow with zkML proof verification
 * Port: 9002
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.ACP_SERVICE_PORT || 9002;
const PROOF_SERVICE_URL = process.env.PROOF_SERVICE_URL || 'http://localhost:9001';
const VERIFICATION_SERVICE_URL = process.env.VERIFICATION_SERVICE_URL || 'http://localhost:9003';

// Initialize Stripe (if API key provided)
let stripe = null;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (STRIPE_SECRET_KEY && STRIPE_SECRET_KEY !== 'sk_test_...') {
  stripe = require('stripe')(STRIPE_SECRET_KEY);
  console.log('✅ Stripe SDK initialized');
} else {
  console.warn('⚠️  Stripe API key not configured (using mock mode)');
  console.log('   Set STRIPE_SECRET_KEY in .env for real payments');
}

// In-memory store for payments (use database in production)
const payments = new Map();
const transactions = new Map();

/**
 * Enhanced ACP Payment with Authorization Proof
 */
class ACPPayment {
  constructor(data) {
    this.payment_id = uuidv4();
    this.merchant_id = data.merchant_id;
    this.amount = data.amount;
    this.currency = data.currency || 'USD';
    this.payment_token = data.payment_token;
    this.authorization_proof = data.authorization_proof;
    this.metadata = data.metadata || {};
    this.status = 'pending';
    this.created_at = Date.now();
    this.updated_at = Date.now();
  }

  toJSON() {
    return {
      payment_id: this.payment_id,
      merchant_id: this.merchant_id,
      amount: this.amount,
      currency: this.currency,
      authorization_proof: this.authorization_proof,
      metadata: this.metadata,
      status: this.status,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }
}

/**
 * POST /checkout
 * Create ACP payment with authorization proof
 */
app.post('/checkout', async (req, res) => {
  try {
    const {
      merchant_id,
      amount,
      currency,
      payment_token,
      authorization_proof,
      metadata
    } = req.body;

    // Validate required fields
    if (!merchant_id || !amount || !payment_token) {
      return res.status(400).json({
        error: 'Missing required fields: merchant_id, amount, payment_token'
      });
    }

    // Validate authorization proof if provided
    if (authorization_proof) {
      try {
        const verificationResult = await axios.post(
          `${VERIFICATION_SERVICE_URL}/verify`,
          {
            proof: authorization_proof.proof,
            model_hash: authorization_proof.model_hash,
            inputs_hash: authorization_proof.inputs_hash
          }
        );

        if (!verificationResult.data.valid) {
          return res.status(403).json({
            error: 'Authorization proof verification failed',
            details: verificationResult.data
          });
        }

        console.log(`✅ Authorization proof verified for ${merchant_id}`);
      } catch (error) {
        console.error('Proof verification error:', error.message);
        return res.status(403).json({
          error: 'Failed to verify authorization proof',
          message: error.message
        });
      }
    }

    // Create payment
    const payment = new ACPPayment({
      merchant_id,
      amount,
      currency,
      payment_token,
      authorization_proof,
      metadata
    });

    payments.set(payment.payment_id, payment);

    // Process payment via Stripe (if configured and valid token)
    if (stripe && (payment_token.startsWith('tok_') || payment_token.startsWith('pm_'))) {
      try {
        console.log(`💳 Processing Stripe payment for ${amount} ${currency}...`);

        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: currency.toLowerCase(),
          payment_method: payment_token,
          confirm: true,
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never'
          },
          metadata: {
            payment_id: payment.payment_id,
            merchant_id: merchant_id,
            has_authorization_proof: !!authorization_proof,
            proof_hash: authorization_proof?.proof_hash || null
          }
        });

        payment.stripe_payment_intent_id = paymentIntent.id;
        payment.stripe_status = paymentIntent.status;
        payment.status = paymentIntent.status === 'succeeded' ? 'completed' : 'processing';
        payment.updated_at = Date.now();
        payments.set(payment.payment_id, payment);

        console.log(`✅ Stripe payment ${paymentIntent.status}: ${paymentIntent.id}`);
      } catch (error) {
        console.error(`❌ Stripe payment failed: ${error.message}`);
        payment.status = 'failed';
        payment.error = error.message;
        payment.updated_at = Date.now();
        payments.set(payment.payment_id, payment);

        return res.status(402).json({
          error: 'Payment processing failed',
          message: error.message,
          payment: payment.toJSON()
        });
      }
    } else {
      // Mock payment processing for development
      setTimeout(() => {
        payment.status = 'completed';
        payment.updated_at = Date.now();
        payments.set(payment.payment_id, payment);
      }, 1000);
    }

    res.json({
      success: true,
      payment: payment.toJSON(),
      message: 'Payment created with authorization proof'
    });

    console.log(`💳 Payment created: ${payment.payment_id} for ${merchant_id} ($${amount})`);

  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({
      error: 'Checkout failed',
      message: error.message
    });
  }
});

/**
 * POST /checkout/with-proof-generation
 * Generate proof and create payment in one call
 */
app.post('/checkout/with-proof-generation', async (req, res) => {
  try {
    const {
      user_rules,
      merchant_id,
      amount,
      currency,
      category,
      payment_token,
      metadata
    } = req.body;

    if (!user_rules || !merchant_id || !amount || !payment_token) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    // Step 1: Generate authorization proof
    console.log(`📊 Generating authorization proof for ${merchant_id}...`);

    const proofResult = await axios.post(
      `${PROOF_SERVICE_URL}/prove-authorization`,
      {
        user_rules,
        transaction: {
          merchant_id,
          amount,
          category
        }
      }
    );

    if (!proofResult.data.success) {
      return res.status(403).json({
        error: 'Authorization denied',
        details: proofResult.data
      });
    }

    if (!proofResult.data.decision) {
      return res.status(403).json({
        error: 'Transaction not authorized',
        reason: proofResult.data.reason || 'Agent denied authorization',
        confidence: proofResult.data.confidence
      });
    }

    // Step 2: Create payment with proof
    const payment = new ACPPayment({
      merchant_id,
      amount,
      currency,
      payment_token,
      authorization_proof: {
        proof: proofResult.data.proof,
        proof_hash: proofResult.data.proof_hash,
        session_id: proofResult.data.session_id,
        model_hash: proofResult.data.model_hash,
        inputs_hash: proofResult.data.inputs_hash,
        decision: proofResult.data.decision,
        confidence: proofResult.data.confidence,
        timestamp: proofResult.data.timestamp
      },
      metadata: {
        ...metadata,
        proof_generation_time_ms: proofResult.data.processing_time_ms
      }
    });

    payments.set(payment.payment_id, payment);

    // Simulate payment processing
    setTimeout(() => {
      payment.status = 'completed';
      payment.updated_at = Date.now();
      payments.set(payment.payment_id, payment);
    }, 1000);

    res.json({
      success: true,
      payment: payment.toJSON(),
      proof_details: {
        decision: proofResult.data.decision,
        confidence: proofResult.data.confidence,
        processing_time_ms: proofResult.data.processing_time_ms
      }
    });

    console.log(`✅ Payment created with proof: ${payment.payment_id} (confidence: ${proofResult.data.confidence})`);

  } catch (error) {
    console.error('Checkout with proof error:', error);
    res.status(500).json({
      error: 'Failed to create payment',
      message: error.message
    });
  }
});

/**
 * GET /payment/:paymentId
 * Retrieve payment details
 */
app.get('/payment/:paymentId', (req, res) => {
  const { paymentId } = req.params;
  const payment = payments.get(paymentId);

  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  res.json({
    success: true,
    payment: payment.toJSON()
  });
});

/**
 * GET /merchant/:merchantId/payments
 * Get all payments for a merchant
 */
app.get('/merchant/:merchantId/payments', (req, res) => {
  const { merchantId } = req.params;

  const merchantPayments = Array.from(payments.values())
    .filter(p => p.merchant_id === merchantId)
    .map(p => p.toJSON());

  res.json({
    success: true,
    merchant_id: merchantId,
    payment_count: merchantPayments.length,
    payments: merchantPayments
  });
});

/**
 * POST /payment/:paymentId/refund
 * Refund a payment
 */
app.post('/payment/:paymentId/refund', (req, res) => {
  const { paymentId } = req.params;
  const payment = payments.get(paymentId);

  if (!payment) {
    return res.status(404).json({ error: 'Payment not found' });
  }

  if (payment.status !== 'completed') {
    return res.status(400).json({
      error: 'Can only refund completed payments'
    });
  }

  payment.status = 'refunded';
  payment.updated_at = Date.now();
  payments.set(paymentId, payment);

  res.json({
    success: true,
    payment: payment.toJSON(),
    message: 'Payment refunded'
  });

  console.log(`↩️  Payment refunded: ${paymentId}`);
});

/**
 * GET /stats
 * Get payment statistics
 */
app.get('/stats', (req, res) => {
  const allPayments = Array.from(payments.values());

  const stats = {
    total_payments: allPayments.length,
    total_amount: allPayments.reduce((sum, p) => sum + p.amount, 0),
    by_status: {
      pending: allPayments.filter(p => p.status === 'pending').length,
      completed: allPayments.filter(p => p.status === 'completed').length,
      refunded: allPayments.filter(p => p.status === 'refunded').length,
      failed: allPayments.filter(p => p.status === 'failed').length
    },
    with_proof: allPayments.filter(p => p.authorization_proof).length,
    avg_proof_confidence: allPayments
      .filter(p => p.authorization_proof?.confidence)
      .reduce((sum, p, _, arr) => sum + p.authorization_proof.confidence / arr.length, 0)
  };

  res.json({
    success: true,
    stats
  });
});

/**
 * GET /health
 */
/**
 * POST /create-payment-method
 * Create a Stripe payment method for testing
 */
app.post('/create-payment-method', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        error: 'Stripe not configured',
        message: 'STRIPE_SECRET_KEY not set'
      });
    }

    const { card_number, exp_month, exp_year, cvc } = req.body;

    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: card_number || '4242424242424242',
        exp_month: exp_month || 12,
        exp_year: exp_year || 2025,
        cvc: cvc || '123'
      }
    });

    res.json({
      success: true,
      payment_method_id: paymentMethod.id,
      card_last4: paymentMethod.card.last4,
      card_brand: paymentMethod.card.brand
    });

    console.log(`✅ Payment method created: ${paymentMethod.id}`);

  } catch (error) {
    console.error('❌ Payment method creation failed:', error.message);
    res.status(500).json({
      error: 'Payment method creation failed',
      message: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'acp-service',
    proof_service: PROOF_SERVICE_URL,
    verification_service: VERIFICATION_SERVICE_URL,
    active_payments: payments.size,
    uptime: process.uptime()
  });
});

/**
 * DELETE /payments/clear
 * Clear all payments (dev only)
 */
app.delete('/payments/clear', (req, res) => {
  const count = payments.size;
  payments.clear();
  res.json({
    success: true,
    message: `Cleared ${count} payments`
  });
});

app.listen(PORT, () => {
  console.log(`\n🛒 ACP Payment Service running on port ${PORT}`);
  console.log(`🔗 Proof Service: ${PROOF_SERVICE_URL}`);
  console.log(`🔗 Verification Service: ${VERIFICATION_SERVICE_URL}`);
  console.log(`\nEndpoints:`);
  console.log(`  POST http://localhost:${PORT}/checkout`);
  console.log(`  POST http://localhost:${PORT}/checkout/with-proof-generation`);
  console.log(`  GET  http://localhost:${PORT}/payment/:paymentId`);
  console.log(`  GET  http://localhost:${PORT}/merchant/:merchantId/payments`);
  console.log(`  GET  http://localhost:${PORT}/stats`);
  console.log(`  GET  http://localhost:${PORT}/health\n`);
});

module.exports = app;