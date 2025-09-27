# x402 Implementation Guide for Developers

## Overview
This guide provides step-by-step instructions for developers implementing the x402 payment protocol with zkML attestation in their own applications.

## Table of Contents
1. [Understanding the Architecture](#understanding-the-architecture)
2. [Setting Up Your Environment](#setting-up-your-environment)
3. [Implementing the Server](#implementing-the-server)
4. [Implementing the Client](#implementing-the-client)
5. [Testing Your Implementation](#testing-your-implementation)
6. [Production Considerations](#production-considerations)

## Understanding the Architecture

### Core Concepts

#### 1. x402 Protocol
The x402 protocol enables micropayments for HTTP resources using a standard flow:
- Client requests resource → Server returns 402 Payment Required
- Server provides payment requirements in response
- Client creates payment authorization
- Server verifies and executes payment

#### 2. EIP-3009 transferWithAuthorization
Instead of traditional allowance/transfer:
- Client signs an off-chain authorization
- Server executes the transfer on-chain
- Client doesn't pay gas (gasless for users)

#### 3. zkML Attestation
Adds cryptographic proof of AI agent behavior:
- Agent generates zkML proof of correct inference
- Server issues attestation binding proof to payment intent
- Payment only proceeds with valid attestation

### Flow Diagram
```
┌─────────┐      ┌──────────┐      ┌────────────┐      ┌──────────┐
│ Client  │      │  zkML    │      │ Proof-Gate │      │   USDC   │
│(Browser)│      │ Backend  │      │   Server   │      │ Contract │
└────┬────┘      └────┬─────┘      └─────┬──────┘      └────┬─────┘
     │                 │                  │                   │
     │ 1. Generate Proof                  │                   │
     ├────────────────>│                  │                   │
     │<────────────────│                  │                   │
     │  sessionId      │                  │                   │
     │                 │                  │                   │
     │ 2. Poll Status  │                  │                   │
     ├────────────────>│                  │                   │
     │<────────────────│                  │                   │
     │   proof         │                  │                   │
     │                 │                  │                   │
     │ 3. Request Attestation             │                   │
     ├───────────────────────────────────>│                   │
     │<────────────────────────────────────│                   │
     │         token                      │                   │
     │                                    │                   │
     │ 4. x402 Preflight (with token)     │                   │
     ├───────────────────────────────────>│                   │
     │<────────────────────────────────────│                   │
     │    402 + Accepts                   │                   │
     │                                    │                   │
     │ 5. Sign Authorization              │                   │
     │   (MetaMask EIP-712)               │                   │
     │                                    │                   │
     │ 6. Send Payment Header             │                   │
     ├───────────────────────────────────>│                   │
     │                                    │                   │
     │                                    │ 7. Execute Transfer│
     │                                    ├──────────────────>│
     │                                    │<───────────────────│
     │                                    │    tx hash        │
     │<────────────────────────────────────│                   │
     │    200 OK + tx hash                │                   │
```

## Setting Up Your Environment

### Prerequisites

#### 1. Node.js Dependencies
```bash
npm install x402 x402-express viem ethers express cors dotenv
```

#### 2. Rust (for zkML binary)
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Build zkML prover
cd jolt-atlas
cargo build --release --bin llm_prover
```

#### 3. Base Sepolia Testnet Setup
```javascript
// Network configuration
const BASE_SEPOLIA = {
  chainId: 84532,
  name: 'Base Sepolia',
  rpcUrl: 'https://sepolia.base.org',
  explorer: 'https://sepolia.basescan.org',
  usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
};
```

#### 4. Get Test USDC
```bash
# Use Base Sepolia faucet for ETH
# https://docs.base.org/docs/tools/network-faucets

# Get USDC from a testnet faucet or mint
# Contact Circle for testnet USDC access
```

## Implementing the Server

### 1. Basic Express Server Setup
```javascript
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8610;
```

### 2. Attestation Endpoint
```javascript
const crypto = require('crypto');

// Issue attestation after zkML verification
app.post('/attest', async (req, res) => {
  const { proof, cart, intent } = req.body;
  
  // Verify zkML proof (simplified)
  const isValid = await verifyZkMLProof(proof);
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid proof' });
  }
  
  // Create attestation binding
  const attestation = {
    proofHash: sha256(JSON.stringify(proof)),
    cartHash: sha256(JSON.stringify(cart)),
    intentHash: sha256(JSON.stringify(intent)),
    issuedAt: Date.now(),
    expiresAt: Date.now() + 300000, // 5 minutes
  };
  
  // Sign attestation (EIP-712 recommended for production)
  const token = signAttestation(attestation);
  
  res.json({ ok: true, token });
});
```

### 3. x402 Payment Endpoint
```javascript
// x402-express middleware for production
const x402Express = require('x402-express');

// Configure x402 middleware
const x402Config = {
  network: 'base-sepolia',
  asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // USDC
  payTo: process.env.PAYMENT_ADDRESS,
  price: '$0.01',
  facilitatorUrl: process.env.FACILITATOR_URL // Optional
};

// Custom verification for attestation
const verifyAttestation = (req, res, next) => {
  const token = req.headers['x-zkml-attestation'];
  if (!token) {
    return res.status(402).json({
      error: 'Attestation required',
      message: 'Generate zkML proof first'
    });
  }
  
  try {
    req.attestation = decodeAndVerifyToken(token);
    next();
  } catch (error) {
    return res.status(402).json({ error: 'Invalid attestation' });
  }
};

// Mount x402 middleware with attestation check
app.post('/x402/pay',
  verifyAttestation,
  x402Express(x402Config),
  (req, res) => {
    // Payment successful, deliver resource
    res.json({
      ok: true,
      message: 'Payment received',
      resource: 'Your protected content here'
    });
  }
);
```

### 4. MetaMask Payment Support
```javascript
// IMPORTANT: x402 library's preparePaymentHeader returns payment data,
// NOT EIP-712 typed data. You must convert it for MetaMask signing.

app.post('/ui/payment/prepare', async (req, res) => {
  const { address, selected } = req.body;
  
  // First, use x402 library to create payment structure
  const payment = x402.preparePaymentHeader({
    scheme: 'exact',
    network: 'base-sepolia',
    asset: selected.asset || '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    payTo: selected.payTo || process.env.PAYMENT_ADDRESS,
    maxAmountRequired: selected.maxAmountRequired || '10000'
  });
  
  // Extract authorization from payment data
  const auth = payment.payload?.authorization || {};
  
  // Convert to EIP-712 typed data for MetaMask
  const typedData = {
    domain: {
      name: 'USD Coin',
      version: '2',
      chainId: 84532,
      verifyingContract: selected.asset || '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
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
      to: auth.to || selected.payTo || process.env.PAYMENT_ADDRESS,
      value: auth.value || selected.maxAmountRequired || '10000',
      validAfter: auth.validAfter || Math.floor(Date.now() / 1000),
      validBefore: auth.validBefore || Math.floor(Date.now() / 1000) + 3600,
      nonce: auth.nonce || '0x' + crypto.randomBytes(32).toString('hex')
    }
  };
  
  res.json({ typedData });
});
```

### 5. Execute Payment
```javascript
// Execute signed authorization on-chain
app.post('/ui/pay-metamask', async (req, res) => {
  const { signature, typedData } = req.body;
  
  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(
    process.env.RPC_URL,
    { chainId: 84532, name: 'base-sepolia' }
  );
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  
  // Parse signature
  const sig = signature.slice(2);
  const r = '0x' + sig.slice(0, 64);
  const s = '0x' + sig.slice(64, 128);
  const v = parseInt(sig.slice(128, 130), 16) + 27;
  
  // Execute transferWithAuthorization
  const usdcAbi = [
    'function transferWithAuthorization(address,address,uint256,uint256,uint256,bytes32,uint8,bytes32,bytes32)'
  ];
  const usdc = new ethers.Contract(
    '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    usdcAbi,
    wallet
  );
  
  const tx = await usdc.transferWithAuthorization(
    typedData.message.from,
    typedData.message.to,
    typedData.message.value,
    typedData.message.validAfter,
    typedData.message.validBefore,
    typedData.message.nonce,
    v, r, s,
    { gasLimit: 150000 }
  );
  
  const receipt = await tx.wait();
  res.json({
    ok: true,
    txHash: tx.hash,
    explorer: `https://sepolia.basescan.org/tx/${tx.hash}`
  });
});
```

## Implementing the Client

### 1. HTML Setup
```html
<!DOCTYPE html>
<html>
<head>
  <title>x402 Payment Demo</title>
</head>
<body>
  <button id="startDemo">Start Demo</button>
  <button id="payMetaMask">Pay with MetaMask</button>
  <div id="status"></div>
  
  <script src="app.js"></script>
</body>
</html>
```

### 2. JavaScript Client
```javascript
// app.js
const API_BASE = 'http://localhost:8610';

let attestationToken = null;
let paymentRequirements = null;

// Step 1: Generate zkML proof
async function generateProof() {
  const response = await fetch(`${API_BASE}/zkml/prove`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'payment request' })
  });
  const { sessionId } = await response.json();
  
  // Poll for completion
  while (true) {
    const status = await fetch(`${API_BASE}/zkml/status/${sessionId}`);
    const result = await status.json();
    if (result.status === 'completed') {
      return result.proof;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
}

// Step 2: Get attestation
async function getAttestation(proof) {
  const response = await fetch(`${API_BASE}/attest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      proof,
      cart: { items: [{ sku: 'demo', qty: 1 }], totalCents: 1 },
      intent: { method: 'POST', path: '/x402/pay' }
    })
  });
  const { token } = await response.json();
  return token;
}

// Step 3: x402 preflight
async function getPaymentRequirements(token) {
  const response = await fetch(`${API_BASE}/x402/pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ZKML-Attestation': token
    },
    body: JSON.stringify({ intent: 'demo' })
  });
  
  if (response.status === 402) {
    const data = await response.json();
    return data.accepts[0];
  }
  throw new Error('Unexpected response');
}

// Step 4: MetaMask payment
async function payWithMetaMask() {
  if (!window.ethereum) {
    alert('MetaMask not found');
    return;
  }
  
  // Connect wallet
  const accounts = await ethereum.request({ 
    method: 'eth_requestAccounts' 
  });
  const address = accounts[0];
  
  // Get typed data from server
  const prepareResponse = await fetch(`${API_BASE}/ui/payment/prepare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      token: attestationToken,
      address 
    })
  });
  const { typedData } = await prepareResponse.json();
  
  // Sign with MetaMask
  const signature = await ethereum.request({
    method: 'eth_signTypedData_v4',
    params: [address, JSON.stringify(typedData)]
  });
  
  // Submit payment
  const payResponse = await fetch(`${API_BASE}/ui/pay-metamask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      signature,
      typedData 
    })
  });
  const result = await payResponse.json();
  
  if (result.ok) {
    document.getElementById('status').innerHTML = 
      `Payment successful! <a href="${result.explorer}" target="_blank">View TX</a>`;
  }
}

