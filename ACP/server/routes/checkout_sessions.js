import { Router } from 'express';
import { createSession, getSession, updateSession } from '../store/sessions.js';
import { getVaultToken } from '../store/vault.js';
import { charge } from '../services/psp-adapter.js';
import { validateCheckoutCreate, validateOrNull } from '../util/schema-validate.js';

const router = Router();

// Create
router.post('/checkout_sessions', (req, res) => {
  const body = req.body || {};
  const v = validateOrNull(validateCheckoutCreate, body);
  if (!v.ok) return res.status(400).json({ error: { type: 'invalid_request', code: 'schema_validation', message: JSON.stringify(v.errors) } });
  const items = body.items || [];
  const currency = body.currency || 'usd';
  const sess = createSession({ items, currency });
  sess.messages.push({ type: 'plain', code: 'info', content_type: 'plain', content: 'Provide delegate token (vt_…) to proceed.' });
  return res.status(201).json(sess);
});

// Update
router.post('/checkout_sessions/:id', (req, res) => {
  const id = req.params.id;
  const sess = getSession(id);
  if (!sess) return res.status(404).json({ error: { type: 'invalid_request', code: 'not_found', message: 'session not found' } });
  const upd = updateSession(id, req.body || {});
  return res.json(upd);
});

// Retrieve
router.get('/checkout_sessions/:id', (req, res) => {
  const sess = getSession(req.params.id);
  if (!sess) return res.status(404).json({ error: { type: 'invalid_request', code: 'not_found', message: 'session not found' } });
  return res.json(sess);
});

// Complete (Step 5)
router.post('/checkout_sessions/:id/complete', async (req, res) => {
  try {
    const sess = getSession(req.params.id);
    if (!sess) return res.status(404).json({ error: { type: 'invalid_request', code: 'not_found', message: 'session not found' } });

    const token = req.body?.payment_data?.token;
    if (!token) return res.status(400).json({ error: { type: 'invalid_request', code: 'missing_token', message: 'payment_data.token required' } });

    const vt = getVaultToken(token);
    if (!vt) return res.status(422).json({ error: { type: 'invalid_request', code: 'invalid_token', message: 'unknown delegate token' } });

    // Enforce allowance
    const amountMinor = (sess.totals?.find?.(t => t.type === 'subtotal')?.amount) || 100;
    if (vt.allowance?.max_amount && amountMinor > vt.allowance.max_amount) {
      return res.status(422).json({ error: { type: 'invalid_request', code: 'allowance_exceeded', message: 'amount exceeds allowance' } });
    }
    if (vt.allowance?.expires_at && Date.now() > Date.parse(vt.allowance.expires_at)) {
      return res.status(422).json({ error: { type: 'invalid_request', code: 'expired', message: 'allowance expired' } });
    }

    // Charge via PSP
    const chargeResult = await charge({ amountMinor, currency: sess.currency, description: `ACP checkout ${sess.id}` });

    const updated = updateSession(sess.id, {
      status: 'completed',
      order: {
        id: 'ord_' + Math.random().toString(36).slice(2, 10),
        checkout_session_id: sess.id,
        permalink_url: `https://example.com/orders/${sess.id}`,
      },
    });

    updated.messages.push({ type: 'plain', code: 'zkml_proof', content_type: 'plain', content: `Proof generated: ${vt.evidence?.proof_hash || ''}` });
    if (vt.evidence?.anchor?.txHash) {
      updated.messages.push({ type: 'plain', code: 'evidence_anchor', content_type: 'plain', content: `Anchored: ${vt.evidence.anchor.txHash}` });
    }
    updated.messages.push({ type: 'plain', code: 'payment_executed', content_type: 'plain', content: `${chargeResult.provider} ${chargeResult.id}` });

    return res.json(updated);
  } catch (e) {
    console.error('checkout complete error:', e);
    return res.status(500).json({ error: { type: 'processing_error', code: 'internal', message: e.message } });
  }
});

// Cancel (optional)
router.post('/checkout_sessions/:id/cancel', (req, res) => {
  const sess = getSession(req.params.id);
  if (!sess) return res.status(404).json({ error: { type: 'invalid_request', code: 'not_found', message: 'session not found' } });
  const updated = updateSession(sess.id, { status: 'canceled' });
  return res.json(updated);
});

export default router;

