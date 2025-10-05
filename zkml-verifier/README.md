# zkML ONNX Verifier

**Cryptographic proof that your ONNX fraud/risk models work as documented.**

For fraud detection, compliance, and fintech companies that need to prove their ML models are trustworthy.

## Target Users

- 🎯 **Fraud Detection SaaS** - Prove model accuracy to enterprise customers
- 🎯 **Risk Scoring Platforms** - Regulatory compliance (FCRA, ECOA, EU AI Act)
- 🎯 **AML/KYC Providers** - FinCEN audit trail
- 🎯 **Credit Scoring** - Fair lending documentation

## What It Does

Takes your **ONNX model** + test cases → Returns **cryptographic proof** of exact behavior

No blockchain. No agents. Just ONNX verification.

### Works with ANY ONNX Model

- ✅ **Your proprietary models** - Fraud detection, credit risk, compliance
- ✅ **Industry-standard models** - ResNet, BERT, XGBoost, LightGBM
- ✅ **Any framework** - PyTorch, TensorFlow, scikit-learn, XGBoost
- ✅ **Up to 50MB** - Most business models are under 10MB

### Privacy Guaranteed

- 🔒 **Model stays private** - Never shared, only hash is used
- 🔒 **Offline verification** - No blockchain, no public record
- 🔒 **Cryptographic proof** - Groth16 zkSNARK (~10ms verification)
- 🔒 **Share with auditors** - Download proof file, verify independently

👉 **See [PROPRIETARY_MODELS.md](PROPRIETARY_MODELS.md)** for complete guide on using your own models

## Installation

```bash
npm install
```

## Usage

```bash
npm start
```

Service runs on port **9100**

## API

### Verify ONNX Model

```bash
POST http://localhost:9100/verify
```

**Request** (multipart/form-data):
- `model`: ONNX file (max 50MB)
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
  "proofSystem": "JOLT-Atlas",
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
    "proofGenerationMs": 600,
    "totalTimeMs": 612
  },
  "verifiedAt": "2025-10-04T18:00:00Z"
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
- Max 50MB ONNX file
- Max 10M parameters
- Inference < 100ms

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
**"How do I prove to enterprise customers that my fraud model actually works?"**

Traditional approaches don't work:
- ❌ Share accuracy metrics → Can be faked
- ❌ Show case studies → Cherry-picked
- ❌ Provide audit access → Slow, expensive

### The Solution
**Cryptographic proof** your ONNX model:
- ✅ Produces exact outputs for specific inputs
- ✅ Runs exactly as documented
- ✅ Cannot be tampered with

## Who Uses This

### Fraud Detection Startups
**Problem:** "Enterprise won't trust us without proof"
**Solution:** Share cryptographic verification of model behavior

### Lending/Insurance Companies
**Problem:** "Regulators demand AI transparency"
**Solution:** Permanent audit trail with zkML proofs

### Compliance Teams
**Problem:** "Need SOC2/ISO27001 documentation"
**Solution:** Cryptographic evidence for audits

## Adding Popular Models

Want to test with industry-standard models first? Run:

```bash
./add_popular_models.sh
```

This downloads popular ONNX models:
- **ResNet-50** (98MB) - ImageNet classification
- **SqueezeNet** (5MB) - Lightweight image classification
- **EfficientNet-Lite4** (49MB) - Efficient image recognition
- **XGBoost Fraud** - Sample fraud detection model
- **DistilBERT** - NLP sentiment analysis

All models are:
- ✅ Publicly available from ONNX Model Zoo
- ✅ Industry-standard architectures
- ✅ Widely used in production
- ✅ Pre-trained and ready to verify

**Custom models?** See [PROPRIETARY_MODELS.md](PROPRIETARY_MODELS.md) for complete guide

## License

MIT