// Wire up buttons
document.getElementById('startDemo').onclick = async () => {
  const status = document.getElementById('status');
  
  status.textContent = 'Generating proof...';
  const proof = await generateProof();
  
  status.textContent = 'Getting attestation...';
  attestationToken = await getAttestation(proof);
  
  status.textContent = 'Getting payment requirements...';
  paymentRequirements = await getPaymentRequirements(attestationToken);
  
  status.textContent = 'Ready to pay!';
};

document.getElementById('payMetaMask').onclick = payWithMetaMask;
```

### 3. Automatic Payments (No MetaMask)

You can run fully compliant x402 payments without user prompts:

- Client-triggered: call `POST /ui/pay-auto` after attestation (or after anchor confirms).
- Server-triggered: set `X402_AUTOPAY` to `attest` or `anchor_confirmed` and the server will auto‑pay in the background.

Environment:
```bash
X402_AGENT_PRIVATE_KEY=0x...      # Payer (USDC on Base Sepolia)
BASE_PRIVATE_KEY=0x...            # Executor (ETH for gas)
X402_PAYTO=0x...                  # Recipient (usually executor)
X402_AUTOPAY=anchor_confirmed     # Wait for on-chain anchor before paying
X402_ZKML_VERIFY_ETH=true         # Optional: perform on-chain anchor
```

Behavior:
- After Step 4 confirms, the server builds an EIP‑3009 authorization (signed by the agent key) and executes `transferWithAuthorization` on-chain using the executor key.
- `GET /ui/last-redemption` returns the last tx with explorer link.

## Testing Your Implementation

### 1. Unit Tests
```javascript
// test/payment.test.js
const { expect } = require('chai');
const { ethers } = require('ethers');

