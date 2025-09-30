import { Router } from 'express';
import { runInference } from '../services/ai-service.js';
import { generateProof } from '../services/zkml-service.js';
import { verifyAndAnchor } from '../services/anchor-service.js';
import { createVaultToken } from '../store/vault.js';
import { canonicalStringify } from '../util/canonical-json.js';
import { validateDelegate, validateOrNull } from '../util/schema-validate.js';

const router = Router();

router.post('/delegate_payment', async (req, res) => {
  try {
    const body = req.body || {};

    // Optional schema validation
    const v = validateOrNull(validateDelegate, body);
    if (!v.ok) return res.status(400).json({ error: { type: 'invalid_request', code: 'schema_validation', message: JSON.stringify(v.errors) } });

    // Step 1: AI inference
    const amountMinor = body.allowance?.max_amount || 100; // minor units
    const ai = await runInference({ amountMinor, riskSignals: body.risk_signals || [] });
    if (!ai.authorized) {
      return res.status(422).json({ error: { type: 'invalid_request', code: 'not_authorized', message: 'AI policy denied this payment' } });
    }

    // Step 2: zkML proof
    const proofData = await generateProof({ inference: ai });

    // Step 3: Delegate payment tokenization (vt_)
    // Bind to canonicalized request payload
    const canonical = canonicalStringify(body);
    const intentHash = '0x' + Buffer.from(await cryptoDigest(canonical)).toString('hex');

    // Optional Step 4: Anchor zkML evidence (real chain)
    let anchor = null;
    try {
      anchor = await verifyAndAnchor({ proof: proofData.proof, publicSignals: proofData.publicSignals });
    } catch (e) {
      // If anchor fails, still issue vt_ but mark message accordingly (or fail hard)
      anchor = { error: e.message };
    }

    const vaultRecord = {
      allowance: body.allowance,
      payment_method_display: {
        display_brand: body.payment_method?.display_brand,
        display_last4: body.payment_method?.display_last4,
        display_card_funding_type: body.payment_method?.display_card_funding_type,
      },
      evidence: {
        proof_hash: proofData.proofHash,
        public_signals: proofData.publicSignals,
        model_id: 'demo-model',
        decision: ai.authorized ? 1 : 0,
        confidence: Math.round(ai.confidence * 100),
        intent_hash: intentHash,
        anchor,
      },
    };

    const { id, created } = createVaultToken(vaultRecord);

    return res.status(201).json({
      id,
      created,
      metadata: {
        merchant_id: body.allowance?.merchant_id,
        checkout_session_id: body.allowance?.checkout_session_id,
        zkml: { proof_hash: proofData.proofHash, confidence: Math.round(ai.confidence * 100) },
      },
    });
  } catch (e) {
    console.error('delegate_payment error:', e);
    return res.status(500).json({ error: { type: 'processing_error', code: 'internal', message: e.message } });
  }
});

async function cryptoDigest(str) {
  const enc = new TextEncoder();
  const data = enc.encode(str);
  if (globalThis.crypto?.subtle) {
    const buf = await globalThis.crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(buf);
  } else {
    // Node fallback
    const { createHash } = await import('crypto');
    return createHash('sha256').update(str).digest();
  }
}

export default router;

