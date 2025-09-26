const crypto = require('crypto');

// In-memory nonce store with TTL. For production, use Redis or another shared store.
const WINDOW_MS = parseInt(process.env.X402_REPLAY_WINDOW_MS || '300000', 10); // 5 minutes
const ALLOWED_SKEW_MS = parseInt(process.env.X402_ALLOWED_SKEW_MS || '30000', 10); // 30s

// Map: clientId -> Map(nonce -> expiresAt)
const store = new Map();

function now() { return Date.now(); }

function cleanup() {
  const t = now();
  for (const [clientId, nonces] of store.entries()) {
    for (const [nonce, exp] of nonces.entries()) {
      if (t > exp) nonces.delete(nonce);
    }
    if (nonces.size === 0) store.delete(clientId);
  }
}

setInterval(cleanup, 60000).unref();

function randomNonce() {
  return crypto.randomBytes(16).toString('hex');
}

// Validate and record a nonce for a client within the time window.
// Returns { ok: true } or { ok: false, error }
function validateNonce({ clientId, nonce, timestamp }) {
  if (!clientId || !nonce || !timestamp) {
    return { ok: false, error: 'missing_fields' };
  }
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return { ok: false, error: 'bad_timestamp' };

  const t = now();
  if (Math.abs(t - ts) > ALLOWED_SKEW_MS + WINDOW_MS) {
    return { ok: false, error: 'timestamp_out_of_window' };
  }

  const exp = ts + WINDOW_MS;
  let nonces = store.get(clientId);
  if (!nonces) { nonces = new Map(); store.set(clientId, nonces); }

  if (nonces.has(nonce)) {
    return { ok: false, error: 'replay_detected' };
  }
  nonces.set(nonce, exp);
  return { ok: true };
}

module.exports = {
  randomNonce,
  validateNonce,
};

