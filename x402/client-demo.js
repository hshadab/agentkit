#!/usr/bin/env node

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const UNIFIED_BACKEND = process.env.UNIFIED_BACKEND || 'http://127.0.0.1:8002';
const PROOF_GATE = process.env.PROOF_GATE || 'http://127.0.0.1:8602';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  console.log('== zkML → attestation → x402 demo ==');

  // 1) Trigger zkML proof
  console.log('1) requesting zkML proof...');
  const proveResp = await fetch(`${UNIFIED_BACKEND}/zkml/prove`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      agentId: 'agent-demo-1',
      agentType: 'financial',
      amount: 0.05,
      operation: 'gateway-transfer',
      riskScore: 0.12,
    }),
  });
  const proveJson = await proveResp.json();
  if (!proveResp.ok) throw new Error('zkml prove failed: ' + JSON.stringify(proveJson));
  const { sessionId } = proveJson;
  console.log('   session:', sessionId);

  // 2) Poll status
  console.log('2) waiting for zkML proof completion...');
  let proof;
  for (let i = 0; i < 60; i++) {
    const st = await (await fetch(`${UNIFIED_BACKEND}/zkml/status/${sessionId}`)).json();
    if (st.status === 'completed') { proof = st.proof; break; }
    if (st.status === 'failed') throw new Error('zkml proof failed');
    process.stdout.write('.');
    await sleep(500);
  }
  if (!proof) {
    console.log('\n   zkML proof not available; falling back to demo proof');
    proof = {
      model: 'risk_analysis_v1',
      framework: 'JOLT-Atlas',
      proofData: { proof: [123, 456, 789], publicInputs: [3, 5, 1, 12] },
    };
  } else {
    console.log('\n   zkML proof ready');
  }

  // 3) Request attestation from proof‑gate with commerce bindings
  console.log('3) requesting attestation (with commerce bindings)...');
  const cart = {
    items: [{ sku: 'api-pro-month', qty: 1, priceCents: 100 }],
    region: 'US-NY',
    taxRulesVersion: 'v1',
    totalCents: 100,
  };
  const intent = { method: 'POST', path: '/x402/pay', body: { intent: 'demo', cart: { items: cart.items.map(i => ({ sku: i.sku, qty: i.qty })) } } };
  const attnResp = await fetch(`${PROOF_GATE}/attest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      agentId: 'agent-demo-1',
      clientId: 'demo-client',
      merchantId: 'acme-merchant',
      cart,
      intent,
      modelId: 'risk_analysis_v1',
      proof,
      publicInputs: proof?.proofData?.publicInputs || [3, 5, 1, 12],
      extra: { sessionId },
    }),
  });
  const attnJson = await attnResp.json();
  if (!attnResp.ok || !attnJson.ok) throw new Error('attestation failed: ' + JSON.stringify(attnJson));
  const { token } = attnJson;
  console.log('   attestation issued');

  // 4a) Try real x402 flow if library is available and DEMO_USE_X402=true
  if (process.env.DEMO_USE_X402 === 'true') {
    try {
      console.log('4a) attempting real x402 payment flow...');
      // First request to get Accepts via 402
      const preResp = await fetch(`${PROOF_GATE}/x402/pay`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'X-ZKML-Attestation': token },
        body: JSON.stringify(intent.body),
      });
      const preJson = await preResp.json();
      if (preResp.status !== 402 || !preJson.accepts) {
        console.log('   did not receive Accepts; server may have accepted without payment or x402 not mounted');
      } else {
        const accepts = preJson.accepts;
        // Dynamically import x402 client and viem account utils
        const x402client = await import('x402/client');
        const { privateKeyToAccount } = await import('viem/accounts');
        const account = privateKeyToAccount(process.env.PRIVATE_KEY || '0x59c6995e998f97a5a004497e5daafc3f39c3b2f0b68cf73f9d4efb8f6db2f6c1');
        const { selectPaymentRequirements, createPaymentHeader } = x402client;
        const selected = selectPaymentRequirements(accepts, 'base-sepolia', 'exact');
        const header = await createPaymentHeader(account, 1, selected);

        const paidResp = await fetch(`${PROOF_GATE}/x402/pay`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'X-ZKML-Attestation': token, 'X-PAYMENT': header },
          body: JSON.stringify(intent.body),
        });
        const paidJson = await paidResp.json();
        if (!paidResp.ok) throw new Error('x402 library path rejected: ' + JSON.stringify(paidJson));
        console.log('   success (x402 + zkML):', paidJson.message);
        console.log('   attested:', paidJson.attested);
        console.log('\nDONE');
        return;
      }
    } catch (e) {
      console.log('   real x402 not available or failed:', e.message);
      console.log('   falling back to HMAC demo path (/x402/protected)');
    }
  }

  // 4b) Fallback HMAC-based path
  console.log('4b) calling demo /x402/protected endpoint...');
  // Build x402 fallback headers
  const { buildClientHeaders } = require('./x402-fallback');
  const x402Headers = buildClientHeaders({
    clientId: 'demo-client',
    method: 'POST',
    path: '/x402/protected',
    body: { task: 'transfer', amount: '0.05 USDC' },
  });

  const x402Resp = await fetch(`${PROOF_GATE}/x402/protected`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-ZKML-Attestation': token,
      ...x402Headers,
    },
    body: JSON.stringify({ task: 'transfer', amount: '0.05 USDC' }),
  });
  const x402Json = await x402Resp.json();
  if (!x402Resp.ok) throw new Error('x402 protected call rejected: ' + JSON.stringify(x402Json));
  console.log('   success (fallback):', x402Json.message);
  console.log('   attested:', x402Json.attested);

  console.log('\nDONE');
}

run().catch((e) => {
  console.error('demo error:', e.message);
  process.exit(1);
});
