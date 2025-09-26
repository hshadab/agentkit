const crypto = require('crypto');
const { validateNonce } = require('./replay');

const SHARED_SECRET = process.env.X402_SHARED_SECRET || 'demo-x402-secret';
const ALLOWED_SKEW_MS = parseInt(process.env.X402_ALLOWED_SKEW_MS || '30000', 10); // 30s

function sha256Hex(s) { return crypto.createHash('sha256').update(s).digest('hex'); }

function canonicalize({ method, path, body, timestamp, nonce }) {
  const bodyStr = typeof body === 'string' ? body : JSON.stringify(body || {});
  const bodyHash = sha256Hex(bodyStr);
  return [
    (method || 'POST').toUpperCase(),
    path || '/x402/protected',
    bodyHash,
    String(timestamp),
    String(nonce),
  ].join('\n');
}

function sign({ method, path, body, timestamp, nonce, secret = SHARED_SECRET }) {
  const msg = canonicalize({ method, path, body, timestamp, nonce });
  return crypto.createHmac('sha256', secret).update(msg).digest('hex');
}

function buildClientHeaders({ clientId = 'demo-client', method, path, body }) {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  const signature = sign({ method, path, body, timestamp, nonce });
  return {
    'X-402-Client': clientId,
    'X-402-Timestamp': String(timestamp),
    'X-402-Nonce': nonce,
    'X-402-Signature': signature,
  };
}

function verifyServerRequest(req, secret = SHARED_SECRET) {
  const clientId = req.header('X-402-Client');
  const timestamp = req.header('X-402-Timestamp');
  const nonce = req.header('X-402-Nonce');
  const signature = req.header('X-402-Signature');
  if (!clientId || !timestamp || !nonce || !signature) {
    return { ok: false, error: 'missing_x402_headers' };
  }

  const skew = Math.abs(Date.now() - Number(timestamp));
  if (!Number.isFinite(Number(timestamp)) || skew > ALLOWED_SKEW_MS + 300000) {
    return { ok: false, error: 'timestamp_out_of_range' };
  }

  const path = req.path || '/x402/protected';
  const body = req.body || {};
  const method = req.method || 'POST';
  const msg = canonicalize({ method, path, body, timestamp, nonce });
  const expected = crypto.createHmac('sha256', secret).update(msg).digest('hex');
  const okSig = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!okSig) return { ok: false, error: 'bad_signature' };

  const replay = validateNonce({ clientId, nonce, timestamp });
  if (!replay.ok) return { ok: false, error: replay.error };

  return { ok: true, clientId };
}

module.exports = {
  buildClientHeaders,
  verifyServerRequest,
};

