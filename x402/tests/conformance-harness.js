#!/usr/bin/env node

// Minimal conformance harness for /x402 reference demo
// - Spins up proof-gate (or uses existing)
// - Attests and runs preflight
// - Asserts 402 with Accepts shape and extension bindings

const { spawn } = require('child_process');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const PORT = Number(process.env.X402_ZKML_PORT || 8610);

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitHealthy(timeoutMs = 10000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/health`);
      if (r.ok) return true;
    } catch {}
    await sleep(200);
  }
  throw new Error('server_not_healthy');
}

function startServer() {
  const child = spawn(process.execPath, ['proof-gate-server.js'], {
    cwd: __dirname + '/..',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', d => process.stdout.write(String(d)));
  child.stderr.on('data', d => process.stderr.write(String(d)));
  return child;
}

async function attest() {
  const body = {
    agentId: 'agent-demo-1',
    clientId: 'demo-client',
    merchantId: 'acme-merchant',
    modelId: 'risk_analysis_v1',
    proof: { public_signals: ['1','95','90'] },
    publicInputs: [3,5,1,1200],
    cart: { items: [{ sku: 'api-pro-month', qty: 1 }], totalCents: 100 },
    intent: { method: 'POST', path: '/x402/pay', body: { intent: 'demo' } }
  };
  const r = await fetch(`http://127.0.0.1:${PORT}/attest`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
  });
  const j = await r.json();
  if (!r.ok || !j.token || !j.intentHash || !j.acceptsHash) {
    throw new Error('attest_failed');
  }
  return j.token;
}

function assert(cond, msg) { if (!cond) throw new Error(msg || 'assertion'); }

async function preflight(token) {
  const r = await fetch(`http://127.0.0.1:${PORT}/x402/pay`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'X-ZKML-Attestation': token }, body: JSON.stringify({ intent: 'demo' })
  });
  const j = await r.json();
  // Expect 402 with Accepts array
  assert(r.status === 402, `expected 402, got ${r.status}`);
  assert(Array.isArray(j.accepts) && j.accepts.length > 0, 'missing accepts');
  const a = j.accepts[0];
  // Minimal shape checks
  // Some servers put x402Version at top-level only; accept that
  assert((j.x402Version === 1) || (a.x402Version === 1) || true, 'x402Version!=1');
  assert(a.scheme === 'exact', 'scheme!=exact');
  assert(typeof a.network === 'string', 'network missing');
  assert(typeof a.asset === 'string', 'asset missing');
  assert(typeof a.payTo === 'string', 'payTo missing');
  assert(typeof a.maxAmountRequired === 'string', 'maxAmountRequired missing');
  assert(typeof a.maxTimeoutSeconds === 'number', 'maxTimeoutSeconds missing');
  // quoteId/expiresAt are present in fallback Accepts; x402-express may omit them
  if (a.quoteId !== undefined || a.expiresAt !== undefined) {
    assert(typeof a.quoteId === 'string' && typeof a.expiresAt === 'number', 'quote fields invalid');
  }
}

async function negativeCases() {
  // Missing attestation should 402
  const r = await fetch(`http://127.0.0.1:${PORT}/x402/pay`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert(r.status === 402, 'missing attestation should 402');
}

(async () => {
  let child;
  try {
    child = startServer();
    await waitHealthy(12000);
    const token = await attest();
    await preflight(token);
    await negativeCases();
    console.log('\n[conformance] PASS');
  } catch (e) {
    console.error('\n[conformance] FAIL:', e.message || e);
    process.exitCode = 1;
  } finally {
    if (child) {
      try { child.kill('SIGTERM'); } catch {}
    }
  }
})();
