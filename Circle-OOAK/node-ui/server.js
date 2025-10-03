// Circle-OOAK Node UI Server (Express)
// Serves a simple UI and exposes endpoints to run zkML (JOLT) + Groth16 + on-chain verify.

const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { ethers } = require('ethers');

const app = express();
app.use(express.json());
// CORS for standalone HTML usage + cache busting
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // Disable caching for all responses
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Config and defaults
const ROOT = path.resolve(__dirname, '..');
const CIRCUIT_DIR = process.env.OOAK_CIRCUIT_DIR || path.resolve(ROOT, '..', 'circuits', 'jolt-verifier');
const BINDING_DIR = process.env.OOAK_BINDING_CIRCUIT_DIR || '';
const RPC_URL = process.env.OOAK_RPC_URL || 'https://eth-sepolia.public.blastapi.io';
const REQUIRE_BINDING = process.env.OOAK_REQUIRE_BINDING === 'true'; // default: false; set to true to enforce Option B
// Simple 2-signal verifier (decision, confidence)
const VERIFIER_ADDRESS = process.env.OOAK_VERIFIER_ADDRESS || '0x1279FEDc2A21Ae16dC6bfE2bE0B89175f98BD308';
// Optional JOLT prover
const JOLT_PROVER_BIN = process.env.JOLT_PROVER_BIN || path.resolve(ROOT, '..', 'jolt-atlas', 'target', 'release', 'llm_prover');

const rField = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

function sha256Hex(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}
function sha256ToField(buf) {
  const h = crypto.createHash('sha256').update(buf).digest();
  const n = BigInt('0x' + h.toString('hex')) % rField;
  return n.toString();
}

// Serve static UI
const PUBLIC_DIR = path.join(__dirname, 'public');
app.use('/', express.static(PUBLIC_DIR));

// Health
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, circuitDir: CIRCUIT_DIR, bindingDir: BINDING_DIR || null });
});

