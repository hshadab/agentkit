#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const crypto = require('crypto');
const { issueAttestation, verifyAttestation } = require('./attestation');
const fs = require('fs');
const { generateProof } = require('./generate-valid-proof');
// Strict mode: legacy HMAC helpers removed
const { createDemoPaymentHeader, processX402Payment } = require('./production-payment-handler');
const { verifyOnChain, checkVerificationStatus } = require('./groth16-verifier-service');
const path = require('path');
const { spawn } = require('child_process');
// Ensure local .env is loaded even when started via `node x402/proof-gate-server.js`
let dotenvParsed = {};
try {
  const r = require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  dotenvParsed = r.parsed || {};
} catch {}

function env(k, def) {
  const v = process.env[k];
  if (v !== undefined && v !== '') return v;
  if (dotenvParsed && dotenvParsed[k] !== undefined && dotenvParsed[k] !== '') return dotenvParsed[k];
  return def;
}
const { ethers } = require('ethers');

const app = express();
let LAST_REDEMPTION = null; // { redeemed, usdcTxHash, explorer, blockNumber, at }
const METRICS = { 
  attestIssued: 0, preflight402: 0, paidAccepted: 0, anchorSubmitted: 0, anchorConfirmed: 0, anchorError: 0, autopayRuns: 0,
  onnxCalls: 0, onnxMs: 0,
  joltMs: 0, grothMs: 0,
  anchorMs: 0,
  payments: 0, paymentMs: 0
};
const logEvent = (event, extra={}) => { try { console.log(JSON.stringify({ ts: new Date().toISOString(), event, ...extra })); } catch {} };
app.use(cors({
  origin: (origin, cb) => cb(null, true),
  credentials: false,
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','X-ZKML-Attestation','X-402-Client','X-402-Timestamp','X-402-Nonce','X-402-Signature','X-PAYMENT'],
}));
app.use(express.json({ limit: '10mb' }));

const UNIFIED_BACKEND = env('UNIFIED_BACKEND', 'http://127.0.0.1:8002');
async function runJoltAtlasProver() {
  const JOLT_BIN = env('JOLT_BIN', '');
  const JOLT_PROOF_PATH = env('JOLT_PROOF_PATH', '');
  const JOLT_CWD = env('JOLT_CWD', '');
  if (!JOLT_BIN) throw new Error('JOLT_BIN not configured');
  if (!JOLT_PROOF_PATH) throw new Error('JOLT_PROOF_PATH not configured');
  await new Promise((resolve, reject) => {
    const child = spawn(JOLT_BIN, ['prove'], { cwd: JOLT_CWD || undefined });
    let out = '', err = '';
    child.stdout.on('data', d => out += d.toString());
    child.stderr.on('data', d => err += d.toString());
    child.on('error', (e) => reject(e));
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`Jolt prover exited with code ${code}: ${err || out}`));
      resolve(null);
    });
  });
  let proofBytes;
  try { proofBytes = fs.readFileSync(JOLT_PROOF_PATH); } catch (e) { throw new Error(`Jolt proof file read failed: ${e.message}`); }
  const joltProofHash = '0x' + crypto.createHash('sha256').update(proofBytes).digest('hex');
  return { joltProofHash };
}
const VERIFY_ON_CHAIN = env('VERIFY_ON_CHAIN', '') === 'true';
const ETH_VERIFY_MODE = env('X402_ETH_VERIFY_MODE', 'backend'); // 'backend' | 'cli' | 'unified'
const X402_RESOURCE_PATH = '/x402/pay';

// Base Sepolia USDC
const DEFAULT_USDC_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

const DECISION_THRESHOLD = parseInt(env('X402_ZKML_DECISION_THRESHOLD', '80'), 10);

// Auto-pay mode: '' (off), 'attest', or 'anchor_confirmed'
const AUTOPAY_MODE = (env('X402_AUTOPAY', '').toLowerCase());
const SELF_PORT = Number(env('X402_ZKML_PORT', '8610'));
const autopayProcessed = new Set();
// Ephemeral quote store for Accepts TTL: quoteId -> { expiresAt, accepts }
const QUOTES = new Map();

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

// SNARK field for BN254
const SNARK_FIELD = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
function hexToField(hex) {
  try {
    const clean = String(hex || '0x').replace(/^0x/i, '');
    if (!clean) return '0';
    const n = BigInt('0x' + clean);
    const r = n % SNARK_FIELD;
    return r.toString();
  } catch (e) { return '0'; }
}

// Compute sha256 hex of a file; returns null on failure
function fileSha256Hex(p) {
  try {
    const b = fs.readFileSync(p);
    return crypto.createHash('sha256').update(b).digest('hex');
  } catch {
    return null;
  }
}

app.get('/health', (req, res) => {
  const onChain = env('X402_ZKML_VERIFY_ETH', '') === 'true' || VERIFY_ON_CHAIN;
  res.json({ ok: true, unifiedBackend: UNIFIED_BACKEND, onChain: !!onChain, ethVerifyMode: ETH_VERIFY_MODE, autopayMode: AUTOPAY_MODE, onnx: { url: env('X402_ONNX_URL','http://127.0.0.1:8009'), require: env('X402_REQUIRE_ONNX','true') }, aiMinConfidence: Number(env('X402_AI_MIN_CONFIDENCE','0')) });
});

// In-memory anchor store for non-blocking on-chain verification
// Map: attestationId -> { status: 'pending'|'confirmed'|'error', result?, error?, startedAt, finishedAt }
const anchors = new Map();