describe('x402 Payment', () => {
  it('should create valid authorization', async () => {
    const auth = await createAuthorization({
      from: '0x...',
      to: '0x...',
      value: '10000',
      asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      chainId: 84532
    });
    
    expect(auth).to.have.property('nonce');
    expect(auth).to.have.property('validAfter');
    expect(auth).to.have.property('validBefore');
  });
  
  it('should verify attestation', async () => {
    const token = 'eyJ...';
    const verified = verifyAttestation(token);
    expect(verified).to.be.true;
  });
});
```

### 2. Integration Tests
```javascript
// test/integration.test.js
describe('Full Payment Flow', () => {
  it('should complete payment with attestation', async () => {
    // Generate proof
    const proof = await generateMockProof();
    
    // Get attestation
    const attestResponse = await request(app)
      .post('/attest')
      .send({ proof });
    expect(attestResponse.body.token).to.exist;
    
    // Preflight
    const preflightResponse = await request(app)
      .post('/x402/pay')
      .set('X-ZKML-Attestation', attestResponse.body.token)
      .send({ intent: 'test' });
    expect(preflightResponse.status).to.equal(402);
    expect(preflightResponse.body.accepts).to.exist;
    
    // Payment would follow...
  });
});
```

### 3. Manual Testing Checklist
- [ ] zkML backend running on port 8002
- [ ] Proof-gate server running on port 8610
- [ ] MetaMask connected to Base Sepolia
- [ ] Test wallet has USDC balance
- [ ] All 4 demo steps complete successfully
- [ ] Payment transaction appears on explorer

## Common Issues and Solutions

### MetaMask "Invalid input" Error
**Problem**: MetaMask shows "Invalid input" when trying to sign the payment authorization.

**Root Cause**: The x402 library's `preparePaymentHeader` function returns a payment data structure, not the EIP-712 typed data that MetaMask expects for signing.

**Solution**: Extract the authorization from the payment data and convert it to proper EIP-712 format:
1. Call `preparePaymentHeader` to get the payment structure
2. Extract the `authorization` object from `payment.payload.authorization`
3. Create proper EIP-712 typed data with the authorization values
4. Send this typed data to MetaMask for signing
5. Include both signature and typedData when executing the payment

See the "MetaMask Payment Support" section above for the correct implementation.

## Production Considerations

### 1. Security
```javascript
// Use environment variables for sensitive data
require('dotenv').config();

