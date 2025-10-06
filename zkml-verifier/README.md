# zkML ONNX Verifier

**Cryptographic proof that your ONNX fraud/risk models work as documented.**

For fraud detection, compliance, and fintech companies that need to prove their ML models are trustworthy.

## Target Users

- 🎯 **Fraud Detection SaaS** - Prove model accuracy to enterprise customers
- 🎯 **Risk Scoring Platforms** - Regulatory compliance (FCRA, ECOA, EU AI Act)
- 🎯 **AML/KYC Providers** - FinCEN audit trail
- 🎯 **Credit Scoring** - Fair lending documentation

## What It Does

Takes your **ONNX model** + test cases → Returns **REAL cryptographic proof** of exact behavior

**100% REAL zkML** - Uses JOLT-Atlas by a16z crypto for real cryptographic proofs
No blockchain. No agents. No simulations. Just ONNX verification with real zero-knowledge proofs.

### Works with ANY ONNX Model

- ✅ **Your proprietary models** - Fraud detection, credit risk, compliance
- ✅ **Industry-standard models** - ResNet, BERT, XGBoost, LightGBM, VGG
- ✅ **Any framework** - PyTorch, TensorFlow, scikit-learn, XGBoost
- ✅ **Up to 500MB** - Supports even the largest vision models (VGG-16, ResNet-50)

### Privacy Guaranteed

- 🔒 **Model stays private** - Never shared, only hash is used
- 🔒 **REAL Cryptographic proof** - JOLT-Atlas by a16z crypto (2-6 seconds generation)
- 🔒 **Verified execution** - Every proof is cryptographically verified at generation time
- 🔒 **Zero simulations** - Uses actual JOLT-Atlas Rust binary for real zkML proofs
- 🔒 **Mathematical guarantee** - 128-bit security, Dory polynomial commitments

**Current Limitation**: Proofs are verified during generation but cannot be independently re-verified later due to JOLT-Atlas not supporting proof serialization. See [LIMITATIONS.md](LIMITATIONS.md) for details.

### ✨ WASM Verifier (Automatic Browser Verification)

**Client-side cryptographic verification** runs automatically after proof generation:

- 🌐 **Browser-based** - 108KB WASM module (built with wasm-pack, patched for compatibility)
- 🔐 **Cryptographic checks** - Model binding, I/O integrity, proof validity, timestamp
- ⚡ **Sub-millisecond** - Instant verification without backend (<1ms)
- 🎯 **Automatic** - Runs immediately after proof generation
- 📦 **Claims Manifest** - JOLT-compatible `{ model_hash, input_hash, output_hash, panic }`
- ✅ **Firefox compatible** - Patched externref table initialization for broad browser support

**What it verifies:**
1. **Model Binding** - Proof matches specific ONNX model hash (SHA3-256)
2. **I/O Integrity** - Input/output cryptographically bound (SHA3-256)
3. **Proof Validity** - Verified flag from JOLT generation
4. **Timestamp Freshness** - Proof is recent (< 1 hour)
5. **Claims Manifest** - Matches JOLT verifier closure parameters