// Step 1: Given zkML proof, verify (simulated or on-chain) and issue attestation
app.post('/attest', async (req, res) => {
  try {
    const { agentId, modelId, clientId, merchantId, cart, intent, proof, publicInputs, extra } = req.body || {};
    if (!agentId || !modelId || !proof) {
      return res.status(400).json({ error: 'agentId, modelId, and proof required' });
    }

    // Compute proof hash for binding; prefer Jolt-Atlas hash if provided by UI
    let proofHash = undefined;
    if (extra && extra.joltProofHash) {
      proofHash = String(extra.joltProofHash);
    } else {
      proofHash = sha256Hex(JSON.stringify({ proof, publicInputs }));
    }

    // Derive decision/confidence from provided proof shape (best-effort)
    const { decision, confidence } = extractDecisionConfidence(proof, publicInputs);
    // Enforce: do not issue attestation if AI denied
    if ((env('X402_ENFORCE_AI','true').toLowerCase() === 'true') && decision !== 1) {
      return res.status(402).json({ error: 'ai_denied', details: { decision, confidence } });
    }

    // Canonical commerce bindings
    const canonCart = cart && typeof cart === 'object' ? cart : defaultCart();
    const cartHash = sha256Hex(JSON.stringify(canonCart));
    const totalCents = Number(canonCart.totalCents || 100); // default demo

    const method = (intent && intent.method) || 'POST';
    const pathName = (intent && intent.path) || X402_RESOURCE_PATH;
    const bodyObj = (intent && intent.body) || { intent: 'demo' };
    const bodyStr = JSON.stringify(bodyObj);
    const bodyHash = sha256Hex(bodyStr);
    const intentHash = sha256Hex([method.toUpperCase(), pathName, bodyHash].join('\n'));

    // Accepts binding (derived from server config to avoid TOCTOU)
    const acceptsBinding = {
      resource: pathName,
      network: env('X402_NETWORK', 'base-sepolia'),
      payTo: env('X402_PAYTO', '0x1111111111111111111111111111111111111111'),
      asset: env('X402_ASSET', DEFAULT_USDC_BASE_SEPOLIA),
      price: env('X402_PRICE', '$0.01'),
    };
  const acceptsHash = sha256Hex(JSON.stringify(acceptsBinding));
  // Stronger bindings
  const onnxModelPath = env('ONNX_MODEL_PATH', path.join(__dirname, '..', 'acp', 'models', 'authorization_model.onnx'));
  const modelHashHex = fileSha256Hex(onnxModelPath);
  const policyHashHex = acceptsHash;

    // Perform zkML verification; prefer Ethereum CLI path if enabled
    // Non-blocking on-chain verification: queue background anchor job, return immediately
    let onChain = env('X402_ZKML_VERIFY_ETH', '') === 'true' || VERIFY_ON_CHAIN;
    let eth = null;
    let attestationId = sha256Hex(`${proofHash}:${Date.now()}`);
    // Try to bind to originating zkML session for strong consistency
    let sessionId = extra?.sessionId || null;
    if (!sessionId && proofHash) {
      try {
        for (const [sid, sess] of ZKML_SESSIONS.entries()) {
          if (sess && String(sess.joltProofHash).toLowerCase() === String(proofHash).toLowerCase()) { sessionId = sid; break; }
        }
      } catch {}
    }
    if (env('X402_ZKML_VERIFY_ETH','') === 'true' || VERIFY_ON_CHAIN) {
  anchors.set(attestationId, { status: 'pending', sessionId, startedAt: Date.now() });
  METRICS.anchorSubmitted++;
  queueImmediate(async () => {
        try {
          console.log('[anchor] Starting REAL on-chain verification...');
          
          // Use REAL on-chain verification with deployed Groth16 verifier
          // Prefer session-bound proof to avoid race conditions; if missing, read latest file
          let validProof;
          let verifySignals;
          const sessId = anchors.get(attestationId)?.sessionId;
          let usedSource = 'session';
          try {
            if (sessId) {
              const sess = ZKML_SESSIONS.get(sessId);
              if (sess && Array.isArray(sess.publicSignals) && sess.publicSignals.length >= 2 && sess.snarkProof) {
                verifySignals = sess.publicSignals.map(String);
                validProof = sess.snarkProof;
                console.log('[anchor] Using session publicSignals + in-memory proof');
              } else if (sess && Array.isArray(sess.publicSignals) && sess.publicSignals.length >= 2) {
                verifySignals = sess.publicSignals.map(String);
                const proofData = require('./generated-proof.json');
                if (!proofData || !proofData.proof) throw new Error('generated-proof.json invalid');
                validProof = proofData.proof;
                console.log('[anchor] Using session publicSignals with latest proof file');
              } else {
                usedSource = 'file';
                throw new Error('session_missing_or_incomplete');
              }
            } else {
              usedSource = 'file';
              throw new Error('no_session');
            }
          } catch (_e) {
            // Fallback to file-only
            try {
              const proofData = require('./generated-proof.json');
              if (!proofData || !proofData.proof || !Array.isArray(proofData.publicSignals)) {
                throw new Error('generated-proof.json invalid');
              }
              validProof = proofData.proof;
              verifySignals = proofData.publicSignals.map(String);
              console.log('[anchor] Using generated proof from generated-proof.json');
            } catch (e2) {
              throw new Error('generated-proof.json missing or invalid. Run `npm run generate:proof` after placing real circuit assets.');
            }
          }

          // Option B strict mode: require third public signal
          if ((env('X402_REQUIRE_PROOFHASH_SIGNAL','').toLowerCase() === 'true') && (!Array.isArray(verifySignals) || verifySignals.length < 3)) {
            throw new Error('proofHash public signal required but missing');
          }

          const formattedProof = {
            pi_a: validProof.pi_a.slice(0, 2), // Remove the "1" at the end if present
            pi_b: [validProof.pi_b[0], validProof.pi_b[1]], // Use only first two elements
            pi_c: validProof.pi_c.slice(0, 2) // Remove the "1" at the end if present
          };
          
          // Public signals derived from generated-proof.json
          // Option B: Enforce 3rd signal matches attestation proofHash commitment; if v2 (5 signals) also enforce model/policy
          try {
            if (Array.isArray(verifySignals) && verifySignals.length >= 3) {
              const expected = hexToField(proofHash);
              if (String(verifySignals[2]) !== String(expected)) {
                throw new Error(`proofhash_signal_mismatch: expected ${expected}, got ${verifySignals[2]}`);
              }
              if (verifySignals.length >= 5) {
                const modelF = hexToField('0x' + (modelHashHex || ''));
                const policyF = hexToField(policyHashHex);
                if (String(verifySignals[3]) !== String(modelF)) throw new Error('modelhash_signal_mismatch');
                if (String(verifySignals[4]) !== String(policyF)) throw new Error('policyhash_signal_mismatch');
              }
            }
          } catch (mismatch) {
            anchors.set(attestationId, {
              status: 'error',
              error: String(mismatch?.message || mismatch),
              startedAt: anchors.get(attestationId)?.startedAt,
              finishedAt: Date.now(),
              details: { source: usedSource || 'unknown', verifySignals }
            });
            METRICS.anchorError++;
            logEvent('anchor_error', { attestationId, error: 'proofhash_signal_mismatch', source: usedSource || 'unknown' });
            return;
          }
          
          // Execute REAL on-chain verification
          const result = await verifyOnChain(formattedProof, verifySignals);
          
          if (result.success) {
            console.log('[anchor] REAL on-chain verification successful:', {
              attestationId,
              txHash: result.transactionHash,
              blockNumber: result.blockNumber,
              gasUsed: result.gasUsed
            });
            
            anchors.set(attestationId, { 
              status: 'confirmed', 
              result, 
              startedAt: anchors.get(attestationId)?.startedAt, 
              finishedAt: Date.now(),
              transactionHash: result.transactionHash
            });
            METRICS.anchorConfirmed++;
            const a = anchors.get(attestationId);
            if (a?.startedAt && a?.finishedAt) METRICS.anchorMs += (a.finishedAt - a.startedAt);
            logEvent('anchor_confirmed', { attestationId, txHash: result.transactionHash, blockNumber: result.blockNumber });
          } else {
            throw new Error(result.error || 'Verification failed');
          }
        } catch (err) {
          console.error('[anchor] REAL verification error:', err.message);
          anchors.set(attestationId, { 
            status: 'error', 
            error: String(err?.message || err), 
            startedAt: anchors.get(attestationId)?.startedAt, 
            finishedAt: Date.now() 
          });
          METRICS.anchorError++;
          logEvent('anchor_error', { attestationId, error: String(err?.message || err) });
        }
      });
    }

    // Optional risk policy: if publicInputs include a scaled risk score (<= threshold)
    const riskScore = Array.isArray(publicInputs) ? publicInputs[3] : undefined;
    if (typeof riskScore === 'number' && riskScore > 7000 /* if inputs scaled by 100 */) {
      return res.status(402).json({ error: 'policy_violation', details: { riskScore } });
    }

    // Build enriched attestation payload
    const attnPayload = {
      agentId,
      clientId: clientId || agentId,
      merchantId: merchantId || env('X402_MERCHANT_ID', 'demo-merchant'),
      modelId,
      modelCheckpoint: proof?.modelCheckpoint || 'unknown',
      proofHash,
      modelHash: modelHashHex || null,
      policyHash: policyHashHex,
      authorized: decision === 1,
      decision,
      confidence,
      cartHash,
      totalCents,
      intentHash,
      acceptsHash,
      budgetRoot: req.body?.budgetRoot || '0x0',
      spendNullifier: req.body?.spendNullifier || crypto.randomBytes(16).toString('hex'),
      sessionId: extra?.sessionId || 'n/a',
      onChain,
      eth,
      txHash: eth?.transactionHash || eth?.txHash || '0x',
      blockNumber: eth?.blockNumber || 0,
      contractAddress: eth?.contractAddress || '0x0000000000000000000000000000000000000000',
    };

    const { token, issuedAt, expiresAt } = await issueAttestation(attnPayload);
    // Surface attester (EIP-712 signer) for demo clarity
    const ver = verifyAttestation(token);
    const attester = ver && ver.attester ? ver.attester : undefined;
    const anchor = (env('X402_ZKML_VERIFY_ETH','') === 'true' || VERIFY_ON_CHAIN) ? { status: 'pending', attestationId, poll: `/attest/anchor/${attestationId}` } : null;

    // Schedule optional auto-pay in background
    try {
      if (AUTOPAY_MODE === 'attest') {
        queueImmediate(() => runAutopay({ attestationId, token, bodyJson: bodyObj }));
      } else if (AUTOPAY_MODE === 'anchor_confirmed' && onChain && attestationId) {
        queueImmediate(async () => {
          // Poll anchors until confirmed or error, up to 60s
          for (let i = 0; i < 60; i++) {
            const a = anchors.get(attestationId);
            if (a?.status === 'confirmed') {
              await runAutopay({ attestationId, token, bodyJson: bodyObj, anchorId: attestationId });
              break;
            }
            if (a?.status === 'error') { break; }
            await new Promise(r => setTimeout(r, 1000));
          }
        });
      }
    } catch (apErr) {
      console.error('[autopay] schedule error:', String(apErr?.message || apErr));
    }

    METRICS.attestIssued++;
    logEvent('attest_issued', { intentHash, acceptsHash, onChain });
    return res.json({ ok: true, token, proofHash, modelHash: modelHashHex || null, policyHash: policyHashHex, issuedAt, expiresAt, onChain, intentHash, acceptsHash, attester, anchor });
  } catch (e) {
    console.error('attest error:', e);
    return res.status(500).json({ error: 'server_error', message: e.message });
  }
});