// Validate all inputs
const validateAddress = (address) => {
  return ethers.isAddress(address);
};

// Implement rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests
});
app.use('/x402/pay', limiter);

// Add monitoring
const monitor = require('./monitoring');
app.use(monitor.middleware());
```

### 2. Error Handling
```javascript
// Comprehensive error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err.code === 'INSUFFICIENT_FUNDS') {
    return res.status(402).json({
      error: 'Insufficient USDC balance',
      required: '0.01 USDC'
    });
  }
  
  if (err.code === 'INVALID_SIGNATURE') {
    return res.status(400).json({
      error: 'Invalid payment signature'
    });
  }
  
  res.status(500).json({
    error: 'Internal server error'
  });
});
```

### 3. Scaling
```javascript
// Use Redis for attestation storage
const Redis = require('ioredis');
const redis = new Redis();

// Store attestation with expiry
await redis.setex(
  `attestation:${token}`,
  300, // 5 minutes
  JSON.stringify(attestation)
);

// Use message queue for payment processing
const Queue = require('bull');
const paymentQueue = new Queue('payments');

paymentQueue.process(async (job) => {
  const { authorization, signature } = job.data;
  return await executePayment(authorization, signature);
});
```

### 4. Deployment
```yaml
# docker-compose.yml
version: '3.8'
services:
  zkml-backend:
    build: ./zkml
    ports:
      - "8002:8002"
    environment:
      - LLM_PROVER_BIN=/app/llm_prover
  
  proof-gate:
    build: ./x402
    ports:
      - "8610:8610"
    environment:
      - NODE_ENV=production
      - BASE_RPC_URL=${BASE_RPC_URL}
    depends_on:
      - zkml-backend
      - redis
  
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

### 5. Monitoring & Logging
```javascript
// Structured logging
const winston = require('winston');
const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'payments.log' })
  ]
});

// Log all payments
app.post('/x402/pay', (req, res, next) => {
  logger.info('Payment request', {
    attestation: req.headers['x-zkml-attestation'],
    amount: '0.01 USDC',
    timestamp: Date.now()
  });
  next();
});

// Metrics collection
const prometheus = require('prom-client');
const paymentCounter = new prometheus.Counter({
  name: 'x402_payments_total',
  help: 'Total number of x402 payments'
});
```

## Resources

### Official Documentation
- [x402 Protocol Spec](https://github.com/coinbase/x402)
- [EIP-3009 Specification](https://eips.ethereum.org/EIPS/eip-3009)
- [EIP-712 Typed Data](https://eips.ethereum.org/EIPS/eip-712)

### Code Examples
- [Production Payment Handler](./production-payment-handler.js)
- [Proof-Gate Server](./proof-gate-server.js)
- [Demo Client](../static/x402-demo.html)

### Testing Tools
- [Base Sepolia Faucet](https://docs.base.org/docs/tools/network-faucets)
- [USDC Test Tokens](https://developers.circle.com/stablecoins)
- [MetaMask Test Wallet](https://metamask.io/)

## Support

For questions or issues:
- GitHub Issues: [agentkit/issues](https://github.com/hshadab/agentkit/issues)
- x402 Protocol: [coinbase/x402](https://github.com/coinbase/x402)

---

*Created: 2025-09-26*
*Version: 1.0.0*
