const crypto = require('crypto');
const { ethers } = require('ethers');

const DEFAULT_SECRET = process.env.X402_ZKML_ATTEST_SECRET || 'dev-attest-secret';
const DEFAULT_TTL_MS = parseInt(process.env.X402_ZKML_ATTEST_TTL_MS || '300000', 10); // 5 minutes
const USE_EIP712 = process.env.X402_ATTEST_EIP712 ? (process.env.X402_ATTEST_EIP712 === 'true') : !!(process.env.X402_ATTEST_PRIVATE_KEY || process.env.GROTH16_PRIVATE_KEY || process.env.PRIVATE_KEY);
const EIP712_PRIVATE_KEY = process.env.X402_ATTEST_PRIVATE_KEY || process.env.GROTH16_PRIVATE_KEY || process.env.PRIVATE_KEY;
const EIP712_SIGNER = process.env.X402_ATTEST_SIGNER || (EIP712_PRIVATE_KEY ? new ethers.Wallet(EIP712_PRIVATE_KEY).address : undefined);
const EIP712_CHAIN_ID = Number(process.env.CHAIN_ID || process.env.ETH_CHAIN_ID || 84532);
const EIP712_DOMAIN = {
  name: process.env.X402_ATTEST_DOMAIN_NAME || 'AgentKit x402 Attestation',
  version: process.env.X402_ATTEST_DOMAIN_VERSION || '1',
  chainId: EIP712_CHAIN_ID,
  verifyingContract: process.env.X402_ATTEST_CONTRACT || '0x0000000000000000000000000000000000000000',
};
const EIP712_TYPES = {
  Attestation: [
    { name: 'agentId', type: 'string' },
    { name: 'clientId', type: 'string' },
    { name: 'merchantId', type: 'string' },
    { name: 'modelId', type: 'string' },
    { name: 'modelCheckpoint', type: 'string' },
    { name: 'proofHash', type: 'string' },
    { name: 'authorized', type: 'bool' },
    { name: 'decision', type: 'uint256' },
    { name: 'confidence', type: 'uint256' },
    { name: 'cartHash', type: 'string' },
    { name: 'totalCents', type: 'uint256' },
    { name: 'intentHash', type: 'string' },
    { name: 'acceptsHash', type: 'string' },
    { name: 'budgetRoot', type: 'string' },
    { name: 'spendNullifier', type: 'string' },
    { name: 'sessionId', type: 'string' },
    { name: 'onChain', type: 'bool' },
    { name: 'txHash', type: 'string' },
    { name: 'blockNumber', type: 'uint256' },
    { name: 'contractAddress', type: 'string' },
    { name: 'issuedAt', type: 'uint256' },
    { name: 'expiresAt', type: 'uint256' },
  ],
};

function nowMs() {
  return Date.now();
}

function hmac(data, secret = DEFAULT_SECRET) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

// payload: { agentId, modelId, proofHash, issuedAt, expiresAt }
async function signAttestation(payload, secret = DEFAULT_SECRET) {
  if (USE_EIP712 && EIP712_PRIVATE_KEY) {
    const wallet = new ethers.Wallet(EIP712_PRIVATE_KEY);
    const sig = await wallet.signTypedData(EIP712_DOMAIN, EIP712_TYPES, payload);
    return Buffer.from(JSON.stringify({ scheme: 'eip712', body: JSON.stringify(payload), sig, attester: wallet.address }), 'utf8').toString('base64url');
  } else {
    const body = JSON.stringify(payload);
    const sig = hmac(body, secret);
    return Buffer.from(JSON.stringify({ scheme: 'hmac', body, sig }), 'utf8').toString('base64url');
  }
}

function verifyAttestation(token, secret = DEFAULT_SECRET) {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    const { scheme = 'hmac', body, sig, attester } = decoded;
    const payload = JSON.parse(body);
    if (scheme === 'eip712') {
      // Verify typed data signature
      const signer = ethers.verifyTypedData(EIP712_DOMAIN, EIP712_TYPES, payload, sig);
      if (EIP712_SIGNER && signer.toLowerCase() !== EIP712_SIGNER.toLowerCase()) {
        return { ok: false, error: 'bad_attester' };
      }
    } else {
      const calc = hmac(body, secret);
      if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(calc))) {
        return { ok: false, error: 'bad_signature' };
      }
    }
    if (payload.expiresAt && nowMs() > payload.expiresAt) {
      return { ok: false, error: 'expired' };
    }
    return { ok: true, payload, scheme, attester: attester || EIP712_SIGNER };
  } catch (e) {
    return { ok: false, error: 'malformed' };
  }
}

async function issueAttestation(data) {
  const { ttlMs = DEFAULT_TTL_MS, ...rest } = data || {};
  const issuedAt = nowMs();
  const expiresAt = issuedAt + ttlMs;
  const token = await signAttestation({ ...rest, issuedAt, expiresAt });
  return { token, issuedAt, expiresAt };
}

module.exports = {
  issueAttestation,
  verifyAttestation,
};
