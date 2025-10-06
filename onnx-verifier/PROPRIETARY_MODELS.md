# Using Your Own Proprietary ONNX Models

## Quick Start

The zkML ONNX Verifier works with **any** ONNX model up to 50MB. You don't need to modify your model or share it publicly.

## Step 1: Convert Your Model to ONNX

### From PyTorch
```python
import torch
import torch.onnx

# Your trained model
model = YourModel()
model.load_state_dict(torch.load('model.pth'))
model.eval()

# Example input (same shape as production)
dummy_input = torch.randn(1, 5)  # Adjust dimensions

# Export to ONNX
torch.onnx.export(
    model,
    dummy_input,
    "my_fraud_model.onnx",
    input_names=['input'],
    output_names=['output'],
    dynamic_axes={'input': {0: 'batch_size'}}
)
```

### From Scikit-Learn
```python
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

# Your trained sklearn model
model = LogisticRegression()
model.fit(X_train, y_train)

# Define input shape
initial_type = [('float_input', FloatTensorType([None, 5]))]

# Convert to ONNX
onnx_model = convert_sklearn(model, initial_types=initial_type)

with open("sklearn_model.onnx", "wb") as f:
    f.write(onnx_model.SerializeToString())
```

### From TensorFlow/Keras
```python
import tf2onnx
import tensorflow as tf

# Your trained model
model = tf.keras.models.load_model('model.h5')

# Convert to ONNX
spec = (tf.TensorSpec((None, 5), tf.float32, name="input"),)
output_path = "keras_model.onnx"

model_proto, _ = tf2onnx.convert.from_keras(model, input_signature=spec, output_path=output_path)
```

## Step 2: Prepare Test Inputs

Create a JSON file with test cases that demonstrate your model works correctly:

**fraud_test_cases.json**
```json
[
    [50.0, 0.2, 500.0, 3.0, 14.0],   // Legitimate transaction
    [450.0, 0.8, 5.0, 45.0, 3.0],    // Fraudulent transaction
    [100.0, 0.3, 365.0, 5.0, 10.0]   // Medium risk
]
```

**Input Format Requirements:**
- Array of arrays (batch of test cases)
- Each inner array is one test case
- Values must match your model's expected input shape
- For 2D models: `[1, num_features]` → just provide features as array
- For 4D models (images): flatten to 1D array (handled automatically)

## Step 3: Generate Cryptographic Proof

### Option A: Web UI (Easiest)

1. Visit http://localhost:9101
2. Click "Upload Custom ONNX Model"
3. Select your `my_fraud_model.onnx`
4. Paste test inputs from `fraud_test_cases.json`
5. Click "Generate zkML Proof"
6. Wait ~2-6 seconds for REAL JOLT-Atlas proof generation
7. Click "Download Proof File"

### Option B: API (Programmatic)

```bash
# Generate proof via API
curl -X POST http://localhost:9100/verify \
  -F "model=@my_fraud_model.onnx" \
  -F 'testInputs=[[50.0, 0.2, 500.0, 3.0, 14.0]]' \
  > response.json

# Extract verification ID
VERIFICATION_ID=$(cat response.json | jq -r '.verificationId')

# Download proof file
curl http://localhost:9100/download-proof/$VERIFICATION_ID \
  > proof_$(date +%Y%m%d).json
```

## Step 4: Verify Proof (Offline)

**Share proof with auditor/regulator:**
```bash
# Email or send proof file
proof_20251005.json  # ~2-5 KB file

# Recipient verifies locally (no internet needed)
curl -X POST http://localhost:9100/verify-proof \
  -H "Content-Type: application/json" \
  -d @proof_20251005.json
```

**Or use Web UI:**
1. Go to "Verify Proof File" section
2. Upload `proof_20251005.json`
3. Click "Verify Proof Locally"
4. Get instant result (~10ms)

## Privacy & Security

### What Gets Shared
✅ **Proof file contains:**
- Model hash (SHA-256)
- Test input hashes
- Test output hashes
- Cryptographic proof
- Timestamp

❌ **Proof file does NOT contain:**
- Your actual ONNX model
- Model weights or architecture
- Proprietary training data
- Business logic details

