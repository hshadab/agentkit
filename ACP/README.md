ACP + zkML (5-Step) — Agentic Commerce Protocol Demo

Overview
- Implements an ACP-only, 5-step flow with real on-chain verification and a PSP-backed checkout.
- Steps:
  1) AI inference (mock or real)
  2) zkML proof generation (via configurable zkML service)
  3) Delegate payment tokenization (ACP /agentic_commerce/delegate_payment)
  4) On-chain Groth16 verification (Base Sepolia or Sepolia)
  5) Checkout completion (ACP /checkout_sessions/{id}/complete) via PSP (Stripe adapter or simulator)

Folder Structure
- server/
  - acp-server.js: Express server bootstrap
  - routes/
    - delegate_payment.js: POST /agentic_commerce/delegate_payment
    - checkout_sessions.js: Checkout endpoints (create/update/get/complete/cancel)
  - services/
    - ai-service.js: AI inference (mockable hook for real model)
    - zkml-service.js: zkML proof generation (calls external prover or mock)
    - anchor-service.js: Real on-chain Groth16 verification/anchoring
    - psp-adapter.js: Stripe test mode or simulator
  - store/
    - vault.js: vt_ token store (delegate payment)
    - sessions.js: checkout session store
  - util/
    - canonical-json.js: deterministic stringifier
    - schema-validate.js: AJV wrapper (optional; can be disabled)
- static/
  - acp-zkml-demo.html: 5-step UI demo page (calls ACP endpoints)

Requirements
- Node.js 18+
- NPM or PNPM
- Testnet RPC + funded key for on-chain verification
  - Base Sepolia recommended (defaults provided)
  - Set BASE_RPC_URL and BASE_PRIVATE_KEY
- Optional Stripe test keys for real PSP capture
  - STRIPE_SECRET_KEY (sk_test_...)
  - STRIPE_WEBHOOK_SECRET (optional)

Environment
Copy .env.example to .env and fill in values:
- PORT=8605
- ACP_CHAIN=base-sepolia
- BASE_RPC_URL=https://base-sepolia-rpc.publicnode.com
- BASE_PRIVATE_KEY=0x...
- ACP_VERIFIER_ADDRESS=0x6121Fd93594C316B78e74B91B89A06d3Bb682a8F
- ACP_VERIFIER_DEPLOYMENT=deployments/jolt-storage-verifier-base-sepolia.json
- ACP_ZKML_BASE_URL=http://127.0.0.1:8001
- STRIPE_SECRET_KEY=sk_test_...

Install & Run
1) cd ACP
2) npm install
3) npm start

Endpoints (ACP)
- POST /agentic_commerce/delegate_payment
  - Body per ACP spec (delegate payment)
  - Returns { id: 'vt_...', created, metadata: { zkml: { proof_hash, confidence }, ... } }

- Checkout sessions
  - POST /checkout_sessions → create (returns csn_..., messages)
  - POST /checkout_sessions/:id → update
  - GET  /checkout_sessions/:id → retrieve
  - POST /checkout_sessions/:id/complete → consumes vt_ token, verifies on-chain, charges via PSP

Real On-Chain Verification
- Uses Groth16 storage verifier ABI (deployments/jolt-storage-verifier-base-sepolia.json)
- Calls verifyAndStore(a,b,c,publicSignals)
- Requires BASE_PRIVATE_KEY with small testnet balance

zkML Proof Generation
- Default calls upstream zkML service at ACP_ZKML_BASE_URL (this repo’s Rust backend exposes /zkml/*)
- Provide proof { a,b,c } + publicSignals

PSP Integration
- If STRIPE_SECRET_KEY is set, a test PaymentIntent will be created/confirmed.
- Otherwise, a simulator returns a synthetic provider reference.

Demo UI
- Open http://localhost:8605/static/acp-zkml-demo.html

Notes
- This build is ACP-only (no x402). Any reused logic is refactored and namespaced under /ACP.
- For production, replace the mock AI with your model, harden schemas/signatures, and swap the simulator with your PSP.

