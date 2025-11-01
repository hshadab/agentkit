# ACP × JOLT-Atlas Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ACP × JOLT-Atlas Integration                    │
│              Verifiable Autonomous Agent Commerce                   │
└─────────────────────────────────────────────────────────────────────┘

┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│   User   │◄────►│  Agent   │◄────►│ Merchant │◄────►│ Payment  │
│  Wallet  │      │  (ONNX)  │      │  System  │      │ Provider │
└──────────┘      └──────────┘      └──────────┘      └──────────┘
     │                 │                  │                  │
     │                 │                  │                  │
     ▼                 ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Service Layer                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │  Proof Service   │  │   ACP Service    │  │ Verification Svc │ │
│  │   (Port 9001)    │  │   (Port 9002)    │  │   (Port 9003)    │ │
│  │                  │  │                  │  │                  │ │
│  │  • ONNX Model    │  │  • Payment       │  │  • Proof Verify  │ │
│  │  • zkML Proof    │  │  • ACP Protocol  │  │  • Cache         │ │
│  │  • ~700ms        │  │  • Token Binding │  │  • ~50ms         │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
Step 1: User Sets Rules
┌──────────────────────────────────────────────┐
│ User Spending Rules                          │
├──────────────────────────────────────────────┤
│ • Daily Limit: $500                          │
│ • Per Transaction Max: $100                  │
│ • Allowed Categories: [groceries, utilities] │
│ • Trusted Merchants: {merchant_123: 0.95}    │
│ • Spent Today: $150                          │
│ • Transactions Today: 3                      │
└──────────────────────────────────────────────┘
                  │
                  ▼
Step 2: Agent Evaluates Transaction
┌──────────────────────────────────────────────┐
│ Transaction Context                          │
├──────────────────────────────────────────────┤
│ • Merchant: merchant_123                     │
│ • Amount: $45.00                             │
│ • Category: groceries                        │
└──────────────────────────────────────────────┘
                  │
                  ▼
Step 3: Neural Network Inference
┌──────────────────────────────────────────────┐
│ ONNX Authorization Model (~1ms)              │
├──────────────────────────────────────────────┤
│ Inputs: [budget_remaining, merchant_trust,   │
│          amount, category_score, velocity]   │
│                                              │
│ Network: 5 → 16 → 8 → 2                      │
│                                              │
│ Outputs: [authorized: 1.0, confidence: 0.99] │
└──────────────────────────────────────────────┘
                  │
                  ▼
Step 4: zkML Proof Generation
┌──────────────────────────────────────────────┐
│ JOLT-Atlas Proof (~700ms)                    │
├──────────────────────────────────────────────┤
│ Proof: 0xjolt_a7f3b2c8d9e1...               │
│ Proof Hash: sha256(proof)                    │
│ Model Hash: sha256(model)                    │
│ Inputs Hash: sha256(inputs)                  │
│ Timestamp: 1234567890                        │
│ Nonce: 0x8f7e6d5c4b3a2918                    │
└──────────────────────────────────────────────┘
                  │
                  ▼
Step 5: ACP Payment Creation
┌──────────────────────────────────────────────┐
│ Enhanced ACP Payment Token                   │
├──────────────────────────────────────────────┤
│ Payment ID: uuid-...                         │
│ Merchant ID: merchant_123                    │
│ Amount: $45.00                               │
│ Payment Token: stripe_...                    │
│                                              │
│ Authorization Proof:                         │
│   • Proof: 0xjolt_...                        │
│   • Decision: true                           │
│   • Confidence: 0.99                         │
│   • Model Hash: sha256(...)                  │
│   • Inputs Hash: sha256(...)                 │
└──────────────────────────────────────────────┘
                  │
                  ▼
Step 6: Merchant Verification
┌──────────────────────────────────────────────┐
│ Proof Verification (~50ms)                   │
├──────────────────────────────────────────────┤
│ Valid: ✅ true                               │
│ Proof Hash: sha256(...)                      │
│ Verification Time: 52ms                      │
│ Cached: false                                │
└──────────────────────────────────────────────┘
                  │
                  ▼