### Security Benefits

1. **Model Integrity**: Proves model produces specific outputs for specific inputs
2. **Tamper Detection**: Any change to model invalidates proof
3. **Independent Verification**: Third parties can verify without seeing your model
4. **Offline Verification**: No blockchain exposure, completely private
5. **Cryptographic Guarantee**: JOLT-Atlas by a16z crypto with 128-bit security
6. **Real zkML**: Uses actual cryptographic proof of ML execution (NOT simulated)
7. **Dory Commitment Scheme**: Polynomial commitment with BN254 curve
8. **Verifiable Execution**: Proves the EXACT model ran, not just hash relationships

## Common Use Cases

### Internal Compliance
```
1. Data scientist trains fraud detection model
2. Generate proof with test cases
3. Download proof file
4. Compliance team verifies proof locally
5. Approve for production deployment
```

### Regulatory Audit
```
1. Bank uses proprietary credit risk model
2. Generate proof quarterly with standard test set
3. Submit proof file to regulator
4. Regulator verifies offline (no access to model)
5. Compliance confirmed
```

### Client Due Diligence
```
1. Fintech uses ML for loan approval
2. Client asks: "How do we know your model works?"
3. Generate proof with client's test cases
4. Share proof file (model stays private)
5. Client verifies independently
```

### Model Certification
```
1. AI vendor creates fraud detection model
2. Generate proofs for certification test suite
3. Submit proofs to certification body
4. Get certified without revealing IP
5. Customers verify certified claims
```

## Limitations & Best Practices

### Model Size
- **Limit**: 50MB ONNX file
- **Solution**: Use model compression (quantization, pruning)
- **Most models**: Credit risk, fraud detection typically < 10MB

### Input Dimensions
- **2D Models** (tabular): `[1, features]` - fully supported
- **4D Models** (images): `[1, channels, height, width]` - auto-detected
- **Custom shapes**: May require input shape specification

### Test Cases
- **Minimum**: 1 test case
- **Recommended**: 5-10 diverse test cases
- **Best Practice**: Include edge cases, boundary conditions
- **Documentation**: Keep record of what each test case validates

### Performance
- **Proof Generation**: ~2-6 seconds (REAL JOLT-Atlas cryptographic proof)
- **Verification**: ~6 seconds (REAL cryptographic verification, not simulated)
- **File Size**: ~2-5 KB per proof
- **Security**: 128-bit (production-grade zero-knowledge proof)

## Troubleshooting

### "Invalid rank for input"
- Your model expects different input shape
- Check model input dimensions: Use Netron (https://netron.app)
- Adjust test input array shape accordingly

### "Input size mismatch"
- Array length doesn't match expected tensor size
- For images: ensure total pixels match (e.g., 224×224×3 = 150,528)

### "Model file too large"
- Compress model using ONNX optimization tools
- Use quantization to reduce weight precision
- Consider model distillation

### "Proof generation timeout"
- Large models take longer
- Increase timeout in production deployments
- Consider batching test cases

## Advanced: Integration with CI/CD

```yaml
# .github/workflows/model-verification.yml
name: Model Verification

on:
  push:
    paths:
      - 'models/*.onnx'

jobs:
  verify-model:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Start zkML Verifier
        run: |
          docker run -d -p 9100:9100 zkml-verifier

      - name: Generate Proof
        run: |
          curl -X POST http://localhost:9100/verify \
            -F "model=@models/fraud_model.onnx" \
            -F "testInputs=@test_cases.json" \
            > proof.json

      - name: Verify Proof
        run: |
          curl -X POST http://localhost:9100/verify-proof \
            -d @proof.json | jq -e '.verified == true'

      - name: Archive Proof
        uses: actions/upload-artifact@v2
        with:
          name: model-proof
          path: proof.json
```

## Support

For questions or issues with proprietary models:
1. Check model format with Netron: https://netron.app
2. Review ONNX documentation: https://onnx.ai
3. Test with example models first (authorization_model.onnx)
4. Open GitHub issue with (redacted) details

## Next Steps

- Add more example models for your industry
- Create standardized test suites for compliance
- Integrate with your ML deployment pipeline
- Build automated verification dashboards
