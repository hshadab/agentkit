# KYC Verification Workflow

This workflow demonstrates privacy-preserving KYC verification using zero-knowledge proofs.

## Overview

The KYC workflow allows users to prove they are verified without revealing personal information.

## Workflow Steps

1. **User Input**: "I am KYC verified"
2. **Proof Generation**: Creates a ZK proof of KYC status
3. **Blockchain Verification**: Verifies the proof on-chain
4. **USDC Transfer**: Sends 1 USDC as verification reward

## Example Usage

```javascript
// In the chat interface
User: "I am KYC verified"

// System response
Assistant: "I'll help you generate a KYC verification proof..."
// Generates proof
// Verifies on blockchain
// Transfers 1 USDC reward
```

## Technical Details

- **Proof Type**: KYC verification status
- **Circuit**: Simple boolean circuit
- **Verification**: On-chain smart contract
- **Reward**: 1 USDC via Circle API

## Smart Contract

The KYC verifier contract checks:
- Valid proof format
- Correct public inputs
- Proof verification passes

## Testing

```bash
# Run KYC workflow test
npm run test:kyc

# Or use the UI
# 1. Open http://localhost:8001
# 2. Type "I am KYC verified"
# 3. Watch the proof generation and verification
```

## Common Issues

1. **Proof generation fails**: Check zkEngine is running
2. **Verification fails**: Ensure correct network selected
3. **USDC transfer fails**: Verify Circle wallet has funds