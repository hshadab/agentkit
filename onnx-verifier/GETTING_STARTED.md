# Getting Started - Fraud Detection Example

**Quick start: Verify your first ONNX fraud model in 5 minutes**

## Prerequisites

- Python 3.8+ (to train and export model)
- Node.js 16+ (to run verifier service)
- Your fraud detection dataset

## Step 1: Install Dependencies

```bash
# For model training/export
pip install scikit-learn skl2onnx numpy

# For verifier service
cd zkml-verifier
npm install
```

## Step 2: Train & Export Fraud Model

Save this as `train_fraud_model.py`:

```python
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

# Load your fraud data
# Features: [transaction_amount, merchant_risk_score, account_age_days,
#            transactions_per_day, hour_of_day]
X_train = np.array([...])  # Your training data
y_train = np.array([...])  # Your labels (0=legit, 1=fraud)

# Train fraud model
model = RandomForestClassifier(n_estimators=10, max_depth=5)
model.fit(X_train, y_train)

# Export to ONNX
initial_type = [('float_input', FloatTensorType([None, 5]))]
onnx_model = convert_sklearn(model, initial_types=initial_type)

# Save
with open("fraud_model.onnx", "wb") as f:
    f.write(onnx_model.SerializeToString())

print("✓ Saved fraud_model.onnx")
```

Run it:
```bash
python train_fraud_model.py
# Output: ✓ Saved fraud_model.onnx
```

## Step 3: Start Verifier Service

```bash
npm start
```

Output:
```
┌─────────────────────────────────────────────────────────┐
│  🔒 zkML ONNX Verifier Service                          │
├─────────────────────────────────────────────────────────┤
│  Port:         9100                                     │
│  Proof System: JOLT-Atlas                               │
└─────────────────────────────────────────────────────────┘
```

## Step 4: Verify Your Model

**Create test cases** (save as `test_cases.json`):
```json
[
  [50.0, 0.2, 500.0, 3.0, 14.0],
  [450.0, 0.8, 5.0, 45.0, 3.0]
]
```

**Verify:**
```bash
curl -X POST http://localhost:9100/verify \
  -F "model=@fraud_model.onnx" \
  -F "testInputs=@test_cases.json"
```

**Response:**
```json
{
  "success": true,
  "verificationId": "0x8f3e9a2b1c4d7f6e...",
  "modelHash": "0x5b8c9d3e7a2f1b4c...",
  "proofHash": "0x9e7d6c5b4a3f2e1d...",
  "proofSystem": "JOLT-Atlas",
  "testCasesPassed": 2,
  "testResults": [
    {
      "testCase": 1,
      "input": [50.0, 0.2, 500.0, 3.0, 14.0],
      "output": [0.95, 0.05],
      "inferenceTimeMs": 12
    },
    {
      "testCase": 2,
      "input": [450.0, 0.8, 5.0, 45.0, 3.0],
      "output": [0.12, 0.88],
      "inferenceTimeMs": 11
    }
  ],
  "modelSizeMB": "0.85",
  "performance": {
    "inferenceTimeMs": 11,
    "proofGenerationMs": 600,
    "totalTimeMs": 611
  },
  "verifiedAt": "2025-10-04T20:00:00Z"
}
```

## Step 5: Share Proof with Customers

**Get verification details:**
```bash
curl http://localhost:9100/verification/0x8f3e9a2b1c4d7f6e...
```

**Use in sales:**
```
"Our fraud model is cryptographically verified.
Verification ID: 0x8f3e9a2b1c4d7f6e...
Proof Hash: 0x9e7d6c5b4a3f2e1d..."
```

## What You Just Did

1. ✅ Trained a fraud detection model
2. ✅ Exported to ONNX format
3. ✅ Generated cryptographic zkML proof
4. ✅ Got verifiable proof of exact model behavior

## Next Steps

### For Sales Teams
- Add verification to pitch decks
- Share proof hash with enterprise prospects
- Differentiate vs. unverified competitors

### For Compliance Teams
- Include in SOC2/ISO27001 audit docs
- Create permanent audit trail
- Document for regulators

### For Product Teams
- Verify production models match test
- Track model versions with proofs
- Debug inference discrepancies

## Real-World Example

**Fraud Detection Startup:**
```
Before zkML:
Enterprise: "How do we trust your model?"
You: "Here's our accuracy: 98.5%"
Enterprise: "Can you prove that?"
You: "Um... you'll see in production?"
❌ Deal lost

After zkML:
Enterprise: "How do we trust your model?"
You: "Here's cryptographic proof of exact behavior for 1,000 test cases"
Enterprise: "We can verify this?"
You: "Yes, independently"
✅ Deal won
```

## Pricing Use Case

**ROI Calculation:**
- Cost: $199/month for verification service
- Benefit: Win 1 enterprise deal at $50k/year
- Payback: First sale pays for 20+ years

## Troubleshooting

**"My model is too large"**
- Max 50MB ONNX file
- Reduce model size or use pruning
- Most fraud models are 1-10MB

**"Inference times out"**
- Max 100ms inference time
- Simplify model architecture
- Use ensemble of smaller models

**"Proof generation fails"**
- Check ONNX model is valid: `python -c "import onnx; onnx.checker.check_model('model.onnx')"`
- Ensure test inputs match model input shape
- Verify no unsupported ONNX operations

## Questions?

**"Does this slow down production inference?"**
No. Verification happens once, not per transaction.

**"Can customers see my model weights?"**
No. Only the proof is shared, not the model.

**"What if I update my model?"**
Generate new proof. Keep old proofs for audit trail.

**"Is this legally admissible?"**
Cryptographic proofs are evidence in many jurisdictions. Consult lawyer.