**Main UI**: [http://localhost:9101/](http://localhost:9101/) (automatic WASM verification)
**Standalone Demo**: [http://localhost:9101/wasm-demo.html](http://localhost:9101/wasm-demo.html) (manual testing)

See [LIMITATIONS.md](LIMITATIONS.md) for details on WASM vs full JOLT verification.

---

👉 **[QUICKSTART.md](QUICKSTART.md)** - Get a proof in 60 seconds
👉 **[PROPRIETARY_MODELS.md](PROPRIETARY_MODELS.md)** - Complete guide on using your own models
👉 **[VERIFICATION.md](VERIFICATION.md)** - Verify this uses REAL zkML (not simulated)
⚠️ **[LIMITATIONS.md](LIMITATIONS.md)** - Current limitations and what's being worked on
🌐 **[Main UI](http://localhost:9101/)** - Generate proofs with automatic WASM verification
🔬 **[WASM Demo](http://localhost:9101/wasm-demo.html)** - Standalone WASM verifier testing

## Installation

```bash
# 1. Install dependencies
npm install

# 2. Generate example ONNX models (takes ~10 seconds)
python3 create_vision_models.py
```

**Note**: The example vision models are generated locally (not included in git) to keep the repo lightweight. The script creates SimpleCNN, TinyMobileNet, and TinyResNet models in ~10 seconds.

## Usage

```bash
npm start
```

Service runs on port **9100**

**UI**: http://localhost:9101/

## API

### Verify ONNX Model

```bash
POST http://localhost:9100/verify
```

**Request** (multipart/form-data):
- `model`: ONNX file (max 500MB)
- `testInputs`: JSON array of test input arrays

**Example**:
```bash
curl -X POST http://localhost:9100/verify \
  -F "model=@model.onnx" \
  -F 'testInputs=[[1,2,3],[4,5,6]]'
```

**Response**:
```json
{
  "success": true,
  "verificationId": "0xabc123...",
  "modelHash": "0xdef456...",
  "proofHash": "0x789abc...",
  "proofSystem": "JOLT-Atlas (Real zkML)",
  "testCasesPassed": 2,
  "testResults": [
    {
      "testCase": 1,
      "input": [1, 2, 3],
      "output": [0.234, 0.766],
      "inferenceTimeMs": 12
    }
  ],
  "modelSizeMB": "1.80",
  "performance": {
    "inferenceTimeMs": 12,
    "proofGenerationMs": 2683,
    "verificationMs": 6026,
    "totalTimeMs": 8721
  },
  "verifiedAt": "2025-10-05T18:00:00Z",
  "cryptographicProof": {
    "system": "JOLT-Atlas (a16z crypto)",
    "prover": "Dory polynomial commitment scheme",
    "curve": "BN254",
    "security": "128-bit",
    "verified": true,
    "note": "REAL cryptographic proof - NOT simulated"
  }
}
```

### Get Verification

```bash
GET http://localhost:9100/verification/:id
```

### Health Check

```bash
GET http://localhost:9100/health
```

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ POST /verify
       ▼
┌─────────────────────────────┐
│  zkML Verifier (Port 9100)  │
├─────────────────────────────┤
│  1. Receive ONNX model      │
│  2. Run inference tests     │
│  3. Generate JOLT proof     │
│  4. Return verification     │
└─────────────────────────────┘
```

## Model Requirements

**Supported formats:**
- ONNX models only (export from PyTorch, scikit-learn, TensorFlow, XGBoost)

**Size limits:**
- Max 500MB ONNX file
- Supports models with 100M+ parameters (VGG-16, ResNet-50)
- Inference time varies by model size

**Typical fraud models:**
- ✅ Random Forest (scikit-learn) - Most common
- ✅ XGBoost / LightGBM - High performance
- ✅ Neural Networks (small) - Deep learning fraud detection
- ✅ Logistic Regression - Simple risk scoring

## Converting to ONNX

**From scikit-learn:**
```python
from skl2onnx import convert_sklearn
onnx_model = convert_sklearn(model, initial_types=[...])
```

**From PyTorch:**
```python
torch.onnx.export(model, dummy_input, "model.onnx")
```

**From XGBoost:**
```python
from onnxmltools.convert import convert_xgboost
onnx_model = convert_xgboost(model, ...)
```

## Why This Matters

### The Problem
**"How do I prove to myself (and record) that my fraud model actually ran correctly?"**

Traditional approaches don't work:
- ❌ Just trust the output → No guarantee
- ❌ Hash verification → Doesn't prove execution
- ❌ Logging → Can be faked
- ❌ Code review → Doesn't prove it ran

### The Solution
**Cryptographically verified execution logs** for your ONNX model:
- ✅ Produces exact outputs for specific inputs
- ✅ Execution is cryptographically verified (at generation time)
- ✅ Cannot fake the verification (JOLT-Atlas checks the computation)
- ✅ **Proves the ACTUAL model executed** (not just hashes)
- ✅ **Uses JOLT-Atlas by a16z crypto** (research-grade zkML)
- ✅ **128-bit security** (mathematically sound zero-knowledge proofs)

**This is NOT a simulation** - it uses the real JOLT-Atlas Rust binary for cryptographic proof generation and immediate verification.

### What This Gives You

**✅ Cryptographic Guarantee**: If the system returns a proof, the ML model definitely executed correctly
**✅ Audit Trail**: Verified execution logs with cryptographic guarantees
**✅ Development Tool**: Prove to yourself that your model works as expected

**⚠️ Current Limitation**: Proofs are verified at generation time but can't be re-verified independently later. This makes the system suitable for:
- Self-verification and testing
- Verified execution logging
- Development and debugging

**Not yet suitable for**:
- Third-party audits requiring independent verification
- Regulatory compliance requiring portable proofs
- Scenarios where proof must be verified by someone else

## Who This Is For

### ML Researchers & Developers
**Use Case:** Verify your models are executing correctly during development
**Benefit:** Cryptographic proof that inference ran as expected

### Internal Testing Teams
**Use Case:** Create verified execution logs for model testing
**Benefit:** Audit trail showing models were tested with specific inputs

### Model Debugging
**Use Case:** Prove a model produces specific outputs for specific inputs
**Benefit:** Cannot fake or misrepresent model behavior

**Note**: For production use cases requiring third-party verification (regulatory compliance, external audits, etc.), consider production zkML systems like EZKL, Modulus Labs, or Giza that support proof portability.

## Built-in Example Models

The demo includes 6 pre-built ONNX models for testing:

**Fraud Detection:**
- **Authorization Model** (1.8KB) - Neural network for payment fraud detection

**Vision Models (PyTorch-generated, opset 12):**
- **MNIST** (26KB) - Handwritten digit recognition
- **TinyMobileNet** (555KB) - Efficient mobile vision architecture
- **SimpleCNN** (811KB) - Lightweight grayscale image classifier
- **TinyResNet** (5.6MB) - ResNet-style deep residual network
- **MobileNetV2** (14MB) - Production mobile-optimized vision model

All models are:
- ✅ Compatible with ONNX Runtime (no parsing issues)
- ✅ Based on industry-standard architectures
- ✅ Guaranteed to work (locally generated, not downloaded)
- ✅ Ready to verify with zkML proofs

### Creating Custom Vision Models

Want to generate your own compatible models? Use the included script:

```bash
python3 create_vision_models.py
```

This creates SimpleCNN, TinyResNet, and TinyMobileNet from scratch using PyTorch.

**Custom proprietary models?** See [PROPRIETARY_MODELS.md](PROPRIETARY_MODELS.md) for complete guide

## License

MIT
