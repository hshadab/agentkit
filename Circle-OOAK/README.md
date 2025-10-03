Trustless USDC Agents: Extending Object Oriented Agent Kit with zkML

## Overview

This integration extends Circle's **Object Oriented Agent Kit (OOAK)** with **zkML cryptographic proofs** to enable **trustless autonomous agents** for USDC payments.

**The Trust Model Distinction:**
- **Circle OOAK alone**: Provides secure hooks and structured payment workflows, but requires trusting the agent runtime and OpenAI SDK
- **Circle OOAK + zkML**: Removes trust requirements entirely through cryptographic proofs—agents from untrusted marketplaces can be used safely with mathematical guarantees

This positioning makes OOAK + zkML a **general-purpose trustless agent framework** that can be applied to any agent SDK (not just OpenAI), enabling Circle's core goal: secure, verifiable USDC transfers via autonomous agents.

**What's Proven:**
- Real ONNX inference using `onnxruntime`
- zkML proof binding using existing JOLT-Atlas binaries where available
- Real Groth16 proof generation (decision + confidence) from circuit assets in `circuits/jolt-verifier`
- Real on-chain verification via a deployed verifier contract (read-only `verifyProof`)
- OOAK-style approval gate that requires valid proofs before executing secure actions

What’s Included
- `ml/onnx_infer.py`: Loads a pinned ONNX model and runs inference. If the demo model is missing, it auto-generates a tiny classifier via `jolt-atlas/models/create_agent_classifier.py`.
- `zk/jolt_prover.py`: Wraps JOLT-Atlas binaries (e.g., `llm_prover`) to produce a proof object and a `proof_hash` commitment.
- `zk/groth16.py`: Generates a Groth16 proof using the prebuilt Circom circuit under `circuits/jolt-verifier` via `generate_witness.js` and `snarkjs`.
- `onchain/verify.py`: Calls the verifier contract `verifyProof` using `web3.py`.
- `workflow.py`: An OOAK-style `ZKWorkflowManager` that enforces proof-gated approvals.
- `demo.py`: End-to-end demonstration: ONNX → JOLT proof → Groth16 proof → on-chain verification → approval.
- `secure_tooling.py`: Minimal `@secure_tool`-style decorator that enforces the ZK gate.
- `example_payment_agent.py`: A payment tool (`send_usdc`) gated by the ZK approval pipeline.
- `node-ui/` (Express): UI + REST API with ONNX inference, Groth16 proving, on‑chain verify, and `send-usdc`.

Prerequisites
- Python 3.10+
- Node.js with `snarkjs` available on PATH (e.g., `npm i -g snarkjs`) or via `npx snarkjs`.
- Environment variables (or defaults):
  - `OOAK_ONNX_MODEL`: defaults to `jolt-atlas/models/agent_classifier.onnx`
  - `OOAK_CIRCUIT_DIR`: defaults to `circuits/jolt-verifier`
  - `OOAK_RPC_URL`: JSON-RPC endpoint (default: public Sepolia)
  - `OOAK_VERIFIER_ADDRESS`: deployed verifier with signature `verifyProof(uint256[2],uint256[2][2],uint256[2],uint256[2])`

Quickstart
1) Install deps
- pip install onnxruntime web3
- Optional: npm i -g snarkjs

2) Run the demo
- python Circle-OOAK/demo.py

3) Run the secure-tool payments example
- python Circle-OOAK/example_payment_agent.py

4) Launch the Node UI
- npm run demo:ooak:ui
- Open http://localhost:8616
  - Generate & Verify runs zkML (JOLT if present) → Groth16 → on-chain verify
  - Results show the JOLT proof hash and Groth16 calldata

5) Real mode (optional)
- ONNX: ensure a model exists at `jolt-atlas/models/agent_classifier.onnx` (run `python3 jolt-atlas/models/create_agent_classifier.py` if needed), and keep `onnxruntime-node` installed.
- JOLT zkML: set `JOLT_PROVER_BIN=jolt-atlas/target/release/llm_prover` (build via `cargo build --release -p llm_prover`).
- Groth16 binding: set `OOAK_BINDING_CIRCUIT_DIR=x402/circuits/option-b-v2/build` and `OOAK_BINDING_VERIFIER_ADDRESS=<deployed 3-signal verifier>`.
- On-chain verify: set `OOAK_RPC_URL` and `OOAK_VERIFIER_ADDRESS` for 2-signal circuits; or the binding vars above for 3-signal.
- Send USDC:
  - Path A (Circle DCW API): export `CIRCLE_API_KEY` and optional wallet vars, then POST `/api/send-usdc`.
  - Path B (private key on Base Sepolia): export `PRIVATE_KEY`, optional `BASE_RPC_URL`, `USDC_ADDRESS` (default Base Sepolia USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`). The server signs and sends ERC‑20 `transfer`.

This will:
- Ensure the ONNX model exists (generate if needed).
- Run real ONNX inference to produce a decision + confidence.
- Generate a Groth16 proof for those public signals.
- Call the on-chain verifier’s `verifyProof` (read-only) and print the result.

Notes
- The JOLT-Atlas binary `jolt-atlas/target/release/llm_prover` is wrapped if present, but not required for the Groth16 path. When available, its output is hashed and bound into the audit record. You can replace the Groth16 circuit with one that also carries `proofHash` to enforce proof-of-proof on-chain (see x402 patterns).
- Contract address and RPC can be set via env vars. Defaults point to public endpoints and a demo address used in this repo’s JS backends.
 - The UI’s hero and diagram sections embed imagery from Circle’s blog post for visual parity.
 - The Node API enables CORS so you can use the single‑file UI at `Circle-OOAK/ooak-ui.html` with `API Base URL` set to your server.

Proof-of-Proof (Binding) Variant
- Optional: prove (decision, confidence, proofHash) using a 3-signal Groth16 circuit, so the on-chain verifier enforces the JOLT proof commitment.
- Files:
  - `zk/groth16_binding.py` and `onchain/verify_binding.py`
- Env:
  - `OOAK_BINDING_CIRCUIT_DIR`: points to compiled assets for the 3-signal circuit (e.g., from x402’s `option-b-v2`), containing `decision_with_binding_js/*.wasm`, `generate_witness.js`, and `decision_with_binding_final.zkey`.
  - `OOAK_BINDING_VERIFIER_ADDRESS`: deployed contract address with ABI `verifyProof(uint256[2],uint256[2][2],uint256[2],uint256[3])`.
- Flow:
  - If the JOLT binary is present, we compute `proofHashF = sha256(proof_bytes) mod r` and include it as the 3rd public signal.
  - Call the 3-signal verifier read-only to confirm (decision, confidence, proofHashF) on-chain.