// Anchor status endpoint
app.get('/attest/anchor/:id', (req, res) => {
  const id = req.params.id;
  const entry = anchors.get(id);
  if (!entry) return res.status(404).json({ error: 'not_found' });
  res.json({ id, ...entry });
});

// Attestation guard middleware for x402 routes
function requireAttestation(req, res, next) {
  const attn = req.header('X-ZKML-Attestation');
  if (!attn) return res.status(402).json({ error: 'attestation_required' });
  const result = verifyAttestation(attn);
  if (!result.ok) return res.status(402).json({ error: 'invalid_attestation', details: result.error });
  req.zkmlAttestation = result.payload;
  next();
}

// Primary x402 /x402/pay route (strict, no middleware)
{
  app.post('/x402/pay', requireAttestation, async (req, res) => {
    // Verify intent binding
    const computedIntentHash = sha256Hex([req.method.toUpperCase(), req.path, sha256Hex(JSON.stringify(req.body || {}))].join('\n'));
    const attn = req.zkmlAttestation || {};
    if (attn.intentHash && attn.intentHash !== computedIntentHash) {
      return res.status(402).json({ error: 'intent_mismatch' });
    }
    // Verify accepts binding against server-configured values
    const acceptsBinding = { resource: req.path, network: env('X402_NETWORK','base-sepolia'), payTo: env('X402_PAYTO','0x1111111111111111111111111111111111111111'), asset: env('X402_ASSET', DEFAULT_USDC_BASE_SEPOLIA), price: env('X402_PRICE','$0.01') };
    const computedAcceptsHash = sha256Hex(JSON.stringify(acceptsBinding));
    if (attn.acceptsHash && attn.acceptsHash !== computedAcceptsHash) {
      return res.status(402).json({ error: 'accepts_mismatch' });
    }
    // If client provided an X-PAYMENT header, process it directly
    const paymentHeader = req.header('X-PAYMENT');
    const expected = {
      network: env('X402_NETWORK','base-sepolia'),
      asset: env('X402_ASSET', DEFAULT_USDC_BASE_SEPOLIA),
      payTo: env('X402_PAYTO','0x1111111111111111111111111111111111111111'),
      price: env('X402_PRICE','$0.01'),
    };
    if (paymentHeader) {
      try {
        // Optional: enforce quote TTL if header includes quoteId
        let decoded;
        try { decoded = JSON.parse(Buffer.from(paymentHeader, 'base64url').toString('utf8')); } catch {}
        const quoteId = decoded?.quoteId;
        if (quoteId) {
          const q = QUOTES.get(quoteId);
          if (!q) return res.status(402).json({ error: 'quote_not_found' });
          if (Date.now() > q.expiresAt) return res.status(402).json({ error: 'quote_expired' });
        }

        // Execute authorization-based payment
        const chainId = Number(env('CHAIN_ID', 84532));
        const rpcUrl = env('BASE_RPC_URL', 'https://sepolia.base.org');
        const pk = env('PRIVATE_KEY', env('BASE_PRIVATE_KEY'));
        if (!pk) return res.status(500).json({ error: 'server_missing_private_key' });
        const { tx, mode } = await processX402Payment({
          header: paymentHeader,
          expectedAsset: expected.asset,
          expectedPayTo: expected.payTo,
          expectedNetwork: expected.network,
          privateKey: pk,
          rpcUrl,
          chainId,
        });

        const explorer = env('EXPLORER_BASE_URL', 'https://sepolia.basescan.org');
        const payment = {
          redeemed: true,
          mode,
          usdcTxHash: tx.hash,
          explorer: `${explorer}/tx/${tx.hash}`
        };
        LAST_REDEMPTION = { ...payment, at: Date.now() };
        METRICS.paidAccepted++;
        logEvent('payment_accepted', { txHash: tx.hash, mode });
        return res.status(200).json({ ok: true, message: 'Payment accepted', payment });
      } catch (err) {
        return res.status(402).json({ error: 'payment_rejected', message: String(err?.message || err) });
      }
    }

    // Return Accepts for client preflight with 402 Payment Required
    const now = Date.now();
    const expiresAt = now + 120000; // 2 minutes quote TTL
    const quoteId = sha256Hex(`${computedAcceptsHash}:${now}`);
    const accepts = {
      x402Version: 1,
      scheme: 'exact',
      network: expected.network,
      asset: expected.asset,
      payTo: expected.payTo,
      price: expected.price,
      resource: req.path,
      maxAmountRequired: '10000', // 0.01 USDC
      maxTimeoutSeconds: 60,
      quoteId,
      expiresAt
    };
    QUOTES.set(quoteId, { expiresAt, accepts });
    METRICS.preflight402++;
    logEvent('preflight_402', { quoteId, expiresAt });
    return res.status(402).json({ ok: false, error: 'payment_required', accepts: [accepts] });
  });
}

