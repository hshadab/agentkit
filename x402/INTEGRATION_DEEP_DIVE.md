Deep x402 + zkML Integration (Commitment‑Anchored)

This demo goes beyond “bolt‑on ZK” by integrating AI authorization, zkML proof‑of‑proof, attestation binding, on‑chain anchoring, and x402 payment settlement into a single coherent pipeline with strict gating and session‑level integrity.

Why this matters for x402 implementers
- Trust the decision at the source: We run the AI model first (ONNX). If `X402_ENFORCE_AI=true` and AI denies, the pipeline halts immediately — there’s nothing to prove, attest, anchor, or pay.
- Prove execution happened: We compute a Jolt‑Atlas proof over the AI decision path and commit to the Jolt proof bytes. That commitment is then enforced on‑chain via a 3‑signal Groth16 circuit.
- Bind intent and policy: The attestation cryptographically binds `proofHash` (AI execution), `intentHash` (method+path+body), and `acceptsHash` (server policy: price/network/asset/payTo), preventing TOCTOU between preflight and payment.
- Enforce end‑to‑end integrity: Session‑bound anchoring uses the in‑memory SNARK proof and public signals from the same run that produced the Jolt commitment — no disk races, no reuse.
- Settle with proper primitives: We complete with EIP‑3009 `transferWithAuthorization`, executed by the server wallet, matching the x402 spirit of client authorization and server settlement.

Pipeline (1→5)
1) ONNX inference: `POST {X402_ONNX_URL}/zkml/onnx/authorize` → returns `decision`, `confidence`. Strict: if unavailable or invalid and `X402_REQUIRE_ONNX=true`, fail.
2) zkML proof‑of‑proof: Jolt‑Atlas runs; `proofHash = sha256(bytes) mod r` is computed. Groth16 fullProve uses `[decision, confidence, proofHash]` as public signals.
3) Attestation: Signs bindings `{proofHash, intentHash, acceptsHash}` — the payee cannot change price/network/asset/payTo under you.
4) On‑chain anchor: Base Sepolia storage verifier enforces the 3rd public signal and stores verification. UI links both tx and verifier contract.
5) x402 payment: EIP‑3009 authorization (MetaMask optional); server executes payment after anchor confirmation. UI shows the USDC tx link.

Strictness controls (prod‑ready posture)
- `X402_REQUIRE_ONNX=true` → No mocks; ONNX must be reachable and return a valid payload.
- `X402_ENFORCE_AI=true` → If AI denies, the flow stops before proving (no proof/attestation/anchor/payment).
- `X402_REQUIRE_PROOFHASH_SIGNAL=true` → Groth16 verification must carry the commitment as a public signal.
- `X402_AUTOPAY=anchor_confirmed` → Settlement only after on‑chain anchor confirms.

Verifier (Base Sepolia)
- Address: set via `ZKML_VERIFIER_ADDRESS`; `GET /verifier/info` confirms bytecode present and ABI availability.
- UI’s Step 4 presents both the tx link and the verifier contract link for instant inspection by developers and auditors.

Design choices for x402 teams
- Simple, composable hashes: `proofHash`, `intentHash`, `acceptsHash` keep the design audit‑friendly and implementation‑agnostic.
- Clear failure semantics: No fallbacks; if a component isn’t available (ONNX, circuit assets, verifier), the appropriate step fails early.
- Session‑level provenance: We reject “latest file” semantics for proving; all anchors are session‑bound to the exact SNARK proof and public signals that produced the commitment.

Next steps (optional)
- Extend the Groth16 circuit to incorporate additional public signals (e.g., model hash or policy hash) if you want stronger on‑chain binding.
- Add `X402_AI_MIN_CONFIDENCE` to gate approvals by both decision and confidence.
- Support multiple verifiers (multi‑chain) with explorer selection per `chainId`.