Step 7: Order Fulfillment
┌──────────────────────────────────────────────┐
│ Merchant Fulfills Order                      │
├──────────────────────────────────────────────┤
│ ✅ Cryptographically verified authorization  │
│ ✅ User spending rules provably enforced     │
│ ✅ Agent behavior auditable                  │
│ ✅ Non-repudiable proof of correct execution │
└──────────────────────────────────────────────┘
```

## Neural Network Architecture

```
Authorization Model (5-16-8-2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Input Layer (5 features)
┌────────────────────────┐
│ budget_remaining (0-1) │
│ merchant_trust (0-1)   │
│ amount (0-1)           │
│ category_score (0-1)   │
│ velocity (0-1)         │
└────────────────────────┘
          │
          ▼
    Dense(5 → 16)
          │
          ▼
        ReLU
          │
          ▼
    Dropout(0.2)
          │
          ▼
    Dense(16 → 8)
          │
          ▼
        ReLU
          │
          ▼
    Dropout(0.2)
          │
          ▼
    Dense(8 → 2)
          │
          ▼
       Sigmoid
          │
          ▼
┌────────────────────────┐
│ authorized (0-1)       │
│ confidence (0-1)       │
└────────────────────────┘
```

## Service Communication

```
┌─────────────┐
│   Browser   │
│  (Demo UI)  │
└──────┬──────┘
       │
       │ HTTP POST /checkout/with-proof-generation
       ▼
┌─────────────────────┐
│   ACP Service       │
│   (Port 9002)       │
└──────┬──────────────┘
       │
       │ 1. POST /prove-authorization
       ▼
┌─────────────────────┐
│  Proof Service      │
│  (Port 9001)        │
│                     │
│  ┌──────────────┐   │
│  │ ONNX Model   │   │
│  │ Inference    │   │
│  └──────────────┘   │
│         │           │
│         ▼           │
│  ┌──────────────┐   │
│  │ JOLT-Atlas   │   │
│  │ Prover       │   │
│  └──────────────┘   │
└──────┬──────────────┘
       │ Returns: proof + decision + confidence
       │
       ▼
┌─────────────────────┐
│   ACP Service       │
│  Creates Payment    │
└──────┬──────────────┘
       │
       │ 2. POST /verify
       ▼
┌─────────────────────┐
│ Verification Svc    │
│ (Port 9003)         │
│                     │
│  ┌──────────────┐   │
│  │ Verify Proof │   │
│  │ Structure    │   │
│  └──────────────┘   │
│         │           │
│         ▼           │
│  ┌──────────────┐   │
│  │ Check Cache  │   │
│  └──────────────┘   │
│         │           │
│         ▼           │
│  ┌──────────────┐   │
│  │ Cryptographic│   │
│  │ Verification │   │
│  └──────────────┘   │
└──────┬──────────────┘
       │ Returns: valid + proof_hash
       │
       ▼
┌─────────────────────┐
│   ACP Service       │
│  Returns Payment    │
└──────┬──────────────┘
       │
       ▼
┌─────────────┐
│   Browser   │
│  (Demo UI)  │
└─────────────┘
```

## Proof Binding Security

```
┌─────────────────────────────────────────────┐
│            Authorization Proof               │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ Model Hash (sha256 of ONNX model)    │  │
│  │ Prevents: Agent model tampering      │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ Inputs Hash (sha256 of user rules)   │  │
│  │ Prevents: Rule modification          │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ Proof (JOLT zkML proof)              │  │
│  │ Proves: Correct inference execution  │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ Timestamp + Nonce                    │  │
│  │ Prevents: Replay attacks             │  │
│  └───────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

## Performance Characteristics

```
Latency Breakdown (Total: ~1.5s)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

│ Component           │ Time    │ % of Total │
├─────────────────────┼─────────┼────────────┤
│ ONNX Inference      │   ~1ms  │    0.07%   │
│ JOLT Proof Gen      │ ~700ms  │   46.67%   │
│ Network Latency     │  ~50ms  │    3.33%   │
│ ACP Processing      │  ~20ms  │    1.33%   │
│ Proof Verification  │  ~50ms  │    3.33%   │
│ Payment Creation    │ ~180ms  │   12.00%   │
│ Other Overhead      │ ~500ms  │   33.27%   │
└─────────────────────┴─────────┴────────────┘

Critical Path: JOLT Proof Generation (700ms)

Optimization Opportunities:
1. Use real JOLT-Atlas binary (currently simulated)
2. Parallel proof generation for batch transactions
3. Precompute proofs for common scenarios
4. Hardware acceleration (GPU/FPGA)
```

## Security Model

```
Threat Model & Mitigations
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────────┐
│ Threat: Malicious Agent               │
│ Mitigation: Model hash verification   │
│ Result: Can't use modified model      │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ Threat: Rule Tampering                │
│ Mitigation: Inputs hash verification  │
│ Result: Can't modify user rules       │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ Threat: Proof Replay                  │
│ Mitigation: Timestamp + nonce         │
│ Result: Each proof valid once         │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ Threat: Fake Proofs                   │
│ Mitigation: Cryptographic verification│
│ Result: Only valid proofs accepted    │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ Threat: MitM Attack                   │
│ Mitigation: Proof binding to payment  │
│ Result: Can't swap proofs             │
└────────────────────────────────────────┘
```

## Future Architecture (Phase 4: On-Chain)

```
┌─────────────────────────────────────────────────────────────────────┐
│                      On-Chain Integration                           │
└─────────────────────────────────────────────────────────────────────┘

       Off-Chain                              On-Chain
┌──────────────────────┐           ┌──────────────────────────┐
│  Proof Generation    │           │  Smart Contracts         │
│  (Port 9001)         │           │                          │
│                      │           │  ┌────────────────────┐  │
│  ┌────────────────┐  │           │  │ JOLT Verifier     │  │
│  │ ONNX Model     │  │           │  │ Contract          │  │
│  └────────────────┘  │           │  │                   │  │
│         │            │           │  │ verifyProof()     │  │
│         ▼            │           │  └────────────────────┘  │
│  ┌────────────────┐  │           │           │              │
│  │ JOLT-Atlas     │  │           │           ▼              │
│  │ Prover         │  │           │  ┌────────────────────┐  │
│  └────────────────┘  │           │  │ Payment Escrow    │  │
└──────────┬───────────┘           │  │ Contract          │  │
           │                       │  │                   │  │
           │ proof                 │  │ createPayment()   │  │
           ▼                       │  │ + proof           │  │
┌──────────────────────┐           │  └────────────────────┘  │
│  ACP Service         │           │           │              │
│  (Port 9002)         │─────────► │           ▼              │
│                      │ tx        │  ┌────────────────────┐  │
│  Creates on-chain    │           │  │ Attestation       │  │
│  transaction         │           │  │ Contract          │  │
└──────────────────────┘           │  │                   │  │
                                   │  │ bindProof()       │  │
                                   │  └────────────────────┘  │
                                   │                          │
                                   │  Ethereum / Base /       │
                                   │  Arbitrum / Optimism     │
                                   └──────────────────────────┘

Benefits:
• On-chain verification record (testnet)
• Automated dispute resolution
• Cross-chain settlement
• Decentralized trust
```

## Comparison with Traditional ACP

```
Traditional ACP                    ACP + JOLT-Atlas
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Authorization                      Authorization
     │                                  │
     │ Payment Token                    │ Payment Token
     │ (string)                         │ + zkML Proof
     ▼                                  ▼
┌──────────────┐                  ┌──────────────┐
│   Payment    │                  │   Payment    │
│   Provider   │                  │   + Proof    │
└──────────────┘                  └──────────────┘
     │                                  │
     │ Process                          │ Verify Proof
     │                                  │ THEN Process
     ▼                                  ▼
┌──────────────┐                  ┌──────────────┐
│   Merchant   │                  │   Merchant   │
│   Fulfills   │                  │   Fulfills   │
└──────────────┘                  └──────────────┘

Trust Model:                       Trust Model:
• Implicit                        • Cryptographic
• After-the-fact                  • Before-the-fact
• Chargebacks                     • Provable

Security:                          Security:
• Payment token only              • Payment token
• No proof of authorization       • + zkML proof
                                  • + Model hash
                                  • + Inputs hash
                                  • + Timestamp
                                  • + Nonce

Auditability:                      Auditability:
• Payment logs                    • Payment logs
• Merchant records                • + Proof records
                                  • + Decision trace
                                  • + Model version
```

## Technology Stack

```
Frontend (Demo UI)
├── HTML5
├── CSS3 (Gradient design)
└── Vanilla JavaScript (fetch API)

Backend Services (Node.js)
├── Express.js (REST API)
├── CORS (Cross-origin support)
├── body-parser (JSON parsing)
└── axios (HTTP client)

AI/ML Stack
├── ONNX Runtime (Neural network inference)
├── PyTorch (Model training)
└── JOLT-Atlas (zkML proof generation)

Payment Integration
├── ACP Protocol (OpenAI + Stripe spec)
└── Stripe API (Payment processing)

Future: Blockchain
├── Ethereum (Smart contracts)
├── Base (L2 scaling)
├── Arbitrum (L2 scaling)
└── Solidity (Contract language)
```

---

This architecture enables **trustless autonomous agent commerce** through cryptographic proof binding. No existing system combines zkML, ACP, and verifiable authorization in this way.