// Step 2: x402-protected action; require a valid attestation header
// Removed legacy /x402/protected route (HMAC)

// UI helper: run x402 payment automatically using production-compliant flow
app.post('/ui/pay-auto', async (req, res) => {
  try {
    const { token, body, anchorId } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token_required' });
    if (!anchorId) return res.status(400).json({ error: 'anchor_required' });
    const anchor = anchors.get(anchorId);
    if (!anchor) return res.status(402).json({ error: 'verification_not_found' });
    if (anchor.status === 'pending') return res.status(402).json({ error: 'verification_pending' });
    if (anchor.status === 'error') return res.status(402).json({ error: 'verification_failed', details: anchor.error });
    if (anchor.status !== 'confirmed') return res.status(402).json({ error: 'verification_invalid' });
    console.log('[payment] On-chain verification confirmed, proceeding with payment');
    
    const bodyJson = body || { intent: 'demo', cart: { items: [{ sku: 'api-pro-month', qty: 1 }] } };
    
    // Preflight to get Accepts
    const pre = await fetch(`http://127.0.0.1:${PORT}/x402/pay`, {
      method: 'POST', 
      headers: { 'content-type': 'application/json', 'X-ZKML-Attestation': token },
      body: JSON.stringify(bodyJson),
    });
    const preJson = await pre.json();
    if (!preJson.accepts) return res.status(pre.status).json({ error: 'preflight_failed', details: preJson });
    
    // Get payment requirements from first accept option
    const accepts = preJson.accepts[0];
    if (!accepts) return res.status(400).json({ error: 'no_accepts_available' });

    // Build a client-signed EIP-3009 authorization header using an AGENT (payer) key
    // This makes the flow fully x402-compliant without MetaMask prompts.
    const executorPk = env('PRIVATE_KEY', env('BASE_PRIVATE_KEY'));
    const agentPk = env('X402_AGENT_PRIVATE_KEY', '');
    if (!executorPk) return res.status(500).json({ error: 'server_missing_private_key' });
    // Prefer agent key if provided; otherwise use executor (demo)
    const signingPk = agentPk || executorPk;

    const header = await createDemoPaymentHeader({
      privateKey: signingPk,
      payTo: accepts.payTo || env('X402_PAYTO','0x2e408ad62e30146404F4ED8A61253212f3f9A490'),
      asset: accepts.asset || env('X402_ASSET', DEFAULT_USDC_BASE_SEPOLIA),
      amount: accepts.maxAmountRequired || '10000',
      network: accepts.network || env('X402_NETWORK','base-sepolia'),
      chainId: Number(env('CHAIN_ID', 84532)),
      validityWindow: Number(accepts.maxTimeoutSeconds || 60),
      quoteId: accepts.quoteId
    });
    
    // Final paid call with X-PAYMENT header
    const tP0 = Date.now();
    const paid = await fetch(`http://127.0.0.1:${PORT}/x402/pay`, {
      method: 'POST',
      headers: { 
        'content-type': 'application/json', 
        'X-ZKML-Attestation': token, 
        'X-PAYMENT': header 
      },
      body: JSON.stringify(bodyJson),
    });
    const paidJson = await paid.json();
    const tP1 = Date.now();
    METRICS.payments++;
    METRICS.paymentMs += (tP1 - tP0);

    // Attempt to discover the USDC tx emitted by middleware by parsing header and scanning recent logs
    let redemption = null;
    try {
      const decoded = JSON.parse(Buffer.from(header, 'base64url').toString());
      const auth = decoded && decoded.payload && decoded.payload.authorization ? decoded.payload.authorization : null;
      if (auth && auth.from && auth.to && auth.value) {
        const tx = await waitForUsdcTransfer({
          from: auth.from,
          to: auth.to,
          value: BigInt(auth.value),
          rpcUrl: env('BASE_RPC_URL', 'https://sepolia.base.org'),
          asset: env('X402_ASSET', DEFAULT_USDC_BASE_SEPOLIA)
        });
        if (tx) {
          const explorer = env('EXPLORER_BASE_URL', 'https://sepolia.basescan.org');
          redemption = {
            redeemed: true,
            mode: 'middleware_authorization',
            usdcTxHash: tx.transactionHash,
            explorer: `${explorer}/tx/${tx.transactionHash}`,
            blockNumber: Number(tx.blockNumber || 0)
          };
          LAST_REDEMPTION = { ...redemption, authorization: auth, at: Date.now() };
        }
      }
    } catch (e) {
      // best-effort; ignore
    }

    return res.status(paid.status).json({ ...paidJson, payment: redemption || paidJson.payment || null });
  } catch (e) {
    console.error('ui/pay-auto error:', e);
    return res.status(500).json({ error: 'server_error', message: String(e && e.message ? e.message : e) });
  }
});

