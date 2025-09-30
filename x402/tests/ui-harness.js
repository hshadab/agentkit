#!/usr/bin/env node

// UI harness: starts unified-backend + proof-gate; exercises /ui/zkml/* and basic attest + preflight

const { spawn } = require('child_process');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitPort(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { const r = await fetch(url); if (r.ok || r.status) return; } catch {}
    await sleep(200);
  }
  throw new Error('service_not_ready ' + url);
}

(async () => {
  let unified, gate;
  try {
    unified = spawn(process.execPath, ['../api/unified-backend.js'], { cwd: __dirname + '/..', stdio: ['ignore','pipe','pipe'] });
    gate = spawn(process.execPath, ['proof-gate-server.js'], { cwd: __dirname + '/..', stdio: ['ignore','pipe','pipe'] });
    await waitPort('http://127.0.0.1:8002/health');
    await waitPort('http://127.0.0.1:8610/health');

    // Step 1: prove
    const proveResp = await fetch('http://127.0.0.1:8610/ui/zkml/prove', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input: { amount: 100, merchant_risk: 12, agent_id: 42 } })
    });
    if (!proveResp.ok) throw new Error('prove_failed ' + proveResp.status);
    const prove = await proveResp.json();
    if (!prove.sessionId) throw new Error('no_session');

    // Step 2: status (accept generating or completed)
    const stResp = await fetch(`http://127.0.0.1:8610/ui/zkml/status/${prove.sessionId}`);
    if (stResp.ok) {
      const st = await stResp.json();
      if (st.status !== 'generating' && st.status !== 'completed') throw new Error('bad_status');
    } else {
      console.log('[ui-harness] status unavailable (non-200), continuing');
    }

    // Step 3: attest (use simple public_signals since UI may still be generating)
    const attRes = await fetch('http://127.0.0.1:8610/attest', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ agentId:'agent-demo-1', modelId:'risk_v1', proof:{ public_signals:['1','95','90'] }, intent:{ method:'POST', path:'/x402/pay', body:{ intent:'demo' } } })
    });
    const att = await attRes.json();
    if (!att.ok || !att.token) throw new Error('attest_failed');

    // Step 4: preflight 402
    const pf = await fetch('http://127.0.0.1:8610/x402/pay', { method:'POST', headers:{ 'content-type':'application/json', 'X-ZKML-Attestation': att.token }, body: JSON.stringify({ intent: 'demo' }) });
    if (pf.status !== 402) throw new Error('preflight_expected_402');
    const pfj = await pf.json(); if (!Array.isArray(pfj.accepts)) throw new Error('no_accepts');

    // Metrics available
    const m1 = await fetch('http://127.0.0.1:8610/metrics');
    if (!m1.ok) throw new Error('metrics_pg_failed');
    const m2 = await fetch('http://127.0.0.1:8002/metrics');
    if (!m2.ok) throw new Error('metrics_unified_failed');

    console.log('[ui-harness] PASS');
  } catch (e) {
    console.error('[ui-harness] FAIL', e.message || e);
    process.exitCode = 1;
  } finally {
    try { gate && gate.kill('SIGTERM'); } catch {}
    try { unified && unified.kill('SIGTERM'); } catch {}
  }
})();