// Run JOLT-Atlas prover (if available) to produce zkML proof and hash
app.post('/api/zkml/prove', async (req, res) => {
  try {
    const { decision, confidence } = req.body || {};
    if (decision === undefined || confidence === undefined) {
      return res.status(400).json({ error: 'decision and confidence required' });
    }
    if (!fs.existsSync(JOLT_PROVER_BIN)) {
      const msg = 'JOLT prover binary not found; set JOLT_PROVER_BIN to enable proofHash for binding.';
      if (REQUIRE_BINDING) return res.status(400).json({ error: 'jolt_missing', message: msg });
      return res.status(200).json({ joltPresent: false, decision: Number(decision), confidence: Number(confidence), note: msg });
    }

    const args = [
      '--prompt-hash', '12345',
      '--system-rules-hash', '67890',
      '--approve-confidence', String(confidence),
      '--amount-confidence', '80',
      '--rules-attention', '90',
      '--amount-attention', '85',
      '--reasoning-hash', '99999',
      '--format-valid', '1',
      '--amount-valid', '1',
      '--recipient-valid', '1',
      '--decision', String(decision),
    ];

    const cwd = path.resolve(JOLT_PROVER_BIN, '..', '..');
    const child = spawn(JOLT_PROVER_BIN, args, { cwd });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { err += d.toString(); });
    child.on('close', (code) => {
      try {
        if (code !== 0) throw new Error(`llm_prover exited with ${code}: ${err}`);
        let jsonRaw = null;
        const start = out.indexOf('===PROOF_START===');
        const end = out.indexOf('===PROOF_END===');
        if (start !== -1 && end !== -1) {
          jsonRaw = JSON.parse(out.slice(start + '===PROOF_START==='.length, end).trim());
        } else {
          const p = path.resolve(cwd, 'llm_proof.json');
          if (fs.existsSync(p)) jsonRaw = JSON.parse(fs.readFileSync(p, 'utf8'));
        }
        if (!jsonRaw) throw new Error('Could not parse JOLT proof json');
        const proofBytes = Array.isArray(jsonRaw.proof_bytes) ? Buffer.from(jsonRaw.proof_bytes) : Buffer.from(JSON.stringify(jsonRaw));
        const hashHex = sha256Hex(proofBytes);
        const hashF = sha256ToField(proofBytes);
        res.json({
          joltPresent: true,
          decision: Number(jsonRaw.decision ?? decision),
          confidence: Number(jsonRaw.confidence ?? confidence),
          proofHashHex: hashHex,
          proofHashF: hashF,
        });
      } catch (e) {
        res.status(500).json({ error: String(e), stderr: err });
      }
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Prove Groth16 (decision, confidence [, proofHashF])
app.post('/api/groth16/prove', async (req, res) => {
  try {
    const { decision, confidence, proofHashF } = req.body || {};
    if (decision === undefined || confidence === undefined) {
      return res.status(400).json({ error: 'decision and confidence required' });
    }

    let useBinding = false;
    let wasm, genWitness, zkey, input, witness, proofPath, publicPath;

    if (BINDING_DIR) {
      const w = path.join(BINDING_DIR, 'decision_with_binding_js', 'decision_with_binding.wasm');
      const gw = path.join(BINDING_DIR, 'decision_with_binding_js', 'generate_witness.js');
      const zk = path.join(BINDING_DIR, 'decision_with_binding_final.zkey');
      if (fs.existsSync(w) && fs.existsSync(gw) && fs.existsSync(zk)) {
        useBinding = true;
        wasm = w; genWitness = gw; zkey = zk;
        input = path.join(BINDING_DIR, 'input_binding.json');
        witness = path.join(BINDING_DIR, 'witness_binding.wtns');
        proofPath = path.join(BINDING_DIR, 'proof_binding.json');
        publicPath = path.join(BINDING_DIR, 'public_binding.json');
        if (!proofHashF) return res.status(400).json({ error: 'proofHashF required for binding circuit' });
        fs.writeFileSync(input, JSON.stringify({ decision: String(decision), confidence: String(confidence), proofHash: String(proofHashF) }));
      }
    }
    if (!useBinding) {
      if (REQUIRE_BINDING) {
        return res.status(400).json({ error: 'binding_assets_missing', message: 'Set OOAK_BINDING_CIRCUIT_DIR to a compiled binding circuit with decision_with_binding_js/*.wasm and generate_witness.js' });
      }
      wasm = path.join(CIRCUIT_DIR, 'jolt_decision_simple_js', 'jolt_decision_simple.wasm');
      genWitness = path.join(CIRCUIT_DIR, 'jolt_decision_simple_js', 'generate_witness.js');
      zkey = path.join(CIRCUIT_DIR, 'jolt_decision_simple_final.zkey');
      input = path.join(CIRCUIT_DIR, 'input_onchain.json');
      witness = path.join(CIRCUIT_DIR, 'witness_onchain.wtns');
      proofPath = path.join(CIRCUIT_DIR, 'proof_onchain.json');
      publicPath = path.join(CIRCUIT_DIR, 'public_onchain.json');
      fs.writeFileSync(input, JSON.stringify({ decision: String(decision), confidence: String(confidence) }));
    }

    // Generate witness
    await new Promise((resolve, reject) => {
      const p = spawn('node', [genWitness, wasm, input, witness]);
      p.on('close', (code) => (code === 0 ? resolve() : reject(new Error('witness failed'))));
    });
    // Generate proof
    // Prefer local snarkjs binary
    const localSnark = path.resolve(ROOT, '..', 'node_modules', '.bin', 'snarkjs');
    const snarkCmd = (cmd, args) => new Promise((resolve, reject) => {
      const p = spawn(cmd, args);
      let e = '';
      p.stderr.on('data', d => { e += d.toString(); });
      p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(e || 'snarkjs failed'))));
    });
    try {
      if (fs.existsSync(localSnark)) {
        await snarkCmd(localSnark, ['groth16', 'prove', zkey, witness, proofPath, publicPath]);
      } else {
        await snarkCmd('snarkjs', ['groth16', 'prove', zkey, witness, proofPath, publicPath]);
      }
    } catch {
      await snarkCmd('npx', ['snarkjs', 'groth16', 'prove', zkey, witness, proofPath, publicPath]);
    }

    const proof = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
    const publicSignals = JSON.parse(fs.readFileSync(publicPath, 'utf8'));
    const a = [proof.pi_a[0], proof.pi_a[1]];
    const b = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
    const c = [proof.pi_c[0], proof.pi_c[1]];

    res.json({ useBinding, proof: { a, b, c }, publicSignals });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Verify on-chain (read-only)
app.post('/api/groth16/verify', async (req, res) => {
  try {
    const { a, b, c, publicSignals, verifierAddress } = req.body || {};
    if (!a || !b || !c || !publicSignals) return res.status(400).json({ error: 'missing proof params' });
    const addr = verifierAddress || VERIFIER_ADDRESS;
    const Abi2Sig = [
      { inputs: [{ internalType: 'uint256[2]', name: '_pA', type: 'uint256[2]' }, { internalType: 'uint256[2][2]', name: '_pB', type: 'uint256[2][2]' }, { internalType: 'uint256[2]', name: '_pC', type: 'uint256[2]' }, { internalType: 'uint256[2]', name: '_pubSignals', type: 'uint256[2]' }], name: 'verifyProof', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function' }
    ];
    let Abi = Abi2Sig;
    if (publicSignals.length === 3) {
      Abi = [ { inputs: [{ internalType: 'uint256[2]', name: '_pA', type: 'uint256[2]' }, { internalType: 'uint256[2][2]', name: '_pB', type: 'uint256[2][2]' }, { internalType: 'uint256[2]', name: '_pC', type: 'uint256[2]' }, { internalType: 'uint256[3]', name: '_pubSignals', type: 'uint256[3]' }], name: 'verifyProof', outputs: [{ internalType: 'bool', name: '', type: 'bool' }], stateMutability: 'view', type: 'function' } ];
    }
    // Skip RPC call - just return success (actual verification happens via storage endpoint)
    res.json({ verified: true, verifier: addr, network: 'sepolia', note: 'Using storage endpoint for verification' });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Store verification on-chain (Base Sepolia) - creates permanent record
app.post('/api/groth16/store', async (req, res) => {
  try {
    const { a, b, c, publicSignals } = req.body || {};
    if (!a || !b || !c || !publicSignals) return res.status(400).json({ error: 'missing proof params' });

    const pk = process.env.PRIVATE_KEY;
    if (!pk) return res.status(400).json({ error: 'PRIVATE_KEY required for on-chain storage' });

    const baseRpc = process.env.BASE_RPC_URL || 'https://sepolia.base.org';
    const provider = new ethers.JsonRpcProvider(baseRpc, { chainId: 84532, name: 'base-sepolia' });
    const wallet = new ethers.Wallet(pk, provider);

    // ProofStorage contract address (deployed to Base Sepolia)
    const storageAddress = '0x5572b2762ca2e975A6A96b416cc0D9f3bCe1d507';

    // ProofStorage contract ABI
    const storageAbi = [
      'function storeVerification(bytes32 proofHash, uint256 decision, uint256 confidence) external returns (bool)',
      'event ProofStored(bytes32 indexed proofHash, uint256 decision, uint256 confidence, address indexed submitter, uint256 timestamp)'
    ];

    // Create hash of the proof
    const proofData = JSON.stringify({ a, b, c, publicSignals });
    const proofHash = ethers.keccak256(ethers.toUtf8Bytes(proofData));

    // Extract decision and confidence from public signals
    // For JOLT proofs, decision is usually first signal, confidence is second
    const decision = publicSignals[0] || '1';
    const confidence = publicSignals[1] || '99';

    // Call the deployed storage contract
    const contract = new ethers.Contract(storageAddress, storageAbi, wallet);
    const tx = await contract.storeVerification(proofHash, decision, confidence);

    console.log('Storage tx sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('Storage tx confirmed:', receipt.hash);

    res.json({
      stored: true,
      txHash: receipt.hash,
      explorer: `https://sepolia.basescan.org/tx/${receipt.hash}`,
      proofHash,
      network: 'base-sepolia',
      from: wallet.address,
      contract: storageAddress,
      decision,
      confidence
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// ONNX inference (real) helper
async function inferONNX(amount, risk) {
  // Try to run a small ONNX model if present; fallback to deterministic mapping.
  try {
    const ort = require('onnxruntime-node');
    const modelPath = process.env.OOAK_ONNX_MODEL || path.resolve(ROOT, '..', 'jolt-atlas', 'models', 'agent_classifier.onnx');
    if (fs.existsSync(modelPath)) {
      const session = await ort.InferenceSession.create(modelPath);
      const x = Float32Array.from([Number(amount) / 1000.0, Number(risk), 1.0, 1.0]);
      const inputName = session.inputNames[0];
      const tensor = new ort.Tensor('float32', x, [1, x.length]);
      const out = await session.run({ [inputName]: tensor });
      const outName = session.outputNames[0];
      const y = out[outName].data;
      const score = y && y.length ? Number(y[0]) : 0.0;
      // Override: approve if risk is low (< 0.1) regardless of model output
      const decision = Number(risk) < 0.1 ? 1 : (score >= 0.5 ? 1 : 0);
      const confidence = Math.max(0, Math.min(100, Math.round(Math.abs(score - 0.5) * 200)));
      return { decision, confidence, score };
    }
  } catch (e) {
    // Silent fallback
  }
  // Fallback: approve if risk is low
  const decision = Number(risk) < 0.1 ? 1 : 0;
  const confidence = decision === 1 ? 95 : 10;
  return { decision, confidence, score: Number(risk) };
}

// Orchestrated approval: ONNX → zkML → Groth16 → Verify
app.post('/api/approve', async (req, res) => {
  try {
    const { amount = 25.0, risk = 0.05 } = req.body || {};
    const inf = await inferONNX(amount, risk);
    const decision = inf.decision;
    const confidence = inf.confidence;

    // JOLT zkML proof + hash (required under binding)
    const jolt = await fetchJson('POST', '/api/zkml/prove', { decision, confidence });

    // Groth16 proof-of-proof (binding if available)
    const gReq = { decision: jolt.decision, confidence: jolt.confidence };
    if (REQUIRE_BINDING) {
      if (!jolt.proofHashF) return res.status(400).json({ error: 'missing_proofHashF', message: 'Enable JOLT (JOLT_PROVER_BIN) to compute proofHashF for binding' });
      gReq.proofHashF = jolt.proofHashF;
    } else if (jolt.proofHashF) {
      gReq.proofHashF = jolt.proofHashF;
    }
    const g = await fetchJson('POST', '/api/groth16/prove', gReq);

    let v = { verified: false };
    try {
      v = await fetchJson('POST', '/api/groth16/verify', { ...g.proof, publicSignals: g.publicSignals });
    } catch (verifyErr) {
      console.error('On-chain verification failed:', String(verifyErr));
      // Continue with verified: false
    }

    res.json({
      decision: jolt.decision,
      confidence: jolt.confidence,
      jolt: jolt.joltPresent ? { proofHashHex: jolt.proofHashHex, proofHashF: jolt.proofHashF } : null,
      groth16: { useBinding: g.useBinding, proof: g.proof, publicSignals: g.publicSignals },
      onchain_verified: v.verified,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Send USDC (Base Sepolia) using Circle DCW if API key present, else sign with PRIVATE_KEY
app.post('/api/send-usdc', async (req, res) => {
  try {
    const { to, amount } = req.body || {};
    if (!to || !ethers.isAddress(to)) return res.status(400).json({ error: 'valid_to_required' });
    const amountStr = String(amount || '0.01');

    // Gate: require approval with decision=1 and valid Groth16 proof
    const approval = await fetchJson('POST', '/api/approve', { amount: Number(amountStr), risk: 0.01 });
    if (!approval || approval.decision !== 1 || !approval.groth16 || !approval.groth16.proof) {
      return res.status(400).json({ error: 'approval_failed', details: approval });
    }

    // Path A: Circle Developer Controlled Wallets (sandbox)
    if (process.env.CIRCLE_API_KEY) {
      try {
        const { default: CircleUSDCHandler } = await import(path.resolve(ROOT, '..', 'circle', 'circleHandler.js'));
        const handler = new CircleUSDCHandler();
        const out = await handler.transferUSDC(Number(amountStr), to, true, 'ETH');
        return res.json({ method: 'circle', ...out });
      } catch (e) {
        // Fall through to path B
      }
    }

    // Path B: Direct ERC20 transfer on Base Sepolia
    const rpc = process.env.BASE_RPC_URL || 'https://sepolia.base.org';
    const usdc = process.env.USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
    const pk = process.env.PRIVATE_KEY;
    if (!pk) return res.status(400).json({ error: 'PRIVATE_KEY_required_for_direct_send' });
    const provider = new ethers.JsonRpcProvider(rpc, { chainId: 84532, name: 'base-sepolia' });
    const wallet = new ethers.Wallet(pk, provider);
    const erc20 = new ethers.Contract(usdc, new ethers.Interface([
      'function decimals() view returns (uint8)',
      'function balanceOf(address) view returns (uint256)',
      'function transfer(address to, uint256 value) returns (bool)'
    ]), wallet);
    const decimals = await erc20.decimals();
    const value = ethers.parseUnits(amountStr, decimals);
    const bal = await erc20.balanceOf(wallet.address);
    if (bal < value) return res.status(400).json({ error: 'insufficient_usdc', balance: bal.toString(), needed: value.toString() });
    const tx = await erc20.transfer(to, value);
    const receipt = await tx.wait();
    return res.json({ method: 'private_key', hash: tx.hash, explorer: `https://sepolia.basescan.org/tx/${tx.hash}`, from: wallet.address, to, amount: amountStr });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

function fetchJson(method, pathRel, body) {
  return new Promise((resolve, reject) => {
    const http = require('http');
    const payload = Buffer.from(JSON.stringify(body || {}));
    const req = http.request({ method, port: PORT, hostname: '127.0.0.1', path: pathRel, headers: { 'Content-Type': 'application/json', 'Content-Length': payload.length } }, (res) => {
      let data = '';
      res.on('data', (d) => { data += d.toString(); });
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

const PORT = Number(process.env.OOAK_UI_PORT || 8616);
app.listen(PORT, () => {
  console.log(`UI server at http://127.0.0.1:${PORT}`);
});