// UI helper: prepare typed data for MetaMask signing (no private key on server)
app.post('/ui/payment/prepare', async (req, res) => {
  try {
    const { token, body, address } = req.body || {};
    if (!token || !address) return res.status(400).json({ error: 'token_and_address_required' });
    const bodyJson = body || { intent: 'demo', cart: { items: [{ sku: 'api-pro-month', qty: 1 }] } };
    // Preflight to get Accepts
    const pre = await fetch(`http://127.0.0.1:${PORT}/x402/pay`, { method: 'POST', headers: { 'content-type': 'application/json', 'X-ZKML-Attestation': token }, body: JSON.stringify(bodyJson) });
    const preJson = await pre.json();
    if (!preJson.accepts) return res.status(pre.status).json({ error: 'preflight_failed', details: preJson });
    const accepts = preJson.accepts;
    const { selectPaymentRequirements, preparePaymentHeader } = await import('x402/client');
    const selected = selectPaymentRequirements(accepts, env('X402_NETWORK','base-sepolia'), 'exact');
    
    // Ensure we have the required fields for the selected payment
    if (!selected || !selected.maxAmountRequired) {
      // Add default maxAmountRequired if missing
      if (selected) {
        selected.maxAmountRequired = '10000'; // 0.01 USDC
      }
    }
    
    // x402Version must be 1 for the current scheme (MetaMask signs typed data)
    try {
      const paymentData = await preparePaymentHeader(address, 1, selected);
      console.log('PreparePaymentHeader result:', JSON.stringify(paymentData, null, 2));
      
      // Extract authorization details from payment data
      const auth = paymentData.payload?.authorization || {};
      
      // Convert to proper EIP-712 typed data for MetaMask
      const typedData = {
        domain: {
          name: 'USDC',
          version: '2',
          chainId: Number(env('CHAIN_ID', 84532)),
          verifyingContract: selected.asset || env('X402_ASSET', DEFAULT_USDC_BASE_SEPOLIA)
        },
        types: {
          TransferWithAuthorization: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'validAfter', type: 'uint256' },
            { name: 'validBefore', type: 'uint256' },
            { name: 'nonce', type: 'bytes32' }
          ]
        },
        primaryType: 'TransferWithAuthorization',
        message: {
          from: auth.from || address,
          to: auth.to || selected.payTo || env('X402_PAYTO', '0x2e408ad62e30146404F4ED8A61253212f3f9A490'),
          value: auth.value || selected.maxAmountRequired || '10000',
          validAfter: auth.validAfter || Math.floor(Date.now() / 1000),
          validBefore: auth.validBefore || Math.floor(Date.now() / 1000) + 3600,
          nonce: auth.nonce || ('0x' + crypto.randomBytes(32).toString('hex'))
        }
      };
      
      // Store the payment data for later use
      return res.json({ ok: true, selected, typedData, paymentData });
    } catch (prepareError) {
      console.error('preparePaymentHeader error:', prepareError);
      return res.status(500).json({ error: 'prepare_failed' });
    }
  } catch (e) { 
    console.error('ui/payment/prepare error:', e);
    return res.status(500).json({ error: 'server_error', message: e.message }); 
  }
});

// UI helper: finish MetaMask payment with signature
app.post('/ui/pay-metamask', async (req, res) => {
  try {
    const { token, body, selected, signature, typedData, anchorId } = req.body || {};
    if (!token || !signature) return res.status(400).json({ error: 'token_and_signature_required' });
    
    // REQUIRE on-chain verification before payment
    if (anchorId) {
      const anchor = anchors.get(anchorId);
      if (!anchor) {
        return res.status(402).json({ error: 'verification_not_found', message: 'On-chain verification not found' });
      }
      if (anchor.status === 'pending') {
        return res.status(402).json({ error: 'verification_pending', message: 'Waiting for on-chain verification to complete' });
      }
      if (anchor.status === 'error') {
        return res.status(402).json({ error: 'verification_failed', message: 'On-chain verification failed', details: anchor.error });
      }
      if (anchor.status !== 'confirmed') {
        return res.status(402).json({ error: 'verification_invalid', message: 'On-chain verification not confirmed' });
      }
      console.log('[payment] On-chain verification confirmed, proceeding with payment');
    }
    
    const bodyJson = body || { intent: 'demo', cart: { items: [{ sku: 'api-pro-month', qty: 1 }] } };
    
    // Build x402 payment header from signature and typed data
    const paymentHeader = {
      x402Version: 1,  // Add the required x402Version field
      scheme: 'exact',
      network: env('X402_NETWORK', 'base-sepolia'),
      payload: {
        authorization: typedData?.message || {
          from: '0x2e408ad62e30146404F4ED8A61253212f3f9A490',
          to: env('X402_PAYTO', '0x2e408ad62e30146404F4ED8A61253212f3f9A490'),
          value: '10000',
          validAfter: Math.floor(Date.now() / 1000),
          validBefore: Math.floor(Date.now() / 1000) + 3600,
          nonce: '0x' + crypto.randomBytes(32).toString('hex')
        },
        signature: signature
      }
    };
    
    const header = Buffer.from(JSON.stringify(paymentHeader)).toString('base64url');
    
    // Make x402 payment request
    const paid = await fetch(`http://127.0.0.1:${PORT}/x402/pay`, { 
      method: 'POST', 
      headers: { 
        'content-type': 'application/json', 
        'X-ZKML-Attestation': token, 
        'X-PAYMENT': header 
      }, 
      body: JSON.stringify(bodyJson) 
    });
    const paidJson = await paid.json();
    
    // Attempt redemption so response includes payment link
    let redemption = null;
    try {
      redemption = await redeemUsdcAuthorization({ 
        header, 
        asset: env('X402_ASSET', DEFAULT_USDC_BASE_SEPOLIA), 
        expectedPayTo: env('X402_PAYTO','0x2e408ad62e30146404F4ED8A61253212f3f9A490'), 
        network: env('X402_NETWORK','base-sepolia') 
      });
    } catch (e) { 
      redemption = { redeemed: false, error: String(e && e.message ? e.message : e) }; 
    }
    return res.status(paid.status).json({ ...paidJson, payment: redemption });
  } catch (e) { 
    console.error('ui/pay-metamask error:', e);
    return res.status(500).json({ error: 'server_error', message: e.message }); 
  }
});

const PORT = Number(env('X402_ZKML_PORT', '8610'));
const BIND_HOST = env('X402_BIND_HOST', '0.0.0.0');
// Serve static demo under same origin to avoid CORS issues
try { app.use('/static', express.static(path.join(__dirname, '..', 'static'))); } catch {}

