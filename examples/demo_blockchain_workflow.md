# Blockchain Verification Workflow Examples

This document demonstrates complex workflows involving on-chain verification triggering USDC transactions.

## Examples

### 1. Basic Ethereum Verification (Default)
**Command:** `Generate KYC proof for Alice, verify it on blockchain, then send 0.1 USDC to Alice on Ethereum`

**Expected Flow:**
1. Generate KYC proof for Alice
2. Verify proof locally
3. Verify proof on Ethereum (default for "on blockchain")
4. Transfer 0.1 USDC to Alice on Ethereum

### 2. Explicit Solana Verification
**Command:** `Generate location proof, verify it on Solana, then transfer 0.05 USDC to Bob on SOL`

**Expected Flow:**
1. Generate location proof
2. Verify proof locally
3. Verify proof on Solana (explicitly requested)
4. Transfer 0.05 USDC to Bob on Solana

### 3. Conditional On-Chain Transfer
**Command:** `If Charlie is KYC verified on-chain, send him 0.2 USDC on Ethereum`

**Expected Flow:**
1. Generate KYC proof for Charlie
2. Verify proof locally
3. Verify proof on Ethereum (default for "on-chain")
4. If verification successful, transfer 0.2 USDC to Charlie on Ethereum

### 4. Multi-Chain Verification
**Command:** `Generate AI content proof, verify locally, verify on Ethereum, verify on Solana, then send 0.15 USDC to David`

**Expected Flow:**
1. Generate AI content proof
2. Verify proof locally
3. Verify proof on Ethereum
4. Verify proof on Solana
5. Transfer 0.15 USDC to David (default: Ethereum)

### 5. Complex Multi-Person Workflow
**Command:** `If Frank is KYC compliant and verified on Ethereum, send him 0.25 USDC, and if Grace is location verified on Solana, send her 0.15 USDC on SOL`

**Expected Flow:**
1. Generate KYC proof for Frank
2. Verify Frank's proof locally
3. Verify Frank's proof on Ethereum
4. If successful, transfer 0.25 USDC to Frank on Ethereum
5. Generate location proof for Grace
6. Verify Grace's proof locally
7. Verify Grace's proof on Solana
8. If successful, transfer 0.15 USDC to Grace on Solana

## Key Features

1. **Smart Defaults**: "verify on blockchain" or "on-chain" defaults to Ethereum
2. **Explicit Chain Selection**: Users can specify "Solana" or "SOL" for Solana verification
3. **Conditional Logic**: Transfers only execute if verification succeeds
4. **Multi-Step Workflows**: Support for complex sequences with multiple people and chains
5. **Natural Language**: OpenAI parser handles various phrasings and complex conditions

## Testing

To test these workflows:

1. Start the server:
   ```bash
   python3 chat_service.py
   ```

2. Run the test suite:
   ```bash
   node test_blockchain_workflows.js
   ```

3. Or test individual commands:
   ```bash
   curl -X POST http://localhost:8000/execute_workflow \
     -H "Content-Type: application/json" \
     -d '{"command": "If Alice is KYC verified on-chain, send her 0.1 USDC"}'
   ```

## Implementation Details

- **Parser**: Enhanced OpenAI parser recognizes blockchain verification steps
- **Executor**: Updated to handle `verify_on_ethereum` and `verify_on_solana` step types
- **WebSocket**: Sends blockchain verification requests to the Rust backend
- **UI Integration**: Blockchain verifications trigger the same UI components as manual verification