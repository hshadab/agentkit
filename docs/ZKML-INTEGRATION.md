# zkML Integration with JOLT-Atlas

## Overview

This document describes the integration of JOLT-Atlas zkML (Zero-Knowledge Machine Learning) framework into the Verifiable Agent Kit, enabling AI agents to prove they ran specific ML models without revealing model weights or proprietary information.

## What is zkML?

zkML allows proving that a machine learning model was executed correctly on specific inputs without revealing:
- The model weights/parameters
- Internal computations
- Training data
- Proprietary algorithms

## JOLT-Atlas Framework

JOLT-Atlas is a fast zkML framework that uses lookup tables instead of arithmetic circuits, making proof generation significantly faster than traditional approaches.

### Key Features:
- **Fast Proof Generation**: ~10 seconds for sentiment model (vs minutes/hours for circuit-based)
- **Lookup-Based**: Uses precomputed tables for common ML operations
- **Nova → Groth16**: Recursive proofs for efficient verification
- **Production Ready**: Real cryptographic proofs, not simulations

## Implementation Details

### 1. Sentiment Model

We use a sentiment analysis model with 14 embeddings for risk assessment:

```
Model: Sentiment Analysis
Embeddings: 14
Trace Length: 11 operations
Matrix Size: 1024×1024 polynomials
Proof Time: ~10 seconds
Proof Size: ~2.3 KB
```

### 2. Workflow Integration

The zkML proof is integrated as Step 1 of the Circle Gateway access workflow:

```
Step 1: zkML Inference Proof Generation
  → Generate JOLT-Atlas proof (~10s)
  → Proves AI agent ran risk analysis
  
Step 2: On-Chain Verification
  → Verify proof cryptographically
  → Agent authorized for Gateway access
  
Step 3: Multi-Chain USDC Transfer
  → Execute transfers on 3 chains
  → Ethereum, Base, Avalanche
```

### 3. API Endpoints

#### Generate zkML Proof
```bash
POST http://localhost:3456/api/zkml/generate-agent-proof
{
  "agentId": "agent-001",
  "agentType": "financial",
  "amount": 0.01,
  "operation": "gateway_transfer",
  "riskScore": 0.2
}
```

#### Check Proof Status
```bash
GET http://localhost:3456/api/zkml/proof-status/{sessionId}
```

#### Verify Proof
```bash
POST http://localhost:3456/api/zkml/verify-proof
{
  "sessionId": "...",
  "proof": "..."
}
```

## File Structure

```
/home/hshadab/agentkit/
├── jolt-atlas/                    # JOLT-Atlas zkML framework
│   └── zkml-jolt-core/           # Core implementation
│       ├── src/
│       │   ├── benches/
│       │   │   ├── sentiment.rs  # Sentiment model
│       │   │   └── tiny_mlp.rs   # Minimal MLP model
│       │   └── main.rs           # CLI interface
│       └── target/release/       # Compiled binary
│
├── api/
│   └── zkml-agent-verifier.js   # zkML verification service
│
├── static/
│   ├── js/ui/
│   │   └── gateway-workflow-manager-v2.js  # Updated with zkML
│   └── test-zkml-gateway-workflow.html     # Test interface
│
└── docs/
    └── ZKML-INTEGRATION.md      # This file
```

## Running the Services

### 1. Start zkML Verifier Service
```bash
cd /home/hshadab/agentkit
node api/zkml-agent-verifier.js
# Runs on port 3456
```

### 2. Start Web Server
```bash
cd /home/hshadab/agentkit
python3 -m http.server 8080 --directory static
# Access at http://localhost:8080
```

### 3. Test zkML Workflow
Open: `http://localhost:8080/test-zkml-gateway-workflow.html`

## Technical Architecture

### Proof Generation Process

1. **Model Execution**
   - Load sentiment model (14 embeddings)
   - Execute inference on input data
   - Generate execution trace (11 operations)

2. **Polynomial Commitment**
   - Convert trace to polynomials
   - Create 1024×1024 matrix
   - Generate polynomial commitments (Dory scheme)

3. **Sumcheck Protocol**
   - Run multiple rounds of sumcheck
   - Generate SNARK proof
   - Package proof data (~2.3 KB)

4. **Verification**
   - Submit proof to verifier
   - Cryptographic verification
   - Return authorization result

### Security Properties

- **Zero-Knowledge**: Model weights never revealed
- **Soundness**: Cannot forge valid proofs
- **Completeness**: Valid executions always verify
- **Non-Interactive**: Single proof sufficient

## Performance Metrics

| Metric | Value |
|--------|-------|
| Proof Generation | ~10 seconds |
| Verification | ~1 second |
| Proof Size | ~2.3 KB |
| Gas Cost (Ethereum) | ~250,000 gas |
| Matrix Size | 1024×1024 |
| Trace Operations | 11 |

## Use Cases

1. **AI Agent Authorization**
   - Prove agents ran risk analysis
   - Gate access to financial services
   - Ensure compliance with policies

2. **Model Inference Verification**
   - Prove specific model was used
   - Verify computation integrity
   - Audit AI decision-making

3. **Financial Risk Assessment**
   - Prove risk models were executed
   - Maintain model confidentiality
   - Enable regulatory compliance

## Future Enhancements

1. **Additional Models**
   - Fraud detection models
   - Credit scoring models
   - Compliance checking models

2. **Optimization**
   - GPU acceleration for faster proofs
   - Smaller proof sizes
   - Batched proof generation

3. **Integration**
   - Smart contract verifiers
   - Multi-chain verification
   - Decentralized model registry

## Troubleshooting

### Common Issues

1. **Proof Generation Timeout**
   - Ensure JOLT-Atlas binary is built
   - Check available system memory
   - Verify Rust toolchain installed

2. **Service Not Available**
   - Start zkML verifier service
   - Check port 3456 is free
   - Verify node modules installed

3. **Compilation Issues**
   - Run `cargo build --release`
   - Update Rust to latest version
   - Check disk space available

## References

- [JOLT Paper](https://eprint.iacr.org/2023/1217)
- [zkML Overview](https://github.com/zkonduit/awesome-zkml)
- [Nova Proof System](https://github.com/microsoft/Nova)
- [Circle Gateway Docs](https://developers.circle.com)

## Contact

For questions about zkML integration:
- Repository: https://bitbucket.org/houmanshadab/agentkit
- JOLT-Atlas: https://github.com/a16z/jolt

---

*Last Updated: August 25, 2025*