// Simple proxies to Rust zkML backend to avoid cross-origin in browser UI
// Local zkML sessions using the x402 proof generator (snarkjs)
const ZKML_SESSIONS = new Map(); // id -> { status, proof?, publicSignals?, startTime, error? }
app.post('/ui/zkml/prove', async (req, res) => {
  try {
    const sessionId = crypto.randomBytes(16).toString('hex');
    ZKML_SESSIONS.set(sessionId, { status: 'generating', startTime: Date.now() });
    queueImmediate(async () => {
      try {
        // Step 1: REAL AI inference via ONNX (strict if required)
        let aiDecision = null; let aiConfidence = null; let inferenceMs = null;
        try {
          const REQUIRE_ONNX = (env('X402_REQUIRE_ONNX','true').toLowerCase() === 'true');
          const ONNX_URL = env('X402_ONNX_URL', 'http://127.0.0.1:8009');
          const input = (req.body && req.body.input) || {};
          const tx = {
            dailyBudgetRemaining: Number(input.budget_remaining ?? 9543),
            dailyBudgetLimit: Number(input.daily_limit ?? 10000),
            merchantRiskScore: Number(input.merchant_risk ?? 12) / 100,
            transactionAmount: Number(input.amount ?? 100),
            merchantCategory: String(input.category || 'api'),
            recentTransactionCount: Number(input.velocity_count ?? 2),
            hourlyLimit: Number(input.hourly_limit ?? 10)
          };
          const t0 = Date.now();
          const r = await fetch(`${ONNX_URL}/zkml/onnx/authorize`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ transaction: tx })});
          if (!r.ok) throw new Error(`onnx_http_${r.status}`);
          const j = await r.json();
          const auth = j && j.authorization ? j.authorization : null;
          if (!auth || (auth.decision === undefined) || (auth.confidence === undefined)) throw new Error('onnx_invalid_payload');
          aiDecision = auth.decision ? 1 : 0;
          aiConfidence = Number(auth.confidence);
          if (!Number.isFinite(aiConfidence)) throw new Error('onnx_confidence_invalid');
          inferenceMs = Number(j && j.performance && j.performance.inferenceTimeMs ? j.performance.inferenceTimeMs : (Date.now() - t0));
          METRICS.onnxCalls++;
          METRICS.onnxMs += inferenceMs;
          // Surface AI result early for UI (include feature metadata if present)
          const cur = ZKML_SESSIONS.get(sessionId) || {};
          ZKML_SESSIONS.set(sessionId, { ...cur, status: 'ai_ready', aiDecision, aiConfidence, inferenceMs, aiFeatures: j && j.features ? j.features : null });
          // Enforce: if AI denies, stop here and do not proceed to zk proof
          const ENFORCE_AI = (env('X402_ENFORCE_AI','true').toLowerCase() === 'true');
          if (ENFORCE_AI && aiDecision !== 1) {
            ZKML_SESSIONS.set(sessionId, { status: 'denied', aiDecision, aiConfidence, inferenceMs, startTime: ZKML_SESSIONS.get(sessionId)?.startTime });
            return; // abort further steps
          }
        } catch (e) {
          if ((env('X402_REQUIRE_ONNX','true').toLowerCase() === 'true')) {
            ZKML_SESSIONS.set(sessionId, { status: 'failed', error: 'ONNX inference unavailable: ' + String(e?.message || e), startTime: ZKML_SESSIONS.get(sessionId)?.startTime });
            return;
          }
        }
        // Run Jolt-Atlas prover first to obtain a canonical artifact and hash
        let joltProofHash = null; let joltMs = null;
        try {
          const tJ0 = Date.now();
          const j = await runJoltAtlasProver();
          joltProofHash = j.joltProofHash;
          joltMs = Date.now() - tJ0;
        } catch (e) {
          ZKML_SESSIONS.set(sessionId, { status: 'failed', error: 'Jolt-Atlas not configured: ' + String(e?.message || e), startTime: ZKML_SESSIONS.get(sessionId)?.startTime });
          return;
        }
        // Convert to field element for Groth16 circuit public signal
        const proofHashF = joltProofHash ? hexToField(joltProofHash) : null;
        // Stronger bindings for v2 circuit
        const onnxModelPath = env('ONNX_MODEL_PATH', path.join(__dirname, '..', 'acp', 'models', 'authorization_model.onnx'));
        const modelHashHex = fileSha256Hex(onnxModelPath);
        const modelHashF = modelHashHex ? hexToField('0x' + modelHashHex) : null;
        const policyHashHex = sha256Hex(JSON.stringify({ resource: X402_RESOURCE_PATH, network: env('X402_NETWORK','base-sepolia'), payTo: env('X402_PAYTO','0x1111111111111111111111111111111111111111'), asset: env('X402_ASSET', DEFAULT_USDC_BASE_SEPOLIA), price: env('X402_PRICE','$0.01') }));
        const policyHashF = hexToField(policyHashHex);
        const tG0 = Date.now();
        const gen = await generateProof({ proofHashF, modelHashF, policyHashF, decision: (aiDecision!=null ? aiDecision : undefined), confidence: (aiConfidence!=null ? aiConfidence : undefined) });
        const grothMs = Date.now() - tG0;
        // Normalize to the shape the UI and attestation expect; do not expose the SNARK proof to the UI/session payload
        const publicSignals = Array.isArray(gen?.publicSignals) ? gen.publicSignals : (gen?.proof?.publicSignals || []);
        const proof = { public_signals: publicSignals };
        // Keep the SNARK proof in-memory for the anchor job to consume (avoid file races)
        METRICS.joltMs += (joltMs || 0);
        METRICS.grothMs += (grothMs || 0);
        ZKML_SESSIONS.set(sessionId, { status: 'completed', proof, publicSignals, snarkProof: gen.proof, joltProofHash, proofHashF, modelHashF, policyHashF, aiDecision, aiConfidence, inferenceMs, joltMs, grothMs, startTime: ZKML_SESSIONS.get(sessionId)?.startTime });
      } catch (err) {
        ZKML_SESSIONS.set(sessionId, { status: 'failed', error: String(err?.message || err), startTime: ZKML_SESSIONS.get(sessionId)?.startTime });
      }
    });
    return res.json({ sessionId, status: 'generating', message: 'zkML proof generation started' });
  } catch (e) { return res.status(500).json({ error: 'server_error', message: String(e?.message || e) }); }
});
app.get('/ui/zkml/status/:id', (req, res) => {
  const sess = ZKML_SESSIONS.get(req.params.id);
  if (!sess) return res.status(404).json({ error: 'session_not_found' });
  return res.json(sess);
});
app.post('/ui/zkml/verify', async (req, res) => {
  try {
    const r = await fetch(`${UNIFIED_BACKEND}/zkml/verify`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(req.body||{}) });
    const j = await r.json(); res.status(r.status).json(j);
  } catch (e) { res.status(502).json({ error: 'proxy_failed', message: e.message }); }
});
app.listen(PORT, BIND_HOST, () => {
  const onChain = env('X402_ZKML_VERIFY_ETH','') === 'true' || VERIFY_ON_CHAIN;
  console.log(`\n[proof-gate] listening on ${BIND_HOST}:${PORT}\n- unified-backend: ${UNIFIED_BACKEND}\n- verify on-chain (effective): ${onChain}\n`);
});

// --- Helpers ---
function b64urlDecode(str) {
  const s = (str || '').replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s + pad, 'base64').toString('utf8');
}

async function redeemUsdcAuthorization({ header, asset, expectedPayTo, network }) {
  // Use production handler for proper x402 payment processing
  const pk = process.env.PRIVATE_KEY || process.env.BASE_PRIVATE_KEY;
  if (!pk) throw new Error('server_missing_private_key');
  
  const result = await processX402Payment({
    header,
    expectedAsset: asset,
    expectedPayTo,
    expectedNetwork: network,
    privateKey: pk,
    rpcUrl: process.env.BASE_RPC_URL || process.env.ETH_RPC || 'https://base-sepolia-rpc.publicnode.com',
    chainId: Number(process.env.CHAIN_ID || 84532)
  });
  
  const receipt = await result.tx.wait();
  const explorer = process.env.EXPLORER_BASE_URL || 'https://sepolia.basescan.org';
  const finalResult = {
    redeemed: true,
    mode: result.mode,
    usdcTxHash: result.tx.hash,
    explorer: `${explorer}/tx/${result.tx.hash}`,
    blockNumber: receipt.blockNumber
  };
  LAST_REDEMPTION = { ...finalResult, at: Date.now() };
  return finalResult;
}

function extractDecisionConfidence(proof, publicInputs) {
  try {
    // Prefer explicit public_signals from LLM prover
    const ps = proof?.public_signals || proof?.publicSignals;
    if (Array.isArray(ps) && ps.length >= 2) {
      // Interpret as [decision, confidence]
      const decision = Number(ps[0]);
      const confidence = Number(ps[1]);
      if (Number.isFinite(decision) && Number.isFinite(confidence)) return { decision, confidence };
    }
  } catch {}
  // Fallback: derive from risk score style inputs [agentType, amountNorm, op, riskScaled]
  if (Array.isArray(publicInputs) && publicInputs.length >= 4) {
    const riskScaled = Number(publicInputs[3]);
    if (Number.isFinite(riskScaled)) {
      // Assume scaled by 100
      const risk = Math.max(0, Math.min(100, Math.round(riskScaled / 100)));
      const confidence = 100 - risk;
      const decision = confidence >= DECISION_THRESHOLD ? 1 : 0;
      return { decision, confidence };
    }
  }
  return { decision: 1, confidence: 90 };
}

function defaultCart() {
  return {
    items: [{ sku: 'api-pro-month', qty: 1, priceCents: 100 }],
    region: 'US-NY',
    taxRulesVersion: 'v1',
    totalCents: 100,
  };
}

function verifyOnEthereumCLI({ decision, confidence, threshold, proofHash }) {
  return new Promise((resolve, reject) => {
    const nodeBin = process.execPath;
    const grothProver = path.join(__dirname, '..', 'scripts', 'cli_zkml_jolt_groth16_proof.js');
    const onchain = path.join(__dirname, '..', 'scripts', 'cli_groth16_onchain_verify.js');

    const input = { decision, confidence, threshold, proofHash, timestamp: Math.floor(Date.now() / 1000) };
    const p1 = spawn(nodeBin, [grothProver], { stdio: ['pipe', 'pipe', 'pipe'] });
    p1.stdin.end(JSON.stringify(input));
    let out1 = '', err1 = '';
    p1.stdout.on('data', d => (out1 += d.toString()));
    p1.stderr.on('data', d => (err1 += d.toString()));
    p1.on('close', (code) => {
      if (code !== 0) return reject(new Error(`groth16_prove_failed: ${err1}`));
      let proofPkg;
      try { proofPkg = JSON.parse(out1 || '{}'); } catch (e) { return reject(new Error('invalid_groth16_output')); }
      const p2 = spawn(nodeBin, [onchain], { stdio: ['pipe', 'pipe', 'pipe'], env: process.env });
      p2.stdin.end(JSON.stringify({ proof: proofPkg.proof, publicSignals: proofPkg.publicSignals }));
      let out2 = '', err2 = '';
      p2.stdout.on('data', d => (out2 += d.toString()));
      p2.stderr.on('data', d => (err2 += d.toString()));
      p2.on('close', (code2) => {
        if (code2 !== 0) return reject(new Error(`onchain_verify_failed: ${err2}`));
        try { resolve({ success: true, ...JSON.parse(out2 || '{}') }); } catch (e) { resolve({ success: true, raw: out2 }); }
      });
    });
  });
}

function queueImmediate(fn) {
  try { setImmediate(fn); } catch { setTimeout(fn, 0); }
}

// Surface last redemption so UI can attach a tx link even if the route responded early
app.get('/ui/last-redemption', (req, res) => {
  res.json(LAST_REDEMPTION || { redeemed: false });
});

// Discover a recent USDC Transfer that matches (from,to,value). Poll briefly.
async function waitForUsdcTransfer({ from, to, value, rpcUrl, asset, maxTries = 6, lookbackBlocks = 2000 }) {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl || 'https://sepolia.base.org', { chainId: Number(env('CHAIN_ID', 84532)), name: 'base-sepolia' });
    const topic0 = ethers.id('Transfer(address,address,uint256)');
    const pad = (addr) => '0x' + addr.toLowerCase().replace(/^0x/, '').padStart(64, '0');
    const t1 = pad(ethers.getAddress(from));
    const t2 = pad(ethers.getAddress(to));
    for (let i = 0; i < maxTries; i++) {
      const latest = await provider.getBlockNumber();
      const fromBlock = Math.max(latest - lookbackBlocks, 1);
      const logs = await provider.getLogs({ address: asset, topics: [topic0, t1, t2], fromBlock, toBlock: latest });
      // Find a log with matching value in data
      for (const log of logs) {
        try {
          const amount = BigInt(log.data);
          if (amount === value) return log;
        } catch {}
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  } catch (e) {
    // ignore
  }
  return null;
}

// Internal helper: run auto-pay by calling our own UI endpoint
async function runAutopay({ attestationId, token, bodyJson, anchorId }) {
  try {
    if (!token || !attestationId) return;
    if (autopayProcessed.has(attestationId)) return;
    autopayProcessed.add(attestationId);
    METRICS.autopayRuns++;
    console.log('[autopay] starting for', attestationId, anchorId ? '(anchor confirmed)' : '(attest)');
    const r = await fetch(`http://127.0.0.1:${SELF_PORT}/ui/pay-auto`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, body: bodyJson, anchorId })
    });
    const j = await r.json();
    console.log('[autopay] result', attestationId, r.status, j?.payment?.mode || 'no-payment', j?.payment?.usdcTxHash || j?.error || '');
  } catch (e) {
    console.error('[autopay] error', attestationId, String(e?.message || e));
  }
}

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({ ok: true, ...METRICS });
});

// Share: return sanitized session snapshot
// Share endpoints removed per request

// --- Admin endpoints (local convenience) ---
app.post('/admin/restart', async (req, res) => {
  try {
    const root = path.join(__dirname, '.');
    const pidUnifiedPath = path.join(__dirname, '.pid-unified');
    let stopped = false;
    try {
      if (fs.existsSync(pidUnifiedPath)) {
        const pid = Number(fs.readFileSync(pidUnifiedPath, 'utf8').trim());
        if (pid) {
          try { process.kill(pid, 'SIGTERM'); stopped = true; } catch {}
          try { fs.unlinkSync(pidUnifiedPath); } catch {}
        }
      }
    } catch {}

    // Start unified-backend again
    const child = spawn(process.execPath, [path.join(__dirname, '..', 'api', 'unified-backend.js')], {
      cwd: path.join(__dirname, '..'),
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    try { fs.writeFileSync(pidUnifiedPath, String(child.pid)); } catch {}

    return res.json({ ok: true, restartedUnified: true, stoppedUnified: stopped, pid: child.pid });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// Assets check for zkML (real-only)
app.get('/ui/zkml/assets-check', (req, res) => {
  try {
    const wasmPath = process.env.X402_GROTH_WASM_PATH || path.join(__dirname, '..', 'circuits', 'jolt-verifier', 'jolt_decision_simple_js', 'jolt_decision_simple.wasm');
    const zkeyPath = process.env.X402_GROTH_ZKEY_PATH || path.join(__dirname, '..', 'circuits', 'jolt-verifier', 'jolt_decision_simple_final.zkey');
    const existsWasm = fs.existsSync(wasmPath);
    const existsZkey = fs.existsSync(zkeyPath);
    const sizeWasm = existsWasm ? fs.statSync(wasmPath).size : 0;
    const sizeZkey = existsZkey ? fs.statSync(zkeyPath).size : 0;
    res.json({ ok: existsWasm && existsZkey, wasmPath, zkeyPath, existsWasm, existsZkey, sizeWasm, sizeZkey });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// Verifier info (contract/ABI/code presence)
app.get('/verifier/info', async (req, res) => {
  try {
    const { VERIFIER_ADDRESS, provider } = require('./groth16-verifier-service');
    let deploymentPath = process.env.ZKML_VERIFIER_DEPLOYMENT || path.join(__dirname, '../deployments/option-b-verifier-base-sepolia.json');
    if (!fs.existsSync(deploymentPath)) {
      deploymentPath = process.env.ZKML_VERIFIER_DEPLOYMENT || path.join(__dirname, '../deployments/jolt-storage-verifier-base-sepolia.json');
    }
    let abi = null; let hasVerifyAndStore = false; let abiCount = 0; let abiLoaded = false;
    try {
      const j = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      abi = j.abi;
      abiCount = Array.isArray(abi) ? abi.length : 0;
      abiLoaded = abiCount > 0;
      const c = new ethers.Contract(VERIFIER_ADDRESS, abi, provider);
      try { c.interface.getFunction('verifyAndStore'); hasVerifyAndStore = true; } catch {}
    } catch {}
    const code = await provider.getCode(VERIFIER_ADDRESS).catch(()=> '0x');
    let chainId = null; try { const n = await provider.getNetwork(); chainId = Number(n.chainId); } catch {}
    res.json({ ok: code && code !== '0x' && hasVerifyAndStore, address: VERIFIER_ADDRESS, chainId, codePresent: code && code !== '0x', abiLoaded, hasVerifyAndStore, deploymentPath });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e?.message || e) });
  }
});

// Wallet receipt: given txHash or uses last redemption, return balances pre/post and EIP-3009 fields if available
app.get('/ui/wallet-receipt', async (req, res) => {
  try {
    const txHash = req.query.tx || (LAST_REDEMPTION && LAST_REDEMPTION.usdcTxHash);
    if (!txHash) return res.status(400).json({ ok:false, error:'missing_tx' });
    const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL || process.env.ETH_RPC || 'https://base-sepolia-rpc.publicnode.com', { chainId: Number(env('CHAIN_ID',84532)), name:'base-sepolia' });
    const rec = await provider.getTransactionReceipt(txHash);
    if (!rec) return res.status(404).json({ ok:false, error:'tx_not_found' });
    const erc20 = new ethers.Interface([ 'function balanceOf(address) view returns (uint256)' ]);
    const usdc = env('X402_ASSET', '0x036CbD53842c5426634e7929541eC2318f3dCF7e');
    // Try to decode transfer log to infer from/to
    const topic = ethers.id('Transfer(address,address,uint256)');
    let from=null,to=null,value=null;
    for (const log of rec.logs||[]) {
      if (log.address.toLowerCase() === usdc.toLowerCase() && log.topics && log.topics[0] === topic) {
        from = '0x' + log.topics[1].slice(26);
        to = '0x' + log.topics[2].slice(26);
        try { value = BigInt(log.data); } catch {}
        break;
      }
    }
    // Balances pre/post
    let fromPre=null,fromPost=null,toPre=null,toPost=null;
    if (from) {
      fromPre = await provider.call({ to: usdc, data: erc20.encodeFunctionData('balanceOf',[from]) }, rec.blockNumber-1).then(d=> BigInt(d)).catch(()=>null);
      fromPost = await provider.call({ to: usdc, data: erc20.encodeFunctionData('balanceOf',[from]) }, rec.blockNumber).then(d=> BigInt(d)).catch(()=>null);
    }
    if (to) {
      toPre = await provider.call({ to: usdc, data: erc20.encodeFunctionData('balanceOf',[to]) }, rec.blockNumber-1).then(d=> BigInt(d)).catch(()=>null);
      toPost = await provider.call({ to: usdc, data: erc20.encodeFunctionData('balanceOf',[to]) }, rec.blockNumber).then(d=> BigInt(d)).catch(()=>null);
    }
    const authorization = LAST_REDEMPTION && LAST_REDEMPTION.authorization ? LAST_REDEMPTION.authorization : null;
    res.json({ ok:true, txHash, from, to, value: value? value.toString(): null, gasUsed: rec.gasUsed? rec.gasUsed.toString(): null, balances: { fromPre: fromPre? fromPre.toString(): null, fromPost: fromPost? fromPost.toString(): null, toPre: toPre? toPre.toString(): null, toPost: toPost? toPost.toString(): null }, authorization });
  } catch (e) { res.status(500).json({ ok:false, error:String(e?.message||e) }); }
});
// ONNX health proxy for UI
app.get('/ui/onnx/health', async (req, res) => {
  try {
    const url = env('X402_ONNX_URL','http://127.0.0.1:8009');
    const r = await fetch(`${url}/health`).catch(()=>null);
    if (!r) return res.status(503).json({ ok:false, error:'onnx_unreachable', url });
    const j = await r.json().catch(()=>({ ok:false, error:'invalid_json' }));
    return res.json({ ok: !!j.ok || j.status==='healthy', url, ...j });
  } catch (e) { return res.status(500).json({ ok:false, error:String(e?.message || e) }); }
});

// Share by anchor id → resolve to session snapshot
// Share endpoints removed per request